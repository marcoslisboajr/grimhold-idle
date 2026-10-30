/** % de vitória de cada provação no nível dela e 5 acima, por vocação (melhor equipamento comum, magias padrão). */
import { ARENAS, runArenaCycle, playerStats, XP_TABLE, equipmentBonus, defaultSpells, PROMOTIONS } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) { const e = i.equip; if (!e || i.legendary || e.level > lv) continue; if (e.vocations && !e.vocations.includes(voc)) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8; if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc }; }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
for (const arena of ARENAS.filter((a: any) => a.trial && a.id !== 'trial_legends')) {
  const row = [arena.level, arena.level + 5].map((L) => ['warrior', 'hunter', 'arcanist', 'devout'].map((voc) => {
    const tier = L >= 70 ? 2 : 1;
    const pr = (PROMOTIONS as any[]).find((p) => p.vocation === voc && (p.tier ?? 1) === tier)!;
    const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), pr.id, defaultSpells(voc, L));
    let c = 0;
    for (let seed = 1; seed <= 40; seed++) { let w = 0; while (w < arena.opponents.length && runArenaCycle(arena, pl, seed * 7919, w).outcome === 'win') w++; if (w === arena.opponents.length) c++; }
    return Math.round((c / 40) * 100);
  }).join('/'));
  console.log(arena.id, 'nv', arena.level, row.join('  +5: '));
}
