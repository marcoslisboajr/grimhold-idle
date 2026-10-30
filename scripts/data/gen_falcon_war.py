# Fase 1 do 200 ao 250: a guerra das Ordens, na Fortaleza de Valdeferro.
# A Ordem do Gavião (cavaleiros de azul-noite e dourado) tomou a fortaleza; a Guarda do Leão caiu.
# Quatro caçadas (205, 215, 230, 245), a instância do Comandante Drevan (225, com chave) e as três
# instâncias da quest A Queda do Gavião (220, 235, 250; sem chave, abrem no passo da história).
# Força pelos monstros do 200 (chaos_avatar), seguindo a curva das caçadas do 150 ao 200.
# Sprites: scripts/sprites_falcon_order.py. Mapas: client/src/world/map.ts e WorldView.tsx.
# Uso: python scripts/data/gen_falcon_war.py   (idempotente)
# NÃO RODAR (17/10/2026): os dados foram ajustados à mão depois deste gerador (XP dos monstros da Fortaleza (+11% a +88%)).
# Rodar de novo desfaz esses ajustes. Para rodar mesmo assim: GRIMHOLD_FORCE_GEN=1.
import os as _os, sys as _sys
if _os.environ.get('GRIMHOLD_FORCE_GEN') != '1':
    _sys.exit('Gerador antigo: desfaria ajustes feitos à mão (XP dos monstros da Fortaleza (+11% a +88%)). Use GRIMHOLD_FORCE_GEN=1 para forçar.')

import json, os, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'


def load(p): return json.load(open(p, encoding='utf8'))
def save(p, d):
    with open(p, 'w', encoding='utf8', newline='\n') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')


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


REGION, REGION_EN = 'Fortaleza de Valdeferro', 'Valdeferro Fortress'
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


# ── Materiais e chave ─────────────────────────────────────────────────────────
MATS = [
    ('falcon_insignia', 'Insígnia do Gavião', 'Hawk Insignia', 'chaos_fragment', 0.62, 3.0),
    ('golden_mane', 'Juba Dourada', 'Golden Mane', 'divine_ichor', 0.12, 3.0),
]
for mid, pt, en, src, hue, vm in MATS:
    recolor(Image.open(ICONS + src + '.png'), hue).save(ICONS + mid + '.png')
    put(items, by_item, {'id': mid, 'name': pt, 'icon': mid, 'value': round(by_item['chaos_fragment']['value'] * vm)})
    i18n_items[pt] = en
recolor(Image.open(ICONS + 'chaos_key.png'), 0.12).save(ICONS + 'lion_key.png')
put(items, by_item, {'id': 'lion_key', 'name': 'Chave do Salão do Leão', 'icon': 'lion_key'})
i18n_items['Chave do Salão do Leão'] = 'Lion Hall Key'
put(smithing, by_sm, {'id': 'lion_key', 'name': 'Chave do Salão do Leão', 'level': 120, 'intervalMs': 12000, 'xp': 18000,
                      'inputs': {'adamant_bar': 4, 'golden_mane': 4, 'falcon_insignia': 4, 'chaos_fragment': 2, 'coal': 12}, 'output': 'lion_key'})

# ── Monstros ──────────────────────────────────────────────────────────────────
# Força em relação ao chaos_avatar: (vida, ataque, defesa, XP) pelo nível.
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** ((L - 200) / 5))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, hp_m=1.0, atk_m=1.0, xp_m=1.0, gold_m=1.0, tiers=None):
    hm, am, dm, xm = tiers or tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g * gold_m), 'max': round(gold['max'] * g * gold_m)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': mid[2:] if mid.startswith('q_') else mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en


INS = lambda c: {'item': 'falcon_insignia', 'chance': c}
MANE = lambda c: {'item': 'golden_mane', 'chance': c}
KEY = {'item': 'lion_key', 'chance': 0.0007}
FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
mon('falcon_squire', 'Escudeiro do Gavião', 'Hawk Squire', 205, 1200, ['energy'], ['physical'], [INS(0.2), FRAG])
mon('falcon_archer', 'Arqueiro do Gavião', 'Hawk Archer', 205, 1100, ['fire'], ['earth'], [INS(0.2), FRAG], hp_m=0.9, atk_m=1.05)
mon('lion_sentinel', 'Sentinela Leonina', 'Lion Sentinel', 210, 1250, ['death'], ['holy'], [MANE(0.25), FRAG, KEY], hp_m=1.05)
mon('falcon_knight', 'Cavaleiro do Gavião', 'Hawk Knight', 215, 1250, ['energy'], ['physical'], [INS(0.25), FRAG, KEY])
mon('falcon_cleric', 'Clérigo do Gavião', 'Hawk Cleric', 215, 1150, ['death'], ['holy'], [INS(0.25), FRAG, KEY], hp_m=0.88, atk_m=0.97)
mon('falcon_paladin', 'Paladino do Gavião', 'Hawk Paladin', 230, 1250, ['energy'], ['holy'], [INS(0.3), FRAG, KEY])
mon('falcon_herald', 'Arauto do Gavião', 'Hawk Herald', 230, 1150, ['death'], ['energy'], [INS(0.3), FRAG, KEY], hp_m=0.94, atk_m=1.03)
mon('fallen_lion_knight', 'Cavaleiro Caído do Leão', 'Fallen Lion Knight', 245, 1250, ['holy'], ['death'], [MANE(0.3), FRAG])
mon('knight_specter', 'Espectro de Cavaleiro', 'Knight Specter', 245, 1100, ['holy'], ['death'], [MANE(0.2), INS(0.2), FRAG], hp_m=0.9, atk_m=1.04)


# Chefes. Instâncias: a força das Além do Fim (210: 1.8/1.25/1.12/1.5 ... 240: 3.2/1.6/1.3/3.2) no meio.
def inst(L):
    t = (L - 210) / 30
    return (1.8 + 1.4 * t, 1.25 + 0.35 * t, 1.12 + 0.18 * t, 1.5 + 1.7 * t)


GEAR_DROPS = [{'item': 'drop240_sword', 'chance': 0.05}, {'item': 'drop240_bow', 'chance': 0.05},
              {'item': 'drop240_staff', 'chance': 0.05}, {'item': 'drop240_mace', 'chance': 0.05}]
mon('falcon_marshal', 'Marechal do Gavião', 'Hawk Marshal', 225, 1200, ['energy'], ['physical'],
    [INS(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 0.5}], hp_m=3.0, atk_m=1.04, xp_m=3.5, gold_m=4, tiers=inst(225))
mon('drevan', 'Comandante Drevan, o Leão Caído', 'Commander Drevan, the Fallen Lion', 225, 1300, ['death'], ['holy', 'physical'],
    [{'item': 'golden_mane', 'chance': 1, 'min': 3, 'max': 6}, {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}] + GEAR_DROPS,
    hp_m=5.0, atk_m=1.1, xp_m=7, gold_m=8, tiers=inst(225))
# Quest A Queda do Gavião: um chefe por instância (a limpeza usa os monstros das caçadas).
mon('q_falcon_marshal', 'Marechal dos Portões', 'Marshal of the Gates', 220, 1200, ['energy'], ['physical'],
    [INS(1), {'item': 'chaos_fragment', 'chance': 1}], hp_m=4.0, atk_m=1.06, xp_m=5, gold_m=5, tiers=inst(220))
mon('q_drevan', 'Drevan Acorrentado', 'Chained Drevan', 235, 1300, ['death'], ['holy'],
    [MANE(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}], hp_m=4.5, atk_m=1.08, xp_m=6, gold_m=6, tiers=inst(235))
mon('aldoran', 'Grão-Mestre Aldoran do Gavião', 'Grandmaster Aldoran of the Hawk', 250, 1250, ['holy'], ['death', 'physical'],
    [INS(1), MANE(1), {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1}], hp_m=5.0, atk_m=1.1, xp_m=8, gold_m=10, tiers=inst(250))

# Ajuste dos chefes (vida, ataque), medido no simulador: as 4 vocações 10 níveis acima da instância,
# com o set de drop do nível Épico +5 e a ultimate, vencem em 1 a 3 min (o chefe foge aos 3 min).
BOSS_TUNE = {'q_falcon_marshal': (0.5, 0.55), 'falcon_marshal': (0.35, 0.5), 'drevan': (0.35, 0.5),
             'q_drevan': (0.4, 0.5), 'aldoran': (0.28, 0.45)}
for bid, (hk, ak) in BOSS_TUNE.items():
    by_mon[bid]['hp'] = int(round(by_mon[bid]['hp'] * hk, -1)); by_mon[bid]['attack'] = round(by_mon[bid]['attack'] * ak)

# ── Caçadas e instâncias ──────────────────────────────────────────────────────
HUNTS = [
    {'id': 'valdeferro_walls', 'name': 'Muralhas de Valdeferro', 'en': 'Valdeferro Walls', 'level': 205, 'monsters': ['falcon_squire', 'falcon_archer', 'lion_sentinel'], 'focus': 'xp'},
    {'id': 'oath_courtyard', 'name': 'Pátio dos Juramentos', 'en': 'Courtyard of Oaths', 'level': 215, 'monsters': ['falcon_knight', 'falcon_cleric', 'lion_sentinel'], 'focus': 'loot'},
    {'id': 'order_hall', 'name': 'Salão da Ordem', 'en': 'Hall of the Order', 'level': 230, 'monsters': ['falcon_paladin', 'falcon_herald', 'falcon_knight'], 'focus': 'xp'},
    {'id': 'masters_crypt', 'name': 'Cripta dos Mestres', 'en': 'Crypt of the Masters', 'level': 245, 'monsters': ['fallen_lion_knight', 'knight_specter', 'falcon_paladin'], 'focus': 'loot'},
    {'id': 'lion_hall', 'name': 'Salão do Leão', 'en': 'Lion Hall', 'level': 225, 'monsters': ['falcon_marshal', 'drevan'], 'boss': True, 'key': 'lion_key',
     'trash': ['falcon_knight', 'falcon_paladin', 'lion_sentinel']},
    {'id': 'falcon_gates', 'name': 'Portões de Valdeferro', 'en': 'Gates of Valdeferro', 'level': 220, 'monsters': ['q_falcon_marshal'], 'boss': True, 'quest': 'falcon_war',
     'trash': ['falcon_squire', 'falcon_archer', 'falcon_knight']},
    {'id': 'oath_chamber', 'name': 'Câmara do Juramento', 'en': 'Chamber of the Oath', 'level': 235, 'monsters': ['q_drevan'], 'boss': True, 'quest': 'falcon_war',
     'trash': ['falcon_paladin', 'falcon_herald', 'lion_sentinel']},
    {'id': 'falcon_throne', 'name': 'Trono do Gavião', 'en': 'Hawk Throne', 'level': 250, 'monsters': ['aldoran'], 'boss': True, 'quest': 'falcon_war',
     'trash': ['fallen_lion_knight', 'knight_specter', 'falcon_paladin']},
]
for h in HUNTS:
    en = h.pop('en')
    put(hunts, by_hunt, {'region': REGION, **h})
    i18n_content[h['name']] = en
i18n_content[REGION] = REGION_EN

# ── Armas da quest (nível 250): o set de drop do 240 um pouco acima, com o desenho dele ──
DROP_TEMPLATE = {d['id']: d['template'] for d in load(D + 'drop_sets.json')}
WEAPONS = [('lion_blade', 'Lâmina do Leão Eterno', 'Blade of the Eternal Lion', 'drop240_sword'),
           ('lion_bow', 'Arco do Leão Eterno', 'Bow of the Eternal Lion', 'drop240_bow'),
           ('lion_staff', 'Cajado do Leão Eterno', 'Staff of the Eternal Lion', 'drop240_staff'),
           ('lion_mace', 'Maça do Leão Eterno', 'Mace of the Eternal Lion', 'drop240_mace')]
for wid, pt, en, src in WEAPONS:
    t = by_item[src]
    eq = {}
    for k, v in t['equip'].items():
        if k in ('level', 'slot', 'vocations', 'element'): eq[k] = v
        elif isinstance(v, bool): eq[k] = v
        elif isinstance(v, int): eq[k] = round(v * 1.15)
        elif isinstance(v, float): eq[k] = round(v * 1.15, 3)
        else: eq[k] = v
    eq['level'] = 250
    eq['element'] = 'holy'
    recolor(Image.open(ICONS + t['icon'] + '.png'), 0.12, 1.1, 1.1).save(ICONS + wid + '.png')
    put(items, by_item, {'id': wid, 'name': pt, 'icon': wid, 'equip': eq, 'value': round(t.get('value', 1000) * 2), 'look': DROP_TEMPLATE.get(src, src)})
    i18n_items[pt] = en

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
print('ok')
