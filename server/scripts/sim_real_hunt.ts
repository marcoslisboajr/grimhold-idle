/**
 * 15 minutos de caçada pelo caminho real do servidor (game.settle a cada 1 s), com o
 * melhor equipamento do nível 87; mostra saltos de XP.
 *   node --import tsx scripts/sim_real_hunt.ts [vocacao] [no_da_caçada] [inicio_ms]
 */
import { XP_TABLE } from '@grimhold/shared';
import items from '../../shared/data/items.json' with { type: 'json' };
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
const voc = process.argv[2] ?? 'hunter';
const node = process.argv[3] ?? 'giant_peaks:5';
const t0 = Number(process.argv[4] ?? Date.now());
const db = openDb(':memory:');
const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Teste', voc as any).id;
db.applyGains(id, { actions: 0, items: { cooked_shark: 100000 }, xp: { combat: XP_TABLE[87] } }, 0, 0);
const game = createGame(db);
const eq: any = {};
for (const i of items as any[]) { const e = i.equip; if (!e || e.level > 87) continue; if (e.vocations && !e.vocations.includes(voc)) continue;
  const sc = ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8; if (!eq[e.slot] || sc > eq[e.slot].sc) eq[e.slot] = { id: i.id, sc }; }
for (const v of Object.values(eq) as any[]) { db.applyGains(id, { actions: 0, items: { [v.id]: 1 }, xp: {} }, 0, 0); game.equip(id, v.id, 0); }
console.log('start', game.start(id, 'combat', node, t0));
const xp0 = db.skillsFor(id).combat!;
let last = xp0;
for (let t = t0; t <= t0 + 15 * 60_000; t += 1000) {
  const r = game.settle(id, t);
  const now = db.skillsFor(id).combat!;
  if (now - last > 200_000) console.log('salto em', (t - t0) / 1000, 's:', (now - last).toLocaleString(), JSON.stringify(r.gains.xp));
  last = now;
  if (r.gains.death) { console.log('morreu em', (t - t0) / 1000); break; }
}
const xp1 = db.skillsFor(id).combat!;
console.log('XP 15 min:', (xp1 - xp0).toLocaleString(), '=> /h', ((xp1 - xp0) * 4).toLocaleString());
