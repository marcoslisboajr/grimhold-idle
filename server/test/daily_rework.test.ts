import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_CHEST_MAX_STREAK,
  DAILY_V2_FROM,
  FEATURED_TASK_BONUS,
  dailiesFor,
  dailyChestReward,
  dailyChestStreak,
  featuredTasksFor,
  huntingTaskById,
  prevDay,
  xpForLevel,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const DAY = DAILY_V2_FROM;
const NOW = Date.parse(`${DAY}T12:00:00Z`);

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Diario', 'warrior').id;
  return { db, game, id };
}

test('diárias novas: antes de 25/10 continuam as antigas; depois pedem coisas do nível', () => {
  const old = dailiesFor(1, '2026-10-24', 300);
  assert.ok(old.every((d) => !d.where));
  for (let c = 1; c <= 30; c++) {
    const list = dailiesFor(c, DAY, 300, { mining: xpForLevel(80) });
    assert.equal(list.length, 3);
    for (const d of list) {
      // Nada de cobre para quem tem 80 de mineração.
      if (d.goal.kind === 'obtain') assert.notEqual(d.goal.item, 'copper_ore');
      if (d.name === 'Caçada do dia') assert.ok(d.goal.kind === 'kill' && d.goal.monsters.length > 0 && d.where);
    }
  }
  // Mesmo dia e personagem = mesmas tarefas.
  assert.deepEqual(dailiesFor(7, DAY, 120), dailiesFor(7, DAY, 120));
});

test('baú diário: sequência sobe com dias seguidos, para no 7 e volta a 1 se pular um dia', () => {
  assert.equal(prevDay('2026-11-01'), '2026-10-31');
  assert.equal(dailyChestStreak(null, 0, DAY), 1);
  assert.equal(dailyChestStreak(prevDay(DAY), 3, DAY), 4);
  assert.equal(dailyChestStreak(prevDay(DAY), DAILY_CHEST_MAX_STREAK, DAY), DAILY_CHEST_MAX_STREAK);
  assert.equal(dailyChestStreak(prevDay(prevDay(DAY)), 5, DAY), 1);
  const r1 = dailyChestReward(100, 1, 1, DAY);
  const r7 = dailyChestReward(100, 7, 1, DAY);
  assert.ok(r7.gold > r1.gold && r7.charmPoints === 7 && r1.charmPoints === 1);
  assert.equal(r7.items.prey_wildcard, 1);
  assert.equal(Object.keys(r1.items).length, 0);
});

test('baú diário: só abre com as 3 entregues, uma vez por dia, e dá ouro e pontos de charm', () => {
  const { db, game, id } = setup();
  assert.match(game.claimDailyChest(id, NOW)!, /Entregue as 3/);
  for (let i = 0; i < 3; i++) {
    db.addDailyProgress(id, DAY, i, 100_000);
    assert.equal(game.claimDaily(id, i, NOW), null);
  }
  const gold = db.bankFor(id).gold ?? 0;
  assert.equal(game.claimDailyChest(id, NOW), null);
  assert.ok((db.bankFor(id).gold ?? 0) > gold);
  assert.equal(db.statsFor(id).charm_bonus, 1);
  assert.match(game.claimDailyChest(id, NOW)!, /já abriu/);
  assert.deepEqual(game.state(id, NOW).dailyChest, { streak: 1, opened: true });
});

test('tasks em destaque: 3 da faixa do jogador, estáveis no dia, e pagam +50%', () => {
  const f = featuredTasksFor(1, DAY, 200);
  assert.equal(f.length, 3);
  assert.deepEqual(f, featuredTasksFor(1, DAY, 200));
  for (const tid of f) assert.ok(huntingTaskById(tid)!.minLevel <= 200);
  const { db, game, id } = setup();
  const [tid] = featuredTasksFor(id, DAY, 1);
  const def = huntingTaskById(tid)!;
  assert.equal(game.startHuntingTask(id, tid, NOW), null);
  db.addHuntingTaskProgress(id, tid, def.killsRequired);
  assert.equal(game.claimHuntingTask(id, tid, NOW), null);
  assert.equal(db.statsFor(id).hunting_points, Math.round(def.points * (1 + FEATURED_TASK_BONUS)));
});

test('loja de tarefas: stamina e XP em dobro', () => {
  const { db, game, id } = setup();
  db.addStat(id, 'hunting_points', 200);
  db.setStamina(id, 0, NOW);
  assert.equal(game.buyTaskShop(id, 'stamina', undefined, NOW), null);
  assert.ok(game.state(id, NOW).stamina! >= 2 * 3_600_000 - 1000);
  assert.equal(game.buyTaskShop(id, 'xp_boost', undefined, NOW), null);
  assert.ok(db.xpBoostUntil(id) >= NOW + 30 * 60_000 - 1000);
  assert.equal(db.statsFor(id).hunting_points_spent, 90);
});
