# Ícones de interface (no lugar dos emojis): recortes 32x32 das folhas do pack Time Fantasy.
# Uso: python scripts/icons_ui.py
import os
from PIL import Image

PACK = '../grimhold/assets-pixel/icones/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'public', 'assets', 'icons')

# nome: (folha, coluna, linha)
PICK = {
    'lock': ('icons_ui_32.png', 3, 0),
    'unlock': ('icons_ui_32.png', 3, 1),
    'sound_on': ('icons_ui_32.png', 11, 0),
    'sound_off': ('icons_ui_32.png', 8, 0),
    'swap': ('icons_ui_32.png', 7, 0),
    'pin': ('icons_ui_32.png', 2, 2),
    'check': ('icons_ui_32.png', 7, 2),
    'gift': ('icons_misc3_32.png', 10, 0),
    'hourglass': ('mskills2_icon32.png', 11, 0),
    'star': ('mskills2_icon32.png', 0, 0),
}

for name, (sheet, col, row) in PICK.items():
    im = Image.open(PACK + sheet).convert('RGBA')
    im.crop((col * 32, row * 32, col * 32 + 32, row * 32 + 32)).save(os.path.join(OUT, f'ui_{name}.png'))
    print('ok', name)
