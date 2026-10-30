"""Monstros da Torre dos Bruxos (450-475), inspirados nos Warlocks, Infernalists e Devoted/Fanatics do Tibia:
os cultistas encapuzados do elements_cultists (blocos que o Cultista Vermelho e a Cidadela do Usurpador não usam
do mesmo jeito), com cores e auras por escola de magia, e os guardas devotos (cavaleiro do military1 do
timefantasy_characters). Todas as folhas andam e têm frente, lado e costas. Só peças dos packs + recolor.
Grava <nome>_1..4 (de lado, para a esquerda), <nome>_down_1..4 e <nome>_up_1..4 e soma os nomes em
client/src/world/monsterDirs.json.
  python scripts/sprites_warlock_tower.py [pasta de saída]   (padrão: assets do jogo)
"""
import colorsys, json, os, sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
GRIM = '../grimhold/assets-pixel/personagens/'
MIL = GRIM + 'timefantasy_characters/sheets/military{}.png'
CULT = GRIM + 'elements_cultists/100/e_cultists{}.png'
os.makedirs(OUT, exist_ok=True)

ROWS = {'': 1, '_down': 0, '_up': 3}
RED_LO, RED_HI, BLUE, GREEN, BROWN, GOLD_R = (0.0, 0.04), (0.93, 1.0), (0.52, 0.7), (0.22, 0.5), (0.02, 0.12), (0.03, 0.2)
ORANGE, VIOLET, CRIMSON, WHITE_GOLD, EMBER = 0.06, 0.8, 0.98, 0.13, 0.03


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def block(f, fw, fh, gx, gy):
    src = Image.open(f).convert('RGBA')
    return src.crop((gx * 3 * fw, gy * 4 * fh, (gx + 1) * 3 * fw, (gy + 1) * 4 * fh)), fw, fh


def mil(n, gx, gy): return block(MIL.format(n), 26, 36, gx, gy)
def cult(letter, gx, gy): return block(CULT.format(letter), 16, 32, gx, gy)


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
    # Biblioteca dos Bruxos (455, XP)
    'tower_warlock': (lambda: cult('B', 3, 0), 2.6, (255, 120, 80)),
    'arcane_apprentice': (lambda: cult('A', 2, 0), 2.4, None),
    'devoted_guard': (lambda: reds(mil(1, 1, 1), WHITE_GOLD, 1.0, 1.1), 2.2, None),
    # Fornalha Infernal (463, balanceada)
    'infernalist': (lambda: reds(cult('B', 3, 1), EMBER, 1.2, 0.85), 2.6, (255, 150, 40)),
    'ember_acolyte': (lambda: shift(cult('C', 0, 0), ORANGE, 1.3, 1.0, BROWN), 2.4, None),
    'tower_devoted': (lambda: cult('B', 1, 0), 2.4, (255, 230, 140)),
    # Altar dos Fanáticos (471, loot)
    'tower_fanatic': (lambda: shift(cult('C', 3, 1), VIOLET, 1.1, 0.8, GREEN), 2.6, None),
    'void_warlock': (lambda: shift(cult('A', 3, 1), VIOLET, 1.1, 1.0, BLUE), 2.6, (190, 110, 255)),
    'grand_devoted': (lambda: cult('B', 1, 1), 2.6, (255, 210, 80)),
    # Conselho da Torre (465, instância) e Trono das Chamas (475, covil)
    'archwarlock': (lambda: reds(cult('B', 3, 0), VIOLET, 1.1, 0.9), 3.6, (220, 120, 255)),
    'devoted_high_priest': (lambda: shift(cult('B', 1, 0), WHITE_GOLD, 1.3, 1.1, GOLD_R), 3.4, (255, 230, 140)),
    'grand_infernalist': (lambda: reds(cult('B', 3, 1), CRIMSON, 1.3, 0.55), 4, (255, 130, 30)),
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
