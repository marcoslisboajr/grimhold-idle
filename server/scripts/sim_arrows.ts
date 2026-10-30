/**
 * XP/h do Caçador por flecha e tamanho de bando, com o respingo da flecha de área.
 *   node --import tsx scripts/sim_arrows.ts [nivel] [caçada] [splash fogo,veneno,vazio]
 */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor, withArrow } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };

const L = Number(process.argv[2] ?? 80);
const id = process.argv[3] ?? 'cyclops_lair';
const sp = (process.argv[4] ?? '').split(',').map(Number);
const foods = (items as any[]).filter((i) => i.food).sort((a, b) => a.food - b.food);
const eq: any = {};
for (const i of items as any[]) {
  const e = i.equip;
  if (!e || i.legendary || e.level > L || (e.vocations && !e.vocations.includes('hunter'))) continue;
  const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
  if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
}
const gear = Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
const h = HUNTS.find((x) => x.id === id)!;
const p = parseHuntNode(h.id)!;
const base = playerStats('hunter', XP_TABLE[L], equipmentBonus(gear), L >= 30 ? promotionsFor('hunter')[0]?.id : null, defaultSpells('hunter', L));
const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
console.log(`== ${h.id} (nível ${h.level}), Caçador nível ${L}`);
const splashFor: Record<string, number> = { fire_arrow: sp[0], poison_arrow: sp[1], void_arrow: sp[2] };
for (const arrow of [null, 'mithril_arrow', 'fire_arrow', 'poison_arrow', 'void_arrow']) {
  let pl = withArrow(base, arrow);
  if (arrow && splashFor[arrow] !== undefined && !Number.isNaN(splashFor[arrow])) pl = { ...pl, arrowSplash: splashFor[arrow] || undefined };
  const row: string[] = [];
  for (const pack of [1, 3, 5]) {
    let ms = 0, xp = 0;
    for (let s = 0; s < 300; s++) {
      const c = runCycle(h, pl, 99, s, p.difficulty, pack);
      ms += c.fightMs + (c.outcome === 'death' ? 0 : eatAfterFight(c, pl, bank).restMs);
      if (c.outcome !== 'death') xp += c.xp;
    }
    row.push(`x${pack}: ${(Math.round((xp / ms) * 3.6e6) / 1e6).toFixed(2)}M`);
  }
  console.log(String(arrow ?? 'sem').padEnd(14), row.join('  '));
}
