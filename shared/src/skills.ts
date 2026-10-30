import { ELEMENTS, ELEMENT_LIST, RESIST_KEY, type Element } from './elements.ts';
import itemsData from '../data/items.json';
import { RAID_ITEMS, RAID_SET_ITEMS } from './raids.ts';
import miningData from '../data/mining.json';
import smithingData from '../data/smithing.json';
import fishingData from '../data/fishing.json';
import cookingData from '../data/cooking.json';
import woodcuttingData from '../data/woodcutting.json';
import craftingData from '../data/crafting.json';
import herbalismData from '../data/herbalism.json';
import soulreapingData from '../data/soulreaping.json';
import alchemyData from '../data/alchemy.json';
import runecraftData from '../data/runecraft.json';
import fletchingData from '../data/fletching.json';
import sigilismData from '../data/sigilism.json';
import { SPELL_GEMS, spellGemId } from './spells.ts';
import jewelcraftingData from '../data/jewelcrafting.json';

// ── Itens ───────────────────────────────────────────────────────────────────

export type EquipSlot = 'weapon' | 'shield' | 'helmet' | 'armor' | 'legs' | 'boots' | 'ring' | 'amulet' | 'cape' | 'gem';

export const EQUIP_SLOTS: { id: EquipSlot; name: string }[] = [
  { id: 'helmet', name: 'Elmo' },
  { id: 'amulet', name: 'Amuleto' },
  { id: 'weapon', name: 'Arma' },
  { id: 'armor', name: 'Armadura' },
  { id: 'shield', name: 'Escudo' },
  { id: 'ring', name: 'Anel' },
  { id: 'legs', name: 'Calças' },
  { id: 'boots', name: 'Botas' },
  { id: 'cape', name: 'Capa' },
  { id: 'gem', name: 'Gema de Combate' },
];

export interface Bonus {
  attack: number;
  /** Elemento da arma e a parte do ataque que é desse elemento (some ao ataque). */
  element?: Element;
  elementAttack?: number;
  defense: number;
  hp: number;
  /** Efeitos especiais (frações): chance de crítico, roubo de vida, tempo entre
   *  ataques (negativo = mais rápido), regeneração e mana a mais. */
  crit?: number;
  lifesteal?: number;
  /** Fração do dano causado que volta como mana (imbuement Roubo de Mana). */
  manaLeech?: number;
  speed?: number;
  regen?: number;
  mana?: number;
  /** Redução de todo dano recebido dos monstros (fração; anéis e colares da Joalheria). */
  reduction?: number;
  /** Resistência a cada elemento (fração do dano daquele elemento a menos). */
  resFire?: number;
  resWater?: number;
  resEarth?: number;
  resEnergy?: number;
  resHoly?: number;
  resDeath?: number;
  /** Chance de recuperar a flecha usada na luta (aljavas do Caçador). */
  arrowSave?: number;
  /** Gema de Combate: a magia (id) que ela reforça. */
  spellGem?: string;
  /** Gema de Combate: força do reforço (1 = gema +0 comum; sobe com o refino e a raridade). */
  spellGemPower?: number;
  /** Bônus percentuais da árvore de Maestria (fração: 0.1 = +10%). */
  attackPct?: number;
  defensePct?: number;
  hpPct?: number;
  critMult?: number;
  /** Bônus de set pela qualidade (26/10): XP e loot a mais nas caçadas (fração). */
  xpPct?: number;
  lootPct?: number;
}

const SPECIALS = ['crit', 'critMult', 'attackPct', 'defensePct', 'hpPct', 'lifesteal', 'manaLeech', 'speed', 'regen', 'mana', 'reduction', 'resFire', 'resWater', 'resEarth', 'resEnergy', 'resHoly', 'resDeath', 'arrowSave'] as const;

/** Texto curto do que a peça soma (ex.: "+9 ataque, +3% crítico, 20% mais lento"). */
export function bonusText(b: Partial<Bonus>): string {
  const pct = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;
  const parts: string[] = [];
  if (b.attack) parts.push(`+${b.attack} ataque`);
  if (b.element && b.elementAttack) parts.push(`+${b.elementAttack} de ${ELEMENTS[b.element].pt.toLowerCase()}`);
  if (b.defense) parts.push(`+${b.defense} defesa`);
  if (b.hp) parts.push(`+${b.hp} vida`);
  if (b.crit) parts.push(`+${pct(b.crit)} crítico`);
  if (b.lifesteal) parts.push(`${pct(b.lifesteal)} roubo de vida`);
  if (b.manaLeech) parts.push(`${pct(b.manaLeech)} roubo de mana`);
  if (b.speed) parts.push(b.speed > 0 ? `${pct(b.speed)} mais lento` : `${pct(b.speed)} mais rápido`);
  if (b.regen) parts.push(`+${pct(b.regen)} regeneração`);
  if (b.mana) parts.push(`+${pct(b.mana)} mana`);
  if (b.reduction) parts.push(`-${pct(b.reduction)} de dano recebido`);
  if (b.arrowSave) parts.push(`${pct(b.arrowSave)} de chance de recuperar a flecha`);
  for (const el of ELEMENT_LIST) {
    const v = b[RESIST_KEY[el]];
    if (v) parts.push(`+${pct(v)} resistência a ${ELEMENTS[el].pt.toLowerCase()}`);
  }
  return parts.join(', ');
}

/** Efeito de uma runa: golpe (em área ou num alvo) ou cura abaixo de uma fração da vida. */
export type RuneEffect = ({ kind: 'strike'; mult: number; area?: boolean; element?: Element } | { kind: 'heal'; pct: number; below: number }) & { level: number };

/** Efeito de uma flecha especial do Caçador: bônus multiplicador de dano e elemento opcional. */
/** splash: fração do tiro normal que acerta também os outros monstros vivos (flechas de área). */
export type ArrowEffect = { mult: number; element?: Element; splash?: number };

export type MealBuff = 'combat_xp' | 'rest_speed' | 'loot' | 'profession_xp' | 'stamina_cost' | 'crit_chance' | 'all_xp_loot';

export interface Item {
  id: string;
  name: string;
  /** Arquivo em client/public/assets/icons/<icon>.png */
  icon: string;
  /** Se é equipamento: onde vai, nível de combate mínimo e o que soma. */
  equip?: { slot: EquipSlot; level: number; vocations?: string[] } & Partial<Bonus>;
  /** Peça de quest: desenho (no boneco) da peça de fazer com este id. */
  look?: string;
  /** Se é comida curativa / poção de vida: quanta vida cura. */
  food?: number;
  /** Se é sigilo (Sigilismo): bônus passivo enquanto estiver num espaço de sigilo. */
  sigil?: Partial<Bonus>;
  /** Se é refeição cozida: buff temporário concedido ao comer. */
  meal?: { buff: MealBuff; value: number };
  /** Se é poção de mana: quanta mana recupera. */
  manaPotion?: number;
  /** Item lendário com nome (dos chefes globais): sempre na cor lendária. */
  legendary?: boolean;
  /** Se é poção de caçada: bônus (fração) de ataque e/ou defesa enquanto dura. */
  potion?: { attack?: number; defense?: number };
  /** Se é runa: o efeito na luta (golpe extra ou cura) e o nível do altar. */
  rune?: RuneEffect;
  /** Se é flecha especial do Caçador: bônus de dano consumido a cada ciclo. */
  arrow?: ArrowEffect;
  /** Item de quest: só serve à quest, não se vende nem vai ao Mercado. */
  questItem?: boolean;
  /** Se é bolsa de armas / container gacha: lista de itens possíveis ao abrir. */
  pouch?: boolean;
  /** Ferramenta de profissão (vale do depósito): acelera a coleta e dá XP a partir do nível. */
  tool?: { skill: SkillId; level: number; speed: number; xp: number };
  /** Ferramenta de várias profissões (vale do depósito): soma esta velocidade à melhor ferramenta de cada uma. */
  multitool?: { skills: SkillId[]; speed: number };
  /** Peça de roupa de profissão (vale do depósito): XP na profissão do grupo. */
  outfit?: { group: 'mining' | 'woodcutting' | 'fishing' | 'herbalism' | 'soulreaping' | 'artisan'; piece: 'head' | 'body' | 'legs' | 'feet' };
  pool?: string[];
  /** Bolsa de doces (Bolsa do Mímico): abre em [mín, máx] doces do evento. */
  candy?: [number, number];
  /** Fragmento de Trono (Bolsas dos Tronos): abre em [min, max] fragmentos do Trono. */
  fragment?: { item: string; min: number; max: number };
  /** Preço base no Mercador (só materiais brutos e drops; o resto vem da receita). */
  value?: number;
  /** Preço em Fichas do Chefe no Colecionador (réplicas dos sets dos deuses); sem ele, BOSS_TOKEN_COST. */
  tokenPrice?: number;
}

/** Gema de cada tier de magia (o desenho e a receita). */
function spellGemTier(level: number): { gem: string; inputs: Record<string, number> } {
  if (level <= 15) return { gem: 'gem_sapphire', inputs: { silver_bar: 1, gem_sapphire: 2 } };
  if (level <= 30) return { gem: 'gem_ruby', inputs: { gold_bar: 1, gem_ruby: 2 } };
  if (level <= 45) return { gem: 'gem_emerald', inputs: { adamant_bar: 1, gem_emerald: 3 } };
  if (level <= 70) return { gem: 'gem_emerald', inputs: { orichalcum_bar: 1, gem_emerald: 2, gem_diamond: 2 } };
  return { gem: 'gem_diamond', inputs: { dragonite_bar: 2, gem_diamond: 4 } };
}
/**
 * Tiers das Gemas de Combate (pedido de 17/10): a de tier 1 é a gema de antes (mesmo id, quem tem
 * continua com ela), e todas se fazem no mesmo nível de Joalheria. As de tier 2 e 3 pedem mais
 * nível, a gema do tier de baixo e materiais caros, e reforçam bem mais (`power`, que o refino e
 * a raridade ainda multiplicam).
 */
export const SPELL_GEM_TIERS = [
  { tier: 1, prefix: 'Gema', level: 20, power: 1, intervalMs: 8000, xp: 900 },
  { tier: 2, prefix: 'Gema Lapidada', level: 50, power: 1.6, intervalMs: 12000, xp: 3200 },
  { tier: 3, prefix: 'Gema Perfeita', level: 80, power: 2.4, intervalMs: 16000, xp: 9500 },
] as const;
/** Id da gema da magia no tier (o tier 1 é o id antigo). */
export const spellGemTierId = (spellId: string, tier: number) => (tier <= 1 ? spellGemId(spellId) : `spellgem${tier}_${spellId}`);
const SPELL_GEM_TIER_INPUTS: Record<number, Record<string, number>> = {
  2: { orichalcum_bar: 2, gem_diamond: 3, gem_emerald: 2 },
  3: { dragonite_bar: 3, gem_diamond: 6, divine_ichor: 1 },
};
const SPELL_GEM_ITEMS: Item[] = SPELL_GEMS.flatMap((g) => SPELL_GEM_TIERS.map((t) => ({
  id: spellGemTierId(g.spell, t.tier),
  name: g.name.replace(/^Gema:/, `${t.prefix}:`),
  icon: `spellgem_${g.vocation}`, // uma cor por classe: guerreiro, caçador, arcanista e devoto
  value: Math.round((200 + g.level * 40) * t.power ** 2),
  equip: { slot: 'gem' as const, level: g.level, vocations: [g.vocation], spellGem: g.spell, ...(t.tier > 1 ? { spellGemPower: t.power } : {}) },
})));
const SPELL_GEM_RECIPES: Recipe[] = SPELL_GEMS.flatMap((g) => SPELL_GEM_TIERS.map((t) => ({
  id: spellGemTierId(g.spell, t.tier),
  name: g.name.replace(/^Gema:/, `${t.prefix}:`),
  level: t.level,
  intervalMs: t.intervalMs,
  xp: t.xp,
  inputs: t.tier === 1 ? spellGemTier(g.level).inputs : { [spellGemTierId(g.spell, t.tier - 1)]: 1, ...SPELL_GEM_TIER_INPUTS[t.tier] },
  output: spellGemTierId(g.spell, t.tier),
})));

export const ITEMS = [...(itemsData as Item[]), ...SPELL_GEM_ITEMS, ...RAID_ITEMS];
// Índice por id: a busca roda milhares de vezes por caçada (comida, poções, runas, equipamento);
// varrer a lista a cada chamada pesava no servidor depois que os itens passaram de 700.
const ITEM_INDEX = new Map(ITEMS.map((i) => [i.id, i]));
const baseItem = (id: string) => ITEM_INDEX.get(id);

/**
 * Raridade do equipamento: a mesma peça com atributos e valor maiores.
 * O id ganha o sufixo "+N" (ex.: "iron_sword+2" = Espada de Ferro rara); o refino, "#K" (ver splitRarity).
 */
export const RARITIES = [
  { tier: 0, name: 'Comum', mult: 1, color: '#e8e2d4' },
  { tier: 1, name: 'Incomum', mult: 1.15, color: '#7dd96b' },
  { tier: 2, name: 'Rara', mult: 1.3, color: '#5aa8ff' },
  { tier: 3, name: 'Épica', mult: 1.5, color: '#c27bff' },
  { tier: 4, name: 'Lendária', mult: 1.8, color: '#ffae3a' },
  // Acima da Lendária: só na Ascensão, com chance de falhar (ver ascendChance).
  { tier: 5, name: 'Mítica', mult: 2.1, color: '#ff4d6d' },
  { tier: 6, name: 'Divina', mult: 2.5, color: '#4dfff0' },
  { tier: 7, name: 'Ancestral', mult: 3, color: '#fff27a' },
] as const;

/**
 * Separa o id em peça, raridade e refino: "iron_sword+2#3" = Espada de Ferro Rara +3.
 * Raridade ("+N", 1 a 7) muda na Ascensão; refino ("#K", 1 a 10) na Forja, sem mexer na raridade.
 */
export function splitRarity(id: string): { base: string; tier: number; refine: number } {
  if (!id.includes('+') && !id.includes('#')) return { base: id, tier: 0, refine: 0 };
  const m = /^(.+?)(?:\+([1-7]))?(?:#(10|[1-9]))?$/.exec(id);
  return m ? { base: m[1], tier: Number(m[2] ?? 0), refine: Number(m[3] ?? 0) } : { base: id, tier: 0, refine: 0 };
}
export const rarityOf = (id: string) => (baseItem(splitRarity(id).base)?.legendary && splitRarity(id).tier < 5 ? RARITIES[4] : RARITIES[splitRarity(id).tier]);

/**
 * Peça de chefe (23/10): nasce Lendária (atributos de hoje, sem mudança) e sobe até a Ancestral com Essência; cada raridade
 * acima multiplica na mesma proporção da peça comum (Mítica 2,1/1,8, Divina 2,5/1,8, Ancestral 3/1,8).
 */
export const BOSS_RARITY_MULT: Record<number, number> = { 4: 1, 5: 2.1 / 1.8, 6: 2.5 / 1.8, 7: 3 / 1.8 };
/**
 * Base das peças de chefe e das réplicas +45% (23/10): a base delas era só ~1,38x a da peça comum do mesmo nível e
 * a comum Lendária já passava (1,8x). Com +45%, a peça de chefe fica ~10% acima da comum na raridade equivalente.
 */
export const BOSS_BASE_BOOST = 1.45;
// Arena não entra (é fácil de conseguir); chefe, réplica e quest sim.
const baseBoost = (b: Item) => ((b.legendary && !b.id.startsWith('arena')) || b.id.startsWith('replica_') ? BOSS_BASE_BOOST : 1);
/** Essência de Chefe: cai de todo chefe; refina e ascende as peças de chefe (que não têm cópias para gastar). */
export const BOSS_ESSENCE = 'boss_essence';
/** Essência para subir peça de chefe de raridade: Lendária→Mítica, Mítica→Divina, Divina→Ancestral. */
export const BOSS_ASCEND_ESSENCE = [50, 120, 250];
/** Essência para refinar peça de chefe do +K para o +K+1 (3, 6, 9 ... 30; 165 até o +10). */
export const bossRefineEssence = (refine: number) => 3 * (refine + 1);
/** Essência por chefe vencido (covil ou instância), pelo nível da caçada. */
export const bossEssenceDrop = (huntLevel: number) => 1 + Math.floor(huntLevel / 50);

/** Refino máximo e quanto cada nível soma nos atributos (+5% cada, +50% no +10). */
export const MAX_REFINE = 10;
export const REFINE_STEP = 0.05;

/**
 * 26/10: no fim de jogo o equipamento tem que pesar. Peças do 350+ abaixo de Lendária (+4) ou de refino #5 ficam
 * mais fracas: raridade Comum a Épica 0,8 / 0,9 / 1,0 / 1,15 (era 1 / 1,15 / 1,3 / 1,5) e refino
 * #0 a #4 -15% / -10% / -5% / 0% / +5% (era 0% a +20%). Do +4 e do #5 para cima nada muda.
 */
export const GEAR_NERF_FROM = 350;
export const GEAR_NERF_RARITY = [0.8, 0.9, 1, 1.15];
export const gearNerfRefine = (refine: number) => 0.85 + refine * REFINE_STEP;
/** Fator final sobre os atributos da peça (1 = sem corte). */
export function gearNerf(b: Item, tier: number, refine: number): number {
  if (!b.equip || b.equip.level < GEAR_NERF_FROM) return 1;
  // Peça de chefe (e a réplica dela) nasce Lendária: conta pelo menos como Lendária.
  const t = b.legendary || b.id.startsWith('replica_') ? Math.max(4, tier) : tier;
  const rar = t < 4 ? GEAR_NERF_RARITY[t] / RARITIES[t].mult : 1;
  const ref = refine < 5 ? gearNerfRefine(refine) / (1 + refine * REFINE_STEP) : 1;
  return rar * ref;
}

/** Monta o id de uma peça com raridade e refino. */
export const gearId = (base: string, tier: number, refine: number) => `${base}${tier ? `+${tier}` : ''}${refine ? `#${refine}` : ''}`;

const derived = new Map<string, Item>();
export function itemById(id: string): Item | undefined {
  const { base, tier, refine } = splitRarity(id);
  if (tier === 0 && refine === 0 && !(baseItem(id)?.equip && (baseBoost(baseItem(id)!) > 1 || baseItem(id)!.equip!.level >= GEAR_NERF_FROM))) return baseItem(id);
  const cached = derived.get(id);
  if (cached) return cached;
  const b = baseItem(base);
  if (!b?.equip) return undefined;
  // Peça de chefe: multiplicadores próprios (BOSS_RARITY_MULT), ~10% acima da peça comum do mesmo nível na raridade equivalente.
  const boost = baseBoost(b);
  const r0 = b.legendary ? { ...RARITIES[tier >= 5 ? tier : 4], mult: BOSS_RARITY_MULT[tier >= 5 ? tier : 4] } : RARITIES[tier];
  const r = { ...r0, mult: r0.mult * boost };
  // Passo mínimo (+1) só quando há multiplicador de verdade.
  const kTier = r.mult > 1 ? Math.max(1, tier) : 0;
  // Primeiro a raridade, depois o refino por cima; cada raridade e cada +1 dão pelo menos +1
  // (+5 na vida de peças com 10 ou mais), para as peças fracas também subirem.
  const step = (n: number, mult: number, k: number) => (k ? Math.max(n + k, Math.round(n * mult)) : n);
  const stepHp = (n: number, mult: number, k: number) => (k ? Math.max(n + (n >= 10 ? k * 5 : k), Math.round(n * mult)) : n);
  const up = (n?: number) => (n === undefined ? undefined : step(step(n, r.mult, kTier), 1 + refine * REFINE_STEP, refine));
  const upHp = (n?: number) => (n === undefined ? undefined : stepHp(stepHp(n, r.mult, kTier), 1 + refine * REFINE_STEP, refine));
  // Atributos de porcentagem (crítico, velocidade, resistências...): o refino vale cheio (+50% no +10)
  // e a raridade vale metade (Ancestral = 2x em vez de 3x), para não explodir.
  const factor = (1 + (r.mult - 1) / 2) * (1 + refine * REFINE_STEP);
  const specials: Partial<Bonus> = {};
  for (const k of SPECIALS) {
    const v = b.equip[k];
    if (typeof v === 'number' && v) {
      const scaled = Math.round(v * factor * 1000) / 1000;
      // Mana abaixo de 1 é porcentagem (0,858 = +85,8%); não pode virar 1+ (seria lida como mana fixa).
      specials[k] = k === 'mana' && v < 1 ? Math.min(0.99, scaled) : scaled;
    }
  }
  // Peça do 350+ abaixo de Lendária (+4) ou de refino #5: atributos menores (ver gearNerf).
  const nerf = gearNerf(b, tier, refine);
  const cut = (n?: number) => (n === undefined || nerf === 1 ? n : Math.max(1, Math.round(n * nerf)));
  if (nerf !== 1) for (const k of Object.keys(specials) as (keyof typeof specials)[]) specials[k] = Math.round((specials[k] as number) * nerf * 1000) / 1000 as never;
  const item: Item = {
    ...b,
    id,
    name: `${b.name}${tier ? ` (${r.name})` : ''}${refine ? ` +${refine}` : ''}`,
    equip: {
      ...b.equip, ...specials, attack: cut(up(b.equip.attack)), elementAttack: cut(up(b.equip.elementAttack)), defense: cut(up(b.equip.defense)), hp: cut(upHp(b.equip.hp)),
      // Gema de Combate: o reforço da magia cresce do mesmo jeito que os atributos de porcentagem.
      ...(b.equip.spellGem ? { spellGemPower: Math.round(factor * nerf * (b.equip.spellGemPower ?? 1) * 1000) / 1000 } : {}),
    },
  };
  derived.set(id, item);
  return item;
}

/** Selo da Forja: gasto na tentativa, soma FORGE_WARD_BONUS à chance. */
export const FORGE_WARD = 'forge_ward';
export const FORGE_WARD_BONUS = 0.15;
/** Piedade: cada falha seguida no mesmo passo soma isto à chance da próxima (zera ao dar certo). */
export const FORGE_PITY_STEP = 0.2;

/** Refino: o próximo +K da mesma peça e raridade (null no +10, em peça de chefe ou que não é equipamento). */
export function nextRefineId(itemId: string): string | null {
  const { base, tier, refine } = splitRarity(itemId);
  const it = baseItem(base);
  if (!it?.equip || refine >= MAX_REFINE) return null;
  return gearId(base, tier, refine + 1);
}

/** Ouro para refinar do +K para o +K+1: cresce com o nível da peça e ao quadrado com o refino. */
export function refineCost(itemId: string): number {
  const { base, refine } = splitRarity(itemId);
  const lvl = baseItem(base)?.equip?.level || 1;
  return Math.max(100, Math.round(lvl * 50 * (refine + 1) ** 2));
}

/**
 * Material do refino: 1 cópia igual (mesma peça e raridade, sem refino) e o material do desmanche
 * da peça, vezes o próximo nível (+1 = 1x, +10 = 10x).
 */
/** Mapeia itens de chefe / trono para a essência / fragmento específico correspondente. */
export const BOSS_ITEM_ESSENCES: Record<string, string> = {
  // Sombra do Rei Lich
  lich_crown: 'lich_essence',
  lich_boots: 'lich_essence',
  // Cria do Dragão Ancestral
  ancient_scales: 'ancient_dragon_essence',
  ancient_helm: 'ancient_dragon_essence',
  // Cria do Kraken Abissal
  tide_armor: 'kraken_essence',
  tide_legs: 'kraken_essence',
  // Emissário do Senhor do Abismo
  abyss_horns: 'abyss_essence',
  abyss_aegis: 'abyss_essence',
  // Golem da Mina Velha
  old_mine_plate: 'old_mine_essence',
  old_mine_legs: 'old_mine_essence',
  // Avatar de Ferathos
  ferathos_armor: 'ferathos_essence',
  ferathos_boots: 'ferathos_essence',
  // Arauto de Ghazrael
  ghazrael_helm: 'ghazrael_essence',
  ghazrael_legs: 'ghazrael_essence',
  // Filha da Viúva Ancestral
  old_widow_helm: 'old_widow_essence',
  old_widow_armor: 'old_widow_essence',

  // Trono de Asura
  asura_throne_amulet: 'asura_throne_fragment',
  asura_throne_ring: 'asura_throne_fragment',
  asura_throne_boots: 'asura_throne_fragment',
  asura_throne_sword: 'asura_throne_fragment',
  asura_throne_bow: 'asura_throne_fragment',
  asura_throne_staff: 'asura_throne_fragment',
  asura_throne_mace: 'asura_throne_fragment',

  // Trono do Tirano
  tyrant_throne_amulet: 'tyrant_throne_fragment',
  tyrant_throne_ring: 'tyrant_throne_fragment',
  tyrant_throne_boots: 'tyrant_throne_fragment',
  tyrant_throne_sword: 'tyrant_throne_fragment',
  tyrant_throne_bow: 'tyrant_throne_fragment',
  tyrant_throne_staff: 'tyrant_throne_fragment',
  tyrant_throne_mace: 'tyrant_throne_fragment',

  // Trono do Usurpador
  usurper_throne_amulet: 'usurper_throne_fragment',
  usurper_throne_ring: 'usurper_throne_fragment',
  usurper_throne_boots: 'usurper_throne_fragment',
  usurper_throne_sword: 'usurper_throne_fragment',
  usurper_throne_bow: 'usurper_throne_fragment',
  usurper_throne_staff: 'usurper_throne_fragment',
  usurper_throne_mace: 'usurper_throne_fragment',

  // Trono da Serpente
  serpent_throne_amulet: 'serpent_throne_fragment',
  serpent_throne_ring: 'serpent_throne_fragment',
  serpent_throne_boots: 'serpent_throne_fragment',
  serpent_throne_sword: 'serpent_throne_fragment',
  serpent_throne_bow: 'serpent_throne_fragment',
  serpent_throne_staff: 'serpent_throne_fragment',
  serpent_throne_mace: 'serpent_throne_fragment',

  // Trono da Chama
  flame_throne_amulet: 'flame_throne_fragment',
  flame_throne_ring: 'flame_throne_fragment',
  flame_throne_boots: 'flame_throne_fragment',
  flame_throne_sword: 'flame_throne_fragment',
  flame_throne_bow: 'flame_throne_fragment',
  flame_throne_staff: 'flame_throne_fragment',
  flame_throne_mace: 'flame_throne_fragment',

  // Trono do Campeão
  champion_throne_amulet: 'champion_throne_fragment',
  champion_throne_ring: 'champion_throne_fragment',
  champion_throne_boots: 'champion_throne_fragment',
  champion_throne_sword: 'champion_throne_fragment',
  champion_throne_bow: 'champion_throne_fragment',
  champion_throne_staff: 'champion_throne_fragment',
  champion_throne_mace: 'champion_throne_fragment',
};

export const bossEssenceFor = (baseId: string): string | undefined => BOSS_ITEM_ESSENCES[baseId];

export function refineMaterials(itemId: string, bank?: Record<string, number>, worn = false): Record<string, number> {
  const { base, tier, refine } = splitRarity(itemId);
  const spec = bossEssenceFor(base);
  const need = bossRefineEssence(refine);
  if (spec) {
    const essence = (bank && (bank[spec] ?? 0) >= need) ? spec : (bank ? BOSS_ESSENCE : spec);
    return { [essence]: need };
  }
  if (baseItem(base)?.legendary) return { [BOSS_ESSENCE]: need };
  const out: Record<string, number> = { [refineCopy(itemId, bank, worn)]: 1 };
  for (const [id, q] of Object.entries(dismantleMaterials(base) ?? {})) out[id] = q * (refine + 1);
  return out;
}

/**
 * A cópia gasta no refino: a mesma peça e raridade com refino igual ou menor que o da peça refinada,
 * a de menor refino que houver no depósito (a própria peça, se vier do depósito, não conta). Sem
 * depósito (ou sem nenhuma), a +0.
 */
export function refineCopy(itemId: string, bank?: Record<string, number>, worn = false): string {
  const { base, tier, refine } = splitRarity(itemId);
  for (let k = 0; k <= refine && bank; k++) {
    const id = gearId(base, tier, k);
    if ((bank[id] ?? 0) - (id === itemId && !worn ? 1 : 0) >= 1) return id;
  }
  return gearId(base, tier, 0);
}

/** Chance do refino (23/10): +1 100%, +2 95%, +3 90%, +4 85%, +5 80%, +6 60%, +7 45%, +8 30%, +9 20%, +10 12%, mais piedade e Selo. */
export function refineChance(itemId: string, fails = 0, ward = false): number {
  const base = [1, 0.95, 0.9, 0.85, 0.8, 0.6, 0.45, 0.3, 0.2, 0.12][splitRarity(itemId).refine] ?? 0;
  return Math.min(1, base + fails * FORGE_PITY_STEP + (ward ? FORGE_WARD_BONUS : 0));
}

/** Tier máximo de raridade (Ascensão). */
export const MAX_RARITY_TIER = 7;

/** Ascensão: a mesma peça uma raridade acima, mantendo o refino (null na Ancestral ou em peça de chefe). */
export function nextRarityId(itemId: string): string | null {
  const { base, tier, refine } = splitRarity(itemId);
  const it = baseItem(base);
  if (!it?.equip || tier >= MAX_RARITY_TIER) return null;
  // Peça de chefe: Lendária (sem sufixo) → Mítica (+5) → Divina (+6) → Ancestral (+7).
  if (it.legendary) return gearId(base, tier === 0 ? 5 : tier + 1, refine);
  return gearId(base, tier + 1, refine);
}

/** Ouro da Ascensão: cresce com o nível e ao cubo com a raridade; da Lendária para cima, 4x. */
export function ascendCost(itemId: string): number {
  const { base, tier: raw } = splitRarity(itemId);
  const tier = baseItem(base)?.legendary && raw === 0 ? 4 : raw;
  const lvl = baseItem(base)?.equip?.level || 1;
  return Math.max(200, Math.round(lvl * 40 * (tier + 1) ** 3 * (tier >= 4 ? 4 : 1)));
}

/** Chance da Ascensão (23/10): Incomum 100%, Rara 100%, Épica 85%, Lendária 70%, Mítica 45%, Divina 30%, Ancestral 15%, mais piedade e Selo. */
export function ascendChance(itemId: string, fails = 0, ward = false): number {
  const t = splitRarity(itemId).tier;
  // Peça de chefe: Lendária (0) → Mítica usa a chance da Lendária.
  const base = [1, 1, 0.85, 0.7, 0.45, 0.3, 0.15][baseItem(splitRarity(itemId).base)?.legendary && t === 0 ? 4 : t] ?? 0;
  return Math.min(1, base + fails * FORGE_PITY_STEP + (ward ? FORGE_WARD_BONUS : 0));
}

/** Ascensão: a peça escolhida + 9 da mesma raridade sobem a escolhida um tier. */
export const ASCEND_FODDER = 9;

/** O Mercador compra? Item de quest e peça de roupa de profissão, não (vender por engano tirava o bônus). */
/** Moedas do jogo que o Mercador não compra (a Ficha do Chefe saía por 100 de ouro no "Selecionar Tudo"; 27/10: os doces de evento também). */
const NPC_NEVER_BUYS = new Set(['boss_token', 'boss_essence', 'halloween_candy', 'kids_candy']);

export function npcBuys(id: string): boolean {
  const it = itemById(id);
  return !!it && !it.questItem && !it.outfit && !NPC_NEVER_BUYS.has(id);
}

/**
 * Pode ser gasta na Ascensão de `target`: equipamento da mesma raridade, que não seja de chefe
 * nem de quest, com nível de pelo menos metade do da peça (9 adagas nível 1 não sobem arma 100).
 */
export function ascendFodder(target: string, id: string): boolean {
  const t = splitRarity(target);
  const f = splitRarity(id);
  const a = baseItem(t.base);
  const b = baseItem(f.base);
  if (!a?.equip || !b?.equip || b.legendary || b.questItem) return false;
  return f.tier === t.tier && (b.equip.level || 1) >= Math.ceil((a.equip.level || 1) / 2);
}

/** Devolve os materiais recuperados ao desmanchar um equipamento (50% dos materiais). */
export function dismantleMaterials(itemId: string): Record<string, number> | null {
  const { base } = splitRarity(itemId);
  const item = baseItem(base);
  // Sigilo: volta metade do que gastou na receita de Sigilismo.
  if (item?.sigil) {
    const r = (RECIPES.sigilism ?? []).find((x) => x.output === base);
    const back: Record<string, number> = {};
    for (const [inp, qty] of Object.entries(r?.inputs ?? {})) if (Math.floor(qty * 0.5) > 0) back[inp] = Math.floor(qty * 0.5);
    return Object.keys(back).length ? back : null;
  }
  if (!item?.equip) return null;

  // 1. Receita direta se existir
  const all = [...(RECIPES.smithing ?? []), ...(RECIPES.crafting ?? []), ...(RECIPES.fletching ?? []), ...(RECIPES.jewelcrafting ?? [])];
  const recipe = all.find((r) => r.output === base);
  if (recipe) {
    const raw: Record<string, number> = {};
    // Barras voltam como barras (aço dá barra de aço, não minério). Sempre menos do que gastou
    // (metade, arredondada para baixo): devolver 1 de 1 dava fazer e desmanchar sem fim, só pela XP.
    for (const [inp, qty] of Object.entries(recipe.inputs)) {
      const back = Math.floor(qty * 0.5);
      if (back > 0) raw[inp] = (raw[inp] || 0) + back;
      else {
        // Peça de 1 barra: metade daria 0. Devolve 1 do minério da barra (vale menos que ela,
        // ainda falta fundir com carvão), então fazer e desmanchar continua dando prejuízo.
        const ore = Object.keys(RECIPES.smithing.find((r) => r.output === inp)?.inputs ?? {})[0];
        if (ore) raw[ore] = (raw[ore] || 0) + 1;
      }
    }
    return Object.keys(raw).length ? raw : null;
  }

  // 2. Equipamentos sem receita direta: deduz pelo nível e vocação
  const lvl = item.equip.level || 1;
  const slot = item.equip.slot;
  const voc = item.equip.vocations?.[0] || 'warrior';

  let material = 'iron_ore';
  if (voc === 'hunter') {
    if (slot === 'weapon') material = lvl >= 45 ? 'yew_logs' : lvl >= 25 ? 'oak_logs' : 'logs';
    else material = lvl >= 45 ? 'dragon_scale' : lvl >= 25 ? 'lizard_scale' : 'wolf_pelt';
  } else if (voc === 'arcanist' || voc === 'devout') {
    if (slot === 'weapon') material = lvl >= 45 ? 'yew_logs' : lvl >= 25 ? 'oak_logs' : 'logs';
    else material = lvl >= 45 ? 'dark_essence' : lvl >= 25 ? 'spider_silk' : 'leather';
  } else {
    material = lvl >= 45 ? 'mithril_ore' : lvl >= 35 ? 'adamant_ore' : lvl >= 25 ? 'iron_ore' : lvl >= 10 ? 'tin_ore' : 'copper_ore';
  }

  const qty = Math.max(1, Math.min(6, Math.floor(lvl / 15) + 1));
  return { [material]: qty };
}

// ── Skills ──────────────────────────────────────────────────────────────────

export type SkillId =
  | 'combat'
  | 'melee'
  | 'ranged'
  | 'magic_level'
  | 'shielding'
  | 'mining'
  | 'smithing'
  | 'fishing'
  | 'cooking'
  | 'woodcutting'
  | 'crafting'
  | 'herbalism'
  | 'soulreaping'
  | 'alchemy'
  | 'runecraft'
  | 'fletching'
  | 'sigilism'
  | 'jewelcrafting'
  | 'slayer';

export const SKILLS: { id: SkillId; name: string; icon: string }[] = [
  { id: 'combat', name: 'Combate', icon: 'skill_combat' },
  { id: 'melee', name: 'Corpo a Corpo', icon: 'skill_melee' },
  { id: 'ranged', name: 'Distância', icon: 'skill_ranged' },
  { id: 'magic_level', name: 'Nível Mágico', icon: 'skill_magic_level' },
  { id: 'shielding', name: 'Escudo', icon: 'skill_shielding' },
  { id: 'mining', name: 'Mineração', icon: 'skill_mining' },
  { id: 'smithing', name: 'Forja', icon: 'skill_smithing' },
  { id: 'fishing', name: 'Pesca', icon: 'skill_fishing' },
  { id: 'cooking', name: 'Culinária', icon: 'skill_cooking' },
  { id: 'woodcutting', name: 'Lenhador', icon: 'skill_woodcutting' },
  { id: 'crafting', name: 'Artesanato', icon: 'skill_crafting' },
  { id: 'herbalism', name: 'Herbalismo', icon: 'skill_herbalism' },
  { id: 'soulreaping', name: 'Colheita de Almas', icon: 'skill_soulreaping' },
  { id: 'alchemy', name: 'Alquimia', icon: 'skill_alchemy' },
  { id: 'runecraft', name: 'Criação de Runas', icon: 'skill_runecraft' },
  { id: 'fletching', name: 'Criação de Flechas', icon: 'skill_fletching' },
  { id: 'sigilism', name: 'Sigilismo', icon: 'skill_sigilism' },
  { id: 'jewelcrafting', name: 'Joalheria', icon: 'skill_jewelcrafting' },
  { id: 'slayer', name: 'Slayer', icon: 'kings_skull' },
];

/** Skills de coleta: têm veios/pontos. */
export type GatheringSkillId = 'mining' | 'fishing' | 'woodcutting' | 'herbalism' | 'soulreaping';
/** Skills de produção: têm receitas que gastam materiais do banco. */
export type ProductionSkillId = 'smithing' | 'cooking' | 'crafting' | 'alchemy' | 'runecraft' | 'fletching' | 'sigilism' | 'jewelcrafting';

export const PROFESSIONS: SkillId[] = [
  'mining',
  'fishing',
  'woodcutting',
  'herbalism',
  'soulreaping',
  'smithing',
  'cooking',
  'crafting',
  'alchemy',
  'runecraft',
  'fletching',
  'sigilism',
  'jewelcrafting',
];

/** Bônus somado de tudo que está equipado. */
/** Peças que formam um set (o set completo é ter todas as que existem para a vocação). */
const SET_SLOTS: readonly EquipSlot[] = ['helmet', 'armor', 'legs', 'boots'];
/** Set completo: +5% de ataque, defesa e vida (18/10). */
export const SET_BONUS = 0.05;

/**
 * Chave do set de uma peça, pelo id (o nome em português muda: "Elmo Abissal", "Botas Abissais"):
 * `adamant_helmet` → `adamant`; sets de drop (`drop60_hood`, `drop60_holy_armor`) → `drop60`.
 * Réplica, raridade e refino contam como a mesma peça.
 */
export function setKeyOf(id: string): string | null {
  const base = splitRarity(id).base.replace(/^replica_/, '');
  const eq = baseItem(base)?.equip;
  if (!eq || !SET_SLOTS.includes(eq.slot)) return null;
  const drop = /^(drop\d+)_/.exec(base);
  if (drop) return drop[1];
  const m = /^(.+)_(helmet|armor|legs|boots)$/.exec(base);
  return m ? m[1] : null;
}

let setIndex: Map<string, { id: string; slot: EquipSlot; vocations?: string[] }[]> | null = null;
function setPieces(key: string) {
  if (!setIndex) {
    setIndex = new Map();
    for (const it of ITEMS) {
      if (!it.equip || it.id.startsWith('replica_')) continue;
      const k = setKeyOf(it.id);
      if (!k) continue;
      const list = setIndex.get(k) ?? [];
      list.push({ id: it.id, slot: it.equip.slot, vocations: it.equip.vocations });
      setIndex.set(k, list);
    }
  }
  return setIndex.get(key) ?? [];
}

/**
 * Sets completos no corpo: todas as peças do set (elmo, armadura, calças, botas) que servem para a
 * vocação de quem usa (a das peças vestidas). Set com menos de 3 peças não conta.
 */
export function ascendedUsurperCount(equipment: Partial<Record<EquipSlot, string | null>>): number {
  let count = 0;
  for (const id of Object.values(equipment)) {
    if (!id) continue;
    const base = splitRarity(id).base.replace(/^replica_/, '');
    if ((RAID_SET_ITEMS as readonly string[]).includes(base)) count++;
  }
  return count;
}

export function fullSets(equipment: Partial<Record<EquipSlot, string | null>>): string[] {
  const worn = SET_SLOTS.map((slot) => equipment[slot]).filter((id): id is string => !!id);
  const keys = new Set(worn.map(setKeyOf).filter((k): k is string => !!k));
  const out: string[] = [];
  for (const key of keys) {
    const mine = worn.filter((id) => setKeyOf(id) === key).map((id) => baseItem(splitRarity(id).base.replace(/^replica_/, ''))!);
    // Vocações em comum das peças vestidas (sem restrição = qualquer uma).
    let vocs: string[] | null = null;
    for (const it of mine) if (it.equip?.vocations) vocs = vocs ? vocs.filter((v) => it.equip!.vocations!.includes(v)) : [...it.equip.vocations];
    const need = setPieces(key).filter((p) => !p.vocations || !vocs || p.vocations.some((v) => vocs!.includes(v)));
    const needSlots = new Set(need.map((p) => p.slot));
    if (needSlots.size < 3) continue;
    if ([...needSlots].every((slot) => mine.some((it) => it.equip!.slot === slot))) out.push(key);
  }
  return out;
}

/**
 * Qualidade de uma peça para o bônus de set (26/10): abaixo de Lendária (+4) ou de refino #5 vale 0,25; no +4#5 vale 1;
 * cada refino acima do #5 soma 0,4 e cada raridade acima da Lendária soma 1 (+4#10 = 3, +5#10 = 4, +7#10 = 6).
 */
export function setPieceQuality(id: string): number {
  const { base, tier, refine } = splitRarity(id);
  const t = baseItem(base.replace(/^replica_/, ''))?.legendary ? Math.max(4, tier) : tier;
  if (t < 4 || refine < 5) return 0.25;
  return 1 + 0.4 * (refine - 5) + (t - 4);
}
/** Bônus de set pela qualidade: 2 peças +5% de dano; set completo +20% de dano, +3,3% de XP e +5% de loot; vezes a qualidade média. */
export const SET_QUALITY_BONUS: Record<'two' | 'full', { attackPct: number; xpPct: number; lootPct: number }> = {
  two: { attackPct: 0.05, xpPct: 0, lootPct: 0 },
  // 26/10: XP cortado para um terço e loot para a metade (o dano já acelera a XP; somava demais com XP em dobro).
  full: { attackPct: 0.2, xpPct: 0.1 / 3, lootPct: 0.05 },
};
export function setQualityBonus(equipment: Partial<Record<EquipSlot, string | null>>): { attackPct: number; xpPct: number; lootPct: number } {
  const out = { attackPct: 0, xpPct: 0, lootPct: 0 };
  const worn = SET_SLOTS.map((slot) => equipment[slot]).filter((id): id is string => !!id);
  const full = new Set(fullSets(equipment));
  const keys = new Set(worn.map(setKeyOf).filter((k): k is string => !!k));
  for (const key of keys) {
    // O set da raide conta abaixo, com as 4 peças dele (amuleto e anel não entram aqui).
    if (key === 'ascended_usurper') continue;
    const mine = worn.filter((id) => setKeyOf(id) === key);
    if (mine.length < 2) continue;
    const q = mine.reduce((n, id) => n + setPieceQuality(id), 0) / mine.length;
    const tier = full.has(key) ? SET_QUALITY_BONUS.full : SET_QUALITY_BONUS.two;
    out.attackPct += tier.attackPct * q;
    out.xpPct += tier.xpPct * q;
    out.lootPct += tier.lootPct * q;
  }
  // Set do Usurpador Ascendido (raide): amuleto, anel, botas e elmo. Mesmo bônus pela qualidade (4 peças = completo).
  const usurper = Object.values(equipment).filter((id): id is string => !!id && (RAID_SET_ITEMS as readonly string[]).includes(splitRarity(id).base.replace(/^replica_/, '')));
  if (usurper.length >= 2) {
    const q = usurper.reduce((n, id) => n + setPieceQuality(id), 0) / usurper.length;
    const tier = usurper.length >= RAID_SET_ITEMS.length ? SET_QUALITY_BONUS.full : SET_QUALITY_BONUS.two;
    out.attackPct += tier.attackPct * q;
    out.xpPct += tier.xpPct * q;
    out.lootPct += tier.lootPct * q;
  }
  return out;
}

export function equipmentBonus(equipment: Partial<Record<EquipSlot, string>>): Bonus {
  const total: Bonus = { attack: 0, defense: 0, hp: 0 };
  for (const id of Object.values(equipment)) {
    const eq = id ? itemById(id)?.equip : undefined;
    if (!eq) continue;
    total.attack += eq.attack ?? 0;
    total.defense += eq.defense ?? 0;
    total.hp += eq.hp ?? 0;
    for (const k of SPECIALS) if (eq[k]) total[k] = (total[k] ?? 0) + eq[k]!;
    if (eq.spellGem) {
      total.spellGem = eq.spellGem;
      total.spellGemPower = eq.spellGemPower ?? 1;
    }
    if (eq.element && eq.elementAttack) {
      total.element = eq.element;
      total.elementAttack = (total.elementAttack ?? 0) + eq.elementAttack;
    }
  }
  // Set completo: +5% de ataque, defesa e vida (dois sets ao mesmo tempo não existem: são as mesmas 4 peças).
  if (fullSets(equipment).length) {
    total.attack = Math.round(total.attack * (1 + SET_BONUS));
    total.defense = Math.round(total.defense * (1 + SET_BONUS));
    total.hp = Math.round(total.hp * (1 + SET_BONUS));
  }
  // Bônus de set pela qualidade (26/10): cresce com a raridade e o refino das peças do set.
  const sb = setQualityBonus(equipment);
  if (sb.attackPct) total.attackPct = (total.attackPct ?? 0) + sb.attackPct;
  if (sb.xpPct) total.xpPct = (total.xpPct ?? 0) + sb.xpPct;
  if (sb.lootPct) total.lootPct = (total.lootPct ?? 0) + sb.lootPct;
  // Set do Usurpador Ascendido (raide): 2 peças +4% ataque; 4 peças +6% vida e +4% todas as resistências.
  const usurperCount = ascendedUsurperCount(equipment);
  if (usurperCount >= 2) {
    total.attack = Math.round(total.attack * 1.04);
  }
  if (usurperCount >= 4) {
    total.hp = Math.round(total.hp * 1.06);
    total.resFire = Number(((total.resFire ?? 0) + 0.04).toFixed(3));
    total.resWater = Number(((total.resWater ?? 0) + 0.04).toFixed(3));
    total.resEarth = Number(((total.resEarth ?? 0) + 0.04).toFixed(3));
    total.resEnergy = Number(((total.resEnergy ?? 0) + 0.04).toFixed(3));
    total.resHoly = Number(((total.resHoly ?? 0) + 0.04).toFixed(3));
    total.resDeath = Number(((total.resDeath ?? 0) + 0.04).toFixed(3));
  }
  return total;
}

export interface ResourceNode {
  id: string;
  name: string;
  region: string;
  /** Nível mínimo da skill. */
  level: number;
  /** Tempo de uma ação. */
  intervalMs: number;
  /** XP por ação. */
  xp: number;
  /** Item ganho por ação. */
  item: string;
  /** Sorteio por ação (ex.: Rocha de Gemas): cada ação rende um destes, pelo peso; `item` é o que aparece na lista. */
  drops?: { item: string; weight: number }[];
}

export const NODES: Record<GatheringSkillId, ResourceNode[]> = {
  mining: miningData as ResourceNode[],
  fishing: fishingData as ResourceNode[],
  woodcutting: woodcuttingData as ResourceNode[],
  herbalism: herbalismData as ResourceNode[],
  soulreaping: soulreapingData as ResourceNode[],
};

const NODE_INDEX = new Map(Object.values(NODES).flat().map((n) => [n.id, n]));
export const nodeById = (skill: SkillId, id: string) => (skill in NODES ? NODE_INDEX.get(id) : undefined);

export interface Recipe {
  id: string;
  name: string;
  level: number;
  intervalMs: number;
  xp: number;
  /** Materiais gastos por ação: item → quantidade. */
  inputs: Record<string, number>;
  /** Item produzido. */
  output: string;
  /** Quantidade produzida por ação (padrão: 1; flechas rendem 15). */
  outputQty?: number;
  /** Sigilismo: precisa ter abatido a criatura tantas vezes (o eco do bestiário). */
  kills?: { monster: string; count: number };
}

export const RECIPES: Record<ProductionSkillId, Recipe[]> = {
  smithing: smithingData as unknown as Recipe[],
  cooking: cookingData as unknown as Recipe[],
  crafting: craftingData as unknown as Recipe[],
  alchemy: alchemyData as unknown as Recipe[],
  runecraft: runecraftData as unknown as Recipe[],
  fletching: fletchingData as unknown as Recipe[],
  sigilism: sigilismData as unknown as Recipe[],
  jewelcrafting: [...(jewelcraftingData as unknown as Recipe[]), ...SPELL_GEM_RECIPES],
};

export const recipeById = (skill: SkillId, id: string) =>
  skill in RECIPES ? RECIPES[skill as ProductionSkillId].find((r) => r.id === id) : undefined;

export const isProductionSkill = (skill: SkillId): skill is ProductionSkillId => skill in RECIPES;

/** Quantas vezes dá para fazer a receita com o que tem no banco. */
/**
 * Quanto o Mercador paga por unidade: o valor base do item, ou a soma dos
 * materiais da receita que o produz, com 20% a mais pelo trabalho.
 */
export function itemValue(id: string, seen: Set<string> = new Set()): number {
  if (id === 'gold') return 0;
  const rarity = splitRarity(id);
  if (rarity.tier > 0) return Math.round(itemValue(rarity.base, seen) * RARITIES[rarity.tier].mult * (1 + rarity.tier));
  const base = itemById(id)?.value;
  if (base !== undefined) return base;
  if (seen.has(id)) return 0;
  seen.add(id);
  for (const list of Object.values(RECIPES)) {
    const recipe = list.find((r) => r.output === id);
    if (recipe) {
      let sum = 0;
      for (const [input, qty] of Object.entries(recipe.inputs)) sum += itemValue(input, seen) * qty;
      const qtyOut = recipe.outputQty ?? 1;
      return Math.max(1, Math.round((sum * 1.2) / qtyOut));
    }
  }
  return 1;
}

/** Lojas do Bastião: o que cada uma vende (equipamento básico e de ferro). */
export const SHOPS = {
  armor: [
    'leather_cap', 'leather_boots', 'leather_legs', 'leather_armor',
    'bronze_helmet', 'bronze_shield', 'bronze_boots', 'bronze_legs', 'bronze_armor',
    'iron_helmet', 'iron_shield', 'iron_boots', 'iron_legs', 'iron_armor',
  ],
  weapons: ['bronze_sword', 'bronze_mace', 'wood_bow', 'wood_staff', 'iron_sword', 'iron_mace', 'oak_bow', 'oak_staff'],
  jewelry: ['silver_necklace', 'iron_ring', 'emerald_amulet', 'stealth_ring'],
  runes: ['spark_rune', 'light_heal_rune', 'boulder_rune', 'heavy_missile_rune'],
  potions: ['health_potion', 'great_health_potion', 'mana_potion', 'strong_mana_potion', 'strength_potion', 'stone_potion'],
} as const;
export type ShopId = keyof typeof SHOPS;

/** Preço na loja: dez vezes o que o Mercador paga (comprar pronto sai caro; forjar compensa). */
export function shopPrice(id: string): number {
  return itemValue(id) * 10;
}

export function craftableCount(recipe: Recipe, bank: Record<string, number>): number {
  let n = Infinity;
  for (const [item, qty] of Object.entries(recipe.inputs)) n = Math.min(n, Math.floor((bank[item] ?? 0) / qty));
  return n === Infinity ? 0 : n;
}

export function isSkillId(v: unknown): v is SkillId {
  return typeof v === 'string' && SKILLS.some((s) => s.id === v);
}

// ── Curva de XP ─────────────────────────────────────────────────────────────
// Mesma curva do RuneScape: o nível 92 é metade do caminho até o 99.

export const MAX_PROFESSION_LEVEL = 120;
/** @deprecated Usar MAX_PROFESSION_LEVEL para profissões. O combate não tem nível máximo. */
export const MAX_LEVEL = 120;

export const XP_TABLE_PRECALC_MAX = 250;

/**
 * XP_TABLE[n] = XP total para chegar ao nível n (índice 0 sem uso). É a curva do
 * RuneScape esticada por (1 + 0,6 por nível).
 * Pré-calculada até o nível 250 (dentro do limite seguro de inteiros do JS).
 */
export const XP_TABLE: number[] = (() => {
  const table = [0, 0];
  let points = 0;
  for (let lvl = 1; lvl < XP_TABLE_PRECALC_MAX; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    table.push(Math.floor((points / 4) * (1 + 0.6 * lvl)));
  }
  return table;
})();

/** XP total necessário para atingir determinado nível. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level < XP_TABLE.length) return XP_TABLE[level];
  const maxIdx = XP_TABLE.length - 1;
  const delta = XP_TABLE[maxIdx] - XP_TABLE[maxIdx - 1];
  return XP_TABLE[maxIdx] + (level - maxIdx) * delta;
}

export function isCombatSkill(skill?: SkillId): boolean {
  return skill === 'combat' || skill === 'melee' || skill === 'ranged' || skill === 'magic_level' || skill === 'shielding';
}

/**
 * Nível correspondente ao XP acumulado.
 * Profissões têm teto em MAX_PROFESSION_LEVEL (120).
 * Combate e skills de combate não têm nível máximo (infinito).
 */
export function levelForXp(xp: number, skill?: SkillId): number {
  if (xp <= 0) return 1;
  const isProf = skill !== undefined && !isCombatSkill(skill);
  if (isProf && xp >= XP_TABLE[MAX_PROFESSION_LEVEL]) {
    return MAX_PROFESSION_LEVEL;
  }

  const maxPrecalcXp = XP_TABLE[XP_TABLE.length - 1];
  if (xp < maxPrecalcXp) {
    let low = 1;
    let high = isProf ? MAX_PROFESSION_LEVEL : XP_TABLE.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (XP_TABLE[mid] <= xp) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }

  if (isProf) return MAX_PROFESSION_LEVEL;
  const maxIdx = XP_TABLE.length - 1;
  const delta = XP_TABLE[maxIdx] - XP_TABLE[maxIdx - 1];
  return maxIdx + Math.floor((xp - maxPrecalcXp) / delta);
}

/** Progresso dentro do nível atual, de 0 a 1 (1 no nível máximo da profissão). */
export function levelProgress(xp: number, skill?: SkillId): number {
  const level = levelForXp(xp, skill);
  const isProf = skill !== undefined && !isCombatSkill(skill);
  if (isProf && level >= MAX_PROFESSION_LEVEL) return 1;
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  if (next <= start) return 1;
  return Math.max(0, Math.min(1, (xp - start) / (next - start)));
}

// ── Atividade e simulação ───────────────────────────────────────────────────

/** Fila de profissões: uma tarefa que começa quando a anterior acaba. */
export interface QueuedActivity {
  skill: SkillId;
  node: string;
  /** Por quantas horas (vazio = até acabar o material; coleta precisa de horas). */
  hours?: number;
}
/** Tarefas na fila, no máximo. */
export const QUEUE_MAX = 5;

export interface Activity {
  /** 'combat' = caçada (node é o id da caçada); senão, coleta num veio/ponto. */
  skill: SkillId;
  node: string;
  /** Início da ação/ciclo em andamento (ms, relógio do servidor). */
  since: number;
  /** Semente do sorteio desta atividade (caçada). */
  seed: number;
  /** Quantos ciclos já foram creditados (caçada). */
  seq: number;
  /** Caçada: mana no começo do próximo ciclo (guardada entre um crédito e outro; vazio = cheia). */
  mana?: number | null;
  /** Caçada: buff e escudo de magia que ainda valem no começo do próximo ciclo (vazio = nenhum). */
  aura?: SpellAura | null;
}

/** Buff e escudo de magia ainda ativos (ms que faltam, contando do começo da próxima luta). */
export interface SpellAura {
  /** Antigo (um buff só); lido para quem já tinha a caçada salva. */
  buff?: { left: number; attack: number; crit: number };
  /** Um por magia de buff: buffs diferentes valem juntos (Grito de Guerra + Fúria Berserker). */
  buffs?: { id: string; left: number; attack: number; crit: number }[];
  shield?: { left: number; reduce: number };
}

/** Teto do progresso offline. */
export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000;

export interface Gains {
  /** Ações completas (na caçada: monstros abatidos). */
  actions: number;
  items: Record<string, number>;
  /** XP ganho por skill. Pode ser negativo no combate, se morreu. */
  xp: Partial<Record<SkillId, number>>;
  /** Fases de raide concluídas na tentativa (1, 2, 3). */
  raidPhases?: number[];
  /** Preenchido se o personagem morreu: a atividade acaba. */
  death?: { monster: string; xpLost: number; itemsLost?: string[]; blessed?: boolean; /** As peças ficaram com o Ceifador (preço e prazo do resgate). */ reaper?: { price: number; expiresAt: number } };
  /** Instância concluída (id da caçada). */
  cleared?: string;
  /** Instância que acabou depois da limpeza por falta de chave para o chefe. */
  instanceNoKey?: string;
  /** Primeira vitória do dia na instância: XP bônus e o Baú da Instância (já somados em xp/items). */
  instanceDaily?: { id: string; xp: number; gold: number; items: Record<string, number> };
  /** Arena concluída (id da arena). */
  arenaCleared?: string;
  /** Caçada: monstros abatidos por id (para as quests). */
  kills?: Record<string, number>;
  /** Caçada: segundos de combate gastos contra cada monstro com prey. */
  preySecondsUsed?: Record<string, number>;
  /** Caçada: stamina que sobrou no fim do trecho (ms). */
  staminaLeftMs?: number;
}

export interface SimResult {
  gains: Gains;
  since: number;
  seq: number;
  /** A atividade terminou (morte). */
  ended: boolean;
  /** Caçada: mana no começo do próximo ciclo (para o próximo crédito continuar dela). */
  mana?: number;
  /** Caçada: buff e escudo que ainda valem no começo do próximo ciclo. */
  aura?: SpellAura;
}

export const emptyGains = (): Gains => ({ actions: 0, items: {}, xp: {} });

/**
 * Produção: como a coleta, mas cada ação gasta materiais do banco. Quando
 * acabam, a atividade termina sozinha (online e offline, do mesmo jeito).
 */
/** Produção: cada nível acima do da receita deixa 0,5% mais rápida (até +25%), como a coleta. */
export function productionSpeed(skill: SkillId, recipeId: string, skillXp: number, extra = 0): number {
  const recipe = recipeById(skill, recipeId);
  if (!recipe) return 0;
  // `extra`: a patente da Guilda, por cima do bônus de nível.
  return Math.min(GATHER_LEVEL_SPEED_MAX, Math.max(0, levelForXp(skillXp, skill) - recipe.level) * GATHER_SPEED_PER_LEVEL) + extra;
}

/** Tempo de uma produção com a velocidade aplicada. */
export const productionIntervalMs = (recipe: { intervalMs: number }, speed: number) => Math.round(recipe.intervalMs / (1 + speed));

export function simulateProduction(activity: Activity, now: number, bank: Record<string, number>, speed = 0): SimResult {
  const recipe = recipeById(activity.skill, activity.node);
  const base = { since: activity.since, seq: activity.seq, ended: false };
  if (!recipe) return { ...base, ended: true, gains: emptyGains() };
  const canMake = craftableCount(recipe, bank);
  if (canMake === 0) return { ...base, ended: true, gains: emptyGains() };
  if (now <= activity.since) return { ...base, gains: emptyGains() };

  const elapsed = now - activity.since;
  const counted = Math.min(elapsed, OFFLINE_CAP_MS);
  const interval = productionIntervalMs(recipe, speed);
  const byTime = Math.floor(counted / interval);
  const actions = Math.min(byTime, canMake);
  const ended = actions === canMake;
  const since = !ended && elapsed > OFFLINE_CAP_MS
    ? now - (counted % interval)
    : activity.since + actions * interval;
  if (actions === 0) return { ...base, since, gains: emptyGains() };

  const items: Record<string, number> = { [recipe.output]: actions * (recipe.outputQty ?? 1) };
  for (const [item, qty] of Object.entries(recipe.inputs)) items[item] = (items[item] ?? 0) - qty * actions;
  return { since, seq: activity.seq, ended, gains: { actions, items, xp: { [activity.skill]: actions * recipe.xp } } };
}

// ── Velocidade de coleta ────────────────────────────────────────────────────

/** Cada nível acima do mínimo do ponto deixa a coleta 0,5% mais rápida (até +25%). */
export const GATHER_SPEED_PER_LEVEL = 0.005;
export const GATHER_LEVEL_SPEED_MAX = 0.25;
/** O mascote da skill acelera +10% (além do XP). */
export const GATHER_PET_SPEED = 0.1;
/** Teto de tudo somado (nível + ferramenta + mascote): no máximo o dobro da velocidade (a ferramenta primordial dá +44%). */
export const GATHER_SPEED_MAX = 1;

/**
 * Quanto mais rápida a coleta fica (0.2 = 20% mais rápida): nível acima do ponto,
 * ferramenta equipada da mesma skill (`equip.toolSkill`/`toolSpeed`) e o mascote da skill.
 */
export function gatherSpeed(
  skill: SkillId,
  nodeId: string,
  skillXp: number,
  opts: { petSkill?: SkillId | null; petSkills?: SkillId[]; toolSpeed?: number } = {},
): number {
  const node = nodeById(skill, nodeId);
  if (!node) return 0;
  const above = Math.max(0, levelForXp(skillXp, skill) - node.level);
  let speed = Math.min(GATHER_LEVEL_SPEED_MAX, above * GATHER_SPEED_PER_LEVEL);
  speed += opts.toolSpeed ?? 0;
  if (opts.petSkill === skill || opts.petSkills?.includes(skill)) speed += GATHER_PET_SPEED;
  return Math.min(GATHER_SPEED_MAX, speed);
}

/** Tempo de uma coleta com a velocidade aplicada (20% mais rápida = intervalo / 1,2). */
export const gatherIntervalMs = (node: ResourceNode, speed: number) => Math.round(node.intervalMs / (1 + speed));

/**
 * Coleta: quantas ações completaram entre `activity.since` e `now`, e onde a
 * próxima começa. Mesmo código no tick online e na volta do offline.
 */
/** Coleta muito acima do nível do ponto: a partir de 10 níveis acima, +1% por nível de vir 1 item extra (até 40%). */
export const GATHER_EXTRA_FROM = 10;
export const GATHER_EXTRA_PER_LEVEL = 0.01;
export const GATHER_EXTRA_MAX = 0.4;
export const gatherExtraChance = (skillLevel: number, nodeLevel: number) =>
  Math.min(GATHER_EXTRA_MAX, Math.max(0, skillLevel - nodeLevel - GATHER_EXTRA_FROM) * GATHER_EXTRA_PER_LEVEL);

/** Lenhador: de vez em quando cai um ninho de pássaro da árvore, com penas (mais nas árvores altas). */
export const BIRD_NEST_CHANCE = 0.015;
export const birdNestFeathers = (treeLevel: number) => 3 + Math.floor(treeLevel / 10);

export function simulateGathering(activity: Activity, now: number, speed = 0, extraChance = 0): SimResult {
  const node = nodeById(activity.skill, activity.node);
  const base = { since: activity.since, seq: activity.seq, ended: false };
  if (!node || now <= activity.since) return { ...base, gains: emptyGains() };

  const interval = gatherIntervalMs(node, speed);
  const elapsed = now - activity.since;
  const counted = Math.min(elapsed, OFFLINE_CAP_MS);
  const actions = Math.floor(counted / interval);
  // Passou do teto: o excedente é descartado e a próxima ação recomeça a partir de agora.
  const since = elapsed > OFFLINE_CAP_MS
    ? now - (counted % interval)
    : activity.since + actions * interval;

  if (actions === 0) return { ...base, since, gains: emptyGains() };
  const items = gatherItems(node, actions + extraRolls(actions, extraChance, activity.seed ^ Math.floor(activity.since / 1000) ^ 0x9e3779b9), activity.seed ^ Math.floor(activity.since / 1000));
  if (activity.skill === 'woodcutting') {
    const nests = extraRolls(actions, BIRD_NEST_CHANCE, activity.seed ^ Math.floor(activity.since / 1000) ^ 0x5bd1e995);
    if (nests > 0) items.feather = (items.feather ?? 0) + nests * birdNestFeathers(node.level);
  }
  return {
    ...base,
    since,
    gains: { actions, items, xp: { [activity.skill]: actions * node.xp } },
  };
}

/** Itens de `count` coletas: o item do ponto, ou o sorteio dele. */
function gatherItems(node: ResourceNode, count: number, seed: number): Record<string, number> {
  return node.drops?.length ? rollDrops(node.drops, count, seed) : { [node.item]: count };
}

/** Quantas das `actions` coletas rendem 1 extra, com chance `chance` cada (semente fixa). */
export function extraRolls(actions: number, chance: number, seed: number): number {
  if (chance <= 0 || actions <= 0) return 0;
  const rand = seededRand(seed);
  let n = 0;
  for (let i = 0; i < actions; i++) if (rand() < chance) n++;
  return n;
}

function seededRand(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reparte as ações entre os itens do sorteio, pelo peso (semente fixa: o mesmo trecho dá o mesmo resultado). */
export function rollDrops(drops: { item: string; weight: number }[], actions: number, seed: number): Record<string, number> {
  const total = drops.reduce((a, d) => a + d.weight, 0);
  const rand = seededRand(seed);
  const out: Record<string, number> = {};
  for (let i = 0; i < actions; i++) {
    let roll = rand() * total;
    let pick = drops[drops.length - 1].item;
    for (const d of drops) {
      if (roll < d.weight) { pick = d.item; break; }
      roll -= d.weight;
    }
    out[pick] = (out[pick] ?? 0) + 1;
  }
  return out;
}
