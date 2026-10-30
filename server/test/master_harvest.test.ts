import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gatherSpeed, toolSpeedFor, xpForLevel } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('A Colheita do Mestre: pede nível 50 nas quatro coletas e 2.000 de cada; dá a ferramenta de +20% em todas', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Coletora', 'warrior').id;
  assert.match(game.storyChoose(id, 'master_harvest', 0, 0)!, /nível 50/);
  const xp50 = xpForLevel(50);
  db.applyGains(id, { actions: 0, items: {}, xp: { woodcutting: xp50, mining: xp50, herbalism: xp50, soulreaping: xp50 } }, 0, 0);
  assert.equal(game.storyChoose(id, 'master_harvest', 0, 0), null);
  for (const item of ['ancient_logs', 'adamant_ore', 'abyss_lotus', 'abyssal_soul']) {
    assert.equal(game.storyChoose(id, 'master_harvest', 0, 0), 'Ainda falta cumprir o pedido.', item);
    db.applyGains(id, { actions: 0, items: { [item]: 2000 }, xp: {} }, 0, 0);
    assert.equal(game.storyChoose(id, 'master_harvest', 0, 0), null, item);
  }
  const bank = game.state(id, 0).bank;
  assert.equal(bank.master_multitool, 1);
  // Soma +20% em cima da melhor ferramenta de cada coleta (e não vale na pesca).
  for (const skill of ['woodcutting', 'mining', 'herbalism', 'soulreaping'] as const) assert.equal(toolSpeedFor(skill, xp50, bank), 0.2, skill);
  assert.equal(toolSpeedFor('fishing', xp50, bank), 0);
  assert.equal(toolSpeedFor('mining', xpForLevel(60), { ...bank, adamant_pickaxe: 1 }), 0.4);
  assert.ok(gatherSpeed('mining', 'copper_vein', xp50, { toolSpeed: 0.4 }) > gatherSpeed('mining', 'copper_vein', xp50, { toolSpeed: 0.2 }));
});
