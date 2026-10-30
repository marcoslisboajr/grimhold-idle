"""Joalheria: nova profissão de produção (anéis e colares).

Move as 24 joias de gema do Artesanato para cá e cria peças novas inspiradas nos
clássicos (anel da força, amuleto pele de pedra, amuletos elementais...), com
redução de dano e resistência a elemento. Ícones e mascote são recoloridos.
  python scripts/data/gen_jewelcrafting.py
"""
import colorsys, json, os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATA = os.path.join(ROOT, 'shared', 'data')
ICO = os.path.join(ROOT, 'client', 'public', 'assets', 'icons')
PETS = os.path.join(ROOT, 'client', 'public', 'assets', 'pets')

ALL_RES = ['resFire', 'resWater', 'resEarth', 'resEnergy', 'resHoly', 'resDeath']
def allres(v):
    return {k: v for k in ALL_RES}

# id, PT, EN, slot, nível para usar, atributos, nível da receita, materiais, ícone base, (matiz, sat, brilho)
PIECES = [
    ('bronze_ring', 'Anel de Bronze', 'Bronze Ring', 'ring', 5, {'defense': 1, 'hp': 6}, 1, {'bronze_bar': 1}, 'iron_ring', (30, 0.9, 1.0)),
    ('bronze_necklace', 'Colar de Bronze', 'Bronze Necklace', 'amulet', 8, {'defense': 2, 'hp': 10}, 5, {'bronze_bar': 2}, 'platinum_amulet', (30, 0.9, 0.95)),
    ('garlic_necklace', 'Colar de Alho', 'Garlic Necklace', 'amulet', 20, {'defense': 2, 'resDeath': 0.12}, 16, {'iron_bar': 1, 'golden_root': 2}, 'platinum_amulet', (55, 0.35, 1.15)),
    ('dwarven_ring', 'Anel Anão', 'Dwarven Ring', 'ring', 22, {'defense': 3, 'hp': 20, 'resEarth': 0.06}, 20, {'iron_bar': 2, 'bronze_bar': 1}, 'iron_ring', (25, 0.6, 0.85)),
    ('might_ring', 'Anel da Força', 'Ring of Might', 'ring', 40, {'defense': 3, 'reduction': 0.04}, 35, {'silver_bar': 2, 'gem_diamond': 1}, 'sword_ring', (35, 1.0, 1.05)),
    ('stoneskin_amulet', 'Amuleto Pele de Pedra', 'Stoneskin Amulet', 'amulet', 45, {'defense': 4, 'reduction': 0.06}, 40, {'mithril_bar': 2, 'gem_diamond': 2}, 'platinum_amulet', (30, 0.15, 0.8)),
    ('time_ring', 'Anel do Tempo', 'Ring of Time', 'ring', 55, {'speed': -0.06}, 50, {'gold_bar': 1, 'gem_sapphire': 2}, 'golden_power_ring', (190, 0.9, 1.05)),
    ('ember_ring', 'Anel das Brasas', 'Ember Ring', 'ring', 55, {'attack': 4, 'resFire': 0.12}, 52, {'gold_bar': 1, 'gem_ruby': 1}, 'life_ring', (5, 1.1, 1.0)),
    ('serpent_ring', 'Anel da Serpente', 'Serpent Ring', 'ring', 55, {'regen': 0.03, 'resEarth': 0.12}, 54, {'gold_bar': 1, 'gem_emerald': 1}, 'life_ring', (120, 1.0, 0.9)),
    ('glacial_ring', 'Anel Glacial', 'Glacial Ring', 'ring', 55, {'defense': 3, 'resWater': 0.12}, 56, {'gold_bar': 1, 'frost_crystal': 2}, 'life_ring', (200, 0.7, 1.15)),
    ('spark_ring', 'Anel Faiscante', 'Spark Ring', 'ring', 55, {'mana': 0.04, 'resEnergy': 0.12}, 58, {'gold_bar': 1, 'gem_sapphire': 1}, 'life_ring', (275, 1.0, 1.05)),
    ('magma_amulet', 'Amuleto de Magma', 'Magma Amulet', 'amulet', 65, {'defense': 5, 'resFire': 0.2}, 62, {'adamant_bar': 2, 'gem_ruby': 3}, 'ruby_necklace', (10, 1.2, 1.0)),
    ('telluric_amulet', 'Amuleto Telúrico', 'Telluric Amulet', 'amulet', 65, {'hp': 40, 'resEarth': 0.2}, 64, {'adamant_bar': 2, 'gem_emerald': 3}, 'emerald_amulet', (110, 1.1, 0.9)),
    ('glacier_amulet', 'Amuleto Glacial', 'Glacier Amulet', 'amulet', 65, {'defense': 5, 'resWater': 0.2}, 66, {'adamant_bar': 2, 'frost_crystal': 4}, 'sapphire_amulet', (195, 0.7, 1.2)),
    ('lightning_pendant', 'Pingente Relâmpago', 'Lightning Pendant', 'amulet', 65, {'mana': 0.05, 'resEnergy': 0.2}, 68, {'adamant_bar': 2, 'gem_sapphire': 3}, 'sapphire_amulet', (280, 1.1, 1.1)),
    ('sacred_tree_amulet', 'Amuleto da Árvore Sagrada', 'Sacred Tree Amulet', 'amulet', 75, {'regen': 0.04, 'resHoly': 0.2}, 72, {'orichalcum_bar': 2, 'gem_emerald': 2, 'gem_diamond': 1}, 'emerald_amulet', (60, 1.0, 1.15)),
    ('death_ring', 'Anel da Morte', 'Death Ring', 'ring', 75, {'attack': 6, 'resDeath': 0.15}, 76, {'orichalcum_bar': 1, 'gem_ruby': 2}, 'void_ring', (265, 0.6, 0.7)),
    ('prismatic_ring', 'Anel Prismático', 'Prismatic Ring', 'ring', 85, {'reduction': 0.05, **allres(0.06)}, 82, {'luminite_bar': 1, 'gem_ruby': 1, 'gem_sapphire': 1, 'gem_emerald': 1, 'gem_diamond': 1}, 'golden_power_ring', (300, 0.8, 1.15)),
    ('leviathan_amulet', 'Amuleto do Leviatã', "Leviathan's Amulet", 'amulet', 95, {'defense': 10, 'hp': 80, 'resWater': 0.25}, 90, {'dragonite_bar': 2, 'abyssal_pearl': 3}, 'celestial_necklace', (215, 1.1, 0.9)),
    ('foxtail_amulet', 'Amuleto Cauda de Raposa', 'Foxtail Amulet', 'amulet', 140, {'defense': 14, 'hp': 150, 'reduction': 0.1}, 100, {'dragonite_bar': 2, 'black_diamond': 2}, 'demon_amulet', (25, 1.1, 1.1)),
    ('primordial_ring', 'Anel Primordial', 'Primordial Ring', 'ring', 140, {'attack': 10, 'reduction': 0.07, **allres(0.1)}, 115, {'primordial_bar': 1, 'crystal_heart': 1, 'gem_diamond': 2}, 'void_ring', (45, 1.0, 1.2)),
    ('primordial_amulet', 'Amuleto Primordial', 'Primordial Amulet', 'amulet', 140, {'defense': 18, 'hp': 160, 'reduction': 0.06, **allres(0.15)}, 118, {'primordial_bar': 2, 'crystal_heart': 2, 'gem_ruby': 1, 'gem_sapphire': 1, 'gem_emerald': 1, 'gem_diamond': 1}, 'celestial_necklace', (45, 1.0, 1.15)),
]

GEM_OUTPUTS = {f'{m}_{g}_{s}' for m in ('silver', 'gold', 'starmetal') for g in ('ruby', 'sapphire', 'emerald', 'diamond') for s in ('ring', 'amulet')}


def tint(im, hue, sat, vm):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb(hue / 360, min(1, max(s, 0.2) * sat * 1.6), min(1, v * vm))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


def rw_text(path, fn):
    raw = open(path, encoding='utf8', newline='').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    s = fn(raw.replace('\r\n', '\n'))
    open(path, 'w', encoding='utf8', newline='').write(s.replace('\n', nl))


def rw_json(path, fn):
    raw = open(path, encoding='utf8', newline='').read() if os.path.exists(path) else '[]'
    nl = '\r\n' if '\r\n' in raw else '\n'
    data = fn(json.loads(raw))
    out = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    open(path, 'w', encoding='utf8', newline='').write(out.replace('\n', nl))


def once(s, anchor, new, after=True):
    assert s.count(anchor) == 1, (anchor[:80], s.count(anchor))
    return s.replace(anchor, anchor + new if after else new + anchor, 1)


def swap(s, old, new):
    assert s.count(old) == 1, (old[:80], s.count(old))
    return s.replace(old, new, 1)


# ── Receitas ──────────────────────────────────────────────────────────────────
crafting_path = os.path.join(DATA, 'crafting.json')
crafting = json.load(open(crafting_path, encoding='utf8'))
moved = [r for r in crafting if r['output'] in GEM_OUTPUTS]
assert len(moved) == 24, len(moved)
rw_json(crafting_path, lambda d: [r for r in d if r['output'] not in GEM_OUTPUTS])

items = json.load(open(os.path.join(DATA, 'items.json'), encoding='utf8'))
item_ids = {i['id'] for i in items}

recipes = []
for pid, pt, en, slot, eq_lv, stats, rlv, inputs, *_ in PIECES:
    for mat in inputs:
        assert mat in item_ids, mat
    ring_xp = round(8 + 1.75 * rlv)
    xp = ring_xp if slot == 'ring' else round(ring_xp * 2.1)
    name = pt or next(i['name'] for i in items if i['id'] == pid)
    recipes.append({'id': pid, 'name': name, 'level': rlv, 'intervalMs': 3000 + 60 * rlv, 'xp': xp, 'inputs': inputs, 'output': pid})
recipes += moved
recipes.sort(key=lambda r: (r['level'], r['id']))
rw_json(os.path.join(DATA, 'jewelcrafting.json'), lambda _: recipes)

# ── Itens ─────────────────────────────────────────────────────────────────────
def add_items(d):
    at = max(i for i, it in enumerate(d) if it['id'] == 'starmetal_diamond_amulet') + 1
    for pid, pt, en, slot, eq_lv, stats, *_ in PIECES:
        if pt is None:
            continue
        assert pid not in item_ids, pid
        d.insert(at, {'id': pid, 'name': pt, 'icon': pid, 'equip': {'slot': slot, 'level': eq_lv, **stats}})
        at += 1
    return d
rw_json(os.path.join(DATA, 'items.json'), add_items)

for pid, pt, en, slot, eq_lv, stats, rlv, inputs, base, color in PIECES:
    if base:
        tint(Image.open(os.path.join(ICO, f'{base}.png')), *color).save(os.path.join(ICO, f'{pid}.png'))
tint(Image.open(os.path.join(ICO, 'skill_crafting.png')), 300, 0.9, 1.1).save(os.path.join(ICO, 'skill_jewelcrafting.png'))
tint(Image.open(os.path.join(PETS, 'pet_runecraft_spark.png')), 320, 1.0, 1.1).save(os.path.join(PETS, 'pet_jewelcrafting_spark.png'))

def items_i18n(s):
    lines = ''.join(f'  {json.dumps(pt, ensure_ascii=False)}: {json.dumps(en)},\n' for _, pt, en, *_ in PIECES if pt)
    assert s.startswith('{\n')
    return '{\n' + lines + s[2:]
rw_text(os.path.join(ROOT, 'client', 'src', 'items_i18n.json'), items_i18n)

# ── Profissão ─────────────────────────────────────────────────────────────────
def skills_ts(s):
    s = once(s, "import sigilismData from '../data/sigilism.json';\n", "import jewelcraftingData from '../data/jewelcrafting.json';\n")
    s = swap(s, "  | 'sigilism';", "  | 'sigilism'\n  | 'jewelcrafting';")
    s = once(s, "  { id: 'sigilism', name: 'Sigilismo', icon: 'skill_sigilism' },\n", "  { id: 'jewelcrafting', name: 'Joalheria', icon: 'skill_jewelcrafting' },\n")
    s = swap(s, "| 'fletching' | 'sigilism';", "| 'fletching' | 'sigilism' | 'jewelcrafting';")
    s = swap(s, "  'sigilism',\n];", "  'sigilism',\n  'jewelcrafting',\n];")
    s = once(s, "  sigilism: sigilismData as unknown as Recipe[],\n", "  jewelcrafting: jewelcraftingData as unknown as Recipe[],\n")
    s = swap(s, "...(RECIPES.fletching ?? [])];", "...(RECIPES.fletching ?? []), ...(RECIPES.jewelcrafting ?? [])];")
    return s
rw_text(os.path.join(ROOT, 'shared', 'src', 'skills.ts'), skills_ts)

rw_text(os.path.join(ROOT, 'shared', 'src', 'boosted.ts'), lambda s: once(s, "  sigilism: Date.UTC(2026, 9, 11) / 86_400_000,\n", "  jewelcrafting: Date.UTC(2026, 9, 15) / 86_400_000,\n"))
rw_text(os.path.join(ROOT, 'shared', 'src', 'dailies.ts'), lambda s: once(s, "  sigilism: ['Sigilista', 'Sigilismo'],\n", "  jewelcrafting: ['Joalheiro', 'Joalheria'],\n"))

def pets_ts(s):
    return once(s, "export const PETS: PetDef[] = [\n", """  {
    id: 'pet_jewelcrafting_spark',
    name: 'Centelha Lapidada',
    skill: 'jewelcrafting',
    description: 'O brilho de uma gema perfeita que se recusou a ficar presa no anel. Concede +50% de XP em Joalheria.',
    sprite: 'pet_jewelcrafting_spark',
  },
""")
rw_text(os.path.join(ROOT, 'shared', 'src', 'pets.ts'), pets_ts)
rw_text(os.path.join(ROOT, 'client', 'src', 'world', 'scene.ts'), lambda s: once(s, "  pet_fletching_owl: 1.15,\n", "  pet_jewelcrafting_spark: 1.15,\n"))

def home(s):
    s = swap(s, "  fletching: 'Produzindo',\n};", "  fletching: 'Produzindo',\n  jewelcrafting: 'Lapidando',\n};")
    s = swap(s, "  fletching: 'Produzir',\n};", "  fletching: 'Produzir',\n  jewelcrafting: 'Lapidar',\n};")
    s = swap(s, "'alchemy', 'runecraft', 'sigilism'] as const;", "'alchemy', 'runecraft', 'sigilism', 'jewelcrafting'] as const;")
    return s
rw_text(os.path.join(ROOT, 'client', 'src', 'Home.tsx'), home)

def i18n(s):
    s = once(s, "    'skill.fletching': 'Criação de Flechas',\n", "    'skill.jewelcrafting': 'Joalheria',\n")
    s = once(s, "    'act.fletching': 'Produzir',\n", "    'act.jewelcrafting': 'Lapidar',\n")
    s = once(s, "    'verb.fletching': 'Produzindo',\n", "    'verb.jewelcrafting': 'Lapidando',\n")
    s = once(s, "    'pet.pet_fletching_owl.name': 'Coruja Flecheira',\n", "    'pet.pet_jewelcrafting_spark.name': 'Centelha Lapidada',\n    'pet.pet_jewelcrafting_spark.desc': 'O brilho de uma gema perfeita que se recusou a ficar presa no anel. Concede +50% de XP em Joalheria.',\n")
    s = once(s, "    'skill.fletching': 'Fletching',\n", "    'skill.jewelcrafting': 'Jewelcrafting',\n")
    s = once(s, "    'act.fletching': 'Fletch',\n", "    'act.jewelcrafting': 'Cut',\n")
    s = once(s, "    'verb.fletching': 'Fletching',\n", "    'verb.jewelcrafting': 'Jewelcrafting',\n")
    s = once(s, "    'pet.pet_fletching_owl.name': 'Fletcher Owl',\n", "    'pet.pet_jewelcrafting_spark.name': 'Cut Spark',\n    'pet.pet_jewelcrafting_spark.desc': 'The glow of a perfect gem that refused to stay set in the ring. Grants +50% Jewelcrafting XP.',\n")
    return s
rw_text(os.path.join(ROOT, 'client', 'src', 'i18n.ts'), i18n)

def map_ts(s):
    s = once(s, "const workCache = new Map<string, WorldMap>();\n", """export function jewelcraftingMap(): WorldMap {
  return workMap({
    seed: 112,
    fill: Ground.Stone,
    floor: { sheet: 'tileA5_cave', x: 1, y: 0 },
    objects: [
      ['gemCluster', 2, 1, 0], ['gemCluster', 10, 1, 1], ['crystalTall', 1, 5, 0], ['crystalTall', 11, 5, 1],
      ['anvil', 7, 2], ['crate', 9, 6, 1], ['barrel', 3, 7, 2], ['brazier', 5, 1], ['brazier', 9, 1],
      ['pebbles', 4, 8, 0], ['pebbles', 8, 8, 2],
    ],
    spot: { x: 5, y: 4 },
    face: 'right',
    target: { x: 7, y: 3 },
  });
}

""", after=False)
    s = once(s, "  sigilism: sigilismMap,\n", "  jewelcrafting: jewelcraftingMap,\n")
    return s
rw_text(os.path.join(ROOT, 'client', 'src', 'world', 'map.ts'), map_ts)
print('ok', len(recipes), 'receitas,', sum(1 for p in PIECES if p[1]), 'peças novas')
