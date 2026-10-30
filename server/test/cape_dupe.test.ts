import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { capeOf, xpForLevel } from '@grimhold/shared';

// 26/10: evoluir ou refinar a capa de profissão (vira "cape_x+1#2") fazia o jogo entregar outra capa base,
// e dava para repetir (capas duplicadas). Vender a capa também fazia ela voltar de graça.
function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Capa', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { cooking: xpForLevel(99, 'cooking') } }, 0, 0);
  return { db, game, id };
}
const cape = capeOf('cooking');
const capesIn = (bank: Record<string, number>) => Object.entries(bank).filter(([k, n]) => k.startsWith(cape) && n > 0);

test('capa de profissão: chega uma vez ao alcançar o nível', () => {
  const { game, id } = setup();
  assert.equal(game.state(id, 1000).bank[cape], 1);
  assert.equal(game.state(id, 2000).bank[cape], 1);
});

test('capa evoluída ou refinada não faz o jogo dar outra capa base', () => {
  const { db, game, id } = setup();
  game.state(id, 1000);
  // Ascensão + refino: a peça do depósito vira outra (mesma base).
  db.applyGains(id, { actions: 0, items: { [cape]: -1, [`${cape}+2#3`]: 1 }, xp: {} }, 0, 0);
  const bank = game.state(id, 2000).bank;
  assert.deepEqual(capesIn(bank), [[`${cape}+2#3`, 1]]);
});

test('capa vendida não volta de graça', () => {
  const { db, game, id } = setup();
  game.state(id, 1000);
  db.applyGains(id, { actions: 0, items: { [cape]: -1 }, xp: {} }, 0, 0);
  assert.deepEqual(capesIn(game.state(id, 2000).bank), []);
});
