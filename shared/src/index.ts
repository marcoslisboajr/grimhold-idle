import vocationsData from '../data/vocations.json';
import { itemById, type Activity, type EquipSlot, type Gains, type QueuedActivity, type SkillId, type GatheringSkillId } from './skills.ts';
import type { CycleView } from './activity.ts';
import type { QuestState } from './quests.ts';
import type { Daily, DailyState, StatKey } from './dailies.ts';
import type { BossReward, BossView } from './worldboss.ts';
import type { StoryState } from './stories.ts';
import type { CharmState, PreySlot } from './bestiary.ts';
import type { HuntingTaskState } from './hunting_tasks.ts';
import type { SlayerBoosts, SlayerState } from './slayer.ts';
import type { GuildTaskState } from './guild.ts';
import type { CharacterArenaState } from './arena.ts';
import type { CombatRules } from './spells.ts';
import type { MasteryState } from './mastery.ts';
import type { TradeClientCommand, TradeServerMessage } from './trade.ts';
import type { PartyView, PartyInviteView } from './party.ts';

export * from './skills.ts';
export * from './combat.ts';
export * from './capes.ts';
export * from './elements.ts';
export * from './activity.ts';
export * from './quests.ts';
export * from './spells.ts';
export * from './dailies.ts';
export * from './worldboss.ts';
export * from './stories.ts';
export * from './imbuements.ts';
export * from './bestiary.ts';
export * from './bosstiary.ts';
export * from './reaper.ts';
export * from './hunting_tasks.ts';
export * from './slayer.ts';
export * from './guild.ts';
export * from './rashid.ts';
export * from './arena.ts';
export * from './dummy.ts';
export * from './boosted.ts';
export * from './party.ts';
export * from './pets.ts';
export * from './sigils.ts';
export * from './trade.ts';
export * from './events.ts';
export * from './votes.ts';
export * from './task_shop.ts';
export * from './instances.ts';
export * from './proftools.ts';
export * from './guide.ts';
export * from './first_steps.ts';
export * from './mastery.ts';
export * from './raids.ts';
/** Aviso do chat que também vira comemoração para todos (faixa e fanfarra): o primeiro 99 numa profissão. */
export const CELEBRATE_PREFIX = '🎉 ';
export * from './achievements.ts';

// ── Vocações ────────────────────────────────────────────────────────────────

export type VocationId = 'warrior' | 'hunter' | 'arcanist' | 'devout';

export interface Vocation {
  id: VocationId;
  name: string;
  role: string;
  /** Herói do Grimhold que ensina esta vocação (NPC no Bastião). */
  master: string;
  promotions: string[];
  base: { hp: number; mana: number; attack: number; defense: number; attackSpeedMs: number };
}

export const VOCATIONS = vocationsData as Vocation[];

export function isVocationId(v: unknown): v is VocationId {
  return typeof v === 'string' && VOCATIONS.some((x) => x.id === v);
}

// ── Aparência ───────────────────────────────────────────────────────────────

/** Estilos de cabelo do paperdoll oferecidos por gênero (mesma lista de scripts/sprites_paperdoll.py). */
export const LOOK_HAIR = { m: [1, 2, 3, 5, 6, 8, 9, 12], f: [1, 2, 5, 9, 10, 13, 14, 16] } as const;
export const LOOK_HAIR_COLORS = ['brown', 'blonde', 'black', 'white', 'red', 'blue', 'green', 'pink', 'gray', 'purple', 'orange', 'teal', 'burgundy'] as const;
/** Tons de pele (bases do paperdoll 1 a LOOK_SKINS). */
export const LOOK_SKINS = 10;
/** Cores da roupa: null = a original da vocação; número = matiz (graus) da recoloração. */
export const LOOK_OUTFITS = [null, 0, 15, 30, 45, 55, 75, 95, 120, 150, 180, 200, 215, 240, 270, 290, 320, 340] as const;

export const LOOK_ADDONS = ['strawhat', 'glasses', 'tophat', 'captain_hat', 'ranger_hat', 'sash', 'wizard_hat'] as const;
export type LookAddon = (typeof LOOK_ADDONS)[number];
export const ADDON_NAMES: Record<LookAddon, string> = {
  strawhat: 'Chapéu de Palha',
  glasses: 'Óculos de Erudito',
  tophat: 'Cartola Noturna',
  captain_hat: 'Chapéu de Corsário',
  ranger_hat: 'Chapéu de Caçador',
  sash: 'Faixa da Guarda',
  wizard_hat: 'Chapéu do Arquimago',
};

export type OutfitId = 'citizen' | 'warrior' | 'hunter' | 'arcanist' | 'devout' | 'pirate' | 'noble' | 'barbarian' | 'annihilator' | 'demon_slayer' | 'dragon_slayer' | 'legend_warrior' | 'legend_hunter' | 'legend_arcanist' | 'legend_devout' | 'wanderer' | 'mimic_hunter' | 'walking_chest' | 'candy_maker' | 'vote_herald' | 'vote_shadow' | 'vote_frost' | 'vote_ember' | 'vote_druid' | 'oak_warden' | 'inquisitor' | 'pit_lord' | 'artisan' | 'lion_knight' | 'usurper_ascended' | 'shattered_souls' | 'fallen_blood' | 'eternal_frost' | 'witch' | 'vampire' | 'plague_doctor';

export interface OutfitDef {
  id: OutfitId;
  name: string;
  description: string;
  /** Só quem concluiu a quest que dá o traje pode usar. */
  quest?: boolean;
}

export const OUTFIT_DEFS: OutfitDef[] = [
  { id: 'citizen', name: 'Cidadão', description: 'Roupas clássicas de aventureiro.' },
  { id: 'warrior', name: 'Cavaleiro', description: 'Armadura pesada de cavaleiro.' },
  { id: 'hunter', name: 'Caçador', description: 'Traje florestal de patrulheiro.' },
  { id: 'arcanist', name: 'Arcanista', description: 'Túnica e capuz arcanos.' },
  { id: 'devout', name: 'Monge', description: 'Traje de dojo tradicional com faixa.' },
  { id: 'pirate', name: 'Pirata', description: 'Casaco e botas de corsário.' },
  { id: 'noble', name: 'Nobre', description: 'Traje requintado de gala.' },
  { id: 'barbarian', name: 'Bárbaro', description: 'Armadura rústica nórdica.' },
  { id: 'demon_slayer', name: 'Caçador de Demônios', description: 'Armadura rubra de quem baniu Delrith (quest O Caçador de Demônios).', quest: true },
  { id: 'dragon_slayer', name: 'Matador de Dragões', description: 'Armadura verde-escama de quem derrubou Elvarg (quest O Matador de Dragões).', quest: true },
  { id: 'annihilator', name: 'Aniquilador', description: 'Armadura dourada de quem sobreviveu à Aniquilação (quest A Aniquilação).', quest: true },
  // Trajes lendários: um por vocação, ganhos na Ascensão Lendária (nível 100).
  { id: 'legend_warrior', name: 'Campeão Escarlate', description: 'Couraça escarlate e elmo dourado dos guerreiros que fizeram a Ascensão Lendária.', quest: true },
  { id: 'legend_hunter', name: 'Sentinela da Névoa', description: 'Capuz e jaqueta cor de névoa dos caçadores que fizeram a Ascensão Lendária.', quest: true },
  { id: 'legend_arcanist', name: 'Oráculo de Jade', description: 'Túnica de jade e chapéu dourado dos arcanistas que fizeram a Ascensão Lendária.', quest: true },
  { id: 'legend_devout', name: 'Peregrino Celeste', description: 'Manto branco e capuz celeste dos devotos que fizeram a Ascensão Lendária.', quest: true },
  { id: 'wanderer', name: 'Andarilho', description: 'Chapéu de pena e peito aberto: de quem enfrentou Malgoroth, o Senhor Caído, na invasão do Bastião.', quest: true },
  // Dia das Crianças: vendidos pela Tia Jujuba, com doces.
  { id: 'mimic_hunter', name: 'Caçador de Mímicos', description: 'Jaqueta cor de baú e boina rosa: de quem caçou mímicos no Dia das Crianças.', quest: true },
  { id: 'walking_chest', name: 'Baú Ambulante', description: 'Uma armadura de madeira e ferro com dentes na viseira. Ninguém sabe se tem alguém dentro.', quest: true },
  { id: 'candy_maker', name: 'Doceiro', description: 'Avental rosa e chapéu de cozinheiro: o ajudante da Tia Jujuba.', quest: true },
  // Evento de Halloween: vendidos na Loja de Halloween pelo Jack, com doces.
  { id: 'witch', name: 'Bruxa', description: 'Cartola e manto violeta: de quem celebrou a noite das bruxas (Halloween 2026).', quest: true },
  { id: 'vampire', name: 'Vampiro', description: 'Camisa branca e capa negra: a elegância sombria da noite (Halloween 2026).', quest: true },
  { id: 'plague_doctor', name: 'Médico da Peste', description: 'Máscara de bico e casaco encerado: o doutor que ronda as noites de névoa (Halloween 2026).', quest: true },
  // Loja de Votos: trocados por Moedas de Voto.
  { id: 'vote_herald', name: 'Arauto Violeta', description: 'Armadura violeta e elmo dourado: de quem vota pelo Grimhold todo dia.', quest: true },
  { id: 'vote_shadow', name: 'Lâmina Sombria', description: 'Couro escuro como a noite, feito para não ser visto.', quest: true },
  { id: 'vote_frost', name: 'Guardião Glacial', description: 'Placas azul-gelo forjadas nos Confins Gelados.', quest: true },
  { id: 'vote_ember', name: 'Manto de Brasa', description: 'Túnica e capuz cor de fogo, ainda quentes da fornalha.', quest: true },
  { id: 'vote_druid', name: 'Druida do Bosque', description: 'Manto verde de folhas e capuz de musgo dos guardiões da mata.', quest: true },
  { id: 'oak_warden', name: 'Guardião do Bosque', description: 'Couro de casca e capuz de musgo de quem queimou o Carvalho de Ashfen (quest O Carvalho de Ashfen).', quest: true },
  { id: 'inquisitor', name: 'Inquisidor', description: 'Placas brancas e douradas da Ordem do Alvorecer, de quem derrubou os cinco Arautos (quest A Inquisição do Alvorecer).', quest: true },
  { id: 'pit_lord', name: 'Senhor dos Fossos', description: 'Placas pretas com brasa nas juntas, de quem desceu os sete fossos e derrubou Kharvos (quest Os Fossos de Kharvos).', quest: true },
  { id: 'lion_knight', name: 'Cavaleiro do Leão', description: 'Placas douradas da Guarda do Leão, de quem derrubou o Grão-Mestre Aldoran e libertou Valdeferro (quest A Queda do Gavião).', quest: true },
  { id: 'usurper_ascended', name: 'Usurpador Ascendido', description: 'Placas violeta e elmo dourado de quem derrubou o Usurpador nas três fases da Raide.', quest: true },
  { id: 'shattered_souls', name: 'Almas Partidas', description: 'Placas azul-violeta espectrais de quem subjugou os seis aspectos de Vorthan na Guerra das Almas.', quest: true },
  { id: 'fallen_blood', name: 'Sangue Caído', description: 'Placas carmesim de quem subjugou Sangrath na Necrópole do Rei Lich.', quest: true },
  { id: 'eternal_frost', name: 'Inverno Eterno', description: 'Armadura forjada no coração do gelo eterno para quem conquistou a Fortaleza do Inverno.', quest: true },
  { id: 'artisan', name: 'Artesão', description: 'Avental de couro e lenço de quem chegou a Grão-Mestre da Guilda (Encomendas da Guilda, na janela Profissões).', quest: true },
];
export const OUTFIT_IDS: readonly OutfitId[] = OUTFIT_DEFS.map((o) => o.id);
/** Trajes que todo personagem tem; os de quest se ganham. */
export const FREE_OUTFIT_IDS: readonly OutfitId[] = OUTFIT_DEFS.filter((o) => !o.quest).map((o) => o.id);

export interface Look {
  gender: 'm' | 'f';
  /** Tom de pele, 1 a LOOK_SKINS (bases do paperdoll). */
  skin: number;
  /** Número do estilo de cabelo do pack (um de LOOK_HAIR[gender]). */
  hair: number;
  hairColor: (typeof LOOK_HAIR_COLORS)[number];
  outfit: (typeof LOOK_OUTFITS)[number];
  /** Modelo de outfit/roupa escolhido. Padrão: a da vocação. */
  outfitId?: OutfitId;
  /** Mostrar o elmo equipado no sprite (cobre o cabelo). Padrão: escondido. */
  showHelmet?: boolean;
  /** Ocultar armadura e calças equipadas no sprite (exibe o visual puro do traje). Padrão: falso. */
  hideArmor?: boolean;
  /** Esconder a capa equipada no sprite (os atributos continuam valendo). */
  hideCape?: boolean;
  /** Addons cosméticos ativos. */
  addons?: LookAddon[];
}

/** Aparência padrão de cada vocação (quem não escolheu, ou personagens antigos). */
export const DEFAULT_LOOKS: Record<VocationId, Look> = {
  warrior: { gender: 'm', skin: 1, hair: 2, hairColor: 'brown', outfit: null, outfitId: 'warrior' },
  hunter: { gender: 'f', skin: 1, hair: 13, hairColor: 'brown', outfit: null, outfitId: 'hunter' },
  arcanist: { gender: 'm', skin: 2, hair: 5, hairColor: 'black', outfit: null, outfitId: 'arcanist' },
  devout: { gender: 'f', skin: 2, hair: 9, hairColor: 'blonde', outfit: null, outfitId: 'devout' },
};

/** Valida uma aparência vinda do cliente; null se algo estiver fora das opções. */
export function parseLook(v: unknown): Look | null {
  if (!v || typeof v !== 'object') return null;
  const l = v as Record<string, unknown>;
  if (l.gender !== 'm' && l.gender !== 'f') return null;
  if (typeof l.skin !== 'number' || !Number.isInteger(l.skin) || l.skin < 1 || l.skin > LOOK_SKINS) return null;
  if (!(LOOK_HAIR[l.gender] as readonly unknown[]).includes(l.hair)) return null;
  if (!(LOOK_HAIR_COLORS as readonly unknown[]).includes(l.hairColor)) return null;
  if (!(LOOK_OUTFITS as readonly unknown[]).includes(l.outfit)) return null;
  if (l.showHelmet !== undefined && typeof l.showHelmet !== 'boolean') return null;
  if (l.hideArmor !== undefined && typeof l.hideArmor !== 'boolean') return null;
  if (l.hideCape !== undefined && typeof l.hideCape !== 'boolean') return null;
  let outfitId: OutfitId | undefined = undefined;
  if (typeof l.outfitId === 'string' && (OUTFIT_IDS as readonly string[]).includes(l.outfitId)) {
    outfitId = l.outfitId as OutfitId;
  }
  let addons: LookAddon[] | undefined = undefined;
  if (Array.isArray(l.addons)) {
    addons = Array.from(new Set(l.addons.filter((a): a is LookAddon => (LOOK_ADDONS as readonly unknown[]).includes(a))));
  }
  return {
    gender: l.gender,
    skin: l.skin,
    hair: l.hair as number,
    hairColor: l.hairColor as Look['hairColor'],
    outfit: l.outfit as Look['outfit'],
    ...(outfitId ? { outfitId } : {}),
    ...(l.showHelmet ? { showHelmet: true } : {}),
    ...(l.hideArmor ? { hideArmor: true } : {}),
    ...(l.hideCape ? { hideCape: true } : {}),
    ...(addons && addons.length > 0 ? { addons } : {}),
  };
}

// ── Personagem ──────────────────────────────────────────────────────────────

export interface Character {
  id: number;
  name: string;
  vocation: VocationId;
  /** Aparência escolhida (gênero, pele, cabelo, cor da roupa). */
  look: Look;
  /** Addons de aparência desbloqueados em quests. */
  unlockedAddons?: LookAddon[];
  /** Outfits de aparência desbloqueados. */
  unlockedOutfits?: OutfitId[];
  /** Promoção escolhida no nível 30, ou null. */
  promotion: string | null;
  level: number;
  xp: number;
  createdAt: string;
}

// ── Conta ───────────────────────────────────────────────────────────────────

/** Personagens por conta. */
export const MAX_CHARACTERS = 10;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Usuário de login: letras, números, ponto, hífen e sublinhado. Devolve o erro, ou null. */
export function validateUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Usuário inválido.';
  if (raw.length < USERNAME_MIN || raw.length > USERNAME_MAX) {
    return `O usuário precisa ter de ${USERNAME_MIN} a ${USERNAME_MAX} caracteres.`;
  }
  if (!/^[A-Za-z0-9._-]+$/.test(raw)) return 'Use só letras, números, ponto, hífen e sublinhado.';
  return null;
}

export function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Senha inválida.';
  if (raw.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (raw.length > PASSWORD_MAX) return 'Senha longa demais.';
  return null;
}

export const NAME_MIN = 3;
export const NAME_MAX = 16;

/** Devolve a mensagem de erro, ou null se o nome é válido. */
export function validateCharacterName(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Nome inválido.';
  const name = raw.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return `O nome precisa ter entre ${NAME_MIN} e ${NAME_MAX} letras.`;
  }
  if (!/^[A-Za-zÀ-ÿ]+( [A-Za-zÀ-ÿ]+)*$/.test(name)) {
    return 'Use só letras e um espaço entre as palavras.';
  }
  return null;
}

/** Normaliza para gravar: sem espaços extras, cada palavra com maiúscula. */
export function normalizeCharacterName(raw: string): string {
  return raw
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ── Protocolo WebSocket ─────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'start'; skill: SkillId; node: string }
  /** Fila de profissões: troca a lista inteira. */
  | { type: 'queue_set'; queue: QueuedActivity[] }
  /** Até quando vai a profissão atual (horas a partir de agora; null = até acabar o material). */
  | { type: 'queue_limit'; hours: number | null }
  | { type: 'stop' }
  | { type: 'equip'; item: string }
  | { type: 'unequip'; slot: EquipSlot }
  | { type: 'promote'; promotion: string }
  | { type: 'market_list'; item: string; qty: number; price: number }
  | { type: 'market_buy'; listing: number; qty: number }
  | { type: 'market_cancel'; listing: number }
  | { type: 'market_offer'; item: string; qty: number; price: number }
  | { type: 'market_fill'; offer: number; qty: number }
  | { type: 'market_offer_cancel'; offer: number }
  | { type: 'chat'; text: string }
  | { type: 'sell_npc'; item: string; qty: number }
  | { type: 'sell_npc_many'; items: Record<string, number> }
  /** Recompra do Mercador: compra de volta parte de uma venda das últimas 24 h. */
  | { type: 'buyback_npc'; id: number; qty: number }
  | { type: 'set_food'; food: string | null }
  | { type: 'eat_meal'; item: string }
  /** Renovar a refeição sozinho quando acaba (enquanto houver no depósito). */
  | { type: 'set_meal_auto'; auto: boolean }
  | { type: 'set_potion'; potion: string | null }
  | { type: 'set_mana_potion'; manaPotion: string | null }
  | { type: 'set_arrow'; arrow: string | null }
  | { type: 'set_rune'; slot: 'attack' | 'heal'; rune: string | null }
  | { type: 'buy_bless' }
  | { type: 'reaper_redeem'; pack: number }
  | { type: 'boss_join' }
  | { type: 'boss_queue' }
  | { type: 'boss_unqueue' }
  | { type: 'open_pouch'; item: string }
  | { type: 'set_pet'; pet: string | null }
  | { type: 'set_title'; achievement: string | null }
  | { type: 'buy_kids_pet'; pet: string }
  | { type: 'buy_kids_potion' }
  | { type: 'buy_kids_outfit'; outfit: string }
  | { type: 'buy_halloween_pet'; pet: string }
  | { type: 'buy_halloween_potion' }
  | { type: 'buy_halloween_outfit'; outfit: string }
  | { type: 'buy_halloween_item'; item: 'boss_token' | 'boss_essence' }
  | { type: 'halloween_trick_or_treat' }
  | { type: 'buy_vote_shop'; item: 'stamina' | 'chest' | 'xp' }
  | { type: 'buy_vote_pet' }
  | { type: 'lock_item'; item: string; locked: boolean }
  /** Depósitos dos outros personagens da mesma conta (resposta: account_banks). */
  | { type: 'account_banks' }
  /** Pega itens do depósito de outro personagem da mesma conta para o seu. */
  | { type: 'take_from_alt'; from: number; item: string; qty: number }
  | { type: 'buy_vote_outfit'; outfit: string }
  | { type: 'set_sigil'; slot: number; item: string | null }
  | { type: 'set_look'; look: Look }
  | { type: 'quest_claim'; quest: string }
  | { type: 'story_choose'; story: string; choice: number }
  | { type: 'buy_npc'; item: string; qty: number }
  | { type: 'buy_boss_token'; item: string }
  | { type: 'set_spells'; spells: string[] }
  | { type: 'set_combat_rules'; rules: CombatRules }
  | { type: 'daily_claim'; idx: number }
  | { type: 'set_daily_gather_preferences'; skills: GatheringSkillId[] }
  | { type: 'first_step_claim'; id: string }
  | { type: 'mastery_unlock'; node: string }
  | { type: 'mastery_reset' }
  | { type: 'imbue'; imbuementId: string }
  | { type: 'task_start'; taskId: string }
  | { type: 'task_claim'; taskId: string }
  | { type: 'buy_task_shop'; item: 'prey_wildcard' | 'imbuement_material' | 'charm_points' | 'stamina' | 'xp_boost'; material?: string }
  | { type: 'daily_chest' }
  | { type: 'task_cancel'; taskId: string }
  | { type: 'slayer_request'; master: string; size?: 'short' | 'normal' | 'long' }
  | { type: 'slayer_cancel' }
  | { type: 'slayer_buy'; item: string }
  | { type: 'slayer_boost'; boost: string }
  | { type: 'guild_start'; taskId: string }
  | { type: 'guild_claim'; taskId: string }
  | { type: 'guild_cancel'; taskId: string }
  | { type: 'guild_buy'; item: 'xp_boost' | 'gem' | 'artisan_kit'; gem?: string }
  | { type: 'equip_combat_pet'; pet: string | null }
  | { type: 'charm_unlock'; charm: string }
  | { type: 'charm_upgrade'; charm: string }
  | { type: 'charm_assign'; charm: string; monster: string | null }
  | { type: 'prey_reroll'; slot: number }
  | { type: 'prey_choose'; slot: number; monster: string }
  | { type: 'sell_rashid'; item: string; qty: number }
  | { type: 'arena_start'; arenaId: string }
  | { type: 'arena_claim_reward'; arenaId: string; weaponId: string }
  | { type: 'party_invite'; name: string }
  /** Na cidade: o tile para onde o personagem está andando (os outros veem ao vivo). */
  | { type: 'city_move'; x: number; y: number }
  | { type: 'party_cancel_invite'; targetId: number }
  | { type: 'party_accept'; partyId: number }
  | { type: 'party_decline'; partyId: number }
  | { type: 'party_leave' }
  | { type: 'party_kick'; characterId: number }
  | { type: 'party_chat'; text: string }
  | { type: 'refine_item'; item: string; protect?: boolean }
  /** Ascensão: sobe `item` um tier gastando 9 peças da mesma raridade (`use`: id -> quantidade). */
  | { type: 'ascend_item'; item: string; use: Record<string, number>; protect?: boolean }
  | { type: 'dismantle_item'; item: string; qty: number }
  | TradeClientCommand;

export interface RankingEntry {
  name: string;
  vocation: VocationId;
  promotion: string | null;
  xp: number;
  /** Soma do nível de todas as skills. */
  totalLevel?: number;
  /** Ranking de combate: nível de Maestria (só de quem já é 400+). */
  mastery?: number;
  /** Ranking Skiller: soma do nível das skills que não são de combate. */
  skillerLevel?: number;
  /** Ranking de conquistas: pontos somados. */
  achievementPoints?: number;
  /** Título escolhido (id da conquista). */
  title?: string | null;
}

export const RANKING_SIZE = 20;

/** Perfil público de um personagem (clique no nome no chat ou no Ranking). */
export interface PlayerProfile {
  name: string;
  vocation: VocationId;
  promotion: string | null;
  look: Look;
  title: string | null;
  createdAt: string;
  online: boolean;
  /** XP de cada skill. */
  skills: Record<string, number>;
  equipment: Partial<Record<EquipSlot, string>>;
  achievementPoints: number;
  achievementCount: number;
  /** Mortes por chefe (chave do Bosstiary). */
  bossKills: Record<string, number>;
  kills: number;
  quests: number;
  /** Bio que o jogador escreveu no próprio perfil (vazia = nenhuma). */
  bio: string;
}

/** Tamanho máximo da bio do perfil. */
export const BIO_MAX_CHARS = 200;

/** Email da conta: null se vazio; erro (texto) se inválido. */
export function validateEmail(raw: unknown): { email: string | null } | { error: string } {
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) return { email: null };
  if (typeof raw !== 'string') return { error: 'Email inválido.' };
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Email inválido.' };
  return { email };
}

/** Bio limpa para gravar: sem quebras de linha nem espaços repetidos, até BIO_MAX_CHARS. */
export const cleanBio = (raw: unknown) => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, BIO_MAX_CHARS) : '');

export interface ChatMessage {
  id: number;
  name: string;
  vocation: VocationId | 'system';
  text: string;
  at: number;
  system?: boolean;
  channel?: 'global' | 'party';
  /** Título escolhido pelo autor (id da conquista). */
  title?: string | null;
}

export const CHAT_MAX = 200;
export const CHAT_HISTORY = 50;
/** Intervalo mínimo entre mensagens do mesmo jogador. */
export const CHAT_COOLDOWN_MS = 1000;

/** Limpa a mensagem: espaços, quebras de linha e tamanho. Devolve '' se não sobrar nada. */
export const CHAT_MAX_ITEMS = 3;

/** Limpa a mensagem: espaços, quebras de linha, tamanho e até 3 marcadores `[item:id]` válidos. Devolve '' se não sobrar nada. */
export function cleanChat(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let count = 0;
  const processed = raw.replace(/\[item:([^\]]*)\]/g, (_m, id: string) => {
    const cleanId = id.trim();
    if (!cleanId || !itemById(cleanId)) return cleanId;
    if (count >= CHAT_MAX_ITEMS) return '';
    count++;
    return `[item:${cleanId}]`;
  });
  return processed.replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
}

/** Oferta no mercado: alguém vende `qty` de `item` a `price` moedas cada. */
export interface Listing {
  id: number;
  sellerId: number;
  seller: string;
  item: string;
  qty: number;
  price: number;
  createdAt: number;
}

/** Oferta de compra: o ouro (qty × price) fica reservado até alguém vender ou o dono cancelar. */
export interface BuyOffer {
  id: number;
  buyerId: number;
  buyer: string;
  item: string;
  qty: number;
  price: number;
  createdAt: number;
}

/** Item usado como moeda no mercado. */
export const GOLD = 'gold';
export const MAX_PRICE = 1_000_000_000;

export interface PlayerState {
  /** XP total por skill. */
  skills: Record<SkillId, number>;
  /** Conquistas feitas: id → quando (ms). */
  achievements?: Record<string, number>;
  /** Título escolhido (id da conquista que o libera). */
  title?: string | null;
  /** Stamina agora (ms; cheia = STAMINA_MAX_MS). */
  stamina?: number;
  /** Itens guardados: id → quantidade. */
  bank: Record<string, number>;
  /** Equipado em cada espaço. */
  equipment: Partial<Record<EquipSlot, string>>;
  promotion: string | null;
  /** Aparência atual (pode mudar no jogo). */
  look: Look;
  /** Addons cosméticos desbloqueados em quests. */
  unlockedAddons?: LookAddon[];
  /** Outfits cosméticos desbloqueados. */
  unlockedOutfits?: OutfitId[];
  /** Mascotes desbloqueados. */
  unlockedPets?: string[];
  /** Instâncias vencidas: o último dia (AAAA-MM-DD) e quantas vezes ao todo. */
  instanceClears?: Record<string, { day: string; total: number }>;
  /** Dia (AAAA-MM-DD) em que a tentativa grátis de cada instância foi usada. */
  instanceFree?: Record<string, string>;
  /** Últimos resultados do chefe global (o mais novo primeiro). */
  bossHistory?: import('./worldboss.ts').BossHistoryEntry[];
  /** Entradas de hoje em cada instância (a XP cai na 2ª e na 3ª). */
  instanceTries?: Record<string, number>;
  /** Covis (aba Chefes): até quando (ms) cada um está em cooldown. */
  lairCooldowns?: Record<string, number>;
  /** Raides concluídas na semana atual: lista de fases (1, 2, 3). */
  raidClears?: number[];
  /** Piedade da Fase 3 da Raide (quantas semanas falhou sem ganhar peça). */
  raidPity?: number;
  /** Baús de ouro da Raide comprados nesta semana (máx 3). */
  raidChestPurchases?: number;
  /** Peças de set da Raide já adquiridas na Loja de Fragmentos. */
  raidBoughtPieces?: string[];
  /** Ranking da raide na semana (26/10): os primeiros a vencer a fase 3. */
  raidRanking?: { name: string; at: number; solo: boolean }[];
  /** Rankings por raide (raidId -> ranking). */
  raidRankings?: Record<string, { name: string; at: number; solo: boolean }[]>;
  /** Clears semanais por raide (raidId -> fases concluídas). */
  raidClearsByRaid?: Record<string, number[]>;
  /** Piedade por raide (raidId -> semanas sem peça). */
  raidPityByRaid?: Record<string, number>;
  /** Semana atual da Raide (AAAA-MM-DD da segunda-feira no horário de Brasília). */
  raidWeek?: string;
  /** Instante (ms UTC) do próximo reset semanal da Raide (segunda 00:00 BRT). */
  raidNextResetAt?: number;
  /** Peças guardadas pelo Ceifador (mortes sem bênção), ainda no prazo de resgate. */
  reaper?: import('./reaper.ts').ReaperPack[];
  /** Hoje (AAAA-MM-DD, horário do servidor), para saber o que já foi feito no dia. */
  today?: string;
  /** Itens trancados: não vendem no Mercador/Rashid nem vão ao Mercado. */
  lockedItems?: string[];
  /** Recompra do Mercador: vendas das últimas 24 h (preço = o que recebeu por unidade). */
  buyback?: { id: number; item: string; qty: number; price: number; at: number }[];
  /** Mascote atualmente equipado/ativo. */
  activePet?: string | null;
  /** XP em dobro até esse instante (Poção Doce de XP). */
  xpBoostUntil?: number;
  /** Fila de profissões e o fim marcado da atual (ms; vazio = até acabar o material). */
  queue?: QueuedActivity[];
  queueUntil?: number | null;
  /** A conta já comprou a Poção Doce de XP (uma por conta). */
  kidsPotionUsed?: boolean;
  /** A conta já comprou a Poção de Halloween hoje (uma por dia). */
  halloweenPotionUsed?: boolean;
  /** O personagem já participou do Doces ou Travessuras hoje. */
  halloweenTrickOrTreatedToday?: boolean;
  /** Quests ativas e entregues. */
  quests: QuestState[];
  /** Quests de história começadas ou terminadas. */
  stories: StoryState[];
  /** Magias equipadas. */
  spells: string[];
  /** Tarefas de hoje. */
  dailies: (Daily & DailyState)[];
  /** Diárias e semanais de fim de jogo (400+): `key` é o dia ou a semana. */
  endgameDailies?: (Daily & DailyState & { key: string })[];
  /** Baú diário: sequência que ele vale hoje (1 a 7) e se já foi aberto hoje. */
  dailyChest?: { streak: number; opened: boolean };
  /** Preferências de profissões de coleta para as diárias (válidas a partir de effectiveDay). */
  dailyGatherPreferences?: { skills: GatheringSkillId[]; effectiveDay?: string };
  /** Tasks em destaque hoje (+50% de pontos e ouro). */
  featuredTasks?: string[];
  /** Contadores para as conquistas. */
  stats: Partial<Record<StatKey, number>>;
  /** Tasks de caça (Grizzly Adams). */
  huntingTasks: HuntingTaskState[];
  /** Slayer: tarefa do mestre, sequência e pontos. */
  slayer?: SlayerState;
  slayerBoosts?: SlayerBoosts;
  /** XP/h real de combate por caçada (`hunt@dificuldade`), das sessões de 10+ min. */
  huntXp?: Record<string, number>;
  /** Último motivo de a profissão ter parado sozinha (material, hora marcada, fila). */
  activityStop?: { text: string; at: number };
  /** Encomendas da Guilda (uma por profissão), os Selos ganhos e os gastos na loja. */
  guildTasks?: GuildTaskState[];
  guildPoints?: number;
  /** Kit do Artesão ativo até (ms). */
  artisanKitUntil?: number;
  /** Mascote de combate equipado (um por vez). */
  combatPet?: string | null;
  guildSpent?: number;
  /** Pontos de caça acumulados. */
  huntingPoints: number;
  /** Pontos de caça já gastos na Loja de Tarefas (o saldo é huntingPoints menos isto). */
  huntingPointsSpent?: number;
  /** Último voto no TopIdle (ms; 0 = nunca). */
  lastVoteAt?: number;
  /** Pontos de charm comprados na Loja de Tarefas (somam aos das fichas). */
  charmBonus?: number;
  /** Imbuements ativos e segundos restantes de combate. */
  imbuements: Record<string, number>;
  /** Bestiário: abates por espécie. */
  bestiary: Record<string, number>;
  /** Charms liberados (e em que espécie estão). */
  charms: CharmState[];
  /** Vagas de prey e se a troca grátis de hoje já foi usada. */
  prey: PreySlot[];
  preyFreeUsed: boolean;
  /** Trocas pagas do prey hoje (o preço sobe a cada uma). */
  preyPaidToday?: number;
  /** XP em dobro comprados hoje na Loja de Tarefas (o preço sobe 5x a cada um). */
  taskXpBoostsToday?: number;
  /** Estado das arenas de gladiadores. */
  arenas: CharacterArenaState[];
  /** Comida escolhida: null = automática (a melhor), 'none' = não come. */
  food: string | null;
  /** Refeição ativa comida pelo jogador (buff até `until` ms). */
  activeMeal?: { item: string; until: number; auto?: boolean } | null;
  /** Sigilos nos espaços (Sigilismo); null = vazio. */
  sigils?: (string | null)[];
  /** Pontos de Maestria (nível 400+): XP da barra atual, pontos livres e nós aprendidos. */
  mastery?: MasteryState;
  /** Forja: falhas seguidas em cada passo (índice = tier de origem), para a piedade. */
  forgePity?: number[];
  /** Forja: falhas seguidas em cada nível de refino (índice = refino de origem). */
  refinePity?: number[];
  /** Poção de caçada escolhida. */
  potion: string | null;
  /** Poção de mana escolhida (consumida quando a mana estiver insuficiente). */
  manaPotion?: string | null;
  /** Condições da barra de ação (null: o jogo escolhe sozinho). */
  combatRules?: CombatRules | null;
  /** Flecha especial ativa do Caçador (ou null para básica infinita). */
  arrow?: string | null;
  /** Runas da caçada: [ataque, cura]. */
  runes?: [string | null, string | null];
  /** Tem a bênção do Templo (gasta na próxima morte). */
  blessed: boolean;
  activity: Activity | null;
  /** Caçada: o ciclo em andamento, para o cliente animar a luta. */
  cycle: CycleView | null;
  /** Relógio do servidor no envio, para o cliente animar a barra sem desvio. */
  serverNow: number;
}

/** Outro jogador online e onde está (para aparecer no mesmo mapa). */
export interface OnlinePlayer {
  id: number;
  name: string;
  vocation: VocationId;
  look: Look;
  equipment: Partial<Record<EquipSlot, string>>;
  level: number;
  place: string;
  /** Mascote equipado (aparece seguindo o personagem para os outros). */
  activePet?: string | null;
  /** Na cidade: o último tile para onde ele andou (quem chega já o vê no lugar certo). */
  pos?: { x: number; y: number };
}

/** Depósito de outro personagem da conta (aba do depósito). */
export interface AltBank {
  id: number;
  name: string;
  vocation: string;
  level: number;
  bank: Record<string, number>;
}

/** Recompra: paga BUYBACK_FEE a mais do que recebeu (vender e recomprar não dá diária de graça). */
export const BUYBACK_FEE = 1.1;
/** Por quanto tempo uma venda ao Mercador pode ser recomprada, e quantas ficam guardadas. */
export const BUYBACK_MS = 24 * 60 * 60 * 1000;
/** Anúncio no mercado vale este tempo; depois o que sobrou volta ao depósito do vendedor (mercado sem anúncio parado). */
export const LISTING_MS = 7 * 24 * 60 * 60 * 1000;
export const BUYBACK_MAX = 30;
export const buybackPrice = (price: number) => Math.ceil(price * BUYBACK_FEE);

export type ServerMessage =
  | { type: 'account_banks'; chars: AltBank[] }
  /** Na cidade: alguém andou (só vai para quem também está na cidade). */
  | { type: 'city_move'; id: number; x: number; y: number }
  | { type: 'welcome'; character: Character | null }
  | { type: 'state'; state: PlayerState }
  | { type: 'offline'; elapsedMs: number; gains: Gains }
  | { type: 'death'; monster: string; xpLost: number; itemsLost?: string[]; blessed?: boolean; reaper?: { price: number; expiresAt: number } }
  | { type: 'cleared'; hunt: string; /** O que caiu nesse trecho (só o que entrou) e a XP de combate. */ loot?: Record<string, number>; xp?: number }
  | { type: 'arena_cleared'; arena: string }
  | { type: 'boss'; view: BossView }
  | { type: 'trick_or_treat_result'; result: { kind: 'candies' | 'gold' | 'token' | 'trick'; amount?: number; message: string } }
  | { type: 'players'; players: OnlinePlayer[] }
  | { type: 'boss_announce'; text: string }
  /** Aviso só para este jogador, sem som de chefe (ex.: prêmio de voto). */
  | { type: 'notice'; text: string }
  | { type: 'raid_warning'; text: string }
  /** Comemoração para o servidor inteiro (o primeiro 99 numa profissão): faixa e fanfarra. */
  | { type: 'celebrate'; text: string }
  | { type: 'boss_result'; boss: string; killed: boolean; damage: number; reward: BossReward }
  | { type: 'pouch_opened'; pouch: string; item: string; qty?: number }
  | { type: 'pet_unlocked'; pet: string }
  | { type: 'market'; listings: Listing[]; offers?: BuyOffer[] }
  | { type: 'chat'; messages: ChatMessage[] }
  | { type: 'party'; party: PartyView | null }
  | { type: 'party_invite'; invite: PartyInviteView }
  | { type: 'online'; count: number }
  | { type: 'error'; message: string }
  | TradeServerMessage;
