# Instâncias acima do 200 (região "Além do Fim"): 210, 225 e 240, mais difíceis que o Fim de Ozzarak.
# Cada uma tem 4 a 5 monstros de limpeza novos, subchefe e chefe, um material novo e uma chave
# (forjada na Ferraria e caindo dos monstros da instância anterior e da própria limpeza).
# Sprites: recolor dos monstros do pack (Time Fantasy), com as direções quando o original tem.
# Ícones da chave e do material: recolor dos do jogo.
# Mapas: client/src/world/map.ts (DUNGEON_HUNTS) e WorldView.tsx (HUNT_MAPS).
# Uso: python scripts/data/gen_instances_beyond.py   (idempotente)
import json, os, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = ROOT + '/shared/data/'
ICONS = ROOT + '/client/public/assets/icons/'
MON = ROOT + '/client/public/assets/monsters/'
DIRS = ROOT + '/client/src/world/monsterDirs.json'
I18N_ITEMS = ROOT + '/client/src/items_i18n.json'
I18N_CONTENT = ROOT + '/client/src/content_i18n.json'

def load(p): return json.load(open(p, encoding='utf8'))
def save(p, d):
    with open(p, 'w', encoding='utf8', newline='\n') as f:
        json.dump(d, f, ensure_ascii=False, indent=2); f.write('\n')

def recolor(im, hue, sat=1.0, light=1.0):
    """Troca o matiz mantendo luz e sombra do pixel art (mesmo jeito de gen_instances.py)."""
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

REGION, REGION_EN = 'Além do Fim', 'Beyond the End'
BASE = 'chaos_avatar'  # o monstro mais forte das caçadas do 200
OLD_GEAR = ['ruin_blade', 'chaos_bow', 'crown_of_the_end']

# Força de cada instância em relação aos monstros do 200 (vida, ataque, defesa, XP).
# Medido com o simulador: 4 vocações no nível da instância, melhor equipamento do 200, skills 110.
TIERS = {210: (1.8, 1.25, 1.12, 1.5), 225: (2.6, 1.45, 1.22, 2.2), 240: (3.2, 1.6, 1.3, 3.2)}

# (id, PT, EN, nível, matiz, material (id, PT, EN, ícone base), chave (id, PT, EN),
#  limpeza [(id, PT, EN, sprite base, fraco, resiste)], subchefe, chefe, de onde a chave cai)
NEW = [
    ('void_citadel', 'Cidadela do Vazio', 'Void Citadel', 210, 0.76,
     ('nullstone', 'Pedra Nula', 'Nullstone', 'chaos_fragment'),
     ('void_citadel_key', 'Chave da Cidadela do Vazio', 'Void Citadel Key'),
     [('null_wraith', 'Espectro Nulo', 'Null Wraith', 'wraith', ['holy'], ['death']),
      ('void_reaver', 'Ceifador do Vazio', 'Void Reaver', 'void_stalker', ['holy'], ['death']),
      ('starless_eye', 'Olho Sem Estrelas', 'Starless Eye', 'beholder', ['earth'], ['energy']),
      ('abyss_herald', 'Arauto do Abismo', 'Abyss Herald', 'void_herald', ['holy'], ['death'])],
     ('void_warden', 'Guardião do Vazio', 'Void Warden', 'stone_guardian', ['energy'], ['physical']),
     ('nyxara', 'Nyxara, a Rainha do Vazio', 'Nyxara, the Void Queen', 'anjo_sombrio', ['holy'], ['death']),
     ['chaos_throne', 'gods_vault']),
    ('shattered_heaven', 'Céu Estilhaçado', 'Shattered Heaven', 225, 0.13,
     ('broken_halo', 'Auréola Partida', 'Broken Halo', 'divine_ichor'),
     ('shattered_key', 'Chave do Céu Estilhaçado', 'Shattered Heaven Key'),
     [('fallen_archon', 'Arconte Caído', 'Fallen Archon', 'fallen_seraph', ['death'], ['holy']),
      ('ruin_colossus', 'Colosso da Ruína', 'Ruin Colossus', 'golem', ['energy'], ['physical']),
      ('shattered_hound', 'Cão do Céu Partido', 'Shattered Hound', 'cerbero', ['water'], ['fire']),
      ('ashen_cherub', 'Querubim de Cinzas', 'Ashen Cherub', 'fenix', ['water'], ['fire'])],
     ('herald_of_silence', 'Arauto do Silêncio', 'Herald of Silence', 'grim_reaper', ['holy'], ['death']),
     ('aurelion', 'Aurelion, o Céu Caído', 'Aurelion, the Fallen Sky', 'dragon_lord', ['death'], ['holy', 'fire']),
     ['void_citadel']),
    ('primal_chaos', 'Coração do Caos Primordial', 'Heart of Primal Chaos', 240, 0.99,
     ('primal_ember', 'Brasa Primordial', 'Primal Ember', 'chaos_fragment'),
     ('primal_key', 'Chave do Caos Primordial', 'Primal Chaos Key'),
     [('chaos_spawn', 'Cria do Caos', 'Chaos Spawn', 'demon', ['holy'], ['fire']),
      ('entropy_hydra', 'Hidra da Entropia', 'Entropy Hydra', 'hydra', ['water'], ['earth']),
      ('unmade_knight', 'Cavaleiro Desfeito', 'Unmade Knight', 'death_knight', ['holy'], ['physical']),
      ('maw_of_ruin', 'Bocarra da Ruína', 'Maw of Ruin', 'shadow_beast', ['holy'], ['death']),
      ('chaos_lich', 'Lich do Caos', 'Chaos Lich', 'lich5', ['holy'], ['death', 'water'])],
     ('ozzarak_heir', 'Herdeiro de Ozzarak', 'Heir of Ozzarak', 'lord_demon', ['holy'], ['fire']),
     ('vorhaal', 'Vorhaal, o Primeiro Caos', 'Vorhaal, the First Chaos', 'zathroth', ['holy'], ['fire', 'death']),
     ['shattered_heaven']),
]

items = load(D + 'items.json'); by_item = {i['id']: i for i in items}
monsters = load(D + 'monsters.json'); by_mon = {m['id']: m for m in monsters}
hunts = load(D + 'hunts.json'); by_hunt = {h['id']: h for h in hunts}
smithing = load(D + 'smithing.json'); by_sm = {s['id']: s for s in smithing}
dirs = load(DIRS)
i18n_items = load(I18N_ITEMS); i18n_content = load(I18N_CONTENT)

def put(lst, by, obj):
    if obj['id'] in by: by[obj['id']].clear(); by[obj['id']].update(obj)
    else: lst.append(obj); by[obj['id']] = obj

MARK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gen_instances_beyond.ids.json')
previous = set(json.load(open(MARK))) if os.path.exists(MARK) else set()
ours = set(); names = set()
for n in NEW:
    ours |= {n[0], n[5][0], n[6][0], n[8][0], n[9][0]} | {t[0] for t in n[7]}
    names |= {n[1], n[5][1], n[6][1], n[8][1], n[9][1]} | {t[1] for t in n[7]}
clash = [i for i in ours if i not in previous and (i in by_mon or i in by_hunt or i in by_item)]
assert not clash, f'ids já usados: {clash}'
taken = {x['name'] for coll in (monsters, hunts, items) for x in coll if x['id'] not in ours}
assert not (names & taken), f'nomes já usados: {sorted(names & taken)}'

base = by_mon[BASE]
gold = next(l for l in base['loot'] if l['item'] == 'gold')
KILLS = lambda L: round((100 + L * 4) / 10) * 10
i18n_content[REGION] = REGION_EN

def sprite(src, dst, hue):
    for d in ('', '_down', '_up'):
        if not os.path.exists(f'{MON}{src}{d}_1.png'): continue
        for k in range(1, 5):
            recolor(Image.open(f'{MON}{src}{d}_{k}.png'), hue).save(f'{MON}{dst}{d}_{k}.png')
    if src in dirs and dst not in dirs: dirs.append(dst)

for (iid, pt, en, L, hue, mat, key, trash, mini, boss, key_from) in NEW:
    hm, am, dm, xm = TIERS[L]
    mid, mpt, men, micon = mat
    recolor(Image.open(ICONS + micon + '.png'), hue).save(ICONS + mid + '.png')
    put(items, by_item, {'id': mid, 'name': mpt, 'icon': mid, 'value': round(by_item['chaos_fragment']['value'] * xm)})
    i18n_items[mpt] = men
    kid, kpt, ken = key
    recolor(Image.open(ICONS + 'chaos_key.png'), hue).save(ICONS + kid + '.png')
    put(items, by_item, {'id': kid, 'name': kpt, 'icon': kid})
    i18n_items[kpt] = ken
    put(smithing, by_sm, {'id': kid, 'name': kpt, 'level': 120, 'intervalMs': 12000, 'xp': round(7140 * xm),
                          'inputs': {'adamant_bar': 4, mid: 4, 'chaos_fragment': 2, 'divine_ichor': 2, 'coal': 12}, 'output': kid})
    gm = xm  # ouro acompanha o XP
    def mon(spec, hp_m, atk_m, xp_m, loot, spd):
        sid, spt, sen, src, weak, resist = spec
        sprite(src, sid, hue)
        m = {'id': sid, 'name': spt, 'sprite': sid, 'hp': int(round(base['hp'] * hm * hp_m, -1)),
             'attack': round(base['attack'] * am * atk_m), 'defense': round(base['defense'] * dm),
             'attackSpeedMs': spd, 'xp': int(round(base['xp'] * xm * xp_m, -3)), 'loot': loot, 'weak': weak, 'resist': resist}
        put(monsters, by_mon, m); i18n_content[spt] = sen
    key_chance = round(0.6 / KILLS(L), 4)
    for n, spec in enumerate(trash):
        loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * gm), 'max': round(gold['max'] * gm)},
                {'item': mid, 'chance': 0.3},
                {'item': 'chaos_fragment', 'chance': 0.15},
                {'item': OLD_GEAR[n % 3], 'chance': 0.0015},
                {'item': kid, 'chance': key_chance}]
        mon(spec, 1 + 0.08 * (n % 3), 1 + 0.03 * (n % 2), 1, loot, 1250 - 50 * (n % 3))
    for spec, hp_m, atk_m, xp_m, g_m, last in ((mini, 3.0, 1.04, 3.5, 4, False), (boss, 5.0, 1.1, 7, 8, True)):
        loot = [{'item': 'gold', 'chance': 1, 'min': round(gold['min'] * gm * g_m), 'max': round(gold['max'] * gm * g_m)},
                {'item': mid, 'chance': 1, 'min': 3 if last else 1, 'max': 6 if last else 3},
                {'item': 'chaos_fragment', 'chance': 1}, {'item': 'divine_ichor', 'chance': 1 if last else 0.5}]
        if last: loot += [{'item': g, 'chance': round(0.06 + 0.02 * (L - 210) / 15, 3)} for g in OLD_GEAR]
        mon(spec, hp_m, atk_m, xp_m, loot, 1300 if last else 1200)
    put(hunts, by_hunt, {'id': iid, 'name': pt, 'region': REGION, 'level': L, 'monsters': [mini[0], boss[0]],
                         'boss': True, 'key': kid, 'trash': [t[0] for t in trash]})
    i18n_content[pt] = en
    # Como as outras chaves: cai de vez em quando dos monstros da caçada (ou instância) anterior.
    for hid in key_from:
        for m in by_hunt[hid].get('trash') or by_hunt[hid]['monsters']:
            loot = by_mon[m]['loot']
            if not any(l['item'] == kid for l in loot):
                loot.append({'item': kid, 'chance': key_chance if by_hunt[hid].get('boss') else 0.0007})

hunts.sort(key=lambda h: h['level'])
save(D + 'items.json', items); save(D + 'monsters.json', monsters); save(D + 'hunts.json', hunts)
save(D + 'smithing.json', smithing)
with open(DIRS, 'w', encoding='utf8', newline='\n') as f: json.dump(dirs, f, indent=1)
save(I18N_ITEMS, i18n_items); save(I18N_CONTENT, i18n_content)
json.dump(sorted(ours), open(MARK, 'w'))
print('ok:', [n[0] for n in NEW])
