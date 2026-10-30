import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, XP_TABLE, huntNode, itemById, storyById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const ORDER = ['profane_chapel', 'damned_rift', 'fallen_cathedral', 'frozen_sanctum', 'belghazar_throne'];

test('Inquisição: cinco instâncias de quest em sequência (60 a 100) e um set de nível 100 por classe', () => {
  const story = storyById('inquisition')!;
  assert.ok(story.epic);
  assert.deepEqual(story.steps.slice(1).map((s) => s.need?.goal.kind === 'instance' && s.need.goal.hunt), ORDER);
  assert.deepEqual(ORDER.map((id) => HUNTS.find((h) => h.id === id)!.level), [60, 70, 80, 90, 100]);
  for (const end of Object.values(story.endings)) {
    const ids = Object.keys(end.reward.items ?? {});
    assert.deepEqual(ids.map((id) => itemById(id)?.equip?.slot).sort(), ['armor', 'boots', 'helmet', 'legs']);
    for (const id of ids) assert.equal(itemById(id)?.equip?.level, 100, id);
    assert.equal(end.reward.outfit, 'inquisitor');
  }
});

test('Inquisição: cada instância só abre depois da anterior; o final dá o set da classe', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Inquisidora', 'warrior').id;
  const gear = ['drop120_sword', 'drop120_plate', 'drop120_helmet', 'drop120_legs', 'drop120_shield', 'drop120_boots', 'drop120_amulet', 'drop120_ring'];
  db.applyGains(id, { actions: 0, items: { cooked_shark: 10_000, ...Object.fromEntries(gear.map((g) => [g, 1])) }, xp: { combat: XP_TABLE[130] } }, 0, 0);
  for (const g of gear) assert.equal(game.equip(id, g, 0), null, g);

  assert.equal(game.storyChoose(id, 'inquisition', 0, 0), null);
  // A segunda ainda não abre enquanto a primeira não cai.
  assert.match(game.start(id, 'combat', huntNode(ORDER[1], 'normal', 1), 0)!, /passo certo/);
  let t = 0;
  for (const hunt of ORDER) {
    assert.equal(game.start(id, 'combat', huntNode(hunt, 'normal', 1), t), null, hunt);
    t += 24 * 3_600_000;
    assert.equal(game.settle(id, t).gains.cleared, hunt, hunt);
    // Passa para o próximo passo (o último é a escolha do set).
    if (hunt !== ORDER[ORDER.length - 1]) assert.equal(game.storyChoose(id, 'inquisition', 0, t), null, hunt);
  }
  assert.equal(game.storyChoose(id, 'inquisition', 0, t), null);
  const st = game.state(id, t);
  for (const piece of ['inq_plate', 'inq_helmet', 'inq_legs', 'inq_boots']) assert.equal(st.bank[piece], 1, piece);
  assert.ok(st.unlockedOutfits?.includes('inquisitor'));
});
