"""Caçadas 130-200 (XP, loot e chefes a cada 20 níveis) e quatro caçadas novas de nível baixo (3, 10, 18, 26).

Monstros reaproveitam sprites que já existem (como no Tibia, nome e números novos).
Curva a partir do nível 120 (média das caçadas de XP: vida 3033, ataque 242, defesa 96):
a cada 10 níveis +480 de vida, +25 de ataque, +12 de defesa e XP x XP_STEP. A XP necessária
por nível quase triplica a cada 10 níveis; com XP_STEP 2.2 o tempo por nível sobe ~30% por faixa.
Ícones: recortes do Time Fantasy Icons (com recolor), como nos geradores anteriores. Idempotente.
"""
import json, os, colorsys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'
SHEET_PATH = '../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png'

XP_STEP = 2.2

sheet = Image.open(SHEET_PATH).convert('RGBA')
def cell(c, r):
    return sheet.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32))

def recolor(im, hue=None, sat=None, light=0.0):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if hue is not None: h = hue
            if sat is not None:
                s = min(1, s * sat)
                if hue is not None and s < 0.25: s = 0.25 + s
            l = max(0, min(1, l + light))
            r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

def load_json(path):
    return json.load(open(path, encoding='utf8'))
def save_json(path, data):
    with open(path, 'w', encoding='utf8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write('\n')

RED, ORANGE, GOLD, GREEN, CYAN, ICE, BLUE, PURPLE, PINK = 0.0, 0.06, 0.12, 0.36, 0.5, 0.55, 0.6, 0.78, 0.9
ICON = {  # base de cada tipo de ícone
    'mat_rock': cell(9, 60), 'mat_dust': cell(12, 56), 'mat_feather': cell(1, 55), 'mat_crest': cell(14, 49),
    'mat_iron': cell(2, 60), 'mat_crystal': cell(5, 56), 'mat_scale': cell(2, 55), 'mat_head': cell(2, 58),
    'mat_claw': cell(10, 55), 'mat_eye': cell(15, 55), 'mat_bone': cell(0, 55), 'mat_core': cell(1, 57),
    'mat_cloth': cell(4, 56), 'mat_halo': cell(11, 49),
    'hammer': cell(8, 28), 'bow': cell(9, 33), 'halberd': cell(3, 29), 'blade': cell(14, 27), 'staff': cell(15, 31),
    'shield': cell(11, 37), 'boots': cell(0, 47), 'helmet': cell(10, 45), 'shield2': cell(13, 37), 'axe': cell(5, 28),
    'armor': cell(0, 43), 'legs': cell(3, 42), 'key': cell(0, 52),
}

def lv_scale(L):
    k = (L - 120) / 10
    return {'hp': 3033 + 480 * k, 'attack': 242 + 25 * k, 'defense': 96 + 12 * k, 'xp': 40800 * XP_STEP ** k}

# ── Faixas 130-200 ────────────────────────────────────────────────────────────
# Cada monstro: (id, nome PT, nome EN, sprite, hpMult, atkMult, defMult, spd, papel, weak, resist)
# papel: 'xp' (XP cheia), 'loot' (XP x0,8, mais ouro) ou 'boss'.
TIERS = [
    dict(L=130, region=('Ermos de Cinzas', 'Ashen Wastes'), theme='volcano', hue=ORANGE,
         mats=[('ash_ember', 'Brasa Eterna', 'Eternal Ember', 'mat_core'), ('molten_heart', 'Coração de Magma', 'Molten Heart', 'mat_rock')],
         xp=('ashen_wastes', 'Ermos de Cinzas', 'Ashen Wastes', 'gallery'),
         loot=('damned_forge', 'Forja dos Condenados', 'Forge of the Damned', 'maze'),
         monsters=[
             ('ash_titan', 'Titã de Cinzas', 'Ash Titan', 'golem', 1.08, 0.98, 1.06, 1400, 'xp', ['water'], ['fire']),
             ('magma_wyrm', 'Serpe de Magma', 'Magma Wyrm', 'fire_dragon', 1.0, 1.03, 1.0, 1250, 'xp', ['water'], ['fire']),
             ('cinder_fiend', 'Demônio das Brasas', 'Cinder Fiend', 'fire_devil', 0.94, 1.02, 0.96, 1150, 'xp', ['water', 'holy'], ['fire']),
             ('damned_smith', 'Ferreiro Condenado', 'Damned Smith', 'cultista_vermelho', 1.02, 0.97, 1.0, 1250, 'loot', ['holy'], ['fire']),
             ('lava_hound', 'Cão de Lava', 'Lava Hound', 'cerbero', 0.98, 1.0, 0.98, 1100, 'loot', ['water'], ['fire']),
         ],
         xp_mons=['ash_titan', 'magma_wyrm', 'cinder_fiend'], loot_mons=['damned_smith', 'lava_hound', 'cinder_fiend'],
         drops=[
             ('cinder_hammer', 'Martelo das Cinzas', 'Cinder Hammer', 'hammer', {'slot': 'weapon', 'vocations': ['warrior', 'devout'], 'attack': 61, 'crit': 0.06}, 'damned_smith'),
             ('ember_bow', 'Arco das Brasas', 'Ember Bow', 'bow', {'slot': 'weapon', 'vocations': ['hunter'], 'attack': 62, 'speed': 0.12}, 'magma_wyrm'),
         ]),
    dict(L=140, region=('Profundezas Cristalinas', 'Crystal Depths'), theme='cave', hue=CYAN,
         mats=[('black_diamond', 'Diamante Negro', 'Black Diamond', 'mat_crystal'), ('crystal_heart', 'Coração de Cristal', 'Crystal Heart', 'mat_core')],
         xp=('crystal_caverns', 'Cavernas de Cristal', 'Crystal Caverns', 'ring'),
         loot=('black_diamond_mines', 'Minas de Diamante Negro', 'Black Diamond Mines', 'gallery'),
         boss=('crystal_throne', 'Trono Cristalino', 'Crystal Throne', 'crystal_key', 'Chave Cristalina', 'Crystal Key'),
         monsters=[
             ('crystal_colossus', 'Colosso de Cristal', 'Crystal Colossus', 'stone_guardian', 1.1, 0.96, 1.1, 1450, 'xp', ['fire'], ['energy', 'physical']),
             ('deep_watcher', 'Olho das Profundezas', 'Deep Watcher', 'beholder', 0.95, 1.04, 0.95, 1200, 'xp', ['holy'], ['energy']),
             ('cave_wyvern', 'Serpe das Grutas', 'Cave Wyvern', 'wyvern', 0.97, 1.02, 0.98, 1150, 'xp', ['earth'], ['energy']),
             ('abyssal_miner', 'Mineiro Abissal', 'Abyssal Miner', 'deepling_warrior', 1.0, 0.98, 1.02, 1250, 'loot', ['energy'], ['water']),
             ('cyclops_tyrant', 'Ciclope Tirano', 'Cyclops Tyrant', 'cyclops', 1.05, 1.0, 1.0, 1350, 'loot', ['energy'], ['earth']),
             ('gorvath', 'Gorvath, o Rei Cristal', 'Gorvath, the Crystal King', 'minotaur_king', 1.7, 1.04, 1.08, 1200, 'boss', ['fire'], ['energy']),
         ],
         xp_mons=['crystal_colossus', 'deep_watcher', 'cave_wyvern'], loot_mons=['abyssal_miner', 'cyclops_tyrant', 'crystal_colossus'], boss_mons=['crystal_colossus', 'gorvath'],
         drops=[
             ('crystal_staff', 'Cajado de Cristal', 'Crystal Staff', 'staff', {'slot': 'weapon', 'vocations': ['arcanist'], 'attack': 64, 'mana': 0.35}, 'deep_watcher'),
             ('diamond_shield', 'Escudo de Diamante', 'Diamond Shield', 'shield2', {'slot': 'shield', 'defense': 36, 'hp': 140}, 'cyclops_tyrant'),
             ('crystal_king_mail', 'Cota do Rei Cristal', 'Crystal King Mail', 'armor', {'slot': 'armor', 'defense': 36, 'hp': 200, 'regen': 0.15}, 'gorvath'),
         ]),
    dict(L=150, region=('Confins Gelados', 'Frozen Reaches'), theme='ice', hue=ICE,
         mats=[('eternal_ice', 'Gelo Eterno', 'Eternal Ice', 'mat_crystal'), ('cracked_phylactery', 'Filactério Rachado', 'Cracked Phylactery', 'mat_eye')],
         xp=('forgotten_tundra', 'Tundra dos Esquecidos', 'Tundra of the Forgotten', 'ring'),
         loot=('frozen_fortress', 'Fortaleza Congelada', 'Frozen Fortress', 'hub'),
         monsters=[
             ('frost_giant', 'Gigante do Gelo', 'Frost Giant', 'ogre', 1.12, 1.0, 1.04, 1450, 'xp', ['fire'], ['water']),
             ('glacial_lich', 'Lich Glacial', 'Glacial Lich', 'lich5', 0.92, 1.06, 0.96, 1200, 'xp', ['fire', 'holy'], ['water', 'death']),
             ('boreal_wyrm', 'Wyrm Boreal', 'Boreal Wyrm', 'frost_dragon', 1.02, 1.02, 1.0, 1300, 'xp', ['fire'], ['water']),
             ('frozen_knight', 'Cavaleiro Congelado', 'Frozen Knight', 'cavaleiro_caido', 1.0, 0.98, 1.06, 1300, 'loot', ['fire'], ['water']),
             ('frost_matriarch', 'Matriarca do Gelo', 'Frost Matriarch', 'ice_witch', 0.96, 1.04, 0.96, 1200, 'loot', ['fire'], ['water']),
         ],
         xp_mons=['frost_giant', 'glacial_lich', 'boreal_wyrm'], loot_mons=['frozen_knight', 'frost_matriarch', 'frost_giant'],
         drops=[
             ('boreal_bow', 'Arco Boreal', 'Boreal Bow', 'bow', {'slot': 'weapon', 'vocations': ['hunter'], 'attack': 67, 'crit': 0.08}, 'boreal_wyrm'),
             ('frost_plate', 'Placa do Gelo Eterno', 'Eternal Frost Plate', 'armor', {'slot': 'armor', 'vocations': ['warrior', 'devout'], 'defense': 38, 'hp': 190}, 'frozen_knight'),
         ]),
    dict(L=160, region=('Vale dos Reis Mortos', 'Valley of Dead Kings'), theme='crypt', hue=GOLD,
         mats=[('royal_bandage', 'Bandagem Real', 'Royal Bandage', 'mat_cloth'), ('soul_gem', 'Gema de Alma', 'Soul Gem', 'mat_crystal')],
         xp=('kings_necropolis', 'Necrópole dos Reis', 'Necropolis of Kings', 'gallery'),
         loot=('pharaoh_crypt', 'Cripta dos Faraós', 'Crypt of the Pharaohs', 'maze'),
         boss=('eternal_tomb', 'Tumba do Rei Eterno', 'Tomb of the Eternal King', 'necro_key', 'Chave da Necrópole', 'Necropolis Key'),
         monsters=[
             ('elder_vampire', 'Lorde Vampiro Ancião', 'Elder Vampire Lord', 'vampire', 0.96, 1.05, 0.98, 1150, 'xp', ['holy', 'fire'], ['death']),
             ('bone_colossus', 'Colosso de Ossos', 'Bone Colossus', 'bonelord', 1.1, 0.98, 1.06, 1400, 'xp', ['holy'], ['death']),
             ('soul_reaper', 'Ceifador de Almas', 'Soul Reaper', 'grim_reaper', 1.0, 1.04, 1.0, 1250, 'xp', ['holy'], ['death']),
             ('risen_pharaoh', 'Faraó Ressurreto', 'Risen Pharaoh', 'mumia', 1.04, 0.98, 1.04, 1300, 'loot', ['fire', 'holy'], ['death']),
             ('banshee_queen', 'Rainha Banshee', 'Banshee Queen', 'banshee', 0.94, 1.04, 0.94, 1150, 'loot', ['holy'], ['death', 'physical']),
             ('nekhart', 'Nekhart, o Rei Eterno', 'Nekhart, the Eternal King', 'wight', 1.7, 1.04, 1.08, 1200, 'boss', ['holy'], ['death']),
         ],
         xp_mons=['elder_vampire', 'bone_colossus', 'soul_reaper'], loot_mons=['risen_pharaoh', 'banshee_queen', 'soul_reaper'], boss_mons=['risen_pharaoh', 'nekhart'],
         drops=[
             ('soul_scythe', 'Foice das Almas', 'Soul Scythe', 'axe', {'slot': 'weapon', 'vocations': ['warrior'], 'attack': 71, 'lifesteal': 0.07}, 'soul_reaper'),
             ('pharaoh_staff', 'Cetro do Faraó', 'Pharaoh Scepter', 'staff', {'slot': 'weapon', 'vocations': ['arcanist', 'devout'], 'attack': 69, 'mana': 0.4}, 'risen_pharaoh'),
             ('eternal_king_crown', 'Coroa do Rei Eterno', 'Eternal King Crown', 'helmet', {'slot': 'helmet', 'defense': 28, 'hp': 220, 'mana': 0.3, 'regen': 0.2}, 'nekhart'),
         ]),
    dict(L=170, region=('Círculos Infernais', 'Infernal Circles'), theme='hell', hue=RED,
         mats=[('hellstone', 'Pedra Infernal', 'Hellstone', 'mat_rock'), ('demon_heart', 'Coração Demoníaco', 'Demon Heart', 'mat_core')],
         xp=('hell_furnace', 'Fornalha do Inferno', 'Hell Furnace', 'ring'),
         loot=('soul_market', 'Mercado das Almas', 'Soul Market', 'maze'),
         monsters=[
             ('archdemon', 'Arquidemônio', 'Archdemon', 'demon', 1.06, 1.04, 1.02, 1250, 'xp', ['holy', 'water'], ['fire']),
             ('hellfire_lord', 'Senhor do Fogo Infernal', 'Hellfire Lord', 'lord_demon', 1.02, 1.04, 1.02, 1250, 'xp', ['holy', 'water'], ['fire']),
             ('pit_fiend', 'Demônio do Fosso', 'Pit Fiend', 'demon_skeleton', 0.96, 1.0, 0.98, 1150, 'xp', ['holy'], ['fire', 'death']),
             ('soul_merchant', 'Mercador de Almas', 'Soul Merchant', 'dhampir', 0.98, 0.98, 0.98, 1200, 'loot', ['holy'], ['death']),
             ('alpha_hellhound', 'Cão Infernal Alfa', 'Alpha Hellhound', 'cerbero', 1.02, 1.02, 1.0, 1100, 'loot', ['water'], ['fire']),
         ],
         xp_mons=['archdemon', 'hellfire_lord', 'pit_fiend'], loot_mons=['soul_merchant', 'alpha_hellhound', 'pit_fiend'],
         drops=[
             ('hellfire_bow', 'Arco do Fogo Infernal', 'Hellfire Bow', 'bow', {'slot': 'weapon', 'vocations': ['hunter'], 'attack': 76, 'crit': 0.08, 'speed': 0.08}, 'hellfire_lord'),
             ('demonplate_legs', 'Grevas Demoníacas', 'Demonplate Greaves', 'legs', {'slot': 'legs', 'vocations': ['warrior', 'devout'], 'defense': 30, 'hp': 170}, 'archdemon'),
         ]),
    dict(L=180, region=('Plano Astral', 'Astral Plane'), theme='void', hue=PURPLE,
         mats=[('stardust', 'Pó Estelar', 'Stardust', 'mat_dust'), ('astral_tome', 'Tomo Astral', 'Astral Tome', 'mat_cloth')],
         xp=('astral_rift', 'Fenda Astral', 'Astral Rift', 'hub'),
         loot=('forgotten_library', 'Biblioteca Esquecida', 'Forgotten Library', 'gallery'),
         boss=('fallen_star_sanctum', 'Santuário da Estrela Caída', 'Sanctum of the Fallen Star', 'astral_key', 'Chave Astral', 'Astral Key'),
         monsters=[
             ('astral_watcher', 'Vigia Astral', 'Astral Watcher', 'demon_eyes', 0.96, 1.05, 0.96, 1150, 'xp', ['holy'], ['energy']),
             ('star_eater', 'Devorador de Estrelas', 'Star Eater', 'nightmare', 1.04, 1.02, 1.0, 1250, 'xp', ['holy'], ['death']),
             ('void_titan', 'Titã do Vazio', 'Void Titan', 'void_herald', 1.1, 1.0, 1.06, 1350, 'xp', ['holy'], ['death', 'energy']),
             ('mind_lord', 'Senhor das Mentes', 'Mind Lord', 'mind_flayer', 0.96, 1.04, 0.96, 1200, 'loot', ['holy'], ['energy']),
             ('shadow_scribe', 'Escriba Sombrio', 'Shadow Scribe', 'wraith', 0.94, 1.0, 0.94, 1150, 'loot', ['holy'], ['death', 'physical']),
             ('aelthra', 'Aelthra, a Estrela Caída', 'Aelthra, the Fallen Star', 'anjo_sombrio', 1.5, 1.0, 1.0, 1150, 'boss', ['death'], ['holy']),
         ],
         xp_mons=['astral_watcher', 'star_eater', 'void_titan'], loot_mons=['mind_lord', 'shadow_scribe', 'star_eater'], boss_mons=['mind_lord', 'aelthra'],
         drops=[
             ('astral_staff', 'Cajado Astral', 'Astral Staff', 'staff', {'slot': 'weapon', 'vocations': ['arcanist'], 'attack': 79, 'mana': 0.45}, 'mind_lord'),
             ('astral_helm', 'Elmo Astral', 'Astral Helm', 'helmet', {'slot': 'helmet', 'defense': 30, 'hp': 200, 'crit': 0.05}, 'void_titan'),
             ('starfall_boots', 'Botas da Estrela Caída', 'Starfall Boots', 'boots', {'slot': 'boots', 'defense': 12, 'hp': 150, 'regen': 0.3, 'speed': 0.08}, 'aelthra'),
         ]),
    dict(L=190, region=('Picos do Dragão Primordial', 'Primordial Dragon Peaks'), theme='volcano', hue=GOLD,
         mats=[('primordial_scale', 'Escama Primordial', 'Primordial Scale', 'mat_scale'), ('dragon_gold', 'Ouro Dracônico', 'Draconic Gold', 'mat_halo')],
         xp=('primordial_nest', 'Ninho dos Primordiais', 'Primordial Nest', 'hub'),
         loot=('dragon_hoard', 'Tesouro do Dragão', 'Dragon Hoard', 'gallery'),
         monsters=[
             ('primordial_dragon', 'Dragão Primordial', 'Primordial Dragon', 'dragon_lord', 1.12, 1.04, 1.06, 1350, 'xp', ['water'], ['fire']),
             ('elder_wyrm', 'Wyrm Ancião', 'Elder Wyrm', 'dragon', 1.04, 1.02, 1.02, 1300, 'xp', ['water', 'energy'], ['fire']),
             ('draconic_priest', 'Sacerdote Dracônico', 'Draconic Priest', 'cultista_vermelho', 0.92, 1.06, 0.94, 1150, 'xp', ['holy'], ['fire']),
             ('hoard_hydra', 'Hidra Guardiã', 'Hoard Hydra', 'hydra', 1.06, 1.0, 1.02, 1300, 'loot', ['energy'], ['water']),
             ('golden_wyvern', 'Serpe Dourada', 'Golden Wyvern', 'wyvern', 0.96, 1.02, 0.98, 1150, 'loot', ['earth'], ['energy']),
         ],
         xp_mons=['primordial_dragon', 'elder_wyrm', 'draconic_priest'], loot_mons=['hoard_hydra', 'golden_wyvern', 'elder_wyrm'],
         drops=[
             ('dragonbone_axe', 'Machado de Osso de Dragão', 'Dragonbone Axe', 'axe', {'slot': 'weapon', 'vocations': ['warrior'], 'attack': 81, 'crit': 0.07, 'lifesteal': 0.04}, 'primordial_dragon'),
             ('primordial_scale_armor', 'Armadura de Escamas Primordiais', 'Primordial Scale Armor', 'armor', {'slot': 'armor', 'vocations': ['hunter'], 'defense': 34, 'hp': 180, 'crit': 0.05}, 'hoard_hydra'),
             ('draconic_robe', 'Manto do Sacerdote Dracônico', 'Draconic Priest Robe', 'armor', {'slot': 'armor', 'vocations': ['arcanist', 'devout'], 'defense': 33, 'hp': 190, 'mana': 0.25}, 'draconic_priest'),
         ]),
    dict(L=200, region=('O Fim de Tudo', 'The End of All'), theme='hell', hue=PINK,
         mats=[('chaos_fragment', 'Fragmento do Caos', 'Chaos Fragment', 'mat_crystal'), ('divine_ichor', 'Icor Divino', 'Divine Ichor', 'mat_core')],
         xp=('chaos_throne', 'Trono do Caos', 'Throne of Chaos', 'ring'),
         loot=('gods_vault', 'Cofre dos Deuses', 'Vault of the Gods', 'maze'),
         boss=('ozzarak_end', 'O Fim de Ozzarak', "Ozzarak's End", 'chaos_key', 'Chave do Caos', 'Chaos Key'),
         monsters=[
             ('chaos_avatar', 'Avatar do Caos', 'Chaos Avatar', 'zathroth', 1.06, 0.98, 1.02, 1250, 'xp', ['holy'], ['fire', 'death']),
             ('ruin_seraph', 'Serafim da Ruína', 'Ruin Seraph', 'fallen_seraph', 1.0, 0.98, 1.0, 1200, 'xp', ['death'], ['holy']),
             ('entropy_stalker', 'Perseguidor da Entropia', 'Entropy Stalker', 'void_stalker', 0.95, 0.98, 0.95, 1100, 'xp', ['holy'], ['death']),
             ('god_guardian', 'Guardião dos Deuses', 'Guardian of the Gods', 'death_knight', 1.06, 1.0, 1.08, 1300, 'loot', ['death'], ['holy', 'physical']),
             ('celestial_golem', 'Golem Celestial', 'Celestial Golem', 'golem', 1.1, 0.96, 1.08, 1450, 'loot', ['death'], ['holy', 'earth']),
             ('ozzarak', 'Ozzarak, o Fim', 'Ozzarak, the End', 'ghazbaran', 1.5, 1.0, 1.0, 1150, 'boss', ['holy'], ['fire', 'death']),
         ],
         xp_mons=['chaos_avatar', 'ruin_seraph', 'entropy_stalker'], loot_mons=['god_guardian', 'celestial_golem', 'ruin_seraph'], boss_mons=['ruin_seraph', 'ozzarak'],
         drops=[
             ('chaos_bow', 'Arco do Caos', 'Chaos Bow', 'bow', {'slot': 'weapon', 'vocations': ['hunter'], 'attack': 85, 'crit': 0.1}, 'entropy_stalker'),
             ('ruin_blade', 'Lâmina da Ruína', 'Ruin Blade', 'blade', {'slot': 'weapon', 'vocations': ['warrior', 'devout'], 'attack': 86, 'lifesteal': 0.07}, 'god_guardian'),
             ('staff_of_the_end', 'Cajado do Fim', 'Staff of the End', 'staff', {'slot': 'weapon', 'vocations': ['arcanist'], 'attack': 87, 'mana': 0.5}, 'celestial_golem'),
             ('crown_of_the_end', 'Coroa do Fim', 'Crown of the End', 'helmet', {'slot': 'helmet', 'defense': 34, 'hp': 260, 'mana': 0.35, 'crit': 0.05}, 'ozzarak'),
         ]),
]

# ── Nível baixo ───────────────────────────────────────────────────────────────
# (id, nome PT, nome EN, sprite, hp, atk, def, spd, xp, loot)
LOW = [
    dict(id='mill_fields', name=('Campos do Moinho', 'Mill Fields'), region='Ravina Selvagem', level=3, focus=None, map='plains',
         monsters=[
             ('field_rat', 'Rato do Campo', 'Field Rat', 'rato', 50, 10, 3, 1350, 2, [('gold', 1, 2, 5), ('bone', 0.3), ('raw_shrimp', 0.15)]),
             ('wild_piglet', 'Leitão Bravo', 'Wild Piglet', 'javali', 65, 11, 4, 1500, 2, [('gold', 1, 2, 6), ('leather', 0.3)]),
             ('bullfrog', 'Sapo-Boi', 'Bullfrog', 'sapo', 55, 9, 4, 1550, 2, [('gold', 1, 2, 5), ('leather', 0.2), ('green_herb', 0.15)]),
         ]),
    dict(id='wasp_grove', name=('Bosque das Vespas', 'Wasp Grove'), region='Terras Selvagens', level=10, focus='xp', map='river',
         monsters=[
             ('giant_wasp', 'Vespa Assassina', 'Assassin Wasp', 'vespa', 120, 26, 8, 900, 6, [('gold', 1, 6, 14), ('feather', 0.35), ('green_herb', 0.3)]),
             ('horned_beetle', 'Besouro Chifrudo', 'Horned Beetle', 'inseto', 175, 23, 12, 1400, 7, [('gold', 1, 7, 15), ('leather', 0.35), ('copper_ore', 0.2)]),
             ('moss_slime', 'Gosma do Musgo', 'Moss Slime', 'slime', 140, 24, 9, 1200, 6, [('gold', 1, 6, 13), ('green_herb', 0.35), ('spider_silk', 0.2)]),
         ]),
    dict(id='raider_camp', name=('Acampamento dos Saqueadores', 'Raider Camp'), region='Terras Selvagens', level=18, focus='loot', map='den',
         monsters=[
             ('goblin_raider', 'Goblin Saqueador', 'Goblin Raider', 'goblin', 290, 32, 16, 1200, 16, [('gold', 1, 12, 26), ('goblin_ear', 0.5), ('iron_ore', 0.25), ('orc_tusk', 0.15)]),
             ('goblin_marksman', 'Atirador Goblin', 'Goblin Marksman', 'goblin_archer', 235, 35, 13, 1150, 16, [('gold', 1, 12, 26), ('goblin_ear', 0.5), ('feather', 0.35)]),
             ('goblin_hexer', 'Feiticeiro Goblin', 'Goblin Hexer', 'goblin_mage', 245, 37, 13, 1300, 17, [('gold', 1, 13, 28), ('goblin_ear', 0.5), ('copper_ore', 0.25), ('green_herb', 0.2)]),
         ]),
    dict(id='crab_coast', name=('Costa dos Caranguejos', 'Crab Coast'), region='Costa dos Afogados', level=26, focus='xp', map='beach',
         monsters=[
             ('giant_crab', 'Caranguejo Gigante', 'Giant Crab', 'caranguejo', 480, 40, 28, 1300, 40, [('gold', 1, 18, 38), ('raw_trout', 0.3), ('sea_pearl', 0.03)]),
             ('fishman', 'Homem-Peixe', 'Fishman', 'tribo_peixe', 420, 44, 23, 1150, 41, [('gold', 1, 18, 38), ('raw_trout', 0.35), ('leather', 0.3)]),
             ('stinging_jelly', 'Água-Viva Urticante', 'Stinging Jelly', 'agua_viva', 380, 46, 20, 1100, 39, [('gold', 1, 16, 34), ('sea_pearl', 0.04)]),
         ]),
]

# ── Gerar ─────────────────────────────────────────────────────────────────────
items = load_json(D + 'items.json'); by_item = {i['id']: i for i in items}
monsters = load_json(D + 'monsters.json'); by_mon = {m['id']: m for m in monsters}
hunts = load_json(D + 'hunts.json'); by_hunt = {h['id']: h for h in hunts}
smithing = load_json(D + 'smithing.json'); by_sm = {s['id']: s for s in smithing}
i18n_items = load_json(I18N_ITEMS); i18n_content = load_json(I18N_CONTENT)

def put(lst, by, obj):
    if obj['id'] in by: by[obj['id']].clear(); by[obj['id']].update(obj)
    else: lst.append(obj); by[obj['id']] = obj

# Ids novos não podem pisar em monstro/caçada/item que já existia antes deste script.
OURS = set()
for t in TIERS:
    OURS |= {m[0] for m in t['monsters']} | {t['xp'][0], t['loot'][0]} | {m[0] for m in t['mats']} | {d[0] for d in t['drops']}
    if t.get('boss'): OURS |= {t['boss'][0], t['boss'][3]}
for h in LOW: OURS |= {h['id']} | {m[0] for m in h['monsters']}
GEN_MARK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gen_hunts_130_200.ids.json')
previous = set(json.load(open(GEN_MARK))) if os.path.exists(GEN_MARK) else set()
clash = [i for i in OURS if i not in previous and (i in by_mon or i in by_hunt or i in by_item)]
assert not clash, f'ids já usados no jogo: {clash}'
# Nomes também: a tradução é por nome, e um nome repetido trocaria a do item/monstro antigo.
OUR_NAMES = set()
for t in TIERS:
    OUR_NAMES |= {m[1] for m in t['monsters']} | {t['xp'][1], t['loot'][1]} | {m[1] for m in t['mats']} | {d[1] for d in t['drops']}
    if t.get('boss'): OUR_NAMES |= {t['boss'][1], t['boss'][4]}
for h in LOW: OUR_NAMES |= {h['name'][0]} | {m[1] for m in h['monsters']}
taken = {x['name'] for coll in (monsters, hunts, items) for x in coll if x['id'] not in OURS}
name_clash = sorted(OUR_NAMES & taken)
assert not name_clash, f'nomes já usados no jogo: {name_clash}'

for t in TIERS:
    L, s = t['L'], lv_scale(t['L'])
    gold_k = 1.15 ** ((L - 120) / 10)
    boss_ids = {m[0] for m in t['monsters'] if m[8] == 'boss'}
    for i, (mid, pt, en, kind) in enumerate(t['mats']):
        recolor(ICON[kind], hue=t['hue'], sat=1.5, light=-0.05 * i).save(ICONS + mid + '.png')
        put(items, by_item, {'id': mid, 'name': pt, 'icon': mid, 'value': round((1250 + 100 * i) * 1.3 ** ((L - 120) / 10))})
        i18n_items[pt] = en
    drop_of = {d[5]: d for d in t['drops']}
    for (did, pt, en, kind, eq, src) in t['drops']:
        recolor(ICON[kind], hue=t['hue'], sat=1.5, light=-0.05).save(ICONS + did + '.png')
        lvl = L - (2 if eq['slot'] == 'weapon' and 'hunter' in eq.get('vocations', []) else 0)
        equip = {'slot': eq['slot'], 'level': lvl, **{k: v for k, v in eq.items() if k != 'slot'}}
        put(items, by_item, {'id': did, 'name': pt, 'icon': did, 'equip': equip, 'value': round(60000 * 1.25 ** ((L - 120) / 10) * (1.5 if src in boss_ids else 1))})
        i18n_items[pt] = en
    key = t.get('boss')
    if key:
        kid, kpt, ken = key[3], key[4], key[5]
        recolor(ICON['key'], hue=t['hue'], sat=1.6).save(ICONS + kid + '.png')
        put(items, by_item, {'id': kid, 'name': kpt, 'icon': kid})
        i18n_items[kpt] = ken
        # Profissões param no 120: a chave pede o nível máximo e os materiais da faixa.
        put(smithing, by_sm, {'id': kid, 'name': kpt, 'level': 120, 'intervalMs': 12000, 'xp': 600 + (L - 120) * 10,
                              'inputs': {'adamant_bar': 4, t['mats'][0][0]: 4, t['mats'][1][0]: 2, 'coal': 10}, 'output': kid})
    for (mid, pt, en, sprite, hm, am, dm, spd, role, weak, resist) in t['monsters']:
        xp = s['xp'] * (0.8 if role == 'loot' else 1) * (3.4 if role == 'boss' else 1)
        gmin, gmax = (320, 640) if role == 'loot' else (110, 220)
        gm = 8 if role == 'boss' else 1
        loot = [{'item': 'gold', 'chance': 1, 'min': round(gmin * gold_k * gm), 'max': round(gmax * gold_k * gm)}]
        loot.append({'item': t['mats'][1 if role == 'loot' else 0][0], 'chance': 1.0 if role == 'boss' else (0.42 if role == 'loot' else 0.33)})
        if role == 'boss': loot.append({'item': t['mats'][1][0], 'chance': 1.0})
        if mid in drop_of: loot.append({'item': drop_of[mid][0], 'chance': 0.09 if role == 'boss' else 0.004})
        if key and role == 'loot': loot.append({'item': key[3], 'chance': 0.01})
        put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite, 'hp': int(round(s['hp'] * hm, -1)), 'attack': round(s['attack'] * am),
                               'defense': round(s['defense'] * dm), 'attackSpeedMs': spd, 'xp': int(round(xp, -2)), 'loot': loot,
                               'weak': weak, 'resist': resist})
        i18n_content[pt] = en
    region_pt, region_en = t['region']
    i18n_content[region_pt] = region_en
    for focus in ('xp', 'loot'):
        hid, hpt, hen, _layout = t[focus]
        put(hunts, by_hunt, {'id': hid, 'name': hpt, 'region': region_pt, 'level': L, 'monsters': t[focus + '_mons'], 'focus': focus})
        i18n_content[hpt] = hen
    if key:
        put(hunts, by_hunt, {'id': key[0], 'name': key[1], 'region': region_pt, 'level': L, 'monsters': t['boss_mons'], 'boss': True, 'key': key[3]})
        i18n_content[key[1]] = key[2]

for h in LOW:
    for (mid, pt, en, sprite, hp, atk, df, spd, xp, loot) in h['monsters']:
        put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': sprite, 'hp': hp, 'attack': atk, 'defense': df, 'attackSpeedMs': spd, 'xp': xp,
                               'loot': [({'item': l[0], 'chance': l[1], 'min': l[2], 'max': l[3]} if len(l) == 4 else {'item': l[0], 'chance': l[1]}) for l in loot]})
        i18n_content[pt] = en
    obj = {'id': h['id'], 'name': h['name'][0], 'region': h['region'], 'level': h['level'], 'monsters': [m[0] for m in h['monsters']]}
    if h['focus']: obj['focus'] = h['focus']
    put(hunts, by_hunt, obj)
    i18n_content[h['name'][0]] = h['name'][1]

hunts.sort(key=lambda h: h['level'])
save_json(D + 'items.json', items); save_json(D + 'monsters.json', monsters); save_json(D + 'hunts.json', hunts)
save_json(D + 'smithing.json', smithing); save_json(I18N_ITEMS, i18n_items); save_json(I18N_CONTENT, i18n_content)
json.dump(sorted(OURS), open(GEN_MARK, 'w'))
print('ok:', len(items), 'itens,', len(monsters), 'monstros,', len(hunts), 'caçadas')
for t in TIERS:
    for focus in ('xp', 'loot'): print('MAP', t[focus][0], t['theme'], t[focus][3])
    if t.get('boss'): print('MAP', t['boss'][0], t['theme'], 'boss')
for h in LOW: print('MAP', h['id'], h['map'], '-')
