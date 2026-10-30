# Fase 3 do 325 ao 500, região 1: o Abismo Afogado (325-350), ruínas submersas com homens-peixe,
# águas-vivas, tartarugas, hidras e sereias. Três caçadas (330 XP, 338 balanceada, 346 loot), a instância
# do Santuário Afogado (340, com chave: a Tartaruga Guardiã e a Sacerdotisa Abissal) e o covil da Garganta
# do Leviatã (350, aba Chefes). Mesmo molde do Palácio das Asuras (gen_asura_palace.py); plano em
# docs/PLANO_325_500.md. Sprites: scripts/sprites_drowned_abyss.py. Mapas: client/src/world/map.ts e WorldView.tsx.
# Uso: python scripts/data/gen_drowned_abyss.py   (idempotente; depois do gen_asura_palace.py e do set de
# drop do 325: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
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


REGION, REGION_EN = 'Abismo Afogado', 'Drowned Abyss'
LAIR_REGION, LAIR_REGION_EN = 'Profundezas do Leviatã', 'Leviathan Depths'
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
recolor(Image.open(ICONS + 'coral.png'), 0.72, 0.8, 0.7).save(ICONS + 'black_coral.png')
put(items, by_item, {'id': 'black_coral', 'name': 'Coral Negro', 'icon': 'black_coral', 'value': round(by_item['asura_ember']['value'] * 1.15)})
i18n_items['Coral Negro'] = 'Black Coral'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.5, 0.8, 1.0).save(ICONS + 'drowned_key.png')
put(items, by_item, {'id': 'drowned_key', 'name': 'Chave do Santuário Afogado', 'icon': 'drowned_key'})
i18n_items['Chave do Santuário Afogado'] = 'Drowned Sanctum Key'
put(smithing, by_sm, {'id': 'drowned_key', 'name': 'Chave do Santuário Afogado', 'level': 120, 'intervalMs': 12000, 'xp': 26000,
                      'inputs': {'adamant_bar': 4, 'black_coral': 6, 'asura_ember': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'drowned_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# Calibrado no simulador relativo às Asuras (o simulador subestima jogador forte no 245+, então só a razão
# vale). XP_SCALE pode vir do ambiente para recalibrar.
XP_SCALE = float(os.environ.get('XP_SCALE', 0.10))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


CORAL = lambda c: {'item': 'black_coral', 'chance': c}
KEY = {'item': 'drowned_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
mon('abyss_warrior', 'Guerreiro Abissal', 'Abyss Warrior', 330, 1100, ['energy', 'earth'], ['water', 'physical'], [CORAL(0.2), FRAG], hp_m=0.9)
mon('abyss_spearman', 'Lanceiro Abissal', 'Abyss Spearman', 330, 1000, ['energy'], ['water'], [CORAL(0.2), FRAG, KEY], hp_m=0.85, atk_m=1.05, sprite='abyss_warrior')
mon('abyssal_jelly', 'Água-viva Abissal', 'Abyssal Jelly', 334, 1150, ['earth', 'fire'], ['water', 'energy'], [CORAL(0.22), FRAG], hp_m=0.92, atk_m=1.06)
mon('abyss_tidecaller', 'Invocador das Marés', 'Tidecaller', 336, 1050, ['energy'], ['water', 'death'], [CORAL(0.22), FRAG, KEY], hp_m=0.95, atk_m=1.08)
mon('abyssal_turtle', 'Tartaruga Abissal', 'Abyssal Turtle', 338, 1250, ['energy', 'earth'], ['water', 'physical'], [CORAL(0.25), FRAG], hp_m=1.1)
mon('sea_hydra', 'Hidra Marinha', 'Sea Hydra', 338, 1150, ['energy'], ['water', 'fire'], [CORAL(0.24), FRAG], hp_m=0.98, atk_m=1.06)
mon('abyssal_siren', 'Sereia Abissal', 'Abyssal Siren', 344, 1150, ['energy', 'holy'], ['water', 'death'], [CORAL(0.28), FRAG, KEY], hp_m=0.95, atk_m=1.06)
mon('elder_hydra', 'Hidra Anciã', 'Elder Hydra', 344, 1300, ['energy'], ['water', 'physical'], [CORAL(0.28), FRAG, KEY], hp_m=1.12, atk_m=0.98)
mon('abyss_champion', 'Campeão Abissal', 'Abyss Champion', 346, 1250, ['energy', 'earth'], ['water', 'death'],
    [CORAL(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.15, atk_m=1.05)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das Asuras.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop325_sword', 'chance': 0.05}, {'item': 'drop325_bow', 'chance': 0.05},
              {'item': 'drop325_staff', 'chance': 0.05}, {'item': 'drop325_mace', 'chance': 0.05}]
mon('sanctum_turtle', 'Tartaruga Guardiã', 'Guardian Turtle', 340, 1300, ['energy'], ['water', 'physical'],
    [CORAL(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=3.5, gold_m=4, tiers=inst(340))
mon('abyssal_priestess', 'Sacerdotisa Abissal', 'Abyssal Priestess', 340, 1250, ['energy'], ['water', 'death', 'holy'],
    [{'item': 'black_coral', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=7, gold_m=8, tiers=inst(340))
# Covil (aba Chefes): o Leviatã Antigo, 20x a XP da chefe da instância (com o corte de XP, para pagar um
# pouco mais que o Trono Asura).
mon('ancient_leviathan', 'Leviatã Antigo', 'Ancient Leviathan', 350, 1200, ['energy'], ['water', 'death', 'physical'],
    [{'item': 'black_coral', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=140, gold_m=20, tiers=inst(350))

# Ajuste dos chefes (vida, ataque), na proporção dos das Asuras; calibrado no sim_lairs.ts.
BOSS_TUNE = {'sanctum_turtle': (0.32, 0.47), 'abyssal_priestess': (0.26, 0.43), 'ancient_leviathan': (0.058, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'sunken_ruins', 'name': 'Ruínas Submersas', 'en': 'Sunken Ruins', 'level': 330,
     'monsters': ['abyss_warrior', 'abyss_spearman', 'abyssal_jelly'], 'focus': 'xp'},
    {'id': 'drowned_rift', 'name': 'Fenda Afogada', 'en': 'Drowned Rift', 'level': 338,
     'monsters': ['abyss_tidecaller', 'abyssal_turtle', 'sea_hydra'], 'focus': 'balanced'},
    {'id': 'leviathan_reef', 'name': 'Recife do Leviatã', 'en': 'Leviathan Reef', 'level': 346,
     'monsters': ['abyssal_siren', 'elder_hydra', 'abyss_champion'], 'focus': 'loot'},
    {'id': 'drowned_sanctum', 'name': 'Santuário Afogado', 'en': 'Drowned Sanctum', 'level': 340, 'monsters': ['sanctum_turtle', 'abyssal_priestess'],
     'boss': True, 'key': 'drowned_key', 'trash': ['abyss_spearman', 'abyssal_turtle', 'abyssal_siren']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'leviathan_maw', 'name': 'Garganta do Leviatã', 'region': LAIR_REGION, 'level': 350, 'monsters': ['ancient_leviathan'], 'lair': True})
i18n_content['Garganta do Leviatã'] = "Leviathan's Maw"
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do da Rainha Asura (325) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 325.
LAIR_MULT, LAIR_HUE = 1.12, 0.5


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('do Leviatã Antigo', 'of the Ancient Leviathan')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'leviathan_maw_{slot}', by_item[f'drop325_{slot}'], by_item[f'asura_throne_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 20000, 'equip': up(f['equip'], 1.08, 350)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('leviathan_fin', 'Barbatana do Leviatã', 'Leviathan Fin', 'deep_scale'),
         ('abyss_eye', 'Olho do Abismo', 'Eye of the Abyss', 'beholder_eye'),
         ('ancient_tentacle', 'Tentáculo Ancestral', 'Ancestral Tentacle', 'kraken_crown')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 13000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'black_coral': 10}, 'crafting': {'worldtree_logs': 6, 'black_coral': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'leviathan_maw_{w}', by_item[f'drop325_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 350); eq['vocations'] = [voc]; eq['element'] = 'water'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 60000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 9000,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'leviathan_maw_{w}']
    rid = f'replica_leviathan_maw_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 30000, 'equip': up(o['equip'], 0.8, 350)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'asura_throne_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'leviathan_maw_pouch.png')
put(items, by_item, {'id': 'leviathan_maw_pouch', 'name': 'Bolsa de Armas do Leviatã Antigo', 'icon': 'leviathan_maw_pouch', 'legendary': True,
                     'pouch': True, 'value': 60000, 'pool': pool})
i18n_items['Bolsa de Armas do Leviatã Antigo'] = "Ancient Leviathan's Weapon Pouch"
boss = by_mon['ancient_leviathan']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('leviathan_maw_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'leviathan_maw_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
