import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, DIFFICULTIES, runCycle, playerStats, xpForLevel, rush250 } from '@grimhold/shared';

// Monstro morre no primeiro golpe: compara só a XP por luta.
const fight = (level: number, hunt: string) => {
  const pl = playerStats('hunter', xpForLevel(level), {} as any, null, []);
  return runCycle(HUNTS.find((h) => h.id === hunt)!, { ...pl, attack: 1e9 } as any, 99, 1, DIFFICULTIES[0], 1).xp;
};

test('corrida até o 250: vale só abaixo do 250 (um nível 290 na Cripta dos Mestres não passa as caçadas dele)', () => {
  // 21/10: a corrida foi desligada (dava ~7 níveis/h no 234).
  assert.equal(rush250(245), 1);
  // Nível 290: a Cripta (245) rende bem menos por luta que as caçadas do 280-288.
  const crypt = fight(290, 'masters_crypt');
  assert.ok(crypt * 4 < fight(290, 'bone_legion_halls'));
  assert.ok(crypt * 4 < fight(290, 'embalmers_crypt'));
});
