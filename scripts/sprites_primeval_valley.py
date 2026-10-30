"""Monstros do Vale Primevo (350-375): dinossauros (pacote dinosaurs do tf_mythicalbosses_v2: T-Rex, saurópode,
pterossauro e raptor), o alce (monster_elk do tf_monsters_assetpack) e o sasquatch (tf_mythicalbosses_v2).
Todas as folhas andam e têm frente, lado e costas. Só peças dos packs + recolor.
Os dinossauros vêm em 3x4 com as linhas frente, direita, esquerda e costas (o lado para a esquerda é a linha 2);
o alce e o sasquatch no padrão Time Fantasy (frente, esquerda, direita, costas).
Grava <nome>_1..4 (de lado, para a esquerda), <nome>_down_1..4 e <nome>_up_1..4 e soma os nomes em
client/src/world/monsterDirs.json.
  python scripts/sprites_primeval_valley.py [pasta de saída]   (padrão: assets do jogo)
"""
import colorsys, json, os, sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
GRIM = '../grimhold/assets-pixel/personagens/'
DINO = GRIM + 'tf_mythicalbosses_v2/dinosaurs/dd__{}.png'
ELK = GRIM + 'tf_monsters_assetpack/TimeFantasy_Monsters/1x/monster_elk.png'
SASQ = GRIM + 'tf_mythicalbosses_v2/100/sasquatch_1.png'
os.makedirs(OUT, exist_ok=True)

TF_ROWS = {'': 1, '_down': 0, '_up': 3}
DINO_ROWS = {'': 2, '_down': 0, '_up': 3}


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def sheet(f, fw, fh):
    return Image.open(f).convert('RGBA'), fw, fh


def dino(name): return sheet(DINO.format(name), 135, 77)


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
    # Planície dos Raptores (355, XP)
    'primal_raptor': (lambda: dino('raptor'), DINO_ROWS, 2.5, None),
    'raptor_alpha': (lambda: shift(dino('raptor'), 0.02, 1.8, 0.95, min_s=-1, floor=0.45), DINO_ROWS, 2.6, None),
    'megaloceros': (lambda: shift(sheet(ELK, 65, 66), 0.06, 0.9, 0.8), TF_ROWS, 2.2, None),
    # Selva Primeva (363, balanceada)
    'valley_sauropod': (lambda: dino('neckosaurus'), DINO_ROWS, 1.6, None),
    'sky_pterosaur': (lambda: dino('ptersaur'), DINO_ROWS, 2, None),
    'cave_brute': (lambda: sheet(SASQ, 26, 36), TF_ROWS, 2.6, None),
    # Caldeira dos Tiranos (371, loot)
    'young_tyrant': (lambda: dino('trex'), DINO_ROWS, 1.6, None),
    'fire_pterosaur': (lambda: shift(dino('ptersaur'), 0.03, 1.4, 1.0), DINO_ROWS, 2, None),
    'primal_shaman': (lambda: shift(sheet(SASQ, 26, 36), 0.78, 1.0, 0.9), TF_ROWS, 2.6, (200, 120, 255)),
    # Ninho dos Tiranos (365, instância) e Trono do Rei Tirano (375, covil)
    'pterosaur_matriarch': (lambda: shift(dino('ptersaur'), 0.13, 1.3, 1.1), DINO_ROWS, 2.8, (255, 220, 120)),
    'tyrant_mother': (lambda: shift(dino('trex'), 0.3, 1.0, 0.8), DINO_ROWS, 2, (150, 255, 120)),
    'primal_rex': (lambda: shift(dino('trex'), 0.0, 1.5, 0.9), DINO_ROWS, 2.4, (255, 140, 60)),
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
