"""Anéis e amuletos aceleraram ~30% o 1 ao 75: XP dos monstros das caçadas até o 75 × 0,7
(volta para ~170 h no caminho perfeito). Rodar uma vez só (marcador .xp_1_75)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, '..', '..', 'shared', 'data')
MARK = os.path.join(HERE, '.xp_1_75')
if os.path.exists(MARK): raise SystemExit('já aplicado')
hunts = json.load(open(os.path.join(D, 'hunts.json'), encoding='utf8'))
mons = json.load(open(os.path.join(D, 'monsters.json'), encoding='utf8'))
lvl = {}
for h in hunts:
    for m in h['monsters']: lvl[m] = max(lvl.get(m, 0), h['level'])
for m in mons:
    if lvl.get(m['id'], 0) <= 75: m['xp'] = max(1, round(m['xp'] * 0.7))
open(os.path.join(D, 'monsters.json'), 'w', encoding='utf8').write(json.dumps(mons, ensure_ascii=False, indent=2) + '\n')
open(MARK, 'w').write('1')
print('ok')
