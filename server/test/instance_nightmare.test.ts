import { test } from 'node:test';
import assert from 'node:assert/strict';
import { huntById, huntNode, instanceCycles, instanceKills, instanceWaves, parseHuntNode, runCycle, playerStats, isBossNightmare } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('instância: o jogador escolhe o bando da limpeza (até 5); mesmo total de abates, menos lutas', () => {
  const h = huntById('ozzarak_end')!;
  const solo = instanceWaves(h);
  const five = instanceWaves(h, 5);
  const sum = (w: number[]) => w.reduce((a, b) => a + b, 0);
  assert.equal(sum(solo), instanceKills(h.level));
  assert.equal(sum(five), instanceKills(h.level));
  assert.ok(five.length * 4 < solo.length, 'com bando 5 são bem menos lutas');
  assert.ok(five.every((n) => n <= 5));
  assert.equal(parseHuntNode(huntNode('ozzarak_end', 'nightmare', 5))!.pack, 5);
  assert.equal(parseHuntNode('ozzarak_end:9')!.pack, 5, 'no máximo 5');
  assert.equal(parseHuntNode('boar_den:5')!.pack, 1, 'covil é sempre 1');
  assert.equal(instanceCycles(h, 5), five.length + h.monsters.length);
});

test('pesadelo de instância e covil: mais vida e dano, e só depois de vencer a normal', () => {
  const h = huntById('goblin_king_hall')!;
  assert.ok(isBossNightmare(h, 'nightmare'));
  assert.ok(!isBossNightmare(huntById('river_bank') ?? { boss: false, lair: false }, 'nightmare'));
  const p = { ...playerStats('warrior', 1e9), level: 200 };
  const normal = runCycle(h, p, 7, 0, parseHuntNode(huntNode(h.id))!.difficulty);
  const night = runCycle(h, p, 7, 0, parseHuntNode(huntNode(h.id, 'nightmare'))!.difficulty);
  assert.ok(night.monster.hp > normal.monster.hp * 2, 'Pesadelo: vida bem maior');

  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Corajoso', 'warrior').id;
  assert.match(game.start(id, 'combat', huntNode('goblin_king_hall', 'nightmare'), 0) ?? '', /Vença a versão normal/);
  assert.match(game.start(id, 'combat', huntNode('boar_den', 'nightmare'), 0) ?? '', /Vença a versão normal/);
  assert.equal(game.start(id, 'combat', huntNode('goblin_king_hall', 'normal', 5), 0), null, 'normal com bando 5 entra');
});
