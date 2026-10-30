import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateHunt, type Activity } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(bank: Record<string, number> = {}, xp: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Aventureiro', 'hunter').id;
  db.applyGains(id, { actions: 0, items: bank, xp }, 0, 0);
  return { db, game, id };
}

test('refeição: comer ativa buff de 30 minutos e consome do depósito', () => {
  const { game, id } = setup({ cooked_shrimp: 2 });
  assert.equal(game.eatMeal(id, 'bronze_bar', 1000), 'Isso não é uma refeição.');
  assert.equal(game.eatMeal(id, 'cooked_trout', 1000), 'Você não possui essa refeição no depósito.');
  assert.equal(game.eatMeal(id, 'cooked_shrimp', 1000), null);
  
  const s = game.state(id, 1000);
  assert.equal(s.bank.cooked_shrimp, 1);
  assert.deepEqual(s.activeMeal, { item: 'cooked_shrimp', until: 1000 + 30 * 60 * 1000 });
});

test('refeição: comer outra substitui o buff atual', () => {
  const { game, id } = setup({ cooked_shrimp: 1, cooked_trout: 1 });
  game.eatMeal(id, 'cooked_shrimp', 1000);
  game.eatMeal(id, 'cooked_trout', 5000);
  
  const s = game.state(id, 5000);
  assert.deepEqual(s.activeMeal, { item: 'cooked_trout', until: 5000 + 30 * 60 * 1000 });
  assert.equal(s.bank.cooked_shrimp, undefined);
  assert.equal(s.bank.cooked_trout, undefined);
});

test('buff de combate: camarão dá +5% XP de combate durante 30 min', () => {
  const activity: Activity = { skill: 'combat', node: 'river_bank', since: 0, seed: 42, seq: 0 };
  const duration30m = 30 * 60 * 1000;
  
  const baseSim = simulateHunt(activity, duration30m, { vocation: 'hunter', combatXp: 0 });
  const buffSim = simulateHunt(activity, duration30m, {
    vocation: 'hunter',
    combatXp: 0,
    meal: { item: 'cooked_shrimp', until: duration30m },
  });

  assert.ok((buffSim.gains.xp.combat ?? 0) > (baseSim.gains.xp.combat ?? 0), 'ganhou mais XP com buff');
  const ratio = (buffSim.gains.xp.combat ?? 0) / (baseSim.gains.xp.combat ?? 0);
  // XP baixa por abate no nível 1: o arredondamento mexe um pouco na proporção.
  assert.ok(Math.abs(ratio - 1.05) < 0.03, `esperado ~1.05x, obtido ${ratio}`);
});

test('offline corta no until: buff expira no meio da simulação', () => {
  const activity: Activity = { skill: 'combat', node: 'river_bank', since: 0, seed: 42, seq: 0 };
  const hour = 60 * 60 * 1000;
  const halfHour = 30 * 60 * 1000;

  const noBuff = simulateHunt(activity, hour, { vocation: 'hunter', combatXp: 0 });
  const fullHourBuff = simulateHunt(activity, hour, {
    vocation: 'hunter',
    combatXp: 0,
    meal: { item: 'cooked_shrimp', until: hour },
  });
  const expireAt30m = simulateHunt(activity, hour, {
    vocation: 'hunter',
    combatXp: 0,
    meal: { item: 'cooked_shrimp', until: halfHour },
  });

  const xpNone = noBuff.gains.xp.combat ?? 0;
  const xpFull = fullHourBuff.gains.xp.combat ?? 0;
  const xpHalf = expireAt30m.gains.xp.combat ?? 0;

  assert.ok(xpHalf > xpNone, 'rende mais do que sem buff');
  assert.ok(xpHalf < xpFull, 'rende menos do que buff durante a hora toda');
});

test('poção de cura continua curando dano normalmente', () => {
  const { game, id } = setup({ health_potion: 10 });
  assert.equal(game.setFood(id, 'health_potion', 0), null);
  assert.equal(game.state(id, 0).food, 'health_potion');
});

test('buff de loot: salmão aumenta também drops de 1 unidade (não some no arredondamento)', () => {
  const activity: Activity = { skill: 'combat', node: 'river_bank', since: 0, seed: 7, seq: 0 };
  const hours = 4 * 60 * 60 * 1000;
  const count = (items: Record<string, number>) =>
    Object.entries(items).filter(([id]) => id !== 'gold').reduce((s, [, q]) => s + Math.max(0, q), 0);
  const base = simulateHunt(activity, hours, { vocation: 'hunter', combatXp: 0 });
  const buff = simulateHunt(activity, hours, { vocation: 'hunter', combatXp: 0, meal: { item: 'cooked_salmon', until: hours } });
  const ratio = count(buff.gains.items) / count(base.gains.items);
  assert.ok(ratio > 1.04 && ratio < 1.17, `esperado ~1.10x de itens, obtido ${ratio}`);
});

test('preferência antiga numa comida que virou refeição volta para a poção', () => {
  const activity: Activity = { skill: 'combat', node: 'river_bank', since: 0, seed: 3, seq: 0 };
  const hours = 2 * 60 * 60 * 1000;
  const sim = simulateHunt(activity, hours, {
    vocation: 'hunter',
    combatXp: 0,
    bank: { cooked_shark: 50, health_potion: 50 },
    food: 'cooked_shark',
  });
  assert.equal(sim.gains.items.cooked_shark ?? 0, 0, 'não come a refeição como cura');
  assert.ok((sim.gains.items.health_potion ?? 0) < 0, 'usou poção');
});

test('refeição automática: renova do depósito enquanto houver, emendando as de 30 min', () => {
  const { game, id } = setup({ cooked_shrimp: 3 });
  const M = 30 * 60 * 1000;
  assert.equal(game.setMealAuto(id, true, 0), 'Coma uma refeição primeiro.');
  game.start(id, 'combat', 'river_bank', 0);
  game.eatMeal(id, 'cooked_shrimp', 0);
  assert.equal(game.setMealAuto(id, true, 0), null);
  // 70 min depois: a primeira acabou em 30, a segunda em 60, a terceira cobre até 90.
  game.settle(id, 70 * 60 * 1000);
  const s = game.state(id, 70 * 60 * 1000);
  assert.deepEqual(s.activeMeal, { item: 'cooked_shrimp', until: 3 * M, auto: true });
  assert.equal(s.bank.cooked_shrimp, undefined);
  // Sem refeição no depósito, para de renovar.
  game.settle(id, 5 * M);
  assert.deepEqual(game.state(id, 5 * M).activeMeal, { item: 'cooked_shrimp', until: 3 * M, auto: true });
});

test('refeição automática desligada não gasta nada', () => {
  const { game, id } = setup({ cooked_shrimp: 3 });
  game.start(id, 'combat', 'river_bank', 0);
  game.eatMeal(id, 'cooked_shrimp', 0);
  game.setMealAuto(id, true, 0);
  game.setMealAuto(id, false, 0);
  game.settle(id, 2 * 60 * 60 * 1000);
  const s = game.state(id, 2 * 60 * 60 * 1000);
  assert.equal(s.bank.cooked_shrimp, 2);
});
