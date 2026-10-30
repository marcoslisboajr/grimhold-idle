# Corta pela metade a XP dos chefes de instância e de covil do 130 para cima (pedido de 17/10).
# A limpeza (trash) usa monstros das caçadas e não muda. Roda uma vez só (não é idempotente).
#   python scripts/data/cut_boss_xp_130.py
import json
P = 'shared/data/monsters.json'
hunts = json.load(open('shared/data/hunts.json', encoding='utf8'))
mons = json.load(open(P, encoding='utf8'))
ids = {m for h in hunts if (h.get('boss') or h.get('lair')) and h['level'] >= 130 for m in h['monsters']}
n = 0
for m in mons:
    if m['id'] in ids:
        m['xp'] = int(round(m['xp'] * 0.5, -3)); n += 1
with open(P, 'w', encoding='utf8', newline='\n') as f:
    json.dump(mons, f, ensure_ascii=False, indent=2); f.write('\n')
print(n, 'chefes')
