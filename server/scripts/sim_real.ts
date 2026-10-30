/** XP/h de um personagem com skills/equipamento dados, numa caçada (com comida e runas à vontade). */
import { runCycle, playerStats, parseHuntNode, eatAfterFight, equipmentBonus, withRunes, withPotion } from '@grimhold/shared';
const [voc, promo, node] = [process.argv[2], process.argv[3], process.argv[4]];
const skills = JSON.parse(process.argv[5]);
const eq = JSON.parse(process.argv[6]);
const spells = JSON.parse(process.argv[7]);
const base = playerStats(voc, skills.combat, equipmentBonus(eq), promo, spells, skills);
const pot = process.env.NOPOT ? base : withPotion(base, 'strength_potion');
const pl = process.env.NORUNE ? pot : withRunes(pot, ['boulder_rune'], { boulder_rune: 1e9 });
const p = parseHuntNode(node)!;
let ms = 0, xp = 0, d = 0, fight = 0, n = 0;
for (let s = 0; s < 200; s++) {
  const c = runCycle(p.hunt, pl, 99, s, p.difficulty, p.pack);
  if (c.outcome === 'death') { d++; ms += c.fightMs; continue; }
  ms += c.fightMs + eatAfterFight(c, pl, { roasted_ham: 1e9 }).restMs; xp += c.xp; fight += c.fightMs; n++;
}
console.log(`${voc} ${node}: ${((xp / ms) * 3.6e6 / 1e6).toFixed(1)}M/h, luta ${(fight / Math.max(1, n) / 1000).toFixed(1)}s ${d ? d + '✝' : ''}`);
