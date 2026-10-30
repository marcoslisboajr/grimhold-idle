import json, os, colorsys
from PIL import Image

import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
SHEET = Image.open('../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png').convert('RGBA')

def load(n): return json.load(open(D + n, encoding='utf8'))
def save(n, data):
    with open(D + n, 'w', encoding='utf8') as f:
        f.write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in data) + '\n]\n')

# ── Ícones: recorte do Time Fantasy Icons, com recolor (só matiz/saturação/brilho) ──
def cell(c, r): return SHEET.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32))
def recolor(im, hue=None, sat=None, light=0.0, shift=None):
    im = im.copy(); px = im.load()
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
def icon(name, im): im.save(ICONS + name + '.png')
def from_icon(name): return Image.open(ICONS + name + '.png').convert('RGBA')

BLUE, GREEN, PURPLE = 0.6, 0.36, 0.78
icon('mithril_ore', recolor(cell(9, 60), hue=BLUE, sat=1.6))
icon('adamant_ore', recolor(cell(9, 60), hue=GREEN, sat=1.6, light=-0.05))
icon('mithril_bar', recolor(cell(2, 60), hue=BLUE, sat=1.5))
icon('adamant_bar', recolor(cell(2, 60), hue=GREEN, sat=1.5, light=-0.05))
icon('willow_logs', recolor(from_icon('logs'), shift=0.08, light=0.06))
icon('yew_logs', recolor(from_icon('oak_logs'), shift=-0.05, light=-0.08))
icon('ancient_logs', recolor(from_icon('oak_logs'), hue=PURPLE, sat=0.9))
icon('raw_lobster', recolor(cell(3, 54), hue=0.0, sat=1.4))
icon('raw_tuna', recolor(cell(4, 54), hue=BLUE, sat=1.1))
icon('raw_shark', recolor(cell(4, 54), sat=0.15, light=-0.05))
icon('raw_eel', recolor(cell(2, 55), hue=0.75, sat=1.0, light=-0.05))
for f in ['lobster', 'tuna', 'shark', 'eel']:
    icon('cooked_' + f, recolor(from_icon('raw_' + f), hue=0.07, sat=0.9, light=-0.1))
icon('green_herb', cell(0, 18))
icon('golden_root', cell(3, 18))
icon('blood_flower', cell(5, 18))
icon('moon_clover', recolor(cell(14, 18), hue=0.5, sat=0.9, light=0.08))
icon('abyss_lotus', recolor(cell(13, 18), hue=PURPLE, sat=1.2))
for n, c in [('health_potion', 1), ('strength_potion', 5), ('stone_potion', 7), ('great_health_potion', 6),
             ('fury_elixir', 3), ('iron_elixir', 8), ('supreme_health_potion', 9)]:
    icon(n, cell(c, 17))
icon('skill_herbalism', cell(4, 18))
icon('skill_alchemy', cell(2, 17))
for part in ['sword', 'mace', 'helmet', 'shield', 'boots', 'legs', 'armor']:
    base = from_icon('iron_' + part)
    icon('mithril_' + part, recolor(base, hue=BLUE, sat=1.4, light=0.03))
    icon('adamant_' + part, recolor(base, hue=GREEN, sat=1.3, light=-0.03))
for kind in ['bow', 'staff']:
    base = from_icon('oak_' + kind)
    icon('willow_' + kind, recolor(base, shift=0.08, light=0.06))
    icon('yew_' + kind, recolor(base, shift=-0.05, light=-0.1))
    icon('ancient_' + kind, recolor(base, hue=PURPLE, sat=0.9))

# ── Itens ──
items = load('items.json')
ids = {i['id'] for i in items}
def add_item(it):
    if it['id'] not in ids: items.append(it); ids.add(it['id'])
for it in [
    {"id": "mithril_ore", "name": "Minério de Mithril", "icon": "mithril_ore", "value": 18},
    {"id": "adamant_ore", "name": "Minério de Adamantita", "icon": "adamant_ore", "value": 32},
    {"id": "mithril_bar", "name": "Barra de Mithril", "icon": "mithril_bar"},
    {"id": "adamant_bar", "name": "Barra de Adamantita", "icon": "adamant_bar"},
    {"id": "willow_logs", "name": "Tora de Salgueiro", "icon": "willow_logs", "value": 12},
    {"id": "yew_logs", "name": "Tora de Teixo", "icon": "yew_logs", "value": 22},
    {"id": "ancient_logs", "name": "Tora Anciã", "icon": "ancient_logs", "value": 36},
    {"id": "raw_lobster", "name": "Lagosta Crua", "icon": "raw_lobster", "value": 14},
    {"id": "raw_tuna", "name": "Atum Cru", "icon": "raw_tuna", "value": 20},
    {"id": "raw_shark", "name": "Tubarão Cru", "icon": "raw_shark", "value": 30},
    {"id": "raw_eel", "name": "Enguia Abissal Crua", "icon": "raw_eel", "value": 45},
    {"id": "cooked_lobster", "name": "Lagosta Cozida", "icon": "cooked_lobster", "food": 150},
    {"id": "cooked_tuna", "name": "Atum Grelhado", "icon": "cooked_tuna", "food": 210},
    {"id": "cooked_shark", "name": "Tubarão Assado", "icon": "cooked_shark", "food": 300},
    {"id": "cooked_eel", "name": "Enguia Defumada", "icon": "cooked_eel", "food": 420},
    {"id": "green_herb", "name": "Erva Verde", "icon": "green_herb", "value": 3},
    {"id": "golden_root", "name": "Raiz Dourada", "icon": "golden_root", "value": 8},
    {"id": "blood_flower", "name": "Flor-de-Sangue", "icon": "blood_flower", "value": 15},
    {"id": "moon_clover", "name": "Trevo Lunar", "icon": "moon_clover", "value": 25},
    {"id": "abyss_lotus", "name": "Lótus Abissal", "icon": "abyss_lotus", "value": 40},
    {"id": "health_potion", "name": "Poção de Vida", "icon": "health_potion", "food": 120},
    {"id": "great_health_potion", "name": "Grande Poção de Vida", "icon": "great_health_potion", "food": 260},
    {"id": "supreme_health_potion", "name": "Poção Suprema de Vida", "icon": "supreme_health_potion", "food": 480},
    {"id": "strength_potion", "name": "Poção de Força", "icon": "strength_potion", "potion": {"attack": 0.1}},
    {"id": "stone_potion", "name": "Poção de Pedra", "icon": "stone_potion", "potion": {"defense": 0.15}},
    {"id": "fury_elixir", "name": "Elixir da Fúria", "icon": "fury_elixir", "potion": {"attack": 0.2}},
    {"id": "iron_elixir", "name": "Elixir de Ferro", "icon": "iron_elixir", "potion": {"defense": 0.3}},
]: add_item(it)

TIERS = {
    'mithril': ('Mithril', 35, {'sword': 18, 'mace': 18}, {'helmet': (8, 0), 'shield': (12, 0), 'boots': (5, 27), 'legs': (8, 0), 'armor': (16, 57)}),
    'adamant': ('Adamantita', 55, {'sword': 27, 'mace': 27}, {'helmet': (13, 0), 'shield': (19, 0), 'boots': (8, 45), 'legs': (13, 0), 'armor': (24, 90)}),
}
NAMES = {'sword': 'Espada', 'mace': 'Maça', 'helmet': 'Elmo', 'shield': 'Escudo', 'boots': 'Botas', 'legs': 'Calças', 'armor': 'Armadura'}
for t, (tn, lvl, weapons, armor) in TIERS.items():
    for p, atk in weapons.items():
        add_item({"id": f"{t}_{p}", "name": f"{NAMES[p]} de {tn}", "icon": f"{t}_{p}",
                  "equip": {"slot": "weapon", "level": lvl, "attack": atk, "vocations": ["warrior" if p == 'sword' else "devout"]}})
    for p, (df, hp) in armor.items():
        eq = {"slot": p, "level": lvl, "defense": df}
        if hp: eq["hp"] = hp
        add_item({"id": f"{t}_{p}", "name": f"{NAMES[p]} de {tn}", "icon": f"{t}_{p}", "equip": eq})
WOOD = {'willow': ('Arco de Salgueiro', 'Cajado de Salgueiro', 18, 12),
        'yew': ('Arco de Teixo', 'Cajado de Teixo', 35, 18),
        'ancient': ('Arco Ancião', 'Cajado Ancião', 55, 27)}
for w, (bn, sn, lvl, atk) in WOOD.items():
    add_item({"id": f"{w}_bow", "name": bn, "icon": f"{w}_bow", "equip": {"slot": "weapon", "level": lvl, "attack": atk, "vocations": ["hunter"]}})
    add_item({"id": f"{w}_staff", "name": sn, "icon": f"{w}_staff", "equip": {"slot": "weapon", "level": lvl, "attack": atk, "vocations": ["arcanist"]}})
save('items.json', items)

# ── Coleta ──
def merge(name, extra):
    data = load(name); have = {x['id'] for x in data}
    data += [x for x in extra if x['id'] not in have]
    data.sort(key=lambda x: x['level']); save(name, data)
merge('mining.json', [
    {"id": "mithril_vein", "name": "Veio de Mithril", "region": "Minas de Kharzul", "level": 40, "intervalMs": 6000, "xp": 75, "item": "mithril_ore"},
    {"id": "adamant_vein", "name": "Veio de Adamantita", "region": "Fenda Vulcânica", "level": 55, "intervalMs": 7000, "xp": 110, "item": "adamant_ore"},
])
merge('woodcutting.json', [
    {"id": "willow", "name": "Salgueiro", "region": "Margem do Lago", "level": 30, "intervalMs": 5000, "xp": 50, "item": "willow_logs"},
    {"id": "yew", "name": "Teixo", "region": "Bosque Antigo", "level": 45, "intervalMs": 6000, "xp": 75, "item": "yew_logs"},
    {"id": "ancient_tree", "name": "Árvore Anciã", "region": "Coração da Floresta", "level": 60, "intervalMs": 7000, "xp": 110, "item": "ancient_logs"},
])
merge('fishing.json', [
    {"id": "lobster_spot", "name": "Covo de Lagosta", "region": "Costa do Naufrágio", "level": 35, "intervalMs": 5500, "xp": 65, "item": "raw_lobster"},
    {"id": "tuna_spot", "name": "Cardume de Atum", "region": "Mar Aberto", "level": 45, "intervalMs": 6000, "xp": 85, "item": "raw_tuna"},
    {"id": "shark_spot", "name": "Águas do Tubarão", "region": "Recife Partido", "level": 60, "intervalMs": 7000, "xp": 120, "item": "raw_shark"},
    {"id": "eel_spot", "name": "Poço da Enguia", "region": "Fossa Abissal", "level": 75, "intervalMs": 8000, "xp": 160, "item": "raw_eel"},
])
save('herbalism.json', [
    {"id": "green_herb_patch", "name": "Canteiro de Erva Verde", "region": "Campos do Bastião", "level": 1, "intervalMs": 3000, "xp": 15, "item": "green_herb"},
    {"id": "golden_root_patch", "name": "Raízes Douradas", "region": "Bosque Antigo", "level": 15, "intervalMs": 4000, "xp": 32, "item": "golden_root"},
    {"id": "blood_flower_patch", "name": "Jardim de Sangue", "region": "Cemitério Velho", "level": 30, "intervalMs": 5000, "xp": 50, "item": "blood_flower"},
    {"id": "moon_clover_patch", "name": "Clareira Lunar", "region": "Coração da Floresta", "level": 45, "intervalMs": 6000, "xp": 75, "item": "moon_clover"},
    {"id": "abyss_lotus_patch", "name": "Lago do Abismo", "region": "Fossa Abissal", "level": 60, "intervalMs": 7000, "xp": 110, "item": "abyss_lotus"},
])

# ── Produção ──
merge('cooking.json', [
    {"id": "cook_lobster", "name": "Lagosta Cozida", "level": 35, "intervalMs": 3500, "xp": 55, "inputs": {"raw_lobster": 1}, "output": "cooked_lobster"},
    {"id": "cook_tuna", "name": "Atum Grelhado", "level": 45, "intervalMs": 3500, "xp": 70, "inputs": {"raw_tuna": 1}, "output": "cooked_tuna"},
    {"id": "cook_shark", "name": "Tubarão Assado", "level": 60, "intervalMs": 4000, "xp": 95, "inputs": {"raw_shark": 1}, "output": "cooked_shark"},
    {"id": "cook_eel", "name": "Enguia Defumada", "level": 75, "intervalMs": 4000, "xp": 130, "inputs": {"raw_eel": 1}, "output": "cooked_eel"},
])
smith = load('smithing.json')
steel = [r for r in smith if r['id'].startswith('steel_') and r['id'] != 'steel_bar']
extra = [
    {"id": "mithril_bar", "name": "Barra de Mithril", "level": 40, "intervalMs": 6000, "xp": 30, "inputs": {"mithril_ore": 1, "coal": 2}, "output": "mithril_bar"},
    {"id": "adamant_bar", "name": "Barra de Adamantita", "level": 55, "intervalMs": 7000, "xp": 45, "inputs": {"adamant_ore": 1, "coal": 3}, "output": "adamant_bar"},
]
for t, (tn, _, _, _) in TIERS.items():
    off, mult = (10, 1.6) if t == 'mithril' else (25, 2.4)
    for r in steel:
        part = r['id'][6:]
        extra.append({"id": f"{t}_{part}", "name": f"{NAMES[part]} de {tn}", "level": r['level'] + off,
                      "intervalMs": r['intervalMs'] + 1000, "xp": round(r['xp'] * mult),
                      "inputs": {f"{t}_bar": r['inputs']['steel_bar']}, "output": f"{t}_{part}"})
have = {x['id'] for x in smith}
smith += [x for x in extra if x['id'] not in have]
smith.sort(key=lambda x: x['level'])
save('smithing.json', smith)

craft = load('crafting.json')
for r in craft:
    if r['id'] in ('shadow_bow', 'shadow_staff'): r['inputs'] = {"willow_logs": 3, "dark_essence": 2}
    if r['id'] in ('abyssal_bow', 'abyssal_staff'): r['inputs'] = {"yew_logs": 4, "sea_pearl": 2, "dark_essence": 2}
have = {x['id'] for x in craft}
CRAFT_WOOD = {'willow': (22, 40, {"feather": 3}, {"bone": 3}), 'yew': (38, 70, {"fang": 3}, {"bone": 4}), 'ancient': (58, 120, {"dark_essence": 2}, {"dark_essence": 2})}
for w, (clvl, xp, bow_in, staff_in) in CRAFT_WOOD.items():
    for kind, extra_in in [('bow', bow_in), ('staff', staff_in)]:
        rid = f"{w}_{kind}"
        if rid in have: continue
        inputs = {f"{w}_logs": 3 if w == 'willow' else 4, **extra_in}
        craft.append({"id": rid, "name": next(i['name'] for i in items if i['id'] == rid), "level": clvl,
                      "intervalMs": 5000 if w == 'willow' else 6000, "xp": xp, "inputs": inputs, "output": rid})
craft.sort(key=lambda x: x['level'])
save('crafting.json', craft)

save('alchemy.json', [
    {"id": "brew_health", "name": "Poção de Vida", "level": 1, "intervalMs": 3000, "xp": 12, "inputs": {"green_herb": 2}, "output": "health_potion"},
    {"id": "brew_strength", "name": "Poção de Força", "level": 15, "intervalMs": 4000, "xp": 30, "inputs": {"golden_root": 2, "green_herb": 1}, "output": "strength_potion"},
    {"id": "brew_stone", "name": "Poção de Pedra", "level": 25, "intervalMs": 4000, "xp": 40, "inputs": {"golden_root": 2, "bone": 2}, "output": "stone_potion"},
    {"id": "brew_great_health", "name": "Grande Poção de Vida", "level": 30, "intervalMs": 4500, "xp": 50, "inputs": {"blood_flower": 2}, "output": "great_health_potion"},
    {"id": "brew_fury", "name": "Elixir da Fúria", "level": 45, "intervalMs": 5000, "xp": 80, "inputs": {"moon_clover": 2, "blood_flower": 1}, "output": "fury_elixir"},
    {"id": "brew_iron", "name": "Elixir de Ferro", "level": 55, "intervalMs": 5500, "xp": 95, "inputs": {"moon_clover": 2, "adamant_ore": 1}, "output": "iron_elixir"},
    {"id": "brew_supreme_health", "name": "Poção Suprema de Vida", "level": 60, "intervalMs": 6000, "xp": 120, "inputs": {"abyss_lotus": 2}, "output": "supreme_health_potion"},
])
print('ok', len(items), 'itens')
