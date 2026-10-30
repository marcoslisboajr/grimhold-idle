import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, gearScore, itemById } from '@grimhold/shared';

test('Catacumbas Esquecidas: três caçadas do 280 ao 296, instância com chave, covil no 300, sets 270/285 e XP subindo pouco', () => {
  const region = HUNTS.filter((h) => h.region === 'Catacumbas Esquecidas');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[280, 'xp'], [293, 'xp'], [288, 'balanced'], [296, 'loot']]);
  assert.equal(HUNTS.find((h) => h.id === 'royal_ossuary')!.key, 'ossuary_key');
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'ossuary_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'kings_tomb')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 300);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of [...region, lair]) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  const ratio = mon('catacomb_demon').xp / mon('bone_legionary').xp;
  assert.ok(ratio > 1 && ratio < 1.25, String(ratio));
  assert.ok(mon('bone_legionary').xp < mon('storm_arcanist').xp * 1.2, 'não paga muito mais que a Biblioteca');
  for (const s of ['sword', 'bow', 'staff', 'mace', 'plate', 'robe', 'shield', 'boots', 'amulet', 'ring']) {
    assert.ok(gearScore(itemById(`drop270_${s}`)!) > gearScore(itemById(`drop255_${s}`)!), `270 ${s}`);
    assert.ok(gearScore(itemById(`drop285_${s}`)!) > gearScore(itemById(`drop270_${s}`)!), `285 ${s}`);
  }
  for (const s of ['amulet', 'ring', 'boots', 'sword', 'bow', 'staff', 'mace'])
    assert.ok(gearScore(itemById(`kings_tomb_${s}`)!) > gearScore(itemById(`golden_reading_hall_${s}`)!), `covil ${s}`);
  for (const id of ['task_bone_legionaries', 'task_catacomb_mummies', 'task_grave_necromancers'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
