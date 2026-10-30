"""Recorta os ícones dos sets dos chefes globais da folha do Time Fantasy Icons
(updated_layout/icons_full_32.png). Bolsas repetidas ganham recolor por rotação de matiz."""
import colorsys
import os
from PIL import Image

SRC = r"..\grimhold\assets-pixel\icones\icons_8.13.20\updated_layout\icons_full_32.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "client", "public", "assets", "icons")

# id -> (coluna, linha, rotação de matiz em graus)
ICONS = {
    "ancient_weapon_pouch": (3, 17, 0),
    "lich_weapon_pouch": (2, 17, 0),
    "kraken_weapon_pouch": (3, 17, 160),
    "abyss_weapon_pouch": (3, 17, 250),
    "ancient_dragon_blade": (13, 29, 0),
    "ancient_dragon_bow": (6, 36, 0),
    "ancient_dragon_staff": (13, 32, 0),
    "ancient_dragon_mace": (12, 33, 0),
    "ancient_helm": (8, 47, 0),
    "ancient_legs": (8, 46, 0),
    "ancient_boots": (4, 51, 0),
    "lich_frost_blade": (14, 29, 0),
    "lich_bone_bow": (4, 36, 0),
    "lich_death_staff": (14, 32, 0),
    "lich_soul_scepter": (7, 34, 0),
    "lich_robe": (5, 44, 0),
    "lich_legs": (9, 46, 0),
    "lich_boots": (5, 51, 0),
    "kraken_harpoon": (9, 31, 0),
    "kraken_tide_bow": (5, 36, 160),
    "kraken_pearl_staff": (9, 32, 0),
    "kraken_tide_trident": (14, 31, 0),
    "tide_helm": (13, 48, 0),
    "tide_armor": (12, 42, 0),
    "tide_legs": (7, 46, 0),
    "demon_dread_blade": (15, 29, 0),
    "demon_hell_crossbow": (9, 36, 0),
    "demon_void_staff": (15, 32, 0),
    "demon_smite_mace": (9, 33, 0),
    "abyss_horns": (15, 47, 0),
    "abyss_dread_armor": (15, 42, 0),
    "abyss_dread_legs": (3, 45, 0),
    "abyss_dread_boots": (10, 51, 0),
}


def hue(img: Image.Image, deg: int) -> Image.Image:
    if not deg:
        return img
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb((h + deg / 360) % 1, s, v)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return img


sheet = Image.open(SRC).convert("RGBA")
for name, (c, r, deg) in ICONS.items():
    icon = hue(sheet.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32)), deg)
    icon.save(os.path.join(OUT, f"{name}.png"))
print(f"{len(ICONS)} ícones")
