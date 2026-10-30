"""Ghaz'Morath, o Imortal (chefe de invasão): set lendário das 4 classes, ícones e sprite.

- 16 peças (elmo, armadura, calças, botas por classe), nível 175, 12% acima dos sets dos deuses (160).
- Ícones: os dos deuses recoloridos em vermelho-sangue e preto.
- Sprite: o do Zathroth recolorido do mesmo jeito (ghazmorath_1..4).
Uso: python scripts/data/gen_ghazmorath.py (roda de novo sem duplicar).
"""
import colorsys
import json
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
ITEMS = os.path.join(ROOT, 'shared', 'data', 'items.json')
I18N = os.path.join(ROOT, 'client', 'src', 'items_i18n.json')
ICONS = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
MONSTERS = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')

GODS = {'warrior': 'kharvos', 'hunter': 'sylveth', 'arcanist': 'aethon', 'devout': 'lumira'}
SLOTS = ['helm', 'armor', 'legs', 'boots']
NAMES = {
    'warrior': [('Elmo do Imortal', "Immortal's Helm"), ('Couraça do Imortal', "Immortal's Cuirass"),
                ('Grevas do Imortal', "Immortal's Greaves"), ('Botas de Guerra do Imortal', "Immortal's War Boots")],
    'hunter': [('Capuz do Imortal', "Immortal's Hood"), ('Gibão do Imortal', "Immortal's Jerkin"),
               ('Calças de Caça do Imortal', "Immortal's Hunting Pants"), ('Botas Sombrias do Imortal', "Immortal's Shadow Boots")],
    'arcanist': [('Coroa do Imortal', "Immortal's Crown"), ('Manto do Imortal', "Immortal's Mantle"),
                 ('Calças Arcanas do Imortal', "Immortal's Arcane Pants"), ('Sandálias do Imortal', "Immortal's Sandals")],
    'devout': [('Mitra do Imortal', "Immortal's Mitre"), ('Cota do Imortal', "Immortal's Hauberk"),
               ('Calças Sagradas do Imortal', "Immortal's Holy Pants"), ('Botas da Penitência do Imortal', "Immortal's Penance Boots")],
}
LEVEL = 175
MULT = 1.12


def recolor(src, dst):
    """Vermelho-sangue e preto: sombras quase pretas, meio-tom vermelho, brilhos cor de osso."""
    im = Image.open(src).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            _, l, _ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if l < 0.28:
                c = colorsys.hls_to_rgb(0.98, l * 0.55, 0.25)
            elif l < 0.62:
                c = colorsys.hls_to_rgb(0.99, 0.16 + (l - 0.28) * 0.75, 0.78)
            else:
                c = colorsys.hls_to_rgb(0.09, 0.62 + (l - 0.62) * 0.8, 0.35)
            px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    im.save(dst)


raw = open(ITEMS, encoding='utf8', newline='').read()
nl = '\r\n' if '\r\n' in raw else '\n'
items = json.loads(raw)
by_id = {i['id']: i for i in items}
i18n = json.load(open(I18N, encoding='utf8'))

new = []
for voc, god in GODS.items():
    for k, slot in enumerate(SLOTS):
        base = by_id[f'{god}_{slot}']
        pid = f'ghazmorath_{slot}_{voc}'
        eq = dict(base['equip'])
        eq['level'] = LEVEL
        for key in ('defense', 'hp', 'attack'):
            if key in eq:
                eq[key] = round(eq[key] * MULT)
        for key in ('crit', 'regen', 'mana'):
            if key in eq:
                eq[key] = round(eq[key] * MULT, 3)
        pt, en = NAMES[voc][k]
        icon = f'ghazmorath_{slot}_{voc}'
        recolor(os.path.join(ICONS, base['icon'] + '.png'), os.path.join(ICONS, icon + '.png'))
        new.append({'id': pid, 'name': pt, 'icon': icon, 'legendary': True, 'value': 12000, 'equip': eq})
        i18n[pt] = en

items = [i for i in items if not i['id'].startswith('ghazmorath_')]
at = next(n for n, i in enumerate(items) if i['id'] == 'lumira_boots') + 1
items[at:at] = new
out = json.dumps(items, ensure_ascii=False, indent=2) + '\n'
open(ITEMS, 'w', encoding='utf8', newline='').write(out.replace('\n', nl))
with open(I18N, 'w', encoding='utf8', newline='') as f:
    f.write(json.dumps(i18n, ensure_ascii=False, indent=2) + '\n')

for n in (1, 2, 3, 4):
    recolor(os.path.join(MONSTERS, f'zathroth_{n}.png'), os.path.join(MONSTERS, f'ghazmorath_{n}.png'))
print('ok', len(new), 'pecas')
