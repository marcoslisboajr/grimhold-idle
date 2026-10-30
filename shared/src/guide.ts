import { SLAYER_SHOP } from './slayer.ts';
/**
 * Guia de classes: o melhor equipamento de cada vocação por faixa de nível, e de onde ele vem
 * (receita com os materiais, monstros e caçadas que soltam, peça que cai na faixa da caçada,
 * loja e loja de fichas de chefe). Tudo calculado dos dados do jogo, então nunca fica velho.
 */
import { GEAR_TIERS, HUNTS, MONSTERS, type Hunt } from './combat.ts';
import { ARENAS } from './arena.ts';
import { STORIES } from './stories.ts';
import { BOSS_TOKEN_SHOP_ITEMS, SPECIAL_BOSSES, WORLD_BOSSES, bossTokenPrice } from './worldboss.ts';
import { IMBUEMENTS } from './imbuements.ts';
import { HUNTER_RANKS } from './hunting_tasks.ts';
import { RAID_FRAGMENT_ID, RAID_SET_ITEMS, SOUL_RAID_SET_ITEMS, BLOOD_RAID_SET_ITEMS, FROST_RAID_SET_ITEMS } from './raids.ts';
import { OUTFIT_DROP_CHANCE } from './proftools.ts';
import { ITEMS, NODES, RECIPES, SHOPS, itemById, type EquipSlot, type GatheringSkillId, type Item, type ProductionSkillId } from './skills.ts';

/** Faixas de nível do guia (o nível de onde a faixa começa). */
export const GUIDE_LEVELS = [1, ...Array.from({ length: 40 }, (_, i) => (i + 1) * 10)];

/** Espaços mostrados no guia, na ordem do boneco (a capa fica de fora: vem das profissões e dos chefes). */
export const GUIDE_SLOTS: EquipSlot[] = ['weapon', 'shield', 'helmet', 'armor', 'legs', 'boots', 'amulet', 'ring'];

export type ItemSource =
  | { kind: 'craft'; skill: ProductionSkillId; level: number; inputs: Record<string, number> }
  | { kind: 'gather'; skill: GatheringSkillId; level: number; node: string }
  | { kind: 'drop'; monster: string; chance: number; boss: boolean; quest?: string; hunts: { id: string; name: string; level: number }[] }
  | { kind: 'world_boss'; boss: string }
  | { kind: 'arena'; arena: string; level: number }
  | { kind: 'quest'; story: string; level: number }
  | { kind: 'hunt_gear'; minLevel: number; maxLevel: number }
  | { kind: 'shop'; shop: keyof typeof SHOPS }
  | { kind: 'tokens'; price: number }
  /** Arma sorteada de uma bolsa (dos chefes globais e da loja de fichas). */
  | { kind: 'pouch'; pouch: string }
  /** Outras fontes, só texto (capas de profissão, roupas, troféus, moedas de evento). */
  | { kind: 'note'; pt: string; en: string };

const huntRef = (h: Hunt) => ({ id: h.id, name: h.name, level: h.level });

/** Onde cada monstro aparece (caçadas, instâncias e covis). */
const HUNTS_OF = new Map<string, Hunt[]>();
for (const h of HUNTS) {
  for (const m of new Set([...h.monsters, ...(h.trash ?? [])])) {
    const list = HUNTS_OF.get(m) ?? [];
    list.push(h);
    HUNTS_OF.set(m, list);
  }
}

const SOURCES = new Map<string, ItemSource[]>();
const add = (item: string, s: ItemSource) => {
  const list = SOURCES.get(item) ?? [];
  list.push(s);
  SOURCES.set(item, list);
};
for (const [skill, recipes] of Object.entries(RECIPES) as [ProductionSkillId, (typeof RECIPES)[ProductionSkillId]][]) {
  for (const r of recipes) add(r.output, { kind: 'craft', skill, level: r.level, inputs: r.inputs });
}
for (const [skill, nodes] of Object.entries(NODES) as [GatheringSkillId, (typeof NODES)[GatheringSkillId]][]) {
  for (const n of nodes) {
    for (const item of new Set([n.item, ...(n.drops ?? []).map((d) => d.item)])) add(item, { kind: 'gather', skill, level: n.level, node: n.name });
  }
}
for (const m of MONSTERS) {
  for (const l of m.loot) {
    if (l.item === 'gold') continue;
    const hunts = (HUNTS_OF.get(m.id) ?? []).map(huntRef).sort((a, b) => a.level - b.level);
    // Chefe: o monstro só aparece em instância ou covil.
    const boss = hunts.length > 0 && (HUNTS_OF.get(m.id) ?? []).every((h) => h.boss || h.lair);
    // Drop de quest: só cai enquanto a história está naquele passo (conta como raro).
    add(l.item, { kind: 'drop', monster: m.id, chance: l.quest ? 0 : l.chance, boss, hunts, ...(l.quest ? { quest: l.quest.story } : {}) });
  }
}
{
  let from = 1;
  for (const t of GEAR_TIERS) {
    for (const item of t.items) add(item, { kind: 'hunt_gear', minLevel: from, maxLevel: t.maxLevel });
    from = t.maxLevel + 1;
  }
}
for (const [shop, items] of Object.entries(SHOPS) as [keyof typeof SHOPS, readonly string[]][]) {
  for (const item of items) add(item, { kind: 'shop', shop });
}
for (const id of new Set([...BOSS_TOKEN_SHOP_ITEMS, ...ITEMS.filter((it) => it.tokenPrice).map((it) => it.id)])) add(id, { kind: 'tokens', price: bossTokenPrice(id) });
for (const b of [...WORLD_BOSSES, ...SPECIAL_BOSSES]) for (const id of new Set([...b.legendarySet, ...(b.loot ?? []).map((l) => l.item)])) add(id, { kind: 'world_boss', boss: b.name });
for (const a of ARENAS) if (!a.trial) for (const w of a.weapons) add(w.id, { kind: 'arena', arena: a.name, level: a.level });
for (const st of STORIES) {
  for (const end of Object.values(st.endings)) for (const id of Object.keys(end.reward.items ?? {})) add(id, { kind: 'quest', story: st.name, level: st.level });
}

for (const it of ITEMS) for (const w of it.pool ?? []) add(w, { kind: 'pouch', pouch: it.id });
add(RAID_FRAGMENT_ID, { kind: 'note', pt: 'Raides (fases da semana)', en: 'Raids (weekly phases)' });
for (const id of RAID_SET_ITEMS) add(id, { kind: 'note', pt: 'Raide II: chance na fase 3 ou loja de Fragmentos', en: 'Raid II: phase 3 chance or the Fragment shop' });
for (const id of SOUL_RAID_SET_ITEMS) add(id, { kind: 'note', pt: 'Raide III: chance na fase 6', en: 'Raid III: phase 6 chance' });
for (const id of BLOOD_RAID_SET_ITEMS) add(id, { kind: 'note', pt: 'Raide IV: chance na fase 5', en: 'Raid IV: phase 5 chance' });
for (const id of FROST_RAID_SET_ITEMS) add(id, { kind: 'note', pt: 'Raide I: chance na fase 4', en: 'Raid I: phase 4 chance' });
for (const a of ARENAS) if (a.rewardTrophy) add(a.rewardTrophy, { kind: 'note', pt: `Troféu ao vencer a ${a.name}`, en: `Trophy for beating ${a.name}` });
for (const r of HUNTER_RANKS) if (r.trophyItem) add(r.trophyItem, { kind: 'note', pt: `Troféu do posto ${r.name} nas tarefas de caça (${r.minPoints} pontos)`, en: `Trophy of the ${r.name} rank in hunting tasks (${r.minPoints} points)` });
const ONE_IN = Math.round(1 / OUTFIT_DROP_CHANCE);
for (const it of ITEMS) {
  const cape = /^cape_(.+?)(_supreme)?$/.exec(it.id);
  if (cape && !it.equip?.vocations) {
    const lv = cape[2] ? 120 : 99;
    add(it.id, cape[1] === 'mastery'
      ? { kind: 'note', pt: `Capa do Mestre: todas as profissões no nível ${lv}`, en: `Mastery cape: every profession at level ${lv}` }
      : { kind: 'note', pt: `Capa da profissão: chegar ao nível ${lv} nela`, en: `Profession cape: reach level ${lv} in it` });
  }
  if (it.outfit) add(it.id, it.outfit.group === 'artisan'
    ? { kind: 'note', pt: `Cai raramente (1 em ${ONE_IN}) fazendo itens nas profissões de produção`, en: `Rare find (1 in ${ONE_IN}) while crafting in production skills` }
    : { kind: 'note', pt: `Cai raramente (1 em ${ONE_IN}) trabalhando nessa profissão`, en: `Rare find (1 in ${ONE_IN}) while working that skill` });
}
add('mimic_bag', { kind: 'note', pt: 'Evento do Dia das Crianças (Mímico Gigante)', en: "Children's Day event (Giant Mimic)" });
add('donut_bag', { kind: 'note', pt: 'Evento do Dia das Crianças (raro fazendo itens nas profissões de produção)', en: "Children's Day event (rare while crafting)" });
add('halloween_potion', { kind: 'note', pt: 'Loja do Evento de Halloween (NPC Jack)', en: 'Halloween Event Shop (NPC Jack)' });
add('boss_token', { kind: 'note', pt: 'Ganha lutando contra os chefes globais', en: 'Earned fighting the world bosses' });
add('boss_essence', { kind: 'note', pt: 'Cai de todo chefe vencido (covil, instância e chefe global); refina e ascende as peças de chefe', en: 'Drops from every boss defeated (lair, instance and world boss); refines and ascends boss pieces' });
add('vote_coin', { kind: 'note', pt: 'Ganha votando no jogo', en: 'Earned by voting for the game' });
for (const o of SLAYER_SHOP) add(o.item, { kind: 'note', pt: `Loja de Slayer (${o.price} pontos)`, en: `Slayer shop (${o.price} points)` });
add('prey_wildcard', { kind: 'note', pt: 'Loja de tarefas de caça', en: 'Hunting task shop' });

const RETIRED_BOSS_PIECES = [
  'ancient_legs', 'ancient_boots',
  'lich_robe', 'lich_legs',
  'tide_helm', 'tide_boots',
  'abyss_dread_armor', 'abyss_dread_legs', 'abyss_dread_boots',
  'ferathos_helm', 'ferathos_legs',
  'ghazrael_armor', 'ghazrael_boots',
  'old_widow_legs', 'old_widow_boots',
  'old_mine_helm',
];
for (const id of RETIRED_BOSS_PIECES) {
  add(id, { kind: 'note', pt: 'Peça de legado (não cai mais; substituída por Essência de Chefe)', en: 'Legacy piece (no longer drops; replaced by Boss Essence)' });
}

// Bolsas de armas de chefes globais (não caem mais; mantêm a origem para quem tem a bolsa ou a arma)
const BOSS_POUCH_ORIGIN: Record<string, string> = {
  ancient_weapon_pouch: 'Cria do Dragão Ancestral',
  lich_weapon_pouch: 'Sombra do Rei Lich',
  kraken_weapon_pouch: 'Cria do Kraken Abissal',
  abyss_weapon_pouch: 'Emissário do Senhor do Abismo',
  ferathos_pouch: 'Avatar de Ferathos',
  ghazrael_pouch: 'Arauto de Ghazrael',
  old_widow_pouch: 'Filha da Viúva Ancestral',
};
for (const [pouchId, bossName] of Object.entries(BOSS_POUCH_ORIGIN)) {
  add(pouchId, { kind: 'world_boss', boss: bossName });
}

const RETIRED_REPLICAS = [
  'replica_asura_throne_sword', 'replica_asura_throne_bow', 'replica_asura_throne_staff', 'replica_asura_throne_mace',
  'replica_tyrant_throne_sword', 'replica_tyrant_throne_bow', 'replica_tyrant_throne_staff', 'replica_tyrant_throne_mace',
  'replica_usurper_throne_sword', 'replica_usurper_throne_bow', 'replica_usurper_throne_staff', 'replica_usurper_throne_mace',
  'replica_serpent_throne_sword', 'replica_serpent_throne_bow', 'replica_serpent_throne_staff', 'replica_serpent_throne_mace',
  'replica_flame_throne_sword', 'replica_flame_throne_bow', 'replica_flame_throne_staff', 'replica_flame_throne_mace',
  'replica_champion_throne_sword', 'replica_champion_throne_bow', 'replica_champion_throne_staff', 'replica_champion_throne_mace',
];
for (const id of RETIRED_REPLICAS) {
  add(id, { kind: 'note', pt: 'Réplica de legado (as bolsas agora dão Fragmentos do Trono)', en: 'Legacy replica (pouches now give Throne Fragments)' });
}

add('asura_throne_fragment', { kind: 'note', pt: 'Bolsa de Armas da Rainha Asura (refina e ascende peças do Trono Asura)', en: 'Asura Queen Weapon Pouch (refines and ascends Asura Throne pieces)' });
add('tyrant_throne_fragment', { kind: 'note', pt: 'Bolsa de Armas do Tirano (refina e ascende peças do Trono do Tirano)', en: 'Tyrant Weapon Pouch (refines and ascends Tyrant Throne pieces)' });
add('usurper_throne_fragment', { kind: 'note', pt: 'Bolsa de Armas do Usurpador (refina e ascende peças do Trono do Usurpador)', en: 'Usurper Weapon Pouch (refines and ascends Usurper Throne pieces)' });
add('serpent_throne_fragment', { kind: 'note', pt: 'Bolsa de Armas da Serpente (refina e ascende peças do Trono da Serpente)', en: 'Serpent Weapon Pouch (refines and ascends Serpent Throne pieces)' });
add('flame_throne_fragment', { kind: 'note', pt: 'Bolsa de Armas da Chama (refina e ascende peças do Trono da Chama)', en: 'Flame Weapon Pouch (refines and ascends Flame Throne pieces)' });
add('champion_throne_fragment', { kind: 'note', pt: 'Bolsa de Armas do Campeão (refina e ascende peças do Trono do Campeão)', en: 'Champion Weapon Pouch (refines and ascends Champion Throne pieces)' });

/** De onde vem o item (vazio: só por evento, quest ou troca). */
export const itemSources = (id: string): ItemSource[] => SOURCES.get(id) ?? [];

/** Cai raro demais para contar (sets e partes de arma dos deuses): chance de drop abaixo disso. */
export const GUIDE_RARE_CHANCE = 0.05;

const reliable = new Map<string, boolean>();
/** Fácil de conseguir: compra, coleta, cai como peça da caçada, cai com alguma frequência ou se faz só com materiais assim. */
export function isReliable(id: string): boolean {
  const known = reliable.get(id);
  if (known !== undefined) return known;
  reliable.set(id, false); // receita que volta em si mesma não conta
  const ok = itemSources(id).some((s) =>
    s.kind === 'craft' ? Object.keys(s.inputs).every(isReliable) : s.kind === 'drop' ? s.chance >= GUIDE_RARE_CHANCE : s.kind !== 'world_boss' && s.kind !== 'pouch' && s.kind !== 'note',
  );
  reliable.set(id, ok);
  return ok;
}

/** Quanto a peça vale (ataque pesa mais; o resto soma defesa, vida, mana e os especiais). */
export function gearScore(it: Item): number {
  const e = it.equip;
  if (!e) return 0;
  const res = (e.resFire ?? 0) + (e.resWater ?? 0) + (e.resEarth ?? 0) + (e.resEnergy ?? 0) + (e.resHoly ?? 0) + (e.resDeath ?? 0);
  return (
    (e.attack ?? 0) * 3 + (e.elementAttack ?? 0) * 3 + (e.defense ?? 0) * 2 + (e.hp ?? 0) / 4 + ((e.mana ?? 0) < 1 ? (e.mana ?? 0) * 200 : (e.mana ?? 0) / 6) +
    ((e.crit ?? 0) + (e.lifesteal ?? 0) + (e.reduction ?? 0) + (e.regen ?? 0)) * 300 - (e.speed ?? 0) * 100 + res * 60
  );
}

const fits = (it: Item, vocation: string, level: number, slot: EquipSlot) =>
  !!it.equip && it.equip.slot === slot && it.equip.level <= level && (!it.equip.vocations || it.equip.vocations.includes(vocation));

/** Como a peça se consegue, para separar no guia: fazer ou comprar, drop de caçada, chefe ou recompensa. */
export type GuideKind = 'craft' | 'drop' | 'boss' | 'reward';
export const GUIDE_KINDS: GuideKind[] = ['craft', 'drop', 'boss', 'reward'];

export function guideKinds(id: string): Set<GuideKind> {
  const out = new Set<GuideKind>();
  if (RETIRED_BOSS_PIECES.includes(id)) out.add('boss');
  for (const s of itemSources(id)) {
    if (s.kind === 'craft' || s.kind === 'shop') out.add('craft');
    else if (s.kind === 'hunt_gear' || (s.kind === 'drop' && !s.boss)) out.add('drop');
    else if (s.kind === 'drop' || s.kind === 'world_boss' || s.kind === 'tokens') out.add('boss');
    else if (s.kind === 'arena' || s.kind === 'quest') out.add('reward');
    // Arma de bolsa: vem de onde a bolsa vem (a do chefe global conta como de chefe).
    else if (s.kind === 'pouch' && s.pouch !== id) for (const k of guideKinds(s.pouch)) out.add(k);
  }
  return out;
}

export interface GuideOption {
  /** Jeitos de conseguir em que esta peça é a escolhida (a mesma peça pode ser de fazer e cair). */
  kinds: GuideKind[];
  item: Item;
  /** Cai pouco (ou depende de material que cai pouco). */
  rare: boolean;
}

/** Grimório: vai no espaço do escudo do Arcanista, mas o guia mostra à parte (senão o escudo sempre ganhava). */
export const isGrimoire = (it: Item) => it.id.endsWith('_spellbook');

export interface GuidePick {
  slot: EquipSlot;
  /** Linha à parte dentro do mesmo espaço (o grimório do Arcanista). */
  group?: 'grimoire';
  /** A melhor peça de cada jeito de conseguir (uma linha por peça). */
  options: GuideOption[];
}

/** Janela de níveis preferida: a peça da faixa do nível ganha da mais antiga, mesmo um pouco mais fraca. */
export const GUIDE_WINDOW = 15;

/** O melhor de cada espaço para a vocação no nível, por jeito de conseguir. */
export function guideFor(vocation: string, level: number): GuidePick[] {
  const picks: GuidePick[] = [];
  for (const slot of GUIDE_SLOTS) {
    const all = ITEMS.filter((it) => fits(it, vocation, level, slot) && itemSources(it.id).length > 0);
    const groups: [GuidePick['group'], Item[]][] = slot === 'shield' && all.some(isGrimoire)
      ? [[undefined, all.filter((it) => !isGrimoire(it))], ['grimoire', all.filter(isGrimoire)]]
      : [[undefined, all]];
    for (const [group, list] of groups) picks.push({ slot, ...(group ? { group } : {}), options: optionsFor(list, level) });
  }
  return picks;
}

function optionsFor(all: Item[], level: number): GuideOption[] {
  const better = (it: Item, b: Item) => gearScore(it) > gearScore(b) || (gearScore(it) === gearScore(b) && it.equip!.level > b.equip!.level);
  const best = (list: Item[]) => list.reduce<Item | null>((b, it) => (!b || better(it, b) ? it : b), null);
  const options: GuideOption[] = [];
  for (const kind of GUIDE_KINDS) {
    const ofKind = all.filter((it) => guideKinds(it.id).has(kind));
    // Peça da faixa (até GUIDE_WINDOW níveis abaixo); na arma de fazer, nunca uma pior que outra mais antiga
    // (no 230 o guia trocava a arma do covil do 210 pela forjada do 220, mais fraca).
    // Acima do 250 os drops de caçada vêm a cada 50 níveis (300, 350, 400): a janela acompanha.
    const recent = best(ofKind.filter((it) => it.equip!.level >= level - (level > 250 ? 50 : GUIDE_WINDOW)));
    const overall = best(ofKind);
    const weapon = kind === 'craft' && overall?.equip!.slot === 'weapon';
    const pick = weapon && recent && overall && gearScore(overall) > gearScore(recent) ? overall : recent ?? overall;
    if (!pick) continue;
    const same = options.find((o) => o.item.id === pick.id);
    if (same) same.kinds.push(kind);
    else options.push({ kinds: [kind], item: pick, rare: !isReliable(pick.id) });
  }
  return options;
}

// ── Item sem uso (botão Loot do Mercador) ──────────────────────────────────

/** Para que serve um item: receitas que o usam, imbuements, a instância que ele abre e quests que pedem. */
export type ItemUse =
  | { kind: 'recipe'; skill: ProductionSkillId; level: number; output: string }
  | { kind: 'imbuement'; name: string }
  | { kind: 'key'; hunt: string; level: number }
  | { kind: 'quest'; story: string };
const USES = new Map<string, ItemUse[]>();
const use = (id: string, u: ItemUse) => {
  const list = USES.get(id) ?? [];
  list.push(u);
  USES.set(id, list);
};
for (const [skill, recipes] of Object.entries(RECIPES) as [ProductionSkillId, (typeof RECIPES)[ProductionSkillId]][]) {
  for (const r of recipes) for (const id of Object.keys(r.inputs)) use(id, { kind: 'recipe', skill, level: r.level, output: r.output });
}
for (const imb of IMBUEMENTS) for (const id of Object.keys(imb.materials)) use(id, { kind: 'imbuement', name: imb.name });
for (const h of HUNTS) if (h.key) use(h.key, { kind: 'key', hunt: h.name, level: h.level });
for (const st of STORIES) {
  for (const step of st.steps) {
    const g = (step as { need?: { goal?: { kind?: string; item?: string } } }).need?.goal;
    if (g?.kind === 'obtain' && g.item) use(g.item, { kind: 'quest', story: st.name });
  }
}
/** Para que serve o item (vazio: equipamento, consumível ou loot para vender). */
export const itemUses = (id: string): ItemUse[] => USES.get(id) ?? [];
const USED = new Set<string>(USES.keys());

/**
 * Tem uso no jogo: equipamento, consumível (comida, poção, runa, flecha, refeição, doce),
 * ferramenta, sigilo, traje, bolsa, chave de instância, material de imbuement, de receita
 * ou de quest, ficha de chefe e item de quest. O resto é loot para vender.
 */
export function hasUse(id: string): boolean {
  const it = itemById(id);
  if (!it) return true;
  if (it.equip || it.food || it.potion || it.manaPotion || it.rune || it.arrow || it.meal || it.tool || it.sigil) return true;
  if (it.outfit || it.pouch || it.candy || it.pool || it.questItem || it.tokenPrice || it.legendary) return true;
  // Ficha do chefe e doce do Dia das Crianças são moedas de loja.
  return USED.has(id) || id === 'boss_token' || id === 'kids_candy';
}
