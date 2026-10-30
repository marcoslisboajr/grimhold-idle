"""Efeitos das magias: recorta as folhas do Elemental VFX (Sang Hendrix, uso livre
em qualquer engine, inclusive comercial), reduz cada quadro e grava uma tira
horizontal por efeito em client/public/assets/vfx/, mais o vfx.json com o
tamanho do quadro e o número de quadros."""
from PIL import Image
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'vfx')
SRC = '../grimhold/assets-pixel/cursores-efeitos/elemental_vfx/Elemental VFX (v100)/FX Elements/'
os.makedirs(OUT, exist_ok=True)

# nome: (arquivo, colunas, linhas, linha usada ou None = todas, passo entre quadros, tamanho máximo do quadro)
EFFECTS = {
    'fireball': ('Fire_Ball_f15.png', 15, 4, 2, 1, 72),      # projétil apontando para a direita
    'dagger': ('Fire_Dagger_f15.png', 15, 4, 2, 1, 72),      # flecha/adaga de fogo
    'burst': ('Fire_Disc_Burst.png', 6, 5, None, 1, 120),     # explosão de fogo
    'aura': ('Fire_Disc.png', 6, 5, None, 1, 110),            # aura de fúria (buff)
    'holy': ('Angel_Fire_Column.png', 18, 3, None, 2, 150),   # coluna de luz
    'orb': ('Angel_FireBall.png', 6, 5, None, 1, 80),         # orbe sagrado
    'lightning': ('Electric_Dash_Line.png', 5, 4, None, 1, 130),
    'ice': ('Ice_Underneath.png', 10, 6, None, 2, 150),
    'impact': ('Comet_Explode.png', 8, 6, None, 2, 120),      # impacto branco (golpes físicos)
    'swords': ('Sword_Appear.png', 8, 7, None, 2, 130),
    'heal': ('Wind_Summon.png', 9, 9, None, 3, 130),          # redemoinho verde (cura)
    'shield': ('Sword_Gone.png', 6, 5, None, 1, 120),         # brilho dourado (escudo)
    'focus': ('Teleportation.png', 7, 6, None, 1, 120),       # brilho azul (foco)
}

meta = {}
for name, (file, cols, rows, row, step, size) in EFFECTS.items():
    im = Image.open(SRC + file).convert('RGBA')
    fw, fh = im.width // cols, im.height // rows
    cells = [(c, r) for r in (range(rows) if row is None else [row]) for c in range(cols)]
    frames = []
    for c, r in cells[::step]:
        f = im.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh))
        if f.getbbox():
            frames.append(f)
    k = size / max(fw, fh)
    w, h = max(1, round(fw * k)), max(1, round(fh * k))
    strip = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames):
        strip.paste(f.resize((w, h), Image.LANCZOS), (i * w, 0))
    strip.save(os.path.join(OUT, f'{name}.png'), optimize=True)
    meta[name] = {'w': w, 'h': h, 'frames': len(frames)}
json.dump(meta, open(os.path.join(OUT, 'vfx.json'), 'w'), indent=1)
print(json.dumps(meta))
