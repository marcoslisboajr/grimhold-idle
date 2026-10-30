"""Capas de frente e de lado mais visíveis: gola nos ombros e laterais mais largas.

Roda sobre todas as camadas cape_*_m/f.png já geradas (maestria, Artesanato e chefe),
usando as cores da própria capa (tiradas da vista de costas). Só mexe nas linhas de
frente e de lado (0 a 2); a de costas fica igual. Rodar uma vez só (marca no PNG).
  python scripts/capes_front.py
"""
import colorsys, glob, os
from collections import Counter

from PIL import Image, PngImagePlugin

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PD = os.path.join(ROOT, 'client', 'public', 'assets', 'paperdoll')
FW, FH = 22, 34
MARK = 'capes_front'
NECK = 17  # linha dos ombros (a cabeça vai até a 15, o pescoço é a 16)


def palette(im):
    """Contorno (o mais escuro comum) e pano (o mais comum) da vista de costas."""
    cnt = Counter()
    for y in range(3 * FH, 4 * FH):
        for x in range(FW * 3):
            p = im.getpixel((x, y))
            if p[3] == 255:
                cnt[p] += 1
    v = lambda p: colorsys.rgb_to_hsv(*(c / 255 for c in p[:3]))[2]
    common = [p for p, _ in cnt.most_common(12)]
    dark = min(common, key=v)
    cloth = next(p for p in common if v(p) > v(dark) + 0.12)
    light = max(common[:6], key=v)
    return dark, cloth, light


def frame_body(base, r, c):
    """Pixels do corpo no quadro (para saber onde ficam os ombros e as laterais)."""
    a = base.getchannel('A')
    return {(x, y) for x in range(FW) for y in range(FH) if a.getpixel((c * FW + x, r * FH + y))}


def edit(path, base):
    im = Image.open(path).convert('RGBA')
    if im.info.get(MARK):
        return False
    dark, cloth, light = palette(im)
    out = im.copy()
    for r in range(3):
        for c in range(3):
            ox, oy = c * FW, r * FH
            body = frame_body(base, r, c)
            rows = sorted({y for _, y in body})
            neck = NECK
            cape = {(x, y) for x in range(FW) for y in range(FH) if im.getpixel((ox + x, oy + y))[3]}
            put = lambda x, y, p: 0 <= x < FW and 0 <= y < FH and out.putpixel((ox + x, oy + y), p)
            # Gola: duas linhas sobre os ombros (contorno em cima, pano embaixo).
            xs = [x for x in range(FW) if (x, neck) in body]
            if r == 0:
                for x in range(xs[0], xs[-1] + 1):
                    put(x, neck, dark)
                    put(x, neck + 1, cloth if xs[0] < x < xs[-1] else dark)
                put((xs[0] + xs[-1]) // 2, neck + 1, (214, 168, 52, 255))  # broche
            else:
                # De lado: a gola só no ombro de trás.
                back = range(xs[0], (xs[0] + xs[-1]) // 2 + 1) if r == 2 else range((xs[0] + xs[-1]) // 2, xs[-1] + 1)
                for x in back:
                    put(x, neck, dark)
                    put(x, neck + 1, cloth)
            # Laterais: um pixel a mais para fora em cada linha onde a capa encosta na borda.
            for y in range(neck + 2, rows[-1] - 1):
                line = [x for x in range(FW) if (x, y) in cape]
                if not line:
                    continue
                for x0, dx in ((min(line), -1), (max(line), 1)):
                    if (x0 + dx, y) not in body and (x0 + dx, y) not in cape:
                        put(x0, y, cloth)
                        put(x0 + dx, y, dark)
    info = PngImagePlugin.PngInfo()
    info.add_text(MARK, '1')
    out.save(path, pnginfo=info)
    return True


if __name__ == '__main__':
    bases = {g: Image.open(os.path.join(PD, f'base_{g}_1.png')).convert('RGBA') for g in 'mf'}
    n = 0
    for p in sorted(glob.glob(os.path.join(PD, 'cape_*_[mf].png'))):
        n += edit(p, bases[p[-5]])
    print('ok', n)
