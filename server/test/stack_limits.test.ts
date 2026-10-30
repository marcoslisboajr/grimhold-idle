import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { BESTIARY_STAGES } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const newChar = (db: ReturnType<typeof openDb>) => db.createCharacter(db.accountForToken(db.createGuest())!, 'Lim', 'warrior').id;

test('charm: um por espécie (pôr outro na mesma espécie tira o antigo dela)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = newChar(db);
  const done: Record<string, number> = {};
  for (const m of ['goblin', 'goblin_archer', 'goblin_shaman', 'orc', 'orc_warrior', 'orc_berserker', 'lizard', 'raptor', 'troll', 'wolf']) done[m] = BESTIARY_STAGES[2];
  db.addBestiaryKills(id, done);
  assert.equal(game.charmUnlock(id, 'ferocity', 0), null);
  assert.equal(game.charmUnlock(id, 'dodge', 0), null);
  assert.equal(game.charmAssign(id, 'ferocity', 'goblin', 0), null);
  assert.equal(game.charmAssign(id, 'dodge', 'goblin', 0), null);
  const on = (c: string) => db.charmsFor(id).find((x) => x.id === c)?.monster ?? null;
  assert.equal(on('dodge'), 'goblin');
  assert.equal(on('ferocity'), null);
  assert.equal(game.charmAssign(id, 'ferocity', 'orc', 0), null);
  assert.equal(on('ferocity'), 'orc');
  assert.equal(on('dodge'), 'goblin');
});

test('imbuement: mesmo nível soma tempo; outro nível da família substitui', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = newChar(db);
  db.applyGains(id, { actions: 0, items: { bat_wing: 100, vampire_blood: 100, wolf_pelt: 100 }, xp: {} }, 0, 0);
  assert.equal(game.imbue(id, 'vampirism_1', 0), null);
  assert.equal(game.imbue(id, 'vampirism_1', 0), null);
  assert.deepEqual(db.imbuementsFor(id), { vampirism_1: 14400 });
  assert.equal(game.imbue(id, 'vampirism_2', 0), null);
  assert.equal(game.imbue(id, 'crit_1', 0), null);
  assert.deepEqual(db.imbuementsFor(id), { vampirism_2: 7200, crit_1: 7200 });
});

test('migração: imbuements empilhados viram o nível mais alto com o tempo somado; charms extras saem da espécie', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stack-'));
  const file = join(dir, 'g.db');
  try {
    let db = openDb(file);
    const id = newChar(db);
    for (const c of ['ferocity', 'dodge', 'wisdom']) db.unlockCharm(id, c);
    db.setCharmLevel(id, 'wisdom', 3);
    db.close();
    // Estado de antes da regra: 3 níveis da mesma família e 3 charms na mesma espécie.
    const raw = new DatabaseSync(file);
    const ins = raw.prepare(`INSERT INTO imbuements (character_id, imbuement_id, seconds_left) VALUES (?, ?, ?)`);
    ins.run(id, 'vampirism_1', 100);
    ins.run(id, 'vampirism_2', 200);
    ins.run(id, 'vampirism_3', 300);
    ins.run(id, 'crit_2', 50);
    raw.prepare(`UPDATE charms SET monster = 'goblin' WHERE character_id = ?`).run(id);
    raw.close();
    db = openDb(file);
    assert.deepEqual(db.imbuementsFor(id), { vampirism_3: 600, crit_2: 50 });
    assert.deepEqual(db.charmsFor(id).filter((c) => c.monster === 'goblin').map((c) => c.id), ['wisdom']);
    assert.equal(db.charmsFor(id).length, 3);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
