import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Vale Primevo: três caçadas do 355 ao 371, instância com chave, covil no 375 com bolsa, set 350 e XP abaixo do Abismo', () => {
  const region = HUNTS.filter((h) => h.region === 'Vale Primevo');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[355, 'xp'], [368, 'xp'], [363, 'balanced'], [371, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'tyrant_nest')!;
  assert.equal(chamber.key, 'tyrant_key');
  assert.deepEqual(chamber.monsters, ['pterosaur_matriarch', 'tyrant_mother']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'tyrant_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'tyrant_throne')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 375);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('young_tyrant').xp / mon('primal_raptor').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('primal_raptor').xp < mon('abyss_warrior').xp, 'corte de XP contra o Abismo');
  assert.ok(mon('primal_rex').xp >= mon('ancient_leviathan').xp, 'covil paga pelo menos o do Leviatã');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop350_${s}+4#5`)!) > gearScore(itemById(`drop325_${s}+4#5`)!), `350 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`tyrant_throne_${s}#5`)!) > gearScore(itemById(`leviathan_maw_${s}#5`)!), `covil ${s}`);
  const loot = mon('primal_rex').loot;
  for (const p of ['tyrant_tooth', 'primal_claw', 'amber_heart']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'tyrant_throne_pouch')!.chance, 0.001);
  const pouch = itemById('tyrant_throne_pouch')!;
  assert.equal(pouch.fragment?.item, 'tyrant_throne_fragment');
  for (const id of ['sword', 'bow', 'staff', 'mace'].map((w) => `replica_tyrant_throne_${w}`)) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 1, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_primal_raptors', 'task_cave_brutes', 'task_young_tyrants'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
