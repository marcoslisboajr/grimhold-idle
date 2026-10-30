import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, spellTune } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };

// Early game (17/10): o Arcanista sobrava até o 40 e o Devoto despencava no tier 1. XP/h relativa ao Caçador.
const foods = (items as any[]).filter((i) => i.food).sort((a, b) => a.food - b.food);
function gear(voc: string, lv: number) {
  const eq: Record<string, { id: string; sc: number }> = {};
  for (const i of items as any[]) {
    const e = i.equip;
    if (!e || i.legendary || e.level > lv || (e.vocations && !e.vocations.includes(voc))) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
    if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
  }
  return Object.fromEntries(Object.entries(eq).map(([k, v]) => [k, v.id]));
}
function rate(voc: string, promo: string | undefined, L: number, hunt: string) {
  const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo, defaultSpells(voc, L));
  const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
  const h = HUNTS.find((x) => x.id === hunt)!;
  const p = parseHuntNode(h.id)!;
  let ms = 0;
  let xp = 0;
  for (let s = 0; s < 100; s++) {
    const c = runCycle(h, pl, 99, s, p.difficulty, 1);
    ms += c.fightMs;
    if (c.outcome === 'death') continue;
    ms += eatAfterFight(c, pl, bank).restMs;
    xp += c.xp;
  }
  return xp / ms;
}
const pct = (voc: string, promo: string | undefined, L: number, hunt: string, ref: string | undefined) =>
  rate(voc, promo, L, hunt) / rate('hunter', ref, L, hunt);

test('Early game: a força das magias segue a curva por nível', () => {
  assert.equal(spellTune('arcanist', 10), 0.8);
  assert.equal(spellTune('arcanist', 100), 1);
  assert.equal(spellTune('devout', 65), 2.1);
  assert.equal(spellTune('devout', 70), 1.6);
  assert.equal(spellTune('warrior', 50), 1);
});

test('Early game: Arcanista e Devoto perto do Caçador antes e no tier 1', () => {
  const arc40 = pct('arcanist', 'mage', 40, 'deep_tomb', 'archer');
  assert.ok(arc40 > 0.75 && arc40 < 1.1, `Mago no 40 = ${arc40.toFixed(2)}`);
  const dev8 = pct('devout', undefined, 8, 'spider_nest', undefined);
  assert.ok(dev8 < 1.3, `Devoto no 8 = ${dev8.toFixed(2)}`);
  const cleric60 = pct('devout', 'cleric', 60, 'dragon_nest', 'archer');
  assert.ok(cleric60 > 0.65 && cleric60 < 1, `Clériga no 60 = ${cleric60.toFixed(2)}`);
  const inq60 = pct('devout', 'inquisitor', 60, 'dragon_nest', 'archer');
  assert.ok(inq60 > 0.8 && inq60 < 1.15, `Inquisidor no 60 = ${inq60.toFixed(2)}`);
});
