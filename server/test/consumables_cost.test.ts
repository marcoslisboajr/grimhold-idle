import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, itemById } from '@grimhold/shared';

// Feedback de 16/10: poção de mana e runas acabavam rápido demais e custavam caro para fazer.
test('produção barata: 3 poções de mana e 5 runas por receita', () => {
  const mana = RECIPES.alchemy.filter((r) => itemById(r.output)?.manaPotion);
  assert.equal(mana.length, 6);
  for (const r of mana) assert.equal(r.outputQty, 3, r.id);
  for (const r of RECIPES.runecraft) assert.equal(r.outputQty, 5, r.id);
});
