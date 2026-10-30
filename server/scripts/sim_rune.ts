import { HUNTS, runCycle, playerStats, parseHuntNode, equipmentBonus, withRunes, withPotion } from '@grimhold/shared';
const eq = { amulet: 'emerald_amulet', armor: 'abyss_robe_armor+4', boots: 'tide_boots', helmet: 'lich_crown', legs: 'lich_legs', ring: 'life_ring+4', shield: 'abyss_aegis', weapon: 'arena70_mace' };
const base = playerStats('devout', 141836163, equipmentBonus(eq as any), 'avenger', ['holy_light', 'judgement', 'blessing', 'divine_heal'] as any, { combat: 141836163, magic_level: 74454991, melee: 95665390, shielding: 68335786 } as any);
const p = parseHuntNode('giant_peaks:7')!;
for (const [lbl, pl] of [['sem runa', base], ['pot', withPotion(base,'strength_potion')], ['boulder', withRunes(base, ['boulder_rune'], { boulder_rune: 1e6 })]] as const) {
  const c = runCycle(p.hunt, pl as any, 99, 1, p.difficulty, p.pack);
  const rh = c.hits.filter((h: any) => h.rune).slice(0, 3).map((h: any) => h.dmg + '/' + (h.elem?.dmg ?? 0));
  console.log(lbl, c.outcome, c.fightMs + 'ms', 'rune hits', rh.join(' '), 'mhp', c.monsters.map((m: any) => m.hp).join(','));
}
const c = runCycle(p.hunt, base as any, 99, 1, p.difficulty, p.pack);
console.log('atk', base.attack, 'hits', c.hits.filter((h: any) => h.by === 'p').slice(0, 10).map((h: any) => `${h.dmg}${h.spell ? ':' + h.spell : ''}`).join(' '));
