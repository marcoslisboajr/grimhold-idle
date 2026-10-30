import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, xpForLevel } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(bank: Record<string, number> = {}, xp: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Sigilista', 'warrior').id;
  db.applyGains(id, { actions: 0, items: bank, xp }, 0, 0);
  return { db, game, id };
}

test('sigilismo: a receita pede o eco do bestiário antes dos materiais', () => {
  const { db, game, id } = setup({ bone_dust: 50 });
  assert.match(game.start(id, 'sigilism', 'sigil_rat', 0)!, /Falta o eco da criatura: abata mais 50/);
  db.addBestiaryKills(id, { rat: 50 });
  assert.equal(game.start(id, 'sigilism', 'sigil_rat', 0), null);
});

test('sigilismo: pôr o sigilo tira do depósito, soma o bônus e devolve ao trocar', () => {
  const { db, game, id } = setup({ sigil_rat: 1, sigil_spider: 1 });
  assert.equal(game.setSigil(id, 1, 'sigil_rat', 0), 'Esse espaço abre com mais nível de Sigilismo (30 e 60).');
  assert.equal(game.setSigil(id, 0, 'bone_dust', 0), 'Isso não é um sigilo.');
  assert.equal(game.setSigil(id, 0, 'sigil_rat', 0), null);
  let s = game.state(id, 0);
  assert.deepEqual(s.sigils, ['sigil_rat', null, null]);
  assert.equal(s.bank.sigil_rat, undefined, 'saiu do depósito');
  // Trocar devolve o anterior.
  assert.equal(game.setSigil(id, 0, 'sigil_spider', 0), null);
  s = game.state(id, 0);
  assert.equal(s.bank.sigil_rat, 1);
  assert.deepEqual(s.sigils, ['sigil_spider', null, null]);
  // Tirar (null) devolve também.
  assert.equal(game.setSigil(id, 0, null, 0), null);
  assert.equal(game.state(id, 0).bank.sigil_spider, 1);
  assert.equal(db.sigilsFor(id)[0], null);
});

test('sigilismo: espaços abrem no 30 e no 60; o mesmo sigilo não vai em dois espaços', () => {
  const { game, id } = setup({ sigil_rat: 2, sigil_wolf: 1 }, { sigilism: xpForLevel(60) });
  assert.equal(game.setSigil(id, 0, 'sigil_rat', 0), null);
  assert.equal(game.setSigil(id, 1, 'sigil_rat', 0), 'Esse sigilo já está num espaço.');
  assert.equal(game.setSigil(id, 2, 'sigil_wolf', 0), null);
});

test('sigilismo: o sigilo colocado entra no bônus do combate', () => {
  const { game, id } = setup({ sigil_rat: 1 });
  const before = game.state(id, 0);
  game.setSigil(id, 0, 'sigil_rat', 0);
  // O estado expõe os sigilos; o contexto da caçada soma o bônus (+15 de vida do Sigilo do Rato).
  assert.deepEqual(game.state(id, 0).sigils, ['sigil_rat', null, null]);
  assert.ok(before.sigils?.every((s) => s === null));
});

test('sigilismo: todas as receitas pedem uma criatura e almas da Colheita de Almas', () => {
  for (const r of RECIPES.sigilism) {
    assert.ok(r.kills && r.kills.count > 0, r.id);
    for (const item of Object.keys(r.inputs)) assert.ok(['bone_dust', 'dark_essence', 'spectral_tear', 'ancient_ash', 'abyssal_soul'].includes(item), item);
  }
});

test('sigilismo: o bônus do sigilo colocado chega ao combate (e sai ao tirar)', () => {
  const { game, id } = setup({ sigil_rat: 1, sigil_wolf: 1 });
  const base = game.combatBonus(id);
  game.setSigil(id, 0, 'sigil_rat', 0);
  assert.equal(game.combatBonus(id).hp, base.hp + 15, 'Sigilo do Rato: +15 vida');
  game.setSigil(id, 0, 'sigil_wolf', 0);
  assert.equal(game.combatBonus(id).hp, base.hp);
  assert.ok(Math.abs((game.combatBonus(id).speed ?? 0) - ((base.speed ?? 0) - 0.03)) < 1e-9, 'Sigilo do Lobo: 3% mais rápido');
  game.setSigil(id, 0, null, 0);
  assert.deepEqual(game.combatBonus(id), base);
});
