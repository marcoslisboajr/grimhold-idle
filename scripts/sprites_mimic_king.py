"""Mímico Rei (último Mímico do Dia das Crianças): o Mímico Gigante com as ferragens cinza
viradas ouro. Lê giant_mimic_1..4.png e grava mimic_king_1..4.png (só recolore, sem desenho)."""
import colorsys, os
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), "..", "client", "public", "assets", "monsters")
for i in range(1, 5):
    im = Image.open(os.path.join(DIR, f"giant_mimic_{i}.png")).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            # Metal cinza-azulado (pouca saturação): vira ouro, mantendo o claro e escuro.
            if s < 0.35 and 0.08 < l < 0.95:
                nr, ng, nb = colorsys.hls_to_rgb(0.12, min(0.9, l * 1.08), 0.75)
                px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    im.save(os.path.join(DIR, f"mimic_king_{i}.png"))
print("mimic_king ok")
