import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Abismo Afogado: três caçadas do 330 ao 346, instância com chave, covil no 350 com bolsa, set 325 e XP abaixo das Asuras', () => {
  const region = HUNTS.filter((h) => h.region === 'Abismo Afogado');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[330, 'xp'], [343, 'xp'], [338, 'balanced'], [346, 'loot']]);
  const chamber = HUNTS.find((h) => h.id === 'drowned_sanctum')!;
  assert.equal(chamber.key, 'drowned_key');
  assert.deepEqual(chamber.monsters, ['sanctum_turtle', 'abyssal_priestess']);
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'drowned_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'leviathan_maw')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 350);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('abyss_champion').xp / mon('abyss_warrior').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('abyss_warrior').xp < mon('dawnfire_asura').xp, 'corte de XP contra as Asuras');
  assert.ok(mon('ancient_leviathan').xp >= mon('asura_queen_enthroned').xp, 'covil paga pelo menos o do Trono Asura');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring'])
    assert.ok(gearScore(itemById(`drop325_${s}+4#5`)!) > gearScore(itemById(`drop300_${s}+4#5`)!), `325 ${s}`);
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`leviathan_maw_${s}#5`)!) > gearScore(itemById(`asura_throne_${s}#5`)!), `covil ${s}`);
  const loot = mon('ancient_leviathan').loot;
  for (const p of ['leviathan_fin', 'abyss_eye', 'ancient_tentacle']) assert.ok(loot.some((l) => l.item === p), p);
  assert.equal(loot.find((l) => l.item === 'leviathan_maw_pouch')!.chance, 0.001);
  const pouch = itemById('leviathan_maw_pouch')!;
  assert.equal(pouch.pool!.length, 4);
  for (const id of pouch.pool!) {
    const rep = itemById(id)!, orig = itemById(id.replace('replica_', ''))!;
    assert.ok(Math.abs(rep.equip!.attack! - Math.round(orig.equip!.attack! * 0.8)) <= 1, id); // base +45% (peças de chefe e réplicas): arredondamento
  }
  for (const id of ['task_abyss_warriors', 'task_abyssal_turtles', 'task_abyssal_sirens'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
