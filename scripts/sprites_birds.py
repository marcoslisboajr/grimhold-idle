"""Pássaros da caçada de penas (Time Fantasy Monsters: bird1-3 e phoenix).

Grava client/public/assets/monsters/<nome>_1..4.png (de lado, olhando para a
esquerda, ciclo passo1, parado, passo2, parado, como os outros monstros).
As direções de baixo e de cima saem do scripts/monster_dirs.py
(scripts/data/monster_sources.json)."""
from PIL import Image
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
SRC = '../grimhold/assets-pixel/personagens/tf_monsters_assetpack/TimeFantasy_Monsters/1x/'
BIRDS = {'falcao': 'monster_bird1', 'corvo': 'monster_bird2', 'abutre': 'monster_bird3', 'fenix': 'monster_phoenix'}
# Os pássaros comuns no tamanho do pack; a fênix maior.
SCALE = {'falcao': 1, 'corvo': 1, 'abutre': 1, 'fenix': 2}
for name, sheet in BIRDS.items():
    sh = Image.open(SRC + sheet + '.png').convert('RGBA')
    fw, fh = sh.width // 3, sh.height // 4
    row = 1  # esquerda
    frames = [sh.crop((c * fw, row * fh, (c + 1) * fw, (row + 1) * fh)) for c in range(3)]
    cycle = [frames[0], frames[1], frames[2], frames[1]]
    boxes = [f.getbbox() for f in cycle]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    for i, f in enumerate(cycle, 1):
        f = f.crop((x0, y0, x1, y1))
        f.resize((f.width * SCALE[name], f.height * SCALE[name]), Image.NEAREST).save(os.path.join(OUT, f'{name}_{i}.png'))
print('ok', list(BIRDS))
