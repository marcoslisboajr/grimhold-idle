import { DROP_SET_LOOK, splitRarity, type EquipSlot, type Look, type VocationId } from '@grimhold/shared';
import meta from './paperdoll.json';

/**
 * Personagem montado na hora a partir das camadas do paperdoll
 * (geradas por scripts/sprites_paperdoll.py): corpo, roupa da vocação,
 * cabelo e equipamento equipado (calças, peitoral, elmo). A roupa pode ser
 * recolorida para a cor que o jogador escolheu.
 *
 * Folha: 3 colunas (parado, passo1, passo2) x 4 linhas (baixo, esquerda, direita, cima).
 */
export const [FRAME_W, FRAME_H] = meta.frame as [number, number];
export type Dir = 'down' | 'left' | 'right' | 'up';
export type Frame = 'stand' | 'walk1' | 'walk2';
const ROW: Record<Dir, number> = { down: 0, left: 1, right: 2, up: 3 };
const COL: Record<Frame, number> = { stand: 0, walk1: 1, walk2: 2 };

const images = new Map<string, HTMLImageElement>();
function load(name: string): HTMLImageElement {
  let im = images.get(name);
  if (!im) {
    im = new Image();
    im.src = `/assets/paperdoll/${name}.png`;
    images.set(name, im);
  }
  return im;
}
const ready = (im: HTMLImageElement) => im.complete && im.naturalWidth > 0;

function toHsv(r: number, g: number, b: number): [number, number, number] {
  const v = Math.max(r, g, b);
  const d = v - Math.min(r, g, b);
  const s = v === 0 ? 0 : d / v;
  let h = 0;
  if (d) {
    if (v === r) h = ((g - b) / d + 6) % 6;
    else if (v === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [h / 6, s, v];
}

/**
 * Recolore a roupa: a cor principal (a matiz mais comum) vai para a escolhida e as
 * outras giram junto, então os detalhes de duas cores continuam aparecendo.
 */
function recolor(src: HTMLImageElement, hue: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.naturalWidth;
  c.height = src.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const px: [number, number, number, number][] = [];
  const bins = new Array(36).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const [h, s, v] = toHsv(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    // Cinzas e pretos (contorno, metal) ficam como estão.
    if (s < 0.15) continue;
    px.push([i, h, s, v]);
    bins[Math.floor(h * 36) % 36] += 1;
  }
  const main = (bins.indexOf(Math.max(...bins)) + 0.5) / 36;
  const shift = hue / 360 - main;
  for (const [i, h, s, v] of px) {
    const [nr, ng, nb] = hsv((((h + shift) % 1) + 1) % 1, Math.max(s, 0.35), v);
    d[i] = nr * 255;
    d[i + 1] = ng * 255;
    d[i + 2] = nb * 255;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function hsv(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  return ([[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]] as const)[i % 6] as [number, number, number];
}

const sheets = new Map<string, HTMLCanvasElement>();

/** Folha montada para a vocação + aparência + equipamento, ou null enquanto as imagens carregam. */
/** Capa pronta para a folha: de frente e de lado, tira a barra que cai por cima das pernas (só fica a que sobra dos lados). */
function capeLayer(cape: HTMLImageElement, base: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FRAME_W * 3;
  c.height = FRAME_H * 4;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(cape, 0, 0);
  // Das pernas para baixo (a partir de 82% do quadro), nas linhas de frente e de lado, o corpo apaga a capa.
  const from = Math.round(FRAME_H * 0.82);
  ctx.globalCompositeOperation = 'destination-out';
  for (let r = 0; r < 3; r++) {
    const y = r * FRAME_H + from;
    ctx.drawImage(base, 0, y, FRAME_W * 3, FRAME_H - from, 0, y, FRAME_W * 3, FRAME_H - from);
  }
  return c;
}

/** Peça de drop usa o desenho da peça de fazer que ela copia. */
const dropLook = (id: string) => DROP_SET_LOOK[id] ?? id;

export function lookSheet(
  vocation: VocationId,
  look: Look,
  equipment?: Partial<Record<EquipSlot, string>>,
): HTMLCanvasElement | null {
  const g = look.gender;
  // O elmo só aparece se o jogador quiser (senão o rosto e o cabelo somem).
  const helmetItem = equipment?.helmet && look.showHelmet ? dropLook(splitRarity(equipment.helmet).base) : '';
  const armorItem = equipment?.armor && !look.hideArmor ? dropLook(splitRarity(equipment.armor).base) : '';
  const legsItem = equipment?.legs && !look.hideArmor ? dropLook(splitRarity(equipment.legs).base) : '';
  // Capa de maestria: camada própria (cape_<id>_<gênero>), sobre a armadura e sob o cabelo.
  // Capa de Artesanato vem com raridade (cape_shadow+2): o desenho é o da base.
  const capeItem = equipment?.cape && !look.hideCape ? splitRarity(equipment.cape).base : '';
  const capeName = /^cape_[a-z]+(_supreme)?$/.test(capeItem) ? capeItem : '';

  const helmetName = meta.equips.includes(helmetItem) ? helmetItem : '';
  const armorName = meta.equips.includes(armorItem) ? armorItem : '';
  const legsName = meta.equips.includes(legsItem) ? legsItem : '';

  const activeAddons = (look.addons ?? []).filter((a) => meta.addons.includes(a));
  const addonsKey = activeAddons.slice().sort().join(',');

  const outfitId = look.outfitId ?? vocation;
  const key = `${vocation}|${outfitId}|${g}|${look.skin}|${look.hair}|${look.hairColor}|${look.outfit}|${helmetName}|${armorName}|${legsName}|${addonsKey}|${look.hideArmor ? 1 : 0}|${capeName}`;
  const cached = sheets.get(key);
  if (cached) return cached;

  const base = load(`base_${g}_${look.skin}`);
  const outfit = load(`outfit_${outfitId}_${g}`);
  const legs = legsName ? load(`equip_${legsName}_${g}`) : null;
  const armor = armorName ? load(`equip_${armorName}_${g}`) : null;
  const helmet = helmetName ? load(`equip_${helmetName}_${g}`) : null;
  const cape = capeName ? load(`${capeName}_${g}`) : null;
  const capeUnder = capeName ? load(`${capeName}_${g}_under`) : null;

  // Addons: sash vai sobre o peitoral; chapéus só aparecem se sem elmo visível.
  const sashAddon = activeAddons.includes('sash') ? load(`addon_sash_${g}`) : null;
  const headAddons = helmet ? [] : activeAddons.filter((a) => a !== 'sash').map((a) => load(`addon_${a}_${g}`));

  // Se estiver com elmo equipado, cobre a cabeça substituindo cabelo e top
  // Traje com elmo fechado também esconde o cabelo (o comprido vazava pelos lados).
  const closedTop = meta.helms?.includes(`${outfitId}_${g}`);
  const hair = helmet || closedTop ? null : load(`hair_${g}_${look.hair}_${look.hairColor}`);
  const top = !helmet && meta.tops.includes(`${outfitId}_${g}`) ? load(`top_${outfitId}_${g}`) : null;

  const all = [capeUnder, base, outfit, legs, armor, sashAddon, cape, hair, top, helmet, ...headAddons].filter((x): x is HTMLImageElement => !!x);
  if (!all.every(ready)) return null;

  const c = document.createElement('canvas');
  c.width = FRAME_W * 3;
  c.height = FRAME_H * 4;
  const ctx = c.getContext('2d')!;
  const dye = (im: HTMLImageElement) => (look.outfit === null ? im : recolor(im, look.outfit));

  // 0. Capa por trás do corpo (de frente sai dos lados; de lado cai atrás das costas)
  if (capeUnder) ctx.drawImage(capeUnder, 0, 0);
  // 1. Corpo
  ctx.drawImage(base, 0, 0);
  // 2. Roupa básica da vocação
  ctx.drawImage(dye(outfit), 0, 0);
  // 3. Pernas equipadas
  if (legs) ctx.drawImage(legs, 0, 0);
  // 4. Peitoral equipado
  if (armor) ctx.drawImage(armor, 0, 0);
  // 5. Addon de corpo (faixa)
  if (sashAddon) ctx.drawImage(sashAddon, 0, 0);
  // 5b. Capa de maestria (de frente e de lado, a barra não passa por cima das pernas e pés)
  if (cape) ctx.drawImage(capeLayer(cape, base), 0, 0);
  // 6. Cabelo e Top (se sem elmo) ou Elmo
  if (hair) ctx.drawImage(hair, 0, 0);
  if (top) ctx.drawImage(dye(top), 0, 0);
  if (helmet) ctx.drawImage(helmet, 0, 0);
  // 7. Addons de cabeça (se sem elmo)
  for (const h of headAddons) ctx.drawImage(h, 0, 0);

  sheets.set(key, c);
  return c;
}

/** Desenha um quadro com os pés em (x, y), ampliado `scale` vezes. */
export function drawLook(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  dir: Dir,
  frame: Frame,
  x: number,
  y: number,
  scale: number,
) {
  const w = FRAME_W * scale;
  const h = FRAME_H * scale;
  ctx.drawImage(sheet, COL[frame] * FRAME_W, ROW[dir] * FRAME_H, FRAME_W, FRAME_H, Math.round(x - w / 2), Math.round(y - h), w, h);
}
