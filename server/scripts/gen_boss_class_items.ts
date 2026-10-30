/**
 * Itens de chefe para Caçador e Arcanista até o nível 60 (antes só o Rei Goblin soltava algo para eles).
 * Cada peça copia a melhor de fazer da classe no nível, 12% mais forte e com um bônus pequeno.
 * Gera shared/data/boss_class_items.json; scripts/boss_class_items_apply.py grava itens, loot, nomes e ícones.
 *   node --import tsx scripts/gen_boss_class_items.ts
 */
import { writeFileSync } from 'node:fs';
import { ITEMS, gearScore, guideKinds, isReliable, itemValue, type EquipSlot, type Item } from '@grimhold/shared';

type Spec = { id: string; boss: string; slot: EquipSlot; voc: 'hunter' | 'arcanist'; level: number; pt: string; en: string; extra: Record<string, number>; hue: number; chance: number };
const SPECS: Spec[] = [
  { id: 'orc_hunting_bow', boss: 'orc_warchief', slot: 'weapon', voc: 'hunter', level: 16, pt: 'Arco de Caça do Chefe Orc', en: "Orc Warchief's Hunting Bow", extra: { crit: 0.03 }, hue: 90, chance: 0.12 },
  { id: 'orc_shaman_staff', boss: 'orc_warchief', slot: 'weapon', voc: 'arcanist', level: 16, pt: 'Cajado do Xamã Orc', en: 'Orc Shaman Staff', extra: { mana: 0.05 }, hue: 90, chance: 0.12 },
  { id: 'silkweaver_bow', boss: 'spider_mother', slot: 'weapon', voc: 'hunter', level: 23, pt: 'Arco de Seda da Aranha-Mãe', en: "Spider Mother's Silk Bow", extra: { crit: 0.03 }, hue: 270, chance: 0.12 },
  { id: 'venom_staff', boss: 'spider_mother', slot: 'weapon', voc: 'arcanist', level: 23, pt: 'Cajado Peçonhento', en: 'Venom Staff', extra: { mana: 0.06 }, hue: 270, chance: 0.12 },
  { id: 'scaled_hood', boss: 'lizard_queen', slot: 'helmet', voc: 'hunter', level: 26, pt: 'Capuz da Rainha Lagarto', en: "Lizard Queen's Hood", extra: { crit: 0.02 }, hue: 120, chance: 0.1 },
  { id: 'scaled_hat', boss: 'lizard_queen', slot: 'helmet', voc: 'arcanist', level: 26, pt: 'Chapéu da Rainha Lagarto', en: "Lizard Queen's Hat", extra: { mana: 0.05 }, hue: 120, chance: 0.1 },
  { id: 'labyrinth_crossbow', boss: 'minotaur_king', slot: 'weapon', voc: 'hunter', level: 36, pt: 'Besta do Labirinto', en: 'Labyrinth Crossbow', extra: { crit: 0.04 }, hue: 25, chance: 0.12 },
  { id: 'horned_staff', boss: 'minotaur_king', slot: 'weapon', voc: 'arcanist', level: 36, pt: 'Cajado Chifrudo', en: 'Horned Staff', extra: { mana: 0.07 }, hue: 25, chance: 0.12 },
  { id: 'cyclops_eye_bow', boss: 'brontes', slot: 'weapon', voc: 'hunter', level: 44, pt: 'Arco do Olho do Ciclope', en: "Cyclops Eye Bow", extra: { crit: 0.04 }, hue: 330, chance: 0.12 },
  { id: 'forge_ember_staff', boss: 'brontes', slot: 'weapon', voc: 'arcanist', level: 44, pt: 'Cajado da Brasa da Forja', en: 'Forge Ember Staff', extra: { mana: 0.08 }, hue: 330, chance: 0.12 },
  { id: 'drowned_harpoon', boss: 'drowned_captain', slot: 'weapon', voc: 'hunter', level: 52, pt: 'Arpão-Besta do Afogado', en: "Drowned Harpoon Crossbow", extra: { crit: 0.05 }, hue: 180, chance: 0.12 },
  { id: 'abyssal_tide_staff', boss: 'drowned_captain', slot: 'weapon', voc: 'arcanist', level: 52, pt: 'Cajado da Maré Funda', en: 'Deep Tide Staff', extra: { mana: 0.09 }, hue: 180, chance: 0.12 },
];
const BOOST = 1.12;

function template(slot: EquipSlot, level: number, voc: string): Item {
  const t = ITEMS.filter((it) => it.equip?.slot === slot && it.equip.level <= level && guideKinds(it.id).has('craft') && isReliable(it.id) &&
    it.equip.vocations?.includes(voc)).sort((a, b) => gearScore(b) - gearScore(a) || b.equip!.level - a.equip!.level)[0];
  if (!t) throw new Error(`sem modelo ${slot} ${voc} ${level}`);
  return t;
}

const out = SPECS.map((s) => {
  const t = template(s.slot, s.level, s.voc);
  const equip: Record<string, unknown> = { slot: s.slot, level: s.level, vocations: [s.voc] };
  // Acima do nível da peça de fazer, cresce um pouco com o nível (como nos sets de drop).
  const mult = BOOST * (1 + 0.6 * Math.max(0, s.level - t.equip!.level) / t.equip!.level);
  for (const [k, v] of Object.entries(t.equip!)) {
    if (['slot', 'level', 'vocations'].includes(k)) continue;
    if (k === 'speed' && typeof v === 'number' && v > 0) equip[k] = v;
    else equip[k] = typeof v === 'number' ? (Number.isInteger(v) ? Math.max(1, Math.round(v * mult)) : Math.round(v * mult * 1000) / 1000) : v;
  }
  for (const [k, v] of Object.entries(s.extra)) equip[k] = Math.round(((equip[k] as number | undefined ?? 0) + v) * 1000) / 1000;
  return { id: s.id, name: s.pt, en: s.en, icon: `${s.id}_boss`, boss: s.boss, chance: s.chance, template: t.id, templateIcon: t.icon, hue: s.hue,
    value: Math.max(200, Math.round(itemValue(t.id) * 4)), equip };
});
writeFileSync(new URL('../../shared/data/boss_class_items.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
for (const o of out) console.log(o.id, o.template, o.value, JSON.stringify(o.equip));
