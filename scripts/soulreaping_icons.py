"""
Gera ícones para a nova skill Colheita de Almas (soulreaping) e seus 5 itens por recolor.
- skill_soulreaping.png: recolor de skill_runecraft.png para tom verde-espectral / ciano-alma (170°).
- bone_dust.png: recolor de elemental_dust.png para tom ósseo/marfim claro (45°, sat baixa).
- dark_essence.png: já existe nos assets.
- spectral_tear.png: recolor de sea_pearl.png para lágrima espectral ciano/azul-esverdeado translúcido (180°).
- ancient_ash.png: recolor de nightmare_dust.png para cinzas ancestrais cinza-pálido / carvão ancestral (210°, sat baixa).
- abyssal_soul.png: recolor de void_essence.png para alma abissal violeta-espectral brilhante (270°).
"""

import colorsys
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')

def tint(im, hue, sat_mult=1.0, val_mult=1.0, fixed_sat=None):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            target_s = fixed_sat if fixed_sat is not None else min(1.0, max(s, 0.05) * sat_mult)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, target_s, min(1.0, v * val_mult))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im

def main():
    # 1. skill_soulreaping: tom espectral ciano-verde (170°)
    im_rune = Image.open(os.path.join(ICO, 'skill_runecraft.png'))
    im_sr = tint(im_rune, 168, sat_mult=1.1, val_mult=1.1)
    im_sr.save(os.path.join(ICO, 'skill_soulreaping.png'))
    print("Salvo skill_soulreaping.png")

    # 2. bone_dust: pó de osso marfim/amarelado pálido
    im_dust = Image.open(os.path.join(ICO, 'elemental_dust.png'))
    im_bone_dust = tint(im_dust, 42, fixed_sat=0.25, val_mult=1.15)
    im_bone_dust.save(os.path.join(ICO, 'bone_dust.png'))
    print("Salvo bone_dust.png")

    # 3. spectral_tear: lágrima espectral ciano brilhante
    im_pearl = Image.open(os.path.join(ICO, 'sea_pearl.png'))
    im_tear = tint(im_pearl, 185, sat_mult=1.2, val_mult=1.1)
    im_tear.save(os.path.join(ICO, 'spectral_tear.png'))
    print("Salvo spectral_tear.png")

    # 4. ancient_ash: cinza ancestral azulado/escuro
    im_ash = Image.open(os.path.join(ICO, 'nightmare_dust.png'))
    im_ancient_ash = tint(im_ash, 220, fixed_sat=0.18, val_mult=0.95)
    im_ancient_ash.save(os.path.join(ICO, 'ancient_ash.png'))
    print("Salvo ancient_ash.png")

    # 5. abyssal_soul: essência abissal violeta-escura cósmica
    im_soul = Image.open(os.path.join(ICO, 'void_essence.png'))
    im_abyssal_soul = tint(im_soul, 260, sat_mult=1.2, val_mult=1.05)
    im_abyssal_soul.save(os.path.join(ICO, 'abyssal_soul.png'))
    print("Salvo abyssal_soul.png")

if __name__ == '__main__':
    main()
