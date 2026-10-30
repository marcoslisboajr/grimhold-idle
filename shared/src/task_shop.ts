import { IMBUEMENTS } from './imbuements.ts';
import { HUNTER_RANKS } from './hunting_tasks.ts';

/**
 * Loja de Tarefas do Mestre Adams: troca Pontos de Caça por coisas de caçador.
 * Gastar pontos não derruba a patente: ela segue o total ganho; a loja usa o saldo
 * (ganhos menos `hunting_points_spent`).
 */

/** Curinga de Presa: troca a lista de uma vaga sem ouro (usado antes do ouro). */
export const PREY_WILDCARD = 'prey_wildcard';

export type TaskShopItem = 'prey_wildcard' | 'imbuement_material' | 'charm_points' | 'stamina' | 'xp_boost';

export const TASK_SHOP: Record<TaskShopItem, { price: number; minPoints: number; qty: number }> = {
  prey_wildcard: { price: 10, minPoints: 0, qty: 1 },
  /** 10 unidades de um material de imbuement à escolha. Patente Rastreador. */
  imbuement_material: { price: 25, minPoints: rankMin('Rastreador'), qty: 10 },
  /** Pontos de charm do bestiário. Patente Caçador de Elite. */
  charm_points: { price: 40, minPoints: rankMin('Caçador de Elite'), qty: 5 },
  /** 24/10: +2 h de stamina (até o máximo). */
  stamina: { price: 30, minPoints: 0, qty: 1 },
  /** 24/10: 30 min de XP em dobro (soma ao que já estiver correndo). Patente Rastreador. */
  xp_boost: { price: 60, minPoints: rankMin('Rastreador'), qty: 1 },
};
export const TASK_SHOP_STAMINA_MS = 2 * 3_600_000;
export const TASK_SHOP_XP_BOOST_MS = 30 * 60_000;

/** Predador Lendário paga menos em tudo. */
export const TASK_SHOP_LEGEND_DISCOUNT = 0.2;

function rankMin(name: string): number {
  return HUNTER_RANKS.find((r) => r.name === name)?.minPoints ?? 0;
}

/** 26/10: cada XP em dobro comprado no mesmo dia custa 5x o anterior (era sem limite: dava para comprar o dia todo). */
export const TASK_SHOP_XP_BOOST_GROWTH = 5;

/**
 * Preço para quem já ganhou `totalPoints` na vida (o desconto do Lendário arredonda para cima).
 * `xpBoostsToday`: XP em dobro já comprados hoje (o preço do próximo sobe 5x a cada um).
 */
export function taskShopPrice(item: TaskShopItem, totalPoints: number, xpBoostsToday = 0): number {
  const base = TASK_SHOP[item].price * (item === 'xp_boost' ? TASK_SHOP_XP_BOOST_GROWTH ** xpBoostsToday : 1);
  return totalPoints >= rankMin('Predador Lendário') ? Math.ceil(base * (1 - TASK_SHOP_LEGEND_DISCOUNT)) : base;
}

/** Materiais que algum imbuement usa (o que a loja aceita vender). */
export const IMBUEMENT_MATERIALS: string[] = [...new Set(IMBUEMENTS.flatMap((i) => Object.keys(i.materials)))];
