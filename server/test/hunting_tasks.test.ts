import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { XP_TABLE, HUNTING_TASKS } from '@grimhold/shared';
const kills = (id: string) => HUNTING_TASKS.find((t) => t.id === id)!.killsRequired;

function setup(level = 1) {
  const db = openDb(':memory:');
  const accId = db.accountForToken(db.createGuest())!;
  const ch = db.createCharacter(accId, 'HunterBoy', 'hunter');
  if (level > 1) {
    db.applyGains(ch.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
  }
  const game = createGame(db);
  return { db, game, id: ch.id };
}

test('tasks: aceita task dentro do nível e recusa acima do limite', () => {
  const { game, id } = setup(15);
  assert.equal(game.startHuntingTask(id, 'task_rats', 0), null);
  assert.equal(game.startHuntingTask(id, 'task_frogs', 0), null);
  assert.equal(game.startHuntingTask(id, 'task_wolves', 0), null);

  // 4ª task deve ser recusada (máximo 3 ativas)
  const err = game.startHuntingTask(id, 'task_skeletons', 0);
  assert.match(err ?? '', /já tem 3 tarefas/);

  const s = game.state(id, 0);
  assert.equal(s.huntingTasks.length, 3);
});

test('tasks: recusa task sem nível suficiente', () => {
  const { game, id } = setup(1);
  const err = game.startHuntingTask(id, 'task_dragons', 0);
  assert.match(err ?? '', /nível 55/);
});

test('tasks: abates na caçada contam e entrega paga recompensas e pontos de caça', () => {
  const { db, game, id } = setup(1);
  assert.equal(game.startHuntingTask(id, 'task_rats', 0), null);

  // Simula caçada na ravina (onde tem ratos)
  game.start(id, 'combat', 'river_bank:normal', 0);
  // Simula 20 minutos de caçada
  game.settle(id, 1_200_000);
  game.stop(id, 1_200_000);

  const s1 = game.state(id, 1_200_000);
  const t1 = s1.huntingTasks.find((t) => t.id === 'task_rats')!;
  assert.ok(t1.progress > 0);

  // Força o progresso completar para testar a entrega
  db.addHuntingTaskProgress(id, 'task_rats', kills('task_rats'));
  db.setHuntingTaskStatus(id, 'task_rats', 'ready');

  // Entrega a task
  assert.equal(game.claimHuntingTask(id, 'task_rats', 1_200_000), null);
  const s2 = game.state(id, 1_200_000);
  assert.equal(s2.huntingPoints, 5);
  assert.ok((s2.bank.gold ?? 0) >= 120);
  const tClaimed = s2.huntingTasks.find((t) => t.id === 'task_rats')!;
  assert.equal(tClaimed.status, 'claimed');
});

test('tasks: subir de patente entrega troféu correspondente', () => {
  const { db, game, id } = setup(15);
  // Simula jogador já com 45 pontos
  db.addStat(id, 'hunting_points', 45);

  assert.equal(game.startHuntingTask(id, 'task_skeletons', 0), null);
  db.addHuntingTaskProgress(id, 'task_skeletons', kills('task_skeletons'));
  db.setHuntingTaskStatus(id, 'task_skeletons', 'ready');

  // Ao entregar ganha +10 pontos (45 + 10 = 55 pts), cruzando o limiar de 50 pts (Rastreador)
  assert.equal(game.claimHuntingTask(id, 'task_skeletons', 0), null);

  const s = game.state(id, 0);
  assert.equal(s.huntingPoints, 55);
  assert.equal(s.bank.hunter_trophy_bronze, 1);
});

test('tasks: cancela tarefa ativa', () => {
  const { game, id } = setup(1);
  assert.equal(game.startHuntingTask(id, 'task_rats', 0), null);
  assert.equal(game.state(id, 0).huntingTasks.length, 1);

  assert.equal(game.cancelHuntingTask(id, 'task_rats', 0), null);
  assert.equal(game.state(id, 0).huntingTasks.length, 0);
});

test('tasks: pronta antes de a meta subir ainda entrega', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Antigo', 'warrior').id;
  game.startHuntingTask(id, 'task_rats', 0);
  db.addHuntingTaskProgress(id, 'task_rats', 50);
  db.setHuntingTaskStatus(id, 'task_rats', 'ready');
  assert.equal(game.claimHuntingTask(id, 'task_rats', 0), null);
});

test('tasks 400+: liberam pelo nível de caçada (400 + Maestria) e tarefa muito abaixo paga menos pontos (26/10)', async () => {
  const { xpForLevel, taskPointsFor, huntingTaskById } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Mestre', 'hunter').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: xpForLevel(404) } }, 0, 0);
  const game = createGame(db);
  const t463 = HUNTING_TASKS.find((t) => t.minLevel === 463)!;
  assert.match(game.startHuntingTask(id, t463.id, 0) ?? '', /Precisa de nível/, 'sem Maestria, o 463 está fechado');
  db.addMasteryPoints(id, 63);
  assert.equal(game.startHuntingTask(id, t463.id, 0), null, 'com Maestria 63 (nível de caçada 463) abre');
  const low = HUNTING_TASKS.find((t) => t.minLevel === 205)!;
  assert.equal(taskPointsFor(t463, 463), t463.points, 'a do seu nível paga cheio');
  assert.equal(taskPointsFor(low, 463), Math.max(1, Math.round(low.points * 0.25)), 'a do 205 paga 25%');
  assert.equal(taskPointsFor(huntingTaskById(low.id)!, 230), low.points, 'até 25 níveis abaixo paga cheio');
  // A tarefa baixa por abate não pode pagar mais que a do seu nível.
  assert.ok(taskPointsFor(low, 463) / low.killsRequired < t463.points / t463.killsRequired);
});
