"""Forja do 200+: Aço de Valdeferro e três conjuntos forjados (205, 220, 235) de guerreiro e devoto.

Receitas na forja 116-120 (o teto da profissão). Atributos: o drop do mesmo nível (interpolado entre os
sets 195/210/225/240) com 5% a menos, para o forjado ficar um pouco abaixo do drop sem depender de sorte.
Ícones: os da linha primordial recoloridos por conjunto. Idempotente: roda de novo e substitui.
"""
import json, os
from PIL import Image, ImageOps

R = os.path.join(os.path.dirname(__file__), '..', '..')
P = lambda *a: os.path.join(R, *a)
load = lambda f: json.load(open(P(f), encoding='utf-8'))
def save(f, d): open(P(f), 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')

items = load('shared/data/items.json')
smith = load('shared/data/smithing.json')
i18n = load('client/src/items_i18n.json')
by = {i['id']: i for i in items}

# peça primordial -> (peça do drop, nome base, nome base em inglês, barras, insígnias, gema)
PIECES = {
    'sword': ('sword', 'Espada', 'Sword', 2, 2, 'gem_ruby'),
    'mace': ('mace', 'Maça', 'Mace', 2, 2, 'gem_ruby'),
    'axe': ('sword', 'Machado', 'Axe', 3, 2, 'gem_ruby'),
    'helmet': ('helmet', 'Elmo', 'Helmet', 2, 1, None),
    'boots': ('boots', 'Botas', 'Boots', 2, 1, None),
    'shield': ('shield', 'Escudo', 'Shield', 3, 1, 'gem_diamond'),
    'legs': ('legs', 'Calças', 'Legs', 4, 2, 'gem_diamond'),
    'armor': ('plate', 'Armadura', 'Armor', 6, 3, 'gem_diamond'),
    'holy_helmet': ('holy_helmet', 'Mitra', 'Mitre', 2, 1, None),
    'holy_legs': ('holy_legs', 'Calças Sagradas', 'Holy Legs', 4, 2, 'gem_sapphire'),
    'holy_armor': ('holy_armor', 'Cota Sagrada', 'Holy Mail', 6, 3, 'gem_sapphire'),
}
# (prefixo, nível do equipamento, nome, nível da forja, XP x primordial, mais material, cor do ícone)
SETS = [
    ('valdeferro', 205, 'de Valdeferro', 117, 1.4, 1.0, (190, 205, 225)),
    ('goldmane', 220, 'da Juba Dourada', 119, 1.8, 1.25, (240, 200, 90)),
    ('royallion', 235, 'do Leão Real', 120, 2.3, 1.5, (235, 120, 70)),
]
DROPS = [195, 210, 225, 240]
EN_NAME = {'de Valdeferro': 'of Valdeferro', 'da Juba Dourada': 'of the Golden Mane', 'do Leão Real': 'of the Royal Lion'}

def drop_stats(piece, L):
    lo = max(d for d in DROPS if d <= L); hi = min(d for d in DROPS if d >= L)
    a, b = by[f'drop{lo}_{piece}']['equip'], by[f'drop{hi}_{piece}']['equip']
    t = 0 if hi == lo else (L - lo) / (hi - lo)
    out = {}
    for k, v in a.items():
        if k == 'level': continue
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            x = (v + (b.get(k, v) - v) * t) * 0.95
            out[k] = round(x) if isinstance(v, int) else round(x, 3)
        else:
            out[k] = v
    return out

def recolor(src_id, dst_id, color, black=(20, 16, 14)):
    src = Image.open(P('client/public/assets/icons', f'{src_id}.png')).convert('RGBA')
    white = tuple(min(255, c + (255 - c) * 2 // 5) for c in color)
    g = ImageOps.colorize(src.convert('L'), black=black, white=white, mid=tuple(c * 3 // 4 for c in color)).convert('RGBA')
    g.putalpha(src.getchannel('A'))
    g.save(P('client/public/assets/icons', f'{dst_id}.png'))

new_items, new_recipes = [], []
STEEL = 'valdeferro_steel'
new_items.append({'id': STEEL, 'name': 'Aço de Valdeferro', 'icon': STEEL})
new_recipes.append({'id': STEEL, 'name': 'Aço de Valdeferro', 'level': 116, 'intervalMs': 9500, 'xp': 1800,
                    'inputs': {'primordial_bar': 2, 'golden_mane': 1, 'coal': 8}, 'output': STEEL})
i18n['Aço de Valdeferro'] = 'Valdeferro Steel'
recolor('primordial_bar', STEEL, (225, 215, 170))

for pre, L, nm, flv, xpm, more, color in SETS:
    for key, (dpiece, base, base_en, bars, ins, gem) in PIECES.items():
        prim = by[f'primordial_{key}']
        st = drop_stats(dpiece, L)
        if key == 'axe':
            st.pop('crit', None); st.pop('hp', None)
            st['attack'] += 2; st['lifesteal'] = 0.08
        eq = {'slot': prim['equip']['slot'], 'level': L}
        eq.update({k: v for k, v in st.items() if k not in ('slot', 'vocations')})
        if 'vocations' in prim['equip']: eq['vocations'] = prim['equip']['vocations']
        iid = f'{pre}_{key}'
        name = f'{base} {nm}'
        new_items.append({'id': iid, 'name': name, 'icon': iid, 'equip': eq})
        inputs = {STEEL: round(bars * more), 'falcon_insignia': round(ins * more)}
        if gem: inputs[gem] = 1 if more < 1.5 else 2
        prim_r = next(r for r in smith if r['id'] == f'primordial_{key}')
        new_recipes.append({'id': iid, 'name': name, 'level': flv, 'intervalMs': 9500,
                            'xp': round(prim_r['xp'] * xpm), 'inputs': inputs, 'output': iid})
        i18n[name] = f'{base_en} {EN_NAME[nm]}'
        recolor(f'primordial_{key}', iid, color)

ids = {i['id'] for i in new_items}
items = [i for i in items if i['id'] not in ids]
smith = [r for r in smith if r['id'] not in ids]
ia = max(k for k, i in enumerate(items) if i['id'].startswith('primordial_')) + 1
items[ia:ia] = new_items
ra = max(k for k, r in enumerate(smith) if r['id'].startswith('primordial_')) + 1
smith[ra:ra] = new_recipes
save('shared/data/items.json', items)
save('shared/data/smithing.json', smith)
save('client/src/items_i18n.json', i18n)
print(len(new_items), 'itens,', len(new_recipes), 'receitas')
