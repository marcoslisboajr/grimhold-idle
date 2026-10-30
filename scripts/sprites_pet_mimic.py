"""Mimiquinho (pet do último Mímico do Dia das Crianças): o mesmo baú com dentes do pack
(monster3, posição 6), em folha de pet 3x4 como as do scripts/sprites_pets.py."""
import os
from PIL import Image

PACK = r"..\grimhold\assets-pixel\personagens\tf_monsters_assetpack\TimeFantasy_Monsters\1x\monster3.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "client", "public", "assets", "pets", "pet_mimic.png")

im = Image.open(PACK).convert("RGBA")
x0, y0, fw, fh = (6 % 4) * 180, (6 // 4) * 256, 60, 64
# As linhas da folha são a boca (fechado, espiando, aberta): o pet anda abrindo e fechando a boca em todas as direções.
mouth = [im.crop((x0, y0 + r * fh, x0 + fw, y0 + (r + 1) * fh)) for r in (0, 1, 2)]
grid = [mouth for _ in range(4)]
boxes = [f.getbbox() for row in grid for f in row if f.getbbox()]
l, t = min(b[0] for b in boxes), min(b[1] for b in boxes)
r, b = max(b[2] for b in boxes), max(b[3] for b in boxes)
side = max(r - l, b - t)
out = Image.new("RGBA", (side * 3, side * 4), (0, 0, 0, 0))
for ri, row in enumerate(grid):
    for ci, f in enumerate(row):
        part = f.crop((l, t, r, b))
        out.alpha_composite(part, (ci * side + (side - part.width) // 2, ri * side + side - part.height))
out.save(OUT)
print("pet_mimic", out.size)
