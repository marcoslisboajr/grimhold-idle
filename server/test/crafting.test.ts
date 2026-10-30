import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(vocation: 'warrior' | 'hunter', bank: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Artesã', vocation).id;
  db.applyGains(id, { actions: 0, items: bank, xp: {} }, 0, 0);
  return { db, game, id };
}

test('lenhador: árvore rende toras', () => {
  const { game, id } = setup('hunter');
  assert.equal(game.start(id, 'woodcutting', 'tree', 0), null);
  game.settle(id, 6_000);
  assert.equal(game.state(id, 6_000).bank.logs, 2);
});

test('artesanato: arco curto gasta 3 toras', () => {
  const { game, id } = setup('hunter', { logs: 7 });
  assert.equal(game.start(id, 'crafting', 'wood_bow', 0), null);
  game.settle(id, 60_000);
  const s = game.state(id, 60_000);
  assert.deepEqual(s.bank, { wood_bow: 2, logs: 1 });
  assert.equal(s.activity, null);
});

test('arma de vocação: caçador usa arco, guerreiro não', () => {
  const hunter = setup('hunter', { wood_bow: 1, bronze_sword: 1 });
  assert.equal(hunter.game.equip(hunter.id, 'wood_bow', 0), null);
  assert.equal(hunter.game.equip(hunter.id, 'bronze_sword', 0), 'Sua vocação não usa isso.');
  const warrior = setup('warrior', { wood_bow: 1 });
  assert.equal(warrior.game.equip(warrior.id, 'wood_bow', 0), 'Sua vocação não usa isso.');
});
