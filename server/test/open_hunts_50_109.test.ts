import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, monsterById } from '@grimhold/shared';

/** Caçadas abertas do 50 ao 109 (18/10): sem quest, monstros que existem, nível e foco certos. */
const NEW: [string, number, string][] = [
  ['coral_depths', 52, 'balanced'],
  ['wyvern_slope', 57, 'xp'],
  ['haunted_ruins', 62, 'balanced'],
  ['scorched_hollow', 66, 'loot'],
  ['infernal_trench', 76, 'xp'],
  ['knights_ravine', 85, 'balanced'],
  ['twisted_grove', 95, 'balanced'],
  ['shadow_threshold', 105, 'loot'],
];

test('caçadas abertas do 50 ao 109: existem, sem quest, com monstros de verdade', () => {
  for (const [id, level, focus] of NEW) {
    const h = HUNTS.find((x) => x.id === id) as any;
    assert.ok(h, id);
    assert.equal(h.level, level, id);
    assert.equal(h.focus, focus, id);
    assert.equal(h.requires, undefined, `${id} não pede quest`);
    assert.ok(!h.boss && !h.lair, `${id} é caçada comum`);
    for (const m of h.monsters) assert.ok(monsterById(m), `${id}: ${m}`);
  }
  // A faixa 50–79 tem caçadas sem quest espalhadas, não só no 70+.
  const open = HUNTS.filter((x: any) => x.level >= 50 && x.level < 80 && !x.requires && !x.boss && !x.lair);
  assert.ok(open.length >= 7, `abertas no 50–79: ${open.length}`);
  assert.ok(open.some((x) => x.level < 60), 'tem caçada aberta abaixo do 60');
});
