import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REAPER_KEEP_MS, REAPER_MAX_PACKS, REAPER_NODE, XP_TABLE, blessPrice, reaperPrice, type Gains } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const GEAR = ['leather_cap', 'leather_armor', 'leather_legs', 'leather_boots'];
const T = 10 * 60_000;

function setup(name = 'Teste') {
  const db = openDb(':memory:');
  const game = createGame(db);
  const make = (n: string) => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, n, 'warrior');
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[3] } }, 0, 0);
    for (const item of GEAR) {
      db.applyGains(c.id, { actions: 0, items: { [item]: 1 }, xp: {} }, 0, 0);
      assert.equal(game.equip(c.id, item, 0), null);
    }
    return c.id;
  };
  return { db, game, id: make(name), make };
}

/** Morre sem bênção numa caçada fraca para o nível, procurando uma semente em que caia alguma peça. */
function dieLosingItems() {
  for (let seed = 1; seed <= 400; seed++) {
    const s = setup();
    s.db.setActivity(s.id, { skill: 'combat', node: 'tribal_lands', since: 0, seed, seq: 0 });
    const { gains } = s.game.settle(s.id, T);
    if (gains.death?.itemsLost?.length) return { ...s, death: gains.death as NonNullable<Gains['death']> };
  }
  throw new Error('nenhuma morte com peça perdida');
}

test('ceifador: morrer sem bênção guarda as peças e acorda no Limiar', () => {
  const { db, game, id, death } = dieLosingItems();
  assert.ok(death.reaper, 'a morte avisa do Ceifador');
  assert.equal(death.reaper!.price, reaperPrice(3));
  assert.equal(death.reaper!.expiresAt, T + REAPER_KEEP_MS);
  assert.equal(db.activityFor(id)?.node, REAPER_NODE);
  const st = game.state(id, T);
  assert.equal(st.reaper?.length, 1);
  assert.deepEqual(st.reaper![0].items, death.itemsLost);
  for (const item of death.itemsLost!) assert.ok(!(item in st.bank) || st.bank[item] === 0, `${item} não está no depósito`);
  // Ficar no Limiar não gera nada nem quebra a conta.
  const later = game.settle(id, T + 6 * 3600_000);
  assert.equal(later.gains.actions, 0);
  assert.equal(later.gains.death, undefined);
  assert.equal(db.activityFor(id)?.node, REAPER_NODE);
});

test('ceifador: morte abençoada ou sem peça perdida não vai para o Limiar', () => {
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: { gold: blessPrice(3) }, xp: {} }, 0, 0);
  assert.equal(game.buyBless(id, 0), null);
  db.setActivity(id, { skill: 'combat', node: 'tribal_lands', since: 0, seed: 1, seq: 0 });
  const { gains } = game.settle(id, T);
  assert.ok(gains.death?.blessed);
  assert.equal(gains.death?.reaper, undefined);
  assert.equal(db.activityFor(id), null);
  assert.equal(game.state(id, T).reaper?.length, 0);
});

test('ceifador: resgate cobra o preço, devolve tudo ao depósito e só uma vez', () => {
  const { db, game, id, death } = dieLosingItems();
  const pack = game.state(id, T).reaper![0];
  assert.equal(game.reaperRedeem(id, pack.id, T), 'Ouro insuficiente.');
  assert.equal(game.state(id, T).reaper?.length, 1, 'continua guardado');
  const gold0 = game.state(id, T).bank.gold ?? 0;
  db.applyGains(id, { actions: 0, items: { gold: pack.price + 7 }, xp: {} }, 0, 0);
  assert.equal(game.reaperRedeem(id, pack.id, T), null);
  const st = game.state(id, T);
  assert.equal(st.bank.gold, gold0 + 7);
  for (const item of death.itemsLost!) assert.equal(st.bank[item], 1, `${item} voltou`);
  assert.equal(st.reaper?.length, 0);
  assert.equal(game.reaperRedeem(id, pack.id, T), 'O Ceifador não guarda mais esses itens.');
  assert.equal(game.state(id, T).bank.gold, gold0 + 7, 'não cobrou de novo');
});

test('ceifador: compra a bênção no Limiar e volta ao Bastião com as peças ainda guardadas', () => {
  const { db, game, id } = dieLosingItems();
  db.applyGains(id, { actions: 0, items: { gold: blessPrice(3) }, xp: {} }, 0, 0);
  assert.equal(game.buyBless(id, T), null, 'bênção no Limiar');
  assert.equal(game.state(id, T).blessed, true);
  game.stop(id, T);
  assert.equal(db.activityFor(id), null);
  const pack = game.state(id, T).reaper![0];
  db.applyGains(id, { actions: 0, items: { gold: pack.price }, xp: {} }, 0, 0);
  assert.equal(game.reaperRedeem(id, pack.id, T + 1000), null, 'resgata da cidade');
});

test('ceifador: caçando não dá para resgatar; prazo vencido some', () => {
  const { db, game, id } = dieLosingItems();
  const pack = game.state(id, T).reaper![0];
  db.applyGains(id, { actions: 0, items: { gold: pack.price * 3 }, xp: {} }, 0, 0);
  assert.equal(game.start(id, 'combat', 'tribal_lands', T), null);
  assert.match(game.reaperRedeem(id, pack.id, T + 1) ?? '', /caçando/);
  game.stop(id, T + 2);
  const late = T + REAPER_KEEP_MS + 1;
  assert.equal(game.state(id, late).reaper?.length, 0);
  assert.equal(game.reaperRedeem(id, pack.id, late), 'O Ceifador não guarda mais esses itens.');
});

test('ceifador: ninguém resgata o pacote de outro, e id inválido não quebra nada', () => {
  const { db, game, id, make } = dieLosingItems();
  const other = make('Outro');
  const pack = game.state(id, T).reaper![0];
  db.applyGains(other, { actions: 0, items: { gold: pack.price * 2 }, xp: {} }, 0, 0);
  assert.equal(game.reaperRedeem(other, pack.id, T), 'O Ceifador não guarda mais esses itens.');
  for (const bad of [NaN, -1, 0, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 2]) assert.equal(game.reaperRedeem(id, bad, T), 'Pacote inválido.');
  assert.equal(game.state(id, T).reaper?.length, 1, 'o dono ainda tem o pacote');
});

test('ceifador: guarda no máximo os pacotes mais novos', () => {
  const db = openDb(':memory:');
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Muitos', 'warrior');
  for (let i = 0; i < REAPER_MAX_PACKS + 4; i++) db.addReaperPack(c.id, [`item_${i}`], 100, i, 10_000_000, REAPER_MAX_PACKS);
  const packs = db.reaperPacksFor(c.id, 0);
  assert.equal(packs.length, REAPER_MAX_PACKS);
  assert.equal(packs.at(-1)!.items[0], `item_${REAPER_MAX_PACKS + 3}`);
  db.addReaperPack(c.id, [], 100, 0, 10_000_000, REAPER_MAX_PACKS);
  assert.equal(db.reaperPacksFor(c.id, 0).length, REAPER_MAX_PACKS, 'pacote vazio não entra');
});

test('imbuement: 1 hora caçando gasta 1 hora, creditando a cada segundo ou de uma vez', () => {
  for (const step of [1000, 3600_000]) {
    const db = openDb(':memory:');
    const game = createGame(db);
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Imb', 'warrior');
    db.applyGains(c.id, { actions: 0, items: { bat_wing: 20 }, xp: { combat: XP_TABLE[60] } }, 0, 0);
    assert.equal(game.imbue(c.id, 'vampirism_1', 0), null);
    const before = db.imbuementsFor(c.id).vampirism_1;
    db.setActivity(c.id, { skill: 'combat', node: 'tribal_lands', since: 0, seed: 9, seq: 0 });
    for (let t = step; t <= 3600_000; t += step) game.settle(c.id, t);
    const used = before - db.imbuementsFor(c.id).vampirism_1;
    const hunted = Math.floor(db.activityFor(c.id)!.since / 1000);
    assert.equal(used, hunted, `crédito a cada ${step / 1000}s: gastou ${used}s em ${hunted}s de caçada`);
  }
});

test('imbuement: o tempo só corre em caçada (boneco de treino e arena não gastam, nem dão o bônus)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Boneco', 'warrior');
  db.applyGains(c.id, { actions: 0, items: { bat_wing: 20 }, xp: { combat: XP_TABLE[60] } }, 0, 0);
  assert.equal(game.imbue(c.id, 'vampirism_1', 0), null);
  const before = db.imbuementsFor(c.id).vampirism_1;
  assert.equal(game.start(c.id, 'combat', 'dummy_melee', 0), null);
  for (let t = 60_000; t <= 3600_000; t += 60_000) game.settle(c.id, t);
  assert.equal(db.imbuementsFor(c.id).vampirism_1, before, 'boneco não gasta');
  game.stop(c.id, 3600_000);
  assert.equal(game.startArena(c.id, 'arena_40', 3600_000), null);
  for (let t = 3600_000 + 60_000; t <= 2 * 3600_000; t += 60_000) game.settle(c.id, t);
  assert.equal(db.imbuementsFor(c.id).vampirism_1, before, 'arena não gasta');
  game.stop(c.id, 2 * 3600_000);
  db.setActivity(c.id, { skill: 'combat', node: 'tribal_lands', since: 2 * 3600_000, seed: 9, seq: 0 });
  game.settle(c.id, 3 * 3600_000);
  assert.ok(db.imbuementsFor(c.id).vampirism_1 < before, 'caçada gasta');
});
