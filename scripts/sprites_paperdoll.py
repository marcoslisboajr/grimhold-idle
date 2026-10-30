# Camadas do personagem montadas com o paperdoll (TF_guest_paperdolls), reaproveitando as funções
# do gerador de skins do Grimhold (scripts/skins/teste_sprites.py e p10b.py). Só peças do pack +
# recolor; nada desenhado por código. O cliente empilha as camadas na hora (client/src/paperdoll.ts):
#   base_<g>_<pele>.png          corpo (gênero m/f, tom de pele 1-4)
#   outfit_<vocação>_<g>.png     roupa da vocação (o cliente recolore se o jogador escolher outra cor)
#   top_<vocação>_<g>.png        o que vai por cima do cabelo (capuz), só se existir
#   hair_<g>_<estilo>_<cor>.png  cabelo, nas cores do próprio pack
# Cada arquivo é uma folha 3x4 de quadros FWxFH: colunas parado/passo1/passo2; linhas baixo/esquerda/direita/cima.
# Todos com o mesmo recorte, para as camadas se alinharem e os pés ficarem no mesmo lugar.
#
# Uso: python scripts/sprites_paperdoll.py
import os, json
from PIL import Image

GRIM = '../grimhold/'
P = GRIM + 'assets-pixel/personagens/TF_guest_paperdolls/paperdolls/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'client', 'public', 'assets', 'paperdoll')

ns = {}
exec(open(GRIM + 'scripts/skins/teste_sprites.py', encoding='utf-8').read().split('ordem=')[0], ns)
peca, cabelo = ns['peca'], ns['cabelo']
p10 = {}
exec(open(GRIM + 'scripts/skins/p10b.py', encoding='utf-8').read().split('VERM=')[0], p10)
tinge = p10['tinge']

def npc(nome): return '3 NPC/' + nome
def ini(g, parte, n): return f'1 Initiate Tier/paperdolls/ar_{g}_in_{parte}_{n}.png'
T = lambda hue, sat=0.55, vm=0.9: (lambda i: tinge(i, hue, sat, vm))


def T_pena(hue, sat=0.6, vm=0.45):
    """Recolor que preserva os tons claros e sem cor (a pena branca do chapéu)."""
    import colorsys

    def fn(im):
        im = im.convert('RGBA')
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                if s < 0.25 and v > 0.6:
                    continue
                r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, max(s, 0.15) * sat * 1.6), min(1, v * vm))
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
        return im
    return fn

def dentes(fn):
    """Recolore de branco-osso as barrinhas claras da viseira (entre frestas escuras): viram os dentes do Baú Ambulante."""
    def f(im):
        im = fn(im).convert('RGBA')
        src = im.copy()
        sp, px = src.load(), im.load()
        W, H = im.size

        def lum(x, y):
            if not (0 <= x < W and 0 <= y < H):
                return 999
            r, g, b, a = sp[x, y]
            return 999 if a == 0 else (r + g + b) / 3
        for y in range(H):
            if not 26 <= y % 72 < 32:
                continue
            for x in range(W):
                v = lum(x, y)
                if 70 < v < 999 and min(lum(x - 1, y), lum(x - 2, y)) < 45 and min(lum(x + 1, y), lum(x + 2, y)) < 45:
                    px[x, y] = (236, 228, 205, 255)
        return im
    return f


WOOD = T(25, 0.55, 0.75)    # madeira do baú
IRON_D = T(210, 0.12, 0.85)  # ferragens
PINK = T(330, 0.7, 0.95)    # doce

# Roupa de cada vocação / outfit nos dois gêneros: (camadas de baixo, camadas por cima do cabelo).
OUTFIT = {
    'citizen': {g: ([npc(f'legs_casual_{g}.png'), npc(f'body_casual_{g}.png')], []) for g in 'mf'},
    'warrior': {g: ([peca(g, 'hv', 'lg', 1), peca(g, 'hv', 'bd', 1)], []) for g in 'mf'},
    'hunter': {g: ([npc(f'legs_ranger_{g}.png'), npc(f'body_ranger_{g}.png')], []) for g in 'mf'},
    'arcanist': {g: ([(peca(g, 'lt', 'lg', 4), T(225, 0.55, 0.8)), (peca(g, 'lt', 'bd', 4), T(225, 0.55, 0.8))],
                     [(peca(g, 'lt', 'hd', 4), T(225, 0.55, 0.8))]) for g in 'mf'},
    'devout': {g: ([npc(f'body_legs_dojo_{g}.png')], []) for g in 'mf'},
    'pirate': {g: ([npc(f'legs_captain_{g}.png'), npc(f'body_captain_{g}.png')], []) for g in 'mf'},
    'noble': {
        'm': ([npc('legs_merchant_m.png'), npc('body_merchant_m.png')], []),
        'f': ([npc('legs_casual_f.png'), npc('body_dress_shirt_f.png')], []),
    },
    'barbarian': {g: ([peca(g, 'md', 'lg', 3), peca(g, 'md', 'bd', 3)], []) for g in 'mf'},
    # Trajes das quests de item: armadura pesada do pack recolorida (peças + recolor, nada desenhado).
    'demon_slayer': {g: ([(peca(g, 'hv', 'lg', 6), T(355, 0.7, 0.62)), (peca(g, 'hv', 'bd', 6), T(355, 0.7, 0.62))],
                         [(peca(g, 'hv', 'hd', 6), T(355, 0.7, 0.62))]) for g in 'mf'},
    'dragon_slayer': {g: ([(peca(g, 'hv', 'lg', 1), T(130, 0.55, 0.72)), (peca(g, 'hv', 'bd', 1), T(130, 0.55, 0.72))],
                          [(peca(g, 'hv', 'hd', 1), T(130, 0.55, 0.72))]) for g in 'mf'},
    'annihilator': {g: ([(peca(g, 'hv', 'lg', 4), T(44, 0.8, 1.0)), (peca(g, 'hv', 'bd', 4), T(44, 0.8, 1.0))],
                        [(peca(g, 'hv', 'hd', 4), T(44, 0.8, 1.0))]) for g in 'mf'},
    # Trajes lendários do nível 100 (Ascensão Lendária), um por vocação: peças de pesos diferentes misturadas.
    'legend_warrior': {g: ([(ini(g, 'lg', 3), T(0, 0.0, 0.45)), (peca(g, 'hv', 'bd', 6), T(10, 0.75, 0.75))],
                           [(peca(g, 'hv', 'hd', 6), T(40, 0.6, 0.95))]) for g in 'mf'},
    'legend_hunter': {g: ([(peca(g, 'md', 'lg', 5), T(25, 0.45, 0.55)), (ini(g, 'bd', 3), T(185, 0.5, 0.65))],
                          [(peca(g, 'md', 'hd', 3), T(185, 0.45, 0.7))]) for g in 'mf'},
    'legend_arcanist': {g: ([(peca(g, 'lt', 'lg', 1), T(175, 0.55, 0.6)), (peca(g, 'lt', 'bd', 1), T(175, 0.35, 0.95))],
                            [(peca(g, 'lt', 'hd', 2), T(45, 0.7, 1.0))]) for g in 'mf'},
    'legend_devout': {g: ([(peca(g, 'hv', 'lg', 5), T(45, 0.55, 1.0)), (peca(g, 'lt', 'bd', 3), T(45, 0.12, 1.0))],
                          [(peca(g, 'lt', 'hd', 3), T(200, 0.4, 1.0))]) for g in 'mf'},
    # Andarilho (invasão de Malgoroth): sem camisa, calça azul e chapéu de pena azul-escuro.
    'wanderer': {g: ([(ini(g, 'lg', 1), T(225, 0.5, 0.55))], [(npc('head_merchant_m.png'), T_pena(230, 0.6, 0.45))]) for g in 'mf'},
    # Dia das Crianças (loja da Tia Jujuba): Caçador de Mímicos, Baú Ambulante (viseira com dentes) e Doceiro.
    'mimic_hunter': {g: ([(peca(g, 'md', 'lg', 1), IRON_D), (peca(g, 'md', 'bd', 1), WOOD)], [(peca(g, 'md', 'hd', 1), PINK)]) for g in 'mf'},
    'walking_chest': {g: ([(peca(g, 'hv', 'lg', 3), IRON_D), (peca(g, 'hv', 'bd', 2), WOOD)], [(peca(g, 'hv', 'hd', 2), dentes(WOOD))]) for g in 'mf'},
    'candy_maker': {g: ([(npc(f'legs_casual_{g}.png'), PINK), (npc(f'body_apron_{g}.png'), PINK)], [npc('head_chef_m.png')]) for g in 'mf'},
    # Loja de Votos (30 moedas cada): peças do pack recoloridas.
    'vote_herald': {g: ([(peca(g, 'hv', 'lg', 4), T(275, 0.6, 0.75)), (peca(g, 'hv', 'bd', 4), T(275, 0.6, 0.8))],
                        [(peca(g, 'hv', 'hd', 4), T(48, 0.8, 1.0))]) for g in 'mf'},
    'vote_shadow': {g: ([(peca(g, 'md', 'lg', 6), T(260, 0.25, 0.45)), (peca(g, 'md', 'bd', 6), T(260, 0.3, 0.5))],
                        [(peca(g, 'md', 'hd', 6), T(260, 0.3, 0.45))]) for g in 'mf'},
    'vote_frost': {g: ([(peca(g, 'hv', 'lg', 5), T(195, 0.45, 1.0)), (peca(g, 'hv', 'bd', 5), T(195, 0.5, 1.0))],
                       [(peca(g, 'hv', 'hd', 5), T(195, 0.5, 1.0))]) for g in 'mf'},
    'vote_ember': {g: ([(peca(g, 'lt', 'lg', 5), T(12, 0.85, 0.85)), (peca(g, 'lt', 'bd', 5), T(18, 0.85, 0.95))],
                       [(peca(g, 'lt', 'hd', 5), T(30, 0.9, 1.0))]) for g in 'mf'},
    'vote_druid': {g: ([(peca(g, 'lt', 'lg', 4), T(30, 0.45, 0.55)), (peca(g, 'lt', 'bd', 4), T(110, 0.5, 0.7))],
                       [(peca(g, 'lt', 'hd', 2), T(100, 0.5, 0.75))]) for g in 'mf'},
    # Quest O Carvalho de Ashfen: couro cor de casca e capuz de musgo.
    'oak_warden': {g: ([(peca(g, 'md', 'lg', 2), T(28, 0.5, 0.5)), (peca(g, 'md', 'bd', 2), T(32, 0.45, 0.6))],
                       [(peca(g, 'md', 'hd', 2), T(95, 0.55, 0.6))]) for g in 'mf'},
    # Quest A Inquisição do Alvorecer: placas brancas com ouro.
    'inquisitor': {g: ([(peca(g, 'hv', 'lg', 5), T(45, 0.25, 1.0)), (peca(g, 'hv', 'bd', 5), T(45, 0.35, 1.0))],
                       [(peca(g, 'hv', 'hd', 5), T(45, 0.6, 1.0))]) for g in 'mf'},
    # Quest Os Fossos de Kharvos: placas pretas com brasa.
    'pit_lord': {g: ([(peca(g, 'hv', 'lg', 6), T(5, 0.6, 0.45)), (peca(g, 'hv', 'bd', 6), T(12, 0.85, 0.6))],
                     [(peca(g, 'hv', 'hd', 6), T(18, 0.9, 0.7))]) for g in 'mf'},
    # Grão-Mestre da Guilda: avental de couro e lenço.
    'artisan': {g: ([(peca(g, 'lt', 'lg', 3), T(30, 0.35, 0.55)), (peca(g, 'md', 'bd', 3), T(28, 0.5, 0.65))],
                    [(peca(g, 'lt', 'hd', 3), T(0, 0.55, 0.7))]) for g in 'mf'},
    # Quest A Queda do Gavião: placas douradas com o elmo de juba da Guarda do Leão.
    'lion_knight': {g: ([(peca(g, 'hv', 'lg', 1), T(42, 0.6, 0.85)), (peca(g, 'hv', 'bd', 1), T(45, 0.75, 1.0))],
                        [(peca(g, 'hv', 'hd', 1), T(38, 0.8, 1.0))]) for g in 'mf'},
    # Raide I (26/10): Usurpador Ascendido, placas pesadas violeta-escuro com elmo dourado (quem limpa a raide).
    'usurper_ascended': {g: ([(peca(g, 'hv', 'lg', 3), T(272, 0.35, 0.42)), (peca(g, 'hv', 'bd', 3), T(280, 0.55, 0.55))],
                             [(peca(g, 'hv', 'hd', 3), T(44, 0.8, 1.0))]) for g in 'mf'},
    # Raide II: Almas Partidas, placas azul-violeta espectrais (quem vence a Guerra das Almas).
    'shattered_souls': {g: ([(peca(g, 'hv', 'lg', 5), T(245, 0.40, 0.85)), (peca(g, 'hv', 'bd', 5), T(250, 0.50, 0.90))],
                            [(peca(g, 'hv', 'hd', 5), T(255, 0.60, 0.95))]) for g in 'mf'},
    # Raide III: Sangue Caído, placas carmesim/vermelho-sangue escuro (quem vence Sangue Apodrecido).
    'fallen_blood': {g: ([(peca(g, 'hv', 'lg', 6), T(355, 0.75, 0.45)), (peca(g, 'hv', 'bd', 6), T(355, 0.80, 0.50))],
                         [(peca(g, 'hv', 'hd', 6), T(355, 0.85, 0.60))]) for g in 'mf'},
    # Halloween 2026 (loja do Jack, com doces). Conferidos para não repetir traje nem equipamento.
    'witch': {g: ([(peca(g, 'lt', 'lg', 2), T(270, 0.3, 0.35)), (peca(g, 'lt', 'bd', 2), T(285, 0.6, 0.55))],
                  [(npc('head_tophat.png'), T(280, 0.5, 0.45))]) for g in 'mf'},
    'vampire': {g: ([(npc('legs_merchant_m.png' if g == 'm' else 'legs_casual_f.png'), T(0, 0.1, 0.22)), (npc(f'body_dress_shirt_{g}.png'), T(0, 0.0, 0.95)),
                     (peca(g, 'lt', 'bd', 6), T(270, 0.15, 0.3))], []) for g in 'mf'},
    'plague_doctor': {g: ([(peca(g, 'lt', 'lg', 6), T(0, 0.0, 0.3)), (npc(f'body_doctor_{g}.png'), T(30, 0.2, 0.3))],
                          [(peca(g, 'lt', 'hd', 6), T(35, 0.25, 0.75))]) for g in 'mf'},
}
# Estilos de cabelo oferecidos (números do pack) e as cores do pack.
HAIR = {'m': [1, 2, 3, 5, 6, 8, 9, 12], 'f': [1, 2, 5, 9, 10, 13, 14, 16]}
COLORS = ['brown', 'blonde', 'black', 'white', 'red', 'blue', 'green', 'pink']

# Peças de equipamento visíveis (heavy, medium, light do pack Time Fantasy)
# Ferro e aço: as peças cinza (3) e branca (5) do pack, recoloridas para metal sem os detalhes roxo/rosa.
IRON = T(215, 0.1, 0.9)
STEEL = T(210, 0.06, 1.0)
EQUIP_MAP = {}
for tier, num, tint in [('bronze', 2, None), ('iron', 3, IRON), ('steel', 5, STEEL), ('mithril', 1, None), ('adamant', 4, None), ('abyssal', 6, None)]:
    for part, code in [('helmet', 'hd'), ('armor', 'bd'), ('legs', 'lg')]:
        EQUIP_MAP[f'{tier}_{part}'] = (lambda g, code=code, num=num, tint=tint: (peca(g, 'hv', code, num), tint) if tint else peca(g, 'hv', code, num))
EQUIP_MAP.update({
    'leather_cap':   lambda g: peca(g, 'md', 'hd', 1),
    'leather_armor': lambda g: peca(g, 'md', 'bd', 1),
    'leather_legs':  lambda g: peca(g, 'md', 'lg', 1),
    'general_helm':  lambda g: (peca(g, 'hv', 'hd', 3), T(35, 0.25, 0.85)),
    'cerberus_mail': lambda g: (peca(g, 'hv', 'bd', 6), T(5, 0.6, 0.7)),
    'kraken_crown':  lambda g: peca(g, 'lt', 'hd', 2),
    'wolf_mask':     lambda g: (peca(g, 'md', 'hd', 4), T(30, 0.08, 0.8)),
    'vampire_cloak': lambda g: (peca(g, 'lt', 'bd', 6), T(355, 0.6, 0.7)),
})
# Couro (caçador) e mantos (arcanista/devoto): peças média e leve do pack.
for tier, kind, num, tint in [
    ('wolf_leather', 'md', 4, None), ('lizard_leather', 'md', 2, None), ('horn_leather', 'md', 3, None),
    ('shadow_leather', 'md', 6, None), ('dragon_leather', 'md', 5, T(0, 0.7, 0.8)),
    ('linen_robe', 'lt', 1, None), ('silk_robe', 'lt', 2, None), ('shaman_robe', 'lt', 4, None),
    ('golden_robe', 'lt', 3, None), ('abyss_robe', 'lt', 6, None), ('dragon_robe', 'lt', 5, T(0, 0.7, 0.8)),
]:
    for part, code in [('helmet', 'hd'), ('armor', 'bd'), ('legs', 'lg')]:
        EQUIP_MAP[f'{tier}_{part}'] = (lambda g, kind=kind, code=code, num=num, tint=tint: (peca(g, kind, code, num), tint) if tint else peca(g, kind, code, num))

ADDON_MAP = {
    'strawhat': lambda g: npc('head_strawhat.png'),
    'glasses': lambda g: npc('head_glasses.png'),
    'tophat': lambda g: npc('head_tophat.png'),
    'captain_hat': lambda g: npc(f'head_captain_{g}.png'),
    'ranger_hat': lambda g: npc(f'head_ranger_{g}.png'),
    'sash': lambda g: npc(f'body_security_sash_{g}.png'),
}

ROWS = 4  # baixo, esquerda, direita, cima
COLS = [0, 1, 3]  # parado, passo1, passo2 (colunas da folha 4x4 do pack)

def folha(camadas):
    """Folha 3x4 nativa (26x36 por quadro) com as camadas empilhadas."""
    out = Image.new('RGBA', (26 * 3, 36 * ROWS))
    for l in range(ROWS):
        for i, c in enumerate(COLS):
            box = (c * 52, l * 72, c * 52 + 52, l * 72 + 72)
            im = Image.new('RGBA', (52, 72))
            for cam in camadas:
                f, fn = cam if isinstance(cam, tuple) else (cam, None)
                p = Image.open(P + f).convert('RGBA').crop(box)
                im.alpha_composite(fn(p) if fn else p)
            out.alpha_composite(im.resize((26, 36), Image.NEAREST), (i * 26, l * 36))   # o pack vem em 2x
    return out

sheets = {}
for g in 'mf':
    for s in range(1, 5): sheets[f'base_{g}_{s}'] = folha([f'_Bases/base_human_{g}_{s}.png'])
    for n in HAIR[g]:
        for cor in COLORS: sheets[f'hair_{g}_{n}_{cor}'] = folha([cabelo(g, n, cor)])
    for voc, por in OUTFIT.items():
        low, top = por[g]
        sheets[f'outfit_{voc}_{g}'] = folha(low)
        if top: sheets[f'top_{voc}_{g}'] = folha(top)
    for eq_name, eq_fn in EQUIP_MAP.items():
        sheets[f'equip_{eq_name}_{g}'] = folha([eq_fn(g)])
    for ad_name, ad_fn in ADDON_MAP.items():
        sheets[f'addon_{ad_name}_{g}'] = folha([ad_fn(g)])

# Recorte comum a todos: a união dos contornos de cada quadro.
x0, y0, x1, y1 = 26, 36, 0, 0
for im in sheets.values():
    for l in range(ROWS):
        for i in range(3):
            b = im.crop((i * 26, l * 36, i * 26 + 26, l * 36 + 36)).getbbox()
            if b: x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
FW, FH = x1 - x0, y1 - y0

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.png'): os.remove(os.path.join(OUT, f))
for name, im in sheets.items():
    out = Image.new('RGBA', (FW * 3, FH * ROWS))
    for l in range(ROWS):
        for i in range(3):
            out.alpha_composite(im.crop((i * 26 + x0, l * 36 + y0, i * 26 + x1, l * 36 + y1)), (i * FW, l * FH))
    out.save(os.path.join(OUT, name + '.png'))

def elmo_fechado(top_name):
    """O top cobre a cabeça inteira (elmo fechado)? Aí o cabelo não aparece (o comprido vazava pelos lados)."""
    g = top_name[-1]
    corpo = sheets[f'base_{g}_1'].crop((x0, y0, x0 + FW, y0 + FH))
    top = sheets['top_' + top_name].crop((x0, y0, x0 + FW, y0 + FH))
    bb = corpo.getbbox()
    lim = bb[1] + int((bb[3] - bb[1]) * 0.4)
    cabeca = [(x, y) for x in range(FW) for y in range(bb[1], lim) if corpo.getpixel((x, y))[3] > 0]
    return sum(top.getpixel(p)[3] > 0 for p in cabeca) / len(cabeca) >= 0.95

# O cliente lê o tamanho do quadro e as opções daqui.
meta = {
    'frame': [FW, FH],
    'hair': HAIR,
    'colors': COLORS,
    'tops': sorted(k[4:] for k in sheets if k.startswith('top_')),
    'helms': sorted(k[4:] for k in sheets if k.startswith('top_') and elmo_fechado(k[4:])),
    'equips': sorted(EQUIP_MAP.keys()),
    'addons': sorted(ADDON_MAP.keys()),
}
open(os.path.join(ROOT, 'client', 'src', 'paperdoll.json'), 'w', encoding='utf-8').write(json.dumps(meta) + '\n')
print(len(sheets), 'folhas, quadro', FW, 'x', FH)
