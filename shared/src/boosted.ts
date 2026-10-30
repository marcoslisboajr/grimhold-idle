import huntsData from '../data/hunts.json';
import monstersData from '../data/monsters.json';
import type { Hunt, Monster } from './combat.ts';
import { PROFESSIONS, type SkillId } from './skills.ts';

/** Multiplicador de XP concedido pela Criatura do Dia (+30%). */
export const BOOSTED_XP_MULT = 1.3;

/** Multiplicador de chance de loot da Criatura do Dia (+50%). */
export const BOOSTED_LOOT_MULT = 1.5;

const hunts = huntsData as Hunt[];
const monsters = monstersData as Monster[];

/**
 * Lista de monstros elegíveis para serem a Criatura do Dia:
 * Todos os monstros que aparecem em caçadas regulares (sem instâncias nem covis de chefe).
 */
export const BOOSTED_MONSTER_POOL: string[] = Array.from(
  new Set(hunts.filter((h) => !h.boss && !h.lair).flatMap((h) => h.monsters)),
).sort();

export const EARLY_GAME_MONSTERS = ['sewer_rat', 'cellar_bat', 'sewer_slime', 'young_boar', 'grove_beetle', 'marsh_toad', 'kobold', 'kobold_slinger', 'kobold_mystic',
  'camp_wolf', 'mire_lizard', 'bog_toad', 'bog_spider', 'bog_witch', 'mine_golem', 'young_rock_elemental', 'gallery_bat', 'isle_raven', 'isle_harpy', 'royal_falcon'];
export const PRIMEVAL_MONSTERS = ['primal_raptor', 'raptor_alpha', 'megaloceros', 'valley_sauropod', 'sky_pterosaur', 'cave_brute', 'young_tyrant', 'fire_pterosaur', 'primal_shaman',
  // Jardim Corrompido (375-400), mesma data.
  'raging_pinecoon', 'moss_golem', 'wandering_lantern', 'thorn_cactus', 'rotten_golem', 'thorn_pinecoon', 'blight_cactus', 'corrupted_lantern', 'venom_pinecoon',
  // Cidadela do Usurpador (400-425), mesma data.
  'usurper_knight', 'usurper_archer', 'usurper_warlock', 'usurper_legionary', 'factory_bandit', 'usurper_officer', 'usurper_elite', 'usurper_shadowcaster', 'usurper_marshal',
  // Templo da Cobra (425-450), mesma data.
  'cobra_warrior', 'cobra_scout', 'cobra_assassin', 'cobra_venomancer', 'cobra_thrall', 'cobra_blade', 'cobra_vizier', 'cobra_oracle', 'cobra_executioner',
  // Torre dos Bruxos (450-475), mesma data.
  'tower_warlock', 'arcane_apprentice', 'devoted_guard', 'infernalist', 'ember_acolyte', 'tower_devoted', 'tower_fanatic', 'void_warlock', 'grand_devoted',
  // Caverna dos Heróis (475-500), mesma data.
  'fallen_warrior', 'fallen_ranger', 'fallen_mage', 'fallen_cleric', 'hero_vigilante', 'hero_monk', 'champion_knight', 'shadow_heroine', 'lost_paladin'];

export const REGIONS_500_MONSTERS = ["star_herald", "void_hound", "astral_chimera", "star_warlock", "cosmic_scribe", "fallen_star_angel", "star_phoenix", "void_harpy", "star_lantern", "astral_lich", "celestial_sentinel", "star_medusa", "winter_wolf", "snow_raptor", "frost_giant", "blizzard_asura", "frost_knight", "glacial_mammoth", "eternal_frost_dragon", "ice_pterosaur", "polar_boar", "glacial_hydra", "ice_golem", "glacial_beast", "necro_legionary", "bone_duelist", "plague_bat", "royal_mummy", "royal_wraith", "bone_high_priest", "supreme_necromancer", "bone_warden", "spectral_knight", "elder_lich", "catacomb_monarch", "bone_shield_warden", "chaos_dragon", "hell_cerberus", "chaos_cultist", "chaos_infernalist", "abyss_acolyte", "ash_cherub", "dark_archangel", "chaos_chimera", "chaos_fanatic", "chaos_knight", "chaos_lord", "chaos_marshal"];

export const REGIONS_600_MONSTERS = [
  "primordial_stalker", "primordial_drake", "abyss_watcher", "void_arcanist", "shadow_inquisitor", "void_gargoyle", "eclipse_harpy", "shadow_seraph", "void_manticore", "void_sovereign", "null_sentinel", "abyssal_eidolon",
  "stone_titan", "crag_claw", "granite_beast", "colossus_sentinel", "earth_shaman", "basalt_guardian", "storm_pterosaur", "thunder_elemental", "mountain_wyvern", "titan_overlord", "obsidian_golem", "forge_master_spirit",
  "black_sun_crusader", "solar_hellhound", "flame_strider", "ashen_hierophant", "dread_catacomb_guard", "cinder_wraith", "solar_phoenix", "darkflame_cultist", "ashen_dreadnought", "black_sun_avatar", "flame_monarch", "cinder_gargoyle",
  "twilight_vanguard", "twilight_stalker", "ethereal_herald", "twilight_archon", "lunar_sorceress", "celestial_lion", "twilight_dragon", "astral_gryphon", "twilight_valkyrie", "twilight_emperor", "astral_templar", "twilight_oracle"
];

/**
 * Monstro novo só entra no rodízio a partir de um dia (UTC): publicar caçadas no meio do dia
 * mudava a lista e trocava a Criatura do Dia na hora (Asuras, 17/10).
 */
const BOOSTED_MONSTER_SINCE_DAY: Record<string, number> = Object.fromEntries(
  ['asura_matriarch', 'asura_sentinel', 'dawnfire_asura', 'dawnfire_dancer', 'frost_asura', 'frost_maiden', 'midnight_asura', 'midnight_stalker', 'true_asura', 'corrupted_beast', 'twisted_branch',
    // Abismo Afogado (18/10).
    'abyss_warrior', 'abyss_spearman', 'abyssal_jelly', 'abyss_tidecaller', 'abyssal_turtle', 'sea_hydra', 'abyssal_siren', 'elder_hydra', 'abyss_champion'].map(
    (id) => [id, Date.UTC(2026, 9, 19) / 86_400_000],
  ).concat(
    // Early game e regiões do 350 ao 500 (20/10): entram no dia 23/10, depois do deploy.
    [...EARLY_GAME_MONSTERS, ...PRIMEVAL_MONSTERS].map((id) => [id, Date.UTC(2026, 9, 23) / 86_400_000]),
  ).concat(
    // Regiões do 500 ao 600 (27/10, gen_500_600.py): entram no dia 29/10, depois do deploy.
    REGIONS_500_MONSTERS.map((id) => [id, Date.UTC(2026, 9, 29) / 86_400_000]),
  ).concat(
    // Regiões do 600 ao 700 (scripts/data/gen_600_700.py): entram no dia 31/10.
    REGIONS_600_MONSTERS.map((id) => [id, Date.UTC(2026, 9, 31) / 86_400_000]),
  ),
);

/** O rodízio de um dia: a lista daquele dia embaralhada (sempre na mesma ordem para a mesma lista). */
const rotations = new Map<number, string[]>();
function rotationFor(day: number): string[] {
  const pool = BOOSTED_MONSTER_POOL.filter((id) => (BOOSTED_MONSTER_SINCE_DAY[id] ?? 0) <= day);
  let out = rotations.get(pool.length);
  if (out) return out;
  out = [...pool];
  let seed = 0xb005ed;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  rotations.set(pool.length, out);
  return out;
}

/**
 * Retorna o ID da Criatura do Dia baseado no dia UTC (rotaciona à meia-noite UTC).
 * Rodízio: cada dia é o próximo da lista embaralhada, então nenhuma se repete antes de passarem todas.
 */
export function getBoostedCreature(date: Date = new Date()): string {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  const rotation = rotationFor(day);
  return rotation[day % rotation.length];
}

/** XP a mais na Skill do Dia (+50%). */
export const BOOSTED_SKILL_XP_MULT = 1.5;

/**
 * Skill do Dia: uma profissão (nunca combate) sorteada pelo dia UTC, como a Criatura do Dia.
 * Semente própria para não andar junto com a criatura.
 */
/**
 * Rodízio fixo da Skill do Dia desde 19/10 (UTC): nenhuma repete antes de todas pegarem o bônus.
 * Começa pela forja, depois as que nunca tiveram (Sigilismo, Joalheria) e as outras da que pegou
 * há mais tempo para a mais recente; a mineração (18/10) fecha a volta. Profissão nova: pôr no fim.
 */
export const BOOSTED_SKILL_CYCLE_START_DAY = Date.UTC(2026, 9, 19) / 86_400_000;
export const BOOSTED_SKILL_CYCLE: SkillId[] = [
  'smithing', 'sigilism', 'jewelcrafting', 'woodcutting', 'runecraft', 'fletching', 'cooking',
  'herbalism', 'soulreaping', 'fishing', 'crafting', 'alchemy', 'mining',
];

export function getBoostedSkill(date: Date = new Date()): SkillId {
  const day = Math.floor(date.getTime() / 86_400_000);
  if (day >= BOOSTED_SKILL_CYCLE_START_DAY) return BOOSTED_SKILL_CYCLE[(day - BOOSTED_SKILL_CYCLE_START_DAY) % BOOSTED_SKILL_CYCLE.length];
  const pool = boostedPool(day);
  const today = skillIndex(day) % pool.length;
  // Não repete a de ontem: pula para a próxima.
  const before = boostedPool(day - 1);
  const yesterday = before[skillIndex(day - 1) % before.length];
  return pool[pool[today] === yesterday ? (today + 1) % pool.length : today];
}

/**
 * Skill nova só entra no sorteio a partir de um dia (UTC): publicar uma skill no meio
 * do dia não troca a Skill do Dia de quem já está treinando.
 */
const BOOSTED_SINCE_DAY: Partial<Record<SkillId, number>> = {
  sigilism: Date.UTC(2026, 9, 11) / 86_400_000,
  jewelcrafting: Date.UTC(2026, 9, 15) / 86_400_000,
};
const boostedPool = (day: number) => PROFESSIONS.filter((s) => (BOOSTED_SINCE_DAY[s] ?? 0) <= day);

/** Sorteio cru do dia (número de dias desde 1970, UTC). */
function skillIndex(day: number): number {
  // Mistura de bits (os bits baixos de um LCG repetem e deixavam profissões de fora).
  let h = (day ^ 0x5c1a7e) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Multiplicador da Skill do Dia para esta skill neste instante (1 se não é ela). */
export const boostedSkillMult = (skill: SkillId, at: number) => (getBoostedSkill(new Date(at)) === skill ? BOOSTED_SKILL_XP_MULT : 1);

/**
 * Aplica os bônus de Criatura do Dia nos monstros correspondentes.
 */
export function applyBoosted(monstersList: Monster[], boostedId?: string): Monster[] {
  if (!boostedId) return monstersList;
  return monstersList.map((m) => {
    if (m.id !== boostedId) return m;
    return {
      ...m,
      xp: Math.round(m.xp * BOOSTED_XP_MULT),
      loot: m.loot.map((l) => (l.item === 'gold' ? l : { ...l, chance: Math.min(1, l.chance * BOOSTED_LOOT_MULT) })),
    };
  });
}
