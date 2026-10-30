/**
 * Arcanista em bando: XP/h e mortes por tamanho de bando com conjuntos de magias diferentes.
 *   node --import tsx scripts/sim_arcanist.ts
 */
import { HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor, spellsFor, maxSpells } from '@grimhold/shared';
import './_tweaks.ts';
import items from '../../shared/data/items.json' with { type: 'json' };

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
/** Melhor escolha para bando: magias de área primeiro, depois escudo, depois o golpe mais forte. */
function areaSpells(voc: string, lv: number) {
  const ok = spellsFor(voc).filter((s) => s.level <= lv);
  const score = (s: any) => (s.effect.kind === 'strike' && s.effect.area ? 100 + s.level : s.effect.kind === 'shield' ? 50 + s.level : s.effect.kind === 'strike' ? s.effect.mult : 0);
  return ok.sort((a, b) => score(b) - score(a)).slice(0, maxSpells(lv)).map((s) => s.id);
}
const cases: [number, string][] = [[25, 'old_cemetery'], [40, 'shipwreck_beach'], [60, 'dragon_nest'], [100, 'shadow_cathedral']];
for (const [L, id] of cases) {
  const h = HUNTS.find((x) => x.id === id)!;
  const p = parseHuntNode(h.id)!;
  console.log(`\n== ${h.id} (nível ${h.level}), personagem nível ${L}`);
  for (const voc of ['arcanist', 'warrior', 'devout']) {
    for (const [label, spells] of [['padrão', defaultSpells(voc, L)], ['área', areaSpells(voc, L)]] as const) {
      if (voc !== 'arcanist' && label === 'área') continue;
      const promo = L >= 30 ? promotionsFor(voc)[0]?.id : null;
      const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo, spells as string[]);
      const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
      const row: string[] = [];
      for (let pack = 1; pack <= 5; pack++) {
        let ms = 0, xp = 0, deaths = 0;
        for (let s = 0; s < 200; s++) {
          const c = runCycle(h, pl, 99, s, p.difficulty, pack);
          if (c.outcome === 'death') { deaths++; ms += c.fightMs; continue; }
          ms += c.fightMs + eatAfterFight(c, pl, bank).restMs;
          xp += c.xp;
        }
        row.push(`x${pack}: ${(Math.round((xp / ms) * 3.6e6) / 1e6).toFixed(2)}M${deaths ? `(${deaths}✝)` : ''}`);
      }
      console.log(`${voc} ${label}`.padEnd(16), row.join(' '), label === 'área' ? `[${spells.join(',')}]` : '');
    }
  }
}
