# Fase 2 do 250 ao 325, região 3: o Palácio das Asuras (300-325), as dançarinas de pele pintada
# que guardam o trono da Rainha. Três caçadas (305 XP, 313 balanceada, 321 loot), a instância da
# Câmara da Rainha (315, com chave: a Guardiã Asura e a Rainha Asura) e o covil do Trono Asura (325,
# aba Chefes). Mesma curva das Catacumbas (gen_forgotten_catacombs.py), com a XP cortada igual.
# Chefes do 130+ com metade da XP (cut_boss_xp_130.py).
# Sprites: scripts/sprites_library_catacombs_asuras.py. Mapas: client/src/world/map.ts e WorldView.tsx.
# Uso: python scripts/data/gen_asura_palace.py   (idempotente; depois do gen_forgotten_catacombs.py e
# do set de drop do 300: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
import json, os, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'


def load(p): return json.load(open(p, encoding='utf8'))
def save(p, d):
    # Arquivo de um objeto por linha (crafting.json) continua assim.
    compact = open(p, encoding='utf8').read().replace('\r\n', '\n').startswith('[\n  {"')
    with open(p, 'w', encoding='utf8', newline='\n') as f:
        if compact: f.write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in d) + '\n]\n')
        else: json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')


def recolor(im, hue, sat=1.0, light=1.0):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            s = min(1, s * 1.6 * sat); s = 0.25 + s if s < 0.25 else s
            r2, g2, b2 = colorsys.hls_to_rgb(hue, min(1, l * light), s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im


REGION, REGION_EN = 'Palácio das Asuras', 'Asura Palace'
LAIR_REGION, LAIR_REGION_EN = 'Domínio das Asuras', 'Domain of the Asuras'
items = load(D + 'items.json'); by_item = {i['id']: i for i in items}
monsters = load(D + 'monsters.json'); by_mon = {m['id']: m for m in monsters}
hunts = load(D + 'hunts.json'); by_hunt = {h['id']: h for h in hunts}
smithing = load(D + 'smithing.json'); by_sm = {s['id']: s for s in smithing}
crafting = load(D + 'crafting.json'); by_cr = {c['id']: c for c in crafting}
i18n_items = load(I18N_ITEMS); i18n_content = load(I18N_CONTENT)
base = by_mon['chaos_avatar']
gold = next(l for l in base['loot'] if l['item'] == 'gold')


def put(lst, by, obj):
    if obj['id'] in by: by[obj['id']].clear(); by[obj['id']].update(obj)
    else: lst.append(obj); by[obj['id']] = obj


# ── Material e chave ──────────────────────────────────────────────────────────
recolor(Image.open(ICONS + 'ash_ember.png'), 0.9, 0.9, 1.0).save(ICONS + 'asura_ember.png')
put(items, by_item, {'id': 'asura_ember', 'name': 'Brasa Asura', 'icon': 'asura_ember', 'value': round(by_item['chaos_fragment']['value'] * 4.4)})
i18n_items['Brasa Asura'] = 'Asura Ember'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.12, 0.7, 1.0).save(ICONS + 'asura_key.png')
put(items, by_item, {'id': 'asura_key', 'name': 'Chave da Câmara Asura', 'icon': 'asura_key'})
i18n_items['Chave da Câmara Asura'] = 'Asura Chamber Key'
put(smithing, by_sm, {'id': 'asura_key', 'name': 'Chave da Câmara Asura', 'level': 120, 'intervalMs': 12000, 'xp': 24000,
                      'inputs': {'adamant_bar': 4, 'asura_ember': 6, 'cursed_bone': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'asura_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# Simulado (17/10) com o corte das Catacumbas (0,27), dava 1,3x a 1,8x a XP/h das caçadas do 255 e do 280
# (as Asuras morrem mais rápido). Com 0,16 a caçada de XP fica ~1,05x a do 280, a balanceada ~0,95x e a de loot ~0,8x.
XP_SCALE = 0.16


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


EMBER = lambda c: {'item': 'asura_ember', 'chance': c}
KEY = {'item': 'asura_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
mon('dawnfire_asura', 'Asura da Aurora', 'Dawnfire Asura', 305, 1100, ['water', 'death'], ['fire', 'holy'], [EMBER(0.2), FRAG], hp_m=0.9)
mon('dawnfire_dancer', 'Dançarina da Aurora', 'Dawnfire Dancer', 305, 1000, ['water'], ['fire'], [EMBER(0.2), FRAG, KEY], hp_m=0.85, atk_m=1.05, sprite='dawnfire_asura')
mon('midnight_asura', 'Asura da Meia-Noite', 'Midnight Asura', 309, 1150, ['holy'], ['death', 'energy'], [EMBER(0.22), FRAG], hp_m=0.92, atk_m=1.06)
mon('midnight_stalker', 'Espreitadora da Meia-Noite', 'Midnight Stalker', 311, 1050, ['holy'], ['death', 'physical'], [EMBER(0.22), FRAG, KEY], hp_m=0.95, atk_m=1.08, sprite='midnight_asura')
mon('frost_asura', 'Asura do Gelo', 'Frost Asura', 313, 1250, ['fire', 'energy'], ['water', 'earth'], [EMBER(0.25), FRAG], hp_m=1.1)
mon('frost_maiden', 'Donzela do Gelo', 'Frost Maiden', 313, 1150, ['fire'], ['water', 'death'], [EMBER(0.24), FRAG], hp_m=0.98, atk_m=1.06, sprite='frost_asura')
mon('true_asura', 'Asura Verdadeira', 'True Asura', 319, 1150, ['holy', 'energy'], ['fire', 'death'], [EMBER(0.28), FRAG, KEY], hp_m=0.95, atk_m=1.06)
mon('asura_sentinel', 'Sentinela Asura', 'Asura Sentinel', 319, 1300, ['death'], ['holy', 'physical'], [EMBER(0.28), FRAG, KEY], hp_m=1.12, atk_m=0.98, sprite='asura_guardian')
mon('asura_matriarch', 'Matriarca Asura', 'Asura Matriarch', 321, 1250, ['holy', 'water'], ['fire', 'death'],
    [EMBER(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.15, atk_m=1.05, sprite='true_asura')


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das Catacumbas.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop300_sword', 'chance': 0.05}, {'item': 'drop300_bow', 'chance': 0.05},
              {'item': 'drop300_staff', 'chance': 0.05}, {'item': 'drop300_mace', 'chance': 0.05}]
mon('asura_guardian', 'Guardiã Asura', 'Asura Guardian', 315, 1300, ['death'], ['holy', 'physical'],
    [EMBER(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=3.5, gold_m=4, tiers=inst(315))
mon('asura_queen', 'Rainha Asura', 'Asura Queen', 315, 1250, ['holy'], ['fire', 'death', 'energy'],
    [{'item': 'asura_ember', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=7, gold_m=8, tiers=inst(315))
# Covil (aba Chefes): a Rainha no trono, 14x a XP da chefe da instância (com o corte de XP, para pagar um
# pouco mais que a Tumba do Rei do 300).
mon('asura_queen_enthroned', 'Rainha Asura Entronada', 'Enthroned Asura Queen', 325, 1200, ['holy'], ['fire', 'death', 'energy'],
    [{'item': 'asura_ember', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=98, gold_m=20, tiers=inst(325), sprite='asura_queen')

# Ajuste dos chefes (vida, ataque), na proporção dos das Catacumbas; o covil calibrado no sim_lairs.ts.
BOSS_TUNE = {'asura_guardian': (0.32, 0.47), 'asura_queen': (0.26, 0.43), 'asura_queen_enthroned': (0.065, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'dawnfire_terrace', 'name': 'Terraço da Aurora', 'en': 'Dawnfire Terrace', 'level': 305,
     'monsters': ['dawnfire_asura', 'dawnfire_dancer', 'midnight_asura'], 'focus': 'xp'},
    {'id': 'frozen_gardens', 'name': 'Jardins Gelados', 'en': 'Frozen Gardens', 'level': 313,
     'monsters': ['midnight_stalker', 'frost_asura', 'frost_maiden'], 'focus': 'balanced'},
    {'id': 'true_asura_court', 'name': 'Corte das Asuras Verdadeiras', 'en': 'Court of the True Asuras', 'level': 321,
     'monsters': ['true_asura', 'asura_sentinel', 'asura_matriarch'], 'focus': 'loot'},
    {'id': 'queens_chamber', 'name': 'Câmara da Rainha', 'en': "Queen's Chamber", 'level': 315, 'monsters': ['asura_guardian', 'asura_queen'],
     'boss': True, 'key': 'asura_key', 'trash': ['dawnfire_dancer', 'frost_asura', 'true_asura']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'asura_throne', 'name': 'Trono Asura', 'region': LAIR_REGION, 'level': 325, 'monsters': ['asura_queen_enthroned'], 'lair': True})
i18n_content['Trono Asura'] = 'Asura Throne'
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do Rei Sepulto (300) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 300.
LAIR_MULT, LAIR_HUE = 1.12, 0.12


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('da Rainha Asura', 'of the Asura Queen')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'asura_throne_{slot}', by_item[f'drop300_{slot}'], by_item[f'kings_tomb_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 18000, 'equip': up(f['equip'], 1.08, 325)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('asura_tiara', 'Tiara Asura', 'Asura Tiara', 'halo_shard'),
         ('queens_veil', 'Véu da Rainha', "Queen's Veil", 'void_shard'),
         ('dancers_bell', 'Guizo da Dançarina', "Dancer's Bell", 'infernal_core')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 12000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'asura_ember': 10}, 'crafting': {'worldtree_logs': 6, 'asura_ember': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'asura_throne_{w}', by_item[f'drop300_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 325); eq['vocations'] = [voc]; eq['element'] = 'fire'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 55000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 8500,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'asura_throne_{w}']
    rid = f'replica_asura_throne_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 27500, 'equip': up(o['equip'], 0.8, 325)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'kings_tomb_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'asura_throne_pouch.png')
put(items, by_item, {'id': 'asura_throne_pouch', 'name': 'Bolsa de Armas da Rainha Asura', 'icon': 'asura_throne_pouch', 'legendary': True,
                     'pouch': True, 'value': 55000, 'pool': pool})
i18n_items['Bolsa de Armas da Rainha Asura'] = "Asura Queen's Weapon Pouch"
boss = by_mon['asura_queen_enthroned']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('asura_throne_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'asura_throne_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
