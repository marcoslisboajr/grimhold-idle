import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIAL_BOSS_EVENTS, XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { createWorldBoss } from '../src/worldboss.ts';

/** Chefe global (18/10): quando ele acaba, cada um volta para o que fazia antes de entrar. */
test('chefe global: ao acabar, volta para a caçada ou profissão de antes; quem estava parado fica na cidade', () => {
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'zharvos')!;
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game);
  const mk = (name: string) => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, name, 'warrior');
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[150] } }, 0, 0);
    return c.id;
  };
  const hunter = mk('Cacador');
  const miner = mk('Mineiro');
  const idle = mk('Parado');
  const t0 = ev.startsAt - 60_000;
  assert.equal(game.start(hunter, 'combat', 'river_bank@hard:7', t0), null);
  assert.equal(game.start(miner, 'mining', 'copper_vein', t0), null);
  boss.tick(ev.startsAt);
  for (const id of [hunter, miner, idle]) assert.equal(boss.join(id, ev.startsAt), null);
  let results: ReturnType<typeof boss.tick>['results'] = [];
  for (let t = ev.startsAt + 5000; t <= ev.startsAt + ev.durationMs && !results.length; t += 5000) results = boss.tick(t).results;
  assert.equal(results.length, 3, 'a luta acabou');
  assert.equal(db.activityFor(hunter)?.node, 'river_bank@hard:7', 'voltou para a caçada, com a mesma dificuldade e bando');
  assert.equal(db.activityFor(miner)?.skill, 'mining', 'voltou para a mineração');
  assert.equal(db.activityFor(miner)?.node, 'copper_vein');
  assert.equal(db.activityFor(idle), null, 'quem estava parado fica na cidade');
  for (const id of [hunter, miner, idle]) assert.equal(db.bossReturnFor(id), null, 'o retorno guardado é limpo');
});

test('chefe global: se o servidor reinicia e o evento some, volta para a atividade de antes', async () => {
  const { createApp } = await import('../src/app.ts');
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'zharvos')!;
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Reinicio', 'hunter');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[150] } }, 0, 0);
  assert.equal(game.start(c.id, 'mining', 'copper_vein', ev.startsAt - 60_000), null);
  boss.tick(ev.startsAt);
  assert.equal(boss.join(c.id, ev.startsAt), null);
  // O servidor cai e volta depois do fim do evento: um servidor novo, no mesmo banco.
  let clock = ev.startsAt + ev.durationMs + 3_600_000;
  const server = createApp(db, { tickMs: 40, now: () => clock });
  try {
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(db.activityFor(c.id)?.skill, 'mining', 'voltou para a mineração');
    assert.equal(db.bossReturnFor(c.id), null);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await new Promise((r) => setTimeout(r, 100));
    db.close();
  }
});

test('chefe global: a hora marcada da fila volta com o tempo que faltava (30 min de mineração não viram mineração sem fim)', () => {
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'zharvos')!;
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Fila', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[150] } }, 0, 0);
  const t0 = ev.startsAt - 10 * 60_000;
  // Fila: 30 min minerando cobre e depois pescar.
  assert.equal(game.setQueue(c.id, [{ skill: 'mining', node: 'copper_vein', hours: 0.5 }, { skill: 'fishing', node: 'shrimp_spot', hours: 1 }] as never, t0), null);
  assert.equal(game.startQueued(c.id, t0), true);
  assert.equal(db.queueFor(c.id).until, t0 + 30 * 60_000);
  // Entra no chefe 10 min depois: faltavam 20 min.
  boss.tick(ev.startsAt);
  assert.equal(boss.join(c.id, ev.startsAt), null);
  let results: ReturnType<typeof boss.tick>['results'] = [];
  let end = ev.startsAt;
  for (let t = ev.startsAt + 5000; t <= ev.startsAt + ev.durationMs && !results.length; t += 5000) { results = boss.tick(t).results; end = t; }
  assert.equal(results.length, 1, 'a luta acabou');
  assert.equal(db.activityFor(c.id)?.skill, 'mining', 'voltou para a mineração');
  assert.equal(db.queueFor(c.id).until, end + 20 * 60_000, 'a hora marcada volta com os 20 min que faltavam');
  // Passados os 20 min, a fila segue para a próxima tarefa.
  game.settle(c.id, end + 21 * 60_000);
  assert.equal(db.activityFor(c.id)?.skill, 'fishing', 'acabou o tempo e foi para a próxima da fila');
});

/** Fila do chefe (26/10): entra nos 5 min antes, continua no que fazia e vai para a arena na hora; no fim, volta. */
test('fila do chefe: só abre 5 min antes; na hora vai para a arena (mesmo offline) e no fim volta para o que fazia', () => {
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'zharvos')!;
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Fila', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[150] } }, 0, 0);
  const t0 = ev.startsAt - 4 * 60_000;
  assert.equal(game.start(c.id, 'mining', 'copper_vein', t0 - 60_000), null);
  assert.match(boss.queueJoin(c.id, ev.startsAt - 6 * 60_000) ?? '', /5 minutos/);
  assert.equal(boss.view(c.id, ev.startsAt - 6 * 60_000).canQueue, undefined);
  assert.equal(boss.view(c.id, t0).canQueue, true);
  assert.equal(boss.queueJoin(c.id, t0), null);
  assert.equal(boss.view(c.id, t0).queued, true);
  assert.equal(db.activityFor(c.id)?.skill, 'mining', 'na fila continua minerando');
  boss.tick(ev.startsAt);
  assert.equal(db.activityFor(c.id)?.node, 'world_boss', 'na hora foi para a arena sem fazer nada');
  assert.deepEqual(boss.takeQueueJoined(), [c.id], 'o app avisa a tela de quem a fila levou');
  assert.deepEqual(boss.takeQueueJoined(), [], 'e limpa a lista');
  assert.equal(boss.isFighting(c.id), true);
  let results: ReturnType<typeof boss.tick>['results'] = [];
  for (let t = ev.startsAt + 5000; t <= ev.startsAt + ev.durationMs && !results.length; t += 5000) results = boss.tick(t).results;
  assert.ok(results.length, 'a luta acabou');
  assert.equal(db.activityFor(c.id)?.skill, 'mining', 'voltou para a mineração');
});

test('fila do chefe: sair da fila não leva para a arena', () => {
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'zharvos')!;
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Desistiu', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[150] } }, 0, 0);
  const t0 = ev.startsAt - 2 * 60_000;
  assert.equal(game.start(c.id, 'mining', 'copper_vein', t0), null);
  assert.equal(boss.queueJoin(c.id, t0), null);
  boss.queueLeave(c.id);
  boss.tick(ev.startsAt);
  assert.equal(db.activityFor(c.id)?.skill, 'mining');
  assert.equal(boss.isFighting(c.id), false);
});
