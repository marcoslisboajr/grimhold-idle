/**
 * Covis (aba Chefes): para cada covil e vocação, personagem no nível do covil e 5 acima, melhor
 * equipamento comum. Mostra segundos por luta, mortes, empates (passou de 60 s), e quantos minutos da
 * melhor caçada normal perto do nível vale a XP de uma vitória; e quantos dias (uma luta por dia), em média, até cair uma peça.
 *   node --import tsx scripts/sim_lairs.ts
 */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, xpForLevel, equipmentBonus, defaultSpells, promotionsFor, instanceRest, monsterById, itemById } from '@grimhold/shared';
import './_tweaks.ts';
import items from '../../shared/data/items.json' with { type: 'json' };

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
function run(h: any, voc: string, L: number, cycles = 200) {
  const p = parseHuntNode(h.id)!;
  const pl = playerStats(voc, xpForLevel(L), equipmentBonus(gear(voc, L)), L >= 30 ? promotionsFor(voc)[0]?.id : null, defaultSpells(voc, L));
  const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
  let ms = 0, xp = 0, deaths = 0, draws = 0, wins = 0, fight = 0;
  for (let s = 0; s < cycles; s++) {
    const c = runCycle(h, pl, 99, s, p.difficulty, 1);
    fight += c.fightMs;
    if (c.outcome === 'death') { deaths++; ms += c.fightMs; continue; }
    if (c.outcome !== 'win') draws++;
    else wins++;
    ms += c.fightMs + instanceRest(h, eatAfterFight(c, pl, bank).restMs);
    xp += c.xp;
  }
  return { xph: (xp / ms) * 3.6e6, killsH: (wins / ms) * 3.6e6, fightS: fight / cycles / 1000, deaths, draws, cycles };
}
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : (n / 1e3).toFixed(0) + 'k');
for (const h of HUNTS.filter((x) => x.lair && (!process.env.ONLY || process.env.ONLY.split(",").includes(x.id)))) {
  const boss = monsterById(h.monsters[0])!;
  const divine = boss.loot.filter((l) => itemById(l.item)?.legendary);
  const armorChance = divine.filter((l) => /_(helm|armor|legs|boots)$/.test(l.item)).reduce((a, l) => a + l.chance, 0);
  const partChance = divine.filter((l) => !/_(helm|armor|legs|boots)$/.test(l.item)).reduce((a, l) => a + l.chance, 0);
  console.log(`\n${h.id} (nível ${h.level}) chefe ${boss.name}: hp ${boss.hp} atk ${boss.attack} def ${boss.defense} xp ${boss.xp}`);
  for (const L of [h.level, h.level + 5]) {
    const normals = HUNTS.filter((x) => !x.boss && !x.lair && Math.abs(x.level - L) <= 12 && x.level <= L);
    for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
      const r = run(h, voc, L);
      const best = Math.max(...normals.map((n) => run(n, voc, L, 80).xph));
      console.log(
        `  ${voc.padEnd(9)} L${L}  luta ${r.fightS.toFixed(1)}s  ✝${r.deaths}/${r.cycles} empate ${r.draws}  ${r.killsH.toFixed(0)} abates/h  vitória ${fmt(r.xph / r.killsH)} XP = ${((r.xph / r.killsH / best) * 60).toFixed(0)} min de caçada (${fmt(best)}/h)` +
          `  peça a cada ${(1 / armorChance).toFixed(0)} dias, parte a cada ${(1 / partChance).toFixed(0)} dias`,
      );
    }
  }
}
