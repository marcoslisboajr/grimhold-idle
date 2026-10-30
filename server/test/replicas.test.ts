import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_TOKEN, BOSS_TOKEN_COST, BOSS_TOKEN_SHOP_ITEMS, SHOPS, bossTokenPrice, itemById, itemValue } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const REPLICAS = BOSS_TOKEN_SHOP_ITEMS.filter((id) => id.startsWith('replica_'));

test('réplicas dos deuses: 16 no Colecionador, mais fracas que o original e 250 fichas cada', () => {
  assert.equal(REPLICAS.length, 16);
  assert.ok(!Object.values(SHOPS).flat().some((id) => id.startsWith('replica_')), 'não ficam nas lojas de ouro');
  for (const id of REPLICAS) {
    const r = itemById(id)!;
    const o = itemById(id.replace('replica_', ''))!;
    assert.ok(o.legendary && !r.legendary, id);
    assert.equal(r.equip!.slot, o.equip!.slot);
    assert.ok((r.equip!.defense ?? 0) < (o.equip!.defense ?? 0) && (r.equip!.hp ?? 0) < (o.equip!.hp ?? 0), id);
    assert.equal(bossTokenPrice(id), 5 * BOSS_TOKEN_COST);
    assert.ok(itemValue(id) < 10_000, 'o Mercador paga pouco');
  }
  assert.equal(bossTokenPrice('ancient_scales'), BOSS_TOKEN_COST, 'as outras peças continuam 50');
});

test('réplicas: comprar cobra as fichas da réplica', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'R', 'warrior');
  const id = REPLICAS[0];
  db.applyGains(c.id, { actions: 0, items: { [BOSS_TOKEN]: bossTokenPrice(id) - 1 }, xp: {} }, 0, 0);
  assert.match(game.buyBossToken(c.id, id, 0) ?? '', /insuficientes/);
  db.applyGains(c.id, { actions: 0, items: { [BOSS_TOKEN]: 1 }, xp: {} }, 0, 0);
  assert.equal(game.buyBossToken(c.id, id, 0), null);
  assert.equal(db.bankFor(c.id)[id], 1);
  assert.equal(db.bankFor(c.id)[BOSS_TOKEN] ?? 0, 0);
});
