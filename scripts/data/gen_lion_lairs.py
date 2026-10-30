# Covis do 200+ na aba Chefes (Domínio de Valdeferro): Drevan livre (210) e Aldoran renascido (240).
# Mesmo formato dos covis dos deuses (gen_gods.py): uma luta, 16 h de cooldown, set com 0,2% por peça
# e 3 partes de arma com 0,3% cada. O set é de peças que toda classe usa (amuleto, anel e botas) e as
# partes montam a arma da sua classe (uma receita por vocação).
# Uso: python scripts/data/gen_lion_lairs.py   (idempotente)
# NÃO RODAR (17/10/2026): os dados foram ajustados à mão depois deste gerador (receitas 85/90, partes a 2% e bolsas).
# Rodar de novo desfaz esses ajustes. Para rodar mesmo assim: GRIMHOLD_FORCE_GEN=1.
import os as _os, sys as _sys
if _os.environ.get('GRIMHOLD_FORCE_GEN') != '1':
    _sys.exit('Gerador antigo: desfaria ajustes feitos à mão (receitas 85/90, partes a 2% e bolsas). Use GRIMHOLD_FORCE_GEN=1 para forçar.')

import colorsys, json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
ICO = ROOT + '/client/public/assets/icons/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'

ARMOR_CHANCE = 0.002  # igual aos covis dos deuses
PART_CHANCE = 0.003
MULT = 1.12           # quanto passam do drop do mesmo nível (como os itens dos deuses)
REGION, REGION_EN = 'Domínio de Valdeferro', 'Domain of Valdeferro'


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
    nl = '\r\n' if '\r\n' in raw else '\n'
    body = raw.replace('\r\n', '\n')
    if isinstance(data, list) and not body.startswith('[\n  {\n'):
        text = '[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in data) + '\n]\n'
    else:
        text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    open(p, 'w', encoding='utf8', newline='').write(text.replace('\n', nl))


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


def boosted(equip, level, vocs=None):
    out = {'slot': equip['slot'], 'level': level}
    for k, v in equip.items():
        if k in ('slot', 'level', 'vocations', 'element'):
            continue
        out[k] = round(v * MULT, 3) if isinstance(v, float) else round(v * MULT)
    if vocs: out['vocations'] = vocs
    return out


WEAPONS = [('warrior', 'sword', 'smithing', 'Espada', 'Sword'), ('hunter', 'bow', 'crafting', 'Arco', 'Bow'),
           ('arcanist', 'staff', 'crafting', 'Cajado', 'Staff'), ('devout', 'mace', 'smithing', 'Maça', 'Mace')]
EXTRA = {'smithing': {'valdeferro_steel': 6}, 'crafting': {'worldtree_logs': 6, 'primordial_soul': 4}}
LAIRS = [
    dict(id='lion_bastion', name='Bastião do Leão', en='Lion Bastion', level=210, drop='drop210', base='drevan',
         boss=('drevan_free', 'Drevan, o Leão Liberto', 'Drevan, the Unchained Lion', 'drevan'),
         stats=(0.45, 0.62, 5.5), hue=42, element='holy', weak=['death'], resist=['holy'],
         tag=('do Leão Liberto', 'of the Unchained Lion'),
         set={'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')},
         parts=[('unchained_blade', 'Lâmina do Juramento Quebrado', 'Blade of the Broken Oath'),
                ('unchained_crest', 'Brasão do Leão Liberto', 'Crest of the Unchained Lion'),
                ('unchained_grip', 'Empunhadura de Drevan', "Drevan's Grip")]),
    dict(id='falcon_nest', name='Ninho do Gavião', en='Hawk Nest', level=240, drop='drop240', base='aldoran',
         boss=('aldoran_risen', 'Aldoran, o Gavião Renascido', 'Aldoran, the Risen Hawk', 'aldoran'),
         stats=(0.45, 0.62, 10), hue=275, element='death', weak=['holy'], resist=['death'],
         tag=('do Gavião Renascido', 'of the Risen Hawk'),
         set={'amulet': ('Amuleto', 'Amulet'), 'ring': ('Anel', 'Ring'), 'boots': ('Botas', 'Boots')},
         parts=[('risen_talon', 'Garra do Gavião Renascido', 'Talon of the Risen Hawk'),
                ('risen_feather', 'Pena do Grão-Mestre', "Grandmaster's Feather"),
                ('risen_sigil', 'Sigilo da Ordem Caída', 'Sigil of the Fallen Order')]),
]
PART_ICONS = ['void_shard', 'infernal_core', 'halo_shard']

for L in LAIRS:
    lv, drop, hue = L['level'], L['drop'], L['hue']
    tpt, ten = L['tag']
    loot = []
    for slot, (pt, en) in L['set'].items():
        iid = f"{L['id']}_{slot}"
        b = by_item[f'{drop}_{slot}']
        tint(Image.open(ICO + b['icon'] + '.png'), hue, 0.75, 1.05).save(ICO + iid + '.png')
        name = f'{pt} {tpt}'
        put(items, by_item, {'id': iid, 'name': name, 'icon': iid, 'legendary': True, 'value': 12000, 'equip': boosted(b['equip'], lv)})
        i18n_items[name] = f'{en} {ten}'
        loot.append({'item': iid, 'chance': ARMOR_CHANCE})
    for (iid, pt, en), src in zip(L['parts'], PART_ICONS):
        tint(Image.open(ICO + src + '.png'), hue, 0.8, 1.1).save(ICO + iid + '.png')
        put(items, by_item, {'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 9000})
        i18n_items[pt] = en
        loot.append({'item': iid, 'chance': PART_CHANCE})
    # Arma: as 3 partes montam a da sua classe.
    for voc, w, skill, pt, en in WEAPONS:
        wid = f"{L['id']}_{w}"
        b = by_item[f'{drop}_{w}']
        tint(Image.open(ICO + b['icon'] + '.png'), hue, 0.8, 1.1).save(ICO + wid + '.png')
        eq = boosted(b['equip'], lv, [voc])
        eq['element'] = L['element']
        eq['elementAttack'] = round(b['equip'].get('elementAttack', 15) * MULT) + 2
        name = f'{pt} {tpt}'
        put(items, by_item, {'id': wid, 'name': name, 'icon': wid, 'legendary': True, 'value': 40000, 'equip': eq})
        i18n_items[name] = f'{en} {ten}'
        lst, _ = recipes[skill]
        put(lst, {r['id']: r for r in lst}, {'id': wid, 'name': name, 'level': 110, 'intervalMs': 30000, 'xp': 6000,
                                             'inputs': {**{p[0]: 1 for p in L['parts']}, **EXTRA[skill]}, 'output': wid})
    # Chefe do covil: o da instância, mais fraco (é solo, uma luta por dia).
    base = by_mon[L['base']]
    mid, mpt, men, sprite = L['boss']
    hp, atk, xp = L['stats']
    gold = next(l for l in base['loot'] if l['item'] == 'gold')
    mats = [l for l in base['loot'] if l['item'] != 'gold' and not by_item.get(l['item'], {}).get('equip')]
    put(monsters, by_mon, {
        'id': mid, 'name': mpt, 'sprite': sprite,
        'hp': round(base['hp'] * hp), 'attack': round(base['attack'] * atk), 'defense': base['defense'],
        'attackSpeedMs': base.get('attackSpeedMs', 1250), 'xp': round(base['xp'] * xp),
        'loot': [{'item': 'gold', 'chance': 1, 'min': gold['min'] * 3, 'max': gold['max'] * 3}] + mats + loot,
        'weak': L['weak'], 'resist': L['resist'],
    })
    i18n_content[mpt] = men
    put(hunts, by_hunt, {'id': L['id'], 'name': L['name'], 'region': REGION, 'level': lv, 'monsters': [mid], 'lair': True})
    i18n_content[L['name']] = L['en']
i18n_content[REGION] = REGION_EN

hunts.sort(key=lambda h: h['level'])
write_json(D + 'items.json', items, items_raw)
write_json(D + 'monsters.json', monsters, monsters_raw)
write_json(D + 'hunts.json', hunts, hunts_raw)
for s, (lst, raw) in recipes.items():
    write_json(D + f'{s}.json', lst, raw)
write_json(I18N_ITEMS, i18n_items, i18n_items_raw)
write_json(I18N_CONTENT, i18n_content, i18n_content_raw)
print('ok')
