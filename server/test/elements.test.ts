import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENT_RESIST, ELEMENT_WEAK, HUNTS, XP_TABLE, elementMult, equipmentBonus, itemById, playerStats, runCycle } from '@grimhold/shared';

test('elementos: fraco leva +25%, resistente −25%, neutro igual', () => {
  assert.equal(elementMult({ weak: ['water'], resist: ['fire'] }, 'water'), ELEMENT_WEAK);
  assert.equal(elementMult({ weak: ['water'], resist: ['fire'] }, 'fire'), ELEMENT_RESIST);
  assert.equal(elementMult({ weak: ['water'] }, 'holy'), 1);
  assert.equal(elementMult({ resist: ['physical'] }, 'physical'), ELEMENT_RESIST);
});

test('arma de chefe: ataque físico + parte elemental (o total não muda)', () => {
  const blade = itemById('ancient_dragon_blade')!.equip!;
  assert.equal(blade.element, 'fire');
  assert.equal(blade.attack! + blade.elementAttack!, 89); // 61 com a base +45% das peças de chefe
  const b = equipmentBonus({ weapon: 'ancient_dragon_blade' });
  assert.equal(b.element, 'fire');
  assert.equal(b.elementAttack, blade.elementAttack);
  const p = playerStats('warrior', XP_TABLE[60], b);
  assert.equal(p.element, 'fire');
  assert.ok(p.elementShare! > 0.05 && p.elementShare! < 0.3);
});

test('arma de água mata dragão (fraco a água) mais rápido que a física com o mesmo ataque', () => {
  const nest = HUNTS.find((h) => h.id === 'dragon_nest')!;
  const water = playerStats('warrior', XP_TABLE[70], equipmentBonus({ weapon: 'kraken_harpoon' }));
  const plain = { ...water, element: undefined, elementShare: undefined };
  let wMs = 0;
  let pMs = 0;
  let elemHits = 0;
  for (let s = 0; s < 60; s++) {
    const w = runCycle(nest, water, 5, s);
    wMs += w.fightMs;
    elemHits += w.hits.filter((h) => h.by === 'p' && h.elem?.element === 'water').length;
    pMs += runCycle(nest, plain, 5, s).fightMs;
  }
  assert.ok(elemHits > 0, 'os golpes mostram a parte de água');
  assert.ok(wMs < pMs, `água ${wMs} x física ${pMs}`);
});
