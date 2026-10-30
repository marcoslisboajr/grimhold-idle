import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, RECIPES, XP_TABLE, hasUse, refineCost, refineMaterials, nextRefineId, nextRarityId, ascendCost, itemById, dismantleMaterials, splitRarity } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('desmanche: quebra equipamentos e devolve 50% dos materiais no depósito', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Sucateiro', 'warrior').id;

  // Receita de iron_armor gasta 3 barras de ferro (iron_bar).
  // 50% de 3 barras de ferro = ferro minério retornado
  const mats = dismantleMaterials('iron_armor');
  assert.ok(mats, 'deve produzir materiais');

  db.applyGains(id, { actions: 0, items: { iron_armor: 3 }, xp: {} }, 0, 0);

  // Desmancha 2 unidades
  assert.equal(game.dismantleItem(id, 'iron_armor', 2, 0), null);
  const bank = game.state(id, 0).bank;
  assert.equal(bank.iron_armor, 1);

  for (const [matId, qty] of Object.entries(mats)) {
    assert.equal(bank[matId], qty * 2);
  }

  // Tenta desmanchar mais do que possui
  assert.match(game.dismantleItem(id, 'iron_armor', 2, 0) ?? '', /não tem essa quantidade/);

  // Item não desmanchável (ouro ou material básico)
  assert.match(game.dismantleItem(id, 'gold', 1, 0) ?? '', /não pode ser desmanchado/);
});

test('desmanche: peça de 1 barra devolve 1 minério dela (antes não desmanchava)', () => {
  assert.deepEqual(dismantleMaterials('mithril_sword'), { mithril_ore: 1 });
  assert.deepEqual(dismantleMaterials('mithril_sword+2'), { mithril_ore: 1 });
  const all = [...RECIPES.smithing, ...RECIPES.crafting, ...RECIPES.fletching, ...RECIPES.jewelcrafting];
  // Só o Gorro de Linho (1 seda, sem minério) continua sem desmanche.
  const none = ITEMS.filter((i) => i.equip && all.some((r) => r.output === i.id) && !dismantleMaterials(i.id)).map((i) => i.id);
  assert.deepEqual(none, ['linen_robe_helmet']);
  // Nunca devolve a mesma coisa que gastou (sem fazer e desmanchar de graça).
  for (const r of all) {
    const back = dismantleMaterials(r.output);
    for (const [id, n] of Object.entries(back ?? {})) if (r.inputs[id]) assert.ok(n < r.inputs[id], `${r.output}: ${id}`);
  }
});

test('Mercador, botão Loot: não marca chave, imbuement, material de receita nem consumível', () => {
  for (const id of ['bat_wing', 'oak_logs', 'copper_ore', 'mana_potion', 'iron_sword', 'boss_token', 'kids_candy', 'gem_ruby']) assert.ok(hasUse(id), `${id} tem uso`);
  const keys = ITEMS.filter((i) => /_key$/.test(i.id));
  for (const k of keys) assert.ok(hasUse(k.id) || !k.id, `${k.id} tem uso`);
  assert.ok(ITEMS.some((i) => !hasUse(i.id)), 'sobra loot para vender');
});

test('ascensao: a peca escolhida + 9 da mesma raridade sobem um tier', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Ascendente', 'warrior').id;
  const gear = ITEMS.filter((i) => i.equip && !i.legendary && !i.questItem);
  const target = gear.find((i) => (i.equip!.level || 1) >= 20)!;
  const ok = gear.filter((i) => i.id !== target.id && (i.equip!.level || 1) >= Math.ceil(target.equip!.level / 2));
  const weak = gear.find((i) => (i.equip!.level || 1) < Math.ceil(target.equip!.level / 2))!;
  const cost = ascendCost(target.id);
  db.applyGains(id, { actions: 0, items: { [target.id]: 1, [ok[0].id]: 5, [ok[1].id]: 4, [weak.id]: 9, gold: cost }, xp: {} }, 0, 0);

  // Peça fraca demais ou conta errada não passam.
  assert.match(game.ascendItem(id, target.id, { [weak.id]: 9 }, 0) ?? '', /não serve/);
  assert.match(game.ascendItem(id, target.id, { [ok[0].id]: 5 }, 0) ?? '', /exatamente 9/);
  assert.match(game.ascendItem(id, target.id, { [ok[0].id]: 9 }, 0) ?? '', /Faltam/);

  assert.equal(game.ascendItem(id, target.id, { [ok[0].id]: 5, [ok[1].id]: 4 }, 0), null);
  const bank = game.state(id, 0).bank;
  assert.equal(bank[`${target.id}+1`], 1);
  assert.equal(bank[target.id] ?? 0, 0);
  assert.equal(bank[ok[0].id] ?? 0, 0);
  assert.equal(bank[ok[1].id] ?? 0, 0);
  assert.equal(bank.gold ?? 0, 0);
  assert.equal(bank[weak.id], 9);
});

test('prey: chefes de instância e de covil não entram na lista', async () => {
  const { preyPool } = await import('@grimhold/shared');
  const hunts = (await import('../../shared/data/hunts.json', { with: { type: 'json' } })).default as { boss?: boolean; lair?: boolean; monsters: string[]; trash?: string[] }[];
  const bosses = new Set(hunts.filter((h) => h.boss || h.lair).flatMap((h) => h.monsters.filter((m) => !(h.trash ?? []).includes(m))));
  for (const lvl of [10, 50, 100, 150, 200]) for (const m of preyPool(lvl)) assert.ok(!bosses.has(m) || hunts.some((h) => !h.boss && !h.lair && h.monsters.includes(m)), `${m} no prey do ${lvl}`);
});

test('refino: +1 a +10 sem mudar a raridade, gasta ouro e material; equipado continua equipado', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Ferreiro', 'warrior').id;
  const give = (items: Record<string, number>) => db.applyGains(id, { actions: 0, items, xp: {} }, 0, 0);
  const bank = () => game.state(id, 0).bank;

  assert.equal(nextRefineId('iron_sword+2'), 'iron_sword+2#1');
  assert.equal(nextRefineId('iron_sword+2#9'), 'iron_sword+2#10');
  assert.equal(nextRefineId('iron_sword#10'), null);
  assert.equal(nextRarityId('iron_sword+2#3'), 'iron_sword+3#3', 'a Ascensão mantém o refino');
  assert.deepEqual(splitRarity('iron_sword+2#3'), { base: 'iron_sword', tier: 2, refine: 3 });
  assert.equal(itemById('iron_sword+2#3')!.name, 'Espada de Ferro (Rara) +3');
  assert.ok(itemById('iron_sword#10')!.equip!.attack! > itemById('iron_sword')!.equip!.attack!);

  // Do depósito: Rara +0 -> Rara +1, gastando a peça, 1 cópia igual e o material.
  const mats = refineMaterials('iron_sword+2');
  assert.equal(mats['iron_sword+2'], 1, 'pede 1 cópia igual');
  give({ gold: refineCost('iron_sword+2'), ...mats });
  assert.match(game.refineItem(id, 'iron_sword+2', 0) ?? '', /Faltam/, 'só a peça, sem a cópia, não refina');
  give({ 'iron_sword+2': 1 });
  assert.equal(game.refineItem(id, 'iron_sword+2', 0), null);
  assert.equal(bank()['iron_sword+2#1'], 1);
  assert.equal(bank()['iron_sword+2'] ?? 0, 0);
  assert.equal(bank().gold ?? 0, 0);
  for (const m of Object.keys(mats)) assert.equal(bank()[m] ?? 0, 0);

  // Sem material: não refina.
  give({ gold: refineCost('iron_sword+2#1') });
  if (Object.keys(refineMaterials('iron_sword+2#1')).length) assert.match(game.refineItem(id, 'iron_sword+2#1', 0) ?? '', /Faltam/);

  // Equipado: refina no corpo.
  give({ ...refineMaterials('iron_sword+2#1') });
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: 1_000_000 } }, 0, 0);
  assert.equal(game.equip(id, 'iron_sword+2#1', 0), null);
  assert.equal(game.refineItem(id, 'iron_sword+2#1', 0, { rng: () => 0 }), null);
  assert.equal(game.state(id, 0).equipment.weapon, 'iron_sword+2#2');
  assert.equal(bank()['iron_sword+2#1'] ?? 0, 0);
});

test('refino +6 a +10: falhar só gasta o ouro, a piedade sobe a chance e zera ao dar certo', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Arriscado', 'warrior').id;
  const give = (items: Record<string, number>) => db.applyGains(id, { actions: 0, items, xp: {} }, 0, 0);
  const bank = () => game.state(id, 0).bank;
  const p = 'iron_sword#9';
  const cost = refineCost(p);
  const mats = refineMaterials(p);

  // +9 -> +10 (25%): sorteio 0.6 falha (25%, 45%) e passa na terceira (65%).
  give({ [p]: 1, gold: cost * 3, ...mats });
  let msg = '';
  const roll = { rng: () => 0.5, onResult: (t: string) => (msg = t) }; // +10: 12%, 32%, 52% com a piedade
  game.refineItem(id, p, 0, roll);
  assert.match(msg, /falhou/);
  assert.equal(bank()[p], 1, 'a peça fica');
  for (const [m, q] of Object.entries(mats)) assert.equal(bank()[m], q, 'o material fica');
  assert.equal(game.state(id, 0).refinePity?.[9], 1);
  game.refineItem(id, p, 0, roll);
  game.refineItem(id, p, 0, roll);
  assert.match(msg, /deu certo/);
  assert.equal(bank()['iron_sword#10'], 1);
  assert.equal(bank().gold ?? 0, 0);
  assert.equal(game.state(id, 0).refinePity?.[9], 0, 'piedade zera');
});

test('ascensao Mitica+: chance, so perde ouro e o Selo da +15%', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Sortudo', 'warrior').id;
  const give = (items: Record<string, number>) => db.applyGains(id, { actions: 0, items, xp: {} }, 0, 0);
  const bank = () => game.state(id, 0).bank;
  // Lendária +3 -> Mítica +3 (45%): 0.75 falha sem Selo; com a piedade (+20%) e o Selo (+15%), 80%, passa.
  give({ 'iron_sword+4#3': 1, 'iron_helmet+4': 9, gold: ascendCost('iron_sword+4') * 2, forge_ward: 1 });
  game.ascendItem(id, 'iron_sword+4#3', { 'iron_helmet+4': 9 }, 0, { rng: () => 0.75 });
  assert.equal(bank()['iron_sword+4#3'], 1);
  assert.equal(bank()['iron_helmet+4'], 9, 'as peças ficam na falha');
  game.ascendItem(id, 'iron_sword+4#3', { 'iron_helmet+4': 9 }, 0, { rng: () => 0.75, protect: true });
  // Piedade de 1 falha (+20%) + Selo: passa.
  assert.equal(bank()['iron_sword+5#3'], 1);
  assert.equal(bank()['iron_helmet+4'] ?? 0, 0);
  assert.equal(bank().forge_ward ?? 0, 0);
});

test('recompra: vendeu ao Mercador, recompra em 24 h por 10% a mais; só o dono e só o que vendeu', async () => {
  const { itemValue: value, buybackPrice } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const id = db.createCharacter(acc, 'Arrependido', 'warrior').id;
  const other = db.createCharacter(acc, 'Outro', 'warrior').id;
  const bank = () => game.state(id, 0).bank;
  db.applyGains(id, { actions: 0, items: { abyssal_bar: 300 }, xp: {} }, 0, 0);

  assert.equal(game.sellNpc(id, 'abyssal_bar', 300, 1000), null);
  const got = value('abyssal_bar') * 300;
  assert.equal(bank().gold, got);
  const [b] = game.state(id, 2000).buyback!;
  assert.equal(b.item, 'abyssal_bar');
  assert.equal(b.qty, 300);

  // Outro personagem não recompra a venda dele.
  db.applyGains(other, { actions: 0, items: { gold: 1e9 }, xp: {} }, 0, 0);
  assert.match(game.buybackNpc(other, b.id, 1, 2000) ?? '', /não pode/);
  // Mais do que vendeu, não.
  assert.match(game.buybackNpc(id, b.id, 301, 2000) ?? '', /tudo isso/);

  // Recompra 100: paga 10% a mais.
  db.applyGains(id, { actions: 0, items: { gold: 1e7 }, xp: {} }, 0, 0);
  const before = bank().gold;
  assert.equal(game.buybackNpc(id, b.id, 100, 3000), null);
  assert.equal(bank().abyssal_bar, 100);
  assert.equal(before - bank().gold, buybackPrice(value('abyssal_bar')) * 100);
  assert.equal(game.state(id, 3000).buyback![0].qty, 200);

  // Depois de 24 h, some.
  assert.match(game.buybackNpc(id, b.id, 1, 1000 + 24 * 3600_000 + 1) ?? '', /não pode/);
});

test('refino: a cópia pode ser a mesma peça já refinada (igual ou menor), gastando a de menor refino', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Refinador', 'warrior').id;
  const p = 'iron_sword#1';
  // Sem depósito: pede a +0, como antes.
  assert.equal(refineMaterials(p)['iron_sword'], 1);
  // Com duas +1 e nenhuma +0: a cópia é a outra +1.
  assert.equal(refineMaterials(p, { [p]: 2 })[p], 1);
  // Só uma +1 (a própria): continua pedindo a +0.
  assert.equal(refineMaterials(p, { [p]: 1 })['iron_sword'], 1);
  // Com +0 e +1: gasta a +0 primeiro.
  assert.equal(refineMaterials(p, { [p]: 2, iron_sword: 1 })['iron_sword'], 1);
  const mats = Object.fromEntries(Object.entries(refineMaterials(p)).filter(([m]) => m !== 'iron_sword'));
  db.applyGains(id, { actions: 0, items: { [p]: 16, gold: refineCost(p), ...mats }, xp: {} }, 0, 0);
  assert.equal(game.refineItem(id, p, 0, { rng: () => 0 }), null); // sorteio fixo: o +2 tem 95% de chance
  const bank = game.state(id, 0).bank;
  assert.equal(bank['iron_sword#2'], 1);
  assert.equal(bank[p], 14, 'gastou a peça e uma cópia +1');
});

test('refino e raridade também sobem a parte elemental e os atributos de porcentagem; gema de magia ganha força', () => {
  // Anel só com velocidade: +10 dá +50%; a raridade vale metade (Ancestral = 2x).
  assert.equal(itemById('stealth_ring#10')!.equip!.speed, -0.06);
  assert.equal(itemById('stealth_ring+7#10')!.equip!.speed, -0.12);
  // Arma elemental: a parte do elemento sobe junto com o ataque.
  const base = itemById('shadow_bow')!.equip!;
  const up = itemById('shadow_bow+3#10')!.equip!;
  assert.ok(up.elementAttack! > base.elementAttack!, `${up.elementAttack} > ${base.elementAttack}`);
  // Gema de Combate refina (o reforço da magia sobe).
  assert.equal(nextRefineId('spellgem_war_cry'), 'spellgem_war_cry#1');
  assert.ok(itemById('spellgem_war_cry#10')!.equip!.spellGemPower! > 1);
});

test('peça de chefe: refina e ascende com Essência de Chefe (sem cópias) e fica acima da peça comum com o mesmo esforço', async () => {
  const { BOSS_ESSENCE, BOSS_ASCEND_ESSENCE, bossRefineEssence, itemById: get, ITEMS: all, bossEssenceFor } = await import('@grimhold/shared');
  const boss = (all as any[]).find((i) => i.legendary && i.equip?.defense && !bossEssenceFor(i.id))!.id as string;
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Chefeiro', 'warrior').id;
  const give = (items: Record<string, number>) => db.applyGains(id, { actions: 0, items, xp: {} }, 0, 0);
  const bank = () => game.state(id, 0).bank;
  give({ [boss]: 1, [BOSS_ESSENCE]: bossRefineEssence(0) + BOSS_ASCEND_ESSENCE[0], gold: 1e12 });
  assert.equal(game.refineItem(id, boss, 0, { rng: () => 0 }), null);
  assert.equal(bank()[`${boss}#1`], 1);
  assert.equal(game.ascendItem(id, `${boss}#1`, {}, 0, { rng: () => 0 }), null);
  assert.equal(bank()[`${boss}+5#1`], 1, 'Lendária vira Mítica, com o refino');
  assert.equal(bank()[BOSS_ESSENCE] ?? 0, 0, 'gastou só a Essência');
  assert.ok(get(`${boss}+5#1`)!.equip!.defense! > get(`${boss}#1`)!.equip!.defense!);
  assert.match(get(`${boss}+5#1`)!.name, /Mítica/);
});
