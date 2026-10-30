import { HUNTS, rngFor } from './combat.ts';
import { RAID_FRAGMENT_ID, RAID_MIN_LEVEL, RAIDS } from './raids.ts';
import type { QuestGoal } from './quests.ts';
import { NODES, levelForXp, xpForLevel, type GatheringSkillId, type SkillId } from './skills.ts';
import { IMBUEMENT_MATERIALS, PREY_WILDCARD } from './task_shop.ts';

// ── Tarefas diárias ─────────────────────────────────────────────────────────

/** Uma tarefa do dia: o objetivo (mesmo formato das quests) e a recompensa. */
export interface Daily {
  name: string;
  en?: string;
  category?: 'daily' | 'endgame_daily' | 'endgame_weekly';
  goal: QuestGoal;
  reward: { gold: number; xp: Partial<Record<SkillId, number>>; items?: Record<string, number> };
  /** Onde/o quê (nome em português da caçada ou do item), mostrado embaixo do nome. */
  where?: string;
}

export interface DailyState {
  idx: number;
  progress: number;
  claimed: boolean;
}

export const DAILY_COUNT = 3;
/** XP de cada diária: esta fração do que falta para o próximo nível (vezes o peso da tarefa). */
export const DAILY_LEVEL_SHARE = 0.04;

/** Dia (UTC) de um instante, no formato AAAA-MM-DD: as diárias trocam à meia-noite UTC. */
export const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

type Template = (level: number) => Omit<Daily, 'reward'> & { weight: number };
const TEMPLATES: Template[] = [
  (lv) => ({ name: 'Limpar a região', goal: { kind: 'kill', monsters: [], count: Math.min(250, 30 + lv * 3) }, weight: 1.2 }),
  () => ({ name: 'Minério para a forja', goal: { kind: 'obtain', item: 'copper_ore', count: 40 }, weight: 0.8 }),
  () => ({ name: 'Rede cheia', goal: { kind: 'obtain', item: 'raw_shrimp', count: 40 }, weight: 0.8 }),
  () => ({ name: 'Lenha para o inverno', goal: { kind: 'obtain', item: 'logs', count: 40 }, weight: 0.8 }),
  () => ({ name: 'Cozinha do quartel', goal: { kind: 'obtain', item: 'cooked_shrimp', count: 25 }, weight: 1 }),
  () => ({ name: 'Barras de bronze', goal: { kind: 'obtain', item: 'bronze_bar', count: 15 }, weight: 1 }),
  () => ({ name: 'Couro curtido', goal: { kind: 'obtain', item: 'leather', count: 20 }, weight: 1 }),
  () => ({ name: 'Negócio do dia', goal: { kind: 'sell', count: 40 }, weight: 0.7 }),
];

/** Diárias novas (do nível do jogador) a partir deste dia; antes dele, as antigas (não troca a de quem já estava no meio). */
export const DAILY_V2_FROM = '2026-10-25';

const dailyReward = (level: number, weight: number) => ({
  gold: Math.round((60 + level * 25 + level * level * 2) * weight),
  xp: { combat: Math.round(Math.max(150 + level * level * 8, (xpForLevel(level + 1) - xpForLevel(level)) * DAILY_LEVEL_SHARE) * weight) },
});

/** Caçadas que valem para a diária: as comuns (sem chefe, covil, raide, quest, chave ou região trancada) até o nível. */
const DAILY_HUNTS = HUNTS.filter((h) => !h.boss && !h.lair && !h.raid && !h.quest && !h.key && !h.requires);
export const GATHER_SKILLS: GatheringSkillId[] = ['mining', 'fishing', 'woodcutting', 'herbalism', 'soulreaping'];
/** Minutos de coleta (no tempo base da ação) que a diária pede. */
export const DAILY_GATHER_MINUTES = 15;

/**
 * As diárias de um personagem num dia: sorteio estável (mesmo dia e personagem = mesmas tarefas).
 * Desde 25/10 pedem coisas do nível dele: uma espécie das caçadas da faixa, o material do ponto de coleta
 * mais alto que a profissão alcança, vender e abater (antes pediam cobre e camarão até no nível 300).
 * `skillXp`: XP das skills (para o nível de cada profissão).
 */
export function dailiesFor(
  characterId: number,
  day: string,
  level: number,
  skillXp: Partial<Record<SkillId, number>> = {},
  preferredSkills: GatheringSkillId[] = [],
): Daily[] {
  if (day < DAILY_V2_FROM) return legacyDailiesFor(characterId, day, level);
  const seed = [...day].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const rand = rngFor(seed, characterId + 7_000);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const out: (Omit<Daily, 'reward'> & { weight: number })[] = [];
  // Caçada: uma das 3 caçadas mais altas que o nível alcança.
  const hunts = DAILY_HUNTS.filter((h) => h.level <= Math.max(1, level)).sort((a, b) => b.level - a.level).slice(0, 3);
  if (hunts.length) {
    const h = pick(hunts);
    out.push({ name: 'Caçada do dia', en: 'Hunt of the day', where: h.name, goal: { kind: 'kill', monsters: h.monsters, count: Math.min(600, 80 + level * 2) }, weight: 1.3 });
  }
  // Coleta: duas profissões diferentes, no ponto mais alto que cada uma alcança.
  const validPreferred = preferredSkills.filter((s) => GATHER_SKILLS.includes(s));
  const uniquePreferred = [...new Set(validPreferred)];

  let chosenSkills: GatheringSkillId[];
  if (uniquePreferred.length === 0) {
    const skills = [...GATHER_SKILLS];
    chosenSkills = [
      skills.splice(Math.floor(rand() * skills.length), 1)[0],
      skills.splice(Math.floor(rand() * skills.length), 1)[0],
    ];
  } else if (uniquePreferred.length === 1) {
    const pref = uniquePreferred[0];
    const remaining = GATHER_SKILLS.filter((s) => s !== pref);
    const other = remaining.splice(Math.floor(rand() * remaining.length), 1)[0];
    chosenSkills = [pref, other];
  } else {
    const pool = [...uniquePreferred];
    chosenSkills = [
      pool.splice(Math.floor(rand() * pool.length), 1)[0],
      pool.splice(Math.floor(rand() * pool.length), 1)[0],
    ];
  }

  for (const skill of chosenSkills) {
    const lv = levelForXp(skillXp[skill] ?? 0, skill);
    const node = NODES[skill].filter((n) => n.level <= lv && !n.drops).sort((a, b) => b.level - a.level)[0];
    if (!node) continue;
    out.push({ name: 'Coleta do dia', en: 'Gathering of the day', where: node.item, goal: { kind: 'obtain', item: node.item, count: Math.max(15, Math.round((DAILY_GATHER_MINUTES * 60_000) / node.intervalMs)) }, weight: 1 });
  }
  out.push({ name: 'Negócio do dia', en: 'Deal of the day', goal: { kind: 'sell', count: Math.min(300, 40 + Math.round(level / 2)) }, weight: 0.7 });
  out.push({ name: 'Limpar a região', en: 'Clear the region', goal: { kind: 'kill', monsters: [], count: Math.min(800, 60 + level * 3) }, weight: 1.1 });
  const chosen: typeof out = [];
  while (chosen.length < DAILY_COUNT && out.length) chosen.push(out.splice(Math.floor(rand() * out.length), 1)[0]);
  return chosen.map(({ weight, ...d }) => ({ ...d, reward: dailyReward(level, weight) }));
}

// ── Baú diário (24/10) ──────────────────────────────────────────────────────

/** Fazer as 3 diárias abre o baú; cada dia seguido melhora o baú, até o 7º. Perder um dia volta ao 1. */
export const DAILY_CHEST_MAX_STREAK = 7;

/** Dia anterior (AAAA-MM-DD). */
export const prevDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Próximo dia (AAAA-MM-DD). */
export const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Sequência que o baú de hoje vale, dado o último dia aberto e a sequência dele. */
export function dailyChestStreak(lastDay: string | null, streak: number, day: string): number {
  if (lastDay === day) return streak;
  return lastDay === prevDay(day) ? Math.min(DAILY_CHEST_MAX_STREAK, streak + 1) : 1;
}

/** O que o baú dá: ouro (cresce com a sequência), pontos de charm (1 por dia de sequência) e, no 7º dia, curinga de prey e material de imbuement. */
export function dailyChestReward(level: number, streak: number, characterId: number, day: string): { gold: number; charmPoints: number; items: Record<string, number> } {
  const s = Math.max(1, Math.min(DAILY_CHEST_MAX_STREAK, streak));
  const gold = Math.round((60 + level * 25 + level * level * 2) * 1.5 * (1 + 0.15 * (s - 1)));
  const items: Record<string, number> = {};
  if (s >= DAILY_CHEST_MAX_STREAK) {
    const seed = [...day].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const mat = IMBUEMENT_MATERIALS[Math.floor(rngFor(seed, characterId + 9_000)() * IMBUEMENT_MATERIALS.length)];
    items[PREY_WILDCARD] = 1;
    if (mat) items[mat] = 10;
  }
  return { gold, charmPoints: s, items };
}

/** Diárias de antes de 25/10 (cobre, camarão, toras...). */
function legacyDailiesFor(characterId: number, day: string, level: number): Daily[] {
  const seed = [...day].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const rand = rngFor(seed, characterId);
  const pool = [...TEMPLATES];
  const out: Daily[] = [];
  while (out.length < DAILY_COUNT && pool.length) {
    const i = Math.floor(rand() * pool.length);
    const t = pool.splice(i, 1)[0](level);
    out.push({
      name: t.name,
      goal: t.goal,
      // A XP acompanha a curva (4% de um nível por tarefa): o valor fixo antigo virava nada acima do 80.
      reward: {
        gold: Math.round((60 + level * 25 + level * level * 2) * t.weight),
        xp: { combat: Math.round(Math.max(150 + level * level * 8, (xpForLevel(level + 1) - xpForLevel(level)) * DAILY_LEVEL_SHARE) * t.weight) },
      },
    });
  }
  return out;
}

// ── Conquistas ──────────────────────────────────────────────────────────────

/** Contadores que o servidor guarda por personagem. */
export type StatKey = 'kills' | 'bosses' | 'sold' | 'quests' | 'dailies' | 'crafted' | 'arenas' | 'hunting_points' | 'rashid_sales' | 'hunting_points_spent' | 'charm_bonus' | 'immortal_slain' | 'guild_points' | 'guild_spent' | 'guild_done' | 'slayer_boss';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Um contador, ou o nível de uma skill. */
  target: { stat: StatKey; count: number } | { skill: SkillId; level: number };
}

const tiers = (id: string, names: string[], stat: StatKey, counts: number[], what: string): Achievement[] =>
  counts.map((count, i) => ({ id: `${id}_${i + 1}`, name: names[i], description: `${what}: ${count.toLocaleString('pt-BR')}`, target: { stat, count } }));

const SKILL_TITLES: Record<string, [string, string]> = {
  mining: ['Minerador', 'Mineração'],
  smithing: ['Ferreiro', 'Forja'],
  fishing: ['Pescador', 'Pesca'],
  cooking: ['Cozinheiro', 'Culinária'],
  woodcutting: ['Lenhador', 'Lenhador'],
  crafting: ['Artesão', 'Artesanato'],
  herbalism: ['Herbalista', 'Herbalismo'],
  soulreaping: ['Ceifador', 'Colheita de Almas'],
  alchemy: ['Alquimista', 'Alquimia'],
  runecraft: ['Runista', 'Criação de Runas'],
  sigilism: ['Sigilista', 'Sigilismo'],
  jewelcrafting: ['Joalheiro', 'Joalheria'],
};

export const ACHIEVEMENTS: Achievement[] = [
  ...tiers('kills', ['Primeiro Sangue', 'Caçador', 'Matador', 'Flagelo', 'Lenda das Caçadas'], 'kills', [1, 100, 1000, 10000, 50000], 'Monstros abatidos'),
  ...tiers('bosses', ['Desafiante', 'Caça-Chefes', 'Terror dos Tronos'], 'bosses', [1, 10, 50], 'Instâncias de chefe vencidas'),
  ...tiers('quests', ['Aprendiz', 'Discípulo', 'Braço dos Mestres'], 'quests', [1, 5, 15], 'Quests entregues'),
  ...tiers('dailies', ['Rotina', 'Disciplina', 'Incansável'], 'dailies', [1, 30, 150], 'Tarefas diárias feitas'),
  ...tiers('sold', ['Mascate', 'Negociante', 'Magnata'], 'sold', [50, 1000, 10000], 'Itens vendidos ao Mercador'),
  ...tiers('crafted', ['Mãos Hábeis', 'Produtor', 'Mestre de Ofício'], 'crafted', [10, 500, 5000], 'Itens produzidos'),
  ...[10, 25, 50, 75].map((level, i) => ({
    id: `level_${i + 1}`,
    name: ['Veterano', 'Herói do Bastião', 'Campeão', 'Lenda de Grimhold'][i],
    description: `Nível ${level} de combate`,
    target: { skill: 'combat' as SkillId, level },
  })),
  { id: 'immortal_slayer', name: 'Matador do Imortal', description: "Derrubou Ghaz'Morath, o Imortal", target: { stat: 'immortal_slain', count: 1 } },
  ...Object.entries(SKILL_TITLES).map(([skill, [title, name]]) => ({
    id: `${skill}_mastery`,
    name: `Mestre ${title}`,
    description: `Nível 30 de ${name}`,
    target: { skill: skill as SkillId, level: 30 },
  })),
];

export const ENDGAME_DAILY_MIN_LEVEL = RAID_MIN_LEVEL;
export const ENDGAME_DAILY_IDX_BASE = 100;
export const ENDGAME_WEEKLY_IDX_BASE = 200;

const MONSTERS_400_PLUS = Array.from(
  new Set(HUNTS.filter((h) => h.level >= ENDGAME_DAILY_MIN_LEVEL && !h.boss && !h.lair && !h.raid).flatMap((h) => h.monsters)),
);
const LAIRS_400_PLUS = HUNTS.filter((h) => h.level >= ENDGAME_DAILY_MIN_LEVEL && h.lair).map((h) => h.id);
const T8_MATERIALS: { item: string; namePt: string; nameEn: string }[] = [
  { item: 'primordial_ore', namePt: '30 Minérios Primordiais', nameEn: '30 Primordial Ores' },
  { item: 'worldtree_logs', namePt: '30 Toras da Árvore do Mundo', nameEn: '30 Worldtree Logs' },
  { item: 'celestial_lily', namePt: '30 Lírios Celestiais', nameEn: '30 Celestial Lilies' },
  { item: 'primordial_soul', namePt: '30 Almas Primordiais', nameEn: '30 Primordial Souls' },
];

/**
 * 3 diárias de fim de jogo (nível 400+): abater monstros do 400+, limpar 1 covil do 400+ e entregar
 * material T8. Dão ouro e 1–2 Fragmentos de Raide, sem XP de combate nem Pontos de Maestria.
 */
export function endgameDailiesFor(characterId: number, day: string, level: number): Daily[] {
  if (level < ENDGAME_DAILY_MIN_LEVEL) return [];
  const seed = [...day].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const rand = rngFor(seed, characterId + 40_000);
  const mat = T8_MATERIALS[Math.floor(rand() * T8_MATERIALS.length)];
  return [
    {
      name: 'Expurgo do 400+ (400 abates)',
      en: '400+ Purge (400 kills)',
      category: 'endgame_daily',
      goal: { kind: 'kill', monsters: MONSTERS_400_PLUS, count: 400 },
      reward: { gold: 150_000, xp: {}, items: { [RAID_FRAGMENT_ID]: 2 } },
    },
    {
      name: 'Caçador de Covis (1 covil 400+)',
      en: 'Lair Hunter (1 400+ lair)',
      category: 'endgame_daily',
      goal: { kind: 'lair', hunts: LAIRS_400_PLUS, count: 1 },
      reward: { gold: 120_000, xp: {}, items: { [RAID_FRAGMENT_ID]: 1 } },
    },
    {
      name: `Tributo T8: entregar ${mat.namePt}`,
      en: `T8 Tribute: deliver ${mat.nameEn}`,
      category: 'endgame_daily',
      goal: { kind: 'deliver', item: mat.item, count: 30 },
      reward: { gold: 100_000, xp: {}, items: { [RAID_FRAGMENT_ID]: 1 } },
    },
  ];
}

/**
 * 2 semanais de fim de jogo (nível 400+): derrotar a raide da semana e acumular 5.000 abates em
 * caçadas do 400+. Dão mais ouro e 5 Fragmentos de Raide, sem XP de combate nem Pontos de Maestria.
 */
export function endgameWeekliesFor(_characterId: number, _week: string, level: number): Daily[] {
  if (level < ENDGAME_DAILY_MIN_LEVEL) return [];
  return [
    // Só com a raide ligada (antes ficava na lista sem ter como fazer).
    ...(RAIDS.some((r) => r.enabled) ? [{
      name: 'Conquistador da Raide Semanal',
      en: 'Weekly Raid Conqueror',
      category: 'endgame_weekly',
      goal: { kind: 'raid' as const, count: 1 },
      reward: { gold: 400_000, xp: {}, items: { [RAID_FRAGMENT_ID]: 5 } },
    } as Daily] : []),
    {
      name: 'Dizimador do 400+ (5.000 abates)',
      en: '400+ Decimator (5,000 kills)',
      category: 'endgame_weekly',
      goal: { kind: 'kill', monsters: MONSTERS_400_PLUS, count: 5000 },
      reward: { gold: 500_000, xp: {}, items: { [RAID_FRAGMENT_ID]: 5 } },
    },
  ];
}
