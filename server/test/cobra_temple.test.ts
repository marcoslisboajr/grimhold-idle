import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Templo da Cobra: três caçadas do 430 ao 446, instância com chave, covil no 450 com bolsa, set 425 e XP abaixo da Cidadela', () => {
  const region = HUNTS.filter((h) => h.region === 'Templo da Cobra');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[430, 'xp'], [443, 'xp'], [438, 'balanced'], [446, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'serpent_sanctum')!;
  assert.equal(chamber.key, 'serpent_key');
  assert.deepEqual(chamber.monsters, ['cobra_matriarch', 'cobra_grand_vizier']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'serpent_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'serpent_throne')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 450);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('cobra_vizier').xp / mon('cobra_warrior').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('cobra_warrior').xp < mon('usurper_knight').xp, 'corte de XP contra a Cidadela');
  assert.ok(mon('serpent_queen').xp >= mon('usurper_king').xp, 'covil paga pelo menos o do Rei Usurpador');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop425_${s}+4#5`)!) > gearScore(itemById(`drop400_${s}+4#5`)!), `425 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`serpent_throne_${s}#5`)!) > gearScore(itemById(`usurper_throne_${s}#5`)!), `covil ${s}`);
  const loot = mon('serpent_queen').loot;
  for (const p of ['serpent_fang', 'shed_skin', 'venom_heart']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'serpent_throne_pouch')!.chance, 0.001);
  const pouch = itemById('serpent_throne_pouch')!;
  assert.equal(pouch.fragment?.item, 'serpent_throne_fragment');
  for (const id of ['sword', 'bow', 'staff', 'mace'].map((w) => `replica_serpent_throne_${w}`)) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 1, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_cobra_warriors', 'task_cobra_blades', 'task_cobra_viziers'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
