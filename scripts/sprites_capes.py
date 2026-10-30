"""Capas de maestria: a do Mestre (nível 99 numa profissão, e a de todas) e a Suprema (120).

Tira a capa do traje do Bárbaro (só o pano roxo e o contorno colado nele), estica até
os pés, recolore na cor de cada profissão e põe o brasão da skill nas costas.
Gera a camada do boneco (cape_<id>_m/f.png) e o ícone do item (cape_<id>.png).
  python scripts/sprites_capes.py
"""
import colorsys, os

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PD = os.path.join(ROOT, 'client', 'public', 'assets', 'paperdoll')
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
FW, FH = 22, 34

# id, matiz, saturação, ícone do brasão
CAPES = [
    ('mining', 0, 0.2, 'skill_mining'),
    ('smithing', 25, 1.1, 'skill_smithing'),
    ('fishing', 210, 1.0, 'skill_fishing'),
    ('cooking', 0, 1.1, 'skill_cooking'),
    ('woodcutting', 30, 0.75, 'skill_woodcutting'),
    ('crafting', 42, 0.7, 'skill_crafting'),
    ('herbalism', 120, 0.9, 'skill_herbalism'),
    ('soulreaping', 172, 0.8, 'skill_soulreaping'),
    ('alchemy', 85, 1.0, 'skill_alchemy'),
    ('runecraft', 192, 1.0, 'skill_runecraft'),
    ('fletching', 62, 0.8, 'skill_fletching'),
    ('sigilism', 262, 0.9, 'skill_sigilism'),
    ('jewelcrafting', 305, 1.0, 'skill_jewelcrafting'),
    ('slayer', 352, 0.9, 'kings_skull'),
    ('mastery', 46, 1.1, 'ui_star'),
]


def is_cloth(p):
    r, g, b, a = p
    if not a:
        return False
    h, s, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return 0.68 < h < 0.88 and s > 0.25


def cape_from(gender):
    im = Image.open(os.path.join(PD, f'outfit_barbarian_{gender}.png')).convert('RGBA')
    out = Image.new('RGBA', im.size)
    for y in range(im.height):
        for x in range(im.width):
            p = im.getpixel((x, y))
            if is_cloth(p):
                out.putpixel((x, y), p)
            elif p[3] and colorsys.rgb_to_hsv(*(c / 255 for c in p[:3]))[2] < 0.3:
                # Contorno escuro colado no pano.
                if any(0 <= x + dx < im.width and 0 <= y + dy < im.height and is_cloth(im.getpixel((x + dx, y + dy)))
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    out.putpixel((x, y), p)
    return out


def lengthen(cape, extra=3):
    """Estica cada quadro repetindo a faixa logo acima da barra (a barra fica igual)."""
    out = Image.new('RGBA', cape.size)
    for r in range(4):
        for c in range(3):
            fr = cape.crop((c * FW, r * FH, c * FW + FW, r * FH + FH))
            bb = fr.getbbox()
            if not bb or bb[3] - bb[1] < 6:
                out.alpha_composite(fr, (c * FW, r * FH))
                continue
            mid = bb[3] - 3
            new = Image.new('RGBA', (FW, FH))
            new.alpha_composite(fr.crop((0, 0, FW, mid)), (0, 0))
            for k in range(extra):
                new.alpha_composite(fr.crop((0, mid - 1 - (k % 2), FW, mid - (k % 2))), (0, mid + k))
            new.alpha_composite(fr.crop((0, mid, FW, FH - extra)), (0, mid + extra))
            out.alpha_composite(new, (c * FW, r * FH))
    return out


def recolor(im, hue, sat):
    out = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if not a:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, s * sat), min(1, v * 1.05))
            out.putpixel((x, y), (int(r2 * 255), int(g2 * 255), int(b2 * 255), a))
    return out


def badge(icon, n=9, rim=(245, 210, 90, 255)):
    b = Image.new('RGBA', (n, n))
    d = ImageDraw.Draw(b)
    d.ellipse((0, 0, n - 1, n - 1), fill=rim)
    d.ellipse((1, 1, n - 2, n - 2), fill=(235, 225, 200, 255))
    im = Image.open(os.path.join(ICO, f'{icon}.png')).convert('RGBA')
    b.alpha_composite(im.crop(im.getbbox()).resize((n - 2, n - 2), Image.LANCZOS), (1, 1))
    return b


def with_badge(cape, icon, rim=(245, 210, 90, 255)):
    """Brasão só de costas (linha de baixo da folha)."""
    out = cape.copy()
    b = badge(icon, rim=rim)
    for c in range(3):
        bb = cape.crop((c * FW, 3 * FH, c * FW + FW, 4 * FH)).getbbox()
        if bb:
            out.alpha_composite(b, (c * FW + (bb[0] + bb[2]) // 2 - 4, 3 * FH + bb[1] + 4))
    return out


def item_icon(sheet):
    """Ícone 32x32: a capa vista de costas, ampliada."""
    fr = sheet.crop((FW, 3 * FH, 2 * FW, 4 * FH))
    fr = fr.crop(fr.getbbox())
    k = min(30 / fr.width, 30 / fr.height)
    big = fr.resize((round(fr.width * k), round(fr.height * k)), Image.NEAREST)
    out = Image.new('RGBA', (32, 32))
    out.alpha_composite(big, ((32 - big.width) // 2, (32 - big.height) // 2))
    return out


def gilded(cape):
    """Suprema: o contorno escuro vira um debrum dourado."""
    out = cape.copy()
    for y in range(cape.height):
        for x in range(cape.width):
            r, g, b, a = cape.getpixel((x, y))
            if a and colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[2] < 0.3:
                out.putpixel((x, y), (214, 168, 52, 255))
    return out



def two_tone(base, cloth_v=0.13, trim=(178, 24, 30, 255)):
    """Slayer (estilo RuneScape): o pano fica preto e o contorno escuro vira um debrum vermelho."""
    out = base.copy()
    for y in range(base.height):
        for x in range(base.width):
            r, g, b, a = base.getpixel((x, y))
            if not a:
                continue
            v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[2]
            if v < 0.3:
                out.putpixel((x, y), trim)
            else:
                k = int(255 * min(1, v * cloth_v))
                out.putpixel((x, y), (k, k, k + 4, a))
    return out


# Capas de duas cores (pano e debrum próprios) em vez do recolor de um tom só.
TWO_TONE = {'slayer'}


if __name__ == '__main__':
    base = {g: lengthen(cape_from(g)) for g in ('m', 'f')}
    for cid, hue, sat, icon in CAPES:
        for g in ('m', 'f'):
            cape = recolor(base[g], hue, sat)
            normal = two_tone(base[g]) if cid in TWO_TONE else cape
            supreme = two_tone(base[g], trim=(214, 168, 52, 255)) if cid in TWO_TONE else gilded(cape)
            for suffix, sheet in (('', with_badge(normal, icon)), ('_supreme', with_badge(supreme, icon, rim=(235, 245, 255, 255)))):
                sheet.save(os.path.join(PD, f'cape_{cid}{suffix}_{g}.png'))
                if g == 'm':
                    item_icon(sheet).save(os.path.join(ICO, f'cape_{cid}{suffix}.png'))
    print('ok', len(CAPES) * 2)
