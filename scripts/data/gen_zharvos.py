"""Zharvos, o Arquimago: addon do chapéu, sprites do chefe e a instância de demônios do 150.

- Addon `wizard_hat`: o chapéu pontudo do pack Time Elements (Patreon, hat9) em roxo, encaixado
  quadro a quadro na cabeça do paperdoll (m e f). Prêmio do chefe.
- Sprite `zharvos` (invasão): o paperdoll do jogo (arcanista em roxo, cabelo branco) com o chapéu
  e uma barba longa em pixel art, ampliado com aura roxa.
- Sprite `zharvos_shell` (instância): a Casca Mortal, a mesma figura em tons de casca seca e musgo.
- Instância `zharvos_sanctum` (150): limpeza de demônios arcanos (recolor dos demônios do pack),
  subchefe e a Casca Mortal; chave forjada na Ferraria e caindo das instâncias do 140 e do 150.
Uso: python scripts/data/gen_zharvos.py   (idempotente)
"""
import colorsys
import json
import os

from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
DOLL = ROOT + '/client/public/assets/paperdoll/'
MON = ROOT + '/client/public/assets/monsters/'
ICONS = ROOT + '/client/public/assets/icons/'
DOLL_META = ROOT + '/client/src/paperdoll.json'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'
HAT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'patreon_elements', 'hat9.png')
FW, FH = 22, 34
PURPLE = 0.79


def load(p): return json.load(open(p, encoding='utf8'))


def save(p, d):
    with open(p, 'w', encoding='utf8', newline='\n') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')


def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)


def shift(im, hue, sat=1.0, val=1.0, rng=(0.0, 1.0), min_s=0.2):
    """Troca o matiz das cores (dentro de `rng`), mantendo luz e sombra."""
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = hsv((r, g, b))
            if rng[0] < h < rng[1] and s > min_s:
                c = colorsys.hsv_to_rgb(hue, min(1, s * sat), min(1, v * val))
                px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im


def recolor_hls(im, hue, sat=1.0, light=1.0):
    """O mesmo recolor dos monstros das instâncias (gen_instances_beyond.py)."""
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            s = min(1, s * 1.6 * sat)
            s = 0.25 + s if s < 0.25 else s
            r2, g2, b2 = colorsys.hls_to_rgb(hue, min(1, l * light), s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im


hat_src = shift(Image.open(HAT).convert('RGBA'), PURPLE, 1.1, 0.65, (0.45, 0.75))
HAT_SINK = 9  # quanto a aba desce na testa (aprovado na prévia)


def hat_frame(row):
    f = hat_src.crop((0, row * 48, 48, row * 48 + 48))
    return f.crop(f.getbbox())


def head(frame):
    """Topo da cabeça e o centro dela no quadro do paperdoll."""
    top = frame.getbbox()[1]
    xs = [x for y in range(top, top + 5) for x in range(frame.width) if frame.getpixel((x, y))[3]]
    return top, sum(xs) / len(xs)


# ── Addon: o chapéu em cada quadro (3 colunas x 4 linhas), para homem e mulher ──
for g in ('m', 'f'):
    base = Image.open(f'{DOLL}base_{g}_1.png').convert('RGBA')
    sheet = Image.new('RGBA', base.size, (0, 0, 0, 0))
    for row in range(4):
        hf = hat_frame(row)
        for col in range(3):
            fr = base.crop((col * FW, row * FH, col * FW + FW, row * FH + FH))
            top, cx = head(fr)
            cell = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
            cell.alpha_composite(hf, (round(cx - hf.width / 2), max(0, top - hf.height + HAT_SINK)))
            sheet.alpha_composite(cell, (col * FW, row * FH))
    sheet.save(f'{DOLL}addon_wizard_hat_{g}.png')

meta = load(DOLL_META)
if 'wizard_hat' not in meta['addons']:
    meta['addons'] = sorted(meta['addons'] + ['wizard_hat'])
with open(DOLL_META, 'w', encoding='utf8', newline='\n') as f:
    json.dump(meta, f, ensure_ascii=False)

# ── Chefe: o mago montado no paperdoll, com barba e chapéu ──
W_, G_, K_ = (236, 234, 228, 255), (188, 186, 192, 255), (62, 52, 66, 255)
BEARD = ['.kkk.kkk.', 'kWWWkWWWk', 'kWWgWgWWk', '.kWWWWWk.', '.kWgWgWk.', '..kWWWk..', '..kgWgk..', '...kWk...', '....k....']


def beard(colors):
    im = Image.new('RGBA', (len(BEARD[0]), len(BEARD)), (0, 0, 0, 0))
    for y, r in enumerate(BEARD):
        for x, ch in enumerate(r):
            if ch in colors:
                im.putpixel((x, y), colors[ch])
    return im


def wizard(robe, hair, hat_tone, beard_colors):
    """Quadros de frente (parado, passo1, parado, passo2) do mago, com folga em volta."""
    c = Image.open(DOLL + 'base_m_1.png').convert('RGBA')
    for n in ('outfit_arcanist_m', f'hair_m_1_{hair}'):
        c.alpha_composite(Image.open(DOLL + n + '.png').convert('RGBA'))
    c = robe(c)
    hf = hat_tone(hat_frame(0))
    bd = beard(beard_colors)
    out = []
    for col in (0, 1, 0, 2):
        fr = c.crop((col * FW, 0, col * FW + FW, FH))
        top, cx = head(fr)
        can = Image.new('RGBA', (FW + 10, FH + 12), (0, 0, 0, 0))
        can.alpha_composite(fr, (5, 12))
        # Barba abaixo dos olhos (linha 14 do paperdoll de frente, que anda junto com a cabeça).
        can.alpha_composite(bd, (5 + 10 - bd.width // 2, 12 + 14 + (top - 5)))
        can.alpha_composite(hf, (5 + round(cx - hf.width / 2), 12 + top - hf.height + HAT_SINK))
        out.append(can)
    return out


def aura(im, color, strength=0.75, grow=7, blur=3):
    a = im.split()[3].filter(ImageFilter.MaxFilter(grow)).filter(ImageFilter.GaussianBlur(blur))
    glow = Image.new('RGBA', im.size, color + (0,))
    glow.putalpha(a.point(lambda v: int(v * strength)))
    o = Image.new('RGBA', im.size, (0, 0, 0, 0))
    o.alpha_composite(glow)
    o.alpha_composite(im)
    return o


def boss_sprite(frames, scale, color, name):
    for k, fr in enumerate(frames, 1):
        big = fr.resize((fr.width * scale, fr.height * scale), Image.NEAREST)
        pad = Image.new('RGBA', (big.width + 16, big.height + 8), (0, 0, 0, 0))
        # Flutua: sobe 1 px (ampliado) nos quadros de passo.
        pad.alpha_composite(big, (8, 4 - (scale // 2 if k in (2, 4) else 0)))
        aura(pad, color).save(f'{MON}{name}_{k}.png')


boss_sprite(
    wizard(lambda im: shift(im, PURPLE, 1.0, 0.7, (0.5, 0.72)), 'white', lambda h: h, {'W': W_, 'g': G_, 'k': K_}),
    4, (170, 60, 255), 'zharvos')
# Casca Mortal: casca seca e musgo (enraizada), barba de líquen, chapéu apodrecido.
BARK = lambda im: shift(im, 0.07, 0.8, 0.55, (0.5, 0.72))
boss_sprite(
    wizard(BARK, 'gray', lambda h: shift(h, 0.27, 0.6, 0.6, (0.6, 0.95)),
           {'W': (150, 170, 120, 255), 'g': (110, 130, 90, 255), 'k': (40, 45, 30, 255)}),
    3, (90, 200, 90), 'zharvos_shell')

# ── Instância de demônios do 150 ──
items = load(D + 'items.json')
by_item = {i['id']: i for i in items}
monsters = load(D + 'monsters.json')
by_mon = {m['id']: m for m in monsters}
hunts = load(D + 'hunts.json')
by_hunt = {h['id']: h for h in hunts}
smithing = load(D + 'smithing.json')
by_sm = {s['id']: s for s in smithing}
i18n_items = load(I18N_ITEMS)
i18n_content = load(I18N_CONTENT)


def put(lst, by, obj):
    if obj['id'] in by:
        by[obj['id']].clear()
        by[obj['id']].update(obj)
    else:
        lst.append(obj)
        by[obj['id']] = obj


L = 150
REGION, REGION_EN = 'Santuário de Zharvos', "Zharvos' Sanctum"
HUNT = ('zharvos_sanctum', 'Santuário do Arquimago', "The Archmage's Sanctum")
MAT = ('arcane_shard', 'Estilhaço Arcano', 'Arcane Shard', 'chaos_fragment')
KEY = ('zharvos_key', 'Chave do Santuário do Arquimago', "Archmage's Sanctum Key")
TRASH = [
    ('arcane_demon', 'Demônio Arcano', 'Arcane Demon', 'demon', ['holy'], ['energy']),
    ('hex_fiend', 'Diabo do Feitiço', 'Hex Fiend', 'lesser_demon', ['holy'], ['energy']),
    ('spellfire_devil', 'Diabo do Fogo Arcano', 'Spellfire Devil', 'fire_devil', ['water'], ['fire']),
    ('rune_imp', 'Diabrete das Runas', 'Rune Imp', 'imp', ['holy'], ['energy']),
    ('bound_skeleton', 'Esqueleto Acorrentado', 'Bound Skeleton', 'demon_skeleton', ['holy'], ['death']),
]
MINI = ('zharvos_warden', 'Guardião do Arquimago', "Archmage's Warden", 'lord_demon', ['holy'], ['energy', 'fire'])
BOSS = ('zharvos_shell', 'Casca Mortal de Zharvos', 'Mortal Shell of Zharvos', None, ['fire'], ['energy', 'death'])
GEAR = ['boreal_bow', 'frost_plate', 'crystal_king_mail']
KEY_FROM = ['crystal_throne', 'frost_giant_throne']
base = by_mon['frost_giant']  # limpeza do 150
gold = next(l for l in base['loot'] if l['item'] == 'gold')
kills = round((100 + L * 4) / 10) * 10
key_chance = round(0.6 / kills, 4)
i18n_content[REGION] = REGION_EN


def sprite(src, dst):
    for d in ('', '_down', '_up'):
        if os.path.exists(f'{MON}{src}{d}_1.png'):
            for k in range(1, 5):
                recolor_hls(Image.open(f'{MON}{src}{d}_{k}.png'), PURPLE).save(f'{MON}{dst}{d}_{k}.png')


mid, mpt, men, micon = MAT
recolor_hls(Image.open(ICONS + micon + '.png'), PURPLE).save(ICONS + mid + '.png')
put(items, by_item, {'id': mid, 'name': mpt, 'icon': mid, 'value': by_item['eternal_ice']['value']})
i18n_items[mpt] = men
kid, kpt, ken = KEY
recolor_hls(Image.open(ICONS + 'chaos_key.png'), PURPLE).save(ICONS + kid + '.png')
put(items, by_item, {'id': kid, 'name': kpt, 'icon': kid})
i18n_items[kpt] = ken
fk = by_sm['frostgiant_key']
put(smithing, by_sm, {**fk, 'id': kid, 'name': kpt, 'output': kid,
                      'inputs': {**{k: v for k, v in fk['inputs'].items() if k != 'eternal_ice'}, mid: 4}})


def mon(spec, hp_m, atk_m, xp_m, loot, spd):
    sid, spt, sen, src, weak, resist = spec
    if src:
        sprite(src, sid)
    put(monsters, by_mon, {
        'id': sid, 'name': spt, 'sprite': sid, 'hp': int(round(base['hp'] * hp_m, -1)),
        'attack': round(base['attack'] * atk_m), 'defense': base['defense'], 'attackSpeedMs': spd,
        'xp': int(round(base['xp'] * xp_m, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[spt] = sen


for n, spec in enumerate(TRASH):
    loot = [{'item': 'gold', 'chance': 1, 'min': gold['min'], 'max': gold['max']},
            {'item': mid, 'chance': 0.3}, {'item': 'dark_essence', 'chance': 0.2},
            {'item': GEAR[n % 3], 'chance': 0.0015}, {'item': kid, 'chance': key_chance}]
    mon(spec, 1 + 0.08 * (n % 3), 1 + 0.03 * (n % 2), 1, loot, 1250 - 50 * (n % 3))
for spec, hp_m, atk_m, xp_m, g_m, last in ((MINI, 2.5, 0.95, 3.5, 4, False), (BOSS, 3.0, 1.0, 6, 8, True)):
    loot = [{'item': 'gold', 'chance': 1, 'min': gold['min'] * g_m, 'max': gold['max'] * g_m},
            {'item': mid, 'chance': 1, 'min': 3 if last else 1, 'max': 6 if last else 3},
            {'item': 'infernal_core', 'chance': 1 if last else 0.5}]
    if last:
        loot += [{'item': g, 'chance': 0.06} for g in GEAR]
    mon(spec, hp_m, atk_m, xp_m, loot, 1300 if last else 1200)

put(hunts, by_hunt, {'id': HUNT[0], 'name': HUNT[1], 'region': REGION, 'level': L,
                     'monsters': [MINI[0], BOSS[0]], 'boss': True, 'key': kid, 'trash': [t[0] for t in TRASH]})
i18n_content[HUNT[1]] = HUNT[2]
for hid in KEY_FROM:
    for m in by_hunt[hid].get('trash') or by_hunt[hid]['monsters']:
        if not any(l['item'] == kid for l in by_mon[m]['loot']):
            by_mon[m]['loot'].append({'item': kid, 'chance': key_chance})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items)
save(D + 'monsters.json', monsters)
save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing)
save(I18N_ITEMS, i18n_items)
save(I18N_CONTENT, i18n_content)
print('ok')
