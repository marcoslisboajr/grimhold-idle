import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

/**
 * Fila de profissões (18/10): quando a atual acaba (material ou hora marcada), a próxima começa no
 * mesmo instante, inclusive com o jogo fechado; a coleta da fila para na hora pedida.
 */
test('fila de profissões: forja até acabar, cozinha até acabar, minera 1 h e para', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Ferreiro', 'warrior');
  db.applyGains(c.id, { actions: 0, items: { copper_ore: 10, tin_ore: 10, raw_shrimp: 6 }, xp: {} }, 0, 0);
  const t0 = 1_000_000;
  const bank0 = db.bankFor(c.id);
  assert.equal(game.start(c.id, 'smithing', 'bronze_bar', t0), null);
  assert.equal(
    game.setQueue(c.id, [{ skill: 'cooking', node: 'cook_shrimp' }, { skill: 'mining', node: 'copper_vein', hours: 1 }], t0),
    null,
  );
  // Fica 5 horas fora: 10 barras (30 s), 6 camarões (12 s), 1 h de mineração e depois parado.
  game.settle(c.id, t0 + 5 * 3_600_000);
  const bank = db.bankFor(c.id);
  assert.equal(bank.bronze_bar ?? 0, (bank0.bronze_bar ?? 0) + 10, 'forjou as 10 barras');
  assert.equal(bank.cooked_shrimp ?? 0, (bank0.cooked_shrimp ?? 0) + 6, 'cozinhou os 6 camarões');
  const ore = (bank.copper_ore ?? 0) - (bank0.copper_ore ?? 0) + 10;
  assert.ok(ore > 10, `minerou cobre depois (${ore})`);
  assert.equal(db.activityFor(c.id), null, 'depois da 1 h de mineração ficou parado');
  assert.deepEqual(db.queueFor(c.id), { queue: [], until: null }, 'a fila esvaziou');
  // A mineração durou 1 h: mais 1 h de "fora" não rende nada.
  const oreBefore = db.bankFor(c.id).copper_ore ?? 0;
  game.settle(c.id, t0 + 6 * 3_600_000);
  assert.equal(db.bankFor(c.id).copper_ore ?? 0, oreBefore);
});

test('fila de profissões: pula a tarefa sem material, recusa caçada e coleta sem horas', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Pulador', 'hunter');
  db.applyGains(c.id, { actions: 0, items: { raw_shrimp: 3 }, xp: {} }, 0, 0);
  const t0 = 1_000_000;
  assert.match(game.setQueue(c.id, [{ skill: 'combat', node: 'river_bank' }], t0)!, /profissões/);
  assert.match(game.setQueue(c.id, [{ skill: 'mining', node: 'copper_vein' }], t0)!, /horas/);
  assert.equal(game.start(c.id, 'cooking', 'cook_shrimp', t0), null);
  // Sem minério para a forja: pula e vai para a mineração.
  assert.equal(game.setQueue(c.id, [{ skill: 'smithing', node: 'bronze_bar' }, { skill: 'mining', node: 'copper_vein', hours: 2 }], t0), null);
  game.settle(c.id, t0 + 60_000);
  assert.equal(db.activityFor(c.id)?.skill, 'mining', 'pulou a forja sem material');
  assert.ok(db.queueFor(c.id).until! > t0, 'a mineração tem hora para parar');
});

test('profissão parou sozinha: aviso diz o material que acabou e o que a fila pulou', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Calado', 'warrior');
  db.applyGains(c.id, { actions: 0, items: { copper_ore: 3, tin_ore: 10 }, xp: {} }, 0, 0);
  const t0 = 1_000_000;
  assert.equal(game.start(c.id, 'smithing', 'bronze_bar', t0), null);
  assert.equal(game.setQueue(c.id, [{ skill: 'smithing', node: 'bronze_bar' }], t0), null);
  game.settle(c.id, t0 + 3_600_000);
  assert.equal(db.activityFor(c.id), null);
  const stop = game.state(c.id, t0 + 3_600_000).activityStop;
  assert.ok(stop, 'tem aviso');
  assert.match(stop!.text, /acabou .*Cobre/);
  assert.match(stop!.text, /A fila pulou: Barra de Bronze/);
  assert.match(stop!.text, /voltou para a cidade/);
  assert.ok(stop!.at > t0 && stop!.at < t0 + 3_600_000, 'horário em que parou, não o de agora');
});
