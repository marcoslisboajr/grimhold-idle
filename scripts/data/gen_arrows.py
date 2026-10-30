import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ICONS_DIR = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
ARROWS_SHEET = '../grimhold/assets-pixel/icones/marrows_icon32.png'

sheet = Image.open(ARROWS_SHEET).convert('RGBA')

# Mapeamento das células da folha oficial de flechas para os nomes no jogo
# c=0: flecha basica / madeira
# c=1: flecha de bronze
# c=2: flecha de ferro
# c=5: flecha de aco
# c=8: flecha de mithril
# c=11: flecha envenenada
# c=13: flecha de fogo
# c=15: flecha do vazio
CELL_MAP = {
    'arrow_shaft': 0,      # haste / flecha de madeira
    'bronze_arrow': 1,     # bronze
    'iron_arrow': 2,       # ferro
    'steel_arrow': 5,      # aco
    'mithril_arrow': 8,    # mithril
    'poison_arrow': 11,    # veneno
    'fire_arrow': 13,      # fogo
    'void_arrow': 15,      # vazio
}

for name, col in CELL_MAP.items():
    cell = sheet.crop((col * 32, 0, col * 32 + 32, 32))
    target_path = os.path.join(ICONS_DIR, f'{name}.png')
    cell.save(target_path)
    print(f'Salvo icone: {target_path} (coluna {col})')

# Icone da skill Criação de Flechas (arco com flecha ou flecha estilizada)
skill_icon = sheet.crop((1 * 32, 0, 1 * 32 + 32, 32))
skill_path = os.path.join(ICONS_DIR, 'skill_fletching.png')
skill_icon.save(skill_path)
print(f'Salvo icone da skill: {skill_path}')
