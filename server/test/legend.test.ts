import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE, HUNTS, playerStats, runCycle, strikeMult, PROMOTIONS } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(level: number, vocation: 'warrior' | 'hunter' | 'arcanist' | 'devout' = 'warrior') {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Lenda', vocation);
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
  return { db, game, id: c.id };
}

test('ascensão lendária: cada caminho tem a sua no nível 100, com a Provação das Lendas', () => {
  for (const t2 of PROMOTIONS.filter((p) => p.tier === 2)) {
    assert.equal(PROMOTIONS.filter((p) => p.tier === 3 && p.requires === t2.id).length, 1, t2.id);
  }
  const { db, game, id } = setup(100);
  assert.equal(game.promote(id, 'paladin', 0), null);
  assert.match(game.promote(id, 'celestial_paladin', 0)!, /não corresponde/, 'pula o tier 2');
  db.setPromotion(id, 'crusader');
  assert.match(game.promote(id, 'war_titan', 0)!, /não corresponde/);
  assert.match(game.promote(id, 'celestial_paladin', 0)!, /Provação das Lendas/);
  assert.equal(game.storyChoose(id, 'legend_ascension', 0, 0), null);
  db.addStoryProgress(id, 'legend_ascension', 6999);
  assert.equal(game.storyChoose(id, 'legend_ascension', 0, 0), 'Ainda falta cumprir o pedido.', '7000 Pesadelos');
  db.addStoryProgress(id, 'legend_ascension', 1);
  assert.equal(game.storyChoose(id, 'legend_ascension', 0, 0), null);
  assert.match(game.promote(id, 'celestial_paladin', 0)!, /Provação das Lendas/, 'ainda falta a Rainha');
  assert.equal(game.startArena(id, 'trial_legends', 0), null);
  db.addStoryProgress(id, 'legend_ascension', 1); // venceu a provação
  game.stop(id, 0);
  assert.equal(game.storyChoose(id, 'legend_ascension', 0, 0), null);
  assert.equal(game.promote(id, 'celestial_paladin', 0), null);
  assert.equal(game.state(id, 0).promotion, 'celestial_paladin');
  assert.match(game.promote(id, 'celestial_paladin', 0)!, /Ascensão Lendária/);
});

test('ascensão lendária: abaixo do 100 não sobe', () => {
  const { db, game, id } = setup(90);
  db.setPromotion(id, 'crusader');
  assert.match(game.promote(id, 'celestial_paladin', 0)!, /nível 100/);
});

test('magias do 100: golpe de misericórdia e cura pelo dano', () => {
  assert.equal(strikeMult({ kind: 'strike', mult: 2, execute: { below: 0.3, mult: 2 } }, 20, 100), 4);
  assert.equal(strikeMult({ kind: 'strike', mult: 2, execute: { below: 0.3, mult: 2 } }, 50, 100), 2);
  const hunt = HUNTS.find((h) => h.id === 'nightmare_valley')!;
  const knight = playerStats('warrior', XP_TABLE[100], undefined, 'celestial_paladin', ['execution']);
  // Um pouco de equipamento: pelado ele morre antes do 2º raio (o 1º sai com a vida cheia, sem nada para curar).
  const devout = playerStats('devout', XP_TABLE[100], { attack: 0, defense: 100, hp: 2000 }, 'archangel', ['divine_wrath']);
  const dh = Array.from({ length: 20 }, (_, s) => runCycle(hunt, devout, 7, s).hits).flat();
  assert.ok(dh.some((h) => h.spell === 'divine_wrath' && (h.heal ?? 0) > 0), 'a Ira Divina cura');
  // Determinística como o resto da luta.
  assert.deepEqual(runCycle(hunt, knight, 3, 1), runCycle(hunt, knight, 3, 1));
});

test('promoções: o caminho inteiro 30 → 70 → 100 funciona em todas as vocações e subclasses', () => {
  for (const t1 of PROMOTIONS.filter((p) => (p.tier ?? 1) === 1)) {
    const t2 = PROMOTIONS.find((p) => p.requires === t1.id)!;
    const t3 = PROMOTIONS.find((p) => p.requires === t2.id)!;
    const { db, game, id } = setup(29, t1.vocation as never);
    assert.match(game.promote(id, t1.id, 0)!, /nível 30/, `${t1.id}: antes do 30`);
    db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[30] } }, 0, 0);
    assert.match(game.promote(id, t2.id, 0)!, /primeira promoção/, `${t2.id}: sem a do 30`);
    assert.equal(game.promote(id, t1.id, 0), null, `${t1.id}: no 30`);
    assert.equal(game.state(id, 0).promotion, t1.id);
    assert.match(game.promote(id, t1.id, 0)!, /já foi promovido/);
    assert.match(game.promote(id, t2.id, 0)!, /nível 70/);
    db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[70] } }, 0, 0);
    assert.match(game.promote(id, t2.id, 0)!, /Provação dos Campeões/);
    assert.match(game.promote(id, t3.id, 0)!, /não corresponde/, 'não pula o 70');
    db.setStoryStep(id, 'master_ascension', 1);
    db.addStoryProgress(id, 'master_ascension', 900);
    assert.equal(game.storyChoose(id, 'master_ascension', 0, 0), null);
    assert.equal(game.promote(id, t2.id, 0), null, `${t2.id}: no 70`);
    assert.equal(game.state(id, 0).promotion, t2.id);
    assert.match(game.promote(id, t1.id, 0)!, /já foi promovido/, 'não volta para a do 30');
    assert.match(game.promote(id, t3.id, 0)!, /nível 100/);
    db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[100] } }, 0, 0);
    assert.match(game.promote(id, t3.id, 0)!, /Provação das Lendas/);
    db.setStoryStep(id, 'legend_ascension', 2);
    db.addStoryProgress(id, 'legend_ascension', 1);
    assert.equal(game.storyChoose(id, 'legend_ascension', 0, 0), null);
    assert.equal(game.promote(id, t3.id, 0), null, `${t3.id}: no 100`);
    assert.equal(game.state(id, 0).promotion, t3.id);
    assert.match(game.promote(id, t2.id, 0)!, /Segunda Promoção/, 'não volta para a do 70');
  }
});

test('traje lendário: a Ascensão Lendária dá o traje da própria vocação', () => {
  const { db, game, id } = setup(100, 'hunter');
  db.setPromotion(id, 'sniper');
  db.setStoryStep(id, 'legend_ascension', 2);
  db.addStoryProgress(id, 'legend_ascension', 1);
  assert.equal(game.storyChoose(id, 'legend_ascension', 0, 0), null);
  assert.ok(!game.state(id, 0).unlockedOutfits?.includes('legend_hunter'), 'só depois de ascender');
  assert.equal(game.promote(id, 'storm_eye', 0), null);
  const outfits = game.state(id, 0).unlockedOutfits ?? [];
  assert.ok(outfits.includes('legend_hunter'));
  assert.ok(!outfits.includes('legend_warrior'));
});
