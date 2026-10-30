import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { imbuementsBonus, imbuementById, playerStats, equipmentBonus, mergeBonus } from '@grimhold/shared';

function setup(bank: Record<string, number> = {}) {
  const db = openDb(':memory:');
  const accId = db.accountForToken(db.createGuest())!;
  const ch = db.createCharacter(accId, 'Imbuer', 'warrior');
  db.applyGains(ch.id, { actions: 0, items: bank, xp: {} }, 0, 0);
  const game = createGame(db);
  return { db, game, id: ch.id };
}

test('imbuements: gasta materiais do banco e ativa o encantamento', () => {
  const { game, id } = setup({ bat_wing: 20 });
  assert.equal(game.imbue(id, 'vampirism_1', 0), null);
  const s = game.state(id, 0);
  assert.equal(s.bank.bat_wing ?? 0, 0);
  assert.equal(s.imbuements.vampirism_1, 7200);

  const imbBonus = imbuementsBonus(s.imbuements);
  assert.equal(imbBonus.lifesteal, 0.05);

  const stats = playerStats('warrior', 0, imbBonus);
  assert.equal(stats.lifesteal, 0.05);
});

test('imbuements: recusa se faltar material', () => {
  const { game, id } = setup({ bat_wing: 10 });
  const err = game.imbue(id, 'vampirism_1', 0);
  assert.match(err ?? '', /Faltam materiais/);
  const s = game.state(id, 0);
  assert.equal(s.imbuements.vampirism_1, undefined);
});

test('imbuements: recusa fora da cidade (durante caçada)', () => {
  const { game, id } = setup({ bat_wing: 20 });
  game.start(id, 'combat', 'river_bank:normal', 0);
  const err = game.imbue(id, 'vampirism_1', 0);
  assert.match(err ?? '', /Bastião/);
});

test('imbuements: tempo de caçada consome a duração do encantamento', () => {
  const { game, id } = setup({ minotaur_horn: 20 });
  assert.equal(game.imbue(id, 'strike_1', 0), null);
  assert.equal(game.state(id, 0).imbuements.strike_1, 7200);

  // Inicia caçada e simula 10 minutos (600s = 600_000ms)
  // Nota: o deslocamento é TRAVEL_MS (10s), então de 0 a 600s são consumidos
  game.start(id, 'combat', 'river_bank:normal', 0);
  game.settle(id, 600_000);

  const s = game.state(id, 600_000);
  // O tempo restante deve ter diminuído
  assert.ok(s.imbuements.strike_1 < 7200);
  assert.ok(s.imbuements.strike_1 <= 6610);
});

test('imbuements: o bônus só vale até o tempo acabar, mesmo numa simulação offline longa', async () => {
  const { bonusAt, simulateHunt, XP_TABLE } = await import('@grimhold/shared');
  const ctx = { vocation: 'warrior', combatXp: XP_TABLE[20], bonus: { attack: 0, defense: 0, hp: 0 }, timedBonus: [{ bonus: { attack: 50, defense: 0, hp: 0 }, untilMs: 60_000 }] };
  assert.equal(bonusAt(ctx, 59_999)!.attack, 50);
  assert.equal(bonusAt(ctx, 60_000)!.attack, 0);
  // Imbuement que já acabou no início não muda nada; um que dura tudo muda.
  const activity = { skill: 'combat' as const, node: 'orc_fortress', since: 0, seed: 9, seq: 0 };
  const hours = 6 * 3600_000;
  const plain = simulateHunt(activity, hours, { ...ctx, timedBonus: [] });
  const expired = simulateHunt(activity, hours, { ...ctx, timedBonus: [{ bonus: { attack: 50, defense: 0, hp: 0 }, untilMs: 0 }] });
  const forever = simulateHunt(activity, hours, { ...ctx, timedBonus: [{ bonus: { attack: 50, defense: 0, hp: 0 }, untilMs: hours }] });
  assert.deepEqual(expired.gains, plain.gains);
  assert.ok(forever.gains.actions > plain.gains.actions);
});
