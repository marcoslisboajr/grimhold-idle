import { HUNTS, monsterById } from './combat.ts';

/**
 * Slayer (estilo RuneScape 3): um mestre dá uma tarefa de matar N de uma espécie das caçadas da
 * faixa do jogador. Os abates dão XP de Slayer (além da XP de combate) e, ao terminar, pontos.
 * Plano completo em docs/PLANO_SLAYER.md (loja, Elmo e monstros exclusivos vêm depois).
 */

/** Ids antigos (salvos no banco); os nomes mostrados são próprios do jogo. */
export type SlayerMasterId = 'turael' | 'mazchna' | 'vannaka' | 'chaeldar' | 'duradel' | 'kuradal';

export interface SlayerMaster {
  id: SlayerMasterId;
  name: string;
  nameEn: string;
  /** Nível de combate para pedir tarefa. */
  combatLevel: number;
  /** Faixa do nível dos monstros (nível da caçada comum onde aparecem). */
  monsterRange: [number, number];
  /** Pontos de Slayer por tarefa curta terminada (antes do bônus de sequência); normal ×3, longa ×10. */
  points: number;
}

export const SLAYER_MASTERS: SlayerMaster[] = [
  { id: 'turael', name: 'Bram, o Rastreador', nameEn: 'Bram the Tracker', combatLevel: 1, monsterRange: [1, 40], points: 3 },
  { id: 'mazchna', name: 'Ilsa Corta-Lobo', nameEn: 'Ilsa Wolfcleaver', combatLevel: 40, monsterRange: [30, 90], points: 7 },
  { id: 'vannaka', name: 'Torvald Mão-de-Ferro', nameEn: 'Torvald Ironhand', combatLevel: 80, monsterRange: [70, 140], points: 10 },
  { id: 'chaeldar', name: 'Nyx, a Sombra', nameEn: 'Nyx the Shade', combatLevel: 130, monsterRange: [120, 210], points: 15 },
  { id: 'duradel', name: 'Kael Ossonegro', nameEn: 'Kael Blackbone', combatLevel: 200, monsterRange: [190, 300], points: 22 },
  { id: 'kuradal', name: 'Morwen, a Ceifadora', nameEn: 'Morwen the Reaper', combatLevel: 300, monsterRange: [290, 500], points: 30 },
];

export const slayerMasterById = (id: string) => SLAYER_MASTERS.find((m) => m.id === id);

/**
 * Tamanho da tarefa, escolhido ao pedir: abates e quanto os pontos do mestre multiplicam.
 * 'boss' é a tarefa de chefe: um chefe de covil (3 vitórias) ou de instância (5) da faixa do mestre.
 */
export type SlayerSize = 'short' | 'normal' | 'long' | 'boss';
export const SLAYER_SIZES: Record<SlayerSize, { kills: number; pointsMult: number; name: string; nameEn: string }> = {
  short: { kills: 300, pointsMult: 1, name: 'Curta', nameEn: 'Short' },
  normal: { kills: 1000, pointsMult: 3, name: 'Normal', nameEn: 'Normal' },
  long: { kills: 3000, pointsMult: 10, name: 'Longa', nameEn: 'Long' },
  boss: { kills: 3, pointsMult: 6, name: 'Chefe', nameEn: 'Boss' },
};
/** Vitórias pedidas na tarefa de chefe: covil (uma luta a cada 16 h) e instância. */
export const SLAYER_BOSS_KILLS = { lair: 3, instance: 5 } as const;
/** XP de Slayer de uma vitória sobre chefe: esta quantidade de abates comuns do mesmo nível. */
export const SLAYER_BOSS_XP_MULT = 40;
export const isSlayerSize = (s: unknown): s is SlayerSize => typeof s === 'string' && s in SLAYER_SIZES;

/** Tarefa ativa (ou nenhuma) e o histórico do jogador. */
export interface SlayerState {
  master: SlayerMasterId | null;
  monster: string | null;
  target: number;
  progress: number;
  /** Tarefas terminadas seguidas (cancelar zera). */
  streak: number;
  /** Pontos de Slayer acumulados. */
  points: number;
  /** Tarefas terminadas ao todo. */
  completed: number;
  /** Tamanho da tarefa ativa (null = tarefa antiga, de antes dos tamanhos: pontos ×1 com sequência). */
  size?: SlayerSize | null;
}

export const NO_SLAYER: SlayerState = { master: null, monster: null, target: 0, progress: 0, streak: 0, points: 0, completed: 0 };

/** Caçada comum: sem instância, covil, quest de acesso ou instância de quest. */
const isCommonHunt = (h: (typeof HUNTS)[number]) => !h.boss && !h.lair && !h.requires && !h.quest;

/**
 * Nível de cada espécie para o Slayer: o nível da caçada comum mais baixa onde ela aparece.
 * Espécie que só existe em instância, covil ou caçada com quest não entra em tarefa.
 */
export const SLAYER_MONSTER_LEVEL: Map<string, number> = (() => {
  const out = new Map<string, number>();
  for (const h of HUNTS) {
    if (!isCommonHunt(h)) continue;
    for (const m of h.monsters) {
      const prev = out.get(m);
      if (prev === undefined || h.level < prev) out.set(m, h.level);
    }
  }
  return out;
})();

/**
 * Chefes que podem cair em tarefa de chefe: o de covil e o último da instância (o chefe de verdade),
 * com o nível da caçada. Instância de quest fica de fora.
 */
export const SLAYER_BOSS_LEVEL: Map<string, { level: number; lair: boolean; hunt: string }> = (() => {
  const out = new Map<string, { level: number; lair: boolean; hunt: string }>();
  for (const h of HUNTS) {
    if ((!h.boss && !h.lair) || h.requires || h.quest) continue;
    const id = h.lair ? h.monsters[0] : h.monsters[h.monsters.length - 1];
    if (id && !out.has(id)) out.set(id, { level: h.level, lair: !!h.lair, hunt: h.id });
  }
  return out;
})();

/** XP de Slayer por abate: 3 × nível^1,6 (nível da caçada comum da espécie). */
export function slayerXpPerKill(monsterLevel: number): number {
  return Math.round(3 * Math.pow(Math.max(1, monsterLevel), 1.6));
}

/** Espécies da faixa do mestre, com o nível de cada uma. */
export function slayerCandidates(master: SlayerMaster): { monster: string; level: number }[] {
  const [lo, hi] = master.monsterRange;
  const out: { monster: string; level: number }[] = [];
  for (const [monster, level] of SLAYER_MONSTER_LEVEL) {
    if (level >= lo && level <= hi && monsterById(monster)) out.push({ monster, level });
  }
  return out;
}

/** A tarefa só pede espécies de caçadas até o nível de combate do jogador mais isto. */
export const SLAYER_LEVEL_SLACK = 10;

/** Peso no sorteio: maior para espécies de nível perto do nível de combate do jogador. */
export function slayerWeight(monsterLevel: number, combatLevel: number): number {
  return 1 / Math.pow(1 + Math.abs(monsterLevel - combatLevel) / 20, 2);
}

/**
 * Sorteia a tarefa do mestre: a espécie (peso maior perto do nível) e quantos abates.
 * `rand` devolve [0, 1) (Math.random no servidor; fixo nos testes). Sem espécie na faixa, null.
 */
export function rollSlayerTask(
  master: SlayerMaster,
  combatLevel: number,
  rand: () => number = Math.random,
  exclude?: string | null,
  size: SlayerSize = 'normal',
): { monster: string; target: number } | null {
  let list = slayerCandidates(master);
  if (exclude && list.length > 1) list = list.filter((c) => c.monster !== exclude);
  if (!list.length) return null;
  // Só espécies que o jogador consegue caçar: caçadas até o nível dele + 10 (um nível 1 ganhava
  // tarefa de monstro do 34). Sem nenhuma, a(s) de menor nível da faixa.
  const fit = list.filter((c) => c.level <= combatLevel + SLAYER_LEVEL_SLACK);
  if (fit.length) list = fit;
  else {
    const low = Math.min(...list.map((c) => c.level));
    list = list.filter((c) => c.level === low);
  }
  const weights = list.map((c) => slayerWeight(c.level, combatLevel));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  let pick = list[list.length - 1];
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r < 0) {
      pick = list[i];
      break;
    }
  }
  return { monster: pick.monster, target: SLAYER_SIZES[size].kills };
}

/** Sorteia a tarefa de chefe do mestre (mesmo peso por nível das tarefas comuns). Sem chefe na faixa, null. */
export function rollSlayerBossTask(
  master: SlayerMaster,
  combatLevel: number,
  rand: () => number = Math.random,
  exclude?: string | null,
): { monster: string; target: number } | null {
  const [lo, hi] = master.monsterRange;
  let list = [...SLAYER_BOSS_LEVEL].filter(([id, b]) => b.level >= lo && b.level <= hi && b.level <= combatLevel + SLAYER_LEVEL_SLACK && monsterById(id));
  if (exclude && list.length > 1) list = list.filter(([id]) => id !== exclude);
  if (!list.length) return null;
  const weights = list.map(([, b]) => slayerWeight(b.level, combatLevel));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  let pick = list[list.length - 1];
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r < 0) {
      pick = list[i];
      break;
    }
  }
  return { monster: pick[0], target: pick[1].lair ? SLAYER_BOSS_KILLS.lair : SLAYER_BOSS_KILLS.instance };
}

/** Multiplicador dos pontos pela tarefa de número `n` da sequência (10ª ×5, 50ª ×15, 100ª ×25). */
export function slayerStreakMult(n: number): number {
  if (n > 0 && n % 100 === 0) return 25;
  if (n > 0 && n % 50 === 0) return 15;
  if (n > 0 && n % 10 === 0) return 5;
  return 1;
}

/**
 * Pontos de uma tarefa terminada, sendo ela a `n`-ésima seguida. A curta conta na sequência mas
 * não ganha o bônus (senão vira atalho para os 25×); tarefa antiga (sem tamanho) paga ×1 com bônus.
 */
export function slayerTaskPoints(master: SlayerMaster, n: number, size?: SlayerSize | null): number {
  const base = master.points * (size ? SLAYER_SIZES[size].pointsMult : 1);
  // Curta e de chefe contam na sequência sem o bônus (a de chefe já paga ×6).
  return size === 'short' || size === 'boss' ? base : base * slayerStreakMult(n);
}

/** Mestres que o nível de combate já libera. */
export const slayerMastersFor = (combatLevel: number) => SLAYER_MASTERS.filter((m) => combatLevel >= m.combatLevel);

/**
 * XP de combate extra por abate da tarefa: a XP base do monstro × isto. Forte até o nível 100 de
 * combate (ajuda o começo) e menor depois.
 */
export const slayerCombatXpMult = (combatLevel: number) => (combatLevel < 100 ? 1 : 0.25);

/** Loja de Slayer: equipamento para o começo do jogo, pago com pontos. */
export const SLAYER_SHOP: { item: string; price: number }[] = [
  ...['sword', 'mace', 'bow', 'staff'].map((k) => ({ item: `slayer25_${k}`, price: 20 })),
  ...['helmet', 'armor', 'legs', 'boots'].map((k) => ({ item: `slayer25_${k}`, price: 12 })),
  ...['sword', 'mace', 'bow', 'staff'].map((k) => ({ item: `slayer50_${k}`, price: 60 })),
  ...['helmet', 'armor', 'legs', 'boots'].map((k) => ({ item: `slayer50_${k}`, price: 35 })),
  ...['sword', 'mace', 'bow', 'staff'].map((k) => ({ item: `slayer80_${k}`, price: 140 })),
  ...['helmet', 'armor', 'legs', 'boots'].map((k) => ({ item: `slayer80_${k}`, price: 80 })),
];

/** Boosts comprados com pontos (para os níveis altos): fim de cada um (ms) e o tamanho do de loot. */
export interface SlayerBoosts {
  lootUntil: number;
  /** 0,25 ou 0,5 (0 sem boost). */
  lootMult: number;
  bestiaryUntil: number;
}

export type SlayerBoostId = 'loot25' | 'loot50' | 'bestiary';

/** Cada boost dura 1 hora; comprar de novo o mesmo soma mais 1 hora. */
export const SLAYER_BOOST_MS = 60 * 60 * 1000;

export const SLAYER_BOOSTS: Record<SlayerBoostId, { price: number; name: string; nameEn: string }> = {
  loot25: { price: 40, name: '+25% de loot (1 h)', nameEn: '+25% loot (1 h)' },
  loot50: { price: 100, name: '+50% de loot (1 h)', nameEn: '+50% loot (1 h)' },
  bestiary: { price: 50, name: 'Bestiário em dobro (1 h)', nameEn: 'Double bestiary (1 h)' },
};
