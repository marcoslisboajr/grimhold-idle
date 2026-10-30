# Malgoroth, o Senhor Caído (chefe global especial): recolor obsidiana do demônio do pack,
# os servos dele (diabretes) no mesmo tom e os ícones dos lendários dele. Só recolor.
# Uso: python scripts/sprites_malgoroth.py
import colorsys, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MON = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')


def obsidiana(im, hue=0, sat=0.15, vm=0.3):
    """Mesmo matiz e saturação baixa, bem escuro: preto e cinza."""
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, max(s, 0.15) * sat * 1.6), min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


def gera(pasta, de, para, **k):
    out = os.path.join(pasta, para)
    obsidiana(Image.open(os.path.join(pasta, de)), **k).save(out)
    print('ok', para)


for n in range(1, 5):
    gera(MON, f'demon_{n}.png', f'malgoroth_{n}.png')
    # Servos: um pouco mais claros que o chefe para não sumirem do lado dele.
    gera(MON, f'imp_{n}.png', f'malgoroth_minion_{n}.png', vm=0.45)

for de, para in [
    ('demon_smite_mace.png', 'malgoroth_hammer.png'),
    ('demon_dread_blade.png', 'malgoroth_blade.png'),
    ('demon_hell_crossbow.png', 'malgoroth_crossbow.png'),
    ('demon_void_staff.png', 'malgoroth_staff.png'),
    ('abyss_weapon_pouch.png', 'malgoroth_weapon_pouch.png'),
    ('abyss_aegis.png', 'fallen_shield.png'),
    ('abyss_horns.png', 'malgoroth_helm.png'),
    ('abyss_dread_armor.png', 'infernal_armor.png'),
]:
    gera(ICO, de, para, vm=0.55)
