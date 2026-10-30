import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function two() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const buyer = db.createCharacter(db.accountForToken(db.createGuest())!, 'Compra', 'arcanist').id;
  const seller = db.createCharacter(db.accountForToken(db.createGuest())!, 'Vende', 'warrior').id;
  db.applyGains(buyer, { actions: 0, items: { gold: 10_000 }, xp: {} }, 0, 0);
  db.applyGains(seller, { actions: 0, items: { rune_stone: 300 }, xp: {} }, 0, 0);
  return { db, game, buyer, seller };
}

test('buy offer: o ouro fica reservado, quem tem o item vende parcial e recebe na hora', () => {
  const { db, game, buyer, seller } = two();
  assert.match(game.marketOffer(buyer, 'rune_stone', 5000, 10, 0)!, /Ouro insuficiente/);
  assert.equal(game.marketOffer(buyer, 'rune_stone', 500, 10, 0), null);
  assert.equal(game.state(buyer, 0).bank.gold, 5_000, 'reservou 500 x 10');
  const offer = db.offers()[0];
  assert.equal(offer.buyer, 'Compra');
  assert.match(game.marketFill(buyer, offer.id, 1, 0).error!, /é sua/);
  assert.match(game.marketFill(seller, offer.id, 400, 0).error!, /não tem tudo/);
  assert.equal(game.marketFill(seller, offer.id, 300, 0).error, null);
  assert.equal(game.state(seller, 0).bank.gold, 3_000);
  assert.equal(game.state(seller, 0).bank.rune_stone, undefined);
  assert.equal(game.state(buyer, 0).bank.rune_stone, 300);
  assert.equal(db.offers()[0].qty, 200, 'sobra o resto da oferta');
  // Cancelar devolve só o ouro do que faltava.
  assert.match(game.marketOfferCancel(seller, offer.id, 0)!, /não é sua/);
  assert.equal(game.marketOfferCancel(buyer, offer.id, 0), null);
  assert.equal(game.state(buyer, 0).bank.gold, 7_000);
  assert.equal(db.offers().length, 0);
  assert.match(game.marketOffer(buyer, 'gold', 1, 1, 0)!, /não se compra/);
});
