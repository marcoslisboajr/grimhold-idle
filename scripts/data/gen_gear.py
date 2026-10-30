"""Linhas de couro e manto, machados, bestas, materiais de monstro e drops com nome.
Ícones: recortes do Time Fantasy Icons (com recolor). Idempotente, exceto o ouro (marca no scratchpad)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'icons_lib_and_skills.py'), encoding='utf8').read().split('BLUE, GREEN, PURPLE')[0])
BLUE, GREEN, PURPLE, RED, GOLD_H = 0.6, 0.36, 0.78, 0.0, 0.12

items = load('items.json')
byid = {i['id']: i for i in items}
def add(it):
    if it['id'] in byid: byid[it['id']].update(it)
    else: items.append(it); byid[it['id']] = it

# ── Materiais de monstro ──
MATS = [
    ('spider_silk', 'Seda de Aranha', cell(2, 56), 6),
    ('wolf_pelt', 'Pele de Lobo', cell(0, 59), 8),
    ('orc_tusk', 'Presa de Orc', cell(10, 55), 12),
    ('bat_wing', 'Asa de Morcego', cell(1, 55), 10),
    ('lizard_scale', 'Escama de Lagarto', cell(2, 55), 30),
    ('minotaur_horn', 'Chifre de Minotauro', cell(7, 55), 70),
    ('cyclops_eye', 'Olho de Ciclope', cell(15, 55), 150),
    ('ectoplasm', 'Ectoplasma', cell(12, 56), 110),
    ('dragon_scale', 'Escama de Dragão', recolor(cell(2, 55), hue=RED, sat=1.4), 260),
    ('demon_horn', 'Chifre de Demônio', recolor(cell(7, 55), hue=RED, sat=1.2, light=-0.12), 380),
]
for mid, name, im, value in MATS:
    icon(mid, im); add({'id': mid, 'name': name, 'icon': mid, 'value': value})

# ── Armaduras: placa (guerreiro/devoto), couro (caçador), manto (arcanista/devoto) ──
PLATE = {t: {p: byid[f'{t}_{p}']['equip'] for p in ('helmet', 'armor', 'legs')} for t in ('iron', 'steel', 'mithril', 'abyssal', 'adamant')}
for t in PLATE:
    for p in PLATE[t]: byid[f'{t}_{p}']['equip']['vocations'] = ['warrior', 'devout']
PLATE_AT = {10: 'iron', 25: 'steel', 35: 'mithril', 45: 'abyssal', 55: 'adamant'}
PART = {'helmet': ('Capuz', 1), 'armor': ('Gibão', 3), 'legs': ('Calças', 2)}
ROBE_PART = {'helmet': ('Chapéu', 1), 'armor': ('Manto', 3), 'legs': ('Calças', 2)}

crafting = load('crafting.json')
crafts = {r['id']: r for r in crafting}
def recipe(out, name, level, inputs, xp):
    r = {'id': out, 'name': name, 'level': level, 'intervalMs': 5000 + 1000 * (level // 20), 'xp': xp, 'inputs': inputs, 'output': out}
    if out in crafts: crafts[out].update(r)
    else: crafting.append(r); crafts[out] = r

LEATHER = [(10, 'wolf', 'de Lobo', 'wolf_pelt', 0.08), (25, 'lizard', 'de Lagarto', 'lizard_scale', GREEN),
           (35, 'horn', 'de Minotauro', 'minotaur_horn', GOLD_H), (45, 'shadow', 'Sombrio', 'ectoplasm', PURPLE),
           (55, 'dragon', 'de Dragão', 'dragon_scale', RED)]
ICON_PART = {'helmet': cell(0, 45), 'armor': cell(0, 43), 'legs': cell(3, 42)}
for k, (lv, tid, suf, mat, hue) in enumerate(LEATHER):
    for p, (pname, size) in PART.items():
        pl = PLATE[PLATE_AT[lv]][p]
        eq = {'slot': p, 'level': lv, 'vocations': ['hunter'], 'defense': max(1, round(pl['defense'] * 0.65))}
        if pl.get('hp'): eq['hp'] = round(pl['hp'] * 0.8)
        if p == 'armor': eq['crit'] = round(0.02 + 0.01 * k, 3); eq['speed'] = -0.03
        else: eq['crit'] = round(0.01 + 0.005 * k, 3)
        if p == 'legs': eq['attack'] = 1 + k
        iid = f'{tid}_leather_{p}'
        icon(iid, recolor(ICON_PART[p], hue=hue, sat=1.1, light=-0.04 * (k % 2)))
        add({'id': iid, 'name': f'{pname} {suf}', 'icon': iid, 'equip': eq})
        recipe(iid, f'{pname} {suf}', lv + 2 + size, {'leather': 1 + size + k, mat: size + (k // 2)}, 20 + lv * size)

ROBES = [(1, 'linen', 'de Linho', None, None, cell(6, 41)), (10, 'silk', 'de Seda', 'spider_silk', None, cell(4, 41)),
         (25, 'shaman', 'do Xamã', 'golden_root', None, cell(3, 41)), (35, 'golden', 'Dourado', 'ectoplasm', GOLD_H, cell(6, 41)),
         (45, 'abyss', 'do Abismo', 'abyss_lotus', None, cell(5, 41)), (55, 'dragon', 'Dracônico', 'dragon_scale', None, cell(2, 41))]
ROBE_ICON = {'helmet': cell(10, 45), 'legs': cell(2, 42)}
HAT_HUE = [None, GREEN, BLUE, GOLD_H, PURPLE, RED]
for k, (lv, tid, suf, mat, hue, armor_icon) in enumerate(ROBES):
    for p, (pname, size) in ROBE_PART.items():
        pl = PLATE[PLATE_AT[lv]][p] if lv > 1 else {'helmet': {'defense': 2}, 'armor': {'defense': 4, 'hp': 10}, 'legs': {'defense': 2}}[p]
        eq = {'slot': p, 'level': lv, 'vocations': ['arcanist', 'devout'], 'defense': max(1, round(pl['defense'] * 0.45))}
        if pl.get('hp'): eq['hp'] = round(pl['hp'] * 0.6)
        if p == 'armor': eq['attack'] = 1 + k; eq['mana'] = round(0.1 + 0.04 * k, 2)
        elif p == 'helmet': eq['regen'] = round(0.05 + 0.03 * k, 2)
        else: eq['mana'] = round(0.05 + 0.02 * k, 2)
        iid = f'{tid}_robe_{p}'
        h = hue if p == 'armor' else HAT_HUE[k]
        base_icon = armor_icon if p == 'armor' else ROBE_ICON[p]
        icon(iid, recolor(base_icon, hue=h, sat=1.1) if h is not None else base_icon)
        name = f'{pname} {suf}'
        add({'id': iid, 'name': name, 'icon': iid, 'equip': eq})
        inputs = {'spider_silk': 1 + size + k} if lv > 1 else {'spider_silk': size}
        if mat and mat != 'spider_silk': inputs[mat] = size
        recipe(iid, name, lv + 1 + size, inputs, 16 + lv * size)

# ── Armas novas: machados (guerreiro, Forja) e bestas (caçador, Artesanato) ──
smithing = load('smithing.json')
smiths = {r['id']: r for r in smithing}
def smith(out, name, level, inputs, xp):
    r = {'id': out, 'name': name, 'level': level, 'intervalMs': 5000 + 1000 * (level // 20), 'xp': xp, 'inputs': inputs, 'output': out}
    if out in smiths: smiths[out].update(r)
    else: smithing.append(r); smiths[out] = r
AXES = [('iron', 'de Ferro', 10, cell(4, 28), None), ('steel', 'de Aço', 25, cell(6, 28), None), ('mithril', 'de Mithril', 35, cell(7, 28), None),
        ('abyssal', 'Abissal', 45, cell(10, 28), None), ('adamant', 'de Adamantita', 55, cell(9, 28), GREEN)]
for metal, suf, lv, im, hue in AXES:
    sword = byid[f'{metal}_sword']['equip']
    iid = f'{metal}_axe'
    icon(iid, recolor(im, hue=hue, sat=1.3) if hue else im)
    add({'id': iid, 'name': f'Machado {suf}', 'icon': iid, 'equip': {'slot': 'weapon', 'level': lv, 'vocations': ['warrior'], 'attack': round(sword['attack'] * 1.3), 'speed': 0.2}})
    sw = smiths[f'{metal}_sword']
    smith(iid, f'Machado {suf}', sw['level'] + 1, {f'{metal}_bar': 2, 'logs' if lv < 30 else 'oak_logs': 1}, sw['xp'] * 2)
XBOWS = [('oak_crossbow', 'Besta de Carvalho', 10, 'oak_bow', cell(7, 33), None, {'oak_logs': 2, 'iron_bar': 1}),
         ('steel_crossbow', 'Besta de Aço', 25, 'shadow_bow', cell(8, 33), None, {'willow_logs': 2, 'steel_bar': 1}),
         ('yew_crossbow', 'Besta de Teixo', 35, 'yew_bow', cell(9, 33), None, {'yew_logs': 2, 'mithril_bar': 1}),
         ('abyssal_crossbow', 'Besta Abissal', 45, 'abyssal_bow', cell(9, 33), PURPLE, {'yew_logs': 3, 'abyssal_bar': 1}),
         ('ancient_crossbow', 'Besta Anciã', 55, 'ancient_bow', cell(9, 33), GREEN, {'ancient_logs': 3, 'adamant_bar': 1})]
for iid, name, lv, bow, im, hue, inputs in XBOWS:
    icon(iid, recolor(im, hue=hue, sat=1.2) if hue else im)
    add({'id': iid, 'name': name, 'icon': iid, 'equip': {'slot': 'weapon', 'level': lv, 'vocations': ['hunter'], 'attack': round(byid[bow]['equip']['attack'] * 1.3), 'speed': 0.2}})
    recipe(iid, name, crafts[bow]['level'] + 1, inputs, crafts[bow]['xp'] * 2)

# ── Drops com nome (raros, de um monstro só) ──
SIG = [  # id, nome, ícone, equip, monstro, chance, valor
    ('goblin_longbow', 'Arco do Arqueiro Goblin', recolor(cell(1, 33), hue=GREEN, sat=1.1), {'slot': 'weapon', 'level': 6, 'vocations': ['hunter'], 'attack': 6, 'crit': 0.03}, 'goblin_archer', 0.01, 120),
    ('goblin_fetish', 'Fetiche do Xamã Goblin', recolor(cell(4, 30), hue=GREEN, sat=1.1), {'slot': 'weapon', 'level': 6, 'vocations': ['arcanist', 'devout'], 'attack': 6, 'mana': 0.15}, 'goblin_shaman', 0.01, 120),
    ('silk_slippers', 'Sapatilhas de Seda', recolor(cell(11, 47), sat=0.0, light=0.15), {'slot': 'boots', 'level': 8, 'defense': 1, 'hp': 10, 'speed': -0.05}, 'venom_spider', 0.008, 150),
    ('wolf_mask', 'Máscara da Tribo do Lobo', recolor(cell(0, 45), sat=0.2), {'slot': 'helmet', 'level': 12, 'defense': 3, 'attack': 2, 'crit': 0.03}, 'wolf_tribe', 0.008, 250),
    ('berserker_axe', 'Machado do Berserker', cell(5, 28), {'slot': 'weapon', 'level': 16, 'vocations': ['warrior'], 'attack': 13, 'speed': 0.15, 'lifesteal': 0.03}, 'orc_berserker', 0.006, 400),
    ('medusa_shield', 'Escudo da Medusa', recolor(cell(13, 37), hue=GREEN, sat=1.2), {'slot': 'shield', 'level': 24, 'defense': 9, 'hp': 30, 'regen': 0.1}, 'medusa', 0.006, 700),
    ('minotaur_cleaver', 'Cutelo do Minotauro', cell(8, 28), {'slot': 'weapon', 'level': 32, 'vocations': ['warrior', 'devout'], 'attack': 20, 'speed': 0.15, 'crit': 0.03}, 'minotaur_warrior', 0.005, 1400),
    ('lich_staff', 'Cajado do Lich', recolor(cell(15, 31), hue=PURPLE, sat=1.1), {'slot': 'weapon', 'level': 36, 'vocations': ['arcanist'], 'attack': 20, 'mana': 0.2}, 'lich', 0.005, 1800),
    ('cyclops_club', 'Clava do Ciclope', cell(8, 31), {'slot': 'weapon', 'level': 44, 'vocations': ['devout', 'warrior'], 'attack': 24, 'speed': 0.25, 'hp': 30}, 'cyclops', 0.004, 2600),
    ('tide_scepter', 'Cetro da Maré', recolor(cell(12, 32), hue=0.5, sat=1.2), {'slot': 'weapon', 'level': 48, 'vocations': ['devout', 'arcanist'], 'attack': 23, 'regen': 0.2}, 'fishfolk_shaman', 0.004, 3000),
    ('dragon_shield', 'Escudo de Escamas', recolor(cell(11, 37), hue=RED, sat=1.3), {'slot': 'shield', 'level': 60, 'defense': 20, 'hp': 60}, 'dragon', 0.004, 6000),
    ('vampire_cloak', 'Capa do Vampiro', recolor(cell(7, 41), hue=RED, sat=1.2, light=-0.05), {'slot': 'armor', 'level': 64, 'defense': 18, 'hp': 70, 'lifesteal': 0.05}, 'vampire', 0.003, 8000),
    ('night_bow', 'Arco do Espreitador', recolor(cell(5, 33), hue=PURPLE, sat=0.6, light=-0.1), {'slot': 'weapon', 'level': 64, 'vocations': ['hunter'], 'attack': 31, 'crit': 0.06}, 'nightstalker', 0.003, 8000),
    ('demon_blade', 'Lâmina Demoníaca', recolor(cell(14, 27), hue=RED, sat=1.3), {'slot': 'weapon', 'level': 72, 'vocations': ['warrior'], 'attack': 34, 'lifesteal': 0.04}, 'demon', 0.003, 12000),
]
monsters = load('monsters.json')
mon = {m['id']: m for m in monsters}
for iid, name, im, eq, mid, chance, value in SIG:
    icon(iid, im); add({'id': iid, 'name': name, 'icon': iid, 'equip': eq, 'value': value})
    m = mon[mid]; m['loot'] = [l for l in m['loot'] if l['item'] != iid] + [{'item': iid, 'chance': chance}]

DROPS = {
    'spider': [('spider_silk', 0.5)], 'venom_spider': [('spider_silk', 0.6)], 'wasp': [('green_herb', 0.3)],
    'wolf': [('wolf_pelt', 0.4)], 'boar': [('wolf_pelt', 0.2)], 'wolf_tribe': [('wolf_pelt', 0.35)], 'fox_tribe': [('wolf_pelt', 0.25)],
    'orc': [('orc_tusk', 0.3)], 'orc_spearman': [('orc_tusk', 0.3)], 'orc_warrior': [('orc_tusk', 0.35)], 'orc_berserker': [('orc_tusk', 0.45)],
    'bat': [('bat_wing', 0.45)], 'ghoul': [('bat_wing', 0.1)],
    'lizard': [('lizard_scale', 0.35)], 'lizard_tribe': [('lizard_scale', 0.35), ('golden_root', 0.15)], 'raptor': [('lizard_scale', 0.3)], 'medusa': [('lizard_scale', 0.3), ('golden_root', 0.2)],
    'minotaur': [('minotaur_horn', 0.25)], 'minotaur_archer': [('minotaur_horn', 0.2)], 'minotaur_guard': [('minotaur_horn', 0.3)], 'minotaur_warrior': [('minotaur_horn', 0.3)],
    'cyclops': [('cyclops_eye', 0.2)], 'cyclops_thrower': [('cyclops_eye', 0.2)],
    'ghost': [('ectoplasm', 0.3)], 'wight': [('ectoplasm', 0.2)], 'banshee': [('ectoplasm', 0.35)], 'drowned_veteran': [('ectoplasm', 0.15)],
    'fishfolk_shaman': [('moon_clover', 0.12)], 'jellyfish': [('moon_clover', 0.1)],
    'dragon_hatchling': [('dragon_scale', 0.2)], 'dragon': [('dragon_scale', 0.35)], 'wyvern': [('dragon_scale', 0.2)],
    'vampire': [('bat_wing', 0.5), ('blood_flower', 0.15)], 'nightstalker': [('bat_wing', 0.3)],
    'lesser_demon': [('demon_horn', 0.15), ('abyss_lotus', 0.08)], 'demon': [('demon_horn', 0.3)], 'fire_devil': [('demon_horn', 0.2)],
}
for mid, drops in DROPS.items():
    m = mon[mid]
    for item, ch in drops:
        m['loot'] = [l for l in m['loot'] if l['item'] != item] + [{'item': item, 'chance': ch}]
# Ouro cai pela metade (uma vez só): o valor vem dos materiais.
MARK = os.path.join(HERE, '.gold_halved')
if not os.path.exists(MARK):
    for m in monsters:
        for l in m['loot']:
            if l['item'] == 'gold':
                mn = max(1, round(l.get('min', 1) / 2)); l['min'] = mn; l['max'] = max(mn, round(l.get('max', mn) / 2))
    open(MARK, 'w').write('1')

save('items.json', items); save('crafting.json', crafting); save('smithing.json', smithing)
open(D + 'monsters.json', 'w', encoding='utf8').write(json.dumps(monsters, ensure_ascii=False, indent=2) + chr(10))
print('ok', len(items), 'itens')
