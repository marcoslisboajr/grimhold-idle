import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Jardim Corrompido: três caçadas do 380 ao 396, instância com chave, covil no 400 com bolsa, set 375 e XP abaixo do Vale', () => {
  const region = HUNTS.filter((h) => h.region === 'Jardim Corrompido');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[380, 'xp'], [393, 'xp'], [388, 'balanced'], [396, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'garden_heart')!;
  assert.equal(chamber.key, 'garden_key');
  assert.deepEqual(chamber.monsters, ['lantern_warden', 'spore_mother']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'garden_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'end_hollow')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 400);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('blight_cactus').xp / mon('raging_pinecoon').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('raging_pinecoon').xp < mon('primal_raptor').xp, 'corte de XP contra o Vale');
  assert.ok(mon('end_tree').xp >= mon('primal_rex').xp, 'covil paga pelo menos o do Rex');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop375_${s}+4#5`)!) > gearScore(itemById(`drop350_${s}+4#5`)!), `375 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`end_hollow_${s}#5`)!) > gearScore(itemById(`tyrant_throne_${s}#5`)!), `covil ${s}`);
  const loot = mon('end_tree').loot;
  for (const p of ['end_seed', 'rotten_heartwood', 'spore_crown']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'end_hollow_pouch')!.chance, 0.001);
  const pouch = itemById('end_hollow_pouch')!;
  assert.equal(pouch.pool!.length, 4);
  for (const id of pouch.pool!) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 1, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_moss_golems', 'task_rotten_golems', 'task_corrupted_lanterns'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
