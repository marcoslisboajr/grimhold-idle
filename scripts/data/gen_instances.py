# Instâncias: ondas de limpeza (os monstros de `trash`) e depois subchefe e chefe.
# - Dá as ondas (trash) às 11 instâncias que já existiam.
# - Cria 11 instâncias novas para fechar os buracos de nível, cada uma com subchefe, chefe,
#   chave (forjada na Ferraria) e a chave caindo de vez em quando dos monstros da limpeza.
# Os mapas das novas ficam em client/src/world/map.ts (DUNGEON_HUNTS) e WorldView.tsx (HUNT_MAPS).
# Uso: python scripts/data/gen_instances.py   (idempotente)
import json, os, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'
SHEET = Image.open('../grimhold/assets-pixel/icones/icons_8.13.20/fullcolor/icons_full_32.png').convert('RGBA')
KEY_ICON = SHEET.crop((0, 52 * 32, 32, 53 * 32))

def recolor(im, hue):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            s = min(1, s * 1.6); s = 0.25 + s if s < 0.25 else s
            r2, g2, b2 = colorsys.hls_to_rgb(hue, l, s)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im

def load(p): return json.load(open(p, encoding='utf8'))
def save(p, d):
    with open(p, 'w', encoding='utf8', newline='\n') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')

# Instâncias que já existiam: de onde vêm os monstros da limpeza (caçadas normais da região).
EXISTING_TRASH = {
    'general_crypt': ['ashfen_barracks'], 'minotaur_throne': ['minotaur_maze'], 'tide_heart': ['broken_reef', 'abyssal_trench'],
    'dragon_throne': ['dragon_nest'], 'frost_citadel': ['eternal_glacier'], 'ghazbaran_temple': ['ghazbaran_lair'],
    'zathroth_throne': ['primordial_sanctum'], 'crystal_throne': ['crystal_caverns'], 'eternal_tomb': ['pharaoh_crypt'],
    'fallen_star_sanctum': ['forgotten_library'], 'ozzarak_end': ['chaos_throne'],
}

# Novas: (id, PT, EN, nível, região, caçadas da limpeza, matiz da chave,
#         subchefe (id, PT, EN, sprite), chefe (id, PT, EN, sprite), chave (id, PT, EN, nível de Ferraria, barra))
NEW = [
    ('goblin_king_hall', 'Salão do Rei Goblin', 'Goblin King Hall', 10, 'Ravina Selvagem', ['goblin_den'], 0.12,
     ('goblin_warlord', 'Senhor da Guerra Goblin', 'Goblin Warlord', 'goblin'),
     ('goblin_king', 'Grukk, o Rei Goblin', 'Grukk, the Goblin King', 'goblin_mage'),
     ('goblin_key', 'Chave do Salão Goblin', 'Goblin Hall Key', 5, 'bronze_bar')),
    ('orc_warchief_keep', 'Fortaleza do Chefe de Guerra', "Warchief's Keep", 18, 'Terras Selvagens', ['orc_fortress'], 0.02,
     ('orc_captain', 'Capitão Orc', 'Orc Captain', 'orc_warrior'),
     ('orc_warchief', 'Gorza, Chefe de Guerra', 'Gorza, the Warchief', 'orc_berserker'),
     ('orc_key', 'Chave da Fortaleza Orc', 'Orc Keep Key', 12, 'bronze_bar')),
    ('medusa_lair', 'Covil da Medusa', "Medusa's Lair", 26, 'Terras Selvagens', ['lizard_swamp'], 0.36,
     ('lizard_queen', 'Rainha dos Lagartos', 'Lizard Queen', 'lagarto_tribo'),
     ('elder_medusa', 'Euryale, a Medusa Anciã', 'Euryale, the Elder Medusa', 'medusa'),
     ('medusa_key', 'Chave do Covil da Medusa', "Medusa's Lair Key", 20, 'iron_bar')),
    ('cyclops_forge', 'Forja dos Ciclopes', 'Cyclops Forge', 46, 'Montanhas de Ferro', ['cyclops_lair'], 0.08,
     ('ogre_chieftain', 'Chefe Ogro', 'Ogre Chieftain', 'ogre_berserker'),
     ('brontes', 'Brontes, o Ciclope Ferreiro', 'Brontes, the Cyclops Smith', 'cyclops'),
     ('forge_key', 'Chave da Forja dos Ciclopes', 'Cyclops Forge Key', 42, 'steel_bar')),
    ('vampire_lord_crypt', 'Cripta do Conde', "Count's Crypt", 66, 'Terras Sombrias', ['vampire_crypt'], 0.95,
     ('vampire_bride', 'Noiva Vampira', 'Vampire Bride', 'dhampir'),
     ('count_varnak', 'Conde Varnak', 'Count Varnak', 'vampire'),
     ('count_key', 'Chave da Cripta do Conde', "Count's Crypt Key", 60, 'mithril_bar')),
    ('fallen_knights_hall', 'Salão dos Cavaleiros Caídos', 'Hall of Fallen Knights', 84, 'Picos da Tempestade', ['black_knight_crypt'], 0.66,
     ('profane_knight', 'Cavaleiro Profano', 'Profane Knight', 'cavaleiro_caido'),
     ('mordrek', 'Mordrek, o Rei Caído', 'Mordrek, the Fallen King', 'death_knight'),
     ('knight_key', 'Chave do Salão Caído', 'Fallen Hall Key', 78, 'abyssal_bar')),
    ('beholder_chamber', 'Câmara do Olho Ancião', 'Elder Eye Chamber', 100, 'Dimensão Sombria', ['shadow_cathedral'], 0.78,
     ('elder_bonelord', 'Senhor dos Ossos Ancião', 'Elder Bonelord', 'bonelord'),
     ('xyloth', 'Xyloth, o Olho Que Tudo Vê', 'Xyloth, the All-Seeing Eye', 'beholder'),
     ('eye_key', 'Chave da Câmara do Olho', 'Eye Chamber Key', 95, 'adamant_bar')),
    ('furnace_heart', 'Coração da Fornalha', 'Heart of the Furnace', 130, 'Ermos de Cinzas', ['ashen_wastes', 'damned_forge'], 0.05,
     ('master_smith', 'Mestre Ferreiro Condenado', 'Damned Master Smith', 'cultista_vermelho'),
     ('pyrgoth', 'Pyrgoth, o Titã Fundido', 'Pyrgoth, the Molten Titan', 'golem'),
     ('furnace_key', 'Chave da Fornalha', 'Furnace Key', 120, 'adamant_bar')),
    ('frost_giant_throne', 'Trono do Gigante de Gelo', 'Frost Giant Throne', 150, 'Confins Gelados', ['forgotten_tundra', 'frozen_fortress'], 0.55,
     ('winter_lich', 'Lich do Inverno Eterno', 'Lich of Endless Winter', 'lich5'),
     ('ymrak', 'Ymrak, o Gigante do Gelo', 'Ymrak, the Frost Giant', 'ogre'),
     ('frostgiant_key', 'Chave do Trono de Gelo', 'Frost Throne Key', 120, 'adamant_bar')),
    ('infernal_pit', 'Fosso dos Condenados', 'Pit of the Damned', 170, 'Círculos Infernais', ['hell_furnace', 'soul_market'], 0.0,
     ('pit_warden', 'Carcereiro Infernal', 'Infernal Warden', 'demon_skeleton'),
     ('malphas', 'Malphas, Senhor do Fosso', 'Malphas, Lord of the Pit', 'lord_demon'),
     ('pit_key', 'Chave do Fosso', 'Pit Key', 120, 'adamant_bar')),
    ('primordial_lair', 'Covil do Primeiro Dragão', "First Dragon's Lair", 190, 'Picos do Dragão Primordial', ['primordial_nest', 'dragon_hoard'], 0.1,
     ('dragon_priest', 'Sumo Sacerdote Dracônico', 'Draconic High Priest', 'cultista_vermelho'),
     ('vyrathos', 'Vyrathos, o Primeiro Dragão', 'Vyrathos, the First Dragon', 'dragon_lord'),
     ('firstdragon_key', 'Chave do Covil Primordial', 'Primordial Lair Key', 120, 'adamant_bar')),
]

items = load(D + 'items.json'); by_item = {i['id']: i for i in items}
monsters = load(D + 'monsters.json'); by_mon = {m['id']: m for m in monsters}
hunts = load(D + 'hunts.json'); by_hunt = {h['id']: h for h in hunts}
smithing = load(D + 'smithing.json'); by_sm = {s['id']: s for s in smithing}
i18n_items = load(I18N_ITEMS); i18n_content = load(I18N_CONTENT)

def put(lst, by, obj):
    if obj['id'] in by: by[obj['id']].clear(); by[obj['id']].update(obj)
    else: lst.append(obj); by[obj['id']] = obj

def trash_of(hunt_ids):
    out = []
    for hid in hunt_ids:
        for m in by_hunt[hid]['monsters']:
            if m not in out: out.append(m)
    return out

def main_material(trash):
    """O drop (sem ser ouro, chave ou equipamento) mais comum dos monstros da limpeza: vai na receita da chave."""
    best = {}
    for mid in trash:
        for l in by_mon[mid]['loot']:
            it = by_item.get(l['item'], {})
            if l['item'] == 'gold' or it.get('equip') or l['item'].endswith('_key'): continue
            best[l['item']] = best.get(l['item'], 0) + l['chance']
    return max(best, key=best.get)

# Ids novos não podem pisar no que já existia (exceto o que este script mesmo criou antes).
MARK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gen_instances.ids.json')
previous = set(json.load(open(MARK))) if os.path.exists(MARK) else set()
ours = set()
for n in NEW: ours |= {n[0], n[7][0], n[8][0], n[9][0]}
clash = [i for i in ours if i not in previous and (i in by_mon or i in by_hunt or i in by_item)]
assert not clash, f'ids já usados: {clash}'
names = set()
for n in NEW: names |= {n[1], n[7][1], n[8][1], n[9][1]}
taken = {x['name'] for coll in (monsters, hunts, items) for x in coll if x['id'] not in ours}
assert not (names & taken), f'nomes já usados: {sorted(names & taken)}'

for hid, sources in EXISTING_TRASH.items():
    by_hunt[hid]['trash'] = trash_of(sources)

for (iid, pt, en, L, region, sources, hue, mini, boss, key) in NEW:
    trash = trash_of(sources)
    base = max((by_mon[m] for m in trash), key=lambda m: m['hp'])
    mat = main_material(trash)
    kid, kpt, ken, klvl, bar = key
    recolor(KEY_ICON, hue).save(ICONS + kid + '.png')
    put(items, by_item, {'id': kid, 'name': kpt, 'icon': kid})
    i18n_items[kpt] = ken
    put(smithing, by_sm, {'id': kid, 'name': kpt, 'level': klvl, 'intervalMs': 6000 + klvl * 50, 'xp': 40 + klvl * 5,
                          'inputs': {bar: 2, mat: 4, 'coal': 2 + klvl // 15} if klvl >= 30 else {bar: 2, mat: 3}, 'output': kid})
    gold = next((l for l in base['loot'] if l['item'] == 'gold'), {'min': 10, 'max': 20})
    for (mid, mpt, men, sprite), hm, am, dm, xm, gm, last in ((mini, 2.5, 0.92, 1.1, 3.5, 4, False), (boss, 3.0, 1.0, 1.05, 6, 8, True)):
        loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * gm), 'max': round(gold['max'] * gm)},
                {'item': mat, 'chance': 1, 'min': 2 if last else 1, 'max': 5 if last else 3}]
        # O chefe deixa os equipamentos da limpeza com chance alta.
        if last:
            gear = [l['item'] for m in trash for l in by_mon[m]['loot'] if by_item.get(l['item'], {}).get('equip')]
            for g in list(dict.fromkeys(gear))[:3]: loot.append({'item': g, 'chance': 0.12})
        mon = {'id': mid, 'name': mpt, 'sprite': sprite, 'hp': int(round(base['hp'] * hm, -1)),
               'attack': round(base['attack'] * am), 'defense': round(base['defense'] * dm),
               'attackSpeedMs': base.get('attackSpeedMs', 1200), 'xp': int(round(base['xp'] * xm)), 'loot': loot}
        for k in ('weak', 'resist'):
            if base.get(k): mon[k] = base[k]
        put(monsters, by_mon, mon)
        i18n_content[mpt] = men
    put(hunts, by_hunt, {'id': iid, 'name': pt, 'region': region, 'level': L, 'monsters': [mini[0], boss[0]], 'trash': trash, 'boss': True, 'key': kid})
    i18n_content[pt] = en

# A chave cai de vez em quando dos monstros da limpeza (~0,6 chave por limpeza completa).
KILLS = lambda L: round((100 + L * 4) / 10) * 10
for h in hunts:
    if not h.get('boss') or not h.get('trash') or not h.get('key'): continue
    chance = round(0.6 / KILLS(h['level']), 4)
    for mid in h['trash']:
        loot = by_mon[mid]['loot']
        if any(l['item'] == h['key'] for l in loot): continue
        loot.append({'item': h['key'], 'chance': chance})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
json.dump(sorted(ours), open(MARK, 'w'))
print('ok:', sum(1 for h in hunts if h.get('boss')), 'instâncias')
