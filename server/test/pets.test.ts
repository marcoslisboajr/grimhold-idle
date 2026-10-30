import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { PETS, PET_XP_BONUS, professionXpBoost, boostedSkillMult, SKILLS, petForSkill, nodeById, petSkillsOf, petLootOf } from '@grimhold/shared';
import { existsSync } from 'node:fs';

test('mascotes de profissão: desbloqueio, equipar/guardar e bônus de +50% de XP', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const now = 1000000;

  const token = db.createGuest();
  const accId = db.accountForToken(token)!;
  const char = db.createCharacter(accId, 'PetMaster', 'warrior');

  // Começa sem nenhum pet
  let state = game.state(char.id, now);
  assert.deepEqual(state.unlockedPets, []);
  assert.equal(state.activePet, null);

  // Tenta equipar pet não desbloqueado
  const err = game.setPet(char.id, 'pet_mining_golem', now);
  assert.match(err ?? '', /desbloqueou/);

  // Desbloqueia o pet de mineração
  db.unlockPet(char.id, 'pet_mining_golem');
  assert.deepEqual(db.petsFor(char.id), ['pet_mining_golem']);

  // Equipa o pet
  const ok = game.setPet(char.id, 'pet_mining_golem', now);
  assert.equal(ok, null);
  assert.equal(db.activePetFor(char.id), 'pet_mining_golem');

  state = game.state(char.id, now);
  assert.deepEqual(state.unlockedPets, ['pet_mining_golem']);
  assert.equal(state.activePet, 'pet_mining_golem');

  // Inicia mineração de cobre e confere ganho de XP com bônus de +50%
  game.start(char.id, 'mining', 'copper_vein', now);
  const miningTime = 12000;
  const { gains } = game.settle(char.id, now + miningTime);
  assert.ok(gains.actions > 0, 'deve ter realizado ações de mineração');
  assert.ok(gains.xp.mining, 'deve ter ganho xp em mineração');
  // XP do cobre por ação, com +50% do pet.
  const expectedXpPerAction = Math.round(nodeById('mining', 'copper_vein')!.xp * (1 + PET_XP_BONUS));
  assert.equal(gains.xp.mining, Math.round(gains.actions * expectedXpPerAction * professionXpBoost(1) * boostedSkillMult('mining', now)));

  // Desequipar o mascote (guardar)
  game.setPet(char.id, null, now + miningTime);
  assert.equal(db.activePetFor(char.id), null);

  state = game.state(char.id, now + miningTime);
  assert.equal(state.activePet, null);
});

test('toda profissão tem o seu mascote (com sprite)', () => {
  // Slayer não é atividade (sobe com os abates da tarefa): ainda sem mascote.
  const combat = new Set(['combat', 'melee', 'ranged', 'magic_level', 'shielding', 'slayer']);
  for (const s of SKILLS.filter((s) => !combat.has(s.id))) {
    const pet = petForSkill(s.id);
    assert.ok(pet, `${s.id} sem mascote`);
    assert.ok(existsSync(new URL(`../../client/public/assets/pets/${pet!.sprite}.png`, import.meta.url)), `${pet!.id} sem sprite`);
  }
});

test('mascotes: o bônus vale só de ter (sem equipar); o Mimiquinho dá +15% de loot', () => {

  assert.deepEqual(petSkillsOf(['pet_mining_golem', 'pet_mimic', 'pet_kids_crab']), ['mining']);
  assert.equal(petLootOf(['pet_mimic', 'pet_mining_golem']), 0.15);
  assert.equal(petLootOf([]), 0);
  // Guardado (sem equipar) o mascote de mineração continua dando +50%.
  const db = openDb(':memory:');
  const game = createGame(db);
  const now = 1_000_000;
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'SemEquipar', 'warrior').id;
  db.unlockPet(id, 'pet_mining_golem');
  game.setPet(id, null, now);
  assert.equal(db.activePetFor(id), null);
  game.start(id, 'mining', 'copper_vein', now);
  const { gains } = game.settle(id, now + 12_000);
  const perAction = Math.round(nodeById('mining', 'copper_vein')!.xp * (1 + PET_XP_BONUS));
  assert.equal(gains.xp.mining, Math.round(gains.actions * perAction * professionXpBoost(1) * boostedSkillMult('mining', now)));
});
