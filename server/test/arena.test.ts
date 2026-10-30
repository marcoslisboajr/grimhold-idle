import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { ARENAS, ARENA_REST_MS, XP_TABLE } from '@grimhold/shared';

describe('arena de gladiadores (estilo Svargrond)', () => {
  function setup() {
    const db = openDb(':memory:');
    const game = createGame(db);
    const token = db.createGuest();
    const accountId = db.accountForToken(token)!;
    const character = db.createCharacter(accountId, 'Gladiador', 'warrior')!;
    return { db, game, character };
  }

  it('arena: validação de nível e recusa antes do nível 40', () => {
    const { game, character } = setup();
    // Nível 1: recusa
    const err = game.startArena(character.id, 'arena_40', 1000);
    assert.match(err ?? '', /Precisa de nível 40/);
  });

  it('arena: entra com nível 40 e inicia atividade no nó arena:arena_40', () => {
    const { db, game, character } = setup();
    // Dá XP de combate para nível 40
    db.applyGains(character.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[40] } }, 0, 0);
    const err = game.startArena(character.id, 'arena_40', 1000);
    assert.equal(err, null);

    const act = db.activityFor(character.id);
    assert.equal(act?.node, 'arena:arena_40');
    assert.equal(act?.skill, 'combat');
  });

  it('arena: descanso entre os monstros após derrotar é de 5000ms (5 segundos)', () => {
    const { db, game, character } = setup();
    db.applyGains(character.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[50] } }, 0, 0); // nível forte para vencer rápido
    game.startArena(character.id, 'arena_40', 1000);

    const state = game.state(character.id, 1000);
    assert.ok(state.cycle);
    // restMs do ciclo de vitória na arena deve ser ARENA_REST_MS (5000ms)
    assert.equal(state.cycle.restMs, ARENA_REST_MS);
  });

  it('arena: vencer todos os 10 desafiantes coloca em reward_pending', () => {
    const { db, game, character } = setup();
    // Personagem forte com bônus para garantir vitória em todas as 10 ondas
    db.applyGains(character.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[90] } }, 0, 0);
    game.startArena(character.id, 'arena_40', 1000);

    // Avança tempo suficiente para todas as 10 ondas completarem (10 lutas * ~10s = ~100s)
    const { gains } = game.settle(character.id, 1000 + 300_000);
    assert.equal(gains.arenaCleared, 'arena_40');

    const arenas = db.arenasFor(character.id);
    const a40 = arenas.find((a) => a.arenaId === 'arena_40');
    assert.equal(a40?.status, 'reward_pending');
  });

  it('arena: escolher arma entrega o item, troféu, ouro e XP, e marca como completed', () => {
    const { db, game, character } = setup();
    db.applyGains(character.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[90] } }, 0, 0);
    game.startArena(character.id, 'arena_40', 1000);
    game.settle(character.id, 1000 + 300_000);

    // Escolhe a Lâmina do Gladiador
    const err = game.claimArenaReward(character.id, 'arena_40', 'arena_sword', 1000 + 300_000);
    assert.equal(err, null);

    const bank = db.bankFor(character.id);
    assert.equal(bank.arena_sword, 1);
    assert.equal(bank.arena_trophy_40, 1);
    assert.ok(bank.gold >= ARENAS[0].rewardGold);

    const arenas = db.arenasFor(character.id);
    const a40 = arenas.find((a) => a.arenaId === 'arena_40');
    assert.equal(a40?.status, 'completed');
    assert.equal(a40?.rewardChosen, 'arena_sword');

    // Não pode resgatar de novo
    const errAgain = game.claimArenaReward(character.id, 'arena_40', 'arena_axe', 1000 + 300_000);
    assert.match(errAgain ?? '', /ainda não venceu a arena/);

    // Não pode entrar de novo
    const errReenter = game.startArena(character.id, 'arena_40', 1000 + 300_000);
    assert.match(errReenter ?? '', /já conquistou essa arena/);
  });
});
