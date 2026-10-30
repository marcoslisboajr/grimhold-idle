import { arenaById, playerStats, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) {
    const e = i.equip;
    if (!e || i.legendary || e.level > lv || (e.vocations && !e.vocations.includes(voc))) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
    if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
  }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
for (const [aid, L] of [['arena_70', 70], ['arena_100', 100]] as const) {
  const boss = arenaById(aid)!.opponents.at(-1)!;
  console.log(`${aid} chefe: vida ${boss.hp} atk ${boss.attack} def ${boss.defense} vel ${boss.attackSpeedMs}`);
  for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
    const promo = promotionsFor(voc, L >= 100 ? 3 : 2)[0]?.id;
    const p = playerStats(voc, XP_TABLE[L], equipmentBonus(gear(voc, L)), promo, defaultSpells(voc, L));
    const taken = Math.max(1, boss.attack - p.defense * 0.5) * 1000 / boss.attackSpeedMs;
    const dealt = Math.max(1, p.attack - boss.defense * 0.5) * 1000 / p.attackSpeedMs;
    console.log(`  ${voc.padEnd(8)} vida ${p.hp} atk ${Math.round(p.attack)} def ${Math.round(p.defense)} vel ${p.attackSpeedMs} | apanha ${taken.toFixed(0)}/s (morre em ${(p.hp / taken).toFixed(0)}s) | bate ${dealt.toFixed(0)}/s (mata em ${(boss.hp / dealt).toFixed(0)}s)`);
  }
}
