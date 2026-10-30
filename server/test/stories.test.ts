import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORIES, XP_TABLE, itemById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(level: number) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Teste', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
  return { db, game, id: c.id };
}

test('histórias: todo passo leva a um passo ou final que existe, e os prêmios são itens reais', () => {
  for (const s of STORIES) {
    s.steps.forEach((step, i) => {
      assert.ok(step.choices.length > 0, `${s.id} passo ${i} sem escolha`);
      for (const c of step.choices) {
        if (c.next !== undefined) assert.ok(s.steps[c.next], `${s.id}: passo ${c.next}`);
        else assert.ok(s.endings[c.ending!], `${s.id}: final ${c.ending}`);
      }
    });
    for (const e of Object.values(s.endings)) for (const item of Object.keys(e.reward.items ?? {})) assert.ok(itemById(item), item);
  }
});

test('história: nível, pedido do passo, escolha que muda o caminho e o final com prêmio único', () => {
  const low = setup(2);
  assert.equal(low.game.storyChoose(low.id, 'ravine_shadow', 0, 0), 'Precisa de nível 5 de combate.');

  const { db, game, id } = setup(6);
  assert.equal(game.storyChoose(id, 'ravine_shadow', 0, 0), null); // aceita
  assert.equal(game.storyChoose(id, 'ravine_shadow', 0, 0), 'Ainda falta cumprir o pedido.');
  // Caçar goblins conta para o passo.
  db.addStoryProgress(id, 'ravine_shadow', 20);
  assert.equal(game.storyChoose(id, 'ravine_shadow', 0, 0), null); // leva o broche a Hellel
  assert.equal(game.storyChoose(id, 'ravine_shadow', 1, 0), null); // escolhe avisar a guarda
  assert.equal(game.state(id, 0).stories[0].step, 4);
  db.applyGains(id, { actions: 0, items: { leather: 25 }, xp: {} }, 0, 0);
  db.addStoryProgress(id, 'ravine_shadow', 25);
  assert.equal(game.storyChoose(id, 'ravine_shadow', 0, 0), null);
  const s = game.state(id, 0);
  assert.equal(s.stories[0].status, 'done');
  assert.equal(s.stories[0].ending, 'warden');
  assert.equal(s.bank.warden_boots, 1);
  assert.equal(s.bank.ravine_hood, undefined, 'o outro final não dá o capuz');
  assert.equal(game.storyChoose(id, 'ravine_shadow', 0, 0), 'Essa história já terminou.');
});

test('história: caçar soma no pedido do passo', () => {
  const { game, id } = setup(8);
  game.storyChoose(id, 'ravine_shadow', 0, 0);
  game.start(id, 'combat', 'goblin_den', 0);
  game.settle(id, 20 * 60_000);
  assert.ok(game.state(id, 20 * 60_000).stories[0].progress > 0);
});
