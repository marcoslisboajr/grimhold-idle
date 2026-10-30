import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, XP_TABLE, productionSpeed, simulateProduction } from '@grimhold/shared';

test('produção: nível acima da receita acelera 0,5% por nível (até 25%)', () => {
  const r = RECIPES.smithing[0];
  assert.equal(productionSpeed('smithing', r.id, XP_TABLE[r.level]), 0);
  assert.ok(Math.abs(productionSpeed('smithing', r.id, XP_TABLE[r.level + 10]) - 0.05) < 1e-9);
  assert.equal(productionSpeed('smithing', r.id, XP_TABLE[r.level + 90]), 0.25);
  const bank = Object.fromEntries(Object.entries(r.inputs).map(([id, q]) => [id, q * 1000]));
  const act = { skill: 'smithing' as const, node: r.id, since: 0, seed: 1, seq: 0 };
  const slow = simulateProduction(act, r.intervalMs * 100, bank).gains.actions;
  const fast = simulateProduction(act, r.intervalMs * 100, bank, 0.25).gains.actions;
  assert.equal(slow, 100);
  assert.equal(fast, 125);
});
