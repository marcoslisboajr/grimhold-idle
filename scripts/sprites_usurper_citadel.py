"""Monstros da Cidadela do Usurpador (400-425), inspirados nos Usurpers do Tibia: cavaleiros, arqueiros,
legionários e oficiais (military1-2 do timefantasy_characters) e feiticeiros encapuzados (elements_cultists),
recoloridos no roxo e negro da ordem usurpadora. Todas as folhas andam e têm frente, lado e costas (frente,
esquerda, direita, costas, em blocos 3x4 com 4 personagens por linha). Só peças dos packs + recolor.
Grava <nome>_1..4 (de lado, para a esquerda), <nome>_down_1..4 e <nome>_up_1..4 e soma os nomes em
client/src/world/monsterDirs.json.
  python scripts/sprites_usurper_citadel.py [pasta de saída]   (padrão: assets do jogo)
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
PURPLE, VIOLET, GOLD, CRIMSON, BLACK = 0.78, 0.83, 0.12, 0.98, 0.72


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def block(f, fw, fh, gx, gy):
    """Um personagem (3x4 quadros) de uma folha com vários."""
    src = Image.open(f).convert('RGBA')
    return src.crop((gx * 3 * fw, gy * 4 * fh, (gx + 1) * 3 * fw, (gy + 1) * 4 * fh)), fw, fh


def mil(n, gx, gy): return block(MIL.format(n), 26, 36, gx, gy)
def cult(letter, gx, gy): return block(CULT.format(letter), 16, 32, gx, gy)


def shift(s, hue, sat=1.0, val=1.0, rng=(0.0, 1.0), min_s=0.15, floor=0.0):
    im, fw, fh = s
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, sv, v = hsv((r, g, b))
            if rng[0] <= h <= rng[1] and sv > min_s and v > 0.18:
                c = colorsys.hsv_to_rgb(hue, min(1, max(floor, sv * sat)), min(1, v * val))
                px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im, fw, fh


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


RED_LO, RED_HI, GREEN, GOLD_R, BROWN = (0.0, 0.04), (0.93, 1.0), (0.22, 0.5), (0.08, 0.2), (0.02, 0.12)


def reds(s, hue, sat=1.0, val=1.0):
    return shift(shift(s, hue, sat, val, RED_LO), hue, sat, val, RED_HI)


# nome: (folha, escala, cor da aura ou None). Recolor só das faixas de cor (armadura, detalhes, pluma);
# pele, cinza do metal e brilho ficam.
MONSTERS = {
    # Muralhas do Usurpador (405, XP)
    'usurper_knight': (lambda: shift(mil(1, 3, 0), PURPLE, 1.1, 0.9, GREEN), 2.2, None),
    'usurper_archer': (lambda: shift(mil(2, 0, 0), PURPLE, 1.0, 0.9, BROWN), 2.2, None),
    'usurper_warlock': (lambda: reds(cult('B', 2, 0), VIOLET, 1.0, 0.9), 2.6, (190, 110, 255)),
    # Quartel Usurpador (413, balanceada)
    'usurper_legionary': (lambda: reds(shift(mil(1, 3, 1), PURPLE, 0.12, 0.85, (0.03, 0.2)), PURPLE, 1.1, 0.95), 2.2, None),
    'factory_bandit': (lambda: reds(mil(2, 3, 0), 0.3, 1.0, 1.0), 2.2, None),
    'usurper_officer': (lambda: shift(mil(2, 0, 1), PURPLE, 1.0, 1.0, GOLD_R), 2.2, None),
    # Salão do Trono Usurpado (421, loot)
    'usurper_elite': (lambda: shift(mil(1, 2, 0), CRIMSON, 1.2, 0.9, GREEN), 2.4, None),
    'usurper_shadowcaster': (lambda: cult('A', 0, 0), 2.6, (255, 80, 120)),
    'usurper_marshal': (lambda: reds(mil(1, 2, 1), PURPLE, 1.1, 0.9), 2.4, None),
    # Conselho dos Usurpadores (415, instância) e Trono do Usurpador (425, covil)
    'usurper_archmage': (lambda: shift(reds(cult('B', 0, 0), VIOLET), VIOLET, 1.2, 1.0, GOLD_R), 3.4, (230, 150, 255)),
    'usurper_general': (lambda: reds(mil(1, 3, 1), PURPLE, 1.2, 0.9), 3.2, (255, 200, 90)),
    'usurper_king': (lambda: shift(mil(1, 3, 0), GOLD, 1.3, 1.1, GREEN), 3.4, (190, 110, 255)),
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
