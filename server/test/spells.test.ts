import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, HUNTS, MAX_SPELLS, SPELLS, XP_TABLE, defaultSpells, playerStats, runCycle, validSpells } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const tribal = HUNTS.find((h) => h.id === 'tribal_lands')!;

test('magias: cada vocação tem as suas, com a primeira liberada no nível 1', () => {
  for (const v of ['warrior', 'hunter', 'arcanist', 'devout']) {
    const mine = SPELLS.filter((s) => s.vocation === v);
    assert.ok(mine.length >= 3, v);
    assert.equal(Math.min(...mine.map((s) => s.level)), 1, v);
  }
  assert.equal(new Set(SPELLS.map((s) => s.id)).size, SPELLS.length);
});

test('magias: escolha valida vocação, nível, repetição e o máximo', () => {
  assert.deepEqual(validSpells(['fireball'], 'arcanist', 1), ['fireball']);
  assert.equal(validSpells(['fireball'], 'warrior', 50), null);
  assert.equal(validSpells(['ice_storm'], 'arcanist', 29), null);
  assert.equal(validSpells(['fireball', 'fireball'], 'arcanist', 50), null);
  assert.equal(validSpells(['fireball', 'lightning', 'arcane_shield', 'ice_storm'], 'arcanist', 50), null);
  assert.equal(defaultSpells('arcanist', 50).length, 3);
  // 4ª vaga no nível 60.
  assert.deepEqual(validSpells(['fireball', 'lightning', 'arcane_shield', 'ice_storm'], 'arcanist', 60)?.length, 4);
  assert.equal(validSpells(['fireball', 'lightning', 'arcane_shield', 'ice_storm', 'meteor'], 'arcanist', 60), null);
  assert.equal(defaultSpells('arcanist', 60).length, MAX_SPELLS);
});

test('magias: golpe forte aparece na luta e mata mais rápido; sem magia, a luta é a de sempre', () => {
  const xp = XP_TABLE[14];
  const plain = playerStats('arcanist', xp);
  const casting = playerStats('arcanist', xp, undefined, null, ['fireball', 'lightning']);
  let plainMs = 0;
  let castMs = 0;
  for (let seq = 0; seq < 40; seq++) {
    const a = runCycle(tribal, plain, 7, seq);
    const b = runCycle(tribal, casting, 7, seq);
    assert.ok(a.hits.every((h) => !h.spell));
    plainMs += a.fightMs;
    castMs += b.fightMs;
    if (seq === 0) assert.ok(b.hits.some((h) => h.spell === 'fireball'));
  }
  assert.ok(castMs < plainMs, `${castMs} < ${plainMs}`);
});

test('magias: cura só com a vida baixa e nunca passa do máximo', () => {
  const player = playerStats('devout', XP_TABLE[12], undefined, null, ['heal']);
  for (let seq = 0; seq < 40; seq++) {
    for (const h of runCycle(tribal, player, 3, seq).hits) if (h.heal) assert.ok(h.heal > 0 && h.heal <= player.hp);
  }
});

test('magias: o servidor guarda a escolha e recusa o que não pode', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Maga', 'arcanist').id;
  assert.deepEqual(game.state(id, 0).spells, ['fireball']);
  assert.equal(game.setSpells(id, ['lightning'], 0), 'Magias inválidas.');
  assert.equal(game.setSpells(id, [], 0), null);
  assert.deepEqual(game.state(id, 0).spells, []);
});

test('magias: as de área acertam todos os monstros do grupo, com o mesmo resultado sempre', () => {
  const hunt = HUNTS.find((h) => h.id === 'goblin_den')!;
  const p = playerStats('arcanist', XP_TABLE[50], undefined, null, ['meteor']);
  const c = runCycle(hunt, p, 7, 1, undefined, 3);
  const meteorHits = c.hits.filter((h) => h.spell === 'meteor');
  assert.ok(meteorHits.length >= 2, 'o meteoro sai em vários alvos');
  const at = meteorHits[0].t;
  assert.ok(new Set(meteorHits.filter((h) => h.t === at).map((h) => h.target)).size >= 2, 'mesmo instante, alvos diferentes');
  assert.deepEqual(runCycle(hunt, p, 7, 1, undefined, 3), c);
});

test('arcanista: Escudo de Mana na caçada tira o dano da mana, mais em bando', () => {
  const h = HUNTS.find((x) => x.id === 'tribal_lands')!;
  const base = playerStats('arcanist', XP_TABLE[20], undefined, null, []);
  const noShield = { ...base, manaShield: undefined };
  const fights = (p: typeof base) => {
    let taken = 0;
    for (let s = 0; s < 50; s++) taken += runCycle(h, p, 7, s, DIFFICULTIES[0], 2).damageTaken;
    return taken;
  };
  const withS = fights(base);
  const without = fights(noShield);
  assert.ok(withS < without * 0.7, `escudo segura dano em bando (${withS} vs ${without})`);
});

test('arcanista: magia nova não muda as padrão de quem nunca escolheu', () => {
  assert.deepEqual(defaultSpells('arcanist', 70), ['fireball', 'lightning', 'arcane_shield', 'ice_storm']);
});

test('magias: toda magia tem ícone', async () => {
  const { existsSync } = await import('node:fs');
  for (const s of SPELLS) assert.ok(existsSync(new URL(`../../client/public/assets/icons/spell_${s.id}.png`, import.meta.url)), `spell_${s.id}.png`);
});
