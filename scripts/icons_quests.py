"""Ícones das recompensas das quests de item, recortados da folha do Time Fantasy Icons
(updated_layout/icons_full_32.png), como em icons_world_boss.py."""
import os
from PIL import Image

SRC = r"..\grimhold\assets-pixel\icones\icons_8.13.20\updated_layout\icons_full_32.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "client", "public", "assets", "icons")

# id -> (coluna, linha)
ICONS = {
    "silverlight": (10, 29),
    "anti_dragon_shield": (7, 39),
    "annihilator_blade": (11, 29),
    "annihilator_bow": (5, 36),
    "annihilator_staff": (13, 34),
    "annihilator_mace": (13, 33),
}

sheet = Image.open(SRC).convert("RGBA")
for name, (c, r) in ICONS.items():
    sheet.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32)).save(os.path.join(OUT, f"{name}.png"))
    print(name)
