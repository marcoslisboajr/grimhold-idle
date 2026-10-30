/** Dano por segundo no chefe global e quanto tempo cada um leva para tirar a vida que soma. */
import { WORLD_BOSSES, bossDps, bossDrain, playerStats, equipmentBonus, defaultSpells, promotionsFor, XP_TABLE, BOSS_HP_PER_PLAYER } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
function gear(voc: string, lv: number) {
  const eq: any = {};
  for (const i of items as any[]) { const e = i.equip; if (!e || i.legendary || e.level > lv) continue; if (e.vocations && !e.vocations.includes(voc)) continue;
    const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8; if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc }; }
  return Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]));
}
const boss = WORLD_BOSSES[0];
console.log('chefe', boss.name, 'vida/jogador hoje', BOSS_HP_PER_PLAYER);
for (const L of [15, 30, 45, 60, 75, 90]) {
  const X = XP_TABLE[L];
  const row = ['warrior', 'hunter', 'arcanist', 'devout'].map((v) => {
    const sk: any = { warrior: { melee: X }, hunter: { ranged: X }, arcanist: { magic_level: X }, devout: { melee: X * 0.7, magic_level: X * 0.7 } }[v];
    const p = playerStats(v, X, equipmentBonus(gear(v, L)), L >= 30 ? promotionsFor(v)[0]?.id : null, defaultSpells(v, L), { combat: X, ...sk });
    const dps = bossDps(p, boss);
    return `${v.slice(0, 4)} ${Math.round(dps)}/s (${Math.round(BOSS_HP_PER_PLAYER / dps)}s) morre em ${Math.round(1 / bossDrain(p, L, v))}s`;
  });
  console.log(`nv ${L}:`, row.join(' | '));
}
