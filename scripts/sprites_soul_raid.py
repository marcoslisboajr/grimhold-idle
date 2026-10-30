"""Gera os sprites dos chefes e os ícones das peças da Guerra das Almas (500+).
Sprites originais do pack + recolor para tom azul-violeta pálido (almas).
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
    'raid_souls_1': 'chaos_lich',
    'raid_souls_2': 'grave_necromancer',
    'raid_souls_3': 'catacomb_king',
    'raid_souls_ghost': 'catacomb_wraith',
    'raid_souls_4': 'nyxara',
    'raid_souls_5': 'lich5',
    'raid_souls_6': 'astral_lich',
}

ICON_MAPPING = {
    'shattered_souls_helmet': 'drop475_helmet',
    'shattered_souls_armor': 'drop475_plate',
    'shattered_souls_legs': 'drop475_legs',
    'shattered_souls_boots': 'drop475_boots',
}

# Tom das almas: azul-violeta pálido (H ~ 0.69, saturação moderada 0.5, valor preservado/alto)
TARGET_HUE = 0.69

def recolor_image(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            # Converte para HSV
            h_val, s_val, v_val = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            # Desloca a matiz para azul-violeta, saturação suave e luminosidade aumentada levemente
            new_h = TARGET_HUE
            new_s = min(1.0, max(0.25, s_val * 0.85))
            new_v = min(1.0, v_val * 1.05)
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

    print('Updated monsterDirs.json with soul raid bosses and generated icons.')

if __name__ == '__main__':
    main()
