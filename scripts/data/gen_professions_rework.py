"""Rework das profissões: coleta e criação até o nível 120.

Pontos de coleta novos (mineração, lenhador, pesca, herbalismo, colheita de almas), metais e madeiras
novos com conjuntos de equipamento para o combate 70 a 160, joias com gemas, flechas, pratos (inclusive
combinados) e poções. Ícones por recolor dos que já existem. Também escreve as traduções (items_i18n.json
e os node.* do i18n.ts) e liga cada ponto novo a um cenário parecido no map.ts.
Idempotente: rodar de novo atualiza o que já existe, sem duplicar.
Uso: python scripts/data/gen_professions_rework.py
"""
import colorsys, json, os, re
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_TS = ROOT + '/client/src/i18n.ts'
MAP_TS = ROOT + '/client/src/world/map.ts'


def read_text(path): return open(path, encoding='utf8', newline='').read()
def write_text(path, text, like):
    """Grava com as mesmas quebras de linha do original (`like`): CRLF ou LF."""
    text = text.replace('\r\n', '\n')
    if '\r\n' in like: text = text.replace('\n', '\r\n')
    open(path, 'w', encoding='utf8', newline='').write(text)

def load(n): return json.load(open(D + n, encoding='utf8'))
def save(n, data):
    """Grava no mesmo estilo do arquivo: indentado (items, smithing) ou um objeto por linha (o resto)."""
    old = read_text(D + n)
    lines = old.splitlines()
    if len(lines) > 1 and lines[1].strip() == '{': text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    else: text = '[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in data) + '\n]\n'
    write_text(D + n, text, old)


# ── Ícones: recolor (matiz/saturação/brilho) de um ícone que já existe ──
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
def base(name): return Image.open(ICONS + name + '.png').convert('RGBA')
def make_icon(name, src, **kw): recolor(base(src), **kw).save(ICONS + name + '.png')


items = load('items.json')
byid = {i['id']: i for i in items}
en = json.load(open(I18N_ITEMS, encoding='utf8'))
pt_names = {i['name']: i['id'] for i in items}
new_ids = set()

def item(iid, name, en_name, icon_src, recolor_kw, **fields):
    """Cria ou atualiza o item, com ícone e nome em inglês."""
    if pt_names.get(name, iid) != iid:
        raise SystemExit(f'nome repetido: {name} ({iid} e {pt_names[name]})')
    it = {'id': iid, 'name': name, 'icon': iid, **fields}
    if iid in byid: byid[iid].clear(); byid[iid].update(it)
    else: items.append(it); byid[iid] = it
    pt_names[name] = iid; new_ids.add(iid)
    en[name] = en_name
    make_icon(iid, icon_src, **recolor_kw)
    return it


# Curva da coleta (nível → intervalo, XP): segue os pontos que já existem e continua até o 120.
ANCHORS = [(1, 3000, 15), (15, 4000, 32), (30, 5000, 50), (45, 6000, 75), (60, 7000, 110), (70, 8000, 155),
           (80, 9000, 215), (90, 10000, 290), (100, 11000, 380), (110, 12000, 480), (120, 13000, 600)]
def curve(level):
    for (l0, i0, x0), (l1, i1, x1) in zip(ANCHORS, ANCHORS[1:]):
        if l0 <= level <= l1:
            f = (level - l0) / (l1 - l0)
            return round((i0 + (i1 - i0) * f) / 100) * 100, round(x0 + (x1 - x0) * f)
    raise ValueError(level)

nodes_by_skill = {s: load(s + '.json') for s in ('mining', 'woodcutting', 'fishing', 'herbalism', 'soulreaping')}
node_en, map_alias = {}, {}
def node(skill, nid, name, en_name, region, level, item_id, alias, drops=None):
    interval, xp = curve(level)
    n = {'id': nid, 'name': name, 'region': region, 'level': level, 'intervalMs': interval, 'xp': xp, 'item': item_id}
    if drops: n['drops'] = drops
    lst = nodes_by_skill[skill]
    old = next((x for x in lst if x['id'] == nid), None)
    if old: old.clear(); old.update(n)
    else: lst.append(n)
    node_en[nid] = (name, en_name); map_alias[nid] = alias

recipes_by_skill = {s: load(s + '.json') for s in ('smithing', 'crafting', 'cooking', 'alchemy', 'fletching')}
def recipe(skill, rid, name, level, inputs, output, xp, interval, qty=None):
    assert level <= 120, (rid, level)
    r = {'id': rid, 'name': name, 'level': level, 'intervalMs': interval, 'xp': xp, 'inputs': inputs, 'output': output}
    if qty: r['outputQty'] = qty
    lst = recipes_by_skill[skill]
    old = next((x for x in lst if x['id'] == rid), None)
    if old: old.clear(); old.update(r)
    else: lst.append(r)


# ════════════════════════ COLETA ════════════════════════
# Mineração
item('silver_ore', 'Minério de Prata', 'Silver Ore', 'iron_ore', dict(sat=0.15, light=0.18), value=12)
item('gold_ore', 'Minério de Ouro', 'Gold Ore', 'iron_ore', dict(hue=0.12, sat=1.7, light=0.05), value=20)
GEMS = [('gem_sapphire', 'Safira', 'Sapphire', 0.6, 0.0, 50, 60), ('gem_emerald', 'Esmeralda', 'Emerald', 0.36, 0.0, 30, 90),
        ('gem_ruby', 'Rubi', 'Ruby', 0.0, 0.0, 15, 140), ('gem_diamond', 'Diamante', 'Diamond', None, 0.25, 5, 250)]
for gid, name, en_name, hue, light, _, value in GEMS:
    kw = dict(hue=hue, sat=1.5, light=light) if hue is not None else dict(sat=0.08, light=light)
    item(gid, name, en_name, 'crystal_heart', kw, value=value)

METALS = [  # id, nome do metal, "de X"/adjetivo (masc., fem., plural), inglês, matiz, brilho, nível, combate
    ('runite', 'Runita', ('de Runita',) * 3, 'Runite', 0.52, 0.0, 65, 70),
    ('orichalcum', 'Oricalco', ('de Oricalco',) * 3, 'Orichalcum', 0.08, 0.0, 75, 85),
    ('luminite', 'Luminita', ('de Luminita',) * 3, 'Luminite', 0.15, 0.12, 85, 100),
    ('dragonite', 'Dragonita', ('de Dragonita',) * 3, 'Dragonite', 0.0, -0.02, 95, 120),
    ('starmetal', 'Metal Estelar', ('Estelar', 'Estelar', 'Estelares'), 'Starmetal', 0.7, 0.1, 105, 140),
    ('primordial', 'Primordial', ('Primordial', 'Primordial', 'Primordiais'), 'Primordial', 0.86, -0.08, 115, 160),
]
MINE_REGIONS = ['Minas de Kharzul', 'Fenda Vulcânica', 'Cavernas de Cristal', 'Fenda Vulcânica', 'Picos Celestes', 'Coração do Vazio']
MINE_ALIAS = ['mithril_vein', 'adamant_vein', 'pure_rune_vein', 'adamant_vein', 'pure_rune_vein', 'adamant_vein']
for k, (mid, mname, adj, men, hue, light, lv, _) in enumerate(METALS):
    ore_name = f'Minério {adj[0]}'
    item(f'{mid}_ore', ore_name, f'{men} Ore', 'adamant_ore', dict(hue=hue, sat=1.5, light=light), value=round(lv * 0.6))
    node('mining', f'{mid}_vein', f'Veio {adj[0]}', f'{men} Vein', MINE_REGIONS[k], lv, f'{mid}_ore', MINE_ALIAS[k])
node('mining', 'silver_vein', 'Veio de Prata', 'Silver Vein', 'Ravina Selvagem', 20, 'silver_ore', 'iron_vein')
node('mining', 'gold_vein', 'Veio de Ouro', 'Gold Vein', 'Catacumbas de Ashfen', 35, 'gold_ore', 'mithril_vein')
node('mining', 'gem_rock', 'Rocha de Gemas', 'Gem Rock', 'Minas de Kharzul', 48, 'gem_sapphire', 'pure_rune_vein',
     drops=[{'item': g[0], 'weight': g[5]} for g in GEMS])

# Lenhador
WOODS = [  # id, nome da tora, inglês, matiz, brilho, nível, árvore, árvore em inglês, região, cenário
    ('maple', 'Tora de Bordo', 'Maple Logs', 0.04, 0.02, 25, 'Bordo', 'Maple', 'Bosque Antigo', 'oak'),
    ('mahogany', 'Tora de Mogno', 'Mahogany Logs', 0.0, -0.1, 38, 'Mogno', 'Mahogany', 'Margem do Lago', 'willow'),
    ('magic', 'Tora Mágica', 'Magic Logs', 0.55, 0.05, 70, 'Árvore Mágica', 'Magic Tree', 'Coração da Floresta', 'ancient_tree'),
    ('ironwood', 'Tora de Pau-ferro', 'Ironwood Logs', None, -0.12, 80, 'Pau-ferro', 'Ironwood', 'Bosque Antigo', 'yew'),
    ('redwood', 'Tora de Sequoia', 'Redwood Logs', 0.98, -0.02, 90, 'Sequoia', 'Redwood', 'Vale dos Pesadelos', 'yew'),
    ('spirit', 'Tora Espiritual', 'Spirit Logs', 0.45, 0.15, 100, 'Árvore Espiritual', 'Spirit Tree', 'Picos Celestes', 'ancient_tree'),
    ('worldtree', 'Tora da Árvore do Mundo', 'World Tree Logs', 0.3, 0.08, 115, 'Árvore do Mundo', 'World Tree', 'Coração do Vazio', 'ancient_tree'),
]
for wid, log_name, log_en, hue, light, lv, tree, tree_en, region, alias in WOODS:
    kw = dict(hue=hue, sat=1.1, light=light) if hue is not None else dict(sat=0.2, light=light)
    item(f'{wid}_logs', log_name, log_en, 'oak_logs', kw, value=round(lv * 0.6))
    node('woodcutting', f'{wid}_tree', tree, tree_en, region, lv, f'{wid}_logs', alias)

# Pesca → Culinária (um prato por peixe)
FISH = [  # id, peixe cru, inglês, ícone base, matiz, nível, ponto, ponto inglês, região, cenário, prato, prato inglês, refeição
    ('crab', 'Caranguejo Cru', 'Raw Crab', 'raw_lobster', 0.05, 28, 'Toca dos Caranguejos', 'Crab Burrows', 'Costa do Naufrágio', 'lobster_spot',
     'Caranguejo Cozido', 'Boiled Crab', ('combat_xp', 0.08)),
    ('swordfish', 'Espadarte Cru', 'Raw Swordfish', 'raw_tuna', 0.58, 52, 'Rota do Espadarte', 'Swordfish Route', 'Mar Aberto', 'tuna_spot',
     'Espadarte Grelhado', 'Grilled Swordfish', ('loot', 0.15)),
    ('monkfish', 'Tamboril Cru', 'Raw Monkfish', 'raw_tuna', 0.1, 68, 'Fundo do Tamboril', 'Monkfish Depths', 'Recife Partido', 'tuna_spot',
     'Tamboril Assado', 'Roast Monkfish', ('rest_speed', 0.3)),
    ('dragonfish', 'Peixe-dragão Cru', 'Raw Dragonfish', 'raw_shark', 0.02, 85, 'Águas Ferventes', 'Boiling Waters', 'Abismo Infernal', 'shark_spot',
     'Peixe-dragão Flamejado', 'Flambéed Dragonfish', ('crit_chance', 0.08)),
    ('dark_crab', 'Caranguejo Sombrio Cru', 'Raw Dark Crab', 'raw_lobster', 0.78, 95, 'Toca Sombria', 'Dark Burrows', 'Fossa Abissal', 'eel_spot',
     'Caranguejo Sombrio Cozido', 'Boiled Dark Crab', ('combat_xp', 0.15)),
    ('serpent', 'Serpente Marinha Crua', 'Raw Sea Serpent', 'raw_eel', 0.35, 105, 'Covil da Serpente', 'Serpent Lair', 'Mar Aberto', 'shark_spot',
     'Serpente Defumada', 'Smoked Sea Serpent', ('profession_xp', 0.2)),
    ('manta', 'Arraia Abissal Crua', 'Raw Abyssal Ray', 'raw_shark', 0.66, 115, 'Fossa da Arraia', 'Ray Trench', 'Fossa Abissal', 'eel_spot',
     'Arraia ao Fogo Abissal', 'Abyssal Fire Ray', ('all_xp_loot', 0.18)),
]
for fid, raw, raw_en, icon_src, hue, lv, spot, spot_en, region, alias, dish, dish_en, (buff, value) in FISH:
    item(f'raw_{fid}', raw, raw_en, icon_src, dict(hue=hue, sat=1.2), value=round(lv * 0.5))
    node('fishing', f'{fid}_spot', spot, spot_en, region, lv, f'raw_{fid}', alias)
    item(f'cooked_{fid}', dish, dish_en, f'raw_{fid}', dict(hue=0.07, sat=0.9, light=-0.1), meal={'buff': buff, 'value': value})
    recipe('cooking', f'cook_{fid}', dish, lv, {f'raw_{fid}': 1}, f'cooked_{fid}', round(lv * 1.75), 3000 + 500 * (lv // 30))

# Herbalismo
HERBS = [
    ('mint_leaf', 'Folha de Hortelã', 'Mint Leaf', 'green_herb', dict(hue=0.42, sat=1.3, light=0.08), 8,
     'mint_patch', 'Canteiro de Hortelã', 'Mint Patch', 'Campos do Bastião', 'green_herb_patch'),
    ('star_moss', 'Musgo Estelar', 'Star Moss', 'moon_clover', dict(hue=0.62, sat=1.0, light=0.12), 100,
     'star_moss_patch', 'Prado Estelar', 'Starlit Meadow', 'Picos Celestes', 'moon_clover_patch'),
    ('dragon_thistle', 'Cardo de Dragão', 'Dragon Thistle', 'abyss_lotus', dict(hue=0.02, sat=1.3, light=-0.04), 110,
     'dragon_thistle_patch', 'Encosta do Dragão', 'Dragon Slope', 'Abismo Infernal', 'fire_lotus_patch'),
    ('celestial_lily', 'Lírio Celestial', 'Celestial Lily', 'moon_clover', dict(hue=0.14, sat=0.7, light=0.2), 120,
     'celestial_lily_patch', 'Jardim Celestial', 'Celestial Garden', 'Picos Celestes', 'ghost_bloom_patch'),
]
for hid, name, en_name, src, kw, lv, nid, nname, nen, region, alias in HERBS:
    item(hid, name, en_name, src, kw, value=round(lv * 0.6))
    node('herbalism', nid, nname, nen, region, lv, hid, alias)

# Colheita de Almas (os materiais especiais dos conjuntos novos e das poções)
SOULS = [
    ('wisp_ember', 'Brasa Fátua', 'Wisp Ember', 'ash_ember', dict(hue=0.5, sat=1.2, light=0.05), 8,
     'wisp_hollow', 'Oco do Fogo-Fátuo', 'Wisp Hollow', 'Campos do Bastião', 'bone_dust_remains'),
    ('lich_dust', 'Pó de Lich', 'Lich Dust', 'bone_dust', dict(hue=0.33, sat=0.7, light=-0.05), 70,
     'lich_crypt', 'Cripta do Lich', 'Lich Crypt', 'Cemitério Velho', 'spectral_tear_tomb'),
    ('wraith_essence', 'Essência de Aparição', 'Wraith Essence', 'spectral_tear', dict(hue=0.45, sat=0.6, light=0.12), 80,
     'wraith_marsh', 'Pântano das Aparições', 'Wraith Marsh', 'Vale dos Pesadelos', 'spectral_tear_tomb'),
    ('demon_ash', 'Cinza Demoníaca', 'Demon Ash', 'elemental_dust', dict(hue=0.0, sat=1.3, light=-0.05), 90,
     'demon_pyre', 'Pira Demoníaca', 'Demon Pyre', 'Abismo Infernal', 'ancient_ash_pyre'),
    ('void_soul', 'Alma do Vazio', 'Void Soul', 'abyssal_soul', dict(hue=0.78, sat=1.2, light=-0.05), 100,
     'void_well', 'Poço do Vazio', 'Void Well', 'Coração do Vazio', 'abyssal_soul_rift'),
    ('star_soul', 'Alma Estelar', 'Star Soul', 'spectral_tear', dict(hue=0.14, sat=0.8, light=0.15), 110,
     'star_grave', 'Túmulo Estelar', 'Star Grave', 'Picos Celestes', 'abyssal_soul_rift'),
    ('primordial_soul', 'Alma Primordial', 'Primordial Soul', 'dark_essence', dict(hue=0.9, sat=1.3, light=-0.04), 120,
     'primordial_ossuary', 'Ossário Primordial', 'Primordial Ossuary', 'Coração do Vazio', 'ancient_ash_pyre'),
]
for sid, name, en_name, src, kw, lv, nid, nname, nen, region, alias in SOULS:
    item(sid, name, en_name, src, kw, value=round(lv * 0.6))
    node('soulreaping', nid, nname, nen, region, lv, sid, alias)
SOUL_TIER = ['lich_dust', 'wraith_essence', 'demon_ash', 'void_soul', 'star_soul', 'primordial_soul']


# ════════════════════════ CRIAÇÃO ════════════════════════
def smith_interval(lv): return 7000 + 500 * max(0, (lv - 55) // 15)
def craft_interval(lv): return 5000 + 1000 * (lv // 20)

# Barras de prata e ouro (joias)
item('silver_bar', 'Barra de Prata', 'Silver Bar', 'adamant_bar', dict(sat=0.12, light=0.2))
item('gold_bar', 'Barra de Ouro', 'Gold Bar', 'adamant_bar', dict(hue=0.12, sat=1.6, light=0.08))
recipe('smithing', 'silver_bar', 'Barra de Prata', 20, {'silver_ore': 1}, 'silver_bar', 20, 4000)
recipe('smithing', 'gold_bar', 'Barra de Ouro', 35, {'gold_ore': 1, 'coal': 1}, 'gold_bar', 32, 5000)

# Forja: um conjunto por metal novo (o combate de 70 a 160), no nível dos itens de quest e lendários
# (ataque, elemento, crítico, vida/mana por vocação). Em troca, as receitas pedem barras, almas e gemas.
ATK = [36, 40, 44, 52, 64, 71]
ELEM = [('water', 9), ('fire', 10), ('holy', 11), ('earth', 12), ('energy', 13), ('death', 14)]
ARMOR = [(36, 170), (37, 180), (38, 190), (40, 205), (42, 220), (44, 240)]
HELM = [(22, 110, 4), (23, 120, 4), (24, 130, 5), (26, 145, 5), (28, 160, 6), (30, 175, 6)]
LEGS = [(24, 120, 2), (25, 130, 3), (26, 140, 3), (28, 155, 3), (30, 170, 4), (32, 185, 4)]
BOOTS = [(13, 90, 3), (14, 100, 3), (15, 110, 4), (16, 125, 4), (17, 140, 5), (18, 155, 5)]
SHIELD = [(33, 100), (34, 115), (35, 130), (37, 145), (39, 160), (41, 180)]
def elem(k): return {'element': ELEM[k][0], 'elementAttack': ELEM[k][1]}
PIECES = [  # parte, nome, inglês, gênero (0 masc., 1 fem., 2 plural), barras, nível a mais, ícone base, extras da receita
    ('sword', 'Espada', 'Sword', 1, 2, 0, 'adamant_sword', {'soul': 2, 'gem_ruby': 1}),
    ('mace', 'Maça', 'Mace', 1, 2, 0, 'adamant_mace', {'soul': 2, 'gem_ruby': 1}),
    ('axe', 'Machado', 'Axe', 0, 3, 1, 'adamant_axe', {'soul': 2, 'gem_ruby': 1}),
    ('helmet', 'Elmo', 'Helmet', 0, 2, 1, 'adamant_helmet', {'soul': 1}),
    ('boots', 'Botas', 'Boots', 2, 2, 2, 'adamant_boots', {'soul': 1}),
    ('shield', 'Escudo', 'Shield', 0, 3, 2, 'adamant_shield', {'soul': 1, 'gem_diamond': 1}),
    ('legs', 'Calças', 'Legs', 2, 4, 3, 'adamant_legs', {'soul': 2, 'gem_diamond': 1}),
    ('armor', 'Armadura', 'Armor', 1, 6, 4, 'adamant_armor', {'soul': 3, 'gem_diamond': 1}),
]
def extras(spec, k):
    return {(SOUL_TIER[k] if key == 'soul' else key): qty for key, qty in spec.items()}
for k, (mid, mname, adj, men, hue, light, bar_lv, combat) in enumerate(METALS):
    bar = f'{mid}_bar'
    bar_name = f'Barra {adj[1]}'
    item(bar, bar_name, f'{men} Bar', 'adamant_bar', dict(hue=hue, sat=1.5, light=light))
    recipe('smithing', bar, bar_name, bar_lv, {f'{mid}_ore': 1, 'coal': 4 + k // 2}, bar, round(bar_lv * 0.85), smith_interval(bar_lv))
    for part, pname, pen, gender, bars, plus, src, more in PIECES:
        eq = {'slot': 'weapon' if part in ('sword', 'mace', 'axe') else part, 'level': combat}
        if part == 'sword': eq.update(attack=ATK[k], **elem(k), hp=60 + 10 * k, crit=round(0.06 + 0.004 * k, 3), vocations=['warrior'])
        elif part == 'mace': eq.update(attack=ATK[k] - 1, **elem(k), defense=6 + 2 * k, hp=65 + 10 * k, vocations=['devout'])
        elif part == 'axe': eq.update(attack=ATK[k] + 2, **elem(k), lifesteal=round(0.05 + 0.004 * k, 3), vocations=['warrior'])
        elif part == 'armor': eq.update(defense=ARMOR[k][0], hp=ARMOR[k][1], vocations=['warrior'])
        elif part == 'helmet': eq.update(defense=HELM[k][0], hp=HELM[k][1], attack=HELM[k][2], vocations=['warrior'])
        elif part == 'legs': eq.update(defense=LEGS[k][0], hp=LEGS[k][1], attack=LEGS[k][2], vocations=['warrior'])
        elif part == 'boots': eq.update(defense=BOOTS[k][0], hp=BOOTS[k][1], attack=BOOTS[k][2])
        elif part == 'shield': eq.update(defense=SHIELD[k][0], hp=SHIELD[k][1])
        iid = f'{mid}_{part}'
        name = f'{pname} {adj[gender]}'
        item(iid, name, f'{men} {pen}', src, dict(hue=hue, sat=1.5, light=light), equip=eq)
        lv = min(120, bar_lv + plus)
        recipe('smithing', iid, name, lv, {bar: bars, **extras(more, k)}, iid, bars * round(lv * 1.75), smith_interval(lv))

# Artesanato: armas e grimórios das madeiras novas (6 níveis; o último junta a Árvore do Mundo e a alma primordial)
WOOD_TIERS = [  # tag, madeira, nível, nome (masc., fem.), inglês, matiz
    ('magic', 'magic', 72, ('Mágico', 'Mágica'), 'Magic', 0.55), ('ironwood', 'ironwood', 82, ('de Pau-ferro',) * 2, 'Ironwood', None),
    ('redwood', 'redwood', 92, ('de Sequoia',) * 2, 'Redwood', 0.98), ('spirit', 'spirit', 102, ('Espiritual',) * 2, 'Spirit', 0.45),
    ('worldtree', 'worldtree', 112, ('da Árvore do Mundo',) * 2, 'World Tree', 0.3), ('primal', 'worldtree', 118, ('Primordial',) * 2, 'Primordial', 0.86),
]
for k, (tag, wood, lv, wname, wen, hue) in enumerate(WOOD_TIERS):
    combat = METALS[k][7]
    kw = dict(hue=hue, sat=1.3) if hue is not None else dict(sat=0.2, light=-0.1)
    soul = {SOUL_TIER[k]: 4}
    weapons = [
        ('bow', f'Arco {wname[0]}', f'{wen} Bow', 'ancient_bow',
         {'slot': 'weapon', 'level': combat, 'attack': ATK[k], **elem(k), 'crit': round(0.09 + 0.004 * k, 3), 'vocations': ['hunter']},
         {f'{wood}_logs': 8, **soul, 'gem_ruby': 1}, 0, 1),
        ('staff', f'Cajado {wname[0]}', f'{wen} Staff', 'ancient_staff',
         {'slot': 'weapon', 'level': combat, 'attack': ATK[k] - 1, **elem(k), 'mana': round(0.28 + 0.02 * k, 2), 'crit': round(0.07 + 0.003 * k, 3), 'vocations': ['arcanist']},
         {f'{wood}_logs': 8, **soul, 'gem_sapphire': 1}, 0, 1),
        ('crossbow', f'Besta {wname[1]}', f'{wen} Crossbow', 'ancient_crossbow',
         {'slot': 'weapon', 'level': combat, 'attack': ATK[k] + 2, **elem(k), 'crit': round(0.08 + 0.004 * k, 3), 'vocations': ['hunter']},
         {f'{wood}_logs': 6, METALS[k][0] + '_bar': 2, **soul, 'gem_ruby': 1}, 1, 2),
        ('spellbook', f'Grimório {wname[0]}', f'{wen} Spellbook', 'dragon_spellbook',
         {'slot': 'shield', 'level': combat, 'defense': 16 + 2 * k, 'attack': 10 + k, 'hp': 40 + 10 * k, 'mana': round(0.22 + 0.02 * k, 2), 'vocations': ['arcanist']},
         {f'{wood}_logs': 6, 'spider_silk': 10, **soul, 'gem_sapphire': 1}, 1, 1),
    ]
    for part, name, en_name, src, eq, inputs, plus, xp_mult in weapons:
        if tag == 'primal': inputs = {**inputs, 'primordial_soul': inputs.get('primordial_soul', 0) + 2}
        iid = f'{tag}_{part}'
        item(iid, name, en_name, src, kw, equip=eq)
        rl = min(120, lv + plus)
        recipe('crafting', iid, name, rl, inputs, iid, round(rl * 2.1) * xp_mult, craft_interval(rl))

# Artesanato: couro (caçador) e manto (arcanista/devoto) depois do 60, com as almas como material especial
SETS = [  # tag, nome (masc. sing., plural), inglês, matiz, nível
    ('lich', ('do Lich', 'do Lich'), 'Lich', 0.33, 70), ('wraith', ('da Aparição', 'da Aparição'), 'Wraith', 0.55, 80),
    ('demon', ('Demoníaco', 'Demoníacas'), 'Demonic', 0.0, 90), ('deepvoid', ('do Vazio Profundo', 'do Vazio Profundo'), 'Deep Void', 0.78, 100),
    ('starlit', ('Estelar', 'Estelares'), 'Starlit', 0.6, 110), ('primal', ('Primordial', 'Primordiais'), 'Primordial', 0.9, 116),
]
LEATHER_PART = [('helmet', 'Capuz', 0, 'Hood', 1, 'dragon_leather_helmet'), ('armor', 'Gibão', 0, 'Jerkin', 3, 'dragon_leather_armor'), ('legs', 'Calças', 1, 'Legs', 2, 'dragon_leather_legs')]
ROBE_PART = [('helmet', 'Chapéu', 0, 'Hat', 1, 'dragon_robe_helmet'), ('armor', 'Manto', 0, 'Robe', 3, 'dragon_robe_armor'), ('legs', 'Calças', 1, 'Legs', 2, 'dragon_robe_legs')]
for k, (tag, sname, sen, hue, set_lv) in enumerate(SETS):
    combat = METALS[k][7]
    soul = SOUL_TIER[k]
    for kind, parts, voc in (('leather', LEATHER_PART, ['hunter']), ('robe', ROBE_PART, ['arcanist'])):
        for p, pname, plural, pen, size, src in parts:
            pl = {'armor': ARMOR, 'helmet': HELM, 'legs': LEGS}[p][k]
            if kind == 'leather':
                eq = {'slot': p, 'level': combat, 'vocations': voc, 'defense': max(1, round(pl[0] * 0.75)), 'hp': round(pl[1] * 0.85)}
                if p == 'armor': eq['crit'] = round(0.07 + 0.01 * k, 3); eq['attack'] = 3 + k
                else: eq['crit'] = round(0.035 + 0.005 * k, 3)
                if p == 'legs': eq['attack'] = 6 + k
                cloth = 'leather'
            else:
                eq = {'slot': p, 'level': combat, 'vocations': voc, 'defense': max(1, round(pl[0] * 0.6)), 'hp': round(pl[1] * 0.75)}
                if p == 'armor': eq['attack'] = 7 + k; eq['mana'] = round(0.32 + 0.03 * k, 2)
                elif p == 'helmet': eq['attack'] = 7 + k; eq['regen'] = round(0.22 + 0.02 * k, 2); eq['mana'] = round(0.09 + 0.01 * k, 2)
                else: eq['mana'] = round(0.16 + 0.02 * k, 2)
                cloth = 'spider_silk'
            iid = f'{tag}_{kind}_{p}'
            name = f'{pname} {sname[plural]}'
            if p == 'legs': name += ' (Couro)' if kind == 'leather' else ' (Manto)'
            item(iid, name, f'{sen} {"Leather" if kind == "leather" else "Robe"} {pen}', src, dict(hue=hue, sat=1.2, light=0.0 if kind == 'leather' else 0.04), equip=eq)
            rl = min(120, set_lv + size)
            recipe('crafting', iid, name, rl, {cloth: 2 * (4 + size + k), soul: 2 * (size + 1) + k // 2, **({'gem_emerald': 1} if p == 'armor' else {})}, iid, 20 + rl * size, craft_interval(rl))

# Forja: Vestes Sagradas do Devoto, o set próprio dele em todos os níveis (os 5 metais antigos e os 6 do rework).
# Entre a placa e o manto: um pouco menos de defesa que a placa, a mesma vida, mais regeneração e mana.
DEVOUT_PART = [('helmet', 'Mitra', 0, 'Mitre', 1), ('armor', 'Cota Sagrada', 1, 'Holy Mail', 3), ('legs', 'Calças Sagradas', 2, 'Holy Legs', 2)]
OLD_METALS = [  # id, adjetivo (masc., fem., plural), inglês, erva sagrada da receita
    ('iron', ('de Ferro',) * 3, 'Iron', 'green_herb'), ('steel', ('de Aço',) * 3, 'Steel', 'golden_root'),
    ('mithril', ('de Mithril',) * 3, 'Mithril', 'golden_root'), ('abyssal', ('Abissal', 'Abissal', 'Abissais'), 'Abyssal', 'blood_flower'),
    ('adamant', ('de Adamantita',) * 3, 'Adamantite', 'moon_clover'),
]
plate_recipes = {r['output']: r for r in recipes_by_skill['smithing']}
for k, (mid, adj, men, herb) in enumerate(OLD_METALS):
    for p, pname, gender, pen, size in DEVOUT_PART:
        base_eq = byid[f'{mid}_{p}']['equip']
        eq = {'slot': p, 'level': base_eq['level'], 'vocations': ['devout'], 'defense': max(1, round(base_eq['defense'] * 0.85))}
        eq['hp'] = (base_eq.get('hp') or 0) + 10 + 5 * k
        if p == 'armor': eq['regen'] = round(0.03 + 0.01 * k, 2); eq['mana'] = round(0.04 + 0.02 * k, 2)
        elif p == 'helmet': eq['attack'] = 1 + k // 2; eq['regen'] = round(0.02 + 0.01 * k, 2)
        else: eq['mana'] = round(0.03 + 0.01 * k, 2)
        iid = f'{mid}_holy_{p}'
        name = f'{pname} {adj[gender]}'
        item(iid, name, f'{men} {pen}', f'{mid}_{p}', dict(hue=0.13, sat=0.9, light=0.12), equip=eq)
        pr = plate_recipes[f'{mid}_{p}']
        lv = min(120, pr['level'] + 1)
        recipe('smithing', iid, name, lv, {**pr['inputs'], herb: size + 1}, iid, pr['xp'] + 5 * size, pr['intervalMs'])
for k, (mid, mname, adj, men, hue, light, bar_lv, combat) in enumerate(METALS):
    for p, pname, gender, pen, size in DEVOUT_PART:
        pl = {'armor': ARMOR, 'helmet': HELM, 'legs': LEGS}[p][k]
        eq = {'slot': p, 'level': combat, 'vocations': ['devout'], 'defense': max(1, round(pl[0] * 0.85)), 'hp': pl[1]}
        if p == 'armor': eq['regen'] = round(0.08 + 0.01 * k, 2); eq['mana'] = round(0.14 + 0.02 * k, 2)
        elif p == 'helmet': eq['attack'] = pl[2]; eq['regen'] = round(0.06 + 0.01 * k, 2); eq['mana'] = round(0.06 + 0.01 * k, 2)
        else: eq['attack'] = pl[2]; eq['mana'] = round(0.08 + 0.01 * k, 2)
        iid = f'{mid}_holy_{p}'
        name = f'{pname} {adj[gender]}'
        item(iid, name, f'{men} {pen}', f'{mid}_{p}', dict(hue=0.13, sat=0.9, light=0.12), equip=eq)
        bars = {'helmet': 2, 'legs': 4, 'armor': 6}[p]
        more = {'helmet': {'soul': 1}, 'legs': {'soul': 2, 'gem_sapphire': 1}, 'armor': {'soul': 3, 'gem_sapphire': 1}}[p]
        lv = min(120, bar_lv + size + 1)
        recipe('smithing', iid, name, lv, {f'{mid}_bar': bars, **extras(more, k)}, iid, bars * round(lv * 1.75), smith_interval(lv))

# Ferramentas de profissão (Forja): 5 tipos x 11 metais, do bronze ao primordial. Valem do depósito:
# a melhor que você tem e pode usar acelera a coleta (+4% por metal) e dá XP a partir do ferro (+1% por metal).
TOOL_METALS = [  # id, adjetivo (masc., fem.), inglês, matiz, brilho, nível, tora do cabo
    ('bronze', ('de Bronze', 'de Bronze'), 'Bronze', 0.07, -0.05, 1, 'logs'),
    ('iron', ('de Ferro', 'de Ferro'), 'Iron', None, -0.02, 15, 'logs'),
    ('steel', ('de Aço', 'de Aço'), 'Steel', None, 0.12, 30, 'oak_logs'),
    ('mithril', ('de Mithril', 'de Mithril'), 'Mithril', 0.6, 0.0, 40, 'willow_logs'),
    ('adamant', ('de Adamantita', 'de Adamantita'), 'Adamantite', 0.36, -0.05, 55, 'yew_logs'),
] + [(m[0], (m[2][0], m[2][1]), m[3], m[4], m[5], m[6], w) for m, w in zip(METALS, ['ancient_logs', 'magic_logs', 'ironwood_logs', 'redwood_logs', 'spirit_logs', 'worldtree_logs'])]
TOOL_TYPES = [  # profissão, tag, nome, gênero (0 masc., 1 fem.), inglês, ícone base
    ('mining', 'pickaxe', 'Picareta', 1, 'Pickaxe', 'skill_mining'),
    ('woodcutting', 'hatchet', 'Machadinha', 1, 'Hatchet', 'skill_woodcutting'),
    ('fishing', 'harpoon', 'Arpão', 0, 'Harpoon', 'kraken_harpoon'),
    ('herbalism', 'sickle', 'Foice', 1, 'Sickle', 'soul_scythe'),
    ('soulreaping', 'scythe', 'Gadanha', 1, 'Scythe', 'soul_scythe'),
]
for k, (mid, adj, men, hue, light, lv, logs) in enumerate(TOOL_METALS):
    bar = f'{mid}_bar'
    for skill, tag, tname, gender, ten, src in TOOL_TYPES:
        iid = f'{mid}_{tag}'
        name = f'{tname} {adj[gender]}'
        kw = dict(hue=hue, sat=1.4, light=light) if hue is not None else dict(sat=0.12, light=light)
        item(iid, name, f'{men} {ten}', src, kw, tool={'skill': skill, 'level': lv, 'speed': round(0.04 * (k + 1), 2), 'xp': round(0.01 * k, 2)}, value=12 + lv * 6)
        rl = min(120, max(1, lv))
        recipe('smithing', iid, name, rl, {bar: 2, logs: 1}, iid, 2 * round(max(5, rl) * 1.5), smith_interval(rl) if rl >= 55 else 4000 + 500 * (rl // 20))

# Roupas de profissão: caem enquanto treina (uma peça a cada ~3000 ações); cada peça dá +2% de XP, as 4 juntas +10%.
OUTFITS = [  # grupo, nome do conjunto, inglês, matiz, peças (cabeça, corpo, pernas, pés)
    ('mining', 'de Garimpeiro', 'Prospector', 0.08, ('Capacete', 'Camisa', 'Calças', 'Botas')),
    ('woodcutting', 'de Lenhador', 'Lumberjack', 0.0, ('Gorro', 'Camisa', 'Calças', 'Botas')),
    ('fishing', 'de Pescador', 'Angler', 0.55, ('Chapéu', 'Colete', 'Calças', 'Botas')),
    ('herbalism', 'de Herborista', 'Herbalist', 0.33, ('Chapéu', 'Túnica', 'Calças', 'Sandálias')),
    ('soulreaping', 'do Ceifador', 'Reaper', 0.78, ('Capuz', 'Manto', 'Calças', 'Botas')),
    ('artisan', 'de Artesão', 'Artisan', 0.12, ('Boina', 'Avental', 'Calças', 'Botas')),
]
OUTFIT_SRC = {'head': 'linen_robe_helmet', 'body': 'linen_robe_armor', 'legs': 'linen_robe_legs', 'feet': 'leather_boots'}
OUTFIT_EN = {'head': 'Hat', 'body': 'Top', 'legs': 'Legs', 'feet': 'Boots'}
for group, sname, sen, hue, names in OUTFITS:
    for piece, pname in zip(('head', 'body', 'legs', 'feet'), names):
        iid = f'outfit_{group}_{piece}'
        item(iid, f'{pname} {sname}', f'{sen} {OUTFIT_EN[piece]}', OUTFIT_SRC[piece], dict(hue=hue, sat=1.1, light=0.04), outfit={'group': group, 'piece': piece}, value=2500)

# Artesanato: joias (prata, ouro e estelar) com as gemas
JEWEL_TIERS = [('silver_bar', 'de Prata', 'Silver', 30, 25), ('gold_bar', 'de Ouro', 'Gold', 60, 45), ('starmetal_bar', 'Estelar', 'Starlit', 110, 106)]
GEM_STATS = {  # (anel, colar) em cada nível de joia
    'gem_ruby': lambda t: ({'attack': [5, 9, 16][t], 'crit': [0.01, 0.02, 0.03][t]}, {'attack': [6, 10, 17][t], 'crit': [0.02, 0.03, 0.04][t]}),
    'gem_sapphire': lambda t: ({'mana': [0.05, 0.08, 0.12][t], 'defense': [2, 4, 8][t]}, {'mana': [0.08, 0.12, 0.18][t], 'defense': [3, 6, 12][t]}),
    'gem_emerald': lambda t: ({'regen': [0.04, 0.07, 0.11][t], 'hp': [20, 50, 100][t]}, {'regen': [0.05, 0.08, 0.12][t], 'hp': [30, 70, 130][t]}),
    'gem_diamond': lambda t: ({'defense': [4, 8, 14][t], 'hp': [25, 55, 110][t]}, {'defense': [5, 10, 16][t], 'hp': [35, 75, 140][t]}),
}
GEM_WORD = {'gem_ruby': ('Rubi', 'Ruby', 0.0), 'gem_sapphire': ('Safira', 'Sapphire', 0.6), 'gem_emerald': ('Esmeralda', 'Emerald', 0.36), 'gem_diamond': ('Diamante', 'Diamond', None)}
for t, (bar, suf, suf_en, combat, lv) in enumerate(JEWEL_TIERS):
    for gi, (g, (gpt, gen, ghue)) in enumerate(GEM_WORD.items()):
        ring, amulet = GEM_STATS[g](t)
        kw = dict(hue=ghue, sat=1.4) if ghue is not None else dict(sat=0.1, light=0.2)
        for slot, word, word_en, stats, src, plus, gems in (('ring', 'Anel', 'Ring', ring, 'iron_ring', 0, 1), ('amulet', 'Colar', 'Necklace', amulet, 'silver_necklace', 2, 2)):
            iid = f'{bar.replace("_bar", "")}_{g.replace("gem_", "")}_{slot}'
            name = f'{word} {suf} com {gpt}'
            item(iid, name, f'{suf_en} {gen} {word_en}', src, kw, equip={'slot': slot, 'level': combat, **stats})
            rl = min(120, lv + plus + gi)
            recipe('crafting', iid, name, rl, {bar: 1 + (slot == 'amulet'), g: gems}, iid, round(rl * 1.8) * (1 + (slot == 'amulet')), craft_interval(rl))

# Flechas: hastes das madeiras novas e flechas dos metais novos
SHAFTS = [('maple', 'Bordo', 25, 20), ('mahogany', 'Mogno', 38, 25), ('magic', 'Mágica', 70, 30), ('ironwood', 'Pau-ferro', 80, 35),
          ('redwood', 'Sequoia', 90, 40), ('spirit', 'Espiritual', 100, 45), ('worldtree', 'Árvore do Mundo', 112, 50)]
for wood, wpt, lv, qty in SHAFTS:
    recipe('fletching', f'make_arrow_shaft_{wood}', f'Hastes ({wpt})', lv, {f'{wood}_logs': 1}, 'arrow_shaft', round(lv * 0.35) + 5, 2000, qty)
ARROWS = [  # multiplicador, elemento, respingo, nível (na ordem de METALS)
    (1.35, None, 0, 72), (1.45, None, 0.1, 82), (1.55, 'holy', 0.1, 92), (1.65, 'fire', 0.2, 102), (1.75, 'energy', 0.2, 110), (1.9, None, 0.3, 118),
]
for k, (mult, element, splash, lv) in enumerate(ARROWS):
    mid, _, adj, men, hue, light, _, _ = METALS[k]
    arrow = {'mult': mult}
    if element: arrow['element'] = element
    if splash: arrow['splash'] = splash
    item(f'{mid}_arrow', f'Flecha {adj[1]}', f'{men} Arrow', 'mithril_arrow', dict(hue=hue, sat=1.5, light=light), arrow=arrow, value=round(lv * 0.5))
    recipe('fletching', f'craft_{mid}_arrow', f'Flechas {adj[2]}', lv, {'arrow_shaft': 15, 'feather': 15, f'{mid}_bar': 1}, f'{mid}_arrow', round(lv * 1.8), 4000 + 500 * (lv // 30), 15)

# Culinária: pratos combinados (ingredientes de mais de uma profissão, bônus mais fortes)
COMBOS = [
    ('trout_pie', 'Torta de Truta', 'Trout Pie', 'cooked_trout', 18, {'raw_trout': 2, 'green_herb': 1}, ('combat_xp', 0.07)),
    ('lobster_stew', 'Ensopado de Lagosta', 'Lobster Stew', 'cooked_lobster', 40, {'raw_lobster': 1, 'raw_crab': 1, 'golden_root': 1}, ('profession_xp', 0.15)),
    ('sea_chowder', 'Caldeirada do Mar', 'Sea Chowder', 'cooked_tuna', 58, {'raw_tuna': 1, 'raw_swordfish': 1, 'mint_leaf': 2}, ('loot', 0.18)),
    ('hunter_feast', 'Banquete do Caçador', "Hunter's Feast", 'cooked_shark', 78, {'raw_shark': 1, 'raw_monkfish': 1, 'moon_clover': 1}, ('combat_xp', 0.12)),
    ('dragonfish_pie', 'Torta de Peixe-dragão', 'Dragonfish Pie', 'cooked_shark', 98, {'raw_dragonfish': 1, 'fire_lotus': 1}, ('crit_chance', 0.1)),
    ('royal_feast', 'Banquete Real', 'Royal Feast', 'cooked_salmon', 112, {'raw_serpent': 1, 'raw_dark_crab': 1, 'star_moss': 1}, ('all_xp_loot', 0.2)),
    ('celestial_feast', 'Festim Celestial', 'Celestial Feast', 'cooked_salmon', 120, {'raw_manta': 1, 'celestial_lily': 1, 'dragon_thistle': 1}, ('all_xp_loot', 0.25)),
]
for cid, name, en_name, src, lv, inputs, (buff, value) in COMBOS:
    item(cid, name, en_name, src, dict(hue=0.13, sat=1.3, light=0.06) if 'feast' in cid else dict(shift=0.08, light=0.05), meal={'buff': buff, 'value': value})
    recipe('cooking', f'cook_{cid}', name, lv, inputs, cid, round(lv * 2.6), 4500 + 500 * (lv // 40))

# Alquimia: poções até o 120
POTIONS = [
    ('mint_tonic', 'Tônico de Hortelã', 'Mint Tonic', 'health_potion', dict(hue=0.42, sat=1.2), 8, {'mint_leaf': 2, 'wisp_ember': 1}, {'food': 160}),
    ('spectral_elixir', 'Elixir Espectral', 'Spectral Elixir', 'fury_elixir', dict(hue=0.5, sat=0.9), 70, {'ghost_bloom': 2, 'lich_dust': 1}, {'potion': {'attack': 0.25}}),
    ('colossal_health_potion', 'Poção Colossal de Vida', 'Colossal Health Potion', 'supreme_health_potion', dict(shift=0.05, light=0.04), 75, {'ghost_bloom': 2, 'mint_leaf': 1}, {'food': 700}),
    ('colossal_mana_potion', 'Poção Colossal de Mana', 'Colossal Mana Potion', 'great_mana_potion', dict(shift=0.05, light=0.04), 80, {'fire_lotus': 1, 'ghost_bloom': 1}, {'manaPotion': 500, 'value': 160}),
    ('bulwark_elixir', 'Elixir do Baluarte', 'Bulwark Elixir', 'iron_elixir', dict(hue=0.58, sat=0.8), 88, {'fire_lotus': 2, 'wraith_essence': 1}, {'potion': {'defense': 0.4}}),
    ('blazing_fury_elixir', 'Elixir da Fúria Ardente', 'Blazing Fury Elixir', 'fury_elixir', dict(hue=0.04, sat=1.4), 95, {'void_orchid': 1, 'fire_lotus': 1, 'demon_ash': 1}, {'potion': {'attack': 0.3}}),
    ('divine_health_potion', 'Poção Divina de Vida', 'Divine Health Potion', 'supreme_health_potion', dict(hue=0.13, sat=1.2, light=0.08), 100, {'star_moss': 2, 'void_orchid': 1}, {'food': 1000}),
    ('divine_mana_potion', 'Poção Divina de Mana', 'Divine Mana Potion', 'great_mana_potion', dict(hue=0.13, sat=1.2, light=0.08), 105, {'star_moss': 1, 'void_orchid': 1, 'void_soul': 1}, {'manaPotion': 700, 'value': 240}),
    ('dragon_elixir', 'Elixir do Dragão', 'Dragon Elixir', 'fury_elixir', dict(hue=0.0, sat=1.5, light=-0.05), 112, {'dragon_thistle': 2, 'star_soul': 1}, {'potion': {'attack': 0.35}}),
    ('celestial_health_potion', 'Poção Celestial de Vida', 'Celestial Health Potion', 'supreme_health_potion', dict(hue=0.15, sat=0.6, light=0.18), 118, {'celestial_lily': 2, 'dragon_thistle': 1}, {'food': 1400}),
    ('celestial_mana_potion', 'Poção Celestial de Mana', 'Celestial Mana Potion', 'great_mana_potion', dict(hue=0.15, sat=0.6, light=0.18), 120, {'celestial_lily': 1, 'star_moss': 1, 'primordial_soul': 1}, {'manaPotion': 950, 'value': 330}),
]
for pid, name, en_name, src, kw, lv, inputs, fields in POTIONS:
    item(pid, name, en_name, src, kw, **fields)
    recipe('alchemy', f'brew_{pid}', name, lv, inputs, pid, round(lv * 3.6), 5000 + 500 * (lv // 20))


# ════════════════════════ CONFERÊNCIA E GRAVAÇÃO ════════════════════════
known = set(byid)
for skill, lst in recipes_by_skill.items():
    for r in lst:
        for i in list(r['inputs']) + [r['output']]:
            assert i in known, f'{skill}/{r["id"]}: item {i} não existe'
for skill, lst in nodes_by_skill.items():
    for n in lst:
        assert n['item'] in known, f'{skill}/{n["id"]}: {n["item"]}'
        for d in n.get('drops', []): assert d['item'] in known
# Todo material novo coletado tem que servir para alguma receita.
used = {i for lst in recipes_by_skill.values() for r in lst for i in r['inputs']}
for skill, lst in nodes_by_skill.items():
    for n in lst:
        if n['id'] in node_en:
            for i in [n['item']] + [d['item'] for d in n.get('drops', [])]:
                assert i in used, f'{i} (de {n["id"]}) não é usado em nenhuma receita'

save('items.json', items)
for s, lst in nodes_by_skill.items(): save(s + '.json', sorted(lst, key=lambda n: n['level']))  # estável: os de mesmo nível ficam na ordem de antes
for s, lst in recipes_by_skill.items(): save(s + '.json', lst)
write_text(I18N_ITEMS, json.dumps(en, ensure_ascii=False, indent=2) + '\n', read_text(I18N_ITEMS))

# node.* no i18n.ts (o português na 1ª ocorrência da âncora, o inglês na 2ª)
ts_orig = read_text(I18N_TS)
ts = ts_orig.replace('\r\n', '\n')
ts = re.sub(r"\n    'node\.(?:" + '|'.join(node_en) + r")': '(?:[^'\\]|\\.)*',", '', ts)  # tira versões antigas (idempotente)
parts = re.split(r"(\n    'node\.abyssal_soul_rift': '[^']*',)", ts)
assert len(parts) == 5, 'âncora node.abyssal_soul_rift não encontrada duas vezes'
esc = lambda s: s.replace("'", "\\'")
pt_lines = ''.join(f"\n    'node.{nid}': '{esc(v[0])}'," for nid, v in node_en.items())
en_lines = ''.join(f"\n    'node.{nid}': '{esc(v[1])}'," for nid, v in node_en.items())
ts = parts[0] + parts[1] + pt_lines + parts[2] + parts[3] + en_lines + parts[4]
write_text(I18N_TS, ts, ts_orig)

# Cenários: cada ponto novo usa o mapa de um ponto parecido (o bloco é refeito a cada rodada)
COMMENT = '\n  // Rework de profissões: pontos novos usam o cenário de um ponto parecido.'
mp_orig = read_text(MAP_TS)
mp = mp_orig.replace('\r\n', '\n')
mp = re.sub(re.escape(COMMENT) + r"(?:\n  \w+: \(\) => GATHER\.\w+\(\),)+", '', mp)
start = mp.index('const GATHER: Record<string, () => WorldMap> = {')
end = mp.index('\n};\n', start)
mp = mp[:end] + COMMENT + ''.join(f'\n  {nid}: () => GATHER.{alias}(),' for nid, alias in map_alias.items()) + mp[end:]
write_text(MAP_TS, mp, mp_orig)

print(f'itens novos/atualizados: {len(new_ids)}; pontos de coleta: {len(node_en)}')
for s, lst in nodes_by_skill.items(): print(f'  {s}: {len(lst)} pontos, até o nível {max(n["level"] for n in lst)}')
for s, lst in recipes_by_skill.items(): print(f'  {s}: {len(lst)} receitas, até o nível {max(r["level"] for r in lst)}')
