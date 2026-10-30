/** XP/h de um personagem real em várias caçadas, com e sem elemento/stamina. */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus } from '@grimhold/shared';
const xp = 110969535;
const L = XP_TABLE.findIndex((x) => x > xp) - 1;
const eq = { amulet: 'emerald_amulet', armor: 'abyss_robe_armor+4', boots: 'tide_boots', helmet: 'lich_crown', legs: 'lich_legs', ring: 'life_ring+4', shield: 'abyss_aegis', weapon: 'arena70_mace' };
const pl = playerStats('devout', xp, equipmentBonus(eq as any), 'avenger', ['holy_light', 'judgement', 'blessing', 'divine_heal'] as any);
console.log('nível', L, 'elem', pl.element, pl.elementShare);
const bank = { roasted_ham: 1e9 } as any;
for (const node of (process.argv[2] ?? 'demon_rift,demon_rift:3,giant_peaks,giant_peaks:7').split(',')) {
  const p = parseHuntNode(node)!;
  const h = p.hunt;
  for (const [lbl, who] of [['elem', pl], ['sem', { ...pl, element: undefined, elementShare: undefined }]] as const) {
    let ms = 0, gx = 0, d = 0;
    for (let s = 0; s < 300; s++) {
      const c = runCycle(h, who as any, 99, s, p.difficulty, p.pack);
      if (c.outcome === 'death') { d++; ms += c.fightMs; continue; }
      ms += c.fightMs + eatAfterFight(c, who as any, bank).restMs; gx += c.xp;
    }
    console.log(node.padEnd(16), lbl, ((gx / ms) * 3.6e6 / 1e6).toFixed(1) + 'M/h', d ? d + '✝' : '');
  }
}
