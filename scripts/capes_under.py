"""Capa por trás do corpo (de frente e de lado): cape_<id>_<g>_under.png.

Usa a própria capa de costas (mesmo desenho e proporção), sem o brasão, colada atrás do
corpo: de frente no mesmo lugar (aparece dos lados), de lado deslocada para as costas.
Fica atrás do corpo, então nunca passa por cima do rosto, do cabelo nem dos pés.
  python scripts/capes_under.py
"""
import glob, os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PD = os.path.join(ROOT, 'client', 'public', 'assets', 'paperdoll')
FW, FH = 22, 34
SIDE_SHIFT = 2  # de lado, quanto o meio da capa vai para as costas
SIDE_WIDTH = 0.45  # de lado, a largura da capa em relação à de costas
FRONT_WIDEN = 1.0  # de frente, a capa de costas igualzinha (aparece só na barra, dos lados)


def under(cape, plain):
    out = Image.new('RGBA', cape.size)
    for c in range(3):
        back = plain.crop((c * FW, 3 * FH, c * FW + FW, 4 * FH))
        # De frente: a mesma capa um pouco mais larga (centrada), para sair dos dois lados.
        bb = back.getbbox()
        if bb:
            part = back.crop(bb)
            w = min(FW, round(part.width * FRONT_WIDEN))
            wide = part.resize((w, part.height), Image.NEAREST)
            out.alpha_composite(wide, (c * FW + (bb[0] + bb[2] - w) // 2, bb[1]))
        # Linha 1 olha para a esquerda (costas à direita); linha 2 o contrário.
        # De lado: a mesma capa, estreita (de lado ela é fina), encostada nas costas e só da cintura para baixo
        # passando um pouco para fora.
        bb = back.getbbox()
        if bb:
            part = back.crop(bb)
            w = max(3, round(part.width * SIDE_WIDTH))
            thin = part.resize((w, part.height), Image.NEAREST)
            cx = (bb[0] + bb[2]) // 2
            for r, x in ((1, cx + SIDE_SHIFT - w // 2), (2, cx - SIDE_SHIFT - (w - w // 2))):
                out.alpha_composite(thin, (c * FW + x, r * FH + bb[1]))
    return out


if __name__ == '__main__':
    n = 0
    for p in sorted(glob.glob(os.path.join(PD, 'cape_*_[mf].png'))):
        cape = Image.open(p).convert('RGBA')
        # Sem brasão: a versão de costas sem o emblema vem do pano ao redor (o brasão fica só nas costas).
        plain = cape.copy()
        px = plain.load()
        for y in range(3 * FH, 4 * FH):
            for x in range(FW * 3):
                r, g, b, a = px[x, y]
                if a and (abs(r - g) < 25 and r > 200 or (r > 200 and g > 150 and b < 120)):
                    # Pixel do brasão (claro ou dourado): troca pelo vizinho de cima que é pano.
                    yy = y
                    while yy > 3 * FH and (lambda q: q[3] and (abs(q[0] - q[1]) < 25 and q[0] > 200 or (q[0] > 200 and q[1] > 150 and q[2] < 120)))(px[x, yy]):
                        yy -= 1
                    px[x, y] = px[x, yy]
        under(cape, plain).save(p[:-4] + '_under.png')
        n += 1
    print('ok', n)
