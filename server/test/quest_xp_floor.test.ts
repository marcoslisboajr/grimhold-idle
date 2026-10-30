import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTING_TASKS, STORIES, xpForLevel } from '@grimhold/shared';

const levelXp = (L: number) => xpForLevel(L + 1) - xpForLevel(L);

test('histórias pagam pelo menos 1 nível de combate do nível delas', () => {
  for (const s of STORIES) for (const e of Object.values(s.endings)) {
    const xp = e.reward.xp?.combat;
    if (xp) assert.ok(xp >= Math.round(levelXp(s.level)) - 1, `${s.id}: ${xp}`);
  }
});

test('tarefas de caça pagam pelo menos 8% de um nível do nível delas', () => {
  for (const t of HUNTING_TASKS) assert.ok(t.xpReward >= Math.round(0.08 * levelXp(t.minLevel)) - 1, `${t.id}: ${t.xpReward}`);
});
