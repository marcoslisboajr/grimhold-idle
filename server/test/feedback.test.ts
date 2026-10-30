import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';

const db = openDb(':memory:');
const server = createApp(db);
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

const post = (path: string, token: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('feedback: guarda bug/sugestão com o contexto, valida e limita 5 por dia', async () => {
  const token = ((await (await fetch(`${base}/api/auth/guest`, { method: 'POST' })).json()) as { token: string }).token;
  assert.equal((await post('/api/feedback', token, { kind: 'bug', text: 'sem personagem' })).status, 400);
  const id = db.createCharacter(db.accountForToken(token)!, 'Relator', 'hunter').id;

  assert.equal((await post('/api/feedback', token, { kind: 'xyz', text: 'tipo errado aqui' })).status, 400);
  assert.equal((await post('/api/feedback', token, { kind: 'bug', text: 'oi' })).status, 400, 'curto demais');
  assert.equal((await post('/api/feedback', token, { kind: 'idea', text: 'x'.repeat(1001) })).status, 400, 'longo demais');
  assert.equal((await post('/api/feedback', 'nao-existe', { kind: 'bug', text: 'sessão inválida' })).status, 401);

  for (let i = 0; i < 5; i++) {
    assert.equal((await post('/api/feedback', token, { kind: i ? 'idea' : 'bug', text: `relato número ${i}` })).status, 200);
  }
  assert.equal(db.feedbackCountSince(id, 0), 5);
  assert.equal((await post('/api/feedback', token, { kind: 'bug', text: 'o sexto passa do limite' })).status, 429);
});
