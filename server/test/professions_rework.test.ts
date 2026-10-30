import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, NODES, RECIPES, itemById, simulateGathering, type Activity } from '@grimhold/shared';

// Rework das profissões (scripts/data/gen_professions_rework.py): coleta e criação até o 120.

test('rework: toda coleta tem algo novo até perto do 120, sem buraco grande de nível', () => {
  for (const [skill, nodes] of Object.entries(NODES)) {
    const levels = nodes.map((n) => n.level).sort((a, b) => a - b);
    assert.ok(levels[levels.length - 1] >= 115, `${skill} vai até ${levels[levels.length - 1]}`);
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] - levels[i - 1] <= 20, `${skill}: buraco de ${levels[i - 1]} a ${levels[i]}`);
  }
});

test('rework: todo material coletado serve para alguma receita', () => {
  const used = new Set(Object.values(RECIPES).flatMap((rs) => rs.flatMap((r) => Object.keys(r.inputs))));
  for (const [skill, nodes] of Object.entries(NODES)) {
    for (const n of nodes) for (const id of [n.item, ...(n.drops ?? []).map((d) => d.item)]) assert.ok(used.has(id), `${skill}/${n.id}: ${id} sem uso`);
  }
});

test('rework: a Rocha de Gemas dá as 4 gemas, a mais rara bem menos que a comum', () => {
  const act: Activity = { skill: 'mining', node: 'gem_rock', since: 0, seed: 7, seq: 0 };
  const r = simulateGathering(act, 12 * 3_600_000);
  const got = r.gains.items;
  for (const g of ['gem_sapphire', 'gem_emerald', 'gem_ruby', 'gem_diamond']) assert.ok((got[g] ?? 0) > 0, `veio ${g}`);
  assert.ok((got.gem_sapphire ?? 0) > 5 * (got.gem_diamond ?? 0), 'safira bem mais comum que diamante');
  const total = Object.values(got).reduce((a, b) => a + b, 0);
  assert.equal(total, r.gains.actions, 'uma gema por coleta');
});

test('rework: equipamentos novos de criação cobrem o combate 70 a 160 e sobem de força com o nível', () => {
  const sword = ['runite', 'orichalcum', 'luminite', 'dragonite', 'starmetal', 'primordial'].map((m) => itemById(`${m}_sword`)!.equip!);
  assert.deepEqual(sword.map((e) => e.level), [70, 85, 100, 120, 140, 160]);
  for (let i = 1; i < sword.length; i++) assert.ok(sword[i].attack! > sword[i - 1].attack!, 'cada metal bate mais que o anterior');
  // No nível dos itens de quest/arena do mesmo nível: ataque parecido e elemento.
  for (const [crafted, quest] of [['runite_sword', 'arena70_sword'], ['luminite_sword', 'arena100_sword'], ['luminite_mace', 'arena100_mace'], ['redwood_bow', 'arena100_bow'], ['redwood_staff', 'arena100_staff']]) {
    const c = itemById(crafted)!.equip!;
    const q = itemById(quest)!.equip!;
    assert.ok(Math.abs(c.attack! - q.attack!) <= 3, `${crafted} (${c.attack}) perto de ${quest} (${q.attack})`);
    assert.ok(c.element && c.elementAttack! >= q.elementAttack!, `${crafted} tem elemento como ${quest}`);
  }
  for (const r of Object.values(RECIPES).flat()) assert.ok(r.level <= 120, `${r.id} pede nível ${r.level}`);
  for (const it of ITEMS.filter((i) => i.equip)) assert.ok((it.equip!.level ?? 0) <= 550, it.id); // Raide IV Sangue Apodrecido (550+) chega ao 550.
});

test('rework: toda vocação tem elmo, armadura e calças criáveis em todos os níveis (10 a 160)', () => {
  const craftable = new Set(Object.values(RECIPES).flat().map((r) => r.output));
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    for (const level of [10, 25, 35, 45, 55, 70, 85, 100, 120, 140, 160]) {
      for (const slot of ['helmet', 'armor', 'legs']) {
        const found = ITEMS.some((i) => i.equip?.slot === slot && i.equip.level === level && craftable.has(i.id) && (!i.equip.vocations || i.equip.vocations.includes(voc)));
        assert.ok(found, `${voc}: falta ${slot} criável no nível ${level}`);
      }
    }
  }
});
