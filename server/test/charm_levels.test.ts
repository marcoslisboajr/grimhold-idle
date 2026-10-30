import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCharms, BESTIARY_STAGES, charmById, charmLevelCost, charmPoints, monsterById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('níveis de charm: o 3 é o bônus antigo; 1 = metade, 2 = três quartos', () => {
  const goblin = monsterById('goblin')!;
  const hp = (level?: number) => applyCharms([goblin], [{ id: 'ferocity', monster: 'goblin', level }])[0].hp;
  assert.equal(hp(), Math.round(goblin.hp * 0.9));
  assert.equal(hp(3), Math.round(goblin.hp * 0.9));
  assert.equal(hp(1), Math.round(goblin.hp * 0.95));
  assert.equal(hp(2), Math.round(goblin.hp * 0.925));
  const proc = (level: number) => charmById('elem_fire')!.apply(goblin, level).charm?.proc?.pct;
  assert.equal(proc(1), 0.04);
  assert.equal(proc(3), 0.08);
  assert.match(charmById('elem_fire')!.describe(1), /4% da vida/);
});

test('níveis de charm: custo metade/1x/2x; os antigos pagaram o custo de antes', () => {
  const c = charmById('wisdom')!;
  assert.deepEqual([1, 2, 3].map((l) => charmLevelCost(c, l)), [75, 150, 300]);
  assert.equal(charmPoints({}, [{ id: 'wisdom', level: 3 }], 1000).spent, 525);
  assert.equal(charmPoints({}, [{ id: 'wisdom', level: 1, legacy: true }], 1000).spent, 150);
  assert.equal(charmPoints({}, [{ id: 'wisdom', level: 1 }], 1000).spent, 75);
});

test('evoluir charm: gasta pontos, para no 3; charm de antes já entra no 3', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Lvl', 'warrior').id;
  const done: Record<string, number> = {};
  for (const m of ['goblin', 'goblin_archer', 'goblin_shaman', 'orc', 'orc_warrior', 'orc_berserker', 'lizard', 'raptor', 'troll', 'wolf']) done[m] = BESTIARY_STAGES[2];
  db.addBestiaryKills(id, done);
  assert.equal(game.charmUpgrade(id, 'ferocity', 0), 'Libere o charm antes.');
  assert.equal(game.charmUnlock(id, 'ferocity', 0), null);
  const before = charmPoints(done, db.charmsFor(id)).free;
  assert.equal(game.charmUpgrade(id, 'ferocity', 0), null);
  assert.equal(charmPoints(done, db.charmsFor(id)).free, before - 60);
  assert.equal(db.charmsFor(id)[0].level, 2);
  db.setCharmLevel(id, 'ferocity', 3);
  assert.equal(game.charmUpgrade(id, 'ferocity', 0), 'Esse charm já está no nível máximo.');
});

test('charms de antes dos níveis: ao subir o servidor vão para o nível 1, sem devolver ponto', async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { DatabaseSync } = await import('node:sqlite');
  const file = join(mkdtempSync(join(tmpdir(), 'charm-')), 'g.db');
  const db1 = openDb(file);
  const id = db1.createCharacter(db1.accountForToken(db1.createGuest())!, 'Velho', 'warrior').id;
  db1.unlockCharm(id, 'elem_fire');
  db1.close();
  // Linha de antes dos níveis: nível 3, paga no custo antigo.
  const raw = new DatabaseSync(file);
  raw.exec(`UPDATE charms SET level = 3, legacy = 1`);
  raw.close();
  const db2 = openDb(file);
  const [c] = db2.charmsFor(id);
  assert.equal(c.level, 1);
  assert.ok(c.legacy);
  // Brasa custava 100: fica no nível 1 sem devolver ponto.
  assert.equal(charmPoints({}, db2.charmsFor(id), 100).free, 0);
  // Evoluir depois soma o preço normal, e subir o servidor de novo não rebaixa.
  db2.setCharmLevel(id, 'elem_fire', 2);
  assert.equal(charmPoints({}, db2.charmsFor(id), 1000).spent, 200);
  db2.close();
  const db3 = openDb(file);
  assert.equal(db3.charmsFor(id)[0].level, 2);
  db3.close();
});
