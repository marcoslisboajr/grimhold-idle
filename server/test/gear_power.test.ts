import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GEAR_REQ, HUNTS, endgameAttackMult, endgameHpMult, gearPower, gearRequired, gearShortfall } from '@grimhold/shared';

const hunt = (id: string) => HUNTS.find((h) => h.id === id)!;

test('nota de equipamento: média das 10 vagas, vaga vazia vale 0; raridade e refino sobem a nota', () => {
  assert.equal(gearPower({}), 0);
  const one = gearPower({ armor: 'drop350_robe' });
  assert.ok(one > 0);
  assert.ok(gearPower({ armor: 'drop350_robe+5' }) > one);
  assert.ok(gearPower({ armor: 'drop350_robe+5#10' }) > gearPower({ armor: 'drop350_robe+5' }));
  assert.ok(gearPower({ armor: 'drop350_robe', helmet: 'drop350_robe' }) > one);
});

test('nota pedida: do 200 em diante (1,0 x nível no 200 até 650 no 380), só em caçada comum; com a nota nada muda', () => {
  assert.equal(gearRequired(199), 0);
  assert.equal(gearRequired(200), 200);
  assert.equal(gearRequired(380), GEAR_REQ.base);
  assert.ok(gearRequired(300) > 300 && gearRequired(300) < 500);
  const pine = hunt('pinecone_woods');
  assert.equal(endgameAttackMult(pine, 9999), 1);
  assert.equal(endgameHpMult(pine, 9999), 1);
  assert.equal(endgameAttackMult(pine, undefined), 1);
  // Abaixo do 380 a punição é a leve (kLow).
  const ty = hunt('tyrant_caldera');
  assert.ok(Math.abs(endgameAttackMult(ty, 0) - (1 + GEAR_REQ.kLow)) < 1e-9);
  // Didico (528) no Pinecone: falta ~19% → ataque ~x3,25 e vida ~+56%.
  const s = gearShortfall(pine, 528);
  assert.ok(Math.abs(s - 122 / 650) < 1e-9);
  assert.ok(Math.abs(endgameAttackMult(pine, 528) - (1 + GEAR_REQ.k * s)) < 1e-9);
  assert.ok(Math.abs(endgameHpMult(pine, 528) - (1 + GEAR_REQ.kHp * s)) < 1e-9);
});
