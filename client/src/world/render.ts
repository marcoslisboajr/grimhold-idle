import { Ground, OBJECTS, TILE, type MapObject, type Theme, type WorldMap } from './map.ts';

const cache = new Map<string, HTMLImageElement>();

/** Imagem com cache. Desenhar antes de carregar não quebra: só não aparece no primeiro frame. */
export function image(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    cache.set(src, img);
  }
  return img;
}

export const loaded = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;

const TILES = {
  water: () => image('/assets/tiles/tileA1_outside.png'),
  ground: () => image('/assets/tiles/tileA2_outside.png'),
  floor: () => image('/assets/tiles/tileA5_outsidea.png'),
  objects: () => image('/assets/tiles/tileB_outside.png'),
};

const Q = TILE / 2;

/**
 * Autotile no formato do RPG Maker MV (bloco de 2x3 tiles). Cada tile é montado
 * com 4 quartos escolhidos pelos vizinhos: borda, canto de fora, canto de
 * dentro ou miolo. Coordenadas dos quartos em unidades de meio tile.
 */
function drawAutotile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  blockX: number,
  blockY: number,
  same: (dx: number, dy: number) => boolean,
  dx: number,
  dy: number,
) {
  const u = same(0, -1);
  const d = same(0, 1);
  const l = same(-1, 0);
  const r = same(1, 0);
  const pick = (v: boolean, h: boolean, diag: boolean, outer: number[], hEdge: number[], vEdge: number[], inner: number[], full: number[]) =>
    !v && !h ? outer : !v ? hEdge : !h ? vEdge : diag ? full : inner;

  const quarters = [
    // [quarto na tela (x,y), fonte]
    [0, 0, pick(u, l, same(-1, -1), [0, 2], [2, 2], [0, 4], [2, 0], [2, 4])],
    [1, 0, pick(u, r, same(1, -1), [3, 2], [1, 2], [3, 4], [3, 0], [1, 4])],
    [0, 1, pick(d, l, same(-1, 1), [0, 5], [2, 5], [0, 3], [2, 1], [2, 3])],
    [1, 1, pick(d, r, same(1, 1), [3, 5], [1, 5], [3, 3], [3, 1], [1, 3])],
  ] as const;
  for (const [qx, qy, [sx, sy]] of quarters) {
    ctx.drawImage(img, blockX + sx * Q, blockY + sy * Q, Q, Q, dx + qx * Q, dy + qy * Q, Q, Q);
  }
}

/** Ciclo da água: 0,1,2,1 como no RPG Maker. */
const waterFrame = (time: number) => [0, 1, 2, 1][Math.floor(time / 350) % 4];

export function drawGround(
  ctx: CanvasRenderingContext2D,
  map: WorldMap,
  cam: { x: number; y: number; w: number; h: number },
  time: number,
) {
  if (map.theme) return drawThemed(ctx, map, map.theme, cam, time);
  // Mapa com chão próprio (ex. caverna): um tile só, repetido.
  if (map.floor) {
    const img = image(`/assets/tiles/${map.floor.sheet}.png`);
    if (!loaded(img)) return;
    for (let y = Math.floor(cam.y / TILE); y <= Math.floor((cam.y + cam.h) / TILE); y++) {
      for (let x = Math.floor(cam.x / TILE); x <= Math.floor((cam.x + cam.w) / TILE); x++) {
        ctx.drawImage(img, map.floor.x * TILE, map.floor.y * TILE, TILE, TILE, x * TILE - cam.x, y * TILE - cam.y, TILE, TILE);
      }
    }
    return;
  }
  const floor = TILES.floor();
  const water = TILES.water();
  const ground = TILES.ground();
  if (!loaded(floor) || !loaded(water) || !loaded(ground)) return;

  // Afastando num mapa pequeno, a tela passa da borda: o chão continua repetindo o tile da borda.
  const x0 = Math.floor(cam.x / TILE);
  const y0 = Math.floor(cam.y / TILE);
  const x1 = Math.floor((cam.x + cam.w) / TILE);
  const y1 = Math.floor((cam.y + cam.h) / TILE);
  const cx = (x: number) => Math.min(map.w - 1, Math.max(0, x));
  const cy = (y: number) => Math.min(map.h - 1, Math.max(0, y));
  const kind = (x: number, y: number) => map.ground[cy(y) * map.w + cx(x)];

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x * TILE - cam.x;
      const dy = y * TILE - cam.y;
      const k = kind(x, y);
      // Grama embaixo de tudo: lisa (linha 0, o tile 0 é vazio) ou com flores (linhas 2 a 4).
      const inside = x >= 0 && y >= 0 && x < map.w && y < map.h;
      const deco = inside ? map.deco[y * map.w + x] : 0;
      const [fx, fy] = deco ? [deco % 8, 2 + (deco % 3)] : [1 + ((x * 7 + y * 3) % 5 === 0 ? 1 : 0), 0];
      ctx.drawImage(floor, fx * TILE, fy * TILE, TILE, TILE, dx, dy, TILE, TILE);

      // Fora do mapa conta como "igual", para a borda do mapa não virar margem.
      const same = (ox: number, oy: number) => {
        const n = kind(x + ox, y + oy);
        return n === k || n === -1;
      };
      if (k === Ground.Water) {
        drawAutotile(ctx, water, waterFrame(time) * 2 * TILE, 0, same, dx, dy);
      } else if (k === Ground.Path) {
        drawAutotile(ctx, ground, 2 * TILE, 0, same, dx, dy);
      } else if (k === Ground.Stone) {
        drawAutotile(ctx, ground, 4 * TILE, 0, same, dx, dy);
      }
    }
  }
}

/** Chão com tema: cada tipo de chão é um autotile de uma folha própria (lava animada). */
function drawThemed(
  ctx: CanvasRenderingContext2D,
  map: WorldMap,
  theme: Theme,
  cam: { x: number; y: number; w: number; h: number },
  time: number,
) {
  const sheets = [theme.base, theme.path, theme.stone, theme.water].map((b) => image(`/assets/tiles/${b.sheet}.png`));
  if (!sheets.every(loaded)) return;
  const [base, path, stone, water] = sheets;
  // Afastando num mapa pequeno, a tela passa da borda: o chão continua repetindo o tile da borda.
  const x0 = Math.floor(cam.x / TILE);
  const y0 = Math.floor(cam.y / TILE);
  const x1 = Math.floor((cam.x + cam.w) / TILE);
  const y1 = Math.floor((cam.y + cam.h) / TILE);
  const cx = (x: number) => Math.min(map.w - 1, Math.max(0, x));
  const cy = (y: number) => Math.min(map.h - 1, Math.max(0, y));
  const kind = (x: number, y: number) => map.ground[cy(y) * map.w + cx(x)];
  const frame = theme.water.frames ? theme.water.frames[[0, 1, 2, 1][Math.floor(time / 350) % 4]] : 0;
  const always = () => true;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x * TILE - cam.x;
      const dy = y * TILE - cam.y;
      const k = kind(x, y);
      const same = (ox: number, oy: number) => {
        const n = kind(x + ox, y + oy);
        return n === k || n === -1;
      };
      drawAutotile(ctx, base, theme.base.x * TILE, theme.base.y * TILE, always, dx, dy);
      if (k === Ground.Water) drawAutotile(ctx, water, (theme.water.x + frame) * TILE, theme.water.y * TILE, same, dx, dy);
      else if (k === Ground.Path) drawAutotile(ctx, path, theme.path.x * TILE, theme.path.y * TILE, same, dx, dy);
      else if (k === Ground.Stone) drawAutotile(ctx, stone, theme.stone.x * TILE, theme.stone.y * TILE, same, dx, dy);
    }
  }
}

export function drawObject(ctx: CanvasRenderingContext2D, o: MapObject, cam: { x: number; y: number }) {
  const def = OBJECTS[o.kind];
  const img = def.sheet ? image(`/assets/tiles/${def.sheet}.png`) : TILES.objects();
  if (!loaded(img)) return;
  // Variante que não existe usa a primeira (uma variante errada travava o desenho do mapa inteiro).
  const [sx, sy] = def.variants[o.variant] ?? def.variants[0];
  ctx.drawImage(
    img,
    sx * TILE,
    sy * TILE,
    def.w * TILE,
    def.h * TILE,
    o.x * TILE - cam.x,
    o.y * TILE - cam.y,
    def.w * TILE,
    def.h * TILE,
  );
}

/** Portal roxo (2017 patron bundle): folha 3x4 de 144x192, animação na coluna do meio. */
export function drawPortal(ctx: CanvasRenderingContext2D, base: { x: number; y: number }, cam: { x: number; y: number }, time: number) {
  const img = image('/assets/portal/portal_purple_3.png');
  if (!loaded(img)) return;
  const fw = 144;
  const fh = 192;
  const row = Math.floor(time / 150) % 4;
  const x = base.x * TILE + TILE / 2 - fw / 2 - cam.x;
  const y = (base.y + 1) * TILE - fh - cam.y + 12;
  ctx.drawImage(img, fw, row * fh, fw, fh, x, y, fw, fh);
}

/** Linha do "pé" do objeto, para ordenar com os personagens. */
export const objectBaseY = (o: MapObject) => (o.y + OBJECTS[o.kind].h) * TILE;

/** Texto pixel com contorno preto, estilo Tibia. */
/** A fonte pixel fica pequena demais nos tamanhos pedidos: tudo sai 40% maior. */
const TEXT_SCALE = 1.4;

export function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 22) {
  const px = Math.round(size * TEXT_SCALE);
  ctx.font = `${px}px 'Jersey 10', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, Math.round(px / 5));
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
