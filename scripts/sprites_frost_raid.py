"""Gera os sprites dos chefes e os ícones das peças da Raide 150: Fortaleza do Inverno Eterno.
Sprites originais do pack + recolor para tom azul-gelo límpido / ciano gélido.
Gera monstros em client/public/assets/monsters/, ícones em client/public/assets/icons/
e as folhas paperdoll em client/public/assets/paperdoll/.
"""
import os
import json
import colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MONSTERS_DIR = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
ICONS_DIR = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
PAPERDOLL_DIR = os.path.join(ROOT, 'client', 'public', 'assets', 'paperdoll')
DIRS_JSON = os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json')
PAPERDOLL_JSON = os.path.join(ROOT, 'client', 'src', 'paperdoll.json')

MAPPING = {
    'raid_frost_1': 'frost_giant',
    'raid_frost_2': 'frost_knight',
    'raid_frost_add': 'ice_golem',
    'raid_frost_3': 'frost_asura',
    'raid_frost_4': 'eternal_frost_dragon',
}

ICON_MAPPING = {
    'eternal_frost_helmet': 'drop150_helmet',
    'eternal_frost_armor': 'frost_plate',
    'eternal_frost_legs': 'drop150_legs',
    'eternal_frost_boots': 'drop150_boots',
    'eternal_frost_blade': 'drop150_sword',
    'eternal_frost_bow': 'drop150_bow',
    'eternal_frost_staff': 'drop150_staff',
    'eternal_frost_mace': 'drop150_mace',
}

# Tom de gelo eterno: ciano-azul brilhante (H ~ 0.54, ou seja ~195 graus)
TARGET_HUE = 0.54

def recolor_image(im, hue=TARGET_HUE, sat_mult=1.1, val_mult=1.15):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h_val, s_val, v_val = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            new_h = hue
            new_s = min(1.0, max(0.20, s_val * sat_mult))
            new_v = min(1.0, v_val * val_mult)
            nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im

def main():
    with open(DIRS_JSON, 'r', encoding='utf8') as f:
        dirs_list = json.load(f)

    updated_dirs = set(dirs_list)

    # 1. Monstros
    for new_id, base_id in MAPPING.items():
        updated_dirs.add(new_id)
        for prefix in ['', 'down_', 'up_']:
            for frame in range(1, 5):
                src_filename = f'{base_id}_{prefix}{frame}.png'
                src_path = os.path.join(MONSTERS_DIR, src_filename)
                if not os.path.exists(src_path):
                    continue
                dst_filename = f'{new_id}_{prefix}{frame}.png'
                dst_path = os.path.join(MONSTERS_DIR, dst_filename)

                with Image.open(src_path) as im:
                    recolored = recolor_image(im, TARGET_HUE, sat_mult=1.1, val_mult=1.1)
                    recolored.save(dst_path)

        print(f'Generated frames for {new_id} from {base_id}')

    with open(DIRS_JSON, 'w', encoding='utf8') as f:
        json.dump(sorted(list(updated_dirs)), f, indent=1)

    # 2. Ícones
    for new_id, base_id in ICON_MAPPING.items():
        src_path = os.path.join(ICONS_DIR, f'{base_id}.png')
        dst_path = os.path.join(ICONS_DIR, f'{new_id}.png')
        if not os.path.exists(src_path):
            print(f'Warning: {src_path} not found!')
            continue
        with Image.open(src_path) as im:
            recolored = recolor_image(im, TARGET_HUE, sat_mult=1.2, val_mult=1.15)
            recolored.save(dst_path)
        print(f'Generated icon {new_id} from {base_id}')

    # 3. Paperdoll sheets para o traje eternal_frost a partir de shattered_souls ou gerado
    for g in ['m', 'f']:
        # Outfit base
        src_outfit = os.path.join(PAPERDOLL_DIR, f'outfit_shattered_souls_{g}.png')
        dst_outfit = os.path.join(PAPERDOLL_DIR, f'outfit_eternal_frost_{g}.png')
        if os.path.exists(src_outfit):
            with Image.open(src_outfit) as im:
                recolored = recolor_image(im, TARGET_HUE, sat_mult=1.0, val_mult=1.1)
                recolored.save(dst_outfit)
            print(f'Generated outfit_eternal_frost_{g}.png')

        # Top base
        src_top = os.path.join(PAPERDOLL_DIR, f'top_shattered_souls_{g}.png')
        dst_top = os.path.join(PAPERDOLL_DIR, f'top_eternal_frost_{g}.png')
        if os.path.exists(src_top):
            with Image.open(src_top) as im:
                recolored = recolor_image(im, TARGET_HUE, sat_mult=1.0, val_mult=1.1)
                recolored.save(dst_top)
            print(f'Generated top_eternal_frost_{g}.png')

    # Atualiza paperdoll.json
    with open(PAPERDOLL_JSON, 'r', encoding='utf8') as f:
        pj = json.load(f)
    for g in ['f', 'm']:
        top_name = f'eternal_frost_{g}'
        if top_name not in pj['tops']:
            pj['tops'].append(top_name)
        if top_name not in pj['helms']:
            pj['helms'].append(top_name)
    pj['tops'].sort()
    pj['helms'].sort()
    with open(PAPERDOLL_JSON, 'w', encoding='utf8') as f:
        json.dump(pj, f)
    print('Updated paperdoll.json')

if __name__ == '__main__':
    main()
