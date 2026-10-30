import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE, combatXpRate, professionCombatXpShare, xpStageMult } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('profissão: a fração de XP de combate cresce com o nível da profissão (10% no 1, 40% no 120)', () => {
  assert.equal(professionCombatXpShare(1), 0.1);
  assert.equal(professionCombatXpShare(120), 0.4);
  assert.ok(Math.abs(professionCombatXpShare(60) - 0.25) < 0.01);
  assert.ok(professionCombatXpShare(80) > professionCombatXpShare(40));
});

test('profissão: uma hora minerando dá a fração do nível de mineração da XP/h de caça como XP de combate', () => {
  for (const miningLevel of [1, 60]) {
    const db = openDb(':memory:');
    const game = createGame(db);
    const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Mineira', 'warrior').id;
    db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[40], mining: XP_TABLE[miningLevel] ?? 0 } }, 0, 0);
    assert.equal(game.start(id, 'mining', 'copper_vein', 0), null);
    const { gains } = game.settle(id, 3_600_000);
    const expected = professionCombatXpShare(miningLevel) * combatXpRate(40) * xpStageMult(40);
    assert.ok(gains.xp.mining! > 0);
    assert.ok(Math.abs(gains.xp.combat! - expected) < expected * 0.02, `mineração ${miningLevel}: ${gains.xp.combat} perto de ${expected}`);
  }
});
