# Ícones das magias (client/public/assets/icons/spell_<id>.png), recortados das folhas de
# ícones de 32px do pack (assets-pixel/icones). Uma célula por magia.
#
# Uso: python scripts/icons_spells.py
import os
from PIL import Image

SRC = '../grimhold/assets-pixel/icones/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'public', 'assets', 'icons')
A, M, M2 = 'icons_skillsa_32', 'mskills_icon32', 'mskills2_icon32'

ICONS = {
    # Guerreiro
    'brutal_strike': (A, 0, 0), 'war_cry': (M2, 0, 1), 'iron_skin': (A, 10, 1), 'whirlwind': (M, 10, 0),
    'earthquake': (M, 14, 0), 'berserk': (M2, 4, 0), 'execution': (A, 2, 0),
    # Caçador
    'aimed_shot': (A, 8, 0), 'focus': (A, 13, 0), 'field_bandage': (M2, 5, 0), 'arrow_rain': (A, 7, 0),
    'explosive_arrows': (A, 12, 1), 'eagle_eye': (M2, 8, 0), 'piercing_shot': (A, 9, 0),
    # Arcanista
    'fireball': (M, 0, 0), 'lightning': (M, 8, 0), 'arcane_shield': (A, 11, 0), 'ice_storm': (M, 5, 0),
    'meteor': (M, 2, 0), 'mana_barrier': (M, 6, 0), 'arcane_inferno': (M, 9, 0),
    # Devoto
    'heal': (M2, 1, 0), 'holy_light': (M2, 2, 0), 'blessing': (A, 8, 1), 'great_heal': (M2, 0, 0),
    'judgement': (M2, 6, 0), 'divine_heal': (A, 9, 1), 'divine_wrath': (M2, 3, 0),
}

sheets = {}
for sid, (sheet, x, y) in ICONS.items():
    im = sheets.setdefault(sheet, Image.open(SRC + sheet + '.png').convert('RGBA'))
    im.crop((x * 32, y * 32, x * 32 + 32, y * 32 + 32)).save(os.path.join(OUT, f'spell_{sid}.png'))
print('ok', len(ICONS))
