import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUMMY_NODES, NODES, getBoostedSkill, STAMINA_MAX_MS, XP_TABLE, simulateHunt, staminaXpMult } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const H = 3_600_000;

test('stamina: +80% e +50% no topo, normal no resto (sem punição com pouca stamina desde 18/10)', () => {
  assert.equal(staminaXpMult(42 * H), 1.8);
  assert.equal(staminaXpMult(41.5 * H), 1.8);
  assert.equal(staminaXpMult(41 * H), 1.5);
  assert.equal(staminaXpMult(40 * H), 1.5);
  assert.equal(staminaXpMult(39 * H), 1);
  assert.equal(staminaXpMult(20 * H), 1);
  assert.equal(staminaXpMult(12 * H), 1);
  assert.equal(staminaXpMult(0), 1);
});

test('stamina cheia rende 1,8x a XP e gasta o tempo caçado', () => {
  const activity = { skill: 'combat' as const, node: 'river_bank', since: 0, seed: 42, seq: 0 };
  // Nível alto no rio: não sobe de nível em 1 h, então só a stamina muda a XP.
  const ctx = { vocation: 'warrior', combatXp: XP_TABLE[40] };
  const plain = simulateHunt(activity, H, ctx);
  const full = simulateHunt(activity, H, { ...ctx, staminaMs: STAMINA_MAX_MS });
  const ratio = full.gains.xp.combat! / plain.gains.xp.combat!;
  assert.ok(ratio > 1.75 && ratio < 1.85, `razão ${ratio}`);
  const spent = STAMINA_MAX_MS - full.gains.staminaLeftMs!;
  assert.ok(spent > 0.95 * H && spent <= H, `gastou ${spent}`);
});

test('stamina: caçar gasta, ficar na cidade recupera 1 h a cada 1 h (20/10)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Cansado', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[5] } }, 0, 0);
  assert.equal(game.state(id, 0).stamina, STAMINA_MAX_MS);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 6 * H);
  const afterHunt = game.state(id, 6 * H).stamina!;
  assert.ok(afterHunt < STAMINA_MAX_MS - 5.5 * H, `depois de caçar: ${afterHunt / H} h`);
  game.stop(id, 6 * H);
  const rested = game.state(id, 8 * H).stamina!;
  assert.ok(Math.abs(rested - afterHunt - 2 * H) < 0.1 * H, `recuperou ${(rested - afterHunt) / H} h em 2 h parado`);
});

test('stamina: treinando profissão recupera 1 h a cada 30 min (o dobro de ficar parado)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Lenhador', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[5] } }, 0, 0);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 6 * H);
  game.stop(id, 6 * H);
  const tired = game.state(id, 6 * H).stamina!;
  assert.equal(game.start(id, 'woodcutting', 'tree', 6 * H), null);
  game.settle(id, 8 * H);
  const after = game.state(id, 8 * H).stamina!;
  assert.ok(Math.abs(after - tired - 4 * H) < 0.1 * H, `recuperou ${(after - tired) / H} h em 2 h de profissão`);
});

test('stamina: treinando no boneco recupera 1 h a cada 30 min', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Treineiro', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[5] } }, 0, 0);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 6 * H);
  game.stop(id, 6 * H);
  const tired = game.state(id, 6 * H).stamina!;
  assert.equal(game.start(id, 'combat', DUMMY_NODES[0].id, 6 * H), null);
  game.settle(id, 8 * H);
  const after = game.state(id, 8 * H).stamina!;
  assert.ok(Math.abs(after - tired - 4 * H) < 0.1 * H, `recuperou ${(after - tired) / H} h em 2 h de boneco`);
});

test('stamina: treinando a Skill do Dia recupera 1 h a cada 15 min', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Coletor', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[5] } }, 0, 0);
  // Um dia em que a Skill do Dia é de coleta (tem ponto de nível 1 sem precisar de material).
  let day = 1;
  while (!(getBoostedSkill(new Date(day * 24 * H)) in NODES)) day++;
  const t0 = day * 24 * H;
  const skill = getBoostedSkill(new Date(t0)) as keyof typeof NODES;
  assert.equal(game.start(id, 'combat', 'river_bank', t0), null);
  game.settle(id, t0 + 6 * H);
  game.stop(id, t0 + 6 * H);
  const tired = game.state(id, t0 + 6 * H).stamina!;
  assert.equal(game.start(id, skill, NODES[skill][0].id, t0 + 6 * H), null);
  game.settle(id, t0 + 7 * H);
  const after = game.state(id, t0 + 7 * H).stamina!;
  assert.ok(Math.abs(after - tired - 4 * H) < 0.1 * H, `recuperou ${(after - tired) / H} h em 1 h de Skill do Dia`);
});

test('bônus de alcançar o topo: +50% até o 60, cai até zerar no 100, nada do 100 para cima', async () => {
  const { catchUpXpBoost } = await import('@grimhold/shared');
  assert.equal(catchUpXpBoost(30), 1.5);
  assert.equal(catchUpXpBoost(60), 1.5);
  assert.equal(catchUpXpBoost(80), 1.25);
  assert.equal(catchUpXpBoost(100), 1);
  assert.equal(catchUpXpBoost(130), 1);
});

test('estágios de XP: normal até o 299, depois 0,7 / 0,5 / 0,35 / 0,25', async () => {
  const { xpStageMult } = await import('@grimhold/shared');
  assert.equal(xpStageMult(1), 2);
  assert.equal(xpStageMult(49), 2);
  assert.equal(xpStageMult(50), 3);
  assert.equal(xpStageMult(100), 3);
  assert.equal(xpStageMult(120), 2);
  assert.equal(xpStageMult(150), 1.5);
  assert.equal(xpStageMult(200), 1);
  assert.equal(xpStageMult(299), 1);
  assert.equal(xpStageMult(300), 0.7);
  assert.equal(xpStageMult(450), 0.5);
  assert.equal(xpStageMult(600), 0.35);
  assert.equal(xpStageMult(900), 0.25);
});
