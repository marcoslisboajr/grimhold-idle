# Sprites próprios dos deuses: os 4 Avatares (chefe global) e os campeões dos covis principais,
# recortados das folhas RPG Maker que vieram no chat (sem recolor). De lado, olhando para a
# esquerda (linha 1 da folha), ciclo passo1, parado, passo2, parado, como os outros monstros.
# O gen_gods.py não repinta estes ids (OWN_SPRITES lá).
# Uso: python scripts/sprites_gods.py
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
SRC = '../grimhold/assets-pixel/personagens/enviados_no_chat/'

# id: (folha, grade (colunas, linhas), bloco (bx, by), escala da folha, escala no jogo)
SPRITES = {
    # Avatares: maiores que os campeões.
    'kharvos_avatar': ('cavaleiro_prateado_chifres.png', (3, 4), (0, 0), 2, 3),
    'sylveth_avatar': ('cavaleiros_coloridos_A.png', (12, 8), (3, 0), 3, 4),
    'aethon_avatar': ('espirito_azul_flutuante.png', (3, 4), (0, 0), 3, 3),
    'lumira_avatar': ('cavaleiros_coloridos_B.png', (12, 8), (3, 0), 3, 4),
    # Campeões dos covis: um cavaleiro na cor do deus.
    'gorrak': ('cavaleiros_coloridos_B.png', (12, 8), (0, 0), 3, 3),
    'vhessa': ('cavaleiros_coloridos_A.png', (12, 8), (2, 1), 3, 3),
    'oruun': ('cavaleiros_coloridos_B.png', (12, 8), (3, 1), 3, 3),
    'irael': ('cavaleiros_coloridos_A.png', (12, 8), (1, 0), 3, 3),
}
LEFT = 1  # linhas da folha: 0 baixo, 1 esquerda, 2 direita, 3 cima


def sem_fundo(im, tol=18):
    im = im.convert('RGBA')
    w, h = im.size
    for c in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        r, g, b, a = im.getpixel(c)
        if a and r > 255 - tol and g > 255 - tol and b > 255 - tol:
            ImageDraw.floodfill(im, c, (0, 0, 0, 0), thresh=tol)
    return im


for name, (sheet_name, (cols, rows), (bx, by), src_scale, scale) in SPRITES.items():
    sheet = sem_fundo(Image.open(SRC + sheet_name))
    # Volta a folha para 1 pixel por pixel antes de escalar como os outros monstros.
    sheet = sheet.resize((sheet.width // src_scale, sheet.height // src_scale), Image.NEAREST)
    fw, fh = sheet.width // cols, sheet.height // rows
    r = by * 4 + LEFT
    frames = [sheet.crop(((bx * 3 + c) * fw, r * fh, (bx * 3 + c + 1) * fw, (r + 1) * fh)) for c in range(3)]
    cycle = [frames[0], frames[1], frames[2], frames[1]]
    boxes = [f.getbbox() for f in cycle if f.getbbox()]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    for i, f in enumerate(cycle, 1):
        f = f.crop((x0, y0, x1, y1))
        f.resize((f.width * scale, f.height * scale), Image.NEAREST).save(os.path.join(OUT, f'{name}_{i}.png'))
    print('ok', name, (x1 - x0) * scale, 'x', (y1 - y0) * scale)
