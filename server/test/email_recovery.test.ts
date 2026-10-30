import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';

// Carteiro falso: guarda os emails em vez de mandar.
const sent: { to: string; subject: string; html: string }[] = [];
const mailer = { send: async (to: string, subject: string, html: string) => (sent.push({ to, subject, html }), true) };
let clock = 1_000_000;
const db = openDb(':memory:');
const server = createApp(db, { mailer, publicUrl: 'https://jogo.test', now: () => clock });
let base = '';

before(async () => {
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  db.close();
});

const post = (path: string, body: unknown, token?: string) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
const guest = async () => ((await (await fetch(`${base}/api/auth/guest`, { method: 'POST' })).json()) as { token: string }).token;
const linkToken = (html: string, param: string) => html.match(new RegExp(`\\?${param}=([0-9a-f]+)`))![1];

test('email: confirmar pelo link e recuperar conta de convidado (vira login), link de uso único e com prazo', async () => {
  const g = await guest();
  const accountId = db.accountForToken(g)!;
  db.createCharacter(accountId, 'Perdido', 'hunter');

  // Email não confirmado não recupera nada (e a resposta não conta se existe).
  const r1 = (await (await post('/api/account/email', { email: 'perdido@mail.com' }, g)).json()) as { verified: boolean; sent: boolean };
  assert.deepEqual([r1.verified, r1.sent], [false, true]);
  assert.equal(sent.length, 1);
  assert.ok(sent[0].html.includes('https://jogo.test/?verify='));
  assert.equal((await post('/api/auth/forgot', { email: 'perdido@mail.com' })).status, 200);
  assert.equal(sent.length, 1, 'sem confirmar, não manda recuperação');

  // Confirma pelo link (uma vez só).
  const v = linkToken(sent[0].html, 'verify');
  assert.equal((await post('/api/auth/verify', { token: v })).status, 200);
  assert.equal(db.emailVerified(accountId), true);
  assert.equal((await post('/api/auth/verify', { token: v })).status, 400, 'link usado');

  // Esqueci a senha: link de recuperação para a conta de convidado.
  assert.equal((await post('/api/auth/forgot', { email: 'PERDIDO@mail.com' })).status, 200);
  assert.equal(sent.length, 2);
  const rt = linkToken(sent[1].html, 'reset');
  const info = (await (await fetch(`${base}/api/auth/reset?token=${rt}`)).json()) as { username: string | null };
  assert.equal(info.username, null, 'convidado: cria usuário');
  assert.equal((await post('/api/auth/reset', { token: rt, username: 'x', password: 'senhaboa123' })).status, 400, 'usuário inválido');
  const done = (await (await post('/api/auth/reset', { token: rt, username: 'perdido', password: 'senhaboa123' })).json()) as { token: string };
  assert.equal(db.accountForToken(done.token), accountId, 'entrou na mesma conta');
  assert.equal(db.accountForToken(g), null, 'sessão antiga caiu');
  assert.equal((await post('/api/auth/login', { username: 'perdido', password: 'senhaboa123' })).status, 200);
  assert.equal((await post('/api/auth/reset', { token: rt, password: 'outrasenha99' })).status, 400, 'link usado');

  // Conta com usuário: mantém o usuário e troca só a senha; link vence em 30 min.
  await post('/api/auth/forgot', { email: 'perdido@mail.com' });
  const rt2 = linkToken(sent[2].html, 'reset');
  assert.ok(sent[2].html.includes('perdido'));
  clock += 31 * 60_000;
  assert.equal((await post('/api/auth/reset', { token: rt2, password: 'outrasenha99' })).status, 400, 'vencido');
  await post('/api/auth/forgot', { email: 'perdido@mail.com' });
  const rt3 = linkToken(sent[3].html, 'reset');
  assert.equal((await post('/api/auth/reset', { token: rt3, password: 'outrasenha99' })).status, 200);
  assert.equal((await post('/api/auth/login', { username: 'perdido', password: 'outrasenha99' })).status, 200);

  // Trocar o email volta a "não confirmado".
  const tok = ((await (await post('/api/auth/login', { username: 'perdido', password: 'outrasenha99' })).json()) as { token: string }).token;
  clock += 2 * 60_000;
  await post('/api/account/email', { email: 'novo@mail.com' }, tok);
  assert.equal(db.emailVerified(accountId), false);
});
