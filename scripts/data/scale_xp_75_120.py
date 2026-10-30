"""Endgame (meta b: 1 ao 120 em ~1000 h): multiplica o XP dos monstros das caçadas de nível 72+.
Rodar uma vez só (marcador .xp_75_120)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, '..', '..', 'shared', 'data')
MARK = os.path.join(HERE, '.xp_75_120')
POINTS = [(75, 1.0), (80, 3.5), (90, 5.5), (100, 8.5), (110, 10.0), (120, 12.0)]
def mult(h):
    if h <= POINTS[0][0]: return 1.0
    for (a, ma), (b, mb) in zip(POINTS, POINTS[1:]):
        if h <= b: return ma + (mb - ma) * (h - a) / (b - a)
    return POINTS[-1][1]
if os.path.exists(MARK): raise SystemExit('já aplicado')
hunts = json.load(open(os.path.join(D, 'hunts.json'), encoding='utf8'))
mons = json.load(open(os.path.join(D, 'monsters.json'), encoding='utf8'))
lvl = {}
for h in hunts:
    for m in h['monsters']: lvl[m] = max(lvl.get(m, 0), h['level'])
for m in mons:
    k = mult(lvl.get(m['id'], 0))
    if k != 1.0: m['xp'] = round(m['xp'] * k)
open(os.path.join(D, 'monsters.json'), 'w', encoding='utf8').write(json.dumps(mons, ensure_ascii=False, indent=2) + '\n')
open(MARK, 'w').write('1')
print('ok')
