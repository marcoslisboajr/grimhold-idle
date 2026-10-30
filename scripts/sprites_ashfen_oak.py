"""Monstros da instância de quest O Carvalho de Ashfen (Bosque Apodrecido), só peças do pack
Time Fantasy (tf_monsters_assetpack, folhas 3x4 RPG Maker) com recolor:
  carvalho_ashfen   monster_treant, copa doente (verde-escuro e roxo), 2x       (chefe)
  galho_retorcido   monster_treant, casca seca e sem folhas vivas, 1x          (limpeza)
  lobo_corrompido   monster_wolf2, pelo roxo-escuro, 1,5x                       (limpeza)
Grava <nome>_1..4 (de lado, olhando para a esquerda), <nome>_down_1..4 e <nome>_up_1..4
(ciclo passo1, parado, passo2, parado) e soma os nomes em client/src/world/monsterDirs.json.
  python scripts/sprites_ashfen_oak.py
"""
import colorsys, json, os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
SRC = '../grimhold/assets-pixel/personagens/tf_monsters_assetpack/TimeFantasy_Monsters/1x/'


def recolor(im, fn):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            h, s, v = fn(h * 360, s, v)
            r, g, b = colorsys.hsv_to_rgb((h % 360) / 360, max(0, min(1, s)), max(0, min(1, v)))
            px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a)
    return im


def sick_oak(h, s, v):
    # Folhas (verde) viram verde-musgo escuro puxando para o roxo; o tronco escurece.
    if 60 <= h <= 170:
        return 290 if v > 0.75 else 100, s * 0.75, v * 0.7
    return h - 10, s * 0.8, v * 0.62


def dry_branch(h, s, v):
    # Sem folhas vivas: tudo em casca cinza-marrom seca.
    return 28, s * 0.35, v * 0.72


def dark_wolf(h, s, v):
    return 275, max(s, 0.35), v * 0.7


# Linhas da folha RPG Maker: 0 baixo, 1 esquerda, 2 direita, 3 cima.
ROWS = {'': 1, '_down': 0, '_up': 3}
MONSTERS = {
    'carvalho_ashfen': ('monster_treant.png', sick_oak, 2),
    'galho_retorcido': ('monster_treant.png', dry_branch, 1),
    'lobo_corrompido': ('monster_wolf2.png', dark_wolf, 1.5),
}
for name, (sheet_file, fn, scale) in MONSTERS.items():
    sheet = recolor(Image.open(SRC + sheet_file), fn)
    fw, fh = sheet.width // 3, sheet.height // 4
    for suffix, row in ROWS.items():
        frames = [sheet.crop((c * fw, row * fh, (c + 1) * fw, (row + 1) * fh)) for c in range(3)]
        cycle = [frames[0], frames[1], frames[2], frames[1]]
        boxes = [f.getbbox() for f in cycle if f.getbbox()]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        for i, f in enumerate(cycle, 1):
            f = f.crop((x0, y0, x1, y1))
            f = f.resize((round(f.width * scale), round(f.height * scale)), Image.NEAREST)
            f.save(os.path.join(OUT, f'{name}{suffix}_{i}.png'))

dirs_path = os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json')
dirs = json.load(open(dirs_path, encoding='utf8'))
json.dump(sorted(set(dirs) | set(MONSTERS)), open(dirs_path, 'w'), indent=1)
print('ok', list(MONSTERS))
