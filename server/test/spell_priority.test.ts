import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, SPELLS, XP_TABLE, parseHuntNode, playerStats, runCycle } from '@grimhold/shared';

test('ordem da barra: a 1ª magia pronta e cara não perde a vez para a de baixo, mais barata', () => {
  const h = HUNTS.find((x) => x.id === 'crystal_caverns')!;
  const node = parseHuntNode(h.id)!;
  const spells = ['divine_wrath', 'holy_light'].map((id) => SPELLS.find((s) => s.id === id)!);
  const base = playerStats('devout', XP_TABLE[150], { attack: 0, defense: 0, hp: 0 }, null, []);
  const count = (priority: boolean) => {
    const n: Record<string, number> = {};
    for (let seed = 1; seed <= 30; seed++) {
      const c = runCycle(h, { ...base, spells, rules: { priority } }, seed, 1, node.difficulty, 3);
      for (const x of c.hits) if (x.spell) n[x.spell] = (n[x.spell] ?? 0) + 1;
    }
    return n;
  };
  const withOrder = count(true);
  assert.ok((withOrder.divine_wrath ?? 0) > 0, 'a Ira sai');
  // Guardando mana para a Ira, a Luz só sai enquanto a Ira está em recarga.
  assert.ok((withOrder.divine_wrath ?? 0) * 2 >= (withOrder.holy_light ?? 0) * 0.5, JSON.stringify(withOrder));
  console.log('com a ordem da barra', withOrder, 'sem', count(false));
});
