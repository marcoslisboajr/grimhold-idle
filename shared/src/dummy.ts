import { levelForXp, OFFLINE_CAP_MS, type Activity, type Gains, type SimResult, type SkillId } from './skills.ts';
import type { ActivityContext } from './activity.ts';

export interface DummyNode {
  id: string;
  name: string;
  skill: SkillId;
  icon: string;
  description: string;
  intervalMs: number;
  xpPerAction: number;
}

export const DUMMY_NODES: DummyNode[] = [
  {
    id: 'dummy_melee',
    name: 'Boneco de Treino (Corpo a Corpo)',
    skill: 'melee',
    icon: 'skill_melee',
    description: 'Golpeie o boneco com armas de curta distância para afiar sua técnica corpo a corpo.',
    intervalMs: 3000,
    xpPerAction: 20,
  },
  {
    id: 'dummy_ranged',
    name: 'Boneco de Treino (Distância)',
    skill: 'ranged',
    icon: 'skill_ranged',
    description: 'Dispare flechas e dardos contra o alvo para aprimorar sua pontaria e disparo.',
    intervalMs: 3000,
    xpPerAction: 20,
  },
  {
    id: 'dummy_magic',
    name: 'Boneco de Treino (Poder Mágico)',
    skill: 'magic_level',
    icon: 'skill_magic_level',
    description: 'Canalize energia arcana e concentre sua mente para elevar seu nível mágico.',
    intervalMs: 3000,
    xpPerAction: 20,
  },
  {
    id: 'dummy_shielding',
    name: 'Boneco de Treino (Defesa com Escudo)',
    skill: 'shielding',
    icon: 'skill_shielding',
    description: 'Defenda-se e pratique bloqueios constantes com seu escudo para reforçar sua defesa.',
    intervalMs: 3000,
    xpPerAction: 20,
  },
];

/**
 * XP de skill por hora de uma caçada típica no nível de combate (medido com simulateHunt,
 * guerreiro com equipamento do nível, na caçada mais alta até 5 níveis abaixo).
 */
const HUNT_SKILL_XP_PER_HOUR: [number, number][] = [
  [1, 5000], [5, 5805], [15, 9643], [30, 39341], [50, 64013], [70, 103531], [90, 456484], [110, 1547000], [130, 3000000],
];
/** O boneco rende mais que caçar: 30% a mais de XP de skill por hora (sem loot nem XP de combate). */
export const DUMMY_HUNT_MULT = 1.3;
const DUMMY_MIN_XP_PER_HOUR = 24_000;

/** XP de skill por hora da caçada típica no nível (interpolação geométrica entre os pontos medidos). */
function huntSkillXpPerHour(level: number): number {
  const t = HUNT_SKILL_XP_PER_HOUR;
  if (level <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [l1, v1] = t[i];
    const [l0, v0] = t[i - 1];
    if (level <= l1) return v0 * Math.pow(v1 / v0, (level - l0) / (l1 - l0));
  }
  return t[t.length - 1][1];
}

/** XP de skill por golpe no boneco para quem tem esse XP de combate. */
export function dummyXpPerAction(dummy: DummyNode, combatXp: number): number {
  const perHour = Math.max(DUMMY_MIN_XP_PER_HOUR, huntSkillXpPerHour(levelForXp(combatXp, 'combat')) * DUMMY_HUNT_MULT);
  return Math.max(dummy.xpPerAction, Math.round((perHour * dummy.intervalMs) / 3_600_000));
}

export function isDummyNode(nodeId: string): boolean {
  return nodeId.startsWith('dummy_');
}

export function dummyById(id: string): DummyNode | undefined {
  return DUMMY_NODES.find((d) => d.id === id);
}

/** Simula treino offline/online no boneco de treino da cidade. */
export function simulateDummy(activity: Activity, now: number, ctx: ActivityContext): SimResult {
  const dummy = dummyById(activity.node);
  const empty: Gains = { actions: 0, items: {}, xp: {} };
  if (!dummy || now <= activity.since) return { gains: empty, since: activity.since, seq: activity.seq, ended: false };

  const end = Math.min(now, activity.since + OFFLINE_CAP_MS);
  const elapsed = end - activity.since;
  const actions = Math.floor(elapsed / dummy.intervalMs);
  if (actions <= 0) return { gains: empty, since: activity.since, seq: activity.seq, ended: false };

  const duration = actions * dummy.intervalMs;
  const since = activity.since + duration;
  const mainXp = actions * dummyXpPerAction(dummy, ctx.combatXp ?? 0);

  const xp: Partial<Record<SkillId, number>> = {
    [dummy.skill]: mainXp,
  };

  // Se treinar melee com escudo equipado, avança shielding também:
  if (dummy.id === 'dummy_melee' && (ctx.bonus?.defense ?? 0) > 0) {
    xp.shielding = Math.round(mainXp * 0.7);
  }

  const gains: Gains = {
    actions,
    items: {},
    xp,
  };

  return { gains, since, seq: activity.seq + actions, ended: false };
}
