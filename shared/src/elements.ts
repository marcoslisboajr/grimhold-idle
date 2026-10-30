/**
 * Elementos (como no Tibia): cada monstro pode ser fraco ou resistente a alguns.
 * O dano do personagem tem uma parte física e, se a arma, a flecha, a magia ou a
 * runa tiver elemento, uma parte elemental. Só a parte do elemento muda: fraco
 * leva ELEMENT_WEAK vezes, resistente ELEMENT_RESIST vezes. 'physical' na
 * resistência vale para a parte física (golens, pedras, fantasmas).
 */
export type Element = 'fire' | 'water' | 'earth' | 'energy' | 'holy' | 'death';

export const ELEMENT_LIST: Element[] = ['fire', 'water', 'earth', 'energy', 'holy', 'death'];

export const ELEMENTS: Record<Element, { pt: string; en: string; color: string; icon: string }> = {
  fire: { pt: 'Fogo', en: 'Fire', color: '#ff7a3a', icon: 'element_fire' },
  water: { pt: 'Água', en: 'Water', color: '#5ac8ff', icon: 'element_water' },
  earth: { pt: 'Terra', en: 'Earth', color: '#7dd96b', icon: 'element_earth' },
  energy: { pt: 'Energia', en: 'Energy', color: '#c27bff', icon: 'element_energy' },
  holy: { pt: 'Sagrado', en: 'Holy', color: '#ffe066', icon: 'element_holy' },
  death: { pt: 'Morte', en: 'Death', color: '#9a8cff', icon: 'element_death' },
};

export const ELEMENT_WEAK = 1.25;
export const ELEMENT_RESIST = 0.75;

/** Fraquezas e resistências de quem apanha. */
export interface ElementTraits {
  weak?: Element[];
  resist?: (Element | 'physical')[];
  /** Resistência em fração (personagem, dos anéis e colares): 0,2 = -20% do dano daquele elemento. */
  resistPct?: Partial<Record<Element, number>>;
}

/** Chave do atributo de resistência de cada elemento nos equipamentos. */
export const RESIST_KEY = {
  fire: 'resFire',
  water: 'resWater',
  earth: 'resEarth',
  energy: 'resEnergy',
  holy: 'resHoly',
  death: 'resDeath',
} as const satisfies Record<Element, string>;
export type ResistKey = (typeof RESIST_KEY)[Element];
/** Teto da resistência de um elemento e da redução de todo dano. */
export const RESIST_CAP = 0.5;
export const REDUCTION_CAP = 0.25;
/** Fração do golpe do monstro que é do elemento dele (o primeiro que ele resiste); o resto é físico. */
export const MONSTER_ELEMENT_SHARE = 0.5;

/** Quanto o dano daquele tipo rende contra este alvo. */
export function elementMult(target: ElementTraits, kind: Element | 'physical'): number {
  if (kind !== 'physical' && target.weak?.includes(kind)) return ELEMENT_WEAK;
  const pct = kind !== 'physical' ? (target.resistPct?.[kind] ?? 0) : 0;
  const cut = Number.isFinite(pct) ? 1 - Math.max(0, Math.min(RESIST_CAP, pct)) : 1;
  if (target.resist?.includes(kind)) return ELEMENT_RESIST * cut;
  return cut;
}

/** Elemento do ataque do monstro: o primeiro que ele resiste (o demônio de fogo bate fogo). */
export function monsterAttackElement(m: ElementTraits): Element | undefined {
  return m.resist?.find((e): e is Element => e !== 'physical');
}
