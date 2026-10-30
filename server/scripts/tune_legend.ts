/** Ajusta a provação do nível 100 (tier 2 + magias do 100): alvo ~30% no 100 e ~80% no 110. */
import { arenaById, runArenaCycle, playerStats, XP_TABLE, equipmentBonus, PROMOTIONS } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const arena = arenaById('trial_legends')!;
const SETS: Record<string, string[]> = {
  warrior: ['execution', 'iron_skin', 'earthquake', 'berserk'],
  hunter: ['piercing_shot', 'field_bandage', 'field_bandage', 'eagle_eye'],
  arcanist: ['ice_storm', 'meteor', 'mana_barrier', 'lightning'],
  devout: ['divine_wrath', 'great_heal', 'divine_heal', 'holy_light'],
};
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) { const e = i.equip; if (!e || i.legendary || e.level > lv) continue; if (e.vocations && !e.vocations.includes(voc)) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8; if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc }; }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
const clear = (L: number) => Object.keys(SETS).map((voc) => {
  const promos = (PROMOTIONS as any[]).filter((p) => p.vocation === voc && p.tier === 2);
  let c = 0, n = 0;
  for (const pr of promos) {
    const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), pr.id, SETS[voc]);
    for (let seed = 1; seed <= (Number(process.env.SEEDS) || 30); seed++) { n++; let w = 0; while (w < arena.opponents.length && runArenaCycle(arena, pl, seed * 7919, w).outcome === 'win') w++; if (w === arena.opponents.length) c++; }
  }
  return Math.round((c / n) * 100);
});
if (process.argv[2] === 'grid') {
  const base0 = arena.opponents.map((o) => ({ ...o }));
  for (const k of [0.63, 0.68]) for (const hpK of [0.5, 0.6]) {
    arena.opponents.forEach((o, i) => { o.attack = Math.round(base0[i].attack * k); o.hp = Math.round(base0[i].hp * (i === 2 ? hpK : 1)); });
    console.log(k, hpK, 'L100', clear(100).join(','), 'L110', clear(110).join(','));
  }
  process.exit(0);
}
if (process.argv[2] === 'show') { for (const L of [100, 105, 110, 115]) console.log(L, clear(L)); process.exit(0); }
const base = arena.opponents.map((o) => ({ ...o }));
let best: any = null;
for (const k of [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.15]) for (const hpK of [0.6, 0.8, 1, 1.25]) {
  arena.opponents.forEach((o, i) => { o.attack = Math.round(base[i].attack * k); o.hp = Math.round(base[i].hp * (i === 2 ? hpK : 1)); });
  const a = clear(100), b = clear(110);
  const score = a.reduce((s, x) => s + Math.abs(x - 30), 0) + b.reduce((s, x) => s + Math.abs(x - 80), 0);
  if (!best || score < best.score) best = { score, k, hpK, a, b, ops: arena.opponents.map((o) => `${o.hp}/${o.attack}`) };
}
console.log(JSON.stringify(best));
