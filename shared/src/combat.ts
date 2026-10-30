import { ELEMENT_LIST, MONSTER_ELEMENT_SHARE, REDUCTION_CAP, RESIST_CAP, RESIST_KEY, elementMult, monsterAttackElement, type Element } from './elements.ts';
import monstersData from '../data/monsters.json';
import dropSetsData from '../data/drop_sets.json';
import bossClassItemsData from '../data/boss_class_items.json';
import itemsData from '../data/items.json';
import huntsData from '../data/hunts.json';
import vocationsData from '../data/vocations.json';
import promotionsData from '../data/promotions.json';
import { BOSS_ESSENCE, BOSS_RARITY_MULT, RARITIES, REFINE_STEP, splitRarity, bossEssenceDrop,
  EQUIP_SLOTS,
  emptyGains,
  itemById,
  levelForXp,
  xpForLevel,
  OFFLINE_CAP_MS,
  XP_TABLE,
  type Activity,
  type Bonus,
  type EquipSlot,
  type Gains,
  type RuneEffect,
  type SimResult,
  type SkillId,
} from './skills.ts';
import { VOCATION_MANA_REGEN, applySpellGem, spellById, ultimateFor, wheelSpellFor, type CombatRules, type Spell, type SpellEffect } from './spells.ts';
import { mergeBonus } from './imbuements.ts';
import type { SpellAura } from './skills.ts';
import { applyCharms, applyPrey, PREY_DURATION_SECS, type CharmState, type PreySlot } from './bestiary.ts';
import { applyBoosted, getBoostedCreature } from './boosted.ts';
import { boostedChance, bossXpMult, isBosstiaryMonster, type BossBonus } from './bosstiary.ts';
import { MASTERY_MIN_LEVEL, huntLevelFor, masteryEffects, withMastery, wheelSideCompletedPoints, wheelRevelationLevel, type WheelSideId } from './mastery.ts';
import { BOSS_NIGHTMARE, instanceCycles, instancePhase, instanceRest, instanceWaves, isBossNightmare, lairIK, lairOverMult } from './instances.ts';
import { isKidsDay, KIDS_EVENT_MOB, KIDS_EVENT_MOB_CHANCE, isHalloween, HALLOWEEN_EVENT_MOB, HALLOWEEN_EVENT_MOB_CHANCE } from './events.ts';
import { isRaidId, raidHuntById, raidMonsterById, raidById, RAID_MAX_FIGHT_MS, RAID_PHASE_REST_MS, RAID_GUARD_EVERY_MS, RAID_GUARD_WAVES, RAID_ALLY_HEAL, RAID_BURST_SHARE } from './raids.ts';

// ── Dados ───────────────────────────────────────────────────────────────────

export interface LootEntry {
  item: string;
  /** Chance de cair, de 0 a 1. */
  chance: number;
  min?: number;
  max?: number;
  /** Só cai enquanto a história está neste passo (item de quest). */
  quest?: { story: string; step: number };
}

export interface Monster {
  id: string;
  en?: string;
  /** Elementos que o ferem mais e que ele aguenta (veja elements.ts). */
  weak?: Element[];
  resist?: (Element | 'physical')[];
  name: string;
  /** Frames em client/public/assets/monsters/<sprite>_1..4.png */
  sprite: string;
  hp: number;
  attack: number;
  defense: number;
  attackSpeedMs: number;
  xp: number;
  loot: LootEntry[];
  /** Marcas dos charms do jogador nesta espécie (ver bestiary.ts). */
  charm?: CharmMark;
  /** Elemento do golpe e a fração dele (só posto na luta, quando o personagem resiste a ele). */
  element?: Element;
  elementShare?: number;
}

/** O que os charms fazem durante a luta contra a espécie marcada. */
export interface CharmMark {
  /** Chance por golpe de um dano extra do elemento (fração da vida máxima da espécie). */
  proc?: { element: Element; chance: number; pct: number };
  /** Crítico a mais contra a espécie. */
  crit?: number;
  /** Roubo de vida a mais contra a espécie. */
  leech?: number;
  /** Roubo de mana a mais contra a espécie (charm Sede Arcana). */
  manaLeech?: number;
  /** Descanso mais curto depois de lutar com ela (fração). */
  rest?: number;
}

export interface Hunt {
  id: string;
  name: string;
  region: string;
  /** Nível recomendado. Dá para entrar antes — e morrer. */
  level: number;
  monsters: string[];
  /** Instância: depois das ondas de limpeza, os chefes vêm em ordem, uma vez cada, e acaba no último. */
  boss?: boolean;
  /** Monstros das ondas de limpeza da instância (sem eles, vai direto aos chefes). */
  trash?: string[];
  /** Chave da instância: gasta quando o chefe aparece (a primeira vitória do dia não gasta). */
  key?: string;
  /** Covil (aba Chefes): um chefe só, uma luta por entrada e 16 h de cooldown (sem ondas nem chave). */
  lair?: boolean;
  /** Raide semanal (3 fases em sequência, tempo limite de fúria). */
  raid?: boolean;
  /** Quest de acesso (id da história) que precisa estar concluída para entrar. */
  requires?: string;
  /** Foco da caçada: muita XP e pouco loot, muito loot (ouro, peças, materiais) e menos XP, ou meio-termo. */
  focus?: HuntFocusId;
  /**
   * Instância de quest (id da história): aba Quests da caçada, sem chave nem baú do dia; só abre no
   * passo da história que pede vencê-la e só se vence uma vez.
   */
  quest?: string;
  /** Ajuste fino do XP desta caçada (equilíbrio com as vizinhas; ver server/scripts/survey_xp.ts). */
  xpMult?: number;
  /** Ajuste da vida e do dano dos monstros só nesta caçada (os mesmos monstros em outro lugar não mudam). */
  statMult?: { hp?: number; attack?: number };
}

export type HuntFocusId = 'xp' | 'loot' | 'balanced';

/**
 * Multiplicadores do foco: XP, chance dos drops (materiais e itens), ouro (o que se espera
 * ganhar: abaixo de 1 cai menos vezes, acima de 1 cai mais em cada drop) e chance de peça de
 * equipamento. Caçada sem foco é meio-termo.
 */
export const HUNT_FOCUS: Record<HuntFocusId, { xp: number; loot: number; gold: number; gear: number; name: string }> = {
  xp: { xp: 1.25, loot: 0.4, gold: 0.25, gear: 0.3, name: 'XP' },
  balanced: { xp: 1, loot: 1, gold: 1, gear: 1, name: 'Meio-termo' },
  loot: { xp: 0.75, loot: 2, gold: 2, gear: 2.5, name: 'Loot' },
};

/** Ouro de um drop com o foco: corta a chance (foco em XP) ou multiplica a quantidade (foco em loot). */
function focusGold(l: LootEntry, gold: number): LootEntry {
  if (!(gold > 0) || gold === 1) return l;
  if (gold < 1) return { ...l, chance: l.chance * gold };
  const min = l.min ?? 1;
  return { ...l, min: Math.round(min * gold), max: Math.round((l.max ?? min) * gold) };
}

export const MONSTERS = monstersData as Monster[];
export const HUNTS = huntsData as Hunt[];
export const monsterById = (id: string) => MONSTERS.find((m) => m.id === id) ?? raidMonsterById(id);

// ── Dificuldade ─────────────────────────────────────────────────────────────

export type DifficultyId = 'normal' | 'hard' | 'nightmare';

export interface Difficulty {
  id: DifficultyId;
  name: string;
  xp: number;
  /** Multiplica a chance de cada drop (até 100%). */
  loot: number;
  /**
   * Níveis a mais: somado ao nível recomendado da caçada, e os monstros crescem
   * o mesmo que o personagem cresceria nesses níveis.
   */
  level: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'normal', name: 'Normal', xp: 1, loot: 1, level: 0 },
  { id: 'hard', name: 'Difícil', xp: 1.4, loot: 1.5, level: 8 },
  { id: 'nightmare', name: 'Pesadelo', xp: 1.8, loot: 2, level: 16 },
];

/**
 * A atividade de caçada guarda a dificuldade e o bando (pack) no próprio id:
 * "river_bank", "river_bank@hard", "river_bank:2" ou "river_bank@nightmare:3".
 * Assim o banco e o protocolo não mudam.
 */
export function parseHuntNode(node: string): { hunt: Hunt; difficulty: Difficulty; pack: number } | null {
  const [base, packStr] = node.split(':');
  const [id, diff = 'normal'] = base.split('@');
  const hunt = HUNTS.find((h) => h.id === id) ?? raidHuntById(id);
  const difficulty = DIFFICULTIES.find((d) => d.id === diff);
  const pack = packStr ? Math.max(1, Math.min(7, parseInt(packStr, 10) || 1)) : 1;
  // Covil e Raide: sempre 1. Instância: o bando da limpeza, até 5.
  return hunt && difficulty ? { hunt, difficulty, pack: (hunt.lair || hunt.raid) ? 1 : hunt.boss ? Math.min(5, pack) : pack } : null;
}

/**
 * Bônus de XP por bando (1 a 7 monstros por luta). Apanhar de vários e
 * descansar mais deixava o bando com menos XP/h que o solo; o bônus paga o risco.
 */
/** Dano de área nos monstros além do alvo principal (bando grande não multiplica o dano por 7). */
export const AREA_SPLASH = 0.6;

/**
 * Escudo de Mana do Arcanista nas caçadas: a fração do golpe que sai da mana cresce
 * com os monstros vivos (índice = vivos - 1), para ele aguentar bando gastando mana.
 */
export const HUNT_MANA_SHIELD = [0.3, 0.45, 0.6, 0.7, 0.75, 0.8, 0.8];

/**
 * Ajuste fino da força das magias de ataque por vocação e nível (equilíbrio de XP/h): pontos
 * [nível, força], em linha reta entre eles. O Arcanista e o Devoto sobravam no começo do jogo.
 */
export const SPELL_TUNE: Record<string, [number, number][]> = {
  // Arcanista sobrava até o 40 (até 132% do Caçador); no tier 2 (70) volta à força cheia.
  arcanist: [[0, 0.8], [30, 0.8], [60, 0.85], [70, 1.0]],
  // Devoto sobrava antes do 30 e despencava no tier 1 (Clériga 67% no 60); no tier 2 (70) volta a 1,6.
  devout: [[0, 1.2], [30, 1.35], [45, 1.75], [60, 2.1], [69, 2.1], [70, 1.6]],
};
export function spellTune(vocation: string, level: number): number {
  const pts = SPELL_TUNE[vocation];
  if (!pts) return 1;
  if (level <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [l1, v1] = pts[i];
    if (level <= l1) {
      const [l0, v0] = pts[i - 1];
      return v0 + ((v1 - v0) * (level - l0)) / (l1 - l0);
    }
  }
  return pts[pts.length - 1][1];
}

export const PACK_XP_BONUS = [1, 1.5, 1.85, 2.15, 1.9, 1.9, 1.9];

export const huntNode = (huntId: string, difficulty: DifficultyId = 'normal', pack: number = 1) => {
  const diffPart = difficulty === 'normal' ? huntId : `${huntId}@${difficulty}`;
  return pack > 1 ? `${diffPart}:${pack}` : diffPart;
};

export const huntById = (node: string) => parseHuntNode(node)?.hunt;

/** Monstro com os atributos da dificuldade aplicados. */
function scaled(m: Monster, d: Difficulty): Monster {
  if (d.level === 0) return m;
  const L = d.level;
  return {
    ...m,
    hp: Math.round(m.hp * (1 + 0.07 * L)),
    attack: m.attack + 1.0 * L,
    defense: m.defense + 0.5 * L,
    xp: Math.round(m.xp * d.xp),
    loot: m.loot.map((l) => ({ ...l, chance: Math.min(1, l.chance * d.loot) })),
  };
}

// ── Regras ──────────────────────────────────────────────────────────────────

/** Cada nível da caçada acima do seu: monstros com esta fração a mais de ataque (+8% por nível para baterem mais forte quando desafiadores). */
export const LEVEL_GAP_ATTACK = 0.08;
/** Até tantos níveis abaixo do seu a caçada rende o XP cheio (15 níveis de tolerância). */
export const LEVEL_GAP_GRACE = 15;
/**
 * ...e depois perde esta fração por nível. 24/10: de 2,5% para 4%, com piso de 20% (era 45%): com o piso alto,
 * uma caçada 50 níveis abaixo ainda rendia 72% da do nível (o top 1, nível 382, rendia mais na Sunken Ruins
 * do 330 com charms e prey nela do que na própria caçada).
 */
export const LEVEL_GAP_XP = 0.04;
/** Piso mínimo de XP para caçadas de nível mais baixo (nunca rende menos que 20%). */
export const LEVEL_GAP_MIN_XP = 0.2;

/**
 * Efeito da diferença entre o nível da caçada (já com a dificuldade) e o do
 * personagem: ataque a mais dos monstros e quanto do XP rende.
 */
/**
 * Começo rápido: caçadas de nível baixo dão XP extra (3x no nível 1, caindo
 * até sumir no nível 40), para os primeiros níveis passarem em minutos.
 */
export const EARLY_XP_UNTIL = 40;
export const earlyXpBoost = (huntLevel: number) => (huntLevel >= EARLY_XP_UNTIL ? 1 : 1 + (2 * (EARLY_XP_UNTIL - huntLevel)) / EARLY_XP_UNTIL);

/**
 * Bônus escondido para alcançar o topo do servidor: +50% de XP de caçada até o nível
 * CATCHUP_FULL_UNTIL, caindo em linha reta até zerar em CATCHUP_UNTIL. Do CATCHUP_UNTIL
 * para cima a curva fica intacta (quem já está lá não dispara).
 */
export const CATCHUP_UNTIL = 100;
export const CATCHUP_FULL_UNTIL = 60;
export const CATCHUP_MAX = 0.5;
export const catchUpXpBoost = (playerLevel: number | undefined) =>
  !playerLevel || playerLevel >= CATCHUP_UNTIL
    ? 1
    : 1 + CATCHUP_MAX * Math.min(1, (CATCHUP_UNTIL - playerLevel) / (CATCHUP_UNTIL - CATCHUP_FULL_UNTIL));

/** Equipamento com que cada vocação começa (para não lutar de mãos vazias). */
export const STARTER_KIT: Record<string, Partial<Record<EquipSlot, string>>> = {
  warrior: { weapon: 'bronze_sword', helmet: 'leather_cap', armor: 'leather_armor', legs: 'leather_legs', boots: 'leather_boots' },
  hunter: { weapon: 'wood_bow', helmet: 'leather_cap', armor: 'leather_armor', legs: 'leather_legs', boots: 'leather_boots' },
  arcanist: { weapon: 'wood_staff', helmet: 'linen_robe_helmet', armor: 'linen_robe_armor', legs: 'linen_robe_legs', boots: 'leather_boots' },
  devout: { weapon: 'bronze_mace', helmet: 'linen_robe_helmet', armor: 'linen_robe_armor', legs: 'linen_robe_legs', boots: 'leather_boots' },
};

export function levelGap(huntLevel: number, playerLevel: number): { attack: number; xp: number } {
  const gap = huntLevel - playerLevel;
  return {
    attack: gap > 0 ? LEVEL_GAP_ATTACK * gap : 0,
    xp: gap < -LEVEL_GAP_GRACE ? Math.max(LEVEL_GAP_MIN_XP, 1 + LEVEL_GAP_XP * (gap + LEVEL_GAP_GRACE)) : 1,
  };
}

/**
 * Caçada alta abaixo do nível: do nível 120 para cima, quem entra abaixo do nível da caçada
 * causa só uma fração do dano nos monstros e ganha só uma fração da XP (não dá para "explodir"
 * monstro de nível muito acima com equipamento e poções). Só nas caçadas comuns (instância e
 * covil não, o covil em grupo conta a luta com o dano cheio).
 */
export const UNDERLEVEL_HUNT_LEVEL = 120;
export const UNDERLEVEL_DAMAGE = 0.25;
export const UNDERLEVEL_XP = 0.25;
/** Caçadas comuns do 120 para cima: menos XP e monstros mais duros (para quem está no nível delas também). */
export const HIGH_HUNT_LEVEL = 120;
export const HIGH_HUNT_XP = 0.7;
export const HIGH_HUNT_HP = 1.3;
export const HIGH_HUNT_DEFENSE = 1.2;
/**
 * Poder de equipamento (25/10): do 380 para cima cada caçada comum pede uma nota de equipamento. Quem tem a
 * nota não muda nada; abaixo dela os monstros batem mais (×(1 + k × fração que falta)) e aguentam mais
 * (vida ×(1 + kHp × fração que falta), ou seja, você causa menos dano neles). Sem isso um mago do 386
 * sem refino, capa nem gema caçava no próprio nível sem morrer. Nota = média das 10 vagas (vaga vazia = 0)
 * de nível da peça × raridade × refino (ver gearPower).
 */
// 25/10 (tarde): a nota vale do 200 em diante (1,0 × nível no 200 subindo até 650 no 380), com punição mais leve abaixo do 380.
export const GEAR_REQ = { from: 380, base: 650, perLevel: 1, k: 12, kHp: 3, lowFrom: 200, lowRatio: 1, kLow: 4, kHpLow: 1 };
/** Nota pedida: do `lowFrom` ao `from` sobe de lowRatio × nível até `base`; do `from` em diante, +perLevel por nível. */
export const gearRequired = (huntLevel: number): number => {
  if (huntLevel >= GEAR_REQ.from) return Math.round(GEAR_REQ.base + GEAR_REQ.perLevel * (huntLevel - GEAR_REQ.from));
  if (huntLevel < GEAR_REQ.lowFrom) return 0;
  const t = (huntLevel - GEAR_REQ.lowFrom) / (GEAR_REQ.from - GEAR_REQ.lowFrom);
  return Math.round(huntLevel * (GEAR_REQ.lowRatio + (GEAR_REQ.base / GEAR_REQ.from - GEAR_REQ.lowRatio) * t));
};
/** Força a mais dos monstros das caçadas comuns (vida e ataque), além das outras regras. */
export const HUNT_STAT = { hp: 1.1, attack: 1.1 }; // 25/10: +10% em todas as caçadas comuns
/** 26/10: caçadas comuns do 350+ com mais vida e defesa (acompanha o equipamento +5/#5 e o bônus de set). */
export const ENDGAME_MONSTER = { from: 350, hp: 1.2, defense: 1 };
/**
 * XP de cada dificuldade nas caçadas comuns (25/10). Normal e Difícil +10% para compensar os monstros +10%;
 * Pesadelo 2,4 (era 1,8). Instância e covil seguem com o xp de DIFFICULTIES.
 */
export const HUNT_DIFF_XP: Record<string, number> = { normal: 1.1, hard: 1.55, nightmare: 2.4 };
/** Nota de uma peça: nível × multiplicador da raridade × refino (+5% por +1). */
export function gearPieceScore(id: string | null | undefined): number {
  if (!id) return 0;
  const { base, tier, refine } = splitRarity(id);
  const b = itemById(base);
  if (!b?.equip) return 0;
  const rarity = b.legendary ? (BOSS_RARITY_MULT[Math.max(4, tier)] ?? 1) * RARITIES[4].mult : RARITIES[tier].mult;
  return b.equip.level * rarity * (1 + refine * REFINE_STEP);
}
/** Nota de equipamento do personagem: média das vagas (vaga vazia conta 0). */
export const gearPower = (equipment: Partial<Record<EquipSlot, string | null>>): number =>
  Math.round(EQUIP_SLOTS.reduce((n, s) => n + gearPieceScore(equipment[s.id]), 0) / EQUIP_SLOTS.length);
/**
 * Fração da nota pedida que falta na caçada (0 = tem a nota, ou caçada sem nota). A nota vale pelo nível
 * efetivo da caçada: nível + o da dificuldade (Difícil +8, Pesadelo +16), então o Pesadelo pede mais.
 */
export const gearShortfall = (hunt: Hunt, power?: number, diffLevel = 0): number => {
  if (hunt.lair || hunt.boss || hunt.raid || power === undefined) return 0;
  const req = gearRequired(hunt.level + diffLevel);
  return req > 0 && power < req ? (req - power) / req : 0;
};
// Abaixo do `from` (faixa do lowFrom) a punição é mais leve (kLow, kHpLow).
export const endgameAttackMult = (hunt: Hunt, power?: number, diffLevel = 0): number =>
  1 + (hunt.level + diffLevel < GEAR_REQ.from ? GEAR_REQ.kLow : GEAR_REQ.k) * gearShortfall(hunt, power, diffLevel);
export const endgameHpMult = (hunt: Hunt, power?: number, diffLevel = 0): number =>
  1 + (hunt.level + diffLevel < GEAR_REQ.from ? GEAR_REQ.kHpLow : GEAR_REQ.kHp) * gearShortfall(hunt, power, diffLevel);
export const isHighHunt = (hunt: Pick<Hunt, 'level' | 'boss' | 'lair' | 'raid'>) => !hunt.boss && !hunt.lair && !hunt.raid && hunt.level >= HIGH_HUNT_LEVEL;
export const underLevelPenalty = (hunt: Pick<Hunt, 'level' | 'boss' | 'lair' | 'raid'>, playerLevel: number | undefined) =>
  !hunt.boss && !hunt.lair && !hunt.raid && hunt.level >= UNDERLEVEL_HUNT_LEVEL && !!playerLevel && playerLevel < hunt.level;

/** Tempo de andar da cidade até o portal e entrar: a caçada começa depois disso. */
export const TRAVEL_MS = 5000;

/** Vida recuperada por segundo de descanso, em fração da vida máxima. */
export const REGEN_PER_SEC = 0.03;
/** Luta que passa disso termina empatada: o monstro foge, sem XP. */
export const MAX_FIGHT_MS = 60_000;
/** Chefe de instância e de covil: vida 2,5x (as lutas acabavam rápido demais) e até 3 min de luta antes de fugir. */
export const BOSS_HP_MULT = 2.5;
/** Covil (23/10): vida +60% e ataque 2x por cima do BOSS_HP_MULT. Com Épico +5 a luta vai de 30-50 s para 50-85 s sem mortes; com comum +0, morre quase sempre. */
export const LAIR_HP_MULT = 1.6;
export const LAIR_ATK_MULT = 2;
export const BOSS_MAX_FIGHT_MS = 180_000;
/** Ao morrer, perde esta fração do XP do nível atual (nunca cai de nível). */
export const DEATH_XP_PENALTY = 0.1;
export const CRIT_CHANCE = 0.05;
/** Chance de cair equipamento por monstro (chefes: bem maior). */
export const GEAR_DROP = 0.03;
/** Caçada de loot: chance de cada monstro soltar uma gema (para a Joalheria) e o peso de cada uma. */
export const LOOT_GEM_CHANCE = 0.015;
export const LOOT_GEMS: [string, number][] = [['gem_sapphire', 35], ['gem_emerald', 30], ['gem_ruby', 22], ['gem_diamond', 13]];
export const BOSS_GEAR_DROP = 0.3;
/** Caçadas comuns do 100 para cima: metade da chance de peça (quem mata muito rápido enchia o depósito de sets). */
export const HIGH_GEAR_DROP_FROM = 100;
export const HIGH_GEAR_DROP_MULT = 0.5;
/**
 * Buff de party por vocação: cada vocação diferente no grupo (party na mesma caçada) dá o seu buff
 * para todos, inclusive para quem dá. Guerreiro: menos dano sofrido; Caçador: mais dano no ataque
 * básico; Arcanista: mais dano das magias e runas de ataque; Devoto: mais cura (magias, runas e o
 * descanso entre as lutas).
 */
export interface PartyBuffs {
  /** Capa do Slayer: o monstro da tarefa entra com a vida multiplicada por slayerHpMult. */
  slayerTarget?: string;
  slayerHpMult?: number;
  guard?: number;
  basic?: number;
  spell?: number;
  heal?: number;
}
export const PARTY_VOCATION_BUFFS: Record<string, PartyBuffs> = {
  warrior: { guard: 0.08 },
  hunter: { basic: 0.1 },
  arcanist: { spell: 0.1 },
  devout: { heal: 0.15 },
};
/** Buffs de um grupo com essas vocações (repetir vocação não soma). */
export function partyBuffsFor(vocations: Iterable<string>): PartyBuffs {
  const out: PartyBuffs = {};
  for (const v of new Set(vocations)) Object.assign(out, PARTY_VOCATION_BUFFS[v] ?? {});
  return out;
}

/**
 * Covil em grupo: a luta é uma só. O chefe tem a vida inteira, apanha de todos e cai no mesmo
 * instante para todo mundo (`killAt`, pela soma do dano por segundo de cada um); os ataques dele
 * se dividem entre o grupo. Na luta de cada um entram os golpes dos aliados (com o dano deles).
 */
export interface LairGroup {
  /** Aliados na mesma luta: id do personagem, de quanto em quanto tempo bate e o dano médio do golpe. */
  allies: { id: number; hitMs: number; hit: number; hasAoe?: boolean; isHealer?: boolean }[];
  /** Quando o chefe cai (ms desde o começo da luta); passando de BOSS_MAX_FIGHT_MS, ele foge. */
  killAt: number;
}

/** Dano por segundo de um personagem contra um monstro (ataques, buffs e golpes de magia pela média). */
export function fighterDps(player: Fighter, m: Pick<Monster, 'defense'>, buffs: PartyBuffs = {}): number {
  let atk = player.attack;
  let crit = player.critChance ?? CRIT_CHANCE;
  for (const s of player.spells ?? []) {
    if (s.effect.kind === 'buff') {
      const uptime = Math.min(1, s.effect.durationMs / Math.max(1, s.cooldownMs));
      if (s.effect.attack) atk *= 1 + s.effect.attack * uptime;
      if (s.effect.crit) crit += s.effect.crit * uptime;
    }
  }
  const critMult = 1 + crit * 0.5;
  const base = ((Math.max(1, atk - m.defense * 0.5) * critMult * 1000) / player.attackSpeedMs) * (1 + (buffs.basic ?? 0));
  let spells = 0;
  for (const s of player.spells ?? []) {
    if (s.effect.kind !== 'strike') continue;
    spells += ((Math.max(1, atk * s.effect.mult - m.defense * 0.5) * critMult * 1000) / Math.max(1000, s.cooldownMs)) * (1 + (buffs.spell ?? 0));
  }
  return base + spells;
}

/**
 * Monta a luta compartilhada do covil para cada membro: quando o chefe cai (pela soma do dano por
 * segundo de todos, contra a vida inteira) e os golpes de cada aliado.
 */
export function lairGroupFor(members: { id: number; fighter: Fighter }[], boss: Monster, buffs: PartyBuffs = {}): Map<number, LairGroup> {
  const dps = members.map((m) => {
    const hasAoe = (m.fighter.spells ?? []).some(
      (s) => (s.effect?.kind === 'strike' && !!s.effect.area) || s.id.includes('meteor') || s.id.includes('wave') || s.id.includes('blizzard') || s.id.includes('flame') || s.id.includes('barrage') || s.id.includes('arrow_rain') || s.id.includes('whirlwind') || s.id.includes('earthquake'),
    );
    const isHealer = m.fighter.vocation === 'devout' || (m.fighter.spells ?? []).some((s) => s.effect?.kind === 'heal');
    return {
      id: m.id,
      hitMs: m.fighter.attackSpeedMs,
      dps: Math.max(1, fighterDps(m.fighter, boss, buffs)),
      hasAoe,
      isHealer,
    };
  });
  const total = dps.reduce((a, d) => a + d.dps, 0);
  const killAt = Math.round((boss.hp * BOSS_HP_MULT * 1000) / total);
  const out = new Map<number, LairGroup>();
  for (const m of dps) {
    out.set(m.id, {
      killAt,
      allies: dps.filter((d) => d.id !== m.id).map((d) => ({
        id: d.id,
        hitMs: d.hitMs,
        hit: Math.max(1, Math.round((d.dps * d.hitMs) / 1000)),
        hasAoe: d.hasAoe,
        isHealer: d.isHealer,
      })),
    });
  }
  return out;
}
/** Que equipamento cai em cada faixa de nível de caçada. */
/** Sets de drop (server/scripts/gen_drop_sets.ts): cada set cai nas caçadas do nível dele até o próximo. */
const DROP_SET_ITEMS = dropSetsData as { id: string; template: string; equip: { level: number } }[];
/** Peça de drop → a de fazer que ela copia (o boneco usa o desenho dela). */
export const DROP_SET_LOOK: Record<string, string> = Object.fromEntries(
  [
    ...DROP_SET_ITEMS,
    ...(bossClassItemsData as { id: string; template: string }[]),
    // Itens com `look` (sets de quest) usam o desenho dessa peça.
    ...(itemsData as { id: string; look?: string }[]).filter((i) => i.look).map((i) => ({ id: i.id, template: i.look! })),
  ].map((d) => [d.id, d.template]),
);
const DROP_SET_LEVELS = [...new Set(DROP_SET_ITEMS.map((d) => d.equip.level))].sort((a, b) => a - b);
const DROP_TIERS = DROP_SET_LEVELS.map((level, i) => ({
  maxLevel: i + 1 < DROP_SET_LEVELS.length ? DROP_SET_LEVELS[i + 1] - 1 : 999,
  items: DROP_SET_ITEMS.filter((d) => d.equip.level === level).map((d) => d.id),
}));

export const GEAR_TIERS: { maxLevel: number; items: string[] }[] = [
  {
    maxLevel: 9,
    items: ['bronze_sword', 'bronze_mace', 'wood_bow', 'wood_staff', 'bronze_helmet', 'bronze_shield', 'bronze_boots', 'bronze_legs', 'bronze_armor', 'leather_cap', 'leather_boots', 'leather_legs', 'leather_armor'],
  },
  {
    maxLevel: 24,
    items: [
      'iron_sword', 'iron_mace', 'iron_axe', 'oak_bow', 'oak_crossbow', 'oak_staff', 'iron_helmet', 'iron_shield', 'iron_boots', 'iron_legs', 'iron_armor',
      'wolf_leather_helmet', 'wolf_leather_armor', 'wolf_leather_legs', 'silk_robe_helmet', 'silk_robe_armor', 'silk_robe_legs',
      'silver_necklace', 'iron_ring', 'silk_spellbook',
    ],
  },
  {
    maxLevel: 34,
    items: [
      'steel_sword', 'steel_mace', 'steel_axe', 'shadow_bow', 'steel_crossbow', 'shadow_staff', 'steel_helmet', 'steel_shield', 'steel_boots', 'steel_legs', 'steel_armor',
      'lizard_leather_helmet', 'lizard_leather_armor', 'lizard_leather_legs', 'shaman_robe_helmet', 'shaman_robe_armor', 'shaman_robe_legs',
      'emerald_amulet', 'stealth_ring', 'shaman_spellbook',
    ],
  },
  {
    // Do 35 ao 44: o mithril (guerreiro e devoto); caçador e arcanista seguem com os deles.
    maxLevel: 44,
    items: [
      'mithril_sword', 'mithril_mace', 'mithril_axe', 'mithril_helmet', 'mithril_shield', 'mithril_boots', 'mithril_legs', 'mithril_armor',
      'mithril_holy_helmet', 'mithril_holy_armor', 'mithril_holy_legs',
      'shadow_bow', 'steel_crossbow', 'shadow_staff', 'lizard_leather_helmet', 'lizard_leather_armor', 'lizard_leather_legs', 'shaman_robe_helmet', 'shaman_robe_armor', 'shaman_robe_legs',
      'golden_spellbook',
    ],
  },
  {
    maxLevel: 59,
    items: [
      'abyssal_sword', 'abyssal_mace', 'abyssal_axe', 'abyssal_bow', 'abyssal_crossbow', 'abyssal_staff', 'abyssal_helmet', 'abyssal_shield', 'abyssal_boots', 'abyssal_legs', 'abyssal_armor',
      'shadow_leather_helmet', 'shadow_leather_armor', 'shadow_leather_legs', 'abyss_robe_helmet', 'abyss_robe_armor', 'abyss_robe_legs',
      'abyss_spellbook',
    ],
  },
  // Do 60 em diante: os sets de drop (um a cada 15 níveis; shared/data/drop_sets.json).
  ...DROP_TIERS,
];
const CRIT_MULT = 1.5;

export interface Fighter {
  hp: number;
  attack: number;
  defense: number;
  attackSpeedMs: number;
  /** Chance de crítico (padrão CRIT_CHANCE). */
  critChance?: number;
  /** Multiplicador do crítico (padrão CRIT_MULT). */
  critMult?: number;
  /** Fração do dano causado que volta como vida. */
  lifesteal?: number;
  /** Fração do dano causado que volta como mana. */
  manaLeech?: number;
  /** Fração da vida recuperada por segundo de descanso (padrão REGEN_PER_SEC). */
  regen?: number;
  /** Bônus de set pela qualidade (26/10): XP e chance de loot a mais nas caçadas (fração). */
  xpPct?: number;
  lootPct?: number;
  /** Nível de combate (só o personagem): compara com o nível da caçada. */
  level?: number;
  /** Nível que conta nas caçadas comuns (400+: 400 + nível de Maestria). Sem ele, vale `level`. */
  huntLevel?: number;
  /** Mana máxima (só o personagem). */
  mana?: number;
  /** Regeneração de mana por segundo de luta (só o personagem). */
  manaRegen?: number;
  /** Magias equipadas, lançadas sozinhas na luta. */
  spells?: Spell[];
  /** Runas levadas do banco (no máximo `count` usos nesta luta). */
  runes?: { id: string; effect: RuneEffect; count: number }[];
  /** Poções de mana levadas do banco. */
  manaPotion?: { id: string; mana: number; count: number };
  /** Poção de vida tomada durante a luta (a escolhida na barra, ou a melhor do banco no automático). */
  healthPotion?: { id: string; heal: number; count: number };
  /** Escudo de Mana (Arcanista): nos duelos é esta fração fixa; nas caçadas cresce com o bando (HUNT_MANA_SHIELD). */
  manaShield?: number;
  /** Ajustes dos duelos (ver DUEL_TUNING). */
  duel?: { dodge?: number; heal?: number; taken?: number };
  /** Fatias da Roda da Maestria ativas do jogador. */
  wheelMastery?: Partial<Record<string, number>>;
  /** Vocação do jogador (para revelações e magias de maestria). */
  vocation?: string;
  /** Condições da barra de ação (ordem das magias, limites de vida e mana). */
  rules?: CombatRules;
  /** Mana com que o personagem começa a luta (padrão: mana cheia). */
  initialMana?: number;
  /** Buff e escudo que ainda valem da luta anterior (sem isso, cada luta lançava de novo e gastava mana à toa). */
  initialAura?: SpellAura;
  /** Elemento do ataque e a fração do dano que é desse elemento (o resto é físico). */
  element?: Element;
  elementShare?: number;
  /** Flecha de área: fração do tiro normal que acerta também os outros monstros vivos. */
  arrowSplash?: number;
  /** Fraquezas e resistências (monstros). */
  weak?: Element[];
  resist?: (Element | 'physical')[];
  /** Resistência em fração a cada elemento (personagem, anéis e colares). */
  resistPct?: Partial<Record<Element, number>>;
  /** Nota de equipamento do personagem (ver gearPower): abaixo da pedida, os monstros do fim de jogo batem mais. */
  gearPower?: number;
  /** Fração de todo dano dos monstros a menos (personagem, anéis e colares). */
  reduction?: number;
}

/** Recarga das runas, separada das magias. */
export const RUNE_STRIKE_MS = 20000;
export const RUNE_HEAL_MS = 20000;

/** Leva as runas escolhidas que ainda há no banco (até o que há de cada uma). */
export function withRunes(player: Fighter, ids: (string | null | undefined)[], pantry: Record<string, number>): Fighter {
  const runes: NonNullable<Fighter['runes']> = [];
  for (const id of ids) {
    const effect = id ? itemById(id)?.rune : undefined;
    const count = id ? (pantry[id] ?? 0) : 0;
    if (effect && count > 0 && !runes.some((r) => r.effect.kind === effect.kind)) runes.push({ id: id!, effect, count });
  }
  return runes.length ? { ...player, runes } : player;
}

/** Leva as poções de mana escolhidas que ainda há no banco. */
export function withManaPotion(player: Fighter, potionId: string | null | undefined, pantry: Record<string, number>): Fighter {
  const p = potionId ? itemById(potionId)?.manaPotion : undefined;
  const count = potionId ? (pantry[potionId] ?? 0) : 0;
  if (!p || count <= 0) return player;
  return { ...player, manaPotion: { id: potionId!, mana: p, count } };
}

/** Intervalo mínimo entre dois goles de poção de vida durante a luta. */
/** Poção de mana: no máximo um gole a cada tanto (antes era a cada ataque, e abaixo do limite virava gole sem parar). */
export const MANA_POTION_COOLDOWN_MS = 2000;
/** Regeneração de mana: além da fixa da vocação, esta fração da mana máxima por segundo (sem ela, no nível alto a regeneração não cobria nada das magias). */
export const MANA_REGEN_OF_MAX = 0.01;
export const manaRegenFor = (base: number, maxMana: number) => base + maxMana * MANA_REGEN_OF_MAX;

export const HEALTH_POTION_COOLDOWN_MS = 2000;

/** É poção de vida (cura durante a luta; as outras comidas só curam depois dela). */
export const isHealthPotion = (id: string) => id.endsWith('health_potion') && !!itemById(id)?.food;

/**
 * Poção de vida para a luta: a escolhida na barra (se for poção), ou no automático a que mais cura
 * no banco. Comida que não é poção, ou a barra desligada, não cura no meio da luta.
 */
export function withHealthPotion(player: Fighter, pref: FoodPref | undefined, pantry: Record<string, number>): Fighter {
  if (pref === NO_FOOD) return player;
  let best: string | null = null;
  if (pref) best = isHealthPotion(pref) && (pantry[pref] ?? 0) > 0 ? pref : null;
  else {
    for (const [id, qty] of Object.entries(pantry)) {
      if (qty > 0 && isHealthPotion(id) && (!best || itemById(id)!.food! > itemById(best)!.food!)) best = id;
    }
  }
  if (!best) return player;
  return { ...player, healthPotion: { id: best, heal: itemById(best)!.food!, count: pantry[best] } };
}

/** Quantas poções de vida a luta gastou. */
export function healthPotionsUsed(hits: Hit[]): Record<string, number> {
  const used: Record<string, number> = {};
  for (const h of hits) if (h.healthPotion) used[h.healthPotion] = (used[h.healthPotion] ?? 0) + 1;
  return used;
}

/** Quantas poções de mana a luta gastou. */
export function manaPotionsUsed(hits: Hit[]): Record<string, number> {
  const used: Record<string, number> = {};
  for (const h of hits) if (h.manaPotion) used[h.manaPotion] = (used[h.manaPotion] ?? 0) + 1;
  return used;
}

/** Quantas runas de cada tipo a luta gastou. */
export function runesUsed(hits: Hit[]): Record<string, number> {
  const used: Record<string, number> = {};
  for (const h of hits) if (h.rune && !h.runeExtra) used[h.rune] = (used[h.rune] ?? 0) + 1;
  return used;
}

// ── Promoções (nível 30) ────────────────────────────────────────────────────

export const PROMOTION_LEVEL = 30;
export const SECOND_PROMOTION_LEVEL = 70;
export const THIRD_PROMOTION_LEVEL = 100;
export const FOURTH_PROMOTION_LEVEL = 200;
/** História que libera cada ascensão (tier 2, 3 e 4). */
export const ASCENSION_STORY: Record<number, string> = { 2: 'master_ascension', 3: 'legend_ascension', 4: 'mythic_ascension' };

export interface Promotion {
  id: string;
  vocation: string;
  name: string;
  /** Herói do Grimhold que ensina a promoção. */
  master: string;
  description: string;
  /** Tier 1 = nível 30, Tier 2 = nível 70, Tier 3 = nível 100, Tier 4 = nível 200 (com a ultimate). Se omitido, padrão é 1. */
  tier?: number;
  /** ID da promoção de tier 1 requerida para ascender (para tier 2). */
  requires?: string;
  /** Multiplicadores (hp, attack, defense, speed, regen) e somas (crit, critMult, lifesteal). */
  mods: Partial<Record<'hp' | 'attack' | 'defense' | 'speed' | 'regen' | 'crit' | 'critMult' | 'lifesteal' | 'mana', number>>;
}

/**
 * Escudo de Mana do Arcanista nos duelos (arenas e provações): esta fração de cada golpe
 * recebido sai da mana enquanto houver. Compensa a vida baixa no um contra um, onde não
 * há bando para a magia de área render.
 */
export const ARCANIST_MANA_SHIELD = 0.45;

/**
 * Ajustes só dos duelos (arenas e provações), por vocação, para as quatro passarem
 * por igual no um contra um (acertados com server/scripts/tune_arenas.ts):
 * manaShield = Escudo de Mana, dodge = chance de esquivar do golpe do oponente,
 * heal = multiplica a cura das magias, taken = multiplica o dano recebido.
 */
/** Roubo de vida nos duelos: no um contra um longo ele cura mais que a vida inteira. */
export const DUEL_TUNING_LS = { mult: 0.4 };
export const DUEL_TUNING: Record<string, { manaShield?: number; dodge?: number; heal?: number; taken?: number }> = {
  warrior: { taken: 1.2 },
  hunter: { dodge: 0.2 },
  arcanist: { manaShield: ARCANIST_MANA_SHIELD },
  devout: { heal: 0.4, taken: 1.5 },
};

export const PROMOTIONS = promotionsData as Promotion[];
export const promotionById = (id: string | null | undefined) => PROMOTIONS.find((p) => p.id === id);
export const promotionsFor = (vocation: string, tier = 1) =>
  PROMOTIONS.filter((p) => p.vocation === vocation && (p.tier ?? 1) === tier);
export const nextPromotionFor = (currentPromotionId: string | null | undefined) =>
  currentPromotionId ? PROMOTIONS.find((p) => p.requires === currentPromotionId) : undefined;

type VocationBase = {
  id: string;
  base: { hp: number; mana: number; attack: number; defense: number; attackSpeedMs: number };
  /** Ataque a mais por nível acima do 75 (endgame). Caçador e devoto escalam pior lá em cima. */
  endgameAttack?: number;
};

/** Atributos do personagem no nível de combate atual. */
export function playerStats(
  vocationId: string,
  combatXp: number,
  bonus?: Bonus,
  promotion?: string | null,
  spells: string[] = [],
  skills?: Partial<Record<SkillId, number>>,
  masteryNodes?: Partial<Record<string, number>>,
): Fighter {
  if (masteryNodes) bonus = withMastery(bonus ?? { attack: 0, defense: 0, hp: 0 }, masteryNodes);
  const voc = (vocationsData as VocationBase[]).find((v) => v.id === vocationId);
  if (!voc) throw new Error(`Vocação desconhecida: ${vocationId}`);
  const lv = levelForXp(combatXp, 'combat') - 1;
  const m = promotionById(promotion)?.mods ?? {};
  const manaPerLvl = voc.id === 'warrior' ? 5 : voc.id === 'hunter' ? 15 : voc.id === 'devout' ? 25 : 30;
  const baseManaRegen = VOCATION_MANA_REGEN[vocationId] ?? 2;

  // Níveis das skills de combate estilo Tibia (nível 1 = base):
  const meleeLvl = Math.max(0, levelForXp(skills?.melee ?? 0, 'melee') - 1);
  const rangedLvl = Math.max(0, levelForXp(skills?.ranged ?? 0, 'ranged') - 1);
  const magicLvl = Math.max(0, levelForXp(skills?.magic_level ?? 0, 'magic_level') - 1);
  const shieldingLvl = Math.max(0, levelForXp(skills?.shielding ?? 0, 'shielding') - 1);

  // Multiplicador no ataque básico:
  const skillAttackMult =
    vocationId === 'hunter'
      ? 1 + 0.015 * rangedLvl
      : vocationId === 'warrior' || vocationId === 'devout'
      ? 1 + 0.015 * meleeLvl
      : 1 + 0.015 * magicLvl;

  // Bônus de defesa pelo escudo:
  const shieldDef = bonus?.defense ? Math.max(0, bonus.defense) : 0;
  const shieldBonus = Math.round(shieldDef * 0.02 * shieldingLvl);

  // Escala de dano e cura das magias por Magic Level:
  // A ultimate da promoção vem primeiro e não ocupa vaga da barra.
  const ultimate = ultimateFor(promotion);
  // Magias da Roda da Maestria: desbloqueadas com 70 pontos num lado e fortalecidas com 100 pontos
  const wheelSlices = masteryNodes;
  const wheelSideSpells: Spell[] = [];
  if (wheelSlices) {
    const sides: WheelSideId[] = ['fury', 'precision', 'bastion', 'arcane'];
    for (const side of sides) {
      const comp = wheelSideCompletedPoints(wheelSlices, side);
      if (comp >= 70) {
        const isStrong = comp >= 100;
        const sp = wheelSpellFor(side, vocationId, isStrong);
        if (sp) wheelSideSpells.push(sp);
      }
    }
  }
  const regularSpells = [...(ultimate ? [ultimate.id] : []), ...spells.filter((id) => id !== ultimate?.id)]
    .map((id) => spellById(id))
    .filter((s): s is Spell => !!s && s.vocation === vocationId && s.level <= lv + 1);

  const activeSpells = [...wheelSideSpells, ...regularSpells]
    .filter((s): s is Spell => !!s && s.vocation === vocationId && s.level <= lv + 1)
    // Gema de Combate: reforça a magia dela.
    .map((s) => (bonus?.spellGem === s.id && !s.promotion ? applySpellGem(s, bonus.spellGemPower ?? 1) : s))
    .map((s) => {
      const magicMult = 1 + 0.02 * magicLvl;
      if (s.effect.kind === 'strike') {
        // A magia escala pelo magic level sem somar com a skill que já subiu o ataque (somar os dois dava ~5x).
        // Vale para as quatro vocações: Caçador e Guerreiro também treinam magic level lançando magias.
        const mult = Math.max(1, magicMult / skillAttackMult) * spellTune(vocationId, lv);
        return { ...s, effect: { ...s.effect, mult: Number((s.effect.mult * mult).toFixed(2)) } };
      }
      if (s.effect.kind === 'heal') {
        return { ...s, effect: { ...s.effect, pct: Math.min(1, Number((s.effect.pct * magicMult).toFixed(2))) } };
      }
      return s;
    });

  // A parte elemental da arma soma ao ataque. A fração do golpe que é do elemento é a
  // dela no ataque dos equipamentos (arma 30 + 8 de água = ~20% de cada golpe é água).
  const elemAttack = bonus?.element ? (bonus.elementAttack ?? 0) : 0;
  const gearAttack = Math.max(0, bonus?.attack ?? 0) + elemAttack;
  const rawAttack = voc.base.attack + 1.2 * lv + (voc.endgameAttack ?? 0) * Math.max(0, lv - 74) + (bonus?.attack ?? 0) + elemAttack;
  return {
    level: lv + 1,
    hp: Math.round((voc.base.hp * (1 + 0.08 * lv) + (bonus?.hp ?? 0)) * (m.hp ?? 1) * (1 + (bonus?.hpPct ?? 0))),
    attack: Math.round(rawAttack * (m.attack ?? 1) * skillAttackMult * (1 + (bonus?.attackPct ?? 0))),
    ...(elemAttack > 0 && gearAttack > 0 ? { element: bonus!.element, elementShare: elemAttack / gearAttack } : {}),
    defense: Math.round(((voc.base.defense + 0.8 * lv + (bonus?.defense ?? 0) + shieldBonus) * (m.defense ?? 1) * (1 + (bonus?.defensePct ?? 0)))),
    attackSpeedMs: Math.round(voc.base.attackSpeedMs * (m.speed ?? 1) * (1 + (bonus?.speed ?? 0))),
    critChance: CRIT_CHANCE + (m.crit ?? 0) + (bonus?.crit ?? 0),
    critMult: CRIT_MULT + (m.critMult ?? 0) + (bonus?.critMult ?? 0),
    lifesteal: (m.lifesteal ?? 0) + (bonus?.lifesteal ?? 0),
    ...(bonus?.manaLeech ? { manaLeech: bonus.manaLeech } : {}),
    regen: REGEN_PER_SEC * (m.regen ?? 1) * (1 + (bonus?.regen ?? 0)),
    ...(bonus?.xpPct ? { xpPct: bonus.xpPct } : {}),
    ...(bonus?.lootPct ? { lootPct: bonus.lootPct } : {}),
    mana: Math.round((voc.base.mana + manaPerLvl * lv + (bonus?.mana ?? 0)) * (m.mana ?? 1)),
    manaRegen: manaRegenFor(baseManaRegen, Math.round((voc.base.mana + manaPerLvl * lv + (bonus?.mana ?? 0)) * (m.mana ?? 1))) * (m.regen ?? 1) * (1 + (bonus?.regen ?? 0)),
    ...(DUEL_TUNING[vocationId]?.manaShield ? { manaShield: DUEL_TUNING[vocationId].manaShield } : {}),
    ...(DUEL_TUNING[vocationId] ? { duel: DUEL_TUNING[vocationId] } : {}),
    ...defensesOf(bonus),
    spells: activeSpells,
    wheelMastery: masteryNodes,
    vocation: vocationId,
  };
}

/** Redução de dano e resistências do equipamento (com teto; inválido não vale). */
function defensesOf(bonus: Bonus | undefined): Pick<Fighter, 'reduction' | 'resistPct'> {
  if (!bonus) return {};
  const ok = (v: number | undefined, cap: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(cap, v) : 0);
  const out: Pick<Fighter, 'reduction' | 'resistPct'> = {};
  const red = ok(bonus.reduction, REDUCTION_CAP);
  if (red) out.reduction = red;
  for (const el of ELEMENT_LIST) {
    const v = ok(bonus[RESIST_KEY[el]], RESIST_CAP);
    if (v) (out.resistPct ??= {})[el] = v;
  }
  return out;
}

// ── Sorteio determinístico ──────────────────────────────────────────────────
// Mesma semente + mesmo ciclo = mesma luta. É isso que garante que creditar
// online (a cada segundo) e offline (tudo de uma vez) dá o mesmo resultado.

export function rngFor(seed: number, seq: number): () => number {
  let a = (seed ^ Math.imul(seq + 1, 0x9e3779b1)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Strike = { dmg: number; crit: boolean; elem?: { element: Element; dmg: number } };

/**
 * Um golpe. A parte elemental (da arma, ou o golpe todo se `as` vem de uma magia
 * ou runa com elemento) leva a fraqueza/resistência do alvo; a física, a
 * resistência física. Contra alvo neutro dá o mesmo que antes.
 */
function hit(rand: () => number, attacker: Fighter, defender: Fighter, as?: { element: Element; share: number }): Strike {
  const base = attacker.attack - defender.defense * 0.5;
  const roll = 0.85 + rand() * 0.3;
  const crit = rand() < (attacker.critChance ?? CRIT_CHANCE);
  const dmg = Math.max(1, Math.round(base * roll * (crit ? (attacker.critMult ?? CRIT_MULT) : 1)));
  const el = as ?? (attacker.element && attacker.elementShare ? { element: attacker.element, share: attacker.elementShare } : null);
  const phys = elementMult(defender, 'physical');
  if (!el) return { dmg: phys === 1 ? dmg : Math.max(1, Math.round(dmg * phys)), crit };
  const e = Math.round(dmg * el.share * elementMult(defender, el.element));
  const p = Math.round(dmg * (1 - el.share) * phys);
  return e > 0 ? { dmg: Math.max(1, p + e), crit, elem: { element: el.element, dmg: e } } : { dmg: Math.max(1, p), crit };
}

/**
 * Runa de ataque: como no Tibia, depende do nível e não só da arma. Soma o nível ao ataque e a
 * defesa do monstro tira só RUNE_DEFENSE_CUT (o golpe normal tira metade). Antes uma runa de nível 25
 * tirava ~2% da vida de um demônio.
 */
export const RUNE_DEFENSE_CUT = 0.25;
export function runeBase(attacker: Pick<Fighter, 'attack' | 'level'>, defense: number): number {
  return attacker.attack + (attacker.level ?? 0) - defense * RUNE_DEFENSE_CUT;
}
function runeHit(rand: () => number, attacker: Fighter, defender: Fighter, mult: number, element?: Element): Strike {
  const roll = 0.85 + rand() * 0.3;
  const crit = rand() < (attacker.critChance ?? CRIT_CHANCE);
  const dmg = Math.max(1, Math.round(runeBase(attacker, defender.defense) * roll * (crit ? (attacker.critMult ?? CRIT_MULT) : 1) * mult));
  if (!element) return { dmg: Math.max(1, Math.round(dmg * elementMult(defender, 'physical'))), crit };
  const e = Math.max(1, Math.round(dmg * elementMult(defender, element)));
  return { dmg: e, crit, elem: { element, dmg: e } };
}

/** Multiplica o golpe (magia forte, runa), a parte elemental junto. */
function scaled1(h: Strike, mult: number): Strike {
  h.dmg = Math.max(1, Math.round(h.dmg * mult));
  if (h.elem) h.elem.dmg = Math.min(h.dmg, Math.round(h.elem.dmg * mult));
  return h;
}

// ── Um ciclo: luta + descanso ───────────────────────────────────────────────

/** Um golpe da luta, para o cliente encenar com os números exatos. */
export interface Hit {
  /** Momento do golpe, em ms desde o início do ciclo. */
  t: number;
  /** Quem bateu: 'p' = personagem, 'm' = monstro, 'a' = aliado da party (covil em grupo). */
  by: 'p' | 'm' | 'a';
  /** Aliado que bateu (id do personagem), no covil em grupo. */
  ally?: number;
  dmg: number;
  crit: boolean;
  /** Magia usada neste golpe (golpe forte, cura, buff ou escudo). */
  spell?: string;
  /** Vida curada (magia de cura). */
  heal?: number;
  /** Golpe extra de um charm elemental. */
  charm?: boolean;
  /** Vida recuperada por roubo de vida (vampirismo). */
  lifesteal?: number;
  /** Índice do monstro envolvido no golpe (0 a pack-1). */
  target?: number;
  /** Runa usada neste golpe (ou cura). */
  rune?: string;
  /** Golpe em área da mesma runa em outro monstro (não gasta outra runa). */
  runeExtra?: boolean;
  /** Poção de mana usada neste instante. */
  manaPotion?: string;
  /** Poção de vida tomada durante a luta (a cura vai em `heal`). */
  healthPotion?: string;
  /** Quantidade de mana recuperada. */
  manaHeal?: number;
  /** Parte elemental do dano (já somada em `dmg`). */
  elem?: { element: Element; dmg: number };
  /** Bola de fogo de um atirador da arena (índice dele), não do desafiante. */
  caster?: number;
  /** Respingo da flecha de área em outro monstro. */
  splash?: boolean;
  /** O personagem esquivou do golpe (duelos). */
  dodge?: boolean;
}

export interface Cycle {
  monster: Monster;
  /** Lista completa de monstros da luta (se pack > 1). */
  monsters: Monster[];
  hits: Hit[];
  /** Duração da luta. */
  fightMs: number;
  /** Descanso depois da luta, até a vida encher (0 se morreu). */
  restMs: number;
  outcome: 'win' | 'draw' | 'death';
  /** Vida perdida na luta. */
  damageTaken: number;
  loot: Record<string, number>;
  /** Total de XP obtido na luta ao vencer. */
  xp: number;
  /** Mana restante ao final da luta. */
  manaEnd?: number;
  /** Buff e escudo que sobram no fim da luta (ms que faltam). */
  auraEnd?: SpellAura;
}

/** Multiplicador da magia de golpe neste alvo (com o golpe de misericórdia, se ele está com pouca vida). */
export function strikeMult(e: Extract<SpellEffect, { kind: 'strike' }>, hpNow: number, hpMax: number): number {
  return e.execute && hpNow < hpMax * e.execute.below ? e.mult * e.execute.mult : e.mult;
}

/** Simula o ciclo número `seq` da caçada. O personagem sempre começa com a vida cheia. */
export function runCycle(
  hunt: Hunt,
  player: Fighter,
  seed: number,
  seq: number,
  difficulty: Difficulty = DIFFICULTIES[0],
  pack: number = 1,
  /** Passo atual de cada história em andamento (libera os drops de quest). */
  questSteps: Record<string, number> = {},
  /** Charms do bestiário (bônus contra a espécie escolhida). */
  charms: CharmState[] = [],
  /** Vagas de prey (bônus contra a espécie sorteada). */
  prey: PreySlot[] = [],
  /** Monstro do dia sorteado (estilo Tibia). */
  boostedCreature?: string,
  /** Instante em que a luta começa (eventos de calendário, como o Diabrete Doceiro). */
  at?: number,
  /** Covil em grupo: a luta compartilhada (quando o chefe cai e os golpes dos aliados). */
  lairGroup?: LairGroup,
  /** Buffs da party (vocações diferentes caçando juntas). */
  buffs: PartyBuffs = {},
  /** Bônus do Bosstiary: mais drop e XP contra chefes de instância e de covil. */
  bossBonus?: BossBonus,
): Cycle {
  const rand = rngFor(seed, seq);
  // Instância: ondas de limpeza (tamanho fixo) e depois os chefes, um por vez.
  const phase = hunt.boss && !hunt.raid ? instancePhase(hunt, seq, Math.min(5, pack)) : null;
  // Covil: toda luta é contra o chefe (vale o drop de equipamento de chefe).
  const bossFight = (!!phase && 'boss' in phase) || !!hunt.lair;
  const pool = phase && 'wave' in phase ? hunt.trash! : hunt.monsters;
  const count = hunt.raid ? 1 : phase ? ('wave' in phase ? phase.size : 1) : Math.max(1, Math.min(7, pack));
  const pick0 = hunt.raid
    ? hunt.monsters[Math.min(seq, hunt.monsters.length - 1)]
    : phase && 'boss' in phase
    ? hunt.monsters[Math.min(phase.boss, hunt.monsters.length - 1)]
    : pool[Math.floor(rand() * pool.length)];
  const monsters: Monster[] = [scaled(monsterById(pick0)!, difficulty)];
  for (let i = 1; i < count; i++) {
    const pickExtra = pool[Math.floor(rand() * pool.length)];
    monsters.push(scaled(monsterById(pickExtra)!, difficulty));
  }
  // Ajuste da caçada: mais vida e dano só aqui (valor inválido não muda nada).
  const hpUp = Number.isFinite(hunt.statMult?.hp) && hunt.statMult!.hp! > 0 ? hunt.statMult!.hp! : 1;
  const atkUp = Number.isFinite(hunt.statMult?.attack) && hunt.statMult!.attack! > 0 ? hunt.statMult!.attack! : 1;
  if (hpUp !== 1 || atkUp !== 1) monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * hpUp), attack: m.attack * atkUp }));
  // Chefe de instância e de covil: mais vida (a luta durava pouco até para quem tem o nível dele).
  if (bossFight) monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * BOSS_HP_MULT) }));
  // Covil (23/10): mais duro, com risco real (antes ninguém morria nem com equipamento comum +0).
  if (hunt.lair) monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * LAIR_HP_MULT), attack: m.attack * LAIR_ATK_MULT }));
  // Pesadelo em instância e covil: o dobro de vida e 50% mais de dano.
  if (isBossNightmare(hunt, difficulty.id)) monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * BOSS_NIGHTMARE.hp), attack: m.attack * BOSS_NIGHTMARE.attack }));
  // Abaixo do nível numa caçada alta: o monstro toma só UNDERLEVEL_DAMAGE do dano (vida maior na mesma
  // proporção, assim vale para golpe, magia, runa e área de uma vez) e a XP cai para UNDERLEVEL_XP.
  const high = isHighHunt(hunt);
  if (high) monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * HIGH_HUNT_HP), defense: m.defense * HIGH_HUNT_DEFENSE }));
  if (!hunt.lair && !hunt.boss && !hunt.raid) {
    const nmXp = (HUNT_DIFF_XP[difficulty.id] ?? difficulty.xp) / difficulty.xp;
    monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * HUNT_STAT.hp), attack: m.attack * HUNT_STAT.attack, xp: m.xp * nmXp }));
    // 26/10: do 350 para cima os monstros aguentam muito mais (o bando de 7 morria num golpe e o equipamento não fazia diferença).
    if (hunt.level >= ENDGAME_MONSTER.from) monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * ENDGAME_MONSTER.hp), defense: m.defense * ENDGAME_MONSTER.defense }));
  }
  // Abaixo da nota de equipamento (380+): monstros batem mais e aguentam mais.
  const endAtk = endgameAttackMult(hunt, player.gearPower, difficulty.level);
  const endHp = endgameHpMult(hunt, player.gearPower, difficulty.level);
  if (endAtk > 1 || endHp > 1) monsters.forEach((m, i) => (monsters[i] = { ...m, attack: m.attack * endAtk, hp: Math.round(m.hp * endHp) }));
  // 400+: nas caçadas comuns conta combate + Maestria (huntLevel); covil e chefe seguem o nível de combate.
  const hl = player.huntLevel ?? player.level;
  const underLevel = underLevelPenalty(hunt, hl);
  if (underLevel) monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp / UNDERLEVEL_DAMAGE) }));
  // Parte do golpe do monstro é do elemento dele (o primeiro que ele resiste). Só faz diferença para quem
  // tem resistência àquele elemento; sem ela o golpe fica igual (e a luta de quem não usa não muda nada).
  if (player.resistPct) {
    monsters.forEach((m, i) => {
      const el = monsterAttackElement(m);
      if (el && player.resistPct![el]) monsters[i] = { ...m, element: el, elementShare: MONSTER_ELEMENT_SHARE };
    });
  }
  // Dia das Crianças: às vezes um Diabrete Doceiro entra na luta (força pela média do bando; solta doces).
  // Sorteio à parte, para não mudar a luta de quem não está no evento.
  if (at !== undefined && isKidsDay(at) && !bossFight && !hunt.raid && rngFor(seed, seq + 99_991)() < KIDS_EVENT_MOB_CHANCE) {
    const imp = monsterById(KIDS_EVENT_MOB);
    if (imp) {
      const avg = (k: 'hp' | 'attack' | 'defense' | 'xp') => monsters.reduce((a, m) => a + m[k], 0) / monsters.length;
      monsters.push({ ...imp, hp: Math.round(avg('hp') * 0.7), attack: Math.round(avg('attack') * 0.5), defense: Math.round(avg('defense') * 0.6), xp: Math.round(avg('xp') * 2) });
    }
  }
  // Halloween: às vezes uma Abóbora Assombrada entra na luta (força pela média do bando; solta doces).
  if (at !== undefined && isHalloween(at) && !bossFight && !hunt.raid && rngFor(seed, seq + 99_992)() < HALLOWEEN_EVENT_MOB_CHANCE) {
    const pumpkin = monsterById(HALLOWEEN_EVENT_MOB);
    if (pumpkin) {
      const avg = (k: 'hp' | 'attack' | 'defense' | 'xp') => monsters.reduce((a, m) => a + m[k], 0) / monsters.length;
      monsters.push({ ...pumpkin, hp: Math.round(avg('hp') * 0.7), attack: Math.round(avg('attack') * 0.5), defense: Math.round(avg('defense') * 0.6), xp: Math.round(avg('xp') * 2) });
    }
  }
  // Diferença de nível: acima do seu nível os monstros batem mais forte; muito
  // abaixo, rendem menos XP (como no Tibia e no RuneScape).
  const gap = hl ? levelGap(hunt.level + difficulty.level, hl) : { attack: 0, xp: 1 };
  if (gap.attack > 0) monsters.forEach((m, i) => (monsters[i] = { ...m, attack: m.attack * (1 + gap.attack) }));
  // Covil: muito abaixo do nível, o chefe derruba no primeiro golpe (IK); acima, bate mais.
  if (lairIK(hunt, player.level)) monsters.forEach((m, i) => (monsters[i] = { ...m, attack: 1e9 }));
  else if (hunt.lair) {
    const over = lairOverMult(hunt, player.level);
    if (over > 1) monsters.forEach((m, i) => (monsters[i] = { ...m, attack: m.attack * over }));
  }
  // A corrida até o 250 (×3 nas caçadas do 215 ao 249) é só para quem ainda não chegou no 250:
  // um nível 290 na Cripta dos Mestres (245) fazia mais XP que nas caçadas do nível dele.
  // Do 240 em diante a XP de caçada cai aos poucos pelo nível do jogador (playerLevelXpMult): o nível demora e o fim de jogo vai às quests e outras partes.
  const xpMult = ((gap.xp * highLevelXpMult(hunt.level)) / ((player.level ?? 0) >= 250 ? rush250(hunt.level) : 1)) * playerLevelXpMult(player.level ?? 0) * (hl ? overLevelXpMult(hunt.level, hunt.level + difficulty.level, hl) : 1);
  // Foco só nas caçadas comuns (instância e covil não têm foco).
  const focus = hunt.focus && !bossFight ? (HUNT_FOCUS[hunt.focus] ?? null) : null;
  if (focus && focus !== HUNT_FOCUS.balanced) {
    monsters.forEach((m, i) => (monsters[i] = {
      ...m,
      xp: m.xp * focus.xp,
      loot: m.loot.map((l) => (l.item === 'gold' ? focusGold(l, focus.gold) : { ...l, chance: Math.min(1, l.chance * focus.loot) })),
    }));
  }
  // Bônus de set pela qualidade: mais chance de cada drop (caçada comum, não chefe).
  if (player.lootPct && !bossFight) monsters.forEach((m, i) => (monsters[i] = { ...m, loot: m.loot.map((l) => ({ ...l, chance: Math.min(1, l.chance * (1 + player.lootPct!)) })) }));
  const boostedId = boostedCreature ?? getBoostedCreature();
  applyBoosted(applyPrey(applyCharms(monsters, charms), prey), boostedId).forEach((m, i) => (monsters[i] = m));
  if (buffs.slayerTarget && buffs.slayerHpMult && buffs.slayerHpMult < 1)
    monsters.forEach((m, i) => { if (m.id === buffs.slayerTarget) monsters[i] = { ...m, hp: Math.max(1, Math.round(m.hp * buffs.slayerHpMult!)) }; });
  // Bosstiary: o chefe solta mais (os itens dos deuses recebem só metade) e dá mais XP. O ouro não muda.
  if (bossBonus && bossFight) {
    monsters.forEach((m, i) => {
      if (!isBosstiaryMonster(m.id)) return;
      monsters[i] = {
        ...m,
        xp: m.xp * bossXpMult(bossBonus),
        loot: m.loot.map((l) => (l.item === 'gold' ? l : { ...l, chance: boostedChance(l.chance, bossBonus, !!itemById(l.item)?.legendary) })),
      };
    });
  }
  const monster = monsters[0];

  let playerHp = player.hp;
  // Covil em grupo: o chefe divide os ataques entre o grupo e os aliados batem nele também.
  // Trava: valor inválido (NaN, golpe zerado) num aliado não pode prender o laço da luta.
  const raid = hunt.raid ? raidById(hunt.id) : undefined;
  const okAllies = (lairGroup?.allies ?? []).filter((a) => a.hitMs >= 200 && Number.isFinite(a.hitMs) && a.hit > 0 && Number.isFinite(a.hit));
  const group = ((hunt.lair && lairGroup && Number.isFinite(lairGroup.killAt)) || (hunt.raid && lairGroup)) && okAllies.length ? { killAt: lairGroup.killAt, allies: okAllies } : undefined;
  const isSoloRaid = hunt.raid && !group;
  const raidPhase = raid?.phases[Math.min(seq, raid.phases.length - 1)];

  // Raide solo: ajuste de vida para jogador sozinho (soloHpMult)
  if (isSoloRaid) {
    const soloHp = raidPhase?.soloHpMult ?? raid?.soloHpMult ?? 0.617;
    monsters.forEach((m, i) => (monsters[i] = { ...m, hp: Math.round(m.hp * soloHp) }));
  }
  const hps = monsters.map((m) => m.hp);
  const bossSlow = group ? (raid?.bossSplitsAttacks ? 1 + group.allies.length : hunt.raid ? 1.6 : 1 + group.allies.length) : 1;
  const nextMonsters = monsters.map((m) => m.attackSpeedMs * bossSlow);
  const nextAlly = (group?.allies ?? []).map((a) => a.hitMs);
  // Revelações e Convicções da Roda da Maestria
  const wm = player.wheelMastery;
  const pVoc = player.vocation ?? 'warrior';
  const furyPts = wm ? wheelSideCompletedPoints(wm, 'fury') : 0;
  const precPts = wm ? wheelSideCompletedPoints(wm, 'precision') : 0;
  const bastPts = wm ? wheelSideCompletedPoints(wm, 'bastion') : 0;
  const arcaPts = wm ? wheelSideCompletedPoints(wm, 'arcane') : 0;

  const furyRev = wheelRevelationLevel(furyPts);
  const precRev = wheelRevelationLevel(precPts);
  const bastRev = wheelRevelationLevel(bastPts);
  const arcaRev = wheelRevelationLevel(arcaPts);

  const wEff = wm ? masteryEffects(wm) : null;
  const packBonusDmg = wEff?.packDamagePct ?? 0;
  const bossBonusDmg = wEff?.bossDamagePct ?? 0;
  const isBossTarget = bossFight || !!hunt.lair || !!hunt.boss;

  // Variáveis de estado das Revelações durante o combate
  let warriorLastBastionUsed = false;
  let hunterAttackCount = 0;
  let arcanistHitCount = 0;
  let sacredMantleShield = 0;
  let shatterUntil = 0;
  let shatterDefenseReduction = 0;



  const allyRand = group ? rngFor(seed, seq + 31_337) : rand;
  // Graça Divina (Devoto Arcano) e Convicção Luz da Restauração aumentam cura de magia
  const spellHealBonus = (pVoc === 'devout' && arcaRev > 0 ? (arcaRev === 3 ? 0.25 : arcaRev === 2 ? 0.18 : 0.10) : 0) + (wEff?.spellHealPct ?? 0);
  const heal = (n: number, isSpell?: boolean) => {
    let amt = Math.round(n * (1 + (buffs.heal ?? 0) + (isSpell ? spellHealBonus : 0)));
    // Manto Sagrado (Devoto Bastião): a cura que passa da vida cheia vira escudo (até 10% / 15% / 20% da vida)
    if (pVoc === 'devout' && bastRev > 0 && playerHp + amt > player.hp) {
      const maxShield = Math.round(player.hp * (bastRev === 3 ? 0.20 : bastRev === 2 ? 0.15 : 0.10));
      const overflow = (playerHp + amt) - player.hp;
      sacredMantleShield = Math.min(maxShield, sacredMantleShield + overflow);
    }
    return amt;
  };
  let nextPlayer = player.attackSpeedMs;
  let t = 0;
  let outcome: Cycle['outcome'] = 'draw';
  const hits: Hit[] = [];
  /** Covil em grupo: antes da hora em que cai para todos, o chefe não cai pelos golpes de um só. */
  const hold = () => {
    if (group && t < group.killAt && hps[0] <= 0) hps[0] = 1;
  };

  // Magias: mana enche no começo de cada luta (o descanso recupera) e regenera durante.
  const spells = player.spells ?? [];
  const maxMana = player.mana ?? 0;
  let mana = player.initialMana !== undefined ? Math.min(maxMana, Math.max(0, player.initialMana)) : maxMana;
  let manaAt = 0;
  const manaRegen = player.manaRegen ?? 2;
  const readyAt: Record<string, number> = {};
  // Buff e escudo que ainda valem da luta anterior continuam (não lança de novo antes de acabar).
  // Buffs ativos, um por magia (cada um com o seu fim); o ataque e o crítico somam.
  const spellBuffs: { id: string; until: number; attack: number; crit: number }[] = [
    ...(player.initialAura?.buffs ?? []).filter((b) => b.left > 0).map((b) => ({ id: b.id, until: b.left, attack: b.attack, crit: b.crit })),
    ...(player.initialAura?.buff && player.initialAura.buff.left > 0 ? [{ id: '_', until: player.initialAura.buff.left, attack: player.initialAura.buff.attack, crit: player.initialAura.buff.crit }] : []),
  ];
  const buffOf = (id: string, t: number) => spellBuffs.find((b) => b.id === id && b.until > t);
  const setBuff = (id: string, until: number, attack: number, crit: number) => {
    const b = spellBuffs.find((x) => x.id === id);
    if (b) Object.assign(b, { until, attack, crit });
    else spellBuffs.push({ id, until, attack, crit });
  };
  let shieldUntil = Math.max(0, player.initialAura?.shield?.left ?? 0);
  let shieldReduce = shieldUntil > 0 ? player.initialAura!.shield!.reduce : 0;
  // Barreira Arcana (Arcanista Bastião): escudo de 5%/8%/12% no começo da luta
  if (pVoc === 'arcanist' && bastRev > 0) {
    const shieldPct = bastRev === 3 ? 0.12 : bastRev === 2 ? 0.08 : 0.05;
    shieldReduce = Math.max(shieldReduce, 0.5);
    shieldUntil = Math.max(shieldUntil, 12000);
  }
  const can = (s: Spell, at: number) => (readyAt[s.id] ?? 0) <= at && mana >= s.cost;
  const use = (s: Spell, at: number) => {
    // Revelação Fluxo Infinito (Arcanista Arcano): 8%/12%/16% de chance de magia não gastar mana
    const freeCastChance = pVoc === 'arcanist' && arcaRev > 0 ? (arcaRev === 3 ? 0.16 : arcaRev === 2 ? 0.12 : 0.08) : 0;
    if (!(freeCastChance > 0 && rand() < freeCastChance)) {
      mana -= s.cost;
    }
    const cdMult = wEff?.spellCooldownReductionPct ? (1 - wEff.spellCooldownReductionPct) : 1;
    readyAt[s.id] = at + Math.round(s.cooldownMs * cdMult);
  };
  const runes = (player.runes ?? []).map((r) => ({ ...r, left: r.count, readyAt: 0 }));
  const rules = player.rules;

  // Poção de vida durante a luta: abaixo do limite da barra (sem limite, quando a cura inteira cabe), a cada 2 s.
  const playerHealthPotion = player.healthPotion ? { ...player.healthPotion } : undefined;
  let healthPotionAt = -Infinity;
  const tryDrinkHealth = () => {
    if (!playerHealthPotion || playerHealthPotion.count <= 0 || t - healthPotionAt < HEALTH_POTION_COOLDOWN_MS || playerHp <= 0) return;
    const below = rules?.foodBelow;
    const missing = player.hp - playerHp;
    if (below ? playerHp >= player.hp * below : missing < playerHealthPotion.heal) return;
    const amount = Math.min(missing, heal(playerHealthPotion.heal));
    if (amount <= 0) return;
    playerHealthPotion.count--;
    healthPotionAt = t;
    playerHp += amount;
    hits.push({ t, by: 'p', dmg: 0, crit: false, healthPotion: playerHealthPotion.id, heal: amount });
  };
  const playerManaPotion = player.manaPotion ? { ...player.manaPotion } : undefined;
  let manaPotionAt = -Infinity;
  const tryDrinkMana = () => {
    if (!playerManaPotion || playerManaPotion.count <= 0 || t - manaPotionAt < MANA_POTION_COOLDOWN_MS) return;
    if (mana < maxMana) {
      manaPotionAt = t;
      playerManaPotion.count--;
      const heal = Math.min(maxMana - mana, playerManaPotion.mana);
      mana += heal;
      hits.push({ t, by: 'p', dmg: 0, crit: false, manaPotion: playerManaPotion.id, manaHeal: heal });
    }
  };
  // Barra de ação: abaixo do limite escolhido, um gole a cada 2 s sem parar (igual à poção de vida):
  // vale no turno do personagem, depois de gastar mana nas magias e a cada golpe que ele leva.
  const checkMana = () => {
    if (rules?.manaBelow !== undefined && mana < maxMana * rules.manaBelow) tryDrinkMana();
  };

  const maxFightMs = raidPhase ? raidPhase.maxFightMs : bossFight ? BOSS_MAX_FIGHT_MS : MAX_FIGHT_MS;
  let raidShield = raidPhase?.shield ? monsters[0].hp * raidPhase.shield.share : 0;
  const bossShieldReduce = raidPhase?.shield?.reduce ?? 0;
  let nextAddsSpawn = raidPhase?.adds ? raidPhase.adds.everyMs : Infinity;
  let addsWavesSpawned = 0;
  let nextDot = raidPhase?.dot ? raidPhase.dot.everyMs : Infinity;
  let nextBurst = raidPhase?.burst ? raidPhase.burst.everyMs : Infinity;
  let nextRamp = raidPhase?.enrageRamp ? raidPhase.enrageRamp.everyMs : Infinity;
  let nextPulse = raidPhase?.pulse ? raidPhase.pulse.everyMs : Infinity;
  let enrageMult = 1;
  while (t < maxFightMs) {
    let nextMonsterIdx = -1;
    let minMonsterTime = Infinity;
    for (let i = 0; i < monsters.length; i++) {
      if (hps[i] > 0 && nextMonsters[i] < minMonsterTime) {
        minMonsterTime = nextMonsters[i];
        nextMonsterIdx = i;
      }
    }

    if (nextMonsterIdx === -1) {
      outcome = 'win';
      break;
    }

    // Mecânicas de Raide e Covil
    let allyIdx = -1;
    for (let i = 0; i < nextAlly.length; i++) if (allyIdx < 0 || nextAlly[i] < nextAlly[allyIdx]) allyIdx = i;
    const nextAllyTime = allyIdx >= 0 ? nextAlly[allyIdx] : Infinity;

    const nextRaidEvent = raidPhase
      ? Math.min(nextAddsSpawn, nextDot, nextBurst, nextRamp, nextPulse)
      : Infinity;

    const nextEvent = Math.min(nextPlayer, minMonsterTime, nextAllyTime, nextRaidEvent);

    if (hunt.raid && nextEvent >= maxFightMs) {
      t = maxFightMs;
      if (hunt.raid && hps[0] > 0) {
        outcome = 'draw';
        hits.push({ t, by: 'm', target: 0, dmg: playerHp, crit: true });
        playerHp = 0;
      }
      break;
    }

    if (!hunt.raid && group && group.killAt <= nextEvent && group.killAt < maxFightMs) {
      t = group.killAt;
      if (hps[0] > 0) hits.push({ t, by: 'a', ally: group.allies[0].id, target: 0, dmg: hps[0], crit: false });
      hps[0] = 0;
      outcome = 'win';
      break;
    }

    if (raidPhase && nextRaidEvent === nextEvent) {
      t = nextRaidEvent;
      if (raidPhase.adds && t >= nextAddsSpawn) {
        addsWavesSpawned++;
        nextAddsSpawn = addsWavesSpawned >= raidPhase.adds.waves ? Infinity : nextAddsSpawn + raidPhase.adds.everyMs;
        const addMob = monsterById(raidPhase.adds.monster);
        if (addMob) {
          for (let g = 0; g < raidPhase.adds.count; g++) {
            monsters.push(scaled(addMob, difficulty));
            hps.push(addMob.hp);
            nextMonsters.push(t + addMob.attackSpeedMs);
          }
        }
        hits.push({ t, by: 'm', target: 0, dmg: 0, crit: false });
      }
      if (raidPhase.dot && t >= nextDot) {
        nextDot += raidPhase.dot.everyMs;
        const res = player.resistPct?.[raidPhase.dot.element] ?? 0;
        const reduction = player.reduction ?? 0;
        const dotDmg = Math.max(1, Math.round(player.hp * raidPhase.dot.share * (1 - res) * (1 - reduction)));
        playerHp -= dotDmg;
        hits.push({ t, by: 'm', target: 0, dmg: dotDmg, crit: false, elem: { element: raidPhase.dot.element, dmg: dotDmg } });
        tryDrinkHealth();
        if (playerHp <= 0) {
          outcome = 'death';
          break;
        }
      }
      if (raidPhase.burst && t >= nextBurst) {
        nextBurst += raidPhase.burst.everyMs;
        const res = player.resistPct?.[raidPhase.burst.element] ?? 0;
        const reduction = player.reduction ?? 0;
        const burstRoll = 0.90 + rand() * 0.20;
        const soloAtk = isSoloRaid ? (raidPhase?.soloAttackMult ?? raid?.soloAttackMult ?? 1) : 1;
        const burstDmg = Math.max(1, Math.round(player.hp * raidPhase.burst.share * (1 - res) * (1 - reduction) * burstRoll * soloAtk));
        playerHp -= burstDmg;
        hits.push({ t, by: 'm', target: 0, dmg: burstDmg, crit: true, elem: { element: raidPhase.burst.element, dmg: burstDmg } });
        tryDrinkHealth();
        if (playerHp <= 0) {
          outcome = 'death';
          break;
        }
      }
      if (raidPhase.enrageRamp && t >= nextRamp) {
        nextRamp += raidPhase.enrageRamp.everyMs;
        enrageMult += raidPhase.enrageRamp.attackPct;
      }
      if (raidPhase.pulse && t >= nextPulse) {
        nextPulse += raidPhase.pulse.everyMs;
        const res = player.resistPct?.[raidPhase.pulse.element] ?? 0;
        const soloAtk = isSoloRaid ? (raidPhase?.soloAttackMult ?? raid?.soloAttackMult ?? 1) : 1;
        const pulseDmg = Math.max(1, Math.round(player.hp * raidPhase.pulse.share * (1 - res) * soloAtk));
        playerHp -= pulseDmg;
        hits.push({ t, by: 'm', target: 0, dmg: pulseDmg, crit: false, elem: { element: raidPhase.pulse.element, dmg: pulseDmg } });
        tryDrinkHealth();
        if (playerHp <= 0) {
          outcome = 'death';
          break;
        }
      }
      continue;
    }

    if (group && allyIdx >= 0 && nextAllyTime === nextEvent) {
      t = nextAlly[allyIdx];
      if (t >= maxFightMs) break;
      const a = group.allies[allyIdx];
      if (hunt.raid && a.isHealer && playerHp > 0 && playerHp < player.hp * 0.60) {
        const healAmt = Math.min(player.hp - playerHp, Math.round(player.hp * RAID_ALLY_HEAL));
        if (healAmt > 0) {
          playerHp += healAmt;
          hits.push({ t, by: 'a', ally: a.id, dmg: 0, crit: false, heal: healAmt });
        }
      }
      const crit = allyRand() < CRIT_CHANCE;
      let dmg = Math.max(1, Math.round(a.hit * (0.8 + allyRand() * 0.4) * (crit ? 1.5 : 1)));
      if (raidShield > 0) {
        const red = Math.max(1, Math.round(dmg * (1 - bossShieldReduce)));
        raidShield -= red;
        dmg = red;
      }
      const hasAddsAlive = !!raidPhase?.adds && hps.some((hp, idx) => idx > 0 && hp > 0);
      const bossAddDmgMult = raidPhase?.adds?.bossDmgMult ?? 0.40;
      if (raidPhase?.adds && a.hasAoe) {
        for (let mi = 0; mi < monsters.length; mi++) {
          if (hps[mi] > 0) {
            let splitDmg = mi === 0 ? dmg : Math.max(1, Math.round(dmg * (raidPhase?.adds ? 1.0 : AREA_SPLASH)));
            if (mi === 0 && hasAddsAlive) splitDmg = Math.max(1, Math.round(splitDmg * bossAddDmgMult));
            hps[mi] -= splitDmg;
            hits.push({ t, by: 'a', ally: a.id, target: mi, dmg: splitDmg, crit });
          }
        }
      } else {
        let targetIdx = 0;
        if (targetIdx === 0 && hasAddsAlive) dmg = Math.max(1, Math.round(dmg * bossAddDmgMult));
        hits.push({ t, by: 'a', ally: a.id, target: targetIdx, dmg, crit });
        hps[targetIdx] -= dmg;
      }
      hold();
      nextAlly[allyIdx] += a.hitMs;
      if (hunt.raid && hps[0] <= 0) {
        outcome = 'win';
        break;
      }
      continue;
    }

    // Quem ataca primeiro no tempo; empate favorece o jogador.
    if (nextPlayer <= minMonsterTime) {
      t = nextPlayer;
      mana = Math.min(maxMana, mana + ((t - manaAt) / 1000) * manaRegen);
      manaAt = t;
      checkMana();
      tryDrinkHealth();
      // Antes do ataque: cura (se a vida está baixa), depois buff e escudo (se não estão ativos).
      for (const s of spells) {
        const e = s.effect;
        if (e.kind === 'heal' && playerHp < player.hp * (rules?.heal?.[s.id] ?? e.below)) {
          if (!can(s, t) && (readyAt[s.id] ?? 0) <= t && mana < s.cost) tryDrinkMana();
          if (can(s, t)) {
            use(s, t);
            const amount = Math.min(player.hp - playerHp, heal(player.hp * e.pct, true));
            playerHp += amount;
            hits.push({ t, by: 'p', dmg: 0, crit: false, spell: s.id, heal: amount });
          }
        // A ultimate de buff/escudo entra na hora por cima do comum mais fraco.
        } else if (e.kind === 'buff' && !buffOf(s.id, t)) {
          if (!can(s, t) && (readyAt[s.id] ?? 0) <= t && mana < s.cost) tryDrinkMana();
          if (can(s, t)) {
            use(s, t);
            setBuff(s.id, t + e.durationMs, e.attack ?? 0, e.crit ?? 0);
            hits.push({ t, by: 'p', dmg: 0, crit: false, spell: s.id });
          }
        } else if (e.kind === 'shield' && (shieldUntil <= t || (!!s.promotion && shieldReduce < e.reduce))) {
          if (!can(s, t) && (readyAt[s.id] ?? 0) <= t && mana < s.cost) tryDrinkMana();
          if (can(s, t)) {
            use(s, t);
            shieldUntil = t + e.durationMs;
            shieldReduce = e.reduce;
            if (e.attack) {
              setBuff(s.id, t + e.durationMs, e.attack, 0);
            }
            const amount = e.heal ? Math.min(player.hp - playerHp, heal(player.hp * e.heal, true)) : 0;
            playerHp += amount;
            hits.push(amount > 0 ? { t, by: 'p', dmg: 0, crit: false, spell: s.id, heal: amount } : { t, by: 'p', dmg: 0, crit: false, spell: s.id });
          }
        }
      }
      // Runa de cura: quando a vida cai abaixo do limite.
      for (const r of runes) {
        const e = r.effect;
        if (e.kind === 'heal' && r.left > 0 && r.readyAt <= t && playerHp < player.hp * (rules?.runeHealBelow ?? e.below)) {
          r.left--;
          r.readyAt = t + RUNE_HEAL_MS;
          const amount = Math.min(player.hp - playerHp, heal(player.hp * e.pct, true));
          playerHp += amount;
          hits.push({ t, by: 'p', dmg: 0, crit: false, rune: r.id, heal: amount });
        }
      }
      const active = spellBuffs.filter((b) => b.until > t);
      let buffAttack = active.reduce((n, b) => n + b.attack, 0);
      let buffCrit = active.reduce((n, b) => n + b.crit, 0);

      // Fúria Sangrenta (Guerreiro Fúria): abaixo de 30% de vida, +10% / +18% / +25% de ataque
      if (pVoc === 'warrior' && furyRev > 0 && playerHp < player.hp * 0.3) {
        buffAttack += furyRev === 3 ? 0.25 : furyRev === 2 ? 0.18 : 0.10;
      }

      // Brado do Campeão (Guerreiro Arcano): nos primeiros 10s da luta, +8% / +12% / +16% de ataque
      if (pVoc === 'warrior' && arcaRev > 0 && t <= 10000) {
        buffAttack += arcaRev === 3 ? 0.16 : arcaRev === 2 ? 0.12 : 0.08;
      }

      // Olho Mortal (Caçador Precisão): todo 6º / 5º / 4º ataque é crítico garantido
      let guaranteedCrit = false;
      if (pVoc === 'hunter' && precRev > 0) {
        const interval = precRev === 3 ? 4 : precRev === 2 ? 5 : 6;
        if ((hunterAttackCount + 1) % interval === 0) {
          guaranteedCrit = true;
        }
      }

      const attacker: Fighter = {
        ...player,
        attack: player.attack * (1 + buffAttack),
        critChance: guaranteedCrit ? 1.0 : (player.critChance ?? CRIT_CHANCE) + buffCrit
      };

      let target = 0;
      if (!hunt.raid) target = hps.findIndex((hp) => hp > 0);
      const targetMonster = monsters[target];
      // O golpe forte pronto substitui o ataque normal: o que mais rende agora
      // (magia de área vale pelo número de monstros vivos).
      const alive = hps.filter((hp) => hp > 0).length;
      const worth = (s: Spell) =>
        s.effect.kind === 'strike' ? s.effect.mult * (s.effect.area ? alive : Math.min(alive, 1 + (s.effect.pierce ?? 0))) * (s.element ? elementMult(targetMonster, s.element) : 1) : 0;
      // Com a ordem da barra, sai a primeira pronta que cumpre a condição (2+/3+ monstros).
      const allowed = (s: Spell) => {
        const w = rules?.strike?.[s.id];
        return w === 'aoe2' ? alive >= 2 : w === 'aoe3' ? alive >= 3 : true;
      };
      const strikes = spells.filter((s) => s.effect.kind === 'strike' && (!rules?.priority || allowed(s)));
      if (!rules?.priority) strikes.sort((a, b) => worth(b) - worth(a));
      const bestReadyStrike = strikes.find((s) => (readyAt[s.id] ?? 0) <= t);
      if (bestReadyStrike && mana < bestReadyStrike.cost) tryDrinkMana();
      // Com a ordem da barra: se a primeira pronta só espera mana, guarda a mana para ela
      // (antes a de baixo gastava e a de cima, mais cara, quase nunca saía).
      const saving = !!rules?.priority && !!bestReadyStrike && !can(bestReadyStrike, t);
      const strike = saving ? undefined : strikes.find((s) => can(s, t));
      const spellEl = strike?.element ? { element: strike.element, share: 1 } : undefined;
      const mark = targetMonster.charm;
      const charmed = mark?.crit ? { ...attacker, critChance: (attacker.critChance ?? CRIT_CHANCE) + mark.crit } : attacker;
      // Aplica redução de defesa do Ruptura se ainda estiver ativa
      const currentTargetMonster = (shatterUntil > t && shatterDefenseReduction > 0)
        ? { ...targetMonster, defense: Math.max(0, Math.round(targetMonster.defense * (1 - shatterDefenseReduction))) }
        : targetMonster;
      const h = hit(rand, strike?.effect.kind === 'strike' && strike.effect.sureCrit ? { ...charmed, critChance: 1 } : charmed, currentTargetMonster, spellEl);

      // Convicção: Caçador de Titãs (+6% dano contra chefes)
      if (isBossTarget && bossBonusDmg > 0) {
        h.dmg = Math.round(h.dmg * (1 + bossBonusDmg));
      }
      // Convicção: Fúria em Bando (+5% de dano com 3+ monstros)
      if (alive >= 3 && packBonusDmg > 0) {
        h.dmg = Math.round(h.dmg * (1 + packBonusDmg));
      }
      // Golpe Executor (Guerreiro Precisão): +15% / +25% / +35% de dano em monstros abaixo de 30% de vida
      if (pVoc === 'warrior' && precRev > 0 && hps[target] < targetMonster.hp * 0.3) {
        const execBonus = precRev === 3 ? 0.35 : precRev === 2 ? 0.25 : 0.15;
        h.dmg = Math.round(h.dmg * (1 + execBonus));
      }
      // Flecha Encantada (Caçador Arcano): +5% / +8% / +12% dano elemental do imbuement
      if (pVoc === 'hunter' && arcaRev > 0 && h.elem) {
        const elBonus = arcaRev === 3 ? 0.12 : arcaRev === 2 ? 0.08 : 0.05;
        h.dmg = Math.round(h.dmg * (1 + elBonus));
      }
      let spellDmg = 0;
      if (strike && strike.effect.kind === 'strike') {
        use(strike, t);
        scaled1(h, strikeMult(strike.effect, hps[target], targetMonster.hp) * (1 + (buffs.spell ?? 0) + (wEff?.spellDamagePct ?? 0)));
        spellDmg += h.dmg;
        if (strike.effect.guard) {
          shieldReduce = Math.max(strike.effect.guard.reduce, shieldUntil > t ? shieldReduce : 0);
          shieldUntil = Math.max(shieldUntil, t + strike.effect.guard.durationMs);
        }
      } else if (buffs.basic) scaled1(h, 1 + buffs.basic);
      if (target === 0 && raidShield > 0) {
        const red = Math.max(1, Math.round(h.dmg * (1 - bossShieldReduce)));
        raidShield -= red;
        h.dmg = red;
      }
      const hasAddsAlive = !!raidPhase?.adds && hps.some((hp, idx) => idx > 0 && hp > 0);
      const bossAddDmgMult = raidPhase?.adds?.bossDmgMult ?? 0.40;
      if (hasAddsAlive) {
        // Falange: rei e guardas sofrem redução de dano de ataques diretos
        h.dmg = Math.max(1, Math.round(h.dmg * bossAddDmgMult));
      }
      hits.push(strike ? { t, by: 'p', target, ...h, spell: strike.id } : { t, by: 'p', target, ...h });
      hps[target] -= h.dmg;
      if (hunt.raid && hps[0] <= 0) { outcome = 'win'; break; }
      // Charm elemental: chance de um golpe extra do elemento (só sorteia quem tem o charm).
      if (mark?.proc && hps[target] > 0 && rand() < mark.proc.chance) {
        const extra = Math.max(1, Math.round(targetMonster.hp * mark.proc.pct * elementMult(targetMonster, mark.proc.element)));
        hits.push({ t, by: 'p', target, dmg: extra, crit: false, elem: { element: mark.proc.element, dmg: extra }, charm: true });
        hps[target] -= extra;
      }
      // Área: o mesmo golpe nos outros monstros vivos (cada um com a sua defesa).
      // Atravessar: só os próximos N, com o golpe cheio.
      if (strike && strike.effect.kind === 'strike' && (strike.effect.area || strike.effect.pierce)) {
        const e = strike.effect;
        let extra = e.area ? Infinity : e.pierce!;
        for (let i = 0; i < monsters.length && extra > 0; i++) {
          if (i === target || hps[i] <= 0) continue;
          extra--;
          const o = scaled1(hit(rand, attacker, monsters[i], spellEl), strikeMult(e, hps[i], monsters[i].hp) * (raidPhase?.adds ? 1.0 : (e.area && !e.fullArea ? AREA_SPLASH : 1)) * (1 + (buffs.spell ?? 0) + (wEff?.spellDamagePct ?? 0)));
          if (i === 0 && raidShield > 0) {
            const red = Math.max(1, Math.round(o.dmg * (1 - bossShieldReduce)));
            raidShield -= red;
            o.dmg = red;
          }
          if (i === 0 && hasAddsAlive) {
            o.dmg = Math.max(1, Math.round(o.dmg * bossAddDmgMult));
          }
          hits.push({ t, by: 'p', target: i, ...o, spell: strike.id });
          hps[i] -= o.dmg;
          spellDmg += o.dmg;
        }
      }
      // Flecha de área: o tiro normal respinga nos outros monstros vivos (fração do dano).
      if (!strike && player.arrowSplash) {
        for (let i = 0; i < monsters.length; i++) {
          if (i === target || hps[i] <= 0) continue;
          const o = scaled1(hit(rand, attacker, monsters[i]), player.arrowSplash * (1 + (buffs.basic ?? 0)));
          hits.push({ t, by: 'p', target: i, ...o, splash: true });
          hps[i] -= o.dmg;
        }
      }

      // Revelação: Flecha Ricocheteante (Caçador Fúria): 8% / 12% / 16% de chance de acertar +1 alvo
      if (pVoc === 'hunter' && furyRev > 0) {
        const bounceChance = furyRev === 3 ? 0.16 : furyRev === 2 ? 0.12 : 0.08;
        if (rand() < bounceChance) {
          const other = monsters.findIndex((m, idx) => idx !== target && hps[idx] > 0);
          if (other >= 0) {
            const bounceHit = scaled1(hit(rand, attacker, monsters[other]), 1.0);
            hits.push({ t, by: 'p', target: other, ...bounceHit, splash: true });
            hps[other] -= bounceHit.dmg;
          }
        }
      }

      // Revelação: Explosão Arcana (Arcanista Fúria): a cada 10 golpes, explosão em área de 100% / 150% / 200%
      arcanistHitCount++;
      if (pVoc === 'arcanist' && furyRev > 0 && arcanistHitCount % 10 === 0) {
        const mult = furyRev === 3 ? 2.0 : furyRev === 2 ? 1.5 : 1.0;
        for (let i = 0; i < monsters.length; i++) {
          if (hps[i] <= 0) continue;
          const burstDmg = Math.max(1, Math.round(attacker.attack * mult - monsters[i].defense * 0.5));
          hits.push({ t, by: 'p', target: i, dmg: burstDmg, crit: false, splash: true });
          hps[i] -= burstDmg;
        }
      }

      // Revelação: Martelo Sagrado (Devoto Fúria): golpes curam 1% / 2% / 3% do dano causado
      if (pVoc === 'devout' && furyRev > 0 && h.dmg > 0) {
        const healPct = furyRev === 3 ? 0.03 : furyRev === 2 ? 0.02 : 0.01;
        const hammerHeal = Math.min(player.hp - playerHp, Math.max(1, Math.round(h.dmg * healPct)));
        if (hammerHeal > 0) {
          playerHp += hammerHeal;
          hits.push({ t, by: 'p', dmg: 0, crit: false, heal: hammerHeal });
        }
      }

      // Revelação: Ruptura (Arcanista Precisão): críticos de magia reduzem a defesa do alvo em 5% / 8% / 12% por 5s
      if (pVoc === 'arcanist' && precRev > 0 && strike && h.crit) {
        shatterDefenseReduction = precRev === 3 ? 0.12 : precRev === 2 ? 0.08 : 0.05;
        shatterUntil = t + 5000;
      }

      // Revelação: Veredito Divino (Devoto Precisão): críticos curam em 1% / 2% / 3% da vida máxima
      if (pVoc === 'devout' && precRev > 0 && h.crit) {
        const verdictPct = precRev === 3 ? 0.03 : precRev === 2 ? 0.02 : 0.01;
        const verdictHeal = Math.min(player.hp - playerHp, Math.max(1, Math.round(player.hp * verdictPct)));
        if (verdictHeal > 0) {
          playerHp += verdictHeal;
          hits.push({ t, by: 'p', dmg: 0, crit: false, heal: verdictHeal });
        }
      }

      hunterAttackCount++;
      // Magia que cura parte do dano causado.
      if (strike && strike.effect.kind === 'strike' && strike.effect.drain && spellDmg > 0) {
        const amount = Math.min(player.hp - playerHp, heal(spellDmg * strike.effect.drain, true));
        if (amount > 0) {
          playerHp += amount;
          hits.push({ t, by: 'p', dmg: 0, crit: false, spell: strike.id, heal: amount });
        }
      }
      // Runa de ataque: golpe extra junto com o ataque (em área, um em cada monstro vivo).
      for (const r of runes) {
        const e = r.effect;
        if (e.kind !== 'strike' || r.left <= 0 || r.readyAt > t || hps.every((hp) => hp <= 0)) continue;
        r.left--;
        r.readyAt = t + RUNE_STRIKE_MS;
        const first = hps.findIndex((hp) => hp > 0);
        for (let i = 0; i < monsters.length; i++) {
          if (hps[i] <= 0 || (!e.area && i !== first)) continue;
          const o = runeHit(rand, attacker, monsters[i], (i === first ? e.mult : e.mult * AREA_SPLASH) * (1 + (buffs.spell ?? 0)), e.element);
          hits.push(i === first ? { t, by: 'p', target: i, ...o, rune: r.id } : { t, by: 'p', target: i, ...o, rune: r.id, runeExtra: true });
          hps[i] -= o.dmg;
        }
      }
      const leech = (player.lifesteal ?? 0) + (mark?.leech ?? 0);
      if (leech) {
        const stolen = Math.max(1, Math.round(h.dmg * leech));
        const actualHeal = Math.min(player.hp - playerHp, stolen);
        if (actualHeal > 0) {
          playerHp += actualHeal;
          const hitIndex = hits.length - 1;
          if (hitIndex >= 0 && hits[hitIndex].by === 'p') {
            hits[hitIndex].lifesteal = actualHeal;
          }
        }
      }
      // Roubo de mana (imbuement e charm Sede Arcana): parte do dano do golpe volta como mana.
      const manaLeech = (player.manaLeech ?? 0) + (mark?.manaLeech ?? 0);
      if (manaLeech && h.dmg > 0) mana = Math.min(maxMana, mana + Math.max(1, Math.round(h.dmg * manaLeech)));
      nextPlayer += player.attackSpeedMs;
      checkMana();
      hold();
      if (hps.every((hp) => hp <= 0)) {
        outcome = 'win';
        break;
      }
    } else {
      t = minMonsterTime;
      mana = Math.min(maxMana, mana + ((t - manaAt) / 1000) * manaRegen);
      manaAt = t;
      const mAttacker = monsters[nextMonsterIdx];
      // Revelação: Passo Ágil (Caçador Bastião): 4% / 7% / 10% de chance de esquiva
      if (pVoc === 'hunter' && bastRev > 0) {
        const dodgeChance = bastRev === 3 ? 0.10 : bastRev === 2 ? 0.07 : 0.04;
        if (rand() < dodgeChance) {
          hits.push({ t, by: 'm', target: nextMonsterIdx, dmg: 0, crit: false, dodge: true });
          nextMonsters[nextMonsterIdx] += mAttacker.attackSpeedMs * (nextMonsterIdx === 0 ? bossSlow : 1);
          continue;
        }
      }
      const h = hit(rand, mAttacker, player);
      if (enrageMult > 1 && nextMonsterIdx === 0) {
        h.dmg = Math.round(h.dmg * enrageMult);
      }
      if (raidShield > 0 && nextMonsterIdx === 0) {
        h.dmg = Math.round(h.dmg * (raidPhase?.shield?.bossDmgMult ?? 1.40));
      }
      if (hunt.raid && !group && nextMonsterIdx === 0) {
        const soloAtk = raidPhase?.soloAttackMult ?? raid?.soloAttackMult ?? 0.87;
        h.dmg = Math.round(h.dmg * soloAtk);
      }
      if (shieldUntil > t) h.dmg = Math.max(1, Math.round(h.dmg * (1 - shieldReduce)));
      if (sacredMantleShield > 0) {
        const absorbed = Math.min(sacredMantleShield, h.dmg);
        sacredMantleShield -= absorbed;
        h.dmg -= absorbed;
      }
      if (buffs.guard) h.dmg = Math.max(1, Math.round(h.dmg * (1 - buffs.guard)));
      if (player.reduction) h.dmg = Math.max(1, Math.round(h.dmg * (1 - player.reduction)));
      if (player.manaShield && h.dmg > 0) {
        const alive = hps.filter((hp) => hp > 0).length;
        const absorbed = Math.min(Math.floor(mana), Math.round(h.dmg * HUNT_MANA_SHIELD[Math.min(alive, HUNT_MANA_SHIELD.length) - 1]));
        mana -= absorbed;
        h.dmg -= absorbed;
      }
      hits.push({ t, by: 'm', target: nextMonsterIdx, ...h });
      playerHp -= h.dmg;
      if (raidPhase?.drain && h.dmg > 0 && hps[nextMonsterIdx] > 0) {
        const heal = Math.round(h.dmg * raidPhase.drain);
        hps[nextMonsterIdx] = Math.min(monsters[nextMonsterIdx].hp, hps[nextMonsterIdx] + heal);
      }

      // Revelação: Último Bastião (Guerreiro Bastião): uma vez por luta, ao cair de 20%, recupera 15% / 25% / 35% de vida
      if (pVoc === 'warrior' && bastRev > 0 && !warriorLastBastionUsed && playerHp > 0 && playerHp < player.hp * 0.2) {
        warriorLastBastionUsed = true;
        const bastionPct = bastRev === 3 ? 0.35 : bastRev === 2 ? 0.25 : 0.15;
        const bastionHeal = Math.min(player.hp - playerHp, Math.round(player.hp * bastionPct));
        playerHp += bastionHeal;
        hits.push({ t, by: 'p', dmg: 0, crit: false, heal: bastionHeal });
      }

      tryDrinkHealth();
      // A mana também é conferida no golpe do monstro (o escudo de mana a gasta aqui).
      checkMana();
      nextMonsters[nextMonsterIdx] += mAttacker.attackSpeedMs * (nextMonsterIdx === 0 ? bossSlow : 1);
      if (playerHp <= 0) {
        outcome = 'death';
        break;
      }
    }
  }
  if (hunt.raid) {
    if (hps[0] <= 0) outcome = 'win';
    else if (t >= maxFightMs) outcome = 'draw';
  }
  const fightMs = Math.min(t, maxFightMs);
  const damageTaken = player.hp - Math.max(0, playerHp);

  const loot: Record<string, number> = {};
  let totalXp = 0;
  if (outcome === 'win' && !hunt.raid) {
    for (const m of monsters) {
      totalXp += m.xp;
      for (const entry of m.loot) {
        // O sorteio acontece sempre, para a sequência não depender da quest.
        const roll = rand();
        // O Diabrete Doceiro sempre solta os doces (fora do ajuste de drops da caçada).
        if (roll >= (m.id === KIDS_EVENT_MOB || m.id === HALLOWEEN_EVENT_MOB ? 1 : entry.chance)) continue;
        if (entry.quest && questSteps[entry.quest.story] !== entry.quest.step) continue;
        const min = entry.min ?? 1;
        const max = entry.max ?? min;
        loot[entry.item] = (loot[entry.item] ?? 0) + min + Math.floor(rand() * (max - min + 1));
      }
      // Às vezes cai uma peça de equipamento do tier da caçada, com raridade sorteada.
      if (rand() < (bossFight ? BOSS_GEAR_DROP : GEAR_DROP * (focus?.gear ?? 1) * (hunt.level >= HIGH_GEAR_DROP_FROM ? HIGH_GEAR_DROP_MULT : 1))) {
        const tier = GEAR_TIERS.find((g) => hunt.level <= g.maxLevel) ?? GEAR_TIERS[GEAR_TIERS.length - 1];
        const piece = tier.items[Math.floor(rand() * tier.items.length)];
        const roll = rand();
        let rarity = roll < 0.55 ? 0 : roll < 0.8 ? 1 : roll < 0.93 ? 2 : roll < 0.985 ? 3 : 4;
        if (bossFight) rarity = Math.min(4, rarity + 1);
        const id = rarity ? `${piece}+${rarity}` : piece;
        loot[id] = (loot[id] ?? 0) + 1;
      }
      // Chefe vencido (covil ou instância): Essência de Chefe, sem sorteio (não muda a sequência).
      if (bossFight) loot[BOSS_ESSENCE] = (loot[BOSS_ESSENCE] ?? 0) + bossEssenceDrop(hunt.level);
      // Caçada de loot: às vezes uma gema (sorteio só nelas, para não mudar as outras caçadas).
      if (focus === HUNT_FOCUS.loot && rand() < LOOT_GEM_CHANCE) {
        let r = rand() * LOOT_GEMS.reduce((a, [, w]) => a + w, 0);
        const gem = LOOT_GEMS.find(([, w]) => (r -= w) < 0)?.[0] ?? LOOT_GEMS[0][0];
        loot[gem] = (loot[gem] ?? 0) + 1;
      }
    }
  }

  const regen = player.regen ?? REGEN_PER_SEC;
  // Charm de resiliência: o descanso depois desta luta fica mais curto.
  const restCut = Math.max(0, ...monsters.map((m) => m.charm?.rest ?? 0));
  const restMs = outcome === 'death' ? 0 : Math.ceil(((damageTaken / (player.hp * regen * (1 + (buffs.heal ?? 0)))) * 1000) * (1 - restCut));
  totalXp = Math.round(totalXp * PACK_XP_BONUS[Math.min(monsters.length, PACK_XP_BONUS.length) - 1] * xpMult * (hunt.xpMult ?? 1) * (underLevel ? UNDERLEVEL_XP : 1) * (high ? HIGH_HUNT_XP : 1) * earlyXpBoost(hunt.level) * catchUpXpBoost(player.level) * (bossFight ? 1 : 1 + (player.xpPct ?? 0)));
  const finalMana = Math.min(maxMana, mana + ((fightMs - manaAt) / 1000) * manaRegen);
  const auraEnd: SpellAura = {};
  const buffsLeft = spellBuffs.filter((b) => b.until > fightMs).map((b) => ({ id: b.id, left: b.until - fightMs, attack: b.attack, crit: b.crit }));
  if (buffsLeft.length) auraEnd.buffs = buffsLeft;
  if (shieldUntil > fightMs) auraEnd.shield = { left: shieldUntil - fightMs, reduce: shieldReduce };
  return { monster, monsters, hits, fightMs, restMs, outcome, damageTaken, loot, xp: totalXp, manaEnd: Math.round(finalMana), auraEnd };
}

// ── Morte e bênção (como no Tibia) ──────────────────────────────────────────

/** Sem bênção, cada peça equipada tem esta chance de se perder ao morrer. */
/**
 * XP a mais por nível da caçada, calibrada com dados reais (no 134, 180% de bônus, ~2,9 h por nível sem isto):
 * +50% até o 100 (para chegar ao 100 mais rápido), ~1 nível por hora do 100 ao 200 e ~1 a cada 3 h depois do 200.
 * Pontos ligados em linha reta; depois do 245 sobe 1,2% por nível.
 */
const HIGH_XP_POINTS: [number, number][] = [[100, 1.5], [120, 1.8], [134, 2.9], [150, 4], [165, 7.5], [180, 10], [200, 12], [245, 20]];
export const highLevelXpMult = (huntLevel: number) => {
  const pts = HIGH_XP_POINTS;
  if (huntLevel <= pts[0][0]) return pts[0][1];
  const last = pts[pts.length - 1];
  if (huntLevel >= last[0]) return last[1] * 1.012 ** (huntLevel - last[0]) * rush250(huntLevel);
  const k = pts.findIndex(([l]) => l >= huntLevel);
  const [l0, m0] = pts[k - 1], [l1, m1] = pts[k];
  return (m0 + ((m1 - m0) * (huntLevel - l0)) / (l1 - l0)) * rush250(huntLevel);
};

/**
 * Corrida até o 250 (pedido de 17/10): um jogador forte (bando 7x, imbuements, equipamento +10)
 * com Prey e o evento de +50% sobe cerca de 1 nível por hora até o 250. Medido no Sixtwo (Devoto
 * 218): 6 a 9 h por nível sem os bônus; o multiplicador sobe do 195 ao 215 e fica em 3x até o 249 (calibrado no print real dele no Trono do Caos: 1,7 h por nível com Prey, comida e evento).
 * Do 250 em diante a XP volta ao normal (as regiões novas têm a curva delas).
 */
export const RUSH_250_MULT = 1; // 21/10: era 3; com o +88% de Valdeferro dava ~7 níveis/h no 234. Alvo: ~1 nível/h do 200 ao 300.
export const rush250 = (huntLevel: number) =>
  huntLevel < 195 || huntLevel >= 250 ? 1 : 1 + (RUSH_250_MULT - 1) * Math.min(1, (huntLevel - 195) / 20);

/**
 * Freio do fim de jogo (pedido de 20/10): a XP de caçada cai aos poucos pelo nível do jogador, para o nível demorar
 * e o fim de jogo ir para as quests e outras partes. Multiplicador da XP ganha, a curva não muda; quests e chefes iguais.
 * Stages (23/10, estilo Tibia), para chegar mais rápido ao fim de jogo do 400: 100% até o 199, 130% do 200 ao 249,
 * 120% do 250 ao 299, 100% do 300 ao 349, 40% do 350 ao 399 e 4% do 400 ao 599. Níveis inteiros: degrau a cada stage.
 * Do 600 em diante (30/10, estilo Rubinot): a curva para de crescer no 250 e a XP das caçadas sobe ~1,2% por nível, então
 * o nível ficava mais rápido quanto mais alto (13 min no 571). Calibrado pela XP/h real do top 1 (Santuário Profanado,
 * Pesadelo, bando de 7): 2 h por nível no 600, crescendo com nível² ÷ stage do Rubinot (7x/6x/5x), ~3,2 h no 700 e ~5 h no 800.
 */
const PLAYER_XP_POINTS: [number, number][] = [
  [199, 1], [200, 1.3], [249, 1.3], [250, 1.2], [299, 1.2], [300, 1], [349, 1], [350, 0.4], [399, 0.4], [400, 0.04], [599, 0.04],
  [600, 0.00423], [610, 0.00251], [620, 0.00197], [630, 0.00137], [640, 0.00108], [650, 0.00104], [660, 0.000726], [670, 0.000571],
  [680, 0.000398], [690, 0.000313], [700, 0.000304], [720, 0.00024], [740, 0.000227], [760, 0.000215], [780, 0.000204], [800, 0.000194],
];
/**
 * XP de caçada acima do nível: conta no máximo 20 níveis acima (o grupo ajuda a sobreviver, não a pular níveis). Vale para quem
 * está no 600+ e, para todos, nas caçadas do 600+ (abaixo do 600 as caçadas antigas seguem como estavam, para quem está atrás
 * alcançar o topo no mesmo ritmo que ele teve).
 */
export const OVER_LEVEL_XP_FROM = 600;
export const OVER_LEVEL_XP_GRACE = 20;
/** Fração da XP perdida por nível além da margem (zera 20 níveis depois dela). */
export const OVER_LEVEL_XP_STEP = 0.05;
export const overLevelXpMult = (huntLevel: number, effectiveHuntLevel: number, playerLevel: number) => {
  const over = effectiveHuntLevel - playerLevel - OVER_LEVEL_XP_GRACE;
  const applies = playerLevel >= OVER_LEVEL_XP_FROM || huntLevel >= OVER_LEVEL_XP_FROM;
  // Sem piso: com 20% a caçada 90 níveis acima ainda rendia mais que a do nível.
  return !applies || over <= 0 ? 1 : Math.max(0, 1 - OVER_LEVEL_XP_STEP * over);
};
export const OVER_400_XP_MULT = 0.04;
export const OVER_350_XP_MULT = 0.4;
export const playerLevelXpMult = (level: number) => {
  const pts = PLAYER_XP_POINTS;
  if (level <= pts[0][0]) return pts[0][1];
  if (level >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  const k = pts.findIndex(([l]) => l >= level);
  if (pts[k][0] === level) return pts[k][1];
  const [l0, m0] = pts[k - 1], [l1, m1] = pts[k];
  return m0 + ((m1 - m0) * (level - l0)) / (l1 - l0);
};

export const DEATH_ITEM_LOSS = 0.1;

/** Preço da bênção do Templo: cresce com o nível de combate. */
export function blessPrice(combatLevel: number): number {
  return 100 + combatLevel * combatLevel * 10;
}

/** Quais espaços perdem a peça nesta morte (sorteio fixo pela semente da caçada). */
export function itemsLostOnDeath(equipment: Partial<Record<EquipSlot, string>>, seed: number, seq: number): EquipSlot[] {
  const rand = rngFor(seed, seq + 104_729);
  // A capa de maestria nunca cai (e fica fora do sorteio, para não mudar o das outras peças).
  return EQUIP_SLOTS.map((s) => s.id).filter((slot) => slot !== 'cape' && slot !== 'gem').filter((slot) => rand() < DEATH_ITEM_LOSS && !!equipment[slot]);
}

/** XP perdido ao morrer com esse XP total. */
export function deathPenalty(combatXp: number): number {
  const level = levelForXp(combatXp, 'combat');
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - floor;
  return Math.min(Math.floor(span * DEATH_XP_PENALTY), combatXp - floor);
}

// ── Simulação da caçada ─────────────────────────────────────────────────────

export interface HuntContext {
  /** Loot a mais dos mascotes (0.15 = +15%), somado ao da refeição. */
  petLoot?: number;
  mastery?: Partial<Record<string, number>>;
  vocation: string;
  /** XP de combate no início da simulação. */
  combatXp: number;
  /** XP de todas as skills do jogador (para os bônus de melee, ranged, magic_level e shielding). */
  skills?: Partial<Record<SkillId, number>>;
  /** Bônus do equipamento. */
  bonus?: Bonus;
  /** Promoção escolhida no nível 30. */
  promotion?: string | null;
  /** Qual comida comer depois das lutas. */
  food?: FoodPref;
  /** Banco: a comida dele é comida depois das lutas. */
  bank?: Record<string, number>;
  /** Magias equipadas. */
  spells?: string[];
  /** Poção de caçada escolhida (ataque/defesa), tomada do banco. */
  potion?: string | null;
  /** Poção de mana escolhida, tomada do banco quando falta mana para magias. */
  manaPotion?: string | null;
  /** Condições da barra de ação. */
  rules?: CombatRules | null;
  /** Flecha especial ativa do Caçador (gasta 1 por luta se houver no banco; sem flecha usa básica infinita). */
  arrow?: string | null;
  /** Runas escolhidas (uma de ataque e uma de cura), gastas do banco. */
  runes?: (string | null)[];
  /** Abençoado no Templo: morrer custa metade do XP (e não perde itens). */
  blessed?: boolean;
  /** Passo atual de cada história em andamento (drops de quest). */
  questSteps?: Record<string, number>;
  /** Charms do bestiário postos em espécies. */
  charms?: CharmState[];
  /** Vagas de prey. */
  prey?: PreySlot[];
  /** Criatura do dia sorteada (opcional para testes determinísticos). */
  boostedCreature?: string;
  /** Bônus de XP compartilhado da Party (ex: 0.10 para +10%, 0.20 para +20%, até 0.30 para +30%). */
  partyBonus?: number;
  /** Covil em grupo: a luta compartilhada com a party. */
  lairGroup?: LairGroup;
  /** Buffs da party (vocações diferentes caçando juntas). */
  partyBuffs?: PartyBuffs;
  /** Capa do Slayer vestida com tarefa ativa: o monstro da tarefa e o multiplicador de vida dele. */
  slayerCape?: { monster: string; hpMult: number };
  /** Bônus do Bosstiary contra chefes (pela contagem de vitórias). */
  bosstiary?: BossBonus;
  /** Nota de equipamento (ver gearPower). */
  gearPower?: number;
  /** Nível de Maestria (400+): o nível que conta nas caçadas comuns é 400 + ele. */
  masteryLevel?: number;
  /** Bônus com prazo (imbuements): valem só nas lutas que começam antes de `untilMs`. */
  timedBonus?: { bonus: Bonus; untilMs: number }[];
  /** Stamina no início da simulação (ms). Sem ela, a XP não muda. */
  staminaMs?: number;
  /** Refeição ativa comida pelo jogador (buff até `until` ms). */
  meal?: { item: string; until: number } | null;
  /** Instância: ainda não venceu esta hoje, então o chefe não gasta chave. */
  instanceFreeKey?: boolean;
  /** Qual entrada do dia nesta instância (1 = a primeira): define a XP dos monstros (instanceTryXp). */
  instanceTry?: number;
}

/** Bônus do equipamento mais os bônus com prazo ainda valendo no instante `t`. */
export function bonusAt(ctx: HuntContext, t: number): Bonus | undefined {
  let total = ctx.bonus;
  for (const tb of ctx.timedBonus ?? []) {
    if (t < tb.untilMs) total = mergeBonus(total ?? { attack: 0, defense: 0, hp: 0 }, tb.bonus);
  }
  return total;
}

/**
 * Stamina (como no Tibia): estoque de horas de caça. De 42 h a 41 h dá +80% de
 * XP; de 41 h a 39 h, +50%; abaixo disso é normal (desde 18/10 não há mais punição
 * com pouca stamina). Fora da caçada volta 1 h a cada STAMINA_REGEN_RATIO h (20/10: 1 h por hora, antes 1 a cada 2).
 */
export const STAMINA_MAX_MS = 42 * 3_600_000;
export const STAMINA_SUPER_MS = 41 * 3_600_000;
export const STAMINA_BONUS_MS = 39 * 3_600_000;
export const STAMINA_NORMAL_MS = 12 * 3_600_000;
export const STAMINA_REGEN_RATIO = 1;

/** Quanto a XP da caçada rende com esta stamina. */
export function staminaXpMult(ms: number): number {
  if (ms > STAMINA_SUPER_MS) return 1.8;
  if (ms > STAMINA_BONUS_MS) return 1.5;
  return 1;
}

/**
 * Estágios de XP (estilo servidor de Tibia, 18/10): multiplicador pelo nível do jogador a partir
 * do 250. Não mexe na curva; só na XP ganha. [nível a partir do qual vale, multiplicador].
 */
/**
 * XP das quests e histórias para os níveis baixos (18/10): ×3 até o nível 120 de combate,
 * caindo em linha até ×1 no 150.
 */
export const questLowLevelXpMult = (combatLevel: number) =>
  combatLevel <= 120 ? 3 : combatLevel >= 150 ? 1 : 3 - (2 * (combatLevel - 120)) / 30;

/**
 * Estágios de XP pelo nível do jogador (estilo servidores de Tibia): mais rápido no começo
 * (18/10: do 70 ao 150 levava 5 a 35 h por nível) e mais lento do 300 em diante.
 */
export const XP_STAGES: [number, number][] = [[0, 2], [50, 3], [120, 2], [150, 1.5], [200, 1], [300, 0.7], [400, 0.5], [500, 0.35], [700, 0.25]];
export function xpStageMult(level: number): number {
  let m = 1;
  for (const [from, mult] of XP_STAGES) if (level >= from) m = mult;
  return m;
}

/** Uma poção de caçada dura este número de lutas. */
export const POTION_FIGHTS = 10;
/**
 * XP dos monstros da instância pela entrada do dia: a 1ª cheia, a 2ª 40% e da 3ª em diante 10%
 * (repetir a mesma instância rendia milhões de XP por hora).
 */
export const INSTANCE_TRY_XP = [1, 0.4, 0.1];
export const instanceTryXp = (tryOfDay: number) => INSTANCE_TRY_XP[Math.min(INSTANCE_TRY_XP.length, Math.max(1, Math.floor(tryOfDay))) - 1];
/** Quanto dura o buff de uma refeição (Culinária). */
export const MEAL_MS = 30 * 60 * 1000;

/** Aplica o bônus da poção nos atributos. */
export function withPotion(player: Fighter, potionId: string | null | undefined): Fighter {
  const p = potionId ? itemById(potionId)?.potion : undefined;
  if (!p) return player;
  return { ...player, attack: player.attack * (1 + (p.attack ?? 0)), defense: player.defense * (1 + (p.defense ?? 0)) };
}

/** Aplica o bônus multiplicador da flecha especial se houver (só Caçador). */
export function withArrow(player: Fighter, arrowId: string | null | undefined): Fighter {
  const a = arrowId ? itemById(arrowId)?.arrow : undefined;
  if (!a) return player;
  const attack = Math.round(player.attack * a.mult);
  if (a.splash) player = { ...player, arrowSplash: a.splash };
  if (!a.element || attack <= 0) return { ...player, attack };
  // Flecha com elemento: o que ela soma é desse elemento (troca o da arma, se for outro).
  const fromArrow = (attack - player.attack) / attack;
  const kept = player.element === a.element ? (player.elementShare ?? 0) * (player.attack / attack) : 0;
  return { ...player, attack, element: a.element, elementShare: fromArrow + kept };
}

/** Preferência de comida: null = a melhor do banco, 'none' = não come, ou o id de uma comida. */
export type FoodPref = string | null;
export const NO_FOOD = 'none';

/**
 * Depois de uma luta com dano, come uma comida do banco (uma por luta):
 * cura na hora e o descanso só cobre o que faltou.
 */
export function eatAfterFight(
  cycle: Cycle,
  player: Fighter,
  bank: Record<string, number>,
  pref: FoodPref = null,
): { restMs: number; ate: string | null } {
  if (cycle.outcome === 'death' || cycle.damageTaken <= 0 || pref === NO_FOOD) return { restMs: cycle.restMs, ate: null };
  // Limite escolhido pelo jogador: com a vida ainda acima dele, só descansa.
  const below = player.rules?.foodBelow;
  if (below && (player.hp - cycle.damageTaken) / player.hp >= below) return { restMs: cycle.restMs, ate: null };
  // Preferência antiga numa comida que virou refeição (não cura mais): volta para o automático (poções).
  if (pref && !itemById(pref)?.food) pref = null;
  let best: string | null = null;
  let heal = 0;
  for (const [id, qty] of Object.entries(bank)) {
    if (pref && id !== pref) continue;
    const food = qty > 0 ? itemById(id)?.food : undefined;
    if (food && food > heal) {
      best = id;
      heal = food;
    }
  }
  if (!best) return { restMs: cycle.restMs, ate: null };
  const left = Math.max(0, cycle.damageTaken - heal);
  return { restMs: Math.ceil((left / (player.hp * (player.regen ?? REGEN_PER_SEC))) * 1000), ate: best };
}

/** O que sobra do buff e do escudo depois do descanso (o tempo corre também descansando). */
export function afterRest(aura: SpellAura | undefined, restMs: number): SpellAura | undefined {
  if (!aura) return undefined;
  const out: SpellAura = {};
  if (aura.buff && aura.buff.left > restMs) out.buff = { ...aura.buff, left: aura.buff.left - restMs };
  const buffs = (aura.buffs ?? []).filter((b) => b.left > restMs).map((b) => ({ ...b, left: b.left - restMs }));
  if (buffs.length) out.buffs = buffs;
  if (aura.shield && aura.shield.left > restMs) out.shield = { ...aura.shield, left: aura.shield.left - restMs };
  return out.buff || out.buffs || out.shield ? out : undefined;
}

/**
 * Credita os ciclos completos de `activity.since` até `now` (teto de 12 h).
 * O nível pode subir no meio: cada ciclo usa os atributos do XP acumulado até ali.
 */
export function simulateHunt(activity: Activity, now: number, ctx: HuntContext): SimResult {
  const parsed = parseHuntNode(activity.node);
  const gains: Gains = emptyGains();
  if (!parsed || now <= activity.since) {
    return { gains, since: activity.since, seq: activity.seq, ended: false };
  }

  const end = Math.min(now, activity.since + OFFLINE_CAP_MS);
  let t = activity.since;
  let seq = activity.seq;
  let xp = ctx.combatXp;
  let xpDelta = 0;
  let ended = false;
  const pantry = { ...(ctx.bank ?? {}) };
  // A poção vale por blocos de POTION_FIGHTS lutas e é tomada na primeira luta do
  // bloco. Começando no meio de um bloco, vale se ainda há poção no banco (sem gastar).
  const potion = ctx.potion && itemById(ctx.potion)?.potion ? ctx.potion : null;
  let potionOn = !!potion && (pantry[potion] ?? 0) > 0;
  // O Caçador usa flechas especiais se selecionadas e disponíveis; caso contrário, flecha básica infinita.
  const arrow = ctx.vocation === 'hunter' && ctx.arrow && itemById(ctx.arrow)?.arrow ? ctx.arrow : null;

  const initialBase = playerStats(ctx.vocation, xp, bonusAt(ctx, t), ctx.promotion, ctx.spells, ctx.skills);
  // Buff e escudo que ainda valiam no fim do crédito anterior.
  let currentAura: SpellAura | undefined = activity.aura ?? undefined;
  // Continua da mana do crédito anterior: começar cheia a cada crédito dava mana infinita a quem
  // estava online (creditado a cada segundo) e mais que o dobro da XP de quem caçava offline.
  const savedMana = activity.mana;
  let currentMana: number | undefined =
    typeof savedMana === 'number' && Number.isFinite(savedMana) && initialBase.mana !== undefined ? Math.min(initialBase.mana, Math.max(0, savedMana)) : initialBase.mana;

  // Estado dos slots de prey e seus segundos restantes de combate (padrão 2h se não especificado)
  const currentPrey = ctx.prey ?? [];
  const preyTimeLeft: Record<string, number> = {};
  for (const p of currentPrey) {
    if (p.monster && p.bonus) {
      preyTimeLeft[p.monster] = p.timeLeftSecs ?? PREY_DURATION_SECS;
    }
  }

  let stamina = ctx.staminaMs;
  let xpCarry = 0;

  const waves = parsed.hunt.boss ? instanceWaves(parsed.hunt, parsed.pack).length : 0;
  const keyCost = isBossNightmare(parsed.hunt, parsed.difficulty.id) ? BOSS_NIGHTMARE.keys : 1;
  for (;;) {
    // Instância: a chave é gasta quando o chefe aparece (a primeira vitória do dia não gasta).
    // Sem chave, a instância termina depois da limpeza (fica o XP e o loot das ondas).
    const payKey = parsed.hunt.boss && parsed.hunt.key && seq === waves && !ctx.instanceFreeKey ? parsed.hunt.key : null;
    if (payKey && (pantry[payKey] ?? 0) < keyCost) {
      gains.instanceNoKey = parsed.hunt.id;
      ended = true;
      break;
    }
    // Desconta quando a luta do chefe entra na conta (não ao começar: o trecho pode acabar no meio dela).
    const spendKey = () => {
      if (!payKey) return;
      pantry[payKey] -= keyCost;
      gains.items[payKey] = (gains.items[payKey] ?? 0) - keyCost;
    };
    const stMult = stamina === undefined ? 1 : staminaXpMult(stamina);
    const drink = !!potion && seq % POTION_FIGHTS === 0;
    if (drink) potionOn = (pantry[potion!] ?? 0) > 0;
    const arrowOn = !!arrow && (pantry[arrow] ?? 0) > 0;
    // As skills sobem durante o trecho também (igual a creditar aos pouquinhos, como quem está online).
    const liveSkills: Partial<Record<SkillId, number>> = { ...ctx.skills };
    for (const [k, v] of Object.entries(gains.xp)) if (k !== 'combat' && v) liveSkills[k as SkillId] = (liveSkills[k as SkillId] ?? 0) + v;
    const base = playerStats(ctx.vocation, xp, bonusAt(ctx, t), ctx.promotion, ctx.spells, liveSkills);
    const potioned = potionOn ? withPotion(base, potion) : base;
    const arrowed = arrowOn ? withArrow(potioned, arrow) : potioned;
    const manaPotioned = withHealthPotion(withManaPotion(arrowed, ctx.manaPotion, pantry), ctx.food, pantry);
    const lvlNow = levelForXp(xp, 'combat');
    const huntLevel = lvlNow >= MASTERY_MIN_LEVEL ? huntLevelFor(lvlNow, ctx.masteryLevel ?? 0) : undefined;
    const playerWithMana: Fighter = { ...manaPotioned, initialMana: currentMana, initialAura: currentAura, rules: ctx.rules ?? undefined, gearPower: ctx.gearPower, ...(huntLevel ? { huntLevel } : {}) };
    const playerWithRunes = withRunes(playerWithMana, ctx.runes ?? [], pantry);
    const mealActive = ctx.meal && t < ctx.meal.until ? itemById(ctx.meal.item)?.meal : undefined;
    const player = mealActive?.buff === 'crit_chance'
      ? { ...playerWithRunes, critChance: (playerWithRunes.critChance ?? CRIT_CHANCE) + mealActive.value }
      : playerWithRunes;
    // Vagas de prey ativas no instante t (só valem se ainda restam segundos de combate)
    const activePrey: PreySlot[] = (currentPrey ?? []).map((p) => {
      if (!p.monster || !p.bonus) return p;
      const left = preyTimeLeft[p.monster] ?? 0;
      return left > 0 ? p : { ...p, bonus: null };
    });

    const boostedId = ctx.boostedCreature ?? getBoostedCreature(new Date(t));
    const cycle = runCycle(
      parsed.hunt,
      player,
      activity.seed,
      seq,
      parsed.difficulty,
      parsed.pack,
      ctx.questSteps,
      ctx.charms,
      activePrey,
      boostedId,
      t,
      ctx.lairGroup,
      ctx.slayerCape ? { ...ctx.partyBuffs, slayerTarget: ctx.slayerCape.monster, slayerHpMult: ctx.slayerCape.hpMult } : ctx.partyBuffs,
      ctx.bosstiary,
    );

    // Deduz o tempo da luta (em segundos) de todas as preys ativas, enfrentando a espécie ou não
    // (a prey corre em qualquer caçada). Uma vez por vaga, não por monstro do bando.
    const fightSecs = Math.max(1, Math.round(cycle.fightMs / 1000));
    for (const id of Object.keys(preyTimeLeft)) {
      if (preyTimeLeft[id] > 0) {
        const consumed = Math.min(preyTimeLeft[id], fightSecs);
        preyTimeLeft[id] = Math.max(0, preyTimeLeft[id] - fightSecs);
        gains.preySecondsUsed = gains.preySecondsUsed ?? {};
        gains.preySecondsUsed[id] = (gains.preySecondsUsed[id] ?? 0) + consumed;
      }
    }
    if (cycle.outcome === 'death') {
      if (!Number.isFinite(cycle.fightMs)) break;
      if (t + cycle.fightMs > end) break;
      const xpLost = ctx.blessed ? Math.floor(deathPenalty(xp) / 2) : deathPenalty(xp);
      xp -= xpLost;
      xpDelta -= xpLost;
      gains.death = { monster: cycle.monster.id, xpLost };
      spendKey();
      t += cycle.fightMs;
      if (stamina !== undefined) stamina -= cycle.fightMs;
      seq++;
      ended = true;
      break;
    }
    // Poções de vida da luta saem do banco antes da de depois da luta (senão contava a mesma duas vezes).
    for (const [id, n] of Object.entries(healthPotionsUsed(cycle.hits))) {
      pantry[id] -= n;
      gains.items[id] = (gains.items[id] ?? 0) - n;
    }
    const meal = eatAfterFight(cycle, player, pantry, ctx.food);
    const restMs = instanceRest(parsed.hunt, mealActive?.buff === 'rest_speed' ? Math.round(meal.restMs * (1 - mealActive.value)) : meal.restMs);
    // Raide em grupo: cada fase ocupa um horário fixo (luta máxima + descanso), assim o grupo todo começa a
    // próxima fase junto, mesmo quem terminou antes (antes cada um seguia no seu tempo e o grupo se desfazia).
    const raid = parsed.hunt.raid ? raidById(parsed.hunt.id) : undefined;
    const phaseMaxFightMs = raid ? (raid.phases[Math.min(seq, raid.phases.length - 1)]?.maxFightMs ?? RAID_MAX_FIGHT_MS) : RAID_MAX_FIGHT_MS;
    const duration = parsed.hunt.raid && ctx.lairGroup ? phaseMaxFightMs + RAID_PHASE_REST_MS : cycle.fightMs + restMs;
    // Trava: um valor inválido (NaN) nunca passaria do fim e prenderia o servidor neste laço.
    if (!Number.isFinite(duration) || !Number.isFinite(cycle.xp)) break;
    if (t + duration > end) break;
    spendKey();
    currentMana = Math.min(base.mana ?? 0, (cycle.manaEnd ?? 0) + (restMs / 1000) * (base.manaRegen ?? 2));
    currentAura = afterRest(cycle.auraEnd, restMs);
    if (meal.ate) {
      pantry[meal.ate]--;
      gains.items[meal.ate] = (gains.items[meal.ate] ?? 0) - 1;
    }
    for (const [id, n] of Object.entries(runesUsed(cycle.hits))) {
      pantry[id] -= n;
      gains.items[id] = (gains.items[id] ?? 0) - n;
    }
    for (const [id, n] of Object.entries(manaPotionsUsed(cycle.hits))) {
      pantry[id] -= n;
      gains.items[id] = (gains.items[id] ?? 0) - n;
    }
    if (drink && potionOn) {
      pantry[potion!]--;
      gains.items[potion!] = (gains.items[potion!] ?? 0) - 1;
    }
    // Aljava: chance de recuperar a flecha da luta (não gasta).
    const arrowSave = bonusAt(ctx, t)?.arrowSave ?? 0;
    if (arrowOn && !(arrowSave > 0 && rngFor(activity.seed, seq + 52_711)() < arrowSave)) {
      pantry[arrow]--;
      gains.items[arrow] = (gains.items[arrow] ?? 0) - 1;
    }
    t += duration;
    seq++;
    if (stamina !== undefined) {
      const staminaDuration = mealActive?.buff === 'stamina_cost' ? Math.round(duration * (1 - mealActive.value)) : duration;
      stamina -= staminaDuration;
    }
    if (cycle.outcome === 'win') {
      gains.actions += cycle.monsters.length;
      gains.kills = gains.kills ?? {};
      for (const m of cycle.monsters) {
        gains.kills[m.id] = (gains.kills[m.id] ?? 0) + 1;
      }
      const mealXpMult = mealActive?.buff === 'combat_xp' || mealActive?.buff === 'all_xp_loot' ? (1 + mealActive.value) : 1;
      const partyMult = ctx.partyBonus && ctx.partyBonus > 0 ? (1 + ctx.partyBonus) : 1;
      // As frações de XP (stamina, meal, party) passam para a próxima luta via xpCarry para não truncar pequenos valores.
      // Instância repetida no mesmo dia: a XP dos monstros cai pela entrada (instanceTryXp).
      const repeatMult = parsed.hunt.boss ? instanceTryXp(ctx.instanceTry ?? (ctx.instanceFreeKey ? 1 : 2)) : 1;
      const stageMult = xpStageMult(levelForXp(xp, 'combat'));
      const exact = cycle.xp * mealXpMult * partyMult * stMult * repeatMult * stageMult + xpCarry;
      const earnedXp = Math.floor(exact);
      xpCarry = exact - earnedXp;
      xp += earnedXp;
      xpDelta += earnedXp;
      // XP ganho nas skills de combate específicas da vocação:
      const skillXp = earnedXp;
      if (ctx.vocation === 'hunter') {
        gains.xp.ranged = (gains.xp.ranged ?? 0) + skillXp;
      } else if (ctx.vocation === 'warrior') {
        gains.xp.melee = (gains.xp.melee ?? 0) + skillXp;
        if (ctx.bonus?.defense) gains.xp.shielding = (gains.xp.shielding ?? 0) + Math.round(skillXp * 0.5);
      } else if (ctx.vocation === 'arcanist') {
        gains.xp.magic_level = (gains.xp.magic_level ?? 0) + skillXp;
      } else if (ctx.vocation === 'devout') {
        gains.xp.melee = (gains.xp.melee ?? 0) + Math.round(skillXp * 0.7);
        gains.xp.magic_level = (gains.xp.magic_level ?? 0) + Math.round(skillXp * 0.5);
        if (ctx.bonus?.defense) gains.xp.shielding = (gains.xp.shielding ?? 0) + Math.round(skillXp * 0.5);
      }
      // Gasto de mana em magias treina magic level adicional (estilo Tibia):
      for (const h of cycle.hits) {
        if (h.by === 'p' && h.spell) {
          const s = spellById(h.spell);
          if (s) gains.xp.magic_level = (gains.xp.magic_level ?? 0) + s.cost;
        }
      }
      const lootBuff = (mealActive?.buff === 'loot' || mealActive?.buff === 'all_xp_loot' ? mealActive.value : 0) + (ctx.petLoot ?? 0);
      const goldBuff = 0;
      // Sorteio fixo pela semente da caçada: a fração do bônus vira chance de +1 (drops de 1 unidade também ganham).
      const lootRand = lootBuff || goldBuff ? rngFor(activity.seed, seq + 7_919) : null;
      for (const [item, qty] of Object.entries(cycle.loot)) {
        let finalQty = qty;
        if (lootRand) {
          const buff = item === 'gold' ? lootBuff + goldBuff : lootBuff;
          const extra = qty * buff;
          finalQty = qty + Math.floor(extra) + (lootRand() < extra - Math.floor(extra) ? 1 : 0);
        }
        gains.items[item] = (gains.items[item] ?? 0) + finalQty;
      }
    }
    // Instância: derrotou o último chefe, acabou.
    if (parsed.hunt.boss && !parsed.hunt.raid && seq >= instanceCycles(parsed.hunt, parsed.pack)) {
      gains.cleared = parsed.hunt.id;
      ended = true;
      break;
    }
    // Covil: uma luta só (venceu, ou o chefe fugiu depois do tempo máximo da luta).
    if (parsed.hunt.lair) {
      if (cycle.outcome === 'win') gains.cleared = parsed.hunt.id;
      ended = true;
      break;
    }
    // Raide: fases em sequência. Derrotou o último chefe da lista, concluiu a raide.
    if (parsed.hunt.raid) {
      const raid = raidById(parsed.hunt.id);
      const totalPhases = raid ? raid.phases.length : 3;
      if (cycle.outcome === 'win') {
        gains.raidPhases = gains.raidPhases ?? [];
        // `seq` já foi somado acima: depois da vitória, ele é o número da fase vencida (1, 2, 3...).
        gains.raidPhases.push(seq);
        if (seq >= totalPhases) {
          gains.cleared = parsed.hunt.id;
          ended = true;
          break;
        }
      } else {
        ended = true;
        break;
      }
    }
  }

  const delta = xpDelta;
  if (delta !== 0) gains.xp.combat = delta;
  if (stamina !== undefined) gains.staminaLeftMs = Math.max(0, stamina);
  // Passou do teto: o excedente é descartado e o próximo ciclo começa agora.
  const since = !ended && now - activity.since > OFFLINE_CAP_MS ? now : t;
  return { gains, since, seq, ended, mana: typeof currentMana === 'number' && Number.isFinite(currentMana) ? currentMana : undefined, aura: currentAura ?? {} };
}
