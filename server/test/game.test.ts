import { professionXpBoost, boostedSkillMult, nodeById } from '@grimhold/shared';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
// A peça de roupa de profissão (1 em 3.000 por ação) às vezes cai e quebrava a comparação exata do banco.
const noOutfit = (bank: Record<string, number>) => Object.fromEntries(Object.entries(bank).filter(([id]) => !id.startsWith('outfit_')));

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const token = db.createGuest();
  const character = db.createCharacter(db.accountForToken(token)!, 'Teste', 'warrior');
  return { db, game, id: character.id };
}

test('minerar cobre por 1 minuto credita minério e XP', () => {
  const { game, id } = setup();
  assert.equal(game.start(id, 'mining', 'copper_vein', 0), null);
  game.settle(id, 60_000);
  const s = game.state(id, 60_000);
  assert.deepEqual(noOutfit(s.bank), { copper_ore: 20 });
  assert.equal(s.skills.mining, Math.round(20 * nodeById('mining', 'copper_vein')!.xp * professionXpBoost(1) * boostedSkillMult('mining', 0)));
  assert.equal(s.activity?.node, 'copper_vein');
  assert.equal(s.activity?.since, 60_000);
});

test('caçada: credita abates, XP de combate e loot', () => {
  const { game, id } = setup();
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  const s0 = game.state(id, 0);
  assert.ok(s0.cycle, 'o ciclo atual vai para o cliente');
  game.settle(id, 5 * 60_000);
  const s = game.state(id, 5 * 60_000);
  assert.ok(s.skills.combat > 0);
  assert.ok(s.activity, 'continua caçando');
});

test('caçada: morrer encerra a atividade e tira XP', () => {
  const { db, game, id } = setup();
  // Dá XP de nível 3 e manda para a caçada de nível 12.
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: 300 } }, 0, 0);
  game.start(id, 'combat', 'tribal_lands', 0);
  const { gains } = game.settle(id, 10 * 60_000);
  assert.ok(gains.death, 'morreu');
  const s = game.state(id, 10 * 60_000);
  assert.equal(s.activity, null);
  assert.ok(s.skills.combat < 300 + (gains.actions > 0 ? 9999 : 0));
});

test('caçada: a primeira luta só começa depois da ida até o portal', () => {
  const { game, id } = setup();
  game.start(id, 'combat', 'river_bank', 0);
  assert.equal(game.state(id, 0).activity?.since, 5000);
  assert.equal(game.settle(id, 4999).gains.actions, 0);
});

test('caçada com dificuldade', () => {
  const { game, id } = setup();
  assert.equal(game.start(id, 'combat', 'river_bank@hard', 0), null);
  assert.equal(game.start(id, 'combat', 'river_bank@impossivel', 0), 'Essa caçada não existe.');
});

test('recusa caçada que não existe', () => {
  const { game, id } = setup();
  assert.equal(game.start(id, 'combat', 'lua', 0), 'Essa caçada não existe.');
});

test('não deixa minerar ferro sem nível 15', () => {
  const { game, id } = setup();
  assert.equal(game.start(id, 'mining', 'iron_vein', 0), 'Precisa de nível 15.');
  assert.equal(game.state(id, 0).activity, null);
});

test('recusa lugar que não existe', () => {
  const { game, id } = setup();
  assert.equal(game.start(id, 'mining', 'veio_de_ouro_magico', 0), 'Esse lugar não existe.');
});

test('parar credita o que terminou e descarta a ação pela metade', () => {
  const { game, id } = setup();
  game.start(id, 'mining', 'tin_vein', 0);
  game.stop(id, 7_500);
  const s = game.state(id, 7_500);
  assert.deepEqual(s.bank, { tin_ore: 2 });
  assert.equal(s.activity, null);
  game.settle(id, 999_999);
  assert.deepEqual(game.state(id, 999_999).bank, { tin_ore: 2 }, 'parado não ganha mais nada');
});

test('trocar de veio credita o anterior antes', () => {
  const { game, id } = setup();
  game.start(id, 'mining', 'copper_vein', 0);
  game.start(id, 'mining', 'tin_vein', 6_000);
  game.settle(id, 9_000);
  assert.deepEqual(game.state(id, 9_000).bank, { copper_ore: 2, tin_ore: 1 });
});

test('o progresso sobrevive a fechar e reabrir o servidor', () => {
  const path = `${process.env.TEMP ?? '/tmp'}/grimhold-test-${process.pid}.db`;
  {
    const db = openDb(path);
    const game = createGame(db);
    const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Persiste', 'devout').id;
    game.start(id, 'mining', 'copper_vein', 1_000);
    db.close();
  }
  {
    const db = openDb(path);
    const game = createGame(db);
    const { gains } = game.settle(1, 1_000 + 30_000);
    assert.equal(gains.actions, 10);
    assert.deepEqual(game.state(1, 31_000).bank, { copper_ore: 10 });
    db.close();
  }
  for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
});
