import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE, bestTool, outfitCount, professionGearXpMult, simulate, type Activity } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

// Ferramentas e roupas de profissão: valem do depósito, sem equipar.

test('ferramenta: vale a melhor do depósito que o nível já permite', () => {
  const bank = { bronze_pickaxe: 1, adamant_pickaxe: 1, primordial_pickaxe: 1 };
  assert.equal(bestTool('mining', XP_TABLE[60], bank)?.id, 'adamant_pickaxe', 'a primordial pede nível 115');
  assert.equal(bestTool('mining', XP_TABLE[120], bank)?.id, 'primordial_pickaxe');
  assert.equal(bestTool('mining', XP_TABLE[60], {}), undefined);
  assert.equal(bestTool('woodcutting', XP_TABLE[60], bank), undefined, 'picareta não serve no lenhador');
});

test('ferramenta: acelera a coleta e dá XP; roupa dá XP por peça e bônus com as 4', () => {
  const act: Activity = { skill: 'mining', node: 'copper_vein', since: 0, seed: 1, seq: 0 };
  const skills = { mining: XP_TABLE[60] };
  const base = simulate(act, 3_600_000, { skills, bank: {} } as never);
  const tooled = simulate(act, 3_600_000, { skills, bank: { adamant_pickaxe: 1 } } as never);
  assert.ok(tooled.gains.actions > base.gains.actions * 1.15, `${tooled.gains.actions} ações com a picareta contra ${base.gains.actions}`);

  const outfit = { outfit_mining_head: 1, outfit_mining_body: 1, outfit_mining_legs: 1, outfit_mining_feet: 1 };
  assert.equal(outfitCount('mining', outfit), 4);
  assert.equal(outfitCount('smithing', outfit), 0, 'a roupa de garimpeiro não vale na forja');
  assert.ok(Math.abs(professionGearXpMult('mining', XP_TABLE[60], outfit) - 1.1) < 1e-9, 'roupa completa: +10%');
  assert.ok(Math.abs(professionGearXpMult('mining', XP_TABLE[60], { ...outfit, adamant_pickaxe: 1 }) - 1.14) < 1e-9, '+4% da picareta de adamantita');
  assert.ok(Math.abs(professionGearXpMult('smithing', XP_TABLE[60], { outfit_artisan_body: 1 }) - 1.02) < 1e-9, 'avental de artesão vale na criação');
});

test('roupa: o servidor solta peças da roupa da profissão enquanto treina', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Garimpeira', 'warrior').id;
  const random = Math.random;
  Math.random = () => 0; // toda chance acerta
  try {
    assert.equal(game.start(id, 'mining', 'copper_vein', 0), null);
    game.settle(id, 600_000);
  } finally {
    Math.random = random;
  }
  const bank = db.bankFor(id);
  assert.ok(Object.keys(bank).some((k) => k.startsWith('outfit_mining_')), 'veio peça de garimpeiro');
});
