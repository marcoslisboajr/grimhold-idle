import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHOPS, itemById, itemValue, shopPrice } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(gold: number) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Freguesa', 'hunter').id;
  db.applyGains(id, { actions: 0, items: { gold }, xp: {} }, 0, 0);
  return { game, id };
}

test('lojas: tudo que vendem é equipamento, runa ou poção que existe', () => {
  for (const list of Object.values(SHOPS)) {
    for (const id of list) assert.ok(itemById(id)?.equip ?? itemById(id)?.rune ?? itemById(id)?.potion ?? itemById(id)?.food ?? itemById(id)?.manaPotion, id);
  }
});

test('lojas: compra cobra o preço, entrega o item e recusa sem ouro', () => {
  const price = shopPrice('wood_bow');
  const { game, id } = setup(price * 2);
  assert.equal(game.buyNpc(id, 'wood_bow', 2, 0), null);
  assert.deepEqual(game.state(id, 0).bank, { wood_bow: 2 });
  assert.equal(game.buyNpc(id, 'wood_bow', 1, 0), 'Ouro insuficiente.');
  assert.equal(game.buyNpc(id, 'crypt_key', 1, 0), 'Ninguém vende isso aqui.');
});

test('lojas: só na cidade', () => {
  const { game, id } = setup(10_000);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  assert.notEqual(game.buyNpc(id, 'wood_bow', 1, 1000), null);
});

test('lojas: runas em quantidade (até 1000), equipamento até 100', () => {
  const price = shopPrice('spark_rune');
  const { game, id } = setup(price * 500);
  assert.equal(game.buyNpc(id, 'spark_rune', 500, 0), null);
  assert.equal(game.state(id, 0).bank.spark_rune, 500);
  assert.equal(game.buyNpc(id, 'spark_rune', 1001, 0), 'Quantidade inválida.');
  assert.equal(game.buyNpc(id, 'wood_bow', 101, 0), 'Quantidade inválida.');
});

test('mercador: venda em lote paga tudo de uma vez; se faltar um item, não vende nada', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Vendedora', 'hunter').id;
  db.applyGains(id, { actions: 0, items: { bone: 7, leather: 3, wood_bow: 1 }, xp: {} }, 0, 0);
  const worth = itemValue('bone') * 7 + itemValue('leather') * 3;
  assert.equal(game.sellNpcMany(id, { bone: 7, leather: 9 }, 0), 'Você não tem tudo isso.');
  assert.equal(game.state(id, 0).bank.bone, 7, 'nada vendido');
  assert.equal(game.sellNpcMany(id, { gold: 1 }, 0), 'O Mercador não compra isso.');
  assert.equal(game.sellNpcMany(id, { bone: 7, leather: 3 }, 0), null);
  assert.deepEqual(game.state(id, 0).bank, { wood_bow: 1, gold: worth });
});

test('valdemar colecionador: troca 50 fichas do chefe por peças do set ou bolsas de armas', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Colecionadora', 'hunter').id;
  db.applyGains(id, { actions: 0, items: { boss_token: 100 }, xp: {} }, 0, 0);

  // Compra uma peça do set
  assert.equal(game.buyBossToken(id, 'ancient_helm', 0), null);
  assert.equal(game.state(id, 0).bank.boss_token, 50);
  assert.equal(game.state(id, 0).bank.ancient_helm, 1);

  // Compra uma bolsa de armas
  assert.equal(game.buyBossToken(id, 'abyss_weapon_pouch', 0), null);
  assert.equal(game.state(id, 0).bank.boss_token ?? 0, 0);
  assert.equal(game.state(id, 0).bank.abyss_weapon_pouch, 1);

  // Sem fichas suficientes
  assert.match(game.buyBossToken(id, 'tide_armor', 0) ?? '', /Fichas do Chefe insuficientes/);

  // Item não vendido
  assert.equal(game.buyBossToken(id, 'iron_sword', 0), 'O Colecionador não vende este item.');
});
