# Fase 3 do 325 ao 500, região 2: o Vale Primevo (350-375), um vale perdido no tempo com dinossauros, alces
# gigantes e brutamontes das cavernas. Três caçadas (355 XP, 363 balanceada, 371 loot), a instância do Ninho
# dos Tiranos (365, com chave: a Matriarca Pterossauro e a Mãe-Tirana) e o covil do Trono do Rei Tirano
# (375, aba Chefes). Mesmo molde do Abismo Afogado (gen_drowned_abyss.py); plano em docs/PLANO_325_500.md
# (no lugar da Fornalha dos Titãs). Sprites: scripts/sprites_primeval_valley.py. Mapas: client/src/world/map.ts e WorldView.tsx.
# Uso: python scripts/data/gen_primeval_valley.py   (idempotente; depois do gen_drowned_abyss.py e do set de
# drop do 350: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
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


REGION, REGION_EN = 'Vale Primevo', 'Primeval Valley'
LAIR_REGION, LAIR_REGION_EN = 'Domínio do Rei Tirano', "Tyrant King's Domain"
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
recolor(Image.open(ICONS + 'crystal_heart.png'), 0.1, 1.0, 0.95).save(ICONS + 'fossil_amber.png')
put(items, by_item, {'id': 'fossil_amber', 'name': 'Âmbar Fóssil', 'icon': 'fossil_amber', 'value': round(by_item['black_coral']['value'] * 1.15)})
i18n_items['Âmbar Fóssil'] = 'Fossil Amber'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.08, 0.9, 1.0).save(ICONS + 'tyrant_key.png')
put(items, by_item, {'id': 'tyrant_key', 'name': 'Chave do Ninho dos Tiranos', 'icon': 'tyrant_key'})
i18n_items['Chave do Ninho dos Tiranos'] = 'Tyrant Nest Key'
put(smithing, by_sm, {'id': 'tyrant_key', 'name': 'Chave do Ninho dos Tiranos', 'level': 120, 'intervalMs': 12000, 'xp': 28000,
                      'inputs': {'adamant_bar': 4, 'fossil_amber': 6, 'black_coral': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'tyrant_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# XP por monstro ~10% abaixo da do Abismo Afogado, como pede a tabela do plano (o equipamento novo mata mais rápido). Calibrado no simulador relativo
# às regiões anteriores (o simulador subestima jogador forte no 245+, então só a razão vale).
XP_SCALE = float(os.environ.get('XP_SCALE', 0.07))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


AMBER = lambda c: {'item': 'fossil_amber', 'chance': c}
KEY = {'item': 'tyrant_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
# Planície dos Raptores (355, XP)
mon('primal_raptor', 'Raptor Primevo', 'Primeval Raptor', 355, 950, ['fire', 'energy'], ['earth'], [AMBER(0.2), FRAG], hp_m=0.85, atk_m=1.05)
mon('raptor_alpha', 'Raptor Alfa', 'Alpha Raptor', 355, 950, ['fire'], ['earth', 'physical'], [AMBER(0.2), FRAG, KEY], hp_m=0.9, atk_m=1.08)
mon('megaloceros', 'Megalócero', 'Megaloceros', 357, 1250, ['fire', 'energy'], ['earth'],
    [AMBER(0.22), FRAG, {'item': 'leather', 'chance': 0.5, 'min': 2, 'max': 5}], hp_m=1.05)
# Selva Primeva (363, balanceada)
mon('valley_sauropod', 'Saurópode do Vale', 'Valley Sauropod', 363, 1400, ['fire'], ['earth', 'physical'], [AMBER(0.25), FRAG], hp_m=1.18, atk_m=0.95)
mon('sky_pterosaur', 'Pterossauro Celeste', 'Sky Pterosaur', 363, 1000, ['earth', 'energy'], ['water'],
    [AMBER(0.24), FRAG, {'item': 'feather', 'chance': 0.6, 'min': 3, 'max': 8}], hp_m=0.9, atk_m=1.06)
mon('cave_brute', 'Brutamontes das Cavernas', 'Cave Brute', 363, 1200, ['fire', 'holy'], ['earth'], [AMBER(0.24), FRAG, KEY], hp_m=1.05, atk_m=1.04)
# Caldeira dos Tiranos (371, loot)
mon('young_tyrant', 'Tirano Jovem', 'Young Tyrant', 371, 1250, ['energy'], ['earth', 'physical'], [AMBER(0.3), FRAG, KEY], hp_m=1.15, atk_m=1.05)
mon('fire_pterosaur', 'Pterossauro de Fogo', 'Fire Pterosaur', 371, 1000, ['water', 'earth'], ['fire'], [AMBER(0.28), FRAG], hp_m=0.92, atk_m=1.06)
mon('primal_shaman', 'Xamã Primitivo', 'Primal Shaman', 371, 1150, ['holy', 'fire'], ['earth', 'death'],
    [AMBER(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.0, atk_m=1.08)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das Asuras e do Abismo.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop350_sword', 'chance': 0.05}, {'item': 'drop350_bow', 'chance': 0.05},
              {'item': 'drop350_staff', 'chance': 0.05}, {'item': 'drop350_mace', 'chance': 0.05}]
mon('pterosaur_matriarch', 'Matriarca Pterossauro', 'Pterosaur Matriarch', 365, 1050, ['earth', 'energy'], ['water', 'fire'],
    [AMBER(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=4.5, gold_m=4, tiers=inst(365))
mon('tyrant_mother', 'Mãe-Tirana', 'Tyrant Mother', 365, 1250, ['energy'], ['earth', 'physical', 'fire'],
    [{'item': 'fossil_amber', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=9, gold_m=8, tiers=inst(365))
# Covil (aba Chefes): Rex, o Tirano Primordial.
mon('primal_rex', 'Rex, o Tirano Primordial', 'Rex, the Primordial Tyrant', 375, 1200, ['energy'], ['earth', 'physical', 'fire'],
    [{'item': 'fossil_amber', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=180, gold_m=20, tiers=inst(375))

# Ajuste dos chefes (vida, ataque), na proporção dos do Abismo; calibrado no sim_lairs.ts.
BOSS_TUNE = {'pterosaur_matriarch': (0.32, 0.47), 'tyrant_mother': (0.26, 0.43), 'primal_rex': (0.058, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'raptor_plains', 'name': 'Planície dos Raptores', 'en': 'Raptor Plains', 'level': 355,
     'monsters': ['primal_raptor', 'raptor_alpha', 'megaloceros'], 'focus': 'xp'},
    {'id': 'primeval_jungle', 'name': 'Selva Primeva', 'en': 'Primeval Jungle', 'level': 363,
     'monsters': ['valley_sauropod', 'sky_pterosaur', 'cave_brute'], 'focus': 'balanced'},
    {'id': 'tyrant_caldera', 'name': 'Caldeira dos Tiranos', 'en': 'Tyrant Caldera', 'level': 371,
     'monsters': ['young_tyrant', 'fire_pterosaur', 'primal_shaman'], 'focus': 'loot'},
    {'id': 'tyrant_nest', 'name': 'Ninho dos Tiranos', 'en': 'Tyrant Nest', 'level': 365, 'monsters': ['pterosaur_matriarch', 'tyrant_mother'],
     'boss': True, 'key': 'tyrant_key', 'trash': ['raptor_alpha', 'valley_sauropod', 'fire_pterosaur']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'tyrant_throne', 'name': 'Trono do Rei Tirano', 'region': LAIR_REGION, 'level': 375, 'monsters': ['primal_rex'], 'lair': True})
i18n_content['Trono do Rei Tirano'] = "Tyrant King's Throne"
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do do Leviatã Antigo (350) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 350.
LAIR_MULT, LAIR_HUE = 1.12, 0.06


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('do Tirano Primordial', 'of the Primordial Tyrant')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'tyrant_throne_{slot}', by_item[f'drop350_{slot}'], by_item[f'leviathan_maw_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 22000, 'equip': up(f['equip'], 1.08, 375)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('tyrant_tooth', 'Dente do Tirano', "Tyrant's Tooth", 'fang'),
         ('primal_claw', 'Garra Primordial', 'Primordial Claw', 'chimera_claw'),
         ('amber_heart', 'Coração de Âmbar', 'Amber Heart', 'crystal_heart')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 14000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'fossil_amber': 10}, 'crafting': {'worldtree_logs': 6, 'fossil_amber': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'tyrant_throne_{w}', by_item[f'drop350_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 375); eq['vocations'] = [voc]; eq['element'] = 'earth'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 65000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 9500,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'tyrant_throne_{w}']
    rid = f'replica_tyrant_throne_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 32000, 'equip': up(o['equip'], 0.8, 375)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'asura_throne_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'tyrant_throne_pouch.png')
put(items, by_item, {'id': 'tyrant_throne_pouch', 'name': 'Bolsa de Armas do Tirano Primordial', 'icon': 'tyrant_throne_pouch', 'legendary': True,
                     'pouch': True, 'value': 65000, 'pool': pool})
i18n_items['Bolsa de Armas do Tirano Primordial'] = "Primordial Tyrant's Weapon Pouch"
boss = by_mon['primal_rex']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('tyrant_throne_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'tyrant_throne_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
