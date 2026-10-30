import { randomInt } from 'node:crypto';
import {
  TRAVEL_MS,
  BUYBACK_MS,
  BUYBACK_MAX,
  buybackPrice,
  LAIR_COOLDOWN_MS,
  LAIR_GATHER_MS,
  huntFighter,
  lairGroupFor,
  type LairGroup,
  type PartyBuffs,
  STAMINA_MAX_MS,
  MEAL_MS,
  WORLD_BOSS_NODE,
  STAMINA_REGEN_RATIO,
  craftableCount,
  currentCycle,
  equipmentBonus,
  imbuementsBonus,
  imbuementById,
  imbuementFamily,
  gearPower,
  huntingTaskById,
  guildTaskById,
  guildRankFor,
  GUILD_SHOP,
  GUILD_GEMS,
  GUILD_XP_BOOST_MS,
  GUILD_GEM_QTY,
  ARTISAN_KIT_MS,
  type GuildShopItem,
  rankForPoints,
  isRashidItem,
  rashidPrice,
  arenaById,
  arenaNode,
  isArenaNode,
  isDummyNode,
  validCombatRules,
  getBoostedSkill,
  dummyById,
  PREY_SLOTS,
  PREY_BONUSES,
  PREY_DURATION_SECS,
  preyPool,
  preyRerollCost,
  PREY_OPTIONS,
  charmById,
  charmPoints,
  charmLevelCost,
  CHARM_MAX_LEVEL,
  bestiaryStage,
  bosstiaryBonus,
  parseArenaNode,
  GOLD,
  isProductionSkill,
  NO_FOOD,
  itemValue,
  MAX_PRICE,
  PROMOTION_LEVEL,
  SECOND_PROMOTION_LEVEL,
  THIRD_PROMOTION_LEVEL,
  FOURTH_PROMOTION_LEVEL,
  ASCENSION_STORY,
  promotionById,
  itemById,
  parseHuntNode,
  isBossNightmare,
  recipeById,
  type Activity,
  type ActivityContext,
  type EquipSlot,
  type OutfitId,
  levelForXp,
  blessPrice,
  isReaperNode,
  reaperPrice,
  REAPER_KEEP_MS,
  REAPER_MAX_PACKS,
  REAPER_NODE,
  itemsLostOnDeath,
  DAILY_COUNT,
  dailiesFor,
  nextDay,
  GATHER_SKILLS,
  type GatheringSkillId,
  endgameDailiesFor,
  endgameWeekliesFor,
  ENDGAME_DAILY_IDX_BASE,
  ENDGAME_WEEKLY_IDX_BASE,
  dayOf,
  weekOf,
  nextWeekResetAt,
  isRaidId,
  raidById,
  RAID_ID,
  SOUL_RAID_ID,
  BLOOD_RAID_ID,
  rollRaidPhaseReward,
  RAID_MIN_LEVEL,
  RAID_MIN_PARTY,
  RAID_MAX_PARTY,
  RAID_FRAGMENT_ID,
  RAID_SHOP_SET_COST,
  RAID_CHEST_COST,
  RAID_CHEST_GOLD,
  RAID_CHEST_WEEKLY_LIMIT,
  RAID_SET_ITEMS,
  defaultSpells,
  validSpells,
  SHOPS,
  shopPrice,
  BOSS_TOKEN,
  BOSS_TOKEN_SHOP_ITEMS,
  bossTokenPrice,
  refineCost,
  refineChance,
  refineMaterials,
  ascendCost,
  ascendChance,
  nextRarityId,
  FORGE_WARD,
  ascendFodder,
  ASCEND_FODDER,
  nextRefineId,
  BOSS_ESSENCE,
  bossEssenceFor,
  BOSS_ASCEND_ESSENCE,
  dismantleMaterials,
  nextQuest,
  questById,
  questDone,
  questProgress,
  type Quest,
  type StoryStep,
  storyById,
  questInstanceOpen,
  storyNeedDone,
  storyStepProgress,
  storyProgress,
  type QuestGoal,
  nodeById,
  simulate,
  SKILLS,
  PROFESSIONS,
  SLAYER_MONSTER_LEVEL,
  slayerXpPerKill,
  slayerCapeHpMult,
  withCombatPet,
  isCombatPet,
  lairCombatPet,
  COMBAT_PET_LAIR_CHANCE,
  SLAYER_PET,
  SLAYER_PET_CHANCE,
  slayerMasterById,
  rollSlayerTask,
  slayerTaskPoints,
  type SlayerSize,
  slayerCombatXpMult,
  SLAYER_BOSS_LEVEL,
  SLAYER_BOSS_XP_MULT,
  rollSlayerBossTask,
  questLowLevelXpMult,
  SLAYER_SHOP,
  SLAYER_BOOSTS,
  SLAYER_BOOST_MS,
  type SlayerBoostId,
  QUEUE_MAX,
  splitRarity,
  huntById,
  monsterById,
  instanceDailyXp,
  instanceChestGold,
  type Hunt,
  type Gains,
  type QueuedActivity,
  type AltBank,
  type PlayerState,
  type SkillId,
  petById,
  petForSkill,
  outfitGroupFor,
  outfitItems,
  OUTFIT_DROP_CHANCE,
  PET_XP_BONUS,
  petSkillsOf,
  petLootOf,
  PET_DROP_CHANCE,
  withSigils,
  sigilSlots,
  killsMissing,
  KIDS_CANDY,
  DONUT_BAG,
  DONUT_BAG_CRAFT_CHANCE,
  KIDS_PET_PRICE,
  KIDS_POTION_PRICE,
  KIDS_OUTFITS,
  KIDS_OUTFIT_PRICE,
  KIDS_POTION_MS,
  KIDS_XP_BONUS,
  KIDS_PROF_XP_BONUS,
  isKidsShopOpen,
  kidsCandiesFor,
  kidsDayOverlap,
  HALLOWEEN_CANDY,
  HALLOWEEN_MIN_HUNT_SHARE,
  HALLOWEEN_PET_PRICE,
  HALLOWEEN_SHOP_PETS,
  HALLOWEEN_POTION_PRICE,
  HALLOWEEN_OUTFITS,
  HALLOWEEN_OUTFIT_PRICE,
  HALLOWEEN_POTION_MS,
  HALLOWEEN_XP_BONUS,
  HALLOWEEN_PROF_XP_BONUS,
  HALLOWEEN_BOSS_TOKEN_PRICE,
  HALLOWEEN_ESSENCE_PRICE,
  isHalloweenShopOpen,
  halloweenCandiesFor,
  halloweenDayOverlap,
  xpEventBonus,
  withXpEvent,
  ZHARVOS_SANCTUM,
  bossMinLevel,
  BOSS_MIN_LEVEL_GAP,
  ZHARVOS_HAT_CHANCE,
  VOTE_COIN,
  CAPES,
  capeUnlocked,
  capeXpMult,
  capesEarned,
  isCape,
  VOTE_PET,
  VOTE_PET_PRICE,
  VOTE_OUTFITS,
  VOTE_OUTFIT_PRICE,
  VOTE_SHOP,
  VOTE_CHEST,
  rollVoteChest,
  type VoteShopItem,
  TASK_SHOP,
  TASK_SHOP_STAMINA_MS,
  TASK_SHOP_XP_BOOST_MS,
  featuredTasksFor,
  taskHuntLevel,
  taskPointsFor,
  FEATURED_TASK_BONUS,
  dailyChestStreak,
  dailyChestReward,
  taskShopPrice,
  IMBUEMENT_MATERIALS,
  PREY_WILDCARD,
  type TaskShopItem,
  npcBuys,
  achievementsDone,
  achievementById,
  FIRST_STEPS,
  CELEBRATE_PREFIX,
  firstStepClaimed,
  firstStepKey,
  MASTERY_MIN_LEVEL,
  huntLevelFor,
  playerLevelXpMult,
  canUnlockMasteryNode,
  masteryNodeById,
  masteryLevel,
  MASTERY_XP_MULT,
  masteryResetCost,
  masterySpentPoints,
  withMastery,
  xpForLevel,
} from '@grimhold/shared';
import type { Db } from './db.ts';

const OUT_OF_CITY = 'Você está caçando. Volte ao Bastião para negociar.';

/** Uma refeição vale 30 min. */

const NO_GAINS: Gains = { actions: 0, items: {}, xp: {} };

/** Soma os ganhos de dois trechos seguidos (a fila de profissões encadeia vários num crédito só). */
function mergeGains(a: Gains, b: Gains): Gains {
  const xp = { ...a.xp };
  for (const [k, v] of Object.entries(b.xp)) xp[k as SkillId] = (xp[k as SkillId] ?? 0) + (v ?? 0);
  const items = { ...a.items };
  for (const [k, v] of Object.entries(b.items ?? {})) items[k] = (items[k] ?? 0) + v;
  return { ...a, ...b, actions: a.actions + b.actions, xp, items };
}

/** Regras do jogo em cima do banco. Recebe 'now' de fora para os testes controlarem o relógio. */
/** Bolsa de armas: chance de sair a arma da vocação de quem abre (o resto se divide entre as outras). */
export const POUCH_OWN_WEIGHT = 0.55;

/** Baú da Instância e XP bônus da primeira vitória do dia: ouro, e os drops dos chefes com chance triplicada. */
function instanceDailyReward(hunt: Hunt): { xp: number; gold: number; items: Record<string, number> } {
  const items: Record<string, number> = {};
  for (const id of hunt.monsters) {
    for (const l of monsterById(id)?.loot ?? []) {
      if (l.item === 'gold' || Math.random() >= Math.min(1, l.chance * 3)) continue;
      const min = l.min ?? 1;
      const max = l.max ?? min;
      items[l.item] = (items[l.item] ?? 0) + min + Math.floor(Math.random() * (max - min + 1));
    }
  }
  return { xp: instanceDailyXp(hunt), gold: instanceChestGold(hunt.level), items };
}

const LOCKED = 'Esse item está trancado. Destranque no depósito para vender.';

/** Opções da Forja: usar o selo de proteção, sorteio (testes) e aviso do resultado. */
export type ForgeOpts = { protect?: boolean; rng?: () => number; onResult?: (text: string) => void };

export function createGame(db: Db) {
  /** Registro das compras da loja de Halloween (no journalctl), para desfazer troca errada de jogador. */
  function logHalloweenBuy(characterId: number, what: string, candies: number): void {
    const name = db.characterById(characterId)?.name ?? '?';
    console.log(`[halloween] ${name} (id ${characterId}) comprou ${what} por ${candies} doces`);
  }
  /** Entrega as capas conquistadas que o personagem não tem (no depósito ou vestida). Devolve as novas. */
  function grantCapes(characterId: number, now: number): string[] {
    // Pela base da capa (a evoluída ou refinada é "cape_x+1#3") e pelo registro de entregues: antes, evoluir
    // ou vender a capa fazia o jogo dar outra (26/10: capas duplicadas).
    const owned = new Set<string>();
    for (const [id, n] of Object.entries(db.bankFor(characterId))) if (n > 0) owned.add(splitRarity(id).base);
    for (const id of Object.values(db.equipmentFor(characterId))) if (id) owned.add(splitRarity(id).base);
    const granted = db.capesGranted(characterId);
    const earned = capesEarned(db.skillsFor(characterId));
    // Quem já tem (de qualquer forma) fica marcado como entregue.
    for (const c of earned) if (owned.has(c) && !granted.has(c)) db.markCapeGranted(characterId, c);
    const fresh = earned.filter((c) => !owned.has(c) && !granted.has(c));
    for (const c of fresh) db.markCapeGranted(characterId, c);
    if (fresh.length) {
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: Object.fromEntries(fresh.map((c) => [c, 1])), xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
    }
    return fresh;
  }

  /**
   * Tentativa da Forja (refino ou Ascensão): cobra o ouro (+ o Selo, se `protect`) e sorteia. Se der
   * certo, gasta `materials` e a peça (`slot` = a do corpo; senão uma do depósito) vira `nextId`.
   * Se falhar, só o ouro (e o Selo) se perde, e a chance daquele passo sobe com a piedade.
   */
  function forge(
    characterId: number,
    itemId: string,
    nextId: string,
    slot: EquipSlot | undefined,
    materials: Record<string, number>,
    cost: number,
    pity: { kind: 'pity' | 'rpity'; step: number; chance: (fails: number, ward?: boolean) => number },
    now: number,
    opts: ForgeOpts,
  ): string | null {
    const fails = db.forgePityFor(characterId, pity.kind)[pity.step] ?? 0;
    const bank = db.bankFor(characterId);
    const protect = !!opts.protect && pity.chance(fails) < 1;
    const items: Record<string, number> = {};
    for (const [id, q] of Object.entries(materials)) items[id] = (items[id] ?? 0) - q;
    if (!slot) items[itemId] = (items[itemId] ?? 0) - 1;
    for (const [id, q] of Object.entries(items)) if ((bank[id] ?? 0) < -q) return 'Faltam peças ou material no depósito.';
    if ((bank[GOLD] ?? 0) < cost) return `Ouro insuficiente (necessário ${cost} moedas).`;
    if (protect && (bank[FORGE_WARD] ?? 0) < 1) return 'Você não tem um Selo da Forja.';
    const chance = pity.chance(fails, protect);
    const ok = (opts.rng ?? Math.random)() < chance;

    const activity = db.activityFor(characterId);
    const apply = (changes: Record<string, number>) =>
      db.applyGains(characterId, { actions: 0, items: changes, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
    const paid: Record<string, number> = { [GOLD]: -cost };
    if (protect) paid[FORGE_WARD] = -1;
    if (!ok) {
      apply(paid);
      db.setForgePity(characterId, pity.step, fails + 1, pity.kind);
      opts.onResult?.(`A Forja falhou (${Math.round(chance * 100)}%): só o ouro se foi. A próxima tentativa deste passo tem ${Math.round(pity.chance(fails + 1) * 100)}%.`);
      return null;
    }
    if (fails) db.setForgePity(characterId, pity.step, 0, pity.kind);
    for (const [k, v] of Object.entries(paid)) items[k] = (items[k] ?? 0) + v;
    if (!slot) items[nextId] = (items[nextId] ?? 0) + 1;
    apply(items);
    if (slot) {
      // A peça nova fica equipada no mesmo espaço; a antiga volta ao depósito e sai.
      apply({ [nextId]: 1 });
      db.swapEquipment(characterId, slot, nextId);
      apply({ [itemId]: -1 });
    }
    if (chance < 1) opts.onResult?.(`A Forja deu certo: ${itemById(nextId)?.name ?? nextId}!`);
    return null;
  }

  /** Fora da caçada o personagem está no Bastião, onde ficam o Mercador e o Mercado. */
  const inCity = (characterId: number) => db.activityFor(characterId)?.skill !== 'combat';
  // Avisos para o chat geral fora do settle (o app manda no próximo tick).
  const announcements: string[] = [];
  const announce = (msg: string) => announcements.push(msg);

  /** Magias equipadas: as escolhidas, ou as padrão da vocação para o nível. */
  function spellsOf(characterId: number): string[] {
    const character = db.characterById(characterId)!;
    const level = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
    return db.spellsFor(characterId) ?? defaultSpells(character.vocation, level);
  }

  /** Stamina em `until`: a guardada mais o que voltou desde então (fora da caçada, 1 h a cada 2 h). */
  function staminaAt(characterId: number, until: number): number {
    const s = db.staminaFor(characterId);
    if (s.ms === null) return STAMINA_MAX_MS;
    // Na arena do chefe global a stamina é gasta (spendStamina), não volta.
    const a = db.activityFor(characterId);
    if (a?.node === WORLD_BOSS_NODE && s.at >= a.since) return s.ms;
    return Math.min(STAMINA_MAX_MS, s.ms + Math.max(0, until - s.at) / STAMINA_REGEN_RATIO);
  }
  /** Caçada de verdade, com a stamina no trecho (arena e boneco não gastam; o chefe global gasta em spendStamina). */
  // XP das quests e histórias: ×3 até o nível 120 de combate, caindo até ×1 no 150.
  const questXp = (characterId: number, xp: Partial<Record<SkillId, number>> | undefined) => {
    const mult = questLowLevelXpMult(levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat'));
    return Object.fromEntries(Object.entries(xp ?? {}).map(([k, v]) => [k, Math.round((v ?? 0) * mult)])) as Partial<Record<SkillId, number>>;
  };
  const huntsWithStamina = (a: { skill: string; node: string } | null) => !!a && a.skill === 'combat' && !!parseHuntNode(a.node);
  /** Nível que conta nas tarefas de caça (400+: combate + Maestria). */
  const taskLevelOf = (characterId: number) => taskHuntLevel(levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat'), masteryLevel(db.masteryFor(characterId)));

  /** Bônus do equipamento mais os sigilos nos espaços: o que a caçada, a arena e o chefe usam. */
  function combatBonus(characterId: number) {
    return withCombatPet(withMastery(withSigils(equipmentBonus(db.equipmentFor(characterId)), db.sigilsFor(characterId)), db.masteryFor(characterId).nodes), db.combatPetFor(characterId));
  }

  /**
   * Refeição automática: antes de creditar o trecho, come do depósito as que forem
   * precisas para cobrir até `now` (30 min cada), emendando uma na outra.
   */
  function renewMeal(characterId: number, activity: { since: number; seq: number }, now: number) {
    const meal = db.mealFor(characterId);
    if (!meal?.auto || meal.until >= now) return;
    let have = db.bankFor(characterId)[meal.item] ?? 0;
    let until = meal.until;
    let eaten = 0;
    while (until < now && have > 0) {
      until = Math.max(until, activity.since) + MEAL_MS;
      have--;
      eaten++;
    }
    if (!eaten) return;
    db.applyGains(characterId, { actions: 0, items: { [meal.item]: -eaten }, xp: {} }, activity.since, activity.seq);
    db.setMeal(characterId, { ...meal, until });
  }

  /** Capa do Slayer vestida e tarefa em andamento: o monstro da tarefa entra com menos vida. */
  function slayerCapeFor(characterId: number): { monster: string; hpMult: number } | undefined {
    const hpMult = slayerCapeHpMult(db.equipmentFor(characterId).cape ?? undefined);
    if (hpMult >= 1) return undefined;
    const sl = db.slayerFor(characterId);
    return sl.monster && sl.progress < sl.target ? { monster: sl.monster, hpMult } : undefined;
  }

  function context(characterId: number): ActivityContext {
    const character = db.characterById(characterId);
    if (!character) throw new Error(`Personagem ${characterId} não existe.`);
    return {
      spells: spellsOf(characterId),
      vocation: character.vocation,
      combatXp: db.skillsFor(characterId).combat ?? 0,
      skills: db.skillsFor(characterId),
      bonus: combatBonus(characterId),
      // Cada imbuement vale até acabar o tempo dele, contado do início do trecho a creditar.
      // Só em caçada (comum, instância e covil): na arena e no boneco nem vale nem gasta tempo.
      timedBonus: (huntsWithStamina(db.activityFor(characterId)) ? Object.entries(db.imbuementsFor(characterId)) : []).map(([id, secs]) => ({
        bonus: imbuementsBonus({ [id]: secs }),
        untilMs: (db.activityFor(characterId)?.since ?? 0) + secs * 1000,
      })),
      promotion: character.promotion,
      food: db.foodFor(characterId),
      meal: db.mealFor(characterId),
      potion: db.potionFor(characterId),
      manaPotion: db.manaPotionFor(characterId),
      rules: db.combatRulesFor(characterId),
      arrow: db.arrowFor(characterId),
      runes: db.runesFor(characterId),
      blessed: db.blessedFor(characterId),
      bank: db.bankFor(characterId),
      charms: db.charmsFor(characterId),
      prey: db.preyFor(characterId, PREY_SLOTS),
      bosstiary: bosstiaryBonus(db.bestiaryFor(characterId)),
      questSteps: Object.fromEntries(db.storiesFor(characterId).filter((s) => s.status === 'active').map((s) => [s.id, s.step])),
      petSkills: petSkillsOf(db.petsFor(characterId)),
      guildPoints: db.statsFor(characterId).guild_points ?? 0,
      artisanKitUntil: db.artisanKitUntil(characterId),
      petLoot: petLootOf(db.petsFor(characterId)),
      mastery: db.masteryFor(characterId).nodes,
      equipment: db.equipmentFor(characterId),
      gearPower: gearPower(db.equipmentFor(characterId)),
      masteryLevel: masteryLevel(db.masteryFor(characterId)),
      slayerCape: slayerCapeFor(characterId),
    };
  }

  /** Diárias de hoje com o progresso (o nível define o tamanho e a recompensa). */
  function todayDailies(characterId: number, now: number) {
    const level = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
    const day = dayOf(now);
    const preferred = db.dailyGatherPreferencesFor(characterId, day);
    const defs = dailiesFor(characterId, day, level, db.skillsFor(characterId), preferred);
    const states = db.dailiesFor(characterId, day, DAILY_COUNT);
    return { day, list: defs.map((d, i) => ({ ...d, ...(states.find((s) => s.idx === i) ?? { idx: i, progress: 0, claimed: false }) })) };
  }

  /** Diárias (idx 100+, pelo dia) e semanais (idx 200+, pela semana) de fim de jogo, do 400+. */
  function endgameTasks(characterId: number, now: number) {
    const level = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
    const day = dayOf(now);
    const week = weekOf(now);
    const daily = endgameDailiesFor(characterId, day, level);
    const weekly = endgameWeekliesFor(characterId, week, level);
    const dRows = db.dailyRows(characterId, day, daily.map((_, i) => ENDGAME_DAILY_IDX_BASE + i));
    // Vaga fixa por semanal (a da raide só aparece com ela ligada; a de abates não muda de lugar).
    const wIdx = (d: (typeof weekly)[number]) => ENDGAME_WEEKLY_IDX_BASE + (d.goal.kind === 'raid' ? 0 : 1);
    const wRows = db.dailyRows(characterId, week, weekly.map(wIdx));
    const bank = daily.some((d) => d.goal.kind === 'deliver') ? db.bankFor(characterId) : {};
    const row = (rows: typeof dRows, idx: number) => rows.find((r) => r.idx === idx) ?? { idx, progress: 0, claimed: false };
    return [
      ...daily.map((d, i) => {
        const r = row(dRows, ENDGAME_DAILY_IDX_BASE + i);
        // Entrega: o progresso é o que tem no banco (sai na hora de entregar).
        return { ...d, ...r, key: day, progress: d.goal.kind === 'deliver' ? (bank[d.goal.item] ?? 0) : r.progress };
      }),
      ...weekly.map((d) => ({ ...d, ...row(wRows, wIdx(d)), key: week })),
    ];
  }

  function trackDailies(characterId: number, now: number, amount: (goal: QuestGoal) => number) {
    const { day, list } = todayDailies(characterId, now);
    for (const d of list) {
      if (d.claimed) continue;
      const n = amount(d.goal);
      if (n > 0) db.addDailyProgress(characterId, day, d.idx, n);
    }
    for (const d of endgameTasks(characterId, now)) {
      if (d.claimed || d.goal.kind === 'deliver') continue;
      const n = amount(d.goal);
      if (n > 0) db.addDailyProgress(characterId, d.key, d.idx, n);
    }
  }

  /** Soma progresso ao objetivo do passo atual das histórias em andamento. */
  function trackStories(characterId: number, amount: (step: StoryStep) => number) {
    for (const s of db.storiesFor(characterId)) {
      if (s.status !== 'active') continue;
      const step = storyById(s.id)?.steps[s.step];
      const n = step?.need ? amount(step) : 0;
      if (n > 0) db.addStoryProgress(characterId, s.id, n);
    }
  }

  /** Soma progresso às quests ativas (o quanto cada uma ganha vem de `amount`). */
  function trackQuests(characterId: number, amount: (q: Quest) => number) {
    for (const s of db.questsFor(characterId)) {
      if (s.status !== 'active') continue;
      const q = questById(s.id);
      const n = q ? amount(q) : 0;
      if (n > 0) db.addQuestProgress(characterId, s.id, n);
    }
  }

  let partyBonusOf: (characterId: number, offline: boolean) => number = () => 0;

  /**
   * Quando começa a luta do covil: entrando pela party num covil em que um aliado ainda espera o
   * grupo, a mesma hora dele (lutam juntos); em party, espera LAIR_GATHER_MS o grupo chegar; sozinho,
   * só a caminhada.
   */
  function lairStart(characterId: number, node: string, now: number): number {
    const members = db.partyFor(characterId)?.members ?? [];
    if (members.length <= 1) return now + TRAVEL_MS;
    const waiting = members
      .filter((m) => m !== characterId)
      .map((m) => db.activityFor(m))
      .filter((a) => a?.skill === 'combat' && a.node === node && a.since > now)
      .map((a) => a!.since);
    return waiting.length ? Math.min(...waiting) : now + LAIR_GATHER_MS;
  }
  let lairMembersOf: (characterId: number) => number[] = () => [];
  let partyBuffsOf: (characterId: number) => PartyBuffs | undefined = () => undefined;
  /** Covil em grupo: a luta compartilhada de cada luta (covil e hora de começo), montada uma vez só. */
  const lairFights = new Map<string, Map<number, LairGroup>>();
  const raidFights = new Map<string, { fight: Map<number, LairGroup>; at: number }>();
  /** Quem está sendo acertado agora na raide (para o acerto do grupo não voltar em si mesmo). */
  const settlingRaid = new Set<number>();
  function lairGroupOf(characterId: number, activity: Activity, now: number): LairGroup | undefined {
    const hunt = parseHuntNode(activity.node)?.hunt;
    if ((!hunt?.lair && !hunt?.raid) || now < activity.since) return undefined;
    // Raide: a luta de cada fase fica guardada pela entrada (seed) e pela fase, assim quem é acertado depois
    // (offline, ou depois do fim da raide do líder) reaproveita a mesma luta em grupo.
    const raidKey = hunt.raid ? `${activity.seed}:${activity.seq}` : null;
    const key = `${activity.node}:${activity.since}`;
    let fight = raidKey ? raidFights.get(raidKey)?.fight : lairFights.get(key);
    if (!fight) {
      const members = lairMembersOf(characterId);
      if (members.length < 2) return undefined;
      const pickMonster = hunt.raid ? hunt.monsters[Math.min(activity.seq ?? 0, hunt.monsters.length - 1)] : hunt.monsters[0];
      const boss = monsterById(pickMonster)!;
      const fighters = members.map((m) => ({ id: m, fighter: huntFighter(context(m), activity.since) }));
      fight = lairGroupFor(fighters, boss, partyBuffsOf(characterId));
      if (raidKey) {
        raidFights.set(raidKey, { fight, at: now });
        for (const [k, v] of raidFights) if (v.at < now - 2 * 3_600_000) raidFights.delete(k);
      } else lairFights.set(key, fight);
      // Lutas velhas saem (a luta dura no máximo um minuto).
      for (const k of lairFights.keys()) if (Number(k.split(':').pop()) < now - 30 * 60_000) lairFights.delete(k);
    }
    return fight.get(characterId);
  }

  return {
    /**
     * Credita o que completou desde o último acerto. Chamar antes de ler ou mudar o estado.
     * Se o personagem morreu, a atividade é encerrada e `gains.death` vem preenchido.
     */
    /** `offlineXp`: fração da XP que vale (no login, o tempo com o jogo fechado rende OFFLINE_XP). */
    /** Liga o bônus da party (o app passa o PartyManager): vale em todo acerto, inclusive no login. */
    setPartyBonus(fn: (characterId: number, offline: boolean) => number) {
      partyBonusOf = fn;
    },
    /** Liga o covil em grupo (quem da party está na mesma luta) e os buffs de party por vocação. */
    setPartyFights(members: (characterId: number) => number[], buffs: (characterId: number) => PartyBuffs | undefined) {
      lairMembersOf = members;
      partyBuffsOf = buffs;
    },
    settle(characterId: number, now: number, partyBonus?: number, offlineXp = 1): { gains: Gains; elapsedMs: number; changed: boolean; broadcasts: string[] } {
      const activity = db.activityFor(characterId);
      const broadcasts: string[] = [];
      if (!activity) return { gains: NO_GAINS, elapsedMs: 0, changed: false, broadcasts };
      // Raide em grupo: acerta os outros do grupo (mesma entrada) junto, enquanto todos ainda estão na raide.
      // Assim quem está offline ganha a luta em grupo, mesmo se o servidor reiniciou no meio.
      if (activity.skill === 'combat' && parseHuntNode(activity.node)?.hunt.raid && !settlingRaid.has(characterId)) {
        settlingRaid.add(characterId);
        try {
          for (const m of lairMembersOf(characterId)) {
            if (m === characterId || settlingRaid.has(m)) continue;
            settlingRaid.add(m);
            try { this.settle(m, now, undefined, offlineXp); } finally { settlingRaid.delete(m); }
          }
        } finally {
          settlingRaid.delete(characterId);
        }
      }
      const character = db.characterById(characterId);
      const charName = character?.name ?? 'Um aventureiro';
      const prevSkills = db.skillsFor(characterId);
      const prevCombatLvl = levelForXp(prevSkills.combat ?? 0, 'combat');

      renewMeal(characterId, activity, now);
      const ctx = context(characterId);
      // Instância: a primeira vitória do dia não gasta chave.
      const instHunt = activity.skill === 'combat' ? parseHuntNode(activity.node)?.hunt : undefined;
      // Instância: a tentativa grátis do dia é a entrada que a gastou (morrer ou sair perde o grátis).
      const freeRun = !!instHunt?.boss && db.instanceFreeFor(characterId)[instHunt.id]?.seed === activity.seed;
      if (instHunt?.boss) {
        ctx.instanceFreeKey = freeRun;
        // Qual entrada do dia é esta (a XP dos monstros cai na 2ª e na 3ª).
        const tries = db.instanceTriesFor(characterId)[instHunt.id];
        ctx.instanceTry = tries?.seed === activity.seed ? tries.tries : freeRun ? 1 : 2;
      }
      // No login (offlineXp < 1) o trecho foi com o jogo fechado: o bônus vale menos.
      const bonus = partyBonus ?? partyBonusOf(characterId, offlineXp !== 1);
      if (bonus) ctx.partyBonus = bonus;
      const buffs = activity.skill === 'combat' ? partyBuffsOf(characterId) : undefined;
      if (buffs) ctx.partyBuffs = buffs;
      // Covil e raide em grupo (antes só o covil: a raide no acerto era sempre solo).
      if (instHunt?.lair || instHunt?.raid) ctx.lairGroup = lairGroupOf(characterId, activity, now);
      // Caçada: começa com a stamina guardada mais o que voltou até o início do trecho.
      if (huntsWithStamina(activity)) ctx.staminaMs = staminaAt(characterId, activity.since);
      // Fila de profissões: a atual pode ter hora marcada para parar (a próxima começa nela).
      const queued = activity.skill !== 'combat' ? db.queueFor(characterId) : null;
      const simNow = queued?.until != null && queued.until < now ? queued.until : now;
      const result = simulate(activity, simNow, ctx);
      const changed = result.gains.actions > 0 || result.ended || result.seq !== activity.seq;
      // Morte: a bênção protege os itens (e é gasta); sem ela, cada peça pode se perder.
      const death = result.gains.death;
      // Na Arena (como no Tibia) a morte não custa itens nem a bênção.
      if (death && !isArenaNode(activity.node)) {
        if (db.blessedFor(characterId)) {
          db.setBlessed(characterId, false);
          death.blessed = true;
        } else {
          const equipment = db.equipmentFor(characterId);
          const lost = itemsLostOnDeath(equipment, activity.seed, result.seq);
          for (const slot of lost) db.loseEquipment(characterId, slot);
          death.itemsLost = lost.map((slot) => equipment[slot]!);
          // O Ceifador guarda as peças por um tempo; o resgate custa mais que a bênção.
          if (death.itemsLost.length) {
            const price = reaperPrice(prevCombatLvl);
            const expiresAt = now + REAPER_KEEP_MS;
            db.addReaperPack(characterId, death.itemsLost, price, now, expiresAt, REAPER_MAX_PACKS);
            death.reaper = { price, expiresAt };
          }
        }
      }
      if (changed) {
        // Bônus de XP dos mascotes (+50% na profissão de cada um): basta ter, não precisa equipar.
        for (const skill of new Set(petSkillsOf(db.petsFor(characterId)))) {
          if (result.gains.xp?.[skill]) result.gains.xp[skill] = Math.round(result.gains.xp[skill]! * (1 + PET_XP_BONUS));
        }
        // Capa de maestria equipada: +5% de XP na profissão dela (a da Maestria, em todas).
        const cape = db.equipmentFor(characterId).cape;
        if (cape) {
          for (const [skill, xp] of Object.entries(result.gains.xp)) {
            const mult = capeXpMult(cape, skill as SkillId);
            if (xp && mult !== 1) result.gains.xp[skill as SkillId] = Math.round(xp * mult);
          }
        }
        // Fim de semana de XP: bônus em todas as skills na parte do trecho dentro do evento.
        const evBonus = xpEventBonus(activity.since, result.since);
        if (evBonus > 0) {
          for (const [skill, xp] of Object.entries(result.gains.xp)) {
            if (xp && xp > 0) result.gains.xp[skill as keyof typeof result.gains.xp] = Math.round(xp * (1 + evBonus));
          }
        }
        // Halloween: a Abóbora Assombrada só dá doce em caçada perto do nível (no Dia das Crianças, quem era alto
        // farmava doce matando bando x7 em caçada fraca). Caçada abaixo de 70% do nível: os doces da luta somem.
        if (instHunt && instHunt.level < Math.floor(prevCombatLvl * HALLOWEEN_MIN_HUNT_SHARE) && result.gains.items?.[HALLOWEEN_CANDY]) delete result.gains.items[HALLOWEEN_CANDY];
        // Evento de Halloween: +25% de XP no combate, +50% nas profissões e doces pelo tempo de atividade (qualquer skill).
        const hwMs = halloweenDayOverlap(activity.since, result.since);
        if (hwMs > 0) {
          const share = hwMs / Math.max(1, result.since - activity.since);
          for (const [skill, xp] of Object.entries(result.gains.xp)) {
            const bonus = (PROFESSIONS as readonly string[]).includes(skill) ? HALLOWEEN_PROF_XP_BONUS : HALLOWEEN_XP_BONUS;
            if (xp && xp > 0) result.gains.xp[skill as keyof typeof result.gains.xp] = Math.round(xp * (1 + bonus * share));
          }
          const candies = halloweenCandiesFor(hwMs);
          if (candies > 0) {
            result.gains.items = result.gains.items ?? {};
            result.gains.items[HALLOWEEN_CANDY] = (result.gains.items[HALLOWEEN_CANDY] ?? 0) + candies;
          }
        }
        // Dia das Crianças: +25% de XP no combate, +50% nas profissões e doces pelo tempo de atividade (qualquer skill).
        const kidsMs = kidsDayOverlap(activity.since, result.since);
        if (kidsMs > 0) {
          const share = kidsMs / Math.max(1, result.since - activity.since);
          for (const [skill, xp] of Object.entries(result.gains.xp)) {
            const bonus = skill === 'combat' ? KIDS_XP_BONUS : KIDS_PROF_XP_BONUS;
            if (xp && xp > 0) result.gains.xp[skill as keyof typeof result.gains.xp] = Math.round(xp * (1 + bonus * share));
          }
          const candies = kidsCandiesFor(kidsMs);
          if (candies > 0) {
            result.gains.items = result.gains.items ?? {};
            result.gains.items[KIDS_CANDY] = (result.gains.items[KIDS_CANDY] ?? 0) + candies;
          }
          // Criando itens no evento: chance pequena de uma Bolsa de Donuts por item feito.
          if (isProductionSkill(activity.skill) && result.gains.actions > 0) {
            let bags = 0;
            for (let i = Math.round(result.gains.actions * share); i > 0; i--) if (Math.random() < DONUT_BAG_CRAFT_CHANCE) bags++;
            if (bags > 0) {
              result.gains.items = result.gains.items ?? {};
              result.gains.items[DONUT_BAG] = (result.gains.items[DONUT_BAG] ?? 0) + bags;
            }
          }
        }
        // Poção Doce de XP: XP em dobro na parte do trecho antes de ela acabar.
        const boostMs = Math.max(0, Math.min(result.since, db.xpBoostUntil(characterId)) - activity.since);
        if (boostMs > 0) {
          const share = Math.min(1, boostMs / Math.max(1, result.since - activity.since));
          for (const [skill, xp] of Object.entries(result.gains.xp)) {
            if (xp && xp > 0) result.gains.xp[skill as keyof typeof result.gains.xp] = Math.round(xp * (1 + share));
          }
        }
        // Boost de loot do Slayer: +25% ou +50% nos itens e no ouro da caçada (lendários não), na parte do trecho com ele.
        const slb = activity.skill === 'combat' ? db.slayerBoostsFor(characterId) : null;
        const lootMs = slb ? Math.max(0, Math.min(result.since, slb.lootUntil) - activity.since) : 0;
        if (slb && lootMs > 0 && result.gains.items) {
          const extra = slb.lootMult * Math.min(1, lootMs / Math.max(1, result.since - activity.since));
          for (const [id, q] of Object.entries(result.gains.items)) {
            if (!q || q <= 0 || itemById(id)?.legendary) continue;
            const add = q * extra;
            result.gains.items[id] = q + Math.floor(add) + (Math.random() < add - Math.floor(add) ? 1 : 0);
          }
        }
        // Jogo fechado: a XP rende menos (o loot não muda).
        if (offlineXp !== 1) {
          for (const [skill, xp] of Object.entries(result.gains.xp)) {
            if (xp && xp > 0) result.gains.xp[skill as keyof typeof result.gains.xp] = Math.floor(xp * offlineXp);
          }
        }

        // Roupa de profissão: chance por ação de achar uma peça (qualquer das 4; repetida vale no Mercado).
        const group = activity.skill !== 'combat' ? outfitGroupFor(activity.skill) : null;
        if (group && result.gains.actions > 0 && Math.random() < 1 - Math.pow(1 - OUTFIT_DROP_CHANCE, result.gains.actions)) {
          const pieces = outfitItems(group);
          const piece = pieces[Math.floor(Math.random() * pieces.length)];
          if (piece) {
            result.gains.items = result.gains.items ?? {};
            result.gains.items[piece.id] = (result.gains.items[piece.id] ?? 0) + 1;
          }
        }

        // Chance de drop de mascote da profissão
        if (result.gains.actions > 0) {
          const petDrop = petForSkill(activity.skill);
          if (petDrop && !db.petsFor(characterId).includes(petDrop.id)) {
            // Probabilidade cumulativa para N ações: 1 - (1 - p)^N
            const gotPet = Math.random() < (1 - Math.pow(1 - PET_DROP_CHANCE, result.gains.actions));
            if (gotPet) {
              db.unlockPet(characterId, petDrop.id);
              broadcasts.push(`${charName} encontrou um mascote lendário enquanto treinava ${petDrop.name}!`);
            }
          }
        }

        // Mascote de combate dos covis: chance rara por vitória (o mascote da faixa de nível do covil).
        if (result.gains.cleared && instHunt?.lair && result.gains.cleared === instHunt.id) {
          const lairPet = lairCombatPet(instHunt.level);
          if (!db.petsFor(characterId).includes(lairPet) && Math.random() < COMBAT_PET_LAIR_CHANCE) {
            db.unlockPet(characterId, lairPet);
            broadcasts.push(`${charName} encontrou um mascote de combate no covil: ${petById(lairPet)?.name ?? lairPet}!`);
          }
        }
        // Primeira vitória do dia na instância: XP bônus e o Baú da Instância.
        if (result.gains.cleared && instHunt?.boss && result.gains.cleared === instHunt.id) {
          // Instância de quest não dá o baú do dia (vence uma vez só).
          if (freeRun && !instHunt.quest) {
            const daily = instanceDailyReward(instHunt);
            result.gains.xp.combat = (result.gains.xp.combat ?? 0) + daily.xp;
            result.gains.items = result.gains.items ?? {};
            for (const [id, q] of Object.entries({ gold: daily.gold, ...daily.items })) result.gains.items[id] = (result.gains.items[id] ?? 0) + q;
            result.gains.instanceDaily = { id: instHunt.id, ...daily };
          }
          db.markInstanceClear(characterId, instHunt.id, dayOf(now));
        }
        // Slayer: abates da espécie da tarefa contam (até a meta) e dão XP de Slayer; na meta, pontos e sequência.
        if (result.gains.kills) {
          const sl = db.slayerFor(characterId);
          const got = sl.monster ? (result.gains.kills[sl.monster] ?? 0) : 0;
          const counted = Math.min(got, Math.max(0, sl.target - sl.progress));
          if (counted > 0) {
            const boss = sl.size === 'boss' ? SLAYER_BOSS_LEVEL.get(sl.monster!) : undefined;
            const lvl = boss?.level ?? SLAYER_MONSTER_LEVEL.get(sl.monster!) ?? 1;
            // A XP de Slayer entra aqui, depois dos bônus gerais: a capa e o mascote do Slayer valem só nela.
            const ownedPets = db.petsFor(characterId);
            const slayerMult = capeXpMult(db.equipmentFor(characterId).cape ?? undefined, 'slayer') * (ownedPets.includes(SLAYER_PET) ? 1 + PET_XP_BONUS : 1);
            result.gains.xp.slayer = (result.gains.xp.slayer ?? 0) + Math.round(counted * slayerXpPerKill(lvl) * (boss ? SLAYER_BOSS_XP_MULT : 1) * slayerMult);
            // Mascote do Slayer: chance rara por abate da tarefa.
            if (!ownedPets.includes(SLAYER_PET) && Math.random() < 1 - Math.pow(1 - SLAYER_PET_CHANCE, counted)) {
              db.unlockPet(characterId, SLAYER_PET);
              broadcasts.push(`${charName} encontrou um mascote lendário caçando na tarefa de Slayer: a Caveira Sombria!`);
            }
            // XP de combate extra pelos abates da tarefa (forte até o nível 100); chefe já paga a própria XP.
            if (!boss) {
              const cLvl = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
              const baseXp = monsterById(sl.monster!)?.xp ?? 0;
              result.gains.xp.combat = (result.gains.xp.combat ?? 0) + Math.round(counted * baseXp * slayerCombatXpMult(cLvl));
            }
            sl.progress += counted;
            if (sl.progress >= sl.target) {
              const master = sl.master ? slayerMasterById(sl.master) : undefined;
              sl.streak += 1;
              sl.completed += 1;
              if (master) sl.points += slayerTaskPoints(master, sl.streak, sl.size);
              if (sl.size === 'boss') db.addStat(characterId, 'slayer_boss', 1);
              sl.monster = null;
              sl.size = null;
              sl.target = 0;
              sl.progress = 0;
            }
            db.setSlayer(characterId, sl);
          }
        }
        // XP/h real da caçada (para o cartão): XP de combate já com todos os bônus e o tempo do trecho.
        if (activity.skill === 'combat') {
          const hn = parseHuntNode(activity.node);
          const ms = result.since - activity.since;
          if (hn && ms > 0) db.addHuntXp(characterId, `${hn.hunt.id}@${hn.difficulty.id}`, activity.seed, result.gains.xp.combat ?? 0, ms);
        }
        if (result.gains.raidPhases && result.gains.raidPhases.length) {
          const week = weekOf(now);
          const isSolo = !ctx.lairGroup;
          const hn = parseHuntNode(activity.node);
          const raidId = hn?.hunt.id ?? RAID_ID;
          const raid = raidById(raidId);
          const totalPhases = raid ? raid.phases.length : 3;
          for (const phase of result.gains.raidPhases) {
            if (!db.hasRaidPhaseClear(characterId, week, raidId, phase)) {
              const isFinalPhase = phase === totalPhases;
              const pity = isFinalPhase ? db.raidPityFor(characterId, raidId) : 0;
              const reward = rollRaidPhaseReward(activity.seed, characterId, raidId, phase, isSolo, pity);
              // O ouro é um item do banco ('gold'), igual ao loot.
              for (const [k, q] of Object.entries(reward.items)) result.gains.items[k] = (result.gains.items[k] ?? 0) + q;
              if (isFinalPhase) {
                if (reward.gotPiece) {
                  db.setRaidPity(characterId, raidId, 0);
                  const msg = raidId === 'raid_usurper'
                    ? `O jogador ${charName} conquistou uma peça do Set do Usurpador Ascendido na Raide!`
                    : raidId === 'raid_souls'
                    ? `O jogador ${charName} conquistou uma peça do Set das Almas Partidas na Raide!`
                    : raidId === 'raid_blood'
                    ? `O jogador ${charName} conquistou uma peça do Set Sanguíneo na Raide!`
                    : raidId === 'raid_frost'
                    ? `O jogador ${charName} conquistou uma peça do Set do Inverno Eterno na Raide!`
                    : `O jogador ${charName} conquistou uma peça de Raide (${raid?.name ?? raidId})!`;
                  broadcasts.push(msg);
                } else {
                  db.setRaidPity(characterId, raidId, pity + 1);
                }
              }
              db.markRaidPhaseClear(characterId, week, raidId, phase, isSolo, !!reward.gotPiece, now);
              // Traje da Raide: de quem vence a fase final (a raide inteira).
              if (isFinalPhase && !isSolo && raid?.outfit) db.unlockOutfit(characterId, raid.outfit as any);
            }
          }
        }
        db.applyGains(characterId, result.gains, result.since, result.seq, result.ended);
        // Caçada: a mana segue para o próximo crédito (só se a mesma atividade continua).
        if (!result.ended && result.mana !== undefined && db.activityFor(characterId)?.seed === activity.seed) db.setActivityMana(characterId, result.mana);
        if (!result.ended && result.aura !== undefined && db.activityFor(characterId)?.seed === activity.seed) db.setActivityAura(characterId, result.aura);
        if (result.gains.staminaLeftMs !== undefined) db.setStamina(characterId, result.gains.staminaLeftMs, result.since);
        // Treinando profissão ou no boneco a stamina volta 1 h a cada 30 min (parado é 1 a cada 1);
        // na Skill do Dia (pelo dia em que o trecho começou), 1 h a cada 15 min.
        const worked = result.since - activity.since;
        if ((activity.skill !== 'combat' || isDummyNode(activity.node)) && worked > 0) {
          const rate = getBoostedSkill(new Date(activity.since)) === activity.skill ? 4 : 2;
          const extra = worked * (rate - 1 / STAMINA_REGEN_RATIO);
          db.setStamina(characterId, Math.min(STAMINA_MAX_MS, staminaAt(characterId, result.since) + extra), result.since);
        }
        const nextSkills = db.skillsFor(characterId);
        // 400+: o nível recebe só 4% (freio), a barra de Maestria recebe a XP cheia (sem o freio), como no Lost Ark.
        const masteryGain = prevCombatLvl >= MASTERY_MIN_LEVEL ? Math.max(0, Math.round((result.gains.xp.combat ?? 0) / playerLevelXpMult(prevCombatLvl))) : Math.max(0, (nextSkills.combat ?? 0) - Math.max(prevSkills.combat ?? 0, xpForLevel(MASTERY_MIN_LEVEL)));
        if (masteryGain > 0) db.addMasteryXp(characterId, masteryGain * MASTERY_XP_MULT);
        const nextCombatLvl = levelForXp(nextSkills.combat ?? 0, 'combat');

        // Marcos de nível de combate
        if (nextCombatLvl > prevCombatLvl) {
          const milestones = [30, 50, 75, 100, 120];
          for (const m of milestones) {
            if (prevCombatLvl < m && nextCombatLvl >= m) {
              if (m === 30) broadcasts.push(`O jogador ${charName} alcançou o nível 30 de combate e pode escolher uma promoção!`);
              else if (m === 50) {
                broadcasts.push(`O jogador ${charName} alcançou o nível 50 de combate!`);
                db.unlockOutfit(characterId, 'noble');
              } else if (m === 100) broadcasts.push(`O bravo herói ${charName} alcançou o grandioso nível 100 de combate!`);
              else if (m === 120) broadcasts.push(`O lendário guerreiro ${charName} alcançou o nível 120 de combate!`);
              else broadcasts.push(`O jogador ${charName} alcançou o nível ${m} de combate!`);
            }
          }
          if (prevCombatLvl >= 120 && Math.floor(nextCombatLvl / 10) > Math.floor(prevCombatLvl / 10)) {
            broadcasts.push(`${charName} ultrapassou os limites e alcançou o nível ${Math.floor(nextCombatLvl / 10) * 10} de combate!`);
          }
        }

        // Nível 120 em profissões
        for (const skill of [...PROFESSIONS, 'slayer' as const]) {
          const pPrev = levelForXp(prevSkills[skill] ?? 0, skill);
          const pNext = levelForXp(nextSkills[skill] ?? 0, skill);
          // O primeiro do servidor a chegar no 99 numa profissão: aviso para todos com faixa e fanfarra.
          if (pPrev < 99 && pNext >= 99 && !db.skillXpsOfOthers(skill, characterId).some((xp) => levelForXp(xp, skill) >= 99) && db.claimFirst99(skill, characterId)) {
            const sName = SKILLS.find((s) => s.id === skill)?.name ?? skill;
            broadcasts.push(`${CELEBRATE_PREFIX}${charName} é o primeiro do servidor a alcançar o nível 99 em ${sName}!`);
          }
          if (pPrev < 120 && pNext >= 120) {
            const sName = SKILLS.find((s) => s.id === skill)?.name ?? skill;
            broadcasts.push(`${charName} alcançou a maestria máxima (Nv 120) em ${sName}!`);
          }
        }
        for (const capeId of grantCapes(characterId, now)) {
          broadcasts.push(`${charName} conquistou a ${itemById(capeId)?.name ?? capeId}!`);
        }

        // Drops raros ou lendários
        for (const [itemId, qty] of Object.entries(result.gains.items ?? {})) {
          if (qty > 0) {
            const it = itemById(itemId);
            const r = splitRarity(itemId);
            if (r.tier >= 4) {
              broadcasts.push(`${charName} encontrou um item lendário: ${it?.name ?? itemId}!`);
            } else if (r.tier === 3) {
              broadcasts.push(`${charName} encontrou um item épico: ${it?.name ?? itemId}!`);
            } else if (it && (it.value ?? 0) >= 1200 && (it.equip || it.legendary)) {
              broadcasts.push(`${charName} encontrou um item valioso: ${it.name}!`);
            }
          }
        }

        if (activity.skill === 'combat') {
          // Imbuement: o tempo só corre em caçada (arena, boneco, Limiar e chefe global não gastam).
          // Segundos inteiros que passaram entre os dois instantes (sem perder a fração de cada crédito:
          // creditando a cada segundo, o arredondamento de cada pedaço fazia o imbuement durar mais).
          const combatSecs = Math.max(0, Math.floor(result.since / 1000) - Math.floor(activity.since / 1000));
          if (combatSecs > 0 && huntsWithStamina(activity)) db.decrementImbuements(characterId, combatSecs);
          if (result.gains.preySecondsUsed) {
            for (const [mId, secs] of Object.entries(result.gains.preySecondsUsed)) {
              if (secs > 0) db.decrementPrey(characterId, mId, secs);
            }
          }
        }
        if (result.gains.kills) {
          for (const t of db.huntingTasksFor(characterId)) {
            if (t.status !== 'active') continue;
            const def = huntingTaskById(t.id);
            if (!def) continue;
            const kills = result.gains.kills[def.monsterId] ?? 0;
            if (kills > 0) {
              db.addHuntingTaskProgress(characterId, t.id, kills);
              if (t.progress + kills >= def.killsRequired) {
                db.setHuntingTaskStatus(characterId, t.id, 'ready');
              }
            }
          }
        }
        // Encomenda da Guilda da profissão que está rodando: conta o item que ela rende.
        if (activity.skill !== 'combat') {
          const order = db.guildTasksFor(characterId).find((t) => t.skill === activity.skill);
          const def = order ? guildTaskById(order.id) : undefined;
          const got = def ? (result.gains.items?.[def.item] ?? 0) : 0;
          if (def && got > 0 && order!.progress < def.count) db.addGuildProgress(characterId, def.skill, Math.min(got, def.count - order!.progress));
        }
        trackQuests(characterId, (q) => questProgress(q, result.gains));
        trackStories(characterId, (step) => storyProgress(step, result.gains));
        trackDailies(characterId, now, (goal) => questProgress({ goal } as Quest, result.gains));
        if (result.gains.kills) {
          // Boost de Bestiário do Slayer: abates contam em dobro no Bestiário (na parte do trecho com ele).
          const bUntil = db.slayerBoostsFor(characterId).bestiaryUntil;
          const bShare = Math.min(1, Math.max(0, Math.min(result.since, bUntil) - activity.since) / Math.max(1, result.since - activity.since));
          const bk = bShare > 0 ? Object.fromEntries(Object.entries(result.gains.kills).map(([m, k]) => [m, k + Math.round(k * bShare)])) : result.gains.kills;
          db.addBestiaryKills(characterId, bk);
        }
        const kills = Object.values(result.gains.kills ?? {}).reduce((n, k) => n + k, 0);
        db.addStat(characterId, 'kills', kills);
        if (result.gains.cleared) {
          db.addStat(characterId, 'bosses', 1);
          const hunt = huntById(result.gains.cleared);
          if (hunt?.boss) {
            const bossMonster = monsterById(hunt.monsters[hunt.monsters.length - 1]);
            broadcasts.push(`${charName} derrotou o temível chefe ${bossMonster?.name ?? hunt.name}!`);
            if (hunt.quest) trackStories(characterId, (step) => (step.need?.goal.kind === 'instance' && step.need.goal.hunt === hunt.id ? 1 : 0));
            if (hunt.id === 'minotaur_throne') db.unlockOutfit(characterId, 'warrior');
            else if (hunt.id === 'dragon_throne') db.unlockOutfit(characterId, 'devout');
            // Casca Mortal de Zharvos: chance rara do Chapéu do Arquimago (só para quem ainda não tem).
            if (hunt.id === ZHARVOS_SANCTUM && !db.unlockedAddonsFor(characterId).includes('wizard_hat') && Math.random() < ZHARVOS_HAT_CHANCE) {
              db.unlockAddon(characterId, 'wizard_hat');
              broadcasts.push(`${charName} achou o Chapéu do Arquimago nos restos da Casca Mortal de Zharvos!`);
            }
          }
          if (hunt?.lair) broadcasts.push(`${charName} derrotou ${monsterById(hunt.monsters[0])?.name ?? hunt.name}!`);
          if (hunt?.id === 'vampire_crypt') db.unlockOutfit(characterId, 'noble');
        }
        const clearedArena = result.gains.arenaCleared ? arenaById(result.gains.arenaCleared) : undefined;
        if (clearedArena?.trial) {
          // Provação de quest: conta no passo da história que pedia vencê-la (o baú é o final da história).
          db.completeArena(characterId, clearedArena.id, '', now);
          trackStories(characterId, (step) => (step.need?.goal.kind === 'trial' && step.need.goal.arena === clearedArena.id ? 1 : 0));
          broadcasts.push(`${charName} venceu ${clearedArena.name}!`);
        } else if (result.gains.arenaCleared) {
          db.setArenaStatus(characterId, result.gains.arenaCleared, 'reward_pending');
          db.addStat(characterId, 'arenas', 1);
          db.unlockOutfit(characterId, 'barbarian');
          broadcasts.push(`O gladiador ${charName} conquistou a vitória na ${arenaById(result.gains.arenaCleared)?.name.replace(/ \(Nível \d+\)$/, '') ?? 'Arena'}!`);
        } else if (isArenaNode(activity.node)) {
          const arena = parseArenaNode(activity.node);
          if (arena) {
            if (result.gains.death) {
              db.setArenaStatus(characterId, arena.id, 'available', 0);
            } else if (!result.ended) {
              db.setArenaStatus(characterId, arena.id, 'in_progress', result.seq);
            }
          }
        }
        if (isProductionSkill(activity.skill)) db.addStat(characterId, 'crafted', result.gains.actions);
      }
      // Morreu e o Ceifador ficou com peças: acorda no Limiar dos Mortos (só se a caçada acabou mesmo).
      if (death?.reaper && !db.activityFor(characterId)) db.setActivity(characterId, { skill: 'combat', node: REAPER_NODE, since: now, seed: 0, seq: 0 });
      // Fila de profissões: acabou o material (no instante da última peça) ou chegou a hora marcada:
      // a próxima da fila começa ali mesmo e o resto do tempo (inclusive offline) segue nela.
      if (queued) {
        const same = db.activityFor(characterId)?.seed === activity.seed;
        const limitHit = same && queued.until != null && queued.until <= now;
        const ended = result.ended && !db.activityFor(characterId);
        if (limitHit || ended) {
          const at = ended ? result.since : queued.until!;
          if (limitHit) db.setActivity(characterId, null);
          // Aviso de por que parou (antes sumia para a cidade sem explicação).
          const skillName = SKILLS.find((x) => x.id === activity.skill)?.name ?? activity.skill;
          let why = limitHit ? `${skillName}: acabou o tempo marcado.` : `${skillName} parou: acabou o material.`;
          if (ended && isProductionSkill(activity.skill)) {
            const recipe = recipeById(activity.skill, activity.node);
            const bank = db.bankFor(characterId);
            const missing = Object.entries(recipe?.inputs ?? {}).filter(([id, q]) => (bank[id] ?? 0) < q).map(([id]) => itemById(id)?.name ?? id);
            if (missing.length) why = `${skillName} parou: acabou ${missing.join(' e ')}.`;
          }
          const skipped: string[] = [];
          const next = this.startQueued(characterId, at, skipped);
          if (skipped.length) why += ` A fila pulou: ${skipped.join('; ')}.`;
          if (!next) why += ' Seu personagem voltou para a cidade.';
          db.setActivityStop(characterId, why, at);
          if (next) {
            const more = this.settle(characterId, now, partyBonus, offlineXp);
            const gains = mergeGains(result.gains, more.gains);
            return { gains, elapsedMs: now - activity.since, changed: true, broadcasts: [...broadcasts, ...more.broadcasts] };
          }
        }
      }
      return { gains: result.gains, elapsedMs: now - activity.since, changed, broadcasts };
    },

    state(characterId: number, now: number): PlayerState {
      // Quem já tinha o 120 antes das capas recebe a dele aqui.
      grantCapes(characterId, now);
      const xp = db.skillsFor(characterId);
      const activity = db.activityFor(characterId);
      // Caçando: a stamina do início do trecho menos o tempo dele; fora: a que voltou até agora.
      const stamina = huntsWithStamina(activity)
        ? Math.max(0, staminaAt(characterId, activity!.since) - Math.max(0, now - activity!.since))
        : staminaAt(characterId, now);
      const st: PlayerState = {
        stamina,
        skills: Object.fromEntries(SKILLS.map((s) => [s.id, xp[s.id] ?? 0])) as Record<SkillId, number>,
        bank: db.bankFor(characterId),
        equipment: db.equipmentFor(characterId),
        promotion: db.characterById(characterId)?.promotion ?? null,
        look: db.characterById(characterId)!.look,
        unlockedAddons: db.unlockedAddonsFor(characterId),
        unlockedOutfits: db.unlockedOutfitsFor(characterId),
        lockedItems: db.lockedItemsFor(characterId),
        buyback: db.buybackFor(characterId, now - BUYBACK_MS),
        instanceClears: db.instanceClearsFor(characterId),
        bossHistory: db.bossResultsFor(characterId),
        instanceFree: Object.fromEntries(Object.entries(db.instanceFreeFor(characterId)).map(([k, v]) => [k, v.day])),
        instanceTries: Object.fromEntries(Object.entries(db.instanceTriesFor(characterId)).filter(([, v]) => v.day === dayOf(now)).map(([k, v]) => [k, v.tries])),
        lairCooldowns: db.lairCooldownsFor(characterId),
        raidClears: db.raidClearsFor(characterId, weekOf(now)),
        raidPity: db.raidPityFor(characterId),
        raidClearsByRaid: {
          raid_usurper: db.raidClearsFor(characterId, weekOf(now), RAID_ID),
          raid_souls: db.raidClearsFor(characterId, weekOf(now), SOUL_RAID_ID),
          raid_blood: db.raidClearsFor(characterId, weekOf(now), BLOOD_RAID_ID),
        },
        raidPityByRaid: {
          raid_usurper: db.raidPityFor(characterId, RAID_ID),
          raid_souls: db.raidPityFor(characterId, SOUL_RAID_ID),
          raid_blood: db.raidPityFor(characterId, BLOOD_RAID_ID),
        },
        raidChestPurchases: db.raidShopChestCount(characterId, weekOf(now)),
        raidBoughtPieces: (RAID_SET_ITEMS as readonly string[]).filter((p) => db.hasBoughtRaidSetPiece(characterId, p)),
        raidWeek: weekOf(now),
        raidRanking: db.raidRanking(weekOf(now), RAID_ID),
        raidRankings: {
          raid_usurper: db.raidRanking(weekOf(now), RAID_ID),
          raid_souls: db.raidRanking(weekOf(now), SOUL_RAID_ID),
          raid_blood: db.raidRanking(weekOf(now), BLOOD_RAID_ID),
        },
        raidNextResetAt: nextWeekResetAt(now),
        reaper: db.reaperPacksFor(characterId, now),
        today: dayOf(now),
        quests: db.questsFor(characterId),
        stories: db.storiesFor(characterId),
        dailies: todayDailies(characterId, now).list,
        endgameDailies: endgameTasks(characterId, now),
        dailyChest: (() => {
          const c = db.dailyChestFor(characterId);
          const day = dayOf(now);
          return { streak: dailyChestStreak(c.lastDay, c.streak, day), opened: c.lastDay === day };
        })(),
        dailyGatherPreferences: db.dailyGatherPreferencesConfig(characterId, dayOf(now)),
        featuredTasks: featuredTasksFor(characterId, dayOf(now), taskLevelOf(characterId)),
        stats: db.statsFor(characterId),
        huntingTasks: db.huntingTasksFor(characterId),
        slayer: db.slayerFor(characterId),
        slayerBoosts: db.slayerBoostsFor(characterId),
        huntXp: db.huntXpRates(characterId),
        activityStop: db.activityStopFor(characterId) ?? undefined,
        guildTasks: db.guildTasksFor(characterId).map((t) => ({ id: t.id, progress: t.progress, status: t.progress >= (guildTaskById(t.id)?.count ?? Infinity) ? 'ready' as const : 'active' as const })),
        guildPoints: db.statsFor(characterId).guild_points ?? 0,
      artisanKitUntil: db.artisanKitUntil(characterId),
      combatPet: db.combatPetFor(characterId),
        guildSpent: db.statsFor(characterId).guild_spent ?? 0,
        huntingPoints: db.statsFor(characterId).hunting_points ?? 0,
        huntingPointsSpent: db.statsFor(characterId).hunting_points_spent ?? 0,
        lastVoteAt: db.lastVoteAt(characterId),
        charmBonus: db.statsFor(characterId).charm_bonus ?? 0,
        imbuements: db.imbuementsFor(characterId),
        bestiary: db.bestiaryFor(characterId),
        charms: db.charmsFor(characterId),
        prey: db.preyFor(characterId, PREY_SLOTS),
        preyFreeUsed: db.preyFreeDay(characterId) === dayOf(now),
        preyPaidToday: db.preyPaidOn(characterId, dayOf(now)),
        taskXpBoostsToday: db.taskXpBoostsOn(characterId, dayOf(now)),
        arenas: db.arenasFor(characterId),
        spells: spellsOf(characterId),
        food: db.foodFor(characterId),
        activeMeal: db.mealFor(characterId),
        sigils: db.sigilsFor(characterId),
        mastery: db.masteryFor(characterId),
        forgePity: db.forgePityFor(characterId),
        refinePity: db.forgePityFor(characterId, 'rpity'),
        potion: db.potionFor(characterId),
        manaPotion: db.manaPotionFor(characterId),
        combatRules: db.combatRulesFor(characterId),
        arrow: db.arrowFor(characterId),
        runes: db.runesFor(characterId),
        blessed: db.blessedFor(characterId),
        unlockedPets: db.petsFor(characterId),
        activePet: db.activePetFor(characterId),
        xpBoostUntil: db.xpBoostUntil(characterId),
        queue: db.queueFor(characterId).queue,
        queueUntil: db.queueFor(characterId).until,
        halloweenPotionUsed: (() => {
          const acc = db.accountOfCharacter(characterId);
          return acc !== null && db.halloweenPotionUsed(acc, dayOf(now));
        })(),
        halloweenTrickOrTreatedToday: (() => {
          const day = new Date(now - 3 * 3600_000).toISOString().slice(0, 10);
          return db.hasTrickOrTreatedToday(characterId, day);
        })(),
        kidsPotionUsed: (() => {
          const acc = db.accountOfCharacter(characterId);
          return acc !== null && db.kidsPotionUsed(acc);
        })(),
        activity,
        cycle: currentCycle(activity, {
          ...context(characterId),
          partyBuffs: activity?.skill === 'combat' ? partyBuffsOf(characterId) : undefined,
          lairGroup: activity ? lairGroupOf(characterId, activity, now) : undefined,
        }),
        serverNow: now,
      };
      // Conquistas: grava a hora das que acabou de cumprir (aviso na tela e ranking de pontos).
      const got = db.achievementsFor(characterId);
      const fresh = achievementsDone(st).filter((id) => !(id in got));
      if (fresh.length) {
        db.addAchievements(characterId, fresh, now);
        for (const id of fresh) got[id] = now;
      }
      st.achievements = got;
      st.title = db.titleFor(characterId);
      return st;
    },

    /** Começa (ou troca) a atividade. Devolve a mensagem de erro, ou null. */
    start(characterId: number, skill: SkillId, nodeId: string, now: number): string | null {
      if (skill === 'combat') {
        if (isDummyNode(nodeId)) {
          if (!dummyById(nodeId)) return 'Esse boneco de treino não existe.';
        } else {
          const hunt = parseHuntNode(nodeId)?.hunt;
          if (!hunt) return 'Essa caçada não existe.';
          if (hunt.raid) {
            const raid = raidById(hunt.id);
            if (!raid?.enabled) return 'A Raide abre em breve.';
            const party = db.partyFor(characterId);
            const isGroup = party && party.members.length >= 2;
            if (!isGroup && raid?.allowSolo === false) {
              return `${raid.name} exige um grupo de 2 a 5 jogadores (modo solo indisponível).`;
            }
            const minLv = raid?.minLevel ?? RAID_MIN_LEVEL;
            const maxParty = raid?.maxParty ?? RAID_MAX_PARTY;
            const combatLv = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
            if (combatLv < minLv) {
              return `A raide exige nível ${minLv}+ de combate.`;
            }
            if (isGroup) {
              if (party.members.length > maxParty) {
                return `O grupo pode ter no máximo ${maxParty} jogadores.`;
              }
              if (party.leaderId !== characterId) {
                return 'Apenas o líder do grupo pode iniciar a raide.';
              }
              for (const mId of party.members) {
                const mLv = levelForXp(db.skillsFor(mId).combat ?? 0, 'combat');
                if (mLv < minLv) {
                  const mName = db.characterById(mId)?.name ?? `#${mId}`;
                  return `${mName} precisa de nível ${minLv}+ de combate para entrar na raide.`;
                }
              }
              const since = now + TRAVEL_MS;
              const seed = randomInt(2 ** 31);
              for (const mId of party.members) {
                this.settle(mId, now);
                db.setActivity(mId, { skill: 'combat', node: hunt.id, since, seed, seq: 0 });
                const mq = db.queueFor(mId);
                if (mq.until !== null) db.setQueue(mId, mq.queue, null);
              }
              return null;
            }
            // Solo
            this.settle(characterId, now);
            const since = now + TRAVEL_MS;
            const seed = randomInt(2 ** 31);
            db.setActivity(characterId, { skill: 'combat', node: hunt.id, since, seed, seq: 0 });
            const q = db.queueFor(characterId);
            if (q.until !== null) db.setQueue(characterId, q.queue, null);
            return null;
          }
          const minLv = bossMinLevel(hunt);
          if (minLv && levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat') < minLv) {
            return `Esta instância pede nível ${minLv} de combate (o nível dela menos ${BOSS_MIN_LEVEL_GAP}).`;
          }
          if (hunt.requires && db.storiesFor(characterId).find((s) => s.id === hunt.requires)?.status !== 'done') {
            return `Precisa concluir a quest ${storyById(hunt.requires)?.name ?? hunt.requires}.`;
          }
          // Instância de quest: só no passo da história que pede vencê-la, e só uma vez.
          if (hunt.quest) {
            if ((db.instanceClearsFor(characterId)[hunt.id]?.total ?? 0) > 0) return 'Você já venceu esta instância de quest.';
            if (!questInstanceOpen(db.storiesFor(characterId), hunt.id)) return `Esta instância só se abre no passo certo da quest ${storyById(hunt.quest)?.name ?? hunt.quest}.`;
            if (parseHuntNode(nodeId)!.difficulty.id !== 'normal') return 'A instância de quest não tem Pesadelo.';
          }
          // Pesadelo de instância e covil: só depois de vencer a versão normal uma vez.
          const parsed = parseHuntNode(nodeId)!;
          if (isBossNightmare(hunt, parsed.difficulty.id)) {
            const won = hunt.boss
              ? (db.instanceClearsFor(characterId)[hunt.id]?.total ?? 0) > 0
              : (db.bestiaryFor(characterId)[hunt.monsters[0]] ?? 0) > 0;
            if (!won) return 'Vença a versão normal primeiro para liberar o Pesadelo.';
          }
          // Covil: 24 h de cooldown desde a última entrada (vencendo, morrendo ou saindo).
          const cooldown = hunt.lair ? (db.lairCooldownsFor(characterId)[hunt.id] ?? 0) : 0;
          if (cooldown > now) {
            const mins = Math.ceil((cooldown - now) / 60_000);
            return `Você só pode enfrentar ${monsterById(hunt.monsters[0])?.name ?? hunt.name} de novo em ${Math.floor(mins / 60)}h ${mins % 60}min.`;
          }
        }
      } else if (isProductionSkill(skill)) {
        const recipe = recipeById(skill, nodeId);
        if (!recipe) return 'Essa receita não existe.';
        const level = levelForXp(db.skillsFor(characterId)[skill] ?? 0, skill);
        if (level < recipe.level) return `Precisa de nível ${recipe.level} de ${SKILLS.find((s) => s.id === skill)!.name}.`;
        this.settle(characterId, now);
        const missing = killsMissing(recipe, db.bestiaryFor(characterId));
        if (missing > 0) return `Falta o eco da criatura: abata mais ${missing} ${monsterById(recipe.kills!.monster)?.name ?? recipe.kills!.monster}.`;
        if (craftableCount(recipe, db.bankFor(characterId)) === 0) return 'Faltam materiais.';
      } else {
        const node = nodeById(skill, nodeId);
        if (!node) return 'Esse lugar não existe.';
        const level = levelForXp(db.skillsFor(characterId)[skill] ?? 0, skill);
        if (level < node.level) return `Precisa de nível ${node.level}.`;
      }
      this.settle(characterId, now);
      // Caçada: o personagem anda até o portal; treino no boneco começa imediatamente.
      const lair = skill === 'combat' ? parseHuntNode(nodeId)?.hunt.lair : false;
      const since = lair ? lairStart(characterId, nodeId, now) : skill === 'combat' && !isDummyNode(nodeId) ? now + TRAVEL_MS : now;
      const seed = randomInt(2 ** 31);
      db.setActivity(characterId, { skill, node: nodeId, since, seed, seq: 0 });
      // Começar outra coisa tira a hora marcada da anterior (a fila continua).
      const q = db.queueFor(characterId);
      if (q.until !== null) db.setQueue(characterId, q.queue, null);
      if (lair) db.setLairCooldown(characterId, parseHuntNode(nodeId)!.hunt.id, now + LAIR_COOLDOWN_MS);
      // Instância: a primeira entrada do dia gasta a tentativa grátis (vencendo, morrendo ou saindo).
      const inst = skill === 'combat' ? parseHuntNode(nodeId)?.hunt : undefined;
      if (inst?.boss && db.instanceFreeFor(characterId)[inst.id]?.day !== dayOf(now)) db.useInstanceFree(characterId, inst.id, dayOf(now), seed);
      if (inst?.boss) db.addInstanceTry(characterId, inst.id, dayOf(now), seed);
      return null;
    },

    /** Título ao lado do nome: só de conquista já feita (null tira). */
    setTitle(characterId: number, achievement: string | null): string | null {
      if (achievement !== null) {
        if (!achievementById(achievement)?.title) return 'Esse título não existe.';
        if (!(achievement in db.achievementsFor(characterId))) return 'Conquiste antes de usar esse título.';
      }
      db.setTitle(characterId, achievement);
      return null;
    },

    /** Escolhe a comida. Acerta antes: o que já passou foi com a escolha antiga. */
    setFood(characterId: number, food: string | null, now: number): string | null {
      if (food !== null && food !== NO_FOOD && !itemById(food)?.food) return 'Isso não é comida.';
      this.settle(characterId, now);
      db.setFood(characterId, food);
      return null;
    },

    /** Consome 1 refeição cozida do banco e ativa o buff por 30 minutos de caçada. */
    eatMeal(characterId: number, itemId: string, now: number): string | null {
      const item = itemById(itemId);
      if (!item?.meal) return 'Isso não é uma refeição.';
      this.settle(characterId, now);
      const bank = db.bankFor(characterId);
      if ((bank[itemId] ?? 0) < 1) return 'Você não possui essa refeição no depósito.';
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { [itemId]: -1 }, xp: {} },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      const auto = db.mealFor(characterId)?.auto;
      db.setMeal(characterId, { item: itemId, until: now + MEAL_MS, ...(auto ? { auto } : {}) });
      return null;
    },

    /** Liga/desliga a renovação automática da refeição (vale para a última escolhida). */
    setMealAuto(characterId: number, auto: boolean, now: number): string | null {
      this.settle(characterId, now);
      const meal = db.mealFor(characterId);
      if (!meal) return 'Coma uma refeição primeiro.';
      db.setMeal(characterId, auto ? { ...meal, auto: true } : { item: meal.item, until: meal.until });
      return null;
    },

    /** Compra a bênção no Templo (na cidade). Devolve o erro, ou null. */
    buyBless(characterId: number, now: number): string | null {
      this.settle(characterId, now);
      // No Templo (cidade) ou com o Ceifador, no Limiar dos Mortos.
      if (!inCity(characterId) && !isReaperNode(db.activityFor(characterId)?.node)) return OUT_OF_CITY;
      if (db.blessedFor(characterId)) return 'Você já está abençoado.';
      const price = blessPrice(levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat'));
      if ((db.bankFor(characterId)[GOLD] ?? 0) < price) return 'Ouro insuficiente.';
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [GOLD]: -price }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.setBlessed(characterId, true);
      return null;
    },

    /** Resgata com o Ceifador as peças de uma morte (vão para o depósito). Na cidade ou no Limiar. */
    reaperRedeem(characterId: number, packId: number, now: number): string | null {
      if (!Number.isSafeInteger(packId) || packId <= 0) return 'Pacote inválido.';
      this.settle(characterId, now);
      if (!inCity(characterId) && !isReaperNode(db.activityFor(characterId)?.node)) return OUT_OF_CITY;
      const pack = db.reaperPacksFor(characterId, now).find((p) => p.id === packId);
      if (!pack) return 'O Ceifador não guarda mais esses itens.';
      if ((db.bankFor(characterId)[GOLD] ?? 0) < pack.price) return 'Ouro insuficiente.';
      // Tira o pacote antes de devolver: dois cliques seguidos não resgatam duas vezes.
      const taken = db.takeReaperPack(characterId, packId, now);
      if (!taken) return 'O Ceifador não guarda mais esses itens.';
      const items: Record<string, number> = { [GOLD]: -taken.price };
      for (const id of taken.items) items[id] = (items[id] ?? 0) + 1;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Escolhe a runa de ataque ou de cura da caçada (ou nenhuma). Acerta antes, como a poção. */
    setRune(characterId: number, slot: 'attack' | 'heal', rune: string | null, now: number): string | null {
      const effect = rune === null ? null : itemById(rune)?.rune;
      if (rune !== null && !effect) return 'Isso não é uma runa.';
      if (effect && (effect.kind === 'heal') !== (slot === 'heal')) return slot === 'heal' ? 'Essa runa não é de cura.' : 'Essa runa não é de ataque.';
      this.settle(characterId, now);
      db.setRune(characterId, slot, rune);
      return null;
    },

    /** Escolhe a poção de caçada (ou nenhuma). Acerta antes, como a comida. */
    setPotion(characterId: number, potion: string | null, now: number): string | null {
      if (potion !== null && !itemById(potion)?.potion) return 'Isso não é uma poção de caçada.';
      this.settle(characterId, now);
      db.setPotion(characterId, potion);
      return null;
    },

    /** Escolhe a poção de mana (ou nenhuma). Acerta antes, como a comida. */
    setManaPotion(characterId: number, manaPotion: string | null, now: number): string | null {
      if (manaPotion !== null && !itemById(manaPotion)?.manaPotion) return 'Isso não é uma poção de mana.';
      this.settle(characterId, now);
      db.setManaPotion(characterId, manaPotion);
      return null;
    },

    /** Escolhe a flecha ativa do Caçador (ou nenhuma = flecha básica infinita). Acerta antes, como a comida. */
    setArrow(characterId: number, arrow: string | null, now: number): string | null {
      const character = db.characterById(characterId);
      if (!character) return 'Personagem não encontrado.';
      if (character.vocation !== 'hunter') return 'Apenas o Caçador pode usar flechas especiais.';
      if (arrow !== null && !itemById(arrow)?.arrow) return 'Isso não é uma flecha válida.';
      this.settle(characterId, now);
      db.setArrow(characterId, arrow);
      return null;
    },

    /** Vende ao Mercador pelo valor fixo. Devolve o erro, ou null. */
    /** Tranca ou destranca um item do depósito (trancado não vende nem vai ao Mercado). */
    lockItem(characterId: number, itemId: string, locked: boolean): string | null {
      if (itemId === GOLD || !itemById(splitRarity(itemId).base)) return 'Item inválido.';
      db.setItemLocked(characterId, itemId, locked);
      return null;
    },

    /**
     * Depósito da conta: pega `qty` de `itemId` do depósito de outro personagem da mesma conta.
     * Os depósitos continuam separados; só o dono da conta move entre eles. Item de quest não passa.
     */
    takeFromAlt(characterId: number, fromId: number, itemId: string, qty: number, now: number): string | null {
      const me = db.characterById(characterId);
      const from = db.characterById(fromId);
      if (!me || !from || fromId === characterId) return 'Personagem inválido.';
      const account = db.accountOfCharacter(characterId);
      if (account === null || db.accountOfCharacter(fromId) !== account) return 'Esse personagem não é da sua conta.';
      if (!itemById(itemId) && itemId !== GOLD) return 'Item inválido.';
      if (itemById(itemId)?.questItem) return 'Item de quest fica com o personagem.';
      if (!Number.isInteger(qty) || qty < 1) return 'Quantidade inválida.';
      // O outro pode estar caçando ou produzindo: credita antes, para não mexer no que ele está gastando.
      this.settle(fromId, now);
      // Tira de um e põe no outro na mesma transação: ou passa tudo, ou nada (nunca some nem duplica).
      if (!db.moveItem(fromId, characterId, itemId, qty)) return `${from.name} não tem tudo isso.`;
      return null;
    },

    /** Os outros personagens da conta e o depósito de cada um. */
    altBanks(characterId: number, now: number): AltBank[] {
      const account = db.accountOfCharacter(characterId);
      if (account === null) return [];
      return db.charactersOf(account)
        .filter((c) => c.id !== characterId)
        .map((c) => {
          this.settle(c.id, now);
          return { id: c.id, name: c.name, vocation: c.vocation, level: levelForXp(db.skillsFor(c.id).combat ?? 0, 'combat'), bank: db.bankFor(c.id) };
        });
    },

    sellNpc(characterId: number, itemId: string, qty: number, now: number): string | null {
      if (itemId === GOLD || !npcBuys(itemId)) return 'O Mercador não compra isso.';
      if (!Number.isInteger(qty) || qty < 1) return 'Quantidade inválida.';
      if (db.lockedItemsFor(characterId).includes(itemId)) return LOCKED;
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      if ((db.bankFor(characterId)[itemId] ?? 0) < qty) return 'Você não tem tudo isso.';
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { [itemId]: -qty, [GOLD]: itemValue(itemId) * qty }, xp: {} },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      db.addBuyback(characterId, itemId, qty, itemValue(itemId), now, BUYBACK_MS, BUYBACK_MAX);
      trackQuests(characterId, (q) => (q.goal.kind === 'sell' ? qty : 0));
      trackStories(characterId, (step) => (step.need?.goal.kind === 'sell' ? qty : 0));
      trackDailies(characterId, now, (goal) => (goal.kind === 'sell' ? qty : 0));
      db.addStat(characterId, 'sold', qty);
      return null;
    },

    /**
     * Venda em lote ao Mercador: vários itens numa transação só. Se algum item
     * não puder ser vendido, nada é vendido. Devolve o erro, ou null.
     */
    sellNpcMany(characterId: number, items: Record<string, number>, now: number): string | null {
      const list = Object.entries(items);
      if (list.length === 0 || list.length > 500) return 'Nada para vender.';
      const locked = db.lockedItemsFor(characterId);
      if (list.some(([id]) => locked.includes(id))) return LOCKED;
      for (const [itemId, qty] of list) {
        if (itemId === GOLD || !npcBuys(itemId)) return 'O Mercador não compra isso.';
        if (!Number.isInteger(qty) || qty < 1) return 'Quantidade inválida.';
      }
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const bank = db.bankFor(characterId);
      if (list.some(([itemId, qty]) => (bank[itemId] ?? 0) < qty)) return 'Você não tem tudo isso.';
      const gains: Record<string, number> = { [GOLD]: 0 };
      let total = 0;
      for (const [itemId, qty] of list) {
        gains[itemId] = -qty;
        gains[GOLD] += itemValue(itemId) * qty;
        total += qty;
      }
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: gains, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      for (const [itemId, qty] of list) db.addBuyback(characterId, itemId, qty, itemValue(itemId), now, BUYBACK_MS, BUYBACK_MAX);
      trackQuests(characterId, (q) => (q.goal.kind === 'sell' ? total : 0));
      trackStories(characterId, (step) => (step.need?.goal.kind === 'sell' ? total : 0));
      trackDailies(characterId, now, (goal) => (goal.kind === 'sell' ? total : 0));
      db.addStat(characterId, 'sold', total);
      return null;
    },

    /**
     * Recompra do Mercador: compra de volta `qty` de uma venda das últimas 24 h, por 10% a mais do
     * que recebeu por unidade (vender e recomprar não rende diária de graça).
     */
    buybackNpc(characterId: number, id: number, qty: number, now: number): string | null {
      if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) return 'Quantidade inválida.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const entry = db.buybackFor(characterId, now - BUYBACK_MS).find((b) => b.id === id);
      if (!entry) return 'Essa venda não pode mais ser recomprada.';
      if (qty > entry.qty) return 'Você não vendeu tudo isso.';
      const cost = buybackPrice(entry.price) * qty;
      if ((db.bankFor(characterId)[GOLD] ?? 0) < cost) return `Ouro insuficiente (necessário ${cost} moedas).`;
      if (!db.takeBuyback(characterId, id, qty)) return 'Essa venda não pode mais ser recomprada.';
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [entry.item]: qty, [GOLD]: -cost }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Entrega uma tarefa diária pronta (em qualquer lugar). Devolve o erro, ou null. */
    claimDaily(characterId: number, idx: number, now: number): string | null {
      this.settle(characterId, now);
      if (idx >= ENDGAME_DAILY_IDX_BASE) {
        const e = endgameTasks(characterId, now).find((x) => x.idx === idx);
        if (!e) return 'Tarefa inválida.';
        if (e.claimed) return 'Essa tarefa já foi entregue.';
        if (e.goal.kind === 'level' || e.progress < e.goal.count) return 'Essa tarefa ainda não está pronta.';
        if (!db.claimDaily(characterId, e.key, idx)) return 'Essa tarefa já foi entregue.';
        const items: Record<string, number> = { [GOLD]: e.reward.gold, ...(e.reward.items ?? {}) };
        if (e.goal.kind === 'deliver') items[e.goal.item] = (items[e.goal.item] ?? 0) - e.goal.count;
        const act = db.activityFor(characterId);
        db.applyGains(characterId, { actions: 0, items, xp: {} }, act?.since ?? now, act?.seq ?? 0);
        return null;
      }
      const { day, list } = todayDailies(characterId, now);
      const d = list.find((x) => x.idx === idx);
      if (!d) return 'Tarefa inválida.';
      if (d.claimed) return 'Essa tarefa já foi entregue.';
      const target = d.goal.kind === 'level' ? d.goal.level : d.goal.count;
      if (d.progress < target) return 'Essa tarefa ainda não está pronta.';
      if (!db.claimDaily(characterId, day, idx)) return 'Essa tarefa já foi entregue.';
      db.addStat(characterId, 'dailies', 1);
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [GOLD]: d.reward.gold }, xp: withXpEvent(d.reward.xp, now) }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Escolhe profissões de coleta preferidas para as diárias a partir do dia seguinte. */
    setDailyGatherPreferences(characterId: number, skills: GatheringSkillId[], now: number): string | null {
      const clean = [...new Set(skills)].filter((s): s is GatheringSkillId => GATHER_SKILLS.includes(s as GatheringSkillId));
      const today = dayOf(now);
      const effectiveDay = nextDay(today);
      db.setDailyGatherPreferences(characterId, clean, effectiveDay);
      return null;
    },

    /** Abre o baú diário (as 3 diárias de hoje entregues). Devolve o erro, ou null. */
    claimDailyChest(characterId: number, now: number): string | null {
      this.settle(characterId, now);
      const { day, list } = todayDailies(characterId, now);
      if (list.length < DAILY_COUNT || list.some((d) => !d.claimed)) return 'Entregue as 3 diárias de hoje para abrir o baú.';
      const c = db.dailyChestFor(characterId);
      if (c.lastDay === day) return 'Você já abriu o baú de hoje.';
      const streak = dailyChestStreak(c.lastDay, c.streak, day);
      if (!db.openDailyChest(characterId, day, streak)) return 'Você já abriu o baú de hoje.';
      const level = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      const r = dailyChestReward(level, streak, characterId, day);
      db.addStat(characterId, 'charm_bonus', r.charmPoints);
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [GOLD]: r.gold, ...r.items }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Resgata uma meta dos Primeiros passos já cumprida (uma vez por personagem). Devolve o erro, ou null. */
    /**
     * Primeiro 99 que veio por fora da profissão rodando (encomenda da Guilda, quest, diária...):
     * conferido a cada minuto; anuncia uma vez por profissão.
     */
    first99Sweep(now: number): string[] {
      const out: string[] = [];
      for (const skill of [...PROFESSIONS, 'slayer' as const]) {
        if (db.first99Done(skill)) continue;
        const top = db.topSkillHolder(skill);
        if (!top || levelForXp(top.xp, skill) < 99 || !db.claimFirst99(skill, top.characterId, now)) continue;
        const sName = SKILLS.find((s) => s.id === skill)?.name ?? skill;
        out.push(`${CELEBRATE_PREFIX}${top.name} é o primeiro do servidor a alcançar o nível 99 em ${sName}!`);
      }
      return out;
    },

    claimFirstStep(characterId: number, id: string, now: number): string | null {
      const step = FIRST_STEPS.find((s) => s.id === id);
      if (!step) return 'Meta inválida.';
      this.settle(characterId, now);
      const view = { skills: db.skillsFor(characterId), equipment: db.equipmentFor(characterId), stats: db.statsFor(characterId), charms: db.charmsFor(characterId), prey: db.preyFor(characterId, PREY_SLOTS) };
      if (firstStepClaimed(view.stats, id)) return 'Essa recompensa já foi resgatada.';
      if (!step.done(view)) return 'Essa meta ainda não foi cumprida.';
      if (!db.claimFirstStep(characterId, firstStepKey(id))) return 'Essa recompensa já foi resgatada.';
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [GOLD]: step.reward.gold, ...(step.reward.items ?? {}) }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Troca as magias equipadas. Acerta antes: o que já passou foi com as antigas. */
    setSpells(characterId: number, spells: unknown, now: number): string | null {
      const character = db.characterById(characterId);
      if (!character) return 'Personagem não existe.';
      const level = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      const valid = validSpells(spells, character.vocation, level);
      if (!valid) return 'Magias inválidas.';
      this.settle(characterId, now);
      db.setSpells(characterId, valid);
      return null;
    },

    /** Condições da barra de ação. Acerta antes: o que já passou foi com as antigas. */
    setCombatRules(characterId: number, rules: unknown, now: number): string | null {
      const valid = validCombatRules(rules);
      if (!valid) return 'Condições inválidas.';
      this.settle(characterId, now);
      db.setCombatRules(characterId, valid);
      return null;
    },

    /** Compra numa loja do Bastião (armaduras ou armas). Devolve o erro, ou null. */
    buyNpc(characterId: number, itemId: string, qty: number, now: number): string | null {
      if (!Object.values(SHOPS).some((list) => (list as readonly string[]).includes(itemId))) return 'Ninguém vende isso aqui.';
      // Equipamento: até 100; runas e outros empilháveis: até 1000 de uma vez.
      const maxQty = itemById(itemId)?.equip ? 100 : 1000;
      if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) return 'Quantidade inválida.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const cost = shopPrice(itemId) * qty;
      if ((db.bankFor(characterId)[GOLD] ?? 0) < cost) return 'Ouro insuficiente.';
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { [itemId]: qty, [GOLD]: -cost }, xp: {} },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      return null;
    },

    /** Compra um item lendário ou bolsa de armas com Fichas do Chefe (Boss Tokens). */
    buyBossToken(characterId: number, itemId: string, now: number): string | null {
      if (!BOSS_TOKEN_SHOP_ITEMS.includes(itemId)) return 'O Colecionador não vende este item.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const haveTokens = db.bankFor(characterId)[BOSS_TOKEN] ?? 0;
      const price = bossTokenPrice(itemId);
      if (haveTokens < price) return `Fichas do Chefe insuficientes (necessário ${price}).`;
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { [itemId]: 1, [BOSS_TOKEN]: -price }, xp: {} },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      return null;
    },

    /**
     * Refino: a peça (a do corpo, se estiver equipada; senão uma do depósito) ganha +1 de refino,
     * sem mudar a raridade, gastando ouro e material. Do +6 para cima pode falhar (só perde o ouro).
     */
    refineItem(characterId: number, itemId: string, now: number, opts: ForgeOpts = {}): string | null {
      const nextId = nextRefineId(itemId);
      if (!nextId) return 'Esta peça não pode ser refinada mais.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const slot = (Object.entries(db.equipmentFor(characterId)) as [EquipSlot, string][]).find(([, id]) => id === itemId)?.[0];
      if (!slot && (db.bankFor(characterId)[itemId] ?? 0) < 1) return 'Você não tem essa peça.';
      const step = splitRarity(itemId).refine;
      return forge(characterId, itemId, nextId, slot, refineMaterials(itemId, db.bankFor(characterId), !!slot), refineCost(itemId), { kind: 'rpity', step, chance: (f, w) => refineChance(itemId, f, w) }, now, opts);
    },

    /**
     * Ascensão: sobe `itemId` uma raridade (o refino fica) gastando 9 peças quaisquer da mesma
     * raridade (`use`). Se a peça estiver equipada, sobe a do corpo; senão, uma do depósito.
     */
    ascendItem(characterId: number, itemId: string, use: Record<string, number>, now: number, opts: ForgeOpts = {}): string | null {
      const nextId = nextRarityId(itemId);
      if (!nextId) return 'Este item não pode subir mais de raridade.';
      // Peça de chefe: sobe com Essência de Chefe, sem gastar outras peças.
      if (itemById(splitRarity(itemId).base)?.legendary) {
        this.settle(characterId, now);
        if (!inCity(characterId)) return OUT_OF_CITY;
        const bslot = (Object.entries(db.equipmentFor(characterId)) as [EquipSlot, string][]).find(([, id]) => id === itemId)?.[0];
        if (!bslot && (db.bankFor(characterId)[itemId] ?? 0) < 1) return 'Você não tem essa peça.';
        const t = splitRarity(itemId).tier;
        const need = BOSS_ASCEND_ESSENCE[t === 0 ? 0 : t - 4];
        const base = splitRarity(itemId).base;
        const spec = bossEssenceFor(base);
        const bank = db.bankFor(characterId);
        const essence = (spec && (bank[spec] ?? 0) >= need) ? spec : BOSS_ESSENCE;
        return forge(characterId, itemId, nextId, bslot, { [essence]: need }, ascendCost(itemId), { kind: 'pity', step: t === 0 ? 4 : t, chance: (f, w) => ascendChance(itemId, f, w) }, now, opts);
      }
      if (!use || typeof use !== 'object') return 'Escolha as peças.';
      let total = 0;
      for (const [id, q] of Object.entries(use)) {
        if (!Number.isInteger(q) || q < 1) return 'Quantidade inválida.';
        if (!ascendFodder(itemId, id)) return 'Peça que não serve para a Ascensão.';
        total += q;
      }
      if (total !== ASCEND_FODDER) return `Escolha exatamente ${ASCEND_FODDER} peças.`;
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const slot = (Object.entries(db.equipmentFor(characterId)) as [EquipSlot, string][]).find(([, id]) => id === itemId)?.[0];
      const step = splitRarity(itemId).tier;
      return forge(characterId, itemId, nextId, slot, use, ascendCost(itemId), { kind: 'pity', step, chance: (f, w) => ascendChance(itemId, f, w) }, now, opts);
    },

    /**
     * Desmancha itens em troca de 50% dos seus materiais originais no depósito.
     */
    dismantleItem(characterId: number, itemId: string, qty: number, now: number): string | null {
      if (!Number.isInteger(qty) || qty < 1 || qty > 10_000) return 'Quantidade inválida.';
      if (itemById(itemId)?.questItem) return 'Este item não pode ser desmanchado.';
      const mats = dismantleMaterials(itemId);
      if (!mats || Object.keys(mats).length === 0) return 'Este item não pode ser desmanchado em materiais.';

      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;

      const bank = db.bankFor(characterId);
      const count = bank[itemId] ?? 0;
      if (count < qty) return 'Você não tem essa quantidade no depósito.';

      const itemChanges: Record<string, number> = {
        [itemId]: -qty,
      };
      for (const [matId, perUnit] of Object.entries(mats)) {
        itemChanges[matId] = (itemChanges[matId] ?? 0) + (perUnit * qty);
      }

      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        {
          actions: 0,
          items: itemChanges,
          xp: {},
        },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      return null;
    },

    /**
     * Escolhe uma resposta no passo atual de uma história (falando com o NPC,
     * na cidade). Começa a história, avança de passo ou termina num final.
     */
    storyChoose(characterId: number, storyId: string, choiceIdx: number, now: number): string | null {
      const story = storyById(storyId);
      if (!story) return 'História inválida.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const skills = db.skillsFor(characterId);
      const state = db.storiesFor(characterId).find((s) => s.id === storyId);
      if (state?.status === 'done') return 'Essa história já terminou.';
      if (!state && levelForXp(skills.combat ?? 0, 'combat') < story.level) return `Precisa de nível ${story.level} de combate.`;
      // Quests de profissão: nível mínimo em cada uma para começar.
      for (const [sk, lvl] of Object.entries(!state ? story.skills ?? {} : {})) {
        if (levelForXp(skills[sk as SkillId] ?? 0, sk as SkillId) < (lvl ?? 0)) return `Precisa de nível ${lvl} em ${SKILLS.find((x) => x.id === sk)?.name ?? sk}.`;
      }
      if (!state && story.requires && db.storiesFor(characterId).find((s) => s.id === story.requires)?.status !== 'done') {
        return `Conclua antes a quest ${storyById(story.requires)?.name ?? story.requires}.`;
      }
      const step = story.steps[state?.step ?? 0];
      if (!storyNeedDone(step, storyStepProgress(step, state?.progress ?? 0, db.bankFor(characterId)), skills)) return 'Ainda falta cumprir o pedido.';
      const choice = step.choices[choiceIdx];
      if (!choice) return 'Escolha inválida.';
      const history = [...(state?.history ?? []), state?.step ?? 0];
      if (choice.next !== undefined) {
        db.setStoryStep(characterId, storyId, choice.next);
        db.setStoryHistory(characterId, storyId, history);
        return null;
      }
      const ending = choice.ending ? story.endings[choice.ending] : undefined;
      if (!ending) return 'Escolha inválida.';
      if (!state) db.setStoryStep(characterId, storyId, 0);
      if (!db.finishStory(characterId, storyId, choice.ending!)) return 'Essa história já terminou.';
      db.setStoryHistory(characterId, storyId, history);
      db.addStat(characterId, 'quests', 1);
      const r = ending.reward;
      if (r.addon) db.unlockAddon(characterId, r.addon);
      if (r.outfit) db.unlockOutfit(characterId, r.outfit);
      if (story.epic) announce(`${db.characterById(characterId)?.name ?? 'Um aventureiro'} concluiu a quest ${story.name}!`);
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { ...(r.items ?? {}), ...(r.gold ? { [GOLD]: r.gold } : {}) }, xp: withXpEvent(questXp(characterId, r.xp), now) },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      return null;
    },

    /** Entrega a quest no mestre (na cidade) e recebe a recompensa. Devolve o erro, ou null. */
    claimQuest(characterId: number, questId: string, now: number): string | null {
      const quest = questById(questId);
      if (!quest) return 'Quest inválida.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const state = db.questsFor(characterId).find((s) => s.id === questId);
      if (state?.status === 'claimed') return 'Essa quest já foi entregue.';
      if (!state || !questDone(quest, state, db.skillsFor(characterId))) return 'Essa quest ainda não está pronta.';
      if (!db.claimQuest(characterId, questId, nextQuest(questId)?.id)) return 'Essa quest já foi entregue.';
      db.addStat(characterId, 'quests', 1);
      const r = quest.reward;
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { ...(r.items ?? {}), ...(r.gold ? { [GOLD]: r.gold } : {}) }, xp: withXpEvent(questXp(characterId, r.xp), now) },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      return null;
    },

    /** Põe um item à venda. Devolve o erro, ou null. */
    marketList(characterId: number, itemId: string, qty: number, price: number, now: number): string | null {
      if (itemId === GOLD || !itemById(itemId) || itemById(itemId)!.questItem) return 'Isso não se vende.';
      if (db.lockedItemsFor(characterId).includes(itemId)) return LOCKED;
      if (!Number.isInteger(qty) || qty < 1) return 'Quantidade inválida.';
      if (!Number.isInteger(price) || price < 1 || price > MAX_PRICE) return 'Preço inválido.';
      // Acerta antes: a produção pode estar gastando esse item agora.
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      return db.createListing(characterId, itemId, qty, price, now);
    },

    marketBuy(characterId: number, listingId: number, qty: number, now: number) {
      if (!Number.isInteger(qty) || qty < 1) return { error: 'Quantidade inválida.' };
      this.settle(characterId, now);
      if (!inCity(characterId)) return { error: OUT_OF_CITY };
      return db.buyListing(characterId, listingId, qty, GOLD);
    },

    /** Oferta de compra ("compro X a Y cada"): reserva o ouro. Devolve o erro, ou null. */
    marketOffer(characterId: number, itemId: string, qty: number, price: number, now: number): string | null {
      if (itemId === GOLD || !itemById(itemId) || itemById(itemId)!.questItem) return 'Isso não se compra no mercado.';
      if (!Number.isInteger(qty) || qty < 1 || qty > 1_000_000) return 'Quantidade inválida.';
      if (!Number.isInteger(price) || price < 1 || price > MAX_PRICE || qty * price > MAX_PRICE * 10) return 'Preço inválido.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      return db.createOffer(characterId, itemId, qty, price, GOLD, now);
    },

    /** Vende para uma oferta de compra. */
    marketFill(characterId: number, offerId: number, qty: number, now: number) {
      if (!Number.isInteger(qty) || qty < 1) return { error: 'Quantidade inválida.' };
      // Acerta antes: a produção pode estar gastando esse item agora.
      this.settle(characterId, now);
      if (!inCity(characterId)) return { error: OUT_OF_CITY };
      return db.fillOffer(characterId, offerId, qty, GOLD);
    },

    marketOfferCancel(characterId: number, offerId: number, now: number): string | null {
      this.settle(characterId, now);
      return db.cancelOffer(characterId, offerId, GOLD);
    },

    marketCancel(characterId: number, listingId: number, now: number): string | null {
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      return db.cancelListing(characterId, listingId);
    },

    /** Escolhe a promoção (Tier 1 no nível 30, Tier 2 no 70 e Tier 3 no 100, as duas com quest). Devolve a mensagem de erro, ou null. */
    promote(characterId: number, promotionId: string, now: number): string | null {
      const character = db.characterById(characterId);
      const promotion = promotionById(promotionId);
      if (!character || !promotion || promotion.vocation !== character.vocation) return 'Promoção inválida.';
      this.settle(characterId, now);
      const combatLvl = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      const tier = promotion.tier ?? 1;

      if (tier === 1) {
        if (character.promotion) return 'Você já foi promovido.';
        if (combatLvl < PROMOTION_LEVEL) {
          return `Precisa de nível ${PROMOTION_LEVEL} de combate.`;
        }
        db.setPromotion(characterId, promotion.id);
        if (character.vocation === 'warrior') db.unlockOutfit(characterId, 'barbarian');
        else if (character.vocation === 'hunter') db.unlockOutfit(characterId, 'pirate');
        else if (character.vocation === 'arcanist') db.unlockOutfit(characterId, 'noble');
        else if (character.vocation === 'devout') db.unlockOutfit(characterId, 'noble');
        return null;
      }

      if (tier === 2 || tier === 3 || tier === 4) {
        if (!character.promotion) return 'Precisa da primeira promoção antes de ascender.';
        const currentTier = promotionById(character.promotion)?.tier ?? 1;
        if (currentTier >= tier) return tier === 2 ? 'Você já alcançou a Segunda Promoção.' : tier === 3 ? 'Você já alcançou a Ascensão Lendária.' : 'Você já alcançou a Ascensão Mítica.';
        if (promotion.requires && character.promotion !== promotion.requires) {
          return 'Essa ascensão não corresponde à sua subclasse atual.';
        }
        if (currentTier !== tier - 1) return 'Faça a ascensão anterior antes.';
        const needLevel = tier === 2 ? SECOND_PROMOTION_LEVEL : tier === 3 ? THIRD_PROMOTION_LEVEL : FOURTH_PROMOTION_LEVEL;
        if (combatLvl < needLevel) return `Precisa de nível ${needLevel} de combate.`;
        const storyState = db.storiesFor(characterId).find((s) => s.id === ASCENSION_STORY[tier]);
        if (storyState?.status !== 'done') {
          return tier === 2 ? 'Você precisa concluir a Provação dos Campeões para ascender.' : tier === 3 ? 'Você precisa concluir a Provação das Lendas para ascender.' : 'Você precisa concluir a Provação dos Mitos para ascender.';
        }
        db.setPromotion(characterId, promotion.id);
        // A Ascensão Lendária dá o traje lendário da vocação.
        if (tier === 3) db.unlockOutfit(characterId, `legend_${character.vocation}` as OutfitId);
        return null;
      }

      return 'Promoção inválida.';
    },

    /** Equipa um item do banco. Devolve a mensagem de erro, ou null. */
    /** Equipa um mascote de combate (só um por vez); null tira. */
    equipCombatPet(characterId: number, petId: string | null): string | null {
      if (petId === null) {
        db.setCombatPet(characterId, null);
        return null;
      }
      if (!isCombatPet(petId)) return 'Esse mascote não é de combate.';
      if (!db.petsFor(characterId).includes(petId)) return 'Você não tem esse mascote.';
      db.setCombatPet(characterId, petId);
      return null;
    },

    equip(characterId: number, itemId: string, now: number): string | null {
      const eq = itemById(itemId)?.equip;
      if (!eq) return 'Isso não se equipa.';
      const vocation = db.characterById(characterId)?.vocation;
      if (eq.vocations && !eq.vocations.includes(vocation ?? '')) return 'Sua vocação não usa isso.';
      if ((db.bankFor(characterId)[itemId] ?? 0) < 1) return 'Você não tem esse item.';
      if (levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat') < eq.level) return `Precisa de nível ${eq.level} de combate.`;
      if (isCape(itemId) && !capeUnlocked(itemId, db.skillsFor(characterId))) return 'Essa capa é de quem tem o nível dela na profissão (99, ou 120 na Suprema).';
      // Acerta antes: o que já aconteceu foi com o equipamento antigo.
      this.settle(characterId, now);
      db.swapEquipment(characterId, eq.slot, itemId);
      return null;
    },

    unequip(characterId: number, slot: EquipSlot, now: number) {
      this.settle(characterId, now);
      db.swapEquipment(characterId, slot, null);
    },

    /** Aplica um imbuement usando materiais do banco. */
    /** Libera um charm com os pontos das fichas completas do bestiário. */
    charmUnlock(characterId: number, charmId: string, now: number): string | null {
      const charm = charmById(charmId);
      if (!charm) return 'Charm inválido.';
      this.settle(characterId, now);
      const owned = db.charmsFor(characterId);
      if (owned.some((c) => c.id === charmId)) return 'Você já tem esse charm.';
      const pts = charmPoints(db.bestiaryFor(characterId), owned, db.statsFor(characterId).charm_bonus ?? 0);
      const cost = charmLevelCost(charm, 1);
      if (pts.free < cost) return `Faltam ${cost - pts.free} pontos de charm.`;
      db.unlockCharm(characterId, charmId);
      return null;
    },

    /** Sobe um charm liberado de nível (até o 3). */
    charmUpgrade(characterId: number, charmId: string, now: number): string | null {
      const charm = charmById(charmId);
      if (!charm) return 'Charm inválido.';
      this.settle(characterId, now);
      const owned = db.charmsFor(characterId);
      const cur = owned.find((c) => c.id === charmId);
      if (!cur) return 'Libere o charm antes.';
      if (cur.level >= CHARM_MAX_LEVEL) return 'Esse charm já está no nível máximo.';
      const cost = charmLevelCost(charm, cur.level + 1);
      const pts = charmPoints(db.bestiaryFor(characterId), owned, db.statsFor(characterId).charm_bonus ?? 0);
      if (pts.free < cost) return `Faltam ${cost - pts.free} pontos de charm.`;
      db.setCharmLevel(characterId, charmId, cur.level + 1);
      return null;
    },

    /** Põe um charm liberado numa espécie (já vista no bestiário), ou tira (null). */
    charmAssign(characterId: number, charmId: string, monster: string | null, now: number): string | null {
      this.settle(characterId, now);
      if (!db.charmsFor(characterId).some((c) => c.id === charmId)) return 'Libere o charm antes.';
      if (monster !== null && bestiaryStage(db.bestiaryFor(characterId)[monster] ?? 0) < 1) return 'Conheça melhor a espécie antes (50 abates).';
      db.assignCharm(characterId, charmId, monster);
      return null;
    },

    /** Sorteia espécie e bônus de uma vaga de prey: grátis uma vez por dia, depois custa ouro. */
    preyReroll(characterId: number, slot: number, now: number, rand: () => number = Math.random): string | null {
      if (!Number.isInteger(slot) || slot < 0 || slot >= PREY_SLOTS) return 'Vaga inválida.';
      this.settle(characterId, now);
      const combatLevel = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      // Do 400 em diante vale o nível das caçadas (combate + Maestria): antes sorteava só espécies do 380 ao 410.
      const level = huntLevelFor(combatLevel, masteryLevel(db.masteryFor(characterId)));
      const current = db.preyFor(characterId, PREY_SLOTS);
      const taken = new Set(current.map((p) => p.monster));
      const pool = preyPool(level).filter((m) => !taken.has(m));
      if (!pool.length) return 'Nenhuma espécie disponível.';
      const day = dayOf(now);
      // Vaga vazia enche de graça; trocar uma cheia usa a troca grátis do dia, depois ouro.
      // (Lista sorteada e ainda não escolhida conta como cheia: senão dava para sortear de graça para sempre.)
      if (!current[slot].monster && !current[slot].options) {
        // grátis
      } else if (db.preyFreeDay(characterId) === day && (db.bankFor(characterId)[PREY_WILDCARD] ?? 0) > 0) {
        // Curinga da Loja de Tarefas: vale uma troca sem ouro.
        const activity = db.activityFor(characterId);
        db.applyGains(characterId, { actions: 0, items: { [PREY_WILDCARD]: -1 }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      } else if (db.preyFreeDay(characterId) === day) {
        const cost = preyRerollCost(level, db.preyPaidOn(characterId, day));
        if ((db.bankFor(characterId).gold ?? 0) < cost) return `Faltam moedas (${cost} de ouro no depósito).`;
        const activity = db.activityFor(characterId);
        db.applyGains(characterId, { actions: 0, items: { gold: -cost }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
        db.addPreyPaid(characterId);
      } else db.setPreyFreeDay(characterId, day);
      // Sorteia a lista (até 9 espécies diferentes) e o bônus; a espécie o jogador escolhe.
      const options: string[] = [];
      const left = [...pool];
      while (options.length < PREY_OPTIONS && left.length) options.push(left.splice(Math.floor(rand() * left.length), 1)[0]);
      const bonus = PREY_BONUSES[Math.floor(rand() * PREY_BONUSES.length)].id;
      db.setPreyOptions(characterId, slot, options, bonus);
      return null;
    },

    /** Escolhe uma espécie da lista sorteada da vaga. */
    preyChoose(characterId: number, slot: number, monster: string, now: number): string | null {
      if (!Number.isInteger(slot) || slot < 0 || slot >= PREY_SLOTS) return 'Vaga inválida.';
      this.settle(characterId, now);
      const current = db.preyFor(characterId, PREY_SLOTS);
      const s = current[slot];
      if (!s.options?.includes(monster)) return 'Sorteie a lista antes de escolher.';
      if (current.some((p, i) => i !== slot && p.monster === monster)) return 'Essa espécie já está em outra vaga.';
      // Listas antigas podem ter perdido o bônus (bug da expiração): sorteia um na hora.
      const bonus = s.bonus ?? PREY_BONUSES[Math.floor(Math.random() * PREY_BONUSES.length)].id;
      db.setPrey(characterId, slot, monster, bonus, PREY_DURATION_SECS);
      return null;
    },

    imbue(characterId: number, imbuementId: string, now: number): string | null {
      const def = imbuementById(imbuementId);
      if (!def) return 'Encantamento desconhecido.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const bank = db.bankFor(characterId);
      for (const [mat, need] of Object.entries(def.materials)) {
        if ((bank[mat] ?? 0) < need) return `Faltam materiais (${itemById(mat)?.name ?? mat}).`;
      }
      const itemChanges: Record<string, number> = {};
      for (const [mat, need] of Object.entries(def.materials)) {
        itemChanges[mat] = -need;
      }
      // Um por família: o mesmo nível soma tempo; outro nível da família substitui (o tempo do antigo se perde).
      const active = db.imbuementsFor(characterId);
      for (const id of Object.keys(active)) if (id !== imbuementId && imbuementFamily(id) === imbuementFamily(imbuementId)) db.setImbuement(characterId, id, 0);
      const current = active[imbuementId] ?? 0;
      db.setImbuement(characterId, imbuementId, current + def.durationCombatSecs);
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: itemChanges, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Aceita uma Encomenda da Guilda (uma por profissão, com o nível da profissão). */
    startGuildTask(characterId: number, taskId: string, now: number): string | null {
      const def = guildTaskById(taskId);
      if (!def) return 'Encomenda desconhecida.';
      this.settle(characterId, now);
      if (levelForXp(db.skillsFor(characterId)[def.skill] ?? 0, def.skill) < def.level) return `Precisa de nível ${def.level} na profissão.`;
      if (db.guildTasksFor(characterId).some((t) => t.skill === def.skill)) return 'Você já tem uma encomenda desta profissão. Entregue ou cancele antes.';
      db.startGuildTask(characterId, def.skill, taskId);
      return null;
    },

    /** Entrega a encomenda pronta: XP da profissão, ouro e Selos (subir a Grão-Mestre dá o traje Artesão). */
    claimGuildTask(characterId: number, taskId: string, now: number): string | null {
      const def = guildTaskById(taskId);
      if (!def) return 'Encomenda desconhecida.';
      this.settle(characterId, now);
      const t = db.guildTasksFor(characterId).find((x) => x.id === taskId);
      if (!t) return 'Essa encomenda não está em andamento.';
      if (t.progress < def.count) return `Ainda falta (${t.progress}/${def.count}).`;
      const before = db.statsFor(characterId).guild_points ?? 0;
      db.addStat(characterId, 'guild_points', def.points);
      db.addStat(characterId, 'guild_done', 1);
      if (guildRankFor(before + def.points).minPoints >= 400 && guildRankFor(before).minPoints < 400) db.unlockOutfit(characterId, 'artisan');
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [GOLD]: def.gold }, xp: withXpEvent({ [def.skill]: def.xp }, now) }, activity?.since ?? now, activity?.seq ?? 0);
      db.endGuildTask(characterId, def.skill);
      return null;
    },

    cancelGuildTask(characterId: number, taskId: string, now: number): string | null {
      const def = guildTaskById(taskId);
      if (!def) return 'Encomenda desconhecida.';
      this.settle(characterId, now);
      if (!db.guildTasksFor(characterId).some((t) => t.id === taskId)) return 'Essa encomenda não está em andamento.';
      db.endGuildTask(characterId, def.skill);
      return null;
    },

    /** Loja da Guilda: gasta Selos (a patente conta os ganhos, não o saldo). */
    buyGuildShop(characterId: number, item: GuildShopItem, now: number, gem?: string): string | null {
      const offer = GUILD_SHOP[item];
      if (!offer) return 'Item desconhecido.';
      if (item === 'gem' && !GUILD_GEMS.includes(gem ?? '')) return 'Escolha a gema.';
      this.settle(characterId, now);
      const stats = db.statsFor(characterId);
      if ((stats.guild_points ?? 0) - (stats.guild_spent ?? 0) < offer.price) return `Precisa de ${offer.price} Selos do Artesão.`;
      db.addStat(characterId, 'guild_spent', offer.price);
      if (item === 'xp_boost') this.addXpBoost(characterId, GUILD_XP_BOOST_MS, now);
      else if (item === 'artisan_kit') {
        // O settle acima já fechou o trecho em andamento: o kit vale do próximo em diante.
        db.setArtisanKitUntil(characterId, Math.max(now, db.artisanKitUntil(characterId)) + ARTISAN_KIT_MS);
      } else {
        const activity = db.activityFor(characterId);
        db.applyGains(characterId, { actions: 0, items: { [gem!]: GUILD_GEM_QTY }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      }
      return null;
    },

    startHuntingTask(characterId: number, taskId: string, now: number): string | null {
      const def = huntingTaskById(taskId);
      if (!def) return 'Tarefa desconhecida.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      if (taskLevelOf(characterId) < def.minLevel) return `Precisa de nível ${def.minLevel} de combate.`;
      const currentTasks = db.huntingTasksFor(characterId);
      const activeCount = currentTasks.filter((t) => t.status === 'active' || t.status === 'ready').length;
      if (activeCount >= 3) return 'Você já tem 3 tarefas ativas. Conclua ou cancele uma antes.';
      const existing = currentTasks.find((t) => t.id === taskId);
      if (existing && existing.status !== 'claimed') return 'Essa tarefa já está em andamento.';
      db.startHuntingTask(characterId, taskId);
      return null;
    },

    claimHuntingTask(characterId: number, taskId: string, now: number): string | null {
      const def = huntingTaskById(taskId);
      if (!def) return 'Tarefa desconhecida.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const t = db.huntingTasksFor(characterId).find((x) => x.id === taskId);
      if (!t || t.status === 'claimed') return 'Essa tarefa não pode ser entregue.';
      // Pronta vale como cumprida (quem terminou antes de a meta subir entrega normal).
      if (t.status !== 'ready' && t.progress < def.killsRequired) return `Faltam abates (${t.progress}/${def.killsRequired}).`;

      // Destaque do dia: +50% de pontos e de ouro.
      const level = taskLevelOf(characterId);
      const featured = featuredTasksFor(characterId, dayOf(now), level).includes(taskId);
      const base = taskPointsFor(def, level);
      const points = featured ? Math.round(base * (1 + FEATURED_TASK_BONUS)) : base;
      const prevPoints = db.statsFor(characterId).hunting_points ?? 0;
      const newPoints = prevPoints + points;
      db.addStat(characterId, 'hunting_points', points);

      const itemGains: Record<string, number> = { [GOLD]: featured ? Math.round(def.goldReward * (1 + FEATURED_TASK_BONUS)) : def.goldReward };
      if (def.itemReward) {
        itemGains[def.itemReward.id] = (itemGains[def.itemReward.id] ?? 0) + def.itemReward.qty;
      }

      // Entrega troféu se subiu de rank
      const prevRank = rankForPoints(prevPoints);
      const newRank = rankForPoints(newPoints);
      if (newRank.trophyItem && (!prevRank.trophyItem || newRank.minPoints > prevRank.minPoints)) {
        itemGains[newRank.trophyItem] = (itemGains[newRank.trophyItem] ?? 0) + 1;
      }

      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: itemGains, xp: withXpEvent({ combat: def.xpReward }, now) },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      db.setHuntingTaskStatus(characterId, taskId, 'claimed');
      return null;
    },

    /** Slayer: pede tarefa a um mestre (no Bastião, sem tarefa em andamento). */
    slayerRequest(characterId: number, masterId: string, now: number, size: SlayerSize = 'normal'): string | null {
      const master = slayerMasterById(masterId);
      if (!master) return 'Mestre desconhecido.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const combatLevel = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      if (combatLevel < master.combatLevel) return `${master.name} só passa tarefa a partir do nível ${master.combatLevel} de combate.`;
      const sl = db.slayerFor(characterId);
      if (sl.monster) return 'Você já tem uma tarefa de Slayer. Termine ou cancele antes.';
      const task = size === 'boss' ? rollSlayerBossTask(master, combatLevel) : rollSlayerTask(master, combatLevel, Math.random, null, size);
      if (!task) return size === 'boss' ? `${master.name} não tem chefe para você agora.` : `${master.name} não tem tarefa para você agora.`;
      db.setSlayer(characterId, { ...sl, master: master.id, monster: task.monster, target: task.target, progress: 0, size });
      return null;
    },

    /** Loja de Slayer: troca pontos por equipamento (na cidade). */
    slayerBuy(characterId: number, item: string, now: number): string | null {
      const offer = SLAYER_SHOP.find((o) => o.item === item);
      if (!offer) return 'Item inválido.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      const sl = db.slayerFor(characterId);
      if (sl.points < offer.price) return `Precisa de ${offer.price} pontos de Slayer.`;
      db.setSlayer(characterId, { ...sl, points: sl.points - offer.price });
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [item]: 1 }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Slayer: compra um boost de 1 h (loot +25%/+50% ou Bestiário 2x). Comprar o mesmo de novo soma 1 h. */
    slayerBoost(characterId: number, boost: string, now: number): string | null {
      const offer = SLAYER_BOOSTS[boost as SlayerBoostId];
      if (!offer) return 'Boost inválido.';
      this.settle(characterId, now);
      const sl = db.slayerFor(characterId);
      if (sl.points < offer.price) return `Precisa de ${offer.price} pontos de Slayer.`;
      const b = db.slayerBoostsFor(characterId);
      if (boost === 'bestiary') b.bestiaryUntil = Math.max(now, b.bestiaryUntil) + SLAYER_BOOST_MS;
      else {
        const mult = boost === 'loot50' ? 0.5 : 0.25;
        if (b.lootUntil > now && b.lootMult !== mult) return 'Você já tem outro boost de loot ativo. Espere ele acabar.';
        b.lootUntil = Math.max(now, b.lootUntil) + SLAYER_BOOST_MS;
        b.lootMult = mult;
      }
      db.setSlayer(characterId, { ...sl, points: sl.points - offer.price });
      db.setSlayerBoosts(characterId, b);
      return null;
    },

    /** Slayer: desiste da tarefa (zera a sequência). */
    slayerCancel(characterId: number, now: number): string | null {
      this.settle(characterId, now);
      const sl = db.slayerFor(characterId);
      if (!sl.monster) return 'Você não tem tarefa de Slayer.';
      db.setSlayer(characterId, { ...sl, monster: null, target: 0, progress: 0, streak: 0 });
      return null;
    },

    cancelHuntingTask(characterId: number, taskId: string, now: number): string | null {
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      db.cancelHuntingTask(characterId, taskId);
      return null;
    },

    /** Vende relíquias, joias e drops raros ao Rashid por +35% de valor. */
    sellRashid(characterId: number, itemId: string, qty: number, now: number): string | null {
      if (!isRashidItem(itemId)) return 'Rashid só compra relíquias, joias, troféus e equipamentos raros.';
      if (db.lockedItemsFor(characterId).includes(itemId)) return LOCKED;
      if (!Number.isInteger(qty) || qty < 1 || qty > 10_000) return 'Quantidade inválida.';
      this.settle(characterId, now);
      if (!inCity(characterId)) return OUT_OF_CITY;
      if ((db.bankFor(characterId)[itemId] ?? 0) < qty) return 'Você não tem essa quantidade no banco.';
      const price = rashidPrice(itemId) * qty;
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { [itemId]: -qty, [GOLD]: price }, xp: {} },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      db.addStat(characterId, 'rashid_sales', qty);
      return null;
    },

    /** Entra na Arena de gladiadores. */
    startArena(characterId: number, arenaId: string, now: number): string | null {
      const arena = arenaById(arenaId);
      if (!arena) return 'Essa arena não existe.';
      const combatLvl = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      if (combatLvl < arena.level) return `Precisa de nível ${arena.level} de combate para entrar nesta arena.`;
      const current = db.arenasFor(characterId).find((a) => a.arenaId === arenaId);
      if (arena.trial) {
        // Só entra quem está no passo da história que pede esta provação.
        const waiting = db.storiesFor(characterId).some((s) => {
          const g = s.status === 'active' ? storyById(s.id)?.steps[s.step]?.need?.goal : undefined;
          return g?.kind === 'trial' && g.arena === arenaId && s.progress < 1;
        });
        if (!waiting) return 'Esta provação só se abre no passo certo da quest.';
        if (!inCity(characterId)) return OUT_OF_CITY;
      }
      if (current?.status === 'completed' && !arena.trial) return 'Você já conquistou essa arena!';
      if (current?.status === 'reward_pending') return 'Você já venceu a arena! Escolha sua arma de recompensa.';

      this.settle(characterId, now);
      db.setArenaStatus(characterId, arenaId, 'in_progress', 0);
      db.setActivity(characterId, {
        skill: 'combat',
        node: arenaNode(arenaId),
        since: now,
        seed: randomInt(2 ** 31),
        seq: 0,
      });
      return null;
    },

    /** Resgata a arma lendária de recompensa da arena na Sala de Recompensas. */
    claimArenaReward(characterId: number, arenaId: string, weaponId: string, now: number): string | null {
      const arena = arenaById(arenaId);
      if (!arena) return 'Essa arena não existe.';
      this.settle(characterId, now);
      const current = db.arenasFor(characterId).find((a) => a.arenaId === arenaId);
      if (current?.status !== 'reward_pending') return 'Você ainda não venceu a arena para resgatar a recompensa.';
      const weapon = arena.weapons.find((w) => w.id === weaponId);
      if (!weapon) return 'Arma de arena inválida.';

      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        {
          actions: 0,
          items: { [weaponId]: 1, [arena.rewardTrophy]: 1, [GOLD]: arena.rewardGold },
          xp: withXpEvent({ combat: arena.rewardXp }, now),
        },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      db.completeArena(characterId, arenaId, weaponId, now);
      return null;
    },

    /**
     * Abre uma bolsa de armas de chefe: gasta 1 do banco e entrega uma arma
     * sorteada da lista da bolsa. Devolve a arma, ou o erro.
     */
    openPouch(characterId: number, pouchId: string, now: number): { error?: string; item?: string; qty?: number } {
      const pouch = itemById(pouchId);
      if (!pouch?.pouch || (!pouch.pool?.length && !pouch.candy && !pouch.fragment)) return { error: 'Isso não é uma bolsa.' };
      this.settle(characterId, now);
      if ((db.bankFor(characterId)[pouchId] ?? 0) < 1) return { error: 'Você não tem essa bolsa.' };
      // Bolsa de doces: sai uma quantidade sorteada de doces do evento.
      if (pouch.candy) {
        const [min, max] = pouch.candy;
        const qty = min + randomInt(max - min + 1);
        const act = db.activityFor(characterId);
        db.applyGains(characterId, { actions: 0, items: { [pouchId]: -1, [KIDS_CANDY]: qty }, xp: {} }, act?.since ?? now, act?.seq ?? 0);
        return { item: KIDS_CANDY, qty };
      }
      // Fragmento de Trono: sai uma quantidade sorteada de fragmentos do Trono.
      if (pouch.fragment) {
        const min = pouch.fragment.min ?? 2;
        const max = pouch.fragment.max ?? 4;
        const qty = min + randomInt(max - min + 1);
        const act = db.activityFor(characterId);
        db.applyGains(characterId, { actions: 0, items: { [pouchId]: -1, [pouch.fragment.item]: qty }, xp: {} }, act?.since ?? now, act?.seq ?? 0);
        return { item: pouch.fragment.item, qty };
      }
      if (!pouch.pool?.length) return { error: 'Isso não é uma bolsa.' };
      // Peso para a vocação: a arma dela tem POUCH_OWN_WEIGHT; as outras dividem o resto.
      const vocation = db.characterById(characterId)?.vocation;
      const own = (id: string) => !!vocation && !!itemById(id)?.equip?.vocations?.includes(vocation);
      const ownCount = pouch.pool.filter(own).length;
      const weights = pouch.pool.map((id) =>
        ownCount === 0 || ownCount === pouch.pool!.length ? 1 : own(id) ? POUCH_OWN_WEIGHT / ownCount : (1 - POUCH_OWN_WEIGHT) / (pouch.pool!.length - ownCount),
      );
      let roll = (randomInt(1_000_000) / 1_000_000) * weights.reduce((a, b) => a + b, 0);
      let pick = 0;
      while (pick < weights.length - 1 && roll >= weights[pick]) roll -= weights[pick++];
      const item = pouch.pool[pick];
      const activity = db.activityFor(characterId);
      db.applyGains(
        characterId,
        { actions: 0, items: { [pouchId]: -1, [item]: 1 }, xp: {} },
        activity?.since ?? now,
        activity?.seq ?? 0,
      );
      return { item };
    },

    combatBonus,

    /** Gasta 1 ponto de Maestria no nó indicado (nível 400+ ou já com pontos disponíveis). */
    spendMasteryPoint(characterId: number, nodeId: string, now: number): string | null {
      this.settle(characterId, now);
      const combatLvl = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      const cur = db.masteryFor(characterId);
      if (combatLvl < MASTERY_MIN_LEVEL && cur.points < 1 && masterySpentPoints(cur.nodes) < 1) {
        return `A Maestria abre no nível ${MASTERY_MIN_LEVEL} de combate.`;
      }
      const check = canUnlockMasteryNode(cur, nodeId);
      if (!check.ok) return check.error ?? 'Não é possível evoluir esta fatia.';
      const node = masteryNodeById(nodeId)!;
      const currentSlices = cur.slices ?? cur.nodes ?? {};
      const nextSlices = { ...currentSlices, [node.id]: (currentSlices[node.id] ?? 0) + 1 };
      db.setMastery(characterId, { xp: cur.xp, points: cur.points - 1, slices: nextSlices, nodes: nextSlices });
      return null;
    },

    /** Reseta a árvore de Maestria pagando ouro e devolve todos os pontos gastos. */
    resetMastery(characterId: number, now: number): string | null {
      this.settle(characterId, now);
      const cur = db.masteryFor(characterId);
      const spent = masterySpentPoints(cur.nodes);
      if (spent <= 0) return 'Você não tem pontos distribuídos para resetar.';
      const cost = masteryResetCost(cur.nodes);
      const bank = db.bankFor(characterId);
      if ((bank[GOLD] ?? 0) < cost) return `Ouro insuficiente (necessário ${cost.toLocaleString('pt-BR')} moedas).`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [GOLD]: -cost }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.setMastery(characterId, { xp: cur.xp, points: cur.points + spent, slices: {}, nodes: {} });
      return null;
    },

    /** Põe um sigilo do depósito num espaço (ou tira, com null). Os espaços abrem com o nível de Sigilismo. */
    setSigil(characterId: number, slot: number, item: string | null, now: number): string | null {
      if (!Number.isInteger(slot) || slot < 0) return 'Espaço inválido.';
      if (slot >= sigilSlots(db.skillsFor(characterId).sigilism ?? 0)) return 'Esse espaço abre com mais nível de Sigilismo (30 e 60).';
      if (item !== null && !itemById(item)?.sigil) return 'Isso não é um sigilo.';
      if (item !== null && db.sigilsFor(characterId).includes(item)) return 'Esse sigilo já está num espaço.';
      this.settle(characterId, now);
      return db.placeSigil(characterId, slot, item);
    },

    /** Equipa ou desequipa (null) um mascote. */
    setPet(characterId: number, petId: string | null, now: number): string | null {
      this.settle(characterId, now);
      if (petId !== null) {
        if (!petById(petId)) return 'Mascote inválido.';
        if (!db.petsFor(characterId).includes(petId)) return 'Você ainda não desbloqueou este mascote.';
      }
      db.setActivePet(characterId, petId);
      return null;
    },

    /** Loja do Dia das Crianças: troca doces por um mascote cosmético. */
    /** Loja de Halloween: troca doces por um mascote do evento. */
    buyHalloweenPet(characterId: number, petId: string, now: number): string | null {
      if (!isHalloweenShopOpen(now)) return 'A loja de Halloween está fechada.';
      if (!(HALLOWEEN_SHOP_PETS as readonly string[]).includes(petId)) return 'Mascote inválido.';
      this.settle(characterId, now);
      if (db.petsFor(characterId).includes(petId)) return 'Você já tem este mascote.';
      if ((db.bankFor(characterId)[HALLOWEEN_CANDY] ?? 0) < HALLOWEEN_PET_PRICE) return `Precisa de ${HALLOWEEN_PET_PRICE} doces de Halloween.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [HALLOWEEN_CANDY]: -HALLOWEEN_PET_PRICE }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.unlockPet(characterId, petId);
      logHalloweenBuy(characterId, petId, HALLOWEEN_PET_PRICE);
      return null;
    },

    /** Loja de Halloween: troca doces por um traje do evento. */
    buyHalloweenOutfit(characterId: number, outfit: string, now: number): string | null {
      if (!isHalloweenShopOpen(now)) return 'A loja de Halloween está fechada.';
      if (!(HALLOWEEN_OUTFITS as readonly string[]).includes(outfit)) return 'Traje inválido.';
      this.settle(characterId, now);
      if (db.unlockedOutfitsFor(characterId).includes(outfit as OutfitId)) return 'Você já tem este traje.';
      if ((db.bankFor(characterId)[HALLOWEEN_CANDY] ?? 0) < HALLOWEEN_OUTFIT_PRICE) return `Precisa de ${HALLOWEEN_OUTFIT_PRICE} doces de Halloween.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [HALLOWEEN_CANDY]: -HALLOWEEN_OUTFIT_PRICE }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.unlockOutfit(characterId, outfit as OutfitId);
      logHalloweenBuy(characterId, outfit, HALLOWEEN_OUTFIT_PRICE);
      return null;
    },

    /** Poção de Halloween: XP em dobro por 1 h neste personagem, uma por dia por conta (26/10: era uma por conta). */
    buyHalloweenPotion(characterId: number, now: number): string | null {
      if (!isHalloweenShopOpen(now)) return 'A loja de Halloween está fechada.';
      const account = db.accountOfCharacter(characterId);
      if (account === null) return 'Conta inválida.';
      if (db.halloweenPotionUsed(account, dayOf(now))) return 'A Poção das Bruxas é uma por dia. Volte amanhã.';
      this.settle(characterId, now);
      if ((db.bankFor(characterId)[HALLOWEEN_CANDY] ?? 0) < HALLOWEEN_POTION_PRICE) return `Precisa de ${HALLOWEEN_POTION_PRICE} doces de Halloween.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [HALLOWEEN_CANDY]: -HALLOWEEN_POTION_PRICE }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.markHalloweenPotion(account, dayOf(now));
      this.addXpBoost(characterId, HALLOWEEN_POTION_MS, now); // soma ao boost que já houver
      logHalloweenBuy(characterId, 'potion', HALLOWEEN_POTION_PRICE);
      return null;
    },

    /** Loja de Halloween: compra de Boss Token ou Essência de Chefe com doces. */
    buyHalloweenItem(characterId: number, item: 'boss_token' | 'boss_essence', now: number): string | null {
      if (!isHalloweenShopOpen(now)) return 'A loja de Halloween está fechada.';
      const cost = item === 'boss_token' ? HALLOWEEN_BOSS_TOKEN_PRICE : HALLOWEEN_ESSENCE_PRICE;
      this.settle(characterId, now);
      if ((db.bankFor(characterId)[HALLOWEEN_CANDY] ?? 0) < cost) return `Precisa de ${cost} doces de Halloween.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [HALLOWEEN_CANDY]: -cost, [item]: 1 }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      logHalloweenBuy(characterId, item, cost);
      return null;
    },

    /** Doces ou Travessuras: uma vez por dia (horário BRT), sorteia um presente ou susto engraçado. */
    trickOrTreat(characterId: number, now: number): { error?: string; result?: { kind: 'candies' | 'gold' | 'token' | 'trick'; amount?: number; message: string } } {
      if (!isHalloweenShopOpen(now)) return { error: 'O evento de Halloween não está ativo.' };
      const day = new Date(now - 3 * 3600_000).toISOString().slice(0, 10);
      if (db.hasTrickOrTreatedToday(characterId, day)) {
        return { error: 'Você já participou do Doces ou Travessuras hoje! Volte amanhã.' };
      }
      this.settle(characterId, now);
      db.recordTrickOrTreat(characterId, day, now);

      const roll = Math.floor(Math.random() * 4);
      const activity = db.activityFor(characterId);
      const at = activity?.since ?? now;
      const seq = activity?.seq ?? 0;

      if (roll === 0) {
        // Doces
        const amount = 15 + Math.floor(Math.random() * 16); // 15 a 30
        db.applyGains(characterId, { actions: 0, items: { [HALLOWEEN_CANDY]: amount }, xp: {} }, at, seq);
        return {
          result: {
            kind: 'candies',
            amount,
            message: `Gostosuras! Você ganhou uma sacola com ${amount} Doces de Halloween!`,
          },
        };
      } else if (roll === 1) {
        // Ouro
        const amount = 10_000 + Math.floor(Math.random() * 15_001); // 10.000 a 25.000
        db.applyGains(characterId, { actions: 0, items: { gold: amount }, xp: {} }, at, seq);
        return {
          result: {
            kind: 'gold',
            amount,
            message: `Gostosuras! Você encontrou um baú com ${amount.toLocaleString('pt-BR')} moedas de ouro!`,
          },
        };
      } else if (roll === 2) {
        // Boss Token
        db.applyGains(characterId, { actions: 0, items: { boss_token: 1 }, xp: {} }, at, seq);
        return {
          result: {
            kind: 'token',
            amount: 1,
            message: 'Gostosuras raras! Você ganhou 1 Boss Token!',
          },
        };
      } else {
        // Travessura / Susto engraçado (sem perda)
        const tricks = [
          'Buuuh! Uma abóbora saltou do arbusto com uma gargalhada histérica! Seu coração quase saiu pela boca, mas nada foi perdido.',
          'Travessura! Um diabrete invisível puxou sua capa e sussurrou no seu ouvido... Que susto! Por sorte, seus pertences estão a salvo.',
          'Buuuh! Um esqueleto fez barulho de ossos chacoalhando bem atrás de você! Ninguém viu o pulo que você deu...',
          'Travessura! Uma teia de aranha falsa caiu no seu chapéu! Um belo susto para animar o dia.',
        ];
        const trickMsg = tricks[Math.floor(Math.random() * tricks.length)];
        return {
          result: {
            kind: 'trick',
            message: trickMsg,
          },
        };
      }
    },

    buyKidsPet(characterId: number, petId: string, now: number): string | null {
      if (!isKidsShopOpen(now)) return 'A loja do Dia das Crianças está fechada.';
      if (!petById(petId)?.kids) return 'Mascote inválido.';
      this.settle(characterId, now);
      if (db.petsFor(characterId).includes(petId)) return 'Você já tem este mascote.';
      if ((db.bankFor(characterId)[KIDS_CANDY] ?? 0) < KIDS_PET_PRICE) return `Precisa de ${KIDS_PET_PRICE} doces.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [KIDS_CANDY]: -KIDS_PET_PRICE }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.unlockPet(characterId, petId);
      return null;
    },

    /** Loja do Dia das Crianças: troca doces por um traje do evento. */
    buyKidsOutfit(characterId: number, outfit: string, now: number): string | null {
      if (!isKidsShopOpen(now)) return 'A loja do Dia das Crianças está fechada.';
      if (!(KIDS_OUTFITS as readonly string[]).includes(outfit)) return 'Traje inválido.';
      this.settle(characterId, now);
      if (db.unlockedOutfitsFor(characterId).includes(outfit as OutfitId)) return 'Você já tem este traje.';
      if ((db.bankFor(characterId)[KIDS_CANDY] ?? 0) < KIDS_OUTFIT_PRICE) return `Precisa de ${KIDS_OUTFIT_PRICE} doces.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [KIDS_CANDY]: -KIDS_OUTFIT_PRICE }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.unlockOutfit(characterId, outfit as OutfitId);
      return null;
    },

    /** Poção Doce de XP: XP em dobro por 1 h neste personagem, uma vez por conta. */
    buyKidsPotion(characterId: number, now: number): string | null {
      if (!isKidsShopOpen(now)) return 'A loja do Dia das Crianças está fechada.';
      const account = db.accountOfCharacter(characterId);
      if (account === null) return 'Conta inválida.';
      if (db.kidsPotionUsed(account)) return 'A Poção Doce de XP é uma por conta.';
      this.settle(characterId, now);
      if ((db.bankFor(characterId)[KIDS_CANDY] ?? 0) < KIDS_POTION_PRICE) return `Precisa de ${KIDS_POTION_PRICE} doces.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [KIDS_CANDY]: -KIDS_POTION_PRICE }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      db.markKidsPotion(account);
      db.setXpBoostUntil(characterId, now + KIDS_POTION_MS);
      return null;
    },

    /** Gasta stamina do chefe global: cada segundo na arena vale um segundo de caçada. */
    spendStamina(characterId: number, ms: number, now: number) {
      if (!(ms > 0)) return;
      db.setStamina(characterId, Math.max(0, staminaAt(characterId, now) - ms), now);
    },

    /** Soma stamina (até o máximo). Caçando, a guardada vale no início do trecho, então soma lá. */
    addStamina(characterId: number, ms: number, now: number) {
      const activity = db.activityFor(characterId);
      const at = huntsWithStamina(activity) ? activity!.since : now;
      db.setStamina(characterId, Math.min(STAMINA_MAX_MS, staminaAt(characterId, at) + ms), at);
    },

    /** Soma XP em dobro: começa agora ou estende o que ainda está correndo. */
    addXpBoost(characterId: number, ms: number, now: number) {
      db.setXpBoostUntil(characterId, Math.max(now, db.xpBoostUntil(characterId)) + ms);
    },

    /**
     * Loja de Votos: troca Moedas de Voto por stamina, XP em dobro ou o Baú de Votos.
     * Devolve o erro, ou o texto do que saiu (para o aviso).
     */
    buyVoteShop(characterId: number, item: VoteShopItem, now: number, rand: () => number = Math.random): { error?: string; text?: string } {
      const offer = VOTE_SHOP[item];
      if (!offer) return { error: 'Item inválido.' };
      this.settle(characterId, now);
      if ((db.bankFor(characterId)[VOTE_COIN] ?? 0) < offer.price) return { error: `Precisa de ${offer.price} Moedas de Voto.` };
      if (item === 'stamina' && (this.state(characterId, now).stamina ?? 0) >= STAMINA_MAX_MS) return { error: 'Sua stamina já está cheia.' };
      const activity = db.activityFor(characterId);
      const items: Record<string, number> = { [VOTE_COIN]: -offer.price };
      let text: string;
      if (item === 'stamina') {
        this.addStamina(characterId, offer.ms!, now);
        text = 'Você ganhou 2 h de stamina.';
      } else if (item === 'xp') {
        this.addXpBoost(characterId, offer.ms!, now);
        text = 'XP em dobro por 1 hora!';
      } else {
        const level = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
        const roll = rollVoteChest(level, rand);
        items.gold = roll.gold;
        const parts = [`${roll.gold.toLocaleString('pt-BR')} de ouro`];
        if (roll.bonuses.includes('stamina')) {
          this.addStamina(characterId, VOTE_CHEST.staminaMs, now);
          parts.push('1 h de stamina');
        }
        if (roll.bonuses.includes('xp')) {
          this.addXpBoost(characterId, VOTE_CHEST.xpMs, now);
          parts.push('30 min de XP em dobro');
        }
        if (roll.bonuses.includes('meal')) {
          items[roll.meal] = VOTE_CHEST.mealQty;
          parts.push(`${VOTE_CHEST.mealQty}x ${itemById(roll.meal)?.name ?? roll.meal}`);
        }
        text = `${roll.rare ? 'PRÊMIO RARO! ' : ''}Baú de Votos: ${parts.join(', ')}.`;
      }
      db.applyGains(characterId, { actions: 0, items, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return { text };
    },

    /** Loja de Votos: o mascote exclusivo (uma vez). */
    buyVotePet(characterId: number, now: number): string | null {
      this.settle(characterId, now);
      if (db.petsFor(characterId).includes(VOTE_PET)) return 'Você já tem este mascote.';
      return this.payVoteCoins(characterId, VOTE_PET_PRICE, now) ?? (db.unlockPet(characterId, VOTE_PET), null);
    },

    /** Loja de Votos: um dos trajes exclusivos (uma vez cada). */
    buyVoteOutfit(characterId: number, outfit: string, now: number): string | null {
      if (!(VOTE_OUTFITS as readonly string[]).includes(outfit)) return 'Traje inválido.';
      this.settle(characterId, now);
      if (db.unlockedOutfitsFor(characterId).includes(outfit as OutfitId)) return 'Você já tem este traje.';
      return this.payVoteCoins(characterId, VOTE_OUTFIT_PRICE, now) ?? (db.unlockOutfit(characterId, outfit as OutfitId), null);
    },

    /** Desconta Moedas de Voto; devolve o erro se não tiver o bastante. */
    payVoteCoins(characterId: number, price: number, now: number): string | null {
      if ((db.bankFor(characterId)[VOTE_COIN] ?? 0) < price) return `Precisa de ${price} Moedas de Voto.`;
      const activity = db.activityFor(characterId);
      db.applyGains(characterId, { actions: 0, items: { [VOTE_COIN]: -price }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /**
     * Loja de Tarefas: troca Pontos de Caça (o saldo; a patente segue o total ganho)
     * por Curinga de Presa, materiais de imbuement (Rastreador) ou pontos de charm (Elite).
     */
    buyTaskShop(characterId: number, item: TaskShopItem, material: string | undefined, now: number): string | null {
      const offer = TASK_SHOP[item];
      if (!offer) return 'Item inválido.';
      if (item === 'imbuement_material' && (!material || !IMBUEMENT_MATERIALS.includes(material))) return 'Escolha um material de imbuement.';
      this.settle(characterId, now);
      const stats = db.statsFor(characterId);
      const total = stats.hunting_points ?? 0;
      if (total < offer.minPoints) return 'Sua patente ainda não libera este item.';
      const price = taskShopPrice(item, total, db.taskXpBoostsOn(characterId, dayOf(now)));
      const free = total - (stats.hunting_points_spent ?? 0);
      if (free < price) return `Faltam ${price - free} Pontos de Caça.`;
      db.addStat(characterId, 'hunting_points_spent', price);
      if (item === 'charm_points') {
        db.addStat(characterId, 'charm_bonus', offer.qty);
        return null;
      }
      if (item === 'stamina') {
        this.addStamina(characterId, TASK_SHOP_STAMINA_MS, now);
        return null;
      }
      if (item === 'xp_boost') {
        this.addXpBoost(characterId, TASK_SHOP_XP_BOOST_MS, now);
        db.addTaskXpBoost(characterId, dayOf(now));
        return null;
      }
      const activity = db.activityFor(characterId);
      const id = item === 'prey_wildcard' ? PREY_WILDCARD : material!;
      db.applyGains(characterId, { actions: 0, items: { [id]: offer.qty }, xp: {} }, activity?.since ?? now, activity?.seq ?? 0);
      return null;
    },

    /** Aviso no chat geral (vai na próxima leva). */
    announce(msg: string) {
      announce(msg);
    },

    /** Avisos pendentes para o chat geral (e limpa a fila). */
    takeAnnouncements(): string[] {
      return announcements.splice(0);
    },

    /** Para a atividade. A ação ou luta que estava pela metade é perdida. */
    stop(characterId: number, now: number) {
      this.settle(characterId, now);
      db.setActivity(characterId, null);
      const q = db.queueFor(characterId);
      if (q.until !== null) db.setQueue(characterId, q.queue, null);
    },

    /**
     * Volta para o que fazia antes do chefe global. O start tira a hora marcada da fila; aqui ela volta
     * com o tempo que faltava (o tempo no chefe não conta). Devolve se conseguiu voltar.
     */
    resumeAfterBoss(characterId: number, ret: { skill: SkillId; node: string; leftMs: number | null }, now: number): boolean {
      if (this.start(characterId, ret.skill, ret.node, now) !== null) return false;
      if (ret.leftMs !== null) db.setQueue(characterId, db.queueFor(characterId).queue, now + ret.leftMs);
      return true;
    },

    /** Começa a próxima tarefa possível da fila em `at` (pula as que não dão: nível, material). */
    startQueued(characterId: number, at: number, skipped?: string[]): boolean {
      const { queue } = db.queueFor(characterId);
      while (queue.length) {
        const next = queue.shift()!;
        if (next.skill === 'combat') continue;
        const err = this.start(characterId, next.skill, next.node, at);
        if (err !== null) {
          const name = (isProductionSkill(next.skill) ? recipeById(next.skill, next.node)?.name : nodeById(next.skill, next.node)?.name) ?? next.node;
          skipped?.push(`${name} (${err.replace(/\.$/, '')})`);
        }
        if (err === null) {
          db.setQueue(characterId, queue, next.hours ? at + next.hours * 3_600_000 : null);
          return true;
        }
      }
      db.setQueue(characterId, [], null);
      return false;
    },

    /** Troca a fila de profissões inteira (até QUEUE_MAX; só profissões que existem). */
    setQueue(characterId: number, queue: QueuedActivity[], now: number): string | null {
      if (!Array.isArray(queue) || queue.length > QUEUE_MAX) return `A fila tem no máximo ${QUEUE_MAX} tarefas.`;
      const clean: QueuedActivity[] = [];
      for (const q of queue) {
        if (!q || q.skill === 'combat' || !PROFESSIONS.includes(q.skill as (typeof PROFESSIONS)[number])) return 'Só profissões entram na fila.';
        const exists = isProductionSkill(q.skill) ? recipeById(q.skill, q.node) : nodeById(q.skill, q.node);
        if (!exists) return 'Essa tarefa não existe.';
        const hours = q.hours === undefined || q.hours === null ? undefined : Number(q.hours);
        if (hours !== undefined && !(hours > 0 && hours <= 24)) return 'As horas vão de 0 a 24.';
        if (!isProductionSkill(q.skill) && hours === undefined) return 'Coleta não acaba sozinha: diga por quantas horas.';
        clean.push({ skill: q.skill, node: q.node, ...(hours ? { hours } : {}) });
      }
      this.settle(characterId, now);
      db.setQueue(characterId, clean, db.queueFor(characterId).until);
      return null;
    },

    /** Até quando vai a profissão atual (horas a partir de agora; null = até acabar o material). */
    setQueueLimit(characterId: number, hours: number | null, now: number): string | null {
      const act = db.activityFor(characterId);
      if (!act || act.skill === 'combat') return 'Só dá para marcar hora numa profissão.';
      if (hours !== null && !(Number(hours) > 0 && Number(hours) <= 24)) return 'As horas vão de 0 a 24.';
      this.settle(characterId, now);
      db.setQueue(characterId, db.queueFor(characterId).queue, hours === null ? null : now + Number(hours) * 3_600_000);
      return null;
    },

    buyRaidShop(characterId: number, itemId: string, now: number): { error?: string; success?: boolean } {
      this.settle(characterId, now);
      const week = weekOf(now);
      const bank = db.bankFor(characterId);
      const fragCount = bank[RAID_FRAGMENT_ID] ?? 0;
      const activity = db.activityFor(characterId);
      const since = activity?.since ?? now;
      const seq = activity?.seq ?? 0;

      if (itemId === 'raid_chest') {
        if (fragCount < RAID_CHEST_COST) return { error: 'Fragmentos de Raide insuficientes.' };
        const boughtThisWeek = db.raidShopChestCount(characterId, week);
        if (boughtThisWeek >= RAID_CHEST_WEEKLY_LIMIT) return { error: `Limite semanal de baús atingido (${RAID_CHEST_WEEKLY_LIMIT}/${RAID_CHEST_WEEKLY_LIMIT}).` };
        db.applyGains(characterId, { actions: 0, items: { [RAID_FRAGMENT_ID]: -RAID_CHEST_COST, gold: RAID_CHEST_GOLD }, xp: {} }, since, seq);
        db.recordRaidShopPurchase(characterId, week, 'raid_chest');
        return { success: true };
      }

      if ((RAID_SET_ITEMS as readonly string[]).includes(itemId)) {
        if (fragCount < RAID_SHOP_SET_COST) return { error: 'Fragmentos de Raide insuficientes.' };
        if (db.hasBoughtRaidSetPiece(characterId, itemId)) return { error: 'Você já adquiriu esta peça da loja de raide.' };
        db.applyGains(characterId, { actions: 0, items: { [RAID_FRAGMENT_ID]: -RAID_SHOP_SET_COST, [itemId]: 1 }, xp: {} }, since, seq);
        db.recordRaidShopPurchase(characterId, week, itemId);
        return { success: true };
      }

      return { error: 'Item não encontrado na loja de raide.' };
    },
  };
}
