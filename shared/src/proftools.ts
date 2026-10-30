import { ITEMS, levelForXp, type SkillId } from './skills.ts';

/**
 * Ferramentas e roupas de profissão (estilo RuneScape). Valem direto do depósito, como um
 * cinto de ferramentas: não ocupam espaço de equipamento nem precisam ser trocadas.
 * - Ferramenta: a melhor que você tem e pode usar (nível da profissão) acelera a coleta e dá um pouco de XP.
 * - Roupa: cada peça diferente que você tem dá XP na profissão; as 4 juntas dão um bônus a mais.
 *   Coleta tem uma roupa por profissão; as profissões de criação dividem a Roupa de Artesão.
 */

export type OutfitGroup = 'mining' | 'woodcutting' | 'fishing' | 'herbalism' | 'soulreaping' | 'artisan';
export type OutfitPiece = 'head' | 'body' | 'legs' | 'feet';
export const OUTFIT_PIECES: OutfitPiece[] = ['head', 'body', 'legs', 'feet'];

/** XP na profissão por peça de roupa, e o extra da roupa completa (4 peças = +10%). */
export const OUTFIT_XP_PER_PIECE = 0.02;
export const OUTFIT_SET_BONUS = 0.02;
/** Chance por ação de achar uma peça da roupa da profissão (uma a cada ~3000 coletas ou criações). */
export const OUTFIT_DROP_CHANCE = 1 / 3000;

const GATHERING_GROUPS = new Set<string>(['mining', 'woodcutting', 'fishing', 'herbalism', 'soulreaping']);
const COMBAT = new Set<string>(['combat', 'melee', 'ranged', 'magic_level', 'shielding']);

/** De que roupa a profissão se beneficia (nenhuma para as skills de combate). */
export function outfitGroupFor(skill: SkillId): OutfitGroup | null {
  if (COMBAT.has(skill)) return null;
  return GATHERING_GROUPS.has(skill) ? (skill as OutfitGroup) : 'artisan';
}

/** Ferramentas da profissão, da mais fraca para a mais forte. */
export const toolsFor = (skill: SkillId) =>
  ITEMS.filter((i) => i.tool?.skill === skill).sort((a, b) => a.tool!.level - b.tool!.level);

/** A melhor ferramenta que o jogador tem no depósito e já pode usar. */
export function bestTool(skill: SkillId, skillXp: number, bank: Record<string, number> | undefined) {
  if (!bank) return undefined;
  const level = levelForXp(skillXp, skill);
  let best: (typeof ITEMS)[number] | undefined;
  for (const it of toolsFor(skill)) if ((bank[it.id] ?? 0) > 0 && it.tool!.level <= level) best = it;
  return best;
}

/** Peças da roupa do grupo, na ordem cabeça, corpo, pernas, pés. */
export const outfitItems = (group: OutfitGroup) =>
  OUTFIT_PIECES.map((piece) => ITEMS.find((i) => i.outfit?.group === group && i.outfit.piece === piece)).filter((i): i is (typeof ITEMS)[number] => !!i);

/** Quantas peças diferentes da roupa da profissão o jogador tem (0 a 4). */
export function outfitCount(skill: SkillId, bank: Record<string, number> | undefined): number {
  const group = outfitGroupFor(skill);
  if (!group || !bank) return 0;
  return outfitItems(group).filter((i) => (bank[i.id] ?? 0) > 0).length;
}

/** Multiplicador de XP da profissão pela ferramenta e pela roupa (1 = sem bônus). */
export function professionGearXpMult(skill: SkillId, skillXp: number, bank: Record<string, number> | undefined): number {
  const pieces = outfitCount(skill, bank);
  const outfit = pieces * OUTFIT_XP_PER_PIECE + (pieces === OUTFIT_PIECES.length ? OUTFIT_SET_BONUS : 0);
  return 1 + (bestTool(skill, skillXp, bank)?.tool?.xp ?? 0) + outfit;
}

/**
 * Velocidade das ferramentas na profissão: a melhor da profissão mais a da Ferramenta do Mestre
 * Coletor (quest A Colheita do Mestre), que soma por cima nas profissões dela.
 */
/**
 * Coleta (mineração, lenhador, pesca, herbalismo, ceifa): a ferramenta (e a multiferramenta, se tiver) dá chance
 * por ação de vir um item a mais (20/10): 1,25x a velocidade delas (bronze 5% ... primordial 55%). É sorteio a
 * cada ação, não item garantido. Soma com a chance de item extra pelo nível; uma ação rende no máximo o dobro.
 */
export const MINING_TOOL_YIELD = 1.25;
export function toolYieldFor(skill: SkillId, skillXp: number, bank: Record<string, number> | undefined): number {
  if (!GATHERING_GROUPS.has(skill)) return 0;
  return +(toolSpeedFor(skill, skillXp, bank) * MINING_TOOL_YIELD).toFixed(3);
}

export function toolSpeedFor(skill: SkillId, skillXp: number, bank: Record<string, number> | undefined): number {
  const own = bestTool(skill, skillXp, bank)?.tool?.speed ?? 0;
  const multi = bank ? ITEMS.filter((i) => i.multitool?.skills.includes(skill) && (bank[i.id] ?? 0) > 0).reduce((n, i) => n + i.multitool!.speed, 0) : 0;
  return own + multi;
}

/** A ferramenta de várias profissões que o jogador tem e vale nesta profissão. */
export const multitoolFor = (skill: SkillId, bank: Record<string, number> | undefined) =>
  bank ? ITEMS.find((i) => i.multitool?.skills.includes(skill) && (bank[i.id] ?? 0) > 0) : undefined;
