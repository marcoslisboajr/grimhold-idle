/** Nível 100: XP/h das subclasses (tier 2 e 3) com as magias do 100. node --import tsx scripts/sim_t3.ts [nivel] [caçada:bando,...] */
import { SPELLS, HUNTS, runCycle, playerStats, parseHuntNode, eatAfterFight, XP_TABLE, equipmentBonus, PROMOTIONS } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const L = Number(process.argv[2] ?? 100);
const runs = (process.argv[3] ?? 'nightmare_valley:1,shadow_cathedral:3,infernal_abyss:1').split(',').map((s) => s.split(':'));
const SETS: Record<string, string[]> = {
  warrior: ['execution', 'iron_skin', 'earthquake', 'berserk'],
  hunter: ['piercing_shot', 'field_bandage', 'explosive_arrows', 'eagle_eye'],
  arcanist: ['arcane_inferno', 'meteor', 'ice_storm', 'mana_barrier'],
  devout: ['divine_wrath', 'great_heal', 'divine_heal', 'judgement'],
};
if (process.env.OLD) {
  const old: Record<string, any> = { execution: { kind: 'strike', mult: 2.6 }, piercing_shot: { kind: 'strike', mult: 2.6 }, arcane_inferno: { kind: 'strike', mult: 2, area: true }, divine_wrath: { kind: 'strike', mult: 3 } };
  for (const sp of SPELLS as any[]) if (old[sp.id]) sp.effect = old[sp.id];
}
if (process.env.DW) for (const sp of SPELLS as any[]) if (sp.id === 'divine_wrath') sp.effect = { ...sp.effect, mult: Number(process.env.DW) };
if (process.env.ONLY) for (const k of Object.keys(SETS)) if (k !== process.env.ONLY) delete SETS[k];
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
console.log(`nível ${L}: XP/h em milhões (mortes em 300 lutas)`);
console.log(''.padEnd(26) + runs.map(([h, p]) => `${h.slice(0, 12)} x${p}`.padEnd(18)).join(''));
for (const voc of Object.keys(SETS)) {
  for (const tier of [2, 3]) {
    for (const promo of (PROMOTIONS as any[]).filter((p) => p.vocation === voc && (p.tier ?? 1) === tier)) {
      const pl = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo.id, SETS[voc]);
      const bank = { [foods.filter((f) => (f.level ?? 0) <= L).pop()?.id ?? foods[0].id]: 1e9 };
      const row: string[] = [];
      for (const [hid, pack] of runs) {
        const h = HUNTS.find((x) => x.id === hid)!;
        const p = parseHuntNode(h.id)!;
        let ms = 0, xp = 0, deaths = 0;
        for (let s = 0; s < 300; s++) {
          const c = runCycle(h, pl, 99, s, p.difficulty, Number(pack));
          if (c.outcome === 'death') { deaths++; ms += c.fightMs; continue; }
          ms += c.fightMs + eatAfterFight(c, pl, bank).restMs;
          xp += c.xp;
        }
        row.push(`${((xp / ms) * 3.6e3 / 1e3).toFixed(2)}M${deaths ? ` (${deaths}✝)` : ''}`.padEnd(18));
      }
      console.log(`${voc.slice(0, 4)} t${tier} ${promo.name}`.padEnd(26) + row.join(''));
    }
  }
}
