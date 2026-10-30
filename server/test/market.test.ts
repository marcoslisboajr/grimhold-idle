import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const mk = (name: string, bank: Record<string, number>) => {
    const id = db.createCharacter(db.accountForToken(db.createGuest())!, name, 'warrior').id;
    db.applyGains(id, { actions: 0, items: bank, xp: {} }, 0, 0);
    return id;
  };
  return { db, game, seller: mk('Vendedora', { bronze_bar: 10 }), buyer: mk('Compradora', { gold: 100 }) };
}

test('mercado: vende, compra parte e o ouro vai pro vendedor', () => {
  const { db, game, seller, buyer } = setup();
  assert.equal(game.marketList(seller, 'bronze_bar', 6, 7, 0), null);
  assert.equal(db.bankFor(seller).bronze_bar, 4, 'saiu do banco ao anunciar');
  const [listing] = db.listings();
  assert.deepEqual([listing.seller, listing.qty, listing.price], ['Vendedora', 6, 7]);

  assert.equal(game.marketBuy(buyer, listing.id, 4, 0).error, null);
  assert.deepEqual(db.bankFor(buyer), { bronze_bar: 4, gold: 72 });
  assert.equal(db.bankFor(seller).gold, 28);
  assert.equal(db.listings()[0].qty, 2);
});

test('mercado: recusa ouro curto, oferta própria e quantidade a mais', () => {
  const { db, game, seller, buyer } = setup();
  game.marketList(seller, 'bronze_bar', 10, 50, 0);
  const id = db.listings()[0].id;
  assert.equal(game.marketBuy(buyer, id, 3, 0).error, 'Ouro insuficiente.');
  assert.equal(game.marketBuy(seller, id, 1, 0).error, 'Essa oferta é sua.');
  assert.equal(game.marketBuy(buyer, id, 11, 0).error, 'Só restam 10.');
  assert.equal(game.marketList(seller, 'gold', 1, 1, 0), 'Isso não se vende.');
  assert.equal(game.marketList(buyer, 'bronze_bar', 1, 1, 0), 'Você não tem tudo isso.');
});

test('mercado: cancelar devolve ao banco', () => {
  const { db, game, seller, buyer } = setup();
  game.marketList(seller, 'bronze_bar', 10, 5, 0);
  const id = db.listings()[0].id;
  assert.equal(game.marketCancel(buyer, id, 0), 'Essa oferta não é sua.');
  assert.equal(game.marketCancel(seller, id, 0), null);
  assert.equal(db.bankFor(seller).bronze_bar, 10);
  assert.equal(db.listings().length, 0);
});

test('mercador: compra pelo valor fixo; produzido vale os materiais + 20%', async () => {
  const { itemValue } = await import('@grimhold/shared');
  assert.equal(itemValue('copper_ore'), 2);
  assert.equal(itemValue('bronze_bar'), 5, '(2 + 2) * 1.2');
  assert.equal(itemValue('bronze_sword'), 6, '5 * 1.2');
  const { db, game, seller } = setup();
  assert.equal(game.sellNpc(seller, 'bronze_bar', 4, 0), null);
  assert.deepEqual(db.bankFor(seller), { bronze_bar: 6, gold: 20 });
  assert.equal(game.sellNpc(seller, 'bronze_bar', 7, 0), 'Você não tem tudo isso.');
  assert.equal(game.sellNpc(seller, 'gold', 1, 0), 'O Mercador não compra isso.');
});

test('cidade: caçando não dá para negociar nem vender ao Mercador', () => {
  const { db, game, seller } = setup();
  db.applyGains(seller, { actions: 0, items: {}, xp: { combat: 10_000 } }, 0, 0);
  assert.equal(game.start(seller, 'combat', 'river_bank', 0), null);
  const msg = 'Você está caçando. Volte ao Bastião para negociar.';
  assert.equal(game.marketList(seller, 'bronze_bar', 1, 5, 1000), msg);
  assert.equal(game.sellNpc(seller, 'bronze_bar', 1, 1000), msg);
  game.stop(seller, 2000);
  assert.equal(game.sellNpc(seller, 'bronze_bar', 1, 2000), null, 'de volta à cidade');
});

test('item trancado não vende no Mercador nem vai ao Mercado', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Cuidadoso', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { bone: 10 }, xp: {} }, 0, 0);
  assert.equal(game.lockItem(id, 'bone', true), null);
  assert.deepEqual(game.state(id, 0).lockedItems, ['bone']);
  assert.match(game.sellNpc(id, 'bone', 1, 0) ?? '', /trancado/);
  assert.match(game.sellNpcMany(id, { bone: 1 }, 0) ?? '', /trancado/);
  assert.match(game.marketList(id, 'bone', 1, 10, 0) ?? '', /trancado/);
  game.lockItem(id, 'bone', false);
  assert.equal(game.sellNpc(id, 'bone', 1, 0), null);
});

test('mercado: anúncio vencido (7 dias) volta ao depósito do vendedor', async () => {
  const { LISTING_MS } = await import('@grimhold/shared');
  const { openDb } = await import('../src/db.ts');
  const db = openDb(':memory:');
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Vendedora', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { iron_bar: 10 }, xp: {} }, 0, 0);
  assert.equal(db.createListing(id, 'iron_bar', 10, 50, 0), null);
  assert.equal(db.bankFor(id).iron_bar ?? 0, 0);
  assert.equal(db.expireListings(LISTING_MS - 1000 - LISTING_MS).length, 0, 'ainda vale (a varredura passa agora - LISTING_MS)');
  assert.equal(db.expireListings(1).length, 1);
  assert.equal(db.bankFor(id).iron_bar, 10, 'voltou');
});
