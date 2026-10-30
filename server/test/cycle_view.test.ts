import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, currentCycle, simulateHunt, xpForLevel, type HuntContext } from '@grimhold/shared';

// A luta mostrada na tela (currentCycle) tem que ser a mesma que o servidor calcula (simulateHunt):
// antes a tela ignorava as skills e mostrava o personagem morrendo enquanto o servidor vencia.
test('tela e servidor: a primeira luta da caçada tem o mesmo resultado', () => {
  let checked = 0;
  for (const vocation of ['warrior', 'hunter', 'arcanist', 'devout']) {
    for (const level of [30, 60, 90]) {
      for (const hunt of HUNTS.filter((h) => !h.boss && Math.abs(h.level - level) <= 15).slice(0, 3)) {
        for (const pack of [1, 4]) {
          const skillXp = xpForLevel(Math.round(level * 0.9));
          const ctx: HuntContext = {
            vocation,
            combatXp: xpForLevel(level),
            skills: { melee: skillXp, ranged: skillXp, magic_level: skillXp, shielding: skillXp },
            bank: {},
          } as HuntContext;
          const activity = { skill: 'combat' as const, node: `${hunt.id}:${pack}`, since: 0, seed: 1234 + level, seq: 0 };
          const view = currentCycle(activity as never, ctx)!;
          // Tempo exato da primeira luta (+ descanso): o servidor fecha só esse ciclo.
          const sim = simulateHunt(activity as never, view.fightMs + view.restMs + 1, ctx);
          const serverDied = !!sim.gains.death;
          assert.equal(view.outcome === 'death', serverDied, `${vocation} ${level} ${hunt.id}:${pack} tela=${view.outcome} servidor=${serverDied ? 'morte' : 'vitória'}`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 20, `poucos casos: ${checked}`);
});
