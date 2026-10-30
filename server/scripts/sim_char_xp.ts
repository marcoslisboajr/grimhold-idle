/**
 * XP/h de personagens reais pelo caminho do servidor (game.settle), numa cópia do banco: flecha, mascote,
 * charms, prey, imbuements e comida entram como no jogo. Cada caçada roda numa cópia nova do banco.
 *   SNAP=caminho/do/banco.db node --import tsx scripts/sim_char_xp.ts "Sixtwo,Gioseppi Camolle" [caçada:bando,...] [minutos]
 * Sem caçadas, usa a caçada atual de cada um.
 */
import { copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { levelForXp } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const SNAP = process.env.SNAP;
if (!SNAP) throw new Error('SNAP=caminho do banco');
const names = (process.argv[2] ?? '').split(',').filter(Boolean);
const nodesArg = (process.argv[3] ?? '').split(',').filter(Boolean);
const minutes = Number(process.argv[4] ?? 60);

const sq = new DatabaseSync(SNAP, { readOnly: true });
const chars = names.map((n) => {
  const c = sq.prepare('select c.id, c.name, c.vocation, a.node from characters c left join activities a on a.character_id = c.id where c.name = ?').get(n) as
    | { id: number; name: string; vocation: string; node: string | null }
    | undefined;
  if (!c) return undefined;
  const { xp } = sq.prepare("select cast(xp as text) as xp from skills where character_id = ? and skill = 'combat'").get(c.id) as { xp: string };
  return { ...c, level: levelForXp(Number(xp)) };
});
sq.close();

function run(charId: number, node: string) {
  const f = join(tmpdir(), `sim_char_xp_${process.pid}.db`);
  copyFileSync(SNAP!, f);
  const db = openDb(f);
  const game = createGame(db);
  const t0 = Date.now();
  game.settle(charId, t0); // fecha o que estava pendente antes de trocar
  const err = game.start(charId, 'combat', node, t0);
  const xp0 = Number(db.skillsFor(charId).combat ?? 0);
  let died = -1;
  if (!err) for (let t = t0 + 5000; t <= t0 + minutes * 60_000; t += 5000) if (game.settle(charId, t).gains.death) { died = (t - t0) / 60_000; break; }
  const xp1 = Number(db.skillsFor(charId).combat ?? 0);
  db.close();
  rmSync(f, { force: true });
  if (err) return `não começou: ${err}`;
  const perH = ((xp1 - xp0) * 60) / (died >= 0 ? died || 1 : minutes);
  return `${(perH / 1e12).toFixed(1)} tri/h${died >= 0 ? `  morreu em ${died.toFixed(1)} min` : ''}`;
}

const nodes = nodesArg.length ? nodesArg : [...new Set(chars.map((x) => x?.node).filter((n): n is string => !!n))];
for (const [i, c] of chars.entries()) {
  if (!c) { console.log(`${names[i]}: não achei`); continue; }
  console.log(`${c.name} (${c.vocation}, nível ${c.level})`);
  for (const n of nodes) console.log(`   ${n.padEnd(24)} ${run(c.id, n)}`);
}
