import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, isPreySpecies, preyPool } from '@grimhold/shared';
import { openDb } from '../src/db.ts';

const onlyBoss = new Set(HUNTS.filter((h) => h.boss || h.lair).flatMap((h) => h.monsters));
for (const h of HUNTS.filter((x) => !x.boss && !x.lair)) for (const m of h.monsters) onlyBoss.delete(m);

test('prey: só criaturas de caçada normal, em qualquer nível', () => {
  for (let L = 1; L <= 260; L += 5) for (const m of preyPool(L)) assert.ok(!onlyBoss.has(m), `${m} no prey do nível ${L}`);
  assert.equal(isPreySpecies('ozzarak'), false);
  assert.equal(isPreySpecies('vyrathos'), false);
});

test('prey: lista e vaga antigas com chefe somem', () => {
  const db = openDb(':memory:');
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Cacador', 'hunter').id;
  db.setPreyOptions(id, 0, ['ozzarak', 'rat', 'vyrathos'], 'xp');
  db.setPreyOptions(id, 1, ['ozzarak'], 'xp');
  db.setPrey(id, 2, 'vyrathos', 'xp', 3600);
  const p = db.preyFor(id, 3);
  assert.deepEqual(p[0].options, ['rat']);
  assert.equal(p[1].options, undefined);
  assert.equal(p[2].monster, null);
});

test('prey do 400+: sorteia pelo nível das caçadas (400 + Maestria), não só pelo 400', async () => {
  const { createGame } = await import('../src/game.ts');
  const { xpForLevel } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Mestre', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { gold: 1e9 }, xp: { combat: xpForLevel(400) } }, 0, 0);
  db.addMasteryPoints(id, 30);
  const lvl = (m: string) => Math.min(...HUNTS.filter((h) => !h.boss && !h.lair && h.monsters.includes(m)).map((h) => h.level));
  for (let i = 0; i < 12; i++) {
    assert.equal(game.preyReroll(id, i % 3, 1000 + i), null);
    for (const p of db.preyFor(id, 3)) for (const m of [...(p.options ?? []), ...(p.monster ? [p.monster] : [])]) assert.ok(lvl(m) >= 405, `${m} (${lvl(m)}) no prey do 430`);
  }
});
