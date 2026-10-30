import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Palácio das Asuras: três caçadas do 305 ao 321, instância com chave, covil no 325 com bolsa, set 300 e XP sem disparar', () => {
  const region = HUNTS.filter((h) => h.region === 'Palácio das Asuras');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[305, 'xp'], [318, 'xp'], [313, 'balanced'], [321, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'queens_chamber')!;
  assert.equal(chamber.key, 'asura_key');
  assert.deepEqual(chamber.monsters, ['asura_guardian', 'asura_queen']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'asura_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'asura_throne')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 325);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('asura_matriarch').xp / mon('dawnfire_asura').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('dawnfire_asura').xp < mon('bone_legionary').xp * 1.2, 'não paga muito mais que as Catacumbas');
  assert.ok(mon('asura_queen_enthroned').xp >= mon('catacomb_king_risen').xp, 'covil paga pelo menos o da Tumba do Rei');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop300_${s}+4#5`)!) > gearScore(itemById(`drop285_${s}+4#5`)!), `300 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`asura_throne_${s}#5`)!) > gearScore(itemById(`kings_tomb_${s}#5`)!), `covil ${s}`);
  const loot = mon('asura_queen_enthroned').loot;
  for (const p of ['asura_tiara', 'queens_veil', 'dancers_bell']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'asura_throne_pouch')!.chance, 0.001);
  const pouch = itemById('asura_throne_pouch')!;
  assert.equal(pouch.fragment?.item, 'asura_throne_fragment');
  for (const id of ['sword', 'bow', 'staff', 'mace'].map((w) => `replica_asura_throne_${w}`)) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 1, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_dawnfire_asuras', 'task_frost_asuras', 'task_true_asuras'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
