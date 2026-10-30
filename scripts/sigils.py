# Sigilismo: sigilos (amuletos de alma) feitos com as almas da Colheita de Almas e o eco
# do bestiário. Ícones só por recolor dos amuletos do pack; nada desenhado.
# Uso: python scripts/sigils.py  (pode rodar de novo: só acrescenta o que falta)
import colorsys, io, json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
ITEMS = os.path.join(ROOT, 'shared', 'data', 'items.json')
RECIPES = os.path.join(ROOT, 'shared', 'data', 'sigilism.json')
I18N = os.path.join(ROOT, 'client', 'src', 'items_i18n.json')


def tint(im, hue, sat, vm):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, max(s, 0.2) * sat * 1.6), min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


# id, criatura, nível da skill, abates no bestiário, materiais, bônus, amuleto base, cor (matiz, sat, brilho), nomes PT/EN
SIGILS = [
    ('rat', 'rat', 1, 50, {'bone_dust': 10}, {'hp': 15}, 'platinum_amulet', (30, 0.4, 0.9), 'Sigilo do Rato', 'Rat Sigil'),
    ('spider', 'spider', 8, 50, {'bone_dust': 20}, {'crit': 0.02}, 'emerald_amulet', (90, 0.5, 0.8), 'Sigilo da Aranha', 'Spider Sigil'),
    ('wolf', 'wolf', 12, 50, {'bone_dust': 30}, {'speed': -0.03}, 'sapphire_amulet', (210, 0.3, 0.9), 'Sigilo do Lobo', 'Wolf Sigil'),
    ('orc', 'orc_berserker', 16, 50, {'dark_essence': 10, 'bone_dust': 10}, {'attack': 3}, 'demon_amulet', (25, 0.6, 0.8), 'Sigilo do Orc', 'Orc Sigil'),
    ('skeleton', 'skeleton', 20, 50, {'dark_essence': 20}, {'defense': 4}, 'platinum_amulet', (45, 0.15, 1.0), 'Sigilo do Esqueleto', 'Skeleton Sigil'),
    ('bat', 'bat', 24, 50, {'dark_essence': 30}, {'lifesteal': 0.02}, 'demon_amulet', (330, 0.5, 0.6), 'Sigilo do Morcego', 'Bat Sigil'),
    ('minotaur', 'minotaur', 32, 1000, {'spectral_tear': 15, 'dark_essence': 10}, {'attack': 4, 'hp': 20}, 'demon_amulet', (15, 0.7, 0.7), 'Sigilo do Minotauro', 'Minotaur Sigil'),
    ('lich', 'lich', 36, 1000, {'spectral_tear': 25}, {'mana': 0.06, 'lifesteal': 0.01}, 'sapphire_amulet', (270, 0.5, 0.8), 'Sigilo do Lich', 'Lich Sigil'),
    ('kraken', 'kraken', 44, 1000, {'spectral_tear': 35}, {'regen': 0.08, 'hp': 30}, 'sapphire_amulet', (185, 0.6, 0.8), 'Sigilo do Kraken', 'Kraken Sigil'),
    ('dragon', 'dragon', 50, 1000, {'ancient_ash': 15, 'spectral_tear': 10}, {'attack': 5, 'crit': 0.02}, 'emerald_amulet', (0, 0.7, 0.8), 'Sigilo do Dragão', 'Dragon Sigil'),
    ('vampire', 'vampire', 55, 1000, {'ancient_ash': 25}, {'lifesteal': 0.03}, 'demon_amulet', (350, 0.8, 0.55), 'Sigilo do Vampiro', 'Vampire Sigil'),
    ('demon', 'demon', 60, 1000, {'abyssal_soul': 10, 'ancient_ash': 10}, {'attack': 6, 'defense': 4}, 'demon_amulet', (20, 1.0, 1.0), 'Sigilo do Demônio', 'Demon Sigil'),
    ('death_knight', 'death_knight', 70, 1000, {'abyssal_soul': 20}, {'defense': 8, 'hp': 50}, 'platinum_amulet', (240, 0.25, 0.55), 'Sigilo do Cavaleiro da Morte', 'Death Knight Sigil'),
    ('hydra', 'hydra', 80, 1000, {'abyssal_soul': 30}, {'regen': 0.12, 'hp': 60}, 'emerald_amulet', (150, 0.6, 0.7), 'Sigilo da Hidra', 'Hydra Sigil'),
    ('reaper', 'grim_reaper', 90, 1000, {'abyssal_soul': 45, 'ancient_ash': 20}, {'crit': 0.04, 'speed': -0.04}, 'platinum_amulet', (300, 0.7, 0.55), 'Sigilo do Ceifador', 'Reaper Sigil'),
]

# XP e tempo por receita crescem com o nível (no ritmo das outras criações).
def xp_for(level):
    return round(30 + level * 6 + level * level * 0.02)

def interval_for(level):
    return 5000 + level * 60

items = json.loads(io.open(ITEMS, encoding='utf-8').read())
have = {i['id'] for i in items}
i18n_raw = io.open(I18N, encoding='utf-8').read()
i18n = json.loads(i18n_raw)
recipes = []
for sid, monster, level, kills, inputs, bonus, base, (hue, sat, vm), pt, en in SIGILS:
    iid = f'sigil_{sid}'
    tint(Image.open(os.path.join(ICO, base + '.png')), hue, sat, vm).save(os.path.join(ICO, iid + '.png'))
    i18n[pt] = en
    value = sum(qty for qty in inputs.values()) * (4 + level)
    if iid not in have:
        items.append({'id': iid, 'name': pt, 'icon': iid, 'value': value, 'sigil': bonus})
    recipes.append({'id': iid, 'name': pt, 'level': level, 'intervalMs': interval_for(level), 'xp': xp_for(level),
                    'inputs': inputs, 'output': iid, 'kills': {'monster': monster, 'count': kills}})
    print('ok', iid)

# Ícone da skill: a runa da Criação de Runas em violeta.
tint(Image.open(os.path.join(ICO, 'skill_runecraft.png')), 285, 0.6, 0.95).save(os.path.join(ICO, 'skill_sigilism.png'))

io.open(ITEMS, 'w', encoding='utf-8').write(json.dumps(items, ensure_ascii=False, indent=2) + '\n')
io.open(RECIPES, 'w', encoding='utf-8').write('[\n' + ',\n'.join('  ' + json.dumps(r, ensure_ascii=False) for r in recipes) + '\n]\n')
keys = list(json.loads(i18n_raw).keys())
sort = keys == sorted(keys)
io.open(I18N, 'w', encoding='utf-8').write(json.dumps(i18n, ensure_ascii=False, indent=2, sort_keys=sort) + '\n')
