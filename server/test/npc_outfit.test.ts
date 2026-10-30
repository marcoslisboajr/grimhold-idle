import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, npcBuys } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('Mercador não compra as roupas de profissão (nem item de quest), mas compra ferramenta', () => {
  const outfits = ITEMS.filter((i) => i.outfit);
  assert.ok(outfits.length >= 24);
  for (const o of outfits) assert.equal(npcBuys(o.id), false, o.id);
  assert.equal(npcBuys('bronze_pickaxe'), true);
  assert.equal(npcBuys('master_multitool'), false);
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Artesao', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { outfit_artisan_head: 1 }, xp: {} }, 1, 0);
  assert.match(game.sellNpc(id, 'outfit_artisan_head', 1, 2) ?? '', /não compra/);
  assert.equal(db.bankFor(id).outfit_artisan_head, 1);
});

test('Mercador não compra a Ficha do Chefe (nem no vender vários)', () => {
  assert.equal(npcBuys('boss_token'), false);
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Fichas', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { boss_token: 40, bronze_pickaxe: 1 }, xp: {} }, 1, 0);
  assert.match(game.sellNpc(id, 'boss_token', 40, 2) ?? '', /não compra/);
  assert.match(game.sellNpcMany(id, { boss_token: 40, bronze_pickaxe: 1 }, 3) ?? '', /não compra/);
  assert.equal(db.bankFor(id).boss_token, 40);
});
