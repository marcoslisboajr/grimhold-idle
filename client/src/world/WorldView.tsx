import { useEffect, useRef } from 'react';
import type { Activity, BossView, CycleView, EquipSlot, Look, OnlinePlayer, VocationId } from '@grimhold/shared';
import {
  barracksMap,
  beachMap,
  cemeteryMap,
  workMapFor,
  DUNGEON_HUNTS,
  cityMap,
  denMap,
  plainsMap,
  reefMap,
  riverMap,
  trenchMap,
  type Npc,
  type WorldMap,
} from './map.ts';
import { HuntScene } from './scene.ts';
import { TILE } from './map.ts';

/** Cada caçada tem o seu mapa. */
const HUNT_MAPS: Record<string, WorldMap> = {
  river_bank: riverMap(1),
  goblin_den: denMap(2),
  tribal_lands: plainsMap(3),
  // Caçadas de penas: escarpas e pico abertos (pássaros).
  falcon_cliffs: plainsMap(60),
  ember_peak: plainsMap(61),
  old_cemetery: cemeteryMap(4),
  ashfen_barracks: barracksMap(5),
  deep_tomb: DUNGEON_HUNTS.deep_tomb(),
  general_crypt: DUNGEON_HUNTS.general_crypt(),
  shipwreck_beach: beachMap(7),
  broken_reef: reefMap(8),
  abyssal_trench: trenchMap(9),
  tide_heart: trenchMap(11),
  spider_nest: DUNGEON_HUNTS.spider_nest(),
  orc_fortress: barracksMap(13),
  lizard_swamp: riverMap(14),
  minotaur_maze: DUNGEON_HUNTS.minotaur_maze(),
  minotaur_throne: DUNGEON_HUNTS.minotaur_throne(),
  cyclops_lair: DUNGEON_HUNTS.cyclops_lair(),
  dragon_nest: DUNGEON_HUNTS.dragon_nest(),
  vampire_crypt: DUNGEON_HUNTS.vampire_crypt(),
  demon_rift: DUNGEON_HUNTS.demon_rift(),
  // Caçadas abertas do 50 ao 79 (18/10): cenários das vizinhas.
  coral_depths: reefMap(8),
  wyvern_slope: DUNGEON_HUNTS.dragon_nest(),
  haunted_ruins: DUNGEON_HUNTS.vampire_crypt(),
  scorched_hollow: DUNGEON_HUNTS.dragon_nest(),
  infernal_trench: DUNGEON_HUNTS.demon_rift(),
  knights_ravine: DUNGEON_HUNTS.black_knight_crypt(),
  twisted_grove: riverMap(26),
  shadow_threshold: DUNGEON_HUNTS.shadow_cathedral(),
  dragon_throne: DUNGEON_HUNTS.dragon_throne(),
  sulfur_mines: DUNGEON_HUNTS.sulfur_mines(),
  giant_peaks: DUNGEON_HUNTS.giant_peaks(),
  black_knight_crypt: DUNGEON_HUNTS.black_knight_crypt(),
  eternal_glacier: DUNGEON_HUNTS.eternal_glacier(),
  hydra_swamp: riverMap(26),
  frost_citadel: DUNGEON_HUNTS.frost_citadel(),
  shadow_cathedral: DUNGEON_HUNTS.shadow_cathedral(),
  nightmare_valley: DUNGEON_HUNTS.nightmare_valley(),
  infernal_abyss: DUNGEON_HUNTS.infernal_abyss(),
  ghazbaran_lair: DUNGEON_HUNTS.ghazbaran_lair(),
  ghazbaran_temple: DUNGEON_HUNTS.ghazbaran_temple(),
  void_core: DUNGEON_HUNTS.void_core(),
  primordial_sanctum: DUNGEON_HUNTS.primordial_sanctum(),
  zathroth_throne: DUNGEON_HUNTS.zathroth_throne(),
  mill_fields: plainsMap(56),
  wasp_grove: riverMap(57),
  raider_camp: denMap(58),
  crab_coast: beachMap(59),
  city_cellars: denMap(62),
  boar_grove: plainsMap(63),
  kobold_camp: denMap(64),
  witch_bog: riverMap(65),
  abandoned_mine: DUNGEON_HUNTS.abandoned_mine(),
  raven_isle: beachMap(67),
  weaver_web: DUNGEON_HUNTS.weaver_web(),
  rat_king_throne: DUNGEON_HUNTS.rat_king_throne(),
  old_mine_depths: DUNGEON_HUNTS.old_mine_depths(),
  ashen_wastes: DUNGEON_HUNTS.ashen_wastes(),
  damned_forge: DUNGEON_HUNTS.damned_forge(),
  crystal_caverns: DUNGEON_HUNTS.crystal_caverns(),
  black_diamond_mines: DUNGEON_HUNTS.black_diamond_mines(),
  crystal_throne: DUNGEON_HUNTS.crystal_throne(),
  forgotten_tundra: DUNGEON_HUNTS.forgotten_tundra(),
  frozen_fortress: DUNGEON_HUNTS.frozen_fortress(),
  kings_necropolis: DUNGEON_HUNTS.kings_necropolis(),
  pharaoh_crypt: DUNGEON_HUNTS.pharaoh_crypt(),
  eternal_tomb: DUNGEON_HUNTS.eternal_tomb(),
  hell_furnace: DUNGEON_HUNTS.hell_furnace(),
  soul_market: DUNGEON_HUNTS.soul_market(),
  astral_rift: DUNGEON_HUNTS.astral_rift(),
  forgotten_library: DUNGEON_HUNTS.forgotten_library(),
  fallen_star_sanctum: DUNGEON_HUNTS.fallen_star_sanctum(),
  primordial_nest: DUNGEON_HUNTS.primordial_nest(),
  dragon_hoard: DUNGEON_HUNTS.dragon_hoard(),
  chaos_throne: DUNGEON_HUNTS.chaos_throne(),
  gods_vault: DUNGEON_HUNTS.gods_vault(),
  ozzarak_end: DUNGEON_HUNTS.ozzarak_end(),
  ruin_portal: DUNGEON_HUNTS.ruin_portal(),
  ember_rift: DUNGEON_HUNTS.ember_rift(),
  molten_grottoes: DUNGEON_HUNTS.molten_grottoes(),
  frostbite_pass: DUNGEON_HUNTS.frostbite_pass(),
  silent_barrow: DUNGEON_HUNTS.silent_barrow(),
  burning_catacombs: DUNGEON_HUNTS.burning_catacombs(),
  celestial_breach: DUNGEON_HUNTS.celestial_breach(),
  dragon_observatory: DUNGEON_HUNTS.dragon_observatory(),
  edge_of_ending: DUNGEON_HUNTS.edge_of_ending(),
  goblin_king_hall: DUNGEON_HUNTS.goblin_king_hall(),
  orc_warchief_keep: DUNGEON_HUNTS.orc_warchief_keep(),
  medusa_lair: DUNGEON_HUNTS.medusa_lair(),
  cyclops_forge: DUNGEON_HUNTS.cyclops_forge(),
  vampire_lord_crypt: DUNGEON_HUNTS.vampire_lord_crypt(),
  fallen_knights_hall: DUNGEON_HUNTS.fallen_knights_hall(),
  beholder_chamber: DUNGEON_HUNTS.beholder_chamber(),
  furnace_heart: DUNGEON_HUNTS.furnace_heart(),
  frost_giant_throne: DUNGEON_HUNTS.frost_giant_throne(),
  infernal_pit: DUNGEON_HUNTS.infernal_pit(),
  primordial_lair: DUNGEON_HUNTS.primordial_lair(),
  zharvos_sanctum: DUNGEON_HUNTS.zharvos_sanctum(),
  void_citadel: DUNGEON_HUNTS.void_citadel(),
  shattered_heaven: DUNGEON_HUNTS.shattered_heaven(),
  primal_chaos: DUNGEON_HUNTS.primal_chaos(),
  lumira_cathedral: DUNGEON_HUNTS.lumira_cathedral(),
  sylveth_grove: DUNGEON_HUNTS.sylveth_grove(),
  aethon_spire: DUNGEON_HUNTS.aethon_spire(),
  kharvos_fortress: DUNGEON_HUNTS.kharvos_fortress(),
  lumira_chapel: DUNGEON_HUNTS.lumira_chapel(),
  boar_den: DUNGEON_HUNTS.boar_den(),
  spider_mother_nest: DUNGEON_HUNTS.spider_mother_nest(),
  grey_wolf_lair: DUNGEON_HUNTS.grey_wolf_lair(),
  hungry_ogre_cave: DUNGEON_HUNTS.hungry_ogre_cave(),
  forgotten_knight_crypt: DUNGEON_HUNTS.forgotten_knight_crypt(),
  sylveth_glade: DUNGEON_HUNTS.sylveth_glade(),
  // Instância de quest O Carvalho de Ashfen: mata fechada.
  rotten_grove: denMap(90),
  // Instâncias de quest de A Inquisição do Alvorecer.
  profane_chapel: trenchMap(160),
  damned_rift: DUNGEON_HUNTS.demon_rift(),
  fallen_cathedral: DUNGEON_HUNTS.black_knight_crypt(),
  frozen_sanctum: DUNGEON_HUNTS.eternal_glacier(),
  belghazar_throne: DUNGEON_HUNTS.nightmare_valley(),
  // Instâncias de quest de Os Fossos de Kharvos: lava e fogo.
  ash_pit: DUNGEON_HUNTS.sulfur_mines(),
  eye_pit: DUNGEON_HUNTS.demon_rift(),
  hound_pit: DUNGEON_HUNTS.infernal_abyss(),
  damned_pit: DUNGEON_HUNTS.ghazbaran_lair(),
  pit_forge: DUNGEON_HUNTS.sulfur_mines(),
  fury_pit: DUNGEON_HUNTS.demon_rift(),
  abyss_pit: DUNGEON_HUNTS.infernal_abyss(),
  kharvos_throne: DUNGEON_HUNTS.ghazbaran_temple(),
  aethon_tower: DUNGEON_HUNTS.aethon_tower(),
  kharvos_arena: DUNGEON_HUNTS.kharvos_arena(),
  // Fortaleza de Valdeferro (200-250)
  valdeferro_walls: DUNGEON_HUNTS.valdeferro_walls(),
  oath_courtyard: DUNGEON_HUNTS.oath_courtyard(),
  order_hall: DUNGEON_HUNTS.order_hall(),
  masters_crypt: DUNGEON_HUNTS.masters_crypt(),
  fallen_gallery: DUNGEON_HUNTS.fallen_gallery(),
  ramparts_of_oath: DUNGEON_HUNTS.ramparts_of_oath(),
  heralds_corridor: DUNGEON_HUNTS.heralds_corridor(),
  whispering_shelves: DUNGEON_HUNTS.whispering_shelves(),
  wailing_ossuary: DUNGEON_HUNTS.wailing_ossuary(),
  moonlit_cloister: DUNGEON_HUNTS.moonlit_cloister(),
  coral_grotto: DUNGEON_HUNTS.coral_grotto(),
  pterosaur_cliffs: DUNGEON_HUNTS.pterosaur_cliffs(),
  rotting_orchard: DUNGEON_HUNTS.rotting_orchard(),
  officers_quarters: DUNGEON_HUNTS.officers_quarters(),
  serpent_cloister: DUNGEON_HUNTS.serpent_cloister(),
  ember_halls: DUNGEON_HUNTS.ember_halls(),
  // Regiões do 500 ao 600
  starlit_rift: DUNGEON_HUNTS.starlit_rift(),
  cosmic_scriptorium: DUNGEON_HUNTS.cosmic_scriptorium(),
  nebula_nest: DUNGEON_HUNTS.nebula_nest(),
  celestial_vault: DUNGEON_HUNTS.celestial_vault(),
  winter_steppe: DUNGEON_HUNTS.winter_steppe(),
  frozen_bastion: DUNGEON_HUNTS.frozen_bastion(),
  frostwyrm_peaks: DUNGEON_HUNTS.frostwyrm_peaks(),
  glacier_heart: DUNGEON_HUNTS.glacier_heart(),
  necropolis_gates: DUNGEON_HUNTS.necropolis_gates(),
  royal_mausoleum: DUNGEON_HUNTS.royal_mausoleum(),
  necromancer_spire: DUNGEON_HUNTS.necromancer_spire(),
  lich_king_vault: DUNGEON_HUNTS.lich_king_vault(),
  chaos_wastes: DUNGEON_HUNTS.chaos_wastes(),
  abyssal_forge: DUNGEON_HUNTS.abyssal_forge(),
  defiled_sanctum: DUNGEON_HUNTS.defiled_sanctum(),
  chaos_throne_hall: DUNGEON_HUNTS.chaos_throne_hall(),
  // Regiões do 600 ao 700
  primordial_rift: DUNGEON_HUNTS.primordial_rift(),
  void_archive: DUNGEON_HUNTS.void_archive(),
  astral_eclipse: DUNGEON_HUNTS.astral_eclipse(),
  primordial_vault: DUNGEON_HUNTS.primordial_vault(),
  titan_ridge: DUNGEON_HUNTS.titan_ridge(),
  ancient_quarry: DUNGEON_HUNTS.ancient_quarry(),
  thunder_peaks: DUNGEON_HUNTS.thunder_peaks(),
  titan_forge: DUNGEON_HUNTS.titan_forge(),
  scorched_bastion: DUNGEON_HUNTS.scorched_bastion(),
  ashen_sepulcher: DUNGEON_HUNTS.ashen_sepulcher(),
  pyre_spire: DUNGEON_HUNTS.pyre_spire(),
  black_sun_altar: DUNGEON_HUNTS.black_sun_altar(),
  twilight_gates: DUNGEON_HUNTS.twilight_gates(),
  moonlit_sanctuary: DUNGEON_HUNTS.moonlit_sanctuary(),
  astral_highlands: DUNGEON_HUNTS.astral_highlands(),
  eternal_twilight_throne: DUNGEON_HUNTS.eternal_twilight_throne(),
  lion_hall: DUNGEON_HUNTS.lion_hall(),
  falcon_gates: DUNGEON_HUNTS.falcon_gates(),
  oath_chamber: DUNGEON_HUNTS.oath_chamber(),
  falcon_throne: DUNGEON_HUNTS.falcon_throne(),
  lion_bastion: DUNGEON_HUNTS.lion_bastion(),
  falcon_nest: DUNGEON_HUNTS.falcon_nest(),
  // Biblioteca Proibida (250-275)
  burning_stacks: DUNGEON_HUNTS.burning_stacks(),
  frozen_archive: DUNGEON_HUNTS.frozen_archive(),
  storm_reading_room: DUNGEON_HUNTS.storm_reading_room(),
  index_vault: DUNGEON_HUNTS.index_vault(),
  golden_reading_hall: DUNGEON_HUNTS.golden_reading_hall(),
  // Catacumbas Esquecidas (275-300)
  bone_legion_halls: DUNGEON_HUNTS.bone_legion_halls(),
  embalmers_crypt: DUNGEON_HUNTS.embalmers_crypt(),
  necromancer_sanctum: DUNGEON_HUNTS.necromancer_sanctum(),
  royal_ossuary: DUNGEON_HUNTS.royal_ossuary(),
  kings_tomb: DUNGEON_HUNTS.kings_tomb(),
  // Palácio das Asuras (300-325)
  dawnfire_terrace: DUNGEON_HUNTS.dawnfire_terrace(),
  frozen_gardens: DUNGEON_HUNTS.frozen_gardens(),
  true_asura_court: DUNGEON_HUNTS.true_asura_court(),
  queens_chamber: DUNGEON_HUNTS.queens_chamber(),
  asura_throne: DUNGEON_HUNTS.asura_throne(),
  // Abismo Afogado (325-350)
  sunken_ruins: DUNGEON_HUNTS.sunken_ruins(),
  drowned_rift: DUNGEON_HUNTS.drowned_rift(),
  leviathan_reef: DUNGEON_HUNTS.leviathan_reef(),
  drowned_sanctum: DUNGEON_HUNTS.drowned_sanctum(),
  leviathan_maw: DUNGEON_HUNTS.leviathan_maw(),
  // Caverna dos Heróis (475-500)
  fallen_heroes_hall: DUNGEON_HUNTS.fallen_heroes_hall(),
  champions_gallery: DUNGEON_HUNTS.champions_gallery(),
  legends_crypt: DUNGEON_HUNTS.legends_crypt(),
  oath_hall: DUNGEON_HUNTS.oath_hall(),
  champion_throne: DUNGEON_HUNTS.champion_throne(),
  // Torre dos Bruxos (450-475)
  warlock_library: DUNGEON_HUNTS.warlock_library(),
  infernal_furnace: DUNGEON_HUNTS.infernal_furnace(),
  fanatic_altar: DUNGEON_HUNTS.fanatic_altar(),
  tower_council: DUNGEON_HUNTS.tower_council(),
  flame_throne: DUNGEON_HUNTS.flame_throne(),
  // Templo da Cobra (425-450)
  serpent_courtyard: DUNGEON_HUNTS.serpent_courtyard(),
  serpent_market: DUNGEON_HUNTS.serpent_market(),
  venom_chamber: DUNGEON_HUNTS.venom_chamber(),
  serpent_sanctum: DUNGEON_HUNTS.serpent_sanctum(),
  serpent_throne: DUNGEON_HUNTS.serpent_throne(),
  // Cidadela do Usurpador (400-425)
  usurper_walls: DUNGEON_HUNTS.usurper_walls(),
  usurper_barracks: DUNGEON_HUNTS.usurper_barracks(),
  usurped_hall: DUNGEON_HUNTS.usurped_hall(),
  usurper_council: DUNGEON_HUNTS.usurper_council(),
  usurper_throne: DUNGEON_HUNTS.usurper_throne(),
  // Jardim Corrompido (375-400)
  pinecone_woods: DUNGEON_HUNTS.pinecone_woods(),
  haunted_greenhouse: DUNGEON_HUNTS.haunted_greenhouse(),
  rotten_roots: DUNGEON_HUNTS.rotten_roots(),
  garden_heart: DUNGEON_HUNTS.garden_heart(),
  end_hollow: DUNGEON_HUNTS.end_hollow(),
  // Vale Primevo (350-375)
  raptor_plains: DUNGEON_HUNTS.raptor_plains(),
  primeval_jungle: DUNGEON_HUNTS.primeval_jungle(),
  tyrant_caldera: DUNGEON_HUNTS.tyrant_caldera(),
  tyrant_nest: DUNGEON_HUNTS.tyrant_nest(),
  tyrant_throne: DUNGEON_HUNTS.tyrant_throne(),
  // Raides
  raid_usurper: DUNGEON_HUNTS.usurper_throne(),
  raid_souls: DUNGEON_HUNTS.astral_rift(),
  raid_frost: DUNGEON_HUNTS.frozen_fortress(),
};
const huntMapFor = (id: string) => HUNT_MAPS[id] ?? HUNT_MAPS.river_bank;
const CITY_MAP = cityMap();

/** Zoom da câmera: quantos tiles cabem na largura. */
const ZOOM_MIN = 14;
const ZOOM_MAX = 44;
const ZOOM_KEY = 'grimhold.zoom';
/** Mapas mais estreitos que isto (chefe, profissões) têm zoom próprio, até SMALL_ZOOM_MIN tiles. */
const SMALL_MAP_W = 40;
const SMALL_ZOOM_MIN = 6;
function loadZoom(): number {
  try {
    const n = Number(localStorage.getItem(ZOOM_KEY));
    if (n >= ZOOM_MIN && n <= ZOOM_MAX) return n;
  } catch {
    // Sem armazenamento: usa o padrão.
  }
  return 32;
}
const SMALL_ZOOM_KEY = 'grimhold.zoom.small';
function loadSmallZoom(): number {
  try {
    const n = Number(localStorage.getItem(SMALL_ZOOM_KEY));
    if (n >= SMALL_ZOOM_MIN && n <= ZOOM_MAX) return n;
  } catch {
    /* sem storage */
  }
  return Infinity;
}
function saveSmallZoom(n: number) {
  try {
    localStorage.setItem(SMALL_ZOOM_KEY, String(n));
  } catch {
    /* sem storage */
  }
}
function saveZoom(n: number) {
  try {
    localStorage.setItem(ZOOM_KEY, String(n));
  } catch {
    // Sem armazenamento: só não lembra.
  }
}

export function WorldView(props: {
  activity: Activity | null;
  cycle: CycleView | null;
  vocation: VocationId;
  name: string;
  look: Look;
  /** Equipamento atual do jogador. */
  equipment?: Partial<Record<EquipSlot, string>>;
  /** Mestres com quest pronta para entregar (mostram um "!"). */
  questMarks?: string[];
  /** Chefe global (arena). */
  boss?: BossView | null;
  /** Outros jogadores online. */
  others?: OnlinePlayer[];
  /** Mascote ativo equipado. */
  activePet?: string | null;
  /** Runas equipadas no momento. */
  runes?: [string | null, string | null];
  /** Poção equipada. */
  potion?: string | null;
  /** Banco com suprimentos. */
  bank?: Record<string, number>;
  /** IDs dos membros da party (para destacar). */
  partyMemberIds?: Set<number>;
  clockOffset: React.MutableRefObject<number>;
  /** XP de combate total (o aumento vira o "+XP" na cabeça). */
  combatXp?: number;
  /** Velocidade da coleta atual (a animação acompanha o servidor). */
  workSpeed?: number;
  /** Clicou num NPC da cidade. */
  onNpc?: (npc: Npc) => void;
  /** Cidade ao vivo: posições que chegaram pelo city_move (mapa mutável) e o envio da sua. */
  livePos?: Map<number, { x: number; y: number }>;
  onCityMove?: (to: { x: number; y: number }) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<HuntScene | null>(null);
  // O loop lê sempre a versão mais nova das props sem reiniciar a animação.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    scene.current = new HuntScene(huntMapFor, CITY_MAP, workMapFor, props.vocation, props.name, props.look, props.equipment);
    // Em dev, a cena fica acessível no console (para inspecionar mapas inteiros).
    if (import.meta.env.DEV) (window as unknown as { __scene: HuntScene }).__scene = scene.current;
    const ctx = canvas.current!.getContext('2d')!;
    let raf = 0;
    const frame = () => {
      const p = latest.current;
      const now = performance.now();
      // Início do ciclo no relógio local: since (servidor) convertido.
      const since = p.activity?.since ?? 0;
      const startedAt = now - (Date.now() + p.clockOffset.current - since);
      scene.current!.look = p.look;
      scene.current!.equipment = p.equipment;
      scene.current!.activePet = p.activePet ?? null;
      scene.current!.runes = p.runes;
      scene.current!.potion = p.potion;
      scene.current!.bank = p.bank;
      scene.current!.workSpeed = p.workSpeed ?? 0;
      scene.current!.questMarks = p.questMarks ?? [];
      scene.current!.boss = p.boss ?? null;
      scene.current!.others = p.others ?? [];
      if (p.livePos) scene.current!.livePos = p.livePos;
      scene.current!.onCityMove = p.onCityMove;
      scene.current!.partyMemberIds = p.partyMemberIds ?? new Set();
      scene.current!.update(now, p.activity, p.cycle, startedAt);
      // Mapa menor que a tela (mapas de profissão): aproxima até o mapa cobrir a tela toda.
      const size = scene.current!.mapSize;
      if (size.w !== mapW || size.h !== mapH) {
        mapW = size.w;
        mapH = size.h;
        fit();
      }
      scene.current!.draw(ctx, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // A resolução acompanha o tamanho na tela: mostra `tiles` tiles de largura (rodinha do
    // mouse afasta/aproxima, e o jogo lembra). Em tela pequena não afasta além de 2 tiles por 96px.
    const el = canvas.current!;
    let tiles = loadZoom();
    let mapW = 0;
    let mapH = 0;
    // Tiles de fato na tela (num mapa pequeno, como o do chefe ou o das profissões, é menos que `tiles`).
    let shownNow = tiles;
    // Mapa pequeno (chefe, profissões): zoom próprio e guardado à parte, que aproxima até
    // SMALL_ZOOM_MIN tiles e afasta até ZOOM_MAX (o mapa fica no meio, com fundo em volta).
    // Sem zoom guardado: o mapa cobre a tela, como antes.
    let smallTiles = loadSmallZoom();
    const small = () => mapW > 0 && mapW < SMALL_MAP_W;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      // Nunca mostra mais tiles que o mapa tem, na largura nem na altura.
      const cover = Math.min(mapW || Infinity, mapH ? (mapH * w) / h : Infinity);
      const shown = small() ? (Number.isFinite(smallTiles) ? smallTiles : cover) : Math.min(tiles, cover);
      shownNow = shown;
      const zoom = Math.max(0.5, w / (shown * TILE));
      el.width = Math.round(w / zoom);
      el.height = Math.round(h / zoom);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? 2 : -2;
      if (small()) {
        // Parte do que está na tela: aproxima já no primeiro giro.
        smallTiles = Math.min(ZOOM_MAX, Math.max(SMALL_ZOOM_MIN, Math.round(shownNow) + step));
        saveSmallZoom(smallTiles);
      } else {
        tiles = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, tiles + step));
        saveZoom(tiles);
      }
      fit();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, [props.vocation, props.name]);

  // XP de combate subiu (luta vencida, shared XP da party): mostra o quanto entrou de verdade.
  const lastXp = useRef<number | undefined>(undefined);
  useEffect(() => {
    const xp = props.combatXp;
    if (scene.current && xp !== undefined) scene.current.combatXp = xp;
    const prev = lastXp.current;
    lastXp.current = xp;
    if (xp === undefined || prev === undefined || props.activity?.skill !== 'combat') return;
    scene.current?.showXp(xp - prev, performance.now());
  }, [props.combatXp]);

  // Pixel do canvas sob o mouse (o canvas é esticado pelo CSS).
  const toCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * e.currentTarget.width) / r.width, ((e.clientY - r.top) * e.currentTarget.height) / r.height];
  };

  return (
    <canvas
      ref={canvas}
      className="world"
      width={624}
      height={432}
      onClick={(e) => {
        const npc = scene.current?.npcAt(...(toCanvas(e) as [number, number]));
        if (!npc) return scene.current?.walkTo(...(toCanvas(e) as [number, number]), performance.now());
        scene.current!.walkToNpc(npc, performance.now());
        latest.current.onNpc?.(npc);
      }}
      onMouseMove={(e) => {
        const npc = scene.current?.npcAt(...(toCanvas(e) as [number, number]));
        e.currentTarget.style.cursor = npc ? 'pointer' : 'default';
      }}
    />
  );
}
