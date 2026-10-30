import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Cidadela do Usurpador: três caçadas do 405 ao 421, instância com chave, covil no 425 com bolsa, set 400 e XP abaixo do Jardim', () => {
  const region = HUNTS.filter((h) => h.region === 'Cidadela do Usurpador');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[405, 'xp'], [418, 'xp'], [413, 'balanced'], [421, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'usurper_council')!;
  assert.equal(chamber.key, 'usurper_key');
  assert.deepEqual(chamber.monsters, ['usurper_archmage', 'usurper_general']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'usurper_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'usurper_throne')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 425);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('usurper_elite').xp / mon('usurper_knight').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('usurper_knight').xp < mon('raging_pinecoon').xp, 'corte de XP contra o Jardim');
  assert.ok(mon('usurper_king').xp >= mon('end_tree').xp, 'covil paga pelo menos o da Árvore');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop400_${s}+4#5`)!) > gearScore(itemById(`drop375_${s}+4#5`)!), `400 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`usurper_throne_${s}#5`)!) > gearScore(itemById(`end_hollow_${s}#5`)!), `covil ${s}`);
  const loot = mon('usurper_king').loot;
  for (const p of ['usurped_crown', 'broken_scepter', 'traitor_heart']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'usurper_throne_pouch')!.chance, 0.001);
  const pouch = itemById('usurper_throne_pouch')!;
  assert.equal(pouch.fragment?.item, 'usurper_throne_fragment');
  for (const id of ['sword', 'bow', 'staff', 'mace'].map((w) => `replica_usurper_throne_${w}`)) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 1, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_usurper_knights', 'task_factory_bandits', 'task_usurper_elites'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
