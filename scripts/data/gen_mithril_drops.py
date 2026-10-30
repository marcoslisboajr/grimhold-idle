# Mithril: monstros do nível 40 a 50 soltam barra e minério de mithril (antes, ninguém soltava).
# Os equipamentos de mithril caem pelos drops de equipamento das caçadas do 35 ao 44 (GEAR_TIERS em
# shared/src/combat.ts); o Grumm (covil do 46) tem as barras dele em scripts/data/gen_gods.py.
# Uso: python scripts/data/gen_mithril_drops.py   (idempotente; rode de novo depois do gen_instances.py)
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
P = ROOT + '/shared/data/monsters.json'

DROPS = {
    # Forja dos Ciclopes e arredores (caçada do 44, instância do 46).
    'cyclops': {'item': 'mithril_bar', 'chance': 0.04},
    'cyclops_thrower': {'item': 'mithril_ore', 'chance': 0.15, 'min': 1, 'max': 2},
    'ogre_berserker': {'item': 'mithril_bar', 'chance': 0.05},
    'brontes': {'item': 'mithril_bar', 'chance': 0.6, 'min': 2, 'max': 4},
    'ogre_chieftain': {'item': 'mithril_bar', 'chance': 0.35, 'min': 1, 'max': 2},
}

raw = open(P, encoding='utf8', newline='').read()
nl = '\r\n' if '\r\n' in raw else '\n'
monsters = json.loads(raw)
by_id = {m['id']: m for m in monsters}
for mid, drop in DROPS.items():
    loot = by_id[mid]['loot']
    old = next((l for l in loot if l['item'] == drop['item']), None)
    if old:
        old.clear()
        old.update(drop)
    else:
        loot.append(dict(drop))
open(P, 'w', encoding='utf8', newline='').write((json.dumps(monsters, ensure_ascii=False, indent=2) + '\n').replace('\n', nl))
print('ok:', len(DROPS), 'monstros com mithril')
