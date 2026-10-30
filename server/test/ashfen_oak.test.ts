import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, XP_TABLE, equipmentBonus, huntNode, itemById, simulateHunt, storyById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(level: number) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Teste', 'warrior');
  const gear = ['drop120_sword', 'drop120_plate', 'drop120_helmet', 'drop120_legs', 'drop120_shield', 'drop120_boots', 'drop120_amulet', 'drop120_ring'];
  db.applyGains(c.id, { actions: 0, items: { cooked_shark: 3000, ...Object.fromEntries(gear.map((g) => [g, 1])) }, xp: { combat: XP_TABLE[level] } }, 0, 0);
  for (const g of gear) assert.equal(game.equip(c.id, g, 0), null, g);
  return { db, game, id: c.id };
}

const NODE = huntNode('rotten_grove', 'normal', 1);

test('Carvalho de Ashfen: dados da quest, da instância e das três recompensas', () => {
  const story = storyById('ashfen_oak')!;
  assert.ok(story.epic);
  const last = story.steps[story.steps.length - 1];
  assert.deepEqual(last.need?.goal, { kind: 'instance', hunt: 'rotten_grove', count: 1 });
  const hunt = HUNTS.find((h) => h.id === 'rotten_grove')!;
  assert.equal(hunt.quest, 'ashfen_oak');
  assert.ok(hunt.boss && !hunt.key);
  for (const id of ['oak_aegis', 'oak_grimoire', 'oak_quiver']) assert.equal(itemById(id)?.equip?.slot, 'shield', id);
  // A aljava é só do Caçador; o escudo continua valendo para todos (o Caçador também).
  assert.deepEqual(itemById('oak_quiver')?.equip?.vocations, ['hunter']);
  assert.equal(itemById('oak_aegis')?.equip?.vocations, undefined);
  assert.equal(equipmentBonus({ shield: 'oak_quiver' }).arrowSave, 0.123); // peça de chefe: base +45% (especiais +22,5%)
});

test('instância de quest: só abre no passo certo, vence uma vez, conta o passo e não dá o baú do dia', () => {
  const { db, game, id } = setup(130);
  assert.match(game.start(id, 'combat', NODE, 0)!, /passo certo/);
  // Hellel, a Fenra e os óleos.
  assert.equal(game.storyChoose(id, 'ashfen_oak', 0, 0), null);
  db.addStoryProgress(id, 'ashfen_oak', 1);
  assert.equal(game.storyChoose(id, 'ashfen_oak', 0, 0), null);
  db.applyGains(id, { actions: 0, items: { purifying_oil: 10 }, xp: {} }, 0, 0);
  assert.equal(game.storyChoose(id, 'ashfen_oak', 0, 0), null);
  assert.equal(game.storyChoose(id, 'ashfen_oak', 0, 0), 'Ainda falta cumprir o pedido.');
  assert.match(game.start(id, 'combat', huntNode('rotten_grove', 'nightmare', 1), 0)!, /Pesadelo/);

  assert.equal(game.start(id, 'combat', NODE, 0), null);
  const { gains } = game.settle(id, 24 * 3_600_000);
  assert.equal(gains.cleared, 'rotten_grove');
  assert.equal(gains.instanceDaily, undefined, 'sem baú do dia');
  assert.equal(db.storiesFor(id).find((s) => s.id === 'ashfen_oak')?.progress, 1);
  assert.match(game.start(id, 'combat', NODE, 24 * 3_600_000)!, /já venceu/);

  // O final escolhido dá a peça e o traje.
  assert.equal(game.storyChoose(id, 'ashfen_oak', 2, 24 * 3_600_000), null);
  const st = game.state(id, 24 * 3_600_000);
  assert.equal(st.bank.oak_quiver, 1);
  assert.ok(st.unlockedOutfits?.includes('oak_warden'));
});

test('aljava: recupera perto de 10% das flechas usadas', () => {
  // Só a chance da aljava muda (sem outros atributos): as lutas são as mesmas.
  const run = (arrowSave: number) =>
    simulateHunt({ skill: 'combat', node: huntNode('hydra_swamp', 'normal', 1), since: 0, seed: 11, seq: 0 }, 6 * 3_600_000, {
      vocation: 'hunter',
      combatXp: XP_TABLE[120],
      bank: { cooked_shark: 3000, iron_arrow: 100_000 },
      arrow: 'iron_arrow',
      bonus: { attack: 0, defense: 0, hp: 0, ...(arrowSave ? { arrowSave } : {}) },
    });
  const without = -(run(0).gains.items.iron_arrow ?? 0);
  const used = -(run(0.1).gains.items.iron_arrow ?? 0);
  assert.ok(without > 200, `flechas sem aljava: ${without}`);
  const ratio = used / without;
  assert.ok(ratio > 0.85 && ratio < 0.95, `gastou ${(ratio * 100).toFixed(1)}% (${used} de ${without})`);
});
