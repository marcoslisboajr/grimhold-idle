/**
 * Gera shared/data/combat_rate.json: XP de combate por hora que uma boa caçada
 * solo (dificuldade normal) rende em cada nível, na média das 4 vocações. As
 * profissões dão uma fração disto como XP de combate.
 *   node --import tsx scripts/gen_combat_rate.ts
 */
import { writeFileSync } from 'node:fs';
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };

const MAX = 250;
const foods = (items as any[]).filter((i) => i.food).sort((a, b) => a.food - b.food);
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) {
    const e = i.equip;
    if (!e || i.legendary || e.level > lv) continue;
    if (e.vocations && !e.vocations.includes(voc)) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
    if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
  }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
const solo = HUNTS.filter((h) => !h.boss && !h.key);
const rate: number[] = [0];
for (let L = 1; L <= MAX; L++) {
  let sum = 0;
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    const promo = L >= 70 ? promotionsFor(voc, 2)[0]?.id : L >= 30 ? promotionsFor(voc)[0]?.id : null;
    const pl = playerStats(voc, XP_TABLE[Math.min(L, XP_TABLE.length - 1)], equipmentBonus(gear(voc, L)), promo, defaultSpells(voc, L));
    const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
    let best = 0;
    for (const h of solo) {
      if (h.level > L || h.level < L - 35) continue;
      const p = parseHuntNode(h.id)!;
      let ms = 0;
      let xp = 0;
      let deaths = 0;
      for (let s = 0; s < 80; s++) {
        const c = runCycle(h, pl, 7, s, p.difficulty, 1);
        if (c.outcome === 'death') {
          deaths++;
          ms += c.fightMs;
          continue;
        }
        ms += c.fightMs + eatAfterFight(c, pl, bank).restMs;
        xp += c.xp;
      }
      if (deaths > 1 || ms === 0) continue;
      best = Math.max(best, (xp / ms) * 3_600_000);
    }
    sum += best;
  }
  // Acima das caçadas mais difíceis a taxa não cai (o jogador fica na última).
  rate.push(Math.max(rate[L - 1] ?? 0, Math.round(sum / 4)));
  if (L % 10 === 0) console.log(`nível ${L}: ${rate[L].toLocaleString('pt-BR')} XP/h`);
}
writeFileSync(new URL('../../shared/data/combat_rate.json', import.meta.url), JSON.stringify(rate) + '\n');
console.log('ok');
