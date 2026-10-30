import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };

// Mão de Deus rendia ~3x o Milagre Vivo em bando (Juízo Final 4,5x em área); 17/10 ficou 2,5x e o Milagre ganhou velocidade.
const L = 236;
const eq: Record<string, { id: string; sc: number }> = {};
for (const i of items as any[]) {
  const e = i.equip;
  if (!e || i.legendary || e.level > L || (e.vocations && !e.vocations.includes('devout'))) continue;
  const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
  if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
}
const gear = Object.fromEntries(Object.entries(eq).map(([k, v]) => [k, v.id]));
const food = (items as any[]).filter((i) => i.food && (i.level ?? 0) <= L).sort((a, b) => a.food - b.food).at(-1).id;

function xpPerMs(promo: string, pack: number) {
  const pl = playerStats('devout', XP_TABLE[L], equipmentBonus(gear), promo, defaultSpells('devout', L));
  const h = HUNTS.find((x) => x.id === 'silent_barrow')!;
  const p = parseHuntNode(h.id)!;
  let ms = 0;
  let xp = 0;
  for (let s = 0; s < 150; s++) {
    const c = runCycle(h, pl, 99, s, p.difficulty, pack);
    ms += c.fightMs;
    if (c.outcome === 'death') continue;
    ms += eatAfterFight(c, pl, { [food]: 1e9 }).restMs;
    xp += c.xp;
  }
  return xp / ms;
}

// O Milagre Vivo passa do teto de +60% dos suportes (+100%): a passiva dele (vida, mana, regeneração)
// se compra com imbuição e ninguém descansa no fim de jogo, então só o dano dele pesava na XP.
test('Devoto T4: Mão de Deus e Milagre Vivo ficam perto em bando', () => {
  const ratio = xpPerMs('hand_of_god', 4) / xpPerMs('living_miracle', 4);
  assert.ok(ratio > 0.8 && ratio < 1.4, `Mão de Deus / Milagre Vivo em bando = ${ratio.toFixed(2)}`);
});

test('Devoto: cura de nível maior não cura menos por segundo que a de nível menor (fora a Ressurreição)', async () => {
  const { SPELLS } = await import('@grimhold/shared');
  const heals = SPELLS.filter((s) => s.vocation === 'devout' && s.effect.kind === 'heal' && !s.promotion).sort((a, b) => a.level - b.level);
  const perSec = (s: (typeof heals)[number]) => (s.effect as { pct: number }).pct / (s.cooldownMs / 1000);
  assert.ok(heals.length >= 3);
  const top = heals[heals.length - 1];
  for (const h of heals.slice(0, -1)) assert.ok(perSec(top) > perSec(h), `${top.id} (${perSec(top)}) <= ${h.id} (${perSec(h)})`);
});
