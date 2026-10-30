"""Grava os itens de chefe de Caçador e Arcanista (shared/data/boss_class_items.json, de
server/scripts/gen_boss_class_items.ts): itens, loot do chefe, nomes em inglês e ícones
(sufixo _boss: o jogo desenha a moldura roxa). Rodar de novo troca o que já existe.
  python scripts/boss_class_items_apply.py
"""
import colorsys, json, os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ICONS = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
ITEMS = os.path.join(ROOT, 'shared', 'data', 'items.json')
I18N = os.path.join(ROOT, 'client', 'src', 'items_i18n.json')


def recolor(src, hue):
    """Gira a cor do ícone da peça de fazer e deixa um pouco mais viva (peça de chefe)."""
    im = Image.open(src).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.12:
                h = (h + hue / 360) % 1
            r2, g2, b2 = colorsys.hsv_to_rgb(h, min(1, s * 1.2), min(1, v * 1.08))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im


DATA = json.load(open(os.path.join(ROOT, 'shared', 'data', 'boss_class_items.json'), encoding='utf8'))
MONSTERS = os.path.join(ROOT, 'shared', 'data', 'monsters.json')
ids = {d['id'] for d in DATA}

items = [it for it in json.load(open(ITEMS, encoding='utf8')) if it['id'] not in ids]
for d in DATA:
    items.append({'id': d['id'], 'name': d['name'], 'icon': d['icon'], 'equip': d['equip'], 'value': d['value']})
    recolor(os.path.join(ICONS, f"{d['templateIcon']}.png"), d['hue']).save(os.path.join(ICONS, f"{d['icon']}.png"))
open(ITEMS, 'w', encoding='utf8', newline='\n').write(json.dumps(items, indent=2, ensure_ascii=False) + '\n')

mons = json.load(open(MONSTERS, encoding='utf8'))
for m in mons:
    m['loot'] = [l for l in m['loot'] if l['item'] not in ids]
    m['loot'] += [{'item': d['id'], 'chance': d['chance']} for d in DATA if d['boss'] == m['id']]
assert all(any(m['id'] == d['boss'] for m in mons) for d in DATA)
open(MONSTERS, 'w', encoding='utf8', newline='\n').write(json.dumps(mons, indent=2, ensure_ascii=False) + '\n')

en = json.load(open(I18N, encoding='utf8'))
for d in DATA:
    en[d['name']] = d['en']
open(I18N, 'w', encoding='utf8', newline='\n').write(json.dumps(en, indent=2, ensure_ascii=False) + '\n')
print('ok', len(DATA))
