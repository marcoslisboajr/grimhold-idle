/**
 * XP/h por tamanho de bando (1 a 7) em algumas caçadas, para cada vocação.
 *   node --import tsx scripts/sim_pack.ts [nivel] [caçada,caçada...]
 */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import './_tweaks.ts';
import items from '../../shared/data/items.json' with { type: 'json' };

const L = Number(process.argv[2] ?? 80);
const ids = (process.argv[3] ?? 'cyclops_lair,demon_rift').split(',');
const foods = (items as any[]).filter((i) => i.food).sort((a, b) => a.food - b.food);
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
for (const id of ids) {
  const h = HUNTS.find((x) => x.id === id)!;
  const p = parseHuntNode(h.id)!;
  console.log(`\n== ${h.id} (nível ${h.level}), personagem nível ${L}`);
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    const promo = L >= 30 ? promotionsFor(voc)[0]?.id : null;
    const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo, defaultSpells(voc, L));
    const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
    const row: string[] = [];
    for (let pack = 1; pack <= 7; pack++) {
      let ms = 0;
      let xp = 0;
      let deaths = 0;
      for (let s = 0; s < 300; s++) {
        const c = runCycle(h, pl, 99, s, p.difficulty, pack);
        if (c.outcome === 'death') {
          deaths++;
          ms += c.fightMs;
          continue;
        }
        ms += c.fightMs + eatAfterFight(c, pl, bank).restMs;
        xp += c.xp;
      }
      row.push(`x${pack}: ${(Math.round((xp / ms) * 3.6e6) / 1e6).toFixed(2)}M${deaths ? ` (${deaths}✝)` : ''}`);
    }
    console.log(voc.padEnd(9), row.join('  '));
  }
}
