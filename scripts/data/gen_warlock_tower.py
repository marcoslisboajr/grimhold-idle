# Fase 3 do 325 ao 500, região 6: a Torre dos Bruxos (450-475), inspirada nos Warlocks, Infernalists e
# Devoted/Fanatics do Tibia: uma torre de feiticeiros com bruxos, aprendizes, infernalistas, acólitos das brasas,
# devotos e fanáticos. Três caçadas (455 XP, 463 balanceada, 471 loot), a instância do Conselho da Torre (465, com
# chave: o Sumo-Sacerdote Devoto e o Arquibruxo) e o covil do Trono das Chamas (475, aba Chefes). Mesmo molde do
# Templo da Cobra (gen_cobra_temple.py); plano em docs/PLANO_325_500.md. Sprites: scripts/sprites_warlock_tower.py.
# Uso: python scripts/data/gen_warlock_tower.py   (idempotente; depois do gen_cobra_temple.py e do set de
# drop do 450: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
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


REGION, REGION_EN = 'Torre dos Bruxos', 'Warlock Tower'
LAIR_REGION, LAIR_REGION_EN = 'Cume da Torre', 'Tower Summit'
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
recolor(Image.open(ICONS + 'crystal_heart.png'), 0.02, 1.1, 0.95).save(ICONS + 'infernal_ash.png')
put(items, by_item, {'id': 'infernal_ash', 'name': 'Cinza Infernal', 'icon': 'infernal_ash', 'value': round(by_item['cobra_venom']['value'] * 1.15)})
i18n_items['Cinza Infernal'] = 'Infernal Ash'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.02, 0.9, 1.0).save(ICONS + 'tower_key.png')
put(items, by_item, {'id': 'tower_key', 'name': 'Chave do Conselho da Torre', 'icon': 'tower_key'})
i18n_items['Chave do Conselho da Torre'] = 'Tower Council Key'
put(smithing, by_sm, {'id': 'tower_key', 'name': 'Chave do Conselho da Torre', 'level': 120, 'intervalMs': 12000, 'xp': 36000,
                      'inputs': {'adamant_bar': 4, 'infernal_ash': 6, 'cobra_venom': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'tower_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# XP por monstro ~6% abaixo da do Templo da Cobra, como pede a tabela do plano (o equipamento novo mata mais rápido).
XP_SCALE = float(os.environ.get('XP_SCALE', 0.0195))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


ASH = lambda c: {'item': 'infernal_ash', 'chance': c}
KEY = {'item': 'tower_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
# Biblioteca dos Bruxos (455, XP)
mon('tower_warlock', 'Bruxo da Torre', 'Tower Warlock', 455, 1100, ['holy', 'physical'], ['fire', 'death', 'energy'], [ASH(0.2), FRAG], hp_m=0.88, atk_m=1.12)
mon('arcane_apprentice', 'Aprendiz Arcano', 'Arcane Apprentice', 455, 1000, ['physical', 'earth'], ['energy', 'water'], [ASH(0.2), FRAG, KEY], hp_m=0.82, atk_m=1.06)
mon('devoted_guard', 'Guarda Devoto', 'Devoted Guard', 457, 1300, ['death', 'energy'], ['holy', 'physical'], [ASH(0.22), FRAG], hp_m=1.15, atk_m=0.98)
# Fornalha Infernal (463, balanceada)
mon('infernalist', 'Infernalista', 'Infernalist', 463, 1100, ['water', 'holy'], ['fire', 'death'], [ASH(0.25), FRAG], hp_m=0.9, atk_m=1.14)
mon('ember_acolyte', 'Acólito das Brasas', 'Ember Acolyte', 463, 1150, ['water', 'earth'], ['fire'],
    [ASH(0.24), FRAG, {'item': 'coal', 'chance': 0.5, 'min': 2, 'max': 6}], hp_m=1.0, atk_m=1.04)
mon('tower_devoted', 'Devoto', 'Devoted', 463, 1200, ['death'], ['holy', 'energy'], [ASH(0.24), FRAG, KEY], hp_m=1.05, atk_m=1.04)
# Altar dos Fanáticos (471, loot)
mon('tower_fanatic', 'Fanático', 'Fanatic', 471, 1000, ['holy', 'physical'], ['death', 'fire'], [ASH(0.3), FRAG, KEY], hp_m=0.95, atk_m=1.14)
mon('void_warlock', 'Bruxo do Vazio', 'Void Warlock', 471, 1100, ['holy', 'physical'], ['death', 'energy'], [ASH(0.28), FRAG], hp_m=0.92, atk_m=1.12)
mon('grand_devoted', 'Grão-Devoto', 'Grand Devoted', 471, 1250, ['death'], ['holy', 'physical'],
    [ASH(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.15, atk_m=1.04)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das regiões anteriores.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop450_sword', 'chance': 0.05}, {'item': 'drop450_bow', 'chance': 0.05},
              {'item': 'drop450_staff', 'chance': 0.05}, {'item': 'drop450_mace', 'chance': 0.05}]
mon('devoted_high_priest', 'Sumo-Sacerdote Devoto', 'Devoted High Priest', 465, 1150, ['death'], ['holy', 'energy'],
    [ASH(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=12.2, gold_m=4, tiers=inst(465))
mon('archwarlock', 'Arquibruxo', 'Archwarlock', 465, 1150, ['holy', 'physical'], ['fire', 'death', 'energy'],
    [{'item': 'infernal_ash', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=24.1, gold_m=8, tiers=inst(465))
# Covil (aba Chefes): o Grão-Infernalista.
mon('grand_infernalist', 'O Grão-Infernalista', 'The Grand Infernalist', 475, 1150, ['water', 'holy'], ['fire', 'death', 'energy'],
    [{'item': 'infernal_ash', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=476, gold_m=20, tiers=inst(475))

# Ajuste dos chefes (vida, ataque), na proporção das regiões anteriores; calibrado no sim_lairs.ts.
BOSS_TUNE = {'devoted_high_priest': (0.32, 0.47), 'archwarlock': (0.26, 0.43), 'grand_infernalist': (0.046, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'warlock_library', 'name': 'Biblioteca dos Bruxos', 'en': 'Warlock Library', 'level': 455,
     'monsters': ['tower_warlock', 'arcane_apprentice', 'devoted_guard'], 'focus': 'xp'},
    {'id': 'infernal_furnace', 'name': 'Fornalha Infernal', 'en': 'Infernal Furnace', 'level': 463,
     'monsters': ['infernalist', 'ember_acolyte', 'tower_devoted'], 'focus': 'balanced'},
    {'id': 'fanatic_altar', 'name': 'Altar dos Fanáticos', 'en': 'Fanatic Altar', 'level': 471,
     'monsters': ['tower_fanatic', 'void_warlock', 'grand_devoted'], 'focus': 'loot'},
    {'id': 'tower_council', 'name': 'Conselho da Torre', 'en': 'Tower Council', 'level': 465, 'monsters': ['devoted_high_priest', 'archwarlock'],
     'boss': True, 'key': 'tower_key', 'trash': ['devoted_guard', 'infernalist', 'void_warlock']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'flame_throne', 'name': 'Trono das Chamas', 'region': LAIR_REGION, 'level': 475, 'monsters': ['grand_infernalist'], 'lair': True})
i18n_content['Trono das Chamas'] = 'Throne of Flames'
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do da Rainha Serpente (450) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 450.
LAIR_MULT, LAIR_HUE = 1.12, 0.02


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('do Grão-Infernalista', 'of the Grand Infernalist')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'flame_throne_{slot}', by_item[f'drop450_{slot}'], by_item[f'serpent_throne_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 30000, 'equip': up(f['equip'], 1.08, 475)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('infernal_tome', 'Tomo Infernal', 'Infernal Tome', 'crystal_heart'),
         ('burning_sigil', 'Selo Ardente', 'Burning Sigil', 'bone'),
         ('flame_heart', 'Coração das Chamas', 'Heart of Flames', 'demon_heart')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 18000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'infernal_ash': 10}, 'crafting': {'worldtree_logs': 6, 'infernal_ash': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'flame_throne_{w}', by_item[f'drop450_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 475); eq['vocations'] = [voc]; eq['element'] = 'fire'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 85000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 11500,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'flame_throne_{w}']
    rid = f'replica_flame_throne_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 42000, 'equip': up(o['equip'], 0.8, 475)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'asura_throne_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'flame_throne_pouch.png')
put(items, by_item, {'id': 'flame_throne_pouch', 'name': 'Bolsa de Armas do Grão-Infernalista', 'icon': 'flame_throne_pouch', 'legendary': True,
                     'pouch': True, 'value': 85000, 'pool': pool})
i18n_items['Bolsa de Armas do Grão-Infernalista'] = "Grand Infernalist's Weapon Pouch"
boss = by_mon['grand_infernalist']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('flame_throne_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'flame_throne_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
