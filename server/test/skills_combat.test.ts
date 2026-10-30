import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  playerStats,
  levelForXp,
  isCombatSkill,
  simulateDummy,
  DUMMY_NODES,
  dummyById,
  simulateHunt,
  HUNTS,
  XP_TABLE,
  type Activity,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('skills de combate: são infinitas e não travam no nível 120', () => {
  const highXp = XP_TABLE[120] * 5;
  assert.ok(isCombatSkill('combat'));
  assert.ok(isCombatSkill('melee'));
  assert.ok(isCombatSkill('ranged'));
  assert.ok(isCombatSkill('magic_level'));
  assert.ok(isCombatSkill('shielding'));
  assert.ok(!isCombatSkill('mining'));

  const lvlMining = levelForXp(highXp, 'mining');
  const lvlMelee = levelForXp(highXp, 'melee');
  assert.equal(lvlMining, 120, 'profissão deve travar em 120');
  assert.ok(lvlMelee > 120, 'skills de combate devem passar de 120');
});

test('playerStats: melee aumenta ataque corpo a corpo, ranged aumenta arco, magic_level aumenta magias', () => {
  const baseWarrior = playerStats('warrior', XP_TABLE[20]);
  const skilledWarrior = playerStats('warrior', XP_TABLE[20], undefined, null, [], { melee: XP_TABLE[30] });
  assert.ok(skilledWarrior.attack > baseWarrior.attack, 'melee deve aumentar o ataque');

  const baseHunter = playerStats('hunter', XP_TABLE[20]);
  const skilledHunter = playerStats('hunter', XP_TABLE[20], undefined, null, [], { ranged: XP_TABLE[30] });
  assert.ok(skilledHunter.attack > baseHunter.attack, 'ranged deve aumentar o ataque');

  const baseMage = playerStats('arcanist', XP_TABLE[20], undefined, null, ['fireball']);
  const skilledMage = playerStats('arcanist', XP_TABLE[20], undefined, null, ['fireball'], { magic_level: XP_TABLE[30] });
  const baseStrike = baseMage.spells?.[0]?.effect.kind === 'strike' ? baseMage.spells[0].effect.mult : 0;
  const skilledStrike = skilledMage.spells?.[0]?.effect.kind === 'strike' ? skilledMage.spells[0].effect.mult : 0;
  assert.ok(skilledStrike > baseStrike, 'magic_level deve aumentar o multiplicador de dano da magia');
});

test('boneco de treino (dummy): treina AFK de forma segura na cidade', () => {
  const dummy = dummyById('dummy_melee')!;
  assert.ok(dummy);
  const act: Activity = { skill: 'combat', node: 'dummy_melee', since: 0, seed: 123, seq: 0 };
  const ctx = {
    vocation: 'warrior',
    combatXp: 1000,
    bonus: { attack: 10, defense: 15, hp: 50 },
    bank: {},
  };
  const res = simulateDummy(act, 60_000, ctx);
  assert.ok(res.gains.actions > 0);
  assert.ok((res.gains.xp.melee ?? 0) > 0, 'deve ganhar XP de melee');
  assert.equal(res.gains.xp.combat, undefined, 'dummy não deve dar XP de combat');
  assert.ok((res.gains.xp.shielding ?? 0) > 0, 'deve ganhar XP de shielding com escudo equipado');
});

test('servidor game: inicia treino no dummy e credita progresso', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const accountId = db.accountForToken(db.createGuest())!;
  const ch = db.createCharacter(accountId, 'Treinador', 'warrior');

  const err = game.start(ch.id, 'combat', 'dummy_ranged', 1000);
  assert.equal(err, null);

  const act = db.activityFor(ch.id);
  assert.equal(act?.node, 'dummy_ranged');

  // Simula 30 segundos depois
  game.settle(ch.id, 1000 + 30_000);
  const skills = db.skillsFor(ch.id);
  assert.ok((skills.ranged ?? 0) > 0, 'deve ter ganho XP de ranged no dummy');
  assert.equal(skills.combat ?? 0, 0, 'dummy não deve conceder XP de combat');
});
