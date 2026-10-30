/**
 * Levantamento: o melhor equipamento de cada origem (artesanato, drop de monstro,
 * arena, chefe/lendário, outros) por vocação, peça e faixa de nível.
 *   node --import tsx scripts/survey_gear.ts [vocação]
 * Nota = ataque×2 + ataque elemental×2 + defesa + vida/8 (a mesma dos simuladores).
 */
import { readFileSync } from 'node:fs';
import items from '../../shared/data/items.json' with { type: 'json' };
import monsters from '../../shared/data/monsters.json' with { type: 'json' };

const data = (f: string) => JSON.parse(readFileSync(new URL(`../../shared/data/${f}.json`, import.meta.url), 'utf-8'));
const crafted = new Map<string, string>();
for (const skill of ['smithing', 'crafting', 'fletching', 'runecraft', 'alchemy', 'cooking', 'sigilism']) {
  for (const r of data(skill) as { output: string; level: number }[]) if (!crafted.has(r.output)) crafted.set(r.output, `${skill} ${r.level}`);
}
const dropped = new Set<string>();
for (const m of monsters as { loot?: { item: string }[] }[]) for (const l of m.loot ?? []) dropped.add(l.item);

type Eq = { slot: string; level: number; attack?: number; elementAttack?: number; defense?: number; hp?: number; vocations?: string[] };
type It = { id: string; name: string; equip?: Eq; legendary?: boolean };
const origin = (i: It) =>
  crafted.has(i.id) ? 'craft' : i.id.startsWith('arena') ? 'arena' : i.legendary ? 'chefe' : dropped.has(i.id) ? 'drop' : 'outro';
const score = (e: Eq) => ((e.attack ?? 0) + (e.elementAttack ?? 0)) * 2 + (e.defense ?? 0) + (e.hp ?? 0) / 8;

const vocs = process.argv[2] ? [process.argv[2]] : ['warrior', 'hunter', 'arcanist', 'devout'];
const slots = [...new Set((items as It[]).filter((i) => i.equip).map((i) => i.equip!.slot))];
const ORIGINS = ['craft', 'drop', 'arena', 'chefe', 'outro'];
for (const voc of vocs) {
  console.log(`\n=== ${voc} (melhor nota por origem; craft entre parênteses: skill e nível da receita)`);
  for (const slot of slots) {
    const rows: string[] = [];
    for (const L of [20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      const best: Record<string, { s: number; it: It } | undefined> = {};
      for (const i of items as It[]) {
        const e = i.equip;
        if (!e || e.slot !== slot || e.level > L || (e.vocations && !e.vocations.includes(voc))) continue;
        const o = origin(i);
        if (!best[o] || score(e) > best[o]!.s) best[o] = { s: score(e), it: i };
      }
      const c = best.craft;
      const top = Math.max(...ORIGINS.map((o) => best[o]?.s ?? 0));
      const cells = ORIGINS.map((o) => (best[o] ? `${o} ${Math.round(best[o]!.s)}` : `${o} -`));
      const gap = c && top > 0 ? `${Math.round((c.s / top) * 100)}%` : '—';
      rows.push(`  nv ${String(L).padStart(3)}: craft/melhor ${gap.padStart(4)} | ${cells.join(' | ')}${c ? `  [${c.it.name} (${crafted.get(c.it.id)})]` : ''}`);
    }
    console.log(` ${slot}`);
    console.log(rows.join('\n'));
  }
}
