import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENAS, XP_TABLE, playerStats, runArenaCycle } from '@grimhold/shared';

test('arena: as magias saem (custo em pontos de mana, como na caçada)', () => {
  const p = playerStats('arcanist', XP_TABLE[60], undefined, null, ['fireball', 'lightning', 'arcane_shield']);
  const c = runArenaCycle(ARENAS[0], p, 7, 0);
  assert.ok(c.hits.some((h) => h.by === 'p' && h.spell), 'nenhuma magia saiu na arena');
});

test('arena: Escudo de Mana do Arcanista tira parte do dano da mana', () => {
  const p = playerStats('arcanist', XP_TABLE[100], undefined, null, []);
  assert.ok(p.manaShield && p.manaShield > 0);
  const arena = ARENAS.find((a) => a.id === 'arena_100')!;
  const taken = (f: typeof p) => runArenaCycle(arena, f, 11, 9).hits.filter((h) => h.by === 'm').reduce((s, h) => s + h.dmg, 0) / Math.max(1, runArenaCycle(arena, f, 11, 9).hits.filter((h) => h.by === 'm').length);
  assert.ok(taken(p) < taken({ ...p, manaShield: 0 }), 'com o escudo cada golpe tira menos vida');
});
