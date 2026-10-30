# Fase 3 do 325 ao 500, região 4: a Cidadela do Usurpador (400-425), inspirada nos Usurpers do Tibia: a ordem que
# tomou o trono à força, com cavaleiros, arqueiros, legionários, oficiais, feiticeiros e os bandidos da fábrica que
# trabalham para ela. Três caçadas (405 XP, 413 balanceada, 421 loot), a instância do Conselho dos Usurpadores (415,
# com chave: a Arquimaga e o General Usurpador) e o covil do Trono do Usurpador (425, aba Chefes). Mesmo molde do
# Jardim Corrompido (gen_corrupted_garden.py); plano em docs/PLANO_325_500.md. Sprites: scripts/sprites_usurper_citadel.py.
# Uso: python scripts/data/gen_usurper_citadel.py   (idempotente; depois do gen_corrupted_garden.py e do set de
# drop do 400: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
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


REGION, REGION_EN = 'Cidadela do Usurpador', 'Usurper Citadel'
LAIR_REGION, LAIR_REGION_EN = 'Trono Usurpado', 'Usurped Throne'
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
recolor(Image.open(ICONS + 'crystal_heart.png'), 0.76, 1.1, 0.9).save(ICONS + 'usurper_seal.png')
put(items, by_item, {'id': 'usurper_seal', 'name': 'Selo Usurpador', 'icon': 'usurper_seal', 'value': round(by_item['rot_spore']['value'] * 1.15)})
i18n_items['Selo Usurpador'] = 'Usurper Seal'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.76, 0.9, 1.0).save(ICONS + 'usurper_key.png')
put(items, by_item, {'id': 'usurper_key', 'name': 'Chave do Conselho Usurpador', 'icon': 'usurper_key'})
i18n_items['Chave do Conselho Usurpador'] = 'Usurper Council Key'
put(smithing, by_sm, {'id': 'usurper_key', 'name': 'Chave do Conselho Usurpador', 'level': 120, 'intervalMs': 12000, 'xp': 32000,
                      'inputs': {'adamant_bar': 4, 'usurper_seal': 6, 'rot_spore': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'usurper_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# XP por monstro ~8% abaixo da do Jardim Corrompido, como pede a tabela do plano (o equipamento novo mata mais rápido).
XP_SCALE = float(os.environ.get('XP_SCALE', 0.036))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


SEAL = lambda c: {'item': 'usurper_seal', 'chance': c}
KEY = {'item': 'usurper_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
# Muralhas do Usurpador (405, XP)
mon('usurper_knight', 'Cavaleiro Usurpador', 'Usurper Knight', 405, 1300, ['energy', 'holy'], ['physical', 'death'], [SEAL(0.2), FRAG], hp_m=1.1, atk_m=1.0)
mon('usurper_archer', 'Arqueiro Usurpador', 'Usurper Archer', 405, 950, ['energy', 'fire'], ['physical'], [SEAL(0.2), FRAG, KEY], hp_m=0.85, atk_m=1.08)
mon('usurper_warlock', 'Bruxo Usurpador', 'Usurper Warlock', 407, 1100, ['holy', 'physical'], ['death', 'energy'], [SEAL(0.22), FRAG], hp_m=0.88, atk_m=1.1)
# Quartel Usurpador (413, balanceada)
mon('usurper_legionary', 'Legionário Usurpador', 'Usurper Legionary', 413, 1250, ['energy'], ['physical', 'fire'], [SEAL(0.25), FRAG], hp_m=1.12, atk_m=1.0)
mon('factory_bandit', 'Bandido da Fábrica', 'Factory Bandit', 413, 1000, ['energy', 'water'], ['earth'],
    [SEAL(0.24), FRAG, {'item': 'adamant_bar', 'chance': 0.2}], hp_m=0.92, atk_m=1.06)
mon('usurper_officer', 'Oficial Usurpador', 'Usurper Officer', 413, 1150, ['energy', 'holy'], ['physical', 'death'], [SEAL(0.24), FRAG, KEY], hp_m=1.0, atk_m=1.05)
# Salão do Trono Usurpado (421, loot)
mon('usurper_elite', 'Elite Usurpadora', 'Usurper Elite', 421, 1250, ['energy'], ['physical', 'fire', 'death'], [SEAL(0.3), FRAG, KEY], hp_m=1.15, atk_m=1.04)
mon('usurper_shadowcaster', 'Conjurador das Sombras', 'Shadowcaster', 421, 1100, ['holy'], ['death', 'energy'], [SEAL(0.28), FRAG], hp_m=0.9, atk_m=1.12)
mon('usurper_marshal', 'Marechal Usurpador', 'Usurper Marshal', 421, 1200, ['energy', 'holy'], ['physical', 'death'],
    [SEAL(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.05, atk_m=1.08)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das regiões anteriores.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop400_sword', 'chance': 0.05}, {'item': 'drop400_bow', 'chance': 0.05},
              {'item': 'drop400_staff', 'chance': 0.05}, {'item': 'drop400_mace', 'chance': 0.05}]
mon('usurper_archmage', 'Arquimaga Usurpadora', 'Usurper Archmage', 415, 1150, ['holy', 'physical'], ['death', 'energy'],
    [SEAL(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=7.4, gold_m=4, tiers=inst(415))
mon('usurper_general', 'General Usurpador', 'Usurper General', 415, 1250, ['energy', 'holy'], ['physical', 'fire', 'death'],
    [{'item': 'usurper_seal', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=14.6, gold_m=8, tiers=inst(415))
# Covil (aba Chefes): o Rei Usurpador.
mon('usurper_king', 'O Rei Usurpador', 'The Usurper King', 425, 1250, ['energy', 'holy'], ['physical', 'death', 'fire'],
    [{'item': 'usurper_seal', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=290, gold_m=20, tiers=inst(425))

# Ajuste dos chefes (vida, ataque), na proporção das regiões anteriores; calibrado no sim_lairs.ts.
BOSS_TUNE = {'usurper_archmage': (0.32, 0.47), 'usurper_general': (0.26, 0.43), 'usurper_king': (0.052, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'usurper_walls', 'name': 'Muralhas do Usurpador', 'en': 'Usurper Walls', 'level': 405,
     'monsters': ['usurper_knight', 'usurper_archer', 'usurper_warlock'], 'focus': 'xp'},
    {'id': 'usurper_barracks', 'name': 'Quartel Usurpador', 'en': 'Usurper Barracks', 'level': 413,
     'monsters': ['usurper_legionary', 'factory_bandit', 'usurper_officer'], 'focus': 'balanced'},
    {'id': 'usurped_hall', 'name': 'Salão do Trono Usurpado', 'en': 'Hall of the Usurped Throne', 'level': 421,
     'monsters': ['usurper_elite', 'usurper_shadowcaster', 'usurper_marshal'], 'focus': 'loot'},
    {'id': 'usurper_council', 'name': 'Conselho dos Usurpadores', 'en': 'Usurper Council', 'level': 415, 'monsters': ['usurper_archmage', 'usurper_general'],
     'boss': True, 'key': 'usurper_key', 'trash': ['usurper_knight', 'usurper_legionary', 'usurper_shadowcaster']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'usurper_throne', 'name': 'Trono do Usurpador', 'region': LAIR_REGION, 'level': 425, 'monsters': ['usurper_king'], 'lair': True})
i18n_content['Trono do Usurpador'] = "Usurper's Throne"
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do da Árvore do Fim (400) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 400.
LAIR_MULT, LAIR_HUE = 1.12, 0.76


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('do Rei Usurpador', 'of the Usurper King')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'usurper_throne_{slot}', by_item[f'drop400_{slot}'], by_item[f'end_hollow_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 26000, 'equip': up(f['equip'], 1.08, 425)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('usurped_crown', 'Coroa Usurpada', 'Usurped Crown', 'crystal_heart'),
         ('broken_scepter', 'Cetro Partido', 'Broken Scepter', 'bone'),
         ('traitor_heart', 'Coração do Traidor', "Traitor's Heart", 'demon_heart')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 16000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'usurper_seal': 10}, 'crafting': {'worldtree_logs': 6, 'usurper_seal': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'usurper_throne_{w}', by_item[f'drop400_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 425); eq['vocations'] = [voc]; eq['element'] = 'energy'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 75000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 10500,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'usurper_throne_{w}']
    rid = f'replica_usurper_throne_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 37000, 'equip': up(o['equip'], 0.8, 425)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'asura_throne_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'usurper_throne_pouch.png')
put(items, by_item, {'id': 'usurper_throne_pouch', 'name': 'Bolsa de Armas do Rei Usurpador', 'icon': 'usurper_throne_pouch', 'legendary': True,
                     'pouch': True, 'value': 75000, 'pool': pool})
i18n_items['Bolsa de Armas do Rei Usurpador'] = "Usurper King's Weapon Pouch"
boss = by_mon['usurper_king']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('usurper_throne_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'usurper_throne_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
