# Folha client/public/assets/tiles/town2.png com as peças da praça e do mercado: fonte de pedra,
# bancas de feira, floreiras, banco e árvore redonda, recortadas dos tilesets do Time Fantasy.
# As posições aqui batem com os OBJECTS de client/src/world/map.ts.
#
# Uso: python scripts/tiles_town2.py
import os
from PIL import Image

TS = '../grimhold/assets-pixel/tilesets/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'public', 'assets', 'tiles', 'town2.png')
T = 48
Q = T // 2

def sheet(name):
    return Image.open(TS + name + '.png').convert('RGBA')

def crop(img, px, py, pw, ph):
    return img.crop((px, py, px + pw, py + ph))

out = Image.new('RGBA', (16 * T, 8 * T))
put = lambda im, x, y: out.alpha_composite(im, (int(x * T), int(y * T)))

# Fonte: espelho d'água com borda de pedra, montado com os quartos do autotile da tileA1_town
# (bloco 8,0; só o primeiro quadro da animação). Os 2x2 tiles de baixo do bloco são a forma completa.
def pond(w, h, bx=8, by=0):
    a1 = sheet('tileA1_town')
    full = crop(a1, bx * T, (by + 1) * T, 2 * T, 2 * T)
    im = Image.new('RGBA', (w * T, h * T))
    for ty in range(h * 2):
        for tx in range(w * 2):
            qx = 0 if tx == 0 else 3 if tx == w * 2 - 1 else 1 + (tx + 1) % 2
            qy = 0 if ty == 0 else 3 if ty == h * 2 - 1 else 1 + (ty + 1) % 2
            im.alpha_composite(crop(full, qx * Q, qy * Q, Q, Q), (tx * Q, ty * Q))
    return im
put(pond(5, 4), 0, 0)

# Bancas de feira: a mesa comprida da tileB_inside com caixotes de fruta e trigo em cima.
inside = sheet('tileB_inside')
table = crop(inside, 0, 13 * T, 3 * T, 3 * T)
goods = [crop(inside, x * T, 0, T, T) for x in (4, 5, 6, 7)]
for i, pair in enumerate([(0, 1), (2, 3), (1, 0)]):
    st = table.copy()
    st.alpha_composite(goods[pair[0]], (Q + 4, Q))
    st.alpha_composite(goods[pair[1]], (T + Q - 4, Q))
    put(st, 5 + i * 3, 0)

# Floreiras da tileC_HOUSE (ficam deslocadas meio tile na folha).
house = sheet('tileC_HOUSE')
for i, (x, y) in enumerate([(8, 6), (10, 6), (12, 6), (14, 6), (8, 7), (10, 7)]):
    put(crop(house, x * T + Q, y * T, T, T), i, 4)
# Banco de madeira (2x1) e árvore redonda (3x3).
put(crop(inside, 5 * T, 10 * T, 2 * T, T), 6, 4)
put(crop(sheet('tileB_outside'), 0, 10 * T, 3 * T, 3 * T), 8, 4)

out.save(OUT)
print('ok', OUT)
