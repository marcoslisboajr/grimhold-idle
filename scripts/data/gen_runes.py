"""Criação de Runas: itens (pedras e runas), veios de mineração, receitas do altar
e ícones. Ícones recortados da linha das pedras rúnicas do Time Fantasy Icons
(linha 53), só com recolor. Pode rodar de novo: não duplica itens nem veios."""
import json, os, colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
SHEET = Image.open('../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png').convert('RGBA')

def cell(c, r): return SHEET.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32))
def recolor(im, hue, sat=1.4, light=0.0):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            s = min(1, s * sat)
            if s < 0.25: s += 0.25
            l = max(0, min(1, l + light))
            r2, g2, b2 = colorsys.hls_to_rgb(hue, l, s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im
def icon(name, im): im.save(ICONS + name + '.png')

# id, nome, nível, efeito, receita, ícone (coluna na linha 53, matiz ou None)
RUNES = [
    ('spark_rune', 'Runa de Faísca', 1, {'kind': 'strike', 'mult': 0.35, 'area': True}, {'rune_stone': 1}, (1, 0.13)),
    ('light_heal_rune', 'Runa de Cura Leve', 5, {'kind': 'heal', 'pct': 0.12, 'below': 0.5}, {'rune_stone': 1, 'green_herb': 1}, (2, 0.33)),
    ('boulder_rune', 'Runa de Pedregulho', 10, {'kind': 'strike', 'mult': 0.5, 'area': True}, {'rune_stone': 2}, (5, None)),
    ('heavy_missile_rune', 'Runa de Míssil Pesado', 15, {'kind': 'strike', 'mult': 1.2}, {'rune_stone': 2}, (3, 0.58)),
    ('fireball_rune', 'Runa de Bola de Fogo', 25, {'kind': 'strike', 'mult': 0.7, 'area': True}, {'rune_stone': 2, 'coal': 1}, (1, 0.02)),
    ('intense_heal_rune', 'Runa de Cura Intensa', 30, {'kind': 'heal', 'pct': 0.22, 'below': 0.5}, {'rune_stone': 2, 'golden_root': 1}, (6, 0.36)),
    ('avalanche_rune', 'Runa de Avalanche', 40, {'kind': 'strike', 'mult': 0.85, 'area': True}, {'rune_stone': 3}, (2, 0.55)),
    ('explosion_rune', 'Runa de Explosão', 50, {'kind': 'strike', 'mult': 1.0, 'area': True}, {'pure_rune_stone': 1}, (7, 0.05)),
    ('ultimate_heal_rune', 'Runa de Cura Suprema', 60, {'kind': 'heal', 'pct': 0.35, 'below': 0.45}, {'pure_rune_stone': 1, 'golden_root': 1}, (7, 0.3)),
    ('sudden_death_rune', 'Runa da Morte Súbita', 70, {'kind': 'strike', 'mult': 2.2}, {'pure_rune_stone': 2}, (3, 0.8)),
    ('storm_rune', 'Runa da Tempestade', 85, {'kind': 'strike', 'mult': 1.25, 'area': True}, {'pure_rune_stone': 2}, (6, 0.15)),
    ('doom_rune', 'Runa do Juízo Final', 100, {'kind': 'strike', 'mult': 1.5, 'area': True}, {'pure_rune_stone': 3}, (5, 0.9)),
]

icon('rune_stone', cell(9, 53))
icon('pure_rune_stone', recolor(cell(9, 53), hue=0.75, sat=1.6, light=0.05))
icon('skill_runecraft', recolor(cell(2, 53), hue=0.6, sat=1.5))
for rid, _, _, _, _, (c, hue) in RUNES:
    icon(rid, cell(c, 53) if hue is None else recolor(cell(c, 53), hue))

# Itens: acrescenta no fim de items.json (mantém a formatação do arquivo).
path = D + 'items.json'
text = open(path, encoding='utf8').read()
have = {i['id'] for i in json.loads(text)}
new = []
if 'rune_stone' not in have:
    new.append({'id': 'rune_stone', 'name': 'Pedra Rúnica', 'icon': 'rune_stone', 'value': 3})
    new.append({'id': 'pure_rune_stone', 'name': 'Pedra Rúnica Pura', 'icon': 'pure_rune_stone', 'value': 25})
for rid, name, level, eff, _, _ in RUNES:
    if rid not in have:
        new.append({'id': rid, 'name': name, 'icon': rid, 'rune': {**eff, 'level': level}})
if new:
    body = text.rstrip().rstrip(']').rstrip()
    add = ',\n'.join('  ' + json.dumps(x, ensure_ascii=False, indent=2).replace('\n', '\n  ') for x in new)
    open(path, 'w', encoding='utf8').write(body + ',\n' + add + '\n]\n')

# Veios.
path = D + 'mining.json'
mining = json.load(open(path, encoding='utf8'))
if not any(n['id'] == 'rune_stone_vein' for n in mining):
    mining.append({'id': 'rune_stone_vein', 'name': 'Veio de Pedra Rúnica', 'region': 'Ravina Selvagem', 'level': 1, 'intervalMs': 3000, 'xp': 15, 'item': 'rune_stone'})
    mining.append({'id': 'pure_rune_vein', 'name': 'Veio de Pedra Rúnica Pura', 'region': 'Minas de Kharzul', 'level': 50, 'intervalMs': 6500, 'xp': 95, 'item': 'pure_rune_stone'})
    open(path, 'w', encoding='utf8').write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in mining) + '\n]\n')

# Receitas do altar: XP e tempo crescem com o nível.
recipes = [{'id': 'carve_' + rid.replace('_rune', ''), 'name': name, 'level': level,
            'intervalMs': 3000 + level * 30, 'xp': round(10 + level * 1.6), 'inputs': inputs, 'output': rid}
           for rid, name, level, _, inputs, _ in RUNES]
open(D + 'runecraft.json', 'w', encoding='utf8').write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in recipes) + '\n]\n')
print('runas:', len(RUNES), 'itens novos:', len(new))
