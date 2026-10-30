import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  huntById,
  huntNode,
  playerStats,
  simulateHunt,
  withArrow,
  simulateProduction,
  recipeById,
  itemById,
  XP_TABLE,
  type Activity,
} from '@grimhold/shared';
import { openDb } from '../src/db.js';
import { createGame } from '../src/game.js';

const hunt = (node: string, seed = 42): Activity => ({ skill: 'combat', node, since: 0, seed, seq: 0 });

test('fletching: receitas produzem a quantidade correta (15 unidades por ação)', () => {
  const shaftRecipe = recipeById('fletching', 'make_arrow_shaft')!;
  assert.ok(shaftRecipe);
  assert.equal(shaftRecipe.outputQty, 15);

  const act: Activity = { skill: 'fletching', node: 'make_arrow_shaft', since: 0, seed: 1, seq: 0 };
  const res = simulateProduction(act, shaftRecipe.intervalMs * 2, { logs: 10 });
  assert.equal(res.gains.actions, 2);
  assert.equal(res.gains.items.logs, -2);
  assert.equal(res.gains.items.arrow_shaft, 30);
});

test('fletching: flechas aumentam o ataque do Caçador com withArrow', () => {
  const base = playerStats('hunter', XP_TABLE[20]);
  const steelArrow = itemById('steel_arrow')!;
  assert.ok(steelArrow.arrow);

  const boosted = withArrow(base, 'steel_arrow');
  assert.equal(boosted.attack, Math.round(base.attack * steelArrow.arrow.mult));
  assert.ok(boosted.attack > base.attack);
});

test('fletching: caçada do Caçador consome 1 flecha especial por ciclo e faz fallback para infinita', () => {
  const arrowId = 'bronze_arrow';
  const initialQty = 5;
  const ctx = {
    vocation: 'hunter',
    combatXp: XP_TABLE[5],
    arrow: arrowId,
    bank: { [arrowId]: initialQty },
    questSteps: {},
  };

  // Simula 10 minutos de caçada (muitos ciclos, bem mais que 5)
  const res = simulateHunt(hunt(huntNode('river_bank')), 10 * 60_000, ctx);

  // Deve ter gasto exatamente 5 flechas (o estoque todo) e continuado caçando normalmente
  assert.equal(res.gains.items[arrowId], -initialQty, 'gastou exatamente o estoque de 5 flechas');
  assert.ok(res.gains.actions > initialQty, 'continuou caçando com a flecha básica infinita');
  assert.equal(res.ended, false, 'não interrompeu a caçada');
});

test('fletching: vocações que não são Caçador não podem usar flechas', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const now = 1_000_000;

  const warrior = db.createCharacter(db.accountForToken(db.createGuest())!, 'GuerreiroTest', 'warrior');
  const hunter = db.createCharacter(db.accountForToken(db.createGuest())!, 'CacadorTest', 'hunter');

  // Guerreiro tenta usar flecha
  const errWarrior = game.setArrow(warrior.id, 'bronze_arrow', now);
  assert.equal(errWarrior, 'Apenas o Caçador pode usar flechas especiais.');

  // Caçador tenta usar item inválido
  const errHunterInvalid = game.setArrow(hunter.id, 'wood', now);
  assert.equal(errHunterInvalid, 'Isso não é uma flecha válida.');

  // Caçador usa flecha válida
  const okHunter = game.setArrow(hunter.id, 'bronze_arrow', now);
  assert.equal(okHunter, null);
  assert.equal(db.arrowFor(hunter.id), 'bronze_arrow');

  // Caçador volta para a flecha básica
  const okReset = game.setArrow(hunter.id, null, now);
  assert.equal(okReset, null);
  assert.equal(db.arrowFor(hunter.id), null);
});
