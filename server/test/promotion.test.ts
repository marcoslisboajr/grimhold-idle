import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playerStats, promotionsFor, XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(combatXp: number) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Aprendiz', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: combatXp } }, 0, 0);
  return { db, game, id };
}

test('cada vocação tem 3 promoções', () => {
  for (const v of ['warrior', 'hunter', 'arcanist', 'devout']) assert.equal(promotionsFor(v).length, 3);
});

test('promoção: só no nível 30, só da própria vocação, uma vez', () => {
  const low = setup(XP_TABLE[29]);
  assert.equal(low.game.promote(low.id, 'paladin', 0), 'Precisa de nível 30 de combate.');

  const { game, id } = setup(XP_TABLE[30]);
  assert.equal(game.promote(id, 'archer', 0), 'Promoção inválida.');
  assert.equal(game.promote(id, 'paladin', 0), null);
  assert.equal(game.state(id, 0).promotion, 'paladin');
  assert.equal(game.promote(id, 'berserker', 0), 'Você já foi promovido.');
});

test('promoção muda os atributos', () => {
  const base = playerStats('warrior', XP_TABLE[30]);
  const paladin = playerStats('warrior', XP_TABLE[30], undefined, 'paladin');
  assert.ok(paladin.hp > base.hp && paladin.defense > base.defense);
  const berserker = playerStats('warrior', XP_TABLE[30], undefined, 'berserker');
  assert.ok(berserker.attackSpeedMs < base.attackSpeedMs);
});

test('segunda promoção (Tier 2): nível 70, precisa da subclasse correspondente e quest concluída', () => {
  // 1. Não pode ascender para Tier 2 sem a promoção Tier 1
  const t2Low = setup(XP_TABLE[70]);
  assert.equal(t2Low.game.promote(t2Low.id, 'crusader', 0), 'Precisa da primeira promoção antes de ascender.');

  // 2. Faz a primeira promoção (Paladino)
  assert.equal(t2Low.game.promote(t2Low.id, 'paladin', 0), null);

  // 3. Tenta ascender para subclasse errada (Warlord exige Berserker)
  assert.equal(t2Low.game.promote(t2Low.id, 'warlord', 0), 'Essa ascensão não corresponde à sua subclasse atual.');

  // 4. Sem quest concluída, recusa
  assert.equal(t2Low.game.promote(t2Low.id, 'crusader', 0), 'Você precisa concluir a Provação dos Campeões para ascender.');

  // 5. Conclui a quest 'master_ascension'
  t2Low.db.setStoryStep(t2Low.id, 'master_ascension', 0);
  t2Low.db.finishStory(t2Low.id, 'master_ascension', 'ascension_complete');

  // 6. Agora ascende com sucesso para Cruzado (Tier 2)
  assert.equal(t2Low.game.promote(t2Low.id, 'crusader', 0), null);
  assert.equal(t2Low.game.state(t2Low.id, 0).promotion, 'crusader');

  // 7. Atributos do Cruzado superam o Paladino
  const pStats = playerStats('warrior', XP_TABLE[70], undefined, 'paladin');
  const cStats = playerStats('warrior', XP_TABLE[70], undefined, 'crusader');
  assert.ok(cStats.hp > pStats.hp && cStats.defense > pStats.defense);
});
