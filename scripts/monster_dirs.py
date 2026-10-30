"""Sprites de monstro andando para baixo e para cima, recortados das MESMAS
folhas RPG Maker (3x4 ou 12x8) de onde veio o sprite de lado — só peças do
pack, nada desenhado. A origem de cada monstro está em
scripts/data/monster_sources.json (achada comparando o quadro parado com as
folhas da pasta Downloads).

Grava client/public/assets/monsters/<nome>_down_1..4.png e <nome>_up_1..4.png
(ciclo passo1, parado, passo2, parado, como os de lado) e a lista dos
monstros com as quatro direções em client/src/world/monsterDirs.json."""
from PIL import Image, ImageDraw
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
SRC = '../downloads/'
sources = json.load(open(os.path.join(ROOT, 'scripts', 'data', 'monster_sources.json'), encoding='utf8'))

def sem_fundo(im, tol=18):
    im = im.convert('RGBA')
    w, h = im.size
    for c in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        r, g, b, a = im.getpixel(c)
        if a and r > 255 - tol and g > 255 - tol and b > 255 - tol:
            ImageDraw.floodfill(im, c, (0, 0, 0, 0), thresh=tol)
    return im

# Linhas da folha RPG Maker: 0 baixo, 1 esquerda, 2 direita, 3 cima.
DIRS = {'down': 0, 'up': 3}
done = []
for name, s in sources.items():
    sheet = sem_fundo(Image.open(SRC + s['sheet']))
    cols, rows = s['grid']
    fw, fh = sheet.width // cols, sheet.height // rows
    bx, by = s['block']
    for d, row in DIRS.items():
        r = by * 4 + row
        frames = [sheet.crop(((bx * 3 + c) * fw, r * fh, (bx * 3 + c + 1) * fw, (r + 1) * fh)) for c in range(3)]
        cycle = [frames[0], frames[1], frames[2], frames[1]]
        boxes = [f.getbbox() for f in cycle if f.getbbox()]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        for i, f in enumerate(cycle, 1):
            f = f.crop((x0, y0, x1, y1))
            f = f.resize((f.width * s['scale'], f.height * s['scale']), Image.NEAREST)
            f.save(os.path.join(OUT, f'{name}_{d}_{i}.png'))
    done.append(name)
json.dump(sorted(done), open(os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json'), 'w'), indent=1)
print(len(done), 'monstros com 4 direções')
