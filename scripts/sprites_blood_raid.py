"""Gera os sprites dos chefes e os ícones das peças da Raide Sangue Apodrecido (550+).
Sprites originais do pack + recolor para tom vermelho-sangue escuro.
Salva monstros em client/public/assets/monsters/ e ícones em client/public/assets/icons/.
"""
import os
import json
import colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MONSTERS_DIR = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
ICONS_DIR = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
DIRS_JSON = os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json')

MAPPING = {
    'raid_blood_1': 'rotten_golem',
    'raid_blood_2': 'abyss_champion',
    'raid_blood_3': 'serpent_queen',
    'raid_blood_leech': 'abyssal_jelly',
    'raid_blood_4': 'supreme_necromancer',
    'raid_blood_5': 'dark_archangel',
}

ICON_MAPPING = {
    'sanguine_amulet': 'drop475_amulet',
    'sanguine_ring': 'drop475_ring',
    'sanguine_boots': 'drop475_boots',
    'sanguine_helmet': 'drop475_helmet',
}

# Tom vermelho-sangue escuro: H ~ 0.985 (355 graus), saturação alta (0.85), valor escurecido/rubro
TARGET_HUE = 0.985

def recolor_image(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h_val, s_val, v_val = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            new_h = TARGET_HUE
            new_s = min(1.0, max(0.40, s_val * 1.15))
            new_v = min(1.0, max(0.15, v_val * 0.92))
            nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im

def main():
    with open(DIRS_JSON, 'r', encoding='utf8') as f:
        dirs_list = json.load(f)

    updated_dirs = set(dirs_list)

    for new_id, base_id in MAPPING.items():
        updated_dirs.add(new_id)
        # Frames: 1..4, down_1..4, up_1..4
        for prefix in ['', 'down_', 'up_']:
            for frame in range(1, 5):
                src_filename = f'{base_id}_{prefix}{frame}.png'
                src_path = os.path.join(MONSTERS_DIR, src_filename)
                if not os.path.exists(src_path):
                    print(f'Warning: {src_path} not found!')
                    continue
                dst_filename = f'{new_id}_{prefix}{frame}.png'
                dst_path = os.path.join(MONSTERS_DIR, dst_filename)
                
                with Image.open(src_path) as im:
                    recolored = recolor_image(im)
                    recolored.save(dst_path)

        print(f'Generated frames for {new_id} from {base_id}')

    for new_id, base_id in ICON_MAPPING.items():
        src_path = os.path.join(ICONS_DIR, f'{base_id}.png')
        dst_path = os.path.join(ICONS_DIR, f'{new_id}.png')
        if not os.path.exists(src_path):
            print(f'Warning: {src_path} not found!')
            continue
        with Image.open(src_path) as im:
            recolored = recolor_image(im)
            recolored.save(dst_path)
        print(f'Generated icon {new_id} from {base_id}')

    with open(DIRS_JSON, 'w', encoding='utf8') as f:
        json.dump(sorted(list(updated_dirs)), f, indent=1)

    print('Updated monsterDirs.json with blood raid bosses and generated icons.')

if __name__ == '__main__':
    main()
