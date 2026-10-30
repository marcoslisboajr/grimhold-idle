# Ícones das armas da Arena dos Lendários (nível 100): armas do jogo recoloridas em dourado
# (só peças que já existem, nada desenhado).
#
# Uso: python scripts/icons_arena100.py
import colorsys, os
from PIL import Image

ICONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'public', 'assets', 'icons')
BASE = {'arena100_sword': 'seraph_blade', 'arena100_axe': 'grim_reaper_axe', 'arena100_mace': 'annihilator_mace',
        'arena100_bow': 'annihilator_bow', 'arena100_staff': 'void_staff'}

for out, src in BASE.items():
    im = Image.open(os.path.join(ICONS, src + '.png')).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.12:
                r2, g2, b2 = colorsys.hsv_to_rgb(0.12, min(1, s * 1.15), min(1, v * 1.08))
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    im.save(os.path.join(ICONS, out + '.png'))
print('ok')
