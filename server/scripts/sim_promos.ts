/**
 * Compara as subclasses (promoções) de cada vocação: XP/h e mortes em algumas
 * caçadas, sozinho e em bando, com o melhor equipamento do nível.
 *   node --import tsx scripts/sim_promos.ts [nivel] [caçada:bando,...] [tier]
 */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, PROMOTIONS } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };

const L = Number(process.argv[2] ?? 80);
const runs = (process.argv[3] ?? 'demon_rift:1,demon_rift:5,black_knight_crypt:1,black_knight_crypt:3').split(',').map((s) => s.split(':'));
const tier = Number(process.argv[4] ?? 2);
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
console.log(`nível ${L}, subclasses tier ${tier}: XP/h em milhões (mortes em 300 lutas)`);
console.log(''.padEnd(24) + runs.map(([h, p]) => `${h.slice(0, 12)} x${p}`.padEnd(20)).join(''));
for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
  const promos = (PROMOTIONS as any[]).filter((p) => p.vocation === voc && (p.tier ?? 1) === tier);
  for (const promo of promos) {
    const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo.id, defaultSpells(voc, L));
    const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
    const row: string[] = [];
    for (const [hid, pack] of runs) {
      const h = HUNTS.find((x) => x.id === hid)!;
      const p = parseHuntNode(h.id)!;
      let ms = 0;
      let xp = 0;
      let deaths = 0;
      for (let s = 0; s < 300; s++) {
        const c = runCycle(h, pl, 99, s, p.difficulty, Number(pack));
        if (c.outcome === 'death') {
          deaths++;
          ms += c.fightMs;
          continue;
        }
        ms += c.fightMs + eatAfterFight(c, pl, bank).restMs;
        xp += c.xp;
      }
      row.push(`${((xp / ms) * 3.6e3 / 1e3).toFixed(2)}M${deaths ? ` (${deaths}✝)` : ''}`.padEnd(20));
    }
    console.log(`${voc.slice(0, 4)} ${promo.name}`.padEnd(24) + row.join(''));
  }
}
