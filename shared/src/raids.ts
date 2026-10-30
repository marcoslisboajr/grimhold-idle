import type { Hunt, Monster } from './combat.ts';
import { ELEMENTS, type Element } from './elements.ts';
import type { Item } from './skills.ts';

function raidRng(seed: number, seq: number): () => number {
  let a = (seed ^ Math.imul(seq + 1, 0x9e3779b1)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RAID_MIN_LEVEL = 400;
export const RAID_MIN_PARTY = 2;
export const RAID_MAX_PARTY = 5;
export const RAID_MAX_FIGHT_MS = 180_000; // 3 minutos de fúria / enrage
/** Raide em grupo: descanso entre as fases (depois do horário da luta). */
export const RAID_PHASE_REST_MS = 30_000;
/** Fase 2: 3 guardas a cada RAID_GUARD_EVERY_MS, no máximo RAID_GUARD_WAVES ondas. */
export const RAID_GUARD_EVERY_MS = 20_000;
export const RAID_GUARD_WAVES = 3;
/** Aliado curador na raide: cura esta fração da vida quando o jogador está abaixo de 60% (antes era 0). */
export const RAID_ALLY_HEAL = 0.08;
/** Fase 3: o golpe de energia a cada 30 s tira esta fração da vida (menos a resistência a energia). */
export const RAID_BURST_SHARE = 0.6;

export const RAID_FRAGMENT_ID = 'raid_fragment';

export const RAID_PHASE_REWARDS: Record<number, { gold: number; fragments: number; setChance?: number }> = {
  1: { gold: 100_000, fragments: 3 },
  2: { gold: 150_000, fragments: 4 },
  3: { gold: 250_000, fragments: 6, setChance: 0.12 },
};

export const RAID_PITY_BONUS = 0.05; // +5% por semana sem peça
export const RAID_SHOP_SET_COST = 70;
export const RAID_CHEST_COST = 10;
export const RAID_CHEST_GOLD = 300_000;
export const RAID_CHEST_WEEKLY_LIMIT = 3;

/**
 * Itens da Raide II: Fragmento de Raide e o Set do Usurpador Ascendido (4 peças).
 * Força de nível 400 (~6% acima do drop comum do 400).
 * Marca: lendárias (evoluem com Essência de Chefe).
 */
export const RAID_ITEMS: Item[] = [
  {
    id: RAID_FRAGMENT_ID,
    name: 'Fragmento de Raide',
    icon: 'soul_gem',
    value: 2500,
  },
  {
    id: 'ascended_usurper_amulet',
    name: 'Amuleto do Usurpador Ascendido',
    icon: 'drop400_amulet',
    legendary: true,
    value: 50000,
    equip: {
      slot: 'amulet',
      level: RAID_MIN_LEVEL,
      defense: 38,
      hp: 334,
      reduction: 0.125,
      resFire: 0.313,
      resWater: 0.313,
      resEarth: 0.313,
      resEnergy: 0.313,
      resHoly: 0.313,
      resDeath: 0.313,
    },
  },
  {
    id: 'ascended_usurper_ring',
    name: 'Anel do Usurpador Ascendido',
    icon: 'drop400_ring',
    legendary: true,
    value: 50000,
    equip: {
      slot: 'ring',
      level: RAID_MIN_LEVEL,
      attack: 22,
      reduction: 0.153,
      resFire: 0.218,
      resWater: 0.218,
      resEarth: 0.218,
      resEnergy: 0.218,
      resHoly: 0.218,
      resDeath: 0.218,
    },
  },
  {
    id: 'ascended_usurper_boots',
    name: 'Botas do Usurpador Ascendido',
    icon: 'drop400_boots',
    legendary: true,
    value: 50000,
    equip: {
      slot: 'boots',
      level: RAID_MIN_LEVEL,
      defense: 37,
      hp: 313,
      attack: 7,
    },
  },
  {
    id: 'ascended_usurper_helmet',
    name: 'Elmo do Usurpador Ascendido',
    icon: 'drop400_helmet',
    legendary: true,
    value: 50000,
    equip: {
      slot: 'helmet',
      level: RAID_MIN_LEVEL,
      defense: 60,
      hp: 354,
      attack: 8,
    },
  },
  {
    id: 'shattered_souls_helmet',
    name: 'Elmo das Almas Partidas',
    icon: 'shattered_souls_helmet',
    legendary: true,
    value: 80000,
    equip: {
      slot: 'helmet',
      level: 500,
      defense: 78,
      hp: 450,
      attack: 10,
    },
  },
  {
    id: 'shattered_souls_armor',
    name: 'Armadura das Almas Partidas',
    icon: 'shattered_souls_armor',
    legendary: true,
    value: 80000,
    equip: {
      slot: 'armor',
      level: 500,
      defense: 114,
      hp: 615,
      attack: 12,
    },
  },
  {
    id: 'shattered_souls_legs',
    name: 'Calças das Almas Partidas',
    icon: 'shattered_souls_legs',
    legendary: true,
    value: 80000,
    equip: {
      slot: 'legs',
      level: 500,
      defense: 82,
      hp: 475,
      attack: 8,
    },
  },
  {
    id: 'shattered_souls_boots',
    name: 'Botas das Almas Partidas',
    icon: 'shattered_souls_boots',
    legendary: true,
    value: 80000,
    equip: {
      slot: 'boots',
      level: 500,
      defense: 69,
      hp: 549,
      attack: 38,
    },
  },
  {
    id: 'sanguine_amulet',
    name: 'Amuleto Sanguíneo',
    icon: 'sanguine_amulet',
    legendary: true,
    value: 100000,
    equip: {
      slot: 'amulet',
      level: 550,
      defense: 64,
      hp: 570,
      reduction: 0.213,
      resFire: 0.535,
      resWater: 0.535,
      resEarth: 0.535,
      resEnergy: 0.535,
      resHoly: 0.535,
      resDeath: 0.535,
    },
  },
  {
    id: 'sanguine_ring',
    name: 'Anel Sanguíneo',
    icon: 'sanguine_ring',
    legendary: true,
    value: 100000,
    equip: {
      slot: 'ring',
      level: 550,
      attack: 48,
      reduction: 0.248,
      resFire: 0.356,
      resWater: 0.356,
      resEarth: 0.356,
      resEnergy: 0.356,
      resHoly: 0.356,
      resDeath: 0.356,
    },
  },
  {
    id: 'sanguine_boots',
    name: 'Botas Sanguíneas',
    icon: 'sanguine_boots',
    legendary: true,
    value: 100000,
    equip: {
      slot: 'boots',
      level: 550,
      defense: 75,
      hp: 593,
      attack: 41,
    },
  },
  {
    id: 'sanguine_helmet',
    name: 'Elmo Sanguíneo',
    icon: 'sanguine_helmet',
    legendary: true,
    value: 100000,
    equip: {
      slot: 'helmet',
      level: 550,
      defense: 84,
      hp: 486,
      attack: 12,
    },
  },
  {
    id: 'eternal_frost_helmet',
    name: 'Elmo do Inverno Eterno',
    icon: 'eternal_frost_helmet',
    legendary: true,
    value: 40000,
    equip: {
      slot: 'helmet',
      level: 150,
      defense: 109,
      hp: 475,
      crit: 0.065,
    },
  },
  {
    id: 'eternal_frost_armor',
    name: 'Armadura do Inverno Eterno',
    icon: 'eternal_frost_armor',
    legendary: true,
    value: 40000,
    equip: {
      slot: 'armor',
      level: 150,
      defense: 115,
      hp: 425,
    },
  },
  {
    id: 'eternal_frost_legs',
    name: 'Calças do Inverno Eterno',
    icon: 'eternal_frost_legs',
    legendary: true,
    value: 40000,
    equip: {
      slot: 'legs',
      level: 150,
      defense: 41,
      hp: 175,
      attack: 10,
      crit: 0.057,
    },
  },
  {
    id: 'eternal_frost_boots',
    name: 'Botas do Inverno Eterno',
    icon: 'eternal_frost_boots',
    legendary: true,
    value: 40000,
    equip: {
      slot: 'boots',
      level: 150,
      defense: 25,
      hp: 145,
      attack: 12,
    },
  },
  {
    id: 'eternal_frost_blade',
    name: 'Lâmina do Inverno Eterno',
    icon: 'eternal_frost_blade',
    legendary: true,
    value: 45000,
    equip: {
      slot: 'weapon',
      level: 150,
      vocations: ['warrior'],
      attack: 88,
      element: 'water',
      elementAttack: 19,
      hp: 100,
      crit: 0.078,
      lifesteal: 0.05,
    },
  },
  {
    id: 'eternal_frost_bow',
    name: 'Arco do Inverno Eterno',
    icon: 'eternal_frost_bow',
    legendary: true,
    value: 45000,
    equip: {
      slot: 'weapon',
      level: 150,
      vocations: ['hunter'],
      attack: 96,
      element: 'water',
      elementAttack: 20,
      crit: 0.095,
    },
  },
  {
    id: 'eternal_frost_staff',
    name: 'Cajado do Inverno Eterno',
    icon: 'eternal_frost_staff',
    legendary: true,
    value: 45000,
    equip: {
      slot: 'weapon',
      level: 150,
      vocations: ['arcanist'],
      attack: 80,
      element: 'water',
      elementAttack: 18,
      mana: 0.35,
      crit: 0.075,
      manaLeech: 0.05,
    },
  },
  {
    id: 'eternal_frost_mace',
    name: 'Maça do Inverno Eterno',
    icon: 'eternal_frost_mace',
    legendary: true,
    value: 45000,
    equip: {
      slot: 'weapon',
      level: 150,
      vocations: ['devout'],
      attack: 87,
      element: 'water',
      elementAttack: 19,
      defense: 15,
      hp: 100,
      regen: 0.025,
    },
  },
];

export const FROST_RAID_SET_ITEMS = [
  'eternal_frost_helmet',
  'eternal_frost_armor',
  'eternal_frost_legs',
  'eternal_frost_boots',
  'eternal_frost_blade',
  'eternal_frost_bow',
  'eternal_frost_staff',
  'eternal_frost_mace',
] as const;

export const RAID_SET_ITEMS = [
  'ascended_usurper_amulet',
  'ascended_usurper_ring',
  'ascended_usurper_boots',
  'ascended_usurper_helmet',
] as const;

export const SOUL_RAID_SET_ITEMS = [
  'shattered_souls_helmet',
  'shattered_souls_armor',
  'shattered_souls_legs',
  'shattered_souls_boots',
] as const;

export const BLOOD_RAID_SET_ITEMS = [
  'sanguine_amulet',
  'sanguine_ring',
  'sanguine_boots',
  'sanguine_helmet',
] as const;

export const ALL_RAID_SET_ITEMS = [
  ...RAID_SET_ITEMS,
  ...SOUL_RAID_SET_ITEMS,
  ...BLOOD_RAID_SET_ITEMS,
  ...FROST_RAID_SET_ITEMS,
] as const;

export const RAID_ID = 'raid_usurper';
export const SOUL_RAID_ID = 'raid_souls';
export const SOUL_RAID_MIN_LEVEL = 500;
export const BLOOD_RAID_ID = 'raid_blood';
export const BLOOD_RAID_MIN_LEVEL = 550;
export const FROST_RAID_ID = 'raid_frost';
export const FROST_RAID_MIN_LEVEL = 150;

export interface RaidPhaseDef {
  monster: string;
  maxFightMs: number;
  shield?: { share: number; reduce: number; bossDmgMult?: number };
  adds?: { monster: string; everyMs: number; count: number; waves: number; bossDmgMult?: number };
  burst?: { everyMs: number; share: number; element: Element };
  dot?: { everyMs: number; share: number; element: Element };
  enrageRamp?: { everyMs: number; attackPct: number };
  drain?: number;
  pulse?: { everyMs: number; share: number; element: Element };
  soloHpMult?: number;
  soloAttackMult?: number;
}

export interface RaidRewardDef {
  gold: number;
  fragments: number;
  setChance?: number;
}

export interface RaidDef {
  id: string;
  name: string;
  en: string;
  region: string;
  regionEn: string;
  minLevel: number;
  minParty?: number;
  maxParty?: number;
  allowSolo?: boolean;
  bossSplitsAttacks?: boolean;
  enabled?: boolean;
  phases: RaidPhaseDef[];
  setItems: readonly string[];
  outfit?: string;
  rewards: Record<number, RaidRewardDef>;
  bossName?: string;
  bossEn?: string;
  reusedSprite?: string;
  soloHpMult?: number;
  soloAttackMult?: number;
}

export const RAIDS: RaidDef[] = [
  {
    id: RAID_ID,
    enabled: false,
    name: 'Raide II: Cidadela do Usurpador Ascendido',
    en: 'Raid II: Ascended Usurper Citadel',
    region: 'Cidadela do Usurpador',
    regionEn: 'Usurper Citadel',
    minLevel: RAID_MIN_LEVEL,
    bossName: 'Rei Usurpador Ascendido',
    bossEn: 'Ascended Usurper King',
    reusedSprite: 'usurper_king',
    outfit: 'usurper_ascended',
    setItems: RAID_SET_ITEMS,
    rewards: {
      1: { gold: 100_000, fragments: 3 },
      2: { gold: 150_000, fragments: 4 },
      3: { gold: 250_000, fragments: 6, setChance: 0.12 },
    },
    phases: [
      {
        monster: 'raid_usurper_1',
        maxFightMs: RAID_MAX_FIGHT_MS,
        shield: { share: 0.15, reduce: 0.5, bossDmgMult: 1.40 },
      },
      {
        monster: 'raid_usurper_2',
        maxFightMs: RAID_MAX_FIGHT_MS,
        adds: {
          monster: 'raid_usurper_guard',
          everyMs: RAID_GUARD_EVERY_MS,
          count: 3,
          waves: RAID_GUARD_WAVES,
          bossDmgMult: 0.40,
        },
      },
      {
        monster: 'raid_usurper_3',
        maxFightMs: RAID_MAX_FIGHT_MS,
        dot: { everyMs: 3_000, share: 0.04, element: 'energy' },
        burst: { everyMs: 30_000, share: RAID_BURST_SHARE, element: 'energy' },
      },
    ],
  },
  {
    id: SOUL_RAID_ID,
    enabled: false,
    name: 'Raide III: Guerra das Almas',
    en: 'Raid III: War of Souls',
    region: 'Abismo Estelar',
    regionEn: 'Stellar Abyss',
    minLevel: SOUL_RAID_MIN_LEVEL,
    minParty: 2,
    maxParty: 5,
    allowSolo: false,
    bossSplitsAttacks: true,
    bossName: 'Vorthan, o Partido',
    bossEn: 'Vorthan the Sundered',
    reusedSprite: 'astral_lich',
    outfit: 'shattered_souls',
    setItems: SOUL_RAID_SET_ITEMS,
    rewards: {
      1: { gold: 300_000, fragments: 5 },
      2: { gold: 400_000, fragments: 6 },
      3: { gold: 500_000, fragments: 8 },
      4: { gold: 650_000, fragments: 10 },
      5: { gold: 800_000, fragments: 12 },
      6: { gold: 1_500_000, fragments: 20, setChance: 0.15 },
    },
    phases: [
      {
        monster: 'raid_souls_1',
        maxFightMs: 900_000,
        shield: { share: 0.15, reduce: 0.60, bossDmgMult: 1.30 },
        pulse: { everyMs: 12_000, share: 0.08, element: 'death' },
      },
      {
        monster: 'raid_souls_2',
        maxFightMs: 900_000,
        enrageRamp: { everyMs: 30_000, attackPct: 0.03 },
        pulse: { everyMs: 12_000, share: 0.09, element: 'fire' },
      },
      {
        monster: 'raid_souls_3',
        maxFightMs: 900_000,
        adds: {
          monster: 'raid_souls_ghost',
          everyMs: 25_000,
          count: 3,
          waves: 5,
          bossDmgMult: 0.40,
        },
        pulse: { everyMs: 12_000, share: 0.10, element: 'energy' },
      },
      {
        monster: 'raid_souls_4',
        maxFightMs: 900_000,
        burst: { everyMs: 30_000, share: 0.55, element: 'death' },
        pulse: { everyMs: 12_000, share: 0.10, element: 'death' },
      },
      {
        monster: 'raid_souls_5',
        maxFightMs: 900_000,
        drain: 0.30,
        pulse: { everyMs: 12_000, share: 0.11, element: 'water' },
      },
      {
        monster: 'raid_souls_6',
        maxFightMs: 900_000,
        shield: { share: 0.10, reduce: 0.50, bossDmgMult: 1.25 },
        enrageRamp: { everyMs: 30_000, attackPct: 0.05 },
        adds: {
          monster: 'raid_souls_ghost',
          everyMs: 40_000,
          count: 2,
          waves: 4,
          bossDmgMult: 0.40,
        },
        burst: { everyMs: 35_000, share: 0.40, element: 'death' },
        drain: 0.15,
        pulse: { everyMs: 12_000, share: 0.12, element: 'death' },
      },
    ],
  },
  {
    id: BLOOD_RAID_ID,
    enabled: false,
    name: 'Raide IV: Sangue Apodrecido',
    en: 'Raid IV: Rotting Blood',
    region: 'Necrópole do Rei Lich',
    regionEn: 'Lich King Necropolis',
    minLevel: BLOOD_RAID_MIN_LEVEL,
    minParty: 2,
    maxParty: 5,
    allowSolo: false,
    bossSplitsAttacks: true,
    bossName: 'Sangrath, o Sangue Caído',
    bossEn: 'Sangrath, the Fallen Blood',
    reusedSprite: 'dark_archangel',
    outfit: 'fallen_blood',
    setItems: BLOOD_RAID_SET_ITEMS,
    rewards: {
      1: { gold: 400_000, fragments: 6 },
      2: { gold: 550_000, fragments: 8 },
      3: { gold: 700_000, fragments: 10 },
      4: { gold: 900_000, fragments: 12 },
      5: { gold: 2_000_000, fragments: 25, setChance: 0.15 },
    },
    phases: [
      {
        monster: 'raid_blood_1',
        maxFightMs: 900_000,
        drain: 0.40,
        pulse: { everyMs: 12_000, share: 0.10, element: 'death' },
      },
      {
        monster: 'raid_blood_2',
        maxFightMs: 900_000,
        shield: { share: 0.15, reduce: 0.50, bossDmgMult: 1.30 },
        pulse: { everyMs: 12_000, share: 0.10, element: 'fire' },
      },
      {
        monster: 'raid_blood_3',
        maxFightMs: 900_000,
        adds: {
          monster: 'raid_blood_leech',
          everyMs: 25_000,
          count: 4,
          waves: 5,
          bossDmgMult: 0.40,
        },
        pulse: { everyMs: 12_000, share: 0.11, element: 'energy' },
      },
      {
        monster: 'raid_blood_4',
        maxFightMs: 900_000,
        burst: { everyMs: 25_000, share: 0.60, element: 'death' },
        pulse: { everyMs: 12_000, share: 0.11, element: 'death' },
      },
      {
        monster: 'raid_blood_5',
        maxFightMs: 900_000,
        enrageRamp: { everyMs: 25_000, attackPct: 0.04 },
        drain: 0.20,
        shield: { share: 0.10, reduce: 0.40, bossDmgMult: 1.25 },
        adds: {
          monster: 'raid_blood_leech',
          everyMs: 35_000,
          count: 2,
          waves: 4,
          bossDmgMult: 0.40,
        },
        burst: { everyMs: 30_000, share: 0.45, element: 'death' },
        pulse: { everyMs: 12_000, share: 0.12, element: 'death' },
      },
    ],
  },
  {
    id: FROST_RAID_ID,
    enabled: false,
    name: 'Raide I: Fortaleza do Inverno Eterno',
    en: 'Raid I: Eternal Winter Fortress',
    region: 'Confins Gelados',
    regionEn: 'Frozen Reaches',
    minLevel: FROST_RAID_MIN_LEVEL,
    minParty: 2,
    maxParty: 5,
    allowSolo: true,
    bossSplitsAttacks: true,
    bossName: 'Kryos, o Soberano do Inverno',
    bossEn: 'Kryos the Winter Sovereign',
    reusedSprite: 'eternal_frost_dragon',
    outfit: 'eternal_frost',
    setItems: FROST_RAID_SET_ITEMS,
    rewards: {
      1: { gold: 60_000, fragments: 2 },
      2: { gold: 90_000, fragments: 3 },
      3: { gold: 130_000, fragments: 4 },
      4: { gold: 200_000, fragments: 6, setChance: 0.12 },
    },
    phases: [
      {
        monster: 'raid_frost_1',
        maxFightMs: 900_000,
        soloHpMult: 0.30,
        soloAttackMult: 0.27,
        shield: { share: 0.15, reduce: 0.45, bossDmgMult: 1.25 },
        pulse: { everyMs: 10_000, share: 0.12, element: 'water' },
      },
      {
        monster: 'raid_frost_2',
        maxFightMs: 900_000,
        soloHpMult: 0.28,
        soloAttackMult: 1.75,
        adds: {
          monster: 'raid_frost_add',
          everyMs: 22_000,
          count: 3,
          waves: 4,
          bossDmgMult: 0.40,
        },
        pulse: { everyMs: 10_000, share: 0.12, element: 'water' },
      },
      {
        monster: 'raid_frost_3',
        maxFightMs: 900_000,
        soloHpMult: 0.30,
        soloAttackMult: 1.70,
        burst: { everyMs: 27_000, share: 0.47, element: 'water' },
        pulse: { everyMs: 10_000, share: 0.11, element: 'water' },
      },
      {
        monster: 'raid_frost_4',
        maxFightMs: 900_000,
        soloHpMult: 0.32,
        soloAttackMult: 1.80,
        enrageRamp: { everyMs: 20_000, attackPct: 0.045 },
        shield: { share: 0.12, reduce: 0.45, bossDmgMult: 1.25 },
        burst: { everyMs: 28_000, share: 0.44, element: 'water' },
        drain: 0.18,
        pulse: { everyMs: 10_000, share: 0.12, element: 'water' },
      },
    ],
  },
];

/**
 * Monstros das fases e os guardas da Fase 2.
 * - Fase 1: Escudo (-50% de dano até levar 15% da vida). Fraqueza: Fogo.
 * - Fase 2: Invoca 3 guardas a cada 20s. Fraqueza: Água.
 * - Fase 3: Dano contínuo de energia a cada 3s + golpe em área de 60% da vida a cada 30s. Fraqueza: Terra.
 */
export const RAID_MONSTERS: Monster[] = [
  {
    id: 'raid_usurper_1',
    name: 'Rei Usurpador Ascendido (Fase 1)',
    en: 'Ascended Usurper King (Phase 1)',
    sprite: 'raid_usurper_king',
    hp: 14_040_000, // 26/10: x54 do original (com o bônus de set e o imbuement corrigido o Sixtwo passava sozinho; x1,2: sozinho para na fase 2, em dupla passa)
    attack: 550,
    defense: 420,
    attackSpeedMs: 1400,
    xp: 0,
    loot: [],
    weak: ['fire'],
    resist: ['water', 'earth', 'death'],
  },
  {
    id: 'raid_usurper_2',
    name: 'Rei Usurpador Ascendido (Fase 2)',
    en: 'Ascended Usurper King (Phase 2)',
    sprite: 'raid_usurper_king',
    hp: 16_362_000, // x54
    attack: 500,
    defense: 420,
    attackSpeedMs: 1400,
    xp: 0,
    loot: [],
    weak: ['water'],
    resist: ['fire', 'earth', 'holy'],
  },
  {
    id: 'raid_usurper_3',
    name: 'Rei Usurpador Ascendido (Fase 3)',
    en: 'Ascended Usurper King (Phase 3)',
    sprite: 'raid_usurper_king',
    hp: 14_688_000, // x54
    attack: 530,
    defense: 440,
    attackSpeedMs: 1400,
    xp: 0,
    loot: [],
    weak: ['earth'],
    resist: ['energy', 'death', 'fire'],
  },
  {
    id: 'raid_usurper_guard',
    name: 'Guarda Usurpador',
    en: 'Usurper Guard',
    sprite: 'raid_usurper_guard',
    hp: 2400,
    attack: 380,
    defense: 300,
    attackSpeedMs: 1800,
    xp: 0,
    loot: [],
    weak: ['water', 'holy'],
    resist: ['death'],
  },
  {
    id: 'raid_souls_1',
    name: 'Égide de Vorthan',
    en: 'Aegis of Vorthan',
    sprite: 'raid_souls_1',
    hp: 110_000_000,
    attack: 5800,
    defense: 1400,
    attackSpeedMs: 1400,
    xp: 0,
    loot: [],
    weak: ['holy'],
    resist: ['death', 'energy'],
  },
  {
    id: 'raid_souls_2',
    name: 'Fúria de Vorthan',
    en: 'Fury of Vorthan',
    sprite: 'raid_souls_2',
    hp: 115_000_000,
    attack: 5850,
    defense: 1420,
    attackSpeedMs: 1350,
    xp: 0,
    loot: [],
    weak: ['fire'],
    resist: ['water', 'holy'],
  },
  {
    id: 'raid_souls_3',
    name: 'Eco de Vorthan',
    en: 'Echo of Vorthan',
    sprite: 'raid_souls_3',
    hp: 115_000_000,
    attack: 5900,
    defense: 1450,
    attackSpeedMs: 1400,
    xp: 0,
    loot: [],
    weak: ['energy'],
    resist: ['earth', 'fire'],
  },
  {
    id: 'raid_souls_ghost',
    name: 'Eco Errante',
    en: 'Wandering Echo',
    sprite: 'raid_souls_ghost',
    hp: 150_000,
    attack: 3500,
    defense: 800,
    attackSpeedMs: 1600,
    xp: 0,
    loot: [],
    weak: ['energy', 'holy'],
    resist: ['death'],
  },
  {
    id: 'raid_souls_4',
    name: 'Lâmina de Vorthan',
    en: 'Blade of Vorthan',
    sprite: 'raid_souls_4',
    hp: 120_000_000,
    attack: 5950,
    defense: 1460,
    attackSpeedMs: 1300,
    xp: 0,
    loot: [],
    weak: ['holy'],
    resist: ['death', 'physical'],
  },
  {
    id: 'raid_souls_5',
    name: 'Sede de Vorthan',
    en: 'Thirst of Vorthan',
    sprite: 'raid_souls_5',
    hp: 115_000_000,
    attack: 6000,
    defense: 1480,
    attackSpeedMs: 1350,
    xp: 0,
    loot: [],
    weak: ['water'],
    resist: ['fire', 'energy'],
  },
  {
    id: 'raid_souls_6',
    name: 'Vorthan Reunido',
    en: 'Vorthan Reforged',
    sprite: 'raid_souls_6',
    hp: 90_000_000,
    attack: 6100,
    defense: 1520,
    attackSpeedMs: 1300,
    xp: 0,
    loot: [],
    weak: [],
    resist: ['physical', 'fire', 'water', 'earth', 'energy', 'holy', 'death'],
  },
  {
    id: 'raid_blood_1',
    name: 'Morvek, a Ferida Aberta',
    en: 'Morvek, the Open Wound',
    sprite: 'raid_blood_1',
    hp: 152_000_000,
    attack: 6300,
    defense: 1550,
    attackSpeedMs: 1350,
    xp: 0,
    loot: [],
    weak: ['holy'],
    resist: ['death', 'physical'],
  },
  {
    id: 'raid_blood_2',
    name: 'Drusca, o Coágulo',
    en: 'Drusca, the Clot',
    sprite: 'raid_blood_2',
    hp: 145_000_000,
    attack: 6350,
    defense: 1580,
    attackSpeedMs: 1350,
    xp: 0,
    loot: [],
    weak: ['fire'],
    resist: ['water', 'earth'],
  },
  {
    id: 'raid_blood_3',
    name: 'Velgra, Mãe das Larvas',
    en: 'Velgra, Mother of Larvae',
    sprite: 'raid_blood_3',
    hp: 135_000_000,
    attack: 6380,
    defense: 1600,
    attackSpeedMs: 1300,
    xp: 0,
    loot: [],
    weak: ['water'],
    resist: ['energy', 'fire'],
  },
  {
    id: 'raid_blood_leech',
    name: 'Sanguessuga Voraz',
    en: 'Ravenous Leech',
    sprite: 'raid_blood_leech',
    hp: 280_000,
    attack: 3900,
    defense: 950,
    attackSpeedMs: 1500,
    xp: 0,
    loot: [],
    weak: ['holy', 'fire'],
    resist: ['death'],
  },
  {
    id: 'raid_blood_4',
    name: 'Ostrel, Fome Rubra',
    en: 'Ostrel, Crimson Hunger',
    sprite: 'raid_blood_4',
    hp: 140_000_000,
    attack: 6400,
    defense: 1620,
    attackSpeedMs: 1300,
    xp: 0,
    loot: [],
    weak: ['holy'],
    resist: ['death', 'energy'],
  },
  {
    id: 'raid_blood_5',
    name: 'Sangrath, o Sangue Caído',
    en: 'Sangrath, the Fallen Blood',
    sprite: 'raid_blood_5',
    hp: 108_000_000,
    attack: 6480,
    defense: 1650,
    attackSpeedMs: 1250,
    xp: 0,
    loot: [],
    weak: [],
    resist: ['physical', 'fire', 'water', 'earth', 'energy', 'holy', 'death'],
  },
  {
    id: 'raid_frost_1',
    name: 'Ymirion, o Guardião Glacial',
    en: 'Ymirion the Glacial Guardian',
    sprite: 'raid_frost_1',
    hp: 7_200_000,
    attack: 1420,
    defense: 400,
    attackSpeedMs: 1350,
    xp: 0,
    loot: [],
    weak: ['fire'],
    resist: ['water', 'earth'],
  },
  {
    id: 'raid_frost_2',
    name: 'Kaltor, o Cavaleiro da Nevasca',
    en: 'Kaltor the Blizzard Knight',
    sprite: 'raid_frost_2',
    hp: 8_200_000,
    attack: 1480,
    defense: 420,
    attackSpeedMs: 1300,
    xp: 0,
    loot: [],
    weak: ['energy'],
    resist: ['water', 'death'],
  },
  {
    id: 'raid_frost_add',
    name: 'Gárgula de Gelo',
    en: 'Frost Gargoyle',
    sprite: 'raid_frost_add',
    hp: 40_000,
    attack: 720,
    defense: 300,
    attackSpeedMs: 1600,
    xp: 0,
    loot: [],
    weak: ['fire', 'holy'],
    resist: ['water'],
  },
  {
    id: 'raid_frost_3',
    name: 'Selyra, a Dama do Frio',
    en: 'Selyra the Frost Maiden',
    sprite: 'raid_frost_3',
    hp: 8_800_000,
    attack: 1540,
    defense: 440,
    attackSpeedMs: 1300,
    xp: 0,
    loot: [],
    weak: ['holy'],
    resist: ['water', 'fire'],
  },
  {
    id: 'raid_frost_4',
    name: 'Kryos, o Soberano do Inverno',
    en: 'Kryos the Winter Sovereign',
    sprite: 'raid_frost_4',
    hp: 9_380_000,
    attack: 1650,
    defense: 470,
    attackSpeedMs: 1200,
    xp: 0,
    loot: [],
    weak: [],
    resist: ['physical', 'fire', 'water', 'earth', 'energy', 'holy', 'death'],
  },
];

export const RAID_HUNTS: Hunt[] = RAIDS.map((r) => ({
  id: r.id,
  name: r.name,
  region: r.region,
  level: r.minLevel,
  monsters: r.phases.map((p) => p.monster),
  raid: true,
  boss: true,
}));

export const raidById = (id: string | null | undefined): RaidDef | undefined => RAIDS.find((r) => r.id === id);
export const isRaidId = (id: string | null | undefined): boolean => !!raidById(id);
export const isRaidEnabled = (id: string | null | undefined): boolean => !!raidById(id)?.enabled;
export const raidMonsterById = (id: string): Monster | undefined => RAID_MONSTERS.find((m) => m.id === id);
export const raidHuntById = (id: string): Hunt | undefined => RAID_HUNTS.find((h) => h.id === id);

function raidElemName(elem: string, lang: 'pt' | 'en'): string {
  if (elem === 'physical') return lang === 'en' ? 'Physical' : 'Físico';
  return (ELEMENTS as Record<string, { pt: string; en: string }>)[elem]?.[lang] ?? elem;
}

export function formatRaidPhaseTitle(phase: RaidPhaseDef, phaseIndex: number, lang: 'pt' | 'en' = 'pt'): string {
  const m = raidMonsterById(phase.monster);
  const raw = (lang === 'en' ? (m?.en ?? m?.name) : m?.name) ?? phase.monster;
  const clean = raw.replace(/\s*\((?:Fase|Phase)\s*\d+\)$/i, '');
  const prefix = lang === 'en' ? 'Phase ' : 'Fase ';
  return `${prefix}${phaseIndex + 1}: ${clean}`;
}

export function formatRaidPhaseMechanics(phase: RaidPhaseDef, lang: 'pt' | 'en' = 'pt'): string {
  const parts: string[] = [];
  const pt = lang !== 'en';

  if (phase.shield) {
    const redPct = Math.round(phase.shield.reduce * 100);
    const sharePct = Math.round(phase.shield.share * 100);
    let s = pt
      ? `−${redPct}% dano até quebrar ${sharePct}% vida`
      : `−${redPct}% dmg until ${sharePct}% HP broken`;
    if (phase.shield.bossDmgMult && phase.shield.bossDmgMult > 1) {
      const bPct = Math.round((phase.shield.bossDmgMult - 1) * 100);
      s += pt ? ` (chefe +${bPct}% dano)` : ` (boss +${bPct}% dmg)`;
    }
    parts.push(s);
  }

  if (phase.enrageRamp) {
    const rPct = Math.round(phase.enrageRamp.attackPct * 100);
    const sSec = Math.round(phase.enrageRamp.everyMs / 1000);
    parts.push(pt ? `+${rPct}% ataque a cada ${sSec}s` : `+${rPct}% atk every ${sSec}s`);
  }

  if (phase.adds) {
    const aSec = Math.round(phase.adds.everyMs / 1000);
    let aStr = pt
      ? `${phase.adds.count} adds a cada ${aSec}s (${phase.adds.waves} ondas`
      : `${phase.adds.count} adds every ${aSec}s (${phase.adds.waves} waves`;
    if (phase.adds.bossDmgMult && phase.adds.bossDmgMult < 1) {
      const redPct = Math.round((1 - phase.adds.bossDmgMult) * 100);
      aStr += pt ? `, chefe −${redPct}%` : `, boss −${redPct}%`;
    }
    aStr += ')';
    parts.push(aStr);
  }

  if (phase.dot) {
    const dPct = Math.round(phase.dot.share * 100);
    const dSec = Math.round(phase.dot.everyMs / 1000);
    const e = raidElemName(phase.dot.element, lang);
    parts.push(pt ? `${dPct}% vida a cada ${dSec}s (${e})` : `${dPct}% HP every ${dSec}s (${e})`);
  }

  if (phase.burst) {
    const bPct = Math.round(phase.burst.share * 100);
    const bSec = Math.round(phase.burst.everyMs / 1000);
    const e = raidElemName(phase.burst.element, lang);
    parts.push(pt ? `burst ${bPct}% vida a cada ${bSec}s (${e})` : `${bPct}% HP burst every ${bSec}s (${e})`);
  }

  if (phase.pulse) {
    const pPct = Math.round(phase.pulse.share * 100);
    const pSec = Math.round(phase.pulse.everyMs / 1000);
    const e = raidElemName(phase.pulse.element, lang);
    parts.push(pt ? `pulso ${pPct}% vida a cada ${pSec}s (${e})` : `${pPct}% HP pulse every ${pSec}s (${e})`);
  }

  if (phase.drain) {
    const dPct = Math.round(phase.drain * 100);
    parts.push(pt ? `cura ${dPct}% do dano` : `heals ${dPct}% dmg`);
  }

  if (phase.maxFightMs) {
    const mins = Math.round(phase.maxFightMs / 60_000);
    parts.push(pt ? `fúria em ${mins}min` : `enrage ${mins}min`);
  }

  const m = raidMonsterById(phase.monster);
  if (m?.weak && m.weak.length > 0) {
    const wNames = m.weak.map((w) => raidElemName(w, lang)).join(', ');
    parts.push(pt ? `Fraqueza: ${wNames}` : `Weak: ${wNames}`);
  } else if (m?.resist && m.resist.length >= 6) {
    parts.push(pt ? 'Resistente a tudo' : 'Resists all');
  }

  return parts.join(' · ');
}

/** Fuso de Brasília (UTC-3): a semana vira na segunda-feira às 00:00 de Brasília (03:00 UTC). */
const BRT_OFFSET_MS = -3 * 3600_000;
const EPOCH_MONDAY_BRT_UTC = Date.UTC(2024, 0, 1, 3, 0, 0);

/** Semana (segunda-feira AAAA-MM-DD no horário de Brasília) de um instante `now` (ms). */
export function weekOf(now: number): string {
  const brt = new Date(now + BRT_OFFSET_MS);
  const day = brt.getUTCDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const diffToMon = (day + 6) % 7;
  const mon = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() - diffToMon));
  return mon.toISOString().slice(0, 10);
}

/** Instante (ms UTC) da próxima virada de semana (segunda-feira às 00:00 de Brasília). */
export function nextWeekResetAt(now: number): number {
  const brt = new Date(now + BRT_OFFSET_MS);
  const day = brt.getUTCDay();
  const diffToMon = (day + 6) % 7;
  const nextMonBrtUtc = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() - diffToMon + 7);
  return nextMonBrtUtc - BRT_OFFSET_MS;
}

export function raidForWeek(_now: number): RaidDef {
  return RAIDS[0];
}

export interface RaidPhaseRewardResult {
  items: Record<string, number>;
  gotPiece?: boolean;
}

/**
 * Recompensa da fase vencida na raide.
 * Se solo, ouro e fragmentos vêm pela metade, e a chance da peça também cai pela metade.
 */
export function rollRaidPhaseReward(
  seed: number,
  characterId: number,
  raidId: string,
  phase: number,
  isSolo: boolean,
  pityWeeks = 0,
): RaidPhaseRewardResult {
  const raid = raidById(raidId);
  const baseReward = raid?.rewards[phase] ?? RAID_PHASE_REWARDS[phase];
  if (!baseReward) return { items: {} };

  const gold = isSolo ? Math.floor(baseReward.gold / 2) : baseReward.gold;
  const fragments = isSolo ? Math.floor(baseReward.fragments / 2) : baseReward.fragments;

  const items: Record<string, number> = {
    gold,
    [RAID_FRAGMENT_ID]: fragments,
  };

  let gotPiece = false;
  // Peça de set só dropa em grupo (modo solo recebe metade do ouro e fragmentos, e nunca a peça).
  if (baseReward.setChance && !isSolo) {
    const rand = raidRng(seed, characterId + phase * 10_007);
    const totalChance = baseReward.setChance + pityWeeks * RAID_PITY_BONUS;
    if (rand() < totalChance) {
      const setItems = raid?.setItems ?? RAID_SET_ITEMS;
      const piece = setItems[Math.floor(rand() * setItems.length)];
      items[piece] = 1;
      gotPiece = true;
    }
  }

  return { items, gotPiece };
}
