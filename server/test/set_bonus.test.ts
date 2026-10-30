import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equipmentBonus, fullSets, setKeyOf, SET_BONUS } from '@grimhold/shared';

test('set completo: chave pelo id (raridade, refino e réplica contam como a peça)', () => {
  assert.equal(setKeyOf('adamant_helmet'), 'adamant');
  assert.equal(setKeyOf('adamant_helmet+2#5'), 'adamant');
  assert.equal(setKeyOf('drop60_holy_armor'), 'drop60');
  assert.equal(setKeyOf('adamant_sword'), null, 'arma não faz parte do set');
});

test('set completo: as 4 peças de adamantita dão +5% de ataque, defesa e vida', () => {
  const three = { helmet: 'adamant_helmet', armor: 'adamant_armor', legs: 'adamant_legs', weapon: 'adamant_sword' };
  const four = { ...three, boots: 'adamant_boots' };
  assert.deepEqual(fullSets(three), []);
  assert.deepEqual(fullSets(four), ['adamant']);
  const raw = equipmentBonus({ ...three });
  const bootsOnly = equipmentBonus({ boots: 'adamant_boots' });
  const full = equipmentBonus(four);
  assert.equal(full.defense, Math.round((raw.defense + bootsOnly.defense) * (1 + SET_BONUS)));
  assert.equal(full.hp, Math.round((raw.hp + bootsOnly.hp) * (1 + SET_BONUS)));
  assert.equal(full.attack, Math.round(raw.attack * (1 + SET_BONUS)));
});

test('set completo: couro de 3 peças vale com as 3; misturar sets não vale', () => {
  assert.deepEqual(fullSets({ helmet: 'shadow_leather_helmet', armor: 'shadow_leather_armor', legs: 'shadow_leather_legs' }), ['shadow_leather']);
  assert.deepEqual(fullSets({ helmet: 'adamant_helmet', armor: 'adamant_armor', legs: 'adamant_legs', boots: 'mithril_boots' }), []);
});

test('set completo: no set de drop valem as peças da vocação de quem usa', () => {
  const warrior = { helmet: 'drop60_helmet', armor: 'drop60_plate', legs: 'drop60_legs', boots: 'drop60_boots' };
  assert.deepEqual(fullSets(warrior), ['drop60']);
  const hunter = { helmet: 'drop60_hood', armor: 'drop60_leather_armor', legs: 'drop60_leather_legs', boots: 'drop60_boots' };
  assert.deepEqual(fullSets(hunter), ['drop60']);
  assert.deepEqual(fullSets({ ...warrior, helmet: 'drop60_hood' }), [], 'peça de outra vocação não fecha o set');
});
