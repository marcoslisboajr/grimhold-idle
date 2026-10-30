import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equipmentBonus, playerStats, XP_TABLE , professionXpBoost, recipeById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
// A peça de roupa de profissão (1 em 3.000 por ação) às vezes cai e quebrava a comparação exata do banco.
const noOutfit = (bank: Record<string, number>) => Object.fromEntries(Object.entries(bank).filter(([id]) => !id.startsWith('outfit_')));

function setup(bank: Record<string, number> = {}, xp: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Ferreira', 'warrior').id;
  db.applyGains(id, { actions: 0, items: bank, xp }, 0, 0);
  return { db, game, id };
}

test('forja: barra de bronze gasta cobre e estanho', () => {
  const { game, id } = setup({ copper_ore: 10, tin_ore: 10 });
  assert.equal(game.start(id, 'smithing', 'bronze_bar', 0), null);
  game.settle(id, 9_000);
  const s = game.state(id, 9_000);
  assert.deepEqual(s.bank, { bronze_bar: 3, copper_ore: 7, tin_ore: 7 });
  assert.equal(s.skills.smithing, Math.round(3 * recipeById('smithing', 'bronze_bar')!.xp * professionXpBoost(1)));
});

test('forja: para sozinha quando acabam os materiais, mesmo offline', () => {
  const { game, id } = setup({ copper_ore: 2, tin_ore: 5 });
  game.start(id, 'smithing', 'bronze_bar', 0);
  game.settle(id, 10 * 60 * 60 * 1000);
  const s = game.state(id, 10 * 60 * 60 * 1000);
  assert.deepEqual(noOutfit(s.bank), { bronze_bar: 2, tin_ore: 3 }, 'o cobre acabou e sumiu do banco');
  assert.equal(s.activity, null);
});

test('forja: recusa sem materiais e sem nível', () => {
  const { game, id } = setup({ copper_ore: 1 });
  assert.equal(game.start(id, 'smithing', 'bronze_bar', 0), 'Faltam materiais.');
  assert.equal(game.start(id, 'smithing', 'iron_sword', 0), 'Precisa de nível 15 de Forja.');
});

test('equipar tira do banco, devolve o antigo e soma no combate', () => {
  const { game, id } = setup({ bronze_sword: 1, iron_sword: 1 }, { combat: XP_TABLE[10] });
  assert.equal(game.equip(id, 'bronze_sword', 0), null);
  let s = game.state(id, 0);
  assert.deepEqual(s.equipment, { weapon: 'bronze_sword' });
  assert.deepEqual(s.bank, { iron_sword: 1 });

  assert.equal(game.equip(id, 'iron_sword', 0), null);
  s = game.state(id, 0);
  assert.deepEqual(s.equipment, { weapon: 'iron_sword' });
  assert.deepEqual(s.bank, { bronze_sword: 1 });

  const bonus = equipmentBonus(s.equipment);
  assert.equal(bonus.attack, 9);
  assert.equal(playerStats('warrior', 0, bonus).attack, playerStats('warrior', 0).attack + 9);

  game.unequip(id, 'weapon', 0);
  s = game.state(id, 0);
  assert.deepEqual(s.equipment, {});
  assert.deepEqual(s.bank, { bronze_sword: 1, iron_sword: 1 });
});

test('equipar respeita o nível de combate e o que tem no banco', () => {
  const { game, id } = setup({ iron_armor: 1, copper_ore: 3 });
  assert.equal(game.equip(id, 'iron_armor', 0), 'Precisa de nível 10 de combate.');
  assert.equal(game.equip(id, 'copper_ore', 0), 'Isso não se equipa.');
  assert.equal(game.equip(id, 'bronze_helmet', 0), 'Você não tem esse item.');
});

test('equipar anel e amuleto soma atributos nos slots ring e amulet', () => {
  const { game, id } = setup({ silver_necklace: 1, iron_ring: 1 }, { combat: XP_TABLE[10] });
  assert.equal(game.equip(id, 'silver_necklace', 0), null);
  assert.equal(game.equip(id, 'iron_ring', 0), null);
  const s = game.state(id, 0);
  assert.equal(s.equipment.amulet, 'silver_necklace');
  assert.equal(s.equipment.ring, 'iron_ring');
  const bonus = equipmentBonus(s.equipment);
  assert.equal(bonus.defense, 4);
  assert.equal(bonus.hp, 25);
  const stats = playerStats('warrior', 0, bonus);
  assert.equal(stats.defense, playerStats('warrior', 0).defense + 4);
});
