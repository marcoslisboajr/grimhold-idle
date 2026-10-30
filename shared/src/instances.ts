import type { Hunt } from './combat.ts';
import { monsterById } from './combat.ts';

/**
 * Instâncias: limpa as ondas de monstros (tamanho fixo, crescendo) e depois enfrenta os
 * chefes da instância. A chave só é gasta quando o chefe aparece; a primeira vitória do
 * dia em cada instância não gasta chave e dá XP bônus e o Baú da Instância.
 */

/** Total de abates da limpeza: ~140 nas primeiras, ~900 no nível 200. */
export function instanceKills(level: number): number {
  return Math.round((100 + level * 4) / 10) * 10;
}

/**
 * Bando máximo das ondas. Medido no simulador com as quatro vocações: até o 99 aguentam 2 a 3;
 * do 100 ao 119, 2; do 120 para cima um bando de 2 já mata (até nas caçadas normais), então é um por vez.
 * As difíceis compensam no número de abates, não no tamanho do bando.
 */
export function instanceMaxPack(level: number): number {
  if (level >= 120) return 1;
  if (level >= 100) return 2;
  return level >= 50 ? 3 : 2;
}

/** Maior bando que o jogador pode escolher na limpeza da instância (o risco é de quem escolhe). */
export const INSTANCE_PACK_CHOICES = [1, 2, 3, 4, 5] as const;

/**
 * Tamanho de cada onda, em ordem; a soma é o total de abates. Com `pack` 1 (o padrão) começa com 1
 * e cresce até o máximo seguro do nível; com bando escolhido (2 a 5), toda onda já vem desse tamanho.
 */
export function instanceWaves(hunt: Pick<Hunt, 'level' | 'trash'>, pack = 1): number[] {
  if (!hunt.trash?.length) return [];
  const total = instanceKills(hunt.level);
  const max = instanceMaxPack(hunt.level);
  const waves: number[] = [];
  let left = total;
  for (let i = 0; left > 0; i++) {
    // Sobe 1 a cada 5 ondas até o máximo (ou o bando escolhido, desde a primeira).
    const size = pack > 1 ? Math.min(pack, left) : Math.min(max, left, 1 + Math.floor(i / 5));
    waves.push(size);
    left -= size;
  }
  return waves;
}

/** É uma instância (tem chefe no fim)? */
export const isInstance = (hunt: Pick<Hunt, 'boss'> | undefined) => !!hunt?.boss;

/** Fase do ciclo `seq`: onda de limpeza (com o tamanho) ou o chefe `boss` da lista. */
export function instancePhase(hunt: Hunt, seq: number, pack = 1): { wave: number; size: number } | { boss: number } {
  const waves = instanceWaves(hunt, pack);
  if (seq < waves.length) return { wave: seq, size: waves[seq] };
  return { boss: seq - waves.length };
}

/** Quantos ciclos a instância tem ao todo (ondas + chefes). */
export const instanceCycles = (hunt: Hunt, pack = 1) => instanceWaves(hunt, pack).length + hunt.monsters.length;

/**
 * XP base de uma instância completa: os abates da limpeza (pela média dos monstros dela) mais
 * os chefes. É o XP cru dos monstros (sem bônus de bando, stamina ou nível).
 */
export function instanceRunXp(hunt: Hunt): number {
  const trash = (hunt.trash ?? []).map((id) => monsterById(id)?.xp ?? 0);
  const avg = trash.length ? trash.reduce((a, b) => a + b, 0) / trash.length : 0;
  const bosses = hunt.monsters.reduce((a, id) => a + (monsterById(id)?.xp ?? 0), 0);
  return Math.round(avg * instanceKills(hunt.level) + bosses);
}

/**
 * XP bônus da primeira vitória do dia: o XP cru da instância de novo (com os bônus de bando e
 * de nível, uma instância rende bem mais que isso, então o bônus fica entre ~10% e ~60% dela). Antes era 1/4 de nível,
 * que nos níveis altos valia dezenas de instâncias (o XP por nível cresce bem mais que o das caçadas).
 */
export function instanceDailyXp(hunt: Hunt): number {
  return instanceRunXp(hunt);
}

/** Ouro do Baú da Instância. */
export const instanceChestGold = (level: number) => Math.max(1000, level * 400);

/**
 * Covil (aba Chefes): uma luta por entrada, e quem entra (inclusive pelo "Ir até ele" da party)
 * só enfrenta aquele chefe de novo depois de 16 h, vencendo, morrendo ou saindo.
 */
/** Instâncias: só entra quem tem pelo menos o nível dela menos isto (ninguém é carregado). */
export const BOSS_MIN_LEVEL_GAP = 20;
export const bossMinLevel = (hunt: Pick<Hunt, 'level' | 'boss' | 'lair'>) => (hunt.boss && !hunt.lair ? Math.max(1, hunt.level - BOSS_MIN_LEVEL_GAP) : 0);

/**
 * Covis (aba Chefes): qualquer um entra, mas quem está mais de LAIR_IK_GAP níveis abaixo do covil
 * cai no primeiro golpe (IK). E quem está acima apanha mais: +1x do ataque a cada LAIR_OVER_STEP níveis.
 */
export const LAIR_IK_GAP = 20;
export const LAIR_OVER_STEP = 25;
export const lairIK = (hunt: Pick<Hunt, 'level' | 'lair'>, level: number | undefined) => !!hunt.lair && !!level && level < hunt.level - LAIR_IK_GAP;
export const lairOverMult = (hunt: Pick<Hunt, 'level' | 'lair'>, level: number | undefined) => (hunt.lair && level ? 1 + Math.max(0, level - hunt.level) / LAIR_OVER_STEP : 1);

export const LAIR_COOLDOWN_MS = 16 * 60 * 60_000;
/** Em party, a luta do covil espera este tanto na entrada para o grupo chegar e lutar junto. */
export const LAIR_GATHER_MS = 30_000;

/** Descanso entre as lutas da instância e do covil: metade do normal (o mapa vazio deixava a espera à mostra). */
export const INSTANCE_REST_MULT = 0.5;
export const instanceRest = (hunt: Pick<Hunt, 'boss' | 'lair'>, restMs: number) => (hunt.boss || hunt.lair ? Math.round(restMs * INSTANCE_REST_MULT) : restMs);

/**
 * Pesadelo nas instâncias e nos covis: além do Pesadelo de sempre (+16 níveis, 1,8x XP, 2x drop),
 * monstros e chefes com o dobro de vida e 50% mais de dano. A instância gasta 2 chaves.
 * Libera depois de vencer a versão normal uma vez.
 */
export const BOSS_NIGHTMARE = { hp: 2, attack: 1.5, keys: 2 };
export const isBossNightmare = (hunt: Pick<Hunt, 'boss' | 'lair'>, difficultyId: string) => (!!hunt.boss || !!hunt.lair) && difficultyId === 'nightmare';
