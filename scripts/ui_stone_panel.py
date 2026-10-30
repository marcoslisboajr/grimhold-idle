"""Moldura de pedra das janelas (9-slice 32x32, borda de 4 px), feita do tileset de
masmorra do Time Fantasy (tileA2_dungeon): o miolo é a pedra escura do tileset reduzida
à escala 1x, a borda usa as cores da própria pedra (+ um friso dourado na versão gold)."""
from PIL import Image, ImageEnhance
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
T = os.path.join(ROOT, 'client', 'public', 'assets', 'tiles', 'tileA2_dungeon.png')
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'ui')
src = Image.open(T).convert('RGBA').crop((0, 288, 96, 384)).resize((32, 32), Image.NEAREST)
stone = ImageEnhance.Brightness(src).enhance(0.6)

def frame(trim):
    im = stone.copy(); px = im.load()
    dark, light = (14, 12, 12, 255), (120, 118, 122, 255)
    for i in range(32):
        for j in range(32):
            d = min(i, j, 31 - i, 31 - j)
            if d == 0: px[i, j] = dark
            elif d == 1: px[i, j] = trim if (i in (1, 30) or j in (1, 30)) else px[i, j]
            elif d == 2: px[i, j] = light if (i == 2 or j == 2) else (40, 38, 40, 255)
            elif d == 3: px[i, j] = dark
    return im
frame((86, 84, 88, 255)).save(os.path.join(OUT, 'stone_panel.png'))
frame((201, 161, 74, 255)).save(os.path.join(OUT, 'stone_panel_gold.png'))
print('ok')
