import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE, taskShopPrice } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(points: number) {
  const db = openDb(':memory:');
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Cacador', 'hunter').id;
  db.addStat(id, 'hunting_points', points);
  return { db, id, game: createGame(db) };
}

test('loja de tarefas: gasta o saldo sem tirar a patente', () => {
  const { db, id, game } = setup(30);
  assert.equal(game.buyTaskShop(id, 'prey_wildcard', undefined, 0), null);
  assert.equal(db.bankFor(id).prey_wildcard, 1);
  const st = game.state(id, 0);
  assert.equal(st.huntingPoints, 30, 'o total (patente) não cai');
  assert.equal(st.huntingPointsSpent, 10);
  game.buyTaskShop(id, 'prey_wildcard', undefined, 0);
  game.buyTaskShop(id, 'prey_wildcard', undefined, 0);
  assert.match(game.buyTaskShop(id, 'prey_wildcard', undefined, 0)!, /Faltam 10/, 'saldo zerado');
});

test('loja de tarefas: materiais pedem Rastreador e charm pede Elite', () => {
  const low = setup(40);
  assert.match(low.game.buyTaskShop(low.id, 'imbuement_material', 'bat_wing', 0)!, /patente/);
  const mid = setup(60);
  assert.match(mid.game.buyTaskShop(mid.id, 'imbuement_material', 'nao_existe', 0)!, /material/);
  assert.equal(mid.game.buyTaskShop(mid.id, 'imbuement_material', 'bat_wing', 0), null);
  assert.equal(mid.db.bankFor(mid.id).bat_wing, 10);
  assert.match(mid.game.buyTaskShop(mid.id, 'charm_points', undefined, 0)!, /patente/);
  const elite = setup(150);
  assert.equal(elite.game.buyTaskShop(elite.id, 'charm_points', undefined, 0), null);
  assert.equal(elite.game.state(elite.id, 0).charmBonus, 5);
});

test('loja de tarefas: Lendário paga 20% menos', () => {
  assert.equal(taskShopPrice('charm_points', 299), 40);
  assert.equal(taskShopPrice('charm_points', 300), 32);
  assert.equal(taskShopPrice('prey_wildcard', 300), 8);
});

test('curinga de presa: troca sem ouro depois da grátis do dia', () => {
  const { db, id, game } = setup(10);
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[10] } }, 0, 0);
  game.buyTaskShop(id, 'prey_wildcard', undefined, 0);
  assert.equal(game.preyReroll(id, 0, 0), null); // vaga vazia
  assert.equal(game.preyReroll(id, 0, 0), null); // grátis do dia
  assert.equal(game.preyReroll(id, 0, 0), null, 'o curinga paga, sem ouro');
  assert.equal(db.bankFor(id).prey_wildcard ?? 0, 0);
  assert.match(game.preyReroll(id, 0, 0)!, /Faltam moedas/);
});

test('loja de tarefas: cada XP em dobro do mesmo dia custa 5x o anterior; o dia seguinte volta ao preço normal (26/10)', () => {
  const { db, id, game } = setup(100_000);
  const NOW = Date.UTC(2026, 9, 27, 15);
  const spent = () => db.statsFor(id).hunting_points_spent ?? 0;
  const prices: number[] = [];
  for (let i = 0; i < 3; i++) {
    const before = spent();
    assert.equal(game.buyTaskShop(id, 'xp_boost', undefined, NOW), null);
    prices.push(spent() - before);
  }
  assert.deepEqual(prices, [prices[0], prices[0] * 5, prices[0] * 25]);
  assert.equal(game.state(id, NOW).taskXpBoostsToday, 3);
  assert.equal(taskShopPrice('xp_boost', 100_000, 3), prices[0] * 125);
  const next = NOW + 24 * 3_600_000;
  const before = spent();
  assert.equal(game.buyTaskShop(id, 'xp_boost', undefined, next), null);
  assert.equal(spent() - before, prices[0], 'dia seguinte: preço normal');
  assert.ok(!Object.keys(db.statsFor(id)).some((k) => k.startsWith('xpbuy_')), 'contador não aparece nos stats');
});
