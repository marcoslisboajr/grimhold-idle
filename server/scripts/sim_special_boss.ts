/** Luta simulada contra o chefe especial com cópias de jogadores (JSON exportado só-leitura de produção). Uso: npx tsx scripts/sim_special_boss.ts fighters.json [nome,nome] ; LATE=nome,nome entra 8 min depois */
import { readFileSync } from 'node:fs';
import { SPECIAL_BOSS_EVENTS, levelForXp, itemById, splitRarity } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { createWorldBoss } from '../src/worldboss.ts';

const roster = JSON.parse(readFileSync(process.argv[2], 'utf-8')) as any[];
const pick = (process.argv[3] ?? '').split(',').filter(Boolean);
const sp = SPECIAL_BOSS_EVENTS[0];
const db = openDb(':memory:');
const game = createGame(db);
const ids: { id: number; name: string; level: number }[] = [];
for (const c of roster.filter((r) => !pick.length || pick.includes(r.name))) {
  const ch = db.createCharacter(db.accountForToken(db.createGuest())!, c.name, c.vocation);
  db.applyGains(ch.id, { actions: 0, items: {}, xp: JSON.parse(c.skills) }, 0, 0);
  if (c.promotion) db.setPromotion(ch.id, c.promotion);
  if (c.spells) db.setSpells(ch.id, JSON.parse(c.spells));
  for (const item of Object.values(JSON.parse(c.eq || '{}')) as string[]) {
    db.applyGains(ch.id, { actions: 0, items: { [item]: 1 }, xp: {} }, 0, 0);
    const err = game.equip(ch.id, item, 0);
    if (err) console.log('  (não equipou', item, ':', err, ')');
  }
  ids.push({ id: ch.id, name: c.name, level: levelForXp(JSON.parse(c.skills).combat ?? 0, 'combat') });
}
const boss = createWorldBoss(db, game);
let t = sp.startsAt;
boss.tick(t);
const joinAt = Number(process.env.JOIN ?? 60) * 1000;
const late = new Set((process.env.LATE ?? '').split(',').filter(Boolean));
let lastLog = 0;
let res: any[] = [];
while (t < sp.startsAt + sp.durationMs + 5000) {
  t += 2000;
  for (const p of ids) {
    const when = late.has(p.name) ? joinAt + 8 * 60_000 : joinAt;
    if (t - sp.startsAt >= when && !boss.isFighting(p.id)) boss.join(p.id, t);
  }
  const r = boss.tick(t);
  const v = boss.view(ids[0].id, t);
  if (t - lastLog >= 120_000 && v.active) {
    lastLog = t;
    const down = v.fighters.filter((f) => f.downUntil).length;
    console.log(`${String(Math.round((t - sp.startsAt) / 60000)).padStart(2)} min: vida ${(v.hp / 1e6).toFixed(2)}M / ${(v.maxHp / 1e6).toFixed(2)}M (${Math.round((v.hp / v.maxHp) * 100)}%), caídos agora ${down}/${v.fighters.length}`);
  }
  if (r.results.length) { res = r.results; console.log(`>>> ${r.results[0].killed ? 'MORTO' : 'FUGIU'} aos ${((t - sp.startsAt) / 60000).toFixed(1)} min`); break; }
}
for (const r of res) {
  const p = ids.find((x) => x.id === r.characterId)!;
  console.log(`  ${p.name.padEnd(18)} nv ${p.level}  dano ${String(r.damage).padStart(8)}  xp ${r.reward.xp}  ouro ${r.reward.gold}  ${r.reward.legendary ?? ''}`);
}
