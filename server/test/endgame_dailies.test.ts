import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { RAIDS, dayOf, weekOf, xpForLevel, RAID_FRAGMENT_ID, ENDGAME_DAILY_IDX_BASE, ENDGAME_WEEKLY_IDX_BASE } from '@grimhold/shared';

function setup(level: number) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Fim', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: xpForLevel(level) } }, 0, 0);
  return { db, game, id };
}

const now = Date.UTC(2026, 9, 25, 15);

test('diárias de fim de jogo: só do 400 em diante (3 diárias; semanais: abates e, com a raide ligada, a raide)', () => {
  const low = setup(399);
  assert.equal(low.game.state(low.id, now).endgameDailies?.length ?? 0, 0);
  const { game, id } = setup(400);
  const list = game.state(id, now).endgameDailies!;
  assert.equal(list.filter((d) => d.category === 'endgame_daily').length, 3);
  assert.equal(list.filter((d) => d.category === 'endgame_weekly').length, RAIDS.some((r) => r.enabled) ? 2 : 1);
});

test('diária de abates de fim de jogo: entrega dá ouro e fragmentos, uma vez só', () => {
  const { db, game, id } = setup(400);
  const idx = ENDGAME_DAILY_IDX_BASE;
  assert.equal(game.claimDaily(id, idx, now), 'Essa tarefa ainda não está pronta.');
  db.addDailyProgress(id, dayOf(now), idx, 400);
  const before = game.state(id, now).bank;
  assert.equal(game.claimDaily(id, idx, now), null);
  const after = game.state(id, now).bank;
  assert.equal((after[RAID_FRAGMENT_ID] ?? 0) - (before[RAID_FRAGMENT_ID] ?? 0), 2);
  assert.equal((after.gold ?? 0) - (before.gold ?? 0), 150_000);
  assert.equal(game.claimDaily(id, idx, now), 'Essa tarefa já foi entregue.');
});

test('entrega de material T8: conta o que tem no banco e tira na hora de entregar', () => {
  const { db, game, id } = setup(400);
  const d = game.state(id, now).endgameDailies!.find((x) => x.goal.kind === 'deliver')!;
  const item = (d.goal as { item: string }).item;
  assert.equal(game.claimDaily(id, d.idx, now), 'Essa tarefa ainda não está pronta.');
  db.applyGains(id, { actions: 0, items: { [item]: 35 }, xp: {} }, 0, 0);
  assert.equal(game.claimDaily(id, d.idx, now), null);
  assert.equal(game.state(id, now).bank[item] ?? 0, 5);
});

test('semanal de fim de jogo vale pela semana inteira', () => {
  const { db, game, id } = setup(400);
  const idx = game.state(id, Date.UTC(2026, 9, 26, 15)).endgameDailies!.find((d) => d.goal.kind === 'kill' && d.category === 'endgame_weekly')!.idx;
  const monday = Date.UTC(2026, 9, 26, 15);
  game.state(id, monday);
  db.addDailyProgress(id, weekOf(monday), idx, 5000);
  // Dois dias depois (mesma semana) ainda está pronta.
  assert.equal(game.claimDaily(id, idx, monday + 2 * 86_400_000), null);
});
