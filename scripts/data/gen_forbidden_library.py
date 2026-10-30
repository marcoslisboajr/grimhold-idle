# Fase 2 do 250 ao 325, região 1: a Biblioteca Proibida (250-275), inspirada nas bibliotecas de fogo,
# gelo e energia. Escribas e bibliotecários mortos-vivos dos três elementos e os elementais soltos dos
# livros. Três caçadas (255 XP, 263 balanceada, 272 loot), a instância do Guardião do Índice e do
# Arquibibliotecário Dourado (265, com chave) e o covil do Arquibibliotecário Desperto (275, aba Chefes).
# Depois do 250 cada nível custa o mesmo XP, então a XP por monstro sobe pouco (5% a cada 5 níveis).
# Gelo é o elemento 'water' do jogo.
# Sprites: scripts/sprites_library_catacombs_asuras.py. Mapas: client/src/world/map.ts e WorldView.tsx.
# Uso: python scripts/data/gen_forbidden_library.py   (idempotente)
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


REGION, REGION_EN = 'Biblioteca Proibida', 'Forbidden Library'
LAIR_REGION, LAIR_REGION_EN = 'Domínio da Biblioteca', 'Domain of the Library'
items = load(D + 'items.json'); by_item = {i['id']: i for i in items}
monsters = load(D + 'monsters.json'); by_mon = {m['id']: m for m in monsters}
hunts = load(D + 'hunts.json'); by_hunt = {h['id']: h for h in hunts}
smithing = load(D + 'smithing.json'); by_sm = {s['id']: s for s in smithing}
i18n_items = load(I18N_ITEMS); i18n_content = load(I18N_CONTENT)
base = by_mon['chaos_avatar']
gold = next(l for l in base['loot'] if l['item'] == 'gold')


def put(lst, by, obj):
    if obj['id'] in by: by[obj['id']].clear(); by[obj['id']].update(obj)
    else: lst.append(obj); by[obj['id']] = obj


# ── Material e chave ──────────────────────────────────────────────────────────
recolor(Image.open(ICONS + 'astral_tome.png'), 0.08).save(ICONS + 'forbidden_page.png')
put(items, by_item, {'id': 'forbidden_page', 'name': 'Página Proibida', 'icon': 'forbidden_page', 'value': round(by_item['chaos_fragment']['value'] * 3.5)})
i18n_items['Página Proibida'] = 'Forbidden Page'
recolor(Image.open(ICONS + 'chaos_key.png'), 0.78).save(ICONS + 'index_key.png')
put(items, by_item, {'id': 'index_key', 'name': 'Chave do Índice', 'icon': 'index_key'})
i18n_items['Chave do Índice'] = 'Index Key'
put(smithing, by_sm, {'id': 'index_key', 'name': 'Chave do Índice', 'level': 120, 'intervalMs': 12000, 'xp': 20000,
                      'inputs': {'adamant_bar': 4, 'forbidden_page': 6, 'golden_mane': 2, 'chaos_fragment': 2, 'coal': 12}, 'output': 'index_key'})

# ── Monstros ──────────────────────────────────────────────────────────────────
# Vida, ataque e defesa seguem a curva da Fortaleza (gen_falcon_war.py). A XP parte do que a curva
# daria no 250 e sobe 5% a cada 5 níveis.
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


# Medido no jogo (17/10): a XP da curva dava Biblioteca 0,11-0,13 nível/h, contra 0,05-0,07 das caçadas do 230 e 245.
# A XP de tudo da região (monstros e chefes) é cortada para ficar nessa faixa.
XP_SCALE = 0.45


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None, sprite=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite or mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


PAGE = lambda c: {'item': 'forbidden_page', 'chance': c}
KEY = {'item': 'index_key', 'chance': 0.0007}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
mon('burning_scribe', 'Escriba Ardente', 'Burning Scribe', 255, 1150, ['water'], ['fire'], [PAGE(0.2), FRAG, KEY], hp_m=0.92, atk_m=1.04)
mon('frost_librarian', 'Bibliotecário Gélido', 'Frost Librarian', 255, 1200, ['fire'], ['water'], [PAGE(0.2), FRAG, KEY])
mon('living_flame', 'Chama Viva', 'Living Flame', 260, 1000, ['water'], ['fire', 'physical'], [PAGE(0.15), FRAG], hp_m=0.82, atk_m=1.08)
mon('frost_wisp', 'Fogo-Fátuo Gélido', 'Frost Wisp', 260, 1000, ['fire'], ['water', 'physical'], [PAGE(0.15), FRAG], hp_m=0.82, atk_m=1.08)
mon('storm_arcanist', 'Arcanista da Tempestade', 'Storm Arcanist', 268, 1150, ['earth'], ['energy'], [PAGE(0.25), FRAG, KEY], hp_m=0.95, atk_m=1.05)
mon('storm_wisp', 'Fogo-Fátuo da Tempestade', 'Storm Wisp', 268, 1000, ['earth'], ['energy', 'physical'], [PAGE(0.2), FRAG], hp_m=0.85, atk_m=1.1)


# Chefes: a curva das instâncias da Fortaleza (inst() de gen_falcon_war.py) seguida até o 275.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop255_sword', 'chance': 0.05}, {'item': 'drop255_bow', 'chance': 0.05},
              {'item': 'drop255_staff', 'chance': 0.05}, {'item': 'drop255_mace', 'chance': 0.05}]
mon('index_keeper', 'Guardião do Índice', 'Keeper of the Index', 265, 1200, ['holy'], ['death', 'water'],
    [PAGE(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}], hp_m=3.0, atk_m=1.04, xp_m=3.5, gold_m=4, tiers=inst(265))
mon('golden_archlibrarian', 'Arquibibliotecário Dourado', 'Golden Archlibrarian', 265, 1300, ['death'], ['fire', 'energy', 'holy'],
    [{'item': 'forbidden_page', 'chance': 1, 'min': 4, 'max': 8}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=7, gold_m=8, tiers=inst(265))
# Covil (aba Chefes): o Arquibibliotecário desperto, 10x a XP do chefe da instância (como o Aldoran
# renascido em gen_lion_lairs.py).
mon('archlibrarian_awakened', 'Arquibibliotecário Desperto', 'Awakened Archlibrarian', 275, 1250, ['death'], ['fire', 'energy', 'holy'],
    [{'item': 'forbidden_page', 'chance': 1, 'min': 10, 'max': 20}, {'item': 'divine_ichor', 'chance': 1, 'min': 2, 'max': 4}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=70, gold_m=20, tiers=inst(275), sprite='golden_archlibrarian')

# Ajuste dos chefes (vida, ataque), na proporção dos chefes da Fortaleza.
BOSS_TUNE = {'index_keeper': (0.33, 0.48), 'golden_archlibrarian': (0.27, 0.44), 'archlibrarian_awakened': (0.104, 0.3)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)
    by_mon[bid]['xp'] = int(round(by_mon[bid]['xp'] * 0.5, -3))  # metade da XP nos chefes do 130+ (cut_boss_xp_130.py)

# ── Caçadas, instância e covil ────────────────────────────────────────────────
HUNTS = [
    {'id': 'burning_stacks', 'name': 'Estantes em Chamas', 'en': 'Burning Stacks', 'level': 255, 'monsters': ['burning_scribe', 'frost_librarian', 'living_flame'], 'focus': 'xp'},
    {'id': 'frozen_archive', 'name': 'Arquivo Congelado', 'en': 'Frozen Archive', 'level': 263, 'monsters': ['frost_librarian', 'frost_wisp', 'living_flame'], 'focus': 'balanced'},
    {'id': 'storm_reading_room', 'name': 'Sala de Leitura da Tempestade', 'en': 'Storm Reading Room', 'level': 272, 'monsters': ['storm_arcanist', 'storm_wisp', 'burning_scribe'], 'focus': 'loot'},
    {'id': 'index_vault', 'name': 'Cofre do Índice', 'en': 'Vault of the Index', 'level': 265, 'monsters': ['index_keeper', 'golden_archlibrarian'], 'boss': True, 'key': 'index_key',
     'trash': ['burning_scribe', 'frost_librarian', 'storm_arcanist']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
put(hunts, by_hunt, {'id': 'golden_reading_hall', 'name': 'Salão Dourado', 'region': LAIR_REGION, 'level': 275, 'monsters': ['archlibrarian_awakened'], 'lair': True})
i18n_content['Salão Dourado'] = 'Golden Hall'
i18n_content[REGION] = REGION_EN
i18n_content[LAIR_REGION] = LAIR_REGION_EN

# ── Prêmios do covil (como gen_lion_lairs.py): set raro (amuleto, anel e botas, 0,2% cada) e três
# partes (0,3% cada) que montam a arma da classe. Tudo 12% acima da peça de drop do 255.
crafting = load(D + 'crafting.json'); by_cr = {c['id']: c for c in crafting}
LAIR_MULT, LAIR_HUE = 1.12, 0.13


def boosted(equip, level, vocs=None):
    out = {'slot': equip['slot'], 'level': level}
    for k, v in equip.items():
        if k in ('slot', 'level', 'vocations', 'element'): continue
        out[k] = v if k == 'speed' and v > 0 else (round(v * LAIR_MULT, 3) if isinstance(v, float) else round(v * LAIR_MULT))
    if vocs: out['vocations'] = vocs
    return out


TAG = ('do Arquibibliotecário', 'of the Archlibrarian')
lair_loot = []
for slot, (pt, en) in {'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')}.items():
    # O set parte do set do Ninho do Gavião (240), 8% acima: as botas e o anel de drop do 255 ficam abaixo dele.
    iid, b, f = f'golden_reading_hall_{slot}', by_item[f'drop255_{slot}'], by_item[f'falcon_nest_{slot}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 0.9, 1.05).save(ICONS + iid + '.png')
    eq = {k: (275 if k == 'level' else v if not isinstance(v, (int, float)) or isinstance(v, bool) else round(v * 1.08, 3) if isinstance(v, float) else max(1, round(v * 1.08)))
          for k, v in f['equip'].items()}
    put(items, by_item, {'id': iid, 'name': f'{pt} {TAG[0]}', 'icon': iid, 'legendary': True, 'value': 14000, 'equip': eq})
    i18n_items[f'{pt} {TAG[0]}'] = f'{en} {TAG[1]}'
    lair_loot.append({'item': iid, 'chance': 0.002})
PARTS = [('archive_quill', 'Pena do Arquivista', "Archivist's Quill", 'void_shard'),
         ('index_seal', 'Selo do Índice', 'Seal of the Index', 'infernal_core'),
         ('golden_binding', 'Encadernação Dourada', 'Golden Binding', 'halo_shard')]
for iid, pt, en, src in PARTS:
    recolor(Image.open(ICONS + src + '.png'), LAIR_HUE, 1.0, 1.1).save(ICONS + iid + '.png')
    put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 10000})
    i18n_items[pt] = en
    lair_loot.append({'item': iid, 'chance': 0.003})
EXTRA = {'smithing': {'adamant_bar': 6, 'forbidden_page': 10}, 'crafting': {'worldtree_logs': 6, 'forbidden_page': 10}}
for voc, w, skill, pt, en in [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
                              ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]:
    wid, b = f'golden_reading_hall_{w}', by_item[f'drop255_{w}']
    recolor(Image.open(ICONS + b['icon'] + '.png'), LAIR_HUE, 1.0, 1.1).save(ICONS + wid + '.png')
    eq = boosted(b['equip'], 275, [voc]); eq['element'] = 'holy'; eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * LAIR_MULT) + 2
    name = f'{pt} {TAG[0]}'
    put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 45000, 'equip': eq})
    i18n_items[name] = f'{en} {TAG[1]}'
    lst, by = (smithing, by_sm) if skill == 'smithing' else (crafting, by_cr)
    put(lst, by, {'id': wid, 'name': name, 'level': 115, 'intervalMs': 30000, 'xp': 7000,
                  'inputs': {**{p[0]: 1 for p in PARTS}, **EXTRA[skill]}, 'output': wid})
boss = by_mon['archlibrarian_awakened']
boss['loot'] = [l for l in boss['loot'] if not l['item'].startswith('golden_reading_hall_') and l['item'] not in {p[0] for p in PARTS}] + lair_loot
# Bolsa de armas (0,1%), como as bolsas dos chefes globais: tira uma das 4 armas do covil.
if 'golden_reading_hall_pouch' in by_item: boss['loot'].append({'item': 'golden_reading_hall_pouch', 'chance': 0.001})
save(D + 'crafting.json', crafting)

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
