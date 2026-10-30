/**
 * Escada dos sets de drop do 255 para cima: cada peça fica pelo menos 3% acima da mesma peça do set
 * anterior (as do 240 foram reforçadas à mão e o gerador copia a peça de fazer, que parou no 120).
 * Quando fica abaixo, refaz a partir da anterior, 6% acima. Grava drop_sets.json e items.json.
 * Rodar depois de gen_drop_sets.ts e de scripts/drop_sets_apply.py.
 *   node --import tsx scripts/drop_sets_ladder.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gearScore, type Item } from '@grimhold/shared';

const P = new URL('../../shared/data/items.json', import.meta.url);
const Q = new URL('../../shared/data/drop_sets.json', import.meta.url);
const items = JSON.parse(readFileSync(P, 'utf8')) as Item[];
const sets = JSON.parse(readFileSync(Q, 'utf8')) as { id: string; equip: Record<string, unknown> }[];
const by = new Map(items.map((i) => [i.id, i]));
const levels = [...new Set(sets.map((s) => Number(s.id.match(/^drop(\d+)_/)![1])))].sort((a, b) => a - b);
const scale = (eq: Record<string, unknown>, level: number) => Object.fromEntries(Object.entries(eq).map(([k, v]) =>
  [k, k === 'level' ? level : typeof v !== 'number' || (k === 'speed' && v > 0) ? v : Number.isInteger(v) ? Math.max(1, Math.round(v * 1.06)) : Math.round(v * 1.06 * 1000) / 1000]));
for (const s of sets) {
  const lv = Number(s.id.match(/^drop(\d+)_/)![1]);
  if (lv < 255) continue;
  const prev = levels[levels.indexOf(lv) - 1];
  const a = by.get(s.id.replace(`drop${lv}_`, `drop${prev}_`))!, b = by.get(s.id)!;
  if (gearScore(b) >= gearScore(a) * 1.03) continue;
  b.equip = scale(a.equip as Record<string, unknown>, lv) as Item['equip'];
  s.equip = { ...(b.equip as Record<string, unknown>) };
  console.log(s.id, 'refeito do', a.id);
}
writeFileSync(P, JSON.stringify(items, null, 2) + '\n');
writeFileSync(Q, JSON.stringify(sets, null, 1) + '\n');
