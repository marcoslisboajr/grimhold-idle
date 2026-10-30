"""Mascotes de combate (24/10): filhotes feitos com os quadros dos monstros que o jogo já tem, menores e
recoloridos (só peças dos packs + recolor). Sai no formato dos mascotes: 3 colunas x 4 linhas (baixo,
esquerda, direita, cima). Usa <monstro>_down_N (frente), <monstro>_N (lado) e <monstro>_up_N (costas);
o outro lado é o espelho.
  python scripts/sprites_combat_pets.py
"""
import colorsys, os

from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MON = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'pets')
SIZE = 40  # altura do mascote em pixels


def recolor(im, hue, sat=1.0, val=1.0, min_s=0.2):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > min_s or min_s == 0:
                # min_s = 0: pinta até o branco (saturação fixa, que multiplicar 0 não muda nada).
                c = colorsys.hsv_to_rgb(hue, sat if min_s == 0 else min(1, s * sat), min(1, v * val))
                px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im


def frame(name, kind, i):
    for f in (f'{name}{kind}_{i}.png', f'{name}_{i}.png', f'{name}_down_{i}.png'):
        p = os.path.join(MON, f)
        if os.path.exists(p):
            return Image.open(p).convert('RGBA')
    raise FileNotFoundError(name)


# id do mascote: (monstro de base, recolor ou None)
PETS = {
    'pet_wolf_cub': ('lobo', (0.07, 0.45, 0.8, 0)),  # lobo branco do jogo -> marrom
    'pet_stone_turtle': ('sanctum_turtle', (0.08, 0.25, 0.9)),
    'pet_blood_bat': ('morcego', (0.99, 1.2, 0.85)),
    'pet_healing_wisp': ('frost_wisp', (0.33, 1.0, 1.0)),
    'pet_ancient_whelp': ('dragon_hatchling', None),
    'pet_kraken_spawn': ('kraken', None),
    'pet_sylveth_cub': ('lobo', (0.38, 0.45, 0.95, 0)),  # verde-floresta
    'pet_little_lich': ('lich5', None),
}

for pid, (mon, tint) in PETS.items():
    rows = {k: [frame(mon, k, i) for i in (1, 2, 3)] for k in ('_down', '', '_up')}
    allf = [f for fs in rows.values() for f in fs]
    h = max(f.height for f in allf)
    k = SIZE / h
    fw = max(round(f.width * k) for f in allf)
    sheet = Image.new('RGBA', (fw * 3, SIZE * 4))
    order = [rows['_down'], rows[''], [ImageOps.mirror(f) for f in rows['']], rows['_up']]
    for r, fs in enumerate(order):
        for c, f in enumerate(fs):
            f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.NEAREST)
            if tint: f = recolor(f, *tint)
            sheet.alpha_composite(f, (c * fw + (fw - f.width) // 2, r * SIZE + SIZE - f.height))
    sheet.save(os.path.join(OUT, f'{pid}.png'))
print('ok', len(PETS))
