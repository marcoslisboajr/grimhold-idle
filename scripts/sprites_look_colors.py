"""Mais opções de aparência: tons de pele 5 a 10 e cinco cores de cabelo novas.

Pele: recolore só os pixels de pele do corpo base (tom 1), mantendo as 4 sombras.
Cabelo: parte do cabelo branco (o que tem mais detalhe de luz) e pinta na cor nova.
  python scripts/sprites_look_colors.py
"""
import colorsys, os

from PIL import Image

PD = os.path.join(os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')), 'client', 'public', 'assets', 'paperdoll')
HAIR = {'m': [1, 2, 3, 5, 6, 8, 9, 12], 'f': [1, 2, 5, 9, 10, 13, 14, 16]}

# tom: (matiz, multiplicador de saturação, multiplicador de brilho)
SKINS = {5: (0.07, 0.55, 1.0), 6: (0.075, 0.8, 0.86), 7: (0.055, 1.1, 0.68), 8: (0.04, 0.85, 0.36), 9: (0.6, 0.9, 0.9), 10: (0.99, 1.6, 0.8)}
# cor: (matiz, saturação, multiplicador de brilho)
HAIR_COLORS = {'gray': (0, 0, 0.62), 'purple': (0.78, 0.55, 0.75), 'orange': (0.07, 0.8, 0.95), 'teal': (0.48, 0.6, 0.72), 'burgundy': (0.97, 0.65, 0.55)}


def is_skin(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return (h < 0.1 or h > 0.98) and 0.25 < s < 0.6 and v > 0.6


def skin_tone(src, hue, sm, vm):
    out = src.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and is_skin(r, g, b):
                _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                r2, g2, b2 = colorsys.hsv_to_rgb(hue, min(1, s * sm), min(1, v * vm))
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out


def hair_color(src, hue, sat, vm):
    out = src.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            _, _, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue, sat, min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out


for g in ('m', 'f'):
    base = Image.open(os.path.join(PD, f'base_{g}_1.png')).convert('RGBA')
    for n, (h, sm, vm) in SKINS.items():
        skin_tone(base, h, sm, vm).save(os.path.join(PD, f'base_{g}_{n}.png'))
    for style in HAIR[g]:
        white = Image.open(os.path.join(PD, f'hair_{g}_{style}_white.png')).convert('RGBA')
        for name, (h, s, vm) in HAIR_COLORS.items():
            hair_color(white, h, s, vm).save(os.path.join(PD, f'hair_{g}_{style}_{name}.png'))
print('ok')
