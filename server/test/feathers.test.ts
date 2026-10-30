import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, RECIPES, monsterById, simulateGathering, BIRD_NEST_CHANCE, birdNestFeathers } from '@grimhold/shared';

test('penas: caçadas de pássaros, ninho no Lenhador e desfiar penas especiais', () => {
  for (const id of ['falcon_cliffs', 'ember_peak']) {
    const h = HUNTS.find((x) => x.id === id)!;
    assert.ok(h, id);
    for (const m of h.monsters) assert.ok(monsterById(m)?.loot.some((l) => l.item === 'feather' && l.chance >= 0.8), `${m} solta pena`);
  }
  for (const m of ['spider', 'wasp', 'giant_wasp', 'wyvern']) assert.ok(!monsterById(m)!.loot.some((l) => l.item === 'feather'), `${m} sem pena`);
  const act = { skill: 'woodcutting' as const, node: 'yew', since: 0, seed: 7, seq: 0 };
  const r = simulateGathering(act, 3_600_000);
  const nests = (r.gains.items.feather ?? 0) / birdNestFeathers(45);
  assert.ok(Number.isInteger(nests) && nests > r.gains.actions * BIRD_NEST_CHANCE * 0.4 && nests < r.gains.actions * BIRD_NEST_CHANCE * 2, `ninhos ${nests}`);
  assert.equal(simulateGathering({ ...act, skill: 'mining', node: 'copper_vein' }, 3_600_000).gains.items.feather, undefined);
  assert.ok(RECIPES.fletching.some((x) => x.inputs.harpy_feather && x.output === 'feather'));
});
