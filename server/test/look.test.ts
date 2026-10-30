import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { DEFAULT_LOOKS, LOOK_HAIR, LOOK_HAIR_COLORS, LOOK_SKINS, parseLook, type Look } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const ruiva: Look = { gender: 'f', skin: 3, hair: 5, hairColor: 'red', outfit: 120 };

test('aparência: só aceita opções que existem', () => {
  assert.deepEqual(parseLook(ruiva), ruiva);
  assert.equal(parseLook({ ...ruiva, gender: 'x' }), null);
  assert.equal(parseLook({ ...ruiva, skin: 11 }), null);
  assert.deepEqual(parseLook({ ...ruiva, skin: 8, hairColor: 'teal', outfit: 340, hideCape: true }), { ...ruiva, skin: 8, hairColor: 'teal', outfit: 340, hideCape: true });
  assert.equal(parseLook({ ...ruiva, hideCape: 'sim' }), null);
  // Estilo 3 só existe no masculino.
  assert.equal(parseLook({ ...ruiva, hair: 3 }), null);
  assert.equal(parseLook({ ...ruiva, hairColor: 'roxo' }), null);
  assert.equal(parseLook({ ...ruiva, outfit: 77 }), null);
  assert.equal(parseLook('ruiva'), null);
});

test('aparência: salva na criação, troca depois e personagem sem escolha usa a da vocação', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const a = db.createCharacter(db.accountForToken(db.createGuest())!, 'Ruiva', 'warrior', ruiva);
  assert.deepEqual(db.characterById(a.id)!.look, ruiva);
  const b = db.createCharacter(db.accountForToken(db.createGuest())!, 'Padrao', 'devout');
  assert.deepEqual(b.look, DEFAULT_LOOKS.devout);

  const novo: Look = { ...ruiva, gender: 'm', hair: 3, outfit: null };
  db.setLook(a.id, novo);
  assert.deepEqual(game.state(a.id, 0).look, novo);
});

test('outfits: desbloqueio inicial, persistência e promoção', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const ch = db.createCharacter(db.accountForToken(db.createGuest())!, 'Conan', 'warrior');

  // Todos os 8 trajes liberados para qualquer vocação usar e testar
  const initial = db.unlockedOutfitsFor(ch.id);
  assert.equal(initial.length, 8);
  assert.ok(initial.includes('citizen') && initial.includes('barbarian') && initial.includes('pirate') && initial.includes('noble'));

  // Define look com outfit barbarian
  const lookBarbarian: Look = { ...DEFAULT_LOOKS.warrior, outfitId: 'barbarian' };
  db.setLook(ch.id, lookBarbarian);
  assert.equal(game.state(ch.id, 0).look.outfitId, 'barbarian');
});

test('aparência: toda pele e cor de cabelo tem arquivo', () => {
  const pd = (n: string) => new URL(`../../client/public/assets/paperdoll/${n}.png`, import.meta.url);
  for (const g of ['m', 'f'] as const) {
    for (let s = 1; s <= LOOK_SKINS; s++) assert.ok(existsSync(pd(`base_${g}_${s}`)), `base_${g}_${s}`);
    for (const h of LOOK_HAIR[g]) for (const c of LOOK_HAIR_COLORS) assert.ok(existsSync(pd(`hair_${g}_${h}_${c}`)), `hair_${g}_${h}_${c}`);
  }
});
