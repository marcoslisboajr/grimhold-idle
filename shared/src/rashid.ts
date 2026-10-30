import { itemById, itemValue, splitRarity, RECIPES } from './skills.ts';

export const RASHID_BONUS = 1.35; // +35% de valor

/** Verifica se o item é aceito pelo Rashid (drops raros, joias, troféus e equipamentos de nível 30+). */
export function isRashidItem(rawId: string): boolean {
  const { base } = splitRarity(rawId);
  const it = itemById(base);
  if (!it) return false;
  if (it.questItem) return false;
  // Só loot: o que sai de receita (forja, artesanato...) vai ao Mercador. Senão forjar e vender
  // ao Rashid rendia 1,62x o material (1,2x da receita vezes 1,35x dele).
  if (Object.values(RECIPES).some((list) => list.some((r) => r.output === base))) return false;

  // Troféus de caça
  if (base.startsWith('hunter_trophy_')) return true;

  // Joias (anéis e amuletos)
  if (it.equip?.slot === 'ring' || it.equip?.slot === 'amulet') return true;

  // Drops lendários e raros com nome
  if (it.legendary) return true;

  // Equipamentos de tier intermediário ou alto (nível 30+)
  if (it.equip && it.equip.level >= 30) return true;

  return false;
}

/** Preço especial pago pelo Rashid (+35% do valor do Mercador). */
export function rashidPrice(rawId: string): number {
  const basePrice = itemValue(rawId);
  return Math.floor(basePrice * RASHID_BONUS);
}
