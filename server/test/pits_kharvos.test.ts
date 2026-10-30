import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, XP_TABLE, huntNode, itemById, storyById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const ORDER = ['ash_pit', 'eye_pit', 'hound_pit', 'damned_pit', 'pit_forge', 'fury_pit', 'abyss_pit', 'kharvos_throne'];

test('Fossos de Kharvos: oito instâncias de quest em sequência (80 a 115), um passo de Fundição e uma arma de nível 115 por classe', () => {
  const story = storyById('pits_kharvos')!;
  assert.ok(story.epic);
  const goals = story.steps.map((s) => s.need?.goal);
  assert.deepEqual(goals.filter((g) => g?.kind === 'instance').map((g) => g!.kind === 'instance' && g!.hunt), ORDER);
  assert.ok(goals.some((g) => g?.kind === 'obtain' && g.item === 'adamant_bar'), 'a Forja pede barras');
  assert.deepEqual(ORDER.map((id) => HUNTS.find((h) => h.id === id)!.level), [80, 85, 90, 95, 100, 105, 110, 115]);
  for (const end of Object.values(story.endings)) {
    const [id] = Object.keys(end.reward.items ?? {});
    assert.equal(itemById(id)?.equip?.slot, 'weapon');
    assert.equal(itemById(id)?.equip?.level, 115);
    assert.equal(end.reward.outfit, 'pit_lord');
  }
});

test('Fossos de Kharvos: cada fosso abre depois do anterior; a Forja espera as barras; o final dá a arma', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Descida', 'warrior').id;
  const gear = ['drop120_sword', 'drop120_plate', 'drop120_helmet', 'drop120_legs', 'drop120_shield', 'drop120_boots', 'drop120_amulet', 'drop120_ring'];
  db.applyGains(id, { actions: 0, items: { cooked_shark: 20_000, ...Object.fromEntries(gear.map((g) => [g, 1])) }, xp: { combat: XP_TABLE[135] } }, 0, 0);
  for (const g of gear) assert.equal(game.equip(id, g, 0), null, g);

  assert.equal(game.storyChoose(id, 'pits_kharvos', 0, 0), null);
  assert.match(game.start(id, 'combat', huntNode(ORDER[1], 'normal', 1), 0)!, /passo certo/);
  let t = 0;
  for (const hunt of ORDER) {
    if (hunt === 'pit_forge') {
      assert.match(game.start(id, 'combat', huntNode(hunt, 'normal', 1), t)!, /passo certo/, 'sem as barras a Forja não abre');
      db.applyGains(id, { actions: 0, items: { adamant_bar: 20 }, xp: {} }, t, 0);
      assert.equal(game.storyChoose(id, 'pits_kharvos', 0, t), null);
    }
    assert.equal(game.start(id, 'combat', huntNode(hunt, 'normal', 1), t), null, hunt);
    t += 24 * 3_600_000;
    assert.equal(game.settle(id, t).gains.cleared, hunt, hunt);
    if (hunt !== ORDER[ORDER.length - 1]) assert.equal(game.storyChoose(id, 'pits_kharvos', 0, t), null, hunt);
  }
  assert.equal(game.storyChoose(id, 'pits_kharvos', 0, t), null);
  const st = game.state(id, t);
  assert.equal(st.bank.pit_blade, 1);
  assert.ok(st.unlockedOutfits?.includes('pit_lord'));
});
