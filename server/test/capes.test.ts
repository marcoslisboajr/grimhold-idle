import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPES, MASTERY_CAPE, PROFESSIONS, XP_TABLE, capeOf, itemById, itemsLostOnDeath, type Gains } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Mestre', 'warrior');
  return { db, game, id: c.id };
}

test('capas: uma por profissão, a do Slayer e a da maestria, todas presas ao personagem', () => {
  assert.equal(CAPES.length, 2 * (PROFESSIONS.length + 2));
  for (const id of CAPES) {
    const it = itemById(id);
    assert.ok(it?.equip?.slot === 'cape' && it.questItem, id);
  }
});

test('capas: chegar ao 99 entrega a capa (uma só), anuncia e libera vestir; abaixo não veste', () => {
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: { [capeOf('mining')]: 1 }, xp: {} }, 0, 0);
  assert.match(game.equip(id, capeOf('mining'), 0) ?? '', /99/);
  db.applyGains(id, { actions: 0, items: { [capeOf('mining')]: -1 }, xp: { mining: XP_TABLE[99] - 50 } }, 0, 0);
  db.setActivity(id, { skill: 'mining', node: 'copper_vein', since: 0, seed: 1, seq: 0 });
  const { broadcasts } = game.settle(id, 3600_000 * 6);
  assert.ok(broadcasts.some((b) => b.includes('Capa do Mestre Minerador')), broadcasts.join(' | '));
  assert.equal(db.bankFor(id)[capeOf('mining')], 1);
  game.stop(id, 3600_000 * 6);
  assert.equal(game.equip(id, capeOf('mining'), 3600_000 * 6), null);
  game.state(id, 3600_000 * 6);
  assert.equal(db.bankFor(id)[capeOf('mining')] ?? 0, 0, 'vestida não ganha outra');
});

test('capas: quem já tinha o nível recebe ao abrir o jogo; 120 dá também a Suprema; a da maestria pede todas', () => {
  const { db, game, id } = setup();
  const xp = Object.fromEntries(PROFESSIONS.map((s) => [s, XP_TABLE[120]]));
  db.applyGains(id, { actions: 0, items: {}, xp: { ...xp, fishing: 0 } }, 0, 0);
  game.state(id, 0);
  assert.equal(db.bankFor(id)[MASTERY_CAPE] ?? 0, 0);
  assert.equal(db.bankFor(id)[capeOf('mining')], 1);
  assert.equal(db.bankFor(id)[capeOf('mining', true)], 1, 'Suprema no 120');
  db.applyGains(id, { actions: 0, items: {}, xp: { fishing: XP_TABLE[120] } }, 0, 0);
  game.state(id, 0);
  assert.equal(db.bankFor(id)[MASTERY_CAPE], 1);
  assert.equal(db.bankFor(id)[`${MASTERY_CAPE}_supreme`], 1);
  assert.equal(db.bankFor(id)[capeOf('fishing')], 1);
});

test('capas: a Suprema dá mais XP que a do Mestre', async () => {
  const { capeXpMult } = await import('@grimhold/shared');
  assert.equal(capeXpMult(capeOf('mining'), 'mining'), 1.05);
  assert.equal(capeXpMult(capeOf('mining', true), 'mining'), 1.1);
  assert.equal(capeXpMult(capeOf('mining', true), 'fishing'), 1);
  assert.equal(capeXpMult(`${MASTERY_CAPE}_supreme`, 'fishing'), 1.1);
  assert.equal(capeXpMult(capeOf('mining'), 'combat'), 1);
});

test('capas: +5% de XP na profissão da capa; não vende, não desmancha e nunca cai na morte', () => {
  const run = (cape: boolean) => {
    const { db, game, id } = setup();
    db.applyGains(id, { actions: 0, items: {}, xp: { mining: XP_TABLE[120] } }, 0, 0);
    game.state(id, 0);
    if (cape) assert.equal(game.equip(id, capeOf('mining'), 0), null);
    db.setActivity(id, { skill: 'mining', node: 'copper_vein', since: 0, seed: 1, seq: 0 });
    return { gains: game.settle(id, 600_000).gains as Gains, game, id };
  };
  const plain = run(false).gains.xp.mining!;
  const withCape = run(true);
  assert.ok(withCape.gains.xp.mining! > plain, `${withCape.gains.xp.mining} > ${plain}`);
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: { [capeOf('mining')]: 1 }, xp: {} }, 0, 0);
  assert.ok(game.sellNpc(id, capeOf('mining'), 1, 0));
  assert.ok(game.dismantleItem(id, capeOf('mining'), 1, 0));
  for (let s = 0; s < 300; s++) assert.ok(!itemsLostOnDeath({ cape: capeOf('mining') }, 7, s).includes('cape'));
});

test('troca direta: item preso (capa, Moeda de Voto) não entra na janela', async () => {
  const { TradeManager } = await import('../src/trade.ts');
  const db = openDb(':memory:');
  const a = db.createCharacter(db.accountForToken(db.createGuest())!, 'A', 'warrior');
  const b = db.createCharacter(db.accountForToken(db.createGuest())!, 'B', 'warrior');
  const t = new TradeManager(db);
  t.requestTrade(a.id, 'A', b.id);
  t.respondTrade(b.id, 'B', a.id, true);
  for (const item of [capeOf('mining'), 'vote_coin']) assert.match(t.addItem(a.id, item, 1)?.error ?? '', /negociado/);
});

test('capas comuns: 11 de Artesanato e 5 de chefe, equipamento normal (não presas) com sprite', async () => {
  const { RECIPES, MONSTERS, isCape, itemValue } = await import('@grimhold/shared');
  const { existsSync } = await import('node:fs');
  const crafted = RECIPES.crafting.filter((r) => itemById(r.output)?.equip?.slot === 'cape');
  assert.equal(crafted.length, 11);
  const dropped = MONSTERS.flatMap((m) => m.loot.map((l) => l.item)).filter((i) => itemById(i)?.equip?.slot === 'cape');
  assert.equal(new Set(dropped).size, 5);
  for (const id of [...crafted.map((r) => r.output), ...dropped]) {
    const it = itemById(id)!;
    assert.ok(!it.questItem && !isCape(id), `${id} é equipamento normal`);
    assert.ok(itemValue(id) > 0);
    for (const g of ['m', 'f']) assert.ok(existsSync(new URL(`../../client/public/assets/paperdoll/${id}_${g}.png`, import.meta.url)), `${id}_${g}`);
  }
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: { cape_traveler: 1 }, xp: { combat: XP_TABLE[10] } }, 0, 0);
  assert.equal(game.equip(id, 'cape_traveler', 0), null);
  assert.equal(db.equipmentFor(id).cape, 'cape_traveler');
});

test('desmanche: nunca devolve tanto quanto a receita gastou (sem fazer e desmanchar por XP)', async () => {
  const { RECIPES, dismantleMaterials } = await import('@grimhold/shared');
  for (const [sk, list] of Object.entries(RECIPES)) for (const r of list) {
    const d = dismantleMaterials(r.output);
    if (!d) continue;
    const out = r.outputQty ?? 1;
    const full = Object.entries(r.inputs).every(([k, q]) => (d[k] ?? 0) >= q / out);
    assert.ok(!full, `${sk}:${r.id} devolve tudo`);
  }
});

test('capa do Slayer: sai no 99 de Slayer, +5% de XP de Slayer e o monstro da tarefa com menos vida', async () => {
  const { capeXpMult, slayerCapeHpMult, capesEarned, xpForLevel, runCycle, playerStats, equipmentBonus, HUNTS, DIFFICULTIES } = await import('@grimhold/shared');
  assert.ok(CAPES.includes('cape_slayer') && CAPES.includes('cape_slayer_supreme'));
  assert.ok(itemById('cape_slayer')?.equip?.slot === 'cape');
  assert.ok(capesEarned({ slayer: Math.ceil(xpForLevel(99)) }).includes('cape_slayer'));
  assert.ok(!capesEarned({ slayer: Math.ceil(xpForLevel(98)) }).includes('cape_slayer'));
  assert.equal(capeXpMult('cape_slayer', 'slayer'), 1.05);
  assert.equal(capeXpMult('cape_slayer', 'mining'), 1);
  assert.equal(capeXpMult(MASTERY_CAPE, 'slayer'), 1, 'a da Maestria é só das profissões');
  assert.equal(slayerCapeHpMult('cape_mining'), 1);
  assert.ok(Math.abs(slayerCapeHpMult('cape_slayer') - 1 / 1.05) < 1e-9);
  // Na luta: só o monstro da tarefa perde vida; os outros ficam iguais.
  const hunt = HUNTS.find((h) => !h.boss && !h.lair && h.level >= 20 && new Set(h.monsters).size >= 2)!;
  const p = playerStats('warrior', XP_TABLE[60], equipmentBonus({}));
  const target = hunt.monsters[0];
  const a = runCycle(hunt, p, 3, 0, DIFFICULTIES[0], 3);
  const b = runCycle(hunt, p, 3, 0, DIFFICULTIES[0], 3, {}, [], [], undefined, undefined, undefined, { slayerTarget: target, slayerHpMult: 1 / 1.05 });
  for (let i = 0; i < a.monsters.length; i++) {
    if (a.monsters[i].id === target) assert.equal(b.monsters[i].hp, Math.round(a.monsters[i].hp / 1.05));
    else assert.equal(b.monsters[i].hp, a.monsters[i].hp);
  }
});
