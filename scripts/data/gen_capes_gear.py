"""Capas comuns: 11 de Artesanato (couro, seda e material do tier) e 5 nomeadas que caem de chefes.

Usam o mesmo espaço Capa das de maestria, mas são equipamento normal (vendem, trocam, desmancham).
Sprite: a capa do Bárbaro recolorida, sem brasão (scripts/sprites_capes.py).
  python scripts/data/gen_capes_gear.py
"""
import json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import sprites_capes as sc  # noqa: E402

ROOT = sc.ROOT
DATA = os.path.join(ROOT, 'shared', 'data')

# id, PT, EN, nível de uso, atributos, nível da receita, materiais, xp, intervalo, (matiz, sat)
CRAFTED = [
    ('cape_traveler', 'Capa de Viajante', "Traveler's Cape", 5, {'defense': 1, 'hp': 8}, 5, {'leather': 2, 'spider_silk': 2}, 140, 3000, (30, 0.6)),
    ('cape_wolf', 'Capa de Pele de Lobo', 'Wolf Pelt Cape', 15, {'defense': 2, 'hp': 14}, 14, {'leather': 2, 'wolf_pelt': 2}, 400, 5000, (0, 0.15)),
    ('cape_swamp', 'Capa do Pântano', 'Swamp Cape', 30, {'defense': 3, 'hp': 22, 'resEarth': 0.04}, 29, {'spider_silk': 3, 'lizard_scale': 2}, 680, 6000, (110, 0.8)),
    ('cape_shadow', 'Capa Sombria', 'Shadow Cape', 40, {'defense': 4, 'hp': 30, 'resDeath': 0.05}, 40, {'spider_silk': 4, 'ectoplasm': 3, 'dark_essence': 2}, 950, 6000, (270, 0.45)),
    ('cape_abyssal', 'Capa Abissal', 'Abyssal Cape', 50, {'defense': 5, 'hp': 40, 'resWater': 0.05}, 48, {'spider_silk': 4, 'abyss_lotus': 2, 'sea_pearl': 1}, 1250, 7000, (190, 0.9)),
    ('cape_draconic', 'Capa Dracônica', 'Draconic Cape', 60, {'defense': 7, 'hp': 55, 'resFire': 0.06}, 60, {'leather': 4, 'dragon_scale': 3}, 1620, 6000, (5, 1.0)),
    ('cape_lich', 'Capa do Lich', 'Lich Cape', 75, {'defense': 9, 'hp': 70, 'mana': 0.03, 'resDeath': 0.07}, 73, {'spider_silk': 5, 'lich_dust': 4}, 2040, 8000, (50, 0.15)),
    ('cape_spectral', 'Capa Espectral', 'Spectral Cape', 85, {'defense': 11, 'hp': 85, 'resEnergy': 0.07}, 83, {'spider_silk': 5, 'wraith_essence': 4}, 2320, 9000, (178, 0.7)),
    ('cape_infernal', 'Capa Infernal', 'Infernal Cape', 95, {'defense': 13, 'hp': 100, 'resFire': 0.08}, 93, {'leather': 6, 'demon_ash': 4}, 2610, 9000, (18, 1.1)),
    ('cape_void', 'Capa do Vazio', 'Void Cape', 105, {'defense': 15, 'hp': 120, 'resEnergy': 0.08}, 103, {'spider_silk': 6, 'void_soul': 4}, 2890, 10000, (285, 0.8)),
    ('cape_stellar', 'Capa Estelar', 'Stellar Cape', 115, {'defense': 17, 'hp': 140, 'reduction': 0.02}, 113, {'spider_silk': 6, 'star_soul': 4, 'starmetal_bar': 1}, 3170, 10000, (52, 0.4)),
]
# id, PT, EN, nível, atributos, monstro, chance, (matiz, sat)
DROPPED = [
    ('cape_kraken', 'Manto do Kraken', 'Kraken Mantle', 55, {'defense': 8, 'hp': 60, 'resWater': 0.12}, 'kraken', 0.05, (200, 1.1)),
    ('cape_varnak', 'Capa do Conde Varnak', "Count Varnak's Cape", 66, {'defense': 8, 'hp': 60, 'lifesteal': 0.03, 'resDeath': 0.1}, 'count_varnak', 0.05, (350, 1.2)),
    ('cape_dragonlord', 'Manto do Senhor dos Dragões', "Dragon Lord's Mantle", 75, {'defense': 10, 'hp': 80, 'resFire': 0.12}, 'dragon_lord', 0.05, (12, 1.2)),
    ('cape_malphas', 'Capa de Malphas', "Malphas' Cape", 170, {'defense': 22, 'hp': 180, 'reduction': 0.03, 'resFire': 0.15}, 'malphas', 0.03, (0, 1.3)),
    ('cape_aelthra', 'Véu de Aelthra', "Aelthra's Veil", 180, {'defense': 20, 'hp': 170, 'mana': 0.06, 'resEnergy': 0.15}, 'aelthra', 0.03, (230, 0.7)),
]


def rw(path, fn):
    raw = open(path, encoding='utf8', newline='').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    s = fn(raw.replace('\r\n', '\n'))
    open(path, 'w', encoding='utf8', newline='').write(s.replace('\n', nl))


def items(s):
    d = json.loads(s)
    ids = {i['id'] for i in d}
    for cid, pt, _, lv, stats, *_ in CRAFTED + DROPPED:
        assert cid not in ids, cid
        d.append({'id': cid, 'name': pt, 'icon': cid, 'equip': {'slot': 'cape', 'level': lv, **stats}})
    for r in CRAFTED:
        for m in r[6]:
            assert m in ids, m
    return json.dumps(d, ensure_ascii=False, indent=2) + '\n'
rw(os.path.join(DATA, 'items.json'), items)


def crafting(s):
    body = s.rstrip()
    assert body.endswith(']')
    lines = ''.join(',\n  ' + json.dumps({'id': cid, 'name': pt, 'level': rlv, 'intervalMs': ms, 'xp': xp, 'inputs': inputs, 'output': cid}, ensure_ascii=False)
                    for cid, pt, _, _, _, rlv, inputs, xp, ms, _ in CRAFTED)
    return body[:-1].rstrip() + lines + '\n]\n'
rw(os.path.join(DATA, 'crafting.json'), crafting)


def monsters(s):
    d = json.loads(s)
    for cid, _, _, _, _, mid, chance, _ in DROPPED:
        m = next(x for x in d if x['id'] == mid)
        assert not any(l['item'] == cid for l in m['loot'])
        m['loot'].append({'item': cid, 'chance': chance})
    return json.dumps(d, ensure_ascii=False, indent=2) + '\n'
rw(os.path.join(DATA, 'monsters.json'), monsters)

rw(os.path.join(ROOT, 'client', 'src', 'items_i18n.json'),
   lambda s: '{\n' + ''.join(f'  {json.dumps(r[1], ensure_ascii=False)}: {json.dumps(r[2])},\n' for r in CRAFTED + DROPPED) + s[2:])

base = {g: sc.lengthen(sc.cape_from(g)) for g in ('m', 'f')}
for r in CRAFTED + DROPPED:
    cid, (hue, sat) = r[0], r[-1]
    for g in ('m', 'f'):
        sheet = sc.recolor(base[g], hue, sat)
        sheet.save(os.path.join(sc.PD, f'{cid}_{g}.png'))
        if g == 'm':
            sc.item_icon(sheet).save(os.path.join(sc.ICO, f'{cid}.png'))
print('ok', len(CRAFTED), 'de craft,', len(DROPPED), 'de drop')
