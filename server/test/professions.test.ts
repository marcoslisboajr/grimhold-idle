import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEMS,
  NODES,
  POTION_FIGHTS,
  RECIPES,
  SKILLS,
  itemById,
  playerStats,
  simulateGathering,
  gatherExtraChance,
  simulateHunt,
  simulateProduction,
  withPotion,
  XP_TABLE,
  type Activity,
  nodeById,
} from '@grimhold/shared';

test('profissões: todo nó e receita aponta para itens que existem, com ícone', () => {
  for (const list of Object.values(NODES)) for (const n of list) assert.ok(itemById(n.item), `${n.id} → ${n.item}`);
  for (const list of Object.values(RECIPES))
    for (const r of list) {
      assert.ok(itemById(r.output), `${r.id} → ${r.output}`);
      for (const i of Object.keys(r.inputs)) assert.ok(itemById(i), `${r.id} usa ${i}`);
    }
  assert.ok(SKILLS.some((s) => s.id === 'herbalism') && SKILLS.some((s) => s.id === 'alchemy'));
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length, 'ids de item repetidos');
});

test('herbalismo colhe ervas e a alquimia transforma em poção', () => {
  const herb: Activity = { skill: 'herbalism', node: 'green_herb_patch', since: 0, seed: 1, seq: 0 };
  const g = simulateGathering(herb, 30_000);
  assert.equal(g.gains.items.green_herb, 10);
  const brew: Activity = { skill: 'alchemy', node: 'brew_health', since: 0, seed: 1, seq: 0 };
  const p = simulateProduction(brew, 30_000, { green_herb: 10 });
  assert.equal(p.gains.items.health_potion, 5);
  assert.equal(p.gains.items.green_herb, -10);
});

test('poção de caçada: soma o bônus e é tomada uma a cada POTION_FIGHTS lutas', () => {
  const base = playerStats('warrior', XP_TABLE[20]);
  assert.ok(withPotion(base, 'strength_potion').attack > base.attack);
  assert.equal(withPotion(base, 'cooked_shrimp').attack, base.attack);

  const hunt: Activity = { skill: 'combat', node: 'river_bank', since: 0, seed: 3, seq: 0 };
  const ctx = { vocation: 'warrior', combatXp: XP_TABLE[20], bank: { strength_potion: 500 }, potion: 'strength_potion', food: 'none' };
  const r = simulateHunt(hunt, 10 * 60_000, ctx);
  const fights = r.seq;
  assert.ok(fights > POTION_FIGHTS);
  assert.equal(r.gains.items.strength_potion, -Math.ceil(fights / POTION_FIGHTS));
  // Sem poção no banco: não gasta nada.
  const none = simulateHunt(hunt, 10 * 60_000, { ...ctx, bank: {} });
  assert.equal(none.gains.items.strength_potion, undefined);
});

test('poção de mana: bebe durante a caçada quando falta mana para magias e consome do banco', () => {
  const hunt: Activity = { skill: 'combat', node: 'river_bank', since: 0, seed: 7, seq: 0 };
  const ctx = {
    vocation: 'arcanist',
    combatXp: XP_TABLE[20],
    bank: { mana_potion: 50 },
    manaPotion: 'mana_potion',
    food: 'none',
    spells: ['fireball', 'magic_shield'],
  };
  const r = simulateHunt(hunt, 10 * 60_000, ctx);
  assert.ok(r.seq > 0);
  assert.ok((r.gains.items.mana_potion ?? 0) < 0, 'deve ter consumido ao menos uma poção de mana');
  assert.ok(r.gains.items.mana_potion! >= -50, 'não pode gastar mais do que tem no banco');
});

test('herbalismo raro: pontos de nível 70, 80 e 90 rendem as ervas certas', () => {
  const ghostPatch: Activity = { skill: 'herbalism', node: 'ghost_bloom_patch', since: 0, seed: 1, seq: 0 };
  const g1 = simulateGathering(ghostPatch, 24_000);
  assert.equal(g1.gains.items.ghost_bloom, 3);

  const firePatch: Activity = { skill: 'herbalism', node: 'fire_lotus_patch', since: 0, seed: 1, seq: 0 };
  const g2 = simulateGathering(firePatch, 27_000);
  assert.equal(g2.gains.items.fire_lotus, 3);

  const voidPatch: Activity = { skill: 'herbalism', node: 'void_orchid_patch', since: 0, seed: 1, seq: 0 };
  const g3 = simulateGathering(voidPatch, 30_000);
  assert.equal(g3.gains.items.void_orchid, 3);
});

test('colheita de almas: os 5 nós originais continuam iguais e a lista vai até o 120', () => {
  const nodes = NODES.soulreaping;
  const original = ['bone_dust_remains', 'dark_essence_font', 'spectral_tear_tomb', 'ancient_ash_pyre', 'abyssal_soul_rift'].map((id) => nodes.find((n) => n.id === id)!);
  assert.deepEqual(original.map((n) => n.level), [1, 15, 30, 45, 60]);
  assert.deepEqual(original.map((n) => n.item), ['bone_dust', 'dark_essence', 'spectral_tear', 'ancient_ash', 'abyssal_soul']);
  assert.equal(Math.max(...nodes.map((n) => n.level)), 120);

  // Nível 1: Restos Mortais (3s -> Poeira de Ossos)
  const act1: Activity = { skill: 'soulreaping', node: 'bone_dust_remains', since: 0, seed: 1, seq: 0 };
  const g1 = simulateGathering(act1, 6_000);
  assert.equal(g1.gains.items.bone_dust, 2);
  assert.equal(g1.gains.xp.soulreaping, 2 * nodeById('soulreaping', 'bone_dust_remains')!.xp);

  // Nível 60: Fenda Abissal (7s -> Alma Abissal)
  const act5: Activity = { skill: 'soulreaping', node: 'abyssal_soul_rift', since: 0, seed: 1, seq: 0 };
  const g5 = simulateGathering(act5, 14_000);
  assert.equal(g5.gains.items.abyssal_soul, 2);
  assert.equal(g5.gains.xp.soulreaping, 2 * nodeById('soulreaping', 'abyssal_soul_rift')!.xp);
});



test('coleta muito acima do nível do ponto: chance de item extra (10 acima começa, 1% por nível, até 40%)', () => {
  assert.equal(gatherExtraChance(25, 15), 0);
  assert.equal(gatherExtraChance(35, 15), 0.1);
  assert.equal(gatherExtraChance(120, 1), 0.4);
  const node = NODES.mining.find((n) => n.id === 'copper_vein')!;
  const act = { skill: 'mining' as const, node: node.id, since: 0, seed: 42, seq: 0 };
  const base = simulateGathering(act, 3_600_000, 0, 0);
  const extra = simulateGathering(act, 3_600_000, 0, 0.4);
  assert.equal(extra.gains.actions, base.gains.actions, 'o extra não muda o número de ações nem a XP');
  assert.equal(extra.gains.xp.mining, base.gains.xp.mining);
  const ratio = (extra.gains.items.copper_ore ?? 0) / (base.gains.items.copper_ore ?? 1);
  assert.ok(ratio > 1.3 && ratio < 1.5, `uns 40% a mais de minério (${ratio})`);
});
