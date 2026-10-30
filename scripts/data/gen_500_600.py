# Fase 1 do 500 ao 800 (27/10): quatro regiões do 500 ao 600, só caçadas (instância, covil e set ficam para depois).
# Cada região: caçada de XP (L+5), meio-termo (L+13), XP do meio (L+18) e loot (L+21), um material novo e uma
# tarefa de caça por caçada. Os monstros reaproveitam sprites do jogo (com andar e 4 lados) recoloridos no tom da
# região ("pode repetir sprites apenas trocando de cor"). Mesmo molde do gen_hero_cave.py.
# Uso: python scripts/data/gen_500_600.py   (idempotente; as tarefas saem em scripts/data/tasks_500_600.json e já foram
# passadas para shared/src/hunting_tasks.ts com pontos e ouro na curva das do 496)
import json, os, re, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
MONS = ROOT + '/client/public/assets/monsters/'
DIRS = ROOT + '/client/src/world/monsterDirs.json'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'


def load(p): return json.load(open(p, encoding='utf8'))
def save(p, d):
    # Arquivo de um objeto por linha continua assim.
    compact = open(p, encoding='utf8').read().replace('\r\n', '\n').startswith('[\n  {"')
    with open(p, 'w', encoding='utf8', newline='\n') as f:
        if compact: f.write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in d) + '\n]\n')
        else: json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')


def recolor(im, hue, sat=1.0, light=1.0):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            s = min(1, s * 1.6 * sat); s = 0.25 + s if s < 0.25 else s
            r2, g2, b2 = colorsys.hls_to_rgb(hue, min(1, l * light), s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im


items = load(D + 'items.json'); by_item = {i['id']: i for i in items}
monsters = load(D + 'monsters.json'); by_mon = {m['id']: m for m in monsters}
hunts = load(D + 'hunts.json'); by_hunt = {h['id']: h for h in hunts}
dirs_raw = open(DIRS, encoding='utf8').read()
dirs = json.loads(dirs_raw)
i18n_items = load(I18N_ITEMS); i18n_content = load(I18N_CONTENT)
base = by_mon['chaos_avatar']
gold = next(l for l in base['loot'] if l['item'] == 'gold')
mon_files = os.listdir(MONS)


def put(lst, by, obj):
    if obj['id'] in by: by[obj['id']].clear(); by[obj['id']].update(obj)
    else: lst.append(obj); by[obj['id']] = obj


def clone_sprite(src, dst, hue, sat, light):
    """Copia todos os quadros do sprite (frente, costas e lados) recoloridos com o id novo."""
    pat = re.compile('^' + re.escape(src) + r'((?:_(?:down|up|left|right|side))?_\d+\.png)$')
    n = 0
    for f in mon_files:
        m = pat.match(f)
        if m:
            recolor(Image.open(MONS + f), hue, sat, light).save(MONS + dst + m.group(1)); n += 1
    assert n, f'sem quadros para {src}'
    if src in dirs and dst not in dirs: dirs.append(dst)


# Curva do gen_hero_cave.py (vida, ataque, defesa e XP pelo nível), continuada para cima.
def tier(L):
    t = (L - 200) / 45
    return (1.02 + 0.48 * t, 1.04 + 0.2 * t, 1.02 + 0.3 * t, 1.6 ** 10 * 1.05 ** ((L - 250) / 5))


XP_SCALE = float(os.environ.get('XP_SCALE', 0.0144))


def mon(mid, pt, en, L, spd, weak, resist, loot_extra, src, hue, sat=1.0, light=1.0, hp_m=1.0, atk_m=1.0):
    hm, am, dm, xm = tier(L)
    g = 1 + (L - 200) * 0.02
    loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * g), 'max': round(gold['max'] * g)}] + loot_extra
    put(monsters, by_mon, {'id': mid, 'name': pt, 'sprite': mid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
                           'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
                           'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * XP_SCALE, -3)), 'loot': loot, 'weak': weak, 'resist': resist})
    i18n_content[pt] = en
    clone_sprite(src, mid, hue, sat, light)


# ── Regiões ───────────────────────────────────────────────────────────────────
# Caçada: (id, nome, nome em inglês, nível acima do início, foco, xpMult, monstros)
# Monstro: (id, nome, nome em inglês, sprite de origem, velocidade, fraquezas, resistências, vida, ataque)
REGIONS = [
    {'start': 500, 'name': 'Abismo Estelar', 'en': 'Starlit Abyss', 'hue': 0.7, 'sat': 1.0, 'light': 1.05,
     'mat': ('star_essence', 'Essência Estelar', 'Star Essence', 'crystal_heart'),
     'hunts': [
         ('starlit_rift', 'Fenda Estelar', 'Starlit Rift', 5, 'xp', 1.0, [
             ('star_herald', 'Arauto Estelar', 'Star Herald', 'storm_arcanist', 1100, ['physical', 'death'], ['energy'], 0.88, 1.1),
             ('void_hound', 'Cão do Vazio Estelar', 'Starlit Void Hound', 'shattered_hound', 900, ['holy', 'fire'], ['death'], 0.95, 1.06),
             ('astral_chimera', 'Quimera Astral', 'Astral Chimera', 'quimera', 1250, ['energy', 'holy'], ['fire', 'physical'], 1.12, 1.02)]),
         ('cosmic_scriptorium', 'Escritório do Cosmo', 'Cosmic Scriptorium', 13, 'balanced', 0.81, [
             ('star_warlock', 'Bruxo Estelar', 'Star Warlock', 'archwarlock', 1100, ['physical', 'holy'], ['energy', 'death'], 0.9, 1.12),
             ('cosmic_scribe', 'Escriba do Cosmo', 'Cosmic Scribe', 'frost_librarian', 1050, ['fire', 'physical'], ['energy'], 0.95, 1.06),
             ('fallen_star_angel', 'Anjo das Estrelas Caídas', 'Fallen Star Angel', 'anjo_sombrio', 1200, ['death'], ['holy', 'energy'], 1.05, 1.04)]),
         ('nebula_nest', 'Ninho da Nebulosa', 'Nebula Nest', 18, 'xp', 0.93, [
             ('star_phoenix', 'Fênix Estelar', 'Star Phoenix', 'fenix', 1000, ['water', 'death'], ['fire', 'holy'], 0.92, 1.08),
             ('void_harpy', 'Harpia do Vazio', 'Void Harpy', 'harpy', 900, ['energy', 'holy'], ['death'], 0.88, 1.1),
             ('star_lantern', 'Lanterna Estelar', 'Star Lantern', 'wandering_lantern', 1150, ['physical', 'death'], ['energy', 'holy'], 0.9, 1.04)]),
         ('celestial_vault', 'Abóbada Celeste', 'Celestial Vault', 21, 'loot', 0.7, [
             ('astral_lich', 'Lich Astral', 'Astral Lich', 'chaos_lich', 1150, ['holy', 'physical'], ['death', 'energy'], 1.0, 1.12),
             ('celestial_sentinel', 'Sentinela Celeste', 'Celestial Sentinel', 'lion_sentinel', 1300, ['death', 'energy'], ['physical', 'holy'], 1.18, 1.02),
             ('star_medusa', 'Medusa Estelar', 'Star Medusa', 'medusa', 1100, ['fire', 'holy'], ['earth', 'water'], 0.95, 1.1)]),
     ]},
    {'start': 525, 'name': 'Reino Gelado do Norte', 'en': 'Frozen North Kingdom', 'hue': 0.55, 'sat': 0.8, 'light': 1.15,
     'mat': ('glacial_core', 'Núcleo Glacial', 'Glacial Core', 'frost_crystal'),
     'hunts': [
         ('winter_steppe', 'Estepe do Inverno', 'Winter Steppe', 5, 'xp', 1.0, [
             ('winter_wolf', 'Lobo do Inverno', 'Winter Wolf', 'lobo', 850, ['fire', 'energy'], ['water'], 0.9, 1.08),
             ('snow_raptor', 'Raptor das Neves', 'Snow Raptor', 'raptor', 900, ['fire', 'earth'], ['water', 'physical'], 0.95, 1.06),
             ('frost_giant', 'Gigante de Gelo', 'Frost Giant', 'cave_brute', 1350, ['fire', 'energy'], ['water', 'physical'], 1.2, 1.04)]),
         ('frozen_bastion', 'Bastião Congelado', 'Frozen Bastion', 13, 'balanced', 0.81, [
             ('blizzard_asura', 'Asura da Nevasca', 'Blizzard Asura', 'frost_asura', 1050, ['fire', 'holy'], ['water', 'death'], 0.95, 1.1),
             ('frost_knight', 'Cavaleiro Gélido', 'Frost Knight', 'cavaleiro_negro', 1250, ['fire', 'energy'], ['water', 'physical'], 1.12, 1.02),
             ('glacial_mammoth', 'Mamute Glacial', 'Glacial Mammoth', 'megaloceros', 1300, ['fire'], ['water', 'earth'], 1.2, 1.0)]),
         ('frostwyrm_peaks', 'Picos do Dragão Eterno', 'Frostwyrm Peaks', 18, 'xp', 0.93, [
             ('eternal_frost_dragon', 'Dragão do Gelo Eterno', 'Eternal Frost Dragon', 'fire_dragon', 1250, ['fire', 'energy'], ['water', 'death'], 1.15, 1.04),
             ('ice_pterosaur', 'Ptero do Gelo', 'Ice Pterosaur', 'sky_pterosaur', 900, ['energy', 'fire'], ['water'], 0.88, 1.1),
             ('polar_boar', 'Javali Polar', 'Polar Boar', 'javali', 950, ['fire', 'earth'], ['water', 'physical'], 0.95, 1.06)]),
         ('glacier_heart', 'Coração da Geleira', 'Glacier Heart', 21, 'loot', 0.7, [
             ('glacial_hydra', 'Hidra Glacial', 'Glacial Hydra', 'elder_hydra', 1200, ['fire', 'energy'], ['water', 'earth'], 1.15, 1.06),
             ('ice_golem', 'Golem de Gelo', 'Ice Golem', 'moss_golem', 1350, ['fire', 'energy'], ['water', 'physical'], 1.22, 1.0),
             ('glacial_beast', 'Fera Glacial', 'Glacial Beast', 'cerbero', 1000, ['fire', 'holy'], ['water', 'death'], 0.95, 1.12)]),
     ]},
    {'start': 550, 'name': 'Necrópole do Rei Lich', 'en': 'Lich King Necropolis', 'hue': 0.33, 'sat': 0.55, 'light': 1.0,
     'mat': ('royal_bone_dust', 'Pó de Ossos Reais', 'Royal Bone Dust', 'bone'),
     'hunts': [
         ('necropolis_gates', 'Portões da Necrópole', 'Necropolis Gates', 5, 'xp', 1.0, [
             ('necro_legionary', 'Legionário da Necrópole', 'Necropolis Legionary', 'bone_legionary', 1150, ['holy', 'physical'], ['death', 'earth'], 1.05, 1.06),
             ('bone_duelist', 'Espadachim Ossudo', 'Bone Duelist', 'bone_swordsman', 950, ['holy', 'fire'], ['death'], 0.92, 1.1),
             ('plague_bat', 'Morcego Pútrido', 'Plague Bat', 'morcego', 800, ['holy', 'fire'], ['death', 'earth'], 0.85, 1.08)]),
         ('royal_mausoleum', 'Mausoléu Real', 'Royal Mausoleum', 13, 'balanced', 0.81, [
             ('royal_mummy', 'Múmia Real', 'Royal Mummy', 'catacomb_mummy', 1250, ['fire', 'holy'], ['death', 'earth'], 1.12, 1.02),
             ('royal_wraith', 'Espectro Real', 'Royal Wraith', 'catacomb_wraith', 1000, ['holy', 'energy'], ['death', 'physical'], 0.9, 1.12),
             ('bone_high_priest', 'Sacerdote dos Ossos', 'Bone High Priest', 'bone_priest', 1100, ['holy', 'physical'], ['death'], 0.95, 1.08)]),
         ('necromancer_spire', 'Torre do Necromante', 'Necromancer Spire', 18, 'xp', 0.93, [
             ('supreme_necromancer', 'Necromante Supremo', 'Supreme Necromancer', 'grave_necromancer', 1100, ['holy', 'physical'], ['death', 'energy'], 0.92, 1.12),
             ('bone_warden', 'Guarda Ossudo', 'Bone Warden', 'bone_guard', 1250, ['holy', 'fire'], ['death', 'physical'], 1.12, 1.02),
             ('spectral_knight', 'Cavaleiro Espectral', 'Spectral Knight', 'knight_specter', 1150, ['holy', 'energy'], ['death', 'physical'], 1.0, 1.06)]),
         ('lich_king_vault', 'Cofre do Rei Lich', 'Lich King Vault', 21, 'loot', 0.7, [
             ('elder_lich', 'Lich Ancião', 'Elder Lich', 'lich5', 1150, ['holy', 'fire'], ['death', 'energy'], 1.0, 1.14),
             ('catacomb_monarch', 'Monarca da Catacumba', 'Catacomb Monarch', 'catacomb_king', 1300, ['holy'], ['death', 'physical', 'earth'], 1.2, 1.04),
             ('bone_shield_warden', 'Escudeiro dos Ossos', 'Bone Shield Warden', 'bone_shieldbearer', 1350, ['holy', 'energy'], ['death', 'physical'], 1.25, 0.98)]),
     ]},
    {'start': 575, 'name': 'Trono do Caos', 'en': 'Throne of Chaos', 'hue': 0.0, 'sat': 1.1, 'light': 0.85,
     'mat': ('chaos_ember', 'Brasa do Caos', 'Chaos Ember', 'demon_heart'),
     'hunts': [
         ('chaos_wastes', 'Ermos do Caos', 'Chaos Wastes', 5, 'xp', 1.0, [
             ('chaos_dragon', 'Dragão do Caos', 'Chaos Dragon', 'fire_dragon', 1250, ['water', 'holy'], ['fire', 'death'], 1.15, 1.04),
             ('hell_cerberus', 'Cérbero Infernal', 'Hell Cerberus', 'cerbero', 950, ['water', 'holy'], ['fire'], 0.95, 1.1),
             ('chaos_cultist', 'Cultista do Caos', 'Chaos Cultist', 'cultista_vermelho', 1050, ['holy', 'physical'], ['fire', 'death'], 0.88, 1.12)]),
         ('abyssal_forge', 'Forja do Abismo', 'Abyssal Forge', 13, 'balanced', 0.81, [
             ('chaos_infernalist', 'Infernalista do Caos', 'Chaos Infernalist', 'grand_infernalist', 1100, ['water', 'holy'], ['fire', 'energy'], 0.95, 1.12),
             ('abyss_acolyte', 'Acólito do Abismo', 'Abyss Acolyte', 'ember_acolyte', 1000, ['water', 'physical'], ['fire'], 0.9, 1.08),
             ('ash_cherub', 'Querubim das Cinzas', 'Ash Cherub', 'ashen_cherub', 1150, ['water', 'death'], ['fire', 'holy'], 1.0, 1.06)]),
         ('defiled_sanctum', 'Santuário Profanado', 'Defiled Sanctum', 18, 'xp', 0.93, [
             ('dark_archangel', 'Arcanjo Sombrio', 'Dark Archangel', 'anjo_sombrio', 1150, ['holy', 'water'], ['death', 'fire'], 1.0, 1.1),
             ('chaos_chimera', 'Quimera do Caos', 'Chaos Chimera', 'quimera', 1250, ['water', 'energy'], ['fire', 'physical'], 1.12, 1.04),
             ('chaos_fanatic', 'Fanático do Caos', 'Chaos Fanatic', 'tower_fanatic', 1000, ['holy', 'water'], ['fire', 'death'], 0.9, 1.12)]),
         ('chaos_throne_hall', 'Salão do Trono do Caos', 'Chaos Throne Hall', 21, 'loot', 0.7, [
             ('chaos_knight', 'Cavaleiro do Caos', 'Chaos Knight', 'cavaleiro_negro', 1300, ['holy', 'water'], ['fire', 'physical', 'death'], 1.2, 1.04),
             ('chaos_lord', 'Senhor do Caos', 'Chaos Lord', 'abyss_champion', 1250, ['holy', 'water'], ['fire', 'death'], 1.15, 1.08),
             ('chaos_marshal', 'Marechal do Caos', 'Chaos Marshal', 'usurper_marshal', 1150, ['water', 'energy'], ['fire', 'physical'], 1.05, 1.1)]),
     ]},
]

FRAG = {'item': 'chaos_fragment', 'chance': 0.1}
ICHOR = {'item': 'divine_ichor', 'chance': 0.02}
TASK_NAMES = {'xp': 'Caça a', 'balanced': 'Limpeza:', 'loot': 'Tesouro de'}
tasks = []
for reg in REGIONS:
    mid, pt, en, icon_src = reg['mat']
    recolor(Image.open(ICONS + icon_src + '.png'), reg['hue'], reg['sat'], reg['light']).save(ICONS + mid + '.png')
    k = 1 + (reg['start'] - 500) / 100
    put(items, by_item, {'id': mid, 'name': pt, 'icon': mid, 'value': round(by_item['hero_medal']['value'] * 1.15 * k)})
    i18n_items[pt] = en
    i18n_content[reg['name']] = reg['en']
    for hid, hpt, hen, off, focus, xp_mult, mons in reg['hunts']:
        L = reg['start'] + off
        loot_bonus = 1.25 if focus == 'loot' else 1.0
        for i, (mid2, mpt, men, src, spd, weak, resist, hp_m, atk_m) in enumerate(mons):
            extra = [{'item': mid, 'chance': round(0.2 * loot_bonus + 0.02 * i, 3)}, FRAG] + ([ICHOR] if focus == 'loot' else [])
            mon(mid2, mpt, men, L, spd, weak, resist, extra, src, reg['hue'], reg['sat'], reg['light'], hp_m, atk_m)
        h = {'region': reg['name'], 'id': hid, 'name': hpt, 'level': L, 'monsters': [m[0] for m in mons], 'focus': focus}
        if xp_mult != 1.0: h['xpMult'] = xp_mult
        put(hunts, by_hunt, h)
        i18n_content[hpt] = hen
        lead = mons[0]
        tasks.append({'id': f'task_{lead[0]}', 'name': f'{TASK_NAMES[focus]} {lead[1]}', 'monsterId': lead[0], 'monsterName': lead[1],
                      'killsRequired': 2600, 'minLevel': L, 'points': 700 + (L - 500), 'goldReward': round(11_000_000 * (1 + (L - 500) / 100)),
                      'xpReward': 0, 'itemReward': {'id': mid, 'qty': 12 if focus == 'loot' else 8, 'name': pt}})

# As caçadas novas vão no fim, sem reordenar as antigas (os testes das regiões leem a ordem do arquivo).
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
indent = 1 if dirs_raw.startswith('[\n "') else 2
with open(DIRS, 'w', encoding='utf8', newline='\n') as f: json.dump(dirs, f, ensure_ascii=False, indent=indent); f.write('\n')
json.dump(tasks, open(ROOT + '/scripts/data/tasks_500_600.json', 'w', encoding='utf8', newline='\n'), ensure_ascii=False, indent=2)
print('ok', sum(len(r['hunts']) for r in REGIONS), 'caçadas')
