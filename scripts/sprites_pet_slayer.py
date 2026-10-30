"""Mascote do Slayer (Caveira Sombria): a caveira em chamas do action_monsters (skullC), fogo recolorido de roxo.
A folha do pack tem frente, lado e costas (3x3 de 32x48); o outro lado é o espelho. Sai no formato dos mascotes:
3 colunas x 4 linhas (baixo, esquerda, direita, cima).
  python scripts/sprites_pet_slayer.py
"""
import colorsys, os

from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = '../grimhold/assets-pixel/personagens/action_monsters/monsters/skulls/skullC.png'
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'pets', 'pet_slayer_skull.png')
FW, FH = 32, 48


def purple(im):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.3:
                c = colorsys.hsv_to_rgb(0.78, min(1, s * 0.9), min(1, v * 0.8))
                px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im


sheet = purple(Image.open(SRC).convert('RGBA'))
row = lambda r: [sheet.crop((c * FW, r * FH, c * FW + FW, r * FH + FH)) for c in range(3)]
front, side, back = row(0), row(1), row(2)
out = Image.new('RGBA', (FW * 3, FH * 4))
for r, frames in enumerate([front, side, [ImageOps.mirror(f) for f in side], back]):
    for c, f in enumerate(frames):
        out.alpha_composite(f, (c * FW, r * FH))
out.save(OUT)
print('ok', OUT)
