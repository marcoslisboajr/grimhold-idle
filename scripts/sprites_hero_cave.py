"""Monstros da Caverna dos Heróis (475-500), inspirados no Hero Cave do Tibia: heróis caídos de todas as classes,
montados com as peças do paperdoll (TF_guest_paperdolls, armaduras leve, média e pesada do Explorer Tier, homem e
mulher) recoloridas, como a Ordem do Falcão (scripts/sprites_falcon_order.py). Só peças dos packs + recolor.
Grava <nome>_1..4 (de lado, para a esquerda), <nome>_down_1..4 e <nome>_up_1..4 e soma os nomes em
client/src/world/monsterDirs.json.
  python scripts/sprites_hero_cave.py [pasta de saída]   (padrão: assets do jogo)
"""
import colorsys, json, os, sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
P = '../grimhold/assets-pixel/personagens/TF_guest_paperdolls/paperdolls/'
E = P + '2 Explorer Tier/paperdolls/'
ROWS = 4
PACK_COLS = [1, 0, 3]  # passo1, parado, passo2 (folha 4x4 do paperdoll)
os.makedirs(OUT, exist_ok=True)


def pack(f):
    """Peça do paperdoll (2x, quadros 52x72) -> folha 3x4 de 26x36 (passo1, parado, passo2)."""
    src = Image.open(f).convert('RGBA')
    out = Image.new('RGBA', (26 * 3, 36 * ROWS))
    for l in range(ROWS):
        for i, c in enumerate(PACK_COLS):
            out.alpha_composite(src.crop((c * 52, l * 72, c * 52 + 52, l * 72 + 72)).resize((26, 36), Image.NEAREST), (i * 26, l * 36))
    return out


def tint(im, hue, sat, vm, keep_gold=False):
    """Pinta a peça num tom (o contorno escuro fica). keep_gold: o dourado continua dourado."""
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if v < 0.2: continue
            if keep_gold and 0.08 <= h <= 0.17 and s > 0.35:
                nh, ns, nv = 0.12, min(1, s * 1.1), v
            else:
                nh, ns, nv = hue / 360, min(1, sat * (0.4 + s)), min(1, v * vm)
            nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, nv)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im


def hero(g, tier, n, hue, sat, vm, keep_gold=True, skin=2, head=None):
    """Herói: corpo base + pernas, peito e cabeça da mesma armadura do pack, recoloridos."""
    layers = [pack(P + f'_Bases/base_human_{g}_{skin}.png')]
    for part in ('lg', 'bd'):
        layers.append(tint(pack(E + f'ar_{g}_{tier}_{part}_{n}.png'), hue, sat, vm, keep_gold))
    layers.append(tint(pack(E + (head or f'ar_{g}_{tier}_hd_{n}.png')), hue, sat, vm, keep_gold))
    out = Image.new('RGBA', layers[0].size)
    for la in layers:
        out.alpha_composite(la)
    return out


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
    # Salão dos Heróis Caídos (480, XP)
    'fallen_warrior': (lambda: hero('m', 'hv', 3, 0, 0.45, 0.6), 2, None),
    'fallen_ranger': (lambda: hero('f', 'lt', 2, 120, 0.45, 0.65, skin=3), 2, None),
    'fallen_mage': (lambda: hero('m', 'lt', 5, 270, 0.5, 0.7, skin=1), 2, None),
    # Galeria dos Campeões (488, balanceada)
    'fallen_cleric': (lambda: hero('f', 'md', 4, 48, 0.35, 0.9), 2, None),
    'hero_vigilante': (lambda: hero('m', 'md', 2, 205, 0.45, 0.6, skin=4), 2, None),
    'hero_monk': (lambda: hero('f', 'lt', 6, 28, 0.5, 0.75, skin=2), 2, None),
    # Cripta das Lendas (496, loot)
    'champion_knight': (lambda: hero('m', 'hv', 5, 210, 0.15, 0.9), 2.2, None),
    'shadow_heroine': (lambda: hero('f', 'hv', 1, 265, 0.35, 0.45, keep_gold=False), 2.2, (190, 110, 255)),
    'lost_paladin': (lambda: hero('f', 'hv', 4, 45, 0.4, 0.85), 2.2, None),
    # Salão do Juramento (490, instância) e Trono do Campeão Caído (500, covil final)
    'hero_captain': (lambda: hero('m', 'hv', 6, 355, 0.55, 0.55), 3, (255, 120, 80)),
    'heroine_archmage': (lambda: hero('f', 'lt', 3, 280, 0.55, 0.7, skin=1), 3, (220, 140, 255)),
    'fallen_champion': (lambda: hero('m', 'hv', 2, 40, 0.35, 0.45), 3.4, (255, 215, 90)),
}

SIDE = {'': 1, '_down': 0, '_up': 3}
dirs_add = []
for name, (build, scale, glow) in MONSTERS.items():
    sheet = build()
    for suffix, row in SIDE.items():
        frames = [sheet.crop((c * 26, row * 36, c * 26 + 26, row * 36 + 36)) for c in range(3)]
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
