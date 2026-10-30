"""Early game (20/10/2026): seis caçadas novas que fecham os buracos do 1 ao 50 e três covis com chefe novo.

Caçadas: Porões da Cidade (2), Bosque dos Javalis (6), Acampamento Kobold (14), Pântano das Bruxas (30),
Mina Abandonada (42) e Ilha dos Corvos (50). Monstros reaproveitam sprites (nome e números novos), com
vida, ataque e XP entre as caçadas vizinhas do mesmo nível. Foco xp = mais XP e pouco ouro; loot = o inverso.
Covis: Tecelã Sombria (15, amuleto), Rei dos Porões (30, bolsa com uma arma por classe) e Golem da Mina Velha (45, set raro de
3 peças). Bolsa: o teste dos covis baixos pede pouco loot por chefe (até 4 entradas).
Idempotente: rodar de novo só reescreve o que é deste script.
"""
import colorsys, json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
MON = ROOT + '/client/public/assets/monsters/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'
SHEET_PATH = '../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png'

sheet = Image.open(SHEET_PATH).convert('RGBA')
def cell(c, r):
    return sheet.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32))

def recolor(im, hue=None, sat=None, light=0.0):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if hue is not None: h = hue
            if sat is not None:
                s = min(1, s * sat)
                if hue is not None and s < 0.25: s = 0.25 + s
            l = max(0, min(1, l + light))
            r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

def tint(im, hue, sat, vm):
    """Mesmo tint dos chefes de covil do gen_gods.py."""
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, max(s, 0.15) * sat * 1.6), min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im

def load_json(path):
    return json.load(open(path, encoding='utf8'))
def save_json(path, data):
    with open(path, 'w', encoding='utf8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write('\n')

ICON = {'amulet': cell(1, 50), 'blade': cell(14, 27), 'bow': cell(9, 33), 'staff': cell(15, 31), 'hammer': cell(8, 28),
        'helmet': cell(10, 45), 'armor': cell(0, 43), 'legs': cell(3, 42), 'boots': cell(0, 47)}

def L(spec):
    """('item', chance) ou ('item', chance, min, max)."""
    return [({'item': l[0], 'chance': l[1], 'min': l[2], 'max': l[3]} if len(l) == 4 else {'item': l[0], 'chance': l[1]}) for l in spec]

# (id, PT, EN, sprite, vida, ataque, defesa, velocidade, XP, loot, fraco, resiste)
HUNTS = [
    dict(id='city_cellars', name=('Porões da Cidade', 'City Cellars'), region='Ravina Selvagem', level=2, focus='xp',
         monsters=[
             ('sewer_rat', 'Rato de Esgoto', 'Sewer Rat', 'rato', 42, 8, 3, 1350, 2, [('gold', 1, 1, 2), ('bone', 0.3)], ['fire'], []),
             ('cellar_bat', 'Morcego do Porão', 'Cellar Bat', 'morcego', 38, 9, 2, 1100, 2, [('gold', 1, 1, 2), ('feather', 0.3)], ['holy'], []),
             ('sewer_slime', 'Gosma do Esgoto', 'Sewer Slime', 'slime', 50, 7, 4, 1500, 2, [('gold', 1, 1, 2), ('green_herb', 0.2)], ['fire'], ['earth']),
         ]),
    dict(id='boar_grove', name=('Bosque dos Javalis', 'Boar Grove'), region='Ravina Selvagem', level=6, focus='loot',
         monsters=[
             ('young_boar', 'Javali Jovem', 'Young Boar', 'javali', 100, 17, 7, 1450, 3, [('gold', 1, 3, 9), ('leather', 0.45)], ['fire'], []),
             ('grove_beetle', 'Besouro do Bosque', 'Grove Beetle', 'inseto', 90, 16, 8, 1400, 3, [('gold', 1, 3, 8), ('copper_ore', 0.25)], ['fire'], ['earth']),
             ('marsh_toad', 'Sapo do Brejo', 'Marsh Toad', 'sapo', 85, 15, 6, 1550, 3, [('gold', 1, 3, 8), ('green_herb', 0.3), ('leather', 0.15)], ['energy'], ['water']),
         ]),
    dict(id='kobold_camp', name=('Acampamento Kobold', 'Kobold Camp'), region='Terras Selvagens', level=14, focus='balanced',
         monsters=[
             ('kobold', 'Kobold', 'Kobold', 'goblin', 220, 28, 12, 1250, 11, [('gold', 1, 4, 10), ('copper_ore', 0.2), ('iron_ore', 0.1)], ['fire'], []),
             ('kobold_slinger', 'Kobold Fundeiro', 'Kobold Slinger', 'goblin_archer', 190, 30, 10, 1150, 11, [('gold', 1, 4, 10), ('feather', 0.3)], ['fire'], []),
             ('kobold_mystic', 'Místico Kobold', 'Kobold Mystic', 'goblin_mage', 200, 31, 10, 1300, 11, [('gold', 1, 4, 10), ('green_herb', 0.25)], ['holy'], ['energy']),
             ('camp_wolf', 'Lobo do Acampamento', 'Camp Wolf', 'lobo', 210, 27, 12, 1100, 11, [('gold', 1, 4, 9), ('wolf_pelt', 0.3), ('leather', 0.3)], ['fire'], []),
         ]),
    dict(id='witch_bog', name=('Pântano das Bruxas', 'Witch Bog'), region='Terras Selvagens', level=30, focus='balanced',
         monsters=[
             ('mire_lizard', 'Lagarto do Lamaçal', 'Mire Lizard', 'lagarto', 540, 45, 29, 1200, 58, [('gold', 1, 16, 34), ('lizard_scale', 0.3), ('leather', 0.3)], ['water'], ['earth']),
             ('bog_toad', 'Sapo Gigante do Pântano', 'Giant Bog Toad', 'sapo', 600, 42, 30, 1450, 58, [('gold', 1, 16, 34), ('leather', 0.4), ('green_herb', 0.3)], ['energy'], ['water']),
             ('bog_spider', 'Aranha do Lodo', 'Bog Spider', 'aranha', 500, 47, 26, 1150, 57, [('gold', 1, 16, 34), ('spider_silk', 0.5)], ['fire'], ['earth']),
             ('bog_witch', 'Bruxa do Lodo', 'Bog Witch', 'ice_witch', 480, 50, 24, 1300, 60, [('gold', 1, 18, 38), ('green_herb', 0.4), ('emerald_amulet', 0.01)], ['fire', 'holy'], ['earth']),
         ]),
    dict(id='abandoned_mine', name=('Mina Abandonada', 'Abandoned Mine'), region='Montanhas de Ferro', level=42, focus='xp',
         monsters=[
             ('mine_golem', 'Golem da Mina', 'Mine Golem', 'golem', 950, 68, 42, 1450, 172, [('gold', 1, 22, 44), ('iron_ore', 0.35, 1, 2), ('coal', 0.3)], ['water'], ['earth', 'physical']),
             ('young_rock_elemental', 'Elemental de Pedra Jovem', 'Young Rock Elemental', 'earth_elemental', 860, 72, 38, 1350, 168, [('gold', 1, 22, 44), ('copper_ore', 0.3, 1, 3), ('coal', 0.25)], ['fire'], ['earth']),
             ('gallery_bat', 'Morcego das Galerias', 'Gallery Bat', 'morcego', 760, 76, 32, 1000, 165, [('gold', 1, 20, 40), ('feather', 0.4)], ['holy'], []),
         ]),
    dict(id='raven_isle', name=('Ilha dos Corvos', 'Raven Isle'), region='Costa dos Afogados', level=50, focus='loot',
         monsters=[
             ('isle_raven', 'Corvo da Ilha', 'Isle Raven', 'corvo', 880, 80, 34, 1050, 185, [('gold', 1, 50, 105), ('feather', 0.8, 2, 5)], ['holy'], ['death']),
             ('isle_harpy', 'Harpia da Ilha', 'Isle Harpy', 'harpy', 960, 84, 36, 1150, 192, [('gold', 1, 50, 110), ('harpy_feather', 0.15), ('feather', 0.5, 2, 4)], ['earth'], ['energy']),
             ('royal_falcon', 'Falcão Real', 'Royal Falcon', 'falcao', 900, 82, 35, 1000, 186, [('gold', 1, 50, 105), ('feather', 0.7, 2, 5), ('silver_necklace', 0.02)], ['earth'], []),
         ]),
]

# Covis: (id, PT, EN, nível, chefe (id, PT, EN, sprite base, tint), vida, ataque, defesa, vel., XP, loot, fraco, resiste, drops, bolsa)
# drops: (id, PT, EN, ícone, cor, equip, chance); bolsa: (id, PT, EN, chance) junta os drops numa bolsa (abre na arma da vocação).
WEAPONS_30 = [
    ('rat_king_sword', 'Espada do Rei dos Porões', 'Cellar King Sword', 'blade', 0.08, {'slot': 'weapon', 'level': 28, 'vocations': ['warrior'], 'attack': 19, 'crit': 0.04, 'lifesteal': 0.02}, 0.06),
    ('rat_king_bow', 'Arco do Rei dos Porões', 'Cellar King Bow', 'bow', 0.08, {'slot': 'weapon', 'level': 28, 'vocations': ['hunter'], 'attack': 19, 'speed': 0.1, 'crit': 0.03}, 0.06),
    ('rat_king_staff', 'Cajado do Rei dos Porões', 'Cellar King Staff', 'staff', 0.08, {'slot': 'weapon', 'level': 28, 'vocations': ['arcanist'], 'attack': 18, 'mana': 0.08, 'manaLeech': 0.02}, 0.06),
    ('rat_king_mace', 'Maça do Rei dos Porões', 'Cellar King Mace', 'hammer', 0.08, {'slot': 'weapon', 'level': 28, 'vocations': ['devout'], 'attack': 18, 'hp': 20, 'regen': 0.03}, 0.06),
]
GOLEM_SET = [
    ('old_mine_helm', 'Elmo da Mina Velha', 'Old Mine Helm', 'helmet', 0.07, {'slot': 'helmet', 'level': 45, 'defense': 42, 'hp': 205, 'attack': 22}, 0.03),
    ('old_mine_plate', 'Couraça da Mina Velha', 'Old Mine Plate', 'armor', 0.07, {'slot': 'armor', 'level': 45, 'defense': 50, 'hp': 236, 'attack': 15}, 0.03),
    ('old_mine_legs', 'Perneiras da Mina Velha', 'Old Mine Legs', 'legs', 0.07, {'slot': 'legs', 'level': 45, 'defense': 29, 'hp': 153, 'attack': 10}, 0.03),
]
LAIRS = [
    ('weaver_web', 'Teia da Tecelã Sombria', "Shadow Weaver's Web", 15, ('shadow_weaver', 'Tecelã Sombria', 'Shadow Weaver', 'aranha', (280, 0.8, 0.9)),
     1150, 20, 14, 1250, 4200, [('gold', 1, 15, 35), ('spider_silk', 1, 2, 5)], ['fire'], ['earth'],
     [('weaver_amulet', 'Amuleto da Tecelã', "Weaver's Amulet", 'amulet', 0.78, {'slot': 'amulet', 'level': 15, 'defense': 3, 'hp': 20, 'attack': 2}, 0.15)], None),
    ('rat_king_throne', 'Trono do Rei dos Porões', 'Throne of the Cellar King', 30, ('cellar_king', 'Rei dos Porões', 'The Cellar King', 'rato', (40, 0.9, 1.15)),
     2050, 34, 28, 1250, 9000, [('gold', 1, 60, 140), ('bone', 1, 3, 8)], ['fire'], ['death'], WEAPONS_30,
     ('rat_king_pouch', 'Bolsa do Rei dos Porões', "Cellar King's Pouch", 0.2)),
    ('old_mine_depths', 'Fundo da Mina Velha', 'Old Mine Depths', 45, ('old_mine_golem', 'Golem da Mina Velha', 'The Old Mine Golem', 'golem', (25, 0.7, 0.85)),
     2900, 45, 44, 1450, 24000, [('gold', 1, 200, 400)], ['water'], ['earth', 'physical'], GOLEM_SET, None),
]

items = load_json(D + 'items.json'); by_item = {i['id']: i for i in items}
monsters = load_json(D + 'monsters.json'); by_mon = {m['id']: m for m in monsters}
hunts = load_json(D + 'hunts.json'); by_hunt = {h['id']: h for h in hunts}
i18n_items = load_json(I18N_ITEMS); i18n_content = load_json(I18N_CONTENT)

def put(lst, by, obj):
    if obj['id'] in by: by[obj['id']].clear(); by[obj['id']].update(obj)
    else: lst.append(obj); by[obj['id']] = obj

OURS, OUR_NAMES = set(), set()
for h in HUNTS:
    OURS |= {h['id']} | {m[0] for m in h['monsters']}; OUR_NAMES |= {h['name'][0]} | {m[1] for m in h['monsters']}
for lair in LAIRS:
    OURS |= {lair[0], lair[4][0]} | {d[0] for d in lair[13]}; OUR_NAMES |= {lair[1], lair[4][1]} | {d[1] for d in lair[13]}
    if lair[14]: OURS.add(lair[14][0]); OUR_NAMES.add(lair[14][1])
GEN_MARK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gen_early_game.ids.json')
previous = set(json.load(open(GEN_MARK))) if os.path.exists(GEN_MARK) else set()
clash = [i for i in OURS if i not in previous and (i in by_mon or i in by_hunt or i in by_item)]
assert not clash, f'ids já usados no jogo: {clash}'
taken = {x['name'] for coll in (monsters, hunts, items) for x in coll if x['id'] not in OURS}
assert not (OUR_NAMES & taken), f'nomes já usados no jogo: {sorted(OUR_NAMES & taken)}'

def monster(mid, pt, en, sprite, hp, atk, df, spd, xp, loot, weak, resist):
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite, 'hp': hp, 'attack': atk, 'defense': df, 'attackSpeedMs': spd, 'xp': xp,
                           'loot': loot, **({'weak': weak} if weak else {}), **({'resist': resist} if resist else {})})
    i18n_content[pt] = en

for h in HUNTS:
    for (mid, pt, en, sprite, hp, atk, df, spd, xp, loot, weak, resist) in h['monsters']:
        monster(mid, pt, en, sprite, hp, atk, df, spd, xp, L(loot), weak, resist)
    put(hunts, by_hunt, {'id': h['id'], 'name': h['name'][0], 'region': h['region'], 'level': h['level'], 'monsters': [m[0] for m in h['monsters']], 'focus': h['focus']})
    i18n_content[h['name'][0]] = h['name'][1]

POUCH_ICON = Image.open(ICONS + 'ancient_weapon_pouch_mythic.png').convert('RGBA')
for (hid, hpt, hen, level, (mid, mpt, men, sprite, color), hp, atk, df, spd, xp, loot, weak, resist, drops, pouch) in LAIRS:
    if True:
        for n in range(1, 5):
            tint(Image.open(MON + f'{sprite}_{n}.png'), *color).save(MON + f'{mid}_{n}.png')
    drop_loot = []
    for (did, pt, en, icon, hue, equip, chance) in drops:
        recolor(ICON[icon], hue=hue, sat=1.4).save(ICONS + did + '.png')
        put(items, by_item, {'id': did, 'name': pt, 'icon': did, 'equip': equip, 'value': 40 * equip['level'] * equip['level'] // 10})
        i18n_items[pt] = en
        drop_loot.append({'item': did, 'chance': chance})
    if pouch:
        pid, ppt, pen, pch = pouch
        recolor(POUCH_ICON, hue=drops[0][4], sat=1.3).save(ICONS + pid + '.png')
        put(items, by_item, {'id': pid, 'name': ppt, 'icon': pid, 'pouch': True, 'value': 40 * level * level // 10, 'pool': [d[0] for d in drops]})
        i18n_items[ppt] = pen
        drop_loot = [{'item': pid, 'chance': pch}]
    monster(mid, mpt, men, mid, hp, atk, df, spd, xp, L(loot) + drop_loot, weak, resist)
    put(hunts, by_hunt, {'id': hid, 'name': hpt, 'region': 'Covis do Bastião', 'level': level, 'monsters': [mid], 'lair': True})
    i18n_content[hpt] = hen

hunts.sort(key=lambda h: h['level'])
save_json(D + 'items.json', items); save_json(D + 'monsters.json', monsters); save_json(D + 'hunts.json', hunts)
save_json(I18N_ITEMS, i18n_items); save_json(I18N_CONTENT, i18n_content)
json.dump(sorted(OURS), open(GEN_MARK, 'w'))
print('ok:', len(items), 'itens,', len(monsters), 'monstros,', len(hunts), 'caçadas')
