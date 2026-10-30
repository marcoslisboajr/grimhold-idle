import {
  DUEL_TUNING_LS,
  MAX_FIGHT_MS,
  playerStats,
  rngFor,
  strikeMult,
  withPotion,
  type Cycle,
  type Fighter,
  type Hit,
  type HuntContext,
  type Monster,
  bonusAt,
} from './combat.ts';
import { type Spell } from './spells.ts';
import { elementMult } from './elements.ts';
import { emptyGains, type Activity, type Gains, type SimResult } from './skills.ts';
import type { CycleView } from './activity.ts';

export const ARENA_REST_MS = 5000; // 5 segundos entre cada monstro após derrotá-lo

export interface ArenaOpponent {
  id: string;
  name: string;
  sprite: string;
  hp: number;
  attack: number;
  defense: number;
  attackSpeedMs: number;
  xp: number;
  weak?: Monster['weak'];
  resist?: Monster['resist'];
}

export interface ArenaWeaponOption {
  id: string;
  name: string;
  icon: string;
  vocation: string;
  type: string;
  description: string;
}

export interface ArenaDef {
  id: string;
  name: string;
  level: number;
  description: string;
  opponents: ArenaOpponent[];
  weapons: ArenaWeaponOption[];
  rewardGold: number;
  rewardXp: number;
  rewardTrophy: string;
  /**
   * Provação de quest: não aparece na aba Arenas; entra pelo passo da história
   * que pede vencê-la, e vencer conta como o objetivo (sem baú de arma).
   */
  trial?: boolean;
  /**
   * Atiradores fora de alcance (como os demônios da Annihilator do Tibia): ficam
   * em ilhas que não dá para alcançar nem atacar e jogam bola de fogo durante
   * toda a luta. Só os desafiantes da frente precisam morrer.
   */
  casters?: { name: string; sprite: string; count: number; damage: number; everyMs: number };
}

export interface CharacterArenaState {
  arenaId: string;
  status: 'available' | 'in_progress' | 'reward_pending' | 'completed';
  currentWave: number;
  rewardChosen?: string | null;
  completedAt?: number | null;
}

export const ARENAS: ArenaDef[] = [
  {
    id: 'arena_40',
    name: 'Arena dos Campeões (Nível 40)',
    level: 40,
    description: 'Sobreviva a 10 gladiadores e feras temíveis da arena em sucessão. Ao vencer o carrasco final, escolha uma lendária arma de gladiador!',
    rewardGold: 5000,
    rewardXp: 15000,
    rewardTrophy: 'arena_trophy_40',
    opponents: [
      {
        id: 'arena_gladiator_1',
        name: 'Bárbaro da Arena',
        sprite: 'soldado_ashfen',
        hp: 640,
        attack: 49,
        defense: 16,
        attackSpeedMs: 2200,
        xp: 200,
      },
      {
        id: 'arena_gladiator_2',
        name: 'Berserker Orc',
        sprite: 'orc_berserker',
        hp: 760,
        attack: 54,
        defense: 18,
        attackSpeedMs: 2000,
        xp: 260,
      },
      {
        id: 'arena_gladiator_3',
        name: 'Carniçal da Cripta',
        sprite: 'ghoul',
        hp: 880,
        attack: 60,
        defense: 20,
        attackSpeedMs: 2100,
        xp: 320,
      },
      {
        id: 'arena_gladiator_4',
        name: 'Guarda Esquelético',
        sprite: 'esqueleto6_escudo',
        hp: 1000,
        attack: 65,
        defense: 24,
        attackSpeedMs: 2300,
        xp: 400,
      },
      {
        id: 'arena_gladiator_5',
        name: 'Raptor Voraz',
        sprite: 'raptor',
        hp: 1120,
        attack: 72,
        defense: 22,
        attackSpeedMs: 1800,
        xp: 480,
      },
      {
        id: 'arena_gladiator_6',
        name: 'Minotauro Destruidor',
        sprite: 'minotaur_warrior',
        hp: 1300,
        attack: 79,
        defense: 26,
        attackSpeedMs: 2400,
        xp: 580,
      },
      {
        id: 'arena_gladiator_7',
        name: 'Múmia Guardiã',
        sprite: 'mumia',
        hp: 1480,
        attack: 84,
        defense: 28,
        attackSpeedMs: 2500,
        xp: 700,
      },
      {
        id: 'arena_gladiator_8',
        name: 'Ciclope Esmagador',
        sprite: 'cyclops',
        hp: 1700,
        attack: 91,
        defense: 30,
        attackSpeedMs: 2700,
        xp: 850,
      },
      {
        id: 'arena_gladiator_9',
        name: 'Ogro Campeão',
        sprite: 'ogre',
        hp: 1960,
        attack: 96,
        defense: 32,
        attackSpeedMs: 2600,
        xp: 1050,
      },
      {
        id: 'arena_gladiator_10',
        name: 'Kraggoth, o Carrasco',
        sprite: 'death_knight',
        hp: 2600,
        attack: 102,
        defense: 35,
        attackSpeedMs: 2200,
        xp: 2000,
      },
    ],
    weapons: [
      {
        id: 'arena_sword',
        name: 'Lâmina do Gladiador',
        icon: 'arena_sword',
        vocation: 'Guerreiro',
        type: 'Espada',
        description: 'Forjada nas chamas da arena. +25 Ataque, +12 Defesa, +6% Crítico.',
      },
      {
        id: 'arena_axe',
        name: 'Machado dos Bárbaros',
        icon: 'arena_axe',
        vocation: 'Guerreiro',
        type: 'Machado',
        description: 'Brutalidade pura. +27 Ataque, +8 Defesa, +4% Roubo de Vida.',
      },
      {
        id: 'arena_mace',
        name: 'Maça do Campeão',
        icon: 'arena_mace',
        vocation: 'Devoto',
        type: 'Maça',
        description: 'Benta com a glória da vitória. +25 Ataque, +16 Defesa, +3% Regeneração.',
      },
      {
        id: 'arena_bow',
        name: 'Arco do Conquistador',
        icon: 'arena_bow',
        vocation: 'Caçador',
        type: 'Arco',
        description: 'Certeiro e impiedoso. +26 Ataque, +8 Defesa, +6% Velocidade, +4% Crítico.',
      },
      {
        id: 'arena_staff',
        name: 'Cetro Arcano da Arena',
        icon: 'arena_staff',
        vocation: 'Arcanista',
        type: 'Cajado',
        description: 'Canaliza o poder dos duelos ancestrais. +26 Ataque, +10 Defesa, +12% Mana Máxima, +4% Crítico.',
      },
    ],
  },
  {
    id: 'arena_70',
    name: 'Arena dos Guerreiros (Nível 70)',
    level: 70,
    description: 'O teste dos guerreiros veteranos: 10 campeões em sequência, até Varkhul, o Senhor da Arena. Vença todos e escolha uma arma lendária!',
    rewardGold: 25000,
    rewardXp: 150000,
    rewardTrophy: 'arena_trophy_70',
    opponents: [
      { id: 'arena70_1', name: "Vampiro Duelista", sprite: 'vampire', hp: 3200, attack: 122, defense: 48, attackSpeedMs: 2000, xp: 1200 },
      { id: 'arena70_2', name: "Wyvern da Arena", sprite: 'wyvern', hp: 3520, attack: 128, defense: 50, attackSpeedMs: 1900, xp: 1400 },
      { id: 'arena70_3', name: "Golem de Enxofre Blindado", sprite: 'golem', hp: 4000, attack: 133, defense: 56, attackSpeedMs: 2400, xp: 1600 },
      { id: 'arena70_4', name: "Diabo das Chamas", sprite: 'fire_devil', hp: 4480, attack: 139, defense: 54, attackSpeedMs: 2100, xp: 1900 },
      { id: 'arena70_5', name: "Demônio Gladiador", sprite: 'demon', hp: 4960, attack: 145, defense: 58, attackSpeedMs: 2100, xp: 2200 },
      { id: 'arena70_6', name: "Cavaleiro Caído da Arena", sprite: 'cavaleiro_caido', hp: 5440, attack: 152, defense: 60, attackSpeedMs: 2200, xp: 2600 },
      { id: 'arena70_7', name: "Guardião da Rocha Ancestral", sprite: 'stone_guardian', hp: 6080, attack: 157, defense: 64, attackSpeedMs: 2500, xp: 3000 },
      { id: 'arena70_8', name: "Cavaleiro Negro Campeão", sprite: 'cavaleiro_negro', hp: 6720, attack: 162, defense: 64, attackSpeedMs: 2200, xp: 3500 },
      { id: 'arena70_9', name: "Dragão de Fogo da Arena", sprite: 'fire_dragon', hp: 7040, attack: 148, defense: 60, attackSpeedMs: 2400, xp: 4200 },
      { id: 'arena70_10', name: "Varkhul, o Senhor da Arena", sprite: 'dragon_lord', hp: 8000, attack: 154, defense: 64, attackSpeedMs: 2200, xp: 8000 },
    ],
    weapons: [
      { id: 'arena70_sword', name: "Lâmina do Senhor da Arena", icon: 'death_blade', vocation: 'Guerreiro', type: 'Espada', description: "Temperada no sangue de Varkhul. +42 Ataque, +14 Defesa, +7% Crítico." },
      { id: 'arena70_axe', name: "Machado do Massacre", icon: 'dark_halberd', vocation: 'Guerreiro', type: 'Machado', description: "Cada golpe pede mais. +44 Ataque, +10 Defesa, +5% Roubo de Vida." },
      { id: 'arena70_mace', name: "Martelo do Juízo da Arena", icon: 'sulfur_hammer', vocation: 'Devoto', type: 'Maça', description: "A fé que derrubou dragões. +42 Ataque, +18 Defesa, +4% Regeneração." },
      { id: 'arena70_bow', name: "Arco da Tempestade da Arena", icon: 'harpy_bow', vocation: 'Caçador', type: 'Arco', description: "Disparos como trovão. +43 Ataque, +10 Defesa, +8% Velocidade, +5% Crítico." },
      { id: 'arena70_staff', name: "Cajado do Imperador da Arena", icon: 'frost_staff', vocation: 'Arcanista', type: 'Cajado', description: "O poder de mil duelos. +43 Ataque, +12 Defesa, +15% Mana Máxima, +5% Crítico." },
    ],
  },
];

/** Vida, ataque e defesa das 10 ondas da Arena dos Lendários (acertada com server/scripts/sim_arena.ts). */
const OPP100: [number, number, number][] = [
  [5200, 128, 80], [5600, 132, 82], [6000, 136, 84], [6600, 140, 88], [7000, 144, 88],
  [7500, 148, 90], [8200, 152, 94], [8800, 156, 96], [9500, 160, 96], [12000, 168, 100],
];
ARENAS.push({
  id: 'arena_100',
  name: 'Arena dos Lendários (Nível 100)',
  level: 100,
  description: "Só os lendários entram: 10 campeões do fim do mundo, até Mor'Khal, o Lich Imperador. Vença todos e escolha uma arma digna de lenda!",
  rewardGold: 60000,
  rewardXp: 500000,
  rewardTrophy: 'arena_trophy_100',
  opponents: [
    { id: 'arena100_1', name: 'Cavaleiro da Morte', sprite: 'cavaleiro_caido', hp: OPP100[0][0], attack: OPP100[0][1], defense: OPP100[0][2], attackSpeedMs: 1600, xp: 8000 },
    { id: 'arena100_2', name: 'Wyvern Ancestral', sprite: 'wyvern', hp: OPP100[1][0], attack: OPP100[1][1], defense: OPP100[1][2], attackSpeedMs: 1550, xp: 9000 },
    { id: 'arena100_3', name: 'Pesadelo da Arena', sprite: 'nightmare', hp: OPP100[2][0], attack: OPP100[2][1], defense: OPP100[2][2], attackSpeedMs: 1400, xp: 10000, weak: ['holy'], resist: ['death'] },
    { id: 'arena100_4', name: 'Golem do Vazio', sprite: 'golem', hp: OPP100[3][0], attack: OPP100[3][1], defense: OPP100[3][2], attackSpeedMs: 1900, xp: 11000, weak: ['energy'] },
    { id: 'arena100_5', name: 'Medusa Gladiadora', sprite: 'medusa', hp: OPP100[4][0], attack: OPP100[4][1], defense: OPP100[4][2], attackSpeedMs: 1450, xp: 12500 },
    { id: 'arena100_6', name: 'Demônio Carrasco', sprite: 'demon', hp: OPP100[5][0], attack: OPP100[5][1], defense: OPP100[5][2], attackSpeedMs: 1500, xp: 14000, weak: ['holy'], resist: ['fire'] },
    { id: 'arena100_7', name: 'Guardião Primordial', sprite: 'stone_guardian', hp: OPP100[6][0], attack: OPP100[6][1], defense: OPP100[6][2], attackSpeedMs: 1900, xp: 16000, weak: ['water'] },
    { id: 'arena100_8', name: 'Cavaleiro Negro Lendário', sprite: 'cavaleiro_negro', hp: OPP100[7][0], attack: OPP100[7][1], defense: OPP100[7][2], attackSpeedMs: 1500, xp: 18000, resist: ['death'] },
    { id: 'arena100_9', name: 'Dragão Ancestral da Arena', sprite: 'fire_dragon', hp: OPP100[8][0], attack: OPP100[8][1], defense: OPP100[8][2], attackSpeedMs: 1600, xp: 22000, weak: ['water'], resist: ['fire'] },
    { id: 'arena100_10', name: "Mor'Khal, o Lich Imperador", sprite: 'lich5', hp: OPP100[9][0], attack: OPP100[9][1], defense: OPP100[9][2], attackSpeedMs: 1400, xp: 40000, weak: ['holy', 'fire'], resist: ['death'] },
  ],
  weapons: [
    { id: 'arena100_sword', name: 'Lâmina do Imperador Caído', icon: 'arena100_sword', vocation: 'Guerreiro', type: 'Espada', description: "Forjada na coroa de Mor'Khal. +54 Ataque (sagrado), +16 Defesa, +8% Crítico." },
    { id: 'arena100_axe', name: 'Machado do Fim dos Tempos', icon: 'arena100_axe', vocation: 'Guerreiro', type: 'Machado', description: 'Corta até a morte. +56 Ataque (morte), +10 Defesa, +7% Roubo de Vida.' },
    { id: 'arena100_mace', name: 'Martelo da Luz Eterna', icon: 'arena100_mace', vocation: 'Devoto', type: 'Maça', description: 'A luz que apagou o lich. +53 Ataque (sagrado), +22 Defesa, +5% Regeneração.' },
    { id: 'arena100_bow', name: 'Arco do Céu Partido', icon: 'arena100_bow', vocation: 'Caçador', type: 'Arco', description: 'Cada flecha racha o céu. +54 Ataque (energia), +10 Defesa, +10% Velocidade, +7% Crítico.' },
    { id: 'arena100_staff', name: 'Cetro do Arquimago Lendário', icon: 'arena100_staff', vocation: 'Arcanista', type: 'Cajado', description: 'O poder de um império. +53 Ataque (fogo), +14 Defesa, +25% Mana Máxima, +7% Crítico.' },
  ],
});

// ── Provações das quests de item ────────────────────────────────────────────
// Lutas em sequência como a arena, mas abertas só no passo da quest (`trial`).
// A recompensa é o final da história (item único e traje), não o baú da arena.
const TRIALS: ArenaDef[] = [
  {
    id: 'trial_delrith',
    name: 'A Pedra Sombria',
    level: 50,
    description: 'Os cultistas de Delrith tentam abrir o portal. Vença os três e bana o demônio com a Luzprata.',
    rewardGold: 0,
    rewardXp: 0,
    rewardTrophy: '',
    trial: true,
    weapons: [],
    opponents: [
      { id: 'trial_cultist_1', name: 'Cultista Sombrio', sprite: 'soldado_ashfen', hp: 1120, attack: 48, defense: 36, attackSpeedMs: 1900, xp: 900 },
      { id: 'trial_cultist_2', name: 'Cultista Sombrio', sprite: 'soldado_ashfen', hp: 1260, attack: 50, defense: 38, attackSpeedMs: 1900, xp: 1000 },
      { id: 'trial_cultist_3', name: 'Sumo-Cultista', sprite: 'soldado_ashfen', hp: 1470, attack: 53, defense: 40, attackSpeedMs: 1900, xp: 1200 },
      { id: 'trial_delrith', name: 'Delrith', sprite: 'demon', hp: 4160, attack: 80, defense: 44, attackSpeedMs: 2000, xp: 4000, weak: ['holy'], resist: ['fire'] },
    ],
  },
  {
    id: 'trial_elvarg',
    name: 'Ilha de Crandor',
    level: 60,
    description: 'Crandor está tomada pelas crias de Elvarg. Atravesse a ilha e derrube a dragoa.',
    rewardGold: 0,
    rewardXp: 0,
    rewardTrophy: '',
    trial: true,
    weapons: [],
    opponents: [
      { id: 'trial_wyvern_1', name: 'Serpe de Crandor', sprite: 'wyvern', hp: 1190, attack: 52, defense: 40, attackSpeedMs: 1900, xp: 1300, weak: ['water'], resist: ['energy'] },
      { id: 'trial_drake_1', name: 'Cria de Elvarg', sprite: 'dragon', hp: 1470, attack: 55, defense: 44, attackSpeedMs: 2000, xp: 1600, weak: ['water'], resist: ['fire'] },
      { id: 'trial_drake_2', name: 'Cria de Elvarg', sprite: 'dragon', hp: 1610, attack: 56, defense: 46, attackSpeedMs: 2000, xp: 1700, weak: ['water'], resist: ['fire'] },
      { id: 'trial_elvarg', name: 'Elvarg', sprite: 'dragon_lord', hp: 5200, attack: 92, defense: 50, attackSpeedMs: 2100, xp: 6000, weak: ['water'], resist: ['fire'] },
    ],
  },
  {
    id: 'trial_annihilation',
    name: 'A Aniquilação',
    level: 80,
    description: 'A ponte sobre a lava. Quatro demônios presos nas ilhas em volta jogam bolas de fogo sem parar; na frente, três demônios de elite barram a passagem. Derrube os da frente antes que o fogo derrube você.',
    rewardGold: 0,
    rewardXp: 0,
    rewardTrophy: '',
    trial: true,
    weapons: [],
    casters: { name: 'Demônio Acorrentado', sprite: 'demon', count: 4, damage: 27, everyMs: 5000 },
    opponents: [
      { id: 'trial_ann_1', name: 'Demônio da Ponte', sprite: 'demon', hp: 2600, attack: 74, defense: 60, attackSpeedMs: 1900, xp: 4000, weak: ['holy'], resist: ['fire'] },
      { id: 'trial_ann_2', name: 'Demônio da Ponte', sprite: 'demon', hp: 2800, attack: 77, defense: 62, attackSpeedMs: 1900, xp: 4400, weak: ['holy'], resist: ['fire'] },
      { id: 'trial_annihilator', name: 'O Aniquilador', sprite: 'demon', hp: 3900, attack: 100, defense: 62, attackSpeedMs: 2000, xp: 9000, weak: ['holy'], resist: ['fire'] },
    ],
  },
  {
    id: 'trial_legends',
    name: 'Trono dos Pesadelos',
    level: 100,
    description: 'No fundo do Vale dos Pesadelos, a Rainha dos Pesadelos espera quem sobreviveu às suas crias. Dois guardas de elite e, depois, ela.',
    rewardGold: 0,
    rewardXp: 0,
    rewardTrophy: '',
    trial: true,
    weapons: [],
    opponents: [
      { id: 'trial_leg_1', name: 'Pesadelo Ancestral', sprite: 'nightmare', hp: 5000, attack: 135, defense: 86, attackSpeedMs: 1250, xp: 30000, weak: ['holy'], resist: ['death'] },
      { id: 'trial_leg_2', name: 'Pesadelo Ancestral', sprite: 'nightmare', hp: 5400, attack: 139, defense: 88, attackSpeedMs: 1250, xp: 32000, weak: ['holy'], resist: ['death'] },
      { id: 'trial_morvhena', name: 'Morvhena, Rainha dos Pesadelos', sprite: 'medusa', hp: 8000, attack: 164, defense: 96, attackSpeedMs: 1300, xp: 90000, resist: ['death'] },
    ],
  },
  {
    id: 'trial_mythic',
    name: 'O Devorador de Eras',
    level: 200,
    description: 'No Trono do Caos, Xal\'Zeth come o tempo dos mundos que acabaram. Um Arauto da Entropia e um Serafim Caído guardam o caminho; depois, ele.',
    rewardGold: 0,
    rewardXp: 0,
    rewardTrophy: '',
    trial: true,
    weapons: [],
    opponents: [
      { id: 'trial_myth_1', name: 'Arauto da Entropia', sprite: 'void_stalker', hp: 16000, attack: 290, defense: 200, attackSpeedMs: 1150, xp: 40_000_000, weak: ['holy'], resist: ['death'] },
      { id: 'trial_myth_2', name: 'Serafim Caído', sprite: 'fallen_seraph', hp: 17000, attack: 300, defense: 205, attackSpeedMs: 1200, xp: 44_000_000, weak: ['death'], resist: ['holy'] },
      { id: 'trial_xalzeth', name: "Xal'Zeth, o Devorador de Eras", sprite: 'zathroth', hp: 19000, attack: 310, defense: 215, attackSpeedMs: 1250, xp: 120_000_000, weak: ['holy'], resist: ['death'] },
    ],
  },
];
ARENAS.push(...TRIALS);

export const arenaById = (id: string): ArenaDef | undefined => ARENAS.find((a) => a.id === id);

/** Desafiante de qualquer arena pelo id (a cena desenha o sprite dele). */
export const arenaOpponentById = (id: string): ArenaOpponent | undefined => {
  for (const a of ARENAS) {
    const o = a.opponents.find((x) => x.id === id);
    if (o) return o;
  }
  return undefined;
};

export const arenaNode = (arenaId: string) => `arena:${arenaId}`;

export const isArenaNode = (node: string): boolean => node.startsWith('arena:');

export const parseArenaNode = (node: string): ArenaDef | null => {
  if (!isArenaNode(node)) return null;
  const id = node.slice('arena:'.length);
  return arenaById(id) ?? null;
};

/** Converte o oponente da arena em Monster para compatibilidade com o sistema de combate */
export function opponentToMonster(opp: ArenaOpponent): Monster {
  return {
    id: opp.id,
    name: opp.name,
    sprite: opp.sprite,
    hp: opp.hp,
    attack: opp.attack,
    defense: opp.defense,
    attackSpeedMs: opp.attackSpeedMs,
    xp: opp.xp,
    loot: [{ item: 'gold', chance: 1, min: 20, max: 80 }],
    ...(opp.weak ? { weak: opp.weak } : {}),
    ...(opp.resist ? { resist: opp.resist } : {}),
  };
}

function hit(rand: () => number, attacker: Fighter, defender: Fighter): { dmg: number; crit: boolean } {
  const base = attacker.attack - defender.defense * 0.5;
  const roll = 0.85 + rand() * 0.3;
  const crit = rand() < (attacker.critChance ?? 0.05);
  return { dmg: Math.max(1, Math.round(base * roll * (crit ? (attacker.critMult ?? 1.5) : 1))), crit };
}

/** Executa uma luta da arena (onda seq). Determinístico pela semente + seq. */
export function runArenaCycle(arena: ArenaDef, player: Fighter, seed: number, wave: number): Cycle {
  const rand = rngFor(seed, wave);
  const opp = arena.opponents[Math.min(wave, arena.opponents.length - 1)];
  const monster = opponentToMonster(opp);
  const monsters = [monster];

  let playerHp = player.hp;
  let monsterHp = monster.hp;
  let nextMonster = monster.attackSpeedMs;
  let nextPlayer = player.attackSpeedMs;
  let t = 0;
  let outcome: Cycle['outcome'] = 'draw';
  const hits: Hit[] = [];

  const spells = player.spells ?? [];
  const maxMana = player.mana ?? 0;
  let mana = maxMana;
  let manaAt = 0;
  const readyAt: Record<string, number> = {};
  let buffUntil = 0;
  let buffAttack = 0;
  let buffCrit = 0;
  let shieldUntil = 0;
  let shieldReduce = 0;
  // Atiradores: cada um tem o seu tempo, defasado para as bolas de fogo não caírem juntas.
  const casters = arena.casters;
  const nextCast = casters ? Array.from({ length: casters.count }, (_, i) => Math.round((casters.everyMs * (i + 1)) / casters.count)) : [];
  const can = (s: Spell, at: number) => (readyAt[s.id] ?? 0) <= at && mana >= s.cost;
  // Escudo de Mana (Arcanista): parte do golpe sai da mana enquanto houver.
  const absorb = (dmg: number) => {
    if (!player.manaShield) return dmg;
    const a = Math.min(Math.floor(mana), Math.round(dmg * player.manaShield));
    mana -= a;
    return dmg - a;
  };
  const use = (s: Spell, at: number) => {
    mana -= s.cost;
    readyAt[s.id] = at + s.cooldownMs;
  };

  while (t < MAX_FIGHT_MS) {
    if (monsterHp <= 0) {
      outcome = 'win';
      break;
    }

    const ci = nextCast.length ? nextCast.indexOf(Math.min(...nextCast)) : -1;
    if (ci >= 0 && nextCast[ci] < nextPlayer && nextCast[ci] < nextMonster) {
      // Bola de fogo de um atirador: não dá para esquivar nem revidar.
      t = nextCast[ci];
      let dmg = Math.max(1, Math.round(casters!.damage * (0.85 + rand() * 0.3)));
      if (shieldUntil > t) dmg = Math.max(1, Math.round(dmg * (1 - shieldReduce)));
      dmg = absorb(dmg);
      hits.push({ t, by: 'm', dmg, crit: false, caster: ci });
      playerHp -= dmg;
      nextCast[ci] += casters!.everyMs;
      if (playerHp <= 0) {
        outcome = 'death';
        break;
      }
      continue;
    }
    if (nextPlayer <= nextMonster) {
      t = nextPlayer;
      mana = Math.min(maxMana, mana + ((t - manaAt) / 1000) * (player.manaRegen ?? 2));
      manaAt = t;
      for (const s of spells) {
        const e = s.effect;
        if (e.kind === 'heal' && playerHp < player.hp * (player.rules?.heal?.[s.id] ?? e.below) && can(s, t)) {
          use(s, t);
          const amount = Math.min(player.hp - playerHp, Math.round(player.hp * e.pct * (player.duel?.heal ?? 1)));
          playerHp += amount;
          hits.push({ t, by: 'p', dmg: 0, crit: false, spell: s.id, heal: amount });
        } else if (e.kind === 'buff' && (buffUntil <= t || (!!s.promotion && buffAttack + buffCrit < (e.attack ?? 0) + (e.crit ?? 0))) && can(s, t)) {
          use(s, t);
          buffUntil = t + e.durationMs;
          buffAttack = e.attack ?? 0;
          buffCrit = e.crit ?? 0;
          hits.push({ t, by: 'p', dmg: 0, crit: false, spell: s.id });
        } else if (e.kind === 'shield' && (shieldUntil <= t || (!!s.promotion && shieldReduce < e.reduce)) && can(s, t)) {
          use(s, t);
          shieldUntil = t + e.durationMs;
          shieldReduce = e.reduce;
          if (e.attack) {
            buffAttack = Math.max(e.attack, buffUntil > t ? buffAttack : 0);
            buffUntil = Math.max(buffUntil, t + e.durationMs);
          }
          const amount = e.heal ? Math.min(player.hp - playerHp, Math.round(player.hp * e.heal * (player.duel?.heal ?? 1))) : 0;
          playerHp += amount;
          hits.push(amount > 0 ? { t, by: 'p', dmg: 0, crit: false, spell: s.id, heal: amount } : { t, by: 'p', dmg: 0, crit: false, spell: s.id });
        }
      }
      const buffed = buffUntil > t;
      const attacker: Fighter = buffed
        ? { ...player, attack: player.attack * (1 + buffAttack), critChance: (player.critChance ?? 0.05) + buffCrit }
        : player;

      // Arena é um contra um: magia marcada para 2+/3+ monstros na barra não sai aqui.
      const strike = spells.find((s) => s.effect.kind === 'strike' && can(s, t) && !(player.rules?.priority && player.rules.strike?.[s.id] && player.rules.strike[s.id] !== 'ready'));
      const h = hit(rand, strike?.effect.kind === 'strike' && strike.effect.sureCrit ? { ...attacker, critChance: 1 } : attacker, monster);
      // Parte elemental da arma contra a fraqueza/resistência do desafiante.
      if (player.element && player.elementShare) {
        h.dmg = Math.max(1, Math.round(h.dmg * (1 - player.elementShare + player.elementShare * elementMult(monster, player.element))));
      }
      if (strike && strike.effect.kind === 'strike') {
        use(strike, t);
        h.dmg = Math.round(h.dmg * strikeMult(strike.effect, monsterHp, monster.hp));
        if (strike.effect.guard) {
          shieldReduce = Math.max(strike.effect.guard.reduce, shieldUntil > t ? shieldReduce : 0);
          shieldUntil = Math.max(shieldUntil, t + strike.effect.guard.durationMs);
        }
      }
      hits.push(strike ? { t, by: 'p', target: 0, ...h, spell: strike.id } : { t, by: 'p', target: 0, ...h });
      monsterHp -= h.dmg;
      if (strike && strike.effect.kind === 'strike' && strike.effect.drain) {
        const amount = Math.min(player.hp - playerHp, Math.round(h.dmg * strike.effect.drain * (player.duel?.heal ?? 1)));
        if (amount > 0) {
          playerHp += amount;
          hits.push({ t, by: 'p', dmg: 0, crit: false, spell: strike.id, heal: amount });
        }
      }
      if (player.lifesteal) playerHp = Math.min(player.hp, playerHp + Math.round(h.dmg * player.lifesteal * DUEL_TUNING_LS.mult));
      nextPlayer += player.attackSpeedMs;
      if (monsterHp <= 0) {
        outcome = 'win';
        break;
      }
    } else {
      t = nextMonster;
      const h = hit(rand, monster, player);
      // Ajustes do duelo: esquiva (golpe zerado) e dano recebido a mais ou a menos.
      const dodged = !!player.duel?.dodge && rand() < player.duel.dodge;
      if (dodged) h.dmg = 0;
      else if (player.duel?.taken) h.dmg = Math.max(1, Math.round(h.dmg * player.duel.taken));
      if (h.dmg > 0 && shieldUntil > t) h.dmg = Math.max(1, Math.round(h.dmg * (1 - shieldReduce)));
      h.dmg = absorb(h.dmg);
      hits.push(dodged ? { t, by: 'm', target: 0, ...h, dodge: true } : { t, by: 'm', target: 0, ...h });
      playerHp -= h.dmg;
      nextMonster += monster.attackSpeedMs;
      if (playerHp <= 0) {
        outcome = 'death';
        break;
      }
    }
  }

  const fightMs = Math.min(t, MAX_FIGHT_MS);
  const damageTaken = player.hp - Math.max(0, playerHp);
  // Na arena: descanso de exatos 5 segundos (5000ms) após vencer o monstro!
  const restMs = outcome === 'win' ? ARENA_REST_MS : 0;
  const loot: Record<string, number> = outcome === 'win' ? { gold: Math.round(30 + rand() * 40) } : {};

  return {
    monster,
    monsters,
    hits,
    fightMs,
    restMs,
    outcome,
    damageTaken,
    loot,
    xp: outcome === 'win' ? monster.xp : 0,
  };
}

/** Simula a progressão da arena até now (ou fim das 10 ondas / morte). */
export function simulateArena(activity: Activity, now: number, ctx: HuntContext): SimResult {
  const arena = parseArenaNode(activity.node);
  const gains: Gains = emptyGains();
  if (!arena || now <= activity.since) {
    return { gains, since: activity.since, seq: activity.seq, ended: false };
  }

  let t = activity.since;
  let seq = activity.seq;
  let xp = ctx.combatXp;
  let ended = false;

  for (;;) {
    if (seq >= arena.opponents.length) {
      gains.arenaCleared = arena.id;
      ended = true;
      break;
    }

    const base = playerStats(ctx.vocation, xp, bonusAt(ctx, t), ctx.promotion, ctx.spells);
    const potioned = ctx.potion && (ctx.bank?.[ctx.potion] ?? 0) > 0 ? withPotion(base, ctx.potion) : base;
    const player: Fighter = { ...potioned, rules: ctx.rules ?? undefined };
    const cycle = runArenaCycle(arena, player, activity.seed, seq);

    if (cycle.outcome === 'death') {
      if (t + cycle.fightMs > now) break;
      gains.death = { monster: cycle.monster.id, xpLost: 0 };
      t += cycle.fightMs;
      seq++;
      ended = true;
      break;
    }

    const duration = cycle.fightMs + cycle.restMs;
    if (t + duration > now) {
      // Ainda lutando ou descansando no intervalo de 5s
      break;
    }

    t += duration;
    seq++;
    gains.actions++;
    xp += cycle.xp;
    for (const [it, qty] of Object.entries(cycle.loot)) {
      gains.items[it] = (gains.items[it] ?? 0) + qty;
    }

    if (seq >= arena.opponents.length) {
      // Derrotou todos os 10 desafiantes!
      gains.arenaCleared = arena.id;
      ended = true;
      break;
    }
  }

  const delta = xp - ctx.combatXp;
  if (delta !== 0) gains.xp.combat = delta;
  return { gains, since: t, seq, ended };
}

/** Retorna o CycleView atual da arena para o cliente renderizar a luta e o intervalo de 5s. */
export function currentArenaCycle(activity: Activity | null, ctx: HuntContext): CycleView | null {
  if (!activity || !isArenaNode(activity.node)) return null;
  const arena = parseArenaNode(activity.node);
  if (!arena) return null;

  const base = playerStats(ctx.vocation, ctx.combatXp, bonusAt(ctx, activity.since), ctx.promotion, ctx.spells);
  const potioned = ctx.potion && (ctx.bank?.[ctx.potion] ?? 0) > 0 ? withPotion(base, ctx.potion) : base;
    const player: Fighter = { ...potioned, rules: ctx.rules ?? undefined };
  const wave = Math.min(activity.seq, arena.opponents.length - 1);
  const c = runArenaCycle(arena, player, activity.seed, wave);

  return {
    monster: c.monster.id,
    monsters: [c.monster.id],
    fightMs: c.fightMs,
    restMs: c.restMs, // Exatos 5000ms após matar o monstro
    outcome: c.outcome,
    playerHp: player.hp,
    playerMana: player.mana ?? 0,
    monsterHp: c.monster.hp,
    monsterHps: [c.monster.hp],
    monsterName: c.monster.name,
    monsterNames: [c.monster.name],
    damageTaken: c.damageTaken,
    hits: c.hits,
    xp: c.outcome === 'win' ? c.xp : 0,
    loot: c.loot,
    ate: null,
  };
}
