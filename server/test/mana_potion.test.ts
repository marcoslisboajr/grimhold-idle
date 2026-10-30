import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MANA_POTION_COOLDOWN_MS, XP_TABLE, huntById, playerStats, runCycle, withManaPotion } from '@grimhold/shared';

test('poção de mana: abaixo do limite, um gole a cada 2 s sem parar (igual à de vida)', () => {
  const hunt = huntById('dragon_nest')!;
  const base = playerStats('arcanist', XP_TABLE[90]);
  // Começa sem mana e com o limite em 100%: deve beber a luta toda, com 2 s entre os goles.
  const p = { ...withManaPotion(base, 'mana_potion', { mana_potion: 500 }), initialMana: 0, rules: { manaBelow: 1 }, level: 90 };
  const c = runCycle(hunt, p, 11, 0);
  const sips = c.hits.filter((h) => h.manaPotion).map((h) => h.t);
  assert.ok(sips.length >= 2, `bebeu ${sips.length} vezes`);
  for (let i = 1; i < sips.length; i++) assert.ok(sips[i] - sips[i - 1] >= MANA_POTION_COOLDOWN_MS, 'respeita os 2 s');
  // Não fica parado: entre um gole e o próximo, no máximo o cooldown mais um golpe.
  const gap = Math.max(...sips.slice(1).map((t, i) => t - sips[i]));
  assert.ok(gap <= MANA_POTION_COOLDOWN_MS + Math.max(p.attackSpeedMs, 2000), `maior espera entre goles: ${gap} ms`);
});
