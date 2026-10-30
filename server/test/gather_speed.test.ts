import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gatherSpeed, gatherIntervalMs, nodeById, simulate, xpForLevel, type Activity } from '@grimhold/shared';

const tree = nodeById('woodcutting', 'tree')!;
const at = (level: number) => xpForLevel(level);

test('velocidade de coleta: +0,5% por nível acima do ponto, até +25%', () => {
  assert.equal(gatherSpeed('woodcutting', 'tree', at(tree.level)), 0);
  assert.ok(Math.abs(gatherSpeed('woodcutting', 'tree', at(tree.level + 20)) - 0.1) < 1e-9);
  assert.equal(gatherSpeed('woodcutting', 'tree', at(99)), 0.25, 'teto do nível');
});

test('velocidade de coleta: mascote da skill +10%, de outra skill não; teto total de 50%', () => {
  assert.ok(Math.abs(gatherSpeed('woodcutting', 'tree', at(tree.level), { petSkill: 'woodcutting' }) - 0.1) < 1e-9);
  assert.equal(gatherSpeed('woodcutting', 'tree', at(tree.level), { petSkill: 'mining' }), 0);
  assert.ok(gatherSpeed('woodcutting', 'tree', at(99), { petSkill: 'woodcutting' }) <= 0.5);
});

test('coleta mais rápida rende mais ações no mesmo tempo (online e offline usam o mesmo cálculo)', () => {
  const activity: Activity = { skill: 'woodcutting', node: 'tree', since: 0, seed: 1, seq: 0 };
  const hour = 60 * 60 * 1000;
  const ctx = (xp: number, petSkill: 'woodcutting' | null = null) => ({ vocation: 'warrior' as const, combatXp: 0, bank: {}, skills: { woodcutting: xp }, petSkills: petSkill ? [petSkill] : [] });
  const slow = simulate(activity, hour, ctx(at(tree.level)));
  const fast = simulate(activity, hour, ctx(at(99), 'woodcutting'));
  assert.equal(slow.gains.actions, Math.floor(hour / tree.intervalMs));
  assert.equal(fast.gains.actions, Math.floor(hour / gatherIntervalMs(tree, 0.35)), '+25% do nível +10% do mascote');
  assert.ok(fast.gains.actions > slow.gains.actions);
});
