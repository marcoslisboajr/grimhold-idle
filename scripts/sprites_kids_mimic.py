"""Mímico Gigante (chefe do Dia das Crianças): o baú com dentes do pack (monster3, posição 6), ampliado 5x.

Sai em client/public/assets/monsters/giant_mimic_1..4.png. A animação são as 4 linhas da folha do pack
(fechado, espiando, boca aberta, língua de fora): o baú abre e fecha a boca. Só peça do pack, sem desenho.
Uso: python scripts/sprites_kids_mimic.py
"""
import os
from PIL import Image

PACK = r"..\grimhold\assets-pixel\personagens\tf_monsters_assetpack\TimeFantasy_Monsters\1x\monster3.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "client", "public", "assets", "monsters")

im = Image.open(PACK).convert("RGBA")
x0, y0, fw, fh = (6 % 4) * 180, (6 // 4) * 256, 60, 64
frames = [im.crop((x0, y0 + r * fh, x0 + fw, y0 + (r + 1) * fh)) for r in (0, 1, 2, 3)]
box = None
for f in frames:
    b = f.getbbox()
    box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
for i, f in enumerate(frames, 1):
    part = f.crop(box)
    part.resize((part.width * 5, part.height * 5), Image.NEAREST).save(os.path.join(OUT, f"giant_mimic_{i}.png"))
print("giant_mimic", (box[2] - box[0]) * 5, (box[3] - box[1]) * 5)
