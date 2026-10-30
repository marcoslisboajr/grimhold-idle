# Fase 3 do 325 ao 500, região 7 (a última): a Caverna dos Heróis (475-500), inspirada no Hero Cave do Tibia: heróis
# caídos de todas as classes (guerreiros, patrulheiras, magos, clérigas, vigilantes, monjas, cavaleiros e paladinas).
# Três caçadas (480 XP, 488 balanceada, 496 loot), a instância do Salão do Juramento (490, com chave: a Arquimaga
# Heroica e o Capitão dos Heróis) e o covil final do Trono do Campeão Caído (500, aba Chefes), com set e armas
# mais fortes que os dos outros covis (valem até o fim). Mesmo molde da Torre dos Bruxos (gen_warlock_tower.py);
# plano em docs/PLANO_325_500.md. Sprites: scripts/sprites_hero_cave.py.
# Uso: python scripts/data/gen_hero_cave.py   (idempotente; depois do gen_warlock_tower.py e do set de
# drop do 475: gen_drop_sets.ts, drop_sets_apply.py e drop_sets_ladder.ts)
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


REGION, REGION_EN = 'Caverna dos Heróis', 'Hero Cave'
LAIR_REGION, LAIR_REGION_EN = 'Fim da Jornada', "Journey's End"
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
recolor(Image.open(ICONS + 'crystal_heart.png'), 0.12, 1.1, 1.0).save(ICONS + 'hero_medal.png')
put(items, by_item, {'id': 'hero_medal', 'name': 'Medalha de Herói', 'icon': 'hero_medal', 'value': round(by_item['infernal_ash']['value'] * 1.15)})
i18n_items['Medalha de Herói'] = 'Hero Medal'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.12, 0.9, 1.1).save(ICONS + 'oath_key.png')
put(items, by_item, {'id': 'oath_key', 'name': 'Chave do Salão do Juramento', 'icon': 'oath_key'})
i18n_items['Chave do Salão do Juramento'] = 'Oath Hall Key'
put(smithing, by_sm, {'id': 'oath_key', 'name': 'Chave do Salão do Juramento', 'level': 120, 'intervalMs': 12000, 'xp': 38000,
                      'inputs': {'adamant_bar': 4, 'hero_medal': 6, 'infernal_ash': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'oath_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# XP por monstro ~6% abaixo da da Torre dos Bruxos, como pede a tabela do plano (o equipamento novo mata mais rápido).
XP_SCALE = float(os.environ.get('XP_SCALE', 0.0144))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


MEDAL = lambda c: {'item': 'hero_medal', 'chance': c}
KEY = {'item': 'oath_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
# Salão dos Heróis Caídos (480, XP)
mon('fallen_warrior', 'Guerreiro Caído', 'Fallen Warrior', 480, 1250, ['holy', 'energy'], ['physical', 'death'], [MEDAL(0.2), FRAG], hp_m=1.1, atk_m=1.02)
mon('fallen_ranger', 'Patrulheira Caída', 'Fallen Ranger', 480, 950, ['fire', 'holy'], ['earth'], [MEDAL(0.2), FRAG, KEY], hp_m=0.85, atk_m=1.1)
mon('fallen_mage', 'Mago Caído', 'Fallen Mage', 482, 1100, ['physical', 'holy'], ['energy', 'death'], [MEDAL(0.22), FRAG], hp_m=0.86, atk_m=1.12)
# Galeria dos Campeões (488, balanceada)
mon('fallen_cleric', 'Clériga Caída', 'Fallen Cleric', 488, 1200, ['death'], ['holy', 'energy'], [MEDAL(0.25), FRAG], hp_m=1.0, atk_m=1.04)
mon('hero_vigilante', 'Vigilante', 'Vigilante', 488, 1000, ['energy', 'fire'], ['physical'],
    [MEDAL(0.24), FRAG, {'item': 'leather', 'chance': 0.5, 'min': 2, 'max': 5}], hp_m=0.95, atk_m=1.08)
mon('hero_monk', 'Monja Errante', 'Wandering Monk', 488, 950, ['death', 'energy'], ['physical', 'holy'], [MEDAL(0.24), FRAG, KEY], hp_m=0.95, atk_m=1.1)
# Cripta das Lendas (496, loot)
mon('champion_knight', 'Cavaleiro Campeão', 'Champion Knight', 496, 1300, ['energy'], ['physical', 'fire', 'death'], [MEDAL(0.3), FRAG, KEY], hp_m=1.18, atk_m=1.02)
mon('shadow_heroine', 'Heroína das Sombras', 'Shadow Heroine', 496, 1000, ['holy'], ['death', 'physical'], [MEDAL(0.28), FRAG], hp_m=0.92, atk_m=1.14)
mon('lost_paladin', 'Paladina Perdida', 'Lost Paladin', 496, 1200, ['death', 'energy'], ['holy', 'physical'],
    [MEDAL(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.1, atk_m=1.06)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py), a mesma das regiões anteriores.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop475_sword', 'chance': 0.05}, {'item': 'drop475_bow', 'chance': 0.05},
              {'item': 'drop475_staff', 'chance': 0.05}, {'item': 'drop475_mace', 'chance': 0.05}]
mon('heroine_archmage', 'Arquimaga Heroica', 'Heroic Archmage', 490, 1150, ['physical', 'holy'], ['energy', 'death'],
    [MEDAL(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=16.1, gold_m=4, tiers=inst(490))
mon('hero_captain', 'Capitão dos Heróis', 'Hero Captain', 490, 1200, ['holy', 'energy'], ['physical', 'fire', 'death'],
    [{'item': 'hero_medal', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=31.8, gold_m=8, tiers=inst(490))
# Covil final (aba Chefes): o Campeão Caído.
mon('fallen_champion', 'O Campeão Caído', 'The Fallen Champion', 500, 1200, ['holy', 'energy'], ['physical', 'death', 'fire'],
    [{'item': 'hero_medal', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 3, 'max': 6}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=630, gold_m=25, tiers=inst(500))

# Ajuste dos chefes (vida, ataque), na proporção das regiões anteriores; calibrado no sim_lairs.ts.
BOSS_TUNE = {'heroine_archmage': (0.32, 0.47), 'hero_captain': (0.26, 0.43), 'fallen_champion': (0.046, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'fallen_heroes_hall', 'name': 'Salão dos Heróis Caídos', 'en': 'Hall of Fallen Heroes', 'level': 480,
     'monsters': ['fallen_warrior', 'fallen_ranger', 'fallen_mage'], 'focus': 'xp'},
    {'id': 'champions_gallery', 'name': 'Galeria dos Campeões', 'en': 'Champions Gallery', 'level': 488,
     'monsters': ['fallen_cleric', 'hero_vigilante', 'hero_monk'], 'focus': 'balanced'},
    {'id': 'legends_crypt', 'name': 'Cripta das Lendas', 'en': 'Crypt of Legends', 'level': 496,
     'monsters': ['champion_knight', 'shadow_heroine', 'lost_paladin'], 'focus': 'loot'},
    {'id': 'oath_hall', 'name': 'Salão do Juramento', 'en': 'Hall of the Oath', 'level': 490, 'monsters': ['heroine_archmage', 'hero_captain'],
     'boss': True, 'key': 'oath_key', 'trash': ['fallen_warrior', 'fallen_cleric', 'shadow_heroine']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'champion_throne', 'name': 'Trono do Campeão Caído', 'region': LAIR_REGION, 'level': 500, 'monsters': ['fallen_champion'], 'lair': True})
i18n_content['Trono do Campeão Caído'] = "Fallen Champion's Throne"
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 12% acima do do Grão-Infernalista (475), o mais forte do jogo e três partes que montam a arma da
# classe, 16% acima da arma de drop do 475 (covil final).
LAIR_MULT, LAIR_HUE = 1.16, 0.12


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('do Campeão Caído', 'of the Fallen Champion')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'champion_throne_{slot}', by_item[f'drop475_{slot}'], by_item[f'flame_throne_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 35000, 'equip': up(f['equip'], 1.12, 500)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('champion_crest', 'Brasão do Campeão', "Champion's Crest", 'crystal_heart'),
         ('broken_oath', 'Juramento Partido', 'Broken Oath', 'bone'),
         ('hero_soul', 'Alma de Herói', 'Hero Soul', 'demon_heart')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 20000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'hero_medal': 10}, 'crafting': {'worldtree_logs': 6, 'hero_medal': 10}}
WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
for voc, w, skill, pt, en in WEAPONS:
    wid, b = f'champion_throne_{w}', by_item[f'drop475_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 500); eq['vocations'] = [voc]; eq['element'] = 'holy'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 100000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 120, 'intervalMs': 30000, 'xp': 12000,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})

# Bolsa de Armas (0,1%), como as dos outros covis: tira a réplica (80%) de uma das 4 armas do covil.
pool = []
for voc, w, skill, pt, en in WEAPONS:
    o = by_item[f'champion_throne_{w}']
    rid = f'replica_champion_throne_{w}'
    put(items, by_item, {'id': rid, 'name': f'{o["name"]} (Réplica)', 'icon': o['icon'], 'value': 50000, 'equip': up(o['equip'], 0.8, 500)})
    i18n_items[f'{o["name"]} (Réplica)'] = f'{i18n_items[o["name"]]} (Replica)'
    pool.append(rid)
recolor(Image.open(ICONS + 'asura_throne_pouch.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + 'champion_throne_pouch.png')
put(items, by_item, {'id': 'champion_throne_pouch', 'name': 'Bolsa de Armas do Campeão Caído', 'icon': 'champion_throne_pouch', 'legendary': True,
                     'pouch': True, 'value': 100000, 'pool': pool})
i18n_items['Bolsa de Armas do Campeão Caído'] = "Fallen Champion's Weapon Pouch"
boss = by_mon['fallen_champion']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('champion_throne_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
boss['loot'].append({'item': 'champion_throne_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
