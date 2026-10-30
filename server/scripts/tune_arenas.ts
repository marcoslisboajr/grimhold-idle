/**
 * Testa multiplicadores de vida/ataque nos oponentes de uma arena (sem mudar o arquivo).
 *   node --import tsx scripts/tune_arenas.ts arena_70 1.2,1.1 [nivel,nivel]
 */
import { arenaById, runArenaCycle, playerStats, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import './_tweaks.ts';
import items from '../../shared/data/items.json' with { type: 'json' };

const arena = arenaById(process.argv[2])!;
const [hpM, atkM] = (process.argv[3] ?? '1,1').split(',').map(Number);
const levels = (process.argv[4] ?? `${arena.level},${arena.level + 5}`).split(',').map(Number);
arena.opponents.forEach((o) => {
  o.hp = Math.round(o.hp * hpM);
  o.attack = Math.round(o.attack * atkM);
});
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) {
    const e = i.equip;
    if (!e || i.legendary || e.level > lv || (e.vocations && !e.vocations.includes(voc))) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
    if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
  }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
for (const L of levels) {
  const row: string[] = [];
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    const promo = L >= 30 ? promotionsFor(voc, L >= 100 ? 3 : L >= 70 ? 2 : 1)[0]?.id : null;
    const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo, defaultSpells(voc, L));
    let clears = 0;
    for (let seed = 1; seed <= 100; seed++) {
      let w = 0;
      while (w < arena.opponents.length && runArenaCycle(arena, pl, seed * 7919, w).outcome === 'win') w++;
      if (w === arena.opponents.length) clears++;
    }
    row.push(`${voc} ${clears}%`);
  }
  console.log(`${arena.id} x${hpM}/${atkM} nível ${L}: ${row.join(' | ')}`);
}
