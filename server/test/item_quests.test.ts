import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE, arenaNode } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(level: number) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Teste', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
  return { db, game, id: c.id };
}

test('quest de item: provação só no passo certo; vencer conta o passo; o final dá o item único e o traje', () => {
  const { db, game, id } = setup(110);
  assert.match(game.startArena(id, 'trial_delrith', 0)!, /passo certo/);
  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 0), null);
  db.addStoryProgress(id, 'demon_slayer', 150);
  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 0), null);
  db.addStoryProgress(id, 'demon_slayer', 25);
  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 0), null);
  // Passo da provação: ainda não dá para pegar a recompensa.
  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 0), 'Ainda falta cumprir o pedido.');
  assert.ok(!game.state(id, 0).unlockedOutfits?.includes('demon_slayer'), 'traje de quest não vem de graça');

  assert.equal(game.startArena(id, 'trial_delrith', 0), null);
  assert.equal(db.activityFor(id)?.node, arenaNode('trial_delrith'));
  game.settle(id, 10 * 60_000);
  assert.equal(db.activityFor(id), null, 'sai da provação ao vencer');
  assert.equal(db.storiesFor(id).find((s) => s.id === 'demon_slayer')?.progress, 1);
  assert.match(game.startArena(id, 'trial_delrith', 10 * 60_000)!, /passo certo/, 'não repete a provação');

  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 10 * 60_000), null);
  const st = game.state(id, 10 * 60_000);
  assert.equal(st.bank.silverlight, 1);
  assert.ok(st.unlockedOutfits?.includes('demon_slayer'));
  assert.ok(!st.unlockedOutfits?.includes('annihilator'));
  assert.ok(game.takeAnnouncements().some((m) => m.includes('O Caçador de Demônios')), 'anuncia no chat');
});

test('quest de item: Dragon Slayer pede o Selo do Dragão antes', () => {
  const { game, id } = setup(70);
  assert.match(game.storyChoose(id, 'dragon_slayer', 0, 0)!, /O Selo do Dragão/);
});

test('quest: passo de "obter" aceita o que já estava no depósito', () => {
  const { db, game, id } = setup(55);
  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 0), null);
  db.addStoryProgress(id, 'demon_slayer', 150);
  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 0), null);
  // Barras feitas antes do passo começar.
  db.applyGains(id, { actions: 0, items: { iron_bar: 25 }, xp: {} }, 0, 0);
  assert.equal(game.storyChoose(id, 'demon_slayer', 0, 0), null);
});
