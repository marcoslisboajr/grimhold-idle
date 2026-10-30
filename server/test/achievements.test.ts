import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENT_LIST, achievementById, achievementsDone, xpForLevel } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('conquistas: ids únicos, metas válidas e pontos positivos', () => {
  const ids = ACHIEVEMENT_LIST.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ACHIEVEMENT_LIST.length >= 80, `${ACHIEVEMENT_LIST.length} conquistas`);
  const empty = { skills: {}, stats: {} };
  for (const a of ACHIEVEMENT_LIST) {
    const [now, goal] = a.goal(empty);
    assert.ok(Number.isFinite(now) && goal > 0 && a.points > 0, a.id);
  }
  // Personagem novo não tem nada feito.
  assert.deepEqual(achievementsDone(empty), []);
});

test('conquistas: o estado grava as novas com a hora, título só de conquista feita e ranking por pontos', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const a = db.createCharacter(db.accountForToken(db.createGuest())!, 'Heroi', 'warrior').id;
  const b = db.createCharacter(db.accountForToken(db.createGuest())!, 'Novato', 'hunter').id;
  db.applyGains(a, { actions: 0, items: {}, xp: { combat: xpForLevel(100) } }, 1, 0);
  db.addStat(a, 'kills', 50_000);

  const st = game.state(a, 1000);
  assert.equal(st.achievements!['level_5'], 1000, 'nível 100');
  assert.equal(st.achievements!['kills_5'], 1000, '50 mil abates');
  assert.equal(game.state(a, 2000).achievements!['level_5'], 1000, 'a hora não muda depois');

  assert.match(game.setTitle(a, 'level_7') ?? '', /Conquiste/);
  assert.match(game.setTitle(a, 'kills_1') ?? '', /não existe/);
  assert.equal(game.setTitle(a, 'kills_5'), null);
  assert.equal(game.state(a, 3000).title, 'kills_5');
  assert.equal(achievementById('kills_5')!.title![0], 'Lenda das Caçadas');

  game.state(b, 1000);
  const r = db.achievementRanking(20);
  assert.equal(r[0].name, 'Heroi');
  assert.equal(r[0].title, 'kills_5');
  assert.ok(r[0].achievementPoints! > 0);
  assert.ok(!r.some((e) => e.name === 'Novato'), 'sem conquista não entra');
});
