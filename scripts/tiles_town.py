# Folha client/public/assets/tiles/town.png com as peças da cidade (casas, castelo, portão, placas,
# canteiros), recortadas dos tilesets do Time Fantasy. Os telhados vermelho e azul são o cinza do
# pack recolorido. As posições aqui batem com os OBJECTS de client/src/world/map.ts.
#
# Uso: python scripts/tiles_town.py
import os, colorsys
from PIL import Image

TS = '../grimhold/assets-pixel/tilesets/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'public', 'assets', 'tiles', 'town.png')
T = 48

def crop(sheet, x, y, w, h):
    return Image.open(TS + sheet + '.png').convert('RGBA').crop((x * T, y * T, (x + w) * T, (y + h) * T))

def roof(im, hue, sat):
    """Recolore só o telhado (as telhas cinza-azuladas); paredes e madeira ficam."""
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.5 <= h <= 0.72 and s > 0.08:
                r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, max(sat, s), min(1, v * 1.05))
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im

sheet = Image.new('RGBA', (16 * T, 51 * T))
put = lambda im, x, y: sheet.alpha_composite(im, (x * T, y * T))

timber = crop('tileD_town1a', 1, 8, 7, 8)
put(timber, 0, 0)                                   # enxaimel cinza
put(crop('tileD_town1b', 1, 8, 7, 8), 7, 0)         # enxaimel verde
put(roof(timber, 2, 0.62), 0, 8)                    # enxaimel vermelho
put(roof(timber, 215, 0.5), 7, 8)                   # enxaimel azul
def cabin(src):
    """Casa de toras: o pacote só traz o telhado e o meio da parede; completa as
    duas fileiras de baixo com as peças de parede de toras da mesma folha."""
    im = crop(src, 0, 9, 7, 7)
    piece = lambda x, y: crop(src, x, y, 1, 1)
    # Fileira 5 (y=14): faltam as colunas 5 e 6.
    im.alpha_composite(piece(2, 7), (5 * T, 5 * T))
    im.alpha_composite(piece(4, 7), (6 * T, 5 * T))
    # Fileira 6 (y=15): faltam as colunas 0, 4, 5 e 6 (base com grama).
    im.alpha_composite(piece(0, 8), (0, 6 * T))
    im.alpha_composite(piece(1, 8), (4 * T, 6 * T))
    im.alpha_composite(piece(1, 8), (5 * T, 6 * T))
    im.alpha_composite(piece(4, 8), (6 * T, 6 * T))
    # A ponta esquerda das toras não vem no pacote: espelha a coluna da direita (fileiras 4 a 6).
    edge = im.crop((6 * T, 4 * T, 7 * T, 7 * T)).transpose(Image.FLIP_LEFT_RIGHT)
    im.paste(Image.new('RGBA', (T, 3 * T)), (0, 4 * T))
    im.alpha_composite(edge, (0, 4 * T))
    return im
put(cabin('tileD_town2a'), 0, 16)                   # toras cinza
put(cabin('tileD_town2b'), 7, 16)                   # toras verde
put(crop('tileD_castle', 0, 0, 8, 8), 0, 23)        # castelo
put(crop('tileD_castle', 8, 9, 7, 7), 8, 23)        # portão em arco
for i in range(5): put(crop('tileD_town1a', 8, 4 + i, 1, 1), i, 31)        # placas: loja, poção, armadura, arma, pousada
for i in range(6): put(crop('tileC_HOUSE', 9 + i, 6, 1, 1), 5 + i, 31)     # vasos de flor
put(crop('tileD_castle', 2, 13, 3, 3), 0, 32)       # canteiro redondo
put(crop('tileD_castle', 5, 13, 3, 3), 3, 32)       # canteiro quadrado
# Salões grandes: telhado em cruz (HOUSETOP) sobre parede de pedra com porta (tileC_HOUSE).
def hall(roof_sheet):
    im = Image.new('RGBA', (7 * T, 13 * T))
    im.alpha_composite(crop(roof_sheet, 0, 5, 7, 11), (0, 0))
    for i, c in enumerate([8, 9, 11, 12, 13, 9, 10]): im.alpha_composite(crop('tileC_HOUSE', c, 2, 1, 2), (i * T, 11 * T))
    return im
put(hall('tileD_HOUSETOP_gold'), 0, 35)              # templo
put(hall('tileD_HOUSETOP_red'), 7, 35)               # pousada
# Muralha: autotile de parede (tileA4_dungeon, pedra cinza) montado em quartos de 24px.
# Topo: reta horizontal/vertical, 4 cantos e 4 pontas; face (1x2): ponta esquerda, meio, ponta direita.
A4 = Image.open(TS + 'tileA4_dungeon.png').convert('RGBA')
BX, Q = 96, 24
q = lambda c, r: A4.crop((BX + c * Q, 48 + r * Q, BX + c * Q + Q, 48 + r * Q + Q))
p = lambda c, r: A4.crop((BX + c * Q, r * Q, BX + c * Q + Q, r * Q + Q))   # cantos internos
def quad(a, b, c, d):
    im = Image.new('RGBA', (T, T))
    for piece, x, y in ((a, 0, 0), (b, Q, 0), (c, 0, Q), (d, Q, Q)): im.alpha_composite(piece, (x, y))
    return im
WALL = [
    quad(q(1, 0), q(2, 0), q(1, 3), q(2, 3)),   # 0 H
    quad(q(0, 1), q(3, 1), q(0, 2), q(3, 2)),   # 1 V
    quad(q(0, 0), q(1, 0), q(0, 1), p(3, 1)),   # 2 NW
    quad(q(2, 0), q(3, 0), p(2, 1), q(3, 1)),   # 3 NE
    quad(q(0, 2), p(3, 0), q(0, 3), q(1, 3)),   # 4 SW
    quad(p(2, 0), q(3, 2), q(2, 3), q(3, 3)),   # 5 SE
    quad(q(0, 0), q(1, 0), q(0, 3), q(1, 3)),   # 6 ponta esquerda
    quad(q(2, 0), q(3, 0), q(2, 3), q(3, 3)),   # 7 ponta direita
    quad(q(0, 0), q(3, 0), q(0, 1), q(3, 1)),   # 8 ponta de cima
    quad(q(0, 2), q(3, 2), q(0, 3), q(3, 3)),   # 9 ponta de baixo
]
for i, im in enumerate(WALL): put(im, i, 48)
for i, x0 in enumerate([0, 24, 48]):          # face: esquerda, meio, direita
    sheet.alpha_composite(A4.crop((BX + x0, 144, BX + x0 + 48, 240)), (i * T, 49 * T))
sheet.save(OUT)
print('ok', OUT)
