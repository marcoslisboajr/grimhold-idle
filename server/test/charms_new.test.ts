import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARMS, charmById, monsterById, simulateHunt, type Activity } from '@grimhold/shared';

const H = 3_600_000;
const hunt: Activity = { skill: 'combat', node: 'river_bank', since: 0, seed: 11, seq: 0 };
const run = (charms: { id: string; monster: string }[]) =>
  simulateHunt(hunt, 2 * H, { vocation: 'warrior', combatXp: 0, charms });

test('charms novos: 6 elementais (um por elemento) e 4 de efeito, todos com grupo e custo', () => {
  assert.equal(CHARMS.filter((c) => c.group === 'elemental').length, 6);
  assert.equal(CHARMS.filter((c) => c.group === 'effect').length, 4);
  for (const c of CHARMS) assert.ok(c.cost > 0 && c.group, c.id);
});

test('charm elemental marca a espécie com o golpe extra do elemento', () => {
  const rat = monsterById('rat')!;
  const marked = charmById('elem_fire')!.apply(rat);
  assert.deepEqual(marked.charm?.proc, { element: 'fire', chance: 0.15, pct: 0.08 });
  assert.equal(rat.charm, undefined, 'não mexe no monstro original');
});

test('charms elementais nas duas espécies da caçada fazem matar mais rápido', () => {
  const base = run([]);
  const withCharm = run([{ id: 'elem_fire', monster: 'rat' }, { id: 'elem_earth', monster: 'frog' }]);
  assert.ok(withCharm.gains.actions > base.gains.actions, `${withCharm.gains.actions} >= ${base.gains.actions}`);
});

test('Resiliência encurta o descanso: mais lutas no mesmo tempo', () => {
  const base = run([]);
  const rested = run([{ id: 'resilience', monster: 'rat' }, { id: 'resilience', monster: 'frog' }]);
  assert.ok(rested.gains.actions > base.gains.actions);
  assert.equal(charmById('resilience')!.apply(monsterById('rat')!).charm?.rest, 0.2);
});

test('Golpe Certeiro e Sanguessuga somam crítico e roubo de vida na marca', () => {
  const m = charmById('leech')!.apply(charmById('precision')!.apply(monsterById('wolf')!));
  assert.equal(m.charm?.crit, 0.08);
  assert.equal(m.charm?.leech, 0.05);
});
