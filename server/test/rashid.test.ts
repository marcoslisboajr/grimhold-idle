import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { isRashidItem, rashidPrice, itemValue } from '@grimhold/shared';

function setup(bank: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const accId = db.accountForToken(db.createGuest())!;
  const ch = db.createCharacter(accId, 'TreasureHunter', 'warrior');
  db.applyGains(ch.id, { actions: 0, items: bank, xp: {} }, 0, 0);
  const game = createGame(db);
  return { db, game, id: ch.id };
}

test('rashid: validação de itens aceitos', () => {
  // Aceita joias, troféus e lendários
  assert.equal(isRashidItem('silver_necklace'), true);
  assert.equal(isRashidItem('iron_ring'), true);
  assert.equal(isRashidItem('hunter_trophy_bronze'), true);
  assert.equal(isRashidItem('vampire_cloak'), true); // drop com nome, nível 64
  assert.equal(isRashidItem('mithril_armor'), false); // forjada: vai ao Mercador
  assert.equal(isRashidItem('steel_armor'), false); // Nível 25 (< 30)

  // Rejeita materiais comuns e itens básicos de nível baixo
  assert.equal(isRashidItem('copper_ore'), false);
  assert.equal(isRashidItem('bronze_sword'), false);
  assert.equal(isRashidItem('bone'), false);
});

test('rashid: paga +35% a mais em relação ao Mercador comum', () => {
  const base = itemValue('silver_necklace');
  const rashid = rashidPrice('silver_necklace');
  assert.equal(rashid, Math.floor(base * 1.35));
  assert.ok(rashid > base);
});

test('rashid: venda credita ouro com bônus e retira o item do banco', () => {
  const { game, id } = setup({ silver_necklace: 2 });
  const priceUnit = rashidPrice('silver_necklace');
  assert.equal(game.sellRashid(id, 'silver_necklace', 2, 0), null);

  const s = game.state(id, 0);
  assert.equal(s.bank.silver_necklace ?? 0, 0);
  assert.equal(s.bank.gold, priceUnit * 2);
  assert.equal(s.stats.rashid_sales, 2);
});

test('rashid: recusa itens não elegíveis', () => {
  const { game, id } = setup({ copper_ore: 10 });
  const err = game.sellRashid(id, 'copper_ore', 10, 0);
  assert.match(err ?? '', /Rashid só compra/);
});

test('rashid: recusa fora da cidade', () => {
  const { game, id } = setup({ silver_necklace: 1 });
  game.start(id, 'combat', 'river_bank:normal', 0);
  const err = game.sellRashid(id, 'silver_necklace', 1, 0);
  assert.match(err ?? '', /Bastião/);
});
