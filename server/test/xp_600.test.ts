import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overLevelXpMult, playerLevelXpMult } from '@grimhold/shared';

// Pedido de 30/10: freio de XP estilo Rubinot só do 600 em diante; abaixo dele nada muda.
test('freio de XP: igual até o 599 e cada vez mais forte do 600 em diante', () => {
  for (const l of [400, 450, 500, 571, 599]) assert.equal(playerLevelXpMult(l), 0.04, `nível ${l}`);
  let prev = playerLevelXpMult(599);
  for (const l of [600, 610, 650, 700, 750, 800]) {
    const m = playerLevelXpMult(l);
    assert.ok(m < prev, `nível ${l} (${m}) deve render menos que o anterior (${prev})`);
    prev = m;
  }
});

test('XP acima do nível: caçadas antigas não mudam abaixo do 600', () => {
  // Top 1 no 418 em grupo no Santuário Profanado (593) em Pesadelo: segue como estava.
  assert.equal(overLevelXpMult(593, 609, 418), 1);
  assert.equal(overLevelXpMult(593, 609, 571), 1);
});

test('XP acima do nível: caçada do 600+ só rende cheia até 20 níveis acima, para qualquer nível', () => {
  assert.equal(overLevelXpMult(605, 621, 601), 1);
  assert.ok(overLevelXpMult(605, 621, 590) < 1, 'caçada nova 31 níveis acima perde XP');
  assert.equal(overLevelXpMult(693, 709, 571), 0, 'carregado 138 níveis acima não ganha XP');
  assert.equal(overLevelXpMult(693, 709, 600), 0);
});
