"""Folhas dos pets (3 colunas x 4 linhas) a partir das artes do pack, sem encolher.

Cada quadro é recortado no tamanho original, cortado na caixa comum a todos os
quadros (sem borda vazia) e centrado num quadrado com os pés embaixo. O jogo
escala na hora de desenhar (PET_SCALE em client/src/world/scene.ts).
"""
import os
from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "client", "public", "assets", "pets")
os.makedirs(OUT_DIR, exist_ok=True)

MONSTERS_1X = r"..\grimhold\assets-pixel\personagens\tf_monsters_assetpack\TimeFantasy_Monsters\1x"
FAIRIES_MV = r"..\grimhold\assets-pixel\personagens\timefantasy_characters\RPGMAKERMV\expansion\fairies.png"


def frames(path, x0, y0, fw, fh):
    im = Image.open(path).convert("RGBA")
    return [[im.crop((x0 + c * fw, y0 + r * fh, x0 + (c + 1) * fw, y0 + (r + 1) * fh)) for c in range(3)] for r in range(4)]


def save(grid, name):
    boxes = [f.getbbox() for row in grid for f in row if f.getbbox()]
    l, t = min(b[0] for b in boxes), min(b[1] for b in boxes)
    r, b = max(b[2] for b in boxes), max(b[3] for b in boxes)
    side = max(r - l, b - t)
    out = Image.new("RGBA", (side * 3, side * 4), (0, 0, 0, 0))
    for ri, row in enumerate(grid):
        for ci, f in enumerate(row):
            part = f.crop((l, t, r, b))
            out.alpha_composite(part, (ci * side + (side - part.width) // 2, ri * side + side - part.height))
    out.save(os.path.join(OUT_DIR, f"{name}.png"))
    print(name, out.size)


def sheet3x4(file, name):
    im = Image.open(os.path.join(MONSTERS_1X, file))
    save(frames(os.path.join(MONSTERS_1X, file), 0, 0, im.width // 3, im.height // 4), name)


def elemental(idx, name):
    save(frames(os.path.join(MONSTERS_1X, "elemental.png"), (idx % 4) * 180, (idx // 4) * 256, 60, 64), name)


sheet3x4("monster_golem1.png", "pet_mining_golem")
sheet3x4("monster_treant.png", "pet_woodcutting_treant")
elemental(1, "pet_smithing_fire")
elemental(0, "pet_fishing_water")
elemental(3, "pet_runecraft_spark")
save(frames(os.path.join(MONSTERS_1X, "monster1.png"), 0, 0, 60, 64), "pet_cooking_slime")
save(frames(FAIRIES_MV, 0, 0, 78, 108), "pet_herbalism_fairy")


# Mascotes do Dia das Crianças (só cosméticos, comprados com doces): bichinhos dos monster1-3.
def pack8(file, idx, name, fn=None):
    grid = frames(os.path.join(MONSTERS_1X, file), (idx % 4) * 180, (idx // 4) * 256, 60, 64)
    if fn:
        grid = [[fn(f) for f in row] for row in grid]
    save(grid, name)


def hue(deg):
    """Recolor: gira a matiz das cores (mantém brilho e transparência)."""
    import colorsys

    def fn(im):
        im = im.convert("RGBA")
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                r2, g2, b2 = colorsys.hsv_to_rgb((h + deg / 360) % 1, s, v)
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
        return im
    return fn


pack8("monster3.png", 0, "pet_kids_mush_purple")
pack8("monster3.png", 1, "pet_kids_mush_red")
pack8("monster3.png", 2, "pet_kids_flower")
pack8("monster3.png", 3, "pet_kids_bulb")
pack8("monster2.png", 0, "pet_kids_crab")
pack8("monster2.png", 1, "pet_kids_turtle")
pack8("monster2.png", 2, "pet_kids_octopus")
pack8("monster2.png", 3, "pet_kids_lizard")
pack8("monster1.png", 5, "pet_kids_snake")
# O slime verde já é o mascote da Culinária: o da loja sai rosa (morango).
pack8("monster1.png", 0, "pet_kids_slime", hue(-170))

# Mascote da Loja de Votos (20 moedas): a fênix do pack.
sheet3x4("monster_phoenix.png", "pet_vote_phoenix")

# Mascotes das profissões que ainda não tinham (Alquimia, Colheita de Almas, Sigilismo, Flechas, Artesanato).
elemental(2, "pet_alchemy_bubble")
pack8("monster4.png", 0, "pet_soulreaping_ghost")
pack8("monster4.png", 6, "pet_sigilism_gargoyle")
sheet3x4("monster_bird2.png", "pet_fletching_owl")
pack8("monster1.png", 6, "pet_crafting_bee")
