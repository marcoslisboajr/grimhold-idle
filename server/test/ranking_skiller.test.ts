import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpForLevel } from '@grimhold/shared';
import { openDb } from '../src/db.ts';

test('ranking Skiller: soma os níveis de tudo menos combate', () => {
  const db = openDb(':memory:');
  const fighter = db.createCharacter(db.accountForToken(db.createGuest())!, 'Lutador', 'warrior').id;
  const skiller = db.createCharacter(db.accountForToken(db.createGuest())!, 'Artesao', 'devout').id;
  db.applyGains(fighter, { actions: 0, items: {}, xp: { combat: xpForLevel(150), melee: xpForLevel(90), mining: xpForLevel(10) } }, 1, 0);
  db.applyGains(skiller, { actions: 0, items: {}, xp: { combat: xpForLevel(5), mining: xpForLevel(40), cooking: xpForLevel(30) } }, 1, 0);
  const r = db.skillerRanking(20);
  assert.deepEqual(r.map((e) => e.name), ['Artesao', 'Lutador']);
  // Combate e skills de combate não contam: o lutador só tem a mineração acima de 1.
  assert.ok(r[0].skillerLevel! > r[1].skillerLevel!);
  assert.equal(r[0].skillerLevel! - r[1].skillerLevel!, 40 + 30 - 10 - 1);
});
