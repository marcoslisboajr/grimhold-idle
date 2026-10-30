import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, runCycle, playerStats, parseHuntNode, XP_TABLE, withArrow } from '@grimhold/shared';

test('flecha de área respinga nos outros monstros só no tiro normal', () => {
  const h = HUNTS.find((x) => x.id === 'cyclops_lair')!;
  const p = parseHuntNode(h.id)!;
  const naked = { attack: 0, defense: 0, hp: 0 };
  const pl = withArrow(playerStats('hunter', XP_TABLE[60], naked, null, []), 'void_arrow');
  assert.equal(pl.arrowSplash, 0.25);
  const c = runCycle(h, pl, 99, 1, p.difficulty, 3);
  const splash = c.hits.filter((x) => x.splash);
  assert.ok(splash.length > 0);
  for (const s of splash) assert.ok(!s.spell && s.target !== undefined);
  assert.equal(withArrow(playerStats('hunter', XP_TABLE[60], naked, null, []), 'mithril_arrow').arrowSplash, undefined);
});
