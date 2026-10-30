import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { OFFLINE_XP, offlineXpMult } from '../src/app.ts';

function hunter(name: string) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, name, 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[5] } }, 0, 0);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  return { db, game, id };
}

test('jogo fechado: a XP do tempo offline rende 70% (depois das 4 h cheias) e o loot não muda', () => {
  const a = hunter('Online');
  const b = hunter('Offline');
  // Mesma semente: as duas fichas lutam exatamente as mesmas lutas.
  b.db.setActivity(b.id, a.db.activityFor(a.id)!);
  const ga = a.game.settle(a.id, 3_600_000).gains;
  const gb = b.game.settle(b.id, 3_600_000, undefined, OFFLINE_XP).gains;
  assert.ok((ga.xp.combat ?? 0) > 1000);
  assert.equal(gb.xp.combat, Math.floor((ga.xp.combat ?? 0) * OFFLINE_XP));
  assert.deepEqual(gb.items, ga.items);
});

test('jogo fechado: as primeiras 4 h rendem 100%; o resto 70%, até as 12 h', () => {
  assert.equal(offlineXpMult(30 * 60_000), 1);
  assert.equal(offlineXpMult(4 * 3_600_000), 1);
  assert.ok(Math.abs(offlineXpMult(8 * 3_600_000) - 0.85) < 1e-9, '4 h cheias + 4 h a 70%');
  assert.ok(Math.abs(offlineXpMult(12 * 3_600_000) - 0.8) < 1e-9);
  assert.equal(offlineXpMult(30 * 3_600_000), offlineXpMult(12 * 3_600_000), 'teto de 12 h');
  assert.equal(offlineXpMult(-5000), 1, 'ainda andando até o portal');
});
