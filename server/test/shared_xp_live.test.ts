import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { XP_TABLE, type ServerMessage } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';
import { PartyManager } from '../src/party.ts';

/**
 * Shared XP de ponta a ponta: servidor de verdade, dois jogadores conectados,
 * mesma party e mesma caçada. Uma hora passa e um tick credita: os dois ganham
 * a mesma XP de combate (sem a divisão, guerreiro e caçador ganhariam diferente).
 */
test('shared XP ao vivo: dois da party na mesma caçada ganham a mesma XP no tick', async () => {
  const db = openDb(':memory:');
  let clock = 1_000_000;
  const server = createApp(db, { tickMs: 40, now: () => clock });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const sockets: WebSocket[] = [];
  try {
    const player = async (name: string, vocation: string) => {
      const token = ((await (await fetch(`${base}/api/auth/guest`, { method: 'POST' })).json()) as { token: string }).token;
      await fetch(`${base}/api/character`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, vocation }),
      });
      const id = db.characterFor(db.accountForToken(token)!)!.id;
      db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[20] } }, 0, 0);
      const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`);
      sockets.push(ws);
      await new Promise<void>((resolve) => {
        ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
        ws.on('message', (raw) => {
          if ((JSON.parse(raw.toString()) as ServerMessage).type === 'online') resolve();
        });
      });
      return { id, ws };
    };
    const a = await player('Lamina', 'warrior');
    const b = await player('Flecha', 'hunter');
    const party = new PartyManager(db);
    const { partyId } = party.invite(a.id, 'Flecha', clock);
    assert.equal(party.accept(b.id, partyId!, clock).error, undefined);

    for (const p of [a, b]) p.ws.send(JSON.stringify({ type: 'start', skill: 'combat', node: 'river_bank' }));
    await new Promise((r) => setTimeout(r, 200));
    const before = { a: db.skillsFor(a.id).combat!, b: db.skillsFor(b.id).combat! };

    clock += 3_600_000;
    await new Promise((r) => setTimeout(r, 300));
    const gainA = db.skillsFor(a.id).combat! - before.a;
    const gainB = db.skillsFor(b.id).combat! - before.b;
    assert.ok(gainA > 1000, `ganhou ${gainA}`);
    // Desde 17/10 ninguém perde: quem fez menos sobe até a média, quem fez mais fica com a sua.
    // O de menos sobe até a média dos dois (fica perto do outro); o de mais não perde nada.
    const [lo, hi] = [Math.min(gainA, gainB), Math.max(gainA, gainB)];
    assert.ok(lo >= hi * 0.9, `guerreiro ${gainA} x caçador ${gainB}`);
  } finally {
    for (const ws of sockets) ws.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    // Os sockets fecham depois (e ainda gravam no banco): espera antes de fechar.
    await new Promise((r) => setTimeout(r, 200));
    db.close();
  }
});

/**
 * Dobro de XP pessoal na party (17/10): a Shared XP divide a XP sem o dobro e cada um aplica o seu
 * depois. Antes, o dobro de um entrava na soma e metade ia para o outro (a distância nunca diminuía).
 */
test('shared XP ao vivo: o dobro de XP de um não é dividido com a party', async () => {
  const db = openDb(':memory:');
  let clock = 1_000_000;
  const server = createApp(db, { tickMs: 40, now: () => clock });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const sockets: WebSocket[] = [];
  try {
    const player = async (name: string) => {
      const token = ((await (await fetch(`${base}/api/auth/guest`, { method: 'POST' })).json()) as { token: string }).token;
      await fetch(`${base}/api/character`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, vocation: 'hunter' }),
      });
      const id = db.characterFor(db.accountForToken(token)!)!.id;
      db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[20] } }, 0, 0);
      const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`);
      sockets.push(ws);
      await new Promise<void>((resolve) => {
        ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
        ws.on('message', (raw) => {
          if ((JSON.parse(raw.toString()) as ServerMessage).type === 'online') resolve();
        });
      });
      return { id, ws };
    };
    const a = await player('Semdobro');
    const b = await player('Comdobro');
    const party = new PartyManager(db);
    const { partyId } = party.invite(a.id, 'Comdobro', clock);
    assert.equal(party.accept(b.id, partyId!, clock).error, undefined);
    db.setXpBoostUntil(b.id, clock + 10 * 3_600_000);

    for (const p of [a, b]) p.ws.send(JSON.stringify({ type: 'start', skill: 'combat', node: 'river_bank' }));
    await new Promise((r) => setTimeout(r, 200));
    const before = { a: db.skillsFor(a.id).combat!, b: db.skillsFor(b.id).combat! };

    clock += 3_600_000;
    await new Promise((r) => setTimeout(r, 300));
    const gainA = db.skillsFor(a.id).combat! - before.a;
    const gainB = db.skillsFor(b.id).combat! - before.b;
    assert.ok(gainA > 1000, `ganhou ${gainA}`);
    const ratio = gainB / gainA;
    assert.ok(ratio > 1.8 && ratio < 2.2, `com dobro ${gainB} x sem dobro ${gainA} (razão ${ratio.toFixed(2)})`);
  } finally {
    for (const ws of sockets) ws.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await new Promise((r) => setTimeout(r, 200));
    db.close();
  }
});
