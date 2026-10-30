# Fase 3 do 325 ao 500, região 5: o Templo da Cobra (425-450), inspirado no Cobra Bastion do Tibia: o povo-serpente
# que guarda o templo da Rainha Serpente, com guerreiros, batedores, assassinos, envenenadores, vizires e oráculos.
# Três caçadas (430 XP, 438 balanceada, 446 loot), a instância do Santuário da Serpente (440, com chave: a Matriarca
# Cobra e o Grão-Vizir) e o covil do Trono da Rainha Serpente (450, aba Chefes). Mesmo molde da Cidadela do Usurpador
# (gen_usurper_citadel.py); plano em docs/PLANO_325_500.md. Sprites: scripts/sprites_cobra_temple.py.
# Uso: python scripts/data/gen_cobra_temple.py   (idempotente; depois do gen_usurper_citadel.py e do set de
# drop do 425: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
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


REGION, REGION_EN = 'Templo da Cobra', 'Cobra Temple'
LAIR_REGION, LAIR_REGION_EN = 'Ninho da Rainha Serpente', "Serpent Queen's Nest"
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
recolor(Image.open(ICONS + 'crystal_heart.png'), 0.38, 1.1, 0.9).save(ICONS + 'cobra_venom.png')
put(items, by_item, {'id': 'cobra_venom', 'name': 'Veneno de Cobra', 'icon': 'cobra_venom', 'value': round(by_item['usurper_seal']['value'] * 1.15)})
i18n_items['Veneno de Cobra'] = 'Cobra Venom'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.38, 0.9, 1.0).save(ICONS + 'serpent_key.png')
put(items, by_item, {'id': 'serpent_key', 'name': 'Chave do Santuário da Serpente', 'icon': 'serpent_key'})
i18n_items['Chave do Santuário da Serpente'] = 'Serpent Sanctum Key'
put(smithing, by_sm, {'id': 'serpent_key', 'name': 'Chave do Santuário da Serpente', 'level': 120, 'intervalMs': 12000, 'xp': 34000,
                      'inputs': {'adamant_bar': 4, 'cobra_venom': 6, 'usurper_seal': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'serpent_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# XP por monstro ~6% abaixo da da Cidadela do Usurpador, como pede a tabela do plano (o equipamento novo mata mais rápido).
XP_SCALE = float(os.environ.get('XP_SCALE', 0.0265))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


VENOM = lambda c: {'item': 'cobra_venom', 'chance': c}
KEY = {'item': 'serpent_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
# Pátio das Serpentes (430, XP)
mon('cobra_warrior', 'Guerreiro Cobra', 'Cobra Warrior', 430, 1200, ['water', 'energy'], ['earth', 'physical'], [VENOM(0.2), FRAG], hp_m=1.08, atk_m=1.02)
mon('cobra_scout', 'Batedor Cobra', 'Cobra Scout', 430, 950, ['water', 'fire'], ['earth'], [VENOM(0.2), FRAG, KEY], hp_m=0.85, atk_m=1.08)
mon('cobra_assassin', 'Assassino Cobra', 'Cobra Assassin', 432, 900, ['holy', 'water'], ['earth', 'death'], [VENOM(0.22), FRAG], hp_m=0.86, atk_m=1.12)
# Mercado das Serpentes (438, balanceada)
mon('cobra_venomancer', 'Envenenador Cobra', 'Cobra Venomancer', 438, 1100, ['water', 'holy'], ['earth', 'death'], [VENOM(0.25), FRAG], hp_m=0.92, atk_m=1.1)
mon('cobra_thrall', 'Servo da Serpente', 'Serpent Thrall', 438, 1250, ['fire', 'water'], ['earth'],
    [VENOM(0.24), FRAG, {'item': 'leather', 'chance': 0.5, 'min': 2, 'max': 5}], hp_m=1.12, atk_m=0.98)
mon('cobra_blade', 'Lâmina Cobra', 'Cobra Blade', 438, 1000, ['water', 'energy'], ['earth', 'physical'], [VENOM(0.24), FRAG, KEY], hp_m=1.0, atk_m=1.08)
# Câmara do Veneno (446, loot)
mon('cobra_vizier', 'Vizir Cobra', 'Cobra Vizier', 446, 1150, ['water', 'holy'], ['earth', 'energy'], [VENOM(0.3), FRAG, KEY], hp_m=1.0, atk_m=1.1)
mon('cobra_oracle', 'Oráculo da Serpente', 'Serpent Oracle', 446, 1150, ['holy', 'fire'], ['earth', 'death'], [VENOM(0.28), FRAG], hp_m=0.95, atk_m=1.1)
mon('cobra_executioner', 'Carrasco Cobra', 'Cobra Executioner', 446, 1250, ['water', 'energy'], ['earth', 'physical'],
    [VENOM(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.15, atk_m=1.06)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das regiões anteriores.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop425_sword', 'chance': 0.05}, {'item': 'drop425_bow', 'chance': 0.05},
              {'item': 'drop425_staff', 'chance': 0.05}, {'item': 'drop425_mace', 'chance': 0.05}]
mon('cobra_matriarch', 'Matriarca Cobra', 'Cobra Matriarch', 440, 1100, ['water', 'holy'], ['earth', 'death'],
    [VENOM(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=9.4, gold_m=4, tiers=inst(440))
mon('cobra_grand_vizier', 'Grão-Vizir Cobra', 'Cobra Grand Vizier', 440, 1200, ['water', 'energy'], ['earth', 'physical', 'death'],
    [{'item': 'cobra_venom', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=18.5, gold_m=8, tiers=inst(440))
# Covil (aba Chefes): a Rainha Serpente.
mon('serpent_queen', 'A Rainha Serpente', 'The Serpent Queen', 450, 1200, ['water', 'holy'], ['earth', 'death', 'physical'],
    [{'item': 'cobra_venom', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=366, gold_m=20, tiers=inst(450))

# Ajuste dos chefes (vida, ataque), na proporção das regiões anteriores; calibrado no sim_lairs.ts.
BOSS_TUNE = {'cobra_matriarch': (0.32, 0.47), 'cobra_grand_vizier': (0.26, 0.43), 'serpent_queen': (0.048, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'serpent_courtyard', 'name': 'Pátio das Serpentes', 'en': 'Serpent Courtyard', 'level': 430,
     'monsters': ['cobra_warrior', 'cobra_scout', 'cobra_assassin'], 'focus': 'xp'},
    {'id': 'serpent_market', 'name': 'Mercado das Serpentes', 'en': 'Serpent Market', 'level': 438,
     'monsters': ['cobra_venomancer', 'cobra_thrall', 'cobra_blade'], 'focus': 'balanced'},
    {'id': 'venom_chamber', 'name': 'Câmara do Veneno', 'en': 'Venom Chamber', 'level': 446,
     'monsters': ['cobra_vizier', 'cobra_oracle', 'cobra_executioner'], 'focus': 'loot'},
    {'id': 'serpent_sanctum', 'name': 'Santuário da Serpente', 'en': 'Serpent Sanctum', 'level': 440, 'monsters': ['cobra_matriarch', 'cobra_grand_vizier'],
     'boss': True, 'key': 'serpent_key', 'trash': ['cobra_warrior', 'cobra_blade', 'cobra_oracle']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'serpent_throne', 'name': 'Trono da Rainha Serpente', 'region': LAIR_REGION, 'level': 450, 'monsters': ['serpent_queen'], 'lair': True})
i18n_content['Trono da Rainha Serpente'] = "Serpent Queen's Throne"
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do do Rei Usurpador (425) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 425.
LAIR_MULT, LAIR_HUE = 1.12, 0.38


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('da Rainha Serpente', 'of the Serpent Queen')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'serpent_throne_{slot}', by_item[f'drop425_{slot}'], by_item[f'usurper_throne_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 28000, 'equip': up(f['equip'], 1.08, 450)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('serpent_fang', 'Presa da Rainha', "Queen's Fang", 'fang'),
         ('shed_skin', 'Pele Trocada', 'Shed Skin', 'bone'),
         ('venom_heart', 'Coração Venenoso', 'Venom Heart', 'demon_heart')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 17000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'cobra_venom': 10}, 'crafting': {'worldtree_logs': 6, 'cobra_venom': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'serpent_throne_{w}', by_item[f'drop425_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 450); eq['vocations'] = [voc]; eq['element'] = 'earth'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 80000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 11000,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'serpent_throne_{w}']
    rid = f'replica_serpent_throne_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 40000, 'equip': up(o['equip'], 0.8, 450)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'asura_throne_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'serpent_throne_pouch.png')
put(items, by_item, {'id': 'serpent_throne_pouch', 'name': 'Bolsa de Armas da Rainha Serpente', 'icon': 'serpent_throne_pouch', 'legendary': True,
                     'pouch': True, 'value': 80000, 'pool': pool})
i18n_items['Bolsa de Armas da Rainha Serpente'] = "Serpent Queen's Weapon Pouch"
boss = by_mon['serpent_queen']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('serpent_throne_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'serpent_throne_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
