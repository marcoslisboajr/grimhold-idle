"""Ícones épicos: itens lendários (deuses e chefes globais) e itens que só caem de chefe.

Retoque no desenho (contorno, mais contraste, luz no canto e brilhos) num arquivo novo
(<ícone>_mythic.png ou <ícone>_boss.png), e o item passa a usar esse ícone. O brilho que pulsa
vem do CSS (style.css: img[src*="_mythic."] e img[src*="_boss."]). O ícone original fica para
quem o divide (réplicas, troféus...).
  python scripts/icons_epic.py
"""
import colorsys, json, os, re

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
DATA = os.path.join(ROOT, 'shared', 'data')
GOLD = (255, 210, 90)
PURPLE = (190, 120, 255)


def enhance(src, glow):
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    px = im.load()
    out = Image.new('RGBA', (w, h))
    o = out.load()
    # Contorno brilhante em volta da silhueta.
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] > 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = glow + (200,)
    # Mais contraste e cor, e luz no canto de cima à esquerda.
    body = im.copy()
    b = body.load()
    for y in range(h):
        for x in range(w):
            r, g, bb, a = b[x, y]
            if not a:
                continue
            hh, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, bb / 255)
            light = 1 + 0.25 * max(0, 1 - (x + y) / (w + h) * 1.6)
            s = min(1, s * 1.2)
            v = max(0, min(1, ((v - 0.5) * 1.25 + 0.5) * light))
            r2, g2, b2 = colorsys.hsv_to_rgb(hh, s, v)
            b[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    out.alpha_composite(body)
    # Três brilhos de estrela nos pontos mais claros, longe uns dos outros.
    o = out.load()
    pts = sorted(((colorsys.rgb_to_hsv(*(c / 255 for c in b[x, y][:3]))[2], x, y) for y in range(h) for x in range(w) if b[x, y][3]), reverse=True)
    used = []
    for _, x, y in pts:
        if all(abs(x - u) + abs(y - v) > 8 for u, v in used):
            used.append((x, y))
            o[x, y] = (255, 255, 240, 255)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if 0 <= x + dx < w and 0 <= y + dy < h and o[x + dx, y + dy][3]:
                    o[x + dx, y + dy] = (255, 250, 200, 255)
        if len(used) >= 3:
            break
    return out


items = json.load(open(os.path.join(DATA, 'items.json'), encoding='utf8'))
monsters = json.load(open(os.path.join(DATA, 'monsters.json'), encoding='utf8'))
hunts = json.load(open(os.path.join(DATA, 'hunts.json'), encoding='utf8'))
ws = open(os.path.join(ROOT, 'shared', 'src', 'worldboss.ts'), encoding='utf8').read()
token_shop = re.findall(r"'([a-z0-9_]+)'", re.search(r'BOSS_TOKEN_SHOP_ITEMS[^\]]*\]', ws).group(0))

boss_mons = {m for h in hunts if h.get('boss') or h.get('lair') for m in (h['monsters'][:1] if h.get('lair') else h['monsters'])}
common_drops = {l['item'] for m in monsters if m['id'] not in boss_mons for l in m['loot']}
boss_drops = {l['item'] for m in monsters if m['id'] in boss_mons for l in m['loot']} | set(token_shop)


def tier(it):
    if it['id'].startswith('replica_'):
        return None
    base = it['icon'].removesuffix('_mythic').removesuffix('_boss')
    it['icon'] = base
    if it.get('legendary'):
        return 'mythic'
    if it.get('equip') and it['id'] in boss_drops and it['id'] not in common_drops:
        return 'boss'
    return None


count = {'mythic': 0, 'boss': 0}
for it in items:
    t = tier(it)
    if not t:
        continue
    src = os.path.join(ICO, f"{it['icon']}.png")
    if not os.path.exists(src):
        continue
    enhance(src, GOLD if t == 'mythic' else PURPLE).save(os.path.join(ICO, f"{it['icon']}_{t}.png"))
    it['icon'] = f"{it['icon']}_{t}"
    count[t] += 1

path = os.path.join(DATA, 'items.json')
raw = open(path, encoding='utf8', newline='').read()
nl = '\r\n' if '\r\n' in raw else '\n'
open(path, 'w', encoding='utf8', newline='').write((json.dumps(items, ensure_ascii=False, indent=2) + '\n').replace('\n', nl))
print('ok', count)
