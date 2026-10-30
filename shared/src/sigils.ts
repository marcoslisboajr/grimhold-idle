import { itemById, levelForXp, type Bonus, type Recipe } from './skills.ts';

/**
 * Sigilismo: sigilos são amuletos de alma (feitos com a Colheita de Almas e o eco do
 * bestiário) que somam um bônus pequeno enquanto estão num espaço de sigilo.
 * Os espaços abrem com o nível da skill: 1 no nível 1, 2 no 30 e 3 no 60.
 */
export const SIGIL_SLOT_LEVELS = [1, 30, 60] as const;
export const MAX_SIGILS = SIGIL_SLOT_LEVELS.length;

/** Quantos espaços de sigilo o jogador tem com esse XP de Sigilismo. */
export function sigilSlots(sigilismXp: number): number {
  const level = levelForXp(sigilismXp, 'sigilism');
  return SIGIL_SLOT_LEVELS.filter((l) => level >= l).length;
}

const SIGIL_STATS = ['attack', 'defense', 'hp', 'crit', 'lifesteal', 'speed', 'regen', 'mana'] as const;

/** Bônus dos sigilos colocados, somado ao do equipamento. */
export function withSigils(bonus: Bonus, sigils: (string | null)[] = []): Bonus {
  const total: Bonus = { ...bonus };
  for (const id of sigils) {
    const sigil = id ? itemById(id)?.sigil : undefined;
    if (!sigil) continue;
    for (const k of SIGIL_STATS) if (sigil[k]) total[k] = (total[k] ?? 0) + sigil[k]!;
  }
  return total;
}

/** A receita pede o eco do bestiário: abates da criatura que ainda faltam (0 = pode fazer). */
export function killsMissing(recipe: Recipe, bestiary: Record<string, number>): number {
  if (!recipe.kills) return 0;
  return Math.max(0, recipe.kills.count - (bestiary[recipe.kills.monster] ?? 0));
}
