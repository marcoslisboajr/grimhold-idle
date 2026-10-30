"""Monstros do Jardim Corrompido (375-400): pinhas vivas (pinecoon) e fantasmas-lanterna (lantphant) do
action_monsters (RPG Maker, 3x4 de 32 px), golem de musgo, cacto e treant (tf_monsters_assetpack, 3x4 de 47x50).
Todas as folhas andam e têm frente, lado e costas (frente, esquerda, direita, costas). Só peças dos packs + recolor.
client/src/world/monsterDirs.json.
  python scripts/sprites_corrupted_garden.py [pasta de saída]   (padrão: assets do jogo)
"""
import colorsys, json, os, sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
GRIM = '../grimhold/assets-pixel/personagens/'
AM = GRIM + 'action_monsters/monsters/'
# A folha rpgmaker/pinecoon_rm_1 é um guia com fundo xadrez (saía quadrado verde); a pine_sheet é transparente.
PINE = AM + 'pinecoon/pine_sheet.png'
LANT = AM + 'lantphant/rpgmaker/lantphant_rm_1.png'
TFM = GRIM + 'tf_monsters_assetpack/TimeFantasy_Monsters/1x/'
os.makedirs(OUT, exist_ok=True)

ROWS = {'': 1, '_down': 0, '_up': 3}
# A pinha só tem frente (linha 0) e costas (linha 1).
PINE_ROWS = {'': 0, '_down': 0, '_up': 1}


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def sheet(f, fw, fh):
    return Image.open(f).convert('RGBA'), fw, fh


def rm(f): return sheet(f, 32, 32)  # primeiro personagem da folha RPG Maker (3x4 no canto)


def tf(name): return sheet(TFM + name + '.png', 47, 50)


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


# nome: (folha, linhas, escala, cor da aura ou None)
MONSTERS = {
    # Bosque das Pinhas (380, XP)
    'raging_pinecoon': (lambda: rm(PINE), PINE_ROWS, 3.2, None),
    'moss_golem': (lambda: tf('monster_golem2'), ROWS, 2.2, None),
    'wandering_lantern': (lambda: rm(LANT), ROWS, 2.6, None),
    # Estufa Assombrada (388, balanceada)
    'thorn_cactus': (lambda: shift(tf('monster_cacto'), 0.3, 0.9, 0.75), ROWS, 2.2, None),
    'rotten_golem': (lambda: shift(tf('monster_golem2'), 0.8, 0.8, 0.8, (0.15, 0.5)), ROWS, 2.2, None),
    'thorn_pinecoon': (lambda: shift(rm(PINE), 0.3, 1.0, 0.8), PINE_ROWS, 3.2, None),
    # Raízes Podres (396, loot)
    'blight_cactus': (lambda: shift(tf('monster_cacto'), 0.8, 1.0, 0.8), ROWS, 2.2, (200, 110, 255)),
    'corrupted_lantern': (lambda: shift(rm(LANT), 0.8, 1.2, 1.0, (0.3, 0.6)), ROWS, 2.6, (200, 110, 255)),
    'venom_pinecoon': (lambda: shift(rm(PINE), 0.78, 1.0, 0.85), PINE_ROWS, 3.2, None),
    # Coração do Jardim (390, instância) e Árvore do Fim (400, covil)
    'spore_mother': (lambda: shift(tf('monster_golem2'), 0.85, 1.2, 0.95, (0.15, 0.5)), ROWS, 3, (230, 120, 255)),
    'lantern_warden': (lambda: shift(rm(LANT), 0.12, 1.3, 1.1, (0.3, 0.6)), ROWS, 3.6, (255, 220, 120)),
    'end_tree': (lambda: shift(tf('monster_treant'), 0.78, 1.1, 0.75), ROWS, 3, (180, 90, 255)),
}

dirs_add = []
for name, (build, rows, scale, glow) in MONSTERS.items():
    im, fw, fh = build()
    for suffix, row in rows.items():
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
