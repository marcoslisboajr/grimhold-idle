import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';

const SECRET = 'segredo-teste';

async function setup() {
  const db = openDb(':memory:');
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Yaanmark', 'hunter').id;
  const app = createApp(db, { topidleSecret: SECRET, heartbeatMs: 60_000 });
  await new Promise<void>((r) => app.listen(0, r));
  const port = (app.address() as AddressInfo).port;
  const post = (body: object, opts: { secret?: string; ts?: number } = {}) => {
    const raw = JSON.stringify(body);
    const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
    const sig = 'sha256=' + createHmac('sha256', opts.secret ?? SECRET).update(`${ts}.${raw}`).digest('hex');
    return fetch(`http://localhost:${port}/webhooks/topidle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-topidle-signature': sig, 'x-topidle-timestamp': ts },
      body: raw,
    });
  };
  return { db, id, app, post };
}

test('voto do TopIdle: paga uma vez por evento, pelo nome do personagem', async () => {
  const { db, id, app, post } = await setup();
  try {
    assert.equal((await post({ eventId: 'v1', playerIdentifier: 'Yaanmark' })).status, 204);
    assert.equal((await post({ eventId: 'v1', playerIdentifier: 'Yaanmark' })).status, 204, 'reenvio');
    assert.equal(db.bankFor(id).vote_coin, 2);
    assert.equal(db.bankFor(id).gold, undefined, 'o voto paga só a moeda');
    assert.equal((await post({ eventId: 'v2', playerIdentifier: 'NinguemAqui' })).status, 204, 'nome inexistente não faz reenviar');
  } finally {
    await new Promise((r) => app.close(r));
  }
});

test('voto do TopIdle: assinatura errada ou velha é recusada', async () => {
  const { db, id, app, post } = await setup();
  try {
    assert.equal((await post({ eventId: 'x', playerIdentifier: 'Yaanmark' }, { secret: 'outro' })).status, 401);
    assert.equal((await post({ eventId: 'y', playerIdentifier: 'Yaanmark' }, { ts: Math.floor(Date.now() / 1000) - 900 })).status, 401);
    assert.equal(db.bankFor(id).vote_coin, undefined);
  } finally {
    await new Promise((r) => app.close(r));
  }
});
