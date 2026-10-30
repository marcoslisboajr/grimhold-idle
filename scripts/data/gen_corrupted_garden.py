# Fase 3 do 325 ao 500, região 3: o Jardim Corrompido (375-400), um jardim antigo apodrecido por esporos, com
# pinhas vivas, golems de musgo, cactos e fantasmas-lanterna. Três caçadas (380 XP, 388 balanceada, 396 loot),
# a instância do Coração do Jardim (390, com chave: a Mãe dos Esporos e o Guardião da Lanterna) e o covil do Oco
# da Árvore do Fim (400, aba Chefes). Mesmo molde do Vale Primevo (gen_primeval_valley.py); plano em
# docs/PLANO_325_500.md. Sprites: scripts/sprites_corrupted_garden.py. Mapas: client/src/world/map.ts e WorldView.tsx.
# Uso: python scripts/data/gen_corrupted_garden.py   (idempotente; depois do gen_primeval_valley.py e do set de
# drop do 375: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
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


REGION, REGION_EN = 'Jardim Corrompido', 'Corrupted Garden'
LAIR_REGION, LAIR_REGION_EN = 'Raízes do Fim', 'Roots of the End'
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
recolor(Image.open(ICONS + 'crystal_heart.png'), 0.8, 1.0, 0.85).save(ICONS + 'rot_spore.png')
put(items, by_item, {'id': 'rot_spore', 'name': 'Esporo Podre', 'icon': 'rot_spore', 'value': round(by_item['fossil_amber']['value'] * 1.15)})
i18n_items['Esporo Podre'] = 'Rotten Spore'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.8, 0.9, 1.0).save(ICONS + 'garden_key.png')
put(items, by_item, {'id': 'garden_key', 'name': 'Chave do Coração do Jardim', 'icon': 'garden_key'})
i18n_items['Chave do Coração do Jardim'] = 'Garden Heart Key'
put(smithing, by_sm, {'id': 'garden_key', 'name': 'Chave do Coração do Jardim', 'level': 120, 'intervalMs': 12000, 'xp': 30000,
                      'inputs': {'adamant_bar': 4, 'rot_spore': 6, 'fossil_amber': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'garden_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# XP por monstro ~8% abaixo da do Vale Primevo, como pede a tabela do plano (o equipamento novo mata mais rápido).
XP_SCALE = float(os.environ.get('XP_SCALE', 0.05))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


SPORE = lambda c: {'item': 'rot_spore', 'chance': c}
KEY = {'item': 'garden_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
# Bosque das Pinhas (380, XP)
mon('raging_pinecoon', 'Pinha Raivosa', 'Raging Pinecoon', 380, 1000, ['fire'], ['earth'], [SPORE(0.2), FRAG], hp_m=0.85, atk_m=1.05)
mon('moss_golem', 'Golem de Musgo', 'Moss Golem', 380, 1400, ['fire'], ['earth', 'physical'], [SPORE(0.2), FRAG, KEY], hp_m=1.1, atk_m=0.98)
mon('wandering_lantern', 'Lanterna Errante', 'Wandering Lantern', 382, 1050, ['holy', 'earth'], ['death', 'energy'], [SPORE(0.22), FRAG], hp_m=0.9, atk_m=1.06)
# Estufa Assombrada (388, balanceada)
mon('thorn_cactus', 'Cacto Espinhento', 'Thorn Cactus', 388, 1300, ['fire'], ['earth', 'water'], [SPORE(0.25), FRAG], hp_m=1.12, atk_m=0.98)
mon('rotten_golem', 'Golem Podre', 'Rotten Golem', 388, 1400, ['fire', 'holy'], ['earth', 'death'], [SPORE(0.24), FRAG, KEY], hp_m=1.15, atk_m=1.0)
mon('thorn_pinecoon', 'Pinha Espinhenta', 'Thorn Pinecoon', 388, 1000, ['fire'], ['earth'], [SPORE(0.24), FRAG, {'item': 'worldtree_logs', 'chance': 0.3, 'min': 1, 'max': 3}], hp_m=0.9, atk_m=1.08)
# Raízes Podres (396, loot)
mon('blight_cactus', 'Cacto da Praga', 'Blight Cactus', 396, 1300, ['fire', 'holy'], ['earth', 'death'], [SPORE(0.3), FRAG, KEY], hp_m=1.15, atk_m=1.02)
mon('corrupted_lantern', 'Lanterna Corrompida', 'Corrupted Lantern', 396, 1050, ['holy'], ['death', 'energy'], [SPORE(0.28), FRAG], hp_m=0.92, atk_m=1.08)
mon('venom_pinecoon', 'Pinha Venenosa', 'Venom Pinecoon', 396, 1000, ['fire', 'holy'], ['earth', 'death'],
    [SPORE(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=0.95, atk_m=1.1)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das regiões anteriores.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop375_sword', 'chance': 0.05}, {'item': 'drop375_bow', 'chance': 0.05},
              {'item': 'drop375_staff', 'chance': 0.05}, {'item': 'drop375_mace', 'chance': 0.05}]
mon('lantern_warden', 'Guardião da Lanterna', 'Lantern Warden', 390, 1100, ['holy', 'earth'], ['death', 'energy'],
    [SPORE(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=5.7, gold_m=4, tiers=inst(390))
mon('spore_mother', 'Mãe dos Esporos', 'Spore Mother', 390, 1300, ['fire', 'holy'], ['earth', 'death', 'physical'],
    [{'item': 'rot_spore', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=11.3, gold_m=8, tiers=inst(390))
# Covil (aba Chefes): a Árvore do Fim.
mon('end_tree', 'A Árvore do Fim', 'The End Tree', 400, 1300, ['fire'], ['earth', 'death', 'physical'],
    [{'item': 'rot_spore', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=225, gold_m=20, tiers=inst(400))

# Ajuste dos chefes (vida, ataque), na proporção das regiões anteriores; calibrado no sim_lairs.ts.
BOSS_TUNE = {'lantern_warden': (0.32, 0.47), 'spore_mother': (0.26, 0.43), 'end_tree': (0.058, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'pinecone_woods', 'name': 'Bosque das Pinhas', 'en': 'Pinecone Woods', 'level': 380,
     'monsters': ['raging_pinecoon', 'moss_golem', 'wandering_lantern'], 'focus': 'xp'},
    {'id': 'haunted_greenhouse', 'name': 'Estufa Assombrada', 'en': 'Haunted Greenhouse', 'level': 388,
     'monsters': ['thorn_cactus', 'rotten_golem', 'thorn_pinecoon'], 'focus': 'balanced'},
    {'id': 'rotten_roots', 'name': 'Raízes Podres', 'en': 'Rotten Roots', 'level': 396,
     'monsters': ['blight_cactus', 'corrupted_lantern', 'venom_pinecoon'], 'focus': 'loot'},
    {'id': 'garden_heart', 'name': 'Coração do Jardim', 'en': 'Garden Heart', 'level': 390, 'monsters': ['lantern_warden', 'spore_mother'],
     'boss': True, 'key': 'garden_key', 'trash': ['moss_golem', 'thorn_cactus', 'corrupted_lantern']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'end_hollow', 'name': 'Oco da Árvore do Fim', 'region': LAIR_REGION, 'level': 400, 'monsters': ['end_tree'], 'lair': True})
i18n_content['Oco da Árvore do Fim'] = 'Hollow of the End Tree'
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do do Tirano Primordial (375) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 375.
LAIR_MULT, LAIR_HUE = 1.12, 0.8


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('da Árvore do Fim', 'of the End Tree')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'end_hollow_{slot}', by_item[f'drop375_{slot}'], by_item[f'tyrant_throne_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 24000, 'equip': up(f['equip'], 1.08, 400)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('end_seed', 'Semente do Fim', 'Seed of the End', 'crystal_heart'),
         ('rotten_heartwood', 'Cerne Podre', 'Rotten Heartwood', 'bone'),
         ('spore_crown', 'Coroa de Esporos', 'Spore Crown', 'demon_heart')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 15000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'rot_spore': 10}, 'crafting': {'worldtree_logs': 6, 'rot_spore': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'end_hollow_{w}', by_item[f'drop375_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 400); eq['vocations'] = [voc]; eq['element'] = 'death'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 70000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 10000,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'end_hollow_{w}']
    rid = f'replica_end_hollow_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 35000, 'equip': up(o['equip'], 0.8, 400)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'asura_throne_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'end_hollow_pouch.png')
put(items, by_item, {'id': 'end_hollow_pouch', 'name': 'Bolsa de Armas da Árvore do Fim', 'icon': 'end_hollow_pouch', 'legendary': True,
                     'pouch': True, 'value': 70000, 'pool': pool})
i18n_items['Bolsa de Armas da Árvore do Fim'] = 'End Tree Weapon Pouch'
boss = by_mon['end_tree']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('end_hollow_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'end_hollow_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
