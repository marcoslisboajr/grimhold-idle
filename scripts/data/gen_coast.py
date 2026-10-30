import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'icons_lib_and_skills.py'), encoding='utf8').read().split('BLUE, GREEN, PURPLE')[0])
items = load('items.json'); byid = {i['id']: i for i in items}
def add(it):
    if it['id'] in byid: byid[it['id']].update(it)
    else: items.append(it); byid[it['id']] = it
icon('coral', recolor(cell(6, 56), hue=0.98, sat=1.3, light=0.05)); add({'id': 'coral', 'name': 'Coral Vermelho', 'icon': 'coral', 'value': 45})
icon('deep_scale', recolor(cell(2, 55), hue=0.55, sat=1.2, light=-0.08)); add({'id': 'deep_scale', 'name': 'Escama das Profundezas', 'icon': 'deep_scale', 'value': 160})
save('items.json', items)
monsters = json.load(open(D + 'monsters.json', encoding='utf8')); mon = {m['id']: m for m in monsters}
for mid, item, ch in [('shore_crab', 'coral', 0.3), ('fire_crab', 'coral', 0.3), ('sea_turtle', 'coral', 0.35),
                      ('fishfolk', 'coral', 0.3), ('jellyfish', 'coral', 0.2), ('sea_serpent', 'deep_scale', 0.12),
                      ('deepling_scout', 'deep_scale', 0.25), ('deepling_warrior', 'deep_scale', 0.3), ('drowned_veteran', 'deep_scale', 0.15)]:
    m = mon[mid]; m['loot'] = [l for l in m['loot'] if l['item'] != item] + [{'item': item, 'chance': ch}]
# Instâncias: no máximo ~1,5x a caçada normal do nível (a chave e o drop único são o atrativo).
MARK = os.path.join(HERE, '.boss_tuned')
if not os.path.exists(MARK):
    for mid, xpm, gm in [('minotaur_royal', 0.7, 0.6), ('minotaur_king', 0.7, 0.6), ('drowned_captain', 0.65, 0.55), ('kraken', 0.65, 0.55),
                         ('fire_dragon', 0.85, 0.7), ('dragon_lord', 0.85, 0.7)]:
        m = mon[mid]; m['xp'] = round(m['xp'] * xpm)
        for l in m['loot']:
            if l['item'] == 'gold': l['min'] = round(l['min'] * gm); l['max'] = round(l['max'] * gm)
    open(MARK, 'w').write('1')
open(D + 'monsters.json', 'w', encoding='utf8').write(json.dumps(monsters, ensure_ascii=False, indent=2) + chr(10))
print('ok')
