"""Monstros do 250-325: Biblioteca Proibida (liches e escribas dos três elementos), Catacumbas
Esquecidas (exército de esqueletos, múmias, espectros e liches) e Palácio das Asuras (mulheres de
pele azul, vermelha e dourada montadas no paperdoll do jogo).
Fontes: tf_lichcrusades_v2 (lich.png e skeletonarmy.png, 12x8 de 26x36), tf_mythicalbosses
(múmia e fantasma, 3x4 de 26x36), monstros do jogo recoloridos (elementais, demônio) e o paperdoll
(client/public/assets/paperdoll). Só peças dos packs + recolor.
Grava <nome>_1..4 (de lado, para a esquerda), <nome>_down_1..4 e <nome>_up_1..4 quando o original
tem as direções, e soma os nomes em client/src/world/monsterDirs.json.
  python scripts/sprites_library_catacombs_asuras.py [pasta de saída]   (padrão: assets do jogo)
"""
import colorsys, json, os, sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
GAME_MON = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
DOLL = os.path.join(ROOT, 'client', 'public', 'assets', 'paperdoll')
GRIM = '../grimhold/assets-pixel/personagens/'
LICH = GRIM + 'tf_lichcrusades_v2/100/lich.png'
SKEL = GRIM + 'tf_lichcrusades_v2/100/skeletonarmy.png'
MYTH = GRIM + 'tf_mythicalbosses/100/'
os.makedirs(OUT, exist_ok=True)


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def chara(f, idx, fw=26, fh=36):
    """Personagem de folha 12x8 (idx 1-8) -> folha 3x4 (passo1, parado, passo2; baixo, esq, dir, cima)."""
    src = Image.open(f).convert('RGBA')
    gx, gy = (idx - 1) % 4, (idx - 1) // 4
    out = Image.new('RGBA', (fw * 3, fh * 4))
    for l in range(4):
        for c in range(3):
            out.alpha_composite(src.crop(((gx * 3 + c) * fw, (gy * 4 + l) * fh, (gx * 3 + c + 1) * fw, (gy * 4 + l + 1) * fh)), (c * fw, l * fh))
    return out


def single(f):
    """Folha de um personagem só (3x4)."""
    return Image.open(f).convert('RGBA')


def shift(im, hue, sat=1.0, val=1.0, rng=(0.0, 1.0), min_s=0.15):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = hsv((r, g, b))
            if rng[0] <= h <= rng[1] and s > min_s and v > 0.18:
                c = colorsys.hsv_to_rgb(hue, min(1, s * sat), min(1, v * val))
                px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im


def bone(im):
    """Tons de osso e brasa (demônio das catacumbas)."""
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = hsv((r, g, b))
            if v < 0.2: continue
            c = colorsys.hsv_to_rgb(0.09, 0.25 + s * 0.3, min(1, 0.35 + v * 0.65))
            px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im


def asura(skin_hue, outfit, hair, eye):
    """Mulher do paperdoll com a pele pintada (asura) e olhos brilhando. Folha 3x4 de 22x34."""
    c = Image.open(f'{DOLL}/base_f_1.png').convert('RGBA')
    for n in (f'outfit_{outfit}_f', f'hair_f_{hair}'):
        c.alpha_composite(Image.open(f'{DOLL}/{n}.png').convert('RGBA'))
    px = c.load()
    for y in range(c.height):
        for x in range(c.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = hsv((r, g, b))
            if h < 0.12 and s > 0.15 and v > 0.35:
                k = colorsys.hsv_to_rgb(skin_hue, min(1, s + 0.2), min(1, v * 0.95))
                px[x, y] = (round(k[0] * 255), round(k[1] * 255), round(k[2] * 255), a)
    # Olhos (linha 13 de cada quadro de frente e de lado): brilho.
    for row in range(3):
        for col in range(3):
            for x in range(22):
                p = px[col * 22 + x, row * 34 + 13]
                if p[3] and hsv(p)[2] > 0.45 and not (hsv(p)[1] > 0.3 and abs(hsv(p)[0] - skin_hue) < 0.08):
                    px[col * 22 + x, row * 34 + 13] = eye
    # Paperdoll: colunas parado, passo1, passo2 -> passo1, parado, passo2 (como as outras folhas).
    out = Image.new('RGBA', c.size)
    for i, col in enumerate((1, 0, 2)):
        out.alpha_composite(c.crop((col * 22, 0, col * 22 + 22, c.height)), (i * 22, 0))
    return out, 22, 34


def aura(sheet, color=(255, 210, 90)):
    """Contorno brilhante de 1px em volta de cada quadro (aura dourada)."""
    a = sheet.split()[3]
    out = Image.new('RGBA', sheet.size)
    px, ap = out.load(), a.load()
    for y in range(sheet.height):
        for x in range(sheet.width):
            if ap[x, y]: continue
            n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < sheet.width and 0 <= y + dy < sheet.height and ap[x + dx, y + dy])
            if n: px[x, y] = (*color, 150 + 50 * min(n, 2))
    out.alpha_composite(sheet)
    return out


def game_side(src, fn):
    """Monstro do jogo (só de lado, 4 quadros) recolorido."""
    return [fn(Image.open(f'{GAME_MON}/{src}_{k}.png').convert('RGBA')) for k in range(1, 5)]


# nome: (folha 3x4 ou lista de quadros de lado, escala)
MONSTERS = {
    # Biblioteca Proibida (250-275)
    'burning_scribe': (lambda: chara(LICH, 3), 2),
    'frost_librarian': (lambda: chara(LICH, 1), 2),
    'storm_arcanist': (lambda: shift(chara(LICH, 5), 0.15, 1.2, 1.1, (0.08, 0.2)), 2),
    'living_flame': (lambda: game_side('fire_elemental', lambda im: shift(im, 0.05, 1.1, 1.05)), 0.55),
    'frost_wisp': (lambda: game_side('fire_elemental', lambda im: shift(im, 0.55, 0.9, 1.1)), 0.55),
    'storm_wisp': (lambda: game_side('fire_elemental', lambda im: shift(im, 0.15, 1.1, 1.15)), 0.55),
    'index_keeper': (lambda: shift(chara(LICH, 2), 0.78, 1.0, 0.9, (0.4, 0.6)), 2.5),
    'golden_archlibrarian': (lambda: shift(chara(LICH, 4), 0.12, 1.0, 1.05, (0.0, 0.08)), 3),
    # Catacumbas Esquecidas (275-300)
    'bone_legionary': (lambda: chara(SKEL, 1), 2),
    'bone_guard': (lambda: chara(SKEL, 5), 2),
    'bone_swordsman': (lambda: chara(SKEL, 6), 2),
    'bone_shieldbearer': (lambda: chara(SKEL, 8), 2),
    'catacomb_mummy': (lambda: shift(single(MYTH + 'mummy_1.png'), 0.08, 0.6, 0.8), 2),
    'catacomb_wraith': (lambda: shift(single(MYTH + 'ghost1.png'), 0.5, 1.0, 0.9), 2),
    'bone_priest': (lambda: chara(LICH, 6), 2),
    'grave_necromancer': (lambda: chara(LICH, 8), 2),
    'catacomb_demon': (lambda: game_side('demon', bone), 1),
    'catacomb_king': (lambda: chara(LICH, 7), 3),
    # Palácio das Asuras (300-325)
    'dawnfire_asura': (lambda: asura(0.98, 'vote_herald', '5_black', (255, 220, 120, 255)), 2),
    'midnight_asura': (lambda: asura(0.75, 'vote_shadow', '9_white', (200, 140, 255, 255)), 2),
    'frost_asura': (lambda: asura(0.55, 'vote_frost', '13_white', (190, 240, 255, 255)), 2),
    'true_asura': (lambda: asura(0.0, 'barbarian', '14_black', (255, 90, 90, 255)), 2),
    'asura_guardian': (lambda: asura(0.6, 'lion_knight', '1_black', (255, 230, 140, 255)), 2.5),
    'asura_queen': (lambda: asura(0.12, 'pit_lord', '16_black', (255, 255, 200, 255)), 3),
}

AURA = {'asura_queen'}  # contorno dourado, aplicado em cada quadro já recortado
SIDE = {'': 1, '_down': 0, '_up': 3}
dirs_add = []
for name, (build, scale) in MONSTERS.items():
    built = build()
    if isinstance(built, list):  # só de lado
        for i, f in enumerate(built, 1):
            f.resize((round(f.width * scale), round(f.height * scale)), Image.NEAREST).save(os.path.join(OUT, f'{name}_{i}.png'))
        continue
    sheet, fw, fh = built if isinstance(built, tuple) else (built, 26, 36)
    for suffix, row in SIDE.items():
        frames = [sheet.crop((c * fw, row * fh, c * fw + fw, row * fh + fh)) for c in range(3)]
        cycle = [frames[0], frames[1], frames[2], frames[1]]
        boxes = [f.getbbox() for f in cycle if f.getbbox()]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        for i, f in enumerate(cycle, 1):
            f = f.crop((x0, y0, x1, y1))
            if name in AURA:
                pad = Image.new('RGBA', (f.width + 2, f.height + 2)); pad.alpha_composite(f, (1, 1)); f = aura(pad)
            f.resize((round(f.width * scale), round(f.height * scale)), Image.NEAREST).save(os.path.join(OUT, f'{name}{suffix}_{i}.png'))
    dirs_add.append(name)

if len(sys.argv) <= 1:
    dirs_path = os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json')
    dirs = json.load(open(dirs_path, encoding='utf8'))
    json.dump(sorted(set(dirs) | set(dirs_add)), open(dirs_path, 'w'), indent=1)
print('ok', len(MONSTERS))
