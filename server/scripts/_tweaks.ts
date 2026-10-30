/** Ajustes de teste por variável de ambiente (só nos scripts de simulação). HEAL=0.8 multiplica a cura das magias. */
import { SPELLS, DUEL_TUNING, DUEL_TUNING_LS } from '@grimhold/shared';
const heal = Number(process.env.HEAL ?? 1);
for (const s of SPELLS) if (s.effect.kind === 'heal') (s.effect as { pct: number }).pct *= heal;
// Duelos: SHIELD (arcanista), DODGE (caçador), DHEAL (devoto), WTAKEN (guerreiro).
const env = (k: string) => (process.env[k] !== undefined ? Number(process.env[k]) : undefined);
if (env('SHIELD') !== undefined) DUEL_TUNING.arcanist.manaShield = env('SHIELD');
if (env('DODGE') !== undefined) DUEL_TUNING.hunter.dodge = env('DODGE');
if (env('DHEAL') !== undefined) DUEL_TUNING.devout.heal = env('DHEAL');
if (env('WTAKEN') !== undefined) DUEL_TUNING.warrior.taken = env('WTAKEN');
if (env('DTAKEN') !== undefined) DUEL_TUNING.devout.taken = env('DTAKEN');
if (env('LS') !== undefined) DUEL_TUNING_LS.mult = env('LS')!;
