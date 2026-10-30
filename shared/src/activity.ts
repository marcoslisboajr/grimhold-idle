import { bonusAt, CRIT_CHANCE, eatAfterFight, parseHuntNode, playerStats, runCycle, simulateHunt, withArrow, withHealthPotion, withManaPotion, withPotion, withRunes, xpStageMult, type Fighter, type Hit, type HuntContext } from './combat.ts';
import { instanceRest } from './instances.ts';
import { outfitCount, outfitGroupFor, professionGearXpMult, toolSpeedFor, toolYieldFor } from './proftools.ts';
import { ARTISAN_KIT_SPEED, guildBonus, GRANDMASTER_ARTISAN_XP, GRANDMASTER_POINTS } from './guild.ts';
import { masteryEffects } from './mastery.ts';
import { boostedSkillMult, getBoostedCreature } from './boosted.ts';
import { isArenaNode, simulateArena, currentArenaCycle } from './arena.ts';
import { isDummyNode, simulateDummy } from './dummy.ts';
import { MAX_LEVEL, gatherExtraChance, gatherSpeed, isProductionSkill, productionSpeed, itemById, levelForXp, nodeById, recipeById, simulateGathering, simulateProduction, type Activity, type SimResult, type SkillId } from './skills.ts';
import combatRate from '../data/combat_rate.json';

export interface ActivityContext extends HuntContext {
  /** Banco atual: a produção só faz o que os materiais permitem. */
  bank: Record<string, number>;
  /** Profissões dos mascotes que o personagem tem (aceleram a coleta delas). */
  petSkills?: SkillId[];
  /** Selos do Artesão ganhos: a patente da Guilda dá XP e velocidade nas profissões. */
  guildPoints?: number;
  /** Kit do Artesão ativo até (ms): +25% de velocidade nas profissões. */
  artisanKitUntil?: number;
  /** Equipamento (a ferramenta de coleta acelera a skill dela). */
  equipment?: Partial<Record<string, string>>;
}

/**
 * Em que mapa a atividade acontece: 'city' (sem atividade), a caçada (sem a
 * dificuldade), o ponto de coleta, a oficina da profissão ou 'boss' (arena).
 * Jogadores no mesmo lugar se veem.
 */
export function placeOf(activity: Activity | null): string {
  if (!activity) return 'city';
  if (activity.node === 'world_boss') return 'boss';
  if (isArenaNode(activity.node)) return 'arena';
  if (isDummyNode(activity.node)) return 'city';
  if (activity.skill === 'combat') return parseHuntNode(activity.node)?.hunt.id ?? activity.node;
  if (isProductionSkill(activity.skill)) return activity.skill === 'smithing' && activity.node.endsWith('_bar') ? 'smelter' : activity.skill;
  return activity.node;
}

/** Ponto único de simulação: o servidor só chama isto, online e offline. */
export function simulate(activity: Activity, now: number, ctx: ActivityContext): SimResult {
  if (activity.skill === 'combat') {
    if (isArenaNode(activity.node)) return simulateArena(activity, now, ctx);
    if (isDummyNode(activity.node)) return simulateDummy(activity, now, ctx);
    return simulateHunt(activity, now, ctx);
  }
  // Maestria agora foca em combate (Roda da Maestria)
  // Kit do Artesão: vale para o trecho que começa com ele ativo.
  // Trecho longo (offline): só a parte com o kit ativo conta (proporcional).
  const kitUntil = ctx.artisanKitUntil ?? 0;
  const kit = kitUntil > activity.since ? ARTISAN_KIT_SPEED * Math.min(1, (kitUntil - activity.since) / Math.max(1, now - activity.since)) : 0;
  const result = isProductionSkill(activity.skill)
    ? simulateProduction(activity, now, ctx.bank, productionSpeed(activity.skill, activity.node, ctx.skills?.[activity.skill] ?? 0, guildBonus(ctx.guildPoints) + kit))
    : simulateGathering(
        activity,
        now,
        gatherSpeed(activity.skill, activity.node, ctx.skills?.[activity.skill] ?? 0, {
          petSkills: ctx.petSkills,
          toolSpeed: toolSpeedFor(activity.skill, ctx.skills?.[activity.skill] ?? 0, ctx.bank) + guildBonus(ctx.guildPoints) + kit,
        }),
        gatherExtraChance(levelForXp(ctx.skills?.[activity.skill] ?? 0, activity.skill), nodeById(activity.skill, activity.node)?.level ?? 0) +
          toolYieldFor(activity.skill, ctx.skills?.[activity.skill] ?? 0, ctx.bank),
      );
  // Bônus do começo (até o 50) e da Skill do Dia (pelo dia em que o trecho começou).
  const boost = professionXpBoost(activityLevel(activity)) * boostedSkillMult(activity.skill, activity.since);
  let own = result.gains.xp[activity.skill];
  if (boost > 1 && own) own = Math.round(own * boost);
  // Ferramenta e roupa de profissão (do depósito).
  const gear = professionGearXpMult(activity.skill, ctx.skills?.[activity.skill] ?? 0, ctx.bank);
  if (gear > 1 && own) own = Math.round(own * gear);
  // Patente da Guilda.
  const rank = guildBonus(ctx.guildPoints);
  if (rank > 0 && own) own = Math.round(own * (1 + rank));
  // Grão-Mestre da Guilda com a roupa de Artesão completa: mini bônus nas profissões de criação.
  if (own && (ctx.guildPoints ?? 0) >= GRANDMASTER_POINTS && outfitGroupFor(activity.skill) === 'artisan' && outfitCount(activity.skill, ctx.bank) === 4) own = Math.round(own * (1 + GRANDMASTER_ARTISAN_XP));
  
  if (own && ctx.meal) {
    const mealDef = itemById(ctx.meal.item)?.meal;
    if (mealDef && (mealDef.buff === 'profession_xp' || mealDef.buff === 'all_xp_loot')) {
      const workedMs = result.since - activity.since;
      if (workedMs > 0 && ctx.meal.until > activity.since) {
        const activeMs = Math.min(workedMs, ctx.meal.until - activity.since);
        const fraction = activeMs / workedMs;
        own = Math.round(own * (1 + mealDef.value * fraction));
      }
    }
  }
  if (own) result.gains.xp[activity.skill] = own;
  return withCombatXp(result, activity, ctx.combatXp, ctx.skills?.[activity.skill] ?? 0);
}

/** Até este nível as profissões dão XP extra (x3 no 1, caindo até x1 no 50); depois fica como era. */
export const PROFESSION_EARLY_UNTIL = 50;
export const professionXpBoost = (level: number) =>
  level >= PROFESSION_EARLY_UNTIL ? 1 : 1 + (2 * (PROFESSION_EARLY_UNTIL - Math.max(1, level))) / PROFESSION_EARLY_UNTIL;
/** Nível do recurso ou da receita da atividade. */
const activityLevel = (a: Activity) => (isProductionSkill(a.skill) ? recipeById(a.skill, a.node) : nodeById(a.skill, a.node))?.level ?? PROFESSION_EARLY_UNTIL;

/**
 * Profissão (coleta ou criação) rende uma fração da XP/h de caça do nível como XP de combate,
 * crescendo com o nível da profissão treinada: 10% no nível 1 até 40% no 120.
 */
export const PROFESSION_COMBAT_XP_MIN = 0.1;
export const PROFESSION_COMBAT_XP_MAX = 0.4;
export const professionCombatXpShare = (professionLevel: number) =>
  PROFESSION_COMBAT_XP_MIN + ((PROFESSION_COMBAT_XP_MAX - PROFESSION_COMBAT_XP_MIN) * (Math.min(MAX_LEVEL, Math.max(1, professionLevel)) - 1)) / (MAX_LEVEL - 1);

/** XP de combate por hora de uma boa caçada solo no nível (shared/data/combat_rate.json). */
export function combatXpRate(level: number): number {
  const rate = combatRate as number[];
  return rate[Math.max(0, Math.min(rate.length - 1, level))] ?? 0;
}

/** Soma a XP de combate do tempo trabalhado (só o tempo das ações completas). */
function withCombatXp(result: SimResult, activity: Activity, combatXp: number, professionXp: number): SimResult {
  const worked = result.since - activity.since;
  if (worked <= 0 || result.gains.actions <= 0) return result;
  const share = professionCombatXpShare(levelForXp(professionXp, activity.skill));
  const level = levelForXp(combatXp, 'combat');
  const xp = Math.floor((share * combatXpRate(level) * xpStageMult(level) * worked) / 3_600_000);
  if (xp > 0) result.gains.xp.combat = (result.gains.xp.combat ?? 0) + xp;
  return result;
}

/** O que o cliente precisa para animar o ciclo atual da caçada. */
export interface CycleView {
  monster: string;
  monsters?: string[];
  fightMs: number;
  restMs: number;
  outcome: 'win' | 'draw' | 'death';
  playerHp: number;
  playerMana: number;
  /** Mana no começo da luta e quanto regenera por segundo (a tela desenha a barra de mana). */
  manaStart?: number;
  manaRegen?: number;
  monsterHp: number;
  monsterHps?: number[];
  monsterName: string;
  monsterNames?: string[];
  damageTaken: number;
  hits: Hit[];
  xp: number;
  loot: Record<string, number>;
  /** Comida comida depois da luta (encurta o descanso). */
  ate: string | null;
}

/**
 * O personagem na caçada, montado igual a simulateHunt (skills, poção, flecha, poção de mana, regras,
 * runas e refeição). Serve para a tela e para o dano por segundo de cada um no covil em grupo.
 */
export function huntFighter(ctx: HuntContext, at: number): Fighter {
  // Monta o personagem igual a simulateHunt (skills, poção de mana, regras, refeição); senão a tela
  // mostrava um personagem mais fraco que o real (morria na animação e vencia no servidor).
  const base = playerStats(ctx.vocation, ctx.combatXp, bonusAt(ctx, at), ctx.promotion, ctx.spells, ctx.skills);
  const potioned = ctx.potion && (ctx.bank?.[ctx.potion] ?? 0) > 0 ? withPotion(base, ctx.potion) : base;
  const arrowOn = ctx.vocation === 'hunter' && ctx.arrow && (ctx.bank?.[ctx.arrow] ?? 0) > 0;
  const arrowed = arrowOn ? withArrow(potioned, ctx.arrow) : potioned;
  const manaPotioned = withHealthPotion(withManaPotion(arrowed, ctx.manaPotion, ctx.bank ?? {}), ctx.food, ctx.bank ?? {});
  const withRules: Fighter = { ...manaPotioned, rules: ctx.rules ?? undefined };
  const runed = withRunes(withRules, ctx.runes ?? [], ctx.bank ?? {});
  const mealNow = ctx.meal && at < ctx.meal.until ? itemById(ctx.meal.item)?.meal : undefined;
  const player = mealNow?.buff === 'crit_chance' ? { ...runed, critChance: (runed.critChance ?? CRIT_CHANCE) + mealNow.value } : runed;
  return player;
}

/** O ciclo em andamento (o próximo a ser creditado), ou null se não é caçada. */
export function currentCycle(activity: Activity | null, ctx: HuntContext): CycleView | null {
  if (!activity || activity.skill !== 'combat') return null;
  if (isArenaNode(activity.node)) return currentArenaCycle(activity, ctx);
  const parsed = parseHuntNode(activity.node);
  if (!parsed) return null;
  // A tela mostra a luta com a mesma mana com que o servidor vai creditar.
  const fighter = huntFighter(ctx, activity.since);
  const withMana = typeof activity.mana === 'number' && Number.isFinite(activity.mana) ? { ...fighter, initialMana: activity.mana } : fighter;
  const player = activity.aura ? { ...withMana, initialAura: activity.aura } : withMana;
  const boostedId = ctx.boostedCreature ?? getBoostedCreature(new Date(activity.since));
  const c = runCycle(parsed.hunt, player, activity.seed, activity.seq, parsed.difficulty, parsed.pack, ctx.questSteps, ctx.charms, ctx.prey, boostedId, activity.since, ctx.lairGroup, ctx.partyBuffs, ctx.bosstiary);
  const meal = eatAfterFight(c, player, ctx.bank ?? {}, ctx.food);
  return {
    monster: c.monster.id,
    monsters: c.monsters.map((m) => m.id),
    fightMs: c.fightMs,
    restMs: instanceRest(parsed.hunt, meal.restMs),
    outcome: c.outcome,
    playerHp: player.hp,
    playerMana: player.mana ?? 0,
    manaStart: Math.min(player.mana ?? 0, player.initialMana ?? player.mana ?? 0),
    manaRegen: player.manaRegen ?? 2,
    monsterHp: c.monster.hp,
    monsterHps: c.monsters.map((m) => m.hp),
    monsterName: c.monster.name,
    monsterNames: c.monsters.map((m) => m.name),
    damageTaken: c.damageTaken,
    hits: c.hits,
    xp: c.outcome === 'win' ? c.xp : 0,
    loot: c.loot,
    ate: meal.ate,
  };
}
