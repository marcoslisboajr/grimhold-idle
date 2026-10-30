import { audioSettings, bossAlert, playMusic, sfx, type Track } from './audio.ts';
import { Pix } from './Pix.tsx';
import { SoundMenu } from './SoundMenu.tsx';
import { itemEffectText } from './itemEffect.ts';
import { GuildOrders } from './GuildOrders.tsx';
import { SlayerPanel, slayerTaskLine } from './SlayerPanel.tsx';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  RAID_FRAGMENT_ID,
  RAID_MAX_FIGHT_MS,
  RAID_PHASE_REST_MS,
  ELEMENT_LIST,
  RESIST_KEY,
  craftableCount,
  achievementById,
  splitRarity,
  gearScore,
  rarityOf,
  RARITIES,
  MAX_SPELLS,
  maxSpells,
  FOURTH_SPELL_LEVEL,
  spellsFor,
  SHOPS,
  shopPrice,
  type ShopId,
  type Bonus,
  type RuneEffect,
  QUESTS,
  questById,
  questDone,
  questShown,
  questTarget,
  type Quest,
  EQUIP_SLOTS,
  equipmentBonus,
  IMBUEMENTS,
  imbuementFamily,
  imbuementsBonus,
  mergeBonus,
  HUNTING_TASKS,
  huntingTaskById,
  MONSTERS,
  rankForPoints,
  type HuntingTaskState,
  isRashidItem,
  rashidPrice,
  huntById,
  ITEMS,
  itemById,
  itemValue,
  playerStats,
  RECIPES,
  recipeById,
  type Recipe,
  type ResourceNode,
  type EquipSlot,
  type GatheringSkillId,
  type ChatMessage,
  type Listing,
  type Item,
  type BuyOffer,
  type ProductionSkillId,
  type SkillId,
  levelForXp,
  questLowLevelXpMult,
  xpEventBonus,
  capeXpMult,
  PET_XP_BONUS,
  fullSets,
  SET_BONUS,
  xpForLevel,
  levelProgress,
  monsterById,
  NODES,
  nodeById,
  withSigils,
  sigilSlots,
  killsMissing,
  MAX_SIGILS,
  SIGIL_SLOT_LEVELS,
  gatherSpeed,
  petSkillsOf,
  productionSpeed,
  productionIntervalMs,
  gatherIntervalMs,
  gatherExtraChance,
  bestTool,
  GRANDMASTER_ARTISAN_XP,
  ARTISAN_KIT_SPEED,
  GRANDMASTER_POINTS,
  toolsFor,
  toolSpeedFor,
  multitoolFor,
  outfitCount,
  outfitGroupFor,
  outfitItems,
  professionGearXpMult,
  petById,
  parseHuntNode,
  SKILLS,
  VOCATIONS,
  PROMOTION_LEVEL,
  SECOND_PROMOTION_LEVEL,
  THIRD_PROMOTION_LEVEL,
  FOURTH_PROMOTION_LEVEL,
  ultimateFor,
  ASCENSION_STORY,
  promotionById,
  promotionsFor,
  nextPromotionFor,
  type Activity,
  type Character,
  type Look,
  type VocationId,
  type Gains,
  type PlayerState,
  blessPrice,
  isReaperNode,
  REAPER_KEEP_MS,
  type ReaperPack,
  WORLD_BOSS_NODE,
  bossSkillText,
  type BossReward,
  type BossView,
  type BossHistoryEntry,
  type AltBank,
  type OnlinePlayer,
  STORIES,
  storyById,
  storyNeedDone,
  storyStepProgress,
  storyTarget,
  type Story,
  parseArenaNode,
  missionTitle,
  HUNTS,
  ADDON_NAMES,
  type LookAddon,
  type StoryEnding,
  DUMMY_NODES,
  dummyById,
  dummyXpPerAction,
  isDummyNode,
  type PartyView,
  type PartyInviteView,
  type OutfitId,
  BOSS_TOKEN,
  BOSS_TOKEN_COST,
  BOSS_TOKEN_SHOP_ITEMS,
  bossTokenPrice,
  refineCost,
  nextRefineId,
  refineChance,
  refineMaterials,
  nextRarityId,
  ascendCost,
  ascendChance,
  gearId,
  MAX_REFINE,
  REFINE_STEP,
  FORGE_WARD,
  FORGE_WARD_BONUS,
  ascendFodder,
  BOSS_ESSENCE,
  BOSS_ASCEND_ESSENCE,
  bossEssenceFor,
  bossRefineEssence,
  ASCEND_FODDER,
  dismantleMaterials,
  type TradeInviteView,
  type TradeSessionView,
  staminaXpMult,
  ELEMENTS,
  type Element,
  STAMINA_BONUS_MS,
  STAMINA_SUPER_MS,
  STAMINA_NORMAL_MS,
  arenaById,
  OUTFIT_DEFS,
  professionXpBoost,
  SPECIAL_BOSSES,
  getBoostedSkill,
  BOOSTED_SKILL_XP_MULT,
  KIDS_CANDY,
  VOTE_COIN,
  VOTE_EVERY_MS,
  isKidsShopOpen,
  isHalloweenShopOpen,
  HALLOWEEN_CANDY,
  spellById,
  spellGemText,
  guildBonus,
  DISCORD_URL,
  FIRST_STEPS,
  MINING_TOOL_YIELD,
  firstStepClaimed,
  itemSources,
  type QuestGoal,
  type Hunt,
  MASTERY_MIN_LEVEL,
  huntLevelFor,
  masteryLevel,
  taskHuntLevel,
  taskPointsFor,
  masteryPointCost,
  masteryEffects,
  withMastery,
  withCombatPet,
  type MasteryState,
  nextFirstStep,
  FEATURED_TASK_BONUS,
  type TaskShopItem,
  DAILY_CHEST_MAX_STREAK,
  GATHER_SKILLS,
  dailyChestReward,
  GEAR_REQ,
  gearPower,
  setQualityBonus,
} from '@grimhold/shared';
import { KidsShop } from './KidsShop.tsx';
import { HalloweenShop } from './HalloweenShop.tsx';
import { VoteShop } from './VoteShop.tsx';
import { TaskShop } from './TaskShop.tsx';
import { AchievementsPanel, titleName } from './Achievements.tsx';
import { connectSocket, type Socket } from './api.ts';
import { MonsterSprite } from './Battle.tsx';
import { BestiaryPanel } from './Bestiary.tsx';
import { LookEditor } from './LookEditor.tsx';
import { HuntPicker, LEVEL_RANGES, levelRangeOf } from './HuntPicker.tsx';
import { Market } from './Market.tsx';
import { COMPARE_STATS, StatDiff, UpgradeArrow, upgradeVs } from './compare.tsx';
import { Chat, linkItemInChat, type ChatMode } from './Chat.tsx';
import { ProfileModal } from './Profile.tsx';
import { Ranking } from './Ranking.tsx';
import { Feedback } from './Feedback.tsx';
import { ProtectAccount } from './Account.tsx';
import { Sprite } from './Sprite.tsx';
import { WorldView } from './world/WorldView.tsx';
import { CITY_TALKERS, INNKEEPER_NPC, TEMPLE_NPC, type Npc, type NpcId } from './world/map.ts';
import { ArenaPanel } from './ArenaPanel.tsx';
import { ActionBar } from './ActionBar.tsx';
import { PartyPanel, PartyInviteModal } from './PartyPanel.tsx';
import { PetsPanel } from './PetsPanel.tsx';
import { TradeModal, TradeInviteModal } from './TradeModal.tsx';
import { serverText } from './serverText.ts';
import { HowToPlay } from './HowToPlay.tsx';
import { ClassGuide } from './ClassGuide.tsx';
import { MasteryPanel } from './MasteryPanel.tsx';
import { ActivityQueue, queueAdd } from './ActivityQueue.tsx';
import { t, tr, storyText, getLang, setLang, onLangChange, itemName, type Lang } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;

export function Home({
  token,
  character,
  username: initialUsername,
  onLogout,
  onSwitchCharacter,
}: {
  token: string;
  character: Character;
  username: string | null;
  onLogout: () => void;
  /** Volta para a seleção de personagem. */
  onSwitchCharacter: () => void;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [protecting, setProtecting] = useState(false);
  const [state, setState] = useState<PlayerState | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [offline, setOffline] = useState<{ elapsedMs: number; gains: Gains } | null>(null);
  /** Último ganho offline (com contador): o analisador desconta da sessão. */
  const [offlineGain, setOfflineGain] = useState<{ n: number; elapsedMs: number; gains: Gains } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [death, setDeath] = useState<{ monster: string; xpLost: number; itemsLost?: string[]; blessed?: boolean; reaper?: { price: number; expiresAt: number } } | null>(null);
  /** Janela do Ceifador (abre sozinha ao acordar no Limiar dos Mortos). */
  const [reaperOpen, setReaperOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<'how' | 'gear'>('how');
  const [picking, setPicking] = useState(false);
  const [cleared, setCleared] = useState<{ hunt: string; loot?: Record<string, number>; xp?: number } | null>(null);
  const [boss, setBoss] = useState<BossView | null>(null);
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [announce, setAnnounce] = useState<string | null>(null);
  // Aviso de raid no meio da tela (estilo Tibia).
  const [raidWarning, setRaidWarning] = useState<string | null>(null);
  /** Comemoração do servidor inteiro (o primeiro 99 numa profissão). */
  const [celebration, setCelebration] = useState<string | null>(null);
  const [bossResult, setBossResult] = useState<{ boss: string; killed: boolean; damage: number; reward: BossReward } | null>(null);
  const [pouchResult, setPouchResult] = useState<{ pouch: string; item: string; qty?: number } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyOffers, setBuyOffers] = useState<BuyOffer[]>([]);
  /** Janela de NPC aberta (só na cidade). */
  const [npcOpen, setNpcOpen] = useState<NpcId | null>(null);
  const [trickResult, setTrickResult] = useState<{ kind: string; amount?: number; message: string } | null>(null);
  /** Aba de profissão aberta; acompanha a profissão que começou a rodar. */
  const [prof, setProf] = useState<(typeof PROFESSIONS)[number]>('mining');
  const [profSort, setProfSort] = useState<ProfSortMode>(loadProfSort);
  const [profOnlyDoable, setProfOnlyDoable] = useState<boolean>(loadProfOnlyDoable);
  const updateProfSort = (mode: ProfSortMode) => {
    setProfSort(mode);
    saveProfSort(mode);
  };
  const updateProfOnlyDoable = (only: boolean) => {
    setProfOnlyDoable(only);
    saveProfOnlyDoable(only);
  };
  const runningSkill = state?.activity?.skill;
  useEffect(() => {
    if (runningSkill && (PROFESSIONS as readonly string[]).includes(runningSkill)) setProf(runningSkill as (typeof PROFESSIONS)[number]);
  }, [runningSkill]);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [playersModalOpen, setPlayersModalOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  /** Cidade ao vivo: o último tile que cada jogador mandou. */
  const livePos = useRef(new Map<number, { x: number; y: number }>());
  /** Conversa aberta com um NPC (mestres, guardas). */
  const [talk, setTalk] = useState<Npc | null>(null);
  // Primeira vez no jogo: o Hellel se apresenta e explica o básico.
  useEffect(() => {
    try {
      if (localStorage.getItem('grimhold.tutorial')) return;
      localStorage.setItem('grimhold.tutorial', '1');
    } catch {
      return;
    }
    setTalk(CITY_TALKERS[0]);
  }, []);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [party, setParty] = useState<PartyView | null>(null);
  const [partyInvite, setPartyInvite] = useState<PartyInviteView | null>(null);
  const [tradeInvite, setTradeInvite] = useState<TradeInviteView | null>(null);
  const [tradeSession, setTradeSession] = useState<TradeSessionView | null>(null);
  const [tradeNotice, setTradeNotice] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>(getLang);
  useEffect(() => onLangChange(setLangState), []);
  const clockOffset = useRef(0);
  const socket = useRef<Socket | null>(null);
  const vocation = VOCATIONS.find((v) => v.id === character.vocation);

  useEffect(() => {
    const s = connectSocket(token, (msg) => {
      if (msg.type === 'state') {
        clockOffset.current = msg.state.serverNow - Date.now();
        setState(msg.state);
      } else if (msg.type === 'online') setOnline(msg.count);
      else if (msg.type === 'offline') {
        setOffline({ elapsedMs: msg.elapsedMs, gains: msg.gains });
        setOfflineGain((g) => ({ n: (g?.n ?? 0) + 1, elapsedMs: msg.elapsedMs, gains: msg.gains }));
      }
      else if (msg.type === 'error') {
        setError(serverText(msg.message));
        sfx('error');
      }
      else if (msg.type === 'death') setDeath({ monster: msg.monster, xpLost: msg.xpLost, itemsLost: msg.itemsLost, blessed: msg.blessed, reaper: msg.reaper });
      else if (msg.type === 'cleared') setCleared({ hunt: msg.hunt, loot: msg.loot, xp: msg.xp });
      else if (msg.type === 'arena_cleared') {
        // Provação de quest: o próximo passo é falar com o NPC, então abre as Quests.
        const panel = arenaById(msg.arena)?.trial ? 'quests' : 'arena';
        setOpen((prev) => new Set([...prev, panel]));
      }
      else if (msg.type === 'boss') setBoss(msg.view);
      else if (msg.type === 'players') setPlayers(msg.players);
      else if (msg.type === 'account_banks') setAltBanks(msg.chars);
      else if (msg.type === 'city_move') livePos.current.set(msg.id, { x: msg.x, y: msg.y });
      else if (msg.type === 'party') setParty(msg.party);
      else if (msg.type === 'party_invite') setPartyInvite(msg.invite);
      else if (msg.type === 'trade_invite') setTradeInvite(msg.invite);
      else if (msg.type === 'trade_start' || msg.type === 'trade_update') setTradeSession(msg.view);
      else if (msg.type === 'trade_success') {
        setTradeSession(null);
        setTradeNotice(msg.message);
        sfx('levelup');
        setTimeout(() => setTradeNotice(null), 4000);
      } else if (msg.type === 'trade_closed') {
        setTradeSession(null);
        if (msg.reason) {
          setError(serverText(msg.reason));
          sfx('error');
        }
      }
      else if (msg.type === 'celebrate') {
        setCelebration(msg.text);
        sfx('levelup');
        setTimeout(() => sfx('rare'), 700);
        setTimeout(() => sfx('levelup'), 1400);
        setTimeout(() => setCelebration(null), 12_000);
      }
      else if (msg.type === 'raid_warning') {
        setRaidWarning(msg.text);
        sfx('boss');
        setTimeout(() => setRaidWarning(null), 9_000);
      } else if (msg.type === 'notice') {
        setAnnounce(msg.text);
        setTimeout(() => setAnnounce(null), 10_000);
      } else if (msg.type === 'boss_announce') {
        setAnnounce(msg.text);
        // Alerta próprio (com opção no menu de som); o efeito comum fica para quem desligou o alerta.
        if (audioSettings().bossAlert) bossAlert(tr('Chefe global!', 'World boss!'));
        else sfx('boss');
        setTimeout(() => setAnnounce(null), 10_000);
      } else if (msg.type === 'boss_result') setBossResult({ boss: msg.boss, killed: msg.killed, damage: msg.damage, reward: msg.reward });
      else if (msg.type === 'pouch_opened') setPouchResult({ pouch: msg.pouch, item: msg.item, qty: msg.qty });
      else if (msg.type === 'market') {
        setListings(msg.listings);
        setBuyOffers(msg.offers ?? []);
      }
      else if (msg.type === 'chat') {
        // Ao reconectar o histórico vem de novo: junta sem repetir.
        setChat((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...msg.messages.filter((m) => !seen.has(m.id))].slice(-100);
        });
      }
    });
    socket.current = s;
    return () => s.close();
  }, [token]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(id);
  }, [error]);

  const combatXp = state?.skills.combat ?? 0;
  const combatLevel = levelForXp(combatXp, 'combat');
  // Aviso de por que a profissão parou: some ao fechar (guarda o horário do último visto).
  const [stopSeen, setStopSeen] = useState(() => {
    try {
      return Number(localStorage.getItem(STOP_SEEN_KEY)) || 0;
    } catch {
      return 0;
    }
  });
  // Aviso de voto liberado: fecha até o próximo voto (guarda o lastVoteAt de quando fechou).
  const [voteSeen, setVoteSeen] = useState(() => {
    try {
      const v = localStorage.getItem(VOTE_SEEN_KEY);
      return v === null ? -1 : Number(v);
    } catch {
      return -1;
    }
  });
  const markVoteSeen = (at: number) => {
    setVoteSeen(at);
    try {
      localStorage.setItem(VOTE_SEEN_KEY, String(at));
    } catch {
      /* sem storage: só nesta sessão */
    }
  };
  // Relógio de 1 min para o aviso aparecer quando o voto libera, mesmo sem outra atualização na tela.
  const [, setVoteTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setVoteTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const markStopSeen = (at: number) => {
    setStopSeen(at);
    try {
      localStorage.setItem(STOP_SEEN_KEY, String(at));
    } catch {
      /* sem storage: só nesta sessão */
    }
  };
  // O aviso aparece uma vez: some sozinho em 15 s, e conta como visto se já começou outra atividade.
  const stopAt = state?.activityStop?.at ?? 0;
  useEffect(() => {
    if (!stopAt || stopAt <= stopSeen) return;
    if (state?.activity) return markStopSeen(stopAt);
    const id = setTimeout(() => markStopSeen(stopAt), 15_000);
    return () => clearTimeout(id);
  }, [stopAt, stopSeen, !!state?.activity]);
  questXpMult = questLowLevelXpMult(combatLevel);
  const xpRate = useXpRate(combatXp);
  const activity = state?.activity ?? null;
  const hunting = activity?.skill === 'combat' ? parseHuntNode(activity.node) : null;
  // Limiar dos Mortos: acordou ali depois de morrer sem bênção (o Ceifador guarda as peças).
  const inLimbo = isReaperNode(activity?.node);
  useEffect(() => {
    if (inLimbo) setReaperOpen(true);
  }, [inLimbo]);
  // Música do lugar: cidade, profissão, caçada (pelo nível) ou o chefe global.
  const track: Track = !activity
    ? 'city'
    : activity.node === WORLD_BOSS_NODE
      ? ((boss?.music as Track | undefined) ?? 'boss')
      : inLimbo
        ? 'dungeon'
      : activity.skill !== 'combat'
        ? activity.skill in NODES
          ? 'gather'
          : 'work'
        : !hunting
          ? 'boss'
          : hunting.hunt.level >= 100
            ? 'endgame'
            : hunting.hunt.level >= 40
              ? 'dungeon'
              : 'hunt';
  useEffect(() => playMusic(track), [track]);
  // Subiu de nível em qualquer skill: fanfarra e aviso na tela (não na primeira carga, que traz o offline).
  const lastLevels = useRef<Record<string, number> | null>(null);
  const [levelUps, setLevelUps] = useState<string[]>([]);
  const levelUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state) return;
    const now: Record<string, number> = {};
    for (const s of SKILLS) now[s.id] = levelForXp(state.skills[s.id] ?? 0, s.id);
    const prev = lastLevels.current;
    lastLevels.current = now;
    if (!prev) return;
    const ups = SKILLS.filter((s) => now[s.id] > (prev[s.id] ?? now[s.id])).map((s) =>
      tr(`Você subiu para o nível ${now[s.id]} em ${t(`skill.${s.id}`, s.name)}!`, `You advanced to level ${now[s.id]} in ${t(`skill.${s.id}`, s.name)}!`),
    );
    if (!ups.length) return;
    sfx('levelup');
    setLevelUps(ups);
    if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
    levelUpTimer.current = setTimeout(() => setLevelUps([]), 4000);
  }, [state?.skills]);
  // Conquista nova: o mesmo aviso do nível, com o nome e os pontos.
  const lastAch = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!state?.achievements) return;
    const ids = Object.keys(state.achievements);
    const prev = lastAch.current;
    lastAch.current = new Set(ids);
    if (!prev) return;
    const fresh = ids.filter((id) => !prev.has(id)).map((id) => achievementById(id)).filter((a) => !!a);
    if (!fresh.length) return;
    sfx('levelup');
    setLevelUps(fresh.map((a) => `★ ${tr('Conquista', 'Achievement')}: ${getLang() === 'pt' ? a!.name[0] : a!.name[1]} (+${a!.points} ${tr('pontos', 'points')})`));
    if (levelUpTimer.current) clearTimeout(levelUpTimer.current);
    levelUpTimer.current = setTimeout(() => setLevelUps([]), 5000);
  }, [state?.achievements]);
  const start = (skill: SkillId, node: string) =>
    socket.current?.send({ type: 'start', skill, node });
  const equip = (item: string) => socket.current?.send({ type: 'equip', item });
  const openPouch = (item: string) => socket.current?.send({ type: 'open_pouch', item });
  const lockItem = (item: string, locked: boolean) => socket.current?.send({ type: 'lock_item', item, locked });
  // Depósito da conta: os depósitos dos outros personagens e pegar deles.
  const [altBanks, setAltBanks] = useState<AltBank[] | null>(null);
  const loadAltBanks = () => socket.current?.send({ type: 'account_banks' });
  const takeFromAlt = (from: number, item: string, qty: number) => socket.current?.send({ type: 'take_from_alt', from, item, qty });
  const unequip = (slot: EquipSlot) => socket.current?.send({ type: 'unequip', slot });
  const stop = () => socket.current?.send({ type: 'stop' });
  const promotion = promotionById(state?.promotion);
  const nextPromo = nextPromotionFor(state?.promotion);
  const canPromoteT1 = !state?.promotion && combatLevel >= PROMOTION_LEVEL;
  const canPromoteT2 =
    !!promotion && !!nextPromo && combatLevel >= ((nextPromo.tier ?? 1) === 4 ? FOURTH_PROMOTION_LEVEL : (nextPromo.tier ?? 1) === 3 ? THIRD_PROMOTION_LEVEL : SECOND_PROMOTION_LEVEL);
  const canPromote = !!state && (canPromoteT1 || canPromoteT2);
  const [promoting, setPromoting] = useState(false);
  const [open, setOpen] = useState<Set<PanelId>>(loadPanels);
  // Layout do HUD lateral (só no PC): lado, largura, ordem dos painéis e trava.
  const [hud, setHudState] = useState<HudLayout>(loadHud);
  const [topbarCollapsed, setTopbarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('grimhold.topbarCollapsed') === '1';
    } catch {
      return false;
    }
  });
  const toggleTopbar = () => {
    setTopbarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('grimhold.topbarCollapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };
  const setHud = (patch: Partial<HudLayout>) =>
    setHudState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(HUD_KEY, JSON.stringify(next));
      } catch {
        /* sem armazenamento: só não lembra */
      }
      return next;
    });
  const movePanel = (id: PanelId, dir: -1 | 1) => {
    const shown = hud.order.filter((p) => open.has(p));
    const i = shown.indexOf(id);
    const other = shown[i + dir];
    if (!other) return;
    const order = [...hud.order];
    const a = order.indexOf(id);
    const b = order.indexOf(other);
    [order[a], order[b]] = [order[b], order[a]];
    setHud({ order });
  };
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = hud.width;
    dragWith((ev) => {
      const dx = ev.clientX - x0;
      const w = Math.round(Math.min(Math.max(w0 + (hud.side === 'right' ? -dx : dx), 260), Math.min(760, window.innerWidth * 0.6)));
      setHud({ width: w });
    });
  };
  const startHeight = (id: PanelId, e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect().height;
    dragWith(
      (ev) => {
        const h = Math.round(Math.min(Math.max(h0 + ev.clientY - y0, 80), window.innerHeight - 120));
        setHudState((prev) => ({ ...prev, heights: { ...prev.heights, [id]: h } }));
      },
      () => setHud({}),
    );
  };
  const slot = (id: PanelId, node: React.ReactNode) => {
    const shown = hud.order.filter((p) => open.has(p));
    const i = shown.indexOf(id);
    return (
      <div className={`side-slot ${hud.heights[id] ? 'sized' : ''}`} style={{ order: hud.order.indexOf(id), height: hud.heights[id] }}>
        {!hud.locked && (
          <div className="slot-tools">
            <button type="button" title={tr('Subir', 'Move up')} disabled={i <= 0} onClick={() => movePanel(id, -1)}>▲</button>
            <button type="button" title={tr('Descer', 'Move down')} disabled={i < 0 || i >= shown.length - 1} onClick={() => movePanel(id, 1)}>▼</button>
            {hud.heights[id] && (
              <button type="button" title={tr('Altura automática', 'Automatic height')} onClick={() => setHud({ heights: { ...hud.heights, [id]: undefined } })}>↺</button>
            )}
          </div>
        )}
        {node}
        {!hud.locked && <div className="slot-height" title="Arraste para mudar a altura" onPointerDown={(e) => startHeight(id, e)} />}
      </div>
    );
  };
  // Arena e Profissões abrem numa janela grande no meio da tela (como a de caçada).
  const [modal, setModal] = useState<PanelId | null>(null);
  /** Caçada esperando o jogador confirmar (a atividade atual vai parar). */
  const [confirmHunt, setConfirmHunt] = useState<{ node: string; text: string } | null>(null);
  /** Aba com que a janela de caçada abre (o botão da quest abre na aba Quests). */
  const [pickerMode, setPickerMode] = useState<'quests' | 'raids' | undefined>(undefined);
  const [pickerHunt, setPickerHunt] = useState<string | undefined>(undefined);
  // Profissões abre na profissão que está rodando (antes abria na última aba vista).
  useEffect(() => {
    if (modal === 'prof' && runningSkill && (PROFESSIONS as readonly string[]).includes(runningSkill)) setProf(runningSkill as (typeof PROFESSIONS)[number]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);
  // Chat encaixado em cima da barra do mapa; o botão "Chat" do HUD abre e fecha.
  const [chatMode, setChatModeState] = useState<ChatMode>(() => {
    try {
      const v = localStorage.getItem('grimhold.chat');
      // Celular: o chat começa minimizado (uma aba que abre ao tocar), senão cobre o mapa e os botões da cidade.
      if (v === null && window.innerWidth <= 768) return 'min';
      return v === 'min' || v === 'closed' ? v : 'open';
    } catch {
      return 'open';
    }
  });
  const setChatMode = (m: ChatMode) => {
    setChatModeState(m);
    try {
      localStorage.setItem('grimhold.chat', m);
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };
  const toggle = (id: PanelId) =>
    id === 'chat' ? setChatMode(chatMode === 'closed' ? 'open' : 'closed') : MODAL_PANELS.includes(id) ? setModal((m) => (m === id ? null : id)) : setOpen((prev) => {
      const next = new Set(prev);
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      if (isMobile) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.clear();
          next.add(id);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      savePanels(next);
      return next;
    });

  // Atalhos de teclado (I mochila, J quests...). Não valem digitando no chat ou em campo de texto.
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        setModal(null);
        setPicking(false);
        setGuideOpen(false);
        return;
      }
      if (k === 'h') {
        e.preventDefault();
        setPickerMode(undefined);
        setPickerHunt(undefined);
        setPicking((v) => !v);
        return;
      }
      const id = HOTKEYS[k];
      if (!id) return;
      e.preventDefault();
      toggleRef.current(id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="game">
      <header className={`panel topbar ${topbarCollapsed ? 'topbar-collapsed' : ''}`}>
        <div className="who">
          <strong>{character.name}</strong>
          <span className="small">
            {t(`voc.${promotion?.id ?? vocation?.id}`, promotion?.name ?? vocation?.name ?? '')} · {t('common.level')} {combatLevel}
            {combatLevel >= MASTERY_MIN_LEVEL && ` · ${tr('Maestria', 'Mastery')} ${masteryLevel(state?.mastery ?? { points: 0 })}`}
            {titleName(state?.title) && <span className="chat-title"> · «{titleName(state?.title)}»</span>}
          </span>
          <div className="bar thin" title={xpBarTitle(combatXp, combatLevel, xpRate, lang)}>
            <div className="fill xp" style={{ width: `${levelProgress(combatXp, 'combat') * 100}%` }} />
          </div>
          {state?.stamina !== undefined && <StaminaBar ms={state.stamina} />}
          {/* XP em dobro (voto, tarefas, guilda, poção): quanto tempo ainda resta. */}
          {(state?.xpBoostUntil ?? 0) > Date.now() + clockOffset.current && (
            <span className="small loot-pos" title={tr('XP em dobro somado de todas as fontes (voto, tarefas, guilda, poções)', 'Double XP from all sources (votes, tasks, guild, potions)')}>
              {tr('XP em dobro', 'Double XP')}: {formatDuration((state?.xpBoostUntil ?? 0) - Date.now() - clockOffset.current)}
            </span>
          )}
          {(combatLevel >= MASTERY_MIN_LEVEL || (state?.mastery?.points ?? 0) > 0) && (
            <div
              className="bar thin"
              style={{ cursor: 'pointer', marginTop: 2 }}
              onClick={() => setModal('mastery')}
              title={tr(
                `Maestria ${masteryLevel(state?.mastery ?? { points: 0 })}: ${((state?.mastery?.xp ?? 0) / 1e12).toFixed(0)}T / ${(masteryPointCost(masteryLevel(state?.mastery ?? { points: 0 })) / 1e12).toFixed(0)}T XP · ${state?.mastery?.points ?? 0} ponto(s)`,
                `Mastery ${masteryLevel(state?.mastery ?? { points: 0 })}: ${((state?.mastery?.xp ?? 0) / 1e12).toFixed(0)}T / ${(masteryPointCost(masteryLevel(state?.mastery ?? { points: 0 })) / 1e12).toFixed(0)}T XP · ${state?.mastery?.points ?? 0} point(s)`,
              )}
            >
              <div className="fill xp" style={{ width: `${Math.min(100, ((state?.mastery?.xp ?? 0) / masteryPointCost(masteryLevel(state?.mastery ?? { points: 0 }))) * 100)}%`, background: '#eab308' }} />
            </div>
          )}
        </div>
        {!topbarCollapsed && canPromote && (
          <button className="primary small-btn promote-btn" onClick={() => setPromoting(true)}>
            {t('topbar.promote')}
          </button>
        )}
        {!topbarCollapsed && (
          <span className="gold" title={tr('Ouro', 'Gold')}>
            <img className="icon tiny" src={icon('gold')} alt="" /> {(state?.bank.gold ?? 0).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}
          </span>
        )}
        {!topbarCollapsed && (
          <>
            <button className="primary small-btn" onClick={() => setGuideOpen(true)}>
              {tr('Ajudante', 'Helper')}
            </button>
            <button className="primary small-btn" onClick={() => setRankingOpen(true)}>
              {t('topbar.ranking')}
            </button>
            {(() => {
              const votePending = !!state && Date.now() + clockOffset.current - (state.lastVoteAt ?? 0) >= VOTE_EVERY_MS;
              return (
                <CityMenu
                  label={tr('Social', 'Social')}
                  down
                  alert={!username || votePending}
                  items={[
                    ...(state ? [[`${tr('Votar', 'Vote')}${votePending ? ' ●' : ''}`, () => setNpcOpen('vote_shop')] as [string, () => void]] : []),
                    [tr('Meu perfil', 'My profile'), () => setProfileName(character.name)],
                    [`${tr('Mascotes', 'Pets')} (N)`, () => toggle('pets')],
                    [`${tr('Conquistas', 'Achievements')} (O)`, () => toggle('ach')],
                    [`${tr('Arenas', 'Arenas')} (A)`, () => toggle('arena')],
                    ['Discord', () => window.open(DISCORD_URL, '_blank', 'noopener')],
                    [t('topbar.switch_char'), onSwitchCharacter],
                    username ? [`${t('topbar.logout')} (${username})`, onLogout] : [`⚠ ${t('topbar.protect')}`, () => setProtecting(true)],
                  ]}
                />
              );
            })()}
            <SoundMenu onFeedback={() => setFeedbackOpen(true)} />
          </>
        )}
        {!topbarCollapsed && boss && <BossBar boss={boss} clockOffset={clockOffset} onJoin={() => socket.current?.send({ type: 'boss_join' })} onQueue={() => socket.current?.send({ type: 'boss_queue' })} onUnqueue={() => socket.current?.send({ type: 'boss_unqueue' })} history={state?.bossHistory} onOpen={(r) => setBossResult({ boss: r.boss, killed: r.killed, damage: r.damage, reward: r.reward })} />}
        {!topbarCollapsed && (
          <nav className="hud-toggles" aria-label={tr('Painéis', 'Panels')}>
            {PANELS.filter((p) => !MENU_PANELS.includes(p.id)).map((p) => {
              const label = t(`panel.${p.id === 'hunt' ? 'analyzer' : p.id === 'equip' ? 'equipment' : p.id === 'bank' ? 'inventory' : p.id === 'arena' ? 'arenas' : p.id === 'prof' ? 'professions' : p.id}`, p.label);
              return (
                <button
                  key={p.id}
                  className={`hud-toggle ${open.has(p.id) || modal === p.id || (p.id === 'chat' && chatMode !== 'closed') ? 'on' : ''}`}
                  aria-pressed={open.has(p.id) || modal === p.id}
                  title={HOTKEY_OF[p.id] ? `${label} (${HOTKEY_OF[p.id]})` : label}
                  onClick={() => toggle(p.id)}
                >
                  <img className="icon tiny" src={icon(p.icon)} alt="" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        )}
        {!topbarCollapsed && (
          <button
            className="small-btn online-players-btn"
            title={tr('Ver jogadores online e negociar', 'See online players and trade')}
            onClick={() => setPlayersModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          >
            <span className="small online" style={{ margin: 0 }}>● {online === null ? t('topbar.connecting') : `${online} ${t('topbar.online')}`}</span>
          </button>
        )}
        <button
          className="small-btn topbar-collapse-btn"
          onClick={toggleTopbar}
          title={topbarCollapsed ? t('topbar.expand') : t('topbar.collapse')}
          aria-label={topbarCollapsed ? t('topbar.expand') : t('topbar.collapse')}
        >
          {topbarCollapsed ? t('topbar.expand') : t('topbar.collapse')}
        </button>
      </header>

      <div className={`game-main side-${hud.side}`} style={{ ['--side-w' as string]: `${hud.width}px` }}>
        <section className="stage">
          <WorldView
            activity={activity}
            cycle={state?.cycle ?? null}
            vocation={character.vocation}
            name={character.name}
            look={state?.look ?? character.look}
            equipment={state?.equipment}
            questMarks={
              state
                ? [...activeQuests(state).filter((q) => q.done).map((q) => q.quest.master), ...storyList(state).filter((s) => s.ready).map((s) => s.step!.npc)]
                : []
            }
            boss={boss}
            others={players}
            livePos={livePos.current}
            onCityMove={(to) => socket.current?.send({ type: 'city_move', x: to.x, y: to.y })}
            activePet={state?.activePet}
            runes={state?.runes}
            potion={state?.potion}
            bank={state?.bank}
            combatXp={state?.skills.combat}
            workSpeed={state && activity ? (nodeById(activity.skill, activity.node) ? gatherSpeedOfState(state, activity.skill, activity.node) : productionSpeed(activity.skill, activity.node, state.skills[activity.skill] ?? 0, guildBonus(state.guildPoints) + artisanKitBonus(state))) : 0}
            partyMemberIds={new Set(party?.members.map((m) => m.characterId) ?? [])}
            clockOffset={clockOffset}
            onNpc={(npc) => {
              if (hunting || !state) return;
              if (npc.id === 'reaper') return setReaperOpen(true);
              if (npc.id === 'guide') return setGuideOpen(true);
              if (npc.id === 'talk' || npc.id === 'temple') setTalk(npc);
              else if (npc.id === 'forge') {
                setProf('smithing');
                setModal('prof');
              } else setNpcOpen(npc.id);
            }}
          />
          <div className="stage-bar">
            <Chat
              messages={chat}
              me={character.name}
              vocation={character.vocation}
              combatLevel={combatLevel}
              onSend={(text, channel) => {
                if (channel === 'party') socket.current?.send({ type: 'party_chat', text });
                else socket.current?.send({ type: 'chat', text });
              }}
              mode={chatMode}
              onMode={setChatMode}
              hasParty={!!party}
              onPlayerClick={(name) => setProfileName(name)}
            />
            {state && activity?.skill === 'combat' && !isDummyNode(activity.node) && (
              <ActionBar vocation={character.vocation} combatLevel={combatLevel} state={state} send={(cmd) => socket.current?.send(cmd)} clockOffset={clockOffset.current} />
            )}
            {/* Profissões: só a refeição (o bônus de XP de profissão vale aqui). */}
            {state && activity && activity.skill !== 'combat' && (
              <ActionBar vocation={character.vocation} combatLevel={combatLevel} state={state} send={(cmd) => socket.current?.send(cmd)} clockOffset={clockOffset.current} mealOnly />
            )}
            <span className="stage-status">
              {hunting
                ? `${hunting.hunt.name}${hunting.difficulty.level ? ` · ${hunting.difficulty.name}` : ''}${slayerTaskLine(state?.slayer) ? ` · ${slayerTaskLine(state?.slayer)}` : ''}${huntingTaskLine(state?.huntingTasks, hunting.hunt.monsters)}`
                : activity?.node.startsWith('arena:')
                  ? (() => {
                      const arena = parseArenaNode(activity.node);
                      const waves = arena?.opponents.length ?? 10;
                      return `${arena?.name ?? 'Arena'} · ${tr('Onda', 'Wave')} ${Math.min(activity.seq ?? 0, waves - 1) + 1}/${waves}`;
                    })()
                  : activity?.node === WORLD_BOSS_NODE
                    ? `${tr('Chefe global', 'World boss')}: ${storyText(boss?.name ?? '')}`
                    : inLimbo
                    ? tr('Limiar dos Mortos', 'Threshold of the Dead')
                    : activity
                    ? `${isDummyNode(activity.node) ? 'Treinando' : VERB[activity.skill]}: ${(recipeById(activity.skill, activity.node) ?? nodeById(activity.skill, activity.node) ?? dummyById(activity.node))?.name ?? ''}`
                    : t('city.bastion')}
            </span>
            {inLimbo && (
              <span className="city-npcs">
                <button className="primary small-btn" disabled={!state} onClick={() => setReaperOpen(true)}>
                  {tr('Falar com o Ceifador', 'Talk to the Reaper')}
                </button>
                <button className="small-btn" disabled={!state} onClick={stop}>
                  {tr('Voltar ao Bastião', 'Return to the Bastion')}
                </button>
              </span>
            )}
            {!hunting && !inLimbo && activity?.node !== WORLD_BOSS_NODE && (
              <span className="city-npcs">
                <button className="primary small-btn" disabled={!state} onClick={() => setNpcOpen('depot')}>
                  {t('city.depot')}
                </button>
                <CityMenu
                  label={t('city.shops')}
                  disabled={!state}
                  items={[
                    ...(isHalloweenShopOpen(Date.now()) ? [[tr('Jack (Halloween)', 'Jack (Halloween)'), () => setNpcOpen('halloween_shop'), tr('Troca doces de Halloween por prêmios', 'Trades Halloween candy for prizes'), tr('Evento', 'Event')] as MenuItem] : []),
                    ...(isKidsShopOpen(Date.now()) ? [[tr('Tia Jujuba (Dia das Crianças)', "Aunt Jujuba (Children's Day)"), () => setNpcOpen('kids_shop'), tr('Troca doces por prêmios', 'Trades candy for prizes'), tr('Evento', 'Event')] as MenuItem] : []),
                    [t('npc.merchant'), () => setNpcOpen('merchant'), tr('Compra o loot que você não quer', "Buys the loot you don't want"), tr('Vender e negociar', 'Sell and trade')],
                    [t('npc.market'), () => setNpcOpen('market'), tr('Compre e venda com outros jogadores', 'Buy and sell with other players'), tr('Vender e negociar', 'Sell and trade')],
                    [t('npc.armor'), () => setNpcOpen('armor'), tr('Armaduras, elmos, calças, botas e escudos', 'Armor, helmets, legs, boots and shields'), tr('Equipamento', 'Gear')],
                    [t('npc.weapons'), () => setNpcOpen('weapons'), tr('Espadas, machados, arcos, cajados...', 'Swords, axes, bows, staffs...'), tr('Equipamento', 'Gear')],
                    [t('npc.jewelry'), () => setNpcOpen('jewelry'), tr('Anéis e amuletos', 'Rings and amulets'), tr('Equipamento', 'Gear')],
                    [t('npc.potions'), () => setNpcOpen('potions'), tr('Poções de vida e mana (usadas sozinhas na caçada)', 'Health and mana potions (used automatically)'), tr('Para a caçada', 'For hunting')],
                    [t('npc.runes'), () => setNpcOpen('runes'), tr('Runas: dano extra na caçada', 'Runes: extra damage in hunts'), tr('Para a caçada', 'For hunting')],
                    [t('npc.rashid'), () => setNpcOpen('rashid'), tr('Relíquias raras', 'Rare relics'), tr('Lojas especiais', 'Special shops')],
                    [t('npc.boss_shop'), () => setNpcOpen('boss_shop'), tr('Troca troféus de chefe por itens', 'Trades boss trophies for items'), tr('Lojas especiais', 'Special shops')],
                    [tr('Loja de Votos', 'Vote Shop'), () => setNpcOpen('vote_shop'), tr('Gaste os pontos de votar no jogo', 'Spend your voting points'), tr('Lojas especiais', 'Special shops')],
                  ]}
                />
                <CityMenu
                  label={`${t('city.services')}${state?.blessed ? ' ✦' : ''}`}
                  disabled={!state}
                  items={[
                    [t('svc.refinery'), () => setNpcOpen('refinery'), tr('Refina (+1 a +10), ascende e desmancha itens', 'Refine (+1 to +10), ascend and dismantle items'), tr('Melhorar equipamento', 'Improve gear')],
                    [t('svc.imbuement'), () => setNpcOpen('imbuement'), tr('Encantamentos temporários no equipamento', 'Temporary enchantments on gear'), tr('Melhorar equipamento', 'Improve gear')],
                    [tr('Forja (fundir barras)', 'Forge (smelt bars)'), () => {
                      setProf('smithing');
                      setModal('prof');
                    }, tr('Transforma minério em barra (Ferraria)', 'Turns ore into bars (Smithing)'), tr('Melhorar equipamento', 'Improve gear')],
                    [t('svc.tasks'), () => setNpcOpen('adams'), tr('Tarefas de caça: pontos para a Loja de Tarefas', 'Hunting tasks: points for the Task Shop'), tr('Tarefas', 'Tasks')],
                    [tr('Mestres de Slayer', 'Slayer Masters'), () => setNpcOpen('slayer'), tr('Tarefas que sobem a skill Slayer', 'Tasks that train the Slayer skill'), tr('Tarefas', 'Tasks')],
                    [`${t('svc.temple')}${state?.blessed ? ' ✦' : ''}`, () => setTalk(TEMPLE_NPC), tr('Bênção: protege seus itens e metade da XP se você morrer', 'Blessing: protects your items and half the XP if you die'), tr('Personagem', 'Character')],
                    ...(state?.reaper?.length ? [[`${tr('Ceifador', 'Reaper')} (${state.reaper.length})`, () => setReaperOpen(true), tr('Devolve os itens que a morte levou', 'Returns the items death took'), tr('Personagem', 'Character')] as MenuItem] : []),
                    [t('svc.appearance'), () => setLookOpen(true), tr('Trajes, cores e visual do personagem', 'Outfits, colors and look'), tr('Personagem', 'Character')],
                    [t('svc.inn'), () => setTalk(INNKEEPER_NPC), tr('Quests de história', 'Story quests'), tr('Outros', 'Other')],
                    [t('svc.dummy'), () => setNpcOpen('dummy'), tr('Teste o seu dano', 'Test your damage'), tr('Outros', 'Other')],
                  ]}
                />
              </span>
            )}
            {hunting?.hunt.raid && activity && <RaidStatus since={activity.since} seq={activity.seq} fightMs={state?.cycle?.outcome === 'win' ? state.cycle.fightMs : undefined} clockOffset={clockOffset} />}
            <button className="primary small-btn" disabled={!state} onClick={() => { setPickerMode(undefined); setPickerHunt(undefined); setPicking(true); }}>
              {t('city.hunt_setup')}
            </button>
            {activity && (
              <button className="primary small-btn danger-btn" onClick={stop}>
                {hunting ? t('city.leave_hunt') : t('city.stop')}
              </button>
            )}
          </div>
        </section>

        <aside className={`side ${open.size > 0 ? 'has-open' : ''}`}>
          {open.size > 0 && (
            <div className="hud-tools">
              <button type="button" className="small-btn" title={lang === 'pt' ? 'Trocar o lado' : 'Switch side'} onClick={() => setHud({ side: hud.side === 'right' ? 'left' : 'right' })}>
                {t('hud.side')}
              </button>
              <button type="button" className={`small-btn ${hud.locked ? '' : 'on'}`} title={hud.locked ? (lang === 'pt' ? 'Destravar para mover e redimensionar' : 'Unlock to move and resize') : (lang === 'pt' ? 'Travar o HUD' : 'Lock HUD')} onClick={() => setHud({ locked: !hud.locked })}>
                <Pix name={hud.locked ? 'ui_lock' : 'ui_unlock'} /> {hud.locked ? t('hud.locked') : t('hud.editing')}
              </button>
            </div>
          )}
          {open.size > 0 && (
            <div className="side-mobile-bar">
              <span className="side-mobile-title">
                {PANELS.find((p) => open.has(p.id))?.label ?? 'Painel'}
                {open.size > 1 ? ` (+${open.size - 1})` : ''}
              </span>
              <button
                type="button"
                className="small-btn mobile-close-btn"
                title={lang === 'pt' ? 'Fechar e ver mapa' : 'Close and view map'}
                onClick={() => {
                  setOpen(new Set());
                  savePanels(new Set());
                }}
              >
                {t('hud.view_map')}
              </button>
            </div>
          )}
          {open.has('hunt') && state && slot('hunt', <HuntAnalyzer key={character.id} characterId={character.id} activity={activity} state={state} clockOffset={clockOffset} offlineGain={offlineGain} />)}
          {open.has('equip') && state && slot('equip', 
            <EquipmentPanel
              vocation={character.vocation}
              combatXp={combatXp}
              equipment={state.equipment}
              look={state.look ?? character.look}
              promotion={state.promotion}
              food={state.food}
              activeMeal={state.activeMeal ?? null}
              bank={state.bank}
              clockOffset={clockOffset}
              onFood={(food) => socket.current?.send({ type: 'set_food', food })}
              onEatMeal={(item) => socket.current?.send({ type: 'eat_meal', item })}
              potion={state.potion ?? null}
              onPotion={(potion) => socket.current?.send({ type: 'set_potion', potion })}
              manaPotion={state.manaPotion ?? null}
              onManaPotion={(manaPotion) => socket.current?.send({ type: 'set_mana_potion', manaPotion })}
              arrow={state.arrow ?? null}
              onArrow={(arrow) => socket.current?.send({ type: 'set_arrow', arrow })}
              runes={state.runes ?? [null, null]}
              onRune={(slot, rune) => socket.current?.send({ type: 'set_rune', slot, rune })}
              onUnequip={unequip}
              onEquip={equip}
              onLook={() => setLookOpen(true)}
              imbuements={state.imbuements}
              sigils={state.sigils}
              mastery={state.mastery}
              combatPet={state.combatPet}
            />
          )}
          {open.has('spells') && state && slot('spells', 
            <SpellsPanel
              vocation={character.vocation}
              combatLevel={combatLevel}
              equipped={state.spells}
              onChange={(spells) => socket.current?.send({ type: 'set_spells', spells })}
            />
          )}
          {open.has('party') && slot('party',
            <section className="panel">
              <h3>{t('panel.party')} {party ? `(${party.members.length}/4)` : ''}</h3>
              <PartyPanel
                party={party}
                myCharacterId={character.id}
                onInvite={(name) => socket.current?.send({ type: 'party_invite', name })}
                onCancelInvite={(targetId) => socket.current?.send({ type: 'party_cancel_invite', targetId })}
                onKick={(memberId) => socket.current?.send({ type: 'party_kick', memberId })}
                onLeave={() => socket.current?.send({ type: 'party_leave' })}
                onJoin={(node) => start('combat', node)}
              />
            </section>
          )}
          {open.has('daily') && state && slot('daily', 
            <DailyPanel state={state} onClaim={(idx) => socket.current?.send({ type: 'daily_claim', idx })} onChest={() => socket.current?.send({ type: 'daily_chest' })} onSetGatherPreferences={(skills) => socket.current?.send({ type: 'set_daily_gather_preferences', skills })} />
          )}
          {open.has('skills') && slot('skills', 
            <section className="panel">
              <h3>{t('panel.skills')}</h3>
              {SKILLS.map((s) => (
                <SkillBar key={s.id} name={t('skill.' + s.id, s.name)} icon={icon(s.icon)} xp={state?.skills[s.id] ?? 0} skill={s.id} />
              ))}
            </section>
          )}
        </aside>
        {open.size > 0 && !hud.locked && <div className="side-resize" title="Arraste para redimensionar" onPointerDown={startResize} />}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <section className="panel picker big-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={PANELS.find((p) => p.id === modal)?.label}>
            <header className="picker-head">
              <h3>{PANELS.find((p) => p.id === modal)?.label}</h3>
              <button className="close" onClick={() => setModal(null)} aria-label={tr('Fechar', 'Close')}>
                ×
              </button>
            </header>
            {modal === 'ach' && state && <AchievementsPanel state={state} onTitle={(achievement) => socket.current?.send({ type: 'set_title', achievement })} />}
            {modal === 'mastery' && state && (
              <MasteryPanel
                state={state}
                vocation={character.vocation}
                onUnlock={(node, count) => socket.current?.send({ type: 'mastery_unlock', node, count: count ?? 1 })}
                onReset={() => socket.current?.send({ type: 'mastery_reset' })}
              />
            )}
            {modal === 'pets' && state && (
              <PetsPanel
                unlockedPets={state.unlockedPets}
                activePet={state.activePet}
                onSetPet={(petId) => socket.current?.send({ type: 'set_pet', pet: petId })}
                combatPet={state.combatPet}
                onSetCombatPet={(petId) => socket.current?.send({ type: 'equip_combat_pet', pet: petId })}
              />
            )}
            {modal === 'bank' && (
              <AccountBank myName={character.name} alts={altBanks} onLoad={loadAltBanks} onTake={takeFromAlt} equipment={state?.equipment ?? {}} level={combatLevel} vocation={character.vocation}><Bank bank={state?.bank ?? {}} combatLevel={combatLevel} vocation={character.vocation} onEquip={equip} onOpen={openPouch} equipment={state?.equipment} lockedItems={state?.lockedItems} onLock={lockItem} /></AccountBank>
            )}
            {modal === 'arena' && state && (
              <ArenaPanel
              state={state}
              clockOffset={clockOffset}
              onStart={(id) => socket.current?.send({ type: 'arena_start', arenaId: id })}
              onClaimReward={(arenaId, weaponId) => socket.current?.send({ type: 'arena_claim_reward', arenaId, weaponId })}
              onStop={stop}
            />
            )}
            {modal === 'bestiary' && state && (
              <BestiaryPanel
                state={state}
                onUnlock={(charm) => socket.current?.send({ type: 'charm_unlock', charm })}
                onUpgrade={(charm) => socket.current?.send({ type: 'charm_upgrade', charm })}
                onAssign={(charm, monster) => socket.current?.send({ type: 'charm_assign', charm, monster })}
                onPreyReroll={(slot) => socket.current?.send({ type: 'prey_reroll', slot })}
                onPreyChoose={(slot, monster) => socket.current?.send({ type: 'prey_choose', slot, monster })}
              />
            )}
            {modal === 'prof' && (
              <section className="professions">
            <nav className="panel prof-tabs" role="tablist" aria-label={t('panel.professions')}>
              {PROFESSIONS.map((id) => {
                const skill = SKILLS.find((x) => x.id === id)!;
                const running = activity?.skill === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={prof === id}
                    className={`prof-tab ${prof === id ? 'on' : ''} ${running ? 'running' : ''}`}
                    onClick={() => setProf(id)}
                  >
                    <img className="icon" src={icon(skill.icon)} alt="" />
                    <span>
                      {t('skill.' + id, skill.name)}
                      {getBoostedSkill() === id && <span title={tr('Skill do Dia: +50% XP', 'Skill of the Day: +50% XP')}> <Pix name="ui_star" /></span>}
                      <small>Nv {levelForXp(state?.skills[id] ?? 0, id)}</small>
                    </span>
                  </button>
                );
              })}
              {/* Slayer: skill de caça com mestres; abre o painel dos mestres (pedir e ver a tarefa). */}
              <button
                role="tab"
                aria-selected={false}
                className="prof-tab"
                onClick={() => {
                  setModal(null);
                  setNpcOpen('slayer');
                }}
              >
                <img className="icon" src={icon(SKILLS.find((x) => x.id === 'slayer')?.icon ?? '')} alt="" />
                <span>
                  Slayer
                  <small>Nv {levelForXp(state?.skills.slayer ?? 0, 'slayer')}</small>
                </span>
              </button>
            </nav>
            {state && <ActivityQueue state={state} now={Date.now() + clockOffset.current} send={(cmd) => socket.current?.send(cmd)} />}
            {state && <GuildOrders skill={prof} state={state} send={(cmd) => socket.current?.send(cmd)} />}
            {prof === 'mining' || prof === 'fishing' || prof === 'woodcutting' || prof === 'herbalism' || prof === 'soulreaping' ? (
              <GatherPanel
                key={prof}
                skill={prof}
                state={state}
                clockOffset={clockOffset}
                onStart={(n) => start(prof, n)}
                onQueue={(n) => state && queueAdd(state, prof, n, (cmd) => socket.current?.send(cmd))}
                onStop={stop}
                sortMode={profSort}
                onSortChange={updateProfSort}
                onlyDoable={profOnlyDoable}
                onOnlyDoableChange={updateProfOnlyDoable}
              />
            ) : (
              <ProducePanel
                key={prof}
                skill={prof as ProductionSkillId}
                state={state}
                clockOffset={clockOffset}
                onStart={(n) => start(prof, n)}
                onQueue={(r) => state && queueAdd(state, prof, r, (cmd) => socket.current?.send(cmd))}
                onSigil={(slot, item) => socket.current?.send({ type: 'set_sigil', slot, item })}
                onStop={stop}
                sortMode={profSort}
                onSortChange={updateProfSort}
                onlyDoable={profOnlyDoable}
                onOnlyDoableChange={updateProfOnlyDoable}
              />
            )}
          </section>
            )}
            {modal === 'quests' && state && (
              <QuestPanel
                state={state}
                vocation={character.vocation}
                onClaim={(quest) => socket.current?.send({ type: 'quest_claim', quest })}
                onStartTrial={(arenaId) => socket.current?.send({ type: 'arena_start', arenaId })}
                onGoHunt={(huntId) => {
                  setModal(null);
                  setPickerMode(undefined);
                  setPickerHunt(huntId);
                  setPicking(true);
                }}
                onOpenQuestInstance={() => {
                  setModal(null);
                  setPickerMode('quests');
                  setPicking(true);
                }}
              />
            )}
          </section>
        </div>
      )}
      {picking && (
        <HuntPicker
          huntXp={state?.huntXp}
          gearPower={gearPower(state?.equipment ?? {})}
          huntLevel={huntLevelFor(combatLevel, masteryLevel(state?.mastery ?? { points: 0 }))}
          combatLevel={combatLevel}
          bank={state?.bank ?? {}}
          doneStories={(state?.stories ?? []).filter((s) => s.status === 'done').map((s) => s.id)}
          stories={state?.stories}
          initialMode={pickerMode}
          initialHunt={pickerHunt}
          current={hunting ? activity!.node : null}
          instanceClears={state?.instanceClears}
          instanceFree={state?.instanceFree}
          today={state?.today}
          inParty={(party?.members.length ?? 0) > 1}
          lairCooldowns={state?.lairCooldowns}
          kills={state?.bestiary}
          serverNow={Date.now() + clockOffset.current}
          blessed={state ? state.blessed : undefined}
          blessPrice={blessPrice(combatLevel)}
          onBless={() => socket.current?.send({ type: 'buy_bless' })}
          party={party}
          inventory={state ? [{ id: 'raid_fragment', count: state.bank.raid_fragment ?? 0 }] : undefined}
          raidClears={state?.raidClears}
          raidPity={state?.raidPity}
          raidClearsByRaid={state?.raidClearsByRaid}
          raidPityByRaid={state?.raidPityByRaid}
          raidChestPurchases={state?.raidChestPurchases}
          raidBoughtPieces={state?.raidBoughtPieces}
          raidRanking={state?.raidRanking}
          raidRankings={state?.raidRankings}
          onBuyRaidShop={(item) => socket.current?.send({ type: 'buy_raid_shop', item })}
          onPick={(node) => {
            // Clicar no card começava na hora e parava a profissão: agora pergunta antes de trocar.
            if (activity && activity.node !== node) {
              const now = activity.skill === 'combat'
                ? (parseHuntNode(activity.node)?.hunt.name ?? tr('a caçada atual', 'the current hunt'))
                : skillName(activity.skill as SkillId);
              const next = parseHuntNode(node)?.hunt.name ?? node;
              // Janela do próprio jogo (o confirm do navegador pode estar bloqueado e o clique sumia).
              setConfirmHunt({ node, text: tr(`Começar ${storyText(next)}? ${storyText(now)} vai parar.`, `Start ${storyText(next)}? ${storyText(now)} will stop.`) });
              return;
            }
            start('combat', node);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {confirmHunt && (
        <div className="overlay" onClick={() => setConfirmHunt(null)}>
          <section className="panel modal" onClick={(e) => e.stopPropagation()}>
            <h3>{tr('Trocar de atividade?', 'Switch activity?')}</h3>
            <p>{confirmHunt.text}</p>
            <div className="row" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmHunt(null)}>{tr('Cancelar', 'Cancel')}</button>
              <button
                className="primary"
                onClick={() => {
                  start('combat', confirmHunt.node);
                  setConfirmHunt(null);
                  setPicking(false);
                }}
              >
                {tr('Começar', 'Start')}
              </button>
            </div>
          </section>
        </div>
      )}
      {promoting && (
        <PromotionPicker
          vocation={character.vocation}
          currentPromotion={state?.promotion}
          combatLevel={combatLevel}
          stories={state?.stories}
          onPick={(id) => {
            socket.current?.send({ type: 'promote', promotion: id });
            setPromoting(false);
          }}
          onStory={(story, choice) => {
            socket.current?.send({ type: 'story_choose', story, choice });
          }}
          onStartTrial={(arenaId) => {
            socket.current?.send({ type: 'arena_start', arenaId });
            setPromoting(false);
          }}
          onClose={() => setPromoting(false)}
        />
      )}
      {npcOpen === 'halloween_shop' && state && !hunting && (
        <HalloweenShop
          candies={state.bank[HALLOWEEN_CANDY] ?? 0}
          unlockedPets={state.unlockedPets ?? []}
          unlockedOutfits={state.unlockedOutfits ?? []}
          xpBoostUntil={state.xpBoostUntil ?? 0}
          potionUsed={!!state.halloweenPotionUsed}
          trickOrTreatedToday={!!state.halloweenTrickOrTreatedToday}
          trickResult={trickResult}
          send={(msg) => socket.current?.send(msg)}
          onClose={() => {
            setNpcOpen(null);
            setTrickResult(null);
          }}
        />
      )}
      {npcOpen === 'kids_shop' && state && !hunting && (
        <KidsShop
          candies={state.bank[KIDS_CANDY] ?? 0}
          unlockedPets={state.unlockedPets ?? []}
          unlockedOutfits={state.unlockedOutfits ?? []}
          xpBoostUntil={state.xpBoostUntil ?? 0}
          potionUsed={!!state.kidsPotionUsed}
          send={(msg) => socket.current?.send(msg)}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'vote_shop' && state && (
        <VoteShop
          coins={state.bank[VOTE_COIN] ?? 0}
          name={character.name}
          xpBoostUntil={state.xpBoostUntil ?? 0}
          unlockedPets={state.unlockedPets ?? []}
          unlockedOutfits={state.unlockedOutfits ?? []}
          send={(msg) => socket.current?.send(msg)}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {(npcOpen === 'market' || npcOpen === 'merchant') && state && !hunting && (
        <Market
          equipment={state.equipment}
          lockedItems={state.lockedItems}
          buyback={state.buyback}
          key={npcOpen}
          initialTab={npcOpen === 'merchant' ? 'npc' : 'buy'}
          listings={listings}
          offers={buyOffers}
          bank={state.bank}
          characterId={character.id}
          vocation={character.vocation}
          combatLevel={combatLevel}
          send={(msg) => socket.current?.send(msg)}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {(npcOpen === 'armor' || npcOpen === 'weapons' || npcOpen === 'jewelry' || npcOpen === 'runes' || npcOpen === 'potions') && state && !hunting && (
        <ShopModal
          shop={npcOpen}
          gold={state.bank.gold ?? 0}
          bank={state.bank}
          vocation={character.vocation}
          combatLevel={combatLevel}
          onBuy={(item, qty) => socket.current?.send({ type: 'buy_npc', item, qty })}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'imbuement' && state && !hunting && (
        <ImbuementModal
          bank={state.bank}
          active={state.imbuements ?? {}}
          onImbue={(imbuementId) => socket.current?.send({ type: 'imbue', imbuementId })}
          combatLevel={combatLevel}
          doneStories={(state.stories ?? []).filter((s) => s.status === 'done').map((s) => s.id)}
          onGoHunt={(huntId) => {
            setNpcOpen(null);
            setPickerMode(undefined);
            setPickerHunt(huntId);
            setPicking(true);
          }}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'slayer' && state && (
        <SlayerPanel state={state} combatLevel={combatLevel} send={(cmd) => socket.current?.send(cmd)} onClose={() => setNpcOpen(null)} />
      )}
      {npcOpen === 'adams' && state && !hunting && (
        <HuntingTasksModal
          combatLevel={taskHuntLevel(combatLevel, masteryLevel(state?.mastery ?? { points: 0 }))}
          tasks={state.huntingTasks ?? []}
          points={state.huntingPoints ?? 0}
          spent={state.huntingPointsSpent ?? 0}
          xpBoostsToday={state.taskXpBoostsToday ?? 0}
          featured={state.featuredTasks ?? []}
          onBuy={(item, material) => socket.current?.send({ type: 'buy_task_shop', item, material })}
          onStart={(taskId) => socket.current?.send({ type: 'task_start', taskId })}
          onClaim={(taskId) => socket.current?.send({ type: 'task_claim', taskId })}
          onCancel={(taskId) => socket.current?.send({ type: 'task_cancel', taskId })}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'rashid' && state && !hunting && (
        <RashidModal
          bank={state.bank}
          onSell={(item, qty) => socket.current?.send({ type: 'sell_rashid', item, qty })}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'boss_shop' && state && !hunting && (
        <BossShopModal
          bank={state.bank}
          equipment={state.equipment ?? {}}
          vocation={character.vocation}
          onBuy={(item) => socket.current?.send({ type: 'buy_boss_token', item })}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'refinery' && state && !hunting && (
        <RefineryModal
          bank={state.bank}
          equipment={state.equipment}
          vocation={character.vocation}
          combatLevel={combatLevel}
          onRefine={(item, protect) => socket.current?.send({ type: 'refine_item', item, protect })}
          onDismantle={(item, qty) => socket.current?.send({ type: 'dismantle_item', item, qty })}
          pity={state.forgePity}
          rpity={state.refinePity}
          onAscend={(item, use, protect) => socket.current?.send({ type: 'ascend_item', item, use, protect })}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'dummy' && state && !hunting && (
        <DummyModal
          state={state}
          onStart={(dummyId) => {
            start('combat', dummyId);
            setNpcOpen(null);
          }}
          onStop={stop}
          onClose={() => setNpcOpen(null)}
        />
      )}
      {npcOpen === 'depot' && state && !hunting && (
        <div className="overlay" onClick={() => setNpcOpen(null)}>
          <section className="panel picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('Depósito', 'Depot')}>
            <header className="picker-head">
              <h3>{tr('Depósito', 'Depot')}</h3>
              <span className="gold">
                {tr('Vale', 'Worth')} {Object.entries(state.bank).reduce((sum, [id, qty]) => sum + itemValue(id) * qty, 0).toLocaleString('pt-BR')} {tr('no Mercador', 'at the Merchant')}
              </span>
              <button className="close" onClick={() => setNpcOpen(null)} aria-label={tr('Fechar', 'Close')}>
                ×
              </button>
            </header>
            <p className="small">{tr('Tudo que você coleta, caça e produz fica guardado aqui. Clique num equipamento para usar.', 'Everything you gather, hunt and craft is stored here. Click a piece of equipment to use it.')}</p>
            <AccountBank myName={character.name} alts={altBanks} onLoad={loadAltBanks} onTake={takeFromAlt} equipment={state?.equipment ?? {}} level={combatLevel} vocation={character.vocation}><Bank bank={state.bank} combatLevel={combatLevel} vocation={character.vocation} onEquip={equip} onOpen={openPouch} equipment={state.equipment} lockedItems={state.lockedItems} onLock={lockItem} /></AccountBank>
          </section>
        </div>
      )}
      {protecting && (
        <ProtectAccount
          token={token}
          onDone={(name) => {
            setUsername(name);
            setProtecting(false);
          }}
          onClose={() => setProtecting(false)}
        />
      )}
      {rankingOpen && <Ranking me={character.name} onClose={() => setRankingOpen(false)} onPlayer={setProfileName} />}
      {profileName && (
        <ProfileModal
          name={profileName}
          me={character.name}
          token={token}
          onClose={() => setProfileName(null)}
          onTrade={(() => {
            const target = players.find((p) => p.name.toLowerCase() === profileName.toLowerCase());
            return target
              ? () => {
                  socket.current?.send({ type: 'trade_request', targetCharacterId: target.id });
                  setProfileName(null);
                }
              : undefined;
          })()}
        />
      )}
      {feedbackOpen && <Feedback token={token} onClose={() => setFeedbackOpen(false)} />}
      {talk && (
        <TalkModal
          npc={talk}
          state={state}
          combatLevel={levelForXp(combatXp, 'combat')}
          onBless={() => socket.current?.send({ type: 'buy_bless' })}
          onClaim={(quest) => socket.current?.send({ type: 'quest_claim', quest })}
          onStory={(story, choice) => socket.current?.send({ type: 'story_choose', story, choice })}
          onClose={() => setTalk(null)}
        />
      )}
      {lookOpen && state && (
        <AppearanceModal
          vocation={character.vocation}
          look={state.look}
          equipment={state.equipment}
          unlockedAddons={state.unlockedAddons}
          unlockedOutfits={state.unlockedOutfits}
          onSave={(look) => {
            socket.current?.send({ type: 'set_look', look });
            setLookOpen(false);
          }}
          onClose={() => setLookOpen(false)}
        />
      )}
      {error && (
        <div className="toast" role="alert">
          {error}
          <button className="toast-x" onClick={() => setError(null)} aria-label={tr('Fechar aviso', 'Close notice')}>
            ×
          </button>
        </div>
      )}
      {announce && <div className="toast boss-toast">{serverText(announce)}</div>}
      {state && <FirstStepsCard state={state} onClaim={(id) => socket.current?.send({ type: 'first_step_claim', id })} />}
      {state?.activityStop && state.activityStop.at > stopSeen && Date.now() - state.activityStop.at < 24 * 3_600_000 && !activity && (
        <div className="toast" role="status">
          {state.activityStop.text}{' '}
          <span className="small">({new Date(state.activityStop.at).toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })})</span>
          <button
            className="toast-x"
            onClick={() => markStopSeen(state.activityStop!.at)}
            aria-label={tr('Fechar aviso', 'Close notice')}
          >
            ×
          </button>
        </div>
      )}
      {state && (state.lastVoteAt ?? 0) !== voteSeen && Date.now() + clockOffset.current - (state.lastVoteAt ?? 0) >= VOTE_EVERY_MS && (
        <div className="toast toast-ok" role="status">
          {tr('Você já pode votar no jogo e ganhar Moedas de Voto.', 'You can vote for the game again and earn Vote Coins.')}{' '}
          <button
            className="primary small-btn"
            onClick={() => {
              markVoteSeen(state.lastVoteAt ?? 0);
              setNpcOpen('vote_shop');
            }}
          >
            {tr('Votar', 'Vote')}
          </button>
          <button className="toast-x" onClick={() => markVoteSeen(state.lastVoteAt ?? 0)} aria-label={tr('Fechar aviso', 'Close notice')}>
            ×
          </button>
        </div>
      )}
      {raidWarning && <div className="raid-warning" role="status">{serverText(raidWarning)}</div>}
      {celebration && (
        <div className="celebration" role="status">
          <div className="celebration-title">🎉 {tr('Feito histórico!', 'Historic feat!')} 🎉</div>
          <div>{serverText(celebration)}</div>
        </div>
      )}
      {levelUps.length > 0 && (
        <div className="level-up" role="status" key={levelUps.join('|')}>
          {levelUps.map((m) => (
            <div key={m}>{m}</div>
          ))}
        </div>
      )}
      {bossResult && (
        <div className="overlay" onClick={() => setBossResult(null)}>
          <section className="panel modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              // Chefe de evento tem o próprio texto de vitória e de fuga.
              const end = SPECIAL_BOSSES.find((b) => b.name === bossResult.boss)?.ending;
              if (!end) return <h3>{bossResult.killed ? tr(`${bossResult.boss} caiu!`, `${storyText(bossResult.boss)} has fallen!`) : tr(`${bossResult.boss} fugiu`, `${storyText(bossResult.boss)} escaped`)}</h3>;
              return (
                <>
                  <h3>{storyText(bossResult.killed ? end.killedTitle : end.fledTitle)}</h3>
                  <p className="small" style={{ fontStyle: 'italic' }}>{storyText(bossResult.killed ? end.killed : end.fled)}</p>
                </>
              );
            })()}
            <p>{tr(`Você causou ${bossResult.damage.toLocaleString('pt-BR')} de dano.`, `You dealt ${bossResult.damage.toLocaleString('en-US')} damage.`)}</p>
            {!bossResult.killed && (
              <p className="small muted">
                {tr('Chefe que foge não dá Fichas do Chefe nem lendário, só um quarto da XP e do ouro.', 'A boss that escapes gives no Boss Tokens or legendary, only a quarter of the XP and gold.')}
              </p>
            )}
            <ul className="gains">
              <li>+{bossResult.reward.xp.toLocaleString('pt-BR')} {tr('XP de combate', 'combat XP')}</li>
              <li>+{bossResult.reward.gold.toLocaleString('pt-BR')} {tr('de ouro', 'gold')}</li>
              {Object.entries(bossResult.reward.loot ?? {}).map(([id, qty]) => (
                <li key={id}>
                  <img className="icon tiny" src={icon(itemById(id)?.icon ?? id)} alt="" /> +{qty} {itemName(itemById(id)?.name ?? id)}
                </li>
              ))}
              {bossResult.reward.outfit && (
                <li className="legendary">
                  {tr('Novo traje', 'New outfit')}: {storyText(OUTFIT_DEFS.find((o) => o.id === bossResult.reward.outfit)?.name ?? bossResult.reward.outfit)}!{' '}
                  <span className="small">{tr('(escolha em Aparência)', '(pick it in Appearance)')}</span>
                </li>
              )}
              {bossResult.reward.pet && (
                <li className="legendary">
                  {tr('Novo mascote', 'New pet')}: {t('pet.' + bossResult.reward.pet + '.name', petById(bossResult.reward.pet)?.name ?? bossResult.reward.pet)}!{' '}
                  <span className="small">{tr('(o bônus vale sempre; veja em Mascotes)', '(its bonus is always on; see Pets)')}</span>
                </li>
              )}
              {(bossResult.reward.tokens ?? 0) > 0 && (
                <li>
                  <img className="icon tiny" src={icon('boss_token')} alt="" /> +{bossResult.reward.tokens} {tr('Fichas do Chefe', 'Boss Tokens')}
                </li>
              )}
              {(bossResult.reward.legendaries ?? (bossResult.reward.legendary ? [bossResult.reward.legendary] : [])).map((id) => (
                <li key={id} className="legendary">
                  <img className="icon" src={icon(itemById(id)?.icon ?? '')} alt="" /> {tr('Item lendário', 'Legendary item')}: {itemName(itemById(id)?.name ?? id)}!
                </li>
              ))}
            </ul>
            <button className="primary" onClick={() => setBossResult(null)}>
              {tr('Voltar ao Bastião', 'Back to the Bastion')}
            </button>
          </section>
        </div>
      )}
      {pouchResult && (
        <div className="overlay" onClick={() => setPouchResult(null)}>
          <section className="panel modal" onClick={(e) => e.stopPropagation()}>
            <h3>{itemName(itemById(pouchResult.pouch)?.name ?? '')}</h3>
            <p>{tr('Você abriu a bolsa e encontrou:', 'You opened the pouch and found:')}</p>
            <ul className="gains">
              <li className="legendary">
                <img className="icon" src={icon(itemById(pouchResult.item)?.icon ?? '')} alt="" /> {pouchResult.qty ? `${pouchResult.qty}x ` : ''}{itemName(itemById(pouchResult.item)?.name ?? '')}
              </li>
              {itemById(pouchResult.item)?.equip && <li>{bonusText(itemById(pouchResult.item)!.equip!)}</li>}
            </ul>
            <button className="primary" onClick={() => setPouchResult(null)}>
              {tr('Fechar', 'Close')}
            </button>
          </section>
        </div>
      )}
      {offline && <OfflineSummary {...offline} onClose={() => setOffline(null)} />}
      {cleared && !offline && (
        <div className="overlay" onClick={() => setCleared(null)}>
          <section className="panel modal" onClick={(e) => e.stopPropagation()}>
            {huntById(cleared.hunt)?.lair ? (
              <>
                <h3>{tr('Chefe derrotado!', 'Boss defeated!')}</h3>
                <p>
                  {tr('Você derrotou', 'You defeated')} <strong>{storyText(monsterById(huntById(cleared.hunt)!.monsters[0])?.name ?? '')}</strong>{' '}
                  {tr('e voltou ao Bastião com o espólio. Dá para desafiar de novo em 24 horas.', 'and returned to the Bastion with the spoils. You can challenge them again in 24 hours.')}
                </p>
              </>
            ) : (
              <>
                <h3>{tr('Instância concluída!', 'Instance cleared!')}</h3>
                <p>
                  {tr('Você venceu a', 'You conquered')} <strong>{huntById(cleared.hunt)?.name}</strong>{' '}
                  {tr('e voltou ao Bastião com o espólio.', 'and returned to the Bastion with the spoils.')}
                </p>
              </>
            )}
            <ClearedLoot loot={cleared.loot} xp={cleared.xp} />
            <button className="primary" onClick={() => setCleared(null)}>
              {tr('Voltar', 'Back')}
            </button>
          </section>
        </div>
      )}
      {death && !offline && (
        <div className="overlay" onClick={() => setDeath(null)}>
          <section className="panel modal" onClick={(e) => e.stopPropagation()}>
            <h3>{tr('Você caiu em combate', 'You fell in combat')}</h3>
            <MonsterSprite sprite={monsterById(death.monster)?.sprite ?? ''} height={64} />
            <p>
              {tr('Derrotado por', 'Defeated by')} <strong>{monsterById(death.monster)?.name}</strong>.
            </p>
            <p className="muted">
              {death.reaper
                ? tr(`Perdeu ${death.xpLost} XP de combate e acordou no Limiar dos Mortos.`, `Lost ${death.xpLost} combat XP and woke up at the Threshold of the Dead.`)
                : tr(`Perdeu ${death.xpLost} XP de combate e foi levado de volta ao Bastião.`, `Lost ${death.xpLost} combat XP and was carried back to the Bastion.`)}
            </p>
            <DeathLoss itemsLost={death.itemsLost} blessed={death.blessed} reaper={death.reaper} />
            {death.reaper ? (
              <button
                className="primary"
                onClick={() => {
                  setDeath(null);
                  setReaperOpen(true);
                }}
              >
                {tr('Falar com o Ceifador', 'Talk to the Reaper')}
              </button>
            ) : (
              <button className="primary" onClick={() => setDeath(null)}>
                {tr('Levantar', 'Get up')}
              </button>
            )}
          </section>
        </div>
      )}
      {guideOpen && (
        <div className="overlay" onClick={() => setGuideOpen(false)}>
          <section className="panel picker guide-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('Ajudante', 'Helper')}>
            <header className="picker-head">
              <h3>{tr('Ajudante', 'Helper')}</h3>
              <button className="close" onClick={() => setGuideOpen(false)} aria-label={tr('Fechar', 'Close')}>
                ×
              </button>
            </header>
            {/* Ajudante (24/10): "Como jogar" para o iniciante e o guia de equipamentos da classe. */}
            <div className="char-tabs">
              <button type="button" className={`small-btn ${guideTab === 'how' ? 'on' : ''}`} onClick={() => setGuideTab('how')}>{tr('Como jogar', 'How to play')}</button>
              <button type="button" className={`small-btn ${guideTab === 'gear' ? 'on' : ''}`} onClick={() => setGuideTab('gear')}>{tr('Equipamentos da classe', 'Class gear')}</button>
            </div>
            {guideTab === 'how' ? <HowToPlay /> : <ClassGuide vocation={character.vocation} level={combatLevel} equipment={state?.equipment ?? {}} />}
          </section>
        </div>
      )}
      {reaperOpen && state && !death && (
        <ReaperPanel
          state={state}
          combatLevel={combatLevel}
          inLimbo={inLimbo}
          now={Date.now() + clockOffset.current}
          onRedeem={(pack) => socket.current?.send({ type: 'reaper_redeem', pack })}
          onBless={() => socket.current?.send({ type: 'buy_bless' })}
          onLeave={() => {
            stop();
            setReaperOpen(false);
          }}
          onClose={() => setReaperOpen(false)}
        />
      )}
      {partyInvite && (
        <PartyInviteModal
          invite={partyInvite}
          onAccept={() => {
            socket.current?.send({ type: 'party_accept', partyId: partyInvite.partyId });
            setPartyInvite(null);
          }}
          onDecline={() => {
            socket.current?.send({ type: 'party_decline', partyId: partyInvite.partyId });
            setPartyInvite(null);
          }}
        />
      )}

      {/* Notificação flutuante de convite de troca */}
      {tradeInvite && (
        <TradeInviteModal
          invite={tradeInvite}
          onAccept={() => socket.current?.send({ type: 'trade_respond', fromCharacterId: tradeInvite.fromCharacterId, accept: true })}
          onDecline={() => socket.current?.send({ type: 'trade_respond', fromCharacterId: tradeInvite.fromCharacterId, accept: false })}
        />
      )}

      {/* Janela central de troca de itens e ouro entre jogadores */}
      {tradeSession && state && (
        <TradeModal
          trade={tradeSession}
          bank={state.bank}
          onSetGold={(gold) => socket.current?.send({ type: 'trade_set_gold', gold })}
          onAddItem={(item, qty) => socket.current?.send({ type: 'trade_add_item', item, qty })}
          onRemoveItem={(item, qty) => socket.current?.send({ type: 'trade_remove_item', item, qty })}
          onAccept={() => socket.current?.send({ type: 'trade_accept' })}
          onCancel={() => socket.current?.send({ type: 'trade_cancel' })}
        />
      )}

      {/* Toast de sucesso de troca */}
      {tradeNotice && (
        <div className="toast" style={{ borderColor: '#4caf50', background: 'rgba(20, 50, 20, 0.95)' }} role="status">
          ✓ {tradeNotice}
        </div>
      )}

      {/* Modal de Jogadores Online com opção de Negociar / Convidar */}
      {playersModalOpen && (
        <div className="overlay" onClick={() => setPlayersModalOpen(false)}>
          <section className="panel picker" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('Jogadores Online', 'Online Players')}>
            <header className="picker-head">
              <h3>{tr('Jogadores Online', 'Online Players')} ({players.length + 1})</h3>
              <button className="close" onClick={() => setPlayersModalOpen(false)} aria-label={tr('Fechar', 'Close')}>
                ×
              </button>
            </header>
            <p className="small">
              {tr('Clique em', 'Click')} <strong>{tr('Negociar', 'Trade')}</strong>{' '}
              {tr('para iniciar uma troca direta de itens ou ouro.', 'to start a direct trade of items or gold.')}
            </p>
            <div className="online-players-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
              {players.length === 0 ? (
                <div className="small muted" style={{ padding: 12, textAlign: 'center' }}>{tr('Nenhum outro jogador online no momento.', 'No other players online right now.')}</div>
              ) : (
                players.map((p) => {
                  const voc = VOCATIONS.find((v) => v.id === p.vocation);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 6,
                        border: '1px solid #5a4632',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Sprite
                          vocation={p.vocation}
                          look={p.look}
                          equipment={p.equipment}
                          frame={0}
                          scale={1.5}
                        />
                        <div>
                          <strong style={{ cursor: 'pointer', textDecoration: 'underline' }} title={tr('Ver perfil', 'View profile')} onClick={() => setProfileName(p.name)}>{p.name}</strong>
                          <div className="small" style={{ color: '#bbb' }}>
                            {t(`voc.${p.vocation}`, voc?.name ?? p.vocation)} · {tr('Nv', 'Lv')} {p.level} · <em>{placeName(p.place)}</em>
                          </div>
                        </div>
                      </div>
                      <div className="online-actions">
                        <button className="small-btn" onClick={() => setProfileName(p.name)}>
                          {tr('Perfil', 'Profile')}
                        </button>
                        <button
                          className="small-btn"
                          onClick={() => {
                            socket.current?.send({ type: 'trade_request', targetCharacterId: p.id });
                            setPlayersModalOpen(false);
                          }}
                        >
                          <Pix name="ui_swap" /> {tr('Negociar', 'Trade')}
                        </button>
                        <button
                          className="small-btn"
                          onClick={() => {
                            socket.current?.send({ type: 'party_invite', name: p.name });
                          }}
                        >
                          <Pix name="element_physical" /> {tr('Convidar', 'Invite')}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ── Analisador de caçada ─────────────────────────────────────────────────────
// Guarda o XP e o banco do começo da caçada e mostra a diferença. Fica no
// localStorage para sobreviver a recarregar a página.

interface Session {
  /** De quem é a sessão (com vários personagens no mesmo navegador). */
  characterId?: number;
  seed: number;
  start: number;
  xp0: number;
  bank0: Record<string, number>;
}

const SESSION_KEY = 'grimhold.huntSession';

/** Sessão salva deste personagem (a de outro personagem do navegador não vale). */
function loadSession(characterId: number): Session | null {
  try {
    const s: Session | null = JSON.parse(localStorage.getItem(`${SESSION_KEY}.${characterId}`) ?? 'null');
    return s && s.characterId === characterId ? s : null;
  } catch {
    return null;
  }
}
function saveSession(characterId: number, s: Session | null) {
  try {
    if (s) localStorage.setItem(`${SESSION_KEY}.${characterId}`, JSON.stringify(s));
    else localStorage.removeItem(`${SESSION_KEY}.${characterId}`);
    localStorage.removeItem(SESSION_KEY); // a chave antiga, sem personagem
  } catch {
    /* sem storage: o analisador zera ao recarregar */
  }
}

function HuntAnalyzer(props: {
  characterId: number;
  activity: Activity | null;
  state: PlayerState;
  clockOffset: React.MutableRefObject<number>;
  offlineGain: { n: number; elapsedMs: number; gains: Gains } | null;
}) {
  const { activity, state } = props;
  const lang = getLang();
  const [session, setSession] = useState<Session | null>(() => loadSession(props.characterId));
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const isCombat = activity?.skill === 'combat';

  // Caçada nova (semente nova): zera o analisador.
  useEffect(() => {
    if (!activity || activity.skill !== 'combat') return;
    if (session?.seed === activity.seed) return;
    const fresh = { characterId: props.characterId, seed: activity.seed, start: Date.now() + props.clockOffset.current, xp0: state.skills.combat, bank0: state.bank };
    setSession(fresh);
    saveSession(props.characterId, fresh);
  }, [activity?.seed, activity?.since, activity?.skill, session?.seed, state.skills.combat, state.bank]);

  // Nos primeiros segundos o ganho do tempo offline ainda pode chegar: ele não é
  // da caçada, então o ponto de partida acompanha (senão o XP/h sai inflado).
  useEffect(() => {
    if (!session || Date.now() + props.clockOffset.current - session.start > 10_000) return;
    if (session.xp0 === state.skills.combat && session.bank0 === state.bank) return;
    const next = { ...session, xp0: state.skills.combat, bank0: state.bank };
    setSession(next);
    saveSession(props.characterId, next);
  }, [state.skills.combat, state.bank, session]);

  // Ganho do tempo offline (ao reconectar) não é da sessão: desconta o XP, o loot e o tempo.
  // (Nos primeiros 10 s a regra de cima já acompanha o ponto de partida.)
  const offlineApplied = useRef(0);
  useEffect(() => {
    const g = props.offlineGain;
    if (!g || g.n === offlineApplied.current) return;
    offlineApplied.current = g.n;
    if (!session || Date.now() + props.clockOffset.current - session.start <= 10_000) return;
    const bank0 = { ...session.bank0 };
    for (const [id, qty] of Object.entries(g.gains.items ?? {})) bank0[id] = (bank0[id] ?? 0) + qty;
    // O início nunca passa de agora (senão o analisador fica parado em "indo ao portal").
    const next = { ...session, start: Math.min(session.start + g.elapsedMs, Date.now() + props.clockOffset.current), xp0: session.xp0 + (g.gains.xp?.combat ?? 0), bank0 };
    setSession(next);
    saveSession(props.characterId, next);
  }, [props.offlineGain, session]);

  // Início no futuro (relógio do aparelho mudou, sessão salva antiga): traz para agora.
  useEffect(() => {
    if (!session) return;
    const serverNow = Date.now() + props.clockOffset.current;
    if (session.start <= serverNow + 1000) return;
    const next = { ...session, start: serverNow };
    setSession(next);
    saveSession(props.characterId, next);
  });

  const clearSession = () => {
    setSession(null);
    saveSession(props.characterId, null);
  };
  // Durante a caçada, zerar recomeça a contagem dali (sem precisar sair e voltar).
  const restartSession = () => {
    if (!activity || activity.skill !== 'combat') return clearSession();
    const fresh = { characterId: props.characterId, seed: activity.seed, start: Date.now() + props.clockOffset.current, xp0: state.skills.combat, bank0: state.bank };
    setSession(fresh);
    saveSession(props.characterId, fresh);
  };

  if (!session) {
    return (
      <section className="panel analyzer">
        <h3>{t('analyzer.title')}</h3>
        <p className="muted">{t('analyzer.no_hunt')}</p>
      </section>
    );
  }

  const elapsed = Math.max(0, Date.now() + props.clockOffset.current - session.start);
  const xp = state.skills.combat - session.xp0;
  const perHour = isCombat && elapsed > 30_000 ? Math.round((xp / elapsed) * 3_600_000) : null;
  const diff = Object.entries({ ...session.bank0, ...state.bank }).map(([id]) => [id, (state.bank[id] ?? 0) - (session.bank0[id] ?? 0)] as const);
  // Loot: o que entrou (ouro conta direto, item pelo preço do Mercador), do mais valioso ao menos.
  const loot = diff
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ id, qty, value: id === 'gold' ? qty : itemValue(id) * qty }))
    .sort((x, y) => y.value - x.value);
  // Suprimentos: o que saiu do banco na caçada (comida, poções, runas).
  const supplies = diff
    .filter(([, qty]) => qty < 0)
    .map(([id, qty]) => ({ id, qty: -qty, value: id === 'gold' ? -qty : itemValue(id) * -qty }))
    .sort((x, y) => y.value - x.value);
  const lootTotal = loot.reduce((n, l) => n + l.value, 0);
  const supplyTotal = supplies.reduce((n, s) => n + s.value, 0);
  const balance = lootTotal - supplyTotal;
  const hourly = (n: number) => (isCombat && elapsed > 30_000 ? Math.round((n / elapsed) * 3_600_000).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US') : '—');
  const itemList = (list: { id: string; qty: number; value: number }[]) => (
    <ul className="loot-list">
      {list.map((l) => {
        const item = itemById(l.id);
        const name = l.id === 'gold' ? (lang === 'pt' ? 'Moedas de Ouro' : 'Gold Coins') : itemName(item?.name ?? l.id);
        return (
          <li key={l.id}>
            <img className="icon tiny" src={icon(l.id === 'gold' ? 'gold' : item?.icon ?? '')} alt="" />
            <span className="loot-name" style={{ color: splitRarity(l.id).tier > 0 ? rarityOf(l.id).color : undefined }}>
              {formatQty(l.qty)}x {name}
            </span>
            <span className="loot-value">{l.value.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="panel analyzer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h3 style={{ margin: 0 }}>{t('analyzer.title')}</h3>
        <button className="secondary small-btn" style={{ fontSize: '0.75rem', padding: '2px 6px' }} onClick={isCombat ? restartSession : clearSession}>
          {t('analyzer.clear')}
        </button>
      </div>
      {!isCombat && <p className="small muted" style={{ margin: '0 0 6px' }}>{t('analyzer.last_hunt')}</p>}
      <dl className="stats-grid">
        <dt>{t('analyzer.session')}</dt>
        <dd>{elapsed === 0 ? t('analyzer.going_to_portal') : formatClock(elapsed)}</dd>
        <dt>{t('analyzer.xp_gained')}</dt>
        <dd>{xp.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}</dd>
        <dt>{t('analyzer.xp_per_hour')}</dt>
        <dd>{perHour === null ? '—' : perHour.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}</dd>
      </dl>
      <h4>{t('analyzer.loot')}</h4>
      <dl className="stats-grid">
        <dt>{t('analyzer.loot')}</dt>
        <dd className="gold">{lootTotal.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}</dd>
        <dt>{t('analyzer.supplies')}</dt>
        <dd className="loot-neg">{supplyTotal ? `-${supplyTotal.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}` : '0'}</dd>
        <dt>{t('analyzer.balance')}</dt>
        <dd className={balance >= 0 ? 'loot-pos' : 'loot-neg'}>{balance.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}</dd>
        <dt>{t('analyzer.balance_per_hour')}</dt>
        <dd className={balance >= 0 ? 'loot-pos' : 'loot-neg'}>{hourly(balance)}</dd>
      </dl>
      {loot.length === 0 ? <p className="small">{lang === 'pt' ? 'Nada ainda.' : 'Nothing yet.'}</p> : itemList(loot)}
      {supplies.length > 0 && (
        <>
          <h4>{t('analyzer.supplies_spent')}</h4>
          {itemList(supplies)}
        </>
      )}
      <p className="small">{t('analyzer.merchant_disclaimer')}</p>
    </section>
  );
}

// ── Coleta (Mineração, Pesca) ────────────────────────────────────────────────

/** Verbo da atividade em andamento, para a barra e os botões. */
const VERB: Record<SkillId, string> = {
  combat: 'Caçando',
  melee: 'Treinando',
  ranged: 'Treinando',
  magic_level: 'Treinando',
  shielding: 'Treinando',
  mining: 'Minerando',
  smithing: 'Forjando',
  fishing: 'Pescando',
  cooking: 'Cozinhando',
  woodcutting: 'Cortando',
  crafting: 'Fazendo',
  herbalism: 'Colhendo',
  soulreaping: 'Ceifando',
  alchemy: 'Preparando',
  runecraft: 'Gravando',
  sigilism: 'Forjando',
  fletching: 'Produzindo',
  jewelcrafting: 'Lapidando',
  slayer: 'Caçando',
};
const ACTION: Record<SkillId, string> = {
  combat: 'Caçar',
  melee: 'Treinar',
  ranged: 'Treinar',
  magic_level: 'Treinar',
  shielding: 'Treinar',
  mining: 'Minerar',
  smithing: 'Forjar',
  fishing: 'Pescar',
  cooking: 'Cozinhar',
  woodcutting: 'Cortar',
  crafting: 'Fazer',
  herbalism: 'Colher',
  soulreaping: 'Ceifar',
  alchemy: 'Preparar',
  runecraft: 'Gravar',
  sigilism: 'Forjar',
  fletching: 'Produzir',
  jewelcrafting: 'Lapidar',
  slayer: 'Caçar',
};
/** O que já está liberado e as 2 próximas — o resto fica escondido até pedir. */
const PREVIEW = 2;
function upcoming<T extends { level: number }>(list: T[], level: number, all: boolean): T[] {
  if (all) return list;
  let locked = 0;
  return list.filter((x) => x.level <= level || locked++ < PREVIEW);
}
const hiddenCount = (list: { level: number }[], level: number) =>
  Math.max(0, list.filter((x) => x.level > level).length - PREVIEW);

/** Ordem das abas: coleta e, ao lado, a produção que usa o que foi coletado. */
const PROFESSIONS = ['mining', 'smithing', 'fishing', 'cooking', 'woodcutting', 'crafting', 'fletching', 'herbalism', 'soulreaping', 'alchemy', 'runecraft', 'sigilism', 'jewelcrafting'] as const;

const skillName = (id: SkillId) => t('skill.' + id, SKILLS.find((s) => s.id === id)?.name ?? id);

/** Selo da Skill do Dia no título do painel da profissão. */
function BoostedSkillChip({ skill }: { skill: SkillId }) {
  if (getBoostedSkill() !== skill) return null;
  return <span className="boosted-chip"><Pix name="ui_star" /> {tr('Skill do Dia', 'Skill of the Day')} · +{Math.round((BOOSTED_SKILL_XP_MULT - 1) * 100)}% XP</span>;
}
const dayMult = (skill: SkillId) => (getBoostedSkill() === skill ? BOOSTED_SKILL_XP_MULT : 1);

/**
 * Os outros bônus de XP da profissão que o servidor paga (para a XP/h do painel bater com a real):
 * ferramenta e roupa, patente da Guilda, refeição, mascote, capa, poção de XP e evento.
 */
function profXpExtra(state: PlayerState | null | undefined, skill: SkillId): number {
  if (!state) return 1;
  const now = Date.now();
  let m = professionGearXpMult(skill, state.skills[skill] ?? 0, state.bank);
  m *= 1 + guildBonus(state.guildPoints);
  if ((state.guildPoints ?? 0) >= GRANDMASTER_POINTS && outfitGroupFor(skill) === 'artisan' && outfitCount(skill, state.bank) === 4) m *= 1 + GRANDMASTER_ARTISAN_XP;

  const meal = state.activeMeal && state.activeMeal.until > now ? itemById(state.activeMeal.item)?.meal : undefined;
  if (meal && (meal.buff === 'profession_xp' || meal.buff === 'all_xp_loot')) m *= 1 + meal.value;
  if (petSkillsOf(state.unlockedPets ?? []).includes(skill)) m *= 1 + PET_XP_BONUS;
  m *= capeXpMult(state.equipment?.cape ?? undefined, skill);
  if ((state.xpBoostUntil ?? 0) > now) m *= 2;
  m *= 1 + xpEventBonus(now, now + 1);
  return m;
}

/** Kit do Artesão (loja da Guilda): +25% de velocidade enquanto ativo, igual ao servidor. */
function artisanKitBonus(state: PlayerState | null | undefined): number {
  return (state?.artisanKitUntil ?? 0) > Date.now() ? ARTISAN_KIT_SPEED : 0;
}

/** Velocidade de coleta do jogador neste ponto (nível acima do ponto, ferramenta e mascote). */
function gatherSpeedOfState(state: PlayerState, skill: SkillId, nodeId: string): number {
  return gatherSpeed(skill, nodeId, state.skills[skill] ?? 0, {
    petSkills: petSkillsOf(state.unlockedPets ?? []),
    toolSpeed: toolSpeedFor(skill, state.skills[skill] ?? 0, state.bank) + guildBonus(state.guildPoints) + artisanKitBonus(state),
  });
}

/** Ferramenta e roupa de profissão que estão valendo (do depósito): o que acelera e o XP extra. */
function ProfGearBox(props: { skill: SkillId; state: PlayerState }) {
  const { skill, state } = props;
  const group = outfitGroupFor(skill);
  if (!group) return null;
  const xp = state.skills[skill] ?? 0;
  const gathering = skill in NODES;
  const tool = gathering ? bestTool(skill, xp, state.bank) : undefined;
  const multi = gathering ? multitoolFor(skill, state.bank) : undefined;
  const pieces = outfitItems(group);
  const have = outfitCount(skill, state.bank);
  const gearXp = Math.round((professionGearXpMult(skill, xp, state.bank) - 1) * 100);
  return (
    <div className="prof-gear small">
      {gathering && (
        <span className="prof-gear-tool" title={tr('A melhor ferramenta do depósito que você já pode usar vale sozinha.', 'The best tool in your depot that you can use works automatically.')}>
          {tool ? (
            <>
              <img className="icon tiny" src={icon(tool.icon)} alt="" /> {itemName(tool.name)} ({tr(`nível ${tool.tool!.level} de ${skillName(skill)}`, `${skillName(skill)} level ${tool.tool!.level}`)}): <span className="loot-pos">+{Math.round(tool.tool!.speed * 100)}% {tr('velocidade', 'speed')}{tool.tool!.xp ? `, +${Math.round(tool.tool!.xp * 100)}% XP` : ''}{GATHERING_SKILLS.has(tool.tool!.skill) ? `, ${Math.round(tool.tool!.speed * MINING_TOOL_YIELD * 100)}% ${tr('de chance de item extra por ação', 'chance of an extra item per action')}` : ''}</span>
              {(() => {
                const next = toolsFor(skill).find((t) => t.tool!.level > tool.tool!.level);
                return next ? <span className="low"> · {tr(`próxima: ${itemName(next.name)}, nível ${next.tool!.level} de ${skillName(skill)}`, `next: ${itemName(next.name)}, ${skillName(skill)} level ${next.tool!.level}`)}</span> : null;
              })()}
            </>
          ) : (
            <span className="low">
              {(() => {
                const locked = toolsFor(skill).find((t) => (state.bank[t.id] ?? 0) > 0 && !tool);
                return locked
                  ? tr(`${itemName(locked.name)} precisa de nível ${locked.tool!.level} de ${skillName(skill)}.`, `${itemName(locked.name)} needs ${skillName(skill)} ${locked.tool!.level}.`)
                  : tr('Sem ferramenta: faça uma na Forja para coletar mais rápido.', 'No tool: make one at the Forge to gather faster.');
              })()}
            </span>
          )}
          {multi && (
            <>
              {' · '}
              <img className="icon tiny" src={icon(multi.icon)} alt="" /> {itemName(multi.name)}: <span className="loot-pos">+{Math.round(multi.multitool!.speed * 100)}% {tr('velocidade', 'speed')}{GATHERING_SKILLS.has(props.skill) ? `, +${Math.round(multi.multitool!.speed * MINING_TOOL_YIELD * 100)}% ${tr('de chance de item extra', 'extra item chance')}` : ''}</span>
            </>
          )}
        </span>
      )}
      <span className="prof-gear-outfit" title={tr('Peças caem enquanto você treina. Cada uma dá +2% de XP; as 4 juntas, +10%.', 'Pieces drop while you train. Each gives +2% XP; all 4 give +10%.')}>
        {pieces.map((it) => (
          <img key={it.id} className={`icon tiny ${(state.bank[it.id] ?? 0) > 0 ? '' : 'missing-piece'}`} src={icon(it.icon)} alt="" title={itemName(it.name)} />
        ))}{' '}
        {tr('Roupa', 'Outfit')} {have}/4
        {gearXp > 0 && <span className="loot-pos"> · +{gearXp}% XP</span>}
      </span>
    </div>
  );
}

export type ProfSortMode = 'default' | 'xph' | 'level';
const PROF_SORT_KEY = 'grimhold.profSort';
const PROF_ONLY_DOABLE_KEY = 'grimhold.profOnlyDoable';

function loadProfSort(): ProfSortMode {
  try {
    const v = localStorage.getItem(PROF_SORT_KEY);
    if (v === 'xph' || v === 'level') return v;
  } catch {}
  return 'default';
}

function saveProfSort(mode: ProfSortMode) {
  try {
    if (mode === 'default') localStorage.removeItem(PROF_SORT_KEY);
    else localStorage.setItem(PROF_SORT_KEY, mode);
  } catch {}
}

function loadProfOnlyDoable(): boolean {
  try {
    return localStorage.getItem(PROF_ONLY_DOABLE_KEY) === '1';
  } catch {}
  return false;
}

function saveProfOnlyDoable(only: boolean) {
  try {
    if (only) localStorage.setItem(PROF_ONLY_DOABLE_KEY, '1');
    else localStorage.removeItem(PROF_ONLY_DOABLE_KEY);
  } catch {}
}

function gatherNodeXpH(n: ResourceNode, skill: GatheringSkillId, state: PlayerState | null): number {
  const speed = state ? gatherSpeedOfState(state, skill, n.id) : 0;
  const interval = gatherIntervalMs(n, speed);
  return Math.round((n.xp * professionXpBoost(n.level) * dayMult(skill) * profXpExtra(state, skill) * 3_600_000) / interval);
}

function recipeXpH(r: Recipe, skill: ProductionSkillId, state: PlayerState | null): number {
  const sp = productionSpeed(skill, r.id, state?.skills[skill] ?? 0, guildBonus(state?.guildPoints) + artisanKitBonus(state));
  const ms = productionIntervalMs(r, sp);
  return Math.round((r.xp * professionXpBoost(r.level) * dayMult(skill) * profXpExtra(state, skill) * 3_600_000) / ms);
}

function GatherPanel(props: {
  skill: GatheringSkillId;
  state: PlayerState | null;
  clockOffset: React.MutableRefObject<number>;
  onStart: (node: string) => void;
  onQueue?: (node: string) => void;
  onStop: () => void;
  sortMode?: ProfSortMode;
  onSortChange?: (mode: ProfSortMode) => void;
  onlyDoable?: boolean;
  onOnlyDoableChange?: (only: boolean) => void;
}) {
  const { state } = props;
  const level = levelForXp(state?.skills[props.skill] ?? 0, props.skill);
  const activity = state?.activity?.skill === props.skill ? state.activity : null;
  const [showAll, setShowAll] = useState(false);
  const [localSort, setLocalSort] = useState<ProfSortMode>(loadProfSort);
  const [localDoable, setLocalDoable] = useState<boolean>(loadProfOnlyDoable);

  const sortMode = props.sortMode ?? localSort;
  const setSortMode = props.onSortChange ?? ((m) => { setLocalSort(m); saveProfSort(m); });
  const onlyDoable = props.onlyDoable ?? localDoable;
  const setOnlyDoable = props.onOnlyDoableChange ?? ((d) => { setLocalDoable(d); saveProfOnlyDoable(d); });

  const speedOf = (nodeId: string) => (state ? gatherSpeedOfState(state, props.skill, nodeId) : 0);
  const activeNode = activity ? nodeById(props.skill, activity.node) : undefined;

  const allNodes = NODES[props.skill];
  const filtered = onlyDoable ? allNodes.filter((n) => n.level <= level) : allNodes;
  const visible = onlyDoable || showAll
    ? filtered
    : (() => {
        const lockedList = filtered.filter((n) => n.level > level).sort((a, b) => a.level - b.level).slice(0, PREVIEW);
        const unlockedList = filtered.filter((n) => n.level <= level);
        return [...unlockedList, ...lockedList];
      })();

  const unlocked = visible.filter((n) => n.level <= level);
  const locked = visible.filter((n) => n.level > level).sort((a, b) => a.level - b.level);

  const sortedUnlocked = [...unlocked].sort((a, b) => {
    if (sortMode === 'xph') {
      const diff = gatherNodeXpH(b, props.skill, state) - gatherNodeXpH(a, props.skill, state);
      if (diff !== 0) return diff;
      return b.level - a.level;
    }
    if (sortMode === 'level') {
      return b.level - a.level;
    }
    return a.level - b.level;
  });

  const sorted = [...sortedUnlocked, ...locked];

  return (
    <section className="panel">
      <h3>
        {skillName(props.skill)} <BoostedSkillChip skill={props.skill} />
      </h3>
      {state && <ProfGearBox skill={props.skill} state={state} />}
      {activity && (
        <ActivityView
          activity={activity}
          clockOffset={props.clockOffset}
          onStop={props.onStop}
          intervalMs={activeNode ? gatherIntervalMs(activeNode, speedOf(activeNode.id)) : undefined}
        />
      )}
      <div className="prof-controls-bar">
        <div className="prof-sort-controls">
          <label className="prof-sort-label">
            <span>{tr('Ordenar:', 'Sort:')}</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as ProfSortMode)}
            >
              <option value="default">{tr('Padrão', 'Default')}</option>
              <option value="xph">{tr('Mais XP/h', 'Most XP/h')}</option>
              <option value="level">{tr('Nível', 'Level')}</option>
            </select>
          </label>
          <label className="prof-doable-label">
            <input
              type="checkbox"
              checked={onlyDoable}
              onChange={(e) => setOnlyDoable(e.target.checked)}
            />
            <span>{tr('Só o que dá para fazer', 'Only doable')}</span>
          </label>
        </div>
      </div>
      <ul className="nodes">
        {sorted.map((n) => {
          const speed = speedOf(n.id);
          const locked = level < n.level;
          const active = activity?.node === n.id;
          const item = itemById(n.item);
          const nodeName = t('node.' + n.id, n.name);
          return (
            <li key={n.id} className={`node ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}>
              <img className="icon" src={icon(item?.icon ?? '')} alt="" />
              <div className="node-info">
                <strong>{nodeName}</strong>
                <span className="small">
                  {n.region} · {t('common.level')} {n.level} · {Math.round(n.xp * professionXpBoost(n.level) * dayMult(props.skill) * profXpExtra(state, props.skill))} XP {getLang() === 'pt' ? 'a cada' : 'every'} {+(gatherIntervalMs(n, speed) / 1000).toFixed(2)}s
                  {' · '}<span className={speed > 0 ? 'loot-pos' : ''}>{tr('velocidade', 'speed')} +{Math.round(speed * 100)}%</span>
                  {' · '}~{gatherNodeXpH(n, props.skill, state).toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US')} XP/h
                  {gatherExtraChance(level, n.level) > 0 && (
                    <span className="loot-pos" title={tr('Bem acima do nível do ponto: chance de 1 item extra a cada coleta', 'Well above the spot level: chance of 1 extra item per gather')}>
                      {' '}· {Math.round(gatherExtraChance(level, n.level) * 100)}% {tr('de extra', 'extra')}
                    </span>
                  )}
                  {n.drops && <span> · {n.drops.map((d) => itemName(itemById(d.item)?.name ?? d.item)).join(', ')}</span>}
                </span>
              </div>
              <button className="primary small-btn" disabled={locked || active || !state} onClick={() => props.onStart(n.id)}>
                {locked ? `${t('common.level')} ${n.level}` : active ? t('verb.' + props.skill, VERB[props.skill]) : t('act.' + props.skill, ACTION[props.skill])}
              </button>
              {!locked && props.onQueue && (
                <button className="small-btn" title={tr('Fazer depois da tarefa atual', 'Do after the current task')} onClick={() => props.onQueue!(n.id)}>
                  {tr('+ Fila', '+ Queue')}
                </button>
              )}
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="node small muted" style={{ padding: '16px', textAlign: 'center', justifyContent: 'center' }}>
            {onlyDoable ? tr('Nenhum ponto de coleta disponível para o seu nível.', 'No gathering spots available for your level.') : tr('Nenhum ponto encontrado.', 'No spots found.')}
          </li>
        )}
      </ul>
      {!onlyDoable && hiddenCount(allNodes, level) > 0 && (
        <button className="link-btn small" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t('act.show_less', 'Mostrar menos') : `${t('act.show_all', 'Mostrar todas')} (+${hiddenCount(allNodes, level)})`}
        </button>
      )}
    </section>
  );
}

function SkillBar({ name, icon, xp, skill }: { name: string; icon: string; xp: number; skill?: SkillId }) {
  const level = levelForXp(xp, skill);
  return (
    <div className="skill">
      <img className="icon" src={icon} alt="" />
      <div className="skill-info">
        <div className="skill-head">
          <span className="skill-name">
            {name}
            {skill && getBoostedSkill() === skill && <span title={tr('Skill do Dia: +50% XP', 'Skill of the Day: +50% XP')}> <Pix name="ui_star" /></span>}
          </span>
          <strong className="skill-level">Nv {level}</strong>
        </div>
        <div className="bar" title={`${xp.toLocaleString('pt-BR')} XP`}>
          <div className="fill xp" style={{ width: `${levelProgress(xp, skill) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function ActivityView(props: { activity: Activity; clockOffset: React.MutableRefObject<number>; onStop: () => void; intervalMs?: number }) {
  const gather = nodeById(props.activity.skill, props.activity.node);
  const recipe = recipeById(props.activity.skill, props.activity.node);
  const dummy = dummyById(props.activity.node);
  const node = gather ?? recipe ?? dummy;
  const fill = useRef<HTMLDivElement>(null);

  // A barra anima no cliente, mas a partir do 'since' do servidor — quem decide é ele.
  useEffect(() => {
    if (!node) return;
    let raf = 0;
    const frame = () => {
      const serverNow = Date.now() + props.clockOffset.current;
      const interval = props.intervalMs ?? node.intervalMs;
      const t = ((serverNow - props.activity.since) % interval) / interval;
      if (fill.current) fill.current.style.width = `${Math.max(0, t) * 100}%`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [node, props.activity.since, props.clockOffset, props.intervalMs]);

  if (!node) return null;
  const itemIcon = gather ? itemById(gather.item)?.icon : recipe ? itemById(recipe.output)?.icon : dummy?.icon;
  return (
    <div className="activity">
      <img className="icon big" src={icon(itemIcon ?? '')} alt="" />
      <div className="activity-info">
        <strong>{node.name}</strong>
        <div className="bar">
          <div className="fill" ref={fill} />
        </div>
      </div>
      <button className="primary small-btn" onClick={props.onStop}>
        Parar
      </button>
    </div>
  );
}

type BankSort = 'tipo' | 'valor' | 'nome' | 'raridade';
/** Melhor chance de drop do item (0 a 1); sem drop (criado, ouro, recompensa) conta como comum. */
const dropChanceCache = new Map<string, number>();
const bestDropChance = (id: string) => {
  const base = id.split(/[+#]/)[0];
  let c = dropChanceCache.get(base);
  if (c === undefined) {
    const drops = itemSources(base).filter((s): s is Extract<typeof s, { kind: 'drop' }> => s.kind === 'drop' && s.chance > 0);
    c = drops.length ? Math.max(...drops.map((d) => d.chance)) : 1;
    dropChanceCache.set(base, c);
  }
  return c;
};
type BankTab = 'all' | 'equipment' | 'consumables' | 'materials' | 'other';
const BANK_SORT_KEY = 'grimhold.bankSort';
const BANK_TAB_KEY = 'grimhold.bankTab';
const SLOT_ORDER: string[] = ['weapon', 'shield', 'helmet', 'armor', 'legs', 'boots', 'amulet', 'ring', 'cape', 'gem'];

/** Categoria para as abas do banco. */
function bankTabOf(id: string): BankTab {
  if (id === 'gold') return 'all';
  const item = itemById(id);
  if (item?.equip) return 'equipment';
  if (item?.potion || item?.rune || item?.food || item?.meal || item?.manaPotion || item?.arrow) return 'consumables';
  if (item?.pouch || item?.questItem || id === 'boss_token' || id === 'torn_map' || id === 'seal_shard') return 'other';
  return 'materials';
}

/** Grupo do item para arrumar por tipo: ouro, equipamento (por espaço), poção/runa/comida/flecha, materiais, resto. */
function sortGroup(id: string): number {
  if (id === 'gold') return -1;
  const item = itemById(id);
  if (item?.equip) return SLOT_ORDER.indexOf(item.equip.slot);
  if (item?.arrow) return 19;
  if (item?.potion || item?.manaPotion) return 20;
  if (item?.rune) return 21;
  if (item?.food || item?.meal) return 22;
  if (item?.pouch) return 28;
  return 30;
}

/**
 * Depósito da conta: uma aba por personagem. O seu é o de sempre; nos outros, os itens ficam
 * separados, mas dá para pegar para este personagem (o servidor confere que é da mesma conta).
 */
function AccountBank(props: {
  myName: string;
  alts: AltBank[] | null;
  onLoad: () => void;
  onTake: (from: number, item: string, qty: number) => void;
  /** O que este personagem tem equipado, o nível e a classe (para comparar o equipamento do outro). */
  equipment: Partial<Record<EquipSlot, string>>;
  level: number;
  vocation: string;
  children: React.ReactNode;
}) {
  const [who, setWho] = useState<number | null>(null);
  useEffect(() => {
    props.onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const alts = props.alts ?? [];
  const alt = alts.find((a) => a.id === who) ?? null;
  return (
    <>
      {alts.length > 0 && (
        <div className="tabs bank-chars" role="tablist">
          <button role="tab" aria-selected={who === null} className={`tab ${who === null ? 'on' : ''}`} onClick={() => setWho(null)}>
            {props.myName}
          </button>
          {alts.map((a) => (
            <button key={a.id} role="tab" aria-selected={who === a.id} className={`tab ${who === a.id ? 'on' : ''}`} onClick={() => { setWho(a.id); props.onLoad(); }}>
              {a.name} <span className="small">({tr('Nv', 'Lv')} {a.level})</span>
            </button>
          ))}
        </div>
      )}
      {!alt ? (
        props.children
      ) : (
        <>
          <p className="small muted">
            {tr(`Depósito de ${alt.name}. Os itens ficam com ${alt.name} até você pegar para ${props.myName}.`, `Depot of ${alt.name}. Items stay with ${alt.name} until you take them for ${props.myName}.`)}
          </p>
          <Bank key={alt.id} bank={alt.bank} combatLevel={props.level} vocation={props.vocation} equipment={props.equipment} onTake={(item, qty) => props.onTake(alt.id, item, qty)} takerName={props.myName} />
        </>
      )}
    </>
  );
}

function Bank(props: {
  bank: Record<string, number>;
  combatLevel?: number;
  vocation?: string;
  onEquip?: (item: string) => void;
  /** Abre uma bolsa de armas de chefe. */
  onOpen?: (item: string) => void;
  /** O que está equipado, para comparar ao passar o mouse num equipamento. */
  equipment?: Partial<Record<EquipSlot, string>>;
  /** Itens trancados (não vendem) e o botão de trancar. */
  lockedItems?: string[];
  onLock?: (item: string, locked: boolean) => void;
  /** Depósito de outro personagem da conta: em vez de equipar, pega para este (com a quantidade). */
  onTake?: (item: string, qty: number) => void;
  takerName?: string;
}) {
  const [takeQty, setTakeQty] = useState<Record<string, number>>({});
  const [tab, setTabState] = useState<BankTab>(() => {
    try {
      const v = localStorage.getItem(BANK_TAB_KEY);
      return v === 'equipment' || v === 'consumables' || v === 'materials' || v === 'other' ? v : 'all';
    } catch {
      return 'all';
    }
  });
  const setTab = (v: BankTab) => {
    setTabState(v);
    try {
      if (v === 'all') localStorage.removeItem(BANK_TAB_KEY);
      else localStorage.setItem(BANK_TAB_KEY, v);
    } catch {
      /* ignore */
    }
  };
  const [sort, setSortState] = useState<BankSort | null>(() => {
    try {
      const v = localStorage.getItem(BANK_SORT_KEY);
      return v === 'tipo' || v === 'valor' || v === 'nome' || v === 'raridade' ? v : null;
    } catch {
      return null;
    }
  });
  const setSort = (v: BankSort | null) => {
    setSortState(v);
    try {
      if (v) localStorage.setItem(BANK_SORT_KEY, v);
      else localStorage.removeItem(BANK_SORT_KEY);
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const rawEntries = Object.entries(props.bank).filter(([, qty]) => qty > 0);
  if (rawEntries.length === 0) return <p className="muted">Vazio.</p>;

  const query = search.trim().toLowerCase();

  // Filtra de acordo com a aba selecionada e busca por texto
  const entries = rawEntries.filter(([id]) => {
    if (tab !== 'all' && id !== 'gold' && bankTabOf(id) !== tab) return false;
    if (query) {
      const it = itemById(id);
      const translatedName = itemName(it?.name ?? id).toLowerCase();
      const rawName = (it?.name ?? id).toLowerCase();
      if (!translatedName.includes(query) && !rawName.includes(query)) return false;
    }
    return true;
  });

  const name = (id: string) => itemById(id)?.name ?? id;
  if (sort === 'nome') entries.sort((a, b) => name(a[0]).localeCompare(name(b[0]), 'pt-BR'));
  if (sort === 'raridade') entries.sort((a, b) => bestDropChance(a[0]) - bestDropChance(b[0]) || name(a[0]).localeCompare(name(b[0]), 'pt-BR'));
  if (sort === 'valor') entries.sort((a, b) => itemValue(b[0]) * b[1] - itemValue(a[0]) * a[1]);
  if (sort === 'tipo')
    entries.sort((a, b) => {
      const gDiff = sortGroup(a[0]) - sortGroup(b[0]);
      if (gDiff !== 0) return gDiff;
      const baseA = splitRarity(a[0]);
      const baseB = splitRarity(b[0]);
      const lvlA = itemById(baseA.base)?.equip?.level ?? 0;
      const lvlB = itemById(baseB.base)?.equip?.level ?? 0;
      if (lvlA !== lvlB) return lvlA - lvlB;
      const nameDiff = name(baseA.base).localeCompare(name(baseB.base), 'pt-BR');
      if (nameDiff !== 0) return nameDiff;
      // Mesmo item base: ordem crescente de raridade (C=0, I=1, R=2, E=3, L=4)
      return baseA.tier - baseB.tier;
    });
  const sel = selected && props.bank[selected] ? itemById(selected) : undefined;
  const itemTip = (id: string) => {
    const item = itemById(id);
    if (!item) return id;
    const eq = item.equip;
    if (item.pouch) return `${itemName(item.name)} — ${t('pouch.click_to_open', 'clique para abrir')} (${item.pool?.map((w) => itemName(itemById(w)?.name ?? w)).join(', ')})`;
    if (eq) {
      const wrong = !!eq.vocations && !eq.vocations.includes(props.vocation ?? '');
      const low = (props.combatLevel ?? 1) < eq.level;
      return `${itemName(item.name)} — ${bonusText(eq)}${itemEffectText(item) ? `, ${itemEffectText(item)}` : ''}${wrong ? ` (${vocationNames(eq.vocations!)})` : low ? ` (${t('common.level')} ${eq.level})` : ''}`;
    }
    const effect = itemEffectText(item);
    return effect ? `${itemName(item.name)} — ${effect}` : itemName(item.name);
  };
  return (
    <>
      <div className="bank-header-tabs">
        {(
          [
            { id: 'all', label: t('bank.tab_all', 'Todos') },
            { id: 'equipment', label: t('bank.tab_equipment', 'Equipamentos') },
            { id: 'consumables', label: t('bank.tab_consumables', 'Consumíveis') },
            { id: 'materials', label: t('bank.tab_materials', 'Materiais') },
            { id: 'other', label: t('bank.tab_other', 'Outros') },
          ] as const
        ).map((tb) => (
          <button
            key={tb.id}
            type="button"
            className={`bank-tab-btn ${tab === tb.id ? 'active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}
          </button>
        ))}
      </div>
      <div className="bank-tools">
        <input
          type="search"
          className="bank-search-input"
          placeholder={t('bank.search_placeholder', 'Buscar item...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="small">{t('bank.sort_label', 'Arrumar:')}</span>
        {(['tipo', 'valor', 'nome', 'raridade'] as const).map((k) => (
          <button key={k} type="button" className={`primary small-btn ${sort === k ? 'on' : ''}`} onClick={() => setSort(sort === k ? null : k)}>
            {k === 'tipo' ? t('bank.sort_type', 'Tipo') : k === 'valor' ? t('bank.sort_value', 'Valor') : k === 'raridade' ? tr('Raridade', 'Rarity') : t('bank.sort_name', 'Nome')}
          </button>
        ))}
      </div>
      {(tab === 'all' || tab === 'equipment') && props.equipment && (
        <p className="small muted bank-legend">
          <span className="upgrade-arrow up">▲</span> {tr('melhor que o equipado', 'better than equipped')} · <span className="upgrade-arrow down">▼</span> {tr('pior', 'worse')} ·{' '}
          <span className="upgrade-arrow mixed">◆</span> {tr('melhora uns atributos e piora outros', 'better in some stats, worse in others')}
        </p>
      )}
      <ul className={`bank ${tab === 'consumables' ? 'with-names' : ''}`}>
        {entries.map(([id, qty]) => {
          const item = itemById(id);
          const eq = item?.equip;
          const content = (
            <>
              <img className="icon" src={icon(item?.icon ?? '')} alt={item?.name ?? id} />
              {spellGemTierOf(id) > 0 && <span className={`gem-tier-badge slot-gem-tier tier-${spellGemTierOf(id)}`}>{['', 'I', 'II', 'III'][spellGemTierOf(id)]}</span>}
              <span className="qty">{formatQty(qty)}</span>
            </>
          );
          const eq2 = eq && (props.onEquip || props.onTake) ? eq : undefined;
          const locked2 = !!eq2 && ((!!eq2.vocations && !eq2.vocations.includes(props.vocation ?? '')) || (props.combatLevel ?? 1) < eq2.level);
          const better = eq2 && !locked2 && props.equipment ? upgradeVs(id, props.equipment) : 0;
          // Clicar só seleciona (mostra o nome e o que faz); equipar/abrir é no botão do cartão.
          return (
            <li key={id}>
              <button
                type="button"
                className={`slot equippable ${locked2 ? 'locked' : ''} ${selected === id ? 'selected' : ''}`}
                style={rarityStyle(id)}
                title={itemTip(id)}
                onClick={() => {
                  setSelected(selected === id ? null : id);
                }}
              >
                {content}
                <UpgradeArrow v={better} />
                {props.lockedItems?.includes(id) && <span className="bank-lock" title={tr('Trancado', 'Locked')}>🔒</span>}
              </button>
              {tab === 'consumables' && item && <span className="slot-name">{itemName(item.name)}</span>}
            </li>
          );
        })}
      </ul>
      {sel && (
        <div className="bank-selected">
          <strong style={{ color: rarityOf(selected!).color }}>{itemName(sel.name)}</strong>
          <span className="small">{itemTip(selected!).split(' — ').slice(1).join(' — ')}</span>
          {sel.equip && props.onEquip && (
            <button type="button" className="primary small-btn" onClick={() => { props.onEquip!(selected!); setSelected(null); }}>
              {tr('Equipar', 'Equip')}
            </button>
          )}
          {props.onTake && (sel.questItem ? (
            <span className="small muted">{tr('item de quest: fica com o personagem', 'quest item: stays with the character')}</span>
          ) : (() => {
            const max = props.bank[selected!] ?? 0;
            const n = Math.min(max, Math.max(1, Math.floor(takeQty[selected!] ?? max)));
            return (
              <span className="sell-amount">
                <input type="number" min={1} max={max} value={n} onChange={(e) => setTakeQty((p) => ({ ...p, [selected!]: Number(e.target.value) || 1 }))} aria-label={tr('Quantidade', 'Amount')} />
                <button type="button" className="primary small-btn" onClick={() => props.onTake!(selected!, n)}>
                  {tr(`Pegar ${formatQty(n)} para ${props.takerName ?? ''}`, `Take ${formatQty(n)} for ${props.takerName ?? ''}`)}
                </button>
              </span>
            );
          })())}
          {props.onLock && (() => {
            const isLocked = !!props.lockedItems?.includes(selected!);
            return (
              <button type="button" className="small-btn link-btn" title={tr('Trancado não vende no Mercador nem vai ao Mercado', 'Locked items cannot be sold or listed')} onClick={() => props.onLock!(selected!, !isLocked)}>
                {isLocked ? tr('🔓 Destrancar', '🔓 Unlock') : tr('🔒 Trancar', '🔒 Lock')}
              </button>
            );
          })()}
          {sel.pouch && props.onOpen && (
            <button type="button" className="primary small-btn" onClick={() => { props.onOpen!(selected!); setSelected(null); }}>
              {tr('Abrir', 'Open')}
            </button>
          )}
          <button
            type="button"
            className="small-btn link-btn"
            title={tr('Coloca este item no campo do chat', 'Insert this item in the chat input')}
            onClick={() => linkItemInChat(selected!)}
          >
            💬 {tr('Mostrar no chat', 'Link in chat')}
          </button>
        </div>
      )}
      {sel?.equip && props.equipment && <CompareCard id={selected!} equipment={props.equipment} />}
    </>
  );
}

/**
 * Melhor (1), pior (-1) ou igual (0) ao equipado no mesmo espaço: arma pelo ataque,
 * o resto pela defesa (e a vida no empate). Espaço vazio: qualquer item com algo é melhor.
 */
/** Nome do elemento no idioma do jogador ("Fogo"). */
function elementLabel(el: Element | undefined): string {
  return el ? (getLang() === 'pt' ? ELEMENTS[el].pt : ELEMENTS[el].en) : tr('Elemental', 'Elemental');
}

/** Espólio da vitória contra um chefe (covil ou instância): os itens que caíram, do mais valioso, e a XP. */
function ClearedLoot(props: { loot?: Record<string, number>; xp?: number }) {
  const lang = getLang();
  const fmt = (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const list = Object.entries(props.loot ?? {})
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ id, qty, value: id === 'gold' ? qty : itemValue(id) * qty }))
    .sort((a, b) => b.value - a.value);
  if (!list.length && !props.xp) return null;
  return (
    <div className="cleared-loot">
      <h4>{tr('Espólio', 'Spoils')}</h4>
      {props.xp ? <p className="small loot-pos">+{fmt(props.xp)} XP</p> : null}
      {list.length ? (
        <ul className="loot-list">
          {list.map((l) => {
            const item = itemById(l.id);
            const name = l.id === 'gold' ? (lang === 'pt' ? 'Moedas de Ouro' : 'Gold Coins') : itemName(item?.name ?? l.id);
            const legendary = !!item?.legendary;
            return (
              <li key={l.id}>
                <img className="icon tiny" src={icon(l.id === 'gold' ? 'gold' : item?.icon ?? '')} alt="" />
                <span className="loot-name" style={{ color: legendary || splitRarity(l.id).tier > 0 ? rarityOf(l.id).color : undefined, fontWeight: legendary ? 700 : undefined }}>
                  {formatQty(l.qty)}x {name}
                </span>
                <span className="loot-value">{fmt(l.value)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="small low">{tr('Desta vez não caiu nenhum item.', 'No items dropped this time.')}</p>
      )}
    </div>
  );
}

/** Item do depósito lado a lado com o que está equipado no mesmo espaço.
 *  Fica no painel, abaixo dos itens, e mostra o último item apontado: não some ao tirar o mouse,
 *  porque sumir/aparecer mudava a altura do painel e fazia o card piscar sem parar. */
function CompareCard(props: { id: string; equipment: Partial<Record<EquipSlot, string>> }) {
  const item = itemById(props.id)!;
  const eq = item.equip!;
  const curId = props.equipment[eq.slot];
  const cur = curId ? itemById(curId)?.equip : undefined;
  const fmt = (v: number, pct?: boolean) => (pct ? `${Math.round(v * 100)}%` : `${v}`);
  const rows = COMPARE_STATS.filter((st) => (eq[st.key] ?? 0) !== 0 || (cur?.[st.key] ?? 0) !== 0);
  return (
    <div className="compare-card">
      <div className="compare-head">
        <span style={{ color: rarityOf(props.id).color }}>{itemName(item.name)}</span>
        <span className="small">vs {curId ? itemName(itemById(curId)?.name ?? curId) : (getLang() === 'pt' ? 'nada equipado' : 'nothing equipped')}</span>
      </div>
      <table>
        <tbody>
          {rows.map((st) => {
            // Velocidade é guardada como intervalo (negativo = mais rápido): mostra invertida, +5% = bate 5% mais rápido.
            const sign = st.key === 'speed' ? -1 : 1;
            const a = sign * (eq[st.key] ?? 0);
            const b = sign * (cur?.[st.key] ?? 0);
            const d = a - b;
            const label =
              st.key === 'elementAttack'
                ? elementLabel(eq.element ?? cur?.element)
                : st.key === 'speed'
                  ? t('stat.attack_speed', 'Velocidade de ataque')
                  : t('stat.' + st.key, st.label);
            return (
              <tr key={st.key}>
                <td>{label}</td>
                <td>{fmt(a, st.pct)}</td>
                <td className="small">{fmt(b, st.pct)}</td>
                <td className={d > 0 ? 'loot-pos' : d < 0 ? 'loot-neg' : 'small'}>
                  {a === b ? '=' : `${a > b ? '+' : '−'}${fmt(Math.abs(a - b), st.pct)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="small">
        {t('common.level')} {eq.level}
        {eq.vocations ? ` · ${getLang() === 'pt' ? 'só' : 'only'} ${vocationNames(eq.vocations)}` : ''}
      </p>
    </div>
  );
}

export function itemTooltip(id: string, vocation?: string, combatLevel?: number): string {
  const item = itemById(id);
  if (!item) return id;
  const eq = item.equip;
  if (item.pouch) return `${itemName(item.name)} — ${t('pouch.click_to_open', 'clique para abrir')} (${item.pool?.map((w) => itemName(itemById(w)?.name ?? w)).join(', ')})`;
  if (eq) {
    const wrong = !!eq.vocations && !!vocation && !eq.vocations.includes(vocation);
    const low = combatLevel !== undefined && combatLevel < eq.level;
    return `${itemName(item.name)} — ${bonusText(eq)}${itemEffectText(item) ? `, ${itemEffectText(item)}` : ''}${wrong ? ` (${vocationNames(eq.vocations!)})` : low ? ` (${t('common.level')} ${eq.level})` : ''}`;
  }
  const effect = itemEffectText(item);
  return effect ? `${itemName(item.name)} — ${effect}` : itemName(item.name);
}

export function vocationNames(ids: string[]): string {
  const lang = getLang();
  return ids
    .map((id) => {
      const v = VOCATIONS.find((x) => x.id === id);
      if (lang === 'pt') return v?.name ?? id;
      if (id === 'warrior') return 'Warrior';
      if (id === 'hunter') return 'Hunter';
      if (id === 'arcanist') return 'Arcanist';
      if (id === 'devout') return 'Devout';
      return v?.name ?? id;
    })
    .join(', ');
}


// ── Equipamento ──────────────────────────────────────────────────────────────

/** O que do depósito cabe num espaço: os melhores primeiro, com a diferença para o equipado. */
function SlotPicker(props: {
  slot: EquipSlot;
  bank: Record<string, number>;
  equipment: PlayerState['equipment'];
  vocation: string;
  level: number;
  onEquip: (item: string) => void;
  onUnequip: () => void;
  onClose: () => void;
}) {
  const worn = props.equipment[props.slot];
  const fits = Object.entries(props.bank)
    .filter(([id, q]) => q > 0 && itemById(id)?.equip?.slot === props.slot)
    .map(([id]) => {
      const eq = itemById(id)!.equip!;
      const why = eq.vocations && !eq.vocations.includes(props.vocation as VocationId) ? tr('outra classe', 'other class') : eq.level > props.level ? `${tr('nível', 'level')} ${eq.level}` : null;
      return { id, why, score: gearScore(itemById(id)!) };
    })
    // Só o que dá para equipar agora (da classe e do nível).
    .filter((x) => !x.why)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  return (
    <div className="slot-picker">
      <div className="slot-picker-head">
        <strong>{t(`slot.${props.slot}`, props.slot)}</strong>
        {worn && (
          <button type="button" className="small-btn" onClick={props.onUnequip}>
            {tr('Desequipar', 'Unequip')}
          </button>
        )}
        <button type="button" className="close" onClick={props.onClose} aria-label={t('common.close')}>
          ×
        </button>
      </div>
      {fits.length === 0 ? (
        <p className="small muted">{tr('Nada no depósito que você possa usar neste espaço.', 'Nothing in the depot you can use in this slot.')}</p>
      ) : (
        <ul className="slot-picker-list">
          {fits.map(({ id, why }) => {
            const it = itemById(id)!;
            return (
              <li key={id} className={why ? 'dim' : ''}>
                <img className="icon" src={icon(it.icon)} alt="" />
                <span className="slot-picker-info">
                  <span style={{ color: splitRarity(id).tier > 0 ? rarityOf(id).color : undefined }}>
                    {itemName(it.name)} {!why && <UpgradeArrow v={upgradeVs(id, props.equipment as Partial<Record<EquipSlot, string>>)} />}
                  </span>
                  <StatDiff id={id} equipment={props.equipment as Partial<Record<EquipSlot, string>>} />
                </span>
                {why ? (
                  <span className="small muted">{why}</span>
                ) : (
                  <button type="button" className="primary small-btn" onClick={() => props.onEquip(id)}>
                    {tr('Equipar', 'Equip')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Monta o id com raridade e refino: ("iron_sword", 4, 7) = "iron_sword+4#7". */
const composeRarity = (base: string, tier: number, refine: number) => `${base}${tier > 0 ? `+${tier}` : ''}${refine > 0 ? `#${refine}` : ''}`;

/**
 * Simulador (ideia do Gioseppi, 26/10): escolhe raridade e refino das peças vestidas e compara nota, ataque,
 * defesa, vida e bônus de set com o que está vestido. Só na tela, não mexe nos itens.
 */
function EquipSimulator(props: {
  equipment: PlayerState['equipment'];
  vocation: Character['vocation'];
  combatXp: number;
  promotion: string | null;
  sigils?: (string | null)[];
  mastery?: MasteryState;
  combatPet?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sim, setSim] = useState<Partial<Record<EquipSlot, { tier: number; refine: number }>>>({});
  // Só as vagas cuja peça aceita raridade (capa e gema de profissão ficam como estão).
  const slots = EQUIP_SLOTS.map((s) => s.id).filter((slot) => {
    const id = props.equipment[slot];
    return !!id && !!itemById(composeRarity(splitRarity(id).base, 4, 5))?.equip;
  });
  const minTier = (base: string) => (itemById(base.replace(/^replica_/, ''))?.legendary ? 4 : 0);
  const cur = (slot: EquipSlot) => splitRarity(props.equipment[slot]!);
  const simEquipment = { ...props.equipment };
  for (const slot of slots) {
    const c = cur(slot);
    const s = sim[slot] ?? c;
    simEquipment[slot] = composeRarity(c.base, Math.max(minTier(c.base), s.tier), s.refine);
  }
  const summary = (eq: PlayerState['equipment']) => {
    const st = playerStats(props.vocation, props.combatXp, withCombatPet(withMastery(withSigils(equipmentBonus(eq), props.sigils), props.mastery?.nodes), props.combatPet), props.promotion);
    const sb = setQualityBonus(eq);
    return { score: gearPower(eq), attack: st.attack, defense: st.defense, hp: st.hp, ...sb };
  };
  if (slots.length === 0) return null;
  if (!open) {
    return (
      <p className="small" style={{ textAlign: 'center' }}>
        <button type="button" className="small-btn" onClick={() => setOpen(true)} title={tr('Veja como ficariam a nota e o bônus de set com outra raridade e refino, sem mexer nos itens.', 'See your gear score and set bonus with another rarity and refine, without changing your items.')}>
          {tr('Simular raridade e refino', 'Simulate rarity and refine')}
        </button>
      </p>
    );
  }
  const a = summary(props.equipment);
  const b = summary(simEquipment);
  const setAll = (tier: number, refine: number) => setSim(Object.fromEntries(slots.map((s) => [s, { tier, refine }])));
  const pct = (n: number) => `+${Math.round(n * 1000) / 10}%`;
  const row = (label: string, x: number, y: number, fmt: (n: number) => string = (n) => Math.round(n).toLocaleString('pt-BR')) => (
    <tr>
      <td>{label}</td>
      <td>{fmt(x)}</td>
      <td className={y > x ? 'loot-pos' : y < x ? 'loot-neg' : ''}>{fmt(y)}</td>
    </tr>
  );
  return (
    <div className="panel" style={{ padding: 8, margin: '6px 0' }}>
      <h4 style={{ margin: '0 0 6px' }}>
        {tr('Simulador de raridade e refino', 'Rarity and refine simulator')}{' '}
        <button type="button" className="small-btn" onClick={() => { setOpen(false); setSim({}); }}>{tr('Fechar', 'Close')}</button>
      </h4>
      <p className="small muted" style={{ margin: '0 0 6px' }}>{tr('Só uma simulação: seus itens não mudam.', 'Just a simulation: your items do not change.')}</p>
      <p className="small" style={{ margin: '0 0 6px' }}>
        {tr('Tudo em', 'Everything at')}:{' '}
        {[[4, 5], [4, 10], [5, 10], [6, 10], [7, 10]].map(([t, r]) => (
          <button key={`${t}-${r}`} type="button" className="small-btn" onClick={() => setAll(t, r)}>+{t}#{r}</button>
        ))}{' '}
        <button type="button" className="small-btn" onClick={() => setSim({})}>{tr('Como está', 'As worn')}</button>
      </p>
      <table className="small" style={{ width: '100%' }}>
        <tbody>
          {slots.map((slot) => {
            const c = cur(slot);
            const s = sim[slot] ?? c;
            const it = itemById(props.equipment[slot]!);
            const lo = minTier(c.base);
            return (
              <tr key={slot}>
                <td>{it ? itemName(it.name) : slot}</td>
                <td>
                  <select value={Math.max(lo, s.tier)} onChange={(e) => setSim({ ...sim, [slot]: { tier: Number(e.target.value), refine: s.refine } })}>
                    {RARITIES.filter((r) => r.tier >= lo).map((r) => <option key={r.tier} value={r.tier}>{r.name}</option>)}
                  </select>
                </td>
                <td>
                  <select value={s.refine} onChange={(e) => setSim({ ...sim, [slot]: { tier: s.tier, refine: Number(e.target.value) } })}>
                    {Array.from({ length: MAX_REFINE + 1 }, (_, k) => <option key={k} value={k}>#{k}</option>)}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <table className="small" style={{ width: '100%', marginTop: 6 }}>
        <thead>
          <tr><th></th><th>{tr('Agora', 'Now')}</th><th>{tr('Simulado', 'Simulated')}</th></tr>
        </thead>
        <tbody>
          {row(tr('Nota de equipamento', 'Gear score'), a.score, b.score)}
          {row(tr('Ataque', 'Attack'), a.attack, b.attack)}
          {row(tr('Defesa', 'Defense'), a.defense, b.defense)}
          {row(tr('Vida', 'HP'), a.hp, b.hp)}
          {row(tr('Set: dano', 'Set: damage'), a.attackPct, b.attackPct, pct)}
          {row(tr('Set: XP', 'Set: XP'), a.xpPct, b.xpPct, pct)}
          {row(tr('Set: loot', 'Set: loot'), a.lootPct, b.lootPct, pct)}
        </tbody>
      </table>
      <p className="small muted" style={{ margin: '6px 0 0' }}>{tr('O dano do set entra por cima do ataque mostrado. XP e loot do set só nas caçadas comuns.', 'Set damage applies on top of the attack shown. Set XP and loot only in regular hunts.')}</p>
    </div>
  );
}

function EquipmentPanel(props: {
  /** Sigilos nos espaços (somam ao bônus mostrado). */
  sigils?: (string | null)[];
  mastery?: MasteryState;
  /** Mascote de combate equipado (soma ao bônus mostrado). */
  combatPet?: string | null;
  vocation: Character['vocation'];
  combatXp: number;
  equipment: PlayerState['equipment'];
  look: Look;
  promotion: string | null;
  food: string | null;
  activeMeal?: { item: string; until: number } | null;
  bank: Record<string, number>;
  clockOffset: React.MutableRefObject<number>;
  onFood: (food: string | null) => void;
  onEatMeal: (item: string) => void;
  potion: string | null;
  onPotion: (potion: string | null) => void;
  manaPotion: string | null;
  onManaPotion: (manaPotion: string | null) => void;
  arrow?: string | null;
  onArrow?: (arrow: string | null) => void;
  runes: [string | null, string | null];
  onRune: (slot: 'attack' | 'heal', rune: string | null) => void;
  onUnequip: (slot: EquipSlot) => void;
  /** Equipa um item do depósito (lista ao clicar num espaço). */
  onEquip?: (item: string) => void;
  /** Abre a Aparência (traje, cores e addons). */
  onLook?: () => void;
  imbuements?: Record<string, number>;
}) {
  // Espaço clicado: mostra o que do depósito serve nele.
  const [pickSlot, setPickSlot] = useState<EquipSlot | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const meals = ITEMS.filter((i) => i.meal);
  const foods = ITEMS.filter((i) => i.food);
  const potions = ITEMS.filter((i) => i.potion);
  const manaPotions = ITEMS.filter((i) => i.manaPotion).sort((a, b) => (a.manaPotion ?? 0) - (b.manaPotion ?? 0));
  const arrows = ITEMS.filter((i) => i.arrow).sort((a, b) => (a.arrow?.mult ?? 1) - (b.arrow?.mult ?? 1));
  const attackRunes = ITEMS.filter((i) => i.rune && i.rune.kind === 'strike');
  const healRunes = ITEMS.filter((i) => i.rune?.kind === 'heal');
  const eqBonus = withCombatPet(withMastery(withSigils(equipmentBonus(props.equipment), props.sigils), props.mastery?.nodes), props.combatPet);
  const imbBonus = imbuementsBonus(props.imbuements ?? {});
  const bonus = mergeBonus(eqBonus, imbBonus);
  const stats = playerStats(props.vocation, props.combatXp, bonus, props.promotion);
  const activeImbuementsList = Object.entries(props.imbuements ?? {})
    .filter(([_, sec]) => sec > 0)
    .map(([id, sec]) => ({ def: IMBUEMENTS.find((i) => i.id === id), seconds: sec }))
    .filter((x): x is { def: (typeof IMBUEMENTS)[number]; seconds: number } => !!x.def);

  const serverNow = Date.now() + props.clockOffset.current;
  const activeMealItem = props.activeMeal && props.activeMeal.until > serverNow ? itemById(props.activeMeal.item) : null;
  const mealRemainingMs = props.activeMeal ? Math.max(0, props.activeMeal.until - serverNow) : 0;
  const mealMinutes = Math.floor(mealRemainingMs / 60000);
  const mealSeconds = Math.floor((mealRemainingMs % 60000) / 1000);
  const mealTimerStr = `${String(mealMinutes).padStart(2, '0')}:${String(mealSeconds).padStart(2, '0')}`;

  const mealBuffText = (m: NonNullable<Item['meal']>) => {
    switch (m.buff) {
      case 'combat_xp': return `+${Math.round(m.value * 100)}% XP ${getLang() === 'pt' ? 'de combate' : 'combat'}`;
      case 'rest_speed': return `${getLang() === 'pt' ? 'descanso' : 'rest'} +${Math.round(m.value * 100)}% ${getLang() === 'pt' ? 'mais rápido' : 'faster'}`;
      case 'loot': return `+${Math.round(m.value * 100)}% loot`;
      case 'profession_xp': return `+${Math.round(m.value * 100)}% XP ${getLang() === 'pt' ? 'de profissão' : 'professions'}`;
      case 'stamina_cost': return `-${Math.round(m.value * 100)}% ${getLang() === 'pt' ? 'gasto de stamina' : 'stamina cost'}`;
      case 'crit_chance': return `+${Math.round(m.value * 100)}% ${getLang() === 'pt' ? 'chance de crítico' : 'crit chance'}`;
      case 'all_xp_loot': return `+${Math.round(m.value * 100)}% XP & +${Math.round(m.value * 100)}% loot`;
      default: return '';
    }
  };
  return (
    <section className="panel">
      <h3 className="equip-head">
        {t('panel.equipment', 'Equipamento')}
        {props.onLook && (
          <button type="button" className="small-btn" onClick={props.onLook} title={tr('Traje, cores e addons', 'Outfit, colors and addons')}>
            {tr('Aparência', 'Appearance')}
          </button>
        )}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 12px' }}>
        <Sprite vocation={props.vocation} look={props.look} equipment={props.equipment} acting scale={3} />
      </div>
      {fullSets(props.equipment).length > 0 && (
        <p className="small set-bonus" title={tr('Elmo, armadura, calças e botas do mesmo set', 'Helmet, armor, legs and boots from the same set')}>
          ✦ {tr('Set completo', 'Full set')}: +{Math.round(SET_BONUS * 100)}% {tr('ataque, defesa e vida', 'attack, defense and HP')}
        </p>
      )}
      <p
        className="small gear-power"
        title={tr(
          `Média das 10 vagas: nível da peça × raridade × refino (vaga vazia vale 0). Do nível ${GEAR_REQ.lowFrom} em diante cada caçada pede uma nota; abaixo dela os monstros batem mais e aguentam mais.`,
          `Average of the 10 slots: item level × rarity × refine (empty slot = 0). From level ${GEAR_REQ.lowFrom} on each hunt asks for a score; below it monsters hit harder and take less damage.`,
        )}
      >
        {tr('Nota de equipamento', 'Gear score')}: <b>{gearPower(props.equipment ?? {})}</b>
      </p>
      {/* Bônus de set pela qualidade (raridade e refino): o que vale agora com o que está vestido. */}
      {(() => {
        const sb = setQualityBonus(props.equipment ?? {});
        const pct = (n: number) => `+${Math.round(n * 1000) / 10}%`;
        return (
          <p
            className="small gear-power"
            title={tr(
              'Bônus de set: elmo, armadura, calças e botas do mesmo set (ou amuleto, anel, botas e elmo do Usurpador). 2 peças dão dano; o set completo dá dano, XP e loot. Cresce com a raridade e o refino: abaixo de Lendária (+4) ou de refino #5 quase nada; com tudo +4#10: +60% de dano, +10% de XP e +15% de loot; com tudo +7#10: +120%, +20% e +30%. XP e loot só nas caçadas comuns.',
              'Set bonus: helmet, armor, legs and boots of the same set (or the Usurper amulet, ring, boots and helmet). 2 pieces give damage; the full set gives damage, XP and loot. It grows with rarity and refine: below Legendary (+4) or refine #5 almost nothing; all +4#10: +60% damage, +10% XP and +15% loot; all +7#10: +120%, +20% and +30%. XP and loot only in regular hunts.',
            )}
          >
            {tr('Bônus de set', 'Set bonus')}:{' '}
            {sb.attackPct > 0 ? (
              <b className="loot-pos">
                {pct(sb.attackPct)} {tr('de dano', 'damage')}
                {sb.xpPct > 0 ? ` · ${pct(sb.xpPct)} XP` : ''}
                {sb.lootPct > 0 ? ` · ${pct(sb.lootPct)} loot` : ''}
              </b>
            ) : (
              <span className="muted">{tr('nenhum (vista 2 ou mais peças do mesmo set)', 'none (wear 2 or more pieces of the same set)')}</span>
            )}
          </p>
        );
      })()}
      <EquipSimulator
        equipment={props.equipment ?? {}}
        vocation={props.vocation}
        combatXp={props.combatXp}
        promotion={props.promotion}
        sigils={props.sigils}
        mastery={props.mastery}
        combatPet={props.combatPet}
      />
      <div className="tibia-doll-container">
        <div className="tibia-doll-grid">
          {/* Linha 1: Amuleto | Elmo | (vazio) */}
          {(() => {
            const renderSlot = (slotId: EquipSlot, defaultName: string) => {
              const id = props.equipment[slotId];
              const item = id ? itemById(id) : undefined;
              return (
                <button
                  key={slotId}
                  className={`slot tibia-slot slot-${slotId} ${item ? '' : 'empty'}`}
                  style={id ? rarityStyle(id) : undefined}
                  aria-pressed={pickSlot === slotId}
                  title={item ? `${itemName(item.name)} — ${bonusText(item.equip ?? {})}${itemEffectText(item) ? `, ${itemEffectText(item)}` : ''}${getLang() === 'pt' ? ' · clique para trocar ou desequipar' : ' · click to swap or unequip'}` : `${t(`slot.${slotId}`, defaultName)}${getLang() === 'pt' ? ' · clique para ver o que serve' : ' · click to see what fits'}`}
                  onClick={() => setPickSlot(pickSlot === slotId ? null : slotId)}
                >
                  {item ? (
                    <>
                      <img className="icon" src={icon(item.icon)} alt={itemName(item.name)} />
                      {id && spellGemTierOf(id) > 0 && <span className={`gem-tier-badge slot-gem-tier tier-${spellGemTierOf(id)}`}>{['', 'I', 'II', 'III'][spellGemTierOf(id)]}</span>}
                    </>
                  ) : (
                    <span className="slot-placeholder">{t(`slot.${slotId}`, defaultName)}</span>
                  )}
                </button>
              );
            };

            return (
              <>
                <div className="doll-cell">{renderSlot('amulet', 'Amuleto')}</div>
                <div className="doll-cell">{renderSlot('helmet', 'Elmo')}</div>
                <div className="doll-cell">{renderSlot('cape', 'Capa')}</div>

                {/* Linha 2: Arma | Armadura | Escudo */}
                <div className="doll-cell">{renderSlot('weapon', 'Arma')}</div>
                <div className="doll-cell">{renderSlot('armor', 'Armadura')}</div>
                <div className="doll-cell">{renderSlot('shield', 'Escudo')}</div>

                {/* Linha 3: Anel | Calças | (vazio) */}
                <div className="doll-cell">{renderSlot('ring', 'Anel')}</div>
                <div className="doll-cell">{renderSlot('legs', 'Calças')}</div>
                <div className="doll-cell">{renderSlot('gem', 'Gema')}</div>

                {/* Linha 4: (vazio) | Botas | (vazio) */}
                <div className="doll-cell doll-empty-cell" />
                <div className="doll-cell">{renderSlot('boots', 'Botas')}</div>
                <div className="doll-cell doll-empty-cell" />
              </>
            );
          })()}
        </div>
      </div>
      {pickSlot && (
        <SlotPicker
          slot={pickSlot}
          bank={props.bank}
          equipment={props.equipment}
          vocation={props.vocation}
          level={levelForXp(props.combatXp, 'combat')}
          onEquip={(item) => {
            props.onEquip?.(item);
            setPickSlot(null);
          }}
          onUnequip={() => {
            props.onUnequip(pickSlot);
            setPickSlot(null);
          }}
          onClose={() => setPickSlot(null)}
        />
      )}
      <dl className="stats-grid">
        <dt>{t('stat.attack')}</dt>
        <dd>
          {Math.round(stats.attack)} {bonus.attack ? <span className="bonus">(+{Math.round(bonus.attack)})</span> : null}
        </dd>
        <dt>{t('stat.defense')}</dt>
        <dd>
          {Math.round(stats.defense)} {bonus.defense ? <span className="bonus">(+{Math.round(bonus.defense)})</span> : null}
        </dd>
        <dt>{t('stat.hp')}</dt>
        <dd>
          {Math.round(stats.hp)} {bonus.hp ? <span className="bonus">(+{Math.round(bonus.hp)})</span> : null}
        </dd>
        <dt>{t('stat.crit')}</dt>
        <dd>{Math.round((stats.critChance ?? 0) * 100)}%</dd>
        <dt>{t('stat.speed')}</dt>
        <dd>{((stats.attackSpeedMs) / 1000).toFixed(2)}s</dd>
        {!!stats.lifesteal && (
          <>
            <dt>{t('stat.lifesteal')}</dt>
            <dd>{Math.round(stats.lifesteal * 100)}%</dd>
          </>
        )}
        <dt>{t('stat.mana')}</dt>
        <dd>
          {Math.round(stats.mana)} {stats.manaRegen ? <span className="bonus">(+{Number(stats.manaRegen.toFixed(1)).toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US')}/s)</span> : null}
        </dd>
        {!!stats.reduction && (
          <>
            <dt>{tr('Redução de dano', 'Damage reduction')}</dt>
            <dd>{Math.round(stats.reduction * 100)}%</dd>
          </>
        )}
        {ELEMENT_LIST.filter((el) => stats.resistPct?.[el]).map((el) => (
          <Fragment key={el}>
            <dt>{tr('Resist.', 'Res.')} {elementLabel(el).toLowerCase()}</dt>
            <dd>{Math.round((stats.resistPct![el] ?? 0) * 100)}%</dd>
          </Fragment>
        ))}
      </dl>
      {activeImbuementsList.length > 0 && (
        <div style={{ margin: '8px 0', padding: '6px 8px', background: 'rgba(255, 240, 210, 0.4)', borderRadius: 6, border: '1px solid #8a6a48' }}>
          <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Encantamentos ativos:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeImbuementsList.map(({ def, seconds }) => (
              <span key={def.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', background: '#3a2717', color: '#ffea88', padding: '2px 6px', borderRadius: 4 }}>
                <img className="icon tiny" src={icon(def.icon)} alt="" />
                {def.name} ({Math.ceil(seconds / 60)}m)
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Resumo do efeito da runa, para as listas. */
export const runeText = (r: RuneEffect) => {
  const lang = getLang();
  if (r.kind === 'heal') {
    return lang === 'pt'
      ? `cura ${Math.round(r.pct * 100)}% abaixo de ${Math.round(r.below * 100)}% da vida`
      : `heals ${Math.round(r.pct * 100)}% below ${Math.round(r.below * 100)}% HP`;
  }
  return lang === 'pt'
    ? `${r.mult.toLocaleString('pt-BR')}× o dano${r.area ? ' em todos' : ''}`
    : `${r.mult.toLocaleString('en-US')}× damage${r.area ? ' to all' : ''}`;
};

const potionText = (p: { attack?: number; defense?: number }) => {
  const lang = getLang();
  if (lang === 'pt') {
    return [p.attack ? `+${Math.round(p.attack * 100)}% ataque` : '', p.defense ? `+${Math.round(p.defense * 100)}% defesa` : '']
      .filter(Boolean)
      .join(', ');
  }
  return [p.attack ? `+${Math.round(p.attack * 100)}% attack` : '', p.defense ? `+${Math.round(p.defense * 100)}% defense` : '']
    .filter(Boolean)
    .join(', ');
};

export function bonusText(b: Partial<Bonus>): string {
  const lang = getLang();
  const pct = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;
  const parts: string[] = [];
  if (b.attack) parts.push(`+${b.attack} ${lang === 'pt' ? 'ataque' : 'attack'}`);
  if (b.element && b.elementAttack) parts.push(`+${b.elementAttack} ${elementLabel(b.element)}`);
  if (b.defense) parts.push(`+${b.defense} ${lang === 'pt' ? 'defesa' : 'defense'}`);
  if (b.hp) parts.push(`+${b.hp} ${lang === 'pt' ? 'vida' : 'health'}`);
  if (b.crit) parts.push(`+${pct(b.crit)} ${lang === 'pt' ? 'crítico' : 'critical'}`);
  if (b.lifesteal) parts.push(`${pct(b.lifesteal)} ${lang === 'pt' ? 'roubo de vida' : 'life steal'}`);
  if (b.speed) parts.push(b.speed > 0 ? (lang === 'pt' ? `${pct(b.speed)} mais lento` : `${pct(b.speed)} slower`) : (lang === 'pt' ? `${pct(b.speed)} mais rápido` : `${pct(b.speed)} faster`));
  if (b.regen) parts.push(`+${pct(b.regen)} ${lang === 'pt' ? 'regeneração' : 'regen'}`);
  if (b.mana) parts.push(`+${pct(b.mana)} mana`);
  if (b.reduction) parts.push(`-${pct(b.reduction)} ${lang === 'pt' ? 'de dano recebido' : 'damage taken'}`);
  if (b.arrowSave) parts.push(`${pct(b.arrowSave)} ${lang === 'pt' ? 'de chance de recuperar a flecha' : 'chance to recover the arrow'}`);
  for (const el of ELEMENT_LIST) {
    const v = b[RESIST_KEY[el]];
    if (v) parts.push(`+${pct(v)} ${lang === 'pt' ? 'resistência a' : 'resistance to'} ${elementLabel(el).toLowerCase()}`);
  }
  const gemSpell = b.spellGem ? spellById(b.spellGem) : undefined;
  if (gemSpell) {
    const [pt, en] = spellGemText(gemSpell.effect.kind, b.spellGemPower ?? 1);
    parts.push(lang === 'pt' ? `${t(`spell.${gemSpell.id}.name`, gemSpell.name)}: ${pt} (na barra de ação)` : `${t(`spell.${gemSpell.id}.name`, gemSpell.name)}: ${en} (on the action bar)`);
  }
  return parts.join(', ');
}

// ── Promoção ─────────────────────────────────────────────────────────────────

/** Escolha da promoção: Nível 30 (Tier 1) ou Ascensão de Elite Nível 70 (Tier 2). */
function PromotionPicker(props: {
  vocation: Character['vocation'];
  currentPromotion?: string | null;
  combatLevel: number;
  stories?: StoryState[];
  onPick: (id: string) => void;
  onStory: (story: string, choice: number) => void;
  /** Entra direto na provação da ascensão (a mesma do painel de Quests). */
  onStartTrial?: (arenaId: string) => void;
  onClose: () => void;
}) {
  const currentPromo = promotionById(props.currentPromotion);
  // Já promovido: a próxima é a ascensão do mesmo caminho (tier 2 no 70, tier 3 no 100).
  const ascNext = currentPromo ? nextPromotionFor(props.currentPromotion) : undefined;
  const isTier2 = !!currentPromo && !!ascNext;
  const nextPromo = isTier2 ? ascNext! : null;
  const nextTier = nextPromo?.tier ?? 2;
  const tier3 = nextTier >= 3;
  const ascId = ASCENSION_STORY[nextTier] ?? ASCENSION_STORY[2];
  const ult = nextPromo ? ultimateFor(nextPromo.id) : undefined;
  const availableT1 = promotionsFor(props.vocation, 1);
  const [chosen, setChosen] = useState<string | null>(() => {
    if (isTier2 && nextPromo) return nextPromo.id;
    return availableT1[0]?.id ?? null;
  });

  // Estado da quest de ascensão
  const ascStory = storyById(ascId);
  const ascState = props.stories?.find((s) => s.id === ascId);
  const ascDone = ascState?.status === 'done';
  const ascActive = ascState?.status === 'active';
  const ascProgress = ascState?.progress ?? 0;
  // Passo atual da provação (a do 100 tem mais de um: abates e depois a provação na arena).
  const ascStep = ascStory?.steps[Math.max(1, ascState?.step ?? 1)];
  const ascGoal = ascStep?.need?.goal;
  const ascTarget = ascGoal && 'count' in ascGoal ? ascGoal.count : 30;
  const canAscend = isTier2 && ascDone;

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('promo.title')}>
        <header className="picker-head">
          <div>
            <h3 style={{ margin: 0 }}>{t('promo.title')}</h3>
            <span className="small" style={{ color: isTier2 ? '#ffea88' : '#7dd96b' }}>
              {isTier2 ? t(nextTier === 4 ? 'promo.subtitle_t4' : tier3 ? 'promo.subtitle_t3' : 'promo.subtitle_t2') : t('promo.subtitle_t1')}
            </span>
          </div>
          <button type="button" className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>

        {isTier2 && nextPromo ? (
          <div style={{ marginTop: 12 }}>
            <ul className="promo-list">
              <li>
                <div className="promo on" style={{ cursor: 'default' }}>
                  <strong>{t(`voc.${nextPromo.id}`, nextPromo.name)}</strong>
                  <span className="small">{t('promo.master')}: {nextPromo.master}</span>
                  <span className="small" style={{ color: '#ffea88' }}>
                    {t('promo.requires')}: {t(`voc.${currentPromo.id}`, currentPromo.name)}
                  </span>
                  <p style={{ margin: '6px 0 0' }}>{storyText(nextPromo.description)}</p>
                  {ult && (
                    <p className="small" style={{ margin: '6px 0 0', color: '#ffea88' }}>
                      <b>Ultimate · {t(`spell.${ult.id}.name`, ult.name)}:</b> {t(`spell.${ult.id}.desc`, ult.description)} ({tr(`a cada ${ult.cooldownMs / 1000}s, sozinha, fora da barra e sem mana`, `every ${ult.cooldownMs / 1000}s, by itself, outside the bar and free`)})
                    </p>
                  )}
                </div>
              </li>
            </ul>

            <div className="quest-track" style={{ marginTop: 14, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#ffea88' }}><Pix name="steel_sword" /> {t(nextTier === 4 ? 'promo.quest_label_t4' : tier3 ? 'promo.quest_label_t3' : 'promo.quest_label')}</strong>
                <span className="small" style={{ color: ascDone ? '#7dd96b' : '#c0b49d' }}>
                  {ascDone ? tr('✓ Concluída', '✓ Completed') : ascActive ? `${ascProgress}/${ascTarget}` : tr('Não iniciada', 'Not started')}
                </span>
              </div>
              <p className="small" style={{ margin: '6px 0 8px' }}>
                {storyText(ascStep?.need?.text ?? 'Derrote 30 criaturas demoníacas ou golens (Minas de Enxofre / Fendas Demoníacas)')}
                {ascGoal?.kind === 'trial' && !ascDone && ascProgress < 1 && (
                  props.onStartTrial ? (
                    <button className="primary small-btn" style={{ display: 'block', marginTop: 6 }} onClick={() => props.onStartTrial!(ascGoal.arena)}>
                      <Pix name="steel_sword" /> {tr('Entrar na provação', 'Enter the trial')}: {arenaLabel(ascGoal.arena)}
                    </button>
                  ) : (
                    <span className="small" style={{ display: 'block', marginTop: 4 }}>{tr('Entre na provação pelo painel de Quests.', 'Enter the trial from the Quests panel.')}</span>
                  )
                )}
              </p>

              {ascActive && !ascDone && (
                <div className="progress-bar" style={{ height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    className="progress-fill"
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.floor((ascProgress / ascTarget) * 100))}%`,
                      background: ascProgress >= ascTarget ? '#7dd96b' : 'var(--gold)',
                    }}
                  />
                </div>
              )}

              {!ascState && (
                <button
                  type="button"
                  className="primary small-btn"
                  style={{ marginTop: 8, width: '100%' }}
                  onClick={() => props.onStory(ascId, 0)}
                >
                  {nextTier === 4 ? tr('Iniciar Provação dos Mitos', 'Start Trial of Myths') : tier3 ? tr('Iniciar Provação das Lendas', 'Start Trial of Legends') : t('promo.start_trial')}
                </button>
              )}

              {ascActive && ascProgress >= ascTarget && !ascDone && (
                <button
                  type="button"
                  className="primary small-btn"
                  style={{ marginTop: 8, width: '100%' }}
                  onClick={() => props.onStory(ascId, 0)}
                >
                  {t('promo.trial_ready')}
                </button>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="primary"
                style={{ width: '100%', padding: '10px' }}
                disabled={!canAscend}
                onClick={() => props.onPick(nextPromo.id)}
              >
                {canAscend
                  ? `${t('promo.ascend_btn')} ${t(`voc.${nextPromo.id}`, nextPromo.name)}!`
                  : tr('Complete a Provação para Ascender', 'Complete the Trial to Ascend')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <ul className="promo-list">
              {availableT1.map((p) => (
                <li key={p.id}>
                  <button type="button" className={`promo ${chosen === p.id ? 'on' : ''}`} onClick={() => setChosen(p.id)}>
                    <strong>{t(`voc.${p.id}`, p.name)}</strong>
                    <span className="small">{t('promo.master')}: {p.master}</span>
                    <span>{storyText(p.description)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="primary"
              style={{ marginTop: 12, width: '100%' }}
              disabled={!chosen}
              onClick={() => chosen && props.onPick(chosen)}
            >
              {chosen
                ? `${t('promo.become_btn')} ${t(`voc.${chosen}`, promotionById(chosen)?.name ?? '')}`
                : t('promo.title')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Forja ────────────────────────────────────────────────────────────────────

/** Tier da Gema de Combate pelo id (1 = Gema, 2 = Gema Lapidada, 3 = Gema Perfeita; 0 se não for gema). */
function spellGemTierOf(id: string): 1 | 2 | 3 | 0 {
  const base = splitRarity(id).base;
  if (base.startsWith('spellgem3_')) return 3;
  if (base.startsWith('spellgem2_')) return 2;
  if (base.startsWith('spellgem_')) return 1;
  return 0;
}

/** Abas da lista de receitas, na ordem em que aparecem. */
const RECIPE_CATEGORIES = [
  { id: 'bars', pt: 'Barras', en: 'Bars' },
  { id: 'swords', pt: 'Espadas e machados', en: 'Swords & axes' },
  { id: 'maces', pt: 'Maças', en: 'Maces' },
  { id: 'bows', pt: 'Arcos e bestas', en: 'Bows & crossbows' },
  { id: 'staves', pt: 'Cajados', en: 'Staves' },
  { id: 'plate', pt: 'Placa', en: 'Plate' },
  { id: 'holy', pt: 'Vestes sagradas', en: 'Holy vestments' },
  { id: 'leather', pt: 'Couro', en: 'Leather' },
  { id: 'robes', pt: 'Mantos', en: 'Robes' },
  { id: 'boots', pt: 'Botas', en: 'Boots' },
  { id: 'shields', pt: 'Escudos', en: 'Shields' },
  { id: 'spellbooks', pt: 'Grimórios', en: 'Spellbooks' },
  { id: 'rings', pt: 'Anéis', en: 'Rings' },
  { id: 'amulets', pt: 'Amuletos', en: 'Amulets' },
  { id: 'capes', pt: 'Capas', en: 'Capes' },
  { id: 'spellgems', pt: 'Gemas de Combate', en: 'Combat Gems' },
  { id: 'shafts', pt: 'Hastes', en: 'Shafts' },
  { id: 'arrows', pt: 'Flechas', en: 'Arrows' },
  { id: 'dishes', pt: 'Pratos', en: 'Dishes' },
  { id: 'potions', pt: 'Poções', en: 'Potions' },
  { id: 'keys', pt: 'Chaves', en: 'Keys' },
  { id: 'other', pt: 'Outros', en: 'Other' },
] as const;

/** Em que aba a receita fica, pelo item que ela produz. */
function recipeCategory(r: { output: string }): string {
  const out = itemById(r.output);
  if (!out) return 'other';
  const eq = out.equip;
  const voc = eq?.vocations ?? [];
  if (eq) {
    if (eq.slot === 'weapon') return voc.includes('hunter') ? 'bows' : voc.includes('arcanist') ? 'staves' : voc.includes('devout') && !voc.includes('warrior') ? 'maces' : 'swords';
    // Grimório (Arcanista e Devoto) tem aba própria.
    if (eq.slot === 'shield') return out.id.endsWith('_spellbook') ? 'spellbooks' : 'shields';
    if (eq.slot === 'ring') return 'rings';
    if (eq.slot === 'amulet') return 'amulets';
    if (eq.slot === 'cape') return 'capes';
    if (eq.slot === 'gem') return 'spellgems';
    if (!voc.length) return 'boots';
    if (voc.includes('hunter')) return 'leather';
    if (voc.includes('arcanist')) return 'robes';
    if (voc.length === 1 && voc[0] === 'devout') return 'holy';
    return 'plate';
  }
  if (r.output.endsWith('_bar')) return 'bars';
  if (r.output === 'arrow_shaft') return 'shafts';
  if (out.arrow) return 'arrows';
  if (out.meal) return 'dishes';
  if (out.food || out.manaPotion || out.potion) return 'potions';
  if (r.output.endsWith('_key') || out.name.startsWith('Chave')) return 'keys';
  return 'other';
}

function ProducePanel(props: {
  skill: ProductionSkillId;
  state: PlayerState | null;
  clockOffset: React.MutableRefObject<number>;
  onStart: (recipe: string) => void;
  onQueue?: (recipe: string) => void;
  onStop: () => void;
  onSigil?: (slot: number, item: string | null) => void;
  sortMode?: ProfSortMode;
  onSortChange?: (mode: ProfSortMode) => void;
  onlyDoable?: boolean;
  onOnlyDoableChange?: (only: boolean) => void;
}) {
  const { state } = props;
  const bank = state?.bank ?? {};
  const level = levelForXp(state?.skills[props.skill] ?? 0, props.skill);
  const activity = state?.activity?.skill === props.skill ? state.activity : null;
  const [showAll, setShowAll] = useState(false);
  const [localSort, setLocalSort] = useState<ProfSortMode>(loadProfSort);
  const [localDoable, setLocalDoable] = useState<boolean>(loadProfOnlyDoable);

  const sortMode = props.sortMode ?? localSort;
  const setSortMode = props.onSortChange ?? ((m) => { setLocalSort(m); saveProfSort(m); });
  const onlyDoable = props.onlyDoable ?? localDoable;
  const setOnlyDoable = props.onOnlyDoableChange ?? ((d) => { setLocalDoable(d); saveProfOnlyDoable(d); });

  // Abas por tipo do que a receita faz (arcos, cajados, placa, joias...); só aparecem com 2 ou mais.
  const [cat, setCat] = useState<string>(() => (props.skill === 'jewelcrafting' ? 'rings' : 'all'));
  const [gemClass, setGemClass] = useState<string>('all');
  useEffect(() => {
    setCat(props.skill === 'jewelcrafting' ? 'rings' : 'all');
    setGemClass('all');
  }, [props.skill]);
  const recipes = RECIPES[props.skill];
  const cats = RECIPE_CATEGORIES.filter((c) => recipes.some((r) => recipeCategory(r) === c.id));
  const activeCat = props.skill === 'jewelcrafting' && cat === 'all' ? 'rings' : cat;
  const inCat = (activeCat === 'all' ? [...recipes] : recipes.filter((r) => {
    if (recipeCategory(r) !== activeCat) return false;
    if (activeCat === 'spellgems' && gemClass !== 'all') {
      return itemById(r.output)?.equip?.vocations?.includes(gemClass) ?? false;
    }
    return true;
  }));

  const filtered = onlyDoable
    ? inCat.filter((r) => {
        if (r.level > level) return false;
        const missingKills = state ? killsMissing(r, state.bestiary) : 0;
        const can = missingKills > 0 ? 0 : craftableCount(r, bank);
        return can > 0;
      })
    : inCat;

  const visible = onlyDoable || showAll
    ? filtered
    : (() => {
        const lockedList = filtered.filter((r) => r.level > level).sort((a, b) => a.level - b.level).slice(0, PREVIEW);
        const unlockedList = filtered.filter((r) => r.level <= level);
        return [...unlockedList, ...lockedList];
      })();

  const unlocked = visible.filter((r) => r.level <= level);
  const locked = visible.filter((r) => r.level > level).sort((a, b) => a.level - b.level);

  const sortedUnlocked = [...unlocked].sort((a, b) => {
    if (sortMode === 'xph') {
      const diff = recipeXpH(b, props.skill, state) - recipeXpH(a, props.skill, state);
      if (diff !== 0) return diff;
      return b.level - a.level;
    }
    if (sortMode === 'level') {
      return b.level - a.level;
    }
    return a.level - b.level;
  });

  const sorted = [...sortedUnlocked, ...locked];

  return (
    <section className="panel">
      <h3>
        {skillName(props.skill)} <BoostedSkillChip skill={props.skill} />
      </h3>
      {state && <ProfGearBox skill={props.skill} state={state} />}
      {props.skill === 'sigilism' && state && props.onSigil && <SigilSlots state={state} onSigil={props.onSigil} />}
      {activity && (
        <ActivityView
          activity={activity}
          clockOffset={props.clockOffset}
          onStop={props.onStop}
          intervalMs={recipeById(props.skill, activity.node) ? productionIntervalMs(recipeById(props.skill, activity.node)!, productionSpeed(props.skill, activity.node, state?.skills[props.skill] ?? 0, guildBonus(state?.guildPoints) + artisanKitBonus(state))) : undefined}
        />
      )}
      <div className="prof-controls-bar">
        {cats.length > 1 && (
          <div className="tabs recipe-tabs" role="tablist">
            {(props.skill === 'jewelcrafting' ? cats : [{ id: 'all', pt: 'Todas', en: 'All' }, ...cats]).map((c) => (
              <button key={c.id} role="tab" aria-selected={activeCat === c.id} className={`tab ${activeCat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
                {tr(c.pt, c.en)}
              </button>
            ))}
          </div>
        )}
        <div className="prof-sort-controls">
          <label className="prof-sort-label">
            <span>{tr('Ordenar:', 'Sort:')}</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as ProfSortMode)}
            >
              <option value="default">{tr('Padrão', 'Default')}</option>
              <option value="xph">{tr('Mais XP/h', 'Most XP/h')}</option>
              <option value="level">{tr('Nível', 'Level')}</option>
            </select>
          </label>
          <label className="prof-doable-label">
            <input
              type="checkbox"
              checked={onlyDoable}
              onChange={(e) => setOnlyDoable(e.target.checked)}
            />
            <span>{tr('Só o que dá para fazer', 'Only doable')}</span>
          </label>
        </div>
      </div>
      <ul className="nodes">
        {activeCat === 'spellgems' && (
          <li className="tabs recipe-tabs gem-class-tabs" role="tablist">
            {[
              { id: 'all', pt: 'Todas', en: 'All', icon: '' },
              { id: 'warrior', pt: 'Guerreiro', en: 'Warrior', icon: 'spellgem_warrior' },
              { id: 'hunter', pt: 'Caçador', en: 'Hunter', icon: 'spellgem_hunter' },
              { id: 'arcanist', pt: 'Arcanista', en: 'Arcanist', icon: 'spellgem_arcanist' },
              { id: 'devout', pt: 'Devoto', en: 'Devout', icon: 'spellgem_devout' },
            ].map((v) => (
              <button key={v.id} type="button" role="tab" aria-selected={gemClass === v.id} className={`tab ${gemClass === v.id ? 'on' : ''}`} onClick={() => setGemClass(v.id)}>
                {v.icon && <img className="icon tiny" src={icon(v.icon)} alt="" />} {tr(v.pt, v.en)}
              </button>
            ))}
          </li>
        )}
        {sorted.map((r) => {
          // Várias receitas do mesmo item (hastes de cada madeira): o nome diz de que material sai.
          const sameOutput = recipes.filter((o) => o.output === r.output).length > 1;
          const fromItem = sameOutput ? itemById(Object.keys(r.inputs)[0]) : undefined;
          const locked = level < r.level;
          const missingKills = state ? killsMissing(r, state.bestiary) : 0;
          const can = missingKills > 0 ? 0 : craftableCount(r, bank);
          const active = activity?.node === r.id;
          const out = itemById(r.output);
          const rName = (out ? itemName(out.name) : r.name) + (fromItem ? ` · ${itemName(fromItem.name)}` : '');
          return (
            <li key={r.id} className={`node ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}>
              {spellGemTierOf(r.output) > 0 ? (
                <span className={`gem-icon-wrap tier-${spellGemTierOf(r.output)}`} title={`Tier ${spellGemTierOf(r.output)}`}>
                  <img className="icon" src={icon(out?.icon ?? '')} alt="" title={out?.equip ? bonusText(out.equip) : (out ? itemName(out.name) : out?.name)} />
                  <span className={`gem-tier-badge tier-${spellGemTierOf(r.output)}`}>{['', 'I', 'II', 'III'][spellGemTierOf(r.output)]}</span>
                </span>
              ) : (
                <img className="icon" src={icon(out?.icon ?? '')} alt="" title={out?.equip ? bonusText(out.equip) : (out ? itemName(out.name) : out?.name)} />
              )}
              <div className="node-info">
                <strong>{rName}{r.outputQty && r.outputQty > 1 ? ` (×${r.outputQty})` : ''}{out?.equip && state && <> <UpgradeArrow v={upgradeVs(r.output, state.equipment ?? {})} /></>}</strong>
                {(() => {
                  const sp = productionSpeed(props.skill, r.id, state?.skills[props.skill] ?? 0, guildBonus(state?.guildPoints) + artisanKitBonus(state));
                  const xp = Math.round(r.xp * professionXpBoost(r.level) * dayMult(props.skill) * profXpExtra(state, props.skill));
                  const ms = productionIntervalMs(r, sp);
                  return (
                    <span className="small">
                      {t('common.level')} {r.level} · {xp} XP {getLang() === 'pt' ? 'a cada' : 'every'} {+(ms / 1000).toFixed(2)}s ·{' '}
                      <span className={sp > 0 ? 'loot-pos' : ''}>{tr('velocidade', 'speed')} +{Math.round(sp * 100)}%</span> · ~{recipeXpH(r, props.skill, state).toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US')} XP/h
                      {!locked && can > 0 && (
                        <span title={tr('Com o material que você tem no banco agora', 'With the materials in your bank right now')}>
                          {' '}· {tr('material para', 'materials for')} ~{fmtDuration(can * ms)}
                        </span>
                      )}
                    </span>
                  );
                })()}
                <span className="small inputs">
                  {Object.entries(r.inputs).map(([id, qty]) => {
                    const it = itemById(id);
                    const have = bank[id] ?? 0;
                    return (
                      <span key={id} className={have >= qty ? '' : 'missing'} title={`${it ? itemName(it.name) : id}: ${have}/${qty}`}>
                        <img className="icon tiny" src={icon(it?.icon ?? '')} alt={it ? itemName(it.name) : id} />
                        {spellGemTierOf(id) > 0 && <b className={`gem-input-tier tier-${spellGemTierOf(id)}`}>T{spellGemTierOf(id)} </b>}
                        {have}/{qty}
                      </span>
                    );
                  })}
                </span>
                {!out?.equip && itemEffectText(out) && <span className="small loot-pos">{itemEffectText(out)}</span>}
                {out?.equip && state && <StatDiff id={r.output} equipment={state.equipment ?? {}} />}
                {r.kills && (
                  <span className={`small ${missingKills > 0 ? 'missing' : 'loot-pos'}`}>
                    {tr('Eco', 'Echo')}: {monsterById(r.kills.monster)?.name ?? r.kills.monster}{' '}
                    {Math.min(r.kills.count, state?.bestiary[r.kills.monster] ?? 0)}/{r.kills.count} {tr('abates', 'kills')}
                  </span>
                )}
              </div>
              <button
                className="primary small-btn"
                disabled={locked || active || can === 0 || !state}
                onClick={() => props.onStart(r.id)}
              >
                {locked ? `${t('common.level')} ${r.level}` : active ? t('verb.' + props.skill, VERB[props.skill]) : missingKills > 0 ? tr('Falta o eco', 'Need echo') : can === 0 ? t('act.no_material', 'Sem material') : `${t('act.' + props.skill, ACTION[props.skill])} (${can})`}
              </button>
              {!locked && props.onQueue && (
                <button className="small-btn" title={tr('Fazer depois da tarefa atual (o material pode vir de uma tarefa antes na fila)', 'Do after the current task (materials can come from an earlier queued task)')} onClick={() => props.onQueue!(r.id)}>
                  {tr('+ Fila', '+ Queue')}
                </button>
              )}
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="node small muted" style={{ padding: '16px', textAlign: 'center', justifyContent: 'center' }}>
            {onlyDoable ? tr('Nenhuma receita disponível para fazer agora.', 'No recipes available to make right now.') : tr('Nenhum item encontrado.', 'No items found.')}
          </li>
        )}
      </ul>
      {!onlyDoable && hiddenCount(inCat, level) > 0 && (
        <button className="link-btn small" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t('act.show_less', 'Mostrar menos') : `${t('act.show_all', 'Mostrar todas')} (+${hiddenCount(inCat, level)})`}
        </button>
      )}
    </section>
  );
}

/** Espaços de sigilo (1 no nível 1, 2 no 30, 3 no 60): escolhe um sigilo do depósito para cada um. */
function SigilSlots(props: { state: PlayerState; onSigil: (slot: number, item: string | null) => void }) {
  const { state } = props;
  const open = sigilSlots(state.skills.sigilism ?? 0);
  const placed = state.sigils ?? [];
  const owned = ITEMS.filter((i) => i.sigil && (state.bank[i.id] ?? 0) > 0);
  return (
    <div className="sigil-slots">
      <strong>{tr('Sigilos ativos', 'Active sigils')}</strong>
      {Array.from({ length: MAX_SIGILS }, (_, slot) => {
        const id = placed[slot] ?? null;
        const item = id ? itemById(id) : undefined;
        if (slot >= open) {
          return (
            <div key={slot} className="sigil-slot small muted">
              {tr(`Espaço ${slot + 1}: abre no nível ${SIGIL_SLOT_LEVELS[slot]}`, `Slot ${slot + 1}: opens at level ${SIGIL_SLOT_LEVELS[slot]}`)}
            </div>
          );
        }
        return (
          <div key={slot} className="sigil-slot">
            {item ? <img className="icon tiny" src={icon(item.icon)} alt="" /> : <span className="small muted">{slot + 1}.</span>}
            <select value={id ?? ''} onChange={(e) => props.onSigil(slot, e.target.value || null)}>
              <option value="">{tr('— vazio —', '— empty —')}</option>
              {item && (
                <option value={item.id}>
                  {itemName(item.name)} — {bonusText(item.sigil!)}
                </option>
              )}
              {owned
                .filter((i) => i.id !== id && !placed.includes(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {itemName(i.name)} — {bonusText(i.sigil!)} ({state.bank[i.id]})
                  </option>
                ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function OfflineSummary(props: { elapsedMs: number; gains: Gains; onClose: () => void }) {
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel modal" onClick={(e) => e.stopPropagation()}>
        <h3>{tr('Enquanto você estava fora', 'While you were away')}</h3>
        <p className="small muted">{tr('Com o jogo fechado, as primeiras 4 horas rendem a XP inteira; depois, 70% (até 12 horas).', 'While the game is closed, the first 4 hours give full XP; after that, 70% (up to 12 hours).')}</p>
        <p className="muted">{formatDuration(props.elapsedMs)}</p>
        <ul className="gains">
          {props.gains.death ? (
            <li className="danger">
              {tr(`Caiu para ${monsterById(props.gains.death.monster)?.name} e perdeu ${props.gains.death.xpLost} XP.`, `Fell to ${monsterById(props.gains.death.monster)?.name} and lost ${props.gains.death.xpLost} XP.`)}
              <DeathLoss itemsLost={props.gains.death.itemsLost} blessed={props.gains.death.blessed} />
            </li>
          ) : null}
          {props.gains.xp.combat !== undefined && props.gains.actions > 0 && (
            <li>{props.gains.actions} {tr('monstros abatidos', 'monsters slain')}</li>
          )}
          {Object.entries(props.gains.items).map(([id, qty]) => {
            const item = itemById(id);
            return (
              <li key={id}>
                <img className="icon" src={icon(item?.icon ?? '')} alt="" /> {qty > 0 ? `+${qty}` : qty} {itemName(item?.name ?? id)}
              </li>
            );
          })}
          {Object.entries(props.gains.xp).map(([skill, xp]) => (
            <li key={skill}>
              <img className="icon" src={icon(SKILLS.find((s) => s.id === skill)?.icon ?? '')} alt="" />{' '}
              {(xp ?? 0) >= 0 ? '+' : ''}
              {xp} {tr('XP de', 'XP in')} {skillName(skill as SkillId)}
            </li>
          ))}
        </ul>
        <button className="primary" onClick={props.onClose}>
          {tr('Continuar', 'Continue')}
        </button>
      </section>
    </div>
  );
}

function formatQty(n: number): string {
  if (n >= 1_000_000) return `${Math.floor(n / 100_000) / 10}M`;
  if (n >= 10_000) return `${Math.floor(n / 1000)}k`;
  return String(n);
}

/** Chefe global: a vida de todos, o tempo e o botão de entrar; fora do evento, quando é o próximo. */
function BossBar(props: { boss: BossView; clockOffset: React.MutableRefObject<number>; onJoin: () => void; onQueue: () => void; onUnqueue: () => void; history?: BossHistoryEntry[]; onOpen: (r: BossHistoryEntry) => void }) {
  const [, setTick] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const b = props.boss;
  const lang = getLang();
  const serverNow = Date.now() + props.clockOffset.current;
  const clock = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  const fmt = (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  // Os últimos resultados (o modal "X caiu!" sumia ao fechar): clicar reabre o resultado.
  const history = props.history?.length ? (
    <>
      <button className="small-btn" onClick={() => setShowHistory((v) => !v)} title={tr('Últimos resultados do chefe global', 'Last world boss results')}>
        {tr('Resultados', 'Results')} ({props.history.length})
      </button>
      {showHistory && (
        <ul className="boss-history small">
          {props.history.map((r) => (
            <li key={r.at + r.boss}>
              <button className="link" onClick={() => props.onOpen(r)}>
                {new Date(r.at).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {storyText(r.boss)} {r.killed ? tr('caiu', 'fell') : tr('fugiu', 'escaped')} · {fmt(r.damage)} {tr('de dano', 'damage')} · +{fmt(r.reward.xp)} XP
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  ) : null;
  if (!b.active) {
    return (
      <div className="boss-bar idle small">
        {t('topbar.next_boss')} <strong>{storyText(b.name)}</strong> {t('topbar.in')} {clock(b.startsAt - serverNow)}{' '}
        {/* Fila (5 min antes): continua no que estiver fazendo e vai para a arena quando ele nascer, mesmo offline. */}
        {b.canQueue &&
          (b.queued ? (
            <>
              <span className="loot-pos">{tr('Na fila: vai para a arena quando ele aparecer', 'Queued: you go to the arena when it appears')}</span>{' '}
              <button className="small-btn" onClick={props.onUnqueue}>{tr('Sair da fila', 'Leave queue')}</button>
            </>
          ) : (
            <button className="primary small-btn" onClick={props.onQueue} title={tr('Continua no que está fazendo e entra na luta na hora, mesmo com o jogo fechado.', 'Keep doing what you are doing and join the fight on time, even with the game closed.')}>
              {tr('Entrar na fila', 'Join queue')}
            </button>
          ))}{' '}
        {history}
      </div>
    );
  }
  return (
    <div className="boss-bar">
      <strong><Pix name="steel_sword" /> {storyText(b.name)}</strong>
      <div className="bar boss-hp">
        <div className="fill" style={{ width: `${(b.hp / b.maxHp) * 100}%` }} />
        {/* A vida em texto (antes só no tooltip, que não existe no celular). */}
        <span className="boss-hp-text">{fmt(b.hp)} / {fmt(b.maxHp)}</span>
      </div>
      {b.grew ? (
        <span className="small boss-grew">
          {tr(`+${b.grew} ${b.grew === 1 ? 'jogador entrou' : 'jogadores entraram'}, vida aumentada`, `+${b.grew} ${b.grew === 1 ? 'player joined' : 'players joined'}, HP raised`)}
        </span>
      ) : null}
      <span className="small">
        {b.fighting ?? b.fighters.length} {lang === 'pt' ? 'lutando' : 'fighting'} · {clock(b.endsAt - serverNow)}
      </span>
      {(() => {
        // Golpe próprio do chefe vindo ou acontecendo (mesmo relógio do servidor).
        const sk = bossSkillText(b.skills, b.startsAt, serverNow);
        // Só o Mímico Rei engole; os outros golpes de atordoar (Tentáculos, Investida...) mostram o próprio texto com a vítima.
        const swallow = b.swallowed && serverNow - b.swallowed.at < 4000 ? b.swallowed : null;
        const sw = swallow && (!swallow.skill || swallow.skill === 'swallow') ? swallow.name : null;
        // DOOM: a janela do IK aberta (contagem) ou o DOOM que acabou de cair.
        if (b.doom?.until && b.doom.until > serverNow) {
          return (
            <span className="boss-skill hit doom">
              {b.doom.stage === 0
                ? tr(`"VOCÊS NÃO PODEM MATAR O QUE JÁ ESTÁ MORTO!" DOOM em ${Math.ceil((b.doom.until - serverNow) / 1000)} s!`, `"YOU CANNOT KILL WHAT IS ALREADY DEAD!" DOOM in ${Math.ceil((b.doom.until - serverNow) / 1000)} s!`)
                : tr(`"VOCÊS NÃO PODEM MATAR O QUE JÁ ESTÁ MORTO!" IK em ${Math.ceil((b.doom.until - serverNow) / 1000)} s!`, `"YOU CANNOT KILL WHAT IS ALREADY DEAD!" IK in ${Math.ceil((b.doom.until - serverNow) / 1000)} s!`)}
            </span>
          );
        }
        if (b.doom?.at && serverNow - b.doom.at < 5000) {
          return <span className="boss-skill hit doom">{tr(`DOOM! (${b.doom.stage}/${b.doom.total})`, `DOOM! (${b.doom.stage}/${b.doom.total})`)}</span>;
        }
        if (!sk && !sw) return null;
        return (
          <span className={`boss-skill ${sk?.hit ? 'hit' : ''}`}>
            {sw ? tr(`O Mímico Rei engoliu ${sw}!`, `The Mimic King swallowed ${sw}!`) : sk ? `${storyText(sk.text)}${swallow?.name ? ` (${swallow.name})` : ''}` : null}
          </span>
        );
      })()}
      {b.joined ? (
        <span className="small">{lang === 'pt' ? 'Você está na luta' : 'In combat'}</span>
      ) : b.canJoin === false ? (
        <span className="small" style={{ color: '#ff8a6a' }}><Pix name="ui_lock" /> {lang === 'pt' ? 'Portal selado' : 'Portal sealed'}</span>
      ) : (
        <button className="primary small-btn" onClick={props.onJoin}>
          {lang === 'pt' ? 'Lutar' : 'Fight'}
        </button>
      )}
      {history}
    </div>
  );
}

/** Tarefas de caça ativas dos monstros desta caçada, como a linha do Slayer (" · Tarefa: Serpe 120/2600"). */
function huntingTaskLine(tasks: HuntingTaskState[] | undefined, monsters: string[]): string {
  const parts = (tasks ?? [])
    .filter((t) => t.status !== 'claimed')
    .map((t) => ({ t, def: huntingTaskById(t.id) }))
    .filter((x) => x.def && monsters.includes(x.def.monsterId))
    .map(({ t, def }) => (t.status === 'ready' || t.progress >= def!.killsRequired ? `${def!.monsterName} ${tr('pronta', 'ready')}` : `${def!.monsterName} ${t.progress}/${def!.killsRequired}`));
  return parts.length ? ` · ${tr('Tarefa', 'Task')}: ${parts.join(', ')}` : '';
}

function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}h ${min % 60}min` : `${min} min`;
}

function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** Troca de aparência (gênero, pele, cabelo e cores), com o personagem ao vivo. */
function AppearanceModal(props: {
  vocation: VocationId;
  look: Look;
  equipment?: Partial<Record<EquipSlot, string | null>>;
  unlockedAddons?: LookAddon[];
  unlockedOutfits?: OutfitId[];
  onSave: (look: Look) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(props.look);
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('Aparência', 'Appearance')}>
        <h3>{tr('Aparência', 'Appearance')}</h3>
        <LookEditor
          vocation={props.vocation}
          look={draft}
          equipment={props.equipment}
          unlockedAddons={props.unlockedAddons}
          unlockedOutfits={props.unlockedOutfits}
          onChange={setDraft}
        />
        <button className="primary" onClick={() => props.onSave(draft)}>
          {tr('Salvar', 'Save')}
        </button>
      </section>
    </div>
  );
}

/** Quests ativas com o progresso de agora. */
function activeQuests(state: PlayerState) {
  return state.quests
    .filter((q) => q.status === 'active')
    .map((q) => ({ state: q, quest: questById(q.id)! }))
    .filter((x) => x.quest)
    .map((x) => ({
      ...x,
      shown: questShown(x.quest, x.state, state.skills),
      target: questTarget(x.quest),
      done: questDone(x.quest, x.state, state.skills),
    }));
}

/** Nome da provação/arena no idioma atual. */
const arenaLabel = (id: string) => {
  const a = arenaById(id);
  return a ? t('arena.' + a.id + '.name', a.name) : id;
};

/** Bônus de XP das quests do nível de combate atual (o servidor paga com ele; ×3 até o 120). */
let questXpMult = 1;

const STOP_SEEN_KEY = 'grimhold.stopSeen';
const VOTE_SEEN_KEY = 'grimhold.voteSeen';

/** 5400000 → "1 h 30 min"; 600000 → "10 min". */
function fmtDuration(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;
}

function rewardText(r: Quest['reward'] | StoryEnding['reward']): string {
  const parts: string[] = [];
  const lang = getLang();
  if (r.gold) parts.push(`${r.gold} ${lang === 'pt' ? 'de ouro' : 'gold'}`);
  for (const [skill, raw] of Object.entries(r.xp ?? {})) {
    const sName = skillName(skill as SkillId);
    const xp = Math.round((raw ?? 0) * questXpMult).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
    parts.push(lang === 'pt' ? `${xp} XP de ${sName}` : `${xp} ${sName} XP`);
  }
  for (const [item, qty] of Object.entries(r.items ?? {})) {
    const raw = itemById(item)?.name ?? item;
    parts.push(`${qty}× ${itemName(raw)}`);
  }
  if ('addon' in r && r.addon) parts.push(`Addon: ${storyText(ADDON_NAMES[r.addon] ?? r.addon)}`);
  if ('outfit' in r && r.outfit) parts.push(`${tr('Traje', 'Outfit')}: ${storyText(OUTFIT_DEFS.find((o) => o.id === r.outfit)?.name ?? r.outfit)}`);
  return parts.join(', ');
}

/** Stamina: horas que faltam e quanto a XP da caçada rende agora (verde = bônus, laranja/vermelho = caindo). */
function StaminaBar(props: { ms: number }) {
  const h = Math.floor(props.ms / 3_600_000);
  const m = Math.floor((props.ms % 3_600_000) / 60_000);
  const mult = staminaXpMult(props.ms);
  const color = props.ms > STAMINA_SUPER_MS ? '#7dd8ff' : props.ms > STAMINA_BONUS_MS ? '#7dff8a' : props.ms > STAMINA_NORMAL_MS ? '#e8e2d4' : '#ff6a5a';
  const tip = tr(
    `Stamina: caçar gasta; fora da caçada recupera 1 h a cada 1 h, e treinando profissões ou no boneco 1 h a cada 30 min (na Skill do Dia, 1 h a cada 15 min). De 42 h a 41 h: +80% XP. De 41 h a 39 h: +50% XP. Abaixo de 39 h: normal.`,
    `Stamina: hunting spends it; out of hunts it restores 1 h every 1 h, and training professions or at the dummy 1 h every 30 min (Skill of the Day: 1 h every 15 min). 42 h to 41 h: +80% XP. 41 h to 39 h: +50% XP. Below 39 h: normal.`,
  );
  return (
    <span className="small stamina" title={tip} style={{ color }}>
      <Pix name="element_energy" /> {h}:{String(m).padStart(2, '0')} · {Math.round(mult * 100)}% XP
    </span>
  );
}

/** Onde o outro jogador está (o servidor manda um código: city, boss, arena, id da caçada ou da profissão). */
function placeName(place: string): string {
  if (place === 'city') return tr('Cidade', 'City');
  if (place === 'boss') return tr('Chefe global', 'World boss');
  if (place === 'arena') return 'Arena';
  if (place === 'smelter') return tr('Fundição', 'Smelter');
  const hunt = HUNTS.find((h) => h.id === place);
  if (hunt) return hunt.name;
  if (SKILLS.some((sk) => sk.id === place)) return skillName(place as SkillId);
  return place;
}

/** Painel lateral: o que cada mestre pediu e quanto falta. */
/**
 * Situação de cada história para o personagem: o passo atual, o progresso do
 * pedido e se já dá para falar com o NPC. As que pedem nível maior ficam de fora.
 */
interface StoryEntry {
  story: Story;
  done: boolean;
  ending?: Story['endings'][string];
  step: Story['steps'][number] | null;
  progress: number;
  target: number;
  ready: boolean;
}
function storyList(state: PlayerState): StoryEntry[] {
  const level = levelForXp(state.skills.combat ?? 0, 'combat');
  return STORIES.flatMap((story): StoryEntry[] => {
    const st = state.stories?.find((s) => s.id === story.id);
    if (st?.status === 'done') return [{ story, done: true, ending: story.endings[st.ending ?? ''], step: null, progress: 0, target: 0, ready: false }];
    if (!st && level < story.level) return [];
    const step = story.steps[st?.step ?? 0];
    const raw = storyStepProgress(step, st?.progress ?? 0, state.bank);
    const target = storyTarget(step);
    // Mostra no máximo o alvo ("5/5", não "12/5" de quem já tinha passado antes de o alvo mudar).
    const progress = target > 0 ? Math.min(raw, target) : raw;
    return [{ story, done: false, step, progress, target, ready: storyNeedDone(step, raw, state.skills) }];
  });
}

type LogTab = 'active' | 'available' | 'done';

/**
 * Quest log (como o do Tibia): as histórias em andamento com as missões já
 * cumpridas (✓) e a atual, as disponíveis (e as que pedem nível maior) e as concluídas.
 * As quests dos mestres aparecem em "Em andamento".
 */
type QuestFilter = 'all' | 'active' | 'available' | 'done';
type QuestCategory = 'all' | 'stories' | 'masters' | 'tasks';

interface FormattedQuestItem {
  id: string;
  category: 'story' | 'master' | 'task';
  title: string;
  subtitle: string;
  status: 'active' | 'done' | 'available' | 'locked';
  npc: string;
  npcLocation: string;
  levelReq: number;
  combatLevelOk: boolean;
  summary: string;
  objectiveText: string;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  isReadyToTurnIn: boolean;
  rewardsSummary: string;
  unlocksHunt?: string;
  stepsHistory?: string[];
  currentStepIndex?: number;
  totalSteps?: number;
  canClaimDirectly?: boolean;
  /** Passo atual pede vencer esta provação (mostra o botão de entrar). */
  trialArena?: string;
  /** Instância de quest do passo atual (o botão abre a aba Quests da caçada). */
  questInstance?: string;
  /** Caçada comum recomendada para o objetivo atual (kill/obtain). */
  huntTarget?: string;
}

const NPC_LOCATIONS: Record<string, string> = {
  Hellel: 'Norte da Cidade (Portão de Caçadas)',
  Ifigenia: 'Noroeste da Cidade (Área de Treino/Oficinas)',
  Krash: 'Nordeste da Cidade (Perto do Depósito/Lojas)',
  Alva: 'Praça Central (Perto da Fonte)',
  Taverneiro: 'Pousada do Bastião (Sul da Cidade)',
  Sacerdote: 'Templo da Luz (Sul da Cidade)',
  Guarda: 'Portão Norte das Caçadas',
  'Mestre Alden': 'Quartel de Caça (Norte da Cidade)',
};

function pickClosestCommonHunt(candidates: Hunt[], combatLevel: number, doneStories: string[], bank: Record<string, number> = {}): string | undefined {
  const common = candidates.filter((h) => !h.boss && !h.lair && !h.quest);
  if (common.length === 0) return undefined;
  const canEnter = (h: Hunt) => (!h.requires || doneStories.includes(h.requires)) && (!h.key || (bank[h.key] ?? 0) > 0);
  const enterable = common.filter((h) => canEnter(h) && h.level <= combatLevel);
  const unlocked = common.filter(canEnter);
  const pool = enterable.length > 0 ? enterable : unlocked.length > 0 ? unlocked : common;
  return [...pool].sort((a, b) => Math.abs(a.level - combatLevel) - Math.abs(b.level - combatLevel) || a.level - b.level)[0]?.id;
}

function huntForItemDrop(itemId: string, combatLevel: number, doneStories: string[], bank: Record<string, number> = {}): string | undefined {
  const huntIds = new Set(
    itemSources(itemId)
      .filter((s): s is Extract<typeof s, { kind: 'drop' }> => s.kind === 'drop')
      .flatMap((s) => s.hunts.map((h) => h.id)),
  );
  if (huntIds.size === 0) return undefined;
  return pickClosestCommonHunt(HUNTS.filter((h) => huntIds.has(h.id)), combatLevel, doneStories, bank);
}

function huntForQuestGoal(goal: QuestGoal, combatLevel: number, doneStories: string[], bank: Record<string, number> = {}): string | undefined {
  if (goal.kind === 'kill') {
    const candidates = HUNTS.filter(
      (h) => !h.boss && !h.lair && !h.quest && (goal.monsters.length === 0 || h.monsters.some((m) => goal.monsters.includes(m))),
    );
    return pickClosestCommonHunt(candidates, combatLevel, doneStories, bank);
  }
  if (goal.kind === 'obtain') return huntForItemDrop(goal.item, combatLevel, doneStories, bank);
  return undefined;
}

function QuestPanel(props: { state: PlayerState; vocation?: string; onClaim?: (questId: string) => void; onStartTrial?: (arenaId: string) => void; onOpenQuestInstance?: () => void; onGoHunt?: (huntId: string) => void }) {
  const [filter, setFilter] = useState<QuestFilter>('all');
  const [category, setCategory] = useState<QuestCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Celular: tocar numa quest troca a lista pelo texto dela (antes o texto ficava lá embaixo, depois de toda a lista).
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState('');
  // Favoritas: ficam no topo da lista (guardadas só neste navegador).
  const [favs, setFavs] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('grimhold.questFavs') ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const toggleFav = (id: string) => {
    const next = new Set(favs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavs(next);
    try {
      localStorage.setItem('grimhold.questFavs', JSON.stringify([...next]));
    } catch {
      /* sem armazenamento: vale só nesta sessão */
    }
  };

  const combatXp = props.state.skills.combat ?? 0;
  const combatLvl = levelForXp(combatXp, 'combat');
  const statesMap = new Map((props.state.stories ?? []).map((s) => [s.id, s]));
  const storyEntries = storyList(props.state);
  const masterQuestsList = activeQuests(props.state);
  const huntingTasks = (props.state.huntingTasks ?? []).filter((t) => t.status === 'active' || t.status === 'ready');

  // Constrói a lista unificada de todas as missões
  const allItems: FormattedQuestItem[] = [];

  // 1. Stories (Histórias e Acessos)
  for (const story of STORIES) {
    const st = statesMap.get(story.id);
    const entry = storyEntries.find((e) => e.story.id === story.id);
    const isDone = st?.status === 'done';
    const isActive = st?.status === 'active';
    const isLocked = !st && combatLvl < story.level;
    const status: FormattedQuestItem['status'] = isDone ? 'done' : isActive ? 'active' : isLocked ? 'locked' : 'available';

    const currentStep = entry?.step ?? story.steps[0];
    const npc = currentStep?.npc ?? story.steps[0]?.npc ?? 'NPC';
    const loc = storyText(NPC_LOCATIONS[npc] ?? 'Cidade do Bastião');
    const unlocks = story.unlocks ? HUNTS.find((h) => h.id === story.unlocks)?.name : undefined;

    let objectiveText = '';
    let curProg = 0;
    let targetProg = 0;
    let isReady = false;

    if (isDone) {
      const endText = story.endings[st?.ending ?? '']?.text;
      objectiveText = endText ? storyText(endText) : tr('História concluída!', 'Story complete!');
    } else if (isActive && entry?.step) {
      curProg = Math.min(entry.progress, entry.target);
      targetProg = entry.target;
      isReady = entry.ready;
      objectiveText = entry.step.need
        ? `${storyText(entry.step.need.text)} (${curProg}/${targetProg})`
        : tr(`Fale com ${entry.step.npc} na cidade.`, `Talk to ${storyText(entry.step.npc)} in the city.`);
    } else {
      const first = story.steps[0]?.npc ?? '';
      objectiveText = tr(`Fale com ${first} para iniciar a missão.`, `Talk to ${storyText(first)} to start the quest.`);
    }

    const historySteps: string[] = [];
    if (st?.history) {
      for (const stepIdx of st.history) {
        if (story.steps[stepIdx]) {
          const s = story.steps[stepIdx];
          historySteps.push(s.need ? storyText(s.need.text) : tr(missionTitle(s), `Talk to ${storyText(s.npc)}`));
        }
      }
    }

    const goal = isActive && entry?.step?.need?.goal;
    const trialArena = goal && goal.kind === 'trial' && !entry?.ready ? goal.arena : undefined;
    const questInstance = goal && goal.kind === 'instance' && !entry?.ready ? goal.hunt : undefined;
    const doneStories = (props.state.stories ?? []).filter((s) => s.status === 'done').map((s) => s.id);
    const huntTarget = goal && !entry?.ready ? huntForQuestGoal(goal, combatLvl, doneStories, props.state.bank) : undefined;

    // Recompensas dos finais possíveis
    // Finais por classe (sets da Inquisição): mostra o da classe de quem vê, não o primeiro.
    const fits = (e: (typeof story.endings)[string]) =>
      Object.keys(e.reward.items ?? {}).every((id) => !itemById(id)?.equip?.vocations || itemById(id)!.equip!.vocations!.includes(props.vocation ?? ''));
    const sampleEnding = Object.values(story.endings).find(fits) ?? Object.values(story.endings)[0];
    const rewardsStr = sampleEnding ? rewardText(sampleEnding.reward) : '';

    allItems.push({
      id: `story_${story.id}`,
      category: 'story',
      title: storyText(story.name),
      subtitle: isDone
        ? storyText(story.endings[st?.ending ?? '']?.name ?? tr('Concluída', 'Complete'))
        : story.epic
        ? tr(`Quest de item (Nv ${story.level})`, `Item quest (Lv ${story.level})`)
        : tr(`História (Nv ${story.level})`, `Story (Lv ${story.level})`),
      status,
      npc: storyText(npc),
      npcLocation: loc,
      levelReq: story.level,
      combatLevelOk: combatLvl >= story.level,
      summary: storyText(story.summary),
      objectiveText,
      currentProgress: curProg,
      targetProgress: targetProg,
      progressPercent: targetProg > 0 ? Math.min(100, Math.floor((curProg / targetProg) * 100)) : (isDone ? 100 : 0),
      isReadyToTurnIn: isReady,
      rewardsSummary: rewardsStr,
      unlocksHunt: unlocks,
      stepsHistory: historySteps,
      currentStepIndex: st?.step ?? 0,
      totalSteps: story.steps.length,
      trialArena,
      questInstance,
      huntTarget,
    });
  }

  // 2. Quests dos Mestres
  for (const q of QUESTS) {
    const activeObj = masterQuestsList.find((x) => x.quest.id === q.id);
    const claimedState = props.state.quests?.find((x) => x.id === q.id && x.status === 'claimed');
    const isDone = !!claimedState;
    const isActive = !!activeObj;
    const status: FormattedQuestItem['status'] = isDone ? 'done' : isActive ? 'active' : 'available';

    const npc = q.master;
    const loc = storyText(NPC_LOCATIONS[npc] ?? 'Cidade do Bastião');
    const qText = t(`quest.${q.id}.text`, q.text);
    const curProg = activeObj ? activeObj.shown : (isDone ? questTarget(q) : 0);
    const targetProg = questTarget(q);
    const isReady = activeObj ? activeObj.done : false;

    let objText = qText;
    if (isReady) {
      objText = tr(`Pronta! Fale com ${npc} para receber a recompensa.`, `Ready! Talk to ${npc} to claim the reward.`);
    } else if (isActive) {
      objText = `${qText} (${tr('Progresso', 'Progress')}: ${curProg}/${targetProg})`;
    }

    allItems.push({
      id: `master_${q.id}`,
      category: 'master',
      title: t(`quest.${q.id}.name`, q.name),
      subtitle: tr(`Mestre ${q.master}`, `Master ${q.master}`),
      status,
      npc,
      npcLocation: loc,
      levelReq: q.goal.kind === 'level' ? q.goal.level : 1,
      combatLevelOk: true,
      summary: qText,
      objectiveText: objText,
      currentProgress: curProg,
      targetProgress: targetProg,
      progressPercent: targetProg > 0 ? Math.min(100, Math.floor((curProg / targetProg) * 100)) : (isDone ? 100 : 0),
      isReadyToTurnIn: isReady,
      rewardsSummary: rewardText(q.reward),
      canClaimDirectly: isReady,
      huntTarget: !isDone && !isReady ? huntForQuestGoal(q.goal, combatLvl, (props.state.stories ?? []).filter((s) => s.status === 'done').map((s) => s.id), props.state.bank) : undefined,
    });
  }

  // 3. Hunting Tasks (Tarefas do Mestre Alden)
  for (const tDef of HUNTING_TASKS) {
    const currentTask = huntingTasks.find((x) => x.id === tDef.id);
    const isActive = !!currentTask;
    const isReady = currentTask ? (currentTask.status === 'ready' || currentTask.progress >= tDef.killsRequired) : false;
    const status: FormattedQuestItem['status'] = isReady ? 'active' : isActive ? 'active' : 'available';

    const curProg = currentTask ? currentTask.progress : 0;
    const targetProg = tDef.killsRequired;

    allItems.push({
      id: `task_${tDef.id}`,
      category: 'task',
      title: `Task: ${storyText(tDef.name)}`,
      subtitle: `${storyText('Mestre Alden')} (${storyText(tDef.monsterName)})`,
      status,
      npc: storyText('Mestre Alden'),
      npcLocation: storyText(NPC_LOCATIONS['Mestre Alden']),
      levelReq: tDef.minLevel,
      combatLevelOk: combatLvl >= tDef.minLevel,
      summary: tr(
        `Elimine ${tDef.killsRequired} ${tDef.monsterName} para provar seu valor aos caçadores.`,
        `Defeat ${tDef.killsRequired} ${storyText(tDef.monsterName)} to prove your worth to the hunters.`,
      ),
      objectiveText: isReady
        ? tr('Completo! Fale com Mestre Alden para entregar e receber pontos.', 'Complete! Talk to Master Alden to turn it in and earn points.')
        : isActive
          ? tr(
              `Derrote ${tDef.monsterName}: ${curProg}/${targetProg} (Faltam ${Math.max(0, targetProg - curProg)})`,
              `Defeat ${storyText(tDef.monsterName)}: ${curProg}/${targetProg} (${Math.max(0, targetProg - curProg)} left)`,
            )
          : tr('Disponível com Mestre Alden no quartel.', 'Available from Master Alden at the barracks.'),
      currentProgress: curProg,
      targetProgress: targetProg,
      progressPercent: Math.min(100, Math.floor((curProg / targetProg) * 100)),
      isReadyToTurnIn: isReady,
      rewardsSummary: tr(`${tDef.points} Pontos de Caçador, Ouro e XP`, `${tDef.points} Hunter Points, Gold and XP`),
      huntTarget: !isReady ? huntForQuestGoal({ kind: 'kill', monsters: [tDef.monsterId], count: tDef.killsRequired }, combatLvl, (props.state.stories ?? []).filter((s) => s.status === 'done').map((s) => s.id), props.state.bank) : undefined,
    });
  }

  // Filtragem
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const query = norm(search.trim());
  const filtered = allItems.filter((item) => {
    if (query && !norm(`${item.title} ${item.subtitle} ${item.npc ?? ''} ${item.summary ?? ''} ${item.objectiveText ?? ''}`).includes(query)) return false;
    if (category !== 'all') {
      if (category === 'stories' && item.category !== 'story') return false;
      if (category === 'masters' && item.category !== 'master') return false;
      if (category === 'tasks' && item.category !== 'task') return false;
    }
    if (filter === 'active') return item.status === 'active';
    if (filter === 'done') return item.status === 'done';
    if (filter === 'available') return item.status === 'available' || item.status === 'locked';
    return true;
  });

  // Ordenação: Ativas com progresso pronto primeiro, depois ativas normais, disponíveis e terminadas
  filtered.sort((a, b) => {
    const score = (x: FormattedQuestItem) => {
      if (x.isReadyToTurnIn) return 0;
      if (x.status === 'active') return 1;
      if (x.status === 'available') return 2;
      if (x.status === 'locked') return 3;
      return 4;
    };
    return Number(favs.has(b.id)) - Number(favs.has(a.id)) || score(a) - score(b);
  });

  const activeCount = allItems.filter((x) => x.status === 'active').length;
  const doneCount = allItems.filter((x) => x.status === 'done').length;
  const availableCount = allItems.filter((x) => x.status === 'available' || x.status === 'locked').length;

  const currentSelected = allItems.find((x) => x.id === selectedId) ?? filtered[0] ?? null;

  return (
    <section className="panel quest-journal-panel">
      <div className="quest-journal-header">
        <div className="quest-journal-title">
          <img className="icon tiny" src={icon('crypt_key')} alt="" />
          <h3>{t('panel.quests', 'Diário de Missões')}</h3>
        </div>
        <div className="quest-journal-stats">
          <span className="q-badge done">✓ {doneCount}</span>
          <span className="q-badge active"><Pix name="ui_hourglass" /> {activeCount}</span>
          <span className="q-badge avail">● {availableCount}</span>
        </div>
      </div>

      {/* Barra de Filtros estilo RuneScape */}
      <div className="quest-journal-filters">
        <div className="tabs quest-tabs-rs" role="tablist">
          {(
            [
              ['all', `${tr('Todas', 'All')} (${allItems.length})`],
              ['active', `${tr('Em Andamento', 'In Progress')} (${activeCount})`],
              ['available', `${tr('Disponíveis', 'Available')} (${availableCount})`],
              ['done', `${tr('Concluídas', 'Completed')} (${doneCount})`],
            ] as [QuestFilter, string][]
          ).map(([f, lbl]) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`tab ${filter === f ? 'on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <input
          className="quest-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr('Pesquisar missão, NPC ou monstro...', 'Search quest, NPC or monster...')}
        />

        <div className="quest-category-tags">
          {(
            [
              ['all', tr('Todos os tipos', 'All types')],
              ['stories', tr('Histórias & Acessos', 'Stories & Access')],
              ['masters', tr('Mestres da Cidade', 'City Masters')],
              ['tasks', tr('Tarefas de Caça', 'Hunting Tasks')],
            ] as [QuestCategory, string][]
          ).map(([cat, lbl]) => (
            <button
              key={cat}
              className={`cat-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo com 2 Colunas: Lista à Esquerda e Detalhes à Direita */}
      <div className={`quest-journal-body ${showDetail ? 'show-detail' : ''}`}>
        {/* Painel Esquerdo: Lista de Quests com cores clássicas do RS */}
        <div className="quest-journal-list">
          {filtered.length === 0 ? (
            <div className="empty-quests-msg">
              <span>{tr('Nenhuma missão com os filtros selecionados.', 'No quests match the selected filters.')}</span>
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = currentSelected?.id === item.id;
              let statusClass = 'status-available';
              if (item.status === 'done') statusClass = 'status-done';
              else if (item.status === 'active') statusClass = item.isReadyToTurnIn ? 'status-ready' : 'status-active';
              else if (item.status === 'locked') statusClass = 'status-locked';

              return (
                <button
                  key={item.id}
                  className={`quest-item-btn ${statusClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedId(item.id);
                    setShowDetail(true);
                  }}
                >
                  <div className="q-item-row">
                    <span className="q-dot" />
                    <span className="q-item-name">{item.title}</span>
                    <span
                      role="button"
                      className={`q-fav ${favs.has(item.id) ? 'on' : ''}`}
                      title={favs.has(item.id) ? tr('Tirar dos favoritos', 'Remove from favorites') : tr('Favoritar (fica no topo)', 'Favorite (stays on top)')}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(item.id);
                      }}
                    >
                      {favs.has(item.id) ? '★' : '☆'}
                    </span>
                    {item.isReadyToTurnIn && <span className="q-item-tag ready">{tr('PRONTA!', 'READY!')}</span>}
                  </div>
                  <div className="q-item-sub">
                    <small>{item.subtitle}</small>
                    {item.targetProgress > 0 && item.status === 'active' && (
                      <small className="q-item-prog">{item.currentProgress}/{item.targetProgress}</small>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Painel Direito: Detalhes explicativos e ricos */}
        <div className="quest-journal-detail">
          <button type="button" className="small-btn quest-back-btn" onClick={() => setShowDetail(false)}>
            ← {tr('Voltar à lista', 'Back to list')}
          </button>
          {currentSelected ? (
            <div className="q-detail-content">
              <header className="q-detail-header">
                <div className="q-detail-title-row">
                  <h4>{currentSelected.title}</h4>
                  <span className={`q-status-badge ${currentSelected.status}`}>
                    {currentSelected.isReadyToTurnIn
                      ? tr('✦ Pronta para entregar', '✦ Ready to turn in')
                      : currentSelected.status === 'active'
                        ? tr('Em andamento', 'In progress')
                        : currentSelected.status === 'done'
                          ? tr('✓ Concluída', '✓ Completed')
                          : currentSelected.status === 'locked'
                            ? tr('Nível insuficiente', 'Level too low')
                            : tr('● Disponível', '● Available')}
                  </span>
                </div>
                <div className="q-detail-meta">
                  <span><strong>{tr('Tipo:', 'Type:')}</strong> {currentSelected.subtitle}</span>
                  {currentSelected.totalSteps ? (
                    <span><strong>{tr('Passo:', 'Step:')}</strong> {Math.min(currentSelected.currentStepIndex! + 1, currentSelected.totalSteps)} {tr('de', 'of')} {currentSelected.totalSteps}</span>
                  ) : null}
                </div>
              </header>

              {/* Informações de Localização e Onde ir */}
              <div className="q-detail-box q-location-box">
                <div className="box-line">
                  <span className="label"><Pix name="ui_pin" /> {tr('Onde ir / Início:', 'Where to go / Start:')}</span>
                  <span className="val">
                    {tr('Fale com', 'Talk to')} <strong>{currentSelected.npc}</strong> {tr('em', 'at')} <em>{currentSelected.npcLocation}</em>
                  </span>
                </div>
                <div className="box-line">
                  <span className="label"><Pix name="steel_sword" /> {tr('Nível de Combate:', 'Combat Level:')}</span>
                  <span className={`val ${currentSelected.combatLevelOk ? 'ok' : 'err'}`}>
                    {tr('Requer Nível', 'Requires Level')} {currentSelected.levelReq}{' '}
                    {currentSelected.combatLevelOk ? tr('(Cumprido)', '(Met)') : tr(`(Seu nível: ${combatLvl})`, `(Your level: ${combatLvl})`)}
                  </span>
                </div>
                {currentSelected.unlocksHunt && (
                  <div className="box-line unlock-line">
                    <span className="label"><Pix name="ui_unlock" /> {tr('Desbloqueio Especial:', 'Special Unlock:')}</span>
                    <span className="val">
                      {tr('Libera a caçada', 'Unlocks the hunt')} <strong>{currentSelected.unlocksHunt}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Descrição e Enredo */}
              <div className="q-detail-box q-summary-box">
                <h5>{tr('História & Resumo', 'Story & Summary')}</h5>
                <p>{currentSelected.summary}</p>
              </div>

              {/* Objetivo Atual & Barra de Progresso */}
              <div className="q-detail-box q-objective-box">
                <h5>{tr('Objetivo Atual', 'Current Objective')}</h5>
                <p className="q-objective-desc">{currentSelected.objectiveText}</p>
                {currentSelected.targetProgress > 0 && currentSelected.status === 'active' && (
                  <div className="q-prog-container">
                    <div className="bar">
                      <div
                        className={`fill ${currentSelected.isReadyToTurnIn ? 'done' : 'xp'}`}
                        style={{ width: `${currentSelected.progressPercent}%` }}
                      />
                    </div>
                    <span className="q-prog-text">
                      {currentSelected.currentProgress} / {currentSelected.targetProgress} ({currentSelected.progressPercent}%)
                    </span>
                  </div>
                )}
                {currentSelected.huntTarget && props.onGoHunt && (
                  <div style={{ marginTop: 8 }}>
                    <button className="primary small-btn" onClick={() => props.onGoHunt!(currentSelected.huntTarget!)}>
                      <Pix name="steel_sword" /> {tr('Ir caçar', 'Go hunt')}
                    </button>
                  </div>
                )}
                {currentSelected.questInstance && props.onOpenQuestInstance && (
                  <div style={{ marginTop: 8 }}>
                    <button className="primary small-btn" onClick={props.onOpenQuestInstance}>
                      <Pix name="steel_sword" /> {tr('Ir para a instância', 'Go to the instance')}: {storyText(HUNTS.find((h) => h.id === currentSelected.questInstance)?.name ?? '')}
                    </button>
                    <p className="small muted">{tr('Abre a aba Quests em Organizar caçada. Vence uma vez só; morreu ou saiu, tenta de novo.', 'Opens the Quests tab in Organize hunt. Won only once; if you die or leave, try again.')}</p>
                  </div>
                )}
                {currentSelected.trialArena && props.onStartTrial && (
                  <div style={{ marginTop: 8 }}>
                    <button className="primary small-btn" onClick={() => props.onStartTrial!(currentSelected.trialArena!)}>
                      <Pix name="steel_sword" /> {tr('Entrar na provação', 'Enter the trial')}: {arenaLabel(currentSelected.trialArena)}
                    </button>
                    <p className="small muted">{tr('Lutas em sequência. Morreu, volta do começo (sem perder itens).', 'Fights in a row. If you die, you start over (no items lost).')}</p>
                  </div>
                )}
                {currentSelected.canClaimDirectly && props.onClaim && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="primary small-btn"
                      onClick={() => props.onClaim!(currentSelected.id.replace('master_', ''))}
                    >
                      <Pix name="ui_gift" /> {tr('Receber Recompensa', 'Claim Reward')}
                    </button>
                  </div>
                )}
              </div>

              {/* Histórico de Passos Cumpridos (se houver) */}
              {currentSelected.stepsHistory && currentSelected.stepsHistory.length > 0 && (
                <div className="q-detail-box q-steps-box">
                  <h5>{tr('Progresso do Diário', 'Journal Progress')}</h5>
                  <ul className="q-steps-list">
                    {currentSelected.stepsHistory.map((stepDesc, idx) => (
                      <li key={idx} className="step-done">
                        <span className="step-check">✓</span> {stepDesc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recompensas */}
              {currentSelected.rewardsSummary && (
                <div className="q-detail-box q-rewards-box">
                  <h5>{tr('Recompensas ao Concluir', 'Rewards on Completion')}</h5>
                  <p className="q-rewards-text"><Pix name="ui_gift" /> {currentSelected.rewardsSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-detail-msg">
              <p>{tr('Selecione uma missão à esquerda para ver os detalhes completos, localização e objetivos.', 'Select a quest on the left to see its full details, location and objectives.')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Botão da barra da cidade que abre um menu (para cima) com vários NPCs. */
type MenuItem = [string, () => void] | [string, () => void, string] | [string, () => void, string, string];
function CityMenu(props: { label: string; disabled?: boolean; items: MenuItem[]; down?: boolean; alert?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  return (
    <span className="city-menu">
      <button
        className="primary small-btn"
        disabled={props.disabled}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {props.label} ▾{props.alert && <span className="alert-dot" aria-hidden="true" />}
      </button>
      {open && (
        <span className={`city-menu-list ${props.down ? 'down' : ''}`} role="menu">
          {props.items.map(([label, run, hint, group], i) => (
            <Fragment key={label}>
              {/* Grupos com título e uma linha do que cada NPC faz (pedido da comunidade: o iniciante não sabia para que servia cada um). */}
              {group && group !== props.items[i - 1]?.[3] && <span className="city-menu-sec">{group}</span>}
              <button role="menuitem" className="city-menu-item" onClick={run}>
                {label}
                {hint && <span className="city-menu-hint">{hint}</span>}
              </button>
            </Fragment>
          ))}
        </span>
      )}
    </span>
  );
}

/** O que a morte levou (ou que a bênção salvou). */
function DeathLoss(props: { itemsLost?: string[]; blessed?: boolean; reaper?: { price: number; expiresAt: number } }) {
  if (props.blessed) return <p className="small">{tr('A bênção do Templo protegeu seus itens e metade do XP. Ela se foi.', 'The Temple blessing protected your items and half of the XP. It is now gone.')}</p>;
  if (!props.itemsLost?.length) return <p className="small">{tr('Por sorte, não perdeu nenhum item.', 'Luckily, you lost no items.')}</p>;
  if (props.reaper) {
    const lang = getLang();
    return (
      <p className="small error">
        {tr('O Ceifador guardou', 'The Reaper kept')}: {props.itemsLost.map((id) => itemName(itemById(id)?.name ?? id)).join(', ')}.{' '}
        {tr(
          `Ele devolve tudo por ${props.reaper.price.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} de ouro, por até ${REAPER_KEEP_MS / 86_400_000} dias. Com a bênção, você não perde nada.`,
          `He returns everything for ${props.reaper.price.toLocaleString('en-US')} gold, for up to ${REAPER_KEEP_MS / 86_400_000} days. With the blessing, you lose nothing.`,
        )}
      </p>
    );
  }
  return (
    <p className="small error">
      {tr('Perdeu', 'Lost')}: {props.itemsLost.map((id) => itemName(itemById(id)?.name ?? id)).join(', ')}.{' '}
      {tr('Compre a bênção no Templo para se proteger.', 'Buy the blessing at the Temple to protect yourself.')}
    </p>
  );
}

/**
 * O Ceifador: devolve as peças de cada morte sem bênção (por um preço, até o prazo acabar)
 * e vende a bênção. No Limiar dos Mortos também leva de volta ao Bastião.
 */
function ReaperPanel(props: {
  state: PlayerState;
  combatLevel: number;
  inLimbo: boolean;
  now: number;
  onRedeem: (pack: number) => void;
  onBless: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const lang = getLang();
  const fmt = (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const gold = props.state.bank.gold ?? 0;
  const packs: ReaperPack[] = (props.state.reaper ?? []).filter((p) => p.expiresAt > props.now);
  const left = (ms: number) => {
    const h = Math.max(0, Math.floor(ms / 3_600_000));
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${Math.max(0, Math.floor((ms % 3_600_000) / 60_000))}min`;
  };
  const bless = blessPrice(props.combatLevel);
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel modal reaper-panel" onClick={(e) => e.stopPropagation()}>
        <h3>{tr('O Ceifador', 'The Reaper')}</h3>
        <img className="talk-face" src="/assets/npcs/reaper/down_stand.png" alt="" />
        <p className="small">
          {tr(
            'Quem cai sem a bênção deixa peças para trás. Eu guardo o que caiu de cada morte por alguns dias... e devolvo tudo, por um preço.',
            'Those who fall without the blessing leave pieces behind. I keep what fell from each death for a few days... and return it all, for a price.',
          )}
        </p>
        {packs.length === 0 ? (
          <p className="small low">{tr('Não guardo nada seu agora.', 'I keep nothing of yours right now.')}</p>
        ) : (
          <ul className="reaper-packs">
            {packs.map((p) => (
              <li key={p.id}>
                <div className="reaper-items">
                  {p.items.map((id, i) => {
                    const it = itemById(id);
                    return (
                      <span key={`${id}-${i}`} className="beast-drop" title={itemName(it?.name ?? id)}>
                        <img className="icon tiny" src={icon(it?.icon ?? '')} alt="" /> {itemName(it?.name ?? id)}
                      </span>
                    );
                  })}
                </div>
                <div className="reaper-row">
                  <span className="small low">
                    {tr('Some em', 'Gone in')} {left(p.expiresAt - props.now)}
                  </span>
                  <button className="primary small-btn" disabled={gold < p.price} onClick={() => props.onRedeem(p.id)}>
                    {tr('Resgatar', 'Redeem')} ({fmt(p.price)} {tr('ouro', 'gold')})
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="talk-quest">
          {props.state.blessed ? (
            <strong>{tr('Você está abençoado. A próxima morte não leva seus itens.', 'You are blessed. Your next death will not take your items.')}</strong>
          ) : (
            <>
              <strong>{tr('Bênção', 'Blessing')}</strong>
              <p className="small">
                {tr(
                  'Na próxima morte: nenhum item perdido e só metade do XP. Gasta ao morrer. Sai mais barato que me pagar depois.',
                  'On your next death: no items lost and only half the XP. Used up on death. Cheaper than paying me afterwards.',
                )}
              </p>
              <button className="primary" disabled={gold < bless} onClick={props.onBless}>
                {tr('Receber a bênção', 'Receive the blessing')} ({fmt(bless)} {tr('ouro', 'gold')})
              </button>
            </>
          )}
        </div>
        <div className="reaper-row">
          {props.inLimbo && (
            <button className="small-btn" onClick={props.onLeave}>
              {tr('Voltar ao Bastião', 'Return to the Bastion')}
            </button>
          )}
          <button className="small-btn" onClick={props.onClose}>
            {tr('Fechar', 'Close')}
          </button>
        </div>
      </section>
    </div>
  );
}

/** O passo de uma história com este NPC: a conversa e as escolhas (ou o que ainda falta fazer). */
function StoryTalk(props: { entry: StoryEntry; onChoose: (choice: number) => void }) {
  const { story, step, ready, progress, target } = props.entry;
  if (!step) return null;
  return (
    <div className="talk-quest story">
      <strong>{storyText(story.name)}</strong>
      {ready ? (
        <>
          {step.lines.map((l, i) => (
            <p key={i}>{storyText(l)}</p>
          ))}
          <div className="story-choices">
            {step.choices.map((c, i) => (
              <button key={i} className="primary" onClick={() => props.onChoose(i)}>
                {storyText(c.text)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="small">
          {storyText(step.need?.text ?? '')} ({Math.min(progress, target)}/{target}). {tr('Volte quando terminar.', 'Come back when you are done.')}
        </p>
      )}
    </div>
  );
}

/** Conversa com um NPC: histórias, a quest do mestre (se tiver) e as dicas, uma fala por vez. */
function TalkModal(props: {
  npc: Npc;
  state: PlayerState | null;
  combatLevel: number;
  onBless: () => void;
  onClaim: (quest: string) => void;
  onStory: (story: string, choice: number) => void;
  onClose: () => void;
}) {
  const [finished, setFinished] = useState<{ story: Story; ending: string } | null>(null);
  const stories = props.state ? storyList(props.state).filter((s) => !s.done && s.step?.npc === props.npc.name) : [];
  const lines = props.npc.lines ?? [];
  const [i, setI] = useState(0);
  const last = i >= lines.length - 1;
  const mine = props.state ? activeQuests(props.state).find((q) => q.quest.master === props.npc.name) : undefined;
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel modal talk" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={props.npc.name}>
        <img className="talk-face" src={`/assets/npcs/${props.npc.sprite}/down_stand.png`} alt="" />
        <h3>{t(`npc_name.${props.npc.name.toLowerCase()}`, t(`npc_name.${props.npc.id}`, props.npc.name))}</h3>
        {mine && (
          <div className="talk-quest">
            <strong>{t(`quest.${mine.quest.id}.name`, mine.quest.name)}</strong>
            <p>{mine.done ? t('quest.done_msg', 'Muito bem! Aqui está o combinado.') : t(`quest.${mine.quest.id}.text`, mine.quest.text)}</p>
            <div className="bar thin">
              <div className="fill xp" style={{ width: `${(mine.shown / mine.target) * 100}%` }} />
            </div>
            <span className="small">
              {mine.shown}/{mine.target} · {t('quest.reward_label', 'Recompensa:')} {rewardText(mine.quest.reward)}
            </span>
            {mine.done && (
              <button className="primary" onClick={() => props.onClaim(mine.quest.id)}>
                {t('quest.claim_reward', 'Receber recompensa')}
              </button>
            )}
          </div>
        )}
        {finished ? (
          <div className="talk-quest story">
            <strong>{storyText(finished.story.endings[finished.ending].name)}</strong>
            <p>{storyText(finished.story.endings[finished.ending].text)}</p>
            <span className="small">{t('quest.reward_label', 'Recompensa:')} {rewardText(finished.story.endings[finished.ending].reward)}</span>
          </div>
        ) : (
          stories.map((s) => (
            <StoryTalk
              key={s.story.id}
              entry={s}
              onChoose={(choice) => {
                const ending = s.step?.choices[choice]?.ending;
                if (ending) setFinished({ story: s.story, ending });
                props.onStory(s.story.id, choice);
              }}
            />
          ))
        )}
        <p>{t(`npc_talk.${props.npc.name}.${i}`, lines[i])}</p>
        {props.npc.id === 'temple' && props.state && (
          <div className="talk-quest">
            {props.state.blessed ? (
              <strong>{t('temple.blessed_status', 'Você está abençoado. A próxima morte não leva seus itens.')}</strong>
            ) : (
              <>
                <strong>{t('temple.blessing_title', 'Bênção do Templo')}</strong>
                <p className="small">{t('temple.blessing_desc', 'Na próxima morte: nenhum item perdido e só metade do XP. Gasta ao morrer.')}</p>
                <button
                  className="primary"
                  disabled={(props.state.bank.gold ?? 0) < blessPrice(props.combatLevel)}
                  onClick={props.onBless}
                >
                  {t('temple.receive_blessing', 'Receber a bênção')} ({blessPrice(props.combatLevel).toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold', 'ouro')})
                </button>
              </>
            )}
          </div>
        )}
        <button className="primary" onClick={() => (last ? props.onClose() : setI(i + 1))}>
          {last ? t('common.farewell', 'Até mais') : `${t('common.continue', 'Continuar')} (${i + 1}/${lines.length})`}
        </button>
      </section>
    </div>
  );
}

/** Loja do Bastião: equipamento pronto, mais caro que forjar. Mostra quem pode usar. */
function ShopModal(props: {
  /** O que já tem na bolsa, para saber quanto comprar. */
  bank: Record<string, number>;
  shop: ShopId;
  gold: number;
  vocation: VocationId;
  combatLevel: number;
  onBuy: (item: string, qty: number) => void;
  onClose: () => void;
}) {
  const lang = getLang();
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const title =
    props.shop === 'armor'
      ? t('npc.armor')
      : props.shop === 'weapons'
        ? t('npc.weapons')
        : props.shop === 'runes'
          ? t('npc.runes')
          : props.shop === 'potions'
            ? t('npc.potions')
            : t('npc.jewelry');
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className="picker-head">
          <h3>{title}</h3>
          <span className="gold">
            <img className="icon tiny" src={icon('gold')} alt="" /> {props.gold.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}
          </span>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <p className="small">
          {props.shop === 'runes'
            ? t('shop.desc_runes')
            : props.shop === 'potions'
              ? t('shop.desc_potions')
              : t('shop.desc_equip')}
        </p>
        <div className="shop-list">
          {SHOPS[props.shop].map((id) => {
            const item = itemById(id)!;
            const price = shopPrice(id);
            if (!item.equip) {
              // Empilhável (runas, poções): escolhe a quantidade e compra tudo de uma vez.
              const qty = qtys[id] ?? 1;
              const setQty = (n: number) => setQtys((q) => ({ ...q, [id]: Math.max(1, Math.min(1000, Math.floor(n) || 1)) }));
              const afford = Math.max(1, Math.min(1000, Math.floor(props.gold / price)));
              return (
                <div key={id} className="shop-row">
                  <img className="icon" src={icon(item.icon)} alt="" />
                  <div className="shop-info">
                    <strong>{itemName(item.name)}</strong>
                    <span className="small">
                      {item.rune
                        ? runeText(item.rune)
                        : item.potion
                          ? potionText(item.potion)
                          : item.food
                            ? `+${item.food} HP (${getLang() === 'pt' ? 'sustento' : 'sustenance'})`
                            : ''}{' '}
                      · {price.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('shop.each')} ·{' '}
                      <b>
                        {tr('Na bolsa', 'In bag')}: {(props.bank[id] ?? 0).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}
                      </b>
                    </span>
                    <span className="qty-pick">
                      {[1, 10, 50, 100].map((n) => (
                        <button key={n} type="button" className={`small-btn ${qty === n ? 'on' : ''}`} onClick={() => setQty(n)}>
                          {n}
                        </button>
                      ))}
                      <button type="button" className="small-btn" title={lang === 'pt' ? 'O máximo que o seu ouro paga' : 'Maximum your gold can afford'} onClick={() => setQty(afford)}>
                        {t('shop.max_btn')}
                      </button>
                      <input type="number" min={1} max={1000} value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label={tr('Quantidade', 'Quantity')} />
                    </span>
                  </div>
                  <button className="primary small-btn" disabled={props.gold < price * qty} onClick={() => props.onBuy(id, qty)}>
                    {qty}× · {(price * qty).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')}
                  </button>
                </div>
              );
            }
            const eq = item.equip!;
            const wrongVocation = !!eq.vocations && !eq.vocations.includes(props.vocation);
            const stats = bonusText(eq) + (itemEffectText(item) ? `, ${itemEffectText(item)}` : '');
            return (
              <div key={id} className={`shop-row ${wrongVocation ? 'dim' : ''}`}>
                <img className="icon" src={icon(item.icon)} alt="" />
                <div className="shop-info">
                  <strong>{itemName(item.name)}</strong>
                  <span className="small">
                    {stats} · {t('common.level')} {eq.level}
                    {wrongVocation ? ` · ${t('shop.other_vocation')}` : ''}
                  </span>
                </div>
                <button className="primary small-btn" disabled={props.gold < price} onClick={() => props.onBuy(id, 1)}>
                  {price.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Santuário de Imbuements: encanta temporariamente com materiais de monstros. */
function ImbuementModal(props: {
  bank: Record<string, number>;
  active: Record<string, number>;
  onImbue: (id: string) => void;
  combatLevel?: number;
  doneStories?: string[];
  onGoHunt?: (huntId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('imbuement.title')}>
        <header className="picker-head">
          <h3>{t('imbuement.title')}</h3>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <p className="small">
          {t('imbuement.desc')}
        </p>
        <p className="small">
          <strong>{tr('Um nível por família:', 'One tier per family:')}</strong>{' '}
          {tr('I, II e III não somam. Aplicar outro nível da mesma família troca o atual (o tempo dele se perde).', 'I, II and III do not stack. Applying another tier of the same family replaces the current one (its time is lost).')}
        </p>
        <div className="shop-list">
          {IMBUEMENTS.map((imb) => {
            const secondsLeft = props.active[imb.id] ?? 0;
            const hasMats = Object.entries(imb.materials).every(([mat, need]) => (props.bank[mat] ?? 0) >= need);
            const timeLeftText = secondsLeft > 0 ? `${Math.floor(secondsLeft / 60)} min ${t('imbuement.left')}` : null;
            return (
              <div key={imb.id} className="shop-row">
                <img className="icon" src={icon(imb.icon)} alt={imb.name} />
                <div className="shop-info">
                  <strong>
                    {imb.name} {timeLeftText && <span className="bonus" style={{ fontSize: '0.8rem' }}>({timeLeftText})</span>}
                  </strong>
                  <span className="small">{imb.description}</span>
                  <div className="inputs small" style={{ marginTop: 2 }}>
                    {Object.entries(imb.materials).map(([mat, need]) => {
                      const have = props.bank[mat] ?? 0;
                      const it = itemById(mat);
                      return (
                        <span key={mat} className={have < need ? 'missing' : ''}>
                          {it ? <img className="icon tiny" src={icon(it.icon)} alt="" /> : null}
                          {have}/{need} {itemName(it?.name ?? mat)}
                          {(() => {
                            const hId = props.onGoHunt ? huntForItemDrop(mat, props.combatLevel ?? 1, props.doneStories ?? [], props.bank) : undefined;
                            return hId ? (
                              <>
                                {' '}
                                <button type="button" className="small-btn" onClick={() => props.onGoHunt!(hId)}>
                                  {tr('Onde caçar', 'Where to hunt')}
                                </button>
                              </>
                            ) : null;
                          })()}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  className="primary small-btn"
                  disabled={!hasMats}
                  onClick={() => props.onImbue(imb.id)}
                >
                  {Object.keys(props.active).some((id) => id !== imb.id && (props.active[id] ?? 0) > 0 && imbuementFamily(id) === imbuementFamily(imb.id))
                    ? tr('Trocar', 'Replace')
                    : t('imbuement.imbue_btn')}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Sociedade dos Caçadores (Grizzly Adams): tarefas de abate de monstros e patentes. */
function HuntingTasksModal(props: {
  combatLevel: number;
  tasks: HuntingTaskState[];
  points: number;
  spent: number;
  xpBoostsToday: number;
  onBuy: (item: TaskShopItem, material?: string) => void;
  /** Destaques do dia (+50% de pontos e ouro). */
  featured: string[];
  onStart: (taskId: string) => void;
  onClaim: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onClose: () => void;
}) {
  const lang = getLang();
  const [tab, setTab] = useState<'active' | 'available' | 'done' | 'shop'>('active');
  const rank = rankForPoints(props.points);

  const activeTasks = props.tasks.filter((t) => t.status === 'active' || t.status === 'ready');
  const doneTasks = props.tasks.filter((t) => t.status === 'claimed');
  const activeIds = new Set(props.tasks.filter((t) => t.status !== 'claimed').map((t) => t.id));
  // Destaques do dia primeiro (pedido de rework: o jogador não sabia qual task fazer).
  const featured = new Set(props.featured);
  // Separadas por faixa de nível (como a lista de caçadas); abre na faixa do seu nível, destaques do dia primeiro.
  const [range, setRange] = useState<number>(() => levelRangeOf(props.combatLevel));
  const availableDefs = HUNTING_TASKS.filter((t) => !activeIds.has(t.id) && (range < 0 || levelRangeOf(t.minLevel) === range)).sort(
    (a, b) => Number(featured.has(b.id)) - Number(featured.has(a.id)) || a.minLevel - b.minLevel,
  );
  const star = (id: string) =>
    featured.has(id) ? <span className="small featured-task">★ {tr(`Destaque do dia: +${Math.round(FEATURED_TASK_BONUS * 100)}% de pontos e ouro`, `Featured today: +${Math.round(FEATURED_TASK_BONUS * 100)}% points and gold`)}</span> : null;

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('tasks.title')}>
        <header className="picker-head">
          <div>
            <h3 style={{ margin: 0 }}>{t('tasks.title')}</h3>
            <span className="small" style={{ color: '#ffea88' }}>
              {rank.name} · {props.points} {t('tasks.hunt_pts')}
            </span>
          </div>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>

        <nav className="tabs" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <button className={`tab ${tab === 'active' ? 'on' : ''}`} onClick={() => setTab('active')}>
            {t('tasks.tab_active')} ({activeTasks.length})
          </button>
          <button className={`tab ${tab === 'available' ? 'on' : ''}`} onClick={() => setTab('available')}>
            {t('tasks.tab_available')} ({availableDefs.length})
          </button>
          <button className={`tab ${tab === 'done' ? 'on' : ''}`} onClick={() => setTab('done')}>
            {t('tasks.tab_done')} ({doneTasks.length})
          </button>
          <button className={`tab ${tab === 'shop' ? 'on' : ''}`} onClick={() => setTab('shop')}>
            {tr('Loja', 'Shop')} ({props.points - props.spent})
          </button>
        </nav>

        {tab === 'shop' && <TaskShop points={props.points} spent={props.spent} xpBoostsToday={props.xpBoostsToday} onBuy={props.onBuy} />}

        {tab === 'active' && (
          <div className="shop-list" style={{ marginTop: 8 }}>
            {activeTasks.length === 0 ? (
              <p className="empty-msg" style={{ padding: 12 }}>{t('tasks.empty_active')}</p>
            ) : (
              activeTasks.map((tItem) => {
                const def = huntingTaskById(tItem.id);
                if (!def) return null;
                const ready = tItem.status === 'ready' || tItem.progress >= def.killsRequired;
                const pct = ready ? 100 : Math.min(100, Math.floor((tItem.progress / def.killsRequired) * 100));
                return (
                  <div key={tItem.id} className={`shop-row ${featured.has(def.id) ? 'featured' : ''}`}>
                    <TaskMonster id={def.monsterId} />
                    <div className="shop-info">
                      <strong>{def.name}</strong>
                      {star(def.id)}
                      <span className="small">
                        {t('tasks.slay')} {def.monsterName}: {tItem.progress}/{def.killsRequired} ({pct}%)
                      </span>
                      <div className="progress-bar" style={{ height: 6, margin: '4px 0', background: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden' }}>
                        <div className="progress-fill" style={{ height: '100%', width: `${pct}%`, background: ready ? '#7dd96b' : 'var(--gold)' }} />
                      </div>
                      <span className="small" style={{ color: '#d0c2a8' }}>
                        {t('tasks.reward')} +{taskPointsFor(def, props.combatLevel)} {t('tasks.hunt_pts')} · {def.goldReward.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')} · {def.xpReward.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} XP
                        {def.itemReward ? ` · ${def.itemReward.name}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {ready ? (
                        <button className="primary small-btn" onClick={() => props.onClaim(tItem.id)}>
                          {t('tasks.claim')}
                        </button>
                      ) : (
                        <button className="small-btn link-btn" onClick={() => props.onCancel(tItem.id)}>
                          {t('tasks.give_up')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'available' && (
          <div className="shop-list" style={{ marginTop: 8 }}>
            <div className="tabs hunt-ranges" role="radiogroup" aria-label={tr('Faixa de nível', 'Level range')}>
              {LEVEL_RANGES.map(([lo, hi], i) => (
                <button key={lo} role="radio" aria-checked={range === i} className={`tab ${range === i ? 'on' : ''}`} onClick={() => setRange(i)}>
                  {hi === Infinity ? `${lo}+` : `${lo}–${hi}`}
                </button>
              ))}
              <button role="radio" aria-checked={range < 0} className={`tab ${range < 0 ? 'on' : ''}`} onClick={() => setRange(-1)}>
                {tr('Todas', 'All')}
              </button>
            </div>
            {availableDefs.length === 0 && <p className="empty-msg" style={{ padding: 12 }}>{tr('Nenhuma tarefa nesta faixa.', 'No tasks in this range.')}</p>}
            {availableDefs.map((def) => {
              const locked = props.combatLevel < def.minLevel;
              return (
                <div key={def.id} className={`shop-row ${locked ? 'dim' : ''} ${featured.has(def.id) ? 'featured' : ''}`}>
                  <TaskMonster id={def.monsterId} />
                  <div className="shop-info">
                    <strong>{def.name}</strong>
                    {star(def.id)}
                    <span className="small">
                      {t('tasks.slay')} {def.killsRequired}x {def.monsterName} · {t('common.level')} {def.minLevel}
                    </span>
                    <span className="small" style={{ color: '#ffea88' }}>
                      {t('tasks.reward')} +{taskPointsFor(def, props.combatLevel)} {t('tasks.hunt_pts')}
                      {taskPointsFor(def, props.combatLevel) < def.points ? ` (${tr('de', 'of')} ${def.points}: ${tr('muito abaixo do seu nível', 'far below your level')})` : ''} · {def.goldReward.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')} · {def.xpReward.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} XP
                      {def.itemReward ? ` · ${def.itemReward.name}` : ''}
                    </span>
                  </div>
                  <button
                    className="primary small-btn"
                    disabled={locked || activeTasks.length >= 3}
                    onClick={() => props.onStart(def.id)}
                  >
                    {locked ? `${t('common.level')} ${def.minLevel}` : t('tasks.accept')}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'done' && (
          <div className="shop-list" style={{ marginTop: 8 }}>
            {doneTasks.length === 0 ? (
              <p className="empty-msg" style={{ padding: 12 }}>{lang === 'pt' ? 'Nenhuma tarefa concluída ainda.' : 'No completed tasks yet.'}</p>
            ) : (
              doneTasks.map((tItem) => {
                const def = huntingTaskById(tItem.id);
                if (!def) return null;
                return (
                  <div key={tItem.id} className="shop-row">
                    <img className="icon" src={icon('hunter_trophy_gold')} alt="" />
                    <div className="shop-info">
                      <strong>{def.name} ✓</strong>
                      <span className="small">{def.monsterName} ({def.killsRequired} {lang === 'pt' ? 'abates' : 'kills'})</span>
                      <span className="small bonus">+{def.points} {t('tasks.hunt_pts')}</span>
                    </div>
                    <button className="small-btn" onClick={() => props.onStart(tItem.id)}>
                      {t('tasks.repeat')}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/** Rashid: negociante especializado que compra relíquias por +35% de ouro. */
function RashidModal(props: {
  bank: Record<string, number>;
  onSell: (item: string, qty: number) => void;
  onClose: () => void;
}) {
  const lang = getLang();
  const entries = Object.entries(props.bank)
    .filter(([id, qty]) => qty > 0 && isRashidItem(id))
    .map(([id, qty]) => ({
      id,
      qty,
      item: itemById(id)!,
      normalPrice: itemValue(id),
      rashidPrice: rashidPrice(id),
    }))
    .sort((a, b) => b.rashidPrice - a.rashidPrice);

  const totalWorth = entries.reduce((acc, e) => acc + e.rashidPrice * e.qty, 0);

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('rayyan.title')}>
        <header className="picker-head">
          <div>
            <h3 style={{ margin: 0 }}>{t('rayyan.title')}</h3>
            <span className="small" style={{ color: '#7dd96b' }}>
              {t('rayyan.subtitle')}
            </span>
          </div>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <p className="small">
          {t('rayyan.quote')}
        </p>

        <div className="shop-list" style={{ marginTop: 8 }}>
          {entries.length === 0 ? (
            <p className="empty-msg" style={{ padding: 16 }}>
              {t('rayyan.empty')}
            </p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="shop-row">
                <img className="icon" src={icon(e.item.icon)} alt={itemName(e.item.name)} />
                <div className="shop-info">
                  <strong>
                    {itemName(e.item.name)} <span className="small">({e.qty} {t('rayyan.in_bank')})</span>
                  </strong>
                  <span className="small">
                    {t('rayyan.normal_price')} {e.normalPrice.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')} ·{' '}
                    <strong style={{ color: '#7dd96b' }}>
                      Rayyan: {e.rashidPrice.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')} (+35%)
                    </strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="primary small-btn" onClick={() => props.onSell(e.id, 1)}>
                    {t('rayyan.sell_one')}
                  </button>
                  {e.qty > 1 && (
                    <button className="primary small-btn" onClick={() => props.onSell(e.id, e.qty)}>
                      {t('rayyan.sell_all')} ({(e.rashidPrice * e.qty).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')})
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {entries.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #8a6a48', paddingTop: 8 }}>
            <span className="small" style={{ color: '#ffea88' }}>
              {t('rayyan.total_worth')} <strong>{totalWorth.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}</strong> {t('common.gold')}
            </span>
            <button
              className="primary small-btn"
              onClick={() => {
                for (const e of entries) props.onSell(e.id, e.qty);
              }}
            >
              {t('rayyan.sell_everything')} ({totalWorth.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')})
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** Valdemar: Colecionador de Troféus que troca Fichas do Chefe por peças lendárias e bolsas de armas. */
function BossShopModal(props: {
  bank: Record<string, number>;
  /** Para comparar cada peça com a equipada no mesmo espaço. */
  equipment: Partial<Record<EquipSlot, string>>;
  vocation: VocationId;
  onBuy: (item: string) => void;
  onClose: () => void;
}) {
  const lang = getLang();
  const tokenCount = props.bank[BOSS_TOKEN] ?? 0;
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('boss_shop.title')}>
        <header className="picker-head">
          <div>
            <h3 style={{ margin: 0 }}>{t('boss_shop.title')}</h3>
            <span className="small" style={{ color: '#ffea88' }}>
              {t('boss_shop.subtitle')}
            </span>
          </div>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>

        <div style={{ margin: '8px 0', padding: '8px 12px', background: 'rgba(255, 234, 136, 0.1)', border: '1px solid #8a6a48', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img className="icon" src={icon('boss_token')} alt="Ficha do Chefe" />
            <div>
              <strong>{t('boss_shop.in_bank')}</strong>
              <div className="small" style={{ color: '#ffea88' }}>{t('boss_shop.earned_by')}</div>
            </div>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffea88' }}>
            {tokenCount.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} <img className="icon tiny" src={icon('boss_token')} alt="" />
          </span>
        </div>

        <p className="small">
          {lang === 'pt'
            ? '"Cada peça de chefe representa um desafio superado no Bastião. Junte 50 fichas e escolha sua recompensa!"'
            : '"Each boss piece represents a triumphed ordeal in the Bastion. Gather 50 tokens and claim your reward!"'}
        </p>

        <div className="shop-list" style={{ marginTop: 8, maxHeight: 380, overflowY: 'auto' }}>
          {BOSS_TOKEN_SHOP_ITEMS.map((id) => {
            const item = itemById(id);
            if (!item) return null;
            const price = bossTokenPrice(id);
            const canAfford = tokenCount >= price;
            const eq = item.equip;
            const wrongVocation = !!eq?.vocations && !eq.vocations.includes(props.vocation);
            const stats = eq ? bonusText(eq) : item.pouch ? tr('1 arma sorteada (55% de chance de ser a da sua vocação):', '1 random weapon (55% chance it is for your vocation):') : '';
            return (
              <div key={id} className={`shop-row ${wrongVocation ? 'dim' : ''}`}>
                <img className="icon" src={icon(item.icon)} alt={itemName(item.name)} />
                <div className="shop-info">
                  <strong>
                    {itemName(item.name)} {eq && !wrongVocation && <UpgradeArrow v={upgradeVs(id, props.equipment)} />} {item.pouch ? <span className="small" style={{ color: '#ff9800' }}>[{lang === 'pt' ? 'Bolsa de Armas' : 'Weapon Pouch'}]</span> : null}
                  </strong>
                  <span className="small">
                    {stats} {eq ? `· ${t('common.level')} ${eq.level}` : ''}
                    {wrongVocation ? ` · ${t('shop.other_vocation')}` : ''}
                  </span>
                  {eq && !wrongVocation && <StatDiff id={id} equipment={props.equipment} />}
                  {item.pouch && (
                    <span className="pouch-pool">
                      {(item.pool ?? []).map((w) => {
                        const wi = itemById(w);
                        const mine = !!wi?.equip?.vocations?.includes(props.vocation);
                        return (
                          <span key={w} className={`small pouch-weapon ${mine ? 'mine' : 'dim'}`} title={wi?.equip ? bonusText(wi.equip) : ''}>
                            <img className="icon tiny" src={icon(wi?.icon ?? '')} alt="" /> {itemName(wi?.name ?? w)}
                            {wi?.equip ? ` · ${bonusText(wi.equip)}` : ''}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="small" style={{ color: canAfford ? '#ffea88' : '#ff8a6a', fontWeight: 'bold' }}>
                    {price.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} <img className="icon tiny" src={icon('boss_token')} alt="" />
                  </span>
                  <button
                    className="primary small-btn"
                    disabled={!canAfford}
                    onClick={() => props.onBuy(id)}
                  >
                    {lang === 'pt' ? 'Trocar' : 'Trade'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Forja Arcana de Vulcanus: Refino (+1 a +4) e Desmanche de equipamentos. */
/** Botões de tipo de peça no Vulcanus. */
const REFINE_SLOT_FILTERS: [EquipSlot | 'all', string, string][] = [
  ['all', 'Tudo', 'All'],
  ['weapon', 'Arma', 'Weapon'],
  ['shield', 'Escudo', 'Shield'],
  ['helmet', 'Elmo', 'Helmet'],
  ['armor', 'Armadura', 'Armor'],
  ['legs', 'Calças', 'Legs'],
  ['boots', 'Botas', 'Boots'],
  ['cape', 'Capa', 'Cape'],
  ['ring', 'Anel', 'Ring'],
  ['amulet', 'Amuleto', 'Amulet'],
];

function RefineryModal(props: {
  bank: Record<string, number>;
  /** Equipado conta como uma das duas cópias do refino (e aparece na lista). */
  equipment?: Partial<Record<EquipSlot, string | null>>;
  vocation: VocationId;
  combatLevel: number;
  onRefine: (item: string, protect: boolean) => void;
  onDismantle: (item: string, qty: number) => void;
  onAscend: (item: string, use: Record<string, number>, protect: boolean) => void;
  /** Falhas seguidas em cada passo da Ascensão e do refino (piedade). */
  pity?: number[];
  rpity?: number[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'refine' | 'ascend' | 'dismantle'>('refine');
  // Ascensão: a peça a subir e quantas de cada outra peça entram.
  const [target, setTarget] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, number>>({});
  // Passo da Ascensão: 0 = Comum -> Incomum, ...
  const [step, setStep] = useState(0);
  const [protect, setProtect] = useState(false);
  // Passo do refino: 0 = +0 -> +1, ...
  const [rstep, setRstep] = useState(0);
  // Mostra só as peças que estão no corpo.
  const [onlyWorn, setOnlyWorn] = useState(false);
  const [query, setQuery] = useState('');
  // Busca pelo nome (traduzido ou em português), sem acento e sem maiúscula.
  const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = fold(query.trim());
  const [slotFilter, setSlotFilter] = useState<EquipSlot | 'all'>('all');
  const matches = (id: string) => {
    if (slotFilter !== 'all' && itemById(id)?.equip?.slot !== slotFilter) return false;
    if (!q) return true;
    const raw = itemById(id)?.name ?? id;
    return fold(itemName(raw)).includes(q) || fold(raw).includes(q);
  };
  const gold = props.bank.gold ?? 0;
  const lang = getLang();

  const worn = Object.values(props.equipment ?? {}).filter((id): id is string => !!id);
  const ownedIds = new Set([...Object.keys(props.bank).filter((id) => (props.bank[id] ?? 0) >= 1), ...worn]);
  const fmt = (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const byLevel = (a: { currentItem: { equip?: { level?: number } } }, b: { currentItem: { equip?: { level?: number } } }) =>
    (b.currentItem.equip?.level ?? 0) - (a.currentItem.equip?.level ?? 0);

  // Refino: peças que ainda sobem de +K (a raridade fica); gasta ouro e o material da peça.
  const refineItems = [...ownedIds]
    .filter((id) => nextRefineId(id) !== null && itemById(id)?.equip)
    .map((id) => {
      const nextId = nextRefineId(id)!;
      const cost = refineCost(id);
      const mats = refineMaterials(id, props.bank, worn.includes(id));
      // A própria peça, se for a cópia e estiver no depósito, não conta como a cópia.
      const own = (m: string) => (m === id && !worn.includes(id) ? 1 : 0);
      const matsOk = Object.entries(mats).every(([m, q]) => (props.bank[m] ?? 0) - own(m) >= q);
      return {
        id,
        qty: props.bank[id] ?? 0,
        equipped: worn.includes(id) ? 1 : 0,
        nextId,
        currentItem: itemById(id)!,
        nextItem: itemById(nextId)!,
        cost,
        mats,
        canRefine: gold >= cost && matsOk,
      };
    })
    .sort((a, b) => Number(b.canRefine) - Number(a.canRefine) || byLevel(a, b));

  // Ascensão: peças que ainda sobem de raridade.
  // Peça de chefe nasce Lendária (sem sufixo): conta na aba Lendária e sobe com Essência de Chefe, sem outras peças.
  const isBoss = (id: string) => !!itemById(splitRarity(id).base)?.legendary;
  const effTier = (id: string) => (isBoss(id) && splitRarity(id).tier === 0 ? 4 : splitRarity(id).tier);
  const ascendItems = [...ownedIds]
    .filter((id) => nextRarityId(id) !== null && itemById(id))
    .map((id) => ({ id, equipped: worn.includes(id) ? 1 : 0, currentItem: itemById(id)!, nextItem: itemById(nextRarityId(id)!)! }))
    .sort(byLevel);

  // Quadro de chance (refino do +6 e Ascensão da Mítica para cima), com a piedade e o Selo.
  const chanceBox = (base: number, chance: number, fails: number) => {
    if (base >= 1) return null;
    const wards = props.bank[FORGE_WARD] ?? 0;
    return (
      <div className="small" style={{ margin: '0 0 8px', padding: 6, border: '1px solid #8a6a3e', background: '#2a1a12' }}>
        <strong style={{ color: '#ffea88' }}>
          {tr(`Chance de dar certo: ${Math.round(chance * 100)}%`, `Success chance: ${Math.round(chance * 100)}%`)}
          {protect && wards > 0 && chance < 1 ? ` (+${Math.round(FORGE_WARD_BONUS * 100)}% ${tr('com o Selo', 'with the Seal')})` : ''}
        </strong>
        {fails > 0 && <span style={{ color: '#7dd96b' }}>{tr(` · piedade: ${fails} falha(s) seguidas`, ` · pity: ${fails} failure(s) in a row`)}</span>}
        <div>{tr('Se falhar, só perde o ouro (peças e material ficam), e cada falha aumenta a chance da próxima.', 'On failure you only lose the gold (pieces and materials stay), and each failure raises the next chance.')}</div>
        {chance < 1 && (
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
            <input type="checkbox" checked={protect && wards > 0} disabled={wards < 1} onChange={(e) => setProtect(e.target.checked)} />
            {tr(`Usar Selo da Forja (+${Math.round(FORGE_WARD_BONUS * 100)}% de chance) · você tem ${wards}`, `Use Forge Seal (+${Math.round(FORGE_WARD_BONUS * 100)}% chance) · you have ${wards}`)}
          </label>
        )}
      </div>
    );
  };

  // Itens para desmanche: equipamentos no banco que geram materiais
  const dismantlableItems = Object.entries(props.bank)
    .filter(([id, qty]) => qty >= 1 && dismantleMaterials(id) !== null)
    .map(([id, qty]) => {
      const item = itemById(id)!;
      const mats = dismantleMaterials(id)!;
      return {
        id,
        qty,
        item,
        mats,
      };
    })
    .sort((a, b) => (b.item.equip?.level ?? 0) - (a.item.equip?.level ?? 0));

  // Ascensão: o que do depósito pode ser gasto para subir `tgt` (a própria, se não está no corpo, não conta).
  const fodderFor = (tgt: string) =>
    Object.entries(props.bank)
      .map(([id, q]) => ({ id, max: q - (id === tgt && !worn.includes(tgt) ? 1 : 0) }))
      .filter((f) => f.max > 0 && ascendFodder(tgt, f.id));

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Forja de Vulcanus">
        <header className="picker-head">
          <div>
            <h3 style={{ margin: 0 }}>{t('refinery.title')}</h3>
            <span className="small" style={{ color: '#ffea88' }}>
              {t('refinery.subtitle')}
            </span>
          </div>
          <button className="close" onClick={props.onClose} aria-label={tr('Fechar', 'Close')}>
            ×
          </button>
        </header>

        <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px' }}>
          <button
            className={`primary small-btn ${tab === 'refine' ? '' : 'ghost-btn'}`}
            onClick={() => setTab('refine')}
            style={{ flex: 1, padding: '8px 0', fontSize: '0.95rem' }}
          >
            {t('refinery.tab_refine')}
          </button>
          <button
            className={`primary small-btn ${tab === 'ascend' ? '' : 'ghost-btn'}`}
            onClick={() => setTab('ascend')}
            style={{ flex: 1, padding: '8px 0', fontSize: '0.95rem' }}
          >
            {tr('Ascensão', 'Ascension')}
          </button>
          <button
            className={`primary small-btn ${tab === 'dismantle' ? '' : 'ghost-btn'}`}
            onClick={() => setTab('dismantle')}
            style={{ flex: 1, padding: '8px 0', fontSize: '0.95rem' }}
          >
            {t('refinery.tab_dismantle')}
          </button>
        </div>

        <input
          type="search"
          className="bank-search-input"
          style={{ width: '100%', boxSizing: 'border-box', margin: '0 0 8px' }}
          placeholder={tr('Pesquisar item...', 'Search item...')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* Filtro por tipo de peça (pedido do Gioseppi: "só armadura, só capa"). */}
        <div className="refine-slots" role="group" aria-label={tr('Tipo de peça', 'Piece type')}>
          {REFINE_SLOT_FILTERS.map(([id, pt, en]) => (
            <button key={id} className={`small-btn ${slotFilter === id ? 'primary' : ''}`} aria-pressed={slotFilter === id} onClick={() => setSlotFilter(id)}>
              {tr(pt, en)}
            </button>
          ))}
        </div>
        {tab === 'refine' && (
          <div>
            <p className="small" style={{ margin: '0 0 10px', color: '#c4b5a0' }}>
              {tr(
                `Cada +1 deixa a peça ${Math.round(REFINE_STEP * 100)}% mais forte (até +${MAX_REFINE}), sem mudar a raridade. Gasta ouro, material da peça e 1 cópia igual (mesma peça e raridade, sem refino).`,
                `Each +1 makes the piece ${Math.round(REFINE_STEP * 100)}% stronger (up to +${MAX_REFINE}), without changing its rarity. Costs gold, the piece material and 1 identical copy (same piece and rarity, unrefined).`,
              )}{' '}
              ({tr('Saldo', 'Balance')}: <strong>{fmt(gold)}</strong> <Pix name="gold" />)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', gap: 3, margin: '0 0 8px' }}>
              {Array.from({ length: MAX_REFINE }, (_, k) => k).map((k) => {
                const ready = refineItems.filter((e) => splitRarity(e.id).refine === k && e.canRefine).length;
                return (
                  <button
                    key={k}
                    type="button"
                    className={`small-btn ${rstep === k ? 'primary' : 'ghost-btn'}`}
                    style={{ minWidth: 0, padding: '4px 2px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    onClick={() => setRstep(k)}
                  >
                    +{k} → +{k + 1}
                    {ready > 0 && ` (${ready})`}
                  </button>
                );
              })}
            </div>
            <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '0 0 8px' }}>
              <input type="checkbox" checked={onlyWorn} onChange={(e) => setOnlyWorn(e.target.checked)} />
              {tr('Só os equipados', 'Equipped only')}
            </label>
            {(() => {
              const sample = gearId('x', 0, rstep);
              const fails = props.rpity?.[rstep] ?? 0;
              return chanceBox(refineChance(sample), refineChance(sample, fails), fails);
            })()}
            <div className="shop-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {(() => {
                const rows = refineItems.filter((e) => splitRarity(e.id).refine === rstep && (!onlyWorn || e.equipped) && matches(e.id));
                if (!rows.length) return <p className="empty-msg" style={{ padding: 16 }}>{tr('Nenhuma peça neste refino.', 'No pieces at this refine level.')}</p>;
                return rows.map((e) => (
                  <div key={e.id} className={`shop-row ${!e.canRefine ? 'dim' : ''}`} style={{ alignItems: 'center' }}>
                    <img className="icon" src={icon(e.currentItem.icon)} alt="" />
                    <div className="shop-info">
                      <strong style={{ color: splitRarity(e.id).tier > 0 ? rarityOf(e.id).color : undefined }}>
                        {itemName(e.currentItem.name)}{' '}
                        <span className="small">
                          ({e.equipped ? tr('equipado', 'equipped') : `${e.qty} ${tr('no depósito', 'in bank')}`})
                        </span>
                      </strong>
                      <span className="small">{t('refinery.current')}: {e.currentItem.equip ? bonusText(e.currentItem.equip) : ''}</span>
                      <span className="small" style={{ color: '#7dd96b', fontWeight: 'bold' }}>
                        ➜ +{splitRarity(e.nextId).refine}: {e.nextItem.equip ? bonusText(e.nextItem.equip) : ''}
                      </span>
                      {(() => {
                        const base = splitRarity(e.id).base;
                        const spec = bossEssenceFor(base);
                        if (spec) {
                          const q = bossRefineEssence(splitRarity(e.id).refine);
                          const haveSpec = props.bank[spec] ?? 0;
                          const haveBoss = props.bank[BOSS_ESSENCE] ?? 0;
                          return (
                            <span className="small">
                              <span style={{ color: haveSpec >= q ? '#c4b5a0' : '#ff8a6a' }}>
                                {fmt(haveSpec)}/{fmt(q)} {itemName(itemById(spec)?.name ?? spec)}
                              </span>
                              {' '}{tr('ou', 'or')}{' '}
                              <span style={{ color: haveBoss >= q ? '#c4b5a0' : '#ff8a6a' }}>
                                {fmt(haveBoss)}/{fmt(q)} {itemName(itemById(BOSS_ESSENCE)?.name ?? 'Essência de Chefe')}
                              </span>
                            </span>
                          );
                        }
                        if (Object.keys(e.mats).length > 0) {
                          return (
                            <span className="small">
                              {Object.entries(e.mats).map(([m, q], i) => {
                                const have = Math.max(0, (props.bank[m] ?? 0) - (m === e.id && !e.equipped ? 1 : 0));
                                return (
                                  <span key={m} style={{ color: have >= q ? '#c4b5a0' : '#ff8a6a' }}>
                                    {i > 0 ? ', ' : ''}
                                    {fmt(have)}/{fmt(q)} {itemName(itemById(m)?.name ?? m)}
                                  </span>
                                );
                              })}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span className="small" style={{ color: gold >= e.cost ? '#ffea88' : '#ff8a6a', fontWeight: 'bold' }}>
                        {fmt(e.cost)} <Pix name="gold" />
                      </span>
                      <button
                        type="button"
                        className="primary small-btn"
                        disabled={!e.canRefine}
                        onClick={() => props.onRefine(e.id, protect && (props.bank[FORGE_WARD] ?? 0) > 0)}
                      >
                        {t('refinery.refine_btn')}
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {tab === 'ascend' && (
          <div>
            <p className="small" style={{ margin: '0 0 10px', color: '#c4b5a0' }}>
              {tr(
                `Escolha a peça que quer subir e junte mais ${ASCEND_FODDER} peças quaisquer da mesma raridade (nível de pelo menos metade do dela). As ${ASCEND_FODDER} somem; a escolhida sobe um tier.`,
                `Pick the piece to raise and add ${ASCEND_FODDER} more pieces of the same rarity (at least half its level). The ${ASCEND_FODDER} are consumed; the chosen one goes up a tier.`,
              )}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', gap: 3, margin: '0 0 8px' }}>
              {[0, 1, 2, 3, 4, 5, 6].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`small-btn ${step === st ? 'primary' : 'ghost-btn'}`}
                  style={{ minWidth: 0, padding: '4px 2px', fontSize: '0.75rem', whiteSpace: 'nowrap', color: step === st ? undefined : RARITIES[st + 1].color }}
                  onClick={() => { setStep(st); setTarget(null); setPick({}); }}
                >
                  → {itemName(`x (${RARITIES[st + 1].name})`).replace(/^x \((.+)\)$/, '$1')}
                </button>
              ))}
            </div>
            <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '0 0 8px' }}>
              <input type="checkbox" checked={onlyWorn} onChange={(e) => setOnlyWorn(e.target.checked)} />
              {tr('Só os equipados', 'Equipped only')}
            </label>
            {(() => {
              const sample = gearId('x', step, 0);
              const fails = props.pity?.[step] ?? 0;
              return chanceBox(ascendChance(sample), ascendChance(sample, fails), fails);
            })()}
            {!target ? (
              <div className="shop-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
                {ascendItems.filter((e) => effTier(e.id) === step && (!onlyWorn || e.equipped) && matches(e.id)).length === 0 ? (
                  <p className="empty-msg" style={{ padding: 16 }}>{tr('Nenhuma peça desta raridade.', 'No pieces of this rarity.')}</p>
                ) : (
                  ascendItems
                    .filter((e) => effTier(e.id) === step && (!onlyWorn || e.equipped) && matches(e.id))
                    .map((e) => {
                      if (isBoss(e.id)) {
                        const t = splitRarity(e.id).tier;
                        const need = BOSS_ASCEND_ESSENCE[t === 0 ? 0 : t - 4];
                        const spec = bossEssenceFor(splitRarity(e.id).base);
                        const haveSpec = spec ? (props.bank[spec] ?? 0) : 0;
                        const haveBoss = props.bank[BOSS_ESSENCE] ?? 0;
                        const gold = ascendCost(e.id);
                        const ok = (spec ? (haveSpec >= need || haveBoss >= need) : haveBoss >= need) && (props.bank.gold ?? 0) >= gold;
                        return (
                          <div key={e.id} className={`shop-row ${ok ? '' : 'dim'}`} style={{ alignItems: 'center' }}>
                            <img className="icon" src={icon(e.currentItem.icon)} alt="" />
                            <div className="shop-info">
                              <strong>{itemName(e.currentItem.name)}{e.equipped ? ` (${tr('equipado', 'equipped')})` : ''}</strong>
                              <span className="small" style={{ color: '#7dd96b' }}>➜ {itemName(e.nextItem.name)}: {e.nextItem.equip ? bonusText(e.nextItem.equip) : ''}</span>
                              <span className="small">
                                {spec ? (
                                  <>
                                    {tr('Peça de chefe:', 'Boss piece:')}{' '}
                                    <span style={{ color: haveSpec >= need ? '#c4b5a0' : '#ff8a6a' }}>
                                      {fmt(haveSpec)}/{fmt(need)} {itemName(itemById(spec)?.name ?? spec)}
                                    </span>
                                    {' '}{tr('ou', 'or')}{' '}
                                    <span style={{ color: haveBoss >= need ? '#c4b5a0' : '#ff8a6a' }}>
                                      {fmt(haveBoss)}/{fmt(need)} {itemName(itemById(BOSS_ESSENCE)?.name ?? 'Essência de Chefe')}
                                    </span>
                                    {` · ${fmt(gold)} ${tr('de ouro', 'gold')}`}
                                  </>
                                ) : (
                                  tr(`Peça de chefe: ${haveBoss}/${need} Essências de Chefe e ${fmt(gold)} de ouro`, `Boss piece: ${haveBoss}/${need} Boss Essences and ${fmt(gold)} gold`)
                                )}
                              </span>
                            </div>
                            <button type="button" className="primary small-btn" disabled={!ok} onClick={() => props.onAscend(e.id, {}, false)}>
                              {tr('Ascender', 'Ascend')}
                            </button>
                          </div>
                        );
                      }
                      const n = fodderFor(e.id).reduce((m, f) => m + f.max, 0);
                      return (
                        <div key={e.id} className={`shop-row ${n < ASCEND_FODDER ? 'dim' : ''}`} style={{ alignItems: 'center' }}>
                          <img className="icon" src={icon(e.currentItem.icon)} alt="" />
                          <div className="shop-info">
                            <strong>{itemName(e.currentItem.name)}{e.equipped ? ` (${tr('equipado', 'equipped')})` : ''}</strong>
                            <span className="small" style={{ color: '#7dd96b' }}>➜ {itemName(e.nextItem.name)}: {e.nextItem.equip ? bonusText(e.nextItem.equip) : ''}</span>
                            <span className="small">{tr(`${n} peças servem`, `${n} pieces fit`)}</span>
                          </div>
                          <button type="button" className="primary small-btn" disabled={n < ASCEND_FODDER} onClick={() => { setTarget(e.id); setPick({}); }}>
                            {tr('Escolher', 'Choose')}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            ) : (
              (() => {
                const it = itemById(target)!;
                const fod = fodderFor(target);
                const picked = Object.values(pick).reduce((m, q) => m + q, 0);
                const cost = ascendCost(target);
                const auto = () => {
                  // As mais fracas primeiro (menor nível), até fechar as 9.
                  const out: Record<string, number> = {};
                  let left = ASCEND_FODDER;
                  for (const f of [...fod].sort((a, b) => (itemById(a.id)!.equip?.level ?? 0) - (itemById(b.id)!.equip?.level ?? 0))) {
                    const q = Math.min(left, f.max);
                    if (q > 0) out[f.id] = q;
                    left -= q;
                    if (!left) break;
                  }
                  setPick(out);
                };
                return (
                  <div>
                    <div className="shop-row" style={{ alignItems: 'center' }}>
                      <img className="icon" src={icon(it.icon)} alt="" />
                      <div className="shop-info">
                        <strong>{itemName(it.name)} ➜ {itemName(itemById(nextRarityId(target)!)!.name)}</strong>
                        <span className="small">
                          {tr('Escolhidas', 'Picked')}: {picked}/{ASCEND_FODDER} · {cost.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} <Pix name="gold" />
                        </span>
                      </div>
                      <button type="button" className="small-btn ghost-btn" onClick={() => { setTarget(null); setPick({}); }}>
                        {tr('Voltar', 'Back')}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, margin: '6px 0' }}>
                      <button type="button" className="small-btn" onClick={auto}>{tr('Marcar as mais fracas', 'Pick the weakest')}</button>
                      <button type="button" className="small-btn ghost-btn" onClick={() => setPick({})}>{tr('Limpar', 'Clear')}</button>
                      <button
                        type="button"
                        className="primary small-btn"
                        style={{ marginLeft: 'auto' }}
                        disabled={picked !== ASCEND_FODDER || gold < cost}
                        onClick={() => { props.onAscend(target, pick, protect && (props.bank[FORGE_WARD] ?? 0) > 0); setTarget(null); setPick({}); }}
                      >
                        {gold < cost ? tr('Ouro insuficiente', 'Not enough gold') : tr('Ascender', 'Ascend')}
                      </button>
                    </div>
                    <div className="shop-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {fod.map((f) => {
                        const fi = itemById(f.id)!;
                        const q = pick[f.id] ?? 0;
                        const set = (v: number) => setPick((p) => {
                          const room = ASCEND_FODDER - (picked - (p[f.id] ?? 0));
                          const nv = Math.max(0, Math.min(f.max, room, v));
                          const { [f.id]: _, ...rest } = p;
                          return nv ? { ...rest, [f.id]: nv } : rest;
                        });
                        return (
                          <div key={f.id} className={`shop-row ${q ? '' : 'dim'}`} style={{ alignItems: 'center' }}>
                            <img className="icon" src={icon(fi.icon)} alt="" />
                            <div className="shop-info">
                              <strong>{itemName(fi.name)} <span className="small">×{f.max}</span></strong>
                              <span className="small">{tr('Nível', 'Level')} {fi.equip?.level ?? 1}</span>
                            </div>
                            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <button type="button" className="small-btn" onClick={() => set(q - 1)} disabled={!q}>−</button>
                              <strong>{q}</strong>
                              <button type="button" className="small-btn" onClick={() => set(q + 1)} disabled={q >= f.max || picked >= ASCEND_FODDER}>+</button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {tab === 'dismantle' && (
          <div>
            <p className="small" style={{ margin: '0 0 10px', color: '#c4b5a0' }}>
              {t('refinery.dismantle_desc')}
            </p>

            <div className="shop-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {dismantlableItems.filter((e) => matches(e.id)).length === 0 ? (
                <p className="empty-msg" style={{ padding: 16 }}>
                  {t('refinery.empty_dismantle')}
                </p>
              ) : (
                dismantlableItems.filter((e) => matches(e.id)).map((e) => {
                  const matText = Object.entries(e.mats)
                    .map(([matId, q]) => `${q}x ${itemName(itemById(matId)?.name ?? matId)}`)
                    .join(', ');

                  return (
                    <div key={e.id} className="shop-row" style={{ alignItems: 'center' }}>
                      <img className="icon" src={icon(e.item.icon)} alt={itemName(e.item.name)} />

                      <div className="shop-info">
                        <strong>
                          {itemName(e.item.name)} <span className="small">({e.qty} {lang === 'pt' ? 'no depósito' : 'in bank'})</span>
                        </strong>
                        <span className="small" style={{ color: '#ffea88' }}>
                          {t('refinery.recovers')}: {matText}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="small-btn danger-btn"
                          onClick={() => props.onDismantle(e.id, 1)}
                        >
                          {t('refinery.dismantle_one')}
                        </button>
                        {e.qty > 1 && (
                          <button
                            className="small-btn danger-btn"
                            onClick={() => props.onDismantle(e.id, e.qty)}
                          >
                            {t('refinery.dismantle_all')} ({e.qty})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** Bonecos de Treino (Dummy): treino AFK seguro de skills no Bastião. */
function DummyModal(props: {
  state: PlayerState;
  onStart: (dummyId: string) => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const current = props.state.activity?.node;
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('dummy.title')}>
        <header className="picker-head">
          <div>
            <h3 style={{ margin: 0 }}>{t('dummy.title')}</h3>
            <span className="small" style={{ color: '#9fd8ff' }}>
              {t('dummy.subtitle')}
            </span>
          </div>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <p className="small">
          {t('dummy.desc')}
        </p>

        <div className="shop-list" style={{ marginTop: 8 }}>
          {DUMMY_NODES.map((d) => {
            const isTraining = current === d.id;
            const skillLvl = levelForXp(props.state.skills[d.skill] ?? 0, d.skill);
            return (
              <div key={d.id} className="shop-row" style={isTraining ? { background: '#2d3e2d', borderColor: '#7dd96b' } : undefined}>
                <img className="icon" src={icon(d.icon)} alt={d.name} />
                <div className="shop-info">
                  <strong>
                    {d.name} <span className="small">· {t('common.level')} {skillLvl}</span>
                  </strong>
                  <span className="small">{d.description}</span>
                  <span className="muted small">
                    {t('dummy.rate')} +{dummyXpPerAction(d, props.state.skills.combat ?? 0).toLocaleString('pt-BR')} XP ({skillName(d.skill as SkillId)}) {t('dummy.and_combat')} {d.intervalMs / 1000}s
                    {d.id === 'dummy_melee' && props.state.equipment.shield ? ' (+Escudo)' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isTraining ? (
                    <button className="secondary small-btn" onClick={props.onStop}>
                      {t('dummy.stop')}
                    </button>
                  ) : (
                    <button className="primary small-btn" onClick={() => props.onStart(d.id)}>
                      {t('dummy.train_btn')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Moldura colorida pela raridade do equipamento (nada para o comum). */
/**
 * Moldura da raridade: Incomum e Rara só a borda; Épica ganha brilho em volta; da Lendária para cima
 * o fundo acende na cor e o brilho pulsa (mais forte e mais rápido na Divina e na Ancestral).
 */
export function rarityStyle(id: string): React.CSSProperties | undefined {
  const tier = splitRarity(id).tier;
  if (tier <= 0) return undefined;
  const c = rarityOf(id).color;
  if (tier < 3) return { boxShadow: `inset 0 0 0 3px ${c}` };
  if (tier === 3) return { boxShadow: `inset 0 0 0 3px ${c}, 0 0 6px ${c}aa` };
  return {
    '--rar': c,
    boxShadow: `inset 0 0 0 3px ${c}, 0 0 8px ${c}`,
    backgroundImage: `radial-gradient(circle, ${c}55 0%, transparent 70%)`,
    animation: `rarity-pulse ${tier >= 6 ? 1.2 : 1.8}s ease-in-out infinite`,
  } as React.CSSProperties;
}

/** Painéis da lateral: abrem e fecham pelos botões do topo. */
type PanelId = 'hunt' | 'party' | 'equip' | 'spells' | 'arena' | 'bestiary' | 'daily' | 'quests' | 'ach' | 'mastery' | 'skills' | 'pets' | 'bank' | 'prof' | 'chat';
const PANELS: { id: PanelId; label: string; icon: string }[] = [
  { id: 'hunt', label: 'Analisador', icon: 'skill_combat' },
  { id: 'party', label: t('panel.party'), icon: 'bronze_shield' },
  { id: 'equip', label: t('panel.equipment'), icon: 'bronze_armor' },
  { id: 'spells', label: t('panel.spells'), icon: 'dark_essence' },
  { id: 'arena', label: t('panel.arenas'), icon: 'arena_icon' },
  { id: 'bestiary', label: t('panel.bestiary'), icon: 'cyclops_eye' },
  { id: 'daily', label: t('panel.daily'), icon: 'ashfen_medal' },
  { id: 'ach', label: tr('Conquistas', 'Achievements'), icon: 'hunter_trophy_bronze' },
  { id: 'mastery', label: tr('Maestria', 'Mastery'), icon: 'cape_mastery' },
  { id: 'quests', label: t('panel.quests'), icon: 'crypt_key' },
  { id: 'skills', label: t('panel.skills'), icon: 'skill_mining' },
  { id: 'pets', label: t('panel.pets'), icon: 'pet_icon' },
  { id: 'bank', label: t('panel.inventory'), icon: 'gold' },
  { id: 'prof', label: t('panel.professions'), icon: 'skill_smithing' },
  { id: 'chat', label: t('panel.chat'), icon: 'feather' },
];
/** Atalhos de teclado dos painéis (H abre Organizar caçada; Esc fecha a janela aberta). */
const HOTKEYS: Record<string, PanelId> = { i: 'bank', j: 'quests', c: 'equip', k: 'skills', p: 'prof', m: 'mastery', b: 'bestiary', d: 'daily', g: 'spells', o: 'ach', n: 'pets', a: 'arena', u: 'hunt' };
const HOTKEY_OF: Partial<Record<PanelId, string>> = Object.fromEntries(Object.entries(HOTKEYS).map(([k, id]) => [id, k.toUpperCase()]));
/** Painéis que abrem como janela no meio da tela, e não na lateral. */
const MODAL_PANELS: PanelId[] = ['bank', 'arena', 'bestiary', 'prof', 'pets', 'quests', 'ach', 'mastery'];
/** Painéis que saíram da barra (pedido da comunidade: menos botão para o iniciante); abrem pelo menu Social e pelo atalho. */
const MENU_PANELS: PanelId[] = ['pets', 'ach', 'arena'];
const PANELS_KEY = 'grimhold.panels';

function loadPanels(): Set<PanelId> {
  try {
    const saved = JSON.parse(localStorage.getItem(PANELS_KEY) ?? 'null') as PanelId[] | null;
    if (Array.isArray(saved)) return new Set(saved.filter((id) => id !== 'chat' && !MODAL_PANELS.includes(id) && PANELS.some((p) => p.id === id)));
  } catch {
    // Sem armazenamento: começa com o padrão.
  }
  return new Set<PanelId>(['hunt']);
}

/**
 * Arrasto (largura e altura do HUD): segue o mouse até soltar. Para também se o botão foi solto
 * fora da janela, o navegador cancelou ou a janela perdeu o foco (antes o painel seguia o mouse
 * sozinho e "saía andando").
 */
function dragWith(move: (ev: PointerEvent) => void, done?: () => void) {
  const onMove = (ev: PointerEvent) => {
    if (ev.buttons === 0) return end();
    move(ev);
  };
  const end = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    window.removeEventListener('blur', end);
    done?.();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  window.addEventListener('blur', end);
}

type HudLayout = { side: 'left' | 'right'; width: number; order: PanelId[]; locked: boolean; heights: Partial<Record<PanelId, number>> };
const HUD_KEY = 'grimhold.hud';
function loadHud(): HudLayout {
  const base: HudLayout = { side: 'right', width: 340, order: PANELS.map((p) => p.id), locked: true, heights: {} };
  try {
    const v = JSON.parse(localStorage.getItem(HUD_KEY) ?? 'null') as Partial<HudLayout> | null;
    if (!v) return base;
    const order = Array.isArray(v.order) ? v.order.filter((id) => PANELS.some((p) => p.id === id)) : [];
    for (const p of PANELS) if (!order.includes(p.id)) order.push(p.id);
    return {
      side: v.side === 'left' ? 'left' : 'right',
      width: typeof v.width === 'number' ? Math.min(Math.max(v.width, 260), 760) : 340,
      order,
      locked: v.locked !== false,
      heights: v.heights && typeof v.heights === 'object' ? v.heights : {},
    };
  } catch {
    return base;
  }
}

function savePanels(open: Set<PanelId>) {
  try {
    localStorage.setItem(PANELS_KEY, JSON.stringify([...open]));
  } catch {
    // Sem armazenamento: só não lembra.
  }
}

/** Magias da vocação: liga até maxSpells(nível); na luta elas saem sozinhas. */
function SpellsPanel(props: { vocation: VocationId; combatLevel: number; equipped: string[]; onChange: (spells: string[]) => void }) {
  const slots = maxSpells(props.combatLevel);
  const full = props.equipped.length >= slots;
  return (
    <section className="panel spells">
      <h3>
        {t('spells.title')}{' '}
        <span className="small">
          {props.equipped.length}/{slots}
        </span>
      </h3>
      {slots < MAX_SPELLS && <p className="small">{t('spells.fourth_unlock')} {FOURTH_SPELL_LEVEL}.</p>}
      <p className="small">{t('spells.desc')}</p>
      {[...spellsFor(props.vocation)].sort((a, b) => a.level - b.level).map((s) => {
        const on = props.equipped.includes(s.id);
        const locked = s.level > props.combatLevel;
        return (
          <label key={s.id} className={`spell-row ${on ? 'on' : ''} ${locked ? 'locked' : ''}`}>
            <input
              type="checkbox"
              checked={on}
              disabled={locked || (!on && full)}
              onChange={() => props.onChange(on ? props.equipped.filter((x) => x !== s.id) : [...props.equipped, s.id])}
            />
            <span className="spell-info">
              <strong>{t(`spell.${s.id}.name`, s.name)}</strong>
              <span className="small">
                {locked ? `${t('spells.unlock_at')} ${s.level}` : t(`spell.${s.id}.desc`, s.description)} · {s.cost} mana · {s.cooldownMs / 1000}s
              </span>
            </span>
          </label>
        );
      })}
    </section>
  );
}

/** Tarefas do dia (trocam à meia-noite UTC) e as conquistas com o progresso. */
/** Profissões de coleta: a ferramenta dá chance de item extra por ação. */
const GATHERING_SKILLS = new Set<string>(['mining', 'woodcutting', 'fishing', 'herbalism', 'soulreaping']);

/** Primeiros passos: a meta atual do novato, com a dica e o resgate da recompensa. Some quando acaba. */
function FirstStepsCard(props: { state: PlayerState; onClaim: (id: string) => void }) {
  const { state } = props;
  const [min, setMin] = useState(() => {
    try {
      return localStorage.getItem('grimhold.firstSteps.min') === '1';
    } catch {
      return false;
    }
  });
  const stats = state.stats as Partial<Record<string, number>>;
  const step = nextFirstStep(stats);
  if (!step) return null;
  const claimed = FIRST_STEPS.filter((s) => firstStepClaimed(stats, s.id)).length;
  // Veterano que nunca usou o guia: não aparece.
  if (claimed === 0 && levelForXp(state.skills.combat ?? 0, 'combat') >= 30) return null;
  const pt = getLang() === 'pt';
  const ready = step.done({ skills: state.skills, equipment: state.equipment, stats, charms: state.charms, prey: state.prey });
  const toggle = () => {
    setMin(!min);
    try {
      localStorage.setItem('grimhold.firstSteps.min', min ? '0' : '1');
    } catch {}
  };
  return (
    <div className={`first-steps ${ready ? 'ready' : ''}`} role="status">
      <button className="first-steps-head" onClick={toggle} aria-expanded={!min}>
        <strong>{tr('Primeiros passos', 'First steps')}</strong>
        <span className="small">
          {claimed}/{FIRST_STEPS.length} {min ? '▴' : '▾'}
        </span>
      </button>
      {!min && (
        <>
          <div className="first-steps-name">{pt ? step.name[0] : step.name[1]}</div>
          <p className="small">{pt ? step.hint[0] : step.hint[1]}</p>
          <div className="first-steps-foot">
            <span className="small muted">
              {tr('Recompensa', 'Reward')}: {step.reward.gold} {tr('de ouro', 'gold')}
              {Object.entries(step.reward.items ?? {}).map(([id, qty]) => ` + ${qty} ${itemName(itemById(id)?.name ?? id)}`)}
            </span>
            {ready && (
              <button className="primary small-btn" onClick={() => props.onClaim(step.id)}>
                {tr('Resgatar', 'Claim')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Baú diário: abre com as 3 diárias entregues; a sequência de dias seguidos melhora o baú até o 7º. */
function DailyChest(props: { state: PlayerState; onOpen: () => void }) {
  const { state } = props;
  const chest = state.dailyChest;
  if (!chest) return null;
  const all = state.dailies.length > 0 && state.dailies.every((d) => d.claimed);
  const level = levelForXp(state.skills.combat ?? 0, 'combat');
  const r = dailyChestReward(level, chest.streak, 0, '');
  const lang = getLang();
  return (
    <div className={`daily-chest ${all && !chest.opened ? 'ready' : ''}`}>
      <div className="daily-chest-head">
        <Pix name="ui_gift" />
        <strong>{tr('Baú diário', 'Daily chest')}</strong>
        <span className="small">
          {tr('Sequência', 'Streak')}: {chest.streak}/{DAILY_CHEST_MAX_STREAK}
        </span>
      </div>
      <div className="daily-streak" aria-hidden="true">
        {Array.from({ length: DAILY_CHEST_MAX_STREAK }, (_, i) => (
          <span key={i} className={i < chest.streak ? 'on' : ''} />
        ))}
      </div>
      <p className="small">
        {r.gold.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {tr('de ouro', 'gold')} · +{r.charmPoints} {tr('pontos de charm', 'charm points')}
        {chest.streak >= DAILY_CHEST_MAX_STREAK ? tr(' · curinga de prey e 10 materiais de imbuement', ' · prey wildcard and 10 imbuement materials') : ''}
      </p>
      {chest.opened ? (
        <span className="small">{tr('Aberto hoje. Volte amanhã para manter a sequência!', 'Opened today. Come back tomorrow to keep your streak!')}</span>
      ) : all ? (
        <button className="primary small-btn" onClick={props.onOpen}>
          {tr('Abrir o baú', 'Open chest')}
        </button>
      ) : (
        <span className="small muted">{tr('Entregue as 3 diárias para abrir. Cada dia seguido melhora o baú; perder um dia volta ao 1.', 'Turn in all 3 dailies to open it. Each day in a row improves it; missing a day resets it.')}</span>
      )}
    </div>
  );
}

function DailyPanel(props: {
  state: PlayerState;
  onClaim: (idx: number) => void;
  onChest: () => void;
  onSetGatherPreferences: (skills: GatheringSkillId[]) => void;
}) {
  const { state } = props;
  const [openModal, setOpenModal] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<GatheringSkillId[]>(state.dailyGatherPreferences?.skills ?? []);

  useEffect(() => {
    if (!openModal) {
      setSelectedSkills(state.dailyGatherPreferences?.skills ?? []);
    }
  }, [state.dailyGatherPreferences, openModal]);

  return (
    <section className="panel dailies">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{t('daily.title')}</h3>
        <button
          className="ghost small-btn"
          onClick={() => {
            setSelectedSkills(state.dailyGatherPreferences?.skills ?? []);
            setOpenModal(true);
          }}
        >
          {tr('Escolher profissões', 'Choose professions')}
        </button>
      </div>
      {openModal && (
        <div className="overlay" onClick={() => setOpenModal(false)}>
          <section className="panel modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('Escolher profissões', 'Choose professions')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{tr('Escolher profissões', 'Choose professions')}</h3>
              <button className="ghost small-btn" onClick={() => setOpenModal(false)}>✕</button>
            </div>
            <p className="small muted" style={{ textAlign: 'left', marginBottom: 12, lineHeight: 1.4 }}>
              {tr('A escolha vale a partir de amanhã.', 'The choice takes effect tomorrow.')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 16 }}>
              {GATHER_SKILLS.map((sk) => {
                const checked = selectedSkills.includes(sk);
                return (
                  <label key={sk} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSkills([...selectedSkills, sk]);
                        } else {
                          setSelectedSkills(selectedSkills.filter((s) => s !== sk));
                        }
                      }}
                    />
                    <span>{t(`skill.${sk}`)}</span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="ghost small-btn" onClick={() => setOpenModal(false)}>
                {tr('Cancelar', 'Cancel')}
              </button>
              <button
                className="primary small-btn"
                onClick={() => {
                  props.onSetGatherPreferences(selectedSkills);
                  setOpenModal(false);
                }}
              >
                {tr('Salvar', 'Save')}
              </button>
            </div>
          </section>
        </div>
      )}
      {state.dailies.map((d) => {
        // Onde/o quê: o item da coleta ou a caçada (diárias novas, 25/10).
        const where = d.where ? (itemById(d.where) ? itemName(itemById(d.where)!.name) : storyText(d.where)) : null;
        const target = d.goal.kind === 'level' ? d.goal.level : d.goal.count;
        const shown = Math.min(target, d.progress);
        const ready = !d.claimed && shown >= target;
        return (
          <div key={d.idx} className={`quest-row ${d.claimed ? 'claimed' : ready ? 'done' : ''}`}>
            <div className="quest-head">
              <strong>{getLang() === 'en' && d.en ? d.en : t(`daily.name.${d.name}`, d.name)}</strong>
              {where && <span className="small">{where}</span>}
              <span className="small">
                {d.reward.gold} {t('daily.gold')} · {d.reward.xp.combat} {t('daily.combat_xp')}
              </span>
            </div>
            <div className="bar thin">
              <div className="fill xp" style={{ width: `${(shown / target) * 100}%` }} />
            </div>
            {d.claimed ? (
              <span className="small">{t('daily.delivered')}</span>
            ) : ready ? (
              <button className="primary small-btn" onClick={() => props.onClaim(d.idx)}>
                {t('daily.claim')}
              </button>
            ) : (
              <span className="small">
                {shown}/{target}
              </span>
            )}
          </div>
        );
      })}
      <DailyChest state={state} onOpen={props.onChest} />
      {!!state.endgameDailies?.length && (
        <>
          <h4>{tr('Fim de jogo (400+)', 'End game (400+)')}</h4>
          {state.endgameDailies.map((d) => {
            const target = d.goal.kind === 'level' ? d.goal.level : d.goal.count;
            const shown = Math.min(target, d.progress);
            const ready = !d.claimed && shown >= target;
            const frags = d.reward.items?.[RAID_FRAGMENT_ID] ?? 0;
            return (
              <div key={d.idx} className={`quest-row ${d.claimed ? 'claimed' : ready ? 'done' : ''}`}>
                <div className="quest-head">
                  <strong>{getLang() === 'en' && d.en ? d.en : d.name}</strong>
                  <span className="small">{d.category === 'endgame_weekly' ? tr('Semanal', 'Weekly') : tr('Diária', 'Daily')}</span>
                  <span className="small">
                    {d.reward.gold.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US')} {t('daily.gold')} · {frags} {tr('Fragmentos de Raide', 'Raid Fragments')}
                  </span>
                </div>
                <div className="bar thin">
                  <div className="fill xp" style={{ width: `${(shown / target) * 100}%` }} />
                </div>
                {d.claimed ? (
                  <span className="small">{t('daily.delivered')}</span>
                ) : ready ? (
                  <button className="primary small-btn" onClick={() => props.onClaim(d.idx)}>
                    {t('daily.claim')}
                  </button>
                ) : (
                  <span className="small">
                    {shown}/{target}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

/** Flecha de área: quanto do tiro respinga nos outros monstros. */
function arrowSplashText(a: { splash?: number }) {
  return a.splash ? ` · ${Math.round(a.splash * 100)}% ${tr('em área', 'to all')}` : '';
}

/** Retrato animado do monstro da tarefa (cai no troféu se o monstro não existir). */
function TaskMonster({ id }: { id: string }) {
  const m = MONSTERS.find((x) => x.id === id);
  return (
    <div className="task-mon">
      {m ? <MonsterSprite sprite={m.sprite} height={44} /> : <img className="icon" src={icon('hunter_trophy_bronze')} alt="" />}
    </div>
  );
}

/** XP/h do combate pelo ganho dos últimos minutos (amostras a cada mudança, janela de 10 min), como no Tibia. */
const XP_RATE_WINDOW_MS = 10 * 60_000;
function useXpRate(xp: number): number {
  const samples = useRef<{ t: number; xp: number }[]>([]);
  const [rate, setRate] = useState(0);
  // Recalcula também sem ganho novo (parou de caçar: o ritmo cai até zerar).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const now = Date.now();
    const list = samples.current;
    // XP que caiu (troca de personagem) zera a janela.
    if (list.length && xp < list[list.length - 1].xp) list.length = 0;
    list.push({ t: now, xp });
    while (list.length > 1 && now - list[0].t > XP_RATE_WINDOW_MS) list.shift();
    const span = now - list[0].t;
    // 27/10: um ganho de uma vez (o tempo offline creditado ao voltar, recompensa de chefe ou quest) contava como se
    // fosse por minuto e o XP/h ia a milhares de vezes o real. Passos com ritmo 10x acima da mediana não entram.
    const steps = list.slice(1).map((s, i) => ({ gain: s.xp - list[i].xp, dt: Math.max(1, s.t - list[i].t) }));
    const rates = steps.filter((s) => s.gain > 0).map((s) => s.gain / s.dt).sort((a, b) => a - b);
    const median = rates.length ? rates[Math.floor(rates.length / 2)] : 0;
    const gained = steps.reduce((n, s) => n + (s.gain / s.dt > median * 10 ? 0 : s.gain), 0);
    // Com menos de 3 ganhos ainda não dá para saber qual é o normal: não mostra.
    setRate(span >= 60_000 && rates.length >= 3 ? (gained / span) * 3_600_000 : 0);
  }, [xp, tick]);
  return rate;
}

/** Texto da barra de XP: XP total, quanto falta e em quanto tempo sobe no ritmo atual. */
function xpBarTitle(xp: number, level: number, rate: number, lang: string): string {
  const loc = lang === 'pt' ? 'pt-BR' : 'en-US';
  const left = Math.max(0, xpForLevel(level + 1) - xp);
  const pt = lang === 'pt';
  const lines = [`${xp.toLocaleString(loc)} XP`, pt ? `Faltam ${left.toLocaleString(loc)} XP para o nível ${level + 1}` : `${left.toLocaleString(loc)} XP to level ${level + 1}`];
  if (rate > 0) {
    const mins = Math.ceil((left / rate) * 60);
    const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    const time = d ? `${d}d ${h}h` : h ? `${h}h ${m}min` : `${m}min`;
    lines.push(pt ? `${Math.round(rate).toLocaleString(loc)} XP/h · próximo nível em ~${time}` : `${Math.round(rate).toLocaleString(loc)} XP/h · next level in ~${time}`);
  } else lines.push(pt ? 'Cace por alguns minutos para ver em quanto tempo sobe' : 'Hunt for a few minutes to see when you level up');
  return lines.join(String.fromCharCode(10));
}

/** Raide: em que fase está e quanto falta para a próxima (o grupo avança junto, num horário fixo por fase). */
function RaidStatus({ since, seq, fightMs, clockOffset }: { since: number; seq: number; fightMs?: number; clockOffset: { current: number } }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const now = Date.now() + clockOffset.current;
  const phase = Math.min(seq + 1, 3);
  if (now < since) return <span className="small">{tr(`Raide: entrando (${Math.ceil((since - now) / 1000)} s)`, `Raid: entering (${Math.ceil((since - now) / 1000)} s)`)}</span>;
  const left = Math.max(0, Math.ceil((since + RAID_MAX_FIGHT_MS + RAID_PHASE_REST_MS - now) / 1000));
  const won = fightMs !== undefined && now - since >= fightMs;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <span className="small">
      {won
        ? tr(`Raide: fase ${phase} de 3 vencida. ${phase < 3 ? 'Próxima fase' : 'Fim'} em ${clock}`, `Raid: phase ${phase} of 3 won. ${phase < 3 ? 'Next phase' : 'End'} in ${clock}`)
        : tr(`Raide: fase ${phase} de 3 (tempo da fase: ${clock})`, `Raid: phase ${phase} of 3 (phase time: ${clock})`)}
    </span>
  );
}
