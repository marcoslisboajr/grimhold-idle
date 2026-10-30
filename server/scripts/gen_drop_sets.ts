/**
 * Sets de drop (um a cada 15 níveis, do 60 ao 475): para todo nível ter peça que cai na caçada,
 * além da de fazer. Cada peça copia a de fazer do mesmo nível e classe, com 8% a menos, e o
 * visual (boneco) é o dela. Gera shared/data/drop_sets.json; scripts/drop_sets_apply.py grava
 * os itens em items.json, os nomes em inglês e os ícones.
 *   node --import tsx scripts/gen_drop_sets.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ITEMS, gearScore, guideKinds, isReliable, itemValue, type EquipSlot, type Item } from '@grimhold/shared';

const TIERS: [number, string, string, number][] = [
  [60, 'Saqueador', 'Raider', 20], [75, 'Vigia', 'Watchman', 200], [90, 'Corsário', 'Corsair', 160], [105, 'Mercenário', 'Mercenary', 40],
  [120, 'Algoz', 'Executioner', 0], [135, 'Tirano', 'Tyrant', 280], [150, 'Dominador', 'Dominator', 50], [165, 'Profanador', 'Defiler', 300],
  [180, 'Vingador', 'Avenger', 230], [195, 'Titã', 'Titan', 45],
  // Fase 1 do 200 ao 250 (a guerra das Ordens).
  [210, 'Gavião', 'Hawk', 210], [225, 'Juramentado', 'Sworn', 35], [240, 'Grão-Cavaleiro', 'High Knight', 330],
  // Fase 2 do 250 ao 325 (Biblioteca Proibida).
  [255, 'Escriba', 'Scribe', 260],
  // Catacumbas Esquecidas (275-300).
  [270, 'Ossário', 'Ossuary', 20], [285, 'Rei Sepulto', 'Buried King', 300],
  // Palácio das Asuras (300-325).
  [300, 'Asura', 'Asura', 330],
  // Abismo Afogado (325-350).
  [325, 'Abismo Afogado', 'Drowned Abyss', 180],
  // Vale Primevo (350-375).
  [350, 'Primevo', 'Primeval', 25],
  // Jardim Corrompido (375-400).
  [375, 'Jardim Podre', 'Rotten Garden', 285],
  // Cidadela do Usurpador (400-425).
  [400, 'Usurpador', 'Usurper', 275],
  // Templo da Cobra (425-450).
  [425, 'Serpente', 'Serpent', 140],
  // Torre dos Bruxos (450-475).
  [450, 'Bruxo', 'Warlock', 10],
  // Caverna dos Heróis (475-500).
  [475, 'Herói Caído', 'Fallen Hero', 45],
];
type Kind = { key: string; slot: EquipSlot; voc?: string; pt: string; en: string; f?: boolean };
const isGrimoire = (id: string) => id.endsWith('_spellbook');
const PIECES: Kind[] = [
  { key: 'sword', slot: 'weapon', voc: 'warrior', pt: 'Espada', en: 'Sword', f: true },
  { key: 'bow', slot: 'weapon', voc: 'hunter', pt: 'Arco', en: 'Bow' },
  { key: 'staff', slot: 'weapon', voc: 'arcanist', pt: 'Cajado', en: 'Staff' },
  { key: 'mace', slot: 'weapon', voc: 'devout', pt: 'Maça', en: 'Mace', f: true },
  { key: 'plate', slot: 'armor', voc: 'warrior', pt: 'Armadura', en: 'Plate', f: true },
  { key: 'holy_armor', slot: 'armor', voc: 'devout', pt: 'Cota Sagrada', en: 'Holy Mail', f: true },
  { key: 'leather_armor', slot: 'armor', voc: 'hunter', pt: 'Gibão', en: 'Leather Armor' },
  { key: 'robe', slot: 'armor', voc: 'arcanist', pt: 'Manto', en: 'Robe' },
  { key: 'helmet', slot: 'helmet', voc: 'warrior', pt: 'Elmo', en: 'Helmet' },
  { key: 'holy_helmet', slot: 'helmet', voc: 'devout', pt: 'Elmo Sagrado', en: 'Holy Helmet' },
  { key: 'hood', slot: 'helmet', voc: 'hunter', pt: 'Capuz', en: 'Hood' },
  { key: 'hat', slot: 'helmet', voc: 'arcanist', pt: 'Chapéu', en: 'Hat' },
  { key: 'legs', slot: 'legs', voc: 'warrior', pt: 'Calças', en: 'Legs', f: true },
  { key: 'holy_legs', slot: 'legs', voc: 'devout', pt: 'Calças Sagradas', en: 'Holy Legs', f: true },
  { key: 'leather_legs', slot: 'legs', voc: 'hunter', pt: 'Calças de Couro', en: 'Leather Legs', f: true },
  { key: 'robe_legs', slot: 'legs', voc: 'arcanist', pt: 'Calças de Manto', en: 'Robe Legs', f: true },
  { key: 'shield', slot: 'shield', pt: 'Escudo', en: 'Shield' },
  { key: 'spellbook', slot: 'shield', voc: 'arcanist', pt: 'Grimório', en: 'Spellbook' },
  { key: 'boots', slot: 'boots', pt: 'Botas', en: 'Boots', f: true },
  { key: 'amulet', slot: 'amulet', pt: 'Amuleto', en: 'Amulet' },
  { key: 'ring', slot: 'ring', pt: 'Anel', en: 'Ring' },
];
const SCALE = 0.92;
const LEVEL_GROWTH = 0.6;

/** A melhor peça de fazer até o nível, para a classe (ou para todas, nos espaços comuns). */
function template(slot: EquipSlot, level: number, voc?: string, grimoire = false, only: (id: string) => boolean = () => true): Item | undefined {
  return ITEMS.filter((it) => it.equip?.slot === slot && isGrimoire(it.id) === grimoire && only(it.id) && it.equip.level <= level && guideKinds(it.id).has('craft') && isReliable(it.id) &&
    (voc ? !it.equip.vocations || it.equip.vocations.includes(voc) : !it.equip.vocations))
    .sort((a, b) => gearScore(b) - gearScore(a) || b.equip!.level - a.equip!.level)[0];
}

const out: unknown[] = [];
for (const [level, pt, en, hue] of TIERS) {
  const slug = `drop${level}`;
  for (const p of PIECES) {
    // Peça sagrada copia a sagrada de fazer quando existe (o chapéu de mago também serve no Devoto e ganhava pela mana).
    const t = (p.key.startsWith('holy') ? template(p.slot, level, p.voc, false, (id) => id.includes('holy')) : undefined) ?? template(p.slot, level, p.voc, p.key === 'spellbook');
    if (!t) throw new Error(`sem modelo: ${p.key} ${level}`);
    const equip: Record<string, unknown> = { slot: p.slot, level };
    // Grimório: Arcanista e Devoto.
    if (p.voc) equip.vocations = p.key === 'spellbook' ? ['arcanist', 'devout'] : [p.voc];
    // Acima do nível da peça de fazer (não há receita mais alta), cresce um pouco com o nível.
    const k = SCALE * (1 + LEVEL_GROWTH * Math.max(0, level - t.equip!.level) / t.equip!.level);
    for (const [key, v] of Object.entries(t.equip!)) {
      if (['slot', 'level', 'vocations'].includes(key)) continue;
      // Lentidão (speed positivo) fica igual: encolher deixaria a peça mais rápida.
      if (key === 'speed' && typeof v === 'number' && v > 0) equip[key] = v;
      else equip[key] = typeof v === 'number' ? (Number.isInteger(v) ? Math.max(1, Math.round(v * k)) : Math.round(v * k * 1000) / 1000) : v;
    }
    out.push({
      id: `${slug}_${p.key}`,
      name: `${p.pt} do ${pt}`,
      en: `${en}'s ${p.en}`,
      icon: `${slug}_${p.key}`,
      template: t.id,
      templateIcon: t.icon,
      hue,
      value: Math.max(10, Math.round(itemValue(t.id) * 0.6)),
      equip,
    });
  }
}
// Peça que já existe não muda (jogadores já têm): só entra o que é novo. FORCE=1 refaz tudo.
const FILE = new URL('../../shared/data/drop_sets.json', import.meta.url);
const old: { id: string }[] = !process.env.FORCE && existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
const kept = new Map(old.map((o) => [o.id, o]));
const final = (out as { id: string }[]).map((o) => kept.get(o.id) ?? o);
writeFileSync(FILE, JSON.stringify(final, null, 1) + '\n');
console.log('ok', final.length, 'novas', final.filter((o) => !kept.has(o.id)).length);
