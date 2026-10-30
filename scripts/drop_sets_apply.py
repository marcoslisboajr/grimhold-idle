"""Grava os sets de drop (shared/data/drop_sets.json, de server/scripts/gen_drop_sets.ts):
itens em items.json, nomes em inglês em items_i18n.json e ícones recoloridos da peça de fazer.
Rodar de novo troca o que já existe (não duplica).
  python scripts/drop_sets_apply.py
"""
import colorsys, json, os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ICONS = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
ITEMS = os.path.join(ROOT, 'shared', 'data', 'items.json')
I18N = os.path.join(ROOT, 'client', 'src', 'items_i18n.json')
SETS = json.load(open(os.path.join(ROOT, 'shared', 'data', 'drop_sets.json'), encoding='utf8'))


def recolor(src, hue):
    """Gira a cor do ícone (mantém o claro e o escuro) e escurece um pouco: peça de drop, gasta da caçada."""
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
            r2, g2, b2 = colorsys.hsv_to_rgb(h, min(1, s * 1.05), v * 0.92)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im


items = json.load(open(ITEMS, encoding='utf8'))
ids = {s['id'] for s in SETS}
items = [it for it in items if it['id'] not in ids]
for s in SETS:
    items.append({'id': s['id'], 'name': s['name'], 'icon': s['icon'], 'equip': s['equip'], 'value': s['value']})
    recolor(os.path.join(ICONS, f"{s['templateIcon']}.png"), s['hue']).save(os.path.join(ICONS, f"{s['icon']}.png"))
open(ITEMS, 'w', encoding='utf8', newline='\n').write(json.dumps(items, indent=2, ensure_ascii=False) + '\n')

en = json.load(open(I18N, encoding='utf8'))
for s in SETS:
    en[s['name']] = s['en']
open(I18N, 'w', encoding='utf8', newline='\n').write(json.dumps(en, indent=2, ensure_ascii=False) + '\n')
print('ok', len(SETS))
