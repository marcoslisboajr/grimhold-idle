import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, runCycle, playerStats, XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(level: number) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Teste', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
  return { db, game, id: c.id };
}

test('quest de acesso: o Labirinto só abre depois da quest, e o baú é escolhido uma vez', () => {
  const { db, game, id } = setup(30);
  assert.match(game.start(id, 'combat', 'minotaur_maze', 0)!, /A Passagem do Minotauro/);

  assert.equal(game.storyChoose(id, 'minotaur_pass', 0, 0), null);
  db.applyGains(id, { actions: 0, items: { torn_map: 4 }, xp: {} }, 0, 0);
  db.addStoryProgress(id, 'minotaur_pass', 4);
  assert.equal(game.storyChoose(id, 'minotaur_pass', 0, 0), null);
  db.addStoryProgress(id, 'minotaur_pass', 40);
  assert.equal(game.storyChoose(id, 'minotaur_pass', 1, 0), null); // baú de couro
  assert.equal(game.storyChoose(id, 'minotaur_pass', 0, 0), 'Essa história já terminou.');

  const s = game.state(id, 0);
  const story = s.stories.find((x) => x.id === 'minotaur_pass')!;
  assert.equal(story.ending, 'leather_chest');
  assert.deepEqual(story.history, [0, 1, 2]);
  assert.equal(s.bank['steel_crossbow+2'], 1);
  assert.equal(s.bank['steel_axe+2'] ?? 0, 0);
  assert.equal(game.start(id, 'combat', 'minotaur_maze', 0), null);
});

test('item de quest: não se vende ao Mercador nem no Mercado', () => {
  const { db, game, id } = setup(30);
  db.applyGains(id, { actions: 0, items: { torn_map: 2 }, xp: {} }, 0, 0);
  assert.equal(game.sellNpc(id, 'torn_map', 1, 0), 'O Mercador não compra isso.');
  assert.equal(game.marketList(id, 'torn_map', 1, 10, 0), 'Isso não se vende.');
});

test('drop de quest: o Pedaço do Mapa só cai com a quest no passo certo', () => {
  const hunt = HUNTS.find((h) => h.id === 'ashfen_barracks')!;
  const player = playerStats('warrior', XP_TABLE[40]);
  const count = (questSteps: Record<string, number>) => {
    let n = 0;
    for (let seq = 0; seq < 400; seq++) n += runCycle(hunt, player, 5, seq, undefined, 1, questSteps).loot.torn_map ?? 0;
    return n;
  };
  assert.equal(count({}), 0);
  assert.equal(count({ minotaur_pass: 0 }), 0);
  assert.ok(count({ minotaur_pass: 1 }) > 0);
  // A quest não muda o resto da luta (mesmo XP).
  assert.equal(runCycle(hunt, player, 5, 7).xp, runCycle(hunt, player, 5, 7, undefined, 1, { minotaur_pass: 1 }).xp);
});

test('quest de acesso e addons: Fossa Abissal e Cripta Vampírica destravam com suas quests e liberam addons', () => {
  const { db, game, id } = setup(65);

  // Fossa Abissal bloqueada inicialmente
  assert.match(game.start(id, 'combat', 'abyssal_trench', 0)!, /A Chave Abissal/);
  // Cumpre a quest da Chave Abissal
  assert.equal(game.storyChoose(id, 'abyssal_key_quest', 0, 0), null);
  db.applyGains(id, { actions: 0, items: { abyssal_pearl: 4 }, xp: {} }, 0, 0);
  db.addStoryProgress(id, 'abyssal_key_quest', 4);
  assert.equal(game.storyChoose(id, 'abyssal_key_quest', 0, 0), null);
  db.applyGains(id, { actions: 0, items: { mithril_bar: 5 }, xp: {} }, 0, 0);
  db.addStoryProgress(id, 'abyssal_key_quest', 5);
  assert.equal(game.storyChoose(id, 'abyssal_key_quest', 0, 0), null); // baú de ferro
  // Agora Fossa Abissal abre
  assert.equal(game.start(id, 'combat', 'abyssal_trench', 0), null);
  game.stop(id, 0);

  // Cripta Vampírica bloqueada inicialmente
  assert.match(game.start(id, 'combat', 'vampire_crypt', 0)!, /O Sangue Antigo/);
  assert.equal(game.storyChoose(id, 'vampire_blood_quest', 0, 0), null);
  db.applyGains(id, { actions: 0, items: { vampire_blood: 4 }, xp: {} }, 0, 0);
  db.addStoryProgress(id, 'vampire_blood_quest', 4);
  assert.equal(game.storyChoose(id, 'vampire_blood_quest', 0, 0), null);
  db.applyGains(id, { actions: 0, items: { dark_essence: 12 }, xp: {} }, 0, 0);
  db.addStoryProgress(id, 'vampire_blood_quest', 12);
  assert.equal(game.storyChoose(id, 'vampire_blood_quest', 0, 0), null); // baú de ferro

  // Agora Cripta Vampírica abre
  assert.equal(game.start(id, 'combat', 'vampire_crypt', 0), null);

  // O addon 'tophat' foi desbloqueado pela quest
  const state = game.state(id, 0);
  assert.ok(state.unlockedAddons?.includes('tophat'));

  // Itens de quest não vendem
  assert.equal(game.sellNpc(id, 'abyssal_pearl', 1, 0), 'O Mercador não compra isso.');
  assert.equal(game.sellNpc(id, 'vampire_blood', 1, 0), 'O Mercador não compra isso.');
});
