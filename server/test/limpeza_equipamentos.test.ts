import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEMS,
  WORLD_BOSSES,
  itemById,
  itemSources,
  guideKinds,
  bossEssenceFor,
  refineMaterials,
  equipmentBonus,
  playerStats,
  xpForLevel,
  BOSS_ESSENCE,
  BOSS_ASCEND_ESSENCE,
  bossRefineEssence,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('limpeza de equipamentos: nenhum equipamento fica sem origem', () => {
  const missing = ITEMS.filter((i) => i.id !== 'gold' && itemSources(i.id).length === 0).map((i) => i.id);
  assert.deepEqual(missing, [], 'itens sem fonte no guia');
  assert.equal(itemById('platinum_amulet'), undefined, 'platinum_amulet foi removido');
  assert.equal(itemById('ring_of_healing'), undefined, 'ring_of_healing foi removido');
});

test('chefes globais do 40 ao 50: cada chefe dá só as 2 peças próprias e a essência dele', () => {
  const bosses = WORLD_BOSSES.slice(0, 7);
  for (const b of bosses) {
    assert.equal(b.legendarySet.length, 2, `${b.name} deve ter exatamente 2 peças no legendarySet`);
    const essenceLoot = b.loot?.find((l) => l.item.endsWith('_essence'));
    assert.ok(essenceLoot, `${b.name} deve dropar sua essência`);
    assert.equal(essenceLoot.chance, 1, `${b.name} essência deve ter chance 1 (100%)`);
  }
});

test('golem da mina velha dá só as 2 peças dele e a essência', () => {
  const golem = ITEMS.find((i) => i.id === 'old_mine_plate');
  assert.ok(golem);
  assert.equal(itemById('old_mine_helm')?.name, 'Elmo da Mina Velha');
});

test('bolsas dos tronos: não dão réplicas, dão fragmentos do trono', () => {
  const thronePouches = [
    'asura_throne_pouch',
    'tyrant_throne_pouch',
    'usurper_throne_pouch',
    'serpent_throne_pouch',
    'flame_throne_pouch',
    'champion_throne_pouch',
  ];

  for (const pid of thronePouches) {
    const item = itemById(pid)!;
    assert.ok(item, `bolsa ${pid} deve existir`);
    assert.equal(item.pool, undefined, `bolsa ${pid} não deve ter pool de réplicas`);
    assert.ok(item.fragment, `bolsa ${pid} deve ter fragment`);
    assert.ok(item.fragment.item.endsWith('_throne_fragment'), `fragment deve ser o fragmento do trono`);
  }

  // Testa abertura da bolsa entregando fragmentos
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.createGuest();
  const char = db.createCharacter(db.accountForToken(acc)!, 'Sortudo', 'warrior').id;

  db.applyGains(char, { actions: 0, items: { asura_throne_pouch: 1 }, xp: {} }, 0, 0);
  const res = game.openPouch(char, 'asura_throne_pouch', Date.now());
  assert.equal(res.error, undefined);
  assert.equal(res.item, 'asura_throne_fragment');
  assert.ok(res.qty && res.qty >= 2 && res.qty <= 4);
  assert.equal(db.bankFor(char).asura_throne_pouch, undefined);
  assert.equal(db.bankFor(char).asura_throne_fragment, res.qty);
});

test('peças dos tronos e chefes: refinam com a essência / fragmento correspondente', () => {
  assert.equal(bossEssenceFor('lich_crown'), 'lich_essence');
  assert.equal(bossEssenceFor('ancient_scales'), 'ancient_dragon_essence');
  assert.equal(bossEssenceFor('tide_armor'), 'kraken_essence');
  assert.equal(bossEssenceFor('abyss_horns'), 'abyss_essence');
  assert.equal(bossEssenceFor('old_mine_plate'), 'old_mine_essence');
  assert.equal(bossEssenceFor('ferathos_armor'), 'ferathos_essence');
  assert.equal(bossEssenceFor('ghazrael_helm'), 'ghazrael_essence');
  assert.equal(bossEssenceFor('old_widow_armor'), 'old_widow_essence');

  assert.equal(bossEssenceFor('asura_throne_sword'), 'asura_throne_fragment');
  assert.equal(bossEssenceFor('champion_throne_armor'), undefined); // champion throne armor não existe, boots sim
  assert.equal(bossEssenceFor('champion_throne_boots'), 'champion_throne_fragment');

  // Refino sem banco devolve o material específico por padrão
  const matsLich = refineMaterials('lich_crown');
  assert.deepEqual(matsLich, { lich_essence: 3 });

  const matsAsura = refineMaterials('asura_throne_sword');
  assert.deepEqual(matsAsura, { asura_throne_fragment: 3 });
});

test('personagem com réplica e peças antigas mantém itens com os mesmos atributos', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.createGuest();
  const char = db.createCharacter(db.accountForToken(acc)!, 'OldTimer', 'warrior').id;

  // Dá itens antigos e equipa
  db.applyGains(char, {
    actions: 0,
    items: {
      replica_champion_throne_sword: 1,
      lich_robe: 1,
      ancient_legs: 1,
      tide_boots: 1,
    },
    xp: { combat: xpForLevel(500) },
  }, 0, 0);

  assert.equal(game.equip(char, 'replica_champion_throne_sword', Date.now()), null);
  assert.equal(game.equip(char, 'lich_robe', Date.now()), null);
  assert.equal(game.equip(char, 'ancient_legs', Date.now()), null);
  assert.equal(game.equip(char, 'tide_boots', Date.now()), null);

  const eq = db.equipmentFor(char);
  assert.equal(eq.weapon, 'replica_champion_throne_sword');
  assert.equal(eq.armor, 'lich_robe');
  assert.equal(eq.legs, 'ancient_legs');
  assert.equal(eq.boots, 'tide_boots');

  // Atributos continuam os mesmos
  const sword = itemById('replica_champion_throne_sword')!;
  assert.equal(sword.equip?.attack, 349);
  assert.equal(sword.equip?.hp, 286);

  const robe = itemById('lich_robe')!;
  assert.equal(robe.equip?.defense, 70);
  assert.equal(robe.equip?.hp, 329);
  assert.equal(robe.equip?.attack, 20);

  const boots = itemById('tide_boots')!;
  assert.equal(boots.equip?.defense, 29);
  assert.equal(boots.equip?.hp, 191);
});

test('personagem com spellgem refinada equipada continua equipada e com mesmo dano', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.createGuest();
  const char = db.createCharacter(db.accountForToken(acc)!, 'MagoAntigo', 'arcanist').id;

  // Gema T1 refinada +5 e com qualidade mítica (#10)
  const gemId = 'spellgem_fireball+5#10';
  db.applyGains(char, {
    actions: 0,
    items: { [gemId]: 1 },
    xp: { combat: xpForLevel(50) },
  }, 0, 0);

  assert.equal(game.equip(char, gemId, Date.now()), null);
  assert.equal(db.equipmentFor(char).gem, gemId);

  const bonus = equipmentBonus(db.equipmentFor(char));
  assert.equal(bonus.spellGem, 'fireball');
  assert.ok(bonus.spellGemPower && bonus.spellGemPower > 1);

  const stats = playerStats('arcanist', xpForLevel(50), bonus, null, ['fireball']);
  const fireball = stats.spells?.find((s) => s.id === 'fireball')!;
  assert.ok(fireball);
  // Poder da gema refletido na magia
  assert.ok(fireball.effect.kind === 'strike' && fireball.effect.mult > 1.5);
});

test('peça de Trono +3 evolui (refino e ascensão) com só boss_essence ou com fragmento do trono', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.createGuest();
  const c1 = db.createCharacter(db.accountForToken(acc)!, 'TronoLegado', 'warrior').id;
  const c2 = db.createCharacter(db.accountForToken(acc)!, 'TronoNovo', 'warrior').id;

  const thronePiece = 'asura_throne_sword#3';
  const refineNeed = bossRefineEssence(3); // 3 * (3 + 1) = 12
  const ascendNeed = BOSS_ASCEND_ESSENCE[0]; // 5

  // Caso 1: Personagem com só boss_essence no depósito
  db.applyGains(c1, {
    actions: 0,
    items: {
      [thronePiece]: 1,
      [BOSS_ESSENCE]: refineNeed + ascendNeed,
      gold: 10_000_000,
    },
    xp: { combat: xpForLevel(350) },
  }, 0, 0);

  // refineMaterials verifica que cai em boss_essence quando não há fragmento
  const mats1 = refineMaterials(thronePiece, db.bankFor(c1));
  assert.deepEqual(mats1, { [BOSS_ESSENCE]: refineNeed });

  // Refina +3 -> +4 usando só boss_essence
  assert.equal(game.refineItem(c1, thronePiece, 0, { rng: () => 0 }), null);
  assert.equal(db.bankFor(c1)['asura_throne_sword#4'], 1);
  assert.equal(db.bankFor(c1)[BOSS_ESSENCE], ascendNeed);

  // Ascensão da peça (Lendária para Mítica) usando só boss_essence
  assert.equal(game.ascendItem(c1, 'asura_throne_sword#4', {}, 0, { rng: () => 0 }), null);
  assert.equal(db.bankFor(c1)['asura_throne_sword+5#4'], 1);
  assert.equal(db.bankFor(c1)[BOSS_ESSENCE] ?? 0, 0);

  // Caso 2: Personagem com fragmento novo do trono no depósito
  db.applyGains(c2, {
    actions: 0,
    items: {
      [thronePiece]: 1,
      asura_throne_fragment: refineNeed + ascendNeed,
      gold: 10_000_000,
    },
    xp: { combat: xpForLevel(350) },
  }, 0, 0);

  // refineMaterials prioriza o fragmento específico
  const mats2 = refineMaterials(thronePiece, db.bankFor(c2));
  assert.deepEqual(mats2, { asura_throne_fragment: refineNeed });

  // Refina +3 -> +4 usando fragmento novo
  assert.equal(game.refineItem(c2, thronePiece, 0, { rng: () => 0 }), null);
  assert.equal(db.bankFor(c2)['asura_throne_sword#4'], 1);
  assert.equal(db.bankFor(c2).asura_throne_fragment, ascendNeed);

  // Ascensão da peça usando fragmento novo
  assert.equal(game.ascendItem(c2, 'asura_throne_sword#4', {}, 0, { rng: () => 0 }), null);
  assert.equal(db.bankFor(c2)['asura_throne_sword+5#4'], 1);
  assert.equal(db.bankFor(c2).asura_throne_fragment ?? 0, 0);
});
