import { runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor, withRunes, withPotion } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const L = Number(process.argv[2] ?? 80);
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) { const e = i.equip; if (!e || i.legendary || e.level > lv) continue; if (e.vocations && !e.vocations.includes(voc)) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8; if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc }; }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
const X = XP_TABLE[L];
const sk: any = { warrior: { melee: X, shielding: X / 2 }, hunter: { ranged: X }, arcanist: { magic_level: X }, devout: { melee: X * 0.7, magic_level: X * 0.7, shielding: X / 2 } };
const foods = (items as any[]).filter((i) => i.food).sort((a, b) => a.food - b.food);
const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()!.id]: 1e9 };
for (const node of (process.argv[3] ?? 'demon_rift,demon_rift:3,giant_peaks:3,giant_peaks:7').split(',')) {
  const p = parseHuntNode(node)!; const row: string[] = [];
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    const pl0 = playerStats(voc, X, equipmentBonus(gear(voc, L)), promotionsFor(voc)[0]?.id, defaultSpells(voc, L), { combat: X, ...sk[voc] });
    const pl1 = process.env.POT ? withPotion(pl0, 'strength_potion') : pl0;
    const pl = process.env.RUNE ? withRunes(pl1, [process.env.RUNE], { [process.env.RUNE]: 1e9 }) : pl1;
    let ms = 0, xp = 0, d = 0;
    for (let s = 0; s < 200; s++) { const c = runCycle(p.hunt, pl, 99, s, p.difficulty, p.pack); if (c.outcome === 'death') { d++; ms += c.fightMs; continue; } ms += c.fightMs + eatAfterFight(c, pl, bank).restMs; xp += c.xp; }
    row.push(`${voc.slice(0, 4)} ${((xp / ms) * 3.6e3 / 1e3).toFixed(1)}M${d ? `(${d}✝)` : ''}`);
  }
  console.log(node.padEnd(15), row.join('  '));
}
