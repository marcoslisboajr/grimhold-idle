import { test } from 'node:test';
import assert from 'node:assert/strict';
import { huntById, huntNode, playerStats, runCycle, runesUsed, simulateHunt, withRunes, XP_TABLE, type Activity } from '@grimhold/shared';

const hunt = (node: string, seed = 42): Activity => ({ skill: 'combat', node, since: 0, seed, seq: 0 });

test('runa de área acerta todos os monstros vivos e gasta uma só', () => {
  const h = huntById('goblin_den')!;
  const p = withRunes(playerStats('warrior', XP_TABLE[10]), ['spark_rune'], { spark_rune: 50 });
  const c = runCycle(h, p, 7, 0, undefined, 3);
  const t0 = c.hits.find((x) => x.rune)!.t;
  const first = c.hits.filter((x) => x.rune === 'spark_rune' && x.t === t0);
  assert.equal(first.length, 3, 'acerta os 3 do bando');
  assert.equal(first.filter((x) => !x.runeExtra).length, 1, 'gasta uma runa');
});

test('sem runa no banco não usa; com pouca, não passa do que tem', () => {
  const h = huntById('goblin_den')!;
  const base = playerStats('warrior', XP_TABLE[10]);
  assert.equal(withRunes(base, ['spark_rune'], {}), base);
  const c = runCycle(h, withRunes(base, ['spark_rune'], { spark_rune: 1 }), 7, 0, undefined, 3);
  assert.equal(runesUsed(c.hits).spark_rune ?? 0, 1);
});

test('a caçada desconta as runas usadas do banco', () => {
  const r = simulateHunt(hunt(huntNode('river_bank')), 10 * 60_000, {
    vocation: 'warrior',
    combatXp: XP_TABLE[5],
    runes: ['spark_rune', 'light_heal_rune'],
    bank: { spark_rune: 1000, light_heal_rune: 1000 },
  });
  assert.ok((r.gains.items.spark_rune ?? 0) < 0, 'gastou runas de ataque');
});

test('runa de ataque mata mais rápido (mesma luta)', () => {
  const h = huntById('river_bank')!;
  const base = playerStats('warrior', XP_TABLE[3]);
  const plain = runCycle(h, base, 11, 0);
  const runed = runCycle(h, withRunes(base, ['heavy_missile_rune'], { heavy_missile_rune: 9 }), 11, 0);
  assert.ok(runed.fightMs <= plain.fightMs);
});
