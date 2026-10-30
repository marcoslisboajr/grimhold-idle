/**
 * Loja de Votos: cada voto no TopIdle dá 2 Moedas de Voto (item preso ao personagem:
 * não vende no Mercador nem vai ao Mercado). A loja troca moedas por stamina, XP em
 * dobro e o Baú de Votos.
 */

export const VOTE_COIN = 'vote_coin';
/** Moedas por voto. */
export const VOTE_COINS_PER_VOTE = 2;
/** Página de voto do jogo no TopIdle; `playerIdentifier` já vem preenchido com o nome. */
export const TOPIDLE_VOTE_URL = 'https://topidle.com/jogo/grimhold-idle-698704';
export const topidleVoteUrl = (name: string) => `${TOPIDLE_VOTE_URL}?playerIdentifier=${encodeURIComponent(name)}&votar=1`;

/** O TopIdle libera um voto a cada 24 h: depois disso o botão Votar volta a chamar atenção. */
export const VOTE_EVERY_MS = 24 * 3_600_000;

/** Mascote e trajes exclusivos da Loja de Votos (enfeite, sem bônus; uma vez cada). */
export const VOTE_PET = 'pet_vote_phoenix';
export const VOTE_PET_PRICE = 20;
export const VOTE_OUTFITS = ['vote_herald', 'vote_shadow', 'vote_frost', 'vote_ember', 'vote_druid'] as const;
export const VOTE_OUTFIT_PRICE = 30;

export type VoteShopItem = 'stamina' | 'chest' | 'xp';

export const VOTE_SHOP: Record<VoteShopItem, { price: number; ms?: number }> = {
  stamina: { price: 3, ms: 2 * 3_600_000 },
  chest: { price: 5 },
  xp: { price: 7, ms: 3_600_000 },
};

/** Baú de Votos: ouro sempre, mais um bônus sorteado; às vezes o prêmio raro (tudo junto). */
export const VOTE_CHEST = {
  /** Ouro = nível de combate × isto (mínimo `goldMin`). */
  goldPerLevel: 200,
  goldMin: 1000,
  staminaMs: 3_600_000,
  xpMs: 30 * 60_000,
  /** Refeições de tier alto: sai uma delas, nesta quantidade. */
  meals: ['cooked_shark', 'cooked_eel', 'cooked_tuna'],
  mealQty: 5,
  /** Chance do prêmio raro: o ouro vezes `rareGoldMult` e os três bônus de uma vez. */
  rareChance: 0.03,
  rareGoldMult: 5,
};

export type VoteChestBonus = 'stamina' | 'xp' | 'meal';

export interface VoteChestRoll {
  gold: number;
  rare: boolean;
  bonuses: VoteChestBonus[];
  meal: string;
}

/** Sorteia o baú. `rand` devolve [0, 1) (o servidor passa Math.random; os testes, uma sequência). */
export function rollVoteChest(combatLevel: number, rand: () => number): VoteChestRoll {
  const rare = rand() < VOTE_CHEST.rareChance;
  const base = Math.max(VOTE_CHEST.goldMin, combatLevel * VOTE_CHEST.goldPerLevel);
  const all: VoteChestBonus[] = ['stamina', 'xp', 'meal'];
  const bonuses = rare ? all : [all[Math.floor(rand() * all.length) % all.length]];
  const meal = VOTE_CHEST.meals[Math.floor(rand() * VOTE_CHEST.meals.length) % VOTE_CHEST.meals.length];
  return { gold: rare ? base * VOTE_CHEST.rareGoldMult : base, rare, bonuses, meal };
}
