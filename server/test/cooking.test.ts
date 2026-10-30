import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eatAfterFight, HUNTS, playerStats, runCycle, simulateHunt, parseHuntNode, professionXpBoost, nodeById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(bank: Record<string, number> = {}, xp: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Pescadora', 'hunter').id;
  db.applyGains(id, { actions: 0, items: bank, xp }, 0, 0);
  return { db, game, id };
}

test('pesca: rede de camarão rende camarão cru', () => {
  const { game, id } = setup();
  assert.equal(game.start(id, 'fishing', 'shrimp_spot', 0), null);
  game.settle(id, 9_000);
  const s = game.state(id, 9_000);
  assert.deepEqual(s.bank, { raw_shrimp: 3 });
  assert.equal(s.skills.fishing, Math.round(3 * nodeById('fishing', 'shrimp_spot')!.xp * professionXpBoost(1)));
});

test('culinária: frita o camarão e para quando acaba', () => {
  const { game, id } = setup({ raw_shrimp: 4 });
  assert.equal(game.start(id, 'cooking', 'cook_shrimp', 0), null);
  game.settle(id, 60_000);
  const s = game.state(id, 60_000);
  assert.deepEqual(s.bank, { cooked_shrimp: 4 });
  assert.equal(s.activity, null);
  assert.equal(game.start(id, 'cooking', 'cook_salmon', 0), 'Precisa de nível 20 de Culinária.');
});

test('poção de vida: toma a melhor, uma por luta, e encurta o descanso', () => {
  const player = playerStats('hunter', 0);
  const hunt = HUNTS[0];
  let seq = 0;
  let cycle = runCycle(hunt, player, 1, seq);
  while (cycle.outcome !== 'win' || cycle.damageTaken === 0) cycle = runCycle(hunt, player, 1, ++seq);
  assert.deepEqual(eatAfterFight(cycle, player, {}), { restMs: cycle.restMs, ate: null });
  const heal = eatAfterFight(cycle, player, { health_potion: 3, great_health_potion: 1, cooked_trout: 9 });
  assert.equal(heal.ate, 'great_health_potion');
  assert.ok(heal.restMs < cycle.restMs);
});

test('caçada com poção de vida: gasta poção do banco e rende mais lutas', () => {
  const activity = { skill: 'combat' as const, node: 'river_bank', since: 0, seed: 7, seq: 0 };
  const hour = 60 * 60 * 1000;
  const hungry = simulateHunt(activity, hour, { vocation: 'hunter', combatXp: 0 });
  const fed = simulateHunt(activity, hour, { vocation: 'hunter', combatXp: 0, bank: { health_potion: 1000 } });
  assert.ok((fed.gains.items.health_potion ?? 0) < 0, 'tomou poção');
  assert.ok(fed.seq > hungry.seq, 'mais lutas na mesma hora');
});

test('poção de vida escolhida: só toma a escolhida, ou nada', () => {
  const player = playerStats('hunter', 0);
  const hunt = HUNTS[0];
  let seq = 0;
  let cycle = runCycle(hunt, player, 1, seq);
  while (cycle.outcome !== 'win' || cycle.damageTaken === 0) cycle = runCycle(hunt, player, 1, ++seq);
  const bank = { health_potion: 3, great_health_potion: 1 };
  assert.equal(eatAfterFight(cycle, player, bank, 'health_potion').ate, 'health_potion');
  assert.equal(eatAfterFight(cycle, player, bank, 'none').ate, null);
  assert.equal(eatAfterFight(cycle, player, bank, 'supreme_health_potion').ate, null, 'sem poção suprema no banco');
});

test('servidor: guarda a escolha e recusa o que não tem cura', () => {
  const { game, id } = setup({ health_potion: 2 });
  assert.equal(game.setFood(id, 'health_potion', 0), null);
  assert.equal(game.state(id, 0).food, 'health_potion');
  assert.equal(game.setFood(id, 'bronze_bar', 0), 'Isso não é comida.');
  assert.equal(game.setFood(id, null, 0), null);
  assert.equal(game.state(id, 0).food, null);
});

test('poção de vida só abaixo do limite escolhido', () => {
  const p = parseHuntNode('river_bank')!;
  const base = playerStats('hunter', 0);
  const player = { ...base, rules: { foodBelow: 0.5 } };
  const bank = { health_potion: 5 };
  const light = { ...runCycle(p.hunt, player, 1, 0), outcome: 'win' as const, damageTaken: Math.floor(base.hp * 0.3) };
  const heavy = { ...light, damageTaken: Math.ceil(base.hp * 0.6) };
  assert.equal(eatAfterFight(light, player, bank).ate, null, 'com 70% de vida não toma');
  assert.equal(eatAfterFight(heavy, player, bank).ate, 'health_potion', 'com 40% de vida toma');
  assert.equal(eatAfterFight(light, base, bank).ate, 'health_potion', 'sem limite: qualquer dano');
});
