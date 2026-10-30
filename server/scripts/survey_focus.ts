/**
 * XP/h, ouro/h e valor dos itens/h (pelo `value` do item, peças pelo tier) de cada caçada comum,
 * personagem 5 níveis acima, bando de 3. Para conferir o foco (XP x loot x equilibrada).
 *   node --import tsx scripts/survey_focus.ts [vocacao]
 */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor, itemById } from '@grimhold/shared';
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
const value = (id: string) => (itemById(id.split('+')[0]) as any)?.value ?? 0;
function run(h: any, L: number, pack: number) {
  const p = parseHuntNode(h.id)!;
  const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(L)), L >= 30 ? promotionsFor(voc)[0]?.id : null, defaultSpells(voc, L));
  const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
  let ms = 0, xp = 0, gold = 0, val = 0, gearN = 0;
  for (let s = 0; s < 200; s++) {
    const c = runCycle(h, pl, 99, s, p.difficulty, pack);
    if (c.outcome === 'death') { ms += c.fightMs; continue; }
    ms += c.fightMs + eatAfterFight(c, pl, bank).restMs;
    xp += c.xp;
    for (const [id, n] of Object.entries(c.loot)) {
      if (id === 'gold') gold += n;
      else { val += value(id) * n; if (itemById(id.split('+')[0])?.equip) gearN += n; }
    }
  }
  const k = 3.6e6 / ms;
  return { xp: xp * k, gold: gold * k, val: val * k, gear: gearN * k };
}
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(0));
console.log(`vocação ${voc}, bando 3: caçada | nível | foco | XP/h | ouro/h | itens/h (valor) | peças/h`);
for (const h of [...HUNTS].filter((x) => !x.boss && !x.lair).sort((a, b) => a.level - b.level)) {
  const L = Math.min(XP_TABLE.length - 2, h.level + Number(process.env.OVER ?? 5));
  const r = run(h, L, Number(process.env.PACK ?? 3));
  console.log(`${h.id.padEnd(22)} ${String(h.level).padStart(3)} ${(h.focus ?? 'eq').padEnd(4)} ${fmt(r.xp).padStart(8)} ${fmt(r.gold).padStart(8)} ${fmt(r.val).padStart(8)} ${r.gear.toFixed(1).padStart(6)}`);
}
