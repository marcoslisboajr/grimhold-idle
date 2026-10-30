"""Monstros do Templo da Cobra (425-450), inspirados no Cobra Bastion do Tibia: o povo-serpente (a tribo de répteis
do beast_tribe_3, blocos que o Lagarto Tribal não usa), com pele de cobra e roupas em dourado, preto e roxo.
Todas as folhas andam e têm frente, lado e costas (frente, esquerda, direita, costas, em blocos 3x4 de 26x36 com
4 personagens por linha). Só peças dos packs + recolor.
Grava <nome>_1..4 (de lado, para a esquerda), <nome>_down_1..4 e <nome>_up_1..4 e soma os nomes em
client/src/world/monsterDirs.json.
  python scripts/sprites_cobra_temple.py [pasta de saída]   (padrão: assets do jogo)
"""
import colorsys, json, os, sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
TRIBE = '../grimhold/assets-pixel/personagens/beast_tribes/100/beast_tribe_3.png'
os.makedirs(OUT, exist_ok=True)

ROWS = {'': 1, '_down': 0, '_up': 3}
GREEN, RED_LO, RED_HI, WARM, BLUE = (0.17, 0.38), (0.0, 0.04), (0.94, 1.0), (0.04, 0.16), (0.52, 0.7)
EMERALD, TEAL, GOLD, PURPLE, BLACK = 0.38, 0.45, 0.12, 0.78, 0.72


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def tribe(gx, gy):
    src = Image.open(TRIBE).convert('RGBA')
    return src.crop((gx * 78, gy * 144, (gx + 1) * 78, (gy + 1) * 144)), 26, 36


def shift(s, hue, sat=1.0, val=1.0, rng=(0.0, 1.0), min_s=0.15):
    im, fw, fh = s
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, sv, v = hsv((r, g, b))
            if rng[0] <= h <= rng[1] and sv > min_s and v > 0.18:
                c = colorsys.hsv_to_rgb(hue, min(1, sv * sat), min(1, v * val))
                px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im, fw, fh


def reds(s, hue, sat=1.0, val=1.0):
    return shift(shift(s, hue, sat, val, RED_LO), hue, sat, val, RED_HI)


def aura(frame, color):
    """Contorno brilhante de 1px em volta do quadro."""
    pad = Image.new('RGBA', (frame.width + 2, frame.height + 2)); pad.alpha_composite(frame, (1, 1))
    a = pad.split()[3]; out = Image.new('RGBA', pad.size)
    px, ap = out.load(), a.load()
    for y in range(pad.height):
        for x in range(pad.width):
            if ap[x, y]: continue
            n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < pad.width and 0 <= y + dy < pad.height and ap[x + dx, y + dy])
            if n: px[x, y] = (*color, 150 + 50 * min(n, 2))
    out.alpha_composite(pad)
    return out


# nome: (folha, escala, cor da aura ou None)
MONSTERS = {
    # Pátio das Serpentes (430, XP)
    'cobra_warrior': (lambda: reds(shift(tribe(1, 0), EMERALD, 1.0, 0.9, GREEN), GOLD, 1.1, 1.1), 2.2, None),
    'cobra_scout': (lambda: shift(shift(tribe(2, 1), TEAL, 1.0, 0.9, GREEN), GOLD, 0.9, 1.0, BLUE, -1), 2.2, None),
    'cobra_assassin': (lambda: shift(shift(tribe(3, 0), EMERALD, 1.1, 0.85, GREEN), BLACK, 0.5, 0.45, WARM, -1), 2.2, None),
    # Mercado das Serpentes (438, balanceada)
    'cobra_venomancer': (lambda: shift(shift(tribe(2, 0), EMERALD, 1.0, 0.9, GREEN), PURPLE, 1.1, 1.0, BLUE), 2.2, (150, 255, 120)),
    'cobra_thrall': (lambda: shift(tribe(3, 1), TEAL, 0.9, 0.85, GREEN), 2.2, None),
    'cobra_blade': (lambda: reds(tribe(0, 1), EMERALD, 1.0, 0.8), 2.2, None),
    # Câmara do Veneno (446, loot)
    'cobra_vizier': (lambda: reds(tribe(1, 1), EMERALD, 1.0, 0.85), 2.4, (255, 220, 120)),
    'cobra_oracle': (lambda: shift(shift(tribe(3, 0), TEAL, 1.0, 0.95, GREEN), GOLD, 1.0, 1.2, WARM, -1), 2.4, None),
    'cobra_executioner': (lambda: shift(reds(tribe(0, 1), TEAL, 1.0, 0.7), PURPLE, 1.0, 0.8, WARM), 2.4, None),
    # Santuário da Serpente (440, instância) e Trono da Rainha Serpente (450, covil)
    'cobra_grand_vizier': (lambda: reds(tribe(1, 1), TEAL, 1.2, 0.9), 3.2, (255, 220, 120)),
    'cobra_matriarch': (lambda: shift(shift(tribe(3, 0), EMERALD, 1.2, 1.0, GREEN), PURPLE, 1.0, 0.7, WARM, -1), 3.2, (150, 255, 120)),
    'serpent_queen': (lambda: shift(reds(shift(tribe(1, 1), EMERALD, 1.3, 1.0, GREEN), PURPLE, 1.1, 0.8), GOLD, 1.2, 1.2, WARM), 3.6, (255, 210, 80)),
}

dirs_add = []
for name, (build, scale, glow) in MONSTERS.items():
    im, fw, fh = build()
    for suffix, row in ROWS.items():
        frames = [im.crop((c * fw, row * fh, c * fw + fw, row * fh + fh)) for c in range(3)]
        cycle = [frames[0], frames[1], frames[2], frames[1]]
        boxes = [f.getbbox() for f in cycle if f.getbbox()]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        for i, f in enumerate(cycle, 1):
            f = f.crop((x0, y0, x1, y1))
            if glow: f = aura(f, glow)
            f.resize((round(f.width * scale), round(f.height * scale)), Image.NEAREST).save(os.path.join(OUT, f'{name}{suffix}_{i}.png'))
    dirs_add.append(name)

if len(sys.argv) <= 1:
    dirs_path = os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json')
    dirs = json.load(open(dirs_path, encoding='utf8'))
    json.dump(sorted(set(dirs) | set(dirs_add)), open(dirs_path, 'w'), indent=1)
print('ok', len(MONSTERS))
