import { rngFor, KIDS_SHOP_END, isHalloweenShopOpen } from '@grimhold/shared';

/** Tamanho do tile na tela (os tilesets do Time Fantasy já vêm em 3x: 16px → 48px). */
export const TILE = 48;

export const enum Ground {
  Grass = 0,
  Water = 1,
  Path = 2,
  Stone = 3,
}

export type ObjectKind =
  | 'goldUrn'
  | 'tree'
  | 'bigTree'
  | 'bush'
  | 'rock'
  | 'stump'
  | 'log'
  | 'barrel'
  | 'crate'
  | 'produce'
  | 'oreBig'
  | 'crystalTall'
  | 'caveRock'
  | 'pebbles'
  | 'anvil'
  | 'hearth'
  | 'house'
  | 'cabin'
  | 'castle'
  | 'gate'
  | 'sign'
  | 'pot'
  | 'planter'
  | 'hall'
  | 'wall'
  | 'wallFace'
  | 'iceRock'
  | 'sarcophagus'
  | 'ossuary'
  | 'voidCrystal'
  | 'voidCluster'
  | 'voidCoral'
  | 'gargoyle'
  | 'moonStatue'
  | 'runeRock'
  | 'runeTablet'
  | 'runeCrystal'
  | 'giantRock'
  | 'mineTunnel'
  | 'brazier'
  | 'gemCluster'
  | 'rubble'
  | 'dock'
  | 'gravestone'
  | 'cross'
  | 'woodPile'
  | 'woodChips'
  | 'reeds'
  | 'fence'
  | 'angelStatue'
  | 'hornStatue'
  | 'pillarWhite'
  | 'pillarDark'
  | 'archDoor'
  | 'fountain'
  | 'stall'
  | 'flowerBox'
  | 'bench'
  | 'roundTree';

/** Recorte na tileB_outside.png (em tiles) e quais tiles o objeto bloqueia. */
/** Folha de onde sai o objeto (em public/assets/tiles/), quando não é a tileB_outside. */
type Sheet = 'tileB_outside' | 'rockcrystals_tf_3' | 'tileA5_cave' | 'tileA5_cave_ice' | 'catacombs' | 'darkdimension' | 'tileB_inside' | 'town' | 'runestones' | 'tileB_dungeon' | 'town2';

/** Tiles bloqueados a partir de um desenho ('#' = bloqueia), linha a linha. */
function mask(rows: string[]): [number, number][] {
  const out: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => c === '#' && out.push([x, y])));
  return out;
}

export const OBJECTS: Record<
  ObjectKind,
  { variants: [number, number][]; w: number; h: number; block: [number, number][]; sheet?: Sheet }
> = {
  // Árvore média: copa de 4 tiles de largura + tronco. Bloqueia só o tronco.
  tree: { variants: [[8, 0]], w: 4, h: 4, block: [[1, 3]] },
  bigTree: { variants: [[8, 4]], w: 6, h: 6, block: [[1, 5], [2, 5], [3, 5]] },
  bush: { variants: [[0, 9], [1, 9], [2, 9], [3, 9]], w: 1, h: 1, block: [[0, 0]] },
  rock: { variants: [[4, 7], [5, 7], [6, 7]], w: 1, h: 1, block: [[0, 0]] },
  // Toco: o topo de madeira fica no tile de cima, as raízes embaixo.
  stump: { variants: [[14, 4], [14, 6], [14, 8]], w: 2, h: 2, block: [[0, 1], [1, 1]] },
  log: { variants: [[5, 8]], w: 3, h: 2, block: [[0, 1], [1, 1], [2, 1]] },
  barrel: { variants: [[0, 3], [1, 3], [2, 3]], w: 1, h: 2, block: [[0, 1]] },
  crate: { variants: [[0, 1], [1, 1], [2, 1], [3, 1]], w: 1, h: 2, block: [[0, 1]] },
  produce: { variants: [[3, 3], [4, 3]], w: 1, h: 2, block: [[0, 1]] },
  // Mina: veios de minério (cristais) e rochas de caverna.
  // Cemitério, serraria e canteiros (tileB_outside).
  gravestone: { variants: [[4, 5], [5, 5]], w: 1, h: 2, block: [[0, 1]] },
  cross: { variants: [[6, 5]], w: 1, h: 2, block: [[0, 1]] },
  woodPile: { variants: [[7, 6], [7, 7]], w: 1, h: 1, block: [[0, 0]] },
  woodChips: { variants: [[4, 7], [5, 7], [6, 7]], w: 1, h: 1, block: [] },
  reeds: { variants: [[4, 8]], w: 1, h: 2, block: [] },
  fence: { variants: [[0, 5], [1, 5], [2, 5]], w: 1, h: 1, block: [[0, 0]] },
  // Plataforma de cais de madeira (fica sobre a água, não bloqueia).
  dock: { variants: [[11, 10]], w: 4, h: 3, block: [] },
  // Mina (tileB_dungeon do Time Fantasy): boca de túnel, braseiro, gemas e entulho.
  mineTunnel: { sheet: 'tileB_dungeon', variants: [[5, 0]], w: 3, h: 2, block: mask(['###', '###']) },
  brazier: { sheet: 'tileB_dungeon', variants: [[4, 7]], w: 1, h: 2, block: [[0, 1]] },
  // Urnas douradas (salão do tesouro do Mímico Rei).
  goldUrn: { sheet: 'tileB_dungeon', variants: [[2, 9], [3, 9]], w: 1, h: 1, block: [[0, 0]] },
  gemCluster: { sheet: 'tileB_dungeon', variants: [[13, 11], [14, 11], [15, 11]], w: 1, h: 1, block: [[0, 0]] },
  rubble: { sheet: 'tileB_dungeon', variants: [[5, 4], [6, 4], [7, 4]], w: 1, h: 1, block: [] },
  // Arenas dos chefes (tileB_dungeon e Dark Dimension): estátuas, pilares e o portão em arco.
  angelStatue: { sheet: 'tileB_dungeon', variants: [[4, 9], [6, 9]], w: 2, h: 3, block: [[0, 2], [1, 2]] },
  hornStatue: { sheet: 'tileB_dungeon', variants: [[4, 12], [6, 12]], w: 2, h: 3, block: [[0, 2], [1, 2]] },
  pillarWhite: { sheet: 'tileB_dungeon', variants: [[0, 9]], w: 1, h: 2, block: [[0, 1]] },
  pillarDark: { sheet: 'tileB_dungeon', variants: [[0, 12]], w: 1, h: 2, block: [[0, 1]] },
  // Praça e mercado (town2.png, gerada por scripts/tiles_town2.py).
  fountain: { sheet: 'town2', variants: [[0, 0]], w: 5, h: 4, block: mask(['#####', '#####', '#####', '#####']) },
  stall: { sheet: 'town2', variants: [[5, 0], [8, 0], [11, 0]], w: 3, h: 3, block: mask(['...', '###', '###']) },
  flowerBox: { sheet: 'town2', variants: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4]], w: 1, h: 1, block: [[0, 0]] },
  bench: { sheet: 'town2', variants: [[6, 4]], w: 2, h: 1, block: [[0, 0], [1, 0]] },
  roundTree: { sheet: 'town2', variants: [[8, 4]], w: 3, h: 3, block: [[1, 2]] },
  archDoor: { sheet: 'darkdimension', variants: [[11, 13]], w: 3, h: 3, block: mask(['###', '###', '###']) },
  oreBig: { sheet: 'rockcrystals_tf_3', variants: [[4, 6], [9, 6]], w: 2, h: 2, block: [[0, 1], [1, 1]] },
  crystalTall: { sheet: 'rockcrystals_tf_3', variants: [[5, 4], [10, 4]], w: 1, h: 2, block: [[0, 1]] },
  caveRock: { sheet: 'tileA5_cave', variants: [[6, 3], [7, 3], [0, 1], [1, 1], [2, 1]], w: 1, h: 1, block: [[0, 0]] },
  pebbles: { sheet: 'tileA5_cave', variants: [[0, 4], [1, 4], [5, 4], [6, 4]], w: 1, h: 1, block: [] },
  // Gelo: as rochas da caverna recoloridas (scripts/tiles_ice_tomb.py).
  iceRock: { sheet: 'tileA5_cave_ice', variants: [[6, 3], [7, 3], [0, 1], [1, 1], [2, 1]], w: 1, h: 1, block: [[0, 0]] },
  // Tumba: sarcófagos e paredes de crânios da folha de catacumbas do Time Fantasy.
  sarcophagus: { sheet: 'catacombs', variants: [[0, 5], [2, 5], [4, 5], [6, 5]], w: 2, h: 2, block: [[0, 1], [1, 1]] },
  ossuary: { sheet: 'catacombs', variants: [[2, 1]], w: 2, h: 2, block: [[0, 1], [1, 1]] },
  // Vazio (Dark Dimension): cristais, corais rosados, gárgulas e a estátua da lua.
  voidCrystal: { sheet: 'darkdimension', variants: [[3, 3]], w: 1, h: 2, block: [[0, 1]] },
  voidCluster: { sheet: 'darkdimension', variants: [[6, 3]], w: 2, h: 2, block: [[0, 1], [1, 1]] },
  voidCoral: { sheet: 'darkdimension', variants: [[6, 1]], w: 2, h: 2, block: [[0, 1], [1, 1]] },
  gargoyle: { sheet: 'darkdimension', variants: [[8, 10], [11, 10]], w: 3, h: 3, block: [[1, 2]] },
  moonStatue: { sheet: 'darkdimension', variants: [[14, 10]], w: 2, h: 3, block: [[0, 2], [1, 2]] },
  // Runas (scripts/data/gen_rune_maps.py, peças da tileB_dungeon)
  runeRock: { sheet: 'runestones', variants: [[0, 0]], w: 2, h: 2, block: [[0, 1], [1, 1]] },
  runeTablet: { sheet: 'runestones', variants: [[2, 0]], w: 1, h: 2, block: [[0, 1]] },
  runeCrystal: { sheet: 'runestones', variants: [[2, 2], [2, 3], [0, 2]], w: 1, h: 1, block: [[0, 0]] },
  giantRock: { sheet: 'runestones', variants: [[3, 0]], w: 4, h: 4, block: mask(['....', '....', '####', '.##.']) },
  // Forja e cozinha.
  anvil: { sheet: 'tileB_inside', variants: [[14, 5]], w: 2, h: 2, block: [[0, 0], [1, 0]] },
  // Lareira inteira: chaminé, cornija, boca do fogo e a base (4 de altura).
  hearth: { sheet: 'tileB_inside', variants: [[11, 3], [8, 3]], w: 3, h: 4, block: mask(['...', '...', '###', '###']) },
  // Cidade (town.png, gerada por scripts/tiles_town.py). Casa enxaimel: cinza, verde, vermelha, azul; porta na coluna 3.
  house: {
    sheet: 'town',
    variants: [[0, 0], [7, 0], [0, 8], [7, 8]],
    w: 7,
    h: 8,
    block: mask(['..###..', '#######', '#######', '#######', '#######', '#######', '#######', '#######']),
  },
  // Casa de toras: cinza, verde; porta na coluna 2.
  cabin: {
    sheet: 'town',
    variants: [[0, 16], [7, 16]],
    w: 7,
    h: 7,
    block: mask(['.#####.', '#######', '#######', '#######', '#######', '#######', '#######']),
  },
  castle: {
    sheet: 'town',
    variants: [[0, 23]],
    w: 8,
    h: 8,
    block: mask(['.#.#....', '########', '########', '#######.', '########', '########', '#######.', '##.##.#.']),
  },
  // Portão em arco: o vão (colunas 2-4 embaixo) fica livre.
  gate: {
    sheet: 'town',
    variants: [[8, 23]],
    w: 7,
    h: 7,
    block: mask(['#######', '#######', '#######', '#######', '##...##', '#.....#', '##...##']),
  },
  // Placas: loja, poção, armadura, arma, pousada.
  sign: { sheet: 'town', variants: [[0, 31], [1, 31], [2, 31], [3, 31], [4, 31]], w: 1, h: 1, block: [[0, 0]] },
  pot: { sheet: 'town', variants: [[5, 31], [6, 31], [7, 31], [8, 31], [9, 31], [10, 31]], w: 1, h: 1, block: [[0, 0]] },
  planter: { sheet: 'town', variants: [[0, 32], [3, 32]], w: 3, h: 3, block: mask(['###', '###', '###']) },
  // Muralha: topo (H, V, cantos NW/NE/SW/SE, pontas L/R/T/B) e a face de 2 tiles (esquerda, meio, direita).
  wall: { sheet: 'town', variants: Array.from({ length: 10 }, (_, i) => [i, 48] as [number, number]), w: 1, h: 1, block: [[0, 0]] },
  wallFace: { sheet: 'town', variants: [[0, 49], [1, 49], [2, 49]], w: 1, h: 2, block: [[0, 0], [0, 1]] },
  // Salões grandes: templo (telhado dourado) e pousada (vermelho); porta na coluna 3.
  hall: {
    sheet: 'town',
    variants: [[0, 35], [7, 35]],
    w: 7,
    h: 13,
    block: mask(['..###..', ...Array(12).fill('#######')]),
  },
};

export interface MapObject {
  kind: ObjectKind;
  /** Canto superior esquerdo, em tiles. */
  x: number;
  y: number;
  variant: number;
}

export interface WorldMap {
  w: number;
  h: number;
  ground: Uint8Array;
  /** Variação da grama (0 = lisa, >0 = flores) por tile. */
  deco: Uint8Array;
  blocked: Uint8Array;
  objects: MapObject[];
  start: { x: number; y: number };
  /** Cidade: onde fica o portal (tile da base, no centro) e onde se para para entrar. */
  portal?: { x: number; y: number };
  /** Caçada: laço de tiles que o personagem percorre sem parar (vazio na cidade). */
  route: { x: number; y: number }[];
  /** Cidade: os NPCs e onde estão. */
  npcs?: Npc[];
  /** Tema do chão (caverna, vulcão, cripta): troca as folhas da grama, trilha, pedra e água. */
  theme?: Theme;
  /** Chão único (um tile de outra folha) no lugar dos autotiles: ex. chão de caverna. */
  floor?: { sheet: string; x: number; y: number };
  /** Arena do chefe global (os jogadores lutam em volta do chefe). */
  arena?: boolean;
  /** Arena de gladiadores: onde o personagem espera e o portão de onde entra cada desafiante. */
  pit?: { spot: { x: number; y: number }; gate: { x: number; y: number } };
  /** Ilhas dos atiradores da provação (fora de alcance), em tiles. */
  casters?: { x: number; y: number }[];
  /** Mapa de profissão: onde o personagem trabalha e o alvo. */
  work?: { spot: { x: number; y: number }; face: 'down' | 'left' | 'right' | 'up'; target: { x: number; y: number } };
  /** Limiar dos Mortos: onde acorda quem morreu sem bênção (o Ceifador fica ali). */
  limbo?: boolean;
}

/** Bloco de autotile (2x3 tiles) numa folha de public/assets/tiles/. */
export interface AutoBlock {
  sheet: string;
  x: number;
  y: number;
  /** Água/lava animada: deslocamentos em tiles de cada quadro. */
  frames?: number[];
}
export interface Theme {
  /** O chão de fundo (onde nos mapas comuns é grama). */
  base: AutoBlock;
  path: AutoBlock;
  stone: AutoBlock;
  /** Lava, abismo ou água: bloqueia a passagem. */
  water: AutoBlock;
  /** Cores do minimapa para cada Ground [r, g, b] e para tiles bloqueados [r, g, b]. */
  minimap?: {
    ground?: Partial<Record<Ground, [number, number, number]>>;
    blocked?: [number, number, number];
  };
}
const D1 = 'tileA1_dungeon';
const D2 = 'tileA2_dungeon';
export const THEMES = {
  volcano: {
    base: { sheet: D2, x: 0, y: 6 },
    path: { sheet: D2, x: 2, y: 0 },
    stone: { sheet: D2, x: 12, y: 9 },
    water: { sheet: D1, x: 8, y: 6, frames: [0, 2, 4] },
    minimap: {
      ground: {
        [Ground.Grass]: [45, 40, 45],
        [Ground.Water]: [214, 76, 24],
        [Ground.Path]: [110, 85, 70],
        [Ground.Stone]: [75, 65, 65],
      },
      blocked: [30, 24, 26],
    },
  },
  cave: {
    base: { sheet: D2, x: 2, y: 0 },
    path: { sheet: D2, x: 4, y: 0 },
    stone: { sheet: D2, x: 0, y: 3 },
    water: { sheet: D2, x: 8, y: 0 },
    minimap: {
      ground: {
        [Ground.Grass]: [55, 48, 42],
        [Ground.Water]: [16, 14, 20],
        [Ground.Path]: [130, 105, 80],
        [Ground.Stone]: [95, 82, 70],
      },
      blocked: [32, 28, 24],
    },
  },
  // Gelo: a caverna recolorida (pedra azul-clara sobre abismo gelado).
  ice: {
    base: { sheet: 'tileA2_dungeon_ice', x: 2, y: 0 },
    path: { sheet: 'tileA2_dungeon_ice', x: 4, y: 0 },
    stone: { sheet: 'tileA2_dungeon_ice', x: 0, y: 3 },
    water: { sheet: 'tileA2_dungeon_ice', x: 8, y: 0 },
    minimap: {
      ground: {
        [Ground.Grass]: [150, 175, 190],
        [Ground.Water]: [14, 22, 34],
        [Ground.Path]: [200, 220, 232],
        [Ground.Stone]: [120, 150, 170],
      },
      blocked: [30, 40, 52],
    },
  },
  // Vazio: pedra violeta sobre o céu estrelado (scripts/tiles_void_hell.py, Time Fantasy Dark Dimension).
  void: {
    base: { sheet: 'tileA2_void', x: 0, y: 6 },
    path: { sheet: 'tileA2_void', x: 2, y: 0 },
    stone: { sheet: 'tileA2_void', x: 2, y: 6 },
    water: { sheet: 'tileA2_void', x: 8, y: 9 },
    minimap: {
      ground: {
        [Ground.Grass]: [70, 55, 90],
        [Ground.Water]: [22, 18, 36],
        [Ground.Path]: [110, 90, 130],
        [Ground.Stone]: [85, 70, 105],
      },
      blocked: [30, 24, 44],
    },
  },
  // Inferno: obsidiana com veios de brasa sobre lava.
  hell: {
    base: { sheet: 'tileA2_hell', x: 0, y: 6 },
    path: { sheet: 'tileA2_hell', x: 2, y: 0 },
    stone: { sheet: 'tileA2_hell', x: 12, y: 9 },
    water: { sheet: D1, x: 8, y: 6, frames: [0, 2, 4] },
    minimap: {
      ground: {
        [Ground.Grass]: [40, 22, 22],
        [Ground.Water]: [214, 76, 24],
        [Ground.Path]: [95, 45, 40],
        [Ground.Stone]: [65, 35, 32],
      },
      blocked: [24, 12, 12],
    },
  },
  // Tumba: a pedra escura lavrada do tileset de masmorra (salões) sobre o vazio.
  tomb: {
    base: { sheet: D2, x: 0, y: 6 },
    path: { sheet: D2, x: 0, y: 6 },
    stone: { sheet: D2, x: 2, y: 6 },
    water: { sheet: D2, x: 8, y: 9 },
    minimap: {
      ground: {
        [Ground.Grass]: [60, 60, 66],
        [Ground.Water]: [12, 12, 18],
        [Ground.Path]: [90, 90, 98],
        [Ground.Stone]: [72, 72, 80],
      },
      blocked: [24, 24, 30],
    },
  },
  // Salão do tesouro (Mímico Rei): piso amarelo, tapete vermelho real e trançado dourado.
  treasure: {
    base: { sheet: D2, x: 12, y: 0 },
    path: { sheet: D2, x: 4, y: 3 },
    stone: { sheet: D2, x: 14, y: 6 },
    water: { sheet: D2, x: 8, y: 6 },
    minimap: {
      ground: {
        [Ground.Grass]: [230, 200, 130],
        [Ground.Water]: [40, 40, 50],
        [Ground.Path]: [190, 90, 70],
        [Ground.Stone]: [225, 195, 110],
      },
      blocked: [60, 45, 30],
    },
  },
  crypt: {
    base: { sheet: D2, x: 0, y: 6 },
    path: { sheet: D2, x: 12, y: 6 },
    stone: { sheet: D2, x: 0, y: 9 },
    water: { sheet: D2, x: 8, y: 6 },
    minimap: {
      ground: {
        [Ground.Grass]: [44, 44, 52],
        [Ground.Water]: [14, 14, 20],
        [Ground.Path]: [115, 115, 125],
        [Ground.Stone]: [78, 78, 90],
      },
      blocked: [26, 26, 32],
    },
  },
} satisfies Record<string, Theme>;

type Pt = { x: number; y: number };
/** Ponto em fração do mapa (0..1), para os desenhos não dependerem do tamanho. */
type Frac = [number, number];

/**
 * Pincéis para pintar o chão em frações do mapa. Tudo que sai da borda é
 * ignorado, então dá para desenhar sem se preocupar com os limites.
 */
function painter(ground: Uint8Array, w: number, h: number) {
  const set = (x: number, y: number, g: Ground, only?: Ground) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    if (only !== undefined && ground[y * w + x] !== only) return;
    ground[y * w + x] = g;
  };
  return {
    w,
    h,
    /** Retângulo em frações. */
    rect(x0: number, y0: number, x1: number, y1: number, g: Ground) {
      for (let y = Math.round(y0 * h); y < Math.round(y1 * h); y++)
        for (let x = Math.round(x0 * w); x < Math.round(x1 * w); x++) set(x, y, g);
    },
    /** Elipse com borda irregular (wobble = quanto a borda ondula, em fração do raio). */
    blob(cx: number, cy: number, rx: number, ry: number, g: Ground, wobble = 0.12, only?: Ground) {
      const X = cx * w, Y = cy * h, RX = rx * w, RY = ry * h;
      for (let y = Math.floor(Y - RY - 2); y <= Y + RY + 2; y++) {
        for (let x = Math.floor(X - RX - 2); x <= X + RX + 2; x++) {
          const a = Math.atan2(y - Y, x - X);
          const k = 1 + wobble * (Math.sin(a * 3 + cx * 9) * 0.6 + Math.sin(a * 7 + cy * 5) * 0.4);
          const dx = (x - X) / (RX * k);
          const dy = (y - Y) / (RY * k);
          if (dx * dx + dy * dy <= 1) set(x, y, g, only);
        }
      }
    },
    /** Trilha passando pelos pontos, com largura em tiles. */
    trail(points: Frac[], width: number, g: Ground, only?: Ground) {
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[i + 1];
        const steps = Math.ceil(Math.hypot((bx - ax) * w, (by - ay) * h)) * 2;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = Math.round((ax + (bx - ax) * t) * w);
          const y = Math.round((ay + (by - ay) * t) * h);
          const r0 = -Math.floor((width - 1) / 2);
          for (let dy = r0; dy < r0 + width; dy++) for (let dx = r0; dx < r0 + width; dx++) set(x + dx, y + dy, g, only);
        }
      }
    },
    /** Rio passando pelos pontos, com largura em tiles. */
    river(points: Frac[], width: number) {
      this.trail(points, width, Ground.Water);
    },
  };
}
type Painter = ReturnType<typeof painter>;

/** Margem do Rio: campo verde cortado por um rio largo, trilhas de terra e bosques. */
export function riverMap(seed = 1): WorldMap {
  return wildMap({
    seed,
    w: 90,
    h: 70,
    paint(p) {
      p.river([[0.62, 0], [0.7, 0.2], [0.6, 0.42], [0.72, 0.65], [0.66, 0.85], [0.74, 1]], 4);
      p.trail([[0, 0.5], [0.2, 0.46], [0.4, 0.55], [0.58, 0.5]], 2, Ground.Path);
      p.trail([[0.3, 0.1], [0.32, 0.5], [0.25, 0.9]], 2, Ground.Path);
      // Ponte de pedra sobre o rio.
      p.trail([[0.58, 0.5], [0.8, 0.48]], 2, Ground.Stone, Ground.Water);
      p.trail([[0.8, 0.48], [0.95, 0.4]], 2, Ground.Path);
      p.blob(0.15, 0.2, 0.06, 0.07, Ground.Water, 0.15);
    },
    route: [[0.08, 0.5], [0.3, 0.2], [0.5, 0.3], [0.85, 0.42], [0.88, 0.8], [0.55, 0.85], [0.3, 0.75]],
    scatter: [['bigTree', 14, 1], ['tree', 40, 1], ['log', 10, 1], ['stump', 20, 1], ['rock', 40, 1], ['bush', 70, 0]],
  });
}

/** Toca dos Goblins: clareiras de terra ligadas por trilhas no meio de mata fechada. */
export function denMap(seed = 2): WorldMap {
  return wildMap({
    seed,
    w: 90,
    h: 70,
    decoChance: 0.05,
    paint(p) {
      const camps: Frac[] = [[0.2, 0.5], [0.45, 0.25], [0.75, 0.3], [0.7, 0.72], [0.4, 0.75]];
      for (const [x, y] of camps) p.blob(x, y, 0.11, 0.13, Ground.Path, 0.2);
      p.trail([...camps, camps[0]], 3, Ground.Path);
      p.trail([[0, 0.5], [0.2, 0.5]], 2, Ground.Path);
      // Pátio de pedra do chefe no acampamento maior.
      p.blob(0.75, 0.3, 0.04, 0.05, Ground.Stone, 0.1);
    },
    camp: [['barrel', 30], ['crate', 30], ['rock', 40], ['log', 10]],
    route: [[0.08, 0.5], [0.2, 0.5], [0.45, 0.25], [0.75, 0.3], [0.7, 0.72], [0.4, 0.75]],
    scatter: [['bigTree', 40, 0], ['tree', 160, 0], ['stump', 20, 0], ['bush', 60, 0]],
  });
}

/** Território das Tribos: campo aberto, lagos, trilhas que se cruzam e troncos cortados. */
export function plainsMap(seed = 3): WorldMap {
  return wildMap({
    seed,
    w: 96,
    h: 70,
    decoChance: 0.22,
    paint(p) {
      p.blob(0.75, 0.2, 0.09, 0.1, Ground.Water, 0.2);
      p.blob(0.3, 0.8, 0.07, 0.07, Ground.Water, 0.2);
      p.trail([[0, 0.55], [0.3, 0.5], [0.6, 0.6], [1, 0.55]], 2, Ground.Path);
      p.trail([[0.45, 0], [0.42, 0.4], [0.5, 1]], 2, Ground.Path);
      p.trail([[0.6, 0.6], [0.8, 0.85]], 2, Ground.Path);
    },
    route: [[0.06, 0.55], [0.35, 0.3], [0.6, 0.35], [0.9, 0.45], [0.82, 0.85], [0.5, 0.88], [0.2, 0.7]],
    scatter: [['bigTree', 8, 2], ['tree', 30, 2], ['stump', 50, 1], ['log', 24, 1], ['rock', 60, 1], ['bush', 50, 0]],
  });
}

/** Cemitério Velho: gramado com alamedas de pedra em grade e lápides em fileiras. */
export function cemeteryMap(seed = 4): WorldMap {
  return wildMap({
    seed,
    w: 90,
    h: 70,
    decoChance: 0.04,
    paint(p) {
      for (const y of [0.2, 0.5, 0.8]) p.trail([[0, y], [1, y]], 2, Ground.Stone);
      for (const x of [0.2, 0.45, 0.7, 0.9]) p.trail([[x, 0.08], [x, 0.92]], 2, Ground.Stone);
      p.blob(0.45, 0.5, 0.06, 0.07, Ground.Stone, 0.05);
    },
    route: [[0.06, 0.5], [0.2, 0.2], [0.7, 0.2], [0.9, 0.5], [0.7, 0.8], [0.2, 0.8], [0.45, 0.5]],
    scatter: [['rock', 260, 0], ['stump', 30, 1], ['tree', 25, 1], ['bush', 30, 0]],
  });
}

/** Quartel de Ashfen: pátios de pedra com suprimentos do exército, cercados de mata. */
export function barracksMap(seed = 5): WorldMap {
  return wildMap({
    seed,
    w: 90,
    h: 70,
    decoChance: 0.03,
    paint(p) {
      p.rect(0.12, 0.15, 0.48, 0.45, Ground.Stone);
      p.rect(0.55, 0.12, 0.9, 0.42, Ground.Stone);
      p.rect(0.3, 0.55, 0.8, 0.88, Ground.Stone);
      p.trail([[0, 0.5], [0.3, 0.5], [0.3, 0.3], [0.7, 0.3], [0.55, 0.7], [0.3, 0.5]], 3, Ground.Path, Ground.Grass);
    },
    campGround: Ground.Stone,
    camp: [['barrel', 50], ['crate', 60], ['log', 10]],
    route: [[0.06, 0.5], [0.3, 0.3], [0.72, 0.27], [0.75, 0.7], [0.4, 0.75]],
    scatter: [['tree', 120, 0], ['bigTree', 20, 0], ['rock', 30, 0]],
  });
}

/** Tumba Profunda: salões de pedra ligados por corredores, com escombros e água parada. */
export function tombMap(seed = 6): WorldMap {
  return wildMap({
    seed,
    w: 90,
    h: 70,
    decoChance: 0.02,
    paint(p) {
      const halls: Frac[] = [[0.2, 0.5], [0.45, 0.25], [0.75, 0.35], [0.65, 0.75], [0.35, 0.75]];
      for (const [x, y] of halls) p.blob(x, y, 0.12, 0.14, Ground.Stone, 0.08);
      p.trail([...halls, halls[0]], 3, Ground.Stone);
      p.trail([[0, 0.5], [0.2, 0.5]], 2, Ground.Stone);
      p.blob(0.75, 0.35, 0.04, 0.04, Ground.Water, 0.2);
      p.blob(0.35, 0.78, 0.03, 0.03, Ground.Water, 0.2);
    },
    campGround: Ground.Stone,
    camp: [['rock', 120], ['stump', 20]],
    route: [[0.07, 0.5], [0.2, 0.5], [0.45, 0.25], [0.75, 0.48], [0.65, 0.75], [0.35, 0.68]],
    scatter: [['tree', 80, 0], ['rock', 30, 0]],
  });
}

/** Praia dos Naufrágios: faixa larga de areia entre a mata e o mar, cheia de destroços. */
export function beachMap(seed = 7): WorldMap {
  return wildMap({
    seed,
    w: 96,
    h: 70,
    decoChance: 0.05,
    paint(p) {
      const { w, h } = p;
      // Areia e mar com a linha da costa ondulando.
      for (let y = 0; y < h; y++) {
        const sand = Math.round(w * (0.22 + 0.04 * Math.sin(y / 6)));
        const shore = Math.round(w * (0.68 + 0.05 * Math.sin(y / 8 + 1)));
        p.rect(sand / w, y / h, shore / w, (y + 1) / h, Ground.Path);
        p.rect(shore / w, y / h, 1, (y + 1) / h, Ground.Water);
      }
      p.trail([[0, 0.5], [0.25, 0.5]], 2, Ground.Path);
      // Píer de pedra entrando no mar.
      p.trail([[0.6, 0.3], [0.85, 0.3]], 2, Ground.Stone);
    },
    camp: [['log', 30], ['barrel', 30], ['crate', 30], ['rock', 40]],
    route: [[0.06, 0.5], [0.3, 0.2], [0.82, 0.3], [0.55, 0.5], [0.62, 0.85], [0.3, 0.8]],
    scatter: [['tree', 80, 0], ['bush', 40, 0]],
  });
}

/** Recife Partido: ilhas de areia no meio do mar, ligadas por passarelas de pedra. */
export function reefMap(seed = 8): WorldMap {
  return wildMap({
    seed,
    w: 96,
    h: 72,
    decoChance: 0.04,
    paint(p) {
      p.rect(0.12, 0, 1, 1, Ground.Water);
      const islands: Frac[] = [[0.25, 0.5], [0.45, 0.22], [0.72, 0.25], [0.82, 0.62], [0.55, 0.8], [0.5, 0.5]];
      for (const [x, y] of islands) p.blob(x, y, 0.08, 0.1, Ground.Path, 0.25);
      p.trail([[0, 0.5], [0.25, 0.5]], 2, Ground.Path);
      p.trail([...islands.slice(0, 5), islands[0]], 2, Ground.Stone, Ground.Water);
      p.trail([[0.5, 0.5], [0.45, 0.22]], 2, Ground.Stone, Ground.Water);
    },
    camp: [['rock', 50]],
    route: [[0.08, 0.5], [0.25, 0.5], [0.45, 0.22], [0.72, 0.25], [0.82, 0.62], [0.55, 0.8]],
    scatter: [['tree', 40, 0], ['bush', 20, 0]],
  });
}

/** Fossa Abissal: fundo de pedra escura cortado por fendas e poços de água. */
export function trenchMap(seed = 9): WorldMap {
  return wildMap({
    seed,
    w: 96,
    h: 72,
    decoChance: 0.02,
    paint(p) {
      p.rect(0.06, 0.06, 0.94, 0.94, Ground.Stone);
      p.trail([[0, 0.5], [0.06, 0.5]], 2, Ground.Stone);
      p.river([[0.35, 0.06], [0.4, 0.3], [0.33, 0.45]], 2);
      p.river([[0.6, 0.94], [0.55, 0.7], [0.65, 0.55]], 2);
      p.river([[0.7, 0.1], [0.8, 0.3], [0.94, 0.35]], 2);
      for (const [x, y] of [[0.2, 0.25], [0.8, 0.7], [0.5, 0.45], [0.25, 0.8]] as Frac[]) p.blob(x, y, 0.035, 0.04, Ground.Water, 0.3);
    },
    campGround: Ground.Stone,
    camp: [['rock', 140]],
    route: [[0.1, 0.5], [0.2, 0.15], [0.55, 0.2], [0.88, 0.5], [0.75, 0.88], [0.4, 0.85], [0.45, 0.55]],
    scatter: [['tree', 60, 0]],
  });
}

// ── Mapas de trabalho (profissões) ──────────────────────────────────────────
// Do tamanho da tela (13x9): o personagem entra pela esquerda e vai até o ponto
// de trabalho, de frente para o alvo (rocha, água, árvore, bancada...).

export type Facing = 'down' | 'left' | 'right' | 'up';

/** Cenário em volta da área de trabalho: vila (pátio de pedra), campo ou caverna. */
type Surround = 'village' | 'field' | 'cave';

/** Tamanho dos mapas de produção: maior que o zoom máximo (44 tiles), para afastar sem ver borda. */
const WORK_W = 45;
const WORK_H = 27;
/** A área de trabalho (13x9) fica no meio. */
const INNER_W = 13;
const INNER_H = 9;

const SURROUND_SCATTER: Record<Surround, [ObjectKind, number][]> = {
  village: [
    ['roundTree', 10], ['tree', 7], ['bush', 18], ['barrel', 6], ['crate', 6], ['flowerBox', 8],
    ['bench', 3], ['stall', 2], ['rock', 6], ['woodPile', 4], ['planter', 2],
  ],
  field: [['tree', 9], ['bigTree', 3], ['bush', 20], ['stump', 5], ['log', 4], ['rock', 8], ['produce', 5], ['woodPile', 4], ['reeds', 4]],
  cave: [['caveRock', 45], ['pebbles', 35], ['rubble', 14], ['crystalTall', 6], ['oreBig', 4], ['brazier', 6]],
};

function workMap(opts: {
  seed: number;
  fill: Ground;
  paint?: (p: Painter) => void;
  /** Objetos fixos: [tipo, x, y, variante] (na área de trabalho de 13x9). */
  objects: [ObjectKind, number, number, number?][];
  /** Onde o personagem para, para onde olha e o tile do alvo (onde aparece o "+1"), na área de trabalho. */
  spot: Pt;
  face: Facing;
  target: Pt;
  decoChance?: number;
  floor?: { sheet: string; x: number; y: number };
  /** Cenário em volta (padrão: caverna com chão de caverna, vila com chão de pedra, senão campo). */
  surround?: Surround;
  /** Objetos a mais no cenário em volta: [tipo, quantidade]. */
  extra?: [ObjectKind, number][];
  /**
   * Oficina coberta (forja, fundição): muro de x0..x1 e y0..y1 na área de trabalho, com a face de pedra
   * no fundo (as fornalhas encostam nela e a chaminé chega ao topo do muro), chão de terra dentro e a porta
   * na parede da esquerda, nas linhas `door` e `door + 1`.
   */
  room?: { x0: number; y0: number; x1: number; y1: number; door: number };
}): WorldMap {
  const w0 = INNER_W;
  const h0 = INNER_H;
  const rand = rngFor(opts.seed, 0);
  const g0 = new Uint8Array(w0 * h0).fill(opts.fill);
  opts.paint?.(painter(g0, w0, h0));
  const roomObjs: [ObjectKind, number, number, number?][] = [];
  if (opts.room) {
    const { x0, y0, x1, y1, door } = opts.room;
    // Terra até debaixo do muro (a borda do chão fica escondida pelas paredes).
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g0[y * w0 + x] = Ground.Path;
    // Topo do muro: cantos 2/3 em cima, 4/5 embaixo; reta 0 (horizontal) e 1 (vertical); pontas 6/7/8/9.
    roomObjs.push(['wall', x0, y0, 2], ['wall', x1, y0, 3], ['wall', x0, y1, 4], ['wall', x1, y1, 5]);
    for (let x = x0 + 1; x < x1; x++) roomObjs.push(['wall', x, y0, 0], ['wall', x, y1, 0]);
    for (let y = y0 + 1; y < y1; y++) {
      roomObjs.push(['wall', x1, y, 1]);
      if (y === door - 1) roomObjs.push(['wall', x0, y, 9]);
      else if (y === door + 2) roomObjs.push(['wall', x0, y, 8]);
      else if (y !== door && y !== door + 1) roomObjs.push(['wall', x0, y, 1]);
    }
    // Face de pedra do fundo (2 de altura), logo abaixo do topo.
    for (let x = x0 + 1; x < x1; x++) roomObjs.push(['wallFace', x, y0 + 1, x === x0 + 1 ? 0 : x === x1 - 1 ? 2 : 1]);
  }

  const w = WORK_W;
  const h = WORK_H;
  const ox = Math.floor((w - w0) / 2);
  const oy = Math.floor((h - h0) / 2);
  const surround: Surround = opts.surround ?? (opts.floor ? 'cave' : opts.fill === Ground.Stone ? 'village' : 'field');
  const ground = new Uint8Array(w * h).fill(surround === 'cave' ? Ground.Stone : Ground.Grass);
  const deco = new Uint8Array(w * h);
  const blocked = new Uint8Array(w * h);
  const objects: MapObject[] = [];
  const set = (x: number, y: number, g: Ground) => {
    if (x >= 0 && y >= 0 && x < w && y < h) ground[y * w + x] = g;
  };
  // Caminho de entrada (da esquerda até a área de trabalho, na linha do personagem) e, na vila, o pátio de pedra.
  const row = opts.spot.y + oy;
  const road = surround === 'village' ? Ground.Stone : Ground.Path;
  if (surround !== 'cave') {
    for (let x = 0; x < ox; x++) for (let dy = 0; dy <= 1; dy++) set(x, row + dy, road);
    if (surround === 'village') for (let y = oy - 2; y < oy + h0 + 2; y++) for (let x = ox - 2; x < ox + w0 + 2; x++) set(x, y, Ground.Stone);
  }
  for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) ground[(y + oy) * w + x + ox] = g0[y * w0 + x];
  // O caminho segue pela grama da área de trabalho até o personagem.
  if (surround !== 'cave') for (let x = ox; x < opts.spot.x + ox; x++) for (let dy = 0; dy <= 1; dy++) if (ground[(row + dy) * w + x] === Ground.Grass) set(x, row + dy, road);
  for (let i = 0; i < w * h; i++) {
    if (ground[i] === Ground.Water) blocked[i] = 1;
    else if (ground[i] === Ground.Grass && rand() < (opts.decoChance ?? 0.15)) deco[i] = 1 + Math.floor(rand() * 20);
  }
  const place = (kind: ObjectKind, x: number, y: number, variant: number) => {
    objects.push({ kind, x, y, variant });
    for (const [bx, by] of OBJECTS[kind].block) {
      if (x + bx >= 0 && y + by >= 0 && x + bx < w && y + by < h) blocked[(y + by) * w + x + bx] = 1;
    }
  };
  for (const [kind, x, y, variant] of [...roomObjs, ...opts.objects]) place(kind, x + ox, y + oy, variant ?? 0);

  // Cenário sorteado (semente fixa): longe da área de trabalho e do caminho, sem um objeto em cima do outro.
  const used = new Uint8Array(w * h);
  // Caverna: contorno de rochas nas bordas (com falhas), como nos mapas de mineração.
  if (surround === 'cave') {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (edge > 1 || (x < 2 && y >= row - 1 && y <= row + 1) || rand() > (edge === 0 ? 0.85 : 0.45)) continue;
        used[y * w + x] = 1;
        place('caveRock', x, y, Math.floor(rand() * OBJECTS.caveRock.variants.length));
      }
  }
  const free = (x: number, y: number, ow: number, oh: number) => {
    if (x < 0 || y < 0 || x + ow > w || y + oh > h) return false;
    if (x + ow > ox - 3 && x < ox + w0 + 3 && y + oh > oy - 3 && y < oy + h0 + 3) return false;
    if (x < ox && y + oh > row - 2 && y < row + 4) return false;
    for (let yy = y; yy < y + oh; yy++) for (let xx = x; xx < x + ow; xx++) if (used[yy * w + xx]) return false;
    return true;
  };
  for (const [kind, count] of [...SURROUND_SCATTER[surround], ...(opts.extra ?? [])]) {
    const def = OBJECTS[kind];
    for (let n = 0, tries = 0; n < count && tries < count * 40; tries++) {
      const x = Math.floor(rand() * (w - def.w + 1));
      const y = Math.floor(rand() * (h - def.h + 1));
      if (!free(x, y, def.w, def.h)) continue;
      for (let yy = y; yy < y + def.h; yy++) for (let xx = x; xx < x + def.w; xx++) used[yy * w + xx] = 1;
      place(kind, x, y, Math.floor(rand() * def.variants.length));
      n++;
    }
  }
  objects.sort((a, b) => a.y + OBJECTS[a.kind].h - (b.y + OBJECTS[b.kind].h));
  const shift = (p: Pt) => ({ x: p.x + ox, y: p.y + oy });
  return {
    w,
    h,
    ground,
    deco,
    blocked,
    objects,
    start: { x: 0, y: row },
    route: [],
    work: { spot: shift(opts.spot), face: opts.face, target: shift(opts.target) },
    floor: opts.floor,
  };
}

/** Forja: oficina de pedra com duas fornalhas no fundo e a bigorna no meio. */
export function forgeMap(): WorldMap {
  return workMap({
    seed: 104,
    fill: Ground.Stone,
    room: { x0: 1, y0: 0, x1: 11, y1: 8, door: 5 },
    objects: [
      ['hearth', 2, 1, 1], ['hearth', 7, 1, 0],
      ['anvil', 6, 5, 0], ['barrel', 2, 6, 0], ['barrel', 3, 6, 1], ['crate', 9, 5, 0], ['barrel', 10, 5, 2], ['crate', 9, 6, 3],
    ],
    extra: [['barrel', 3], ['crate', 3]],
    spot: { x: 5, y: 5 },
    face: 'right',
    target: { x: 6, y: 5 },
  });
}

/** Cozinha: oficina de pedra com o fogão de tijolo no fundo e as bancas de comida. */
export function kitchenMap(): WorldMap {
  return workMap({
    seed: 105,
    fill: Ground.Stone,
    surround: 'village',
    room: { x0: 1, y0: 0, x1: 11, y1: 8, door: 5 },
    objects: [
      ['hearth', 6, 1, 1],
      ['produce', 2, 3, 0], ['produce', 3, 3, 1], ['produce', 4, 3, 0], ['barrel', 9, 3, 0], ['crate', 10, 3, 2],
      ['barrel', 10, 6, 1], ['crate', 9, 6, 0], ['produce', 3, 6, 1], ['barrel', 2, 6, 2],
    ],
    extra: [['produce', 6], ['barrel', 3], ['stall', 2]],
    spot: { x: 7, y: 5 },
    face: 'up',
    target: { x: 7, y: 4 },
  });
}

/** Oficina: chão de terra com toras, tocos e caixotes de material. */
export function workshopMap(): WorldMap {
  return workMap({
    seed: 106,
    fill: Ground.Path,
    objects: [
      ['log', 2, 1], ['log', 8, 1], ['stump', 7, 3, 0], ['crate', 10, 4, 1], ['crate', 11, 4, 3],
      ['barrel', 2, 6, 2], ['stump', 4, 5, 1], ['tree', 10, 5], ['bush', 0, 1, 1],
    ],
    extra: [['log', 3], ['stump', 3], ['woodChips', 6]],
    spot: { x: 6, y: 4 },
    face: 'right',
    target: { x: 7, y: 4 },
  });
}

// ── Um mapa para cada ponto de coleta ───────────────────────────────────────
// Maiores que a tela (27x17): o alvo fica no meio, o personagem entra pela
// esquerda por um corredor livre, e o resto é cenário espalhado com semente fixa.

type Place = [ObjectKind, number, number?];

interface GatherStyle {
  seed: number;
  fill: Ground;
  theme?: Theme;
  floor?: { sheet: string; x: number; y: number };
  paint?: (p: Painter) => void;
  /** Contorno: rochas de caverna ou árvores. */
  border?: 'rock' | 'trees';
  /** O objeto alvo e onde fica (canto do objeto); null = água. */
  target: { kind: ObjectKind; variant?: number; x: number; y: number } | null;
  /** Onde o personagem fica, para onde olha e o tile do alvo (onde aparece o "+1"). */
  spot: Pt;
  face: Facing;
  at: Pt;
  /** Composição: objetos em posição fixa [tipo, x, y, variante] (antes do sorteio). */
  fixed?: [ObjectKind, number, number, number?][];
  /** Cenário: [tipo, quantidade, variante]. */
  scatter: Place[];
  decoChance?: number;
}

const GW = 27;
const GH = 17;

function gatherMap(s: GatherStyle): WorldMap {
  const w = GW;
  const h = GH;
  const rand = rngFor(s.seed, 1);
  const ground = new Uint8Array(w * h).fill(s.fill);
  const deco = new Uint8Array(w * h);
  const blocked = new Uint8Array(w * h);
  const objects: MapObject[] = [];
  s.paint?.(painter(ground, w, h));
  // Corredor da entrada até o ponto e uma folga em volta do personagem.
  const keep = new Uint8Array(w * h);
  const mark = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < w && y < h) keep[y * w + x] = 1;
  };
  for (let x = 0; x <= s.spot.x; x++) for (let y = s.spot.y - 1; y <= s.spot.y + 1; y++) mark(x, y);
  for (let y = s.spot.y - 2; y <= s.spot.y + 2; y++) for (let x = s.spot.x - 2; x <= s.spot.x + 1; x++) mark(x, y);
  const dry = s.fill === Ground.Water ? Ground.Stone : s.fill;
  for (let x = 0; x <= s.spot.x; x++) if (ground[s.spot.y * w + x] === Ground.Water) ground[s.spot.y * w + x] = dry;
  for (let i = 0; i < w * h; i++) {
    if (ground[i] === Ground.Water) blocked[i] = 1;
    else if (ground[i] === Ground.Grass && !s.theme && rand() < (s.decoChance ?? 0.12)) deco[i] = 1 + Math.floor(rand() * 20);
  }
  const fits = (kind: ObjectKind, x: number, y: number) =>
    OBJECTS[kind].block.every(([bx, by]) => {
      const X = x + bx;
      const Y = y + by;
      if (X < 0 || Y < 0 || X >= w || Y >= h) return false;
      const i = Y * w + X;
      return !keep[i] && !blocked[i] && ground[i] !== Ground.Water;
    });
  const put = (kind: ObjectKind, x: number, y: number, variant = 0) => {
    objects.push({ kind, x, y, variant });
    for (const [bx, by] of OBJECTS[kind].block) {
      const X = x + bx;
      const Y = y + by;
      if (X >= 0 && Y >= 0 && X < w && Y < h) blocked[Y * w + X] = 1;
    }
  };
  if (s.target) put(s.target.kind, s.target.x, s.target.y, s.target.variant ?? 0);
  for (const [kind, x, y, variant] of s.fixed ?? []) if (fits(kind, x, y)) put(kind, x, y, variant ?? 0);
  // Contorno (a entrada da esquerda fica aberta pelo corredor).
  if (s.border === 'rock') {
    for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (fits('caveRock', x, y)) put('caveRock', x, y, (x + y) % 5);
    for (let y = 1; y < h - 1; y++) for (const x of [0, w - 1]) if (fits('caveRock', x, y)) put('caveRock', x, y, (x + y) % 5);
  } else if (s.border === 'trees') {
    for (let x = -1; x < w; x += 2) {
      if (fits('tree', x, -2)) put('tree', x, -2);
      if (fits('tree', x, h - 3)) put('tree', x, h - 3);
    }
    for (let y = 1; y < h - 3; y += 2) {
      if (fits('tree', -1, y)) put('tree', -1, y);
      if (fits('tree', w - 2, y)) put('tree', w - 2, y);
    }
  }
  for (const [kind, count, variant] of s.scatter) {
    const vs = OBJECTS[kind].variants.length;
    for (let n = 0, tries = 0; n < count && tries < count * 40; tries++) {
      const x = Math.floor(rand() * (w + 2)) - 1;
      const y = Math.floor(rand() * (h + 2)) - 2;
      if (!fits(kind, x, y)) continue;
      put(kind, x, y, variant ?? Math.floor(rand() * vs));
      n++;
    }
  }
  objects.sort((a, b) => a.y + OBJECTS[a.kind].h - (b.y + OBJECTS[b.kind].h));
  return {
    w,
    h,
    ground,
    deco,
    blocked,
    objects,
    start: { x: 0, y: s.spot.y },
    route: [],
    theme: s.theme,
    floor: s.floor,
    work: { spot: s.spot, face: s.face, target: s.at },
  };
}

// O personagem no meio, olhando para a direita (rocha, água, planta) ou para cima (árvore).
const RIGHT = { spot: { x: 12, y: 8 }, face: 'right' as Facing, at: { x: 13, y: 8 } };
const UP = { spot: { x: 13, y: 9 }, face: 'up' as Facing, at: { x: 13, y: 8 } };
const ore = (variant: number) => ({ kind: 'oreBig' as ObjectKind, variant, x: 13, y: 7 });
const tree = { kind: 'tree' as ObjectKind, x: 12, y: 5 };
const bigTree = { kind: 'bigTree' as ObjectKind, x: 11, y: 3 };
const plant = (variant: number) => ({ kind: 'bush' as ObjectKind, variant, x: 13, y: 8 });
const CAVE_FLOOR = { sheet: 'tileA5_cave', x: 1, y: 0 };
/** Água do lado direito, a partir da coluna do alvo. */
const shore = (from = 13) => (p: Painter) => p.rect(from / GW, 0, 1, 1, Ground.Water);

const GATHER: Record<string, () => WorldMap> = {
  // Mineração
  // Galeria de mina escavada na rocha: corredor da entrada com trilha e braseiros, a câmara do
  // veio, o poço do túnel ao fundo e uma alcova de suprimentos. Fora disso, rocha maciça (escuro).
  copper_vein: () =>
    gatherMap({ seed: 201, fill: Ground.Water, theme: THEMES.cave, target: ore(0), ...RIGHT,
      paint: (p) => {
        p.rect(0, 6 / 17, 14 / 27, 11 / 17, Ground.Grass);
        p.rect(0, 8 / 17, 13 / 27, 9 / 17, Ground.Path);
        p.blob(17 / 27, 8.5 / 17, 0.2, 0.36, Ground.Grass, 0.1);
        p.rect(11 / 27, 2 / 17, 16 / 27, 7 / 17, Ground.Grass);
        p.rect(2 / 27, 10 / 17, 8 / 27, 15 / 17, Ground.Grass);
      },
      fixed: [
        ['mineTunnel', 12, 2], ['brazier', 11, 3], ['brazier', 15, 3],
        ['brazier', 3, 5], ['brazier', 8, 5], ['brazier', 5, 10],
        ['crate', 2, 12, 0], ['crate', 3, 12, 2], ['barrel', 2, 13, 1], ['barrel', 6, 13, 0], ['crate', 7, 12, 3],
        ['oreBig', 18, 5, 0], ['oreBig', 19, 10, 0], ['oreBig', 22, 7, 0],
        ['rubble', 16, 9, 0], ['rubble', 16, 6, 1], ['rubble', 20, 9, 2], ['rubble', 14, 11, 0], ['rubble', 4, 14, 1],
      ],
      scatter: [] }),
  // Estanho: túnel estreito e sinuoso que desemboca numa câmara pequena; carrinho de suprimentos na entrada.
  tin_vein: () =>
    gatherMap({ seed: 202, fill: Ground.Water, theme: THEMES.cave, target: ore(1), ...RIGHT,
      paint: (p) => {
        p.rect(0, 7 / 17, 14 / 27, 10 / 17, Ground.Grass);
        p.rect(0, 8 / 17, 12 / 27, 9 / 17, Ground.Path);
        p.blob(16 / 27, 8.5 / 17, 0.13, 0.26, Ground.Grass, 0.12);
        p.rect(3 / 27, 3 / 17, 7 / 27, 8 / 17, Ground.Grass);
        p.rect(17 / 27, 9 / 17, 20 / 27, 15 / 17, Ground.Grass);
      },
      fixed: [
        ['crate', 3, 4, 1], ['crate', 4, 4, 0], ['barrel', 6, 4, 2], ['brazier', 5, 3],
        ['brazier', 9, 6], ['brazier', 15, 4], ['mineTunnel', 17, 12],
        ['oreBig', 17, 6, 1], ['oreBig', 14, 10, 1],
        ['rubble', 16, 9, 1], ['rubble', 10, 9, 0], ['rubble', 18, 10, 2],
      ],
      scatter: [] }),
  // Ferro: duas câmaras ligadas por um corredor largo, a de baixo com os carrinhos de minério.
  iron_vein: () =>
    gatherMap({ seed: 203, fill: Ground.Water, theme: THEMES.cave, target: ore(0), ...RIGHT,
      paint: (p) => {
        p.rect(0, 6 / 17, 15 / 27, 11 / 17, Ground.Grass);
        p.rect(0, 8 / 17, 12 / 27, 9 / 17, Ground.Path);
        p.blob(17 / 27, 6 / 17, 0.17, 0.28, Ground.Grass, 0.12);
        p.blob(8 / 27, 12.5 / 17, 0.2, 0.2, Ground.Grass, 0.12);
        p.rect(20 / 27, 3 / 17, 25 / 27, 9 / 17, Ground.Grass);
      },
      fixed: [
        ['oreBig', 17, 3, 0], ['oreBig', 21, 4, 0], ['oreBig', 22, 7, 0], ['oreBig', 16, 9, 0],
        ['brazier', 4, 5], ['brazier', 10, 5], ['brazier', 19, 2],
        ['crate', 4, 12, 0], ['crate', 5, 12, 1], ['barrel', 9, 13, 0], ['barrel', 10, 13, 1], ['crate', 11, 12, 2],
        ['rubble', 15, 7, 0], ['rubble', 19, 6, 2], ['rubble', 7, 11, 1], ['rubble', 23, 6, 0],
      ],
      scatter: [] }),
  // Carvão: galeria longa e cheia de entulho, iluminada por muitos braseiros; o carvão é o veio escuro.
  coal_seam: () =>
    gatherMap({ seed: 204, fill: Ground.Water, theme: THEMES.cave, target: ore(1), ...RIGHT,
      paint: (p) => {
        p.rect(0, 6 / 17, 25 / 27, 11 / 17, Ground.Grass);
        p.rect(0, 8 / 17, 12 / 27, 9 / 17, Ground.Path);
        p.rect(20 / 27, 2 / 17, 25 / 27, 6 / 17, Ground.Grass);
      },
      fixed: [
        ['brazier', 2, 5], ['brazier', 6, 5], ['brazier', 10, 5], ['brazier', 16, 5], ['brazier', 2, 10], ['brazier', 10, 10],
        ['oreBig', 17, 9, 1], ['oreBig', 20, 7, 1], ['oreBig', 22, 9, 1], ['mineTunnel', 21, 2],
        ['barrel', 5, 10, 0], ['barrel', 6, 10, 1], ['crate', 7, 10, 2],
        ['rubble', 15, 7, 0], ['rubble', 16, 8, 1], ['rubble', 19, 10, 2], ['rubble', 23, 7, 0], ['rubble', 8, 7, 1], ['rubble', 4, 9, 2],
      ],
      scatter: [] }),
  // Mithril: caverna funda onde o veio brilha entre cristais e gemas.
  mithril_vein: () =>
    gatherMap({ seed: 205, fill: Ground.Water, theme: THEMES.cave, target: ore(1), ...RIGHT,
      paint: (p) => {
        p.rect(0, 7 / 17, 13 / 27, 10 / 17, Ground.Grass);
        p.blob(17 / 27, 8.5 / 17, 0.26, 0.42, Ground.Stone, 0.1);
        p.blob(17 / 27, 8.5 / 17, 0.12, 0.2, Ground.Grass, 0.1);
      },
      fixed: [
        ['crystalTall', 14, 4, 0], ['crystalTall', 19, 4, 1], ['crystalTall', 22, 7, 0], ['crystalTall', 20, 11, 1], ['crystalTall', 14, 11, 0],
        ['gemCluster', 16, 5, 0], ['gemCluster', 21, 9, 1], ['gemCluster', 17, 11, 2], ['gemCluster', 23, 6, 1],
        ['oreBig', 18, 7, 1], ['brazier', 6, 6], ['brazier', 10, 6],
        ['rubble', 15, 9, 0], ['rubble', 11, 9, 1],
      ],
      scatter: [] }),
  // Adamantita: galeria quente aberta sobre a lava, com braseiros e cristais vermelhos.
  adamant_vein: () =>
    gatherMap({ seed: 206, fill: Ground.Water, theme: THEMES.volcano, target: ore(0), ...RIGHT,
      paint: (p) => {
        p.rect(0, 6 / 17, 15 / 27, 11 / 17, Ground.Stone);
        p.rect(0, 8 / 17, 12 / 27, 9 / 17, Ground.Path);
        p.blob(17 / 27, 8.5 / 17, 0.18, 0.34, Ground.Stone, 0.14);
        p.rect(4 / 27, 2 / 17, 8 / 27, 7 / 17, Ground.Stone);
      },
      fixed: [
        ['oreBig', 18, 5, 0], ['oreBig', 19, 10, 0], ['crystalTall', 21, 7, 0], ['crystalTall', 16, 11, 0],
        ['brazier', 3, 5], ['brazier', 9, 5], ['brazier', 3, 10], ['brazier', 9, 10], ['mineTunnel', 5, 2],
        ['rubble', 15, 7, 1], ['rubble', 17, 9, 0], ['rubble', 11, 10, 2],
      ],
      scatter: [] }),
  // Pedreira rúnica: corte em degraus na rocha, blocos de Pedra Rúnica e lápides com as runas.
  rune_stone_vein: () =>
    gatherMap({ seed: 207, fill: Ground.Water, theme: THEMES.cave, target: { kind: 'runeRock', x: 13, y: 7 }, ...RIGHT,
      paint: (p) => {
        p.rect(0, 6 / 17, 24 / 27, 12 / 17, Ground.Grass);
        p.rect(0, 8 / 17, 12 / 27, 9 / 17, Ground.Path);
        p.rect(15 / 27, 3 / 17, 24 / 27, 6 / 17, Ground.Stone);
      },
      fixed: [
        ['runeRock', 17, 4], ['runeRock', 20, 4], ['runeRock', 17, 9], ['runeRock', 20, 9],
        ['runeTablet', 3, 6], ['runeTablet', 7, 6], ['runeTablet', 3, 10], ['runeTablet', 7, 10],
        ['runeCrystal', 23, 7, 0], ['runeCrystal', 16, 7, 1], ['runeCrystal', 22, 11, 2],
        ['crate', 10, 11, 0], ['barrel', 11, 11, 1], ['brazier', 10, 5],
      ],
      scatter: [] }),
  // Pedra Rúnica Pura: o santuário escavado em volta da Pedra Gigante, cercado de lápides rúnicas.
  pure_rune_vein: () =>
    gatherMap({ seed: 208, fill: Ground.Water, theme: THEMES.cave, target: { kind: 'runeRock', x: 13, y: 7 }, ...RIGHT,
      paint: (p) => {
        p.rect(0, 7 / 17, 13 / 27, 10 / 17, Ground.Path);
        p.blob(18 / 27, 8.5 / 17, 0.24, 0.42, Ground.Stone, 0.08);
      },
      fixed: [
        ['giantRock', 17, 4], ['runeTablet', 15, 3], ['runeTablet', 22, 3], ['runeTablet', 15, 12], ['runeTablet', 22, 12],
        ['runeCrystal', 14, 5, 0], ['runeCrystal', 23, 6, 1], ['runeCrystal', 14, 11, 2], ['runeCrystal', 23, 10, 0],
        ['runeRock', 20, 10], ['brazier', 5, 6], ['brazier', 10, 6], ['brazier', 5, 10], ['brazier', 10, 10],
      ],
      scatter: [] }),
  // Lenhador
  // Árvore: acampamento de lenhador na clareira: tocos das árvores já cortadas, lenha empilhada e cavacos.
  tree: () =>
    gatherMap({ seed: 211, fill: Ground.Grass, border: 'trees', target: tree, ...UP,
      paint: (p) => {
        p.trail([[0, 9 / GH], [0.5, 9 / GH]], 2, Ground.Path);
        p.blob(0.5, 0.6, 0.2, 0.3, Ground.Path, 0.2);
      },
      fixed: [
        ['stump', 6, 3, 0], ['stump', 17, 4, 1], ['stump', 19, 10, 2], ['stump', 7, 12, 0],
        ['woodPile', 9, 11, 0], ['woodPile', 10, 11, 1], ['woodPile', 9, 12, 1], ['log', 16, 12],
        ['woodChips', 12, 10, 0], ['woodChips', 15, 9, 1], ['woodChips', 11, 8, 2], ['sign', 3, 8, 0], ['crate', 4, 11, 1],
      ],
      scatter: [['bush', 5]] }),
  // Carvalho: serraria no bosque, com toras prontas e pilhas de lenha ao lado do carvalho grande.
  oak: () =>
    gatherMap({ seed: 212, fill: Ground.Grass, border: 'trees', target: bigTree, ...UP,
      paint: (p) => p.trail([[0, 9 / GH], [0.5, 9 / GH]], 2, Ground.Path),
      fixed: [
        ['log', 4, 11], ['log', 4, 13], ['woodPile', 8, 12, 0], ['woodPile', 9, 12, 1], ['woodPile', 8, 13, 1],
        ['stump', 18, 11, 0], ['stump', 20, 6, 1], ['woodChips', 12, 10, 0], ['woodChips', 15, 10, 2], ['tree', 18, 1], ['tree', 3, 2],
      ],
      scatter: [['bush', 5]] }),
  // Salgueiro: beira de lago com taboas, o salgueiro na margem e um tronco caído.
  willow: () =>
    gatherMap({ seed: 213, fill: Ground.Grass, border: 'trees', target: tree, ...UP,
      paint: (p) => {
        p.blob(0.8, 0.5, 0.16, 0.36, Ground.Water, 0.2);
        p.trail([[0, 9 / GH], [0.5, 9 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['reeds', 18, 4, 0], ['reeds', 18, 11, 0], ['reeds', 24, 13, 0], ['log', 5, 12], ['stump', 7, 4, 2],
        ['woodPile', 10, 12, 0], ['woodChips', 12, 10, 1], ['rock', 17, 8, 0], ['tree', 3, 1],
      ],
      scatter: [['bush', 6]] }),
  // Teixo: trilha de terra na floresta escura, tocos antigos e a madeira empilhada para levar.
  yew: () =>
    gatherMap({ seed: 214, fill: Ground.Grass, border: 'trees', target: bigTree, ...UP,
      paint: (p) => p.trail([[0, 9 / GH], [0.5, 9 / GH], [0.5, 1]], 2, Ground.Path),
      fixed: [
        ['bigTree', 17, 1], ['bigTree', 1, 0], ['stump', 5, 11, 1], ['stump', 19, 11, 0], ['log', 8, 13],
        ['woodPile', 10, 11, 0], ['woodPile', 10, 12, 1], ['woodChips', 12, 10, 2], ['woodChips', 14, 9, 0],
      ],
      scatter: [['bush', 4]] }),
  // Árvore Anciã: clareira sagrada de pedra em volta da árvore, cercada de cristais.
  ancient_tree: () =>
    gatherMap({ seed: 215, fill: Ground.Grass, border: 'trees', target: bigTree, ...UP,
      paint: (p) => {
        p.blob(0.5, 0.5, 0.22, 0.34, Ground.Stone, 0.1);
        p.trail([[0, 9 / GH], [0.32, 9 / GH]], 2, Ground.Path);
      },
      fixed: [
        ['crystalTall', 8, 3, 0], ['crystalTall', 18, 3, 1], ['crystalTall', 8, 11, 1], ['crystalTall', 18, 11, 0],
        ['crystalTall', 6, 7, 0], ['crystalTall', 20, 7, 1], ['woodChips', 12, 10, 0], ['woodChips', 15, 10, 1],
      ],
      scatter: [['bush', 6]] }),
  // Pesca
  // Camarão: praia com faixa de areia, o cais de madeira entrando no mar e as redes (barris e caixotes).
  shrimp_spot: () =>
    gatherMap({ seed: 221, fill: Ground.Grass, target: null, ...RIGHT,
      paint: (p) => {
        p.rect(9 / GW, 0, 13 / GW, 1, Ground.Path);
        p.rect(13 / GW, 0, 1, 1, Ground.Water);
      },
      fixed: [
        ['dock', 13, 3], ['dock', 13, 11], ['barrel', 10, 4, 0], ['barrel', 11, 4, 1], ['crate', 10, 11, 0], ['crate', 11, 12, 2],
        ['sign', 8, 6, 1], ['tree', 1, 1], ['tree', 4, 11], ['tree', 0, 12], ['bush', 6, 3, 0], ['bush', 7, 13, 1], ['log', 4, 5],
      ],
      scatter: [['bush', 4]] }),
  // Truta: lago na mata, com pedras e toras na beira e o personagem pescando da margem.
  trout_spot: () =>
    gatherMap({ seed: 222, fill: Ground.Grass, border: 'trees', target: null, ...RIGHT,
      paint: (p) => {
        p.blob(19 / GW, 8.5 / GH, 0.24, 0.36, Ground.Water, 0.12);
        p.trail([[0, 8.5 / GH], [12 / GW, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['rock', 14, 3, 0], ['rock', 24, 5, 1], ['rock', 15, 13, 2], ['rock', 23, 12, 0], ['log', 8, 11], ['stump', 9, 4, 0],
        ['bush', 13, 5, 1], ['bush', 13, 11, 2], ['tree', 5, 2], ['tree', 4, 10],
      ],
      scatter: [['bush', 6]] }),
  // Salmão: corredeira entre as árvores, com pedras nas margens e um tronco caído.
  salmon_spot: () =>
    gatherMap({ seed: 223, fill: Ground.Grass, border: 'trees', target: null, ...RIGHT,
      paint: (p) => {
        p.river([[15 / GW, 0], [16 / GW, 0.5], [15 / GW, 1]], 5);
        p.trail([[0, 8.5 / GH], [12 / GW, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['rock', 12, 3, 0], ['rock', 12, 13, 1], ['rock', 19, 4, 2], ['rock', 19, 12, 0], ['rock', 20, 8, 1],
        ['log', 6, 12], ['stump', 7, 4, 1], ['tree', 3, 2], ['tree', 22, 2], ['tree', 22, 11],
      ],
      scatter: [['bush', 6]] }),
  // Lagosta: vila de pescadores: cais, caixotes e barris de lagosta empilhados na areia.
  lobster_spot: () =>
    gatherMap({ seed: 224, fill: Ground.Path, target: null, ...RIGHT,
      paint: (p) => {
        p.rect(0, 0, 6 / GW, 1, Ground.Grass);
        p.rect(13 / GW, 0, 1, 1, Ground.Water);
      },
      fixed: [
        ['dock', 13, 2], ['dock', 13, 11], ['dock', 17, 2],
        ['crate', 8, 3, 0], ['crate', 9, 3, 1], ['crate', 8, 4, 2], ['barrel', 10, 4, 0], ['barrel', 11, 3, 1],
        ['crate', 8, 12, 3], ['barrel', 9, 12, 2], ['barrel', 10, 12, 0], ['sign', 7, 6, 2], ['pot', 11, 11, 0],
        ['tree', 0, 1], ['tree', 1, 11], ['bush', 4, 6, 0],
      ],
      scatter: [] }),
  // Atum: mar aberto; um píer de pedra longo até o ponto, com cais de madeira e barris no fim.
  tuna_spot: () =>
    gatherMap({ seed: 225, fill: Ground.Water, target: null, ...RIGHT,
      paint: (p) => {
        p.rect(0, 0, 4 / GW, 1, Ground.Path);
        p.rect(4 / GW, 7 / GH, 13 / GW, 10 / GH, Ground.Stone);
      },
      // Sem cais solto na água: o personagem pesca da ponta do píer de pedra.
      fixed: [['barrel', 10, 7, 0], ['barrel', 11, 9, 1], ['crate', 5, 9, 0], ['sign', 4, 7, 0], ['barrel', 1, 3, 2], ['crate', 1, 13, 1]],
      scatter: [] }),
  // Tubarão: ilhotas de pedra no mar, o passadiço até a ponta e o cais.
  shark_spot: () =>
    gatherMap({ seed: 226, fill: Ground.Water, target: null, ...RIGHT,
      paint: (p) => {
        p.rect(0, 0, 3 / GW, 1, Ground.Path);
        p.trail([[0, 0.5], [12 / GW, 0.5]], 2, Ground.Stone);
        for (const [x, y] of [[0.3, 0.2], [0.75, 0.25], [0.7, 0.8], [0.3, 0.82]] as Frac[]) p.blob(x, y, 0.08, 0.12, Ground.Path, 0.3);
      },
      // Sem cais solto na água: o personagem pesca da ponta do passadiço.
      fixed: [['rock', 7, 2, 0], ['rock', 9, 3, 1], ['rock', 19, 3, 2], ['rock', 18, 13, 0], ['rock', 8, 13, 1], ['barrel', 10, 7, 0], ['crate', 1, 3, 0]],
      scatter: [] }),
  // Enguia: brejo escuro na mata fechada, água parada entre tocos e troncos podres.
  eel_spot: () =>
    gatherMap({ seed: 227, fill: Ground.Grass, border: 'trees', target: null, ...RIGHT, decoChance: 0.02,
      paint: (p) => {
        p.blob(18 / GW, 8.5 / GH, 0.2, 0.34, Ground.Water, 0.25);
        p.blob(6 / GW, 13 / GH, 0.08, 0.1, Ground.Water, 0.3);
        p.trail([[0, 8.5 / GH], [12 / GW, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['stump', 14, 4, 2], ['stump', 22, 12, 0], ['log', 13, 12], ['log', 21, 3], ['bigTree', 3, 1], ['rock', 9, 5, 1], ['rock', 9, 12, 2],
      ],
      scatter: [['bush', 6, 2]] }),
  // Herbalismo
  // Erva Verde: horta cercada nos Campos do Bastião, com fileiras de canteiros e caminho de terra.
  green_herb_patch: () =>
    gatherMap({ seed: 231, fill: Ground.Grass, target: plant(0), ...RIGHT,
      paint: (p) => {
        p.rect(9 / GW, 3 / GH, 21 / GW, 14 / GH, Ground.Path);
        p.trail([[0, 8.5 / GH], [0.35, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['fence', 10, 2, 0], ['fence', 10, 14, 0], ['fence', 12, 2, 0], ['fence', 12, 14, 0], ['fence', 14, 2, 0], ['fence', 14, 14, 0], ['fence', 16, 2, 0], ['fence', 16, 14, 0], ['fence', 18, 2, 0], ['fence', 18, 14, 0], ['fence', 20, 2, 0], ['fence', 20, 14, 0],
        ['bush', 15, 4, 0], ['bush', 15, 6, 0], ['bush', 15, 10, 0], ['bush', 15, 12, 0], ['bush', 17, 4, 0], ['bush', 17, 6, 0], ['bush', 17, 10, 0], ['bush', 17, 12, 0], ['bush', 19, 4, 0], ['bush', 19, 6, 0], ['bush', 19, 10, 0], ['bush', 19, 12, 0],
        ['produce', 10, 4, 0], ['produce', 10, 11, 1], ['sign', 8, 7, 3], ['pot', 11, 4, 2], ['tree', 1, 1], ['tree', 2, 11],
      ],
      scatter: [['bush', 4, 1]] }),
  // Raízes Douradas: clareira úmida no bosque, raízes entre troncos caídos e tocos.
  golden_root_patch: () =>
    gatherMap({ seed: 232, fill: Ground.Grass, border: 'trees', target: plant(2), ...RIGHT,
      paint: (p) => p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path),
      fixed: [
        ['bush', 15, 6, 2], ['bush', 16, 10, 2], ['bush', 18, 8, 2], ['bush', 14, 11, 2], ['bush', 17, 5, 2],
        ['log', 19, 11], ['log', 6, 12], ['stump', 20, 4, 0], ['stump', 6, 4, 1], ['rock', 21, 8, 1],
      ],
      scatter: [['bush', 4, 1]] }),
  // Jardim de Sangue: canteiro esquecido no Cemitério Velho, entre lápides e cruzes.
  blood_flower_patch: () =>
    gatherMap({ seed: 233, fill: Ground.Grass, border: 'trees', target: plant(3), ...RIGHT,
      paint: (p) => p.rect(0, 7 / GH, 0.8, 10 / GH, Ground.Path),
      fixed: [
        ['gravestone', 4, 3, 1], ['gravestone', 4, 11, 1], ['gravestone', 7, 3, 0], ['gravestone', 7, 11, 0], ['gravestone', 16, 3, 1], ['gravestone', 16, 11, 1], ['gravestone', 19, 3, 0], ['gravestone', 19, 11, 0],
        ['cross', 10, 3], ['cross', 10, 11], ['bush', 15, 7, 3], ['bush', 16, 10, 3], ['bush', 14, 6, 3], ['bush', 17, 7, 3],
      ],
      scatter: [['rock', 3]] }),
  // Clareira Lunar: lago iluminado pela lua, trevos entre cristais e taboas.
  moon_clover_patch: () =>
    gatherMap({ seed: 234, fill: Ground.Grass, border: 'trees', target: plant(1), ...RIGHT,
      paint: (p) => {
        p.blob(0.78, 0.3, 0.1, 0.16, Ground.Water, 0.3);
        p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['crystalTall', 15, 10, 0], ['crystalTall', 9, 4, 1], ['crystalTall', 6, 11, 0], ['reeds', 18, 2, 0], ['reeds', 23, 7, 0],
        ['bush', 15, 7, 1], ['bush', 14, 9, 1], ['bush', 16, 8, 1], ['bigTree', 1, 0],
      ],
      scatter: [['bush', 4, 1]] }),
  // Lago do Abismo: lagoa escura num pântano, lótus entre taboas e cristais do vazio.
  abyss_lotus_patch: () =>
    gatherMap({ seed: 235, fill: Ground.Grass, border: 'trees', target: plant(1), ...RIGHT, decoChance: 0.02,
      paint: (p) => {
        p.blob(0.76, 0.5, 0.16, 0.36, Ground.Water, 0.22);
        p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['reeds', 16, 3, 0], ['reeds', 16, 12, 0], ['reeds', 24, 13, 0], ['voidCrystal', 9, 4, 0], ['voidCrystal', 8, 11, 0],
        ['stump', 4, 3, 2], ['log', 4, 12], ['bush', 14, 6, 1], ['bush', 14, 10, 1],
      ],
      scatter: [] }),
  // Jardim Espectral: flores fantasmas entre os túmulos, num cemitério cercado.
  ghost_bloom_patch: () =>
    gatherMap({ seed: 236, fill: Ground.Grass, border: 'trees', target: plant(1), ...RIGHT,
      paint: (p) => p.rect(0, 7 / GH, 0.85, 10 / GH, Ground.Path),
      fixed: [
        ['gravestone', 4, 3, 1], ['gravestone', 4, 11, 1], ['gravestone', 6, 3, 1], ['gravestone', 6, 11, 1], ['gravestone', 8, 3, 1], ['gravestone', 8, 11, 1], ['gravestone', 16, 3, 1], ['gravestone', 16, 11, 1], ['gravestone', 18, 3, 1], ['gravestone', 18, 11, 1], ['gravestone', 20, 3, 1], ['gravestone', 20, 11, 1],
        ['sarcophagus', 22, 7, 1], ['ossuary', 2, 13], ['bush', 15, 7, 1], ['bush', 14, 10, 1], ['bush', 16, 6, 1],
      ],
      scatter: [] }),
  // Pântano de Fogo: lagos de lava na rocha vulcânica, os lótus crescendo na beira.
  fire_lotus_patch: () =>
    gatherMap({ seed: 237, fill: Ground.Stone, theme: THEMES.volcano, target: plant(3), ...RIGHT,
      paint: (p) => {
        p.blob(0.78, 0.3, 0.14, 0.2, Ground.Water, 0.25);
        p.blob(0.75, 0.78, 0.14, 0.18, Ground.Water, 0.25);
        p.blob(0.2, 0.2, 0.1, 0.12, Ground.Water, 0.3);
        p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [['bush', 15, 7, 3], ['bush', 16, 10, 3], ['bush', 14, 6, 3], ['crystalTall', 9, 4, 0], ['crystalTall', 8, 11, 0], ['caveRock', 22, 8, 1], ['caveRock', 5, 11, 2]],
      scatter: [] }),
  // Fenda do Vazio: chão de pedra rachado, orquídeas entre os cristais e corais do vazio.
  void_orchid_patch: () =>
    gatherMap({ seed: 238, fill: Ground.Stone, theme: THEMES.cave, target: plant(1), ...RIGHT,
      paint: (p) => p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path),
      fixed: [
        ['voidCrystal', 15, 4, 0], ['voidCrystal', 19, 6, 0], ['voidCrystal', 16, 12, 0], ['voidCluster', 20, 10], ['voidCoral', 9, 3],
        ['voidCoral', 6, 11], ['voidCluster', 21, 2], ['bush', 15, 7, 1], ['bush', 14, 10, 1], ['bush', 17, 9, 1],
      ],
      scatter: [['caveRock', 6]] }),
  // Colheita de Almas.
  // Restos Mortais: campo de batalha antigo, com as cruzes dos caídos e restos de carroças.
  bone_dust_remains: () =>
    gatherMap({ seed: 241, fill: Ground.Path, border: 'trees', target: { kind: 'ossuary', x: 13, y: 7 }, ...RIGHT,
      paint: (p) => {
        p.blob(0.2, 0.25, 0.12, 0.16, Ground.Grass, 0.3);
        p.blob(0.8, 0.8, 0.14, 0.16, Ground.Grass, 0.3);
      },
      fixed: [
        ['cross', 16, 3], ['cross', 19, 4], ['cross', 22, 3], ['cross', 17, 11], ['cross', 20, 12], ['cross', 6, 11],
        ['woodChips', 15, 8, 0], ['woodChips', 18, 8, 1], ['woodChips', 9, 6, 2], ['crate', 4, 3, 3], ['barrel', 5, 3, 1], ['rock', 23, 9, 0],
      ],
      scatter: [['rock', 4]] }),
  // Fonte Sombria: lagoa escura no bosque, com o cristal do vazio brotando na margem.
  dark_essence_font: () =>
    gatherMap({ seed: 242, fill: Ground.Grass, border: 'trees', target: { kind: 'voidCrystal', x: 13, y: 7 }, ...RIGHT, decoChance: 0.03,
      paint: (p) => {
        p.blob(0.72, 0.5, 0.14, 0.3, Ground.Water, 0.2);
        p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [['voidCrystal', 15, 4, 0], ['voidCrystal', 16, 12, 0], ['reeds', 23, 4, 0], ['reeds', 22, 12, 0], ['bigTree', 1, 0], ['stump', 5, 11, 2], ['log', 8, 12]],
      scatter: [['bush', 4]] }),
  // Túmulo Espectral: cemitério de verdade, com fileiras de lápides, caminho central e o sarcófago.
  spectral_tear_tomb: () =>
    gatherMap({ seed: 243, fill: Ground.Grass, border: 'trees', target: { kind: 'sarcophagus', x: 13, y: 7 }, ...RIGHT,
      paint: (p) => p.rect(0, 7.5 / GH, 0.9, 9.5 / GH, Ground.Path),
      fixed: [
        ['gravestone', 3, 3, 0], ['gravestone', 3, 11, 0], ['gravestone', 5, 3, 0], ['gravestone', 5, 11, 0], ['gravestone', 7, 3, 0], ['gravestone', 7, 11, 0], ['gravestone', 9, 3, 0], ['gravestone', 9, 11, 0], ['gravestone', 17, 3, 0], ['gravestone', 17, 11, 0], ['gravestone', 19, 3, 0], ['gravestone', 19, 11, 0], ['gravestone', 21, 3, 0], ['gravestone', 21, 11, 0], ['gravestone', 23, 3, 0], ['gravestone', 23, 11, 0],
        ['cross', 16, 6], ['cross', 16, 10], ['ossuary', 20, 7], ['sarcophagus', 2, 13, 2],
      ],
      scatter: [] }),
  // Pira Ancestral: pilhas de lenha da pira na rocha vulcânica, cercadas de ossários.
  ancient_ash_pyre: () =>
    gatherMap({ seed: 244, fill: Ground.Stone, theme: THEMES.volcano, target: { kind: 'giantRock', x: 13, y: 7 }, ...RIGHT,
      paint: (p) => {
        p.blob(0.85, 0.8, 0.1, 0.14, Ground.Water, 0.3);
        p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [
        ['woodPile', 12, 5, 0], ['woodPile', 17, 5, 1], ['woodPile', 12, 11, 1], ['woodPile', 17, 11, 0],
        ['ossuary', 6, 3], ['ossuary', 20, 3], ['ossuary', 6, 12], ['caveRock', 22, 8, 1], ['caveRock', 3, 6, 2],
      ],
      scatter: [] }),
  // Fenda Abissal: a rachadura no chão da caverna, almas presas entre cristais do vazio.
  abyssal_soul_rift: () =>
    gatherMap({ seed: 245, fill: Ground.Stone, theme: THEMES.cave, target: { kind: 'voidCluster', x: 13, y: 7 }, ...RIGHT,
      paint: (p) => {
        p.trail([[0.6, 0], [0.75, 0.4], [0.68, 0.7], [0.8, 1]], 2, Ground.Water);
        p.trail([[0, 8.5 / GH], [0.45, 8.5 / GH]], 1, Ground.Path);
      },
      fixed: [['voidCrystal', 15, 4, 0], ['voidCrystal', 16, 12, 0], ['voidCoral', 22, 3], ['voidCoral', 6, 11], ['sarcophagus', 5, 3, 0], ['caveRock', 9, 12, 1]],
      scatter: [['pebbles', 6]] }),
  // Gemas para a Joalheria: veio de quartzo (cedo) e geodo profundo (tarde).
  quartz_vein: () =>
    gatherMap({ seed: 250, fill: Ground.Stone, theme: THEMES.cave, target: { kind: 'gemCluster', x: 13, y: 7 }, ...RIGHT,
      paint: (p) => {
        p.rect(0, 7 / 17, 12 / 27, 10 / 17, Ground.Path);
        p.blob(17 / 27, 8.5 / 17, 0.2, 0.36, Ground.Stone, 0.1);
      },
      fixed: [
        ['crystalTall', 16, 4, 0], ['crystalTall', 20, 11, 1], ['gemCluster', 19, 5, 1], ['gemCluster', 16, 11, 0],
        ['caveRock', 22, 7, 1], ['caveRock', 8, 4, 0], ['mineTunnel', 4, 2], ['crate', 9, 11, 1], ['barrel', 10, 11, 0],
      ],
      scatter: [['pebbles', 8]] }),
  deep_geode: () =>
    gatherMap({ seed: 251, fill: Ground.Water, theme: THEMES.cave, target: { kind: 'gemCluster', x: 14, y: 7 }, ...RIGHT,
      paint: (p) => {
        p.rect(0, 7 / 17, 12 / 27, 10 / 17, Ground.Path);
        p.blob(18 / 27, 8.5 / 17, 0.26, 0.44, Ground.Stone, 0.08);
      },
      fixed: [
        ['giantRock', 18, 3], ['crystalTall', 15, 4, 0], ['crystalTall', 22, 5, 1], ['crystalTall', 15, 11, 1], ['crystalTall', 22, 11, 0],
        ['gemCluster', 19, 9, 0], ['gemCluster', 21, 7, 1], ['voidCrystal', 17, 12, 0], ['brazier', 5, 6], ['brazier', 10, 6], ['brazier', 5, 10], ['brazier', 10, 10],
      ],
      scatter: [['pebbles', 6]] }),
  // Rework de profissões: pontos novos usam o cenário de um ponto parecido.
  runite_vein: () => GATHER.mithril_vein(),
  orichalcum_vein: () => GATHER.adamant_vein(),
  luminite_vein: () => GATHER.pure_rune_vein(),
  dragonite_vein: () => GATHER.adamant_vein(),
  starmetal_vein: () => GATHER.pure_rune_vein(),
  primordial_vein: () => GATHER.adamant_vein(),
  silver_vein: () => GATHER.iron_vein(),
  gold_vein: () => GATHER.mithril_vein(),
  gem_rock: () => GATHER.pure_rune_vein(),
  maple_tree: () => GATHER.oak(),
  mahogany_tree: () => GATHER.willow(),
  magic_tree: () => GATHER.ancient_tree(),
  ironwood_tree: () => GATHER.yew(),
  redwood_tree: () => GATHER.yew(),
  spirit_tree: () => GATHER.ancient_tree(),
  worldtree_tree: () => GATHER.ancient_tree(),
  crab_spot: () => GATHER.lobster_spot(),
  swordfish_spot: () => GATHER.tuna_spot(),
  monkfish_spot: () => GATHER.tuna_spot(),
  dragonfish_spot: () => GATHER.shark_spot(),
  dark_crab_spot: () => GATHER.eel_spot(),
  serpent_spot: () => GATHER.shark_spot(),
  manta_spot: () => GATHER.eel_spot(),
  mint_patch: () => GATHER.green_herb_patch(),
  star_moss_patch: () => GATHER.moon_clover_patch(),
  dragon_thistle_patch: () => GATHER.fire_lotus_patch(),
  celestial_lily_patch: () => GATHER.ghost_bloom_patch(),
  wisp_hollow: () => GATHER.bone_dust_remains(),
  lich_crypt: () => GATHER.spectral_tear_tomb(),
  wraith_marsh: () => GATHER.spectral_tear_tomb(),
  demon_pyre: () => GATHER.ancient_ash_pyre(),
  void_well: () => GATHER.abyssal_soul_rift(),
  star_grave: () => GATHER.abyssal_soul_rift(),
  primordial_ossuary: () => GATHER.ancient_ash_pyre(),
};

/** Fundição: oficina de pedra com as fornalhas das barras, uma bigorna e o minério. */
export function smelterMap(): WorldMap {
  return workMap({
    seed: 107,
    fill: Ground.Stone,
    room: { x0: 1, y0: 0, x1: 11, y1: 8, door: 5 },
    objects: [
      ['hearth', 2, 1, 0], ['hearth', 7, 1, 1],
      ['anvil', 5, 6, 0], ['oreBig', 2, 6, 0], ['barrel', 10, 5, 0], ['crate', 10, 6, 1],
    ],
    extra: [['oreBig', 2], ['barrel', 3]],
    spot: { x: 8, y: 5 },
    face: 'up',
    target: { x: 8, y: 4 },
  });
}

/** Laboratório de alquimia: oficina de pedra com o caldeirão no meio dos vasos e das ervas. */
export function alchemyMap(): WorldMap {
  return workMap({
    seed: 108,
    fill: Ground.Stone,
    surround: 'village',
    room: { x0: 1, y0: 0, x1: 11, y1: 8, door: 4 },
    objects: [
      ['pot', 7, 4, 2],
      ['pot', 3, 3, 0], ['pot', 4, 3, 1], ['pot', 9, 3, 3], ['produce', 2, 5, 0], ['produce', 2, 6, 1],
      ['barrel', 10, 5, 0], ['crate', 10, 6, 1], ['pot', 8, 6, 0], ['flowerBox', 5, 7, 0], ['flowerBox', 6, 7, 1],
    ],
    extra: [['pot', 6], ['planter', 2], ['flowerBox', 4]],
    spot: { x: 6, y: 4 },
    face: 'right',
    target: { x: 7, y: 4 },
  });
}

/** Santuário dos Sigilos: a estátua da lua no meio, túmulos e cristais do vazio em volta. */
export function sigilismMap(): WorldMap {
  return workMap({
    seed: 111,
    fill: Ground.Stone,
    floor: { sheet: 'tileA5_cave', x: 1, y: 0 },
    objects: [
      ['moonStatue', 6, 1],
      ['sarcophagus', 2, 2, 0], ['sarcophagus', 10, 2, 1], ['ossuary', 1, 6], ['ossuary', 11, 6],
      ['voidCrystal', 3, 6, 0], ['voidCrystal', 9, 6, 0], ['runeCrystal', 1, 1, 2], ['runeCrystal', 12, 1, 0],
      ['caveRock', 0, 2, 1], ['caveRock', 12, 4, 3], ['pebbles', 4, 8, 0], ['pebbles', 9, 8, 2],
    ],
    extra: [['voidCrystal', 8], ['voidCluster', 3], ['sarcophagus', 2], ['gargoyle', 1]],
    spot: { x: 5, y: 4 },
    face: 'right',
    target: { x: 6, y: 3 },
  });
}

/** Altar Rúnico: a Pedra Gigante no meio, cercada de lápides rúnicas e cristais. */
export function runecraftMap(): WorldMap {
  return workMap({
    seed: 109,
    fill: Ground.Stone,
    floor: { sheet: 'tileA5_cave', x: 1, y: 0 },
    objects: [
      ['giantRock', 5, 1],
      // A pedra da esquerda fica longe do lugar do mascote (atrás do personagem, em 3,4).
      ['runeTablet', 2, 2], ['runeTablet', 10, 3], ['runeTablet', 2, 6], ['runeTablet', 11, 6],
      ['runeCrystal', 3, 6, 0], ['runeCrystal', 9, 5, 1], ['runeCrystal', 1, 1, 2], ['runeCrystal', 12, 1, 0],
      ['runeCrystal', 0, 7, 1], ['runeCrystal', 12, 8, 2],
      ['caveRock', 0, 0, 0], ['caveRock', 1, 4, 3], ['caveRock', 12, 4, 1], ['pebbles', 4, 7, 0], ['pebbles', 9, 7, 2],
    ],
    extra: [['runeCrystal', 10], ['runeTablet', 6], ['runeRock', 3]],
    spot: { x: 4, y: 4 },
    face: 'right',
    target: { x: 6, y: 3 },
  });
}

/** Onde o chefe global fica na arena e onde cada jogador luta (em volta dele). */
export const ARENA_BOSS: Pt = { x: 16, y: 8 };
export const ARENA_SLOTS: Pt[] = [
  { x: 13, y: 8 }, { x: 14, y: 6 }, { x: 14, y: 10 }, { x: 12, y: 6 }, { x: 12, y: 10 }, { x: 11, y: 8 },
  { x: 13, y: 4 }, { x: 13, y: 12 }, { x: 10, y: 6 }, { x: 10, y: 10 }, { x: 11, y: 4 }, { x: 11, y: 12 },
];

/** Miolo da arena (onde ficam o chefe e os jogadores): nada sorteado cai aqui. */
const ARENA_CLEAR = { x0: 8, y0: 3, x1: 19, y1: 13 };

/** Onde ficam os servos do chefe (em relação a ele), atrás e dos lados. */
export const BOSS_MINION_SPOTS: Pt[] = [
  { x: 4, y: -5 }, { x: 4, y: 5 }, { x: 7, y: -2 }, { x: 7, y: 2 }, { x: 1, y: -6 }, { x: 1, y: 6 }, { x: 7, y: -5 }, { x: 7, y: 5 },
];

/**
 * Arena de um chefe: o chão pintado, peças em posição fixa nas bordas e o
 * cenário sorteado fora do miolo. Entra-se pela esquerda (corredor da linha 8).
 */
function arena(s: { seed: number; fill: Ground; theme?: Theme; border?: 'rock'; paint: (p: Painter) => void; fixed?: [ObjectKind, number, number, number?][]; scatter: Place[]; minions?: boolean }): WorldMap {
  const m = gatherMap({ ...s, target: null, spot: { x: 9, y: 8 }, face: 'right', at: { x: 10, y: 8 } });
  const c = ARENA_CLEAR;
  // Chefe com servos: nada num raio de 1 tile de onde eles ficam (nem peça fixa, nem sorteada).
  const spots = new Set([ARENA_BOSS, ...ARENA_SLOTS].map((p) => `${p.x},${p.y}`));
  const near = (x: number, y: number) =>
    !!s.minions && BOSS_MINION_SPOTS.some((p) => Math.abs(ARENA_BOSS.x + p.x - x) <= 1 && Math.abs(ARENA_BOSS.y + p.y - y) <= 1);
  const objects = m.objects.filter((o) => {
    const d = OBJECTS[o.kind];
    if (near(o.x, o.y) || d.block.some(([bx, by]) => near(o.x + bx, o.y + by))) return false;
    // Nem enfeite que não bloqueia (entulho, junco...) no tile do chefe ou de um jogador: ficava desenhado em cima dele.
    if (spots.has(`${o.x},${o.y}`) || d.block.some(([bx, by]) => spots.has(`${o.x + bx},${o.y + by}`))) return false;
    return !d.block.some(([bx, by]) => o.x + bx >= c.x0 && o.x + bx <= c.x1 && o.y + by >= c.y0 && o.y + by <= c.y1);
  });
  const blocked = new Uint8Array(m.w * m.h);
  for (let i = 0; i < blocked.length; i++) if (m.ground[i] === Ground.Water) blocked[i] = 1;
  for (const o of objects)
    for (const [bx, by] of OBJECTS[o.kind].block) {
      const X = o.x + bx;
      const Y = o.y + by;
      if (X >= 0 && Y >= 0 && X < m.w && Y < m.h) blocked[Y * m.w + X] = 1;
    }
  return { ...m, objects, blocked, work: undefined, arena: true };
}

const row = (kind: ObjectKind, xs: number[], ys: number[]): [ObjectKind, number, number][] => xs.flatMap((x) => ys.map((y): [ObjectKind, number, number] => [kind, x, y]));

/** Uma arena por chefe global (id do chefe → mapa). */
const BOSS_ARENAS: Record<string, () => WorldMap> = {
  // Ninho do dragão: caldeira de rocha num lago de lava, veios de minério e cristais.
  ancient_dragon: () =>
    arena({
      seed: 301,
      fill: Ground.Water,
      theme: THEMES.volcano,
      paint: (p) => {
        p.blob(0.5, 0.5, 0.4, 0.42, Ground.Grass, 0.14);
        p.blob(0.6, 0.5, 0.2, 0.26, Ground.Stone, 0.1);
                p.blob(0.92, 0.5, 0.06, 0.2, Ground.Water, 0.2);
      },
      fixed: [
        ['brazier', 6, 5], ['brazier', 6, 10],
        ['oreBig', 3, 2, 0], ['oreBig', 21, 1, 1], ['oreBig', 20, 13, 0], ['oreBig', 3, 13, 1],
      ],
      scatter: [['crystalTall', 10], ['rubble', 14], ['oreBig', 3]],
    }),
  // Salão gelado do Rei Lich: colunatas, sarcófagos e ossuários sobre o abismo congelado.
  lich_king: () =>
    arena({
      seed: 302,
      fill: Ground.Water,
      theme: THEMES.ice,
      paint: (p) => {
        p.rect(0.04, 0.08, 0.96, 0.92, Ground.Grass);
        p.rect(0.3, 0.2, 0.74, 0.8, Ground.Stone);
              },
      fixed: [
        ...row('pillarDark', [8, 11, 14, 17, 20], [1, 14]),
        ['sarcophagus', 2, 2, 0], ['sarcophagus', 2, 12, 2], ['sarcophagus', 22, 3, 1], ['sarcophagus', 22, 11, 3],
        ['sarcophagus', 23, 7, 0], ['sarcophagus', 4, 6, 1],
      ],
      scatter: [['voidCrystal', 8], ['iceRock', 14]],
    }),
  // Recife afundado: praça de pedra antiga no mar, destroços do naufrágio na borda; o kraken sai da água.
  abyssal_kraken: () =>
    arena({
      seed: 303,
      fill: Ground.Water,
      paint: (p) => {
        p.blob(0.42, 0.5, 0.36, 0.4, Ground.Path, 0.14);
        p.blob(0.48, 0.5, 0.2, 0.3, Ground.Stone, 0.06);
        p.trail([[0, 0.5], [0.2, 0.5]], 3, Ground.Path);
        p.blob(0.76, 0.18, 0.06, 0.1, Ground.Path, 0.2);
        p.blob(0.8, 0.84, 0.05, 0.08, Ground.Path, 0.2);
      },
      fixed: [
        ['barrel', 5, 3, 0], ['crate', 6, 3, 1], ['barrel', 4, 12, 2], ['crate', 5, 12, 0], ['log', 13, 0],
        ['dock', 21, 2], ['dock', 20, 12],
      ],
      scatter: [['rock', 14], ['reeds', 8], ['bush', 3]],
    }),
  // Covil do Senhor do Abismo: obsidiana cortada por rios de lava, estátuas de chifres e braseiros.
  demon_lord: () =>
    arena({
      seed: 304,
      fill: Ground.Grass,
      theme: THEMES.hell,
      paint: (p) => {
        p.river([[0, 0.12], [0.4, 0.06], [0.7, 0.14], [1, 0.08]], 2);
        p.river([[0, 0.9], [0.35, 0.95], [0.7, 0.86], [1, 0.92]], 2);
        p.rect(0.32, 0.24, 0.74, 0.78, Ground.Stone);
              },
      fixed: [
        ['hornStatue', 4, 3, 0], ['hornStatue', 4, 10, 1], ['hornStatue', 21, 3, 1], ['hornStatue', 21, 10, 0],
        ['brazier', 7, 4], ['brazier', 7, 11], ['brazier', 20, 4], ['brazier', 20, 11],
        ['gargoyle', 22, 6, 0],
      ],
      scatter: [['rubble', 16], ['voidCoral', 4], ['crystalTall', 4]],
    }),
  // Templo profanado de Ferathos: plataforma lavrada sobre a lava, colunata branca e anjos caídos.
  ferathos_avatar: () =>
    arena({
      seed: 305,
      fill: Ground.Water,
      theme: THEMES.hell,
      paint: (p) => {
        p.rect(0.06, 0.1, 0.94, 0.9, Ground.Grass);
        p.rect(0.26, 0.16, 0.8, 0.84, Ground.Stone);
              },
      fixed: [
        ...row('pillarWhite', [8, 11, 14, 17, 20], [1, 14]),
        ['angelStatue', 22, 3, 0], ['angelStatue', 22, 10, 1], ['angelStatue', 3, 2, 1], ['angelStatue', 3, 11, 0],
        ['brazier', 6, 5], ['brazier', 6, 10],
      ],
      scatter: [['rubble', 18]],
    }),
  // Altar da legião de Ghazrael: círculo de invocação cercado de braseiros, a lava rachando o chão atrás do arauto.
  ghazrael_herald: () =>
    arena({
      seed: 306,
      fill: Ground.Grass,
      theme: THEMES.hell,
      paint: (p) => {
        p.blob(0.58, 0.5, 0.3, 0.4, Ground.Stone, 0.04);
        p.river([[0.86, 0], [0.8, 0.3], [0.9, 0.55], [0.84, 1]], 2);
        p.blob(0.1, 0.1, 0.1, 0.12, Ground.Water, 0.25);
        p.blob(0.08, 0.92, 0.09, 0.1, Ground.Water, 0.25);
      },
      fixed: [
        ['hornStatue', 3, 3, 0], ['hornStatue', 3, 10, 1], ['hornStatue', 19, 0, 1], ['hornStatue', 19, 13, 0],
        ['brazier', 8, 1], ['brazier', 12, 0], ['brazier', 16, 0], ['brazier', 8, 14], ['brazier', 12, 15], ['brazier', 16, 15],
        ['brazier', 6, 5], ['brazier', 6, 10],
      ],
      scatter: [['rubble', 18], ['voidCoral', 3]],
    }),
  // Ninho da Viúva: gruta funda com abismos, rochas, ossos e cristais pálidos.
  widow_daughter: () =>
    arena({
      seed: 307,
      fill: Ground.Water,
      theme: THEMES.cave,
      paint: (p) => {
        p.blob(0.5, 0.5, 0.44, 0.44, Ground.Grass, 0.18);
        p.blob(0.58, 0.5, 0.22, 0.28, Ground.Path, 0.14);
                p.blob(0.88, 0.22, 0.05, 0.08, Ground.Water, 0.3);
        p.blob(0.2, 0.84, 0.05, 0.07, Ground.Water, 0.3);
      },
      fixed: [['mineTunnel', 22, 1], ['oreBig', 3, 2, 1], ['oreBig', 21, 13, 0]],
      border: 'rock',
      scatter: [['crystalTall', 8], ['rubble', 16], ['gemCluster', 4]],
    }),
  // Trono de Malgoroth: plataformas soltas no vazio estrelado, gárgulas e a estátua da lua.
  malgoroth: () =>
    arena({
      seed: 308,
      fill: Ground.Water,
      theme: THEMES.void,
      paint: (p) => {
        p.blob(0.54, 0.5, 0.3, 0.42, Ground.Grass, 0.1);
        p.blob(0.58, 0.5, 0.18, 0.26, Ground.Stone, 0.06);
                p.blob(0.12, 0.18, 0.08, 0.12, Ground.Grass, 0.2);
        p.blob(0.12, 0.84, 0.08, 0.12, Ground.Grass, 0.2);
        p.blob(0.92, 0.2, 0.07, 0.14, Ground.Grass, 0.2);
        p.blob(0.92, 0.82, 0.07, 0.14, Ground.Grass, 0.2);
      },
      fixed: [
        ['moonStatue', 23, 6],
        ['gargoyle', 1, 1, 0], ['gargoyle', 1, 12, 1],
        ...row('pillarDark', [8, 23], [1, 13]),
      ],
      scatter: [['voidCrystal', 10], ['voidCluster', 4], ['voidCoral', 4]],
    }),
  // Coliseu de Kharvos: areia de pedra cercada de colunas escuras, braseiros e bigornas de guerra.
  kharvos_avatar: () =>
    arena({
      seed: 311,
      fill: Ground.Grass,
      theme: THEMES.cave,
      minions: true,
      paint: (p) => {
        p.rect(0.04, 0.06, 0.96, 0.94, Ground.Stone);
        p.blob(0.56, 0.5, 0.3, 0.36, Ground.Path, 0.08);
      },
      fixed: [
        ...row('pillarDark', [3, 7, 11, 15], [1, 15]),
        ['brazier', 5, 4], ['brazier', 5, 12],
        ['anvil', 3, 4], ['anvil', 3, 12],
        ['hornStatue', 25, 1, 0], ['hornStatue', 25, 15, 1],
        ['giantRock', 1, 1], ['giantRock', 1, 15],
      ],
      scatter: [['rubble', 16], ['pebbles', 10]],
    }),
  // Clareira de Sylveth: noite na floresta, um lago de lua atrás dela e pedras lunares.
  sylveth_avatar: () =>
    arena({
      seed: 312,
      fill: Ground.Water,
      minions: true,
      paint: (p) => {
        p.rect(0.02, 0.06, 0.98, 0.94, Ground.Grass);
        p.blob(0.06, 0.12, 0.05, 0.08, Ground.Water, 0.2);
        p.blob(0.06, 0.88, 0.05, 0.08, Ground.Water, 0.2);
      },
      fixed: [
        ['moonStatue', 25, 8],
        ['bigTree', 2, 2], ['bigTree', 2, 13], ['tree', 6, 1], ['tree', 6, 15], ['tree', 14, 1], ['tree', 14, 15],
        ['roundTree', 25, 2], ['roundTree', 25, 14],
      ],
      scatter: [['bush', 12], ['reeds', 6], ['rock', 6]],
    }),
  // Topo da torre de Aethon: plataforma de pedra no meio da tempestade, cristais e runas carregadas.
  aethon_avatar: () =>
    arena({
      seed: 313,
      fill: Ground.Water,
      theme: THEMES.void,
      paint: (p) => {
        p.rect(0.04, 0.08, 0.96, 0.92, Ground.Stone);
        p.blob(0.58, 0.5, 0.26, 0.32, Ground.Grass, 0.06);
      },
      fixed: [
        ...row('pillarWhite', [4, 8, 20, 24], [1, 15]),
        ['runeCrystal', 23, 4], ['runeCrystal', 23, 12],
        ['runeTablet', 3, 4], ['runeTablet', 3, 12],
        ['crystalTall', 25, 8],
      ],
      scatter: [['voidCrystal', 8], ['rubble', 10]],
    }),
  // Templo de Lumira: mármore branco, colunata, tapete dourado até ela e anjos guardando o altar.
  lumira_avatar: () =>
    arena({
      seed: 314,
      fill: Ground.Grass,
      paint: (p) => {
        p.rect(0.04, 0.08, 0.96, 0.92, Ground.Stone);
        p.trail([[0, 0.5], [0.6, 0.5]], 2, Ground.Path);
      },
      fixed: [
        ...row('pillarWhite', [3, 7, 11, 15, 19, 23], [1, 15]),
        ['angelStatue', 25, 4, 0], ['angelStatue', 25, 12, 1],
        ['goldUrn', 2, 3, 0], ['goldUrn', 2, 13, 1],
        ['flowerBox', 22, 4], ['flowerBox', 22, 12],
      ],
      scatter: [['bush', 6]],
    }),
  // Necrópole do Imortal: covas abertas e sarcófagos num chão de brasa, colunas escuras e chifres de pedra.
  ghazmorath: () =>
    arena({
      seed: 310,
      fill: Ground.Grass,
      theme: THEMES.hell,
      paint: (p) => {
        p.rect(0.28, 0.2, 0.78, 0.8, Ground.Stone);
        p.river([[0.9, 0], [0.86, 0.35], [0.94, 0.6], [0.88, 1]], 2);
      },
      fixed: [
        ...row('pillarDark', [7, 11, 15, 19], [1, 14]),
        ['sarcophagus', 2, 2, 0], ['sarcophagus', 2, 12, 2], ['sarcophagus', 4, 7, 1],
        ['hornStatue', 22, 3, 0], ['hornStatue', 22, 11, 1],
        ['brazier', 6, 4], ['brazier', 6, 11], ['brazier', 20, 4], ['brazier', 20, 11],
      ],
      scatter: [['rubble', 18], ['voidCrystal', 4]],
    }),
  // Portal do Arquimago: chão de pedra no meio do Bastião, cristais do vazio e estátuas da lua em volta.
  zharvos: () =>
    arena({
      seed: 311,
      fill: Ground.Grass,
      theme: THEMES.void,
      paint: (p) => {
        p.rect(0.2, 0.15, 0.85, 0.85, Ground.Stone);
      },
      fixed: [
        ...row('pillarDark', [6, 10, 14, 18, 22], [1, 14]),
        // A estátua da lua só tem 1 variante (a 1 derrubava o desenho do mapa no Zharvos, 24/10).
        ['moonStatue', 24, 4, 0], ['moonStatue', 24, 11, 0],
        ['brazier', 4, 4], ['brazier', 4, 11], ['brazier', 21, 4], ['brazier', 21, 11],
      ],
      scatter: [['voidCrystal', 10], ['rubble', 10]],
    }),
  // Cavaleiro Sem Cabeça: cemitério assombrado na colina, lápides, ossuários e abóboras sinistras.
  headless_horseman: () =>
    arena({
      seed: 310,
      fill: Ground.Grass,
      theme: THEMES.crypt,
      paint: (p) => {
        p.blob(0.5, 0.5, 0.42, 0.4, Ground.Path, 0.1);
        p.blob(0.6, 0.5, 0.22, 0.28, Ground.Stone, 0.08);
      },
      fixed: [
        ['gargoyle', 22, 3, 0], ['gargoyle', 22, 10, 1], ['gargoyle', 3, 2, 1], ['gargoyle', 3, 11, 0],
        ['brazier', 6, 4], ['brazier', 6, 11],
      ],
      scatter: [['gravestone', 8], ['rubble', 12], ['cross', 6]],
      minions: true,
    }),
  // Mímico Rei: salão do tesouro, colunas de mármore e ouro, urnas douradas, gemas e caixotes de saque.
  mimic_king: () =>
    arena({
      seed: 309,
      fill: Ground.Grass,
      theme: THEMES.treasure,
      paint: (p) => {
        // Trançado dourado no centro e o tapete vermelho da entrada até o Rei.
        p.blob(0.6, 0.5, 0.3, 0.38, Ground.Stone, 0.06);
        p.trail([[0, 0.45], [0.6, 0.45]], 2, Ground.Path);
      },
      fixed: [
        // Atrás do Rei, entre os Baús Mordedores (que ficam nas colunas 20 e 23).
        ['angelStatue', 24, 7, 0],
        ...row('pillarWhite', [4, 8, 17, 22], [1, 12]),
        ['goldUrn', 2, 3, 0], ['goldUrn', 3, 3, 1], ['goldUrn', 2, 11, 1], ['goldUrn', 3, 11, 0],
        ['goldUrn', 23, 2, 0], ['goldUrn', 24, 3, 1], ['goldUrn', 23, 12, 1], ['goldUrn', 24, 11, 0],
        ['crate', 12, 1, 0], ['crate', 13, 1, 2], ['barrel', 14, 1, 1], ['crate', 12, 12, 1], ['barrel', 13, 12, 0],
      ],
      scatter: [['gemCluster', 14], ['goldUrn', 6]],
    }),
};
// Chefes diários do Halloween: lutam no cemitério do Cavaleiro Sem Cabeça.
BOSS_ARENAS.scarecrow_king = BOSS_ARENAS.headless_horseman;
BOSS_ARENAS.giant_pumpkin = BOSS_ARENAS.headless_horseman;

/** Arena do chefe global: cada chefe tem a sua (o padrão é o ninho do dragão). */
export function bossArenaMap(boss?: string): WorldMap {
  return (BOSS_ARENAS[boss ?? ''] ?? BOSS_ARENAS.ancient_dragon)();
}

/**
 * Arena de gladiadores: um fosso de pedra lavrada com estátuas em volta. O
 * personagem espera no meio e cada desafiante entra pelo portão da direita.
 */
export function gladiatorPitMap(): WorldMap {
  const spot = { x: 11, y: 8 };
  const gate = { x: 24, y: 8 };
  const m = gatherMap({
    seed: 707,
    fill: Ground.Water,
    theme: THEMES.tomb,
    target: null,
    spot,
    face: 'right',
    at: { x: 12, y: 8 },
    paint: (p) => {
      p.blob(0.5, 0.5, 0.46, 0.44, Ground.Stone, 0.06);
      p.blob(0.5, 0.5, 0.34, 0.3, Ground.Path, 0.05);
      p.trail([[0, 0.5], [1, 0.5]], 3, Ground.Stone, Ground.Water);
    },
    scatter: [['gargoyle', 8], ['moonStatue', 4]],
  });
  // O corredor do portão até o meio fica livre (nada de estátua no caminho do desafiante).
  const objects = m.objects.filter((o) => !(o.y + OBJECTS[o.kind].h >= spot.y - 1 && o.y <= spot.y + 1 && o.x + OBJECTS[o.kind].w > spot.x));
  const blocked = new Uint8Array(m.w * m.h);
  for (let i = 0; i < blocked.length; i++) if (m.ground[i] === Ground.Water) blocked[i] = 1;
  for (const o of objects)
    for (const [bx, by] of OBJECTS[o.kind].block) {
      const X = o.x + bx;
      const Y = o.y + by;
      if (X >= 0 && Y >= 0 && X < m.w && Y < m.h) blocked[Y * m.w + X] = 1;
    }
  return { ...m, objects, blocked, work: undefined, start: spot, pit: { spot, gate } };
}

/** O Ceifador, no Limiar dos Mortos: guarda as peças de quem morreu sem bênção e vende a bênção. */
export const REAPER_NPC: Npc = { id: 'reaper', name: 'Ceifador', sprite: 'reaper', x: 15, y: 8, face: 'left', scale: 1 };

/** Limiar dos Mortos: cripta escura com túmulos, onde quem morreu sem bênção acorda diante do Ceifador. */
export function limboMap(): WorldMap {
  const spot = { x: 12, y: 8 };
  const m = gatherMap({
    seed: 666,
    fill: Ground.Grass,
    theme: THEMES.crypt,
    target: null,
    spot,
    face: 'right',
    at: { x: 13, y: 8 },
    paint: (p) => {
      p.blob(0.56, 0.5, 0.2, 0.22, Ground.Stone, 0.05);
      p.trail([[0, 0.5], [0.6, 0.5]], 1, Ground.Path);
    },
    fixed: [['brazier', 14, 6], ['brazier', 14, 10], ['brazier', 17, 6], ['brazier', 17, 10]],
    scatter: [['gravestone', 18], ['cross', 8], ['ossuary', 3], ['sarcophagus', 3], ['pillarDark', 4]],
  });
  // Em volta do Ceifador e entre ele e o personagem fica livre (só os braseiros): nada cobre o NPC.
  const objects = m.objects.filter(
    (o) => o.kind === 'brazier' || !(o.x + OBJECTS[o.kind].w > spot.x && o.x <= REAPER_NPC.x + 2 && o.y + OBJECTS[o.kind].h >= REAPER_NPC.y - 3 && o.y <= REAPER_NPC.y + 2),
  );
  const blocked = new Uint8Array(m.w * m.h);
  for (let i = 0; i < blocked.length; i++) if (m.ground[i] === Ground.Water) blocked[i] = 1;
  for (const o of objects)
    for (const [bx, by] of OBJECTS[o.kind].block) {
      const X = o.x + bx;
      const Y = o.y + by;
      if (X >= 0 && Y >= 0 && X < m.w && Y < m.h) blocked[Y * m.w + X] = 1;
    }
  blocked[REAPER_NPC.y * m.w + REAPER_NPC.x] = 1;
  return { ...m, objects, blocked, work: undefined, start: spot, npcs: [REAPER_NPC], limbo: true };
}

/**
 * A ponte da Aniquilação (inspirada na Annihilator do Tibia): uma passarela de
 * pedra sobre a lava até a plataforma de onde vêm os demônios; em volta, quatro
 * ilhas soltas na lava com os demônios acorrentados que atiram de longe.
 */
export function annihilationBridgeMap(): WorldMap {
  const spot = { x: 13, y: 8 };
  const gate = { x: 24, y: 8 };
  const casters = [
    { x: 10, y: 3 },
    { x: 17, y: 3 },
    { x: 10, y: 13 },
    { x: 17, y: 13 },
  ];
  const m = gatherMap({
    seed: 666,
    fill: Ground.Water,
    theme: THEMES.hell,
    target: null,
    spot,
    face: 'right',
    at: { x: 14, y: 8 },
    paint: (p) => {
      // Passarela de 3 tiles da entrada até a plataforma dos demônios.
      p.trail([[0, 0.5], [1, 0.5]], 3, Ground.Stone);
      p.blob(0.88, 0.5, 0.1, 0.22, Ground.Stone, 0.08);
      p.blob(0.06, 0.5, 0.06, 0.16, Ground.Stone, 0.08);
      // Ilhas dos acorrentados: soltas na lava, sem ligação com a ponte.
      for (const c of casters) p.blob((c.x + 0.5) / p.w, (c.y + 0.5) / p.h, 1.6 / p.w, 1.4 / p.h, Ground.Path, 0.05);
    },
    scatter: [],
  });
  const blocked = new Uint8Array(m.w * m.h);
  for (let i = 0; i < blocked.length; i++) if (m.ground[i] === Ground.Water) blocked[i] = 1;
  // As ilhas também não se pisam (ninguém chega até os acorrentados).
  for (const c of casters) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const X = c.x + dx;
    const Y = c.y + dy;
    if (X >= 0 && Y >= 0 && X < m.w && Y < m.h && Math.abs(Y - spot.y) > 1) blocked[Y * m.w + X] = 1;
  }
  return { ...m, objects: [], blocked, work: undefined, start: { x: 1, y: spot.y }, pit: { spot, gate }, casters };
}

export function fletchingMap(): WorldMap {
  return workMap({
    seed: 110,
    fill: Ground.Path,
    objects: [
      ['log', 5, 2], ['log', 5, 4], ['crate', 6, 2], ['barrel', 6, 5],
      ['crate', 2, 1], ['barrel', 3, 1],
    ],
    extra: [['woodPile', 4], ['log', 2]],
    spot: { x: 3, y: 3 },
    face: 'right',
    target: { x: 5, y: 3 },
  });
}

export function jewelcraftingMap(): WorldMap {
  return workMap({
    seed: 112,
    fill: Ground.Stone,
    surround: 'village',
    room: { x0: 1, y0: 0, x1: 11, y1: 8, door: 4 },
    objects: [
      ['anvil', 6, 4],
      ['brazier', 3, 2], ['brazier', 9, 2], ['gemCluster', 2, 3, 0], ['gemCluster', 10, 3, 1],
      ['crystalTall', 2, 6, 0], ['crystalTall', 10, 6, 1], ['crate', 9, 6, 1], ['barrel', 3, 7, 2], ['goldUrn', 8, 7],
    ],
    extra: [['barrel', 3], ['crate', 3]],
    spot: { x: 5, y: 4 },
    face: 'right',
    target: { x: 6, y: 4 },
  });
}

/**
 * Lugares em volta do alvo de um mapa de profissão onde os outros jogadores ficam trabalhando,
 * do mais perto para o mais longe: só onde dá para pisar, fora do lugar do personagem e do
 * mascote dele (logo atrás), a 3 tiles dele e 3 tiles uns dos outros (cabe o nome e o mascote de cada um).
 */
export function workSlots(map: WorldMap): { x: number; y: number }[] {
  const w = map.work;
  if (!w) return [];
  const pet = { x: w.spot.x + (w.face === 'left' ? 1 : -1), y: w.spot.y };
  const out: { x: number; y: number }[] = [];
  for (let dy = -8; dy <= 8; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      const t = { x: w.target.x + dx, y: w.target.y + dy };
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < 1 || d > 8 || !walkable(map, t.x, t.y)) continue;
      if (Math.abs(t.x - w.spot.x) + Math.abs(t.y - w.spot.y) < 3 || (t.x === pet.x && t.y === pet.y)) continue;
      out.push(t);
    }
  }
  const dist = (t: { x: number; y: number }) => Math.abs(t.x - w.target.x) + Math.abs(t.y - w.target.y);
  out.sort((a, b) => dist(a) - dist(b) || a.y - b.y || a.x - b.x);
  const spaced: { x: number; y: number }[] = [];
  for (const t of out) if (spaced.every((u) => Math.abs(u.x - t.x) + Math.abs(u.y - t.y) >= 3)) spaced.push(t);
  return spaced;
}

const workCache = new Map<string, WorldMap>();
const STATIONS: Record<string, () => WorldMap> = {
  smelter: smelterMap,
  smithing: forgeMap,
  cooking: kitchenMap,
  crafting: workshopMap,
  alchemy: alchemyMap,
  runecraft: runecraftMap,
  fletching: fletchingMap,
  sigilism: sigilismMap,
  jewelcrafting: jewelcraftingMap,
};
/**
 * O mapa de uma atividade de profissão: cada ponto de coleta tem o seu; a
 * produção usa a oficina da profissão (a Forja separa a fundição das barras).
 */
export function workMapFor(skill: string, node: string): WorldMap | null {
  const key = GATHER[node] ? node : skill === 'smithing' && node.endsWith('_bar') ? 'smelter' : skill;
  const make = GATHER[key] ?? STATIONS[key];
  if (!make) return null;
  let map = workCache.get(key);
  if (!map) workCache.set(key, (map = make()));
  return map;
}

type ScatterSpec = [ObjectKind, number, number];

/**
 * Gerador comum dos mapas de caçada: pinta o chão, fecha as bordas com
 * árvores, espalha objetos e traça a rota que o personagem percorre em volta.
 * Semente fixa — o mapa é sempre o mesmo.
 */
function wildMap(opts: {
  seed: number;
  w: number;
  h: number;
  decoChance?: number;
  paint: (p: Painter) => void;
  /** Objetos que podem ficar em cima da terra (acampamentos). */
  camp?: [ObjectKind, number][];
  /** Chão onde o acampamento pode ficar (padrão: terra). */
  campGround?: Ground;
  scatter: ScatterSpec[];
  /** Pontos da rota em frações; o primeiro é a entrada. A rota fecha no primeiro. */
  route: Frac[];
  /** Tema do chão (sem tema: campo com floresta nas bordas). */
  theme?: Theme;
  /** Peças em posição fixa (em tiles), antes do resto: [tipo, x, y, variante]. Pulam se caírem na rota ou fora do chão. */
  fixed?: [ObjectKind, number, number, number?][];
}): WorldMap {
  const { w, h } = opts;
  const rand = rngFor(opts.seed, 0);
  const ground = new Uint8Array(w * h);
  const deco = new Uint8Array(w * h);
  const blocked = new Uint8Array(w * h);
  const objects: MapObject[] = [];
  const at = (x: number, y: number) => y * w + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;

  opts.paint(painter(ground, w, h));
  const decoChance = opts.decoChance ?? 0.14;
  for (let i = 0; i < w * h; i++) {
    if (ground[i] === Ground.Water) blocked[i] = 1;
    else if (ground[i] === Ground.Grass && rand() < decoChance) deco[i] = 1 + Math.floor(rand() * 20);
  }

  // Faixa da rota: nada é colocado em cima, para o caminho ficar livre.
  const keep = new Uint8Array(w * h);
  const waypoints = opts.route.map(([fx, fy]) => ({ x: Math.round(fx * (w - 1)), y: Math.round(fy * (h - 1)) }));
  const markLine = (a: Pt, b: Pt) => {
    const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(a.x + ((b.x - a.x) * i) / n);
      const y = Math.round(a.y + ((b.y - a.y) * i) / n);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inside(x + dx, y + dy)) keep[at(x + dx, y + dy)] = 1;
    }
  };
  for (let i = 0; i < waypoints.length; i++) markLine(waypoints[i], waypoints[(i + 1) % waypoints.length]);

  const free = (x: number, y: number, ow: number, oh: number, margin: number, on: Ground) => {
    for (let yy = y - margin; yy < y + oh + margin; yy++) {
      for (let xx = x - margin; xx < x + ow + margin; xx++) {
        if (!inside(xx, yy)) return false;
        const i = at(xx, yy);
        if (ground[i] !== on || blocked[i] || keep[i]) return false;
      }
    }
    return true;
  };
  const place = (kind: ObjectKind, x: number, y: number) => {
    const def = OBJECTS[kind];
    objects.push({ kind, x, y, variant: Math.floor(rand() * def.variants.length) });
    for (const [bx, by] of def.block) if (inside(x + bx, y + by)) blocked[at(x + bx, y + by)] = 1;
  };

  // Floresta nas bordas: árvores coladas umas nas outras (mapas com tema já são cercados de lava/abismo).
  for (let x = -1; x < w && !opts.theme; x += 2) {
    place('tree', x, -1);
    place('tree', x, h - 3);
  }
  for (let y = 1; y < h - 3 && !opts.theme; y += 2) {
    if (ground[at(0, y)] === Ground.Grass && ground[at(0, y + 2)] === Ground.Grass) place('tree', -1, y);
    place('tree', w - 2, y);
  }
  for (let x = 0; x < w; x++) blocked[at(x, 0)] = blocked[at(x, 1)] = blocked[at(x, h - 1)] = 1;
  for (let y = 0; y < h; y++) blocked[at(0, y)] = blocked[at(w - 1, y)] = 1;

  const spread = (kind: ObjectKind, count: number, margin: number, on: Ground) => {
    const def = OBJECTS[kind];
    for (let tries = 0, n = 0; n < count && tries < count * 40; tries++) {
      const x = 2 + Math.floor(rand() * (w - 4 - def.w));
      const y = 2 + Math.floor(rand() * (h - 5 - def.h));
      if (free(x, y, def.w, def.h, margin, on)) {
        place(kind, x, y);
        n++;
      }
    }
  };
  for (const [kind, x, y, variant] of opts.fixed ?? []) {
    const def = OBJECTS[kind];
    const ok = def.block.every(([bx, by]) => inside(x + bx, y + by) && ground[at(x + bx, y + by)] !== Ground.Water && !blocked[at(x + bx, y + by)] && !keep[at(x + bx, y + by)]);
    if (!ok) continue;
    place(kind, x, y);
    if (variant !== undefined) objects[objects.length - 1].variant = variant % def.variants.length;
  }
  for (const [kind, count] of opts.camp ?? []) spread(kind, count, 1, opts.campGround ?? Ground.Path);
  for (const [kind, count, margin] of opts.scatter) spread(kind, count, margin, Ground.Grass);

  objects.sort((a, b) => a.y + OBJECTS[a.kind].h - (b.y + OBJECTS[b.kind].h));
  const map: WorldMap = { w, h, ground, deco, blocked, objects, start: waypoints[0], route: [], theme: opts.theme };
  map.route = buildRoute(map, waypoints);
  map.start = map.route[0] ?? waypoints[0];
  return map;
}

/**
 * Formato da masmorra:
 * - ring: salões em volta de um laço, com um salão no meio;
 * - gallery: câmaras em zigue-zague da entrada até o fundo (minas, fendas);
 * - hub: um salão grande no meio (o trono) com câmaras nos cantos;
 * - maze: salas pequenas numa grade, ligadas por corredores retos (labirinto, cripta).
 */
type DungeonLayout = 'ring' | 'gallery' | 'hub' | 'maze';

interface DungeonStyle {
  seed: number;
  theme: Theme;
  layout: DungeonLayout;
  /** Peças espalhadas pelos salões: [tipo, quantidade]. */
  props: [ObjectKind, number][];
  /** Peças do salão principal, em tiles a partir do centro dele: [tipo, dx, dy, variante]. */
  centerpiece?: [ObjectKind, number, number, number?][];
}

/** Monta os salões (centro e raio em frações) e a ordem em que a rota passa por eles. */
function dungeonLayout(layout: DungeonLayout, r: () => number) {
  const halls: { c: Frac; rx: number; ry: number }[] = [];
  const links: [number, number][] = [];
  let route: number[] = [];
  let main = 0;
  if (layout === 'ring') {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI * 2 + (r() - 0.5) * 0.5;
      halls.push({ c: [0.5 + Math.cos(a) * (0.3 + r() * 0.06), 0.5 + Math.sin(a) * (0.3 + r() * 0.06)], rx: 0.09 + r() * 0.04, ry: 0.11 + r() * 0.04 });
    }
    halls.push({ c: [0.5, 0.5], rx: 0.1, ry: 0.12 });
    for (let i = 0; i < 6; i++) links.push([i, (i + 1) % 6]);
    links.push([0, 6], [6, 3]);
    route = [0, 1, 2, 3, 6, 0, 5, 4, 3, 2, 1];
    main = 6;
  } else if (layout === 'gallery') {
    for (let i = 0; i < 6; i++) {
      const y = i % 2 === 0 ? 0.3 + r() * 0.08 : 0.62 + r() * 0.08;
      halls.push({ c: [0.1 + i * 0.16, y], rx: 0.07 + r() * 0.025, ry: 0.13 + r() * 0.05 });
      if (i > 0) links.push([i - 1, i]);
    }
    // Um atalho por baixo para a volta não ser só pelo mesmo caminho.
    links.push([1, 3], [3, 5]);
    route = [0, 1, 2, 3, 4, 5, 3, 1];
    main = 5;
  } else if (layout === 'hub') {
    halls.push({ c: [0.55, 0.5], rx: 0.17, ry: 0.22 });
    const corners: Frac[] = [[0.16, 0.26], [0.16, 0.74], [0.86, 0.22], [0.86, 0.78]];
    for (const [x, y] of corners) halls.push({ c: [x + (r() - 0.5) * 0.04, y + (r() - 0.5) * 0.06], rx: 0.08 + r() * 0.03, ry: 0.1 + r() * 0.03 });
    links.push([1, 2], [1, 0], [2, 0], [0, 3], [0, 4], [3, 4]);
    route = [1, 0, 3, 4, 0, 2];
    main = 0;
  } else {
    const xs = [0.12, 0.37, 0.62, 0.87];
    const ys = [0.2, 0.5, 0.8];
    for (const y of ys) for (const x of xs) halls.push({ c: [x + (r() - 0.5) * 0.04, y + (r() - 0.5) * 0.04], rx: 0.06 + r() * 0.02, ry: 0.08 + r() * 0.02 });
    const id = (cx: number, cy: number) => cy * 4 + cx;
    for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 4; cx++) {
      if (cx < 3 && (cy !== 1 || cx !== 1)) links.push([id(cx, cy), id(cx + 1, cy)]);
      if (cy < 2 && (cx + cy) % 2 === 0) links.push([id(cx, cy), id(cx, cy + 1)]);
    }
    links.push([id(3, 0), id(3, 1)], [id(3, 1), id(3, 2)], [id(0, 1), id(0, 2)]);
    route = [id(0, 1), id(0, 0), id(1, 0), id(2, 0), id(3, 0), id(3, 1), id(2, 1), id(3, 1), id(3, 2), id(2, 2), id(1, 2), id(0, 2)];
    main = id(2, 1);
  }
  return { halls, links, route, main };
}

/**
 * Masmorra temática: salões de chão firme sobre lava ou abismo (do tema),
 * corredores do mesmo chão e peças só do pack, escolhidas por caçada.
 */
export function dungeonMap(s: DungeonStyle): WorldMap {
  const r = rngFor(s.seed, 99);
  const { halls, links, route, main } = dungeonLayout(s.layout, r);
  const W = 90;
  const H = 70;
  const entry = route.map((i) => halls[i].c).reduce((a, b) => (b[0] < a[0] ? b : a));
  const first = route.findIndex((i) => halls[i].c === entry);
  const loop = [...route.slice(first), ...route.slice(0, first)];
  const mc = halls[main].c;
  const cx = Math.round(mc[0] * (W - 1));
  const cy = Math.round(mc[1] * (H - 1));
  return wildMap({
    seed: s.seed,
    w: W,
    h: H,
    theme: s.theme,
    paint(p) {
      p.rect(0, 0, 1, 1, Ground.Water);
      for (const h of halls) p.blob(h.c[0], h.c[1], h.rx, h.ry, Ground.Stone, 0.15);
      // Manchas do outro chão do tema dentro dos salões, para o piso não ficar liso.
      // (a cripta e a tumba não têm borda nesse chão: a mancha viraria um quadrado)
      const patches = s.theme !== THEMES.crypt && s.theme !== THEMES.tomb;
      for (const h of patches ? halls : []) for (let k = 0; k < 3; k++) p.blob(h.c[0] + (r() - 0.5) * h.rx, h.c[1] + (r() - 0.5) * h.ry, h.rx * (0.2 + r() * 0.2), h.ry * (0.2 + r() * 0.2), Ground.Grass, 0.3, Ground.Stone);
      for (const [a, b] of links) p.trail([halls[a].c, halls[b].c], 4, Ground.Stone, Ground.Water);
      p.trail([[0.02, entry[1]], entry], 4, Ground.Stone, Ground.Water);
    },
    fixed: (s.centerpiece ?? []).map(([k, dx, dy, v]): [ObjectKind, number, number, number?] => [k, cx + dx, cy + dy, v]),
    campGround: Ground.Stone,
    camp: s.props,
    // No salão principal a rota passa embaixo do centro, para deixar o trono livre.
    route: [[0.04, entry[1]], ...loop.map((i): Frac => (i === main && s.centerpiece ? [halls[i].c[0], halls[i].c[1] + 0.09] : halls[i].c))],
    scatter: [],
  });
}

const D = (seed: number, theme: Theme, layout: DungeonLayout, props: [ObjectKind, number][], centerpiece?: DungeonStyle['centerpiece']) =>
  () => dungeonMap({ seed, theme, layout, props, centerpiece });

/** Trono: estátuas dos lados, braseiros na frente e uma colunata atrás. */
const throne = (statue: ObjectKind, pillar: ObjectKind): [ObjectKind, number, number, number?][] => [
  [statue, -4, -5, 0], [statue, 3, -5, 1],
  [pillar, -6, -7], [pillar, -2, -8], [pillar, 2, -8], [pillar, 6, -7],
  ['brazier', -3, -1], ['brazier', 3, -1],
];

/** O mapa de cada caçada de masmorra (id da caçada → mapa). */
export const DUNGEON_HUNTS: Record<string, () => WorldMap> = {
  // Cavernas
  spider_nest: D(12, THEMES.cave, 'gallery', [['crystalTall', 14], ['gemCluster', 10], ['rubble', 70], ['sarcophagus', 3]]),
  minotaur_maze: D(15, THEMES.cave, 'maze', [['pillarDark', 15], ['rubble', 50], ['brazier', 12]]),
  minotaur_throne: D(16, THEMES.cave, 'hub', [['pillarDark', 9], ['rubble', 50], ['brazier', 10], ['crystalTall', 8]], throne('hornStatue', 'pillarDark')),
  // Palácio das Asuras (300-325; scripts/data/gen_asura_palace.py)
  dawnfire_terrace: D(151, THEMES.volcano, 'gallery', [['pillarWhite', 14], ['brazier', 18], ['goldUrn', 10], ['gemCluster', 8]]),
  frozen_gardens: D(152, THEMES.ice, 'maze', [['pillarWhite', 12], ['moonStatue', 6], ['crystalTall', 10], ['brazier', 8]]),
  true_asura_court: D(153, THEMES.treasure, 'ring', [['angelStatue', 6], ['goldUrn', 14], ['brazier', 16], ['gemCluster', 10]]),
  queens_chamber: D(154, THEMES.treasure, 'hub', [['pillarWhite', 14], ['goldUrn', 12], ['brazier', 12]], [...throne('angelStatue', 'pillarWhite'), ['gemCluster', -1, -3]]),
  asura_throne: D(155, THEMES.treasure, 'hub', [['angelStatue', 6], ['pillarWhite', 14], ['goldUrn', 12], ['brazier', 14]], throne('hornStatue', 'pillarWhite')),
  // Abismo Afogado (325-350; scripts/data/gen_drowned_abyss.py)
  sunken_ruins: D(156, THEMES.ice, 'gallery', [['pillarWhite', 14], ['rubble', 50], ['crystalTall', 10], ['gemCluster', 8]]),
  drowned_rift: D(157, THEMES.void, 'maze', [['crystalTall', 14], ['rubble', 50], ['voidCrystal', 8]]),
  leviathan_reef: D(158, THEMES.ice, 'ring', [['gemCluster', 14], ['crystalTall', 12], ['rubble', 40], ['pillarWhite', 8]]),
  drowned_sanctum: D(159, THEMES.ice, 'hub', [['pillarWhite', 14], ['crystalTall', 10], ['brazier', 8]], [...throne('moonStatue', 'pillarWhite'), ['gemCluster', -1, -3]]),
  leviathan_maw: D(160, THEMES.void, 'hub', [['voidCrystal', 10], ['crystalTall', 14], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
  // Caverna dos Heróis (475-500; scripts/data/gen_hero_cave.py)
  fallen_heroes_hall: D(190, THEMES.cave, 'gallery', [['giantRock', 10], ['brazier', 12], ['rubble', 40]]),
  champions_gallery: D(191, THEMES.crypt, 'hub', [['pillarDark', 12], ['brazier', 12], ['sarcophagus', 6]]),
  legends_crypt: D(192, THEMES.crypt, 'maze', [['sarcophagus', 14], ['brazier', 10], ['cross', 6], ['rubble', 30]]),
  oath_hall: D(193, THEMES.treasure, 'hub', [['pillarWhite', 12], ['brazier', 12], ['goldUrn', 8]], [...throne('angelStatue', 'pillarWhite'), ['goldUrn', -1, -3]]),
  champion_throne: D(194, THEMES.treasure, 'hub', [['pillarWhite', 14], ['goldUrn', 14], ['brazier', 16]], throne('angelStatue', 'pillarWhite')),
  // Torre dos Bruxos (450-475; scripts/data/gen_warlock_tower.py)
  warlock_library: D(185, THEMES.crypt, 'gallery', [['pillarDark', 12], ['brazier', 14], ['sarcophagus', 6], ['rubble', 30]]),
  infernal_furnace: D(186, THEMES.volcano, 'ring', [['brazier', 18], ['anvil', 4], ['rubble', 40]]),
  fanatic_altar: D(187, THEMES.void, 'maze', [['voidCrystal', 12], ['brazier', 10], ['rubble', 40]]),
  tower_council: D(188, THEMES.void, 'hub', [['pillarDark', 12], ['brazier', 12], ['voidCrystal', 8]], [...throne('hornStatue', 'pillarDark'), ['voidCrystal', -1, -3]]),
  flame_throne: D(189, THEMES.volcano, 'hub', [['brazier', 18], ['pillarDark', 10], ['rubble', 30]], throne('hornStatue', 'pillarDark')),
  // Templo da Cobra (425-450; scripts/data/gen_cobra_temple.py)
  serpent_courtyard: D(180, THEMES.treasure, 'ring', [['pillarWhite', 12], ['goldUrn', 8], ['brazier', 10], ['rubble', 30]]),
  serpent_market: D(181, THEMES.cave, 'hub', [['barrel', 12], ['crate', 12], ['goldUrn', 6], ['rubble', 30]]),
  venom_chamber: D(182, THEMES.crypt, 'maze', [['sarcophagus', 10], ['brazier', 10], ['goldUrn', 8], ['rubble', 30]]),
  serpent_sanctum: D(183, THEMES.treasure, 'hub', [['pillarWhite', 12], ['goldUrn', 10], ['brazier', 12]], [...throne('angelStatue', 'pillarWhite'), ['goldUrn', -1, -3]]),
  serpent_throne: D(184, THEMES.treasure, 'hub', [['pillarWhite', 14], ['goldUrn', 14], ['brazier', 14]], throne('hornStatue', 'pillarWhite')),
  // Cidadela do Usurpador (400-425; scripts/data/gen_usurper_citadel.py)
  usurper_walls: D(175, THEMES.crypt, 'gallery', [['pillarDark', 14], ['brazier', 12], ['rubble', 40]]),
  usurper_barracks: D(176, THEMES.cave, 'hub', [['barrel', 12], ['crate', 12], ['anvil', 4], ['brazier', 10], ['rubble', 30]]),
  usurped_hall: D(177, THEMES.treasure, 'ring', [['pillarWhite', 12], ['goldUrn', 10], ['brazier', 14]]),
  usurper_council: D(178, THEMES.treasure, 'hub', [['pillarDark', 12], ['goldUrn', 10], ['brazier', 12]], [...throne('hornStatue', 'pillarDark'), ['goldUrn', -1, -3]]),
  usurper_throne: D(179, THEMES.treasure, 'hub', [['pillarWhite', 14], ['goldUrn', 12], ['brazier', 14]], throne('angelStatue', 'pillarWhite')),
  // Jardim Corrompido (375-400; scripts/data/gen_corrupted_garden.py)
  pinecone_woods: D(170, THEMES.cave, 'ring', [['giantRock', 10], ['rubble', 40], ['gemCluster', 6]]),
  haunted_greenhouse: D(171, THEMES.crypt, 'maze', [['pillarDark', 12], ['rubble', 40], ['brazier', 8]]),
  rotten_roots: D(172, THEMES.void, 'ring', [['voidCrystal', 12], ['rubble', 50], ['giantRock', 8]]),
  garden_heart: D(173, THEMES.void, 'hub', [['voidCrystal', 10], ['crystalTall', 10], ['brazier', 8]], [...throne('moonStatue', 'pillarDark'), ['voidCrystal', -1, -3]]),
  end_hollow: D(174, THEMES.void, 'hub', [['voidCluster', 12], ['giantRock', 10], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
  // Vale Primevo (350-375; scripts/data/gen_primeval_valley.py)
  raptor_plains: D(165, THEMES.cave, 'ring', [['giantRock', 14], ['rubble', 40], ['crystalTall', 6]]),
  primeval_jungle: D(166, THEMES.cave, 'maze', [['giantRock', 10], ['rubble', 50], ['gemCluster', 8]]),
  tyrant_caldera: D(167, THEMES.volcano, 'ring', [['brazier', 14], ['rubble', 50], ['giantRock', 10]]),
  tyrant_nest: D(168, THEMES.volcano, 'hub', [['giantRock', 12], ['brazier', 10], ['rubble', 30]], [...throne('hornStatue', 'pillarDark'), ['giantRock', -1, -3]]),
  tyrant_throne: D(169, THEMES.volcano, 'hub', [['brazier', 14], ['giantRock', 10], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
  cyclops_lair: D(17, THEMES.cave, 'ring', [['anvil', 5], ['brazier', 12], ['barrel', 12], ['crate', 12], ['oreBig', 8], ['rubble', 40]], [['anvil', -1, -2], ['brazier', -3, -2], ['brazier', 2, -2]]),
  giant_peaks: D(23, THEMES.ice, 'ring', [['giantRock', 12], ['crystalTall', 16], ['voidCrystal', 14]]),
  // Vulcão
  dragon_nest: D(18, THEMES.volcano, 'hub', [['oreBig', 12], ['crystalTall', 18], ['rubble', 50], ['gemCluster', 8]], [['gemCluster', -1, -2], ['gemCluster', 0, -3], ['gemCluster', 1, -2], ['oreBig', -4, -4], ['oreBig', 3, -4]]),
  dragon_throne: D(21, THEMES.volcano, 'hub', [['oreBig', 8], ['crystalTall', 12], ['rubble', 50], ['pillarDark', 5]], throne('hornStatue', 'pillarDark')),
  sulfur_mines: D(22, THEMES.volcano, 'gallery', [['mineTunnel', 6], ['gemCluster', 14], ['crystalTall', 10], ['brazier', 12], ['crate', 10], ['barrel', 10], ['rubble', 50]]),
  demon_rift: D(20, THEMES.hell, 'gallery', [['hornStatue', 6], ['voidCoral', 12], ['brazier', 10], ['rubble', 50]]),
  // Inferno
  infernal_abyss: D(30, THEMES.hell, 'ring', [['voidCoral', 16], ['brazier', 12], ['hornStatue', 4], ['rubble', 60]]),
  ghazbaran_lair: D(31, THEMES.hell, 'maze', [['hornStatue', 8], ['brazier', 16], ['gargoyle', 4], ['rubble', 40]]),
  ghazbaran_temple: D(32, THEMES.hell, 'hub', [['angelStatue', 6], ['pillarWhite', 9], ['brazier', 10], ['rubble', 40]], throne('angelStatue', 'pillarWhite')),
  zathroth_throne: D(35, THEMES.hell, 'hub', [['gargoyle', 6], ['pillarDark', 9], ['brazier', 12], ['rubble', 40]], [...throne('hornStatue', 'pillarDark'), ['moonStatue', -1, -6]]),
  // Criptas e tumbas
  vampire_crypt: D(19, THEMES.crypt, 'maze', [['sarcophagus', 30], ['pillarDark', 8], ['brazier', 10], ['gravestone', 10], ['cross', 6]]),
  black_knight_crypt: D(24, THEMES.crypt, 'hub', [['sarcophagus', 22], ['hornStatue', 6], ['pillarDark', 10], ['brazier', 10]], throne('hornStatue', 'pillarDark')),
  deep_tomb: D(6, THEMES.tomb, 'gallery', [['sarcophagus', 40], ['pillarDark', 6], ['cross', 8], ['rubble', 30]]),
  general_crypt: D(10, THEMES.tomb, 'hub', [['sarcophagus', 30], ['hornStatue', 4], ['pillarDark', 8], ['brazier', 8]], [['sarcophagus', -1, -2, 3], ['hornStatue', -5, -4, 0], ['hornStatue', 3, -4, 1], ['brazier', -3, 1], ['brazier', 2, 1]]),
  // Gelo
  eternal_glacier: D(25, THEMES.ice, 'ring', [['crystalTall', 26], ['voidCrystal', 26], ['oreBig', 6]]),
  frost_citadel: D(27, THEMES.ice, 'hub', [['pillarDark', 11], ['angelStatue', 4], ['voidCrystal', 16], ['brazier', 6]], throne('angelStatue', 'pillarDark')),
  // Vazio
  nightmare_valley: D(29, THEMES.void, 'gallery', [['voidCrystal', 30], ['voidCluster', 14], ['voidCoral', 16], ['gargoyle', 4]]),
  void_core: D(33, THEMES.void, 'hub', [['voidCrystal', 40], ['voidCluster', 20], ['voidCoral', 10], ['moonStatue', 3]], [['moonStatue', -1, -5], ['voidCluster', -5, -2], ['voidCluster', 3, -2]]),
  shadow_cathedral: D(28, THEMES.void, 'hub', [['gargoyle', 12], ['moonStatue', 6], ['pillarDark', 12], ['brazier', 8]], throne('gargoyle', 'pillarDark')),
  primordial_sanctum: D(34, THEMES.void, 'ring', [['angelStatue', 8], ['pillarWhite', 11], ['moonStatue', 4], ['voidCrystal', 16]], [['moonStatue', -1, -4], ['angelStatue', -5, -3, 0], ['angelStatue', 3, -3, 1]]),
  // Nível 130 a 200 (scripts/data/gen_hunts_130_200.py)
  ashen_wastes: D(36, THEMES.volcano, 'gallery', [['oreBig', 14], ['crystalTall', 12], ['brazier', 10], ['rubble', 60]]),
  damned_forge: D(37, THEMES.volcano, 'maze', [['anvil', 8], ['brazier', 16], ['barrel', 10], ['crate', 10], ['rubble', 40]]),
  crystal_caverns: D(38, THEMES.cave, 'ring', [['crystalTall', 30], ['gemCluster', 18], ['rubble', 40]]),
  black_diamond_mines: D(39, THEMES.cave, 'gallery', [['mineTunnel', 6], ['gemCluster', 16], ['oreBig', 12], ['crate', 8], ['rubble', 50]]),
  crystal_throne: D(40, THEMES.cave, 'hub', [['crystalTall', 16], ['gemCluster', 12], ['pillarDark', 8]], throne('hornStatue', 'pillarDark')),
  forgotten_tundra: D(41, THEMES.ice, 'ring', [['giantRock', 10], ['crystalTall', 24], ['voidCrystal', 12]]),
  frozen_fortress: D(42, THEMES.ice, 'hub', [['pillarDark', 12], ['brazier', 8], ['voidCrystal', 14]], throne('angelStatue', 'pillarDark')),
  kings_necropolis: D(43, THEMES.crypt, 'gallery', [['sarcophagus', 34], ['pillarDark', 10], ['brazier', 10], ['cross', 6]]),
  pharaoh_crypt: D(44, THEMES.tomb, 'maze', [['sarcophagus', 36], ['hornStatue', 4], ['brazier', 10], ['rubble', 30]]),
  eternal_tomb: D(45, THEMES.tomb, 'hub', [['sarcophagus', 24], ['pillarDark', 10], ['brazier', 10]], [...throne('hornStatue', 'pillarDark'), ['sarcophagus', -1, -3, 3]]),
  hell_furnace: D(46, THEMES.hell, 'ring', [['voidCoral', 14], ['brazier', 16], ['hornStatue', 6], ['rubble', 60]]),
  soul_market: D(47, THEMES.hell, 'maze', [['gargoyle', 6], ['brazier', 14], ['crate', 8], ['barrel', 8], ['rubble', 40]]),
  astral_rift: D(48, THEMES.void, 'hub', [['voidCrystal', 36], ['voidCluster', 18], ['moonStatue', 4]], [['moonStatue', -1, -5], ['voidCluster', -5, -2], ['voidCluster', 3, -2]]),
  forgotten_library: D(49, THEMES.void, 'gallery', [['pillarWhite', 14], ['moonStatue', 6], ['voidCrystal', 18], ['gargoyle', 4]]),
  fallen_star_sanctum: D(50, THEMES.void, 'hub', [['angelStatue', 8], ['pillarWhite', 12], ['voidCrystal', 14]], throne('angelStatue', 'pillarWhite')),
  primordial_nest: D(51, THEMES.volcano, 'hub', [['gemCluster', 14], ['oreBig', 14], ['crystalTall', 14], ['rubble', 50]], [['gemCluster', -1, -2], ['gemCluster', 0, -3], ['gemCluster', 1, -2], ['oreBig', -4, -4], ['oreBig', 3, -4]]),
  dragon_hoard: D(52, THEMES.volcano, 'gallery', [['gemCluster', 20], ['crate', 12], ['barrel', 10], ['oreBig', 10], ['rubble', 40]]),
  chaos_throne: D(53, THEMES.hell, 'ring', [['voidCoral', 18], ['gargoyle', 6], ['brazier', 14], ['rubble', 60]]),
  gods_vault: D(54, THEMES.hell, 'maze', [['angelStatue', 6], ['pillarWhite', 10], ['brazier', 12], ['crate', 8]]),
  ozzarak_end: D(55, THEMES.hell, 'hub', [['gargoyle', 8], ['pillarDark', 10], ['brazier', 14], ['rubble', 40]], [...throne('hornStatue', 'pillarDark'), ['moonStatue', -1, -6]]),
  // Meio-termo do 115 ao 195 (scripts/data/gen_balanced_high.py)
  ruin_portal: D(90, THEMES.hell, 'gallery', [['hornStatue', 6], ['voidCoral', 14], ['brazier', 12], ['rubble', 50]]),
  ember_rift: D(91, THEMES.volcano, 'ring', [['oreBig', 12], ['brazier', 14], ['voidCoral', 8], ['rubble', 50]]),
  molten_grottoes: D(92, THEMES.cave, 'maze', [['crystalTall', 18], ['gemCluster', 12], ['brazier', 8], ['rubble', 40]]),
  frostbite_pass: D(93, THEMES.ice, 'gallery', [['giantRock', 8], ['crystalTall', 20], ['voidCrystal', 14]]),
  silent_barrow: D(94, THEMES.crypt, 'ring', [['sarcophagus', 30], ['pillarDark', 8], ['cross', 8], ['brazier', 8]]),
  burning_catacombs: D(95, THEMES.hell, 'gallery', [['sarcophagus', 16], ['brazier', 18], ['hornStatue', 4], ['rubble', 40]]),
  celestial_breach: D(96, THEMES.void, 'ring', [['voidCrystal', 30], ['voidCluster', 14], ['moonStatue', 4], ['gargoyle', 4]]),
  dragon_observatory: D(97, THEMES.volcano, 'maze', [['gemCluster', 14], ['pillarWhite', 8], ['oreBig', 10], ['rubble', 40]]),
  edge_of_ending: D(98, THEMES.hell, 'gallery', [['voidCoral', 16], ['gargoyle', 6], ['brazier', 12], ['rubble', 50]]),
  // Instâncias novas (scripts/data/gen_instances.py)
  goblin_king_hall: D(60, THEMES.cave, 'hub', [['crate', 14], ['barrel', 12], ['brazier', 8], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
  orc_warchief_keep: D(61, THEMES.cave, 'hub', [['crate', 10], ['barrel', 10], ['brazier', 12], ['pillarDark', 8]], throne('hornStatue', 'pillarDark')),
  medusa_lair: D(62, THEMES.cave, 'ring', [['crystalTall', 16], ['gemCluster', 10], ['rubble', 40]], throne('angelStatue', 'pillarDark')),
  cyclops_forge: D(63, THEMES.volcano, 'hub', [['anvil', 10], ['brazier', 16], ['oreBig', 10], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
  vampire_lord_crypt: D(64, THEMES.crypt, 'hub', [['sarcophagus', 28], ['pillarDark', 10], ['brazier', 10], ['cross', 6]], [...throne('gargoyle', 'pillarDark'), ['sarcophagus', -1, -3, 3]]),
  fallen_knights_hall: D(65, THEMES.tomb, 'hub', [['pillarDark', 14], ['hornStatue', 6], ['brazier', 12], ['rubble', 30]], throne('hornStatue', 'pillarDark')),
  beholder_chamber: D(66, THEMES.void, 'hub', [['gargoyle', 10], ['moonStatue', 6], ['voidCrystal', 20], ['brazier', 8]], [...throne('gargoyle', 'pillarDark'), ['moonStatue', -1, -6]]),
  furnace_heart: D(67, THEMES.volcano, 'hub', [['anvil', 8], ['brazier', 18], ['oreBig', 12], ['rubble', 50]], throne('hornStatue', 'pillarDark')),
  frost_giant_throne: D(68, THEMES.ice, 'hub', [['giantRock', 10], ['crystalTall', 18], ['voidCrystal', 12]], throne('angelStatue', 'pillarDark')),
  infernal_pit: D(69, THEMES.hell, 'hub', [['voidCoral', 14], ['gargoyle', 8], ['brazier', 16], ['rubble', 50]], throne('hornStatue', 'pillarDark')),
  primordial_lair: D(70, THEMES.volcano, 'hub', [['gemCluster', 18], ['oreBig', 14], ['crystalTall', 12], ['rubble', 50]], [...throne('hornStatue', 'pillarDark'), ['gemCluster', -1, -3]]),
  // Santuário do Arquimago (150): biblioteca tomada por demônios, cristais arcanos e estátuas (scripts/data/gen_zharvos.py)
  zharvos_sanctum: D(140, THEMES.void, 'hub', [['voidCrystal', 22], ['moonStatue', 6], ['brazier', 14], ['pillarDark', 10]], [...throne('moonStatue', 'pillarDark'), ['voidCrystal', -1, -3]]),
  // Além do Fim: instâncias do 210, 225 e 240 (scripts/data/gen_instances_beyond.py)
  void_citadel: D(120, THEMES.void, 'hub', [['voidCrystal', 26], ['voidCluster', 14], ['gargoyle', 6], ['pillarDark', 8]], [...throne('moonStatue', 'pillarDark'), ['voidCluster', -1, -3]]),
  shattered_heaven: D(121, THEMES.void, 'hub', [['angelStatue', 8], ['pillarWhite', 14], ['rubble', 40], ['voidCrystal', 10]], [...throne('angelStatue', 'pillarWhite'), ['moonStatue', -1, -6]]),
  primal_chaos: D(122, THEMES.hell, 'hub', [['voidCoral', 16], ['hornStatue', 6], ['brazier', 16], ['rubble', 60]], [...throne('hornStatue', 'pillarDark'), ['gargoyle', -1, -6]]),
  // Fortaleza de Valdeferro (200-250, a guerra das Ordens; scripts/data/gen_falcon_war.py)
  valdeferro_walls: D(130, THEMES.tomb, 'ring', [['pillarDark', 14], ['brazier', 14], ['crate', 8], ['rubble', 40]]),
  oath_courtyard: D(131, THEMES.tomb, 'gallery', [['angelStatue', 6], ['pillarWhite', 12], ['brazier', 12], ['rubble', 30]]),
  order_hall: D(132, THEMES.tomb, 'hub', [['pillarWhite', 16], ['brazier', 14], ['hornStatue', 4], ['rubble', 20]], throne('angelStatue', 'pillarWhite')),
  masters_crypt: D(133, THEMES.crypt, 'maze', [['sarcophagus', 22], ['cross', 8], ['pillarDark', 10], ['brazier', 8]]),
  fallen_gallery: D(195, THEMES.tomb, 'maze', [['pillarWhite', 14], ['sarcophagus', 12], ['brazier', 10], ['rubble', 24]]),
  // Caçadas de XP entre as de 25 em 25 níveis (218 a 468), com os monstros da região.
  ramparts_of_oath: D(196, THEMES.tomb, 'gallery', [['pillarDark', 12], ['brazier', 12], ['crate', 6], ['rubble', 36]]),
  heralds_corridor: D(197, THEMES.tomb, 'maze', [['pillarWhite', 12], ['angelStatue', 4], ['brazier', 12], ['rubble', 24]]),
  whispering_shelves: D(198, THEMES.ice, 'maze', [['crystalTall', 12], ['pillarWhite', 10], ['crate', 10], ['rubble', 24]]),
  wailing_ossuary: D(199, THEMES.crypt, 'ring', [['ossuary', 14], ['sarcophagus', 10], ['brazier', 10], ['rubble', 30]]),
  moonlit_cloister: D(200, THEMES.ice, 'gallery', [['pillarWhite', 14], ['moonStatue', 6], ['crystalTall', 8], ['brazier', 8]]),
  coral_grotto: D(201, THEMES.ice, 'maze', [['gemCluster', 12], ['crystalTall', 10], ['rubble', 44]]),
  pterosaur_cliffs: D(202, THEMES.cave, 'gallery', [['giantRock', 14], ['rubble', 44], ['brazier', 6]]),
  rotting_orchard: D(203, THEMES.crypt, 'ring', [['giantRock', 8], ['pillarDark', 10], ['rubble', 44]]),
  officers_quarters: D(204, THEMES.cave, 'maze', [['barrel', 10], ['crate', 10], ['brazier', 10], ['rubble', 30]]),
  serpent_cloister: D(205, THEMES.treasure, 'gallery', [['pillarWhite', 12], ['goldUrn', 8], ['brazier', 10], ['rubble', 24]]),
  ember_halls: D(206, THEMES.volcano, 'gallery', [['brazier', 18], ['pillarDark', 10], ['rubble', 36]]),
  // Regiões do 500 ao 600 (scripts/data/gen_500_600.py)
  starlit_rift: D(207, THEMES.void, 'gallery', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  cosmic_scriptorium: D(208, THEMES.void, 'hub', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  nebula_nest: D(209, THEMES.void, 'ring', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  celestial_vault: D(210, THEMES.void, 'maze', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  winter_steppe: D(211, THEMES.ice, 'gallery', [['crystalTall', 12], ['giantRock', 8], ['rubble', 40]]),
  frozen_bastion: D(212, THEMES.ice, 'hub', [['crystalTall', 12], ['giantRock', 8], ['rubble', 40]]),
  frostwyrm_peaks: D(213, THEMES.ice, 'ring', [['crystalTall', 12], ['giantRock', 8], ['rubble', 40]]),
  glacier_heart: D(214, THEMES.ice, 'maze', [['crystalTall', 12], ['giantRock', 8], ['rubble', 40]]),
  necropolis_gates: D(215, THEMES.tomb, 'gallery', [['sarcophagus', 12], ['ossuary', 8], ['brazier', 10], ['rubble', 30]]),
  royal_mausoleum: D(216, THEMES.tomb, 'hub', [['sarcophagus', 12], ['ossuary', 8], ['brazier', 10], ['rubble', 30]]),
  necromancer_spire: D(217, THEMES.tomb, 'ring', [['sarcophagus', 12], ['ossuary', 8], ['brazier', 10], ['rubble', 30]]),
  lich_king_vault: D(218, THEMES.tomb, 'maze', [['sarcophagus', 12], ['ossuary', 8], ['brazier', 10], ['rubble', 30]]),
  chaos_wastes: D(219, THEMES.hell, 'gallery', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  abyssal_forge: D(220, THEMES.hell, 'hub', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  defiled_sanctum: D(221, THEMES.hell, 'ring', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  chaos_throne_hall: D(222, THEMES.hell, 'maze', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  // Regiões do 600 ao 700 (scripts/data/gen_600_700.py)
  primordial_rift: D(223, THEMES.void, 'gallery', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  void_archive: D(224, THEMES.void, 'hub', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  astral_eclipse: D(225, THEMES.void, 'ring', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  primordial_vault: D(226, THEMES.void, 'maze', [['crystalTall', 10], ['brazier', 10], ['rubble', 36]]),
  titan_ridge: D(227, THEMES.cave, 'gallery', [['giantRock', 12], ['crystalTall', 8], ['rubble', 40]]),
  ancient_quarry: D(228, THEMES.cave, 'hub', [['giantRock', 12], ['crystalTall', 8], ['rubble', 40]]),
  thunder_peaks: D(229, THEMES.cave, 'ring', [['giantRock', 12], ['crystalTall', 8], ['rubble', 40]]),
  titan_forge: D(230, THEMES.cave, 'maze', [['giantRock', 12], ['crystalTall', 8], ['rubble', 40]]),
  scorched_bastion: D(231, THEMES.hell, 'gallery', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  ashen_sepulcher: D(232, THEMES.hell, 'hub', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  pyre_spire: D(233, THEMES.hell, 'ring', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  black_sun_altar: D(234, THEMES.hell, 'maze', [['brazier', 16], ['pillarDark', 10], ['rubble', 36]]),
  twilight_gates: D(235, THEMES.tomb, 'gallery', [['pillarWhite', 12], ['brazier', 10], ['rubble', 30]]),
  moonlit_sanctuary: D(236, THEMES.tomb, 'hub', [['pillarWhite', 12], ['brazier', 10], ['rubble', 30]]),
  astral_highlands: D(237, THEMES.tomb, 'ring', [['pillarWhite', 12], ['brazier', 10], ['rubble', 30]]),
  eternal_twilight_throne: D(238, THEMES.tomb, 'maze', [['pillarWhite', 12], ['brazier', 10], ['rubble', 30]]),
  lion_hall: D(134, THEMES.tomb, 'hub', [['angelStatue', 6], ['pillarWhite', 14], ['brazier', 14], ['rubble', 30]], throne('angelStatue', 'pillarWhite')),
  falcon_gates: D(135, THEMES.tomb, 'ring', [['pillarDark', 16], ['brazier', 16], ['crate', 6], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
  oath_chamber: D(136, THEMES.tomb, 'hub', [['pillarWhite', 14], ['angelStatue', 6], ['brazier', 12]], throne('angelStatue', 'pillarWhite')),
  falcon_throne: D(137, THEMES.crypt, 'hub', [['pillarDark', 16], ['gargoyle', 6], ['brazier', 16], ['cross', 4]], [...throne('hornStatue', 'pillarDark'), ['gargoyle', -1, -6]]),
  lion_bastion: D(138, THEMES.tomb, 'hub', [['angelStatue', 6], ['pillarWhite', 12], ['brazier', 14], ['rubble', 20]], throne('angelStatue', 'pillarWhite')),
  falcon_nest: D(139, THEMES.crypt, 'hub', [['gargoyle', 8], ['pillarDark', 12], ['brazier', 12], ['rubble', 30]], throne('hornStatue', 'pillarDark')),
  // Biblioteca Proibida (250-275; scripts/data/gen_forbidden_library.py)
  burning_stacks: D(141, THEMES.volcano, 'maze', [['pillarDark', 14], ['brazier', 18], ['crate', 8], ['rubble', 40]]),
  frozen_archive: D(142, THEMES.ice, 'gallery', [['crystalTall', 16], ['pillarWhite', 12], ['crate', 8], ['rubble', 20]]),
  storm_reading_room: D(143, THEMES.void, 'ring', [['voidCrystal', 18], ['pillarWhite', 10], ['moonStatue', 4], ['brazier', 10]]),
  index_vault: D(144, THEMES.tomb, 'hub', [['pillarWhite', 14], ['brazier', 14], ['crate', 8], ['rubble', 20]], [...throne('moonStatue', 'pillarWhite'), ['voidCrystal', -1, -3]]),
  golden_reading_hall: D(145, THEMES.tomb, 'hub', [['angelStatue', 6], ['pillarWhite', 14], ['brazier', 16]], throne('angelStatue', 'pillarWhite')),
  // Catacumbas Esquecidas (275-300; scripts/data/gen_forgotten_catacombs.py)
  bone_legion_halls: D(146, THEMES.crypt, 'gallery', [['sarcophagus', 18], ['ossuary', 10], ['pillarDark', 10], ['brazier', 10]]),
  embalmers_crypt: D(147, THEMES.crypt, 'maze', [['sarcophagus', 24], ['cross', 8], ['ossuary', 8], ['brazier', 8]]),
  necromancer_sanctum: D(148, THEMES.hell, 'ring', [['ossuary', 12], ['gargoyle', 6], ['brazier', 16], ['rubble', 40]]),
  royal_ossuary: D(149, THEMES.crypt, 'hub', [['ossuary', 14], ['sarcophagus', 16], ['brazier', 12]], [...throne('gargoyle', 'pillarDark'), ['sarcophagus', -1, -3, 3]]),
  kings_tomb: D(150, THEMES.crypt, 'hub', [['sarcophagus', 20], ['pillarDark', 12], ['brazier', 14]], throne('hornStatue', 'pillarDark')),
  // Covis dos deuses (aba Chefes, scripts/data/gen_gods.py)
  lumira_cathedral: D(71, THEMES.void, 'hub', [['angelStatue', 8], ['pillarWhite', 12], ['brazier', 10]], throne('angelStatue', 'pillarWhite')),
  sylveth_grove: D(72, THEMES.cave, 'ring', [['crystalTall', 14], ['moonStatue', 6], ['giantRock', 8], ['rubble', 30]], [['moonStatue', -1, -4]]),
  aethon_spire: D(73, THEMES.void, 'hub', [['voidCrystal', 30], ['voidCluster', 14], ['moonStatue', 4]], [['moonStatue', -1, -5], ['voidCluster', -5, -2], ['voidCluster', 3, -2]]),
  // Covis simples (10 a 65)
  boar_den: D(79, THEMES.cave, 'ring', [['rubble', 40], ['giantRock', 8], ['crate', 6]], [['giantRock', -1, -4]]),
  spider_mother_nest: D(80, THEMES.cave, 'hub', [['rubble', 40], ['crystalTall', 8], ['gravestone', 6]], [['crystalTall', -1, -4]]),
  grey_wolf_lair: D(81, THEMES.ice, 'ring', [['giantRock', 10], ['crystalTall', 10], ['rubble', 20]], [['giantRock', -1, -4]]),
  hungry_ogre_cave: D(82, THEMES.cave, 'hub', [['barrel', 10], ['crate', 10], ['brazier', 8], ['rubble', 30]], throne('hornStatue', 'pillarDark')),
  weaver_web: D(161, THEMES.cave, 'hub', [['rubble', 40], ['crystalTall', 6], ['gravestone', 8]], [['crystalTall', -1, -4]]),
  rat_king_throne: D(162, THEMES.crypt, 'hub', [['barrel', 12], ['crate', 12], ['rubble', 30], ['brazier', 6]], throne('hornStatue', 'pillarDark')),
  old_mine_depths: D(163, THEMES.cave, 'ring', [['oreBig', 14], ['mineTunnel', 4], ['rubble', 30], ['brazier', 8]], [['giantRock', -1, -4]]),
  // Caçada do early game (42): galerias de mina
  abandoned_mine: D(164, THEMES.cave, 'gallery', [['oreBig', 16], ['mineTunnel', 6], ['crate', 8], ['brazier', 10], ['rubble', 30]], []),
  forgotten_knight_crypt: D(83, THEMES.crypt, 'hub', [['sarcophagus', 20], ['pillarDark', 8], ['brazier', 8], ['cross', 6]], [...throne('hornStatue', 'pillarDark'), ['sarcophagus', -1, -3, 3]]),
  // Covis menores (80 a 120)
  lumira_chapel: D(75, THEMES.crypt, 'hub', [['cross', 8], ['pillarWhite', 8], ['brazier', 10], ['angelStatue', 3]], throne('angelStatue', 'pillarWhite')),
  sylveth_glade: D(76, THEMES.cave, 'ring', [['giantRock', 12], ['crystalTall', 10], ['moonStatue', 4], ['rubble', 30]], [['moonStatue', -1, -4]]),
  aethon_tower: D(77, THEMES.void, 'hub', [['voidCrystal', 24], ['pillarDark', 8], ['moonStatue', 3]], [['moonStatue', -1, -5], ['voidCrystal', -4, -2], ['voidCrystal', 3, -2]]),
  kharvos_arena: D(78, THEMES.volcano, 'ring', [['brazier', 16], ['hornStatue', 6], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
  kharvos_fortress: D(74, THEMES.hell, 'hub', [['anvil', 6], ['hornStatue', 6], ['brazier', 16], ['pillarDark', 10], ['rubble', 40]], throne('hornStatue', 'pillarDark')),
};

/** Tile andável mais perto de `p` (busca em espiral). */
function nearestWalkable(map: WorldMap, p: Pt): Pt | null {
  for (let r = 0; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (walkable(map, p.x + dx, p.y + dy)) return { x: p.x + dx, y: p.y + dy };
      }
    }
  }
  return null;
}

/**
 * Rota em laço: liga os pontos em ordem pelo caminho mais curto e volta ao
 * primeiro. Ponto que não dá para alcançar é pulado.
 */
function buildRoute(map: WorldMap, waypoints: Pt[]): Pt[] {
  const stops = waypoints.map((p) => nearestWalkable(map, p)).filter((p): p is Pt => p !== null);
  if (stops.length === 0) return [];
  const route: Pt[] = [stops[0]];
  let cur = stops[0];
  for (const next of [...stops.slice(1), stops[0]]) {
    const leg = findPath(map, cur, (x, y) => x === next.x && y === next.y, 400);
    if (!leg) continue;
    route.push(...leg);
    cur = next;
  }
  // O último passo volta ao primeiro tile: tira para o laço não repetir.
  const last = route[route.length - 1];
  if (route.length > 1 && last.x === route[0].x && last.y === route[0].y) route.pop();
  return route;
}

/** Os que abrem uma janela (loja, depósito, mercado); 'talk' só conversa. */
export type NpcId = 'merchant' | 'depot' | 'market' | 'armor' | 'weapons' | 'jewelry' | 'runes' | 'potions' | 'imbuement' | 'adams' | 'rashid' | 'boss_shop' | 'dummy' | 'talk' | 'temple' | 'refinery' | 'kids_shop' | 'vote_shop' | 'forge' | 'reaper' | 'guide' | 'slayer' | 'halloween_shop';

export interface Npc {
  id: NpcId;
  name: string;
  /** Pasta em public/assets/npcs/<sprite>/ */
  sprite: string;
  x: number;
  y: number;
  /** Para onde olha parado (padrão: para baixo). */
  face?: 'down' | 'left' | 'right' | 'up';
  /** O que diz ao ser clicado (NPC de conversa). */
  lines?: string[];
  /** Ampliação do sprite (padrão 3; os heróis do Grimhold já vêm no tamanho final). */
  scale?: number;
}

/** Onde fica o NPC Guia na praça. */
export const GUIDE_NPC_POS = { x: 34, y: 24 };
/** Vulcanus (refino e Ascensão) na entrada da praça, do outro lado do Guia: todo mundo passa por ele. */
export const REFINERY_NPC_POS = { x: 31, y: 24 };

/** Moradores que passeiam pela cidade (só visual). */
export const CITIZENS = [
  'citizen_1_1', 'citizen_1_3', 'citizen_1_5', 'citizen_1_8', 'citizen_2_1', 'citizen_2_2',
  'citizen_2_6', 'citizen_3_2', 'citizen_3_6', 'citizen_4_2', 'citizen_4_5', 'citizen_4_7',
];

/** Mestres das vocações e guardas: conversam e ensinam o básico do jogo. */
export const CITY_TALKERS: Npc[] = [
  {
    id: 'talk',
    name: 'Hellel',
    sprite: 'hellel',
    scale: 1,
    x: 28,
    y: 12,
    lines: [
      'Sou Hellel, mestre dos Guerreiros. Toda caçada começa pelo portão ao norte.',
      'Clique em "Organizar caçada", escolha o lugar e a dificuldade. Seu personagem luta sozinho, mesmo com o jogo fechado.',
      'Cada caçada pede um nível mínimo. Comece pela Margem do Rio e vá subindo.',
      'No nível 30, volte aqui: a Promoção libera um treino especial da sua vocação.',
    ],
  },
  {
    id: 'talk',
    name: 'Ifigenia',
    sprite: 'ifigenia',
    scale: 1,
    x: 28,
    y: 15,
    lines: [
      'Ifigenia, mestra dos Caçadores. Fora da caçada, ninguém fica parado em Grimhold!',
      'Nas profissões você minera, pesca, corta lenha, forja, cozinha e faz artesanato.',
      'O minério vira barra na Forja, a barra vira equipamento. O peixe vira comida na Culinária.',
      'Comida cura durante a caçada. Escolha qual comer no painel de equipamento.',
    ],
  },
  {
    id: 'talk',
    name: 'Krash',
    sprite: 'krash',
    scale: 1,
    x: 36,
    y: 15,
    lines: [
      'Krash, mestre dos Arcanistas. Ouro move o Bastião.',
      'O Mercador, na loja de telhado vermelho, compra qualquer item por um preço fixo.',
      'No Mercado, na praça, você vende para outros jogadores pelo preço que quiser.',
      'O Depósito, de telhado azul, guarda tudo o que você ganhou. Mercado e Mercador só funcionam aqui na cidade.',
    ],
  },
  {
    id: 'talk',
    name: 'Alva',
    sprite: 'alva',
    scale: 1,
    x: 36,
    y: 12,
    lines: [
      'Alva, mestra dos Devotos. Que a luz te guarde lá fora.',
      'Se cair em combate, você perde um pouco de XP e volta para cá. Leve comida e não cace acima do seu nível.',
      'Equipamento melhor aumenta ataque e defesa. Equipe pelo Depósito.',
      'As instâncias de chefe precisam de uma chave, forjada com o que os chefes menores deixam cair.',
    ],
  },
  {
    id: 'talk',
    name: 'Guarda',
    sprite: 'guard',
    x: 30,
    y: 8,
    lines: ['Além deste portão ficam as caçadas. Boa sorte, aventureiro.'],
  },
  {
    id: 'talk',
    name: 'Guarda',
    sprite: 'guard',
    x: 34,
    y: 8,
    lines: ['Ninguém passa sem rumo. Escolha a caçada antes de sair.'],
  },
];

/**
 * Bastião de Grimhold: a cidade. Muralha ao norte com o portão das caçadas,
 * avenida de pedra até a praça da fonte, a loja do Mercador (telhado vermelho),
 * o Depósito (telhado azul), as bancas do Mercado na praça, o castelo e as casas.
 */
/** Sacerdote do Templo: conversa e vende a bênção. */
export const TEMPLE_NPC: Npc = {
  id: 'temple',
  name: 'Sacerdote',
  sprite: 'priest',
  x: 24,
  y: 31,
  lines: [
    'Bem-vindo ao Templo da Luz. Aqui rezamos por quem não voltou das caçadas.',
    'Quem morre sem a bênção pode perder o que veste. Com ela, os deuses guardam seus itens e metade do que você aprendeu.',
    'Os mortos-vivos do Cemitério Velho temem o dia. Mesmo assim, não vá antes do nível 20.',
    'Dizem que o General de Ossos guarda a cripta com o Cérbero. Só abre quem forja a chave.',
  ],
};

/** Taverneiro da Pousada do Bastião. */
export const INNKEEPER_NPC: Npc = {
  id: 'talk',
  name: 'Taverneiro',
  sprite: 'innkeeper',
  x: 41,
  y: 31,
  lines: [
    'Pousada do Bastião! Cerveja quente e boatos frios.',
    'Ouvi um pescador jurar que há um Kraken no Coração da Maré. Só com a concha das marés se chega lá.',
    'Os goblins da Toca deixam cair orelhas. Ninguém sabe para quê, mas o Mercador compra.',
  ],
};

/**
 * Bastião de Grimhold: a cidade. Muralha com o portão das caçadas ao norte; logo abaixo a
 * praça comercial (fonte, bancas do mercado e as lojas de frente para ela); a avenida desce
 * entre o Templo da Luz e a Pousada até a praça sul. Nas laterais, o pátio de treino, a
 * forja do Vulcanus e as casas.
 */
export function cityMap(): WorldMap {
  const w = 60;
  const h = 41;
  const rand = rngFor(77, 0);
  const ground = new Uint8Array(w * h);
  const deco = new Uint8Array(w * h);
  const blocked = new Uint8Array(w * h);
  const objects: MapObject[] = [];
  const at = (x: number, y: number) => y * w + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const fill = (x0: number, y0: number, x1: number, y1: number, g: Ground) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) ground[at(x, y)] = g;
  };

  // Pedra: saída do portão, praça comercial, avenida central, praça sul e a rua de baixo.
  fill(30, 7, 34, 9, Ground.Stone);
  fill(1, 10, 58, 17, Ground.Stone);
  fill(30, 18, 34, 30, Ground.Stone);
  fill(18, 31, 46, 34, Ground.Stone);
  fill(1, 35, 58, 36, Ground.Stone);
  // Pátio de treino (oeste) e forja (leste): terra batida.
  fill(3, 19, 17, 25, Ground.Path);
  fill(46, 19, 57, 25, Ground.Path);
  for (let i = 0; i < w * h; i++) if (ground[i] === Ground.Grass && rand() < 0.16) deco[i] = 1 + Math.floor(rand() * 20);

  const place = (kind: ObjectKind, x: number, y: number, variant = 0) => {
    objects.push({ kind, x, y, variant });
    for (const [bx, by] of OBJECTS[kind].block) if (inside(x + bx, y + by)) blocked[at(x + bx, y + by)] = 1;
  };

  // Muralha em volta, aberta só no portão das caçadas.
  place('gate', 29, 1);
  const wall = new Set<number>();
  const south = h - 3;
  for (let x = 0; x < w; x++) {
    if (x < 29 || x > 35) wall.add(at(x, 1));
    wall.add(at(x, south));
  }
  for (let y = 1; y <= south; y++) {
    wall.add(at(0, y));
    wall.add(at(w - 1, y));
  }
  const isWall = (x: number, y: number) => inside(x, y) && wall.has(at(x, y));
  for (const i of wall) {
    const x = i % w;
    const y = Math.floor(i / w);
    const n = isWall(x, y - 1);
    const s = isWall(x, y + 1);
    const e = isWall(x + 1, y);
    const wst = isWall(x - 1, y);
    const v = e && wst ? 0 : n && s ? 1 : e && s ? 2 : wst && s ? 3 : e && n ? 4 : wst && n ? 5 : e ? 6 : wst ? 7 : s ? 8 : 9;
    place('wall', x, y, v);
    if (!s && y + 2 < h) place('wallFace', x, y + 1, v === 4 || v === 6 ? 0 : v === 5 || v === 7 ? 2 : 1);
  }

  // Lojas coladas na muralha, de frente para a praça (porta na coluna 3 da casa).
  place('house', 1, 2, 1); // Armeiro
  place('house', 8, 2, 2); // Mercador
  place('cabin', 15, 3, 0); // Armas
  place('house', 22, 2, 0); // Mestre Alden
  place('house', 36, 2, 3); // Depósito
  place('cabin', 43, 3, 1); // Valdemar
  place('house', 50, 2, 2); // Runista
  place('sign', 6, 10, 2);
  place('sign', 13, 10, 0);
  place('sign', 20, 10, 3);
  for (const [x, v] of [[2, 0], [10, 2], [24, 4], [40, 1], [45, 3], [55, 5]] as const) place('flowerBox', x, 10, v);

  // Praça comercial: fonte no meio, os mestres em volta, bancas do mercado nas pontas.
  place('fountain', 30, 12);
  place('bench', 26, 13);
  place('bench', 37, 13);
  for (const [x, y, v] of [[29, 11, 0], [35, 11, 1], [29, 16, 2], [35, 16, 3]] as const) place('flowerBox', x, y, v);
  for (const [x, v] of [[4, 0], [8, 1], [48, 2], [52, 0]] as const) place('stall', x, 12, v);
  place('crate', 12, 13, 1);
  place('barrel', 13, 13, 0);
  place('produce', 46, 13, 0);
  place('barrel', 47, 13, 2);
  place('sign', 7, 16, 1);
  place('roundTree', 17, 12);
  place('roundTree', 41, 12);

  // Templo da Luz e Pousada do Bastião dos dois lados da avenida.
  place('hall', 22, 18, 0);
  place('hall', 37, 18, 1);
  place('sign', 43, 31, 4);
  for (const [x, y, v] of [[21, 31, 0], [28, 31, 3], [36, 31, 2]] as const) place('pot', x, y, v);
  for (const [x, y] of [[18, 20], [44, 20], [18, 26], [44, 26]] as const) place('roundTree', x, y);

  // Pátio de treino (cercado, com o boneco) e a forja do Vulcanus.
  for (let x = 3; x <= 15; x++) if (x < 8 || x > 10) place('fence', x, 19, 1);
  for (let y = 20; y <= 25; y++) place('fence', 3, y, 1);
  place('woodPile', 5, 21, 0);
  place('woodPile', 14, 21, 1);
  place('barrel', 5, 24, 0);
  place('crate', 14, 24, 2);
  place('cabin', 50, 18, 1);
  place('anvil', 47, 22);
  place('brazier', 49, 23);
  place('barrel', 56, 25, 1);
  place('oreBig', 46, 19, 0);

  // Casas da rua de baixo, portas para a rua, e o espelho d'água da praça sul.
  place('house', 2, 27, 0);
  place('cabin', 9, 28, 1);
  place('house', 44, 27, 3);
  place('house', 51, 27, 1);
  place('fountain', 30, 31);
  place('bench', 25, 33);
  place('bench', 38, 33);

  for (let x = 0; x < w; x++) blocked[at(x, 0)] = blocked[at(x, h - 1)] = 1;
  for (let y = 0; y < h; y++) blocked[at(0, y)] = blocked[at(w - 1, y)] = 1;

  // NPCs: cada lojista na porta da sua loja, o mercado nas bancas, mestres em volta da fonte.
  const npcs: Npc[] = [
    { id: 'armor', name: 'Armeiro', sprite: 'armorer', x: 4, y: 10 },
    { id: 'merchant', name: 'Mercador', sprite: 'merchant', x: 11, y: 10 },
    { id: 'weapons', name: 'Armas', sprite: 'weaponsmith', x: 18, y: 10 },
    { id: 'adams', name: 'Mestre Alden', sprite: 'citizen_4_7', x: 25, y: 10 },
    { id: 'depot', name: 'Depósito', sprite: 'depot', x: 39, y: 10 },
    { id: 'boss_shop', name: 'Valdemar', sprite: 'citizen_4_2', x: 46, y: 10 },
    { id: 'runes', name: 'Runista', sprite: 'citizen_3_2', x: 53, y: 10 },
    { id: 'market', name: 'Mercado', sprite: 'market', x: 5, y: 15 },
    { id: 'potions', name: 'Alquimista', sprite: 'citizen_3_6', x: 9, y: 15 },
    { id: 'jewelry', name: 'Joalheiro', sprite: 'citizen_2_6', x: 49, y: 15 },
    { id: 'rashid', name: 'Rayyan', sprite: 'citizen_1_8', x: 53, y: 15 },
    // Ferreira: abre Profissões na Forja (fundir barras e forjar); jogadores procuravam "a Forja".
    { id: 'forge', name: 'Ferreira', sprite: 'armorer', x: 49, y: 25 },
    { id: 'dummy', name: 'Boneco de Treino', sprite: 'dummy', x: 9, y: 23 },
    // Guia: abre o guia de classes (melhor equipamento por nível e de onde vem); nome brilhando.
    { id: 'guide', name: 'Ajudante', sprite: 'citizen_1_3', x: GUIDE_NPC_POS.x, y: GUIDE_NPC_POS.y },
    // Vulcanus: refino e Ascensão, na entrada (antes ficava no canto da forja e ninguém achava).
    { id: 'refinery', name: 'Vulcanus', sprite: 'vulcanus', x: REFINERY_NPC_POS.x, y: REFINERY_NPC_POS.y },
    ...CITY_TALKERS,
    TEMPLE_NPC,
    INNKEEPER_NPC,
    { id: 'imbuement', name: 'Santuário de Imbuements', sprite: 'priest', x: 27, y: 31 },
    // Evento do Dia das Crianças: a Tia Jujuba vende na frente da fonte da praça. Fica no mapa até o
    // evento acabar, mas só aparece (e abre) com ele no ar (scene.ts): quem abriu o jogo antes vê sem recarregar.
    ...(Date.now() < KIDS_SHOP_END ? [{ id: 'kids_shop' as const, name: 'Tia Jujuba', sprite: 'citizen_2_2', x: 32, y: 16 }] : []),
    ...(isHalloweenShopOpen(Date.now()) ? [{ id: 'halloween_shop' as const, name: 'Jack', sprite: 'jack', x: 34, y: 16 }] : []),
  ];
  for (const n of npcs) blocked[at(n.x, n.y)] = 1;

  // Portal das caçadas dentro do vão do portão; bloqueia a base.
  const portal = { x: 32, y: 6 };
  blocked[at(portal.x - 1, portal.y)] = blocked[at(portal.x, portal.y)] = blocked[at(portal.x + 1, portal.y)] = 1;

  objects.sort((a, b) => a.y + OBJECTS[a.kind].h - (b.y + OBJECTS[b.kind].h));
  return { w, h, ground, deco, blocked, objects, start: { x: 32, y: 22 }, portal, route: [], npcs };
}

export function walkable(map: WorldMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.w && y < map.h && !map.blocked[y * map.w + x];
}

/** Caminho mais curto (BFS, 4 direções) de `from` até qualquer tile que satisfaça `goal`. */
export function findPath(
  map: WorldMap,
  from: { x: number; y: number },
  goal: (x: number, y: number) => boolean,
  maxSteps = 40,
): { x: number; y: number }[] | null {
  const prev = new Int32Array(map.w * map.h).fill(-1);
  const start = from.y * map.w + from.x;
  prev[start] = start;
  let frontier = [start];
  for (let step = 0; step <= maxSteps && frontier.length; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % map.w;
      const y = (i / map.w) | 0;
      if (goal(x, y)) {
        const path: { x: number; y: number }[] = [];
        for (let j = i; j !== start; j = prev[j]) path.push({ x: j % map.w, y: (j / map.w) | 0 });
        return path.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const ni = ny * map.w + nx;
        if (walkable(map, nx, ny) && prev[ni] === -1) {
          prev[ni] = i;
          next.push(ni);
        }
      }
    }
    frontier = next;
  }
  return null;
}
