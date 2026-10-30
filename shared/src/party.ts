import type { VocationId } from './index.ts';

export const MAX_PARTY_MEMBERS = 4;
export const PARTY_BONUS_PER_MEMBER = 0.1; // +10% de XP por membro adicional caçando junto
/** Grupo misto (como no Tibia): +5% por vocação diferente além da primeira. */
export const PARTY_BONUS_PER_VOCATION = 0.05;

/** Aliado offline (ou o tempo com o próprio jogo fechado) vale só esta fração do bônus. */
export const PARTY_OFFLINE_WEIGHT = 0.25;

/**
 * Bônus de XP da party: +10% por aliado na mesma caçada (até 3) e +5% por vocação
 * diferente além da primeira. Quatro vocações diferentes juntas: +45%. `allies` é a
 * soma dos pesos (aliado online = 1, offline = PARTY_OFFLINE_WEIGHT); a parte das
 * vocações acompanha a média dos pesos.
 */
export function partyXpBonus(allies: number, vocations: number, count = allies): number {
  if (allies <= 0) return 0;
  const avg = count > 0 ? allies / count : 1;
  return Math.round((Math.min(3, allies) * PARTY_BONUS_PER_MEMBER + Math.max(0, Math.min(4, vocations) - 1) * PARTY_BONUS_PER_VOCATION * avg) * 1000) / 1000;
}

/** Shared XP só entre quem tem pelo menos 2/3 do nível do maior (regra do Tibia). */
export const canShareLevel = (level: number, top: number) => level * 3 >= top * 2;

/**
 * Situação do membro para quem olha: divide a XP, só conta para o bônus (offline)
 * ou está fora (outra caçada, diferença de nível, sem caçar).
 */
export type PartyShareStatus = 'sharing' | 'bonus_only' | 'other_hunt' | 'level_gap' | 'not_hunting';
export const PARTY_INVITE_TIMEOUT_MS = 24 * 60 * 60_000; // 24 horas (persistente para o jogo AFK)

export interface PartyMemberView {
  characterId: number;
  name: string;
  vocation: VocationId;
  level: number;
  hp: number;
  maxHp: number;
  huntNode: string | null;
  huntName: string | null;
  isLeader: boolean;
  online: boolean;
  /** Situação de divisão de XP (só nos outros membros). */
  share?: PartyShareStatus;
}

export interface PartyOutgoingInviteView {
  targetId: number;
  targetName: string;
  targetVocation: VocationId;
  targetLevel: number;
  expiresAt: number;
}

export interface PartyView {
  id: number;
  leaderId: number;
  members: PartyMemberView[];
  pendingInvites?: PartyOutgoingInviteView[];
  sharedXpBonus: number; // Ex: 0.20 (+20%)
}

export interface PartyInviteView {
  partyId: number;
  leaderName: string;
  expiresAt: number;
}
