import { PROFESSIONS, levelForXp, type SkillId } from './skills.ts';

/**
 * Capas de maestria (presas ao personagem: não vende, não troca, não cai na morte).
 * Capa do Mestre: nível 99 numa profissão, +5% de XP nela. Capa Suprema: nível 120, +10%.
 * A da Maestria (e a Suprema dela) é de quem tem todas no nível e vale para todas as profissões.
 */
export const CAPE_TIERS = [
  { suffix: '', level: 99, bonus: 0.05 },
  { suffix: '_supreme', level: 120, bonus: 0.1 },
] as const;
/** Nível da primeira capa (a do Mestre). */
export const CAPE_LEVEL = CAPE_TIERS[0].level;
export const CAPE_XP_BONUS = CAPE_TIERS[0].bonus;
export const MASTERY_CAPE = 'cape_mastery';

/** Skills com capa: as profissões e o Slayer (a da Maestria continua só das profissões). */
export const CAPE_SKILLS: SkillId[] = [...PROFESSIONS, 'slayer'];
export const capeOf = (skill: SkillId, supreme = false) => `cape_${skill}${supreme ? '_supreme' : ''}`;
export const CAPES: string[] = CAPE_TIERS.flatMap((t) => [...CAPE_SKILLS.map((s) => `cape_${s}${t.suffix}`), `${MASTERY_CAPE}${t.suffix}`]);
export const isCape = (id: string) => CAPES.includes(id);

/** Profissão (null na da Maestria) e nível da capa. */
function capeInfo(capeId: string): { skill: SkillId | null; tier: (typeof CAPE_TIERS)[number] } | null {
  if (!isCape(capeId)) return null;
  const tier = capeId.endsWith('_supreme') ? CAPE_TIERS[1] : CAPE_TIERS[0];
  const core = capeId.slice(0, capeId.length - tier.suffix.length);
  return { skill: core === MASTERY_CAPE ? null : (CAPE_SKILLS.find((s) => `cape_${s}` === core) ?? null), tier };
}

/** Profissão (null = todas) e bônus de XP da capa, para o texto do item. */
export function capeBonus(capeId: string): { skill: SkillId | null; bonus: number } | null {
  const info = capeInfo(capeId);
  return info ? { skill: info.skill, bonus: info.tier.bonus } : null;
}

/** O personagem já conquistou esta capa. */
export function capeUnlocked(capeId: string, skills: Partial<Record<SkillId, number>>): boolean {
  const info = capeInfo(capeId);
  if (!info) return false;
  const lv = (s: SkillId) => levelForXp(skills[s] ?? 0, s);
  return info.skill ? lv(info.skill) >= info.tier.level : PROFESSIONS.every((s) => lv(s) >= info.tier.level);
}

export const capesEarned = (skills: Partial<Record<SkillId, number>>) => CAPES.filter((c) => capeUnlocked(c, skills));

/** Multiplicador de XP da capa equipada numa skill (profissões e Slayer; a da Maestria só nas profissões). */
export function capeXpMult(capeId: string | undefined, skill: SkillId): number {
  const info = capeId ? capeInfo(capeId) : null;
  if (!info) return 1;
  if (info.skill === null) return PROFESSIONS.includes(skill) ? 1 + info.tier.bonus : 1;
  return info.skill === skill ? 1 + info.tier.bonus : 1;
}

/** Capa do Slayer: o monstro da tarefa tem menos vida (+5% de dano na do Mestre, +10% na Suprema). 1 = sem efeito. */
export function slayerCapeHpMult(capeId: string | undefined): number {
  const info = capeId ? capeInfo(capeId) : null;
  return info?.skill === 'slayer' ? 1 / (1 + info.tier.bonus) : 1;
}
