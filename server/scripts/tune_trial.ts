/** Procura vida/ataque do chefe de uma provação para que no nível dela ~metade limpe e 5 níveis acima quase todos. */
import { arenaById, runArenaCycle, playerStats, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const arena = arenaById(process.argv[2])!;
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) { const e = i.equip; if (!e || i.legendary || e.level > lv) continue; if (e.vocations && !e.vocations.includes(voc)) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8; if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc }; }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
const clear = (L: number) => ['warrior', 'hunter', 'arcanist', 'devout'].map((voc) => {
  const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promotionsFor(voc)[0]?.id, defaultSpells(voc, L));
  let c = 0;
  for (let seed = 1; seed <= 60; seed++) { let w = 0; while (w < arena.opponents.length && runArenaCycle(arena, pl, seed * 7919, w).outcome === 'win') w++; if (w === arena.opponents.length) c++; }
  return Math.round((c / 60) * 100);
});
const boss = arena.opponents[arena.opponents.length - 1];
const base = { ...boss };
const others = arena.opponents.slice(0, -1).map((o) => ({ ...o }));
let best: any = null;
const casterBase = arena.casters?.damage ?? 0;
for (const cK of arena.casters ? [0.25, 0.4, 0.55, 0.7] : [1]) for (const scale of [0.6, 0.7, 0.8, 0.9, 1]) for (const hpK of [0.5, 0.65, 0.8, 1]) for (const atkK of [0.75, 0.85, 0.95, 1.05]) {
  if (arena.casters) arena.casters.damage = Math.round(casterBase * cK);
  arena.opponents.forEach((o, i) => { if (i < others.length) { o.hp = Math.round(others[i].hp * scale); o.attack = Math.round(others[i].attack * scale); } });
  boss.hp = Math.round(base.hp * hpK); boss.attack = Math.round(base.attack * atkK);
  const a = clear(arena.level), b = clear(arena.level + 5);
  const score = a.reduce((s, x) => s + Math.abs(x - 55), 0) + b.reduce((s, x) => s + Math.abs(x - 95), 0);
  if (!best || score < best.score) best = { score, caster: arena.casters?.damage, scale, hp: boss.hp, atk: boss.attack, a, b, others: arena.opponents.slice(0, -1).map((o) => `${o.hp}/${o.attack}`) };
}
console.log(arena.id, JSON.stringify(best));
