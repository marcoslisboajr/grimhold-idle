/**
 * Até que onda cada vocação chega numa arena, com o melhor equipamento do nível.
 *   node --import tsx scripts/sim_arena.ts [arena] [nivel,nivel...]
 */
import { arenaById, runArenaCycle, playerStats, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };

const arena = arenaById(process.argv[2] ?? 'arena_70')!;
const levels = (process.argv[3] ?? `${arena.level - 5},${arena.level},${arena.level + 5},${arena.level + 10}`).split(',').map(Number);
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) {
    const e = i.equip;
    if (!e || i.legendary || e.level > lv) continue;
    if (e.vocations && !e.vocations.includes(voc)) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
    if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
  }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
console.log(`== ${arena.id}: ondas vencidas (de ${arena.opponents.length}) em 200 tentativas, média e % que limpa`);
for (const L of levels) {
  const row: string[] = [];
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    const promo = L >= 30 ? promotionsFor(voc, L >= 100 ? 3 : L >= 70 ? 2 : 1)[0]?.id : null;
    const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo, defaultSpells(voc, L));
    let sum = 0;
    let clears = 0;
    for (let seed = 1; seed <= 200; seed++) {
      let w = 0;
      while (w < arena.opponents.length && runArenaCycle(arena, pl, seed * 7919, w).outcome === 'win') w++;
      sum += w;
      if (w === arena.opponents.length) clears++;
    }
    row.push(`${voc} ${(sum / 200).toFixed(1)} (${Math.round(clears / 2)}%)`);
  }
  console.log(`nível ${L}: ${row.join(' | ')}`);
}
