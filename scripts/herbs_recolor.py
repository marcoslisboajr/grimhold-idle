# Gera ícones para as novas ervas raras de Herbalismo por recolor das existentes.
# ghost_bloom (recolor de moon_clover para tom espectral/prateado-esbranquiçado)
# fire_lotus (recolor de abyss_lotus para tom flamejante/alaranjado-vermelho)
# void_orchid (recolor de blood_flower para tom púrpura/cósmico escuro)

import colorsys, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')

def tint(im, hue, sat_mult=1.0, val_mult=1.0):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1.0, max(s, 0.1) * sat_mult), min(1.0, v * val_mult))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im

def main():
    # 1. ghost_bloom: base moon_clover -> tom espectral (ciano bem claro / quase fantasmagórico)
    im_moon = Image.open(os.path.join(ICO, 'moon_clover.png'))
    im_ghost = tint(im_moon, 190, sat_mult=0.45, val_mult=1.2)
    im_ghost.save(os.path.join(ICO, 'ghost_bloom.png'))
    print("Salvo ghost_bloom.png")

    # 2. fire_lotus: base abyss_lotus -> tom fogo ardente (laranja avermelhado)
    im_lotus = Image.open(os.path.join(ICO, 'abyss_lotus.png'))
    im_fire = tint(im_lotus, 25, sat_mult=1.2, val_mult=1.1)
    im_fire.save(os.path.join(ICO, 'fire_lotus.png'))
    print("Salvo fire_lotus.png")

    # 3. void_orchid: base blood_flower -> tom púrpura/violeta profundo do vazio
    im_flower = Image.open(os.path.join(ICO, 'blood_flower.png'))
    im_void = tint(im_flower, 275, sat_mult=1.1, val_mult=0.95)
    im_void.save(os.path.join(ICO, 'void_orchid.png'))
    print("Salvo void_orchid.png")

if __name__ == '__main__':
    main()
