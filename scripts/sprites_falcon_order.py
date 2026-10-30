"""Monstros da Fase 1 (200-250, a guerra das Ordens): os cavaleiros da Ordem do Gavião montados
com as peças do paperdoll (TF_guest_paperdolls) recoloridas, e os da Guarda do Leão com o
soldado-gato do beast_tribes. Só peças dos packs + recolor; nada desenhado por código.
Grava em client/public/assets/monsters/ <nome>_1..4 (de lado, olhando para a esquerda),
<nome>_down_1..4 e <nome>_up_1..4 (ciclo passo1, parado, passo2, parado), em 2x como os
outros humanos, e soma os nomes em client/src/world/monsterDirs.json.
  python scripts/sprites_falcon_order.py
"""
import colorsys, json, os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
GRIM = '../grimhold/assets-pixel/personagens/'
P = GRIM + 'TF_guest_paperdolls/paperdolls/'
E = P + '2 Explorer Tier/paperdolls/'
BEAST = GRIM + 'beast_tribes/100/'
ROWS = 4
PACK_COLS = [1, 0, 3]  # passo1, parado, passo2 (folha 4x4 do paperdoll)


def pack(f):
    """Peça do paperdoll (2x, quadros 52x72) -> folha 3x4 de 26x36 (passo1, parado, passo2)."""
    src = Image.open(f).convert('RGBA')
    out = Image.new('RGBA', (26 * 3, 36 * ROWS))
    for l in range(ROWS):
        for i, c in enumerate(PACK_COLS):
            out.alpha_composite(src.crop((c * 52, l * 72, c * 52 + 52, l * 72 + 72)).resize((26, 36), Image.NEAREST), (i * 26, l * 36))
    return out


def chara(f, idx):
    """Personagem de folha 12x8 (26x36; idx 1-8) -> folha 3x4 passo1, parado, passo2."""
    src = Image.open(f).convert('RGBA')
    gx, gy = (idx - 1) % 4, (idx - 1) // 4
    out = Image.new('RGBA', (26 * 3, 36 * ROWS))
    for l in range(ROWS):
        for i, c in enumerate([0, 1, 2]):
            x, y = (gx * 3 + c) * 26, (gy * 4 + l) * 36
            out.alpha_composite(src.crop((x, y, x + 26, y + 36)), (i * 26, l * 36))
    return out


def tint(im, hue, sat, vm, keep_gold=False, alpha=255):
    """Pinta a peça num tom (o contorno escuro fica). keep_gold: o dourado e o amarelo continuam dourados."""
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if v < 0.2:
                if alpha < 255: px[x, y] = (r, g, b, min(a, alpha))
                continue
            if keep_gold and 0.08 <= h <= 0.17 and s > 0.35:
                nh, ns, nv = 0.12, min(1, s * 1.1), v
            else:
                nh, ns, nv = hue / 360, min(1, sat * (0.4 + s)), min(1, v * vm)
            nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, nv)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), min(a, alpha))
    return im


def knight(g, tier, n, hue, sat, vm, keep_gold=True, head=None, alpha=255):
    """Cavaleiro: corpo, pernas e cabeça da mesma peça do pack, recoloridos."""
    layers = [pack(P + f'_Bases/base_human_{g}_2.png')]
    for part in ('lg', 'bd'):
        layers.append(tint(pack(E + f'ar_{g}_{tier}_{part}_{n}.png'), hue, sat, vm, keep_gold, alpha))
    layers.append(tint(pack(E + (head or f'ar_{g}_{tier}_hd_{n}.png')), hue, sat, vm, keep_gold, alpha))
    out = Image.new('RGBA', layers[0].size)
    for la in layers:
        out.alpha_composite(la)
    if alpha < 255:
        px = out.load()
        for y in range(out.height):
            for x in range(out.width):
                r, gg, b, a = px[x, y]
                if a: px[x, y] = (min(255, r + 10), min(255, gg + 30), min(255, b + 50), min(a, alpha))
    return out


def lion(armor_hue, vm=1.0):
    """Soldado-gato do beast_tribes (o de armadura vermelha) com a armadura pintada."""
    sheet = chara(BEAST + 'beast_tribe_2.png', 5)
    px = sheet.load()
    for y in range(sheet.height):
        for x in range(sheet.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # Armadura vermelha (matiz perto de 0) vira a cor pedida; o pelo (laranja/bege) fica.
            if (h < 0.04 or h > 0.93) and s > 0.4:
                nr, ng, nb = colorsys.hsv_to_rgb(armor_hue / 360, min(1, s), min(1, v * vm))
                px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return sheet


MONSTERS = {
    # Ordem do Gavião: azul-noite com dourado.
    'falcon_squire': (lambda: knight('m', 'md', 6, 222, 0.45, 0.6), 2),
    'falcon_archer': (lambda: knight('m', 'lt', 4, 225, 0.4, 0.55), 2),
    'falcon_knight': (lambda: knight('m', 'hv', 6, 228, 0.3, 0.5), 2),
    'falcon_cleric': (lambda: knight('m', 'lt', 6, 220, 0.4, 0.7, head='ar_m_md_hd_6.png'), 2),
    'falcon_paladin': (lambda: knight('m', 'hv', 4, 225, 0.45, 0.62), 2),
    'falcon_herald': (lambda: knight('m', 'hv', 5, 235, 0.55, 0.55), 2),
    # Guarda do Leão: as sentinelas e os cavaleiros caídos.
    'lion_sentinel': (lambda: lion(45), 2),
    'fallen_lion_knight': (lambda: knight('m', 'hv', 1, 42, 0.3, 0.75), 2),
    'knight_specter': (lambda: knight('m', 'hv', 3, 190, 0.35, 1.1, keep_gold=False, alpha=170), 2),
    # Chefes (a cena ainda aumenta os chefes).
    'falcon_marshal': (lambda: knight('m', 'hv', 2, 226, 0.4, 0.55), 2),
    'drevan': (lambda: lion(48, 1.1), 2.5),
    'aldoran': (lambda: knight('m', 'hv', 6, 240, 0.2, 0.35), 2.5),
}

SIDE = {'': 1, '_down': 0, '_up': 3}
for name, (build, scale) in MONSTERS.items():
    sheet = build()
    for suffix, row in SIDE.items():
        frames = [sheet.crop((c * 26, row * 36, c * 26 + 26, row * 36 + 36)) for c in range(3)]
        cycle = [frames[0], frames[1], frames[2], frames[1]]
        boxes = [f.getbbox() for f in cycle if f.getbbox()]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        for i, f in enumerate(cycle, 1):
            f = f.crop((x0, y0, x1, y1))
            f = f.resize((round(f.width * scale), round(f.height * scale)), Image.NEAREST)
            f.save(os.path.join(OUT, f'{name}{suffix}_{i}.png'))

dirs_path = os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json')
dirs = json.load(open(dirs_path, encoding='utf8'))
json.dump(sorted(set(dirs) | set(MONSTERS)), open(dirs_path, 'w'), indent=1)
print('ok', len(MONSTERS))
