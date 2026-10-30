import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelForXp, levelProgress, nodeById, OFFLINE_CAP_MS, simulateGathering as simulate, XP_TABLE } from '@grimhold/shared';

test('curva de XP: a do RuneScape esticada por (1 + 0,6 por nível)', () => {
  // RuneScape: 83 no nível 2, 1154 no 10.
  assert.equal(XP_TABLE[2], 132);
  assert.equal(XP_TABLE[10], 7387);
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(XP_TABLE[2] - 1), 1);
  assert.equal(levelForXp(XP_TABLE[2]), 2);
  assert.equal(levelForXp(XP_TABLE[99]), 99);
  // Profissões travam em 120
  assert.equal(levelForXp(XP_TABLE[120], 'mining'), 120);
  assert.equal(levelForXp(XP_TABLE[121], 'mining'), 120);
  assert.equal(levelForXp(999_999_999_999, 'mining'), 120);
  assert.equal(levelProgress(XP_TABLE[120], 'mining'), 1);
  assert.equal(levelProgress(XP_TABLE[121], 'mining'), 1);

  // Combate não tem nível máximo (infinito)
  assert.equal(levelForXp(XP_TABLE[120], 'combat'), 120);
  assert.equal(levelForXp(XP_TABLE[121], 'combat'), 121);
  assert.equal(levelForXp(XP_TABLE[150], 'combat'), 150);
  assert.equal(levelForXp(XP_TABLE[200], 'combat'), 200);
  assert.equal(levelProgress(0, 'combat'), 0);
  assert.equal(levelProgress(XP_TABLE[120], 'combat'), 0);
  const mid120 = XP_TABLE[120] + (XP_TABLE[121] - XP_TABLE[120]) / 2;
  assert.equal(levelProgress(mid120, 'combat'), 0.5);
});

// Veio de Cobre: 3000 ms por ação, 1 minério.
const copper = (since: number) => ({ skill: 'mining' as const, node: 'copper_vein', since, seed: 0, seq: 0 });

test('conta só as ações completas e guarda o resto', () => {
  const { gains, since } = simulate(copper(0), 10_000);
  assert.equal(gains.actions, 3);
  assert.deepEqual(gains.items, { copper_ore: 3 });
  assert.deepEqual(gains.xp, { mining: 3 * nodeById('mining', 'copper_vein')!.xp });
  assert.equal(since, 9_000, 'a 4ª ação já tem 1 s andado');
});

test('antes da primeira ação terminar, não ganha nada', () => {
  const r = simulate(copper(0), 2_999);
  assert.equal(r.gains.actions, 0);
  assert.equal(r.since, 0);
});

test('offline para no teto de 12 h', () => {
  const now = OFFLINE_CAP_MS * 3;
  const { gains, since } = simulate(copper(0), now);
  assert.equal(gains.actions, OFFLINE_CAP_MS / 3000);
  assert.ok(since <= now && now - since < 3000, 'a próxima ação recomeça perto de agora');
});

test('acertar em vários pedaços dá o mesmo que acertar de uma vez', () => {
  let since = 0;
  let actions = 0;
  for (let t = 700; t <= 60_000; t += 700) {
    const r = simulate(copper(since), t);
    actions += r.gains.actions;
    since = r.since;
  }
  const r = simulate(copper(since), 60_000);
  assert.equal(actions + r.gains.actions, simulate(copper(0), 60_000).gains.actions);
});
