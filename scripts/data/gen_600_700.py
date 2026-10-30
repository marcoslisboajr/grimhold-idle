# Fase 2 do 500 ao 800: quatro regiões do 600 ao 700, no mesmo molde das do 500 ao 600 (scripts/data/gen_500_600.py).
# Cada região: caçada de XP (L+5), meio-termo (L+13), XP do meio (L+18) e loot (L+21), um material novo e uma
# tarefa de caça por caçada. Os monstros reaproveitam sprites do jogo (com andar e 4 lados) recoloridos no tom da
# região.
# Uso: python scripts/data/gen_600_700.py
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


# Curva do gen_500_600.py (vida, ataque, defesa e XP pelo nível), continuada para cima.
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


# ── Regiões do 600 ao 700 ─────────────────────────────────────────────────────
REGIONS = [
    {'start': 600, 'name': 'Abismo do Vazio Primordial', 'en': 'Primordial Void Abyss', 'hue': 0.78, 'sat': 1.1, 'light': 1.0,
     'mat': ('primordial_shard', 'Fragmento Primordial', 'Primordial Shard', 'void_essence'),
     'hunts': [
         ('primordial_rift', 'Fenda Primordial', 'Primordial Rift', 5, 'xp', 1.0, [
             ('primordial_stalker', 'Rastreador Primordial', 'Primordial Stalker', 'void_hound', 950, ['holy', 'physical'], ['death', 'energy'], 0.9, 1.1),
             ('primordial_drake', 'Draco Primordial', 'Primordial Drake', 'fire_dragon', 1200, ['water', 'holy'], ['death'], 1.15, 1.04),
             ('abyss_watcher', 'Vigia do Abismo', 'Abyss Watcher', 'void_hound', 1050, ['physical', 'fire'], ['energy', 'death'], 0.95, 1.08)]),
         ('void_archive', 'Arquivo do Vazio', 'Void Archive', 13, 'balanced', 0.81, [
             ('void_arcanist', 'Arcanista do Vazio Primordial', 'Primordial Void Arcanist', 'storm_arcanist', 1100, ['physical', 'holy'], ['energy', 'death'], 0.92, 1.12),
             ('shadow_inquisitor', 'Inquisidor das Sombras', 'Shadow Inquisitor', 'archwarlock', 1050, ['holy', 'fire'], ['death'], 0.98, 1.06),
             ('void_gargoyle', 'Gárgula do Vazio', 'Void Gargoyle', 'rotten_golem', 1250, ['energy', 'holy'], ['physical', 'earth'], 1.1, 1.02)]),
         ('astral_eclipse', 'Eclipse Astral', 'Astral Eclipse', 18, 'xp', 0.93, [
             ('eclipse_harpy', 'Harpia do Eclipse', 'Eclipse Harpy', 'harpy', 900, ['energy', 'holy'], ['death'], 0.88, 1.1),
             ('shadow_seraph', 'Serafim das Sombras', 'Shadow Seraph', 'anjo_sombrio', 1150, ['holy', 'water'], ['death', 'energy'], 1.05, 1.08),
             ('void_manticore', 'Mantícora do Vazio', 'Void Manticore', 'quimera', 1200, ['fire', 'holy'], ['physical', 'death'], 1.12, 1.04)]),
         ('primordial_vault', 'Abóbada Primordial', 'Primordial Vault', 21, 'loot', 0.7, [
             ('void_sovereign', 'Soberano do Vazio', 'Void Sovereign', 'abyss_champion', 1250, ['holy', 'physical'], ['death', 'energy'], 1.18, 1.08),
             ('null_sentinel', 'Sentinela do Nada', 'Null Sentinel', 'lion_sentinel', 1300, ['death', 'energy'], ['physical', 'holy'], 1.2, 1.02),
             ('abyssal_eidolon', 'Ídolo Abissal', 'Abyssal Eidolon', 'chaos_lich', 1100, ['holy', 'fire'], ['death', 'energy'], 1.0, 1.12)]),
     ]},
    {'start': 625, 'name': 'Planalto dos Titãs', 'en': 'Titans Plateau', 'hue': 0.11, 'sat': 1.0, 'light': 1.0,
     'mat': ('titan_core', 'Núcleo Titânico', 'Titan Core', 'amber_heart'),
     'hunts': [
         ('titan_ridge', 'Cordilheira dos Titãs', 'Titan Ridge', 5, 'xp', 1.0, [
             ('stone_titan', 'Titã de Pedra', 'Stone Titan', 'cave_brute', 1300, ['energy', 'water'], ['earth', 'physical'], 1.2, 1.04),
             ('crag_claw', 'Garra das Rochas', 'Crag Claw', 'raptor', 900, ['water'], ['earth', 'physical'], 0.95, 1.08),
             ('granite_beast', 'Fera de Granito', 'Granite Beast', 'javali', 950, ['energy', 'water'], ['physical'], 1.0, 1.05)]),
         ('ancient_quarry', 'Pedreira Ancestral', 'Ancient Quarry', 13, 'balanced', 0.81, [
             ('colossus_sentinel', 'Sentinela Colossal', 'Colossus Sentinel', 'moss_golem', 1350, ['energy', 'fire'], ['physical', 'earth'], 1.22, 1.0),
             ('earth_shaman', 'Xamã da Terra', 'Earth Shaman', 'primal_shaman', 1100, ['fire', 'death'], ['earth'], 0.92, 1.1),
             ('basalt_guardian', 'Guardião de Basalto', 'Basalt Guardian', 'bone_shieldbearer', 1250, ['water', 'energy'], ['earth', 'physical'], 1.15, 1.02)]),
         ('thunder_peaks', 'Picos do Trovão', 'Thunder Peaks', 18, 'xp', 0.93, [
             ('storm_pterosaur', 'Pterossauro da Tempestade', 'Storm Pterosaur', 'sky_pterosaur', 900, ['earth', 'water'], ['energy'], 0.88, 1.12),
             ('thunder_elemental', 'Elemental do Trovão', 'Thunder Elemental', 'rotten_golem', 1000, ['earth'], ['energy', 'physical'], 0.95, 1.1),
             ('mountain_wyvern', 'Serpe da Montanha', 'Mountain Wyvern', 'fire_dragon', 1250, ['water'], ['energy', 'earth'], 1.15, 1.04)]),
         ('titan_forge', 'Forja dos Titãs', 'Titan Forge', 21, 'loot', 0.7, [
             ('titan_overlord', 'Soberano dos Titãs', 'Titan Overlord', 'usurper_marshal', 1250, ['energy', 'death'], ['physical', 'earth'], 1.18, 1.08),
             ('obsidian_golem', 'Golem de Obsidiana', 'Obsidian Golem', 'ice_golem', 1350, ['water', 'holy'], ['physical', 'fire', 'earth'], 1.25, 0.98),
             ('forge_master_spirit', 'Espírito da Forja', 'Forge Master Spirit', 'grand_infernalist', 1100, ['water', 'holy'], ['fire', 'earth'], 1.0, 1.12)]),
     ]},
    {'start': 650, 'name': 'Ruínas do Sol Negro', 'en': 'Black Sun Ruins', 'hue': 0.05, 'sat': 1.2, 'light': 0.9,
     'mat': ('black_sun_cinder', 'Cinza do Sol Negro', 'Black Sun Cinder', 'flame_heart'),
     'hunts': [
         ('scorched_bastion', 'Bastião Calcinado', 'Scorched Bastion', 5, 'xp', 1.0, [
             ('black_sun_crusader', 'Cruzado do Sol Negro', 'Black Sun Crusader', 'cavaleiro_negro', 1250, ['holy', 'water'], ['fire', 'death'], 1.1, 1.06),
             ('solar_hellhound', 'Cão Solar Infernal', 'Solar Hellhound', 'shattered_hound', 900, ['water', 'holy'], ['fire'], 0.92, 1.1),
             ('flame_strider', 'Passolargo das Chamas', 'Flame Strider', 'cerbero', 980, ['water', 'earth'], ['fire', 'physical'], 1.0, 1.06)]),
         ('ashen_sepulcher', 'Sepulcro de Cinzas', 'Ashen Sepulcher', 13, 'balanced', 0.81, [
             ('ashen_hierophant', 'Hierofante das Cinzas', 'Ashen Hierophant', 'bone_priest', 1100, ['holy', 'water'], ['fire', 'death'], 0.94, 1.1),
             ('dread_catacomb_guard', 'Guarda do Sepulcro', 'Sepulcher Guard', 'bone_guard', 1200, ['holy', 'water'], ['death', 'physical'], 1.12, 1.02),
             ('cinder_wraith', 'Espectro das Cinzas', 'Cinder Wraith', 'catacomb_wraith', 980, ['holy', 'energy'], ['fire', 'physical'], 0.92, 1.12)]),
         ('pyre_spire', 'Pináculo da Pira', 'Pyre Spire', 18, 'xp', 0.93, [
             ('solar_phoenix', 'Fênix do Sol Negro', 'Black Sun Phoenix', 'fenix', 950, ['water'], ['fire', 'death'], 0.92, 1.12),
             ('darkflame_cultist', 'Cultista da Chama Negra', 'Darkflame Cultist', 'cultista_vermelho', 1000, ['holy', 'water'], ['fire'], 0.88, 1.12),
             ('ashen_dreadnought', 'Couraçado de Cinzas', 'Ashen Dreadnought', 'catacomb_king', 1300, ['holy', 'water'], ['fire', 'physical', 'death'], 1.18, 1.04)]),
         ('black_sun_altar', 'Altar do Sol Negro', 'Black Sun Altar', 21, 'loot', 0.7, [
             ('black_sun_avatar', 'Avatar do Sol Negro', 'Black Sun Avatar', 'abyss_champion', 1250, ['holy', 'water'], ['fire', 'death'], 1.2, 1.08),
             ('flame_monarch', 'Monarca das Chamas', 'Flame Monarch', 'archwarlock', 1100, ['water', 'holy'], ['fire', 'death'], 1.0, 1.14),
             ('cinder_gargoyle', 'Gárgula de Cinzas', 'Cinder Gargoyle', 'rotten_golem', 1200, ['water'], ['fire', 'physical'], 1.1, 1.04)]),
     ]},
    {'start': 675, 'name': 'Cidadela do Crepúsculo Eterno', 'en': 'Eternal Twilight Citadel', 'hue': 0.58, 'sat': 1.1, 'light': 1.1,
     'mat': ('twilight_essence', 'Essência do Crepúsculo', 'Twilight Essence', 'crystal_heart'),
     'hunts': [
         ('twilight_gates', 'Portões do Crepúsculo', 'Twilight Gates', 5, 'xp', 1.0, [
             ('twilight_vanguard', 'Vanguarda do Crepúsculo', 'Twilight Vanguard', 'cavaleiro_negro', 1200, ['death', 'physical'], ['holy', 'energy'], 1.1, 1.05),
             ('twilight_stalker', 'Rastreador do Crepúsculo', 'Twilight Stalker', 'lobo', 850, ['fire', 'earth'], ['holy'], 0.9, 1.1),
             ('ethereal_herald', 'Arauto Etéreo', 'Ethereal Herald', 'storm_arcanist', 1050, ['death', 'physical'], ['holy', 'energy'], 0.95, 1.08)]),
         ('moonlit_sanctuary', 'Santuário Enluarado', 'Moonlit Sanctuary', 13, 'balanced', 0.81, [
             ('twilight_archon', 'Arconte do Crepúsculo', 'Twilight Archon', 'anjo_sombrio', 1150, ['death', 'energy'], ['holy', 'physical'], 1.08, 1.08),
             ('lunar_sorceress', 'Feiticeira Lunar', 'Lunar Sorceress', 'frost_asura', 1050, ['death', 'earth'], ['holy', 'energy'], 0.94, 1.12),
             ('celestial_lion', 'Leão Celestial', 'Celestial Lion', 'cerbero', 950, ['death', 'water'], ['holy'], 1.0, 1.06)]),
         ('astral_highlands', 'Terras Altas Astrais', 'Astral Highlands', 18, 'xp', 0.93, [
             ('twilight_dragon', 'Dragão do Crepúsculo', 'Twilight Dragon', 'fire_dragon', 1200, ['death', 'physical'], ['holy', 'energy'], 1.15, 1.06),
             ('astral_gryphon', 'Grifo Astral', 'Astral Gryphon', 'sky_pterosaur', 900, ['earth', 'death'], ['holy', 'energy'], 0.88, 1.12),
             ('twilight_valkyrie', 'Valquíria do Crepúsculo', 'Twilight Valkyrie', 'asura_guardian', 1000, ['death', 'physical'], ['holy'], 0.96, 1.1)]),
         ('eternal_twilight_throne', 'Trono do Crepúsculo Eterno', 'Eternal Twilight Throne', 21, 'loot', 0.7, [
             ('twilight_emperor', 'Imperador do Crepúsculo', 'Twilight Emperor', 'usurper_marshal', 1250, ['death', 'energy'], ['holy', 'physical'], 1.2, 1.08),
             ('astral_templar', 'Templário Astral', 'Astral Templar', 'lion_sentinel', 1300, ['death', 'physical'], ['holy', 'energy'], 1.22, 1.02),
             ('twilight_oracle', 'Oráculo do Crepúsculo', 'Twilight Oracle', 'frost_librarian', 1050, ['death', 'earth'], ['holy', 'energy'], 0.96, 1.12)]),
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
                      'killsRequired': 2600, 'minLevel': L, 'points': 385 + round((L - 600) * 0.25),
                      'goldReward': round(23_700_000 + (L - 600) * 120_000, -5),
                      'xpReward': 0, 'itemReward': {'id': mid, 'qty': 12 if focus == 'loot' else 8, 'name': pt}})

# As caçadas novas vão no fim, sem reordenar as antigas (os testes das regiões leem a ordem do arquivo).
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
indent = 1 if dirs_raw.startswith('[\n "') else 2
with open(DIRS, 'w', encoding='utf8', newline='\n') as f: json.dump(dirs, f, ensure_ascii=False, indent=indent); f.write('\n')
json.dump(tasks, open(ROOT + '/scripts/data/tasks_600_700.json', 'w', encoding='utf8', newline='\n'), ensure_ascii=False, indent=2)
print('ok', sum(len(r['hunts']) for r in REGIONS), 'caçadas')
