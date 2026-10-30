# Fase 2 do 250 ao 325, região 2: as Catacumbas Esquecidas (275-300), mortos-vivos e demônios sob a
# cidade dos reis antigos. Três caçadas (280 XP, 288 balanceada, 296 loot), a instância do Ossuário
# Real (290, com chave: o Demônio do Ossuário e o Rei das Catacumbas) e o covil da Tumba do Rei (300,
# aba Chefes). Mesma curva da Biblioteca Proibida (gen_forbidden_library.py): a XP sobe 5% a cada 5
# níveis. Chefes do 130+ com metade da XP (cut_boss_xp_130.py).
# Sprites: scripts/sprites_library_catacombs_asuras.py. Mapas: client/src/world/map.ts e WorldView.tsx.
# Uso: python scripts/data/gen_forgotten_catacombs.py   (idempotente; depois do gen_forbidden_library.py)
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


REGION, REGION_EN = 'Catacumbas Esquecidas', 'Forgotten Catacombs'
LAIR_REGION, LAIR_REGION_EN = 'Domínio das Catacumbas', 'Domain of the Catacombs'
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
recolor(Image.open(ICONS + 'ancient_bone.png'), 0.75, 0.8, 0.9).save(ICONS + 'cursed_bone.png')
put(items, by_item, {'id': 'cursed_bone', 'name': 'Osso Amaldiçoado', 'icon': 'cursed_bone', 'value': round(by_item['chaos_fragment']['value'] * 4)})
i18n_items['Osso Amaldiçoado'] = 'Cursed Bone'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.1, 0.5, 0.9).save(ICONS + 'ossuary_key.png')
put(items, by_item, {'id': 'ossuary_key', 'name': 'Chave do Ossuário', 'icon': 'ossuary_key'})
i18n_items['Chave do Ossuário'] = 'Ossuary Key'
put(smithing, by_sm, {'id': 'ossuary_key', 'name': 'Chave do Ossuário', 'level': 120, 'intervalMs': 12000, 'xp': 22000,
                      'inputs': {'adamant_bar': 4, 'cursed_bone': 6, 'forbidden_page': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'ossuary_key'})


# ── Monstros ──────────────────────────────────────────────────────────────────
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# Medido no jogo (17/10): a XP da curva dava Catacumbas 0,17-0,22 nível/h, contra 0,05-0,07 das caçadas do 230 e 245.
# A XP de tudo da região (monstros e chefes) é cortada para ficar nessa faixa.
XP_SCALE = 0.27


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


BONE = lambda c: {'item': 'cursed_bone', 'chance': c}
KEY = {'item': 'ossuary_key', 'chance': 0.0005}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
mon('bone_legionary', 'Legionário de Ossos', 'Bone Legionary', 280, 1150, ['holy'], ['death'], [BONE(0.2), FRAG], hp_m=0.9)
mon('bone_guard', 'Guarda de Ossos', 'Bone Guard', 280, 1250, ['holy'], ['death', 'physical'], [BONE(0.2), FRAG, KEY], hp_m=1.05, atk_m=0.97)
mon('bone_swordsman', 'Espadachim de Ossos', 'Bone Swordsman', 284, 1100, ['holy'], ['death'], [BONE(0.22), FRAG], hp_m=0.9, atk_m=1.08)
mon('bone_shieldbearer', 'Escudeiro de Ossos', 'Bone Shieldbearer', 286, 1300, ['holy'], ['death', 'physical'], [BONE(0.22), FRAG, KEY], hp_m=1.12, atk_m=0.94)
mon('catacomb_mummy', 'Múmia das Catacumbas', 'Catacomb Mummy', 288, 1250, ['fire'], ['death', 'earth'], [BONE(0.25), FRAG], hp_m=1.08)
mon('catacomb_wraith', 'Espectro das Catacumbas', 'Catacomb Wraith', 288, 1050, ['holy'], ['physical', 'death'], [BONE(0.2), FRAG], hp_m=0.85, atk_m=1.1)
mon('bone_priest', 'Sacerdote dos Ossos', 'Bone Priest', 294, 1150, ['holy'], ['death'], [BONE(0.28), FRAG, KEY], hp_m=0.95, atk_m=1.05)
mon('grave_necromancer', 'Necromante do Túmulo', 'Grave Necromancer', 294, 1150, ['holy'], ['death', 'water'], [BONE(0.28), FRAG, KEY], hp_m=0.92, atk_m=1.08)
mon('catacomb_demon', 'Demônio das Catacumbas', 'Catacomb Demon', 296, 1300, ['holy', 'water'], ['fire', 'death'],
    [BONE(0.3), FRAG, {'item': 'divine_ichor', 'chance': 0.02}], hp_m=1.15, atk_m=1.04)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py) seguida até o 300.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop285_sword', 'chance': 0.05}, {'item': 'drop285_bow', 'chance': 0.05},
              {'item': 'drop285_staff', 'chance': 0.05}, {'item': 'drop285_mace', 'chance': 0.05}]
mon('ossuary_demon', 'Demônio do Ossuário', 'Ossuary Demon', 290, 1300, ['holy'], ['fire', 'death'],
    [BONE(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}],
    hp_m=3.0, atk_m=1.04, xp_m=3.5, gold_m=4, tiers=inst(290), sprite='catacomb_demon')
mon('catacomb_king', 'Rei das Catacumbas', 'King of the Catacombs', 290, 1300, ['holy'], ['death', 'physical', 'water'],
    [{'item': 'cursed_bone', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=7, gold_m=8, tiers=inst(290))
# Covil (aba Chefes): o Rei desperto, 10x a XP do chefe da instância.
mon('catacomb_king_risen', 'Rei das Catacumbas Desperto', 'Risen King of the Catacombs', 300, 1250, ['holy'], ['death', 'physical', 'water'],
    [{'item': 'cursed_bone', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=70, gold_m=20, tiers=inst(300), sprite='catacomb_king')

# Ajuste dos chefes (vida, ataque), na proporção dos da Biblioteca.
BOSS_TUNE = {'ossuary_demon': (0.32, 0.47), 'catacomb_king': (0.26, 0.43), 'catacomb_king_risen': (0.069, 0.26)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'bone_legion_halls', 'name': 'Salões da Legião de Ossos', 'en': 'Halls of the Bone Legion', 'level': 280,
     'monsters': ['bone_legionary', 'bone_guard', 'bone_swordsman'], 'focus': 'xp'},
    {'id': 'embalmers_crypt', 'name': 'Cripta dos Embalsamadores', 'en': "Embalmers' Crypt", 'level': 288,
     'monsters': ['bone_shieldbearer', 'catacomb_mummy', 'catacomb_wraith'], 'focus': 'balanced'},
    {'id': 'necromancer_sanctum', 'name': 'Santuário Necromante', 'en': 'Necromancer Sanctum', 'level': 296,
     'monsters': ['bone_priest', 'grave_necromancer', 'catacomb_demon'], 'focus': 'loot'},
    {'id': 'royal_ossuary', 'name': 'Ossuário Real', 'en': 'Royal Ossuary', 'level': 290, 'monsters': ['ossuary_demon', 'catacomb_king'],
     'boss': True, 'key': 'ossuary_key', 'trash': ['bone_guard', 'catacomb_mummy', 'grave_necromancer']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'kings_tomb', 'name': 'Tumba do Rei', 'region': LAIR_REGION, 'level': 300, 'monsters': ['catacomb_king_risen'], 'lair': True})
i18n_content['Tumba do Rei'] = "King's Tomb"
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil: set raro 8% acima do Salão Dourado (275) e três partes que montam a arma da
# classe, 12% acima da arma de drop do 285.
LAIR_MULT, LAIR_HUE = 1.12, 0.0


def up(equip, k, level):
    return {key: (level if key == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) or (key == 'speed' and v > 0)
                  else round(v * k, 3) if isinstance(v, float) else max(1, round(v * k))) for key, v in equip.items()}


TAG = ('do Rei Sepulto', 'of the Buried King')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    iid, b, f = f'kings_tomb_{slot}', by_item[f'drop285_{slot}'], by_item[f'golden_reading_hall_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 16000, 'equip': up(f['equip'], 1.08, 300)})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('kings_skull', 'Crânio do Rei', "King's Skull", 'void_shard'),
         ('burial_crown', 'Coroa Sepulcral', 'Burial Crown', 'infernal_core'),
         ('ossuary_sigil', 'Sigilo do Ossuário', 'Ossuary Sigil', 'halo_shard')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 11000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'cursed_bone': 10}, 'crafting': {'worldtree_logs': 6, 'cursed_bone': 10}}
for voc, w, skill, pt, en in [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
                              ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]:
    wid, b = f'kings_tomb_{w}', by_item[f'drop285_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.0).save(ICONS + wid + '.png')
    eq = up(b['equip'], LAIR_MULT, 300); eq['vocations'] = [voc]; eq['element'] = 'death'
    eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 50000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 118, 'intervalMs': 30000, 'xp': 8000,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})
boss = by_mon['catacomb_king_risen']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('kings_tomb_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
# Bolsa de armas (0,1%), como as bolsas dos chefes globais: tira uma das 4 armas do covil.
if 'kings_tomb_pouch' in by_item: boss['loot'].append({'item': 'kings_tomb_pouch', 'chance': 0.001})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing); save(D + 'crafting.json', crafting)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
