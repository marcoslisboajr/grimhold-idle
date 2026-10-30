/**
 * Gasto de poção de mana numa caçada real (game.settle a cada 1 s): vocação e nível escolhidos,
 * melhor equipamento, magias de dano mais caras primeiro, poção no limite da barra (30%).
 * Mostra poções/h e XP/h.
 *   node --import tsx scripts/sim_mana_pots.ts [vocacao] [nivel] [caçada] [minutos]
 */
import { SPELLS, XP_TABLE, maxSpells, itemById } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const voc = process.argv[2] ?? 'arcanist';
const level = Number(process.argv[3] ?? 150);
const node = process.argv[4] ?? 'forgotten_tundra';
const minutes = Number(process.argv[5] ?? 30);
const POT = level >= 130 ? 'celestial_mana_potion' : level >= 100 ? 'divine_mana_potion' : 'great_mana_potion';
const FOOD = process.env.FOOD ?? 'cooked_shark';
const HP_POT = process.env.HP_POT ?? 'great_health_potion';
const t0 = 1_800_000_000_000;
const db = openDb(':memory:');
const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Teste', voc as any).id;
db.applyGains(id, { actions: 0, items: { [FOOD]: 100000, [POT]: 100000, [HP_POT]: 100000 }, xp: { combat: XP_TABLE[level - 1] } }, 0, 0);
const game = createGame(db);
const eq: Record<string, { id: string; sc: number }> = {};
for (const i of items as any[]) {
  const e = i.equip; if (!e || e.level > level || i.legendary || e.slot === 'cape') continue; if (e.vocations && !e.vocations.includes(voc)) continue;
  const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8 + (e.mana ?? 0) * 200;
  if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc };
}
for (const v of Object.values(eq)) { db.applyGains(id, { actions: 0, items: { [v.id]: 1 }, xp: {} }, 0, 0); game.equip(id, v.id, 0); }
const spells = SPELLS.filter((s) => s.vocation === voc && s.level <= level).sort((a, b) => b.level - a.level).slice(0, maxSpells(level)).map((s) => s.id);
console.log('magias', game.setSpells(id, spells, 0) ?? spells.join(','));
console.log('comida', game.setFood(id, FOOD, 0), 'vida', game.setPotion(id, HP_POT, 0));
console.log('poção', POT, game.setManaPotion(id, POT, 0), game.setCombatRules(id, { manaBelow: 0.3 }, 0));
console.log('caçada', node, game.start(id, 'combat', node, t0));
const bank0 = db.bankFor(id)[POT] ?? 0;
const xp0 = db.skillsFor(id).combat!;
let deaths = 0;
for (let t = t0; t <= t0 + minutes * 60_000; t += 1000) {
  const r = game.settle(id, t);
  if (r.gains.death) { deaths++; game.start(id, 'combat', node, t); }
}
const used = bank0 - (db.bankFor(id)[POT] ?? 0);
const xp = db.skillsFor(id).combat! - xp0;
const k = 60 / minutes;
console.log(JSON.stringify({ voc, level, node, potsPorHora: Math.round(used * k), manaPorPot: itemById(POT)?.manaPotion, xpPorHora: Math.round(xp * k), mortes: deaths }));
