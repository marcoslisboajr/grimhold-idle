import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('depósito da conta: pega do outro personagem da mesma conta, e só dele', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const main = db.createCharacter(acc, 'Principal', 'warrior').id;
  const alt = db.createCharacter(acc, 'Segundo', 'arcanist').id;
  const stranger = db.createCharacter(db.accountForToken(db.createGuest())!, 'Estranho', 'hunter').id;
  const now = 1_000_000;
  db.applyGains(alt, { actions: 0, items: { iron_bar: 10, gold: 500, torn_map: 1 }, xp: {} }, now, 0);

  // Lista os outros da conta (sem o próprio e sem os de outra conta).
  assert.deepEqual(game.altBanks(main, now).map((a) => a.name), ['Segundo']);
  assert.equal(game.altBanks(main, now)[0].bank.iron_bar, 10);

  assert.equal(game.takeFromAlt(main, alt, 'iron_bar', 4, now), null);
  assert.equal(db.bankFor(main).iron_bar, 4);
  assert.equal(db.bankFor(alt).iron_bar, 6);
  assert.equal(game.takeFromAlt(main, alt, 'gold', 500, now), null);
  assert.equal(db.bankFor(alt).gold ?? 0, 0);

  assert.match(game.takeFromAlt(main, alt, 'iron_bar', 7, now) ?? '', /não tem/);
  assert.match(game.takeFromAlt(main, alt, 'torn_map', 1, now) ?? '', /quest/);
  assert.match(game.takeFromAlt(main, alt, 'iron_bar', 0, now) ?? '', /Quantidade/);
  assert.match(game.takeFromAlt(main, alt, 'iron_bar', 1.5, now) ?? '', /Quantidade/);
  assert.match(game.takeFromAlt(main, main, 'iron_bar', 1, now) ?? '', /inválido/);
  // De outra conta, nem para lá nem para cá.
  db.applyGains(stranger, { actions: 0, items: { iron_bar: 5 }, xp: {} }, now, 0);
  assert.match(game.takeFromAlt(main, stranger, 'iron_bar', 1, now) ?? '', /não é da sua conta/);
  assert.match(game.takeFromAlt(stranger, alt, 'iron_bar', 1, now) ?? '', /não é da sua conta/);
  assert.equal(db.bankFor(stranger).iron_bar, 5);
});

test('depósito da conta: pedir várias vezes seguidas não cria item (o total da conta não muda)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const a = db.createCharacter(acc, 'Ida', 'warrior').id;
  const b = db.createCharacter(acc, 'Volta', 'hunter').id;
  db.applyGains(b, { actions: 0, items: { dragon_scale: 7 }, xp: {} }, 0, 0);
  const total = () => (db.bankFor(a).dragon_scale ?? 0) + (db.bankFor(b).dragon_scale ?? 0);
  let ok = 0;
  for (let i = 0; i < 20; i++) if (game.takeFromAlt(a, b, 'dragon_scale', 3, 1000 + i) === null) ok++;
  for (let i = 0; i < 20; i++) game.takeFromAlt(b, a, 'dragon_scale', 2, 2000 + i);
  assert.equal(ok, 2, 'só duas vezes 3 cabem em 7');
  assert.equal(total(), 7, 'nada criado nem perdido');
  assert.ok((db.bankFor(a).dragon_scale ?? 0) >= 0 && (db.bankFor(b).dragon_scale ?? 0) >= 0);
});
