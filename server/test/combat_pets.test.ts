import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT_PETS, PETS, WORLD_BOSSES, WORLD_BOSS_COMBAT_PETS, lairCombatPet, petById, withCombatPet, petSkillsOf } from '@grimhold/shared';
import { existsSync } from 'node:fs';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('mascotes de combate: 8, com sprite, sem bônus de profissão, nomes únicos', () => {
  assert.equal(COMBAT_PETS.length, 8);
  const names = new Set(PETS.map((p) => p.name));
  assert.equal(names.size, PETS.length, 'nenhum nome de mascote repetido');
  for (const p of COMBAT_PETS) {
    assert.ok(existsSync(new URL(`../../client/public/assets/pets/${p.sprite}.png`, import.meta.url)), p.id);
    assert.ok(p.combat && Object.keys(p.combat).length > 0);
  }
  assert.deepEqual(petSkillsOf(COMBAT_PETS.map((p) => p.id)), []);
  for (const [boss, pet] of Object.entries(WORLD_BOSS_COMBAT_PETS)) {
    assert.ok(WORLD_BOSSES.some((b) => b.id === boss), boss);
    assert.ok(petById(pet)?.combat, pet);
  }
  assert.deepEqual([1, 100, 101, 250, 251, 375, 376, 500].map(lairCombatPet), ['pet_wolf_cub', 'pet_wolf_cub', 'pet_stone_turtle', 'pet_stone_turtle', 'pet_blood_bat', 'pet_blood_bat', 'pet_healing_wisp', 'pet_healing_wisp']);
});

test('mascote de combate: soma ao bônus só equipado, um por vez, e só se o personagem tiver', () => {
  const b = withCombatPet({ attack: 10, defense: 5, hp: 100, attackPct: 0.1 }, 'pet_wolf_cub');
  assert.equal(b.attackPct, 0.14);
  assert.deepEqual(withCombatPet({ attack: 1, defense: 1, hp: 1 }, null), { attack: 1, defense: 1, hp: 1 });
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Domador', 'warrior').id;
  assert.match(game.equipCombatPet(id, 'pet_wolf_cub') ?? '', /não tem/);
  assert.match(game.equipCombatPet(id, 'pet_mining_golem') ?? '', /não é de combate/);
  const before = game.combatBonus(id).attackPct ?? 0;
  db.unlockPet(id, 'pet_wolf_cub');
  db.unlockPet(id, 'pet_stone_turtle');
  assert.equal(game.equipCombatPet(id, 'pet_wolf_cub'), null);
  assert.equal(game.state(id, 0).combatPet, 'pet_wolf_cub');
  assert.equal(Number(((game.combatBonus(id).attackPct ?? 0) - before).toFixed(6)), 0.04);
  assert.equal(game.equipCombatPet(id, 'pet_stone_turtle'), null);
  assert.equal(Number(((game.combatBonus(id).attackPct ?? 0) - before).toFixed(6)), 0, 'trocou: o lobinho saiu');
  assert.equal(game.combatBonus(id).defensePct, 0.04);
  assert.equal(game.equipCombatPet(id, null), null);
  assert.equal(game.state(id, 0).combatPet, null);
});
