# Ícones dos elementos (no lugar dos emojis): recortes 32x32 das folhas de magia do pack Time Fantasy.
# Uso: python scripts/icons_elements.py
import os
from PIL import Image

PACK = '../grimhold/assets-pixel/icones/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'public', 'assets', 'icons')

# elemento: (folha, índice do ícone na linha de cima)
PICK = {
    'fire': ('mskills_icon32.png', 1),
    'water': ('mskills_icon32.png', 3),
    'energy': ('mskills_icon32.png', 8),
    'earth': ('mskills_icon32.png', 14),
    'holy': ('mskills2_icon32.png', 1),
    'death': ('mskills2_icon32.png', 9),
    'physical': ('mshields_icon32.png', 11),
}

for element, (sheet, idx) in PICK.items():
    im = Image.open(PACK + sheet).convert('RGBA')
    im.crop((idx * 32, 0, idx * 32 + 32, 32)).save(os.path.join(OUT, f'element_{element}.png'))
    print('ok', element)
