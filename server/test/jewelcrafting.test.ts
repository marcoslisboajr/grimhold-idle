import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HUNTS,
  MONSTERS,
  RECIPES,
  PETS,
  XP_TABLE,
  equipmentBonus,
  itemById,
  monsterAttackElement,
  playerStats,
  recipeById,
  runCycle,
  simulateProduction,
  type Activity,
  type Hunt,
} from '@grimhold/shared';

test('joalheria: receitas fazem anéis, colares e Gemas de Combate, com materiais que existem; o Artesanato não faz mais joia', () => {
  const list = RECIPES.jewelcrafting;
  assert.ok(list.length >= 40);
  for (const r of list) {
    const eq = itemById(r.output)?.equip;
    assert.ok(eq && (eq.slot === 'ring' || eq.slot === 'amulet' || eq.slot === 'gem'), r.id);
    for (const m of Object.keys(r.inputs)) assert.ok(itemById(m), `${r.id}: ${m}`);
  }
  assert.ok(Math.min(...list.map((r) => r.level)) === 1 && Math.max(...list.map((r) => r.level)) >= 115, 'do 1 ao fim');
  for (const r of RECIPES.crafting) assert.ok(!['ring', 'amulet'].includes(itemById(r.output)?.equip?.slot ?? ''), r.id);
  assert.ok(PETS.some((p) => p.skill === 'jewelcrafting'));
});

test('joalheria: produzir gasta a barra e entrega o anel', () => {
  const r = recipeById('jewelcrafting', 'bronze_ring')!;
  const act: Activity = { skill: 'jewelcrafting', node: 'bronze_ring', since: 0, seed: 1, seq: 0 };
  const res = simulateProduction(act, r.intervalMs * 3, { bronze_bar: 10 });
  assert.equal(res.gains.actions, 3);
  assert.equal(res.gains.items.bronze_bar, -3);
  assert.equal(res.gains.items.bronze_ring, 3);
  assert.ok((res.gains.xp.jewelcrafting ?? 0) > 0);
});

/** Dano total que o personagem toma em várias lutas contra um monstro que bate fogo. */
function damageTaken(gear: Record<string, string>) {
  const fire = MONSTERS.find((m) => monsterAttackElement(m) === 'fire' && m.attack > 60)!;
  const base = HUNTS.find((h) => !h.boss && !h.lair && h.level >= 60 && h.level < 100)!;
  const hunt: Hunt = { ...base, monsters: [fire.id], focus: undefined };
  const player = playerStats('warrior', XP_TABLE[90], equipmentBonus(gear));
  let dmg = 0;
  for (let s = 0; s < 40; s++) dmg += runCycle(hunt, player, 7, s).hits.filter((h) => h.by === 'm').reduce((a, h) => a + h.dmg, 0);
  return { dmg, player };
}

test('joalheria: resistência ao elemento do monstro e redução de dano diminuem o dano recebido', () => {
  const none = damageTaken({});
  assert.equal(none.player.resistPct, undefined);
  assert.equal(none.player.reduction, undefined);
  const res = damageTaken({ amulet: 'magma_amulet' });
  assert.equal(res.player.resistPct?.fire, 0.2);
  assert.ok(res.dmg < none.dmg, `resistência: ${res.dmg} < ${none.dmg}`);
  const red = damageTaken({ ring: 'might_ring' });
  assert.equal(red.player.reduction, 0.04);
  assert.ok(red.dmg < none.dmg, `redução: ${red.dmg} < ${none.dmg}`);
  // Resistência a outro elemento não muda nada contra quem bate fogo.
  const other = damageTaken({ amulet: 'glacier_amulet' });
  assert.ok(Math.abs(other.dmg - none.dmg) / none.dmg < 0.15, 'outro elemento quase igual (só a defesa do colar)');
});

test('joalheria: teto de resistência e redução', () => {
  const p = playerStats('warrior', XP_TABLE[150], { attack: 0, defense: 0, hp: 0, reduction: 5, resFire: 9, resDeath: NaN });
  assert.equal(p.reduction, 0.25);
  assert.equal(p.resistPct?.fire, 0.5);
  assert.equal(p.resistPct?.death, undefined);
});

test('gemas: veios de quartzo (20) e geodo (90) dão gemas; caçada de loot solta gema e as outras não', async () => {
  const { NODES, simulateGathering, HUNT_FOCUS, LOOT_GEMS } = await import('@grimhold/shared');
  for (const id of ['quartz_vein', 'deep_geode']) {
    const n = NODES.mining.find((x) => x.id === id)!;
    assert.ok(n, id);
    const r = simulateGathering({ skill: 'mining', node: id, since: 0, seed: 3, seq: 0 }, n.intervalMs * 200 + 10);
    const gems = LOOT_GEMS.reduce((a, [g]) => a + (r.gains.items[g] ?? 0), 0);
    assert.equal(gems, 200, id);
  }
  const gemsIn = (h: Hunt) => {
    const p = playerStats('warrior', XP_TABLE[h.level + 20], equipmentBonus({}));
    let n = 0;
    for (let s = 0; s < 3000; s++) { const c = runCycle(h, p, 11, s); for (const [g] of LOOT_GEMS) n += c.loot[g] ?? 0; }
    return n;
  };
  const loot = HUNTS.find((h) => h.focus === 'loot' && h.level <= 20)!;
  const xp = HUNTS.find((h) => h.focus === 'xp' && h.level <= 20)!;
  assert.ok(gemsIn(loot) > 0, 'loot solta gema');
  assert.equal(gemsIn(xp), 0, 'XP não solta');
  assert.ok(HUNT_FOCUS.loot);
});
