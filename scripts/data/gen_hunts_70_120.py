import json, os, colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
SHEET_PATH = '../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png'

sheet = Image.open(SHEET_PATH).convert('RGBA')

def cell(c, r):
    return sheet.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32))

def recolor(im, hue=None, sat=None, light=0.0, shift=None):
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if hue is not None: h = hue
            if shift is not None: h = (h + shift) % 1
            if sat is not None:
                s = min(1, s * sat)
                if hue is not None and s < 0.25: s = 0.25 + s
            l = max(0, min(1, l + light))
            r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

def save_icon(name, im):
    im.save(os.path.join(ICONS, name + '.png'))

def load_json(name):
    return json.load(open(os.path.join(D, name), encoding='utf8'))

def save_json(name, data):
    with open(os.path.join(D, name), 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

BLUE, CYAN, GREEN, PURPLE, RED, GOLD_H, ICE = 0.6, 0.5, 0.36, 0.78, 0.0, 0.12, 0.55

# 1. Chaves novas
save_icon('frost_key', recolor(cell(0, 52), hue=ICE, sat=1.4))
save_icon('infernal_key', recolor(cell(0, 52), hue=RED, sat=1.5))
save_icon('void_key', recolor(cell(0, 52), hue=PURPLE, sat=1.5, light=-0.1))

# 2. Materiais novos
save_icon('sulfur_chunk', recolor(cell(9, 60), hue=0.15, sat=1.6))
save_icon('giant_rock', cell(9, 60))
save_icon('elemental_dust', recolor(cell(12, 56), hue=0.1, sat=1.2))
save_icon('harpy_feather', recolor(cell(1, 55), hue=ICE, sat=1.2))
save_icon('dark_crest', recolor(cell(14, 49), hue=PURPLE, sat=0.5, light=-0.1))
save_icon('cursed_iron', recolor(cell(2, 60), hue=0.7, sat=0.4, light=-0.2))
save_icon('frost_crystal', recolor(cell(5, 56), hue=ICE, sat=1.5))
save_icon('frost_scale', recolor(cell(2, 55), hue=ICE, sat=1.4))
save_icon('hydra_head', recolor(cell(2, 58), hue=GREEN, sat=1.3))
save_icon('chimera_claw', recolor(cell(10, 55), hue=0.08, sat=1.3))
save_icon('beholder_eye', recolor(cell(15, 55), hue=PURPLE, sat=1.5))
save_icon('ancient_bone', recolor(cell(0, 55), sat=0.2, light=-0.1))
save_icon('nightmare_dust', recolor(cell(12, 56), hue=PURPLE, sat=1.6, light=-0.1))
save_icon('shadow_claw', recolor(cell(10, 55), hue=PURPLE, sat=0.8, light=-0.2))
save_icon('infernal_core', recolor(cell(1, 57), hue=RED, sat=1.6))
save_icon('demon_bone', recolor(cell(0, 55), hue=RED, sat=1.3, light=-0.1))
save_icon('chaos_robe_cloth', recolor(cell(4, 56), hue=RED, sat=1.4))
save_icon('void_essence', recolor(cell(12, 56), hue=PURPLE, sat=1.8, light=-0.2))
save_icon('void_shard', recolor(cell(9, 60), hue=PURPLE, sat=1.8, light=-0.2))
save_icon('dark_feather', recolor(cell(1, 55), hue=PURPLE, sat=0.6, light=-0.3))
save_icon('halo_shard', recolor(cell(11, 49), hue=GOLD_H, sat=1.5))

# 3. Drops com nome
save_icon('sulfur_hammer', recolor(cell(8, 28), hue=0.14, sat=1.4))
save_icon('harpy_bow', recolor(cell(9, 33), hue=ICE, sat=1.3))
save_icon('dark_halberd', recolor(cell(3, 29), hue=PURPLE, sat=0.4, light=-0.1))
save_icon('death_blade', recolor(cell(14, 27), hue=PURPLE, sat=0.6, light=-0.2))
save_icon('frost_staff', recolor(cell(15, 31), hue=ICE, sat=1.4))
save_icon('frost_shield', recolor(cell(11, 37), hue=ICE, sat=1.4))
save_icon('hydra_boots', recolor(cell(0, 47), hue=GREEN, sat=1.3))
save_icon('beholder_helmet', recolor(cell(10, 45), hue=PURPLE, sat=1.4))
save_icon('bonelord_shield', recolor(cell(13, 37), sat=0.2, light=-0.1))
save_icon('grim_reaper_axe', recolor(cell(5, 28), hue=PURPLE, sat=0.6, light=-0.2))
save_icon('infernal_plate_armor', recolor(cell(0, 43), hue=RED, sat=1.4, light=-0.1))
save_icon('oceanborn_armor', recolor(cell(0, 43), hue=BLUE, sat=1.5))
save_icon('void_staff', recolor(cell(15, 31), hue=PURPLE, sat=1.8, light=-0.2))
save_icon('void_bow', recolor(cell(9, 33), hue=PURPLE, sat=1.8, light=-0.2))
save_icon('seraph_blade', recolor(cell(14, 27), hue=GOLD_H, sat=1.5))
save_icon('crown_of_zathroth', recolor(cell(11, 49), hue=PURPLE, sat=1.6))

print('Icones gerados com sucesso!')

# ── 4. Atualizar items.json ──
items = load_json('items.json')
by_item = {i['id']: i for i in items}

NEW_ITEMS = [
    # Chaves
    {"id": "frost_key", "name": "Chave Glacial", "icon": "frost_key"},
    {"id": "infernal_key", "name": "Chave Infernal", "icon": "infernal_key"},
    {"id": "void_key", "name": "Chave do Vazio", "icon": "void_key"},
    # Materiais
    {"id": "sulfur_chunk", "name": "Pedaço de Enxofre", "icon": "sulfur_chunk", "value": 180},
    {"id": "giant_rock", "name": "Fragmento de Rocha Antiga", "icon": "giant_rock", "value": 220},
    {"id": "elemental_dust", "name": "Poeira Elemental", "icon": "elemental_dust", "value": 240},
    {"id": "harpy_feather", "name": "Pluma de Harpia", "icon": "harpy_feather", "value": 230},
    {"id": "dark_crest", "name": "Brasão Negro", "icon": "dark_crest", "value": 350},
    {"id": "cursed_iron", "name": "Ferro Amaldiçoado", "icon": "cursed_iron", "value": 320},
    {"id": "frost_crystal", "name": "Cristal Glacial", "icon": "frost_crystal", "value": 420},
    {"id": "frost_scale", "name": "Escama de Gelo", "icon": "frost_scale", "value": 480},
    {"id": "hydra_head", "name": "Cabeça de Hidra", "icon": "hydra_head", "value": 550},
    {"id": "chimera_claw", "name": "Garra de Quimera", "icon": "chimera_claw", "value": 520},
    {"id": "beholder_eye", "name": "Olho do Observador", "icon": "beholder_eye", "value": 650},
    {"id": "ancient_bone", "name": "Osso Antigo", "icon": "ancient_bone", "value": 680},
    {"id": "nightmare_dust", "name": "Poeira do Pesadelo", "icon": "nightmare_dust", "value": 750},
    {"id": "shadow_claw", "name": "Garra das Sombras", "icon": "shadow_claw", "value": 720},
    {"id": "infernal_core", "name": "Núcleo Infernal", "icon": "infernal_core", "value": 900},
    {"id": "demon_bone", "name": "Osso Demoníaco", "icon": "demon_bone", "value": 850},
    {"id": "chaos_robe_cloth", "name": "Tecido do Caos", "icon": "chaos_robe_cloth", "value": 950},
    {"id": "void_essence", "name": "Essência do Vazio", "icon": "void_essence", "value": 1200},
    {"id": "void_shard", "name": "Fragmento do Vazio", "icon": "void_shard", "value": 1150},
    {"id": "dark_feather", "name": "Pena do Anjo Sombrio", "icon": "dark_feather", "value": 1300},
    {"id": "halo_shard", "name": "Fragmento de Auréola Caída", "icon": "halo_shard", "value": 1400},
    # Drops raros
    {"id": "sulfur_hammer", "name": "Martelo de Enxofre", "icon": "sulfur_hammer", "equip": {"slot": "weapon", "level": 70, "vocations": ["warrior", "devout"], "attack": 33, "crit": 0.05}, "value": 11000},
    {"id": "harpy_bow", "name": "Arco da Harpia", "icon": "harpy_bow", "equip": {"slot": "weapon", "level": 78, "vocations": ["hunter"], "attack": 37, "speed": 0.15}, "value": 14000},
    {"id": "dark_halberd", "name": "Alabarda do Cavaleiro Negro", "icon": "dark_halberd", "equip": {"slot": "weapon", "level": 80, "vocations": ["warrior"], "attack": 40, "lifesteal": 0.04}, "value": 16000},
    {"id": "death_blade", "name": "Lâmina da Morte", "icon": "death_blade", "equip": {"slot": "weapon", "level": 80, "vocations": ["warrior"], "attack": 41, "crit": 0.06}, "value": 17000},
    {"id": "frost_staff", "name": "Cajado do Gelo Eterno", "icon": "frost_staff", "equip": {"slot": "weapon", "level": 88, "vocations": ["arcanist"], "attack": 39, "mana": 0.25}, "value": 20000},
    {"id": "frost_shield", "name": "Escudo Congelado", "icon": "frost_shield", "equip": {"slot": "shield", "level": 90, "defense": 26, "hp": 80, "regen": 0.15}, "value": 22000},
    {"id": "hydra_boots", "name": "Botas de Hidra", "icon": "hydra_boots", "equip": {"slot": "boots", "level": 90, "defense": 6, "hp": 60, "regen": 0.25, "speed": 0.05}, "value": 24000},
    {"id": "beholder_helmet", "name": "Elmo do Observador", "icon": "beholder_helmet", "equip": {"slot": "helmet", "level": 98, "defense": 16, "mana": 0.2, "crit": 0.04}, "value": 28000},
    {"id": "bonelord_shield", "name": "Égide dos Ossos", "icon": "bonelord_shield", "equip": {"slot": "shield", "level": 100, "defense": 30, "hp": 100}, "value": 30000},
    {"id": "grim_reaper_axe", "name": "Machado da Foice Negra", "icon": "grim_reaper_axe", "equip": {"slot": "weapon", "level": 100, "vocations": ["warrior"], "attack": 48, "lifesteal": 0.06}, "value": 32000},
    {"id": "infernal_plate_armor", "name": "Placa Infernal", "icon": "infernal_plate_armor", "equip": {"slot": "armor", "level": 110, "defense": 28, "hp": 120, "vocations": ["warrior", "devout"]}, "value": 38000},
    {"id": "oceanborn_armor", "name": "Armadura do Soberano", "icon": "oceanborn_armor", "equip": {"slot": "armor", "level": 110, "defense": 30, "hp": 140, "lifesteal": 0.05, "vocations": ["warrior", "devout"]}, "value": 45000},
    {"id": "void_staff", "name": "Cajado do Vazio", "icon": "void_staff", "equip": {"slot": "weapon", "level": 118, "vocations": ["arcanist"], "attack": 52, "mana": 0.35}, "value": 50000},
    {"id": "void_bow", "name": "Besta do Vazio", "icon": "void_bow", "equip": {"slot": "weapon", "level": 118, "vocations": ["hunter"], "attack": 54, "crit": 0.08}, "value": 50000},
    {"id": "seraph_blade", "name": "Espada do Serafim Caído", "icon": "seraph_blade", "equip": {"slot": "weapon", "level": 120, "vocations": ["warrior"], "attack": 56, "lifesteal": 0.06}, "value": 60000},
    {"id": "crown_of_zathroth", "name": "Coroa de Zathroth", "icon": "crown_of_zathroth", "equip": {"slot": "helmet", "level": 120, "defense": 22, "hp": 150, "mana": 0.3, "regen": 0.2}, "value": 80000},
]

for it in NEW_ITEMS:
    if it['id'] in by_item:
        by_item[it['id']].update(it)
    else:
        items.append(it)
        by_item[it['id']] = it
save_json('items.json', items)
print('items.json atualizado:', len(items))

# ── 5. Atualizar monsters.json ──
monsters = load_json('monsters.json')
by_mon = {m['id']: m for m in monsters}

NEW_MONSTERS = [
    # Nível 70
    {"id": "sulfur_golem", "name": "Golem de Enxofre", "sprite": "golem", "hp": 1200, "attack": 92, "defense": 65, "attackSpeedMs": 1400, "xp": 420, "loot": [{"item": "gold", "chance": 1, "min": 60, "max": 120}, {"item": "sulfur_chunk", "chance": 0.45}, {"item": "sulfur_hammer", "chance": 0.005}]},
    # Nível 80
    {"id": "stone_guardian", "name": "Guardião da Rocha", "sprite": "stone_guardian", "hp": 1550, "attack": 115, "defense": 78, "attackSpeedMs": 1500, "xp": 820, "loot": [{"item": "gold", "chance": 1, "min": 45, "max": 90}, {"item": "giant_rock", "chance": 0.25}]},
    {"id": "earth_elemental", "name": "Elemental da Terra", "sprite": "earth_elemental", "hp": 1450, "attack": 118, "defense": 72, "attackSpeedMs": 1350, "xp": 800, "loot": [{"item": "gold", "chance": 1, "min": 40, "max": 80}, {"item": "elemental_dust", "chance": 0.3}]},
    {"id": "harpy", "name": "Harpia dos Picos", "sprite": "harpy", "hp": 1350, "attack": 125, "defense": 65, "attackSpeedMs": 1150, "xp": 790, "loot": [{"item": "gold", "chance": 1, "min": 42, "max": 84}, {"item": "harpy_feather", "chance": 0.25}, {"item": "harpy_bow", "chance": 0.005}]},
    {"id": "black_knight", "name": "Cavaleiro Negro", "sprite": "cavaleiro_negro", "hp": 1500, "attack": 120, "defense": 78, "attackSpeedMs": 1300, "xp": 620, "loot": [{"item": "gold", "chance": 1, "min": 100, "max": 200}, {"item": "dark_crest", "chance": 0.4}, {"item": "dark_halberd", "chance": 0.006}]},
    {"id": "fallen_knight", "name": "Cavaleiro Caído", "sprite": "cavaleiro_caido", "hp": 1400, "attack": 110, "defense": 72, "attackSpeedMs": 1400, "xp": 580, "loot": [{"item": "gold", "chance": 1, "min": 90, "max": 180}, {"item": "cursed_iron", "chance": 0.45}]},
    # death_knight já existia no arquivo, vamos atualizar se necessário
    {"id": "death_knight", "name": "Cavaleiro da Morte", "sprite": "death_knight", "hp": 1550, "attack": 125, "defense": 80, "attackSpeedMs": 1350, "xp": 640, "loot": [{"item": "gold", "chance": 1, "min": 110, "max": 220}, {"item": "dark_essence", "chance": 0.35}, {"item": "death_blade", "chance": 0.005}]},
    # Nível 90
    {"id": "ice_witch", "name": "Bruxa do Gelo", "sprite": "ice_witch", "hp": 1750, "attack": 145, "defense": 85, "attackSpeedMs": 1250, "xp": 1250, "loot": [{"item": "gold", "chance": 1, "min": 60, "max": 120}, {"item": "frost_crystal", "chance": 0.3}, {"item": "frost_staff", "chance": 0.005}]},
    {"id": "frost_dragon", "name": "Dragão Glacial", "sprite": "frost_dragon", "hp": 2100, "attack": 155, "defense": 95, "attackSpeedMs": 1400, "xp": 1450, "loot": [{"item": "gold", "chance": 1, "min": 75, "max": 150}, {"item": "frost_scale", "chance": 0.35}, {"item": "frost_shield", "chance": 0.004}]},
    {"id": "centaur_archer", "name": "Centauro Batedor", "sprite": "centaur_archer", "hp": 1650, "attack": 150, "defense": 80, "attackSpeedMs": 1100, "xp": 1200, "loot": [{"item": "gold", "chance": 1, "min": 55, "max": 110}, {"item": "frost_crystal", "chance": 0.2}]},
    {"id": "hydra", "name": "Hidra das Brumas", "sprite": "hydra", "hp": 1900, "attack": 140, "defense": 85, "attackSpeedMs": 1300, "xp": 950, "loot": [{"item": "gold", "chance": 1, "min": 150, "max": 300}, {"item": "hydra_head", "chance": 0.4}, {"item": "hydra_boots", "chance": 0.005}, {"item": "frost_key", "chance": 0.01}]},
    {"id": "chimera", "name": "Quimera Predadora", "sprite": "quimera", "hp": 1850, "attack": 145, "defense": 82, "attackSpeedMs": 1250, "xp": 920, "loot": [{"item": "gold", "chance": 1, "min": 140, "max": 280}, {"item": "chimera_claw", "chance": 0.42}, {"item": "frost_key", "chance": 0.01}]},
    # Nível 100
    {"id": "beholder", "name": "Olho Ancião", "sprite": "beholder", "hp": 2200, "attack": 175, "defense": 105, "attackSpeedMs": 1250, "xp": 1850, "loot": [{"item": "gold", "chance": 1, "min": 70, "max": 140}, {"item": "beholder_eye", "chance": 0.3}, {"item": "beholder_helmet", "chance": 0.004}]},
    {"id": "bonelord", "name": "Senhor dos Ossos", "sprite": "bonelord", "hp": 2350, "attack": 180, "defense": 110, "attackSpeedMs": 1300, "xp": 1950, "loot": [{"item": "gold", "chance": 1, "min": 80, "max": 160}, {"item": "ancient_bone", "chance": 0.35}, {"item": "bonelord_shield", "chance": 0.004}]},
    {"id": "mind_flayer", "name": "Devorador de Mentes", "sprite": "mind_flayer", "hp": 2100, "attack": 190, "defense": 100, "attackSpeedMs": 1200, "xp": 1900, "loot": [{"item": "gold", "chance": 1, "min": 75, "max": 150}, {"item": "beholder_eye", "chance": 0.25}]},
    {"id": "nightmare", "name": "Pesadelo Sombrio", "sprite": "nightmare", "hp": 2200, "attack": 170, "defense": 100, "attackSpeedMs": 1250, "xp": 1350, "loot": [{"item": "gold", "chance": 1, "min": 180, "max": 360}, {"item": "nightmare_dust", "chance": 0.45}]},
    {"id": "shadow_beast", "name": "Besta das Trevas", "sprite": "shadow_beast", "hp": 2300, "attack": 175, "defense": 105, "attackSpeedMs": 1300, "xp": 1400, "loot": [{"item": "gold", "chance": 1, "min": 190, "max": 380}, {"item": "shadow_claw", "chance": 0.42}]},
    {"id": "grim_reaper", "name": "Ceifador Espectral", "sprite": "grim_reaper", "hp": 2450, "attack": 185, "defense": 110, "attackSpeedMs": 1350, "xp": 1500, "loot": [{"item": "gold", "chance": 1, "min": 220, "max": 440}, {"item": "shadow_claw", "chance": 0.35}, {"item": "grim_reaper_axe", "chance": 0.005}]},
    # Nível 110
    {"id": "lord_demon", "name": "Grão-Demônio", "sprite": "lord_demon", "hp": 2700, "attack": 185, "defense": 110, "attackSpeedMs": 1300, "xp": 2600, "loot": [{"item": "gold", "chance": 1, "min": 90, "max": 180}, {"item": "infernal_core", "chance": 0.35}, {"item": "infernal_plate_armor", "chance": 0.004}]},
    {"id": "demon_skeleton", "name": "Esqueleto Demoníaco", "sprite": "demon_skeleton", "hp": 2450, "attack": 175, "defense": 105, "attackSpeedMs": 1200, "xp": 2400, "loot": [{"item": "gold", "chance": 1, "min": 80, "max": 160}, {"item": "demon_bone", "chance": 0.3}]},
    {"id": "demon_eyes", "name": "Observador Abissal", "sprite": "demon_eyes", "hp": 2500, "attack": 180, "defense": 100, "attackSpeedMs": 1150, "xp": 2500, "loot": [{"item": "gold", "chance": 1, "min": 85, "max": 170}, {"item": "infernal_core", "chance": 0.25}]},
    {"id": "cultista_vermelho", "name": "Fanático do Caos", "sprite": "cultista_vermelho", "hp": 2500, "attack": 170, "defense": 100, "attackSpeedMs": 1200, "xp": 1800, "loot": [{"item": "gold", "chance": 1, "min": 250, "max": 500}, {"item": "chaos_robe_cloth", "chance": 0.45}, {"item": "infernal_key", "chance": 0.01}]},
    {"id": "ghazbaran", "name": "Ghazbaran o Tirano", "sprite": "ghazbaran", "hp": 5500, "attack": 210, "defense": 130, "attackSpeedMs": 1200, "xp": 8000, "loot": [{"item": "gold", "chance": 1, "min": 1000, "max": 2000}, {"item": "infernal_core", "chance": 1.0}, {"item": "oceanborn_armor", "chance": 0.08}]},
    # Nível 120
    {"id": "void_herald", "name": "Arauto do Vazio", "sprite": "void_herald", "hp": 3200, "attack": 205, "defense": 125, "attackSpeedMs": 1250, "xp": 3500, "loot": [{"item": "gold", "chance": 1, "min": 110, "max": 220}, {"item": "void_essence", "chance": 0.35}, {"item": "void_staff", "chance": 0.004}]},
    {"id": "void_stalker", "name": "Perseguidor do Vazio", "sprite": "void_stalker", "hp": 3000, "attack": 210, "defense": 120, "attackSpeedMs": 1150, "xp": 3400, "loot": [{"item": "gold", "chance": 1, "min": 105, "max": 210}, {"item": "void_shard", "chance": 0.35}, {"item": "void_bow", "chance": 0.004}]},
    {"id": "wraith", "name": "Espectro da Ruína", "sprite": "wraith", "hp": 2900, "attack": 200, "defense": 115, "attackSpeedMs": 1200, "xp": 3300, "loot": [{"item": "gold", "chance": 1, "min": 100, "max": 200}, {"item": "void_essence", "chance": 0.25}]},
    {"id": "anjo_sombrio", "name": "Anjo Sombrio", "sprite": "anjo_sombrio", "hp": 3100, "attack": 195, "defense": 120, "attackSpeedMs": 1200, "xp": 2400, "loot": [{"item": "gold", "chance": 1, "min": 320, "max": 640}, {"item": "dark_feather", "chance": 0.45}, {"item": "void_key", "chance": 0.01}]},
    {"id": "fallen_seraph", "name": "Serafim Caído", "sprite": "fallen_seraph", "hp": 3300, "attack": 200, "defense": 125, "attackSpeedMs": 1250, "xp": 2500, "loot": [{"item": "gold", "chance": 1, "min": 340, "max": 680}, {"item": "halo_shard", "chance": 0.4}, {"item": "seraph_blade", "chance": 0.005}, {"item": "void_key", "chance": 0.01}]},
    {"id": "zathroth", "name": "Zathroth o Destruidor", "sprite": "zathroth", "hp": 8000, "attack": 235, "defense": 145, "attackSpeedMs": 1150, "xp": 12000, "loot": [{"item": "gold", "chance": 1, "min": 2000, "max": 4000}, {"item": "halo_shard", "chance": 1.0}, {"item": "crown_of_zathroth", "chance": 0.1}]},
]

for m in NEW_MONSTERS:
    if m['id'] in by_mon:
        by_mon[m['id']].update(m)
    else:
        monsters.append(m)
        by_mon[m['id']] = m
save_json('monsters.json', monsters)
print('monsters.json atualizado:', len(monsters))

# ── 6. Atualizar hunts.json ──
hunts = load_json('hunts.json')
by_hunt = {h['id']: h for h in hunts}

NEW_HUNTS = [
    # 70 loot
    {"id": "sulfur_mines", "name": "Minas de Enxofre", "region": "Terras Sombrias", "level": 70, "monsters": ["sulfur_golem", "fire_devil", "imp", "lesser_demon"], "focus": "loot"},
    # 80
    {"id": "giant_peaks", "name": "Montanha dos Gigantes", "region": "Picos da Tempestade", "level": 80, "monsters": ["stone_guardian", "earth_elemental", "harpy"], "focus": "xp"},
    {"id": "black_knight_crypt", "name": "Cripta dos Cavaleiros Negros", "region": "Picos da Tempestade", "level": 80, "monsters": ["black_knight", "fallen_knight", "death_knight"], "focus": "loot"},
    # 90
    {"id": "eternal_glacier", "name": "Geleira Eterna", "region": "Geleiras do Norte", "level": 90, "monsters": ["ice_witch", "frost_dragon", "centaur_archer"], "focus": "xp"},
    {"id": "hydra_swamp", "name": "Pântano das Hidras", "region": "Geleiras do Norte", "level": 90, "monsters": ["hydra", "chimera", "centaur_archer"], "focus": "loot"},
    {"id": "frost_citadel", "name": "Cidadela Glacial", "region": "Geleiras do Norte", "level": 90, "monsters": ["ice_witch", "frost_dragon"], "boss": True, "key": "frost_key"},
    # 100
    {"id": "shadow_cathedral", "name": "Catedral das Sombras", "region": "Dimensão Sombria", "level": 100, "monsters": ["beholder", "bonelord", "mind_flayer"], "focus": "xp"},
    {"id": "nightmare_valley", "name": "Vale dos Pesadelos", "region": "Dimensão Sombria", "level": 100, "monsters": ["nightmare", "shadow_beast", "grim_reaper"], "focus": "loot"},
    # 110
    {"id": "infernal_abyss", "name": "Abismo Infernal", "region": "Abismo do Fogo", "level": 110, "monsters": ["lord_demon", "demon_skeleton", "demon_eyes"], "focus": "xp"},
    {"id": "ghazbaran_lair", "name": "Covil de Ghazbaran", "region": "Abismo do Fogo", "level": 110, "monsters": ["cultista_vermelho", "demon_eyes", "lord_demon"], "focus": "loot"},
    {"id": "ghazbaran_temple", "name": "Templo de Ghazbaran", "region": "Abismo do Fogo", "level": 110, "monsters": ["lord_demon", "ghazbaran"], "boss": True, "key": "infernal_key"},
    # 120
    {"id": "void_core", "name": "Coração do Vazio", "region": "O Vazio Primordial", "level": 120, "monsters": ["void_herald", "void_stalker", "wraith"], "focus": "xp"},
    {"id": "primordial_sanctum", "name": "Santuário das Trevas Primordiais", "region": "O Vazio Primordial", "level": 120, "monsters": ["anjo_sombrio", "fallen_seraph", "wraith"], "focus": "loot"},
    {"id": "zathroth_throne", "name": "Trono de Zathroth", "region": "O Vazio Primordial", "level": 120, "monsters": ["fallen_seraph", "zathroth"], "boss": True, "key": "void_key"},
]

for h in NEW_HUNTS:
    if h['id'] in by_hunt:
        by_hunt[h['id']].update(h)
    else:
        hunts.append(h)
        by_hunt[h['id']] = h
save_json('hunts.json', hunts)
print('hunts.json atualizado:', len(hunts))

# ── 7. Atualizar smithing.json (chaves de instância) ──
smithing = load_json('smithing.json')
by_sm = {s['id']: s for s in smithing}

NEW_SMITH = [
    {"id": "frost_key", "name": "Chave Glacial", "level": 85, "intervalMs": 9000, "xp": 300, "inputs": {"abyssal_bar": 3, "frost_crystal": 4, "coal": 6}, "output": "frost_key"},
    {"id": "infernal_key", "name": "Chave Infernal", "level": 100, "intervalMs": 10000, "xp": 450, "inputs": {"adamant_bar": 3, "infernal_core": 3, "coal": 8}, "output": "infernal_key"},
    {"id": "void_key", "name": "Chave do Vazio", "level": 115, "intervalMs": 12000, "xp": 600, "inputs": {"adamant_bar": 4, "void_shard": 4, "coal": 10}, "output": "void_key"},
]

for s in NEW_SMITH:
    if s['id'] in by_sm:
        by_sm[s['id']].update(s)
    else:
        smithing.append(s)
        by_sm[s['id']] = s
save_json('smithing.json', smithing)
print('smithing.json atualizado:', len(smithing))

