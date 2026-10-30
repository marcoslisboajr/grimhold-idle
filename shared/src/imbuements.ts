import type { Bonus } from './skills.ts';

export interface ImbuementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 1 | 2 | 3;
  materials: Record<string, number>;
  durationCombatSecs: number;
  bonus: Partial<Bonus>;
}

export const IMBUEMENTS: ImbuementDef[] = [
  {
    id: 'vampirism_1',
    name: 'Vampirismo I',
    description: '+5% de roubo de vida por 2 horas de caçada.',
    icon: 'imbuement_vampirism',
    tier: 1,
    materials: { bat_wing: 20 },
    durationCombatSecs: 7200,
    bonus: { lifesteal: 0.05 },
  },
  {
    id: 'vampirism_2',
    name: 'Vampirismo II',
    description: '+10% de roubo de vida por 2 horas de caçada.',
    icon: 'imbuement_vampirism',
    tier: 2,
    materials: { vampire_blood: 25 },
    durationCombatSecs: 7200,
    bonus: { lifesteal: 0.10 },
  },
  {
    id: 'crit_1',
    name: 'Golpe Crítico I',
    description: '+5% de chance de acerto crítico por 2 horas de caçada.',
    icon: 'imbuement_crit',
    tier: 1,
    materials: { wolf_pelt: 25 },
    durationCombatSecs: 7200,
    bonus: { crit: 0.05 },
  },
  {
    id: 'crit_2',
    name: 'Golpe Crítico II',
    description: '+10% de chance de acerto crítico por 2 horas de caçada.',
    icon: 'imbuement_crit',
    tier: 2,
    materials: { shadow_claw: 20 },
    durationCombatSecs: 7200,
    bonus: { crit: 0.10 },
  },
  {
    id: 'strike_1',
    name: 'Impacto Brutal I',
    description: '+12 de ataque por 2 horas de caçada.',
    icon: 'imbuement_strike',
    tier: 1,
    materials: { minotaur_horn: 20 },
    durationCombatSecs: 7200,
    bonus: { attack: 12 },
  },
  {
    id: 'strike_2',
    name: 'Impacto Brutal II',
    description: '+28 de ataque por 2 horas de caçada.',
    icon: 'imbuement_strike',
    tier: 2,
    materials: { giant_rock: 20 },
    durationCombatSecs: 7200,
    bonus: { attack: 28 },
  },
  {
    id: 'protection_1',
    name: 'Proteção Elemental I',
    description: '+10 de defesa por 2 horas de caçada.',
    icon: 'imbuement_protection',
    tier: 1,
    materials: { orc_tusk: 25 },
    durationCombatSecs: 7200,
    bonus: { defense: 10 },
  },
  {
    id: 'protection_2',
    name: 'Proteção Elemental II',
    description: '+25 de defesa por 2 horas de caçada.',
    icon: 'imbuement_protection',
    tier: 2,
    materials: { cursed_iron: 20 },
    durationCombatSecs: 7200,
    bonus: { defense: 25 },
  },
  {
    id: 'swiftness_1',
    name: 'Celeridade I',
    description: 'Ataques 5% mais rápidos por 2 horas de caçada.',
    icon: 'imbuement_swiftness',
    tier: 1,
    materials: { harpy_feather: 20 },
    durationCombatSecs: 7200,
    bonus: { speed: -0.05 },
  },
  {
    id: 'swiftness_2',
    name: 'Celeridade II',
    description: 'Ataques 10% mais rápidos por 2 horas de caçada.',
    icon: 'imbuement_swiftness',
    tier: 2,
    materials: { dark_feather: 20 },
    durationCombatSecs: 7200,
    bonus: { speed: -0.10 },
  },
  {
    id: 'regen_1',
    name: 'Vitalidade I',
    description: '+10% de regeneração por 2 horas de caçada.',
    icon: 'imbuement_regen',
    tier: 1,
    materials: { ectoplasm: 20 },
    durationCombatSecs: 7200,
    bonus: { regen: 0.10 },
  },
  {
    id: 'regen_2',
    name: 'Vitalidade II',
    description: '+20% de regeneração por 2 horas de caçada.',
    icon: 'imbuement_regen',
    tier: 2,
    materials: { frost_crystal: 20 },
    durationCombatSecs: 7200,
    bonus: { regen: 0.20 },
  },
  {
    id: 'vampirism_3',
    name: 'Vampirismo III',
    description: '+15% de roubo de vida por 2 horas de caçada.',
    icon: 'imbuement_vampirism',
    tier: 3,
    materials: { soul_gem: 25 },
    durationCombatSecs: 7200,
    bonus: { lifesteal: 0.15 },
  },
  {
    id: 'crit_3',
    name: 'Golpe Crítico III',
    description: '+15% de chance de acerto crítico por 2 horas de caçada.',
    icon: 'imbuement_crit',
    tier: 3,
    materials: { black_diamond: 25 },
    durationCombatSecs: 7200,
    bonus: { crit: 0.15 },
  },
  {
    id: 'strike_3',
    name: 'Impacto Brutal III',
    description: '+50 de ataque por 2 horas de caçada.',
    icon: 'imbuement_strike',
    tier: 3,
    materials: { hellstone: 25 },
    durationCombatSecs: 7200,
    bonus: { attack: 50 },
  },
  {
    id: 'protection_3',
    name: 'Proteção Elemental III',
    description: '+45 de defesa por 2 horas de caçada.',
    icon: 'imbuement_protection',
    tier: 3,
    materials: { crystal_heart: 20 },
    durationCombatSecs: 7200,
    bonus: { defense: 45 },
  },
  {
    id: 'swiftness_3',
    name: 'Celeridade III',
    description: 'Ataques 15% mais rápidos por 2 horas de caçada.',
    icon: 'imbuement_swiftness',
    tier: 3,
    materials: { stardust: 25 },
    durationCombatSecs: 7200,
    bonus: { speed: -0.15 },
  },
  {
    id: 'regen_3',
    name: 'Vitalidade III',
    description: '+30% de regeneração por 2 horas de caçada.',
    icon: 'imbuement_regen',
    tier: 3,
    materials: { royal_bandage: 25 },
    durationCombatSecs: 7200,
    bonus: { regen: 0.30 },
  },
  {
    id: 'mana_leech_1',
    name: 'Roubo de Mana I',
    description: '+3% do dano causado volta como mana, por 2 horas de caçada.',
    icon: 'imbuement_manaleech',
    tier: 1,
    materials: { wisp_ember: 20 },
    durationCombatSecs: 7200,
    bonus: { manaLeech: 0.03 },
  },
  {
    id: 'mana_leech_2',
    name: 'Roubo de Mana II',
    description: '+6% do dano causado volta como mana, por 2 horas de caçada.',
    icon: 'imbuement_manaleech',
    tier: 2,
    materials: { elemental_dust: 20 },
    durationCombatSecs: 7200,
    bonus: { manaLeech: 0.06 },
  },
  {
    id: 'mana_leech_3',
    name: 'Roubo de Mana III',
    description: '+10% do dano causado volta como mana, por 2 horas de caçada.',
    icon: 'imbuement_manaleech',
    tier: 3,
    materials: { astral_tome: 20 },
    durationCombatSecs: 7200,
    bonus: { manaLeech: 0.10 },
  },
];

/** Família do imbuement (vampirism_2 → vampirism): só um nível de cada família fica ativo. */
export const imbuementFamily = (id: string): string => id.replace(/_\d$/, '');

// Na lista, cada família junta (I, II, III), na ordem em que a família aparece.
{
  const family = imbuementFamily;
  const order = [...new Set(IMBUEMENTS.map((i) => family(i.id)))];
  IMBUEMENTS.sort((x, y) => order.indexOf(family(x.id)) - order.indexOf(family(y.id)) || x.tier - y.tier);
}

export const imbuementById = (id: string): ImbuementDef | undefined => IMBUEMENTS.find((imb) => imb.id === id);

/** Bônus somado de todos os imbuements que ainda têm tempo restante (> 0s). */
export function imbuementsBonus(active: Record<string, number>): Bonus {
  const total: Bonus = { attack: 0, defense: 0, hp: 0, crit: 0, lifesteal: 0, speed: 0, regen: 0, mana: 0 };
  for (const [id, seconds] of Object.entries(active)) {
    if (seconds <= 0) continue;
    const def = imbuementById(id);
    if (!def) continue;
    total.attack += def.bonus.attack ?? 0;
    total.defense += def.bonus.defense ?? 0;
    total.hp += def.bonus.hp ?? 0;
    if (def.bonus.crit) total.crit = (total.crit ?? 0) + def.bonus.crit;
    if (def.bonus.lifesteal) total.lifesteal = (total.lifesteal ?? 0) + def.bonus.lifesteal;
    if (def.bonus.speed) total.speed = (total.speed ?? 0) + def.bonus.speed;
    if (def.bonus.regen) total.regen = (total.regen ?? 0) + def.bonus.regen;
    if (def.bonus.mana) total.mana = (total.mana ?? 0) + def.bonus.mana;
    if (def.bonus.manaLeech) total.manaLeech = (total.manaLeech ?? 0) + def.bonus.manaLeech;
  }
  return total;
}

// 26/10: os percentuais da Maestria, o crítico extra e o XP/loot do set também (antes sumiam com qualquer imbuement ativo).
const EXTRA_KEYS = ['reduction', 'resFire', 'resWater', 'resEarth', 'resEnergy', 'resHoly', 'resDeath', 'arrowSave', 'attackPct', 'defensePct', 'hpPct', 'critMult', 'xpPct', 'lootPct'] as const;
/** Redução e resistências: só entram no resultado quando algum dos dois tem. */
function sumExtras(a: Bonus, b: Bonus): Partial<Bonus> {
  const out: Partial<Bonus> = {};
  for (const k of EXTRA_KEYS) if (a[k] || b[k]) out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  return out;
}

export function mergeBonus(a: Bonus, b: Bonus): Bonus {
  return {
    attack: a.attack + b.attack,
    defense: a.defense + b.defense,
    hp: a.hp + b.hp,
    crit: (a.crit ?? 0) + (b.crit ?? 0),
    lifesteal: (a.lifesteal ?? 0) + (b.lifesteal ?? 0),
    speed: (a.speed ?? 0) + (b.speed ?? 0),
    regen: (a.regen ?? 0) + (b.regen ?? 0),
    mana: (a.mana ?? 0) + (b.mana ?? 0),
    ...(a.manaLeech || b.manaLeech ? { manaLeech: (a.manaLeech ?? 0) + (b.manaLeech ?? 0) } : {}),
    ...sumExtras(a, b),
    element: a.element ?? b.element,
    elementAttack: (a.elementAttack ?? 0) + (b.elementAttack ?? 0),
    // Gema de Combate: antes sumia com qualquer imbuement ativo.
    ...(a.spellGem ?? b.spellGem ? { spellGem: a.spellGem ?? b.spellGem, spellGemPower: a.spellGem ? a.spellGemPower : b.spellGemPower } : {}),
  };
}
