import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Torre dos Bruxos: três caçadas do 455 ao 471, instância com chave, covil no 475 com bolsa, set 450 e XP abaixo do Templo', () => {
  const region = HUNTS.filter((h) => h.region === 'Torre dos Bruxos');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[455, 'xp'], [468, 'xp'], [463, 'balanced'], [471, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'tower_council')!;
  assert.equal(chamber.key, 'tower_key');
  assert.deepEqual(chamber.monsters, ['devoted_high_priest', 'archwarlock']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'tower_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'flame_throne')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 475);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('tower_fanatic').xp / mon('tower_warlock').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('tower_warlock').xp < mon('cobra_warrior').xp, 'corte de XP contra o Templo');
  assert.ok(mon('grand_infernalist').xp >= mon('serpent_queen').xp, 'covil paga pelo menos o da Rainha Serpente');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop450_${s}+4#5`)!) > gearScore(itemById(`drop425_${s}+4#5`)!), `450 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`flame_throne_${s}#5`)!) > gearScore(itemById(`serpent_throne_${s}#5`)!), `covil ${s}`);
  const loot = mon('grand_infernalist').loot;
  for (const p of ['infernal_tome', 'burning_sigil', 'flame_heart']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'flame_throne_pouch')!.chance, 0.001);
  const pouch = itemById('flame_throne_pouch')!;
  assert.equal(pouch.fragment?.item, 'flame_throne_fragment');
  for (const id of ['sword', 'bow', 'staff', 'mace'].map((w) => `replica_flame_throne_${w}`)) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 1, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_tower_warlocks', 'task_infernalists', 'task_fanatics'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
