import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_QUESTS, QUESTS, XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(bank: Record<string, number> = {}, xp: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Aprendiz', 'warrior').id;
  db.applyGains(id, { actions: 0, items: bank, xp }, 0, 0);
  return { db, game, id };
}

type Game = ReturnType<typeof createGame>;
const quest = (game: Game, id: number, quest: string, now = 0) => game.state(id, now).quests.find((q) => q.id === quest);

test('quests: todo personagem começa com a primeira de cada mestre', () => {
  const { game, id } = setup();
  assert.deepEqual(
    game.state(id, 0).quests.map((q) => q.id),
    FIRST_QUESTS,
  );
  assert.equal(new Set(QUESTS.map((q) => q.id)).size, QUESTS.length);
});

test('quests: coleta conta, entrega na cidade dá a recompensa e libera a próxima', () => {
  const { game, id } = setup();
  assert.equal(game.claimQuest(id, 'alva_1', 0), 'Essa quest ainda não está pronta.');
  assert.equal(game.start(id, 'fishing', 'shrimp_spot', 0), null);
  // 3s por camarão: 15 camarões em 45s.
  game.settle(id, 45_000);
  assert.equal(quest(game, id, 'alva_1', 45_000)?.progress, 15);
  game.stop(id, 45_000);
  assert.equal(game.claimQuest(id, 'alva_1', 45_000), null);
  const s = game.state(id, 45_000);
  assert.equal(s.quests.find((q) => q.id === 'alva_1')?.status, 'claimed');
  assert.equal(s.quests.find((q) => q.id === 'alva_2')?.status, 'active');
  assert.equal(s.bank.gold, 250);
  assert.equal(game.claimQuest(id, 'alva_1', 45_000), 'Essa quest já foi entregue.');
});

test('quests: não entrega fora da cidade', () => {
  const { game, id } = setup({ fang: 10 });
  assert.equal(game.sellNpc(id, 'fang', 10, 0), null);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  assert.match(game.claimQuest(id, 'krash_1', 1000) ?? '', /cidade|Bastião/);
});

test('quests: venda ao Mercador conta; caçada conta só os monstros pedidos', () => {
  const { db, game, id } = setup({ fang: 12 });
  assert.equal(game.sellNpc(id, 'fang', 12, 0), null);
  assert.equal(quest(game, id, 'krash_1')?.progress, 12);

  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 600_000);
  const rats = quest(game, id, 'hellel_1', 600_000)!.progress;
  assert.ok(rats > 0, 'ratos contados');
  // A Margem também tem sapos: os abates totais passam dos ratos.
  const kills = db.skillsFor(id).combat ?? 0;
  assert.ok(kills > 0);
  assert.equal(quest(game, id, 'ifigenia_1', 600_000)?.progress, 0);
});

test('quests: objetivo de nível só conta quando a quest está ativa', () => {
  const { game, id } = setup({}, { combat: XP_TABLE[20] });
  // hellel_3 (nível 15) só abre depois das duas primeiras.
  assert.equal(game.claimQuest(id, 'hellel_3', 0), 'Essa quest ainda não está pronta.');
});
