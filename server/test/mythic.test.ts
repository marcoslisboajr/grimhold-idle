import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, PROMOTIONS, SPELLS, XP_TABLE, arenaById, defaultSpells, playerStats, runCycle, spellsFor, ultimateFor, validSpells } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(level: number, vocation: 'warrior' | 'hunter' | 'arcanist' | 'devout' = 'warrior') {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Mito', vocation);
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
  return { db, game, id: c.id };
}

test('Ascensão Mítica: cada caminho do 100 tem a sua no 200, com uma ultimate só dela', () => {
  const t4 = PROMOTIONS.filter((p) => p.tier === 4);
  assert.equal(t4.length, 12);
  for (const t3 of PROMOTIONS.filter((p) => p.tier === 3)) {
    const next = t4.filter((p) => p.requires === t3.id);
    assert.equal(next.length, 1, t3.id);
    const u = ultimateFor(next[0].id);
    assert.ok(u && u.vocation === t3.vocation && u.level === 200, `${next[0].id}: ultimate`);
    assert.equal(ultimateFor(t3.id), undefined, 'o 100 não tem ultimate');
  }
  assert.equal(new Set(SPELLS.filter((s) => s.promotion).map((s) => s.promotion)).size, 12);
});

test('ultimate: fora da barra, sai sozinha e não entra na escolha de magias', () => {
  for (const s of SPELLS.filter((x) => x.promotion)) {
    assert.ok(!spellsFor(s.vocation).includes(s));
    assert.equal(validSpells([s.id], s.vocation, 250), null);
  }
  const bar = defaultSpells('warrior', 205);
  const f = playerStats('warrior', XP_TABLE[205], undefined, 'war_avatar', bar);
  assert.equal(f.spells![0].id, 'cataclysm');
  assert.equal(f.spells!.length, bar.length + 1);
  const hunt = HUNTS.find((h) => h.id === 'chaos_throne')!;
  const hits = Array.from({ length: 10 }, (_, s) => runCycle(hunt, f, 3, s).hits).flat();
  assert.ok(hits.some((h) => h.spell === 'cataclysm'), 'o Cataclismo sai na caçada');
  const sky = playerStats('hunter', XP_TABLE[205], undefined, 'sky_eye', defaultSpells('hunter', 205));
  const shots = Array.from({ length: 10 }, (_, s) => runCycle(hunt, sky, 3, s).hits).flat().filter((h) => h.spell === 'celestial_shot' && h.dmg > 0);
  assert.ok(shots.length > 0 && shots.every((h) => h.crit), 'Tiro Celestial sempre crítico');
});

test('Ascensão Mítica: nível 200 e a Provação dos Mitos', () => {
  const { db, game, id } = setup(199);
  db.setPromotion(id, 'celestial_paladin');
  assert.match(game.promote(id, 'eternal_aegis', 0)!, /nível 200/);
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[200] } }, 0, 0);
  assert.match(game.promote(id, 'war_avatar', 0)!, /não corresponde/);
  assert.match(game.promote(id, 'eternal_aegis', 0)!, /Provação dos Mitos/);
  assert.equal(game.storyChoose(id, 'mythic_ascension', 0, 0), null);
  db.addStoryProgress(id, 'mythic_ascension', 8000);
  assert.equal(game.storyChoose(id, 'mythic_ascension', 0, 0), null);
  assert.ok(arenaById('trial_mythic'));
  assert.equal(game.startArena(id, 'trial_mythic', 0), null);
  db.addStoryProgress(id, 'mythic_ascension', 1);
  game.stop(id, 0);
  assert.equal(game.storyChoose(id, 'mythic_ascension', 0, 0), null);
  assert.equal(game.promote(id, 'eternal_aegis', 0), null);
  assert.equal(game.state(id, 0).promotion, 'eternal_aegis');
  assert.match(game.promote(id, 'eternal_aegis', 0)!, /Ascensão Mítica/);
});
