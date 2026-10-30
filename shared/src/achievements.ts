import { HUNTS, PROMOTIONS } from './combat.ts';
import { SKILLS, isCombatSkill, levelForXp, type SkillId } from './skills.ts';
import { STORIES } from './stories.ts';
import { ARENAS } from './arena.ts';
import { PETS } from './pets.ts';
import type { StatKey } from './dailies.ts';

/**
 * Conquistas (estilo RuneScape/WoW): saem do que o jogo já conta (abates, níveis, Bestiário, instâncias,
 * quests...). Cada uma vale pontos; as maiores dão um título para mostrar ao lado do nome.
 * O servidor grava quando cada uma foi conquistada (aviso na hora e ranking de pontos).
 */

export type AchCategory = 'combat' | 'bosses' | 'professions' | 'progress' | 'collection' | 'secret';
export const ACH_CATEGORIES: { id: AchCategory; name: [string, string] }[] = [
  { id: 'combat', name: ['Combate', 'Combat'] },
  { id: 'bosses', name: ['Chefes', 'Bosses'] },
  { id: 'professions', name: ['Profissões', 'Professions'] },
  { id: 'progress', name: ['Jornada', 'Journey'] },
  { id: 'collection', name: ['Coleção', 'Collection'] },
  { id: 'secret', name: ['Secretas', 'Secret'] },
];

/** O que as conquistas leem do personagem (tudo já vem no estado do jogador). */
export interface AchState {
  skills: Partial<Record<SkillId, number>>;
  stats: Partial<Record<StatKey, number>>;
  bestiary?: Record<string, number>;
  instanceClears?: Record<string, { total: number }>;
  stories?: { id: string; status: string }[];
  arenas?: { arenaId: string; status: string }[];
  unlockedPets?: string[];
  promotion?: string | null;
}

export interface AchDef {
  id: string;
  cat: AchCategory;
  name: [string, string];
  desc: [string, string];
  points: number;
  /** Título que a conquista libera (aparece ao lado do nome). */
  title?: [string, string];
  /** Escondida até conquistar. */
  secret?: boolean;
  /** Progresso atual e meta. */
  goal: (s: AchState) => [number, number];
}

const lvl = (s: AchState, skill: SkillId) => levelForXp(s.skills[skill] ?? 0, skill);
const stat = (s: AchState, k: StatKey) => s.stats[k] ?? 0;
const POINTS = [5, 10, 20, 40, 80, 120, 160];
const fmt = (n: number) => n.toLocaleString('pt-BR');

const list: AchDef[] = [];
/** Uma escada de conquistas da mesma coisa (cada degrau vale mais pontos). */
function tiers(
  id: string,
  cat: AchCategory,
  names: [string, string][],
  counts: number[],
  desc: (n: number) => [string, string],
  value: (s: AchState) => number,
  titles: Record<number, [string, string]> = {},
) {
  counts.forEach((count, i) =>
    list.push({ id: `${id}_${i + 1}`, cat, name: names[i], desc: desc(count), points: POINTS[Math.min(i, POINTS.length - 1)], title: titles[i], goal: (s) => [value(s), count] }),
  );
}

// ── Combate ────────────────────────────────────────────────────────────────
tiers(
  'kills', 'combat',
  [['Primeiro Sangue', 'First Blood'], ['Caçador', 'Hunter'], ['Matador', 'Slayer'], ['Flagelo', 'Scourge'], ['Lenda das Caçadas', 'Legend of the Hunt'], ['Ceifador de Hordas', 'Horde Reaper'], ['O Fim das Espécies', 'End of Species']],
  [1, 100, 1000, 10_000, 50_000, 250_000, 1_000_000],
  (n) => (n === 1 ? ['Abater o primeiro monstro', 'Slay your first monster'] : [`Abater ${fmt(n)} monstros`, `Slay ${fmt(n)} monsters`]),
  (s) => stat(s, 'kills'),
  { 4: ['Lenda das Caçadas', 'Legend of the Hunt'], 6: ['o Fim das Espécies', 'the End of Species'] },
);
tiers(
  'level', 'combat',
  [['Veterano', 'Veteran'], ['Herói do Bastião', 'Bastion Hero'], ['Campeão', 'Champion'], ['Lenda de Grimhold', 'Legend of Grimhold'], ['Centurião', 'Centurion'], ['Senhor da Guerra', 'Warlord'], ['Semideus', 'Demigod'], ['Além do Fim', 'Beyond the End'], ['Eterno', 'Eternal']],
  [10, 25, 50, 75, 100, 150, 200, 225, 250],
  (n) => [`Nível ${n} de combate`, `Combat level ${n}`],
  (s) => lvl(s, 'combat'),
  { 4: ['Centurião', 'Centurion'], 6: ['Semideus', 'Demigod'], 8: ['o Eterno', 'the Eternal'] },
);
tiers(
  'species', 'combat',
  [['Curioso', 'Curious'], ['Naturalista', 'Naturalist'], ['Bestiarista', 'Bestiarist'], ['Enciclopédia Viva', 'Living Encyclopedia']],
  [10, 50, 100, 200],
  (n) => [`Abater ${n} espécies diferentes`, `Slay ${n} different species`],
  (s) => Object.values(s.bestiary ?? {}).filter((k) => k > 0).length,
  { 3: ['Enciclopédia Viva', 'Living Encyclopedia'] },
);
const killsOf = (s: AchState, test: (id: string) => boolean) => Object.entries(s.bestiary ?? {}).reduce((n, [id, k]) => n + (test(id) ? k : 0), 0);
list.push(
  { id: 'dragonslayer', cat: 'combat', name: ['Matador de Dragões', 'Dragonslayer'], desc: ['Abater 1.000 dragões', 'Slay 1,000 dragons'], points: 40, title: ['Matador de Dragões', 'Dragonslayer'], goal: (s) => [killsOf(s, (id) => id.includes('dragon') || id.includes('wyrm') || id.includes('wyvern')), 1000] },
  { id: 'demonbane', cat: 'combat', name: ['Flagelo dos Demônios', 'Demonbane'], desc: ['Abater 1.000 demônios', 'Slay 1,000 demons'], points: 40, title: ['Flagelo dos Demônios', 'Demonbane'], goal: (s) => [killsOf(s, (id) => id.includes('demon') || id.includes('imp') || id.includes('devil')), 1000] },
  { id: 'undead_hunter', cat: 'combat', name: ['Caçador de Mortos-Vivos', 'Undead Hunter'], desc: ['Abater 1.000 mortos-vivos', 'Slay 1,000 undead'], points: 40, title: ['Caçador de Mortos-Vivos', 'Undead Hunter'], goal: (s) => [killsOf(s, (id) => /skeleton|lich|ghoul|mummy|zombie|wraith|ghost|vampire|bone/.test(id)), 1000] },
);

// ── Chefes ─────────────────────────────────────────────────────────────────
tiers(
  'bosses', 'bosses',
  [['Desafiante', 'Challenger'], ['Caça-Chefes', 'Boss Hunter'], ['Terror dos Tronos', 'Terror of Thrones'], ['Quebra-Coroas', 'Crownbreaker'], ['Rei dos Reis', 'King of Kings']],
  [1, 10, 50, 250, 1000],
  (n) => [`Vencer ${fmt(n)} instâncias`, `Clear ${fmt(n)} instances`],
  (s) => stat(s, 'bosses'),
  { 3: ['Quebra-Coroas', 'Crownbreaker'], 4: ['Rei dos Reis', 'King of Kings'] },
);
tiers(
  'slayer_boss', 'bosses',
  [['Encomenda de Chefe', 'Boss Contract'], ['Matador de Encomenda', 'Contract Slayer'], ['Flagelo dos Chefes', 'Bane of Bosses']],
  [1, 10, 50],
  (n) => [`Terminar ${fmt(n)} tarefas de chefe do Slayer`, `Finish ${fmt(n)} Slayer boss tasks`],
  (s) => stat(s, 'slayer_boss'),
  { 1: ['Matador de Encomenda', 'Contract Slayer'], 2: ['Flagelo dos Chefes', 'Bane of Bosses'] },
);
const INSTANCES = HUNTS.filter((h) => h.boss && !h.quest);
tiers(
  'instances', 'bosses',
  [['Explorador de Masmorras', 'Dungeon Explorer'], ['Desbravador', 'Pathfinder'], ['Conquistador', 'Conqueror']],
  [5, 20, INSTANCES.length],
  (n) => (n === INSTANCES.length ? ['Vencer todas as instâncias', 'Clear every instance'] : [`Vencer ${n} instâncias diferentes`, `Clear ${n} different instances`]),
  (s) => INSTANCES.filter((h) => (s.instanceClears?.[h.id]?.total ?? 0) > 0).length,
  { 2: ['o Conquistador', 'the Conqueror'] },
);
const LAIR_BOSSES = HUNTS.filter((h) => h.lair).map((h) => h.monsters[0]);
tiers(
  'lairs', 'bosses',
  [['Visitante dos Covis', 'Lair Visitor'], ['Caçador de Covis', 'Lair Hunter'], ['Senhor dos Covis', 'Lord of Lairs']],
  [1, 5, LAIR_BOSSES.length],
  (n) => (n === LAIR_BOSSES.length ? ['Derrotar todos os chefes de covil', 'Defeat every lair boss'] : [`Derrotar ${n} chefes de covil diferentes`, `Defeat ${n} different lair bosses`]),
  (s) => LAIR_BOSSES.filter((m) => (s.bestiary?.[m] ?? 0) > 0).length,
  { 2: ['Senhor dos Covis', 'Lord of Lairs'] },
);
const cleared = (id: string) => (s: AchState): [number, number] => [Math.min(1, s.instanceClears?.[id]?.total ?? 0), 1];
list.push(
  { id: 'ozzarak_down', cat: 'bosses', name: ['O Fim do Fim', 'The End of the End'], desc: ['Vencer o Fim de Ozzarak', "Clear Ozzarak's End"], points: 40, goal: cleared('ozzarak_end') },
  { id: 'void_queen_down', cat: 'bosses', name: ['Vazio Silenciado', 'Void Silenced'], desc: ['Vencer a Cidadela do Vazio', 'Clear the Void Citadel'], points: 40, goal: cleared('void_citadel') },
  { id: 'fallen_sky_down', cat: 'bosses', name: ['Céu Reconstruído', 'Sky Mended'], desc: ['Vencer o Céu Estilhaçado', 'Clear Shattered Heaven'], points: 80, goal: cleared('shattered_heaven') },
  { id: 'primal_chaos_down', cat: 'bosses', name: ['Ordem no Caos', 'Order from Chaos'], desc: ['Vencer o Coração do Caos Primordial', 'Clear the Heart of Primal Chaos'], points: 120, title: ['Domador do Caos', 'Chaos Tamer'], goal: cleared('primal_chaos') },
  { id: 'immortal_slayer', cat: 'bosses', name: ['Matador do Imortal', 'Immortal Slayer'], desc: ["Derrubar Ghaz'Morath, o Imortal", "Bring down Ghaz'Morath, the Immortal"], points: 80, title: ['Matador do Imortal', 'Immortal Slayer'], goal: (s) => [Math.min(1, stat(s, 'immortal_slain')), 1] },
);

// ── Profissões ─────────────────────────────────────────────────────────────
const PROF_TITLES: Partial<Record<SkillId, [string, string]>> = {
  mining: ['Minerador', 'Miner'], smithing: ['Ferreiro', 'Smith'], fishing: ['Pescador', 'Fisher'], cooking: ['Cozinheiro', 'Cook'],
  woodcutting: ['Lenhador', 'Woodcutter'], crafting: ['Artesão', 'Crafter'], herbalism: ['Herbalista', 'Herbalist'], soulreaping: ['Ceifador', 'Reaper'],
  alchemy: ['Alquimista', 'Alchemist'], runecraft: ['Runista', 'Runecrafter'], fletching: ['Flecheiro', 'Fletcher'], sigilism: ['Sigilista', 'Sigilist'],
  jewelcrafting: ['Joalheiro', 'Jeweler'],
};
for (const sk of SKILLS.filter((x) => !isCombatSkill(x.id))) {
  const [pt, en] = PROF_TITLES[sk.id] ?? [sk.name, sk.name];
  tiers(
    `${sk.id}_mastery`, 'professions',
    [[`${pt} Dedicado`, `Dedicated ${en}`], [`Mestre ${pt}`, `Master ${en}`], [`Grão-Mestre ${pt}`, `Grandmaster ${en}`]],
    [30, 60, 99],
    (n) => [`Nível ${n} de ${sk.name}`, `Level ${n} ${en.toLowerCase()}`],
    (s) => lvl(s, sk.id),
    { 2: [`Grão-Mestre ${pt}`, `Grandmaster ${en}`] },
  );
}
const skiller = (s: AchState) => SKILLS.filter((x) => !isCombatSkill(x.id)).reduce((n, x) => n + lvl(s, x.id), 0);
tiers(
  'skiller', 'professions',
  [['Faz-Tudo', 'Jack of All Trades'], ['Polivalente', 'Versatile'], ['Mestre de Ofícios', 'Master of Trades'], ['Lenda das Profissões', 'Legend of Trades']],
  [100, 300, 600, 1000],
  (n) => [`Nível Skiller ${n} (soma das profissões)`, `Skiller level ${n} (sum of professions)`],
  skiller,
  { 3: ['Lenda das Profissões', 'Legend of Trades'] },
);
tiers(
  'crafted', 'professions',
  [['Mãos Hábeis', 'Skilled Hands'], ['Produtor', 'Producer'], ['Mestre de Ofício', 'Master Artisan'], ['Fábrica Viva', 'Living Factory']],
  [10, 500, 5000, 50_000],
  (n) => [`Produzir ${fmt(n)} itens`, `Produce ${fmt(n)} items`],
  (s) => stat(s, 'crafted'),
  { 3: ['Fábrica Viva', 'Living Factory'] },
);

// ── Jornada ────────────────────────────────────────────────────────────────
tiers(
  'quests', 'progress',
  [['Aprendiz', 'Apprentice'], ['Discípulo', 'Disciple'], ['Braço dos Mestres', 'Masters Right Hand'], ['Herói do Povo', 'Hero of the People']],
  [1, 5, 15, 40],
  (n) => [`Entregar ${n} quests`, `Turn in ${n} quests`],
  (s) => stat(s, 'quests'),
);
const storiesDone = (s: AchState) => (s.stories ?? []).filter((x) => x.status === 'done').length;
tiers(
  'stories', 'progress',
  [['Contador de Histórias', 'Storyteller'], ['Cronista', 'Chronicler'], ['Lenda Viva', 'Living Legend']],
  [1, 5, STORIES.length],
  (n) => (n === STORIES.length ? ['Concluir todas as histórias', 'Finish every story'] : [`Concluir ${n} histórias`, `Finish ${n} stories`]),
  storiesDone,
  { 2: ['Lenda Viva', 'Living Legend'] },
);
tiers(
  'dailies', 'progress',
  [['Rotina', 'Routine'], ['Disciplina', 'Discipline'], ['Incansável', 'Tireless'], ['Inabalável', 'Unshakable']],
  [1, 30, 150, 500],
  (n) => [`Fazer ${n} tarefas diárias`, `Complete ${n} daily tasks`],
  (s) => stat(s, 'dailies'),
);
const arenasDone = (s: AchState) => (s.arenas ?? []).filter((a) => a.status === 'completed' || a.status === 'reward_pending').length;
const ARENA_COUNT = ARENAS.filter((a) => !a.trial).length;
tiers(
  'arenas', 'progress',
  [['Gladiador', 'Gladiator'], ['Campeão da Arena', 'Arena Champion']],
  [1, ARENA_COUNT],
  (n) => (n === ARENA_COUNT ? ['Conquistar todas as arenas', 'Conquer every arena'] : ['Conquistar uma arena', 'Conquer an arena']),
  arenasDone,
  { 1: ['Campeão da Arena', 'Arena Champion'] },
);
const promoTier = (s: AchState) => PROMOTIONS.find((p) => p.id === s.promotion)?.tier ?? (s.promotion ? 1 : 0);
tiers(
  'promotion', 'progress',
  [['Promovido', 'Promoted'], ['Veterano de Guerra', 'War Veteran'], ['Mestre da Classe', 'Class Master'], ['Mito', 'Myth']],
  [1, 2, 3, 4],
  (n) => [['Primeira promoção', 'First promotion'], ['Segunda promoção', 'Second promotion'], ['Terceira promoção', 'Third promotion'], ['Ascensão Mítica', 'Mythic Ascension']][n - 1] as [string, string],
  promoTier,
  { 3: ['o Mito', 'the Myth'] },
);

// ── Coleção ────────────────────────────────────────────────────────────────
tiers(
  'pets', 'collection',
  [['Amigo dos Bichos', 'Animal Friend'], ['Tratador', 'Keeper'], ['Zoológico Ambulante', 'Walking Zoo']],
  [1, 5, PETS.length],
  (n) => (n === PETS.length ? ['Ter todos os mascotes', 'Own every pet'] : [`Ter ${n} mascotes`, `Own ${n} pets`]),
  (s) => (s.unlockedPets ?? []).length,
  { 2: ['Zoológico Ambulante', 'Walking Zoo'] },
);
tiers(
  'sold', 'collection',
  [['Mascate', 'Peddler'], ['Negociante', 'Merchant'], ['Magnata', 'Tycoon']],
  [50, 1000, 10_000],
  (n) => [`Vender ${fmt(n)} itens ao Mercador`, `Sell ${fmt(n)} items to the Merchant`],
  (s) => stat(s, 'sold'),
  { 2: ['o Magnata', 'the Tycoon'] },
);
tiers(
  'hunting_tasks', 'collection',
  [['Recruta de Alden', 'Alden Recruit'], ['Caçador de Aluguel', 'Hired Hunter'], ['Lâmina de Alden', 'Blade of Alden']],
  [100, 1000, 5000],
  (n) => [`Ganhar ${fmt(n)} Pontos de Caçador`, `Earn ${fmt(n)} Hunter Points`],
  (s) => stat(s, 'hunting_points'),
);

// ── Secretas ───────────────────────────────────────────────────────────────
list.push(
  { id: 'secret_million', cat: 'secret', secret: true, name: ['Um Milhão de Almas', 'A Million Souls'], desc: ['Abater 1.000.000 de monstros', 'Slay 1,000,000 monsters'], points: 160, title: ['Devorador de Almas', 'Soul Devourer'], goal: (s) => [stat(s, 'kills'), 1_000_000] },
  { id: 'secret_all_99', cat: 'secret', secret: true, name: ['Perfeccionista', 'Perfectionist'], desc: ['Nível 99 em todas as profissões', 'Level 99 in every profession'], points: 160, title: ['o Perfeito', 'the Perfect'], goal: (s) => [SKILLS.filter((x) => !isCombatSkill(x.id) && lvl(s, x.id) >= 99).length, SKILLS.filter((x) => !isCombatSkill(x.id)).length] },
  { id: 'secret_merchant_king', cat: 'secret', secret: true, name: ['Rei do Mercado', 'Market King'], desc: ['Vender 100.000 itens ao Mercador', 'Sell 100,000 items to the Merchant'], points: 80, title: ['Rei do Mercado', 'Market King'], goal: (s) => [stat(s, 'sold'), 100_000] },
);

export const ACHIEVEMENT_LIST: readonly AchDef[] = list;
export const achievementById = (id: string) => list.find((a) => a.id === id);
export const ACHIEVEMENT_MAX_POINTS = list.reduce((n, a) => n + a.points, 0);

/** Progresso (atual, meta) de uma conquista; números inválidos contam como 0. */
export function achievementProgress(a: AchDef, s: AchState): [number, number] {
  const [now, goal] = a.goal(s);
  return [Number.isFinite(now) ? now : 0, goal];
}
export const achievementDone = (a: AchDef, s: AchState) => {
  const [now, goal] = achievementProgress(a, s);
  return now >= goal;
};
/** Ids das conquistas que o personagem já cumpre. */
export const achievementsDone = (s: AchState) => list.filter((a) => achievementDone(a, s)).map((a) => a.id);
/** Pontos somados de uma lista de ids. */
export const achievementPoints = (ids: Iterable<string>) => [...ids].reduce((n, id) => n + (achievementById(id)?.points ?? 0), 0);
/** Títulos que esses ids liberam (id da conquista → título). */
export const titlesFrom = (ids: Iterable<string>) => [...ids].flatMap((id) => {
  const a = achievementById(id);
  return a?.title ? [{ id, title: a.title }] : [];
});
