import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, XP_TABLE, playerStats, runCycle, validCombatRules } from '@grimhold/shared';

const hunt = HUNTS.find((h) => !h.boss && h.level >= 40)!;
const hunter = (spells: string[]) => playerStats('hunter', XP_TABLE[100], undefined, null, spells);
const firstStrike = (c: ReturnType<typeof runCycle>) => c.hits.find((h) => h.by === 'p' && h.spell)?.spell;

test('barra de ação: sem ordem o jogo escolhe a magia que mais rende; com ordem sai a primeira da barra', () => {
  const p = hunter(['aimed_shot', 'piercing_shot']);
  assert.equal(firstStrike(runCycle(hunt, p, 7, 0, undefined, 3)), 'piercing_shot');
  assert.equal(firstStrike(runCycle(hunt, { ...p, rules: { priority: true } }, 7, 0, undefined, 3)), 'aimed_shot');
});

test('barra de ação: magia de área com "3+ monstros" não sai contra um monstro só', () => {
  const p = { ...hunter(['explosive_arrows']), rules: { priority: true, strike: { explosive_arrows: 'aoe3' as const } } };
  const solo = runCycle(hunt, p, 7, 0, undefined, 1);
  assert.ok(!solo.hits.some((h) => h.spell === 'explosive_arrows'));
  const pack = runCycle(hunt, p, 7, 0, undefined, 4);
  assert.ok(pack.hits.some((h) => h.spell === 'explosive_arrows'));
});

test('barra de ação: condições inválidas são limpas', () => {
  assert.equal(validCombatRules('x'), null);
  const r = validCombatRules({ priority: true, strike: { aimed_shot: 'aoe2', heal: 'ready', nada: 'ready' }, heal: { heal: 2, field_bandage: 0.4 }, manaBelow: 0.3, runeHealBelow: -1 })!;
  assert.deepEqual(r, { priority: true, strike: { aimed_shot: 'aoe2' }, heal: { field_bandage: 0.4 }, manaBelow: 0.3 });
});

test('buffs diferentes valem juntos: com a Fúria Berserker ativa o Grito de Guerra também entra', () => {
  const p = { ...playerStats('warrior', XP_TABLE[100], undefined, null, ['berserk', 'war_cry']), rules: { priority: true } };
  const c = runCycle(hunt, p, 7, 0, undefined, 3);
  const used = c.hits.filter((h) => h.by === 'p' && h.spell).map((h) => h.spell);
  assert.ok(used.includes('berserk') && used.includes('war_cry'), `usou: ${used.join(', ')}`);
  // O que ainda vale passa para a próxima luta, cada um com o seu tempo.
  assert.ok((c.auraEnd?.buffs ?? []).every((b) => ['berserk', 'war_cry'].includes(b.id) && b.left > 0));
});
