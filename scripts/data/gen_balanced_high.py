# Caçadas de meio-termo do 115 ao 195 (uma entre cada par XP/loot), com monstros das vizinhas.
#   python scripts/data/gen_balanced_high.py
import json

HUNTS = [
    # id, nível, nome, (inglês), região, monstros, tema, layout, objetos
    ('ruin_portal', 115, 'Portal da Ruína', 'Ruin Portal', 'Abismo do Fogo', ['demon_skeleton', 'demon_eyes', 'void_stalker'], 'hell', 'gallery', "[['hornStatue', 6], ['voidCoral', 14], ['brazier', 12], ['rubble', 50]]"),
    ('ember_rift', 125, 'Fenda das Brasas', 'Ember Rift', 'Ermos de Cinzas', ['wraith', 'cinder_fiend', 'lava_hound'], 'volcano', 'ring', "[['oreBig', 12], ['brazier', 14], ['voidCoral', 8], ['rubble', 50]]"),
    ('molten_grottoes', 135, 'Grutas Fundidas', 'Molten Grottoes', 'Profundezas Cristalinas', ['magma_wyrm', 'cave_wyvern', 'deep_watcher'], 'cave', 'maze', "[['crystalTall', 18], ['gemCluster', 12], ['brazier', 8], ['rubble', 40]]"),
    ('frostbite_pass', 145, 'Passo Gelado', 'Frostbite Pass', 'Confins Gelados', ['deep_watcher', 'frozen_knight', 'boreal_wyrm'], 'ice', 'gallery', "[['giantRock', 8], ['crystalTall', 20], ['voidCrystal', 14]]"),
    ('silent_barrow', 155, 'Túmulo Silencioso', 'Silent Barrow', 'Vale dos Reis Mortos', ['glacial_lich', 'soul_reaper', 'banshee_queen'], 'crypt', 'ring', "[['sarcophagus', 30], ['pillarDark', 8], ['cross', 8], ['brazier', 8]]"),
    ('burning_catacombs', 165, 'Catacumbas em Chamas', 'Burning Catacombs', 'Círculos Infernais', ['elder_vampire', 'pit_fiend', 'alpha_hellhound'], 'hell', 'gallery', "[['sarcophagus', 16], ['brazier', 18], ['hornStatue', 4], ['rubble', 40]]"),
    ('celestial_breach', 175, 'Brecha Celeste', 'Celestial Breach', 'Plano Astral', ['hellfire_lord', 'shadow_scribe', 'star_eater'], 'void', 'ring', "[['voidCrystal', 30], ['voidCluster', 14], ['moonStatue', 4], ['gargoyle', 4]]"),
    ('dragon_observatory', 185, 'Observatório Dracônico', 'Draconic Observatory', 'Picos do Dragão Primordial', ['mind_lord', 'golden_wyvern', 'elder_wyrm'], 'volcano', 'maze', "[['gemCluster', 14], ['pillarWhite', 8], ['oreBig', 10], ['rubble', 40]]"),
    ('edge_of_ending', 195, 'Beira do Fim', 'Edge of the End', 'O Fim de Tudo', ['primordial_dragon', 'draconic_priest', 'entropy_stalker'], 'hell', 'gallery', "[['voidCoral', 16], ['gargoyle', 6], ['brazier', 12], ['rubble', 50]]"),
]


def rw(path, fn):
    raw = open(path, encoding='utf8', newline='').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    s = fn(raw.replace('\r\n', '\n'))
    open(path, 'w', encoding='utf8', newline='').write(s.replace('\n', nl))


monsters = {m['id'] for m in json.load(open('shared/data/monsters.json', encoding='utf8'))}

def hunts(s):
    data = json.loads(s)
    ids = {h['id'] for h in data}
    for hid, lvl, name, _, region, mons, *_ in HUNTS:
        assert hid not in ids, hid
        for m in mons: assert m in monsters, m
        new = {'id': hid, 'name': name, 'region': region, 'level': lvl, 'monsters': mons, 'focus': 'balanced'}
        # Entra logo depois da última caçada de nível menor.
        at = max(i for i, h in enumerate(data) if h['level'] < lvl) + 1
        data.insert(at, new)
    return json.dumps(data, ensure_ascii=False, indent=2) + '\n'
rw('shared/data/hunts.json', hunts)

def mapts(s):
    anchor = '  // Instâncias novas (scripts/data/gen_instances.py)\n'
    assert s.count(anchor) == 1
    lines = '  // Meio-termo do 115 ao 195 (scripts/data/gen_balanced_high.py)\n'
    for i, (hid, _, _, _, _, _, theme, layout, props) in enumerate(HUNTS):
        lines += f"  {hid}: D({90 + i}, THEMES.{theme}, '{layout}', {props}),\n"
    return s.replace(anchor, lines + anchor, 1)
rw('client/src/world/map.ts', mapts)

def worldview(s):
    anchor = '  goblin_king_hall: DUNGEON_HUNTS.goblin_king_hall(),\n'
    assert s.count(anchor) == 1
    return s.replace(anchor, ''.join(f'  {h[0]}: DUNGEON_HUNTS.{h[0]}(),\n' for h in HUNTS) + anchor, 1)
rw('client/src/world/WorldView.tsx', worldview)

def i18n(s):
    anchor = '  "Coração do Vazio": "Heart of the Void",\n'
    assert s.count(anchor) == 1
    return s.replace(anchor, anchor + ''.join(f'  {json.dumps(h[2], ensure_ascii=False)}: {json.dumps(h[3])},\n' for h in HUNTS), 1)
rw('client/src/content_i18n.json', i18n)
print('ok', len(HUNTS))
