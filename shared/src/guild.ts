import { NODES, RECIPES, itemById, xpForLevel, type SkillId } from './skills.ts';

/**
 * Encomendas da Guilda: as tarefas das profissões (as Tarefas de Caça são só de combate).
 * Uma ativa por profissão; conta o item ganho enquanto a profissão roda (online e offline).
 * Entregar dá XP da profissão, ouro e Selos do Artesão (loja e patentes próprias).
 */
export interface GuildTaskDef {
  id: string;
  skill: SkillId;
  /** Item que conta (o que o lugar de coleta ou a receita rende). */
  item: string;
  count: number;
  /** Nível da profissão para aceitar. */
  level: number;
  xp: number;
  gold: number;
  points: number;
}

export interface GuildTaskState {
  id: string;
  progress: number;
  status: 'active' | 'ready';
}

/** Faixas de nível das encomendas de cada profissão (pega o lugar ou a receita mais alta até a faixa). */
const GUILD_TIERS = [1, 15, 30, 45, 60, 80, 100];
/** Uma encomenda leva uns 40 minutos de profissão, sem bônus de velocidade. */
const GUILD_TASK_MS = 40 * 60_000;

interface Source {
  id: string;
  level: number;
  intervalMs: number;
  xp: number;
  item: string;
  qty: number;
}

/** Piso da XP da encomenda, em fração de um nível: 8% no começo e sobe até 20% no 99 (as de item alto davam pouco). */
export const guildXpFloor = (level: number) => 0.08 + 0.12 * Math.min(1, Math.max(0, level - 1) / 98);
/**
 * A encomenda de forja (barras) paga também o tempo de minerar os insumos (minério e carvão), que a conta
 * das ações da forja não via: 300 barras de dragonita pedem 300 minérios e 1.500 carvões e davam ~20% de um nível.
 */
export const GUILD_SMITHING_XP_MULT = 3;

function build(): GuildTaskDef[] {
  const out: GuildTaskDef[] = [];
  const sources: [SkillId, Source[]][] = [
    ...Object.entries(NODES).map(([skill, nodes]): [SkillId, Source[]] => [skill as SkillId, nodes.filter((n) => !n.drops).map((n) => ({ ...n, qty: 1 }))]),
    ...Object.entries(RECIPES).map(([skill, recipes]): [SkillId, Source[]] => [
      skill as SkillId,
      // Sigilismo pede o eco do bestiário: fica de fora (depende de caçar).
      // Sem chaves; na Ferraria só as barras (as peças já têm encomenda no Artesanato).
      recipes.filter((r) => !r.kills && !r.output.endsWith('_key') && (skill !== 'smithing' || r.output.endsWith('_bar'))).map((r) => ({ id: r.id, level: r.level, intervalMs: r.intervalMs, xp: r.xp, item: r.output, qty: r.outputQty ?? 1 })),
    ]),
  ];
  for (const [skill, list] of sources) {
    const sorted = [...list].sort((a, b) => a.level - b.level);
    const used = new Set<string>();
    for (const tier of GUILD_TIERS) {
      const pick = sorted.filter((e) => e.level <= tier).pop();
      if (!pick || used.has(pick.item)) continue;
      used.add(pick.item);
      // Equipamento: um quarto (centenas de armaduras iguais não fazem sentido).
      const share = itemById(pick.item)?.equip ? 0.25 : 1;
      const actions = Math.max(10, Math.round((GUILD_TASK_MS * share) / pick.intervalMs / 10) * 10);
      out.push({
        id: `guild_${skill}_${pick.id}`,
        skill,
        item: pick.item,
        count: actions * pick.qty,
        level: pick.level,
        // XP das ações, entre o piso (8% a 20% de um nível da faixa) (a curva sobe rápido lá em cima) e metade do caminho
        // até 10 níveis acima (antes a encomenda do nível 1 dava dezenas de níveis de uma vez).
        xp: Math.round(Math.min(Math.max(pick.xp * actions, (xpForLevel(pick.level + 1) - xpForLevel(pick.level)) * guildXpFloor(pick.level)) * (skill === 'smithing' ? GUILD_SMITHING_XP_MULT : 1), (xpForLevel(pick.level + 10) - xpForLevel(pick.level)) * 0.5)),
        gold: Math.round(150 + pick.level * pick.level * 8),
        points: 2 + Math.floor(pick.level / 10),
      });
    }
  }
  return out;
}

export const GUILD_TASKS: GuildTaskDef[] = build();
export const guildTaskById = (id: string) => GUILD_TASKS.find((t) => t.id === id);

/**
 * Patentes da Guilda pelos Selos ganhos (gastar na loja não tira a patente). Cada uma dá
 * `bonus` de XP e de velocidade em todas as profissões; a última também dá o traje Artesão.
 */
export const GUILD_RANKS = [
  { name: 'Aprendiz', en: 'Apprentice', minPoints: 0, bonus: 0 },
  { name: 'Artífice', en: 'Artificer', minPoints: 60, bonus: 0.05 },
  { name: 'Mestre Artesão', en: 'Master Artisan', minPoints: 180, bonus: 0.1 },
  { name: 'Mestre de Ofícios', en: 'Master of Crafts', minPoints: 280, bonus: 0.15 },
  { name: 'Grão-Mestre da Guilda', en: 'Guild Grandmaster', minPoints: 400, bonus: 0.2 },
];
export const guildRankFor = (points: number) => [...GUILD_RANKS].reverse().find((r) => points >= r.minPoints)!;
/** XP e velocidade a mais nas profissões pela patente (0.05 = 5%). */
/** Grão-Mestre (que ganha o traje Artesão) com a roupa de Artesão completa: XP a mais nas profissões de criação. */
export const GRANDMASTER_ARTISAN_XP = 0.05;
export const GRANDMASTER_POINTS = 400;
export const guildBonus = (points: number | undefined) => guildRankFor(points ?? 0).bonus;

/** Loja da Guilda (Selos do Artesão): XP em dobro por 1 h, 15 gemas à escolha ou o Kit do Artesão (+25% de velocidade por 2 h). */
export type GuildShopItem = 'xp_boost' | 'gem' | 'artisan_kit';
export const GUILD_SHOP: Record<GuildShopItem, { price: number }> = {
  xp_boost: { price: 25 },
  artisan_kit: { price: 20 },
  gem: { price: 10 },
};
export const GUILD_XP_BOOST_MS = 60 * 60_000;
/** Gemas à escolha por compra. */
export const GUILD_GEM_QTY = 15;
/** Kit do Artesão: velocidade a mais em todas as profissões, por 2 h. */
export const ARTISAN_KIT_SPEED = 0.25;
export const ARTISAN_KIT_MS = 2 * 60 * 60_000;
export const GUILD_GEMS = ['gem_sapphire', 'gem_emerald', 'gem_ruby', 'gem_diamond'];
