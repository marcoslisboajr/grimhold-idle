import { storyText, tr, itemName } from '../i18n.ts';
import { sfx } from '../audio.ts';
import { t, onLangChange } from '../i18n.ts';
import {
  itemById,
  monsterById,
  nodeById,
  gatherIntervalMs,
  parseHuntNode,
  RAID_GUARD_EVERY_MS,
  instanceWaves,
  type Hunt,
  recipeById,
  rngFor,
  rarityOf,
  splitRarity,
  spellById,
  WORLD_BOSS_NODE,
  isReaperNode,
  placeOf,
  isDummyNode,
  dummyById,
  dummyXpPerAction,
  isArenaNode,
  parseArenaNode,
  arenaOpponentById,
  ELEMENTS,
  type Activity,
  type OnlinePlayer,
  type BossView,
  type CycleView,
  type EquipSlot,
  type Look,
  type VocationId,
  KIDS_MONSTER_SCALE,
  isKidsDay,
  KIDS_EVENT_MOB,
  isKidsShopOpen,
  raidById,
} from '@grimhold/shared';
import { drawLook, FRAME_H, lookSheet, type Frame } from '../paperdoll.ts';
import { ARENA_BOSS, ARENA_SLOTS, BOSS_MINION_SPOTS, workSlots, bossArenaMap, gladiatorPitMap, annihilationBridgeMap, limboMap, CITIZENS, findPath, Ground, OBJECTS, TILE, walkable, type Npc, type WorldMap } from './map.ts';
import { SpellFx } from './vfx.ts';
import monsterDirs from './monsterDirs.json';

/** Vocações que lutam de longe (param a alguns tiles e atiram). */
// Quem ataca de longe (o devoto bate corpo a corpo: no combate ele usa a skill melee).
const RANGED = new Set(['hunter', 'arcanist']);
const RANGED_TILES = 3;
/**
 * Monstros que atacam de longe (arqueiros, magos, dragões, olhos...): na luta ficam a distância
 * e o ataque sai como projétil. O resto é corpo a corpo (corre até colar).
 */
const MONSTER_SHOT: Record<string, { fx: 'dagger' | 'fireball' | 'orb' | 'ice' | 'holy'; scale: number }> = {
  // Flechas, lanças e penas
  goblin_archer: { fx: 'dagger', scale: 0.6 }, minotaur_archer: { fx: 'dagger', scale: 0.7 }, centaur_archer: { fx: 'dagger', scale: 0.7 },
  harpy: { fx: 'dagger', scale: 0.6 }, tribo_peixe_b: { fx: 'orb', scale: 0.4 },
  // Pedra
  cyclops_stonehurler: { fx: 'orb', scale: 0.7 },
  // Fogo
  dragon_hatchling: { fx: 'fireball', scale: 0.5 }, dragon: { fx: 'fireball', scale: 0.8 }, dragon_lord: { fx: 'fireball', scale: 1 },
  fire_dragon: { fx: 'fireball', scale: 0.8 }, wyvern: { fx: 'fireball', scale: 0.6 }, fire_elemental: { fx: 'fireball', scale: 0.6 },
  imp: { fx: 'fireball', scale: 0.45 }, fire_devil: { fx: 'fireball', scale: 0.6 }, cultista_vermelho: { fx: 'fireball', scale: 0.55 },
  // Gelo
  ice_witch: { fx: 'ice', scale: 0.5 }, frost_dragon: { fx: 'ice', scale: 0.8 }, lich5: { fx: 'ice', scale: 0.55 },
  // Magia sombria
  goblin_mage: { fx: 'orb', scale: 0.4 }, ghost: { fx: 'orb', scale: 0.45 }, banshee: { fx: 'orb', scale: 0.5 }, beholder: { fx: 'orb', scale: 0.6 },
  demon_eyes: { fx: 'orb', scale: 0.55 }, mind_flayer: { fx: 'orb', scale: 0.55 }, wraith: { fx: 'orb', scale: 0.5 }, cranio: { fx: 'orb', scale: 0.4 },
  void_herald: { fx: 'orb', scale: 0.65 }, medusa: { fx: 'orb', scale: 0.5 },
  // Luz
  fallen_seraph: { fx: 'holy', scale: 0.55 }, anjo_sombrio: { fx: 'holy', scale: 0.55 },
};
const RANGED_MONSTERS = new Set(Object.keys(MONSTER_SHOT));

/** Monstros que têm sprite de frente e de costas (os outros só de lado). */
/** Dia das Crianças: os monstros viram "Mirim" (em inglês, "Baby"). */
const kidName = (name: string) => (isKidsDay(Date.now()) ? tr(`${name} Mirim`, `Baby ${name}`) : name);
const FOUR_DIRS = new Set<string>(monsterDirs);
/** Sprites que só batem asas (sem patas andando): pairam no ar, com a sombra no chão. */
const HOVER_SPRITES = new Set(['quimera']);
/** Sprites sem animação de andar: em vez de deslizar, somem e reaparecem no destino (teleporte). */
const BLINK_SPRITES = new Set(['stone_guardian']);
const BLINK_MS = 260;
/** Quadro do monstro na direção: de frente/costas quando existe, senão de lado. */
const monsterImg = (sprite: string, dir: 'up' | 'down' | 'side', frame: number) =>
  image(dir !== 'side' && FOUR_DIRS.has(sprite) ? `/assets/monsters/${sprite}_${dir}_${frame}.png` : `/assets/monsters/${sprite}_${frame}.png`);
import { emitCast, emitCastReset } from '../castBus.ts';
import { drawGround, drawObject, drawPortal, image, loaded, objectBaseY, outlinedText } from './render.ts';

type Dir = 'down' | 'left' | 'right' | 'up';
type Pt = { x: number; y: number };

const WALK_MS_PER_TILE = 260;
const LUNGE_MS = 140;
const FLASH_MS = 110;
const FLOAT_MS = 1000;

interface Mover {
  /** Posição em pixels do mundo (centro do tile, no chão). */
  px: number;
  py: number;
  tile: Pt;
  path: Pt[];
  /** Momento em que começou a andar para path[0]. */
  stepStart: number;
  dir: Dir;
  /** Milissegundos por tile (padrão: o passo do personagem). */
  speed?: number;
}

/** Monstro da caçada andando pelo mapa (só visual: quem decide a luta é o servidor). */
interface Roamer extends Mover {
  /** Onde nasceu: passeia em volta daqui. */
  home: Pt;
  /** Índice da rota mais perto de onde nasceu (para espalhar os monstros). */
  k: number;
  sprite: string;
  name: string;
  phase: number;
  /** Próxima vez que escolhe um destino (passeio) ou recalcula o caminho (perseguição). */
  nextAt: number;
  chasing: boolean;
  /** Desde quando persegue (perde o interesse se não virar alvo). */
  chaseSince?: number;
  /** Até quando ignora o personagem (cansou de seguir). */
  calmUntil?: number;
}

/** Quanto tempo um monstro segue o personagem sem virar alvo antes de desistir. */
const CHASE_GIVE_UP_MS = 7000;
const CALM_MS = 20000;

/** Até onde o monstro enxerga o personagem (em tiles, distância de Manhattan). */
const SIGHT = 6;
const WANDER_MS_PER_TILE = 560;
const CHASE_MS_PER_TILE = 300;

interface Floater {
  text: string;
  color: string;
  x: number;
  y: number;
  t0: number;
  icon?: string;
  size?: number;
}

/** Monstro da luta. `run`: caminho que ele faz correndo até o lugar dele (veio do mapa). */
type FightMonster = { id?: string; tile: Pt; sprite: string; name: string; hp: number; maxHp: number; diedAt: number | null; run?: { path: Pt[]; t0: number }; entering?: boolean; big?: boolean; appearAt?: number };
/** Tamanho dos chefes (instâncias das quests, último desafiante das arenas e provações): igual ao chefe global. */
const BOSS_SCALE = 2;
/** É chefe: monstro de caçada de chefe, ou o último desafiante da arena/provação. */
function isBossFight(activity: Activity, name: string): boolean {
  // Instância: só os chefes do fim aparecem grandes (os das ondas de limpeza, normais).
  const hunt = parseHuntNode(activity.node)?.hunt;
  if (hunt?.boss || hunt?.lair) return hunt.monsters.some((id) => monsterById(id)?.name === name);
  const arena = parseArenaNode(activity.node);
  return !!arena && arena.opponents[arena.opponents.length - 1]?.name === name;
}
const center = (t: Pt) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE - 6 });

/** Cidade ao vivo: reenvia a posição a cada tanto, mesmo parado. */
const CITY_RESEND_MS = 10_000;

function dirTo(from: Pt, to: Pt): Dir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * Encena a caçada. Não decide nada: recebe do servidor o ciclo (monstro, golpes,
 * duração, resultado) e desenha o tempo passando. Se a aba ficar fechada, nada
 * se perde — o servidor continua creditando.
 */
/** Escala de cada pet no mapa (as folhas vêm no tamanho do pack: 1x, e a fada em 2x). */
const PET_SCALE: Record<string, number> = {
  pet_mining_golem: 1.6,
  pet_woodcutting_treant: 1.5,
  pet_smithing_fire: 1.7,
  pet_fishing_water: 1.8,
  pet_runecraft_spark: 1.7,
  pet_cooking_slime: 2.4,
  pet_herbalism_fairy: 0.75,
  pet_alchemy_bubble: 1.75,
  pet_soulreaping_ghost: 1.9,
  pet_sigilism_gargoyle: 1.7,
  pet_fletching_owl: 1.15,
  pet_jewelcrafting_spark: 1.15,
  pet_crafting_bee: 2.0,
};

/** Ordem de desenho do mascote: olhando para cima ele fica abaixo do dono (na frente); senão, atrás. */
const petDepth = (m: { py: number; dir: string }) => m.py + (m.dir === 'up' ? 1 : -1);

export class HuntScene {
  private player: Mover;
  private map: WorldMap;
  private mode: 'city' | 'hunt' | 'work' | 'boss' = 'city';
  /** Limiar dos Mortos (montado na primeira vez que precisa). */
  private limbo: WorldMap | null = null;
  /** Chefe global (o WorldView atualiza a cada quadro). */
  boss: BossView | null = null;
  /** Outros jogadores online (o WorldView atualiza); aparecem quem está no mesmo mapa. */
  others: OnlinePlayer[] = [];
  /** Cidade ao vivo: o último tile que cada um mandou (o WorldView preenche com o city_move). */
  livePos = new Map<number, Pt>();
  /** Andou na cidade: avisa o servidor do destino (o WorldView manda pelo socket). */
  onCityMove?: (to: Pt) => void;
  private lastCitySent = '';
  /** Caçada cujo mapa está na tela (trocar de caçada direto também troca o mapa). */
  private huntMapId: string | null = null;
  private lastCitySentAt = -1e9;
  /** IDs dos membros da party do jogador (para destacar no mapa). */
  partyMemberIds: Set<number> = new Set();
  /** workSlot: no mapa de profissão, o lugar dele em volta do alvo (cada um num, sem ficar um em cima do outro). */
  private otherMovers = new Map<number, Mover & { nextAt: number; workSlot?: Pt }>();
  private workSlotCache = new Map<WorldMap, Pt[]>();
  /** Covil em grupo: quando cada aliado deu o último golpe (avanço do corpo a corpo). */
  private allyLunge = new Map<number, number>();
  /** Covil em grupo: quando o chefe cai para todos nesta luta (null fora dela). */
  private groupKillAt: number | null = null;
  private otherMap: WorldMap | null = null;
  private arena: WorldMap | null = null;
  /** XP de combate do personagem (o boneco rende conforme o nível). */
  combatXp = 0;
  private arenaBoss: string | undefined;
  /** Arena de gladiadores: o mapa, o aviso no alto da tela e a última onda que já entrou pelo portão. */
  private pit: WorldMap | null = null;
  /** Ponte da Aniquilação e os atiradores da provação atual. */
  private bridge: WorldMap | null = null;
  private casterDef: { name: string; sprite: string } | null = null;
  private pitBanner: { text: string; color: string } | null = null;
  private pitEntered = -1;
  private bossDamage = -1;
  private bossFloatAt = 0;
  /** Ataques do chefe global (só visual: o servidor conta apenas o dano dado ao chefe). */
  private bossNextHit = 0;
  private bossNextArea = 0;
  private bossRuneNextStrike = 0;
  // Última magia e bola de fogo do chefe já mostradas (instante do servidor).
  private bossCastSeen = 0;
  private bossFireballSeen = 0;
  private bossRuneNextHeal = 0;
  private bossPotionNext = 0;
  private bossLunge: { to: Pt; t0: number } | null = null;
  /** Quem apanhou por último e quando (índice do lutador; -1 = eu). */
  private bossHurt = new Map<number, number>();
  /** Profissão em andamento: o que está fazendo e o ritmo, para animar e mostrar o "+1". */
  private work: { skill: string; startedAt: number; interval: number; item: string; rolled: boolean } | null = null;
  private lastDoneAt = 0;
  private travelSeed: number | null = null;
  private monsters: FightMonster[] = [];
  private get monster() {
    return this.monsters[0] ?? null;
  }
  private set monster(val: { tile: Pt; sprite: string; name: string; hp: number; maxHp: number; diedAt: number | null } | null) {
    this.monsters = val ? [val] : [];
  }
  private floaters: Floater[] = [];
  /** Ciclo cuja vitória (XP e loot flutuando) já foi mostrada. */
  private killShownKey = '';
  /** Animações das magias (projéteis, explosões, curas). */
  private fx = new SpellFx();
  /** Última bola de fogo de cada servo do chefe especial. */
  private minionCast: number[] = [];
  private cycleKey = '';
  private hitsShown = 0;
  private ateShown = false;
  private lunge: { by: 'p' | 'm'; target?: number; t0: number } | null = null;
  private flash: { on: 'p' | 'm'; target?: number; t0: number } | null = null;
  private playerHp = 1;
  private playerMaxHp = 1;
  /** Luta em andamento e o instante dela (para a barra de mana). */
  private manaCycle: CycleView | null = null;
  private cycleT = 0;
  private deadAt: number | null = null;
  private nextWander = 0;
  /** Caçada: índice na rota do tile onde o personagem está (ou vai terminar de andar). */
  private routeIdx = 0;
  /** Monstros parados ao lado da rota, esperando o personagem chegar (só visual). */
  private idle: Roamer[] = [];
  /** Tipos de monstro da caçada atual, para popular o mapa. */
  private huntMonsters: { id?: string; sprite: string; name: string }[] = [];
  /** Tipos (sprites) da luta atual: só eles perseguem (os outros não são alvo e ficariam seguindo à toa). */
  private fightSprites = new Set<string>();
  /** Tiles da rota, para não pôr monstro parado em cima do caminho. */
  private routeTiles = new Set<number>();
  /** Faixa em volta da rota (2 tiles) onde os monstros nascem e passeiam, fora da mata fechada. */
  private nearRoute = new Set<number>();
  /** Minimapa de cada mapa, desenhado uma vez. */
  private minimaps = new Map<WorldMap, HTMLCanvasElement>();
  /** Câmera do último quadro desenhado, para achar o que foi clicado. */
  private lastCam: { x: number; y: number } | null = null;
  private rand = rngFor(Date.now() & 0x7fffffff, 0);
  /** Nomes dos mestres com quest pronta (desenham um "!" em cima). */
  questMarks: string[] = [];
  /** Moradores passeando pela cidade (só visual). */
  private citizens: (Mover & { sprite: string; nextAt: number; lastImg?: HTMLImageElement })[] = [];
  /** Mascote ativo equipado pelo jogador. */
  activePet?: string | null;
  /** Runas equipadas no momento: [ataque, cura]. */
  runes?: [string | null, string | null];
  /** Poção equipada no momento. */
  potion?: string | null;
  /** Quantidades no banco para saber se ainda tem suprimentos. */
  bank?: Record<string, number>;
  /** Velocidade da coleta atual (0.2 = 20% mais rápida). */
  workSpeed = 0;
  /** Aparência do personagem (atualizada pelo WorldView a cada quadro). */
  look: Look;
  /** Equipamento visível nas camadas (calças, peitoral, elmo). */
  equipment?: Partial<Record<EquipSlot, string>>;

  constructor(
    private huntMapFor: (huntId: string) => WorldMap,
    private cityMap: WorldMap,
    private workMapFor: (skill: string, node: string) => WorldMap | null,
    private vocation: VocationId,
    private name: string,
    look: Look,
    equipment?: Partial<Record<EquipSlot, string>>,
  ) {
    this.look = look;
    this.equipment = equipment;
    this.map = cityMap;
    const t = cityMap.start;
    const c = center(t);
    this.player = { px: c.x, py: c.y, tile: { ...t }, path: [], stepStart: 0, dir: 'down' };
    // Trocou o idioma: os nomes guardados dos monstros passam para o idioma novo.
    onLangChange(() => {
      this.huntMonsters = this.huntMonsters.map((h) => ({ ...h, name: (h.id && monsterById(h.id)?.name) || h.name }));
      const byS = new Map(this.huntMonsters.map((h) => [h.sprite, h.name]));
      for (const m of [...this.idle, ...this.monsters]) m.name = byS.get(m.sprite) ?? m.name;
    });
  }

  /** Frente do portal, onde o personagem para antes de entrar. */
  private portalFront(): Pt {
    const p = this.cityMap.portal!;
    return { x: p.x, y: p.y + 1 };
  }

  private switchTo(map: WorldMap, tile: Pt) {
    this.map = map;
    this.mode = map === this.cityMap ? 'city' : map.arena ? 'boss' : map.work ? 'work' : 'hunt';
    this.lastCitySent = '';
    if (this.mode === 'city') this.sendCityPos(tile);
    this.monster = null;
    this.cycleKey = '';
    this.floaters = [];
    this.fx.clear();
    this.deadAt = null;
    this.routeIdx = 0;
    this.idle = [];
    this.routeTiles = new Set(map.route.map((p) => p.y * map.w + p.x));
    this.nearRoute = new Set();
    for (const p of map.route) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= 2 && walkable(map, p.x + dx, p.y + dy)) this.nearRoute.add((p.y + dy) * map.w + p.x + dx);
        }
      }
    }
    this.teleport(tile);
  }

  /** Distância andando para a frente na rota, de `a` até `b`. */
  private ahead(a: number, b: number): number {
    const n = this.map.route.length;
    return (((b - a) % n) + n) % n;
  }

  /**
   * Mantém o mapa povoado: põe monstros parados ao lado da rota, longe do
   * personagem e uns dos outros, até ter um a cada ~10 tiles de rota.
   */
  private populate() {
    const r = this.map.route;
    if (r.length === 0 || this.huntMonsters.length === 0) return;
    const want = Math.max(6, Math.floor(r.length / 10));
    for (let tries = 0; this.idle.length < want && tries < 60; tries++) {
      const k = Math.floor(this.rand() * r.length);
      const behind = this.ahead(k, this.routeIdx);
      const front = this.ahead(this.routeIdx, k);
      // Nem colado no personagem (aparecer do nada) nem em cima de outro monstro.
      if (front < 10 && front > 0) continue;
      if (behind < 4) continue;
      if (this.idle.some((m) => Math.min(this.ahead(m.k, k), this.ahead(k, m.k)) < 4)) continue;
      const p = r[k];
      const tile = { x: p.x + Math.round((this.rand() - 0.5) * 4), y: p.y + Math.round((this.rand() - 0.5) * 4) };
      if (!this.nearRoute.has(tile.y * this.map.w + tile.x)) continue;
      const kind = this.huntMonsters[Math.floor(this.rand() * this.huntMonsters.length)];
      const c = center(tile);
      this.idle.push({
        px: c.x,
        py: c.y,
        tile,
        path: [],
        stepStart: 0,
        dir: 'down',
        home: { ...tile },
        k,
        sprite: kind.sprite,
        name: kind.name,
        phase: Math.floor(this.rand() * 4),
        nextAt: 0,
        chasing: false,
      });
    }
  }

  /**
   * IA dos monstros: passeiam devagar em volta de onde nasceram; quando o
   * personagem entra no campo de visão, correm até ficar do lado dele.
   */
  private updateRoamers(now: number) {
    const p = this.player.tile;
    const w = this.map.w;
    // Onde cada monstro está ou vai parar: dois não dividem o mesmo tile do lado do personagem.
    const taken = new Set(this.idle.map((m) => {
      const end = m.path[m.path.length - 1] ?? m.tile;
      return end.y * w + end.x;
    }));
    for (const m of this.monsters) taken.add(m.tile.y * w + m.tile.x);
    for (const m of this.idle) {
      const dist = Math.abs(m.tile.x - p.x) + Math.abs(m.tile.y - p.y);
      // Seguiu um tempo e a luta foi com outro: desiste e volta a passear.
      if (m.chasing && m.chaseSince !== undefined && now - m.chaseSince > CHASE_GIVE_UP_MS) {
        m.calmUntil = now + CALM_MS;
      }
      const sees = dist <= SIGHT && this.deadAt === null && (m.calmUntil ?? 0) <= now && this.fightSprites.has(m.sprite);
      if (sees !== m.chasing) {
        m.chasing = sees;
        m.chaseSince = sees ? now : undefined;
        m.nextAt = 0;
      }
      // Termina o passo em andamento antes de trocar de destino (sem pular de tile).
      if (m.path.length > 1 && now >= m.nextAt) m.path = m.path.slice(0, 1);
      if (m.path.length === 0 && now >= m.nextAt) {
        if (m.chasing) {
          m.speed = CHASE_MS_PER_TILE;
          m.nextAt = now + 500;
          // Já está colado (até 2 tiles): espera ali.
          if (dist > 2) {
            const route = findPath(
              this.map,
              m.tile,
              (x, y) => Math.abs(x - p.x) + Math.abs(y - p.y) <= 2 && (x !== p.x || y !== p.y) && !taken.has(y * w + x),
              SIGHT + 4,
            );
            if (route?.length) {
              const end = route[route.length - 1];
              taken.add(end.y * w + end.x);
              m.path = route;
              m.stepStart = now;
            }
          }
        } else {
          m.speed = WANDER_MS_PER_TILE;
          m.nextAt = now + 1500 + this.rand() * 4000;
          const to = { x: m.home.x + Math.round((this.rand() - 0.5) * 8), y: m.home.y + Math.round((this.rand() - 0.5) * 8) };
          if (this.nearRoute.has(to.y * this.map.w + to.x)) {
            const route = findPath(this.map, m.tile, (x, y) => x === to.x && y === to.y, 10);
            if (route?.length) {
              m.path = route;
              m.stepStart = now;
            }
          }
        }
      }
      this.stepMover(m, now);
      // Parado perto do personagem: olha para ele.
      if (m.chasing && m.path.length === 0) m.dir = dirTo(m.tile, p);
    }
  }

  /** Índice da rota mais perto de um tile, preferindo trechos próximos para não dar saltos em curvas. */
  private nearestRouteIdx(t: Pt, nearIdx = this.routeIdx): number {
    const r = this.map.route;
    const n = r.length;
    if (n === 0) return 0;
    let best = nearIdx;
    let bd = Infinity;
    // Janela local em torno da posição atual (-8 a +24 tiles na rota).
    for (let offset = -8; offset <= 24; offset++) {
      const i = (((nearIdx + offset) % n) + n) % n;
      const pt = r[i];
      const d = Math.abs(pt.x - t.x) + Math.abs(pt.y - t.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    // Se encontrou um ponto razoavelmente perto na janela local, mantém local para não pular de trecho.
    if (bd <= 7) return best;
    // Caso esteja muito longe da rota, busca no mapa todo.
    r.forEach((pt, i) => {
      const d = Math.abs(pt.x - t.x) + Math.abs(pt.y - t.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** Arena do chefe global: cada jogador tem um lugar em volta do chefe. */
  private updateBoss(now: number) {
    if (!this.arena || this.arenaBoss !== this.boss?.boss) {
      this.arenaBoss = this.boss?.boss;
      this.arena = bossArenaMap(this.arenaBoss);
    }
    const mine = this.boss?.fighters.findIndex((f) => f.name === this.name) ?? -1;
    const slot = ARENA_SLOTS[Math.max(0, mine) % ARENA_SLOTS.length];
    if (this.map !== this.arena) {
      this.switchTo(this.arena, this.arena.start);
      this.bossDamage = -1;
    }
    const goal = this.player.path.length ? this.player.path[this.player.path.length - 1] : this.player.tile;
    if (goal.x !== slot.x || goal.y !== slot.y) {
      const route = findPath(this.map, this.player.tile, (x, y) => x === slot.x && y === slot.y, 40);
      if (route) this.walk(route, now);
      else this.teleport(slot);
    }
    this.stepMover(this.player, now);
    if (this.player.path.length === 0) this.player.dir = 'right';
    // O dano que o servidor contou desde a última vez aparece sobre o chefe.
    const me = mine >= 0 ? this.boss!.fighters[mine] : null;
    const isDown = me ? this.downLeft(me) > 0 : false;
    if (me && this.player.path.length === 0 && !isDown) {
      if (this.bossDamage >= 0 && me.damage > this.bossDamage && now - this.bossFloatAt > 900) {
        const c = center(ARENA_BOSS);
        this.floaters.push({ text: String(me.damage - this.bossDamage), color: '#ffffff', x: c.x + (Math.random() - 0.5) * 40, y: c.y - 120, t0: now, size: 24 });
        this.lunge = { by: 'p', t0: now };
        this.bossDamage = me.damage;
        this.bossFloatAt = now;
      } else if (this.bossDamage < 0) this.bossDamage = me.damage;

      // Uso de runas e poções pelo jogador no chefe (enquanto tiver no banco)
      this.bossPlayerSupplies(now, me);
    }
    this.bossAttacks(now, mine);
    this.floaters = this.floaters.filter((f) => now - f.t0 < FLOAT_MS);
  }

  /** Anima o uso de poções e runas pelo jogador contra o chefe */
  private bossPlayerSupplies(
    now: number,
    me: {
      strike?: { at: number; dmg: number };
      heal?: { at: number; pct: number };
      casts?: { id: string; at: number; dmg?: number; heal?: number }[];
      fireball?: { at: number; pct: number };
    },
  ) {
    const bossC = center(ARENA_BOSS);
    const pC = { x: this.player.px, y: this.player.py };

    // 1. Poção (ativa ou renovando a cada ~120s)
    if (this.potion && (this.bank?.[this.potion] ?? 0) > 0) {
      if (now >= this.bossPotionNext) {
        this.bossPotionNext = now + 120_000;
        const it = itemById(this.potion);
        this.floaters.push({
          text: `+${itemName(it?.name ?? '') || tr('Poção', 'Potion')}`,
          color: '#e0b0ff',
          x: pC.x,
          y: pC.y - 80,
          t0: now,
          icon: it ? `/assets/icons/${it.icon}.png` : undefined,
          size: 16,
        });
        sfx('drink');
      }
    }

    // 2. Runa de Cura (quando a vida está abaixo de ~75%)
    const runeHealId = this.runes?.[1];
    // O servidor conta quando a runa sai e quanto cura; aqui só mostra (a primeira vista não repete a antiga).
    if (runeHealId && me.heal && me.heal.at !== this.bossRuneNextHeal) {
      const first = this.bossRuneNextHeal === 0;
      this.bossRuneNextHeal = me.heal.at;
      if (!first) {
        const it = itemById(runeHealId);
        emitCast(runeHealId);
        this.fx.cast(runeHealId, pC, pC, now);
        this.floaters.push({
          text: `+${Math.round(me.heal.pct * 100)}% ${tr('Cura Rúnica', 'Rune Heal')}`,
          color: '#7dff8a',
          x: pC.x,
          y: pC.y - 80,
          t0: now,
          icon: it ? `/assets/icons/${it.icon}.png` : undefined,
          size: 18,
        });
        sfx('heal');
      }
    }

    // Magias que o servidor lançou: efeito, número e a recarga na barra.
    // Na primeira vista só marca o que já tinha saído (a barra zera a recarga ao entrar).
    const fresh = (me.casts ?? []).filter((c) => c.at > this.bossCastSeen);
    if (fresh.length) {
      const first = this.bossCastSeen === 0;
      this.bossCastSeen = Math.max(...fresh.map((c) => c.at));
      if (!first) {
        fresh.forEach((c, k) => {
          const at = now + k * 250;
          emitCast(c.id);
          if (c.dmg) {
            this.fx.cast(c.id, pC, bossC, at);
            this.floaters.push({ text: c.dmg.toLocaleString(), color: '#9fd8ff', x: bossC.x + (Math.random() - 0.5) * 40, y: bossC.y - 150, t0: at + 200, size: 22 });
          } else {
            this.fx.cast(c.id, pC, pC, at);
            if (c.heal) this.floaters.push({ text: `+${Math.round(c.heal * 100)}%`, color: '#7dff8a', x: pC.x, y: pC.y - 70, t0: at, size: 22 });
          }
        });
        sfx('spell');
      }
    }

    // Bola de fogo dos servos que acertou o personagem.
    if (me.fireball && me.fireball.at > this.bossFireballSeen) {
      const first = this.bossFireballSeen === 0;
      this.bossFireballSeen = me.fireball.at;
      if (!first) {
        const from = { x: bossC.x + 4 * TILE, y: bossC.y - 3 * TILE };
        this.fx.cast(this.boss?.minions?.shot ?? 'fireball', from, pC, now);
        this.floaters.push({ text: `-${Math.round(me.fireball.pct * 100)}%`, color: '#ff6a4a', x: pC.x, y: pC.y - 70, t0: now + 450, size: 22 });
        this.flash = { on: 'p', t0: now + 450 };
        sfx('hurt');
      }
    }

    // 3. Runa de Ataque (lança no chefe a cada recarga ~6s)
    const runeAtkId = this.runes?.[0];
    if (runeAtkId && me.strike && me.strike.at !== this.bossRuneNextStrike) {
      const first = this.bossRuneNextStrike === 0;
      this.bossRuneNextStrike = me.strike.at;
      if (!first) {
        const it = itemById(runeAtkId);
        emitCast(runeAtkId);
        this.fx.cast(runeAtkId, pC, bossC, now + 150);
        this.floaters.push({
          text: me.strike.dmg.toLocaleString(),
          color: '#ffc83b',
          x: bossC.x + (Math.random() - 0.5) * 30,
          y: bossC.y - 140,
          t0: now + 300,
          icon: it ? `/assets/icons/${it.icon}.png` : undefined,
          size: 20,
        });
        sfx('spell');
      }
    }
  }

  /** O chefe avança num lutador a cada ~2,6s e solta fogo em todos a cada ~8s. A vida volta sozinha. */
  private bossAttacks(now: number, mine: number) {
    const fighters = this.boss?.fighters ?? [];
    if (!this.boss || fighters.length === 0 || this.player.path.length > 0) return;
    const spotOf = (i: number) => center(ARENA_SLOTS[(i < 0 ? Math.max(0, mine) : i) % ARENA_SLOTS.length]);
    const hurt = (i: number) => {
      this.bossHurt.set(i, now);
      if (i === -1) this.flash = { on: 'p', t0: now };
    };
    if (now >= this.bossNextHit) {
      this.bossNextHit = now + 2200 + this.rand() * 800;
      // Alvo: um dos lutadores (eu também), sorteado.
      const k = Math.floor(this.rand() * fighters.length);
      const idx = fighters[k].name === this.name ? -1 : k;
      const to = spotOf(idx);
      this.bossLunge = { to, t0: now };
      this.fx.cast('brutal_strike', center(ARENA_BOSS), to, now + 120);
      hurt(idx);
      if (idx === -1) sfx('hurt');
    }
    if (now >= this.bossNextArea) {
      if (this.bossNextArea > 0) {
        sfx('spell');
        const c = center(ARENA_BOSS);
        this.floaters.push({ text: 'Chamas do Abismo', color: '#ff7a3a', x: c.x, y: c.y - 170, t0: now, size: 22 });
        fighters.forEach((f, i) => {
          const idx = f.name === this.name ? -1 : i;
          this.fx.cast('fireball_rune', c, spotOf(idx), now + 200);
          hurt(idx);
        });
      }
      this.bossNextArea = now + 7000 + this.rand() * 2000;
    }
    // A vida vem do servidor (o chefe tira de verdade; caído = 0 até voltar).
    const me = mine >= 0 ? fighters[mine] : null;
    this.playerMaxHp = 1;
    this.playerHp = me ? (this.downLeft(me) > 0 ? 0 : me.hp) : 1;
  }

  /** Caído no chefe global: quanto falta para voltar (ms), ou 0. Relógio do servidor ≈ Date.now() (diferença de poucos segundos não importa aqui). */
  private downLeft(f: { downUntil?: number } | null | undefined) {
    return f?.downUntil ? Math.max(0, f.downUntil - Date.now()) : 0;
  }

  /** Profissão: anda até o ponto de trabalho e mostra cada ação concluída. */
  private updateWork(now: number, activity: Activity, map: WorldMap, startedAt: number) {
    const spot = map.work!.spot;
    if (this.map !== map) {
      this.switchTo(map, map.start);
      const route = findPath(map, this.player.tile, (x, y) => x === spot.x && y === spot.y, 40);
      if (route) this.walk(route, now);
      else this.teleport(spot);
      this.lastDoneAt = now;
    }
    const gather = nodeById(activity.skill, activity.node);
    const recipe = recipeById(activity.skill, activity.node);
    const interval = gather ? gatherIntervalMs(gather, this.workSpeed) : recipe ? Math.round(recipe.intervalMs / (1 + this.workSpeed)) : 3000;
    // Rocha que sorteia gemas (quartzo, gemas, geodo): o servidor sorteia a pedra, então a tela não diz qual saiu.
    const rolled = !!gather?.drops?.length;
    this.work = { skill: activity.skill, startedAt, interval, item: rolled ? '' : (gather?.item ?? recipe?.output ?? ''), rolled };

    this.stepMover(this.player, now);
    if (this.player.path.length === 0) {
      this.player.dir = map.work!.face;
      // Ação que acabou de terminar (o servidor credita no mesmo ritmo).
      const n = Math.floor((now - startedAt) / interval);
      const doneAt = startedAt + n * interval;
      if (n >= 1 && doneAt > this.lastDoneAt + interval / 2) {
        this.lastDoneAt = doneAt;
        sfx(`work_${this.work.skill}`);
        const item = itemById(this.work.item);
        const c = center(map.work!.target);
        this.floaters.push({
          text: this.work.rolled ? `+1 ${tr('Gema', 'Gem')}` : `+1 ${item?.name ?? ''}`,
          color: '#c9f0ff',
          x: c.x,
          y: c.y - 50,
          t0: now,
          icon: item ? `/assets/icons/${item.icon}.png` : undefined,
          size: 18,
        });
      }
    }
    this.floaters = this.floaters.filter((f) => now - f.t0 < FLOAT_MS);
  }

  /** Treino no Boneco de Treino (Dummy) da cidade. */
  /** Limiar dos Mortos: fica parado diante do Ceifador até resgatar, comprar a bênção ou voltar. */
  private updateLimbo(now: number) {
    if (!this.limbo) this.limbo = limboMap();
    if (this.map !== this.limbo) {
      this.switchTo(this.limbo, this.limbo.start);
      this.huntMonsters = [];
    }
    this.stepMover(this.player, now);
    if (this.player.path.length === 0) this.player.dir = 'right';
    this.floaters = this.floaters.filter((f) => now - f.t0 < FLOAT_MS);
  }

  private updateDummy(now: number, activity: Activity, startedAt: number) {
    const npc = this.cityMap.npcs?.find((n) => n.id === 'dummy');
    const dummyTile = npc ? { x: npc.x, y: npc.y } : { x: 8, y: 14 };
    const dummySpot = { x: dummyTile.x, y: dummyTile.y + 1 };
    if (this.mode !== 'city' || this.map !== this.cityMap) {
      this.switchTo(this.cityMap, dummySpot);
      const route = findPath(this.cityMap, this.player.tile, (x, y) => x === dummySpot.x && y === dummySpot.y, 60);
      if (route) this.walk(route, now);
      else this.teleport(dummySpot);
      this.lastDoneAt = now;
    }
    const dummy = dummyById(activity.node);
    const interval = dummy?.intervalMs ?? 3000;

    this.stepMover(this.player, now);
    if (this.player.path.length === 0) {
      if (this.player.tile.x !== dummySpot.x || this.player.tile.y !== dummySpot.y) {
        const route = findPath(this.cityMap, this.player.tile, (x, y) => x === dummySpot.x && y === dummySpot.y, 60);
        if (route) this.walk(route, now);
        else this.teleport(dummySpot);
      }
      this.player.dir = 'up';
      const n = Math.floor((now - startedAt) / interval);
      const doneAt = startedAt + n * interval;
      if (n >= 1 && doneAt > this.lastDoneAt + interval / 2) {
        this.lastDoneAt = doneAt;
        const c = center(dummyTile);
        const me = { x: this.player.px, y: this.player.py };

        if (activity.node === 'dummy_ranged') {
          sfx('hit');
          this.fx.shoot('dagger', me, c, now, 0.6);
        } else if (activity.node === 'dummy_magic') {
          sfx('spell');
          this.fx.cast('spark_rune', me, c, now);
        } else {
          sfx('hit');
          this.lunge = { by: 'p', target: 0, t0: now };
        }

        this.flash = { on: 'm', target: 0, t0: now };
        const xpAmt = dummy ? dummyXpPerAction(dummy, this.combatXp) : 20;
        this.floaters.push({
          text: `+${xpAmt} XP`,
          color: '#ffe066',
          x: c.x,
          y: c.y - 45,
          t0: now,
          icon: dummy ? `/assets/icons/${dummy.icon}.png` : undefined,
          size: 20,
        });
      }
    }
    this.updateCitizens(now);
    this.floaters = this.floaters.filter((f) => now - f.t0 < FLOAT_MS);
  }

  /** Os próximos `n` tiles da rota a partir de `from` (a rota é um laço). */
  private routeAhead(from: number, n: number): Pt[] {
    const r = this.map.route;
    const out: Pt[] = [];
    for (let i = 1; i <= n; i++) out.push(r[(from + i) % r.length]);
    return out;
  }

  /** Segue a rota: anda mais um trecho quando terminou o anterior. */
  /** Distância de ataque do personagem (1 = corpo a corpo). */
  private reach() {
    return RANGED.has(this.vocation) ? RANGED_TILES : 1;
  }

  private patrol(now: number) {
    const r = this.map.route;
    if (r.length === 0) {
      if (this.player.path.length === 0 && now > this.nextWander) this.wander(now);
      return;
    }
    if (this.player.path.length > 0) return;
    // Tem monstro vindo pra cima (perseguindo colado): espera ele chegar em vez de passar reto.
    const p = this.player.tile;
    if (this.idle.some((m) => m.chasing && Math.abs(m.tile.x - p.x) + Math.abs(m.tile.y - p.y) <= 3)) return;

    // Se saiu da rota (por exemplo no fim de uma luta): volta andando antes de seguir.
    const cur = r[this.routeIdx];
    if (cur.x !== this.player.tile.x || cur.y !== this.player.tile.y) {
      const back = findPath(this.map, this.player.tile, (x, y) => x === cur.x && y === cur.y, 30);
      if (back?.length) return this.walk(back, now);
      this.routeIdx = this.nearestRouteIdx(this.player.tile, this.routeIdx);
    }
    // Marcha contínua para a frente pela rota da caçada.
    this.walk(this.routeAhead(this.routeIdx, 6), now);
    this.routeIdx = (this.routeIdx + 6) % r.length;
  }

  /**
   * Avança a cena até `now` (relógio local). `startedAt` é quando a atividade
   * começa de fato; antes disso, numa caçada, o personagem está indo ao portal.
   */
  update(now: number, activity: Activity | null, cycle: CycleView | null, startedAt: number) {
    this.updateScene(now, activity, cycle, startedAt);
    this.updateOthers(now, activity);
  }

  /**
   * Outros jogadores no mesmo lugar: aparecem perto de onde a gente está e
   * passeiam (na caçada, pela trilha; no trabalho, em volta do ponto).
   */
  private updateOthers(now: number, activity: Activity | null) {
    this.keepCityPos(now);
    const place = placeOf(activity);
    if (this.map !== this.otherMap) {
      this.otherMovers.clear();
      this.otherMap = this.map;
    }
    const here = place === 'boss' ? [] : this.others.filter((p) => p.place === place);
    for (const id of this.otherMovers.keys()) if (!here.some((p) => p.id === id)) this.otherMovers.delete(id);
    const map = this.map;
    const near = (from: Pt, r: number): Pt | null => {
      for (let i = 0; i < 20; i++) {
        const t = { x: from.x + Math.round((this.rand() - 0.5) * 2 * r), y: from.y + Math.round((this.rand() - 0.5) * 2 * r) };
        if (walkable(map, t.x, t.y) && (t.x !== this.player.tile.x || t.y !== this.player.tile.y)) return t;
      }
      return null;
    };
    const home = (): Pt =>
      map.route.length ? map.route[Math.floor(this.rand() * map.route.length)] : map.work ? map.work.spot : this.player.tile;
    const radius = map.route.length ? 3 : map.work ? 3 : 8;
    // Covil em grupo: os aliados da party vão para o lado do chefe e lutam junto (na tela; no servidor
    // cada um tem a própria luta, e o chefe de todos tem menos vida por eles estarem lá).
    // Raide também: os da party lutam do lado (antes só no covil).
    const lair = !!activity && !!(parseHuntNode(activity.node)?.hunt.lair || parseHuntNode(activity.node)?.hunt.raid);
    const boss = lair ? this.monsters.find((m) => m.diedAt === null) : undefined;
    let slot = 0;
    // Mapa de profissão: cada um vai para um lugar em volta do alvo e fica trabalhando (simulado).
    const workSlots = this.mode === 'work' && map.work ? this.workSlotsFor(map) : [];
    const byId = [...here].sort((a, b) => a.id - b.id);
    for (const p of here) {
      let m = this.otherMovers.get(p.id);
      if (boss && m && this.partyMemberIds.has(p.id)) {
        this.allyFight(now, p, m, boss, slot++);
        continue;
      }
      const ws = workSlots[byId.indexOf(p)];
      if (ws && map.work) {
        if (!m) {
          const c = center(ws);
          m = { px: c.x, py: c.y, tile: ws, path: [], stepStart: now, dir: dirTo(ws, map.work.target), nextAt: now };
          this.otherMovers.set(p.id, m);
        }
        this.goWork(now, m, ws, map.work.target);
        continue;
      }
      if (m) m.workSlot = undefined;
      // Cidade: quem mandou posição anda até ela de verdade; quem não mandou (cliente antigo) segue simulado.
      const live = this.mode === 'city' ? (this.livePos.get(p.id) ?? p.pos) : undefined;
      if (live && walkable(map, live.x, live.y)) {
        if (!m) {
          const c = center(live);
          m = { px: c.x, py: c.y, tile: { ...live }, path: [], stepStart: now, dir: 'down', nextAt: now };
          this.otherMovers.set(p.id, m);
        }
        this.followLive(now, m, live);
        continue;
      }
      if (!m) {
        const t = near(home(), radius) ?? this.player.tile;
        const c = center(t);
        m = { px: c.x, py: c.y, tile: t, path: [], stepStart: now, dir: 'down', nextAt: now + this.rand() * 2000 };
        this.otherMovers.set(p.id, m);
      }
      this.stepMover(m, now);
      if (m.path.length || now < m.nextAt) continue;
      m.nextAt = now + 1500 + this.rand() * 4000;
      // Na caçada anda até outro ponto da trilha; nos outros mapas, um pouco em volta.
      const to = near(map.route.length && this.rand() < 0.5 ? home() : m.tile, radius);
      const route = to ? findPath(map, m.tile, (x, y) => x === to.x && y === to.y, 24) : null;
      if (route?.length) {
        m.path = route;
        m.stepStart = now;
      }
    }
  }

  private workSlotsFor(map: WorldMap): Pt[] {
    let slots = this.workSlotCache.get(map);
    if (!slots) this.workSlotCache.set(map, (slots = workSlots(map)));
    return slots;
  }

  /** Cidade ao vivo: anda até o tile que ele mandou (longe ou sem caminho, aparece lá). */
  private followLive(now: number, m: Mover & { nextAt: number }, to: Pt) {
    const dest = m.path.length ? m.path[m.path.length - 1] : m.tile;
    if (dest.x !== to.x || dest.y !== to.y) {
      // No meio de um passo: termina o passo atual e segue a rota nova a partir dele.
      const from = m.path.length ? m.path[0] : m.tile;
      const far = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
      const route = far === 0 ? [] : far <= 40 ? findPath(this.map, from, (x, y) => x === to.x && y === to.y, 60) : null;
      if (route) {
        if (m.path.length) m.path = [m.path[0], ...route];
        else {
          m.path = route;
          m.stepStart = now;
        }
      } else {
        const c = center(to);
        m.tile = { ...to };
        m.px = c.x;
        m.py = c.y;
        m.path = [];
      }
    }
    this.stepMover(m, now);
  }

  /** Vai até o lugar de trabalho (longe ou sem caminho, aparece lá) e fica virado para o alvo. */
  private goWork(now: number, m: Mover & { nextAt: number; workSlot?: Pt }, spot: Pt, target: Pt) {
    m.workSlot = spot;
    this.stepMover(m, now);
    if (m.path.length) return;
    const far = Math.abs(m.tile.x - spot.x) + Math.abs(m.tile.y - spot.y);
    if (far > 0) {
      const route = far <= 12 ? findPath(this.map, m.tile, (x, y) => x === spot.x && y === spot.y, 30) : null;
      if (route?.length) {
        m.path = route;
        m.stepStart = now;
        return;
      }
      const c = center(spot);
      m.tile = spot;
      m.px = c.x;
      m.py = c.y;
    }
    m.dir = dirTo(m.tile, target);
  }

  /** Aliado da party no covil: fica colado num lado do chefe, virado para ele (longe ou sem caminho, aparece lá). */
  private allyFight(now: number, p: OnlinePlayer, m: Mover & { nextAt: number }, boss: FightMonster, slot: number) {
    const r = RANGED.has(p.vocation) ? 2 : 1;
    const sides: Pt[] = [{ x: r, y: 0 }, { x: -r, y: 0 }, { x: 0, y: r }, { x: r, y: r }, { x: -r, y: r }, { x: 0, y: -r }];
    const want = sides.map((d) => ({ x: boss.tile.x + d.x, y: boss.tile.y + d.y })).filter((t) => walkable(this.map, t.x, t.y));
    const spot = want[slot % Math.max(1, want.length)] ?? boss.tile;
    this.stepMover(m, now);
    if (m.path.length) return;
    const far = Math.abs(m.tile.x - spot.x) + Math.abs(m.tile.y - spot.y);
    if (far > 0) {
      const route = far <= 8 ? findPath(this.map, m.tile, (x, y) => x === spot.x && y === spot.y, 20) : null;
      if (route?.length) {
        m.path = route;
        m.stepStart = now;
        return;
      }
      const c = center(spot);
      m.tile = spot;
      m.px = c.x;
      m.py = c.y;
    }
    m.dir = dirTo(m.tile, boss.tile);
  }

  /** Golpe de um aliado na luta compartilhada do covil: ele ataca na tela e o dano sai no chefe. */
  private showAllyHit(h: CycleView['hits'][number], now: number) {
    this.applyHitHp(h);
    const boss = this.monsters[h.target ?? 0];
    if (!boss) return;
    const to = center(boss.tile);
    const p = this.others.find((o) => o.id === h.ally);
    const m = p ? this.otherMovers.get(p.id) : undefined;
    if (p && m) {
      if (RANGED.has(p.vocation)) this.fx.shoot(p.vocation === 'hunter' ? 'dagger' : 'orb', { x: m.px, y: m.py }, to, now, p.vocation === 'hunter' ? 0.7 : 0.45);
      else this.allyLunge.set(p.id, now);
    }
    this.floaters.push({
      text: h.crit ? `${h.dmg}!` : String(h.dmg),
      color: h.crit ? '#ffcf3a' : '#38ef7d',
      x: to.x + (this.rand() - 0.5) * 30,
      y: to.y - 70,
      t0: now + (p && RANGED.has(p.vocation) ? 250 : 120),
      size: h.crit ? 26 : 20,
    });
  }

  private updateScene(now: number, activity: Activity | null, cycle: CycleView | null, startedAt: number) {
    // Chefe global: vai para a arena e luta junto com os outros jogadores.
    if (activity?.node === WORLD_BOSS_NODE) return this.updateBoss(now);
    // Morreu sem bênção: acorda no Limiar dos Mortos, diante do Ceifador.
    if (activity && isReaperNode(activity.node)) return this.updateLimbo(now);
    // Boneco de treino: treina no pátio do Bastião em frente ao dummy.
    if (activity && isDummyNode(activity.node)) return this.updateDummy(now, activity, startedAt);
    // Sem caçada: fica na cidade, passeando pela praça.
    if (!activity || activity.skill !== 'combat') {
      this.travelSeed = null;
      // Profissão: vai para o mapa dela (mina, lago, forja...) e trabalha.
      const workMap = activity ? this.workMapFor(activity.skill, activity.node) : null;
      if (activity && workMap) return this.updateWork(now, activity, workMap, startedAt);
      this.work = null;
      if (this.mode === 'hunt') this.switchTo(this.cityMap, this.portalFront());
      if (this.mode === 'work' || this.mode === 'boss') this.switchTo(this.cityMap, this.cityMap.start);
      // Na cidade fica parado (andar sozinho movia a tela e os NPCs fugiam do clique).
      this.stepMover(this.player, now);
      this.updateCitizens(now);
      this.floaters = this.floaters.filter((f) => now - f.t0 < FLOAT_MS);
      return;
    }

    // Caçada escolhida, mas ainda não começou: anda até o portal.
    if (now < startedAt) {
      if (this.mode === 'hunt') this.switchTo(this.cityMap, this.portalFront());
      if (this.mode === 'work' || this.mode === 'boss') this.switchTo(this.cityMap, this.cityMap.start);
      if (this.travelSeed !== activity.seed) {
        this.travelSeed = activity.seed;
        const goal = this.portalFront();
        const route = findPath(this.map, this.player.tile, (x, y) => x === goal.x && y === goal.y, 60);
        if (route) this.walk(route, now);
        else this.teleport(goal);
      }
      this.stepMover(this.player, now);
      if (this.player.path.length === 0) this.player.dir = 'up';
      return;
    }

    // Arena de gladiadores: vai para o fosso, sem monstros soltos.
    const inArena = isArenaNode(activity.node);
    // A Aniquilação tem o mapa da ponte; as outras arenas, o fosso.
    this.casterDef = inArena ? (parseArenaNode(activity.node)?.casters ?? null) : null;
    const arenaMap = inArena ? (parseArenaNode(activity.node)?.casters ? (this.bridge ??= annihilationBridgeMap()) : (this.pit ??= gladiatorPitMap())) : null;
    if (arenaMap && this.map !== arenaMap) {
      this.switchTo(arenaMap, arenaMap.start);
      this.huntMonsters = [];
      this.pitEntered = -1;
    } else if (!inArena && (this.map === this.pit || this.map === this.bridge)) {
      this.switchTo(this.cityMap, this.portalFront());
    }
    // Atravessou o portal. Também vindo direto de outro mapa (pesca, forja...): se a tela pulou a ida
    // até o portal (aba em segundo plano), ficava no mapa da profissão desenhando a luta nele.
    const huntId = inArena ? null : (parseHuntNode(activity.node)?.hunt.id ?? '');
    if (this.mode === 'city' || (!inArena && (this.mode !== 'hunt' || huntId !== this.huntMapId))) {
      const hunt = parseHuntNode(activity.node)?.hunt;
      if (hunt?.raid && !raidById(hunt.id)?.enabled) {
        if (this.mode === 'hunt') this.switchTo(this.cityMap, this.portalFront());
        return;
      }
      this.huntMapId = huntId;
      const huntMap = this.huntMapFor(hunt?.id ?? '');
      this.switchTo(huntMap, huntMap.start);
      // Instância: o mapa tem os monstros da limpeza; os chefes aparecem na hora.
      // Covil: mapa vazio, o chefe só aparece na luta (sem cópias dele andando pelo mapa).
      this.huntMonsters = ((hunt?.boss ? hunt.trash : hunt?.lair ? [] : hunt?.monsters) ?? [])
        .map((id) => monsterById(id))
        .filter((m): m is NonNullable<typeof m> => !!m)
        .map((m) => ({ id: m.id, sprite: m.sprite, name: m.name }));
    }
    // Instância: progresso da limpeza; na hora dos chefes o mapa esvazia (a luta é só com eles).
    const instParsed = parseHuntNode(activity.node);
    const instHunt = instParsed?.hunt;
    this.inst = instHunt?.boss && instHunt.trash?.length ? { hunt: instHunt, seq: activity.seq, pack: instParsed!.pack } : null;
    if (this.inst && activity.seq >= instanceWaves(instHunt!, instParsed!.pack).length) {
      this.huntMonsters = [];
      this.idle = [];
    }
    if (this.mode === 'hunt') {
      this.populate();
      this.updateRoamers(now);
    }

    const key = `${activity.since}:${activity.seq}`;
    if (cycle && key !== this.cycleKey) this.beginCycle(key, now, activity, cycle, startedAt);
    // Fora da luta (descansando, ou esperando o próximo ciclo): segue a rota.
    const fighting = cycle && this.monster && now - startedAt < cycle.fightMs;
    if (!fighting && this.deadAt === null) {
      if (this.map.pit) this.pitHome(now);
      else this.patrol(now);
    }
    if (fighting && RANGED.has(this.vocation) && !this.map.pit) this.kite(now, cycle!.fightMs - (now - startedAt));
    // Com muitos passos pela frente, corre para alcançar a luta (em vez de pular).
    this.player.speed = this.player.path.length > 10 ? WALK_MS_PER_TILE * 0.55 : undefined;
    this.stepMover(this.player, now);

    this.manaCycle = cycle && this.mode === 'hunt' ? cycle : null;
    if (cycle && this.monster) {
      const t = now - startedAt;
      this.cycleT = t;
      // Golpes que já aconteceram e ainda não foram mostrados.
      while (this.hitsShown < cycle.hits.length && cycle.hits[this.hitsShown].t <= t) {
        this.showHit(cycle.hits[this.hitsShown], now);
        this.hitsShown++;
      }
      const fightOver = t >= cycle.fightMs;
      // O último golpe já marca o monstro como morto (applyHitHp): a vitória se mostra uma vez por ciclo.
      if (fightOver && cycle.outcome === 'win' && this.killShownKey !== this.cycleKey) {
        this.killShownKey = this.cycleKey;
        for (const m of this.monsters) {
          if (m.diedAt === null && !m.entering) m.diedAt = now;
        }
        const m = this.monster ? this.monster.tile : this.player.tile;
        const c = center(m);
        sfx('kill');
        const loot = Object.keys(cycle.loot);
        if (loot.some((id) => splitRarity(id).tier > 0)) setTimeout(() => sfx('rare'), 250);
        else if (loot.length) setTimeout(() => sfx('coins'), 250);
        // O loot sai do monstro; o XP sobe na cabeça pelo que o servidor creditou (showXp).
        let i = 0;
        for (const [id, qty] of Object.entries(cycle.loot)) {
          const item = itemById(id);
          this.floaters.push({
            text: `${qty}x ${item?.name ?? id}`,
            color: splitRarity(id).tier > 0 ? rarityOf(id).color : '#c9f0ff',
            x: c.x,
            y: c.y - 40 + i * 22,
            t0: now + 250 + i * 150,
            icon: item ? `/assets/icons/${item.icon}.png` : undefined,
            size: 18,
          });
          i++;
        }
      }
      if (fightOver && cycle.outcome === 'death' && this.deadAt === null) {
        this.deadAt = now;
        sfx('death');
      }
      // Comeu depois da luta: mostra a comida e a cura sobre o personagem.
      if (fightOver && cycle.ate && !this.ateShown) {
        this.ateShown = true;
        const food = itemById(cycle.ate);
        this.floaters.push({
          text: `+${Math.min(food?.food ?? 0, cycle.damageTaken)} vida`,
          color: '#9dff8a',
          x: this.player.px,
          y: this.player.py - 80,
          t0: now + 400,
          icon: food ? `/assets/icons/${food.icon}.png` : undefined,
          size: 18,
        });
      }
      if (fightOver && cycle.outcome === 'draw') {
        for (const m of this.monsters) if (m.diedAt === null) m.diedAt = now;
      }
      if (this.map.pit) this.updatePit(now, activity, cycle, t);

      // Vida: cai com os golpes; no descanso volta até encher.
      if (fightOver && cycle.outcome !== 'death') {
        const restT = Math.min(1, (t - cycle.fightMs) / Math.max(1, cycle.restMs));
        // A comida cura de uma vez; o descanso cobre o resto.
        const healed = cycle.ate ? Math.min(itemById(cycle.ate)?.food ?? 0, cycle.damageTaken) : 0;
        const lost = cycle.damageTaken - healed;
        this.playerHp = this.playerMaxHp - lost * (1 - restT);
      }
    }

    this.floaters = this.floaters.filter((f) => now - f.t0 < FLOAT_MS);
  }

  private beginCycle(key: string, now: number, activity: Activity, cycle: CycleView, startedAt: number) {
    this.cycleKey = key;
    this.groupKillAt = cycle.hits.some((h) => h.by === 'a') && cycle.outcome === 'win' ? cycle.fightMs : null;
    this.hitsShown = 0;
    this.ateShown = false;
    this.deadAt = null;
    this.playerMaxHp = cycle.playerHp;
    this.playerHp = cycle.playerHp;

    const mIds = cycle.monsters && cycle.monsters.length > 0 ? cycle.monsters : [cycle.monster];
    const mDefs = mIds.map((id) => monsterById(id) ?? arenaOpponentById(id));
    this.fightSprites = new Set(mDefs.map((d) => d?.sprite ?? '').filter(Boolean));
    const hps = cycle.monsterHps && cycle.monsterHps.length > 0 ? cycle.monsterHps : [cycle.monsterHp];

    // Ficou muito para trás (as lutas chegam mais rápido do que ele anda, numa caçada que mata rápido):
    // a fila de passos crescia sem parar e ele lutava com monstros fora da tela. Só pula quando a fila
    // é enorme (o caminho normal até o próximo monstro já passa de 6 tiles: com 6 ele pulava quase toda luta);
    // antes disso ele só apressa o passo (stepMover).
    if (this.player.path.length > 30) {
      const tail = this.player.path.slice(-8);
      this.teleport(this.player.path[this.player.path.length - 9]);
      this.walk(tail, now);
    }

    // Com rota: o monstro aparece na rota ou é escolhido dos que já estão à frente no percurso.
    const loop = this.map.route;
    const from = this.player.path.length ? this.player.path[this.player.path.length - 1] : this.player.tile;
    let spot: Pt | null = null;
    let route: Pt[] | null = null;
    let primaryIdx = 0;

    if (loop.length > 3) {
      // Prioriza monstros que já estão perto (até 8 tiles) para limpar a área local primeiro;
      // se não houver monstros colados, busca os mais próximos à frente na rota.
      let target = -1;
      let best = Infinity;
      this.idle.forEach((m, i) => {
        if (!this.fightSprites.has(m.sprite)) return;
        const dist = Math.abs(m.tile.x - from.x) + Math.abs(m.tile.y - from.y);
        if (dist > 16) return;

        const aheadSteps = this.ahead(this.routeIdx, m.k);
        const behindSteps = this.ahead(m.k, this.routeIdx);
        // Monstros perto (até 8 tiles) ou perseguindo são engajados na hora (limpa a sala/canto antes de avançar).
        // Apenas para monstros mais longe (> 8 tiles) exigimos que estejam à frente na rota.
        if (dist > 8 && aheadSteps > loop.length * 0.45 && !m.chasing && behindSteps < aheadSteps) return;

        const d = dist - (m.chasing ? 5 : 0);
        if (d < best) {
          best = d;
          target = i;
        }
      });
      const m = target >= 0 ? this.idle[target] : null;
      const toIt = m
        ? findPath(
            this.map,
            from,
            (x, y) => (x !== m.tile.x || y !== m.tile.y) && Math.abs(x - m.tile.x) + Math.abs(y - m.tile.y) <= this.reach(),
            40,
          )
        : null;
      if (m && toIt) {
        this.idle.splice(target, 1);
        spot = { ...m.tile };
        route = [...this.player.path, ...toIt];
        this.routeIdx = this.nearestRouteIdx(spot, this.routeIdx);
        const matched = mDefs.findIndex((d) => d?.sprite === m.sprite);
        if (matched >= 0) primaryIdx = matched;
      } else {
        // Sem monstro do tipo por perto à frente: segue marchando pela rota!
        this.routeIdx = this.nearestRouteIdx(from, this.routeIdx);
        const advance = 6;
        const ahead = this.routeAhead(this.routeIdx, advance + 2);
        spot = ahead[Math.min(ahead.length - 1, advance)];
        const goalIdx = Math.max(0, advance - (this.reach() > 1 ? 2 : 1));
        const goal = ahead[goalIdx] ?? ahead[0];
        const toGoal = findPath(this.map, from, (x, y) => x === goal.x && y === goal.y, 40);
        route = toGoal ? [...this.player.path, ...toGoal] : null;
        if (!toGoal) spot = null;
        this.routeIdx = (this.routeIdx + advance) % loop.length;
      }
    }
    // Arena: o personagem fica no meio e o desafiante para na frente dele (na distância de ataque).
    const pit = this.map.pit;
    if (pit) {
      spot = { x: pit.spot.x + this.reach(), y: pit.spot.y };
      route = from.x === pit.spot.x && from.y === pit.spot.y ? [] : (findPath(this.map, from, (x, y) => x === pit.spot.x && y === pit.spot.y, 40) ?? []);
    }
    // Sem rota (mapa pequeno): aparece perto (2 a 3 tiles), num lugar alcançável. Sorteio estável por ciclo.
    const rand = rngFor(activity.seed, activity.seq + 7919);
    for (let i = 0; i < 40 && !route; i++) {
      const a = rand() * Math.PI * 2;
      const r = 2 + Math.floor(rand() * 2);
      const cand = { x: from.x + Math.round(Math.cos(a) * r), y: from.y + Math.round(Math.sin(a) * r) };
      if (!walkable(this.map, cand.x, cand.y) || (cand.x === from.x && cand.y === from.y)) continue;
      route =
        findPath(this.map, from, (x, y) => y === cand.y && Math.abs(x - cand.x) === 1, 6) ??
        findPath(this.map, from, (x, y) => Math.abs(x - cand.x) + Math.abs(y - cand.y) === 1, 6);
      if (route) spot = cand;
    }
    if (!spot || !route) {
      spot = { ...from };
      route = [];
    }

    this.monsters = [];
    emitCastReset();
    const pDef = mDefs[primaryIdx];
    this.monsters.push({
      id: pDef?.id,
      tile: spot,
      sprite: pDef?.sprite ?? 'rato',
      name: pDef?.name ?? '',
      hp: hps[primaryIdx] ?? cycle.monsterHp,
      maxHp: hps[primaryIdx] ?? cycle.monsterHp,
      diedAt: null,
      big: isBossFight(activity, pDef?.name ?? ''),
    });

    // Arena: o desafiante entra andando pelo portão (se ainda não entrou no fim do descanso anterior).
    if (pit && this.pitEntered !== activity.seq && now - startedAt < cycle.fightMs) {
      const goal = spot;
      const path = findPath(this.map, pit.gate, (x, y) => x === goal.x && y === goal.y, 60);
      if (path?.length) this.monsters[0].run = { path: [pit.gate, ...path], t0: now };
    }
    this.pitEntered = activity.seq;

    const dest = route && route.length ? route[route.length - 1] : from;
    const taken = new Set<string>([`${spot.x},${spot.y}`, `${dest.x},${dest.y}`]);
    const extraSpots: Pt[] = [
      { x: dest.x - Math.sign(spot.x - dest.x || 1), y: dest.y },
      { x: dest.x, y: dest.y + 1 },
      { x: dest.x, y: dest.y - 1 },
      { x: dest.x + 1, y: dest.y },
      { x: dest.x - 1, y: dest.y },
      { x: dest.x + 1, y: dest.y + 1 },
      { x: dest.x - 1, y: dest.y + 1 },
      { x: dest.x + 1, y: dest.y - 1 },
      { x: dest.x - 1, y: dest.y - 1 },
      { x: dest.x, y: dest.y + 2 },
      { x: dest.x, y: dest.y - 2 },
      { x: dest.x + 2, y: dest.y },
      { x: dest.x - 2, y: dest.y },
    ];

    const raidHunt = parseHuntNode(activity.node)?.hunt;
    const raid = raidHunt?.raid ? raidById(raidHunt.id) : undefined;
    const raidPhase = raid ? raid.phases[Math.min(activity.seq ?? 0, raid.phases.length - 1)] : undefined;
    const raidAdds = !!raidPhase?.adds;
    const addsEveryMs = raidPhase?.adds?.everyMs ?? 20_000;
    const addsCount = raidPhase?.adds?.count ?? 3;
    for (let i = 0; i < mDefs.length; i++) {
      if (i === primaryIdx) continue;
      const def = mDefs[i];
      // Quem entra no bando é um monstro do mesmo tipo que estava por perto (não fica um clone vagando).
      let joiner = -1;
      let jd = Infinity;
      this.idle.forEach((m, k) => {
        const d = Math.abs(m.tile.x - dest.x) + Math.abs(m.tile.y - dest.y);
        if (m.sprite === def?.sprite && d <= 22 && d < jd) {
          jd = d;
          joiner = k;
        }
      });
      const came = joiner >= 0 ? this.idle.splice(joiner, 1)[0] : null;
      // Quem ataca de longe fica a uns 3 tiles do personagem; o corpo a corpo, colado.
      const ring = RANGED_MONSTERS.has(def?.sprite ?? '')
        ? [3, 2, 4].flatMap((r) => this.ringAround(dest, r))
        : extraSpots;
      let cand = ring.find((p) => walkable(this.map, p.x, p.y) && !taken.has(`${p.x},${p.y}`));
      if (!cand) cand = { x: spot.x, y: spot.y };
      taken.add(`${cand.x},${cand.y}`);
      const goal = cand;
      const path = came ? findPath(this.map, came.tile, (x, y) => x === goal.x && y === goal.y, 30) : null;
      this.monsters.push({
        run: came && path?.length ? { path: [came.tile, ...path], t0: now } : undefined,
        id: def?.id,
        tile: cand,
        sprite: def?.sprite ?? 'rato',
        name: def?.name ?? '',
        hp: hps[i] ?? def?.hp ?? 10,
        maxHp: hps[i] ?? def?.hp ?? 10,
        diedAt: null,
        big: isBossFight(activity, def?.name ?? ''),
        // Raide, fase 2: os guardas entram de 3 em 3 a cada 20 s (antes apareciam todos no começo da luta).
        appearAt: raidAdds ? startedAt + Math.ceil(this.monsters.length / addsCount) * addsEveryMs : undefined,
      });
    }

    // Instância: o chefe chegou. Aviso grande e uma explosão onde ele surge.
    const bossParsed = parseHuntNode(activity.node);
    const bossHunt = bossParsed?.hunt;
    if (bossHunt?.boss && bossHunt.trash?.length && activity.seq >= instanceWaves(bossHunt, bossParsed!.pack).length) {
      const alertKey = `${activity.since}:${activity.seq}`;
      if (this.bossAlertKey !== alertKey && now - startedAt < cycle.fightMs) {
        this.bossAlertKey = alertKey;
        this.bossAlert = { t0: now, name: pDef?.name ?? '' };
        const c = center(spot);
        this.fx.cast('fireball_rune', c, c, now);
        sfx('rare');
      }
    }

    // A luta já acabou (a aba ficou fechada): pula direto para o fim. Se só chegou
    // atrasada (o servidor avisa a cada segundo), anda até o monstro normalmente.
    const t = now - startedAt;
    if (t >= cycle.fightMs) {
      const end = route.length ? route[route.length - 1] : from;
      this.teleport(end);
      for (const h of cycle.hits) {
        if (h.t > t) break;
        this.applyHitHp(h);
        this.hitsShown++;
      }
      if (t >= cycle.fightMs && cycle.outcome !== 'death') {
        for (const m of this.monsters) m.diedAt = now - 10_000;
      }
    } else {
      this.walk(route, now);
      if (this.reach() > 1) this.chargeMelee(route.length ? route[route.length - 1] : from, now);
    }
  }

  /** Os tiles a exatamente `r` passos (distância de Manhattan) de `c`, numa ordem estável. */
  private ringAround(c: Pt, r: number): Pt[] {
    const out: Pt[] = [];
    for (let dx = -r; dx <= r; dx++) {
      const dy = r - Math.abs(dx);
      out.push({ x: c.x + dx, y: c.y + dy });
      if (dy) out.push({ x: c.x + dx, y: c.y - dy });
    }
    return out;
  }

  private nextKite = 0;
  /** Projéteis desenhados com um ícone (o donut do Diabrete Doceiro), girando no ar. */
  private iconShots: { src: string; from: { x: number; y: number }; to: { x: number; y: number }; t0: number }[] = [];
  /** Instância em andamento: para a barra de progresso (ondas e chefes). */
  private inst: { hunt: Hunt; seq: number; pack: number } | null = null;
  /** Aviso grande quando um chefe da instância aparece. */
  private bossAlert: { t0: number; name: string } | null = null;
  private bossAlertKey = '';
  /**
   * Arqueiro e arcanista na luta: quando um monstro de corpo a corpo cola, recuam uns passos
   * e continuam atirando; o monstro vem atrás.
   */
  private kite(now: number, left: number) {
    if (now < this.nextKite || left < 1500 || this.player.path.length) return;
    const p = this.player.tile;
    const melee = this.monsters.filter((m) => m.diedAt === null && !m.run && !RANGED_MONSTERS.has(m.sprite));
    if (!melee.some((m) => Math.abs(m.tile.x - p.x) + Math.abs(m.tile.y - p.y) <= 1)) return;
    const taken = new Set(this.monsters.map((m) => `${m.tile.x},${m.tile.y}`));
    const far = (x: number, y: number) => Math.min(...melee.map((m) => Math.abs(m.tile.x - x) + Math.abs(m.tile.y - y)));
    let best: Pt[] | null = null;
    let bestScore = far(p.x, p.y);
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < 2 || d > 3) continue;
        const x = p.x + dx;
        const y = p.y + dy;
        if (!walkable(this.map, x, y) || taken.has(`${x},${y}`)) continue;
        const score = far(x, y);
        if (score <= bestScore) continue;
        const path = findPath(this.map, p, (a, b) => a === x && b === y, 6);
        if (!path?.length || path.length > 3) continue;
        best = path;
        bestScore = score;
      }
    this.nextKite = now + 2200;
    if (!best) return;
    this.walk(best, now);
    this.chargeMelee(best[best.length - 1], now);
  }

  /** Quem ataca de longe atira de onde está; o monstro de corpo a corpo corre até ficar colado nele. */
  private chargeMelee(dest: Pt, now: number) {
    const key = (p: Pt) => `${p.x},${p.y}`;
    const used = new Set<string>([key(dest)]);
    for (const m of this.monsters) {
      if (RANGED_MONSTERS.has(m.sprite)) continue;
      if (Math.abs(m.tile.x - dest.x) + Math.abs(m.tile.y - dest.y) <= 1) {
        used.add(key(m.tile));
        continue;
      }
      const path = findPath(this.map, m.tile, (x, y) => Math.abs(x - dest.x) + Math.abs(y - dest.y) === 1 && !used.has(`${x},${y}`), 24);
      if (!path?.length) continue;
      const goal = path[path.length - 1];
      used.add(key(goal));
      // Se ainda está chegando (bando ou portão da arena), emenda a corrida no fim do caminho.
      m.run = m.run ? { path: [...m.run.path, ...path], t0: m.run.t0 } : { path: [m.tile, ...path], t0: now };
      m.tile = goal;
    }
  }

  private showHit(h: CycleView['hits'][number], now: number) {
    if (h.by === 'a') return this.showAllyHit(h, now);
    // Bola de fogo de um acorrentado da ilha: voa até o personagem e o dano aparece ao chegar.
    if (h.caster !== undefined) {
      const from = this.map.casters?.[h.caster];
      this.applyHitHp(h);
      const me = { x: this.player.px, y: this.player.py };
      if (from) this.fx.cast('fireball', center(from), me, now);
      sfx('spell');
      this.floaters.push({ text: String(h.dmg), color: '#ff7a3a', x: me.x + (this.rand() - 0.5) * 16, y: me.y - 60, t0: now + 350, size: 22 });
      return;
    }
    if (h.dodge) {
      const me = { x: this.player.px, y: this.player.py };
      this.floaters.push({ text: tr('Esquivou', 'Dodged'), color: '#d8f0ff', x: me.x, y: me.y - 60, t0: now, size: 20 });
      return;
    }
    // Poção de vida no meio da luta: a cura sobe sobre o personagem.
    if (h.healthPotion) {
      this.applyHitHp(h);
      emitCast(h.healthPotion);
      sfx('spell');
      const c = { x: this.player.px, y: this.player.py };
      this.floaters.push({ text: `+${h.heal ?? 0}`, color: '#7dff8a', x: c.x, y: c.y - 70, t0: now, size: 22 });
      return;
    }
    if (h.manaPotion && h.manaHeal) {
      emitCast(h.manaPotion);
      sfx('spell');
      const c = { x: this.player.px, y: this.player.py };
      this.floaters.push({ text: `+${h.manaHeal} MP`, color: '#4aa3ff', x: c.x, y: c.y - 95, t0: now + 50, size: 22 });
      if (h.dmg === 0 && !h.spell && !h.rune && !h.heal) return;
    }
    if (h.rune) {
      if (!h.runeExtra) emitCast(h.rune);
      return this.showRune(h, now);
    }
    this.applyHitHp(h);
    const spell = h.spell ? spellById(h.spell) : undefined;
    // Cura, buff e escudo: o nome da magia (e a cura) sobre o personagem, sem golpe.
    if (spell && spell.effect.kind !== 'strike') {
      emitCast(spell.id);
      sfx('spell');
      const c = { x: this.player.px, y: this.player.py };
      this.fx.cast(spell.id, c, c, now);
      this.floaters.push({ text: spell.name, color: '#9fd8ff', x: c.x, y: c.y - 122, t0: now, size: 18 });
      if (h.heal) this.floaters.push({ text: `+${h.heal}`, color: '#7dff8a', x: c.x, y: c.y - 70, t0: now + 120, size: 24 });
      return;
    }
    // Cura de dreno de magia de golpe: mostra apenas o número verde sobre o personagem.
    if (h.heal && h.dmg === 0) {
      const c = { x: this.player.px, y: this.player.py };
      this.floaters.push({ text: `+${h.heal}`, color: '#7dff8a', x: c.x, y: c.y - 70, t0: now, size: 22 });
      return;
    }
    if (spell) emitCast(spell.id);
    const targetIdx = h.target ?? 0;
    const targetM = this.monsters[targetIdx] ?? this.monsters[0];
    sfx(spell ? 'spell' : h.by === 'm' ? 'hurt' : h.crit ? 'crit' : 'hit');
    if (spell && targetM) {
      const m = center(targetM.tile);
      this.fx.cast(spell.id, { x: this.player.px, y: this.player.py }, m, now);
      this.floaters.push({ text: spell.name, color: '#ffb35a', x: m.x, y: m.y - 92, t0: now, size: 18 });
    }
    // Monstro de longe: o golpe sai como projétil dele até o personagem (sem avançar).
    // Diabrete Doceiro (Dia das Crianças): joga donuts.
    const donut = h.by === 'm' && targetM?.id === KIDS_EVENT_MOB;
    if (donut) this.iconShots.push({ src: '/assets/icons/kids_candy.png', from: center(targetM.tile), to: { x: this.player.px, y: this.player.py - 20 }, t0: now });
    const shot = !donut && h.by === 'm' && targetM && !targetM.big ? MONSTER_SHOT[targetM.sprite] : undefined;
    if (shot) this.fx.shoot(shot.fx, center(targetM.tile), { x: this.player.px, y: this.player.py - 20 }, now, shot.scale);
    const ranged = (h.by === 'p' && RANGED.has(this.vocation)) || !!shot || donut;
    // De longe não avança: atira (flecha, orbe mágico ou esfera de luz sagrada) até o alvo.
    if (h.by === 'p' && ranged && !spell && targetM) {
      const fxType = this.vocation === 'hunter' ? 'dagger' : 'orb';
      const fxScale = this.vocation === 'hunter' ? 0.7 : 0.45;
      this.fx.shoot(fxType, { x: this.player.px, y: this.player.py }, center(targetM.tile), now, fxScale);
    }
    this.lunge = ranged ? null : { by: h.by, target: targetIdx, t0: now };
    this.flash = { on: h.by === 'p' ? 'm' : 'p', target: targetIdx, t0: now };
    const targetTile = h.by === 'p' ? (targetM ? targetM.tile : this.player.tile) : this.player.tile;
    const c = center(targetTile);
    this.pushDamage(h, c, h.by === 'p' ? (h.crit ? '#ffcf3a' : '#ffffff') : '#ff5a4a', now);
    if (h.by === 'p' && h.lifesteal) {
      const me = { x: this.player.px, y: this.player.py };
      this.floaters.push({
        text: `+${h.lifesteal}`,
        color: '#ff4d6d',
        x: me.x + (this.rand() - 0.5) * 14,
        y: me.y - 75,
        t0: now + 80,
        size: 20,
      });
    }
  }

  /** Runa: efeito no alvo (ou cura no personagem), sem avançar; o nome só no primeiro golpe da área. */
  private showRune(h: CycleView['hits'][number], now: number) {
    this.applyHitHp(h);
    const rune = itemById(h.rune!);
    const me = { x: this.player.px, y: this.player.py };
    if (h.heal !== undefined && h.dmg === 0) {
      sfx('spell');
      this.fx.cast('rune_heal', me, me, now);
      this.floaters.push({ text: rune?.name ?? '', color: '#9fd8ff', x: me.x, y: me.y - 122, t0: now, size: 18 });
      this.floaters.push({ text: `+${h.heal}`, color: '#7dff8a', x: me.x, y: me.y - 70, t0: now + 120, size: 24 });
      return;
    }
    const targetM = this.monsters[h.target ?? 0] ?? this.monsters[0];
    if (!targetM) return;
    const c = center(targetM.tile);
    this.fx.cast(h.rune!, me, c, now);
    this.flash = { on: 'm', target: h.target ?? 0, t0: now };
    if (!h.runeExtra) {
      sfx('spell');
      this.floaters.push({ text: rune?.name ?? '', color: '#c9a6ff', x: c.x, y: c.y - 118, t0: now, size: 18 });
    }
    this.pushDamage(h, c, '#d9c2ff', now);
  }

  /**
   * Número do dano sobre o alvo. Com elemento, a parte física sai na cor normal e
   * a elemental ao lado, na cor do elemento (maior se o alvo é fraco a ele).
   */
  private pushDamage(h: CycleView['hits'][number], c: { x: number; y: number }, color: string, now: number) {
    const x = c.x + (this.rand() - 0.5) * 16;
    const phys = h.elem ? h.dmg - h.elem.dmg : h.dmg;
    if (phys > 0 || !h.elem) this.floaters.push({ text: h.crit ? `${phys}!` : String(phys), color, x: h.elem ? x - 18 : x, y: c.y - 60, t0: now, size: h.crit ? 28 : 22 });
    if (!h.elem) return;
    const el = ELEMENTS[h.elem.element];
    const target = this.monsters[h.target ?? 0];
    const weak = !!target && !!monsterById(target.id ?? '')?.weak?.includes(h.elem.element);
    this.floaters.push({ text: `${h.elem.dmg}`, color: el.color, x: phys > 0 ? x + 22 : x, y: c.y - (phys > 0 ? 48 : 60), t0: now + 60, size: weak ? 26 : 20 });
  }

  private applyHitHp(h: CycleView['hits'][number]) {
    const targetIdx = h.target ?? 0;
    const m = this.monsters[targetIdx];
    if ((h.by === 'p' || h.by === 'a') && m) {
      m.hp = Math.max(0, m.hp - h.dmg);
      // Covil em grupo: o chefe só cai na hora em que cai para todos (fim da luta).
      if (m.hp === 0 && this.groupKillAt !== null && h.t < this.groupKillAt) m.hp = 1;
      if (m.hp === 0 && m.diedAt === null) {
        m.diedAt = performance.now();
      }
    }
    if (h.by === 'm') this.playerHp = Math.max(0, this.playerHp - h.dmg);
    if (h.heal) this.playerHp = Math.min(this.playerMaxHp, this.playerHp + h.heal);
    if (h.by === 'p' && h.lifesteal) this.playerHp = Math.min(this.playerMaxHp, this.playerHp + h.lifesteal);
  }

  private teleport(t: Pt) {
    const c = center(t);
    this.player.tile = { ...t };
    this.player.px = c.x;
    this.player.py = c.y;
    this.player.path = [];
  }

  private walk(path: Pt[], now: number) {
    const p = this.player;
    // No meio de um passo para o mesmo tile: continua o passo (senão volta para trás).
    const midStep = p.path.length > 0 && path.length > 0 && p.path[0].x === path[0].x && p.path[0].y === path[0].y;
    p.path = path.slice();
    if (!midStep) p.stepStart = now;
    if (this.mode === 'city' && path.length) this.sendCityPos(path[path.length - 1]);
  }

  /** Manda o destino na cidade (só quando muda). */
  private sendCityPos(to: Pt, force = false) {
    const key = `${to.x},${to.y}`;
    if (key === this.lastCitySent && !force) return;
    this.lastCitySent = key;
    this.lastCitySentAt = performance.now();
    this.onCityMove?.(to);
  }

  /** Na cidade: manda onde está ao chegar e repete de tempos em tempos (servidor reiniciado, quem acabou de entrar). */
  private keepCityPos(now: number) {
    if (this.mode !== 'city' || !this.onCityMove) return;
    if (this.lastCitySent && now - this.lastCitySentAt < CITY_RESEND_MS) return;
    const p = this.player;
    this.sendCityPos(p.path.length ? p.path[p.path.length - 1] : p.tile, true);
  }

  private wander(now: number) {
    this.nextWander = now + 1500 + this.rand() * 2500;
    const from = this.player.tile;
    // Na cidade passeia pelas ruas em volta da praça; nos outros mapas, perto de onde está.
    const home = this.mode === 'city' ? this.cityMap.start : from;
    const rx = this.mode === 'city' ? 24 : 6;
    const ry = this.mode === 'city' ? 18 : 4;
    for (let i = 0; i < 10; i++) {
      const to = { x: home.x + Math.round((this.rand() - 0.5) * rx), y: home.y + Math.round((this.rand() - 0.5) * ry) };
      if (!walkable(this.map, to.x, to.y)) continue;
      const route = findPath(this.map, from, (x, y) => x === to.x && y === to.y, this.mode === 'city' ? 30 : 6);
      if (route && route.length) return this.walk(route, now);
    }
  }

  /** Moradores: cada um anda até um ponto perto, para um pouco e escolhe outro. */
  private updateCitizens(now: number) {
    const map = this.cityMap;
    if (this.citizens.length === 0) {
      for (const sprite of CITIZENS) {
        for (let i = 0; i < 40; i++) {
          const t = { x: 2 + Math.floor(this.rand() * (map.w - 4)), y: 2 + Math.floor(this.rand() * (map.h - 4)) };
          if (!walkable(map, t.x, t.y)) continue;
          const c = center(t);
          for (const d of ['up', 'down', 'left', 'right']) for (const f of ['stand', 'walk1', 'walk2']) image(`/assets/npcs/${sprite}/${d}_${f}.png`);
          this.citizens.push({ px: c.x, py: c.y, tile: t, path: [], stepStart: now, dir: 'down', sprite, nextAt: now + this.rand() * 4000 });
          break;
        }
      }
    }
    for (const m of this.citizens) {
      this.stepMover(m, now);
      if (m.path.length || now < m.nextAt) continue;
      m.nextAt = now + 2000 + this.rand() * 5000;
      for (let i = 0; i < 6; i++) {
        const to = { x: m.tile.x + Math.round((this.rand() - 0.5) * 16), y: m.tile.y + Math.round((this.rand() - 0.5) * 12) };
        if (!walkable(map, to.x, to.y)) continue;
        const route = findPath(map, m.tile, (x, y) => x === to.x && y === to.y, 20);
        if (route && route.length) {
          m.path = route;
          m.stepStart = now;
          break;
        }
      }
    }
  }

  private stepMover(m: Mover, now: number) {
    while (m.path.length) {
      const next = m.path[0];
      m.dir = dirTo(m.tile, next);
      const ms = m.speed ?? WALK_MS_PER_TILE;
      const k = (now - m.stepStart) / ms;
      const a = center(m.tile);
      const b = center(next);
      if (k < 1) {
        m.px = a.x + (b.x - a.x) * k;
        m.py = a.y + (b.y - a.y) * k;
        return;
      }
      m.tile = next;
      m.path.shift();
      m.stepStart += ms;
      m.px = b.x;
      m.py = b.y;
    }
    // Parado perto de um monstro vivo: olha para ele.
    const targetM = this.monsters.find((x) => x.diedAt === null) ?? this.monsters[0];
    if (targetM && targetM.diedAt === null && m === this.player) m.dir = dirTo(m.tile, targetM.tile);
  }

  // ── Desenho ────────────────────────────────────────────────────────────────

  /** Tamanho do mapa atual, em tiles (a tela não mostra mais que isso). */
  get mapSize() {
    return { w: this.map.w, h: this.map.h };
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    // A câmera segue o personagem (na cidade ele passeia pelas ruas).
    // Na arena a câmera fica entre o personagem e o chefe (o chefe é grande).
    const bossC = center(ARENA_BOSS);
    const focus =
      this.mode === 'boss'
        ? { x: (this.player.px + bossC.x) / 2, y: (this.player.py + bossC.y) / 2 - TILE }
        : { x: this.player.px, y: this.player.py };
    // Tela maior que o mapa (afastou num mapa pequeno): o mapa fica no meio e o chão continua em volta.
    const camAxis = (f: number, view: number, size: number) => (view >= size ? (size - view) / 2 : Math.min(Math.max(0, f - view / 2), size - view));
    const cam = {
      x: Math.round(camAxis(focus.x, W, this.map.w * TILE)),
      y: Math.round(camAxis(focus.y, H, this.map.h * TILE)),
      w: W,
      h: H,
    };
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2d4a22';
    ctx.fillRect(0, 0, W, H);
    drawGround(ctx, this.map, cam, now);

    // Tudo que tem "pé" é desenhado de cima para baixo: objetos, monstro e personagem.
    // Só o que aparece na tela (os mapas de caçada têm centenas de objetos).
    // Cada objeto conta pelo próprio tamanho (o templo e a pousada têm 13 tiles de altura).
    const tx0 = cam.x / TILE - 8;
    const tx1 = (cam.x + W) / TILE + 1;
    const ty0 = cam.y / TILE - 8;
    const ty1 = (cam.y + H) / TILE + 1;
    const drawables: { y: number; draw: () => void }[] = this.map.objects
      .filter((o) => o.x + OBJECTS[o.kind].w >= cam.x / TILE - 1 && o.x <= tx1 && o.y + OBJECTS[o.kind].h >= cam.y / TILE - 1 && o.y <= ty1)
      .map((o) => ({
        y: objectBaseY(o),
        draw: () => drawObject(ctx, o, cam),
      }));
    for (const npc of this.map.npcs ?? []) {
      const c = center(npc);
      drawables.push({ y: c.y, draw: () => this.drawNpc(ctx, npc, c, cam) });
    }
    if (this.mode === 'city') {
      for (const m of this.citizens) {
        if (m.tile.x < tx0 || m.tile.x > tx1 + 2 || m.tile.y < ty0 || m.tile.y > ty1 + 3) continue;
        drawables.push({ y: m.py, draw: () => this.drawCitizen(ctx, m, now, cam) });
      }
    }
    this.lastCam = cam;
    const portal = this.map.portal;
    if (portal) drawables.push({ y: (portal.y + 1) * TILE - 1, draw: () => drawPortal(ctx, portal, cam, now) });
    for (let i = 0; i < this.monsters.length; i++) {
      const m = this.monsters[i];
      if (m.appearAt !== undefined && now < m.appearAt) continue;
      const c = this.fightPos(m, now);
      drawables.push({ y: c.y, draw: () => this.drawMonster(ctx, now, cam, m, i, c) });
    }
    for (const m of this.idle) {
      if (m.tile.x < tx0 || m.tile.x > tx1 + 2 || m.tile.y < ty0 || m.tile.y > ty1 + 3) continue;
      const c = BLINK_SPRITES.has(m.sprite) ? center(m.tile) : { x: m.px, y: m.py };
      const dx = m.dir === 'right' ? 1 : m.dir === 'left' ? -1 : 0;
      // Andando para cima ou para baixo: usa a sprite de costas ou de frente.
      const vdir = m.path.length && (m.dir === 'up' || m.dir === 'down') ? m.dir : 'side';
      drawables.push({ y: c.y, draw: () => this.drawIdle(ctx, now, cam, m, c, dx, vdir) });
    }
    if (this.mode === 'boss' && this.boss) {
      const boss = this.boss;
      const c = center(ARENA_BOSS);
      drawables.push({ y: c.y, draw: () => this.drawWorldBoss(ctx, now, cam, boss, c) });
      // Servos do chefe especial: longe, atrás dele, jogando bolas de fogo (como os acorrentados da Aniquilação).
      if (boss.minions && boss.active && boss.hp > 0) {
        const spots = BOSS_MINION_SPOTS;
        for (let i = 0; i < Math.min(boss.minions.count, spots.length); i++) {
          const mc = center({ x: ARENA_BOSS.x + spots[i].x, y: ARENA_BOSS.y + spots[i].y });
          drawables.push({ y: mc.y, draw: () => this.drawBossMinion(ctx, now, cam, boss.minions!, mc, i) });
          // Cada um no seu ritmo: bola de fogo num lutador (ou no personagem) a cada ~3s.
          // Defasados: o primeiro sai logo, os outros a cada 0,75s.
          if (this.minionCast[i] === undefined) this.minionCast[i] = now - 3000 + i * 750;
          if (now - this.minionCast[i] >= 3000) {
            this.minionCast[i] = now;
            const targets = boss.fighters.flatMap((f, k) => (f.name === this.name ? [] : [center(ARENA_SLOTS[k % ARENA_SLOTS.length])]));
            if (targets.length) this.fx.cast(boss.minions!.shot ?? 'fireball', { x: mc.x, y: mc.y - 20 }, targets[Math.floor(this.rand() * targets.length)], now);
          }
        }
      }
      boss.fighters.forEach((f, i) => {
        if (f.name === this.name) return;
        const t = center(ARENA_SLOTS[i % ARENA_SLOTS.length]);
        drawables.push({ y: t.y, draw: () => this.drawFighter(ctx, now, cam, f, t, i) });
      });
    }
    for (const p of this.others) {
      const m = this.otherMovers.get(p.id);
      if (m) drawables.push({ y: m.py, draw: () => this.drawOther(ctx, now, cam, p, m) });
      if (m && p.activePet) drawables.push({ y: petDepth(m), draw: () => this.drawPet(ctx, now, cam, p.activePet!, m) });
    }
    // Acorrentados nas ilhas da Aniquilação (não dá para alcançar nem atacar).
    for (const t of this.map.casters ?? []) {
      const c = center(t);
      drawables.push({ y: c.y, draw: () => this.drawCaster(ctx, now, cam, t, c) });
    }
    // Marca do destino do clique (some ao chegar).
    if (this.clickMark && this.mode === 'city') {
      const m = this.clickMark;
      const arrived = this.player.path.length === 0;
      if (arrived) this.clickMark = null;
      else {
        const c = center(m.tile);
        const pulse = 1 + 0.15 * Math.sin((now - m.t0) / 120);
        ctx.save();
        ctx.strokeStyle = 'rgba(242, 193, 78, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(c.x - cam.x, c.y - cam.y + 10, 14 * pulse, 7 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    drawables.push({ y: this.player.py, draw: () => this.drawPlayer(ctx, now, cam) });
    // Mascote ativo acompanhando o jogador: atrás dele, menos quando ele olha para cima (aí o mascote fica embaixo).
    if (this.activePet && this.deadAt === null) {
      const pet = this.activePet;
      drawables.push({ y: petDepth(this.player), draw: () => this.drawPet(ctx, now, cam, pet, this.player) });
    }
    drawables.sort((a, b) => a.y - b.y);
    this.labels = [];
    for (const d of drawables) d.draw();
    this.drawLabels(ctx);
    this.fx.draw(ctx, cam, now);
    this.iconShots = this.iconShots.filter((p) => now - p.t0 < 420);
    for (const p of this.iconShots) {
      const img = image(p.src);
      if (!loaded(img)) continue;
      const k = (now - p.t0) / 420;
      const x = p.from.x + (p.to.x - p.from.x) * k - cam.x;
      const y = p.from.y + (p.to.y - p.from.y) * k - cam.y - 40 - Math.sin(k * Math.PI) * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(k * Math.PI * 4);
      ctx.drawImage(img, -12, -12, 24, 24);
      ctx.restore();
    }

    for (const f of this.floaters) {
      const k = (now - f.t0) / FLOAT_MS;
      if (k < 0) continue;
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      const x = f.x - cam.x;
      const y = f.y - cam.y - k * 34;
      if (f.icon) {
        const icon = image(f.icon);
        if (loaded(icon)) ctx.drawImage(icon, x - 70, y - 22, 28, 28);
      }
      outlinedText(ctx, f.text, x, y, f.color, f.size);
      ctx.globalAlpha = 1;
    }

    if (this.map.pit && this.pitBanner) outlinedText(ctx, this.pitBanner.text, W / 2, 40, this.pitBanner.color, 20);
    else if (this.mode === 'hunt') this.drawMinimap(ctx, W);
    if (this.inst && this.mode === 'hunt') this.drawInstanceHud(ctx, W, now);
  }

  /** Instância: barra da limpeza (abates) ou "Chefe" no alto, e o aviso quando o chefe aparece. */
  private drawInstanceHud(ctx: CanvasRenderingContext2D, W: number, now: number) {
    const { hunt, seq, pack } = this.inst!;
    const waves = instanceWaves(hunt, pack);
    const total = waves.reduce((a, b) => a + b, 0);
    const done = waves.slice(0, Math.min(seq, waves.length)).reduce((a, b) => a + b, 0);
    const bossPhase = seq >= waves.length;
    const bw = 260;
    const x = Math.round(W / 2 - bw / 2);
    const y = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, bw + 4, 18);
    ctx.fillStyle = bossPhase ? '#c0392b' : '#d8a83a';
    ctx.fillRect(x, y, bossPhase ? bw : Math.round((bw * done) / Math.max(1, total)), 14);
    const label = bossPhase
      ? `${tr('Chefe', 'Boss')} ${Math.min(hunt.monsters.length, seq - waves.length + 1)}/${hunt.monsters.length}`
      : `${tr('Limpeza', 'Clearing')} ${done}/${total}`;
    outlinedText(ctx, label, W / 2, y + 12, '#ffffff', 13);
    const a = this.bossAlert;
    if (a && now - a.t0 < 2600) {
      const k = (now - a.t0) / 2600;
      ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
      const s = 1 + 0.15 * Math.max(0, 1 - k * 4);
      outlinedText(ctx, tr('O CHEFE CHEGOU!', 'THE BOSS IS HERE!'), W / 2, 92, '#ff5a3a', Math.round(30 * s));
      outlinedText(ctx, kidName(a.name), W / 2, 122, '#ffd36a', 20);
      ctx.globalAlpha = 1;
    }
  }

  /** Arena: fora da luta, volta ao meio e olha para o portão. */
  private pitHome(now: number) {
    const pit = this.map.pit!;
    if (this.player.path.length > 0) return;
    const p = this.player.tile;
    if (p.x !== pit.spot.x || p.y !== pit.spot.y) {
      const back = findPath(this.map, p, (x, y) => x === pit.spot.x && y === pit.spot.y, 40);
      if (back?.length) return this.walk(back, now);
      this.teleport(pit.spot);
    }
    this.player.dir = 'right';
  }

  /**
   * Arena: o aviso no alto (onda e desafiante, ou a contagem do descanso) e, no
   * fim do descanso, o próximo desafiante já vem andando do portão.
   */
  private updatePit(now: number, activity: Activity, cycle: CycleView, t: number) {
    const arena = parseArenaNode(activity.node);
    if (!arena) return;
    const total = arena.opponents.length;
    const wave = Math.min(activity.seq, total - 1);
    const name = arena.opponents[wave]?.name ?? cycle.monsterName ?? '';
    if (t < cycle.fightMs) {
      this.pitBanner = { text: `${tr('Onda', 'Wave')} ${wave + 1}/${total} · ${name}`, color: '#ffd36a' };
      return;
    }
    if (cycle.outcome === 'death') {
      this.pitBanner = { text: tr('Derrotado na arena!', 'Defeated in the arena!'), color: '#ff7a6a' };
      return;
    }
    if (cycle.outcome !== 'win') return;
    if (wave + 1 >= total) {
      // Provação de quest (Caçador de Demônios, Matador de Dragões...) não dá arma: o prêmio é com o NPC.
      this.pitBanner = arena.trial
        ? { text: tr('Vitória! Volte e fale com o NPC da quest', 'Victory! Go back and talk to the quest NPC'), color: '#7dff8a' }
        : { text: tr('Vitória! Escolha sua arma lendária', 'Victory! Choose your legendary weapon'), color: '#7dff8a' };
      return;
    }
    const left = cycle.fightMs + cycle.restMs - t;
    this.pitBanner = { text: `${tr('Próximo desafiante em', 'Next challenger in')} ${Math.max(0, Math.ceil(left / 1000))}s`, color: '#ffffff' };
    // Entra andando a tempo de chegar quando o descanso acaba.
    const pit = this.map.pit!;
    const next = arena.opponents[wave + 1];
    if (this.pitEntered === activity.seq + 1 || !next) return;
    const goal = { x: pit.spot.x + this.reach(), y: pit.spot.y };
    const path = findPath(this.map, pit.gate, (x, y) => x === goal.x && y === goal.y, 60);
    if (!path?.length || left > (path.length + 1) * CHASE_MS_PER_TILE) return;
    this.pitEntered = activity.seq + 1;
    this.monsters.push({
      run: { path: [pit.gate, ...path], t0: now },
      tile: goal,
      sprite: next.sprite,
      name: next.name,
      hp: next.hp,
      maxHp: next.hp,
      diedAt: null,
      entering: true,
      big: next === arena.opponents[arena.opponents.length - 1],
    });
  }

  private drawNpc(ctx: CanvasRenderingContext2D, npc: Npc, c: Pt, cam: { x: number; y: number }) {
    if (npc.id === 'kids_shop' && !isKidsShopOpen(Date.now())) return;
    const sprite = image(`/assets/npcs/${npc.sprite}/${npc.face ?? 'down'}_stand.png`);
    if (!loaded(sprite)) return;
    const w = sprite.naturalWidth * (npc.scale ?? 3);
    const h = sprite.naturalHeight * (npc.scale ?? 3);
    const x = Math.round(c.x - cam.x);
    const y = Math.round(c.y - cam.y);
    const isFlashing = npc.id === 'dummy' && this.flashing('m', performance.now());
    if (isFlashing) ctx.filter = 'brightness(2.2)';
    ctx.drawImage(sprite, x - w / 2, y - h + 6, w, h);
    if (isFlashing) ctx.filter = 'none';
    // Loja/depósito/mercado em amarelo; quem só conversa em azul-claro.
    const displayName = t(`npc_name.${npc.id}`, t(`npc_name.${npc.name.toLowerCase()}`, npc.name));
    if (npc.id === 'kids_shop') {
      // NPC de evento: nome em rosa e o nome do evento em destaque, balançando.
      const bob = Math.round(Math.sin(performance.now() / 300) * 2);
      outlinedText(ctx, displayName, x, y - h - 2, '#ff8ad0', 20);
      outlinedText(ctx, tr('★ Dia das Crianças ★', "★ Children's Day ★"), x, y - h - 26 + bob, '#ffe066', 22);
      return;
    }
    if (npc.id === 'halloween_shop') {
      // Jack (Halloween): nome em laranja-abóbora e o nome do evento em destaque, balançando.
      const bob = Math.round(Math.sin(performance.now() / 300) * 2);
      outlinedText(ctx, displayName, x, y - h - 2, '#ff9a2e', 20);
      outlinedText(ctx, tr('★ Halloween ★', '★ Halloween ★'), x, y - h - 26 + bob, '#c58bff', 22);
      return;
    }
    if (npc.id === 'refinery') {
      // Vulcanus: nome em brasa e o convite flutuando por cima (os jogadores não achavam a Forja).
      const k = (Math.sin(performance.now() / 320) + 1) / 2;
      const bob = Math.round(Math.sin(performance.now() / 420) * 3);
      ctx.save();
      ctx.shadowColor = '#ff8a2a';
      ctx.shadowBlur = 8 + 12 * k;
      outlinedText(ctx, `⚒ ${displayName} ⚒`, x, y - h - 2, k > 0.5 ? '#ffe2b0' : '#ffab4a', 20);
      outlinedText(ctx, tr('Refine e Ascenda seus itens', 'Refine and Ascend your gear'), x, y - h - 26 + bob, '#ffd75e', 17);
      ctx.restore();
      return;
    }
    if (npc.id === 'guide') {
      // Guia: nome brilhando (pulsa entre dourado e branco, com halo).
      const k = (Math.sin(performance.now() / 350) + 1) / 2;
      ctx.save();
      ctx.shadowColor = '#ffe680';
      ctx.shadowBlur = 8 + 10 * k;
      outlinedText(ctx, `✦ ${displayName} ✦`, x, y - h - 2, k > 0.5 ? '#fff6c8' : '#ffd75e', 20);
      ctx.restore();
      return;
    }
    outlinedText(ctx, displayName, x, y - h - 2, npc.id === 'talk' ? '#9fd8ff' : '#ffd75e', 18);
    if (this.questMarks.includes(npc.name)) {
      const bob = Math.round(Math.sin(performance.now() / 200) * 3);
      outlinedText(ctx, '!', x, y - h - 24 + bob, '#ffd23e', 30);
    }
  }

  private drawCitizen(ctx: CanvasRenderingContext2D, m: Mover & { sprite: string; lastImg?: HTMLImageElement }, now: number, cam: { x: number; y: number }) {
    const frame = m.path.length ? ['stand', 'walk1', 'stand', 'walk2'][Math.floor(now / 150) % 4] : 'stand';
    // Quadro que ainda não carregou: mostra o último desenhado (senão o morador pisca ao virar).
    let sprite = image(`/assets/npcs/${m.sprite}/${m.dir}_${frame}.png`);
    if (loaded(sprite)) m.lastImg = sprite;
    else if (m.lastImg) sprite = m.lastImg;
    else return;
    const w = sprite.naturalWidth * 3;
    const h = sprite.naturalHeight * 3;
    ctx.drawImage(sprite, Math.round(m.px - cam.x - w / 2), Math.round(m.py - cam.y - h + 6), w, h);
  }

  /** NPC sob o ponto clicado (em pixels do canvas), ou null. Só na cidade. */
  /** Destino do clique na cidade (marca no chão até chegar). */
  private clickMark: { tile: Pt; t0: number } | null = null;

  /**
   * Clicou no chão da cidade: anda até lá (ou até o tile livre mais perto).
   * Só na cidade; caçada e profissão são o servidor que move o personagem.
   */
  /** XP de combate que entrou de verdade (com party, shared XP, stamina, refeição e prey): sobe na cabeça. */
  showXp(amount: number, now: number) {
    if (this.mode !== 'hunt' || amount <= 0) return;
    this.floaters.push({ text: `+${amount} XP`, color: '#fff7a8', x: this.player.px, y: this.player.py - 120, t0: now, size: 24 });
  }

  walkTo(px: number, py: number, now: number) {
    if (this.mode !== 'city' || !this.lastCam) return;
    const tx = Math.floor((px + this.lastCam.x) / TILE);
    const ty = Math.floor((py + this.lastCam.y) / TILE);
    // Clicou numa parede/árvore: vai para o tile livre mais perto do clique.
    let goal: Pt | null = walkable(this.map, tx, ty) ? { x: tx, y: ty } : null;
    for (let r = 1; !goal && r <= 3; r++) {
      for (let dy = -r; dy <= r && !goal; dy++) {
        for (let dx = -r; dx <= r && !goal; dx++) if (walkable(this.map, tx + dx, ty + dy)) goal = { x: tx + dx, y: ty + dy };
      }
    }
    if (!goal) return;
    const g = goal;
    const route = findPath(this.map, this.player.tile, (x, y) => x === g.x && y === g.y, 80);
    if (!route) return;
    this.walk(route, now);
    this.clickMark = { tile: g, t0: now };
  }

  /** Clicou num NPC na cidade: anda até a frente dele (como no Tibia). */
  walkToNpc(npc: Npc, now: number) {
    if (this.mode !== 'city') return;
    const route = findPath(this.map, this.player.tile, (x, y) => Math.abs(x - npc.x) + Math.abs(y - npc.y) === 1, 60);
    if (route?.length) this.walk(route, now);
  }

  npcAt(px: number, py: number): Npc | null {
    if ((this.mode !== 'city' && !this.map.limbo) || !this.lastCam) return null;
    const wx = px + this.lastCam.x;
    const wy = py + this.lastCam.y;
    for (const npc of this.map.npcs ?? []) {
      if (npc.id === 'kids_shop' && !isKidsShopOpen(Date.now())) continue;
      const c = center(npc);
      if (Math.abs(wx - c.x) <= 36 && wy <= c.y + 16 && wy >= c.y - 120) return npc;
    }
    return null;
  }

  /** Ferramenta da profissão (o ícone da skill) balançando na mão, no ritmo das ações. */
  private drawTool(ctx: CanvasRenderingContext2D, now: number, x: number, y: number, dir: Dir = this.player.dir, offset = 0) {
    const tool = image(`/assets/icons/skill_${this.work!.skill}.png`);
    if (!loaded(tool)) return;
    const phase = (((now - this.work!.startedAt + offset) % this.work!.interval) + this.work!.interval) % this.work!.interval;
    const k = phase / this.work!.interval;
    // Levanta devagar e desce rápido no fim de cada ação.
    const swing = k < 0.75 ? -0.9 * (k / 0.75) : -0.9 + 1.5 * ((k - 0.75) / 0.25);
    const side = dir === 'left' ? -1 : 1;
    const hx = x + (dir === 'up' ? 10 : dir === 'down' ? -14 : side * 18);
    const hy = y - 40;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(side, 1);
    ctx.rotate(swing);
    ctx.drawImage(tool, -8, -40, 40, 40);
    ctx.restore();
  }

  /** Minimapa no canto: o mapa inteiro, a rota e onde o personagem está. */
  private drawMinimap(ctx: CanvasRenderingContext2D, W: number) {
    const map = this.map;
    let mini = this.minimaps.get(map);
    if (!mini) {
      mini = document.createElement('canvas');
      mini.width = map.w;
      mini.height = map.h;
      const m = mini.getContext('2d')!;
      const img = m.createImageData(map.w, map.h);
      const defaultColors: Record<number, [number, number, number]> = {
        [Ground.Grass]: [74, 128, 52],
        [Ground.Water]: [52, 98, 168],
        [Ground.Path]: [176, 138, 88],
        [Ground.Stone]: [128, 128, 132],
      };
      const colors: Record<number, [number, number, number]> = { ...defaultColors };
      if (map.theme?.minimap?.ground) {
        Object.assign(colors, map.theme.minimap.ground);
      }
      const blockedColor = map.theme?.minimap?.blocked ?? [38, 72, 32];
      for (let i = 0; i < map.w * map.h; i++) {
        const [r, g, b] =
          map.blocked[i] && map.ground[i] !== Ground.Water ? blockedColor : colors[map.ground[i]] ?? [74, 128, 52];
        img.data.set([r, g, b, 255], i * 4);
      }
      m.putImageData(img, 0, 0);
      m.fillStyle = 'rgba(255, 236, 140, 0.9)';
      map.route.forEach((p, i) => {
        if (i % 3 === 0) m.fillRect(p.x, p.y, 1, 1);
      });
      this.minimaps.set(map, mini);
    }
    const scale = 2;
    const w = map.w * scale;
    const h = map.h * scale;
    const x = W - w - 8;
    const y = 8;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#1a120a';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.drawImage(mini, x, y, w, h);
    ctx.globalAlpha = 1;
    const px = x + (this.player.px / TILE) * scale;
    const py = y + (this.player.py / TILE) * scale;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5);
    ctx.fillStyle = '#e0412f';
    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
  }

  private lungeOffset(by: 'p' | 'm', from: Pt, to: Pt, now: number, targetIdx?: number) {
    if (!this.lunge || this.lunge.by !== by) return { x: 0, y: 0 };
    if (by === 'm' && targetIdx !== undefined && this.lunge.target !== targetIdx) return { x: 0, y: 0 };
    const k = (now - this.lunge.t0) / LUNGE_MS;
    if (k > 1) return { x: 0, y: 0 };
    const s = Math.sin(k * Math.PI) * 10;
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    return { x: dx * s, y: dy * s };
  }

  private flashing(on: 'p' | 'm', now: number, targetIdx?: number) {
    if (!this.flash || this.flash.on !== on || now - this.flash.t0 >= FLASH_MS) return false;
    if (on === 'm' && targetIdx !== undefined && this.flash.target !== targetIdx) return false;
    return true;
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, now: number, cam: { x: number; y: number }) {
    const p = this.player;
    const walking = p.path.length > 0;
    const frame = walking ? ['stand', 'walk1', 'stand', 'walk2'][Math.floor(now / 130) % 4] : 'stand';
    const sheet = lookSheet(this.vocation, this.look, this.equipment);
    const targetIdx = this.lunge?.by === 'p' ? (this.lunge.target ?? 0) : 0;
    const targetM = this.monsters[targetIdx] ?? this.monsters[0];
    const off = targetM ? this.lungeOffset('p', p.tile, targetM.tile, now) : { x: 0, y: 0 };
    const x = Math.round(p.px - cam.x + off.x);
    const y = Math.round(p.py - cam.y + off.y);

    if (this.deadAt !== null) ctx.globalAlpha = Math.max(0, 1 - (now - this.deadAt) / 800);
    else if (this.mode === 'boss' && this.downLeft(this.boss?.fighters.find((f) => f.name === this.name)) > 0) ctx.globalAlpha = 0.45;
    if (sheet) {
      const h = FRAME_H * 3;
      if (this.flashing('p', now)) ctx.filter = 'brightness(1.8) sepia(1) hue-rotate(-50deg) saturate(5)';
      drawLook(ctx, sheet, p.dir, frame as Frame, x, y + 6, 3);
      ctx.filter = 'none';
      this.drawBar(ctx, x, y - h - 4, this.playerHp / this.playerMaxHp, '#3fd14a');
      // Mana embaixo da vida (na caçada): mesma conta da luta, magias gastam e a poção enche.
      const mana = this.manaFrac();
      if (mana !== null) this.drawBar(ctx, x, y - h + 2, mana, '#4aa3ff');
      // Caído no chefe global: mostra quanto falta para voltar.
      if (this.mode === 'boss') {
        const mine = this.boss?.fighters.find((f) => f.name === this.name);
        const left = this.downLeft(mine);
        if (left > 0) outlinedText(ctx, `${tr('Caído', 'Down')} ${Math.ceil(left / 1000)}s`, x, y - h - 40, '#ff8a6a', 16);
      }
      if (this.mode === 'work' && this.work && p.path.length === 0) this.drawTool(ctx, now, x, y);
      this.label(this.name, x, y - h - 10, '#7dff8a', 18, 4);
    }
    ctx.globalAlpha = 1;

  }

  /** Desenha o mascote equipado seguindo logo ao lado/atrás do jogador */
  private drawPet(ctx: CanvasRenderingContext2D, now: number, cam: { x: number; y: number }, petId: string, p: Mover) {
    const petImg = image(`/assets/pets/${petId}.png`);
    if (!loaded(petImg)) return;

    // O pet fica ligeiramente recuado dependendo da direção do jogador
    let petOffX = -26;
    let petOffY = 6;
    if (p.dir === 'right') {
      petOffX = -30;
      petOffY = 4;
    } else if (p.dir === 'left') {
      petOffX = 30;
      petOffY = 4;
    } else if (p.dir === 'up') {
      petOffX = -24;
      petOffY = 16;
    } else if (p.dir === 'down') {
      petOffX = -24;
      petOffY = -14;
    }

    // Leve flutuação mágica
    const floatY = Math.sin(now / 220) * 2;

    // Folha de 3 colunas x 4 linhas, quadros quadrados no tamanho original do pack.
    const row = p.dir === 'down' ? 0 : p.dir === 'left' ? 1 : p.dir === 'right' ? 2 : 3;
    const walking = p.path.length > 0;
    const col = walking ? Math.floor(now / 150) % 3 : (Math.floor(now / 350) % 3);

    const cellW = petImg.naturalWidth / 3;
    const cellH = petImg.naturalHeight / 4;
    const scale = PET_SCALE[petId] ?? 1.6;
    const dw = cellW * scale;
    const dh = cellH * scale;

    // Pet maior fica um pouco mais longe para não encostar no personagem.
    const spread = Math.max(1, dw / 40);
    const petX = Math.round(p.px - cam.x + petOffX * spread);
    const petY = Math.round(p.py - cam.y + petOffY + floatY);
    ctx.save();
    // Leve sombra sob o pet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(petX, petY + 2, dw * 0.4, dh * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(
      petImg,
      col * cellW,
      row * cellH,
      cellW,
      cellH,
      Math.round(petX - dw / 2),
      Math.round(petY - dh),
      dw,
      dh,
    );
    ctx.restore();
  }

  /** Nomes do quadro: desenhados no fim, por cima de tudo, sem um cobrir o outro. */
  private labels: { text: string; x: number; y: number; color: string; size: number; prio: number }[] = [];
  private label(text: string, x: number, y: number, color: string, size: number, prio: number) {
    this.labels.push({ text, x, y, color, size, prio });
  }

  /**
   * Mais importante primeiro (eu, o alvo, os outros da luta, outros jogadores,
   * monstros soltos). Nome que bate num já desenhado sobe um pouco; se ainda
   * bater e for de monstro solto ou de outro jogador, fica de fora.
   */
  private drawLabels(ctx: CanvasRenderingContext2D) {
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    this.labels.sort((a, b) => b.prio - a.prio);
    for (const l of this.labels) {
      const px = Math.round(l.size * 1.4);
      ctx.font = `${px}px 'Jersey 10', monospace`;
      const w = ctx.measureText(l.text).width + 6;
      const h = px * 0.8;
      const hit = (y: number) => placed.some((r) => l.x - w / 2 < r.x1 && l.x + w / 2 > r.x0 && y - h < r.y1 && y > r.y0);
      let y = l.y;
      for (let tries = 0; tries < 3 && hit(y); tries++) y -= h;
      if (hit(y) && l.prio < 2) continue;
      outlinedText(ctx, l.text, l.x, y, l.color, l.size);
      placed.push({ x0: l.x - w / 2, x1: l.x + w / 2, y0: y - h, y1: y });
    }
    this.labels = [];
  }

  /** Monstro esperando: anda um pouco em volta, com o nome, sem barra de vida. */
  /** Quanto o monstro voa acima do chão (0 para quem anda). Desenha a sombra no chão. */
  private hover(ctx: CanvasRenderingContext2D, sprite: string, now: number, phase: number, x: number, y: number, w: number): number {
    if (!HOVER_SPRITES.has(sprite)) return 0;
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.28, w * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return 16 + Math.round(Math.sin(now / 320 + phase) * 4);
  }

  private blinks = new WeakMap<object, { x: number; y: number; t: number }>();
  /** Teleporte: ao mudar de lugar, some e reaparece com um brilho. Devolve a opacidade. */
  private blink(ctx: CanvasRenderingContext2D, key: object, sprite: string, now: number, world: { x: number; y: number }, x: number, y: number, w: number, h: number): number {
    if (!BLINK_SPRITES.has(sprite)) return 1;
    const b = this.blinks.get(key);
    if (!b) {
      this.blinks.set(key, { x: world.x, y: world.y, t: -1e9 });
      return 1;
    }
    if (Math.abs(b.x - world.x) > 1 || Math.abs(b.y - world.y) > 1) {
      b.x = world.x;
      b.y = world.y;
      b.t = now;
    }
    const k = (now - b.t) / BLINK_MS;
    if (k >= 1) return 1;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - k);
    ctx.fillStyle = '#c9b8ff';
    ctx.beginPath();
    ctx.ellipse(x, y - h / 2, w * (0.25 + 0.35 * k), h * (0.3 + 0.3 * k), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return k;
  }

  private drawIdle(
    ctx: CanvasRenderingContext2D,
    now: number,
    cam: { x: number; y: number },
    m: { sprite: string; name: string; phase: number; chasing?: boolean },
    c: { x: number; y: number },
    dx: number,
    vdir: 'up' | 'down' | 'side' = 'side',
  ) {
    const frame = ((Math.floor(now / 260) + m.phase) % 4) + 1;
    const sprite = monsterImg(m.sprite, vdir, frame);
    if (!loaded(sprite)) return;
    const x = Math.round(c.x - cam.x);
    let y = Math.round(c.y - cam.y);
    const kids = isKidsDay(Date.now()) ? KIDS_MONSTER_SCALE : 1;
    const w = sprite.naturalWidth * kids;
    const h = sprite.naturalHeight * kids;
    const alpha = this.blink(ctx, m, m.sprite, now, c, x, y, w, h);
    const y0 = y;
    y -= this.hover(ctx, m.sprite, now, m.phase, x, y0, w);
    ctx.globalAlpha = alpha;
    // Andando: olha para onde vai; parado: olha para o personagem.
    if (vdir === 'side' && (dx > 0 || (dx === 0 && this.player.px > c.x))) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -w / 2, y - h + 4, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, x - w / 2, y - h + 4, w, h);
    }
    ctx.globalAlpha = 1;
    // Quem vem perseguindo anda em bando colado no personagem: sem nome, para não embolar.
    if (!m.chasing) this.label(kidName(m.name), x, y - h - 4, '#e8c8c0', 15, 0);
  }

  /** Onde o monstro da luta está agora: correndo pelo caminho até o lugar dele, ou parado lá. */
  private fightPos(m: FightMonster, now: number): { x: number; y: number } {
    if (!m.run) return center(m.tile);
    const f = (now - m.run.t0) / CHASE_MS_PER_TILE;
    const path = m.run.path;
    if (f >= path.length - 1) {
      m.run = undefined;
      return center(m.tile);
    }
    // Teleporte: fica na saída até a metade do caminho e aparece já no destino.
    if (BLINK_SPRITES.has(m.sprite)) return center(f < (path.length - 1) / 2 ? path[0] : path[path.length - 1]);
    const i = Math.floor(f);
    const a = center(path[i]);
    const b = center(path[i + 1]);
    const k = f - i;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  /** Demônio acorrentado numa ilha: só olha para o personagem e atira (sem barra de vida: é intocável). */
  private drawCaster(ctx: CanvasRenderingContext2D, now: number, cam: { x: number; y: number }, t: Pt, c: { x: number; y: number }) {
    const ddx = this.player.tile.x - t.x;
    const ddy = this.player.tile.y - t.y;
    const vdir = Math.abs(ddy) > Math.abs(ddx) ? (ddy > 0 ? 'down' : 'up') : 'side';
    const sprite = monsterImg(this.arenaCasterSprite(), vdir, (Math.floor(now / 260) % 4) + 1);
    if (!loaded(sprite)) return;
    const x = Math.round(c.x - cam.x);
    const y = Math.round(c.y - cam.y);
    const kids = isKidsDay(Date.now()) ? KIDS_MONSTER_SCALE : 1;
    const w = sprite.naturalWidth * kids;
    const h = sprite.naturalHeight * kids;
    if (vdir === 'side' && ddx > 0) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -w / 2, y - h + 4, w, h);
      ctx.restore();
    } else ctx.drawImage(sprite, x - w / 2, y - h + 4, w, h);
    this.label(this.arenaCasterName(), x, y - h - 4, '#ff8a6a', 14, 3);
  }

  private arenaCasterSprite() {
    return this.casterDef?.sprite ?? 'demon';
  }

  private arenaCasterName() {
    return storyText(this.casterDef?.name ?? 'Demônio Acorrentado');
  }

  private drawMonster(
    ctx: CanvasRenderingContext2D,
    now: number,
    cam: { x: number; y: number },
    m: FightMonster,
    idx: number,
    c: { x: number; y: number },
  ) {
    if (m.diedAt !== null && now - m.diedAt > 450) return;
    const frame = (Math.floor(now / 220) % 4) + 1;
    // Na luta, olha para o personagem: de frente/costas se ele está mais acima ou abaixo.
    const ddx = this.player.tile.x - m.tile.x;
    const ddy = this.player.tile.y - m.tile.y;
    const vdir = Math.abs(ddy) > Math.abs(ddx) ? (ddy > 0 ? 'down' : 'up') : 'side';
    const sprite = monsterImg(m.sprite, vdir, frame);
    if (!loaded(sprite)) return;
    const off = this.lungeOffset('m', m.tile, this.player.tile, now, idx);
    const x = Math.round(c.x - cam.x + off.x);
    let y = Math.round(c.y - cam.y + off.y);
    // Dia das Crianças: os monstros aparecem pequenos (só visual).
    const kids = isKidsDay(Date.now()) ? KIDS_MONSTER_SCALE : 1;
    const w = sprite.naturalWidth * (m.big ? BOSS_SCALE : 1) * kids;
    const h = sprite.naturalHeight * (m.big ? BOSS_SCALE : 1) * kids;
    const alpha = this.blink(ctx, m, m.sprite, now, c, x, y, w, h);
    y -= this.hover(ctx, m.sprite, now, idx, x, y, w);

    ctx.globalAlpha = alpha;
    if (m.diedAt !== null) ctx.globalAlpha = Math.max(0, 1 - (now - m.diedAt) / 450);
    if (this.flashing('m', now, idx)) ctx.filter = 'brightness(2.2)';
    // Os monstros do Grimhold olham para a esquerda: espelha se o personagem está à direita.
    if (vdir === 'side' || !FOUR_DIRS.has(m.sprite) ? this.player.px > c.x : false) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, -w / 2, y - h + 4, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, x - w / 2, y - h + 4, w, h);
    }
    ctx.filter = 'none';
    if (m.diedAt === null) {
      this.drawBar(ctx, x, y - h - 4, m.hp / m.maxHp, '#e0412f');
      this.label(kidName(m.name), x, y - h - 10, '#ffb3a6', 16, idx === 0 ? 3 : 2);
    }
    ctx.globalAlpha = 1;
  }

/** Outro jogador: o visual dele (roupa, cabelo, equipamento), com o nome e o nível. */
  private drawOther(ctx: CanvasRenderingContext2D, now: number, cam: { x: number; y: number }, p: OnlinePlayer, m: Mover) {
    const sheet = lookSheet(p.vocation, p.look, p.equipment);
    if (!sheet) return;
    const frame = m.path.length ? ['stand', 'walk1', 'stand', 'walk2'][Math.floor(now / 130) % 4] : 'stand';
    // Covil em grupo: avança um pouco na direção em que olha no golpe e volta.
    const lungeK = (now - (this.allyLunge.get(p.id) ?? -1e9)) / 260;
    const push = lungeK >= 0 && lungeK <= 1 ? Math.sin(lungeK * Math.PI) * 14 : 0;
    const dx = m.dir === 'left' ? -push : m.dir === 'right' ? push : 0;
    const dy = m.dir === 'up' ? -push : m.dir === 'down' ? push : 0;
    const x = Math.round(m.px - cam.x + dx);
    const y = Math.round(m.py - cam.y + dy);
    drawLook(ctx, sheet, m.dir, frame as Frame, x, y + 6, 3);
    // Trabalhando no mapa de profissão: a ferramenta balança, cada um no seu ritmo.
    const mw = m as Mover & { workSlot?: Pt };
    if (this.mode === 'work' && this.work && mw.workSlot && !m.path.length) this.drawTool(ctx, now, x, y, m.dir, (p.id * 977) % this.work.interval);
    const isParty = this.partyMemberIds.has(p.id);
    const nameColor = isParty ? '#38ef7d' : '#9fd8ff';
    const nameText = isParty ? `[${p.name}] (${p.level})` : `${p.name} (${p.level})`;
    this.label(nameText, x, y - FRAME_H * 3 - 10, nameColor, 16, 1);
  }

  /** O chefe global, em dobro do tamanho, com a vida do servidor inteiro. */
  private drawWorldBoss(ctx: CanvasRenderingContext2D, now: number, cam: { x: number; y: number }, boss: BossView, c: Pt) {
    const frame = (Math.floor(now / 240) % 4) + 1;
    const sprite = image(`/assets/monsters/${boss.sprite}_${frame}.png`);
    if (!loaded(sprite)) return;
    // O Mímico Gigante é o chefe do evento: não encolhe nem vira "Mirim".
    const kids = isKidsDay(Date.now()) && boss.sprite !== 'giant_mimic' ? KIDS_MONSTER_SCALE : 1;
    const w = sprite.naturalWidth * 2 * kids;
    const h = sprite.naturalHeight * 2 * kids;
    // Avanço no golpe: vai um pouco na direção do alvo e volta.
    let ox = 0;
    let oy = 0;
    if (this.bossLunge) {
      const k = (now - this.bossLunge.t0) / 320;
      if (k <= 1) {
        const s = Math.sin(k * Math.PI) * 26;
        const d = Math.hypot(this.bossLunge.to.x - c.x, this.bossLunge.to.y - c.y) || 1;
        ox = ((this.bossLunge.to.x - c.x) / d) * s;
        oy = ((this.bossLunge.to.y - c.y) / d) * s;
      }
    }
    const x = Math.round(c.x - cam.x + ox);
    const y = Math.round(c.y - cam.y + oy);
    ctx.drawImage(sprite, x - w / 2, y - h + 8, w, h);
    const bw = 160;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - bw / 2 - 2, y - h - 14, bw + 4, 12);
    ctx.fillStyle = '#c0281c';
    ctx.fillRect(x - bw / 2, y - h - 12, bw * (boss.maxHp ? boss.hp / boss.maxHp : 0), 8);
    outlinedText(ctx, boss.sprite === 'giant_mimic' ? storyText(boss.name) : kidName(storyText(boss.name)), x, y - h - 20, '#ffb35a', 22);
  }

  /** Servo do chefe especial: parado longe, olhando para os lutadores; o nome só no primeiro. */
  private drawBossMinion(ctx: CanvasRenderingContext2D, now: number, cam: { x: number; y: number }, m: { name: string; sprite: string }, c: Pt, i: number) {
    const sprite = image(`/assets/monsters/${m.sprite}_${(Math.floor((now + i * 170) / 220) % 4) + 1}.png`);
    if (!loaded(sprite)) return;
    const x = Math.round(c.x - cam.x);
    const y = Math.round(c.y - cam.y + Math.sin((now + i * 400) / 300) * 2);
    const kids = isKidsDay(Date.now()) ? KIDS_MONSTER_SCALE : 1;
    const w = sprite.naturalWidth * kids;
    const h = sprite.naturalHeight * kids;
    // A sprite já olha para a esquerda, onde ficam os jogadores.
    ctx.drawImage(sprite, x - w / 2, y - h + 4, w, h);
    if (i === 0) this.label(kidName(storyText(m.name)), x, y - h - 4, '#c9a6ff', 13, 3);
  }

  /** Outro jogador na arena: o visual dele, batendo no chefe de tempos em tempos. */
  private drawFighter(
    ctx: CanvasRenderingContext2D,
    now: number,
    cam: { x: number; y: number },
    f: BossView['fighters'][number],
    c: Pt,
    i: number,
  ) {
    const sheet = lookSheet(f.vocation as VocationId, f.look as Look, f.equipment);
    if (!sheet) return;
    const k = ((now + i * 377) % 1400) / 1400;
    const lunge = k < 0.18 ? Math.sin((k / 0.18) * Math.PI) * 8 : 0;
    const x = Math.round(c.x - cam.x + lunge);
    const y = Math.round(c.y - cam.y);
    // Pisca em vermelho logo depois de apanhar do chefe.
    const hitAt = this.bossHurt.get(i) ?? -1e9;
    if (now - hitAt < 220) ctx.filter = 'sepia(1) saturate(6) hue-rotate(-40deg)';
    drawLook(ctx, sheet, 'right', 'stand', x, y + 6, 3);
    ctx.filter = 'none';
    this.drawBar(ctx, x, y - FRAME_H * 3 - 4, this.downLeft(f) > 0 ? 0 : f.hp, '#3fd14a');
    outlinedText(ctx, f.name, x, y - FRAME_H * 3 - 10, '#9fd8ff', 16);
    const left = this.downLeft(f);
    if (left > 0) outlinedText(ctx, `${tr('Caído', 'Down')} ${Math.ceil(left / 1000)}s`, x, y - FRAME_H * 3 - 32, '#ff8a6a', 14);
  }

  /** Fração da mana agora na luta da caçada (null fora da caçada ou sem mana). */
  private manaFrac(): number | null {
    const c = this.manaCycle;
    if (!c || !c.playerMana || c.manaStart === undefined) return null;
    const max = c.playerMana;
    const regen = c.manaRegen ?? 0;
    let m = c.manaStart;
    let last = 0;
    const t = this.cycleT;
    for (const h of c.hits) {
      if (h.t > t) break;
      m = Math.min(max, m + (regen * (h.t - last)) / 1000);
      last = h.t;
      if (h.by === 'p' && h.spell) m -= spellById(h.spell)?.cost ?? 0;
      if (h.manaHeal) m = Math.min(max, m + h.manaHeal);
    }
    m = Math.min(max, m + (regen * Math.max(0, t - last)) / 1000);
    return Math.max(0, m) / max;
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, frac: number, color: string) {
    const w = 40;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, Math.max(0, Math.min(1, frac)) * w, 4);
  }
}
