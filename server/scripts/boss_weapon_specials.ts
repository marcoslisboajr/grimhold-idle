/**
 * Toda arma de chefe (cai de chefe ou é lendária) tem um diferencial além do dano: o elemento e o
 * especial da classe. Guerreiro: roubo de vida. Caçador: crítico. Arcanista: roubo de mana.
 * Devoto: regeneração. O especial cresce com o nível da arma; o que a arma já tem a mais fica.
 * Só soma: nada é tirado. Idempotente (não passa do valor da fórmula).
 *   node --import tsx scripts/boss_weapon_specials.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gearScore, guideKinds, type Element, type Item } from '@grimhold/shared';

const FILE = new URL('../../shared/data/items.json', import.meta.url);
const items = JSON.parse(readFileSync(FILE, 'utf8')) as { id: string; name: string; legendary?: boolean; equip?: Record<string, any> }[];

const SPECIAL: Record<string, [string, (lv: number) => number]> = {
  warrior: ['lifesteal', (lv) => Math.min(0.08, 0.02 + lv * 0.00025)],
  hunter: ['crit', (lv) => Math.min(0.12, 0.03 + lv * 0.0004)],
  arcanist: ['manaLeech', (lv) => Math.min(0.08, 0.02 + lv * 0.00025)],
  devout: ['regen', (lv) => Math.min(0.04, 0.01 + lv * 0.00012)],
};
// Elemento pelo tema do nome (quando a arma não tem).
const THEMES: [RegExp, Element][] = [
  [/fire|ember|cinder|hell|infern|lava|magma|furnace|forge|flame|dragon|pit|ghazrael|malgoroth/i, 'fire'],
  [/frost|ice|boreal|glacial|tide|kraken|sea|water|coral/i, 'water'],
  [/venom|silk|spider|orc|goblin|forest|thorn|oak|earth|cyclops|labyrinth|minotaur|horned|beast/i, 'earth'],
  [/storm|thunder|energy|spark|aethon|star|astral/i, 'energy'],
  [/holy|lumira|dawn|angel|halo|lion|divine|sun/i, 'holy'],
];
const elementFor = (id: string): Element => THEMES.find(([re]) => re.test(id))?.[1] ?? 'death';

let changed = 0;
for (const it of items) {
  const eq = it.equip;
  // Réplica (bolsa dos covis) fica em 80% da original: não ganha o especial cheio.
  if (eq?.slot !== 'weapon' || it.id.startsWith('replica_') || !(guideKinds(it.id).has('boss') || it.legendary)) continue;
  const before = JSON.stringify(eq);
  if (!eq.element) {
    eq.element = elementFor(it.id);
    eq.elementAttack = Math.max(eq.elementAttack ?? 0, Math.max(2, Math.round((eq.attack ?? 0) * 0.12)));
  }
  // Sem classe: roubo de vida (como o guerreiro).
  const [key, f] = SPECIAL[eq.vocations?.[0] ?? 'warrior'];
  const want = Math.round(f(eq.level) * 1000) / 1000;
  if ((eq[key] ?? 0) < want) eq[key] = want;
  if (JSON.stringify(eq) !== before) changed++;
}
// Escada: arma de chefe de nível maior não perde para uma de nível menor que a mesma classe usa
// (o bônus pesa mais nas armas baixas). A de nível maior ganha ataque até empatar.
const bossW = items.filter((i) => i.equip?.slot === 'weapon' && guideKinds(i.id).has('boss') && !i.id.startsWith('replica_') && i.equip.level >= 40)
  .sort((a, b) => a.equip!.level - b.equip!.level);
const score = (i: (typeof items)[number]) => gearScore(i as unknown as Item);
for (const b of bossW) {
  const bv: string[] | undefined = b.equip!.vocations;
  const usable = (r: (typeof items)[number]) => {
    const rv: string[] | undefined = r.equip!.vocations;
    return !bv ? !rv : !!rv && rv.some((v) => bv.includes(v));
  };
  // Também não perde para arma comum (não de chefe) de até 20 níveis abaixo.
  const common = items.filter((r) => r.equip?.slot === 'weapon' && !guideKinds(r.id).has('boss') && !r.id.startsWith('replica_') &&
    r.equip.level <= b.equip!.level && r.equip.level >= b.equip!.level - 20);
  const lower = [...bossW.filter((r) => r.equip!.level < b.equip!.level), ...common].filter(usable);
  const need = Math.max(0, ...lower.map(score));
  let bumped = false;
  while (score(b) < need) { b.equip!.attack = (b.equip!.attack ?? 0) + 1; bumped = true; }
  if (bumped) { changed++; console.log('escada', b.id, b.equip!.attack); }
}
writeFileSync(FILE, JSON.stringify(items, null, 2) + '\n');
console.log('armas mudadas', changed);
