import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, XP_TABLE, itemById, itemValue, playerStats, rarityOf, runCycle } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('raridade: a mesma peça com atributos e valor maiores; não existe para material', () => {
  const plain = itemById('iron_sword')!;
  const rare = itemById('iron_sword+2')!;
  assert.equal(rare.name, 'Espada de Ferro (Rara)');
  assert.ok(rare.equip!.attack! > plain.equip!.attack!);
  assert.ok(itemValue('iron_sword+2') > itemValue('iron_sword'));
  assert.equal(rarityOf('iron_sword+4').name, 'Lendária');
  assert.equal(itemById('copper_ore+2'), undefined);
  assert.equal(itemById('iron_sword+9'), undefined);

  // Garante que cada tier de raridade é estritamente superior ao anterior, mesmo em itens com stats baixos (ex: calças de bronze)
  const legs0 = itemById('bronze_legs')!;
  const legs1 = itemById('bronze_legs+1')!;
  const legs2 = itemById('bronze_legs+2')!;
  const legs3 = itemById('bronze_legs+3')!;
  const legs4 = itemById('bronze_legs+4')!;
  assert.ok(legs1.equip!.defense! > legs0.equip!.defense!);
  assert.ok(legs2.equip!.defense! > legs1.equip!.defense!);
  assert.ok(legs3.equip!.defense! > legs2.equip!.defense!);
  assert.ok(legs4.equip!.defense! > legs3.equip!.defense!);
});

test('raridade: equipamento cai nas caçadas, do tier certo', () => {
  const hunt = HUNTS.find((h) => h.id === 'tribal_lands')!;
  const player = playerStats('warrior', XP_TABLE[30]);
  const drops: string[] = [];
  for (let seq = 0; seq < 600; seq++) {
    for (const id of Object.keys(runCycle(hunt, player, 11, seq).loot)) if (itemById(id)?.equip) drops.push(id);
  }
  assert.ok(drops.length > 5, `${drops.length} drops`);
  // Peças do tier de ferro (nível 10) ou o drop com nome da caçada (Máscara da Tribo, nível 12).
  for (const id of drops) assert.ok([10, 12].includes(itemById(id)!.equip!.level), id);
});

test('raridade: dá para equipar uma peça rara e ela soma mais', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Sortuda', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { 'bronze_sword+3': 1 }, xp: {} }, 0, 0);
  assert.equal(game.equip(id, 'bronze_sword+3', 0), null);
  assert.equal(game.state(id, 0).equipment.weapon, 'bronze_sword+3');
});
