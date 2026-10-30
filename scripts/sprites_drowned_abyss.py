"""Monstros do Abismo Afogado (325-350): homens-peixe (lizardman do tf_monsters_assetpack), águas-vivas
(jelsquid do action_monsters), tartarugas (turtle do action_monsters), hidras, sereia e sacerdotisa
(hydra e medusa do tf_mythicalbosses_v2) e o Leviatã Antigo (boss_kraken). Todas as folhas andam e têm
frente, lado e costas. Só peças dos packs + recolor.
Grava <nome>_1..4 (de lado, para a esquerda), <nome>_down_1..4 e <nome>_up_1..4 e soma os nomes em
client/src/world/monsterDirs.json.
  python scripts/sprites_drowned_abyss.py [pasta de saída]   (padrão: assets do jogo)
"""
import colorsys, json, os, sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
GRIM = '../grimhold/assets-pixel/personagens/'
LIZ = GRIM + 'tf_monsters_assetpack/TimeFantasy_Monsters/1x/monster_lizardman{}.png'
JELLY = GRIM + 'action_monsters/monsters/jelsquid/rpgmaker/jelsquid_8sheet.png'
TURTLE = GRIM + 'action_monsters/monsters/turtle/_timefantasy/turtle_sheet_{}.png'
MYTH = GRIM + 'tf_mythicalbosses_v2/100/'
os.makedirs(OUT, exist_ok=True)


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def grid3x4(f, fw, fh, gx=0, gy=0):
    """Folha 3x4 (passo1, parado, passo2; baixo, esq, dir, cima), ou um bloco dela numa folha maior."""
    src = Image.open(f).convert('RGBA')
    return src.crop((gx * 3 * fw, gy * 4 * fh, (gx + 1) * 3 * fw, (gy + 1) * 4 * fh)), fw, fh


def turtle(letter):
    """Tartaruga: linha 0 é o casco parado; linhas 1-4 (baixo, esq, dir, cima) com 8 quadros de 80x48.
    Os quadros 1-3 são o andar (cabeça para fora); vira folha 3x4."""
    src = Image.open(TURTLE.format(letter)).convert('RGBA')
    out = Image.new('RGBA', (80 * 3, 48 * 4))
    for l in range(4):
        for c, col in enumerate((1, 2, 3)):
            out.alpha_composite(src.crop((col * 80, (l + 1) * 48, col * 80 + 80, (l + 2) * 48)), (c * 80, l * 48))
    return out, 80, 48


def shift(sheet, hue, sat=1.0, val=1.0, rng=(0.0, 1.0), min_s=0.15):
    im, fw, fh = sheet
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = hsv((r, g, b))
            if rng[0] <= h <= rng[1] and s > min_s and v > 0.18:
                c = colorsys.hsv_to_rgb(hue, min(1, s * sat), min(1, v * val))
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


# nome: (folha, escala, cor da aura ou None)
MONSTERS = {
    # Ruínas Submersas (330, XP)
    'abyss_warrior': (lambda: shift(grid3x4(LIZ.format(1), 47, 50), 0.48, 1.0, 0.95, (0.2, 0.45)), 2, None),
    'abyssal_jelly': (lambda: shift(grid3x4(JELLY, 26, 36, 3, 0), 0.72, 1.1, 0.8), 2, None),
    # Fenda Afogada (338, balanceada)
    'abyss_tidecaller': (lambda: shift(shift(grid3x4(LIZ.format(2), 47, 50), 0.6, 1.0, 1.0, (0.0, 0.06)), 0.6, 1.0, 1.0, (0.93, 1.0)), 2, None),
    'abyssal_turtle': (lambda: shift(turtle('a'), 0.5, 1.0, 0.95, (0.1, 0.2)), 2, None),
    'sea_hydra': (lambda: shift(grid3x4(MYTH + 'hydra_3_1.png', 52, 53), 0.52, 1.0, 1.0), 2, None),
    # Recife do Leviatã (346, loot)
    'abyssal_siren': (lambda: shift(grid3x4(MYTH + 'medusa_1.png', 52, 53), 0.47, 1.1, 1.0, (0.2, 0.45)), 2, None),
    'elder_hydra': (lambda: shift(grid3x4(MYTH + 'hydra_5_1.png', 52, 53), 0.62, 1.0, 0.85), 2.5, None),
    'abyss_champion': (lambda: shift(grid3x4(LIZ.format(1), 47, 50), 0.78, 0.9, 0.8, (0.2, 0.45)), 2.5, None),
    # Santuário Afogado (340, instância) e Garganta do Leviatã (350, covil)
    'sanctum_turtle': (lambda: shift(turtle('c'), 0.12, 1.0, 1.05, (0.0, 0.2)), 3, None),
    'abyssal_priestess': (lambda: shift(grid3x4(MYTH + 'medusa_1.png', 52, 53), 0.8, 1.1, 0.95, (0.2, 0.45)), 3, (170, 120, 255)),
    'ancient_leviathan': (lambda: shift(grid3x4(MYTH + 'boss_kraken_1.png', 107, 92), 0.55, 1.6, 0.75), 3, (90, 230, 210)),
}

SIDE = {'': 1, '_down': 0, '_up': 3}
dirs_add = []
for name, (build, scale, glow) in MONSTERS.items():
    sheet, fw, fh = build()
    for suffix, row in SIDE.items():
        frames = [sheet.crop((c * fw, row * fh, c * fw + fw, row * fh + fh)) for c in range(3)]
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
