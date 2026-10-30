"""Temas das caçadas 100–120, só com peças dos packs + recolor:
- vazio: o tileset de masmorra recolorido para violeta, com o céu estrelado do
  Time Fantasy Dark Dimension (tileset gratuito) no lugar do abismo; objetos
  (cristais, gárgulas, estátua) da folha B do Dark Dimension;
- inferno: o tileset de masmorra recolorido para obsidiana e brasa."""
from PIL import Image
import colorsys, os, sys, zipfile, io
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
T = os.path.join(ROOT, 'client', 'public', 'assets', 'tiles')
ZIP = '../downloads/Nova pasta/drive/tf_darkdimension_updated2020.zip'

z = zipfile.ZipFile(ZIP)
def from_zip(name):
    return Image.open(io.BytesIO(z.read(name))).convert('RGBA')

def recolor(im, hue, sat_max, light):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hls_to_rgb(hue, light(l), min(sat_max, 0.15 + s * 0.5))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

base = Image.open(os.path.join(T, 'tileA2_dungeon.png')).convert('RGBA')

# Vazio: pedra violeta; o abismo (bloco 8,9 do tileA2_dungeon) ganha as estrelas.
void = recolor(base, 0.74, 0.22, lambda l: l * 0.9)
stars = from_zip('RMMV/tf_dd_A5_3.png').crop((0, 432, 384, 624))
px, sp, op = void.load(), stars.load(), base.load()
for y in range(9 * 48, 12 * 48):
    for x in range(8 * 48, 10 * 48):
        r, g, b, a = op[x, y]
        # O abismo é o tom mais escuro do bloco (as bordas são mais claras).
        if a and colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[1] < 0.28:
            px[x, y] = sp[x % 384, y % 192]
void.save(os.path.join(T, 'tileA2_void.png'))
from_zip('RMMV/tf_dd_B_3.png').save(os.path.join(T, 'darkdimension.png'))

# Inferno: obsidiana com veios de brasa (claros puxam para o vermelho).
hell = recolor(base, 0.0, 0.6, lambda l: l * 0.7)
hell.save(os.path.join(T, 'tileA2_hell.png'))
print('ok')
