"""Gera ícones e itens para anéis, amuletos e troféus de caça."""
import json, os, colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATA_DIR = os.path.join(ROOT, 'shared', 'data')
ICONS_DIR = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
SHEET_PATH = '../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png'

sheet = Image.open(SHEET_PATH).convert('RGBA')

def cell(c, r):
    return sheet.crop((c * 32, r * 32, (c + 1) * 32, (r + 1) * 32))

def recolor(im, hue=None, sat=None, light=0.0):
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if hue is not None:
                h = hue
            if sat is not None:
                s = min(1, s * sat)
            l = max(0, min(1, l + light))
            r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

def save_icon(name, img):
    img.save(os.path.join(ICONS_DIR, f'{name}.png'))

# 1. Ícones de Amuletos
save_icon('silver_necklace', cell(10, 49))
save_icon('emerald_amulet', cell(7, 49))
save_icon('ruby_necklace', cell(9, 49))
save_icon('sapphire_amulet', cell(8, 49))
save_icon('platinum_amulet', cell(12, 49))
save_icon('demon_amulet', cell(13, 49))
save_icon('celestial_necklace', cell(15, 49))

# 2. Ícones de Anéis
save_icon('iron_ring', cell(6, 50))
save_icon('stealth_ring', cell(0, 50))
save_icon('life_ring', cell(1, 50))
save_icon('sword_ring', cell(3, 50))
save_icon('ring_of_healing', cell(2, 50))
save_icon('golden_power_ring', cell(7, 50))
save_icon('void_ring', recolor(cell(2, 50), hue=0.78, sat=1.3, light=-0.1))

# 3. Ícones de Troféus de Caça e Rashid
save_icon('hunter_trophy_bronze', cell(11, 51))
save_icon('hunter_trophy_silver', cell(12, 51))
save_icon('hunter_trophy_gold', cell(13, 51))
save_icon('rashid_token', cell(7, 51))

# 4. Ícones de Imbuements (Runas entalhadas)
save_icon('imbuement_vampirism', cell(0, 53))
save_icon('imbuement_crit', cell(1, 53))
save_icon('imbuement_strike', cell(2, 53))
save_icon('imbuement_protection', cell(3, 53))
save_icon('imbuement_swiftness', cell(4, 53))
save_icon('imbuement_regen', cell(5, 53))

print("Todos os ícones foram recortados e salvos com sucesso.")

# 5. Adicionar itens em items.json
items_path = os.path.join(DATA_DIR, 'items.json')
with open(items_path, 'r', encoding='utf8') as f:
    items = json.load(f)

existing_ids = {i['id'] for i in items}

new_items = [
    # Amuletos
    {
        "id": "silver_necklace",
        "name": "Amuleto de Prata",
        "icon": "silver_necklace",
        "equip": { "slot": "amulet", "level": 10, "defense": 2, "hp": 15 },
        "value": 80
    },
    {
        "id": "emerald_amulet",
        "name": "Amuleto de Esmeralda",
        "icon": "emerald_amulet",
        "equip": { "slot": "amulet", "level": 25, "defense": 4, "regen": 0.05 },
        "value": 250
    },
    {
        "id": "ruby_necklace",
        "name": "Colar de Rubi",
        "icon": "ruby_necklace",
        "equip": { "slot": "amulet", "level": 40, "attack": 6, "crit": 0.03 },
        "value": 600
    },
    {
        "id": "sapphire_amulet",
        "name": "Amuleto de Safira",
        "icon": "sapphire_amulet",
        "equip": { "slot": "amulet", "level": 55, "defense": 7, "mana": 0.10 },
        "value": 1400
    },
    {
        "id": "platinum_amulet",
        "name": "Amuleto de Platina",
        "icon": "platinum_amulet",
        "equip": { "slot": "amulet", "level": 70, "defense": 12, "hp": 60 },
        "value": 3200
    },
    {
        "id": "demon_amulet",
        "name": "Amuleto Demoníaco",
        "icon": "demon_amulet",
        "equip": { "slot": "amulet", "level": 90, "attack": 14, "crit": 0.05, "lifesteal": 0.03 },
        "value": 8000
    },
    {
        "id": "celestial_necklace",
        "name": "Colar Celestial",
        "icon": "celestial_necklace",
        "equip": { "slot": "amulet", "level": 110, "attack": 18, "defense": 16, "hp": 120, "regen": 0.08 },
        "value": 22000
    },
    # Anéis
    {
        "id": "iron_ring",
        "name": "Anel de Ferro",
        "icon": "iron_ring",
        "equip": { "slot": "ring", "level": 10, "defense": 2, "hp": 10 },
        "value": 70
    },
    {
        "id": "stealth_ring",
        "name": "Anel Furtivo",
        "icon": "stealth_ring",
        "equip": { "slot": "ring", "level": 25, "speed": -0.04 },
        "value": 220
    },
    {
        "id": "life_ring",
        "name": "Anel da Vida",
        "icon": "life_ring",
        "equip": { "slot": "ring", "level": 40, "regen": 0.08, "hp": 40 },
        "value": 550
    },
    {
        "id": "sword_ring",
        "name": "Anel do Combatente",
        "icon": "sword_ring",
        "equip": { "slot": "ring", "level": 55, "attack": 8, "crit": 0.02 },
        "value": 1300
    },
    {
        "id": "ring_of_healing",
        "name": "Anel da Regeneração",
        "icon": "ring_of_healing",
        "equip": { "slot": "ring", "level": 70, "regen": 0.12, "hp": 80 },
        "value": 3000
    },
    {
        "id": "golden_power_ring",
        "name": "Anel do Poder",
        "icon": "golden_power_ring",
        "equip": { "slot": "ring", "level": 90, "attack": 15, "defense": 8, "crit": 0.04 },
        "value": 7500
    },
    {
        "id": "void_ring",
        "name": "Anel do Vazio",
        "icon": "void_ring",
        "equip": { "slot": "ring", "level": 110, "attack": 18, "speed": -0.06, "lifesteal": 0.04 },
        "value": 20000
    },
    # Troféus de Caça
    {
        "id": "hunter_trophy_bronze",
        "name": "Troféu de Caça de Bronze",
        "icon": "hunter_trophy_bronze",
        "value": 500
    },
    {
        "id": "hunter_trophy_silver",
        "name": "Troféu de Caça de Prata",
        "icon": "hunter_trophy_silver",
        "value": 2500
    },
    {
        "id": "hunter_trophy_gold",
        "name": "Troféu de Caça de Ouro",
        "icon": "hunter_trophy_gold",
        "value": 10000
    }
]

added_count = 0
for it in new_items:
    if it['id'] not in existing_ids:
        items.append(it)
        existing_ids.add(it['id'])
        added_count += 1

with open(items_path, 'w', encoding='utf8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f"Itens adicionados a items.json: {added_count}")

# 6. Adicionar drops nos monstros
monsters_path = os.path.join(DATA_DIR, 'monsters.json')
with open(monsters_path, 'r', encoding='utf8') as f:
    monsters = json.load(f)

DROPS_MAP = {
    'skeleton': [('iron_ring', 0.02)],
    'wolf': [('silver_necklace', 0.02)],
    'swamp_troll': [('stealth_ring', 0.015)],
    'centaur_archer': [('stealth_ring', 0.015)],
    'minotaur': [('emerald_amulet', 0.015)],
    'minotaur_guard': [('emerald_amulet', 0.02)],
    'cyclops': [('life_ring', 0.012)],
    'vampire': [('ruby_necklace', 0.012)],
    'dragon': [('sword_ring', 0.01)],
    'dragon_lord': [('sapphire_amulet', 0.01)],
    'golem': [('platinum_amulet', 0.008)],
    'cavaleiro_negro': [('ring_of_healing', 0.008)],
    'lord_demon': [('demon_amulet', 0.006)],
    'fallen_seraph': [('golden_power_ring', 0.006)],
    'void_herald': [('celestial_necklace', 0.004)],
    'void_stalker': [('void_ring', 0.004)],
}

monsters_updated = 0
for m in monsters:
    mid = m['id']
    if mid in DROPS_MAP:
        existing_loot_items = {l['item'] for l in m.get('loot', [])}
        for drop_item, chance in DROPS_MAP[mid]:
            if drop_item not in existing_loot_items:
                m.setdefault('loot', []).append({'item': drop_item, 'chance': chance})
                monsters_updated += 1

with open(monsters_path, 'w', encoding='utf8') as f:
    json.dump(monsters, f, ensure_ascii=False, indent=2)

print(f"Drops de monstros atualizados: {monsters_updated}")
