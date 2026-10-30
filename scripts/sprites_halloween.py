"""Halloween 2026: monstros, mascote e ícones do evento. Só peças dos packs + recolor.
  Abóbora Assombrada (pumpkin_haunted) e Abóbora Sinistra (pumpkin_sinister, servo do Cavaleiro Sem Cabeça):
    espantalho de cabeça de abóbora (enviados_no_chat/halloween), 3x4, anda nas 4 direções.
  Morceguinho (pet_halloween_bat): bat_sheet do action_monsters, batendo as asas.
  Ícones: doce e Lanterna do Cavaleiro (hallowicons do 2017patronbundle), Poção das Bruxas (Elixir Espectral roxo).
Uso: python scripts/sprites_halloween.py
"""
import colorsys, json, os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ASSETS = os.path.join(ROOT, 'client', 'public', 'assets')
GRIM = '../grimhold/assets-pixel/personagens/'
SCARECROW = GRIM + 'enviados_no_chat/halloween/espantalho_abobora.png'
SCARECROW_HAT = GRIM + 'enviados_no_chat/halloween/espantalho_chapeu.png'
BAT = GRIM + 'action_monsters/monsters/bat/bat_sheet.png'
HICONS = GRIM + '2017patronbundle/2017/holidays/1x/hallowicons_1.png'


def recolor(im, hue, sat=1.0, val=1.0, rng=(0.0, 1.0), min_s=0.25):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if rng[0] <= h <= rng[1] and s > min_s:
                c = colorsys.hsv_to_rgb(hue, min(1, s * sat), min(1, v * val))
                px[x, y] = (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)
    return im


# Monstros: folha 3x4 (baixo, esquerda, direita, cima) de 78x108; mesmo formato dos outros monstros
# (<nome>_N lado, <nome>_down_N frente, <nome>_up_N costas; ciclo parado/passo/parado/passo).
ROWS = {'': 1, '_down': 0, '_up': 3}
scare = Image.open(SCARECROW).convert('RGBA')
MONSTERS = {
    'pumpkin_haunted': scare,
    'pumpkin_sinister': recolor(scare, 0.78, 0.8, 0.8, (0.03, 0.14), 0.4),  # abóbora roxa
    # Chefes diários do Halloween (revezam): Rei Espantalho (chapéu de bruxa) e Abóbora Gigante (verde-musgo).
    'scarecrow_king': Image.open(SCARECROW_HAT).convert('RGBA'),
    'giant_pumpkin': recolor(scare, 0.3, 0.7, 0.8, (0.03, 0.14), 0.4),
}
FW, FH = 78, 108
for name, im in MONSTERS.items():
    for suffix, row in ROWS.items():
        frames = [im.crop((c * FW, row * FH, c * FW + FW, row * FH + FH)) for c in range(3)]
        cycle = [frames[0], frames[1], frames[2], frames[1]]
        boxes = [f.getbbox() for f in cycle]
        box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        for i, f in enumerate(cycle, 1):
            f.crop(box).save(os.path.join(ASSETS, 'monsters', f'{name}{suffix}_{i}.png'))
dirs_path = os.path.join(ROOT, 'client', 'src', 'world', 'monsterDirs.json')
dirs = json.load(open(dirs_path, encoding='utf8'))
json.dump(sorted(set(dirs) | set(MONSTERS)), open(dirs_path, 'w'), indent=1)

# Mascote: folha 3x4 de quadros 32x32 (o morcego só tem frente: as 4 linhas batem as asas).
bat = Image.open(BAT).convert('RGBA')
pet = Image.new('RGBA', (32 * 3, 32 * 4))
for row in range(4):
    for col in range(3):
        pet.alpha_composite(bat.crop((col * 32, 0, col * 32 + 32, 32)), (col * 32, row * 32))
pet.save(os.path.join(ASSETS, 'pets', 'pet_halloween_bat.png'))

# Ícones 32x32.
hicons = Image.open(HICONS).convert('RGBA')
icon = lambda c, r: hicons.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).resize((32, 32), Image.NEAREST)
icon(6, 0).save(os.path.join(ASSETS, 'icons', 'halloween_candy.png'))
icon(1, 0).save(os.path.join(ASSETS, 'icons', 'knight_lantern.png'))
recolor(Image.open(os.path.join(ASSETS, 'icons', 'spectral_elixir.png')).convert('RGBA'), 0.78, 1.0, 0.9).save(os.path.join(ASSETS, 'icons', 'halloween_potion.png'))
print('ok')

# Mascotes da loja do Jack (25/10): folhas 3x4 prontas do pack (andam nas 4 direções).
GHOST = GRIM + '2017patronbundle/2017/holidays/1x/ghost1.png'
MUMMY = GRIM + '2017patronbundle/2017/1x/mummy_1.png'
Image.open(GHOST).convert('RGBA').save(os.path.join(ASSETS, 'pets', 'pet_halloween_ghost.png'))
Image.open(MUMMY).convert('RGBA').save(os.path.join(ASSETS, 'pets', 'pet_halloween_mummy.png'))
