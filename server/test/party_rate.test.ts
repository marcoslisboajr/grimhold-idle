import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpForLevel, playerLevelXpMult } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { PartyManager } from '../src/party.ts';

test('shared XP: o top level recebe a média na taxa dele, não a XP cheia do de nível menor', () => {
  const db = openDb(':memory:');
  createGame(db);
  const mk = (n: string, lv: number) => { const id = db.createCharacter(db.accountForToken(db.createGuest())!, n, 'hunter').id; db.applyGains(id, { actions: 0, items: {}, xp: { combat: xpForLevel(lv) } }, 0, 0); return id; };
  const top = mk('Top', 360), sec = mk('Seg', 300);
  const pm = new PartyManager(db as never) as any;
  pm.huntGroup = () => [top, sec];
  const r = playerLevelXpMult(360) / playerLevelXpMult(300);
  // Mesma luta: o top fez 15% do que o outro fez (a taxa dele).
  const d = pm.sharedXpDeltas(new Map([[top, 1000 * r], [sec, 1000]]), () => true);
  assert.ok((d.get(top) ?? 0) <= 1000 * r * 0.02, `top não ganha a XP do outro: ${d.get(top)}`);
  assert.ok((d.get(sec) ?? 0) <= 1);
});
