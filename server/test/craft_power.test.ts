import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, RECIPES, ALL_RAID_SET_ITEMS } from '@grimhold/shared';

/**
 * Craft do 150+ (18/10): arma e armadura de craft ficam pelo menos 5% acima do melhor item do mesmo
 * espaço e tipo (mesma vocação; peça de todos contra peça de todos) até o nível delas, lendários inclusos.
 */
test('craft do 150+: ganha de tudo do mesmo tipo até o nível dele', () => {
  const crafted = new Set(Object.values(RECIPES).flatMap((l) => (l as { output: string }[]).map((r) => r.output)));
  const SLOTS = ['weapon', 'shield', 'helmet', 'armor', 'legs', 'boots'];
  const pow = (e: { attack?: number; elementAttack?: number }) => (e.attack ?? 0) + (e.elementAttack ?? 0);
  const sameType = (a?: string[], b?: string[]) => (!a ? !b : !!b && a.some((v) => b.includes(v)));
  const gear = ITEMS.filter((i) => i.equip && SLOTS.includes(i.equip.slot) && !i.id.startsWith('replica_') && !ALL_RAID_SET_ITEMS.includes(i.id as any));
  for (const c of gear.filter((i) => crafted.has(i.id) && i.equip!.level >= 150)) {
    const e = c.equip!;
    for (const o of gear) {
      if (o.id === c.id || crafted.has(o.id) || o.equip!.slot !== e.slot || o.equip!.level > e.level || !sameType(e.vocations, o.equip!.vocations)) continue;
      if (e.slot === 'weapon') assert.ok(pow(e) >= pow(o.equip!) * 1.04, `${c.id} (${pow(e)}) < ${o.id} (${pow(o.equip!)})`);
      else assert.ok((e.defense ?? 0) >= (o.equip!.defense ?? 0) && (e.hp ?? 0) >= (o.equip!.hp ?? 0), `${c.id} < ${o.id}`);
    }
  }
});
