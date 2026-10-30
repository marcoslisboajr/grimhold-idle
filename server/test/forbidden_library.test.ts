import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, MONSTERS, HUNTING_TASKS, itemById } from '@grimhold/shared';

test('Biblioteca Proibida: três caçadas do 255 ao 272, instância com chave, covil no 275 e XP subindo pouco', () => {
  const region = HUNTS.filter((h) => h.region === 'Biblioteca Proibida');
  assert.deepEqual(region.filter((h) => !h.boss).map((h) => [h.level, h.focus]), [[255, 'xp'], [268, 'xp'], [263, 'balanced'], [272, 'loot']]);
  const vault = HUNTS.find((h) => h.id === 'index_vault')!;
  assert.equal(vault.key, 'index_key');
  assert.ok(itemById('index_key'));
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'index_key')), 'a chave também cai');
  const lair = HUNTS.find((h) => h.id === 'golden_reading_hall')!;
  assert.ok(lair.lair);
  assert.equal(lair.level, 275);
  const mon = (id: string) => MONSTERS.find((m) => m.id === id)!;
  for (const h of region) for (const id of [...h.monsters, ...(h.trash ?? [])]) assert.ok(mon(id), id);
  // Depois do 250 o nível custa o mesmo: a XP sobe pouco (menos de 20% do 255 ao 268).
  const ratio = mon('storm_arcanist').xp / mon('burning_scribe').xp;
  assert.ok(ratio > 1 && ratio < 1.2, String(ratio));
  // XP por hora medida no jogo (17/10): a região é cortada para ficar como as caçadas do 230 e 245; por morte não passa de 20% acima.
  assert.ok(mon('burning_scribe').xp < mon('fallen_lion_knight').xp * 1.2, 'não paga muito mais que a caçada do 245');
  for (const id of ['task_burning_scribes', 'task_frost_wisps', 'task_storm_arcanists'])
    assert.ok(HUNTING_TASKS.some((t) => t.id === id), id);
});
