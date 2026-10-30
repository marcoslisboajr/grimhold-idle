# Chefes globais oldschool (Ferathos, Ghazrael, Viúva Ancestral): sprites, ícones e itens lendários.
# Só recolor de sprites e ícones do pack que já estão no jogo; nada desenhado.
# Uso: python scripts/bosses_oldschool.py  (pode rodar de novo: só acrescenta o que falta)
import colorsys, io, json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MON = os.path.join(ROOT, 'client', 'public', 'assets', 'monsters')
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
ITEMS = os.path.join(ROOT, 'shared', 'data', 'items.json')
I18N = os.path.join(ROOT, 'client', 'src', 'items_i18n.json')


def tint(im, hue, sat, vm):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, max(s, 0.15) * sat * 1.6), min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


# id do chefe, sprite base, cor (matiz, saturação, brilho), elemento das armas, nomes PT/EN das peças
BOSSES = [
    ('ferathos', 'cultista_vermelho', (275, 0.6, 0.8), 'energy', {
        'helm': ('Capuz de Ferathos', "Ferathos' Hood"), 'armor': ('Manto do Arquimago Imortal', 'Robe of the Undying Archmage'),
        'legs': ('Calças Arcanas de Ferathos', "Ferathos' Arcane Legs"), 'boots': ('Botas do Teleporte', 'Boots of the Blink'),
        'pouch': ('Bolsa de Armas de Ferathos', "Ferathos' Weapon Pouch"),
        'blade': ('Lâmina Arcana', 'Arcane Blade'), 'bow': ('Arco do Vórtice', 'Vortex Bow'),
        'staff': ('Cajado de Ferathos', "Ferathos' Staff"), 'mace': ('Cetro do Arquimago', "Archmage's Scepter")}),
    ('ghazrael', 'ghazbaran', (355, 0.7, 0.7), 'fire', {
        'helm': ('Chifres de Ghazrael', "Ghazrael's Horns"), 'armor': ('Couraça dos Mil Demônios', 'Cuirass of a Thousand Demons'),
        'legs': ('Grevas de Ghazrael', "Ghazrael's Greaves"), 'boots': ('Cascos Infernais', 'Infernal Hooves'),
        'pouch': ('Bolsa de Armas de Ghazrael', "Ghazrael's Weapon Pouch"),
        'blade': ('Machado de Ghazrael', "Ghazrael's Axe"), 'bow': ('Besta da Legião', 'Legion Crossbow'),
        'staff': ('Cajado do Portão Infernal', 'Hellgate Staff'), 'mace': ('Martelo da Legião', 'Legion Hammer')}),
    ('old_widow', 'aranha', (0, 0.55, 0.4), 'earth', {
        'helm': ('Máscara da Viúva', "Widow's Mask"), 'armor': ('Couraça de Quitina', 'Chitin Cuirass'),
        'legs': ('Perneiras de Seda Negra', 'Black Silk Legs'), 'boots': ('Passos da Teia', 'Webwalker Boots'),
        'pouch': ('Bolsa de Armas da Viúva', "Widow's Weapon Pouch"),
        'blade': ('Presa da Viúva', "Widow's Fang"), 'bow': ('Arco de Teia', 'Web Bow'),
        'staff': ('Cajado do Veneno', 'Venom Staff'), 'mace': ('Maça Peçonhenta', 'Venomous Mace')}),
]

# Sprites pintados por parte (pele, barba, chifres, dourado, roupa) em vez de um tom só, que deixava
# tudo da mesma cor e desbotado. Ghazrael: versão "Abissal" (pele roxa, barba de fogo, chifres de osso).
# Cada parte: (matiz, saturação, multiplicador de brilho).
PAINT = {
    'ghazrael': {'skin': (282, 0.55, 0.95), 'beard': (8, 1.0, 1.9), 'gold': (45, 0.85, 1.35), 'horn': (40, 0.18, 1.3), 'dark': (280, 0.4, 0.7)},
}


def part_of(r, g, b):
    """Parte do sprite pela cor original (feito para o ghazbaran: pele azul-clara, barba vermelha, detalhe dourado)."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    h *= 360
    if v < 0.13:
        return 'outline'
    if 163 <= h <= 212 and s >= 0.2:
        return 'skin'
    if 125 <= h < 163 or s < 0.2:
        return 'horn'
    if (h >= 345 or h <= 15) and s > 0.8:
        return 'beard'
    if 18 <= h <= 40 and s >= 0.45 and v >= 0.45:
        return 'gold'
    return 'dark'


def paint(im, palette):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            part = part_of(r, g, b) if a else 'outline'
            if part == 'outline':
                continue
            hue, sat, vm = palette[part]
            _, _, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, sat, min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


# Chefes com sprite próprio (não sai mais do recolor): o Ghazrael é o demônio de asas e capa do pack
# (assets-pixel/personagens/enviados_no_chat/demonio_asas_capa_ghazrael.png), quadros de frente.
OWN_SPRITE = {'ghazrael'}

# Cor dos ícones quando a do sprite confundiria com outro set (a Viúva é preta e vermelha como o Ghazrael).
ICON_COLOR = {'old_widow': (115, 0.55, 0.75)}

# Ícone base de cada peça (do set do Senhor do Abismo e das armas do Malgoroth).
BASE_ICON = {'helm': 'abyss_horns', 'armor': 'abyss_dread_armor', 'legs': 'abyss_dread_legs', 'boots': 'abyss_dread_boots',
             'pouch': 'abyss_weapon_pouch', 'blade': 'demon_dread_blade', 'bow': 'demon_hell_crossbow',
             'staff': 'demon_void_staff', 'mace': 'demon_smite_mace'}


def stats(part, element):
    """Nível 50: um degrau acima dos sets dos chefes antigos (40) e abaixo do Malgoroth (60)."""
    return {
        'helm': {'slot': 'helmet', 'level': 50, 'defense': 18, 'hp': 95, 'attack': 4},
        'armor': {'slot': 'armor', 'level': 50, 'defense': 31, 'hp': 150},
        'legs': {'slot': 'legs', 'level': 50, 'defense': 22, 'hp': 110, 'attack': 2},
        'boots': {'slot': 'boots', 'level': 50, 'defense': 12, 'hp': 80, 'attack': 3},
        'blade': {'slot': 'weapon', 'level': 50, 'vocations': ['warrior'], 'attack': 33, 'element': element, 'elementAttack': 8, 'hp': 60, 'crit': 0.06},
        'bow': {'slot': 'weapon', 'level': 50, 'vocations': ['hunter'], 'attack': 33, 'element': element, 'elementAttack': 8, 'crit': 0.1},
        'staff': {'slot': 'weapon', 'level': 50, 'vocations': ['arcanist'], 'attack': 32, 'element': element, 'elementAttack': 8, 'mana': 0.27, 'crit': 0.08},
        'mace': {'slot': 'weapon', 'level': 50, 'vocations': ['devout'], 'attack': 32, 'element': element, 'elementAttack': 8, 'defense': 5, 'hp': 65},
    }[part]


items = json.loads(io.open(ITEMS, encoding='utf-8').read())
have = {i['id'] for i in items}
i18n_raw = io.open(I18N, encoding='utf-8').read()
i18n = json.loads(i18n_raw)

for boss, sprite, color, element, names in BOSSES:
    hue, sat, vm = color
    for n in range(1, 5):
        if boss in OWN_SPRITE:
            break
        src = Image.open(os.path.join(MON, f'{sprite}_{n}.png'))
        (paint(src, PAINT[boss]) if boss in PAINT else tint(src, hue, sat, vm)).save(os.path.join(MON, f'{boss}_{n}.png'))
    for part, (pt, en) in names.items():
        iid = f'{boss}_{part}'
        ih, isat, ivm = ICON_COLOR.get(boss, (hue, sat, min(1.1, vm + 0.2)))
        tint(Image.open(os.path.join(ICO, BASE_ICON[part] + '.png')), ih, isat, ivm).save(os.path.join(ICO, iid + '.png'))
        i18n[pt] = en
        if iid in have:
            continue
        if part == 'pouch':
            items.append({'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'pouch': True, 'value': 5500,
                          'pool': [f'{boss}_blade', f'{boss}_bow', f'{boss}_staff', f'{boss}_mace']})
        else:
            items.append({'id': iid, 'name': pt, 'icon': iid, 'legendary': True, 'value': 4500, 'equip': stats(part, element)})
    print('ok', boss)

io.open(ITEMS, 'w', encoding='utf-8').write(json.dumps(items, ensure_ascii=False, indent=2) + '\n')
io.open(I18N, 'w', encoding='utf-8').write(json.dumps(i18n, ensure_ascii=False, indent=2 if i18n_raw.startswith('{\n  ') else None) + ('\n' if i18n_raw.endswith('\n') else ''))
