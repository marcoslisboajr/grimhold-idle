"""Temas de mapa novos, só com peças dos packs + recolor:
- gelo: as folhas da caverna (tileA2_dungeon, tileA5_cave) recoloridas para azul-gelo;
- tumba: a folha de catacumbas do Time Fantasy (sarcófagos e paredes de crânios)."""
from PIL import Image
import colorsys, os, shutil
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
T = os.path.join(ROOT, 'client', 'public', 'assets', 'tiles')
PACK = '../grimhold/assets-pixel/tilesets/'

def ice(src, dst):
    im = Image.open(os.path.join(T, src)).convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            # Claros viram neve/gelo; escuros viram abismo azul-escuro.
            l2 = min(1.0, 0.12 + l * 1.15) if l > 0.25 else l * 0.9
            r2, g2, b2 = colorsys.hls_to_rgb(0.56, l2, min(0.45, 0.18 + s * 0.4))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    im.save(os.path.join(T, dst))

ice('tileA2_dungeon.png', 'tileA2_dungeon_ice.png')
ice('tileA5_cave.png', 'tileA5_cave_ice.png')
shutil.copy(PACK + 'catacombs_p_3x.png', os.path.join(T, 'catacombs.png'))
print('ok')
