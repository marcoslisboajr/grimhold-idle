/** Vida perdida por segundo no chefe mundial, por vocação e nível (negativo = nunca cai). */
import { playerStats, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor, bossDrain } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
function gear(voc: string, lv: number, legendary: boolean) {
  const eq: any = {};
  for (const i of items as any[]) {
    const e = i.equip;
    if (!e || (i.legendary && !legendary) || e.level > lv || (e.vocations && !e.vocations.includes(voc))) continue;
    const sc = (e.defense ?? 0) * 2 + (e.hp ?? 0) / 8 + (e.attack ?? 0);
    if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
  }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
for (const L of [80, 100]) for (const leg of [false, true]) for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
  const promos = promotionsFor(voc);
  for (const pr of promos.slice(0, 2)) {
    const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L, leg)), pr?.id, defaultSpells(voc, L));
    const d = bossDrain(pl, L, voc);
    console.log(`nv ${L} ${leg ? 'lend' : 'norm'} ${voc.padEnd(8)} ${String(pr?.id).padEnd(16)} def ${Math.round(pl.defense)}  perda ${(d * 100).toFixed(2)}%/s  ${d > 0 ? `cai em ${Math.round(1 / d)}s` : 'NUNCA CAI'}`);
  }
}
