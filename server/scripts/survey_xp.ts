/**
 * Levantamento de XP/h de todas as caçadas: personagem 5 níveis acima da caçada,
 * melhor equipamento comum, sozinho e em bando de 3; horas para subir um nível.
 *   node --import tsx scripts/survey_xp.ts [vocacao]
 */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import './_tweaks.ts';
import items from '../../shared/data/items.json' with { type: 'json' };

const voc = process.argv[2] ?? 'warrior';
const foods = (items as any[]).filter((i) => i.food).sort((a, b) => a.food - b.food);
function gear(lv: number) {
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
function xph(h: any, L: number, pack: number) {
  const p = parseHuntNode(h.id)!;
  const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(L)), L >= 30 ? promotionsFor(voc)[0]?.id : null, defaultSpells(voc, L));
  const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
  let ms = 0, xp = 0, deaths = 0;
  for (let s = 0; s < 120; s++) {
    const c = runCycle(h, pl, 99, s, p.difficulty, pack);
    if (c.outcome === 'death') { deaths++; ms += c.fightMs; continue; }
    ms += c.fightMs + eatAfterFight(c, pl, bank).restMs;
    xp += c.xp;
  }
  return { v: (xp / ms) * 3.6e6, deaths };
}
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : (n / 1e3).toFixed(0) + 'k');
console.log(`vocação ${voc}: caçada | nível | XP/h solo | XP/h x3 | horas p/ nível (melhor)`);
for (const h of [...HUNTS].sort((a, b) => a.level - b.level)) {
  const L = Math.min(XP_TABLE.length - 2, h.level + 5);
  const a = xph(h, L, 1), b = xph(h, L, 3);
  const best = Math.max(a.v, b.v);
  const need = XP_TABLE[L + 1] - XP_TABLE[L];
  console.log(`${h.id.padEnd(22)} ${String(h.level).padStart(3)}  ${fmt(a.v).padStart(8)}${a.deaths ? '✝' + a.deaths : ''}  ${fmt(b.v).padStart(8)}${b.deaths ? '✝' + b.deaths : ''}  ${(need / best).toFixed(1)}h`);
}
