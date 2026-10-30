# Spellbooks do arcanista (escudo) e ataque nos chapéus de mago. Ícones: livros do icons_full_32.
# Uso: python scripts/data/gen_spellbooks.py  (idempotente)
import json, os
NL = chr(10)
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = lambda f: os.path.join(ROOT, 'shared', 'data', f)
ICONS = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
I18N = os.path.join(ROOT, 'client', 'src', 'items_i18n.json')
SHEET = Image.open('../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png').convert('RGBA')

def load(p): return json.load(open(p, encoding='utf8'))
def save(p, d):
    with open(p, 'w', encoding='utf8', newline='\n') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')

# (id, PT, EN, nível, coluna do livro na linha 23, defesa, ataque, mana, nível de Artesanato, insumos)
BOOKS = [
    ('apprentice_spellbook', 'Grimório do Aprendiz', "Apprentice's Spellbook", 1, 0, 1, 1, 0.05, 4, {'logs': 2, 'spider_silk': 1}),
    ('silk_spellbook', 'Grimório de Seda', 'Silk Spellbook', 10, 1, 3, 2, 0.08, 13, {'oak_logs': 2, 'spider_silk': 3}),
    ('shaman_spellbook', 'Grimório do Xamã', "Shaman's Spellbook", 25, 3, 5, 4, 0.10, 28, {'willow_logs': 2, 'spider_silk': 4, 'golden_root': 2}),
    ('golden_spellbook', 'Grimório Dourado', 'Golden Spellbook', 35, 15, 6, 5, 0.12, 38, {'yew_logs': 2, 'spider_silk': 5, 'ectoplasm': 2}),
    ('abyss_spellbook', 'Grimório do Abismo', 'Abyss Spellbook', 45, 12, 8, 6, 0.15, 48, {'yew_logs': 3, 'spider_silk': 6, 'abyss_lotus': 2}),
    ('dragon_spellbook', 'Grimório Dracônico', 'Draconic Spellbook', 55, 9, 10, 8, 0.18, 58, {'ancient_logs': 3, 'spider_silk': 7, 'dragon_scale': 2}),
]
# Chapéus de mago: ataque e um pouco de mana (antes só defesa e regeneração).
HATS = {'linen_robe_helmet': (1, 0.02), 'silk_robe_helmet': (2, 0.03), 'shaman_robe_helmet': (4, 0.04),
        'golden_robe_helmet': (5, 0.05), 'abyss_robe_helmet': (6, 0.06), 'dragon_robe_helmet': (7, 0.08)}

items, crafting, i18n = load(D('items.json')), load(D('crafting.json')), load(I18N)
known = {i['id'] for i in items}
for r in crafting:
    for k in r['inputs']: assert k in known, k
for b in BOOKS:
    for k in b[9]: assert k in known, (b[0], k)

for it in items:
    if it['id'] in HATS:
        atk, mana = HATS[it['id']]
        it['equip']['attack'] = atk
        it['equip']['mana'] = mana

items = [i for i in items if i['id'] not in {b[0] for b in BOOKS}]
crafting = [r for r in crafting if r['output'] not in {b[0] for b in BOOKS}]
for bid, pt, en, lv, col, df, atk, mana, clv, inputs in BOOKS:
    items.append({'id': bid, 'name': pt, 'icon': bid, 'equip': {'slot': 'shield', 'level': lv, 'vocations': ['arcanist'], 'defense': df, 'attack': atk, 'mana': mana}})
    crafting.append({'id': bid, 'name': pt, 'level': clv, 'intervalMs': 5000 + 400 * (clv // 10), 'xp': 15 + clv * 2, 'inputs': inputs, 'output': bid})
    SHEET.crop((col * 32, 23 * 32, col * 32 + 32, 24 * 32)).save(os.path.join(ICONS, bid + '.png'))
    i18n[pt] = en

save(D('items.json'), items)
with open(D('crafting.json'), 'w', encoding='utf8', newline=NL) as f:  # uma receita por linha, como o arquivo já era
    f.write('[' + NL + (',' + NL).join('  ' + json.dumps(r, ensure_ascii=False) for r in crafting) + NL + ']' + NL)
save(I18N, i18n)
print('ok')
