import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUMMY_NODES, dummyXpPerAction, xpForLevel } from '@grimhold/shared';

const perHour = (level: number) => {
  const d = DUMMY_NODES[0];
  return (dummyXpPerAction(d, xpForLevel(level)) * 3_600_000) / d.intervalMs;
};

test('boneco de treino rende mais XP de skill por hora que a caçada típica do nível', () => {
  // XP de skill/h medido caçando (guerreiro equipado, caçada do nível).
  const hunt: Record<number, number> = { 30: 39341, 50: 64013, 70: 103531, 90: 456484, 110: 1547000 };
  for (const [level, rate] of Object.entries(hunt)) assert.ok(perHour(+level) > rate, `nível ${level}: ${perHour(+level)} > ${rate}`);
});

test('boneco nunca rende menos que antes (24 mil/h) e cresce com o nível', () => {
  assert.ok(perHour(1) >= 24_000);
  assert.ok(perHour(60) > perHour(40));
});
