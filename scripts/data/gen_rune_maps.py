"""Folha dos mapas de runas (client/public/assets/tiles/runestones.png), só com
peças do Time Fantasy tileB_dungeon: o monte de rochas escuras (sem o chão de
terra, recolorido de azul rúnico), a mesma rocha 2x maior (a Pedra Gigante do
altar), a lápide escura com a runa azul e os cristais coloridos.

Layout (tiles de 48px):
  (0,0) 2x2  rocha rúnica (alvo da mineração)
  (2,0) 1x2  lápide rúnica
  (2,2) 1x1  cristais (3 variantes em (2,2), (2,3) e (0,2))
  (3,0) 4x4  pedra gigante
"""
import colorsys, os
from PIL import Image

T = 48
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC = Image.open('../grimhold/assets-pixel/tilesets/tileB_dungeon.png').convert('RGBA')
cut = lambda c, r, w=1, h=1: SRC.crop((c * T, r * T, (c + w) * T, (r + h) * T))

def no_dirt(im):
    """Tira o chão de terra marrom de baixo das rochas (cores quentes e saturadas)."""
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if 0.02 < h < 0.14 and s > 0.25: px[x, y] = (0, 0, 0, 0)
    return im

def runic(im, hue=0.62, sat=0.22, light=0.0):
    """Recolor: a rocha escura vira pedra azul-acinzentada."""
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hls_to_rgb(hue, min(1, l + light), sat)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

rock = runic(no_dirt(cut(6, 5, 2, 2)))
sheet = Image.new('RGBA', (7 * T, 4 * T))
sheet.alpha_composite(rock, (0, 0))
sheet.alpha_composite(cut(7, 7, 1, 2), (2 * T, 0))
sheet.alpha_composite(cut(13, 11), (2 * T, 2 * T))
sheet.alpha_composite(cut(15, 12), (2 * T, 3 * T))
sheet.alpha_composite(cut(14, 11), (0, 2 * T))
sheet.alpha_composite(rock.resize((4 * T, 4 * T), Image.NEAREST), (3 * T, 0))
out = os.path.join(ROOT, 'client', 'public', 'assets', 'tiles', 'runestones.png')
sheet.save(out)
print('ok', out)
