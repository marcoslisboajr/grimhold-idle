import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Caverna dos Heróis: três caçadas do 480 ao 496, instância com chave, covil final no 500 com bolsa, set 475 e XP abaixo da Torre', () => {
  const region = HUNTS.filter((h) => h.region === 'Caverna dos Heróis');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[480, 'xp'], [488, 'balanced'], [496, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'oath_hall')!;
  assert.equal(chamber.key, 'oath_key');
  assert.deepEqual(chamber.monsters, ['heroine_archmage', 'hero_captain']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'oath_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'champion_throne')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 500);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('champion_knight').xp / mon('fallen_warrior').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('fallen_warrior').xp < mon('tower_warlock').xp, 'corte de XP contra a Torre');
  assert.ok(mon('fallen_champion').xp >= mon('grand_infernalist').xp, 'covil paga pelo menos o do Grão-Infernalista');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop475_${s}+4#5`)!) > gearScore(itemById(`drop450_${s}+4#5`)!), `475 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`champion_throne_${s}#5`)!) > gearScore(itemById(`flame_throne_${s}#5`)!), `covil ${s}`);
  const loot = mon('fallen_champion').loot;
  for (const p of ['champion_crest', 'broken_oath', 'hero_soul']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'champion_throne_pouch')!.chance, 0.001);
  const pouch = itemById('champion_throne_pouch')!;
  assert.equal(pouch.fragment?.item, 'champion_throne_fragment');
  for (const id of ['sword', 'bow', 'staff', 'mace'].map((w) => `replica_champion_throne_${w}`)) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 2, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_fallen_warriors', 'task_hero_vigilantes', 'task_champion_knights'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
