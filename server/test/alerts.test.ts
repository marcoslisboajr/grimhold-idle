import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAlerts } from '../src/alerts.ts';

/** Avisos no Discord (18/10): o primeiro de cada tipo sai na hora, os repetidos viram contagem. */
test('avisos: um por tipo na janela, depois manda com a contagem; sem webhook não manda nada', async () => {
  const sent: string[] = [];
  let clock = 0;
  const a = createAlerts({ webhook: 'https://exemplo.invalid/hook', post: async (_u, body) => sent.push(JSON.parse(body).content), now: () => clock, windowMs: 1000 });
  a.report('tick', new Error('quebrou'));
  a.report('tick', new Error('quebrou'));
  a.report('tick', new Error('quebrou'));
  a.report('ws', new Error('outro'));
  assert.equal(sent.length, 2, 'um do tick e um do ws');
  assert.match(sent[0], /\[tick\]\*\* quebrou/);
  clock = 1500;
  a.report('tick', new Error('quebrou'));
  assert.equal(sent.length, 3);
  assert.match(sent[2], /\+2 vezes/, 'conta os que ficaram de fora');

  const quiet: string[] = [];
  const off = createAlerts({ post: async (_u, b) => quiet.push(b) });
  off.report('tick', new Error('x'));
  off.info('oi');
  assert.equal(quiet.length, 0);

  // Um webhook que falha não lança.
  const bad = createAlerts({ webhook: 'https://exemplo.invalid/hook', post: async () => { throw new Error('rede'); } });
  assert.doesNotThrow(() => bad.report('http', 'texto solto'));
});
