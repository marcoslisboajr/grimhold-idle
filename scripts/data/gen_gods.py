# Deuses do Grimhold: os 4 deuses (um por vocação), os covis da aba Chefes e os itens divinos.
# - Set de 4 peças de cada deus (cai do chefe do covil, com chance mínima, e do Avatar no chefe global, com mais).
# - Arma de cada deus: só por criação, juntando as 3 partes (que caem dos mesmos chefes).
# - Covil: caçada `lair` com um chefe só, enfrentado de novo e de novo.
# - Sprites dos chefes e do Avatar (chefe global) e ícones: recolor do que já está no jogo.
# Os Avatares em si (chefe global) ficam em shared/src/worldboss.ts; os mapas em client/src/world/map.ts.
# Uso: python scripts/data/gen_gods.py   (idempotente)
# NÃO RODAR (17/10/2026): os dados foram ajustados à mão depois deste gerador (chances dos covis dos deuses a 2%, receitas no nível 80 e bolsa).
# Rodar de novo desfaz esses ajustes. Para rodar mesmo assim: GRIMHOLD_FORCE_GEN=1.
import os as _os, sys as _sys
if _os.environ.get('GRIMHOLD_FORCE_GEN') != '1':
    _sys.exit('Gerador antigo: desfaria ajustes feitos à mão (chances dos covis dos deuses a 2%, receitas no nível 80 e bolsa). Use GRIMHOLD_FORCE_GEN=1 para forçar.')

import colorsys, json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
MON = ROOT + '/client/public/assets/monsters/'
# Sprites próprios (scripts/sprites_gods.py): não repintar por cima.
OWN_SPRITES = {'kharvos_avatar', 'sylveth_avatar', 'aethon_avatar', 'lumira_avatar', 'gorrak', 'vhessa', 'oruun', 'irael'}
ICO = ROOT + '/client/public/assets/icons/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'


def tint(im, hue, sat, vm):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, max(s, 0.15) * sat * 1.6), min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


def read_json(p):
    raw = open(p, encoding='utf8', newline='').read()
    return json.loads(raw), raw


def write_json(p, data, raw):
    """Mantém o estilo do arquivo: indentado ou um objeto por linha; e o fim de linha (CRLF/LF)."""
    nl = '\r\n' if '\r\n' in raw else '\n'
    body = raw.replace('\r\n', '\n')
    if isinstance(data, list) and not body.startswith('[\n  {\n'):
        text = '[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in data) + '\n]\n'
    else:
        text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    open(p, 'w', encoding='utf8', newline='').write(text.replace('\n', nl))


# Chance por abate no covil de cada peça do set e de cada parte da arma do deus dele. O covil tem cooldown
# de 24 h (uma luta por dia). Bem raro de propósito (como os itens mais fortes dos chefes no Tibia):
# uma peça a cada ~4 meses de covil por dia, fora o Avatar no chefe global.
LAIR_ARMOR_CHANCE = 0.002
LAIR_PART_CHANCE = 0.003
# Covis menores (do 80 ao 120, chefes mais fáceis): os servos de cada deus soltam o mesmo set e as
# mesmas partes, com um terço da chance.
LESSER_CHANCE = 1 / 3
# Itens divinos: nível de uso e quanto passam do melhor criável do mesmo nível.
GOD_LEVEL = 160
GOD_MULT = 1.12

GODS = [
    dict(
        id='kharvos', name='Kharvos', voc='warrior', element='fire', hue=8,
        armor={'helm': ('Elmo de Kharvos', "Kharvos' Helm", 'primordial_helmet'),
               'armor': ('Couraça de Kharvos', "Kharvos' Cuirass", 'primordial_armor'),
               'legs': ('Grevas de Kharvos', "Kharvos' Greaves", 'primordial_legs'),
               'boots': ('Botas de Guerra de Kharvos', "Kharvos' War Boots", 'primordial_boots')},
        weapon=('kharvos_greatsword', 'Espadão de Kharvos', "Kharvos' Greatsword", 'primordial_sword', 'smithing', {'primordial_bar': 6}),
        parts=[('kharvos_blade', 'Lâmina Partida de Kharvos', "Kharvos' Broken Blade"),
               ('kharvos_guard', 'Guarda de Kharvos', "Kharvos' Crossguard"),
               ('kharvos_hilt', 'Punho de Kharvos', "Kharvos' Hilt")],
        lair=('kharvos_fortress', 'Fortaleza de Kharvos', "Kharvos' Fortress", 170, 'malphas', (15200, 0.6, 250000000),
              ('gorrak', 'Gorrak, Campeão de Kharvos', 'Gorrak, Champion of Kharvos', 'minotaur_king', (8, 0.75, 0.85))),
        lesser=('kharvos_arena', 'Arena de Kharvos', "Kharvos' Arena", 120, 'zathroth', (10500, 0.65, 6700000),
                ('brakka', 'Brakka, Gladiadora de Kharvos', 'Brakka, Gladiator of Kharvos', 'orc_berserker', (8, 0.7, 0.9))),
        avatar=('kharvos_avatar', 'cavaleiro_negro', (8, 0.8, 0.9)),
        weak=['water'], resist=['fire'],
    ),
    dict(
        id='sylveth', name='Sylveth', voc='hunter', element='earth', hue=150,
        armor={'helm': ('Capuz de Sylveth', "Sylveth's Hood", 'primal_leather_helmet'),
               'armor': ('Gibão de Sylveth', "Sylveth's Jerkin", 'primal_leather_armor'),
               'legs': ('Calças de Sylveth', "Sylveth's Leggings", 'primal_leather_legs'),
               'boots': ('Botas Lunares de Sylveth', "Sylveth's Moon Boots", 'primordial_boots')},
        weapon=('sylveth_moonbow', 'Arco Lunar de Sylveth', "Sylveth's Moonbow", 'primal_bow', 'crafting', {'worldtree_logs': 6, 'primordial_soul': 4}),
        parts=[('sylveth_upper_limb', 'Braço Superior do Arco Lunar', 'Moonbow Upper Limb'),
               ('sylveth_lower_limb', 'Braço Inferior do Arco Lunar', 'Moonbow Lower Limb'),
               ('sylveth_string', 'Corda de Luar', 'Moonlight String')],
        lair=('sylveth_grove', 'Bosque do Luar', 'Moonlit Grove', 140, 'gorvath', (13700, 0.7, 27000000),
              ('vhessa', 'Vhessa, Caçadora de Sylveth', 'Vhessa, Huntress of Sylveth', 'centaur_archer', (150, 0.6, 0.95))),
        lesser=('sylveth_glade', 'Clareira dos Uivos', 'Howling Glade', 95, 'xyloth', (9000, 0.65, 1800000),
                ('fenra', 'Fenra, Loba de Sylveth', 'Fenra, Wolf of Sylveth', 'lobo', (150, 0.55, 1.1))),
        avatar=('sylveth_avatar', 'harpy', (155, 0.55, 1.15)),
        weak=['fire'], resist=['earth'],
    ),
    dict(
        id='aethon', name='Aethon', voc='arcanist', element='energy', hue=215,
        armor={'helm': ('Coroa de Aethon', "Aethon's Crown", 'primal_robe_helmet'),
               'armor': ('Manto de Aethon', "Aethon's Robe", 'primal_robe_armor'),
               'legs': ('Calças de Aethon', "Aethon's Leggings", 'primal_robe_legs'),
               'boots': ('Sandálias de Aethon', "Aethon's Sandals", 'primordial_boots')},
        weapon=('aethon_stormstaff', 'Cajado da Tempestade de Aethon', "Aethon's Stormstaff", 'primal_staff', 'crafting', {'worldtree_logs': 6, 'primordial_soul': 4}),
        parts=[('aethon_shaft', 'Haste de Aethon', "Aethon's Shaft"),
               ('aethon_storm_eye', 'Olho da Tempestade', 'Eye of the Storm'),
               ('aethon_crown_of_bolts', 'Coroa de Raios', 'Crown of Bolts')],
        lair=('aethon_spire', 'Espiral da Tempestade', 'Storm Spire', 160, 'nekhart', (14500, 0.65, 120000000),
              ('oruun', 'Oruun, Profeta de Aethon', 'Oruun, Prophet of Aethon', 'mind_flayer', (215, 0.7, 1.0))),
        lesser=('aethon_tower', 'Torre dos Raios', 'Lightning Tower', 105, 'ghazbaran', (8500, 0.65, 3600000),
                ('kael', 'Kael, Aprendiz de Aethon', 'Kael, Apprentice of Aethon', 'cultista_vermelho', (215, 0.7, 1.0))),
        avatar=('aethon_avatar', 'void_herald', (205, 0.75, 1.1)),
        weak=['earth'], resist=['energy'],
    ),
    dict(
        id='lumira', name='Lumira', voc='devout', element='holy', hue=45,
        armor={'helm': ('Mitra de Lumira', "Lumira's Mitre", 'primordial_holy_helmet'),
               'armor': ('Cota de Lumira', "Lumira's Hauberk", 'primordial_holy_armor'),
               'legs': ('Calças Sagradas de Lumira', "Lumira's Holy Legs", 'primordial_holy_legs'),
               'boots': ('Botas da Aurora de Lumira', "Lumira's Dawn Boots", 'primordial_boots')},
        weapon=('lumira_dawnhammer', 'Martelo da Aurora de Lumira', "Lumira's Dawnhammer", 'primordial_mace', 'smithing', {'primordial_bar': 6}),
        parts=[('lumira_hammer_head', 'Cabeça do Martelo da Aurora', 'Dawnhammer Head'),
               ('lumira_haft', 'Cabo de Lumira', "Lumira's Haft"),
               ('lumira_dawn_crest', 'Brasão da Aurora', 'Dawn Crest')],
        lair=('lumira_cathedral', 'Catedral da Aurora', 'Cathedral of Dawn', 130, 'pyrgoth', (11800, 0.7, 14000000),
              ('irael', 'Irael, Guardiã de Lumira', 'Irael, Warden of Lumira', 'fallen_seraph', (45, 0.65, 1.15))),
        lesser=('lumira_chapel', 'Capela do Alvorecer', 'Chapel of Daybreak', 80, 'mordrek', (6500, 0.65, 780000),
                ('elisande', 'Elisande, Acólita de Lumira', 'Elisande, Acolyte of Lumira', 'banshee', (45, 0.6, 1.2))),
        avatar=('lumira_avatar', 'anjo_sombrio', (48, 0.7, 1.2)),
        weak=['death'], resist=['holy'],
    ),
]
PART_ICONS = ['void_shard', 'infernal_core', 'halo_shard']
# Loot do chefe do covil em relação ao chefe da instância do mesmo nível. Vida e ataque (fração do da instância)
# ficam no covil, calibrados com server/scripts/sim_lairs.ts (~35 s de luta, ninguém morre no nível); a XP vale
# ~20 min da melhor caçada do nível (é uma luta por dia).
LAIR_GOLD, LAIR_MATS = 3, 1

items, items_raw = read_json(D + 'items.json')
monsters, monsters_raw = read_json(D + 'monsters.json')
hunts, hunts_raw = read_json(D + 'hunts.json')
recipes = {s: read_json(D + f'{s}.json') for s in ('smithing', 'crafting')}
i18n_items, i18n_items_raw = read_json(I18N_ITEMS)
i18n_content, i18n_content_raw = read_json(I18N_CONTENT)
by_item = {i['id']: i for i in items}
by_mon = {m['id']: m for m in monsters}
by_hunt = {h['id']: h for h in hunts}


def put(lst, by, obj):
    if obj['id'] in by:
        by[obj['id']].clear()
        by[obj['id']].update(obj)
    else:
        lst.append(obj)
        by[obj['id']] = obj


def boosted(equip, voc):
    """O item base do mesmo nível, uns 12% mais forte, preso à vocação do deus."""
    out = {'slot': equip['slot'], 'level': GOD_LEVEL, 'vocations': [voc]}
    for k, v in equip.items():
        if k in ('slot', 'level', 'vocations', 'element'):
            continue
        out[k] = round(v * GOD_MULT, 3) if isinstance(v, float) else round(v * GOD_MULT)
    return out


def make_lair(lair, divine, weak, resist, region, region_en, gold_mult=None, mats_mult=None):
    """Covil: o chefe sozinho, uma luta por entrada. Vida, ataque e XP calibrados no sim_lairs.ts."""
    gold_mult = LAIR_GOLD if gold_mult is None else gold_mult
    mats_mult = LAIR_MATS if mats_mult is None else mats_mult
    hid, hpt, hen, level, base_boss, (hp, atk, xp), (mid, mpt, men, sprite, color) = lair
    for n in range(1, 5 if mid not in OWN_SPRITES else 1):
        tint(Image.open(MON + f'{sprite}_{n}.png'), *color).save(MON + f'{mid}_{n}.png')
    base = by_mon[base_boss]
    # O loot a mais (divine) manda: o mesmo item do chefe de base não entra duas vezes.
    extra = {l['item'] for l in divine}
    mats = [l for l in base['loot'] if l['item'] != 'gold' and l['item'] not in extra and not by_item.get(l['item'], {}).get('equip') and not l['item'].endswith('_key')]
    gold = next(l for l in base['loot'] if l['item'] == 'gold')
    put(monsters, by_mon, {
        'id': mid, 'name': mpt, 'sprite': mid,
        'hp': hp, 'attack': round(base['attack'] * atk), 'defense': base['defense'],
        'attackSpeedMs': base.get('attackSpeedMs', 1200), 'xp': xp,
        'loot': [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * gold_mult), 'max': round(gold['max'] * gold_mult)}]
                + [{**l, 'chance': round(min(1, l['chance']) * mats_mult, 3)} for l in mats] + divine,
        **({'weak': weak} if weak else {}), **({'resist': resist} if resist else {}),
    })
    i18n_content[mpt] = men
    put(hunts, by_hunt, {'id': hid, 'name': hpt, 'region': region, 'level': level, 'monsters': [mid], 'lair': True})
    i18n_content[hpt] = hen
    i18n_content[region] = region_en


# Covis simples para nível baixo (10 a 65): sem itens dos deuses e com pouco loot (ouro, um pouco de
# material e, às vezes, um equipamento de chefe). Mesmo formato do covil: (id, PT, EN, nível, chefe de
# instância de base, (vida, ataque, XP), (id do chefe, PT, EN, sprite, cor)), fraquezas e resistências.
LOW_LAIRS = [
    (('boar_den', 'Toca do Javali Rei', "Boar King's Den", 10, 'goblin_king', (860, 0.7, 3000),
      ('boar_king', 'Presa-Torta, o Javali Rei', 'Crooktusk, the Boar King', 'javali', (25, 0.6, 1.0))), ['fire'], []),
    (('spider_mother_nest', 'Ninho da Aranha-Mãe', "Spider Mother's Nest", 25, 'elder_medusa', (1700, 0.7, 6300),
      ('spider_mother', 'Aranha-Mãe', 'Spider Mother', 'aranha', (290, 0.65, 1.3))), ['fire'], ['earth']),
    (('grey_wolf_lair', 'Covil do Lobo Cinzento', 'Grey Wolf Lair', 38, 'minotaur_king', (2500, 0.7, 16000),
      ('grey_claw', 'Garra Cinzenta', 'Grey Claw', 'tribo_lobo', (210, 0.15, 0.95))), ['fire'], []),
    (('hungry_ogre_cave', 'Caverna do Ogro Faminto', 'Hungry Ogre Cave', 46, 'brontes', (3000, 0.7, 26000),
      ('grumm', 'Grumm, o Ogro Faminto', 'Grumm, the Hungry Ogre', 'ogre', (35, 0.5, 0.9))), ['energy'], []),
    (('forgotten_knight_crypt', 'Cripta do Cavaleiro Esquecido', 'Crypt of the Forgotten Knight', 65, 'count_varnak', (4600, 0.7, 68000),
      ('sir_aldric', 'Sir Aldric, o Esquecido', 'Sir Aldric, the Forgotten', 'cavaleiro_negro', (230, 0.35, 0.85))), ['holy'], ['death']),
]
LOW_GOLD, LOW_MATS = 1, 0.5
# Loot a mais de algum chefe simples (o Grumm, da caverna do 46, solta barras de mithril).
LOW_EXTRA = {'grumm': [{'item': 'mithril_bar', 'chance': 0.5, 'min': 1, 'max': 3}]}


# Ids novos não podem pisar no que já existia (exceto o que este script mesmo criou antes).
MARK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gen_gods.ids.json')
previous = set(json.load(open(MARK))) if os.path.exists(MARK) else set()
ours = set()
for g in GODS:
    ours |= {f"{g['id']}_{p}" for p in g['armor']} | {g['weapon'][0], g['lair'][0], g['lair'][6][0], g['lesser'][0], g['lesser'][6][0]} | {p[0] for p in g['parts']}
for lair, _, _ in LOW_LAIRS:
    ours |= {lair[0], lair[6][0]}
clash = [i for i in ours if i not in previous and (i in by_mon or i in by_hunt or i in by_item)]
assert not clash, f'ids já usados: {clash}'

for g in GODS:
    gid, voc, hue = g['id'], g['voc'], g['hue']
    loot_armor, loot_parts = [], []
    # Set do deus.
    for part, (pt, en, base) in g['armor'].items():
        iid = f'{gid}_{part}'
        b = by_item[base]
        tint(Image.open(ICO + b['icon'] + '.png'), hue, 0.75, 1.05).save(ICO + iid + '.png')
        put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 8000, 'equip': boosted(b['equip'], voc)})
        i18n_items[pt] = en
        loot_armor.append({'item': iid, 'chance': round(LAIR_ARMOR_CHANCE, 5)})
    # Partes da arma.
    for (iid, pt, en), src in zip(g['parts'], PART_ICONS):
        tint(Image.open(ICO + src + '.png'), hue, 0.8, 1.1).save(ICO + iid + '.png')
        put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 6000})
        i18n_items[pt] = en
        loot_parts.append({'item': iid, 'chance': round(LAIR_PART_CHANCE, 5)})
    # Arma: só por criação, com as 3 partes.
    wid, wpt, wen, wbase, skill, extra = g['weapon']
    b = by_item[wbase]
    tint(Image.open(ICO + b['icon'] + '.png'), hue, 0.8, 1.1).save(ICO + wid + '.png')
    weq = boosted(b['equip'], voc)
    weq['element'] = g['element']
    weq['elementAttack'] = 18
    put(items, by_item, {'id': wid, 'name': wpt, 'icon': wid, 'legendary': True, 'value': 25000, 'equip': weq})
    i18n_items[wpt] = wen
    lst, raw = recipes[skill]
    by_r = {r['id']: r for r in lst}
    put(lst, by_r, {'id': wid, 'name': wpt, 'level': 105, 'intervalMs': 30000, 'xp': 3000,
                    'inputs': {**{p[0]: 1 for p in g['parts']}, **extra}, 'output': wid})

    # Covis (aba Chefes): o principal e o menor (mais fácil, com um terço da chance dos itens do deus).
    for lair, mult in ((g['lair'], 1), (g['lesser'], LESSER_CHANCE)):
        make_lair(lair, [{**l, 'chance': round(l['chance'] * mult, 5)} for l in loot_armor + loot_parts],
                  g['weak'], g['resist'], f"Domínio de {g['name']}", f"Domain of {g['name']}")

    # Avatar (chefe global): só o sprite; a ficha dele fica em worldboss.ts.
    aid, asprite, acolor = g['avatar']
    for n in range(1, 5 if aid not in OWN_SPRITES else 1):
        tint(Image.open(MON + f'{asprite}_{n}.png'), *acolor).save(MON + f'{aid}_{n}.png')

for lair, weak, resist in LOW_LAIRS:
    make_lair(lair, LOW_EXTRA.get(lair[6][0], []), weak, resist, 'Covis do Bastião', 'Bastion Lairs', LOW_GOLD, LOW_MATS)

hunts.sort(key=lambda h: h['level'])
write_json(D + 'items.json', items, items_raw)
write_json(D + 'monsters.json', monsters, monsters_raw)
write_json(D + 'hunts.json', hunts, hunts_raw)
for s, (lst, raw) in recipes.items():
    write_json(D + f'{s}.json', lst, raw)
write_json(I18N_ITEMS, i18n_items, i18n_items_raw)
write_json(I18N_CONTENT, i18n_content, i18n_content_raw)
json.dump(sorted(ours), open(MARK, 'w'))
print('ok:', len(GODS), 'deuses,', len(ours), 'ids')
