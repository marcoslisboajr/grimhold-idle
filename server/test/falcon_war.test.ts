import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, huntNode, itemById, storyById, xpForLevel } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const ORDER = ['falcon_gates', 'oath_chamber', 'falcon_throne'];

test('A Queda do Gavião: caçadas do 205 ao 250, instância do Drevan e três instâncias de quest com arma de nível 250', () => {
  const region = HUNTS.filter((h) => h.region === 'Fortaleza de Valdeferro');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => h.level).sort((a, b) => a - b), [205, 215, 218, 230, 243, 245, 250]);
  const hall = HUNTS.find((h) => h.id === 'lion_hall')!;
  assert.equal(hall.key, 'lion_key');
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'lion_key')), 'a chave também cai');
  const story = storyById('falcon_war')!;
  assert.ok(story.epic);
  const goals = story.steps.map((s) => s.need?.goal);
  assert.deepEqual(goals.filter((g) => g?.kind === 'instance').map((g) => g!.kind === 'instance' && g!.hunt), ORDER);
  assert.deepEqual(ORDER.map((id) => HUNTS.find((h) => h.id === id)!.level), [220, 235, 250]);
  for (const id of ORDER) assert.equal(HUNTS.find((h) => h.id === id)!.quest, 'falcon_war');
  for (const end of Object.values(story.endings)) {
    const [id] = Object.keys(end.reward.items ?? {});
    assert.equal(itemById(id)?.equip?.slot, 'weapon');
    assert.equal(itemById(id)?.equip?.level, 250);
    assert.equal(end.reward.outfit, 'lion_knight');
  }
});

test('A Queda do Gavião: os soldados, os portões, as insígnias, a câmara e o trono, em ordem; o final dá a arma e o traje', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Leão', 'warrior').id;
  const gear = ['drop240_sword', 'drop240_plate', 'drop240_helmet', 'drop240_legs', 'drop240_shield', 'drop240_boots', 'drop240_amulet', 'drop240_ring'].map((g) => `${g}+3#5`);
  db.applyGains(id, { actions: 0, items: { cooked_shark: 50_000, ...Object.fromEntries(gear.map((g) => [g, 1])) }, xp: { combat: xpForLevel(254) } }, 0, 0);
  db.setPromotion(id, 'war_avatar');
  for (const g of gear) assert.equal(game.equip(id, g, 0), null, g);

  assert.equal(game.storyChoose(id, 'falcon_war', 0, 0), null);
  assert.match(game.start(id, 'combat', huntNode(ORDER[0], 'normal', 1), 0)!, /passo certo/, 'antes dos soldados os portões não abrem');
  db.addStoryProgress(id, 'falcon_war', 3000);
  assert.equal(game.storyChoose(id, 'falcon_war', 0, 0), null);
  let t = 0;
  for (const hunt of ORDER) {
    if (hunt === 'oath_chamber') {
      assert.match(game.start(id, 'combat', huntNode(hunt, 'normal', 1), t)!, /passo certo/, 'sem as insígnias a câmara não abre');
      db.applyGains(id, { actions: 0, items: { falcon_insignia: 40 }, xp: {} }, t, 0);
      assert.equal(game.storyChoose(id, 'falcon_war', 0, t), null);
    }
    assert.equal(game.start(id, 'combat', huntNode(hunt, 'normal', 1), t), null, hunt);
    t += 24 * 3_600_000;
    assert.equal(game.settle(id, t).gains.cleared, hunt, hunt);
    if (hunt !== ORDER[ORDER.length - 1]) assert.equal(game.storyChoose(id, 'falcon_war', 0, t), null, hunt);
  }
  assert.equal(game.storyChoose(id, 'falcon_war', 0, t), null);
  const st = game.state(id, t);
  assert.equal(st.bank.lion_blade, 1);
  assert.ok(st.unlockedOutfits?.includes('lion_knight'));
});

test('XP sem teto: personagem passa do nível 255 (maior inteiro exato do JavaScript) e lê, sobe de nível e entra no ranking', async () => {
  const { levelForXp } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Gigante', 'warrior').id;
  for (const lv of [254, 255, 300, 400, 600]) {
    db.applyGains(id, { actions: 0, items: {}, xp: { combat: xpForLevel(lv) - (db.skillsFor(id).combat ?? 0) } }, 0, 0);
    const xp = db.skillsFor(id).combat!;
    assert.equal(levelForXp(xp, 'combat'), lv);
    assert.equal(game.state(id, 0).skills.combat, xp);
  }
  assert.ok(xpForLevel(600) > Number.MAX_SAFE_INTEGER);
  assert.equal(db.ranking('combat', 5)[0].name, 'Gigante');
});

test('Forja do 200+: Aço de Valdeferro e três conjuntos (205/220/235) forjáveis até o nível 120, acima do drop (craft do 150+ ganha de tudo)', async () => {
  const { RECIPES, MAX_LEVEL } = await import('@grimhold/shared');
  const recipes = RECIPES.smithing;
  for (const [pre, lvl, drop] of [['valdeferro', 205, 'drop210'], ['goldmane', 220, 'drop225'], ['royallion', 235, 'drop240']] as const) {
    const armor = itemById(`${pre}_armor`)!.equip!;
    assert.equal(armor.level, lvl);
    assert.ok(armor.defense! > itemById(`${drop}_plate`)!.equip!.defense!, pre);
    for (const piece of ['sword', 'mace', 'axe', 'helmet', 'boots', 'shield', 'legs', 'armor', 'holy_helmet', 'holy_legs', 'holy_armor']) {
      const r = recipes.find((n) => n.id === `${pre}_${piece}`);
      assert.ok(r && r.level <= MAX_LEVEL, `${pre}_${piece}`);
      assert.ok(r!.inputs!.valdeferro_steel && r!.inputs!.falcon_insignia, `${pre}_${piece}`);
    }
  }
  assert.deepEqual(recipes.find((n) => n.id === 'valdeferro_steel')!.inputs, { primordial_bar: 2, golden_mane: 1, coal: 8 });
});

test('Covis do 200+ (aba Chefes): Drevan 210 e Aldoran 240, com a chance dos covis dos deuses e arma para cada classe', async () => {
  const { RECIPES } = await import('@grimhold/shared');
  for (const [id, lvl] of [['lion_bastion', 210], ['falcon_nest', 240]] as const) {
    const h = HUNTS.find((x) => x.id === id)!;
    assert.ok(h.lair);
    assert.equal(h.level, lvl);
    const boss = MONSTERS.find((m) => m.id === h.monsters[0])!;
    const divine = boss.loot.filter((l) => itemById(l.item)?.legendary);
    // Set 0,2%, partes 2% (antes 0,3%, pedido de 17/10) e a bolsa de armas (réplicas) 0,1%.
    assert.deepEqual(divine.map((l) => l.chance).sort(), [0.001, 0.002, 0.002, 0.002, 0.02, 0.02, 0.02]);
    const parts = divine.filter((l) => l.chance === 0.02).map((l) => l.item);
    for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
      const r = [...RECIPES.smithing, ...RECIPES.crafting].find((x) => itemById(x.output)?.equip?.vocations?.includes(voc) && x.id.startsWith(id));
      assert.ok(r, `${id} ${voc}`);
      for (const p of parts) assert.equal(r!.inputs![p], 1);
    }
  }
});
