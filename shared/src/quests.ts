import { levelForXp, type Gains, type SkillId } from './skills.ts';

/**
 * Quests dos mestres do Bastião. Cada mestre tem uma corrente: a próxima só
 * começa depois de entregar a anterior. O progresso só conta com a quest ativa.
 */
export type QuestGoal =
  /** Matar monstros (qualquer um da lista; lista vazia = qualquer monstro). */
  | { kind: 'kill'; monsters: string[]; count: number }
  /** Conseguir itens por qualquer meio (coleta, produção, loot). */
  | { kind: 'obtain'; item: string; count: number }
  /** Chegar a um nível numa skill (vale o nível atual). */
  | { kind: 'level'; skill: SkillId; level: number }
  /** Vender itens ao Mercador (quantidade total). */
  | { kind: 'sell'; count: number }
  /** Vencer uma provação de quest (arena com `trial`). */
  | { kind: 'trial'; arena: string; count: 1 }
  /** Vencer uma instância de quest (caçada com `quest`), uma vez. */
  | { kind: 'instance'; hunt: string; count: 1 }
  /** Vencer covis da lista (lista vazia = qualquer covil). */
  | { kind: 'lair'; hunts: string[]; count: number }
  /** Entregar itens do depósito ao resgatar a tarefa. */
  | { kind: 'deliver'; item: string; count: number }
  /** Vencer uma raide semanal. */
  | { kind: 'raid'; count: number };

export type Master = 'Hellel' | 'Ifigenia' | 'Krash' | 'Alva';

export interface Quest {
  id: string;
  /** Mestre que dá e recebe a quest (nome do NPC na cidade). */
  master: Master;
  name: string;
  /** O que o mestre diz ao dar a quest. */
  text: string;
  goal: QuestGoal;
  reward: { gold?: number; xp?: Partial<Record<SkillId, number>>; items?: Record<string, number> };
}

export const QUESTS: Quest[] = [
  // Hellel: caçadas.
  {
    id: 'hellel_1',
    master: 'Hellel',
    name: 'Ratos na margem',
    text: 'Os ratos da Ravina estão roendo os barcos. Cace 15 deles na Margem do Rio.',
    goal: { kind: 'kill', monsters: ['rat'], count: 15 },
    reward: { gold: 300, xp: { combat: 1200 }, items: { cooked_shrimp: 25 } },
  },
  {
    id: 'hellel_2',
    master: 'Hellel',
    name: 'Orelhas de goblin',
    text: 'A Toca dos Goblins fica a leste. Derrube 25 goblins de qualquer tipo.',
    goal: { kind: 'kill', monsters: ['goblin', 'goblin_archer', 'goblin_shaman'], count: 25 },
    reward: { gold: 800, xp: { combat: 5000 }, items: { bronze_shield: 1 } },
  },
  {
    id: 'hellel_3',
    master: 'Hellel',
    name: 'Força para as tribos',
    text: 'Só volte a falar comigo quando chegar ao nível 15 de combate.',
    goal: { kind: 'level', skill: 'combat', level: 15 },
    reward: { gold: 2000, xp: { combat: 12000 }, items: { iron_sword: 1 } },
  },
  {
    id: 'hellel_4',
    master: 'Hellel',
    name: 'Ossos inquietos',
    text: 'O Cemitério Velho acordou. Ponha 40 mortos-vivos de volta na cova.',
    goal: { kind: 'kill', monsters: ['skeleton', 'ghoul', 'bat', 'floating_skull'], count: 40 },
    reward: { gold: 5000, xp: { combat: 35000 } },
  },
  // Ifigenia: coleta e produção.
  {
    id: 'ifigenia_1',
    master: 'Ifigenia',
    name: 'Mão na picareta',
    text: 'Toda arma começa na mina. Traga 20 minérios de cobre.',
    goal: { kind: 'obtain', item: 'copper_ore', count: 20 },
    reward: { gold: 250, xp: { mining: 1500 }, items: { tin_ore: 25 } },
  },
  {
    id: 'ifigenia_2',
    master: 'Ifigenia',
    name: 'Fogo da forja',
    text: 'Cobre e estanho viram bronze. Funda 10 barras de bronze na Forja (fale com a Ferreira, ao lado do Vulcanus, ou abra Profissões → Forja).',
    goal: { kind: 'obtain', item: 'bronze_bar', count: 10 },
    reward: { gold: 600, xp: { smithing: 3000 } },
  },
  {
    id: 'ifigenia_3',
    master: 'Ifigenia',
    name: 'Arma própria',
    text: 'Agora forje uma espada de bronze. Quem faz a própria arma cuida melhor dela.',
    goal: { kind: 'obtain', item: 'bronze_sword', count: 1 },
    reward: { gold: 1000, xp: { smithing: 4500 }, items: { bronze_helmet: 1 } },
  },
  {
    id: 'ifigenia_4',
    master: 'Ifigenia',
    name: 'Madeira de lei',
    text: 'Chegue ao nível 15 de Lenhador. Os arcos e cajados bons pedem carvalho.',
    goal: { kind: 'level', skill: 'woodcutting', level: 15 },
    reward: { gold: 2500, xp: { woodcutting: 12000 }, items: { oak_logs: 50 } },
  },
  // Krash: economia.
  {
    id: 'krash_1',
    master: 'Krash',
    name: 'Primeiro negócio',
    text: 'Venda 10 itens ao Mercador, na loja de telhado vermelho. Ouro chama ouro.',
    goal: { kind: 'sell', count: 10 },
    reward: { gold: 500, xp: { crafting: 1200 } },
  },
  {
    id: 'krash_2',
    master: 'Krash',
    name: 'Couro curtido',
    text: 'Junte 30 couros nas caçadas. O Artesanato transforma couro em armadura.',
    goal: { kind: 'obtain', item: 'leather', count: 30 },
    reward: { gold: 1500, xp: { crafting: 4000 }, items: { leather_cap: 1 } },
  },
  {
    id: 'krash_3',
    master: 'Krash',
    name: 'Mercador de verdade',
    text: 'Venda 100 itens ao Mercador. Quem conhece o preço das coisas nunca passa fome.',
    goal: { kind: 'sell', count: 100 },
    reward: { gold: 4000, xp: { crafting: 12000 } },
  },
  // Alva: comida e sobrevivência.
  {
    id: 'alva_1',
    master: 'Alva',
    name: 'Pão de cada dia',
    text: 'Quem caça com fome cai cedo. Pesque 15 camarões.',
    goal: { kind: 'obtain', item: 'raw_shrimp', count: 15 },
    reward: { gold: 250, xp: { fishing: 1500 } },
  },
  {
    id: 'alva_2',
    master: 'Alva',
    name: 'Cozinha do Bastião',
    text: 'Agora frite 15 camarões na Culinária. Comida pronta cura no meio da luta.',
    goal: { kind: 'obtain', item: 'cooked_shrimp', count: 15 },
    reward: { gold: 600, xp: { cooking: 2500 }, items: { raw_trout: 30 } },
  },
  {
    id: 'alva_3',
    master: 'Alva',
    name: 'Mão de cozinheira',
    text: 'Chegue ao nível 20 de Culinária. O salmão assado já salvou muitos aventureiros.',
    goal: { kind: 'level', skill: 'cooking', level: 20 },
    reward: { gold: 3000, xp: { cooking: 15000 }, items: { cooked_salmon: 50 } },
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id);

/** Estado de uma quest para um personagem. */
export interface QuestState {
  id: string;
  progress: number;
  /** active = em andamento; claimed = entregue. */
  status: 'active' | 'claimed';
}

/** O alvo do objetivo (quantidade ou nível). */
export function questTarget(q: Quest): number {
  return q.goal.kind === 'level' ? q.goal.level : q.goal.count;
}

/** Progresso que estes ganhos somam à quest (0 se não contam). */
export function questProgress(q: Quest, gains: Gains): number {
  const g = q.goal;
  if (g.kind === 'kill') {
    // Lista vazia = qualquer monstro.
    if (g.monsters.length === 0) return Object.values(gains.kills ?? {}).reduce((n, k) => n + k, 0);
    return g.monsters.reduce((n, m) => n + (gains.kills?.[m] ?? 0), 0);
  }
  if (g.kind === 'obtain' || g.kind === 'deliver') return Math.max(0, gains.items[g.item] ?? 0);
  if (g.kind === 'lair') return gains.cleared && (g.hunts.length === 0 || g.hunts.includes(gains.cleared)) ? 1 : 0;
  if (g.kind === 'raid') return gains.cleared && gains.cleared.startsWith('raid_') ? 1 : 0;
  return 0;
}

/** Progresso mostrado: para 'level' é o nível atual; nos outros, o contado. */
export function questShown(q: Quest, state: QuestState, skillsXp: Partial<Record<SkillId, number>>): number {
  const g = q.goal;
  if (g.kind === 'level') return Math.min(g.level, levelForXp(skillsXp[g.skill] ?? 0, g.skill));
  return Math.min(questTarget(q), state.progress);
}

/** Pronta para entregar? */
export function questDone(q: Quest, state: QuestState, skillsXp: Partial<Record<SkillId, number>>): boolean {
  return state.status === 'active' && questShown(q, state, skillsXp) >= questTarget(q);
}

/** Primeira quest de cada mestre: ativas desde o começo. */
export const FIRST_QUESTS = (['Hellel', 'Ifigenia', 'Krash', 'Alva'] as Master[]).map(
  (m) => QUESTS.find((q) => q.master === m)!.id,
);

/** A próxima da corrente do mesmo mestre, se houver. */
export function nextQuest(id: string): Quest | undefined {
  const q = questById(id);
  if (!q) return undefined;
  const chain = QUESTS.filter((x) => x.master === q.master);
  return chain[chain.indexOf(q) + 1];
}
