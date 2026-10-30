import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAMINA_MAX_MS, VOTE_CHEST, rollVoteChest } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(coins: number) {
  const db = openDb(':memory:');
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Votante', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { vote_coin: coins }, xp: {} }, 0, 0);
  return { db, id, game: createGame(db) };
}

const seq = (...v: number[]) => () => v.shift() ?? 0;

test('loja de votos: XP em dobro soma 1 h ao que estiver ativo e gasta 7 moedas', () => {
  const { db, id, game } = setup(14);
  const now = 1_000_000;
  assert.equal(game.buyVoteShop(id, 'xp', now).error, undefined);
  assert.equal(db.xpBoostUntil(id), now + 3_600_000);
  game.buyVoteShop(id, 'xp', now + 60_000);
  assert.equal(db.xpBoostUntil(id), now + 7_200_000, 'estende em vez de reiniciar');
  assert.equal(db.bankFor(id).vote_coin ?? 0, 0);
  assert.match(game.buyVoteShop(id, 'xp', now).error ?? '', /Precisa de 7/);
});

test('loja de votos: stamina cheia recusa; com espaço soma 2 h', () => {
  const { db, id, game } = setup(6);
  const now = 1_000_000;
  assert.match(game.buyVoteShop(id, 'stamina', now).error ?? '', /cheia/);
  db.setStamina(id, STAMINA_MAX_MS - 5 * 3_600_000, now);
  assert.equal(game.buyVoteShop(id, 'stamina', now).error, undefined);
  assert.equal(db.staminaFor(id).ms, STAMINA_MAX_MS - 3 * 3_600_000);
  assert.equal(db.bankFor(id).vote_coin, 3);
});

test('baú de votos: ouro pelo nível e o bônus sorteado', () => {
  const { db, id, game } = setup(5);
  // 0.5 = não raro; 0.9 = terceiro bônus (refeição); 0 = primeira refeição da lista.
  const r = game.buyVoteShop(id, 'chest', 1_000_000, seq(0.5, 0.9, 0));
  assert.equal(r.error, undefined);
  assert.equal(db.bankFor(id).gold, VOTE_CHEST.goldMin, 'nível 1 leva o mínimo');
  assert.equal(db.bankFor(id)[VOTE_CHEST.meals[0]], VOTE_CHEST.mealQty);
  assert.match(r.text ?? '', /Baú de Votos/);
});

test('baú de votos: prêmio raro dá tudo e 5x o ouro', () => {
  const roll = rollVoteChest(100, seq(0.01, 0));
  assert.equal(roll.rare, true);
  assert.deepEqual(roll.bonuses, ['stamina', 'xp', 'meal']);
  assert.equal(roll.gold, 100 * VOTE_CHEST.goldPerLevel * VOTE_CHEST.rareGoldMult);
});

test('moeda de voto não vai ao Mercador', () => {
  const { id, game } = setup(5);
  assert.ok(game.sellNpc(id, 'vote_coin', 1, 1_000_000));
});

test('loja de votos: mascote (20) e trajes (30) exclusivos, uma vez cada', () => {
  const { db, id, game } = setup(55);
  assert.equal(game.buyVotePet(id, 1000), null);
  assert.ok(db.petsFor(id).includes('pet_vote_phoenix'));
  assert.match(game.buyVotePet(id, 1000) ?? '', /já tem/);
  assert.match(game.buyVoteOutfit(id, 'walking_chest', 1000) ?? '', /inválido/);
  assert.equal(game.buyVoteOutfit(id, 'vote_frost', 1000), null);
  assert.ok(db.unlockedOutfitsFor(id).includes('vote_frost'));
  assert.equal(db.bankFor(id).vote_coin, 5);
  assert.match(game.buyVoteOutfit(id, 'vote_frost', 1000) ?? '', /já tem/);
  assert.match(game.buyVoteOutfit(id, 'vote_ember', 1000) ?? '', /Precisa de 30/);
});
