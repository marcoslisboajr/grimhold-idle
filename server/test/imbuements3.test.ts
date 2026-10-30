import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMBUEMENTS, XP_TABLE, huntById, imbuementsBonus, itemById, playerStats, runCycle } from '@grimhold/shared';

test('imbuements: toda família tem nível I, II e III, com material que existe', () => {
  const fam = new Map<string, number[]>();
  for (const i of IMBUEMENTS) {
    const f = i.id.replace(/_\d$/, '');
    fam.set(f, [...(fam.get(f) ?? []), i.tier]);
    for (const m of Object.keys(i.materials)) assert.ok(itemById(m), `${i.id}: material ${m}`);
  }
  assert.ok(fam.has('mana_leech'), 'tem Roubo de Mana');
  for (const [f, tiers] of fam) assert.deepEqual(tiers.sort(), [1, 2, 3], f);
  // O III é mais forte que o II.
  const val = (id: string) => Object.values(IMBUEMENTS.find((x) => x.id === id)!.bonus).map((v) => Math.abs(Number(v)))[0];
  for (const f of fam.keys()) assert.ok(val(`${f}_3`) > val(`${f}_2`), f);
});

test('Roubo de Mana: parte do dano volta como mana na luta', () => {
  const hunt = huntById('dragon_nest')!;
  const base = playerStats('arcanist', XP_TABLE[90]);
  const bonus = imbuementsBonus({ mana_leech_3: 3600 });
  assert.equal(bonus.manaLeech, 0.1);
  const leech = { ...playerStats('arcanist', XP_TABLE[90], bonus), level: 90, initialMana: 0 };
  const plain = { ...base, level: 90, initialMana: 0 };
  const a = runCycle(hunt, plain, 5, 0);
  const b = runCycle(hunt, leech, 5, 0);
  assert.ok((b.manaEnd ?? 0) > (a.manaEnd ?? 0), `mana no fim: ${a.manaEnd} sem, ${b.manaEnd} com`);
});

test('charm Sede Arcana: contra a espécie marcada, parte do dano volta como mana', async () => {
  const { charmById } = await import('@grimhold/shared');
  const c = charmById('mana_leech')!;
  assert.ok(c && c.group === 'effect');
  const hunt = huntById('dragon_nest')!;
  const p = { ...playerStats('arcanist', XP_TABLE[90]), level: 90, initialMana: 0 };
  const plain = runCycle(hunt, p, 9, 0);
  const marked = runCycle(hunt, p, 9, 0, undefined, 1, {}, hunt.monsters.map((m) => ({ id: 'mana_leech', monster: m })));
  assert.ok((marked.manaEnd ?? 0) > (plain.manaEnd ?? 0), `mana no fim: ${plain.manaEnd} sem, ${marked.manaEnd} com`);
});
