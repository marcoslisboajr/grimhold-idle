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
const guest = async () => ((await (await fetch(`${base}/api/auth/guest`, { method: 'POST' })).json()) as { token: string }).token;

test('perfil: bio pública do personagem e email privado da conta (um por conta)', async () => {
  const a = await guest();
  db.createCharacter(db.accountForToken(a)!, 'Bardo', 'hunter');
  const r = await post('/api/profile/bio', a, { bio: '  Caço   lobos\n desde o 1  ' });
  assert.equal(r.status, 200);
  const prof = (await (await fetch(`${base}/api/profile?name=Bardo`)).json()) as { bio: string; email?: string };
  assert.equal(prof.bio, 'Caço lobos desde o 1');
  assert.equal(prof.email, undefined, 'email não vai no perfil público');
  assert.equal(((await (await post('/api/profile/bio', a, { bio: 'x'.repeat(500) })).json()) as { bio: string }).bio.length, 200);

  assert.equal((await post('/api/account/email', a, { email: 'nao-e-email' })).status, 400);
  assert.equal((await post('/api/account/email', a, { email: ' Bardo@Mail.com ' })).status, 200);
  const acc = (await (await fetch(`${base}/api/account`, { headers: { Authorization: `Bearer ${a}` } })).json()) as { email: string };
  assert.equal(acc.email, 'bardo@mail.com');

  const b = await guest();
  assert.equal((await post('/api/account/email', b, { email: 'BARDO@mail.com' })).status, 409, 'mesmo email em outra conta');
  assert.equal((await post('/api/account/email', a, { email: '' })).status, 200, 'apagar o email');
  assert.equal((await post('/api/account/email', b, { email: 'bardo@mail.com' })).status, 200, 'livre de novo');
  assert.equal((await fetch(`${base}/api/account`)).status, 401);
});
