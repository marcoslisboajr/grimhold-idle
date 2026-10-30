import { blessPrice } from './combat.ts';

/**
 * O Ceifador e o Limiar dos Mortos: quem morre sem bênção numa caçada não perde de vez as
 * peças que caíram. Elas ficam com o Ceifador por REAPER_KEEP_MS, e ele devolve tudo daquela
 * morte de uma vez por um preço (mais caro que a bênção, para a bênção seguir valendo a pena).
 * O personagem acorda no Limiar, onde o Ceifador também vende a bênção.
 */

/** Atividade parada de quem está no Limiar dos Mortos (como a arena do chefe global). */
export const REAPER_NODE = 'limbo';
export const isReaperNode = (node: string | undefined | null) => node === REAPER_NODE;

/** Quanto tempo o Ceifador guarda as peças de uma morte. */
export const REAPER_KEEP_MS = 3 * 24 * 3600_000;
/** O resgate custa isso vezes a bênção do nível. */
export const REAPER_PRICE_MULT = 1.5;
/** Pacotes guardados ao mesmo tempo (os mais velhos saem primeiro). */
export const REAPER_MAX_PACKS = 10;

/** Preço do resgate das peças de uma morte, pelo nível de combate na hora da morte. */
export const reaperPrice = (combatLevel: number) => Math.round(blessPrice(Math.max(1, Math.floor(combatLevel))) * REAPER_PRICE_MULT);

/** Peças de uma morte guardadas pelo Ceifador. */
export interface ReaperPack {
  id: number;
  items: string[];
  price: number;
  diedAt: number;
  expiresAt: number;
}
