import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE, storyById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('O Lamento de Morvhena: errar o enigma leva ao castigo e volta; acertar tudo dá o anel ou o amuleto', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Ouvinte', 'arcanist').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[80] } }, 0, 0);
  const step = () => db.storiesFor(id).find((s) => s.id === 'lirien_lament')!.step;
  const story = storyById('lirien_lament')!;
  assert.ok(story.epic);
  assert.equal(game.storyChoose(id, 'lirien_lament', 0, 0), null);
  // Sinos: "Um fantasma" está errado e leva ao castigo (caçar na cripta), que volta ao enigma.
  assert.equal(game.storyChoose(id, 'lirien_lament', 0, 0), null);
  assert.equal(step(), 2);
  assert.equal(game.storyChoose(id, 'lirien_lament', 0, 0), 'Ainda falta cumprir o pedido.');
  db.addStoryProgress(id, 'lirien_lament', 50);
  assert.equal(game.storyChoose(id, 'lirien_lament', 0, 0), null);
  assert.equal(step(), 1);
  assert.equal(game.storyChoose(id, 'lirien_lament', 1, 0), null, 'o sino');
  assert.equal(game.storyChoose(id, 'lirien_lament', 0, 0), null);
  assert.equal(game.storyChoose(id, 'lirien_lament', 0, 0), null, 'a primeira lápide mente');
  assert.equal(game.storyChoose(id, 'lirien_lament', 0, 0), null);
  // As lágrimas no depósito contam.
  db.applyGains(id, { actions: 0, items: { spectral_tear: 30 }, xp: {} }, 0, 0);
  assert.equal(game.storyChoose(id, 'lirien_lament', 1, 0), null, 'Lirien');
  assert.equal(game.storyChoose(id, 'lirien_lament', 1, 0), null, 'prender: o anel');
  const st = game.state(id, 0);
  assert.equal(st.bank.lirien_ring, 1);
  assert.equal(st.bank.lirien_amulet, undefined);
});
