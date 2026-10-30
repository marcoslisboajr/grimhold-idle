import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const MIN = 60_000;

test('XP/h do cartão: só aparece com 10+ min e é a XP de combate da caçada por hora', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Medidor', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[12] } }, 0, 0);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  const xp0 = db.skillsFor(id).combat ?? 0;
  game.settle(id, 5 * MIN);
  assert.equal(game.state(id, 5 * MIN).huntXp?.['river_bank@normal'], undefined, 'menos de 10 min ainda não mostra');
  game.settle(id, 30 * MIN);
  const rate = game.state(id, 30 * MIN).huntXp?.['river_bank@normal'];
  const gained = (db.skillsFor(id).combat ?? 0) - xp0;
  assert.ok(rate && rate > 0);
  assert.ok(Math.abs(rate - gained * 2) <= gained * 2 * 0.02, `${rate} ~ ${gained * 2}`);
  // Sessão nova curta: o cartão continua mostrando a anterior.
  game.stop(id, 30 * MIN);
  assert.equal(game.start(id, 'combat', 'river_bank', 31 * MIN), null);
  game.settle(id, 33 * MIN);
  assert.equal(game.state(id, 33 * MIN).huntXp?.['river_bank@normal'], rate);
});
