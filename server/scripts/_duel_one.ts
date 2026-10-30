import './_tweaks.ts';
import { arenaById, runArenaCycle, playerStats, XP_TABLE, equipmentBonus, defaultSpells, promotionsFor } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
const [voc, aid, L, wave] = [process.argv[2], process.argv[3], Number(process.argv[4]), Number(process.argv[5])];
const eq: any = {};
for (const i of items as any[]) {
  const e = i.equip;
  if (!e || i.legendary || e.level > L || (e.vocations && !e.vocations.includes(voc))) continue;
  const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;
  if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
}
const p = playerStats(voc, XP_TABLE[L], equipmentBonus(Object.fromEntries(Object.entries(eq).map(([k, v]: any) => [k, v.id]))), promotionsFor(voc, L >= 100 ? 3 : 2)[0]?.id, defaultSpells(voc, L));
console.log('jogador', { hp: p.hp, atk: Math.round(p.attack), def: Math.round(p.defense), el: p.element, share: p.elementShare, lifesteal: p.lifesteal, duel: p.duel, spells: p.spells?.map((s) => s.id) });
const c = runArenaCycle(arenaById(aid)!, p, 7919, wave);
const by = (w: string) => c.hits.filter((h) => h.by === w);
console.log('resultado', c.outcome, 'tempo', Math.round(c.fightMs / 1000) + 's', 'dano recebido', by('m').reduce((s, h) => s + h.dmg, 0), 'curado', c.hits.reduce((s, h) => s + (h.heal ?? 0) + (h.lifesteal ?? 0), 0), 'golpes do oponente', by('m').length, 'média', Math.round(by('m').reduce((s, h) => s + h.dmg, 0) / Math.max(1, by('m').length)));
