import huntsData from '../data/hunts.json';
import { SPECIAL_BOSSES, WORLD_BOSSES } from './worldboss.ts';

/**
 * Bosstiary (como no Tibia): cada chefe tem uma ficha que avança com as vitórias.
 * Cada etapa dá pontos de chefe; a soma dos pontos dá o nível do Bosstiary, que
 * vale mais chance de drop e mais XP contra todos os chefes.
 *
 * As vitórias saem da contagem do bestiário (os chefes de instância e de covil já
 * entram lá); as dos chefes mundiais ficam com a chave `wb:<id>`.
 */

export type BossKind = 'instance' | 'lair' | 'world';

export interface BossEntry {
  /** Chave na contagem do bestiário (id do monstro, ou `wb:<id>` no chefe mundial). */
  key: string;
  kind: BossKind;
  /** Id do monstro (instância e covil) ou do chefe mundial. */
  id: string;
  /** Nível da caçada (instância e covil); 0 no mundial. */
  level: number;
  /** Id da caçada onde ele aparece (instância e covil). */
  hunt?: string;
}

/** Bônus do Bosstiary contra os chefes: frações (0.1 = +10%). */
export interface BossBonus {
  loot: number;
  xp: number;
}

/** Vitórias para cada etapa da ficha. */
export const BOSS_STAGES: Record<BossKind, readonly [number, number, number]> = { instance: [1, 10, 50], lair: [1, 10, 50], world: [1, 5, 20] };
/** Pontos base de cada etapa (vezes o peso do chefe). */
export const BOSS_STAGE_POINTS = [5, 15, 30] as const;
/** Peso fixo dos chefes mundiais (o nível deles não segue as caçadas). */
const WORLD_WEIGHT = 3;
/** Bônus por nível do Bosstiary e o teto. */
export const BOSSTIARY_LOOT_PER_LEVEL = 0.01;
export const BOSSTIARY_XP_PER_LEVEL = 0.006;
export const BOSSTIARY_MAX_LEVEL = 25;
/** Itens dos deuses (lendários) recebem só esta fração do bônus de drop. */
export const BOSSTIARY_LEGENDARY_SHARE = 0.5;

/** Chave do chefe mundial na contagem do bestiário. */
export const worldBossKey = (id: string) => `wb:${id}`;

function buildBosses(): BossEntry[] {
  const out: BossEntry[] = [];
  const hunts = huntsData as { id: string; level: number; monsters: string[]; trash?: string[]; boss?: boolean; lair?: boolean }[];
  // Monstro comum que a instância usa como chefe (aparece numa caçada ou nas ondas) não tem ficha.
  const common = new Set(hunts.flatMap((h) => [...(h.trash ?? []), ...(h.boss || h.lair ? [] : h.monsters)]));
  const seen = new Set<string>(common);
  for (const h of hunts) {
    if (!h.boss && !h.lair) continue;
    const ids = h.lair ? h.monsters.slice(0, 1) : h.monsters;
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ key: id, kind: h.lair ? 'lair' : 'instance', id, level: h.level, hunt: h.id });
    }
  }
  for (const b of [...WORLD_BOSSES, ...SPECIAL_BOSSES]) {
    if (b.daily) continue;
    out.push({ key: worldBossKey(b.id), kind: 'world', id: b.id, level: 0 });
  }
  return out.sort((a, b) => a.level - b.level);
}

export const BOSSES: BossEntry[] = buildBosses();
const BOSS_BY_KEY = new Map(BOSSES.map((b) => [b.key, b]));
export const bossEntry = (key: string) => BOSS_BY_KEY.get(key);
/** É chefe de instância ou de covil (recebe o bônus do Bosstiary na luta). */
export const isBosstiaryMonster = (monsterId: string) => {
  const b = BOSS_BY_KEY.get(monsterId);
  return !!b && b.kind !== 'world';
};

export function bossStage(boss: BossEntry, kills: number): 0 | 1 | 2 | 3 {
  const s = BOSS_STAGES[boss.kind];
  if (kills >= s[2]) return 3;
  if (kills >= s[1]) return 2;
  if (kills >= s[0]) return 1;
  return 0;
}

/**
 * Peso do chefe: os mais fortes valem mais pontos, até o nível 325 (com as regiões do 350 ao 500, o peso sem teto
 * fazia uma vitória em cada chefe passar da metade do Bosstiary; só os dois chefes do Abismo, 340 e 350, valem ~4% menos).
 */
const BOSS_WEIGHT_CAP_LEVEL = 320;
export const bossWeight = (boss: BossEntry) => (boss.kind === 'world' ? WORLD_WEIGHT : 1 + Math.min(boss.level, BOSS_WEIGHT_CAP_LEVEL) / 50);

/** Pontos que a etapa `stage` (1 a 3) deste chefe vale. */
export const bossStagePoints = (boss: BossEntry, stage: 1 | 2 | 3) => Math.round(BOSS_STAGE_POINTS[stage - 1] * bossWeight(boss));

/** Pontos já ganhos com este chefe (soma das etapas alcançadas). */
export function bossPoints(boss: BossEntry, kills: number): number {
  let pts = 0;
  for (let s = 1; s <= bossStage(boss, kills); s++) pts += bossStagePoints(boss, s as 1 | 2 | 3);
  return pts;
}

/** Total de pontos de chefe pela contagem do bestiário. */
export function bosstiaryPoints(kills: Record<string, number>): number {
  let pts = 0;
  for (const b of BOSSES) {
    const n = Number(kills[b.key] ?? 0);
    pts += bossPoints(b, Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
  }
  return pts;
}

/** Pontos para chegar ao nível `level` (cada nível pede um pouco mais que o anterior). */
export const bosstiaryPointsFor = (level: number) => (level <= 0 ? 0 : Math.round(BOSSTIARY_STEP * level + BOSSTIARY_CURVE * level * level));
const BOSSTIARY_STEP = 50;
const BOSSTIARY_CURVE = 12;

export function bosstiaryLevel(points: number): number {
  let lvl = 0;
  while (lvl < BOSSTIARY_MAX_LEVEL && points >= bosstiaryPointsFor(lvl + 1)) lvl++;
  return lvl;
}

/** Bônus de um nível do Bosstiary. */
export const bosstiaryBonusAt = (level: number): BossBonus => ({
  loot: +(level * BOSSTIARY_LOOT_PER_LEVEL).toFixed(4),
  xp: +(level * BOSSTIARY_XP_PER_LEVEL).toFixed(4),
});

/** Bônus do Bosstiary contra os chefes, pela contagem do bestiário. */
export const bosstiaryBonus = (kills: Record<string, number>): BossBonus => bosstiaryBonusAt(bosstiaryLevel(bosstiaryPoints(kills)));

/** Chance de um drop com o bônus (o lendário recebe só parte dele), sem passar de 100%. */
export function boostedChance(chance: number, bonus: BossBonus | undefined, legendary: boolean): number {
  const loot = bonus && Number.isFinite(bonus.loot) ? Math.max(0, Math.min(1, bonus.loot)) : 0;
  return Math.min(1, chance * (1 + loot * (legendary ? BOSSTIARY_LEGENDARY_SHARE : 1)));
}

/** Multiplicador de XP do bônus (inválido vale 1). */
export function bossXpMult(bonus: BossBonus | undefined): number {
  const xp = bonus && Number.isFinite(bonus.xp) ? Math.max(0, Math.min(1, bonus.xp)) : 0;
  return 1 + xp;
}
