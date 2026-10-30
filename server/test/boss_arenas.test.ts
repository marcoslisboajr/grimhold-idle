import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIAL_BOSSES, WORLD_BOSSES } from '@grimhold/shared';
import { ARENA_BOSS, ARENA_SLOTS, BOSS_MINION_SPOTS, OBJECTS, bossArenaMap, Ground, walkable } from '../../client/src/world/map.ts';

const bosses = [...WORLD_BOSSES, ...SPECIAL_BOSSES];

test('arenas: todo chefe global tem a sua (menos o Mímico Gigante, do evento)', () => {
  const dragon = JSON.stringify(bossArenaMap('ancient_dragon').objects);
  for (const b of bosses) {
    if (b.id === 'ancient_dragon' || b.id === 'giant_mimic') continue;
    assert.notEqual(JSON.stringify(bossArenaMap(b.id).objects), dragon, `${b.id} ainda cai no Ninho do Dragão`);
  }
});

for (const b of bosses) {
  test(`arena de ${b.name}: nada em cima do chefe, dos jogadores nem dos servos`, () => {
    const m = bossArenaMap(b.id);
    // Tiles cobertos por algum objeto (onde ele bloqueia e o tile onde está).
    const covered = new Set<string>();
    for (const o of m.objects) {
      covered.add(`${o.x},${o.y}`);
      for (const [bx, by] of OBJECTS[o.kind].block) covered.add(`${o.x + bx},${o.y + by}`);
    }
    for (const p of [ARENA_BOSS, ...ARENA_SLOTS]) {
      assert.ok(!covered.has(`${p.x},${p.y}`), `objeto em cima de ${p.x},${p.y}`);
      assert.notEqual(m.ground[p.y * m.w + p.x], Ground.Water, `água em ${p.x},${p.y}`);
    }
    for (const p of ARENA_SLOTS) assert.ok(walkable(m, p.x, p.y), `jogador em ${p.x},${p.y} não pode ficar ali`);
    if (b.minions) {
      for (const s of BOSS_MINION_SPOTS.slice(0, b.minions.count)) {
        const x = ARENA_BOSS.x + s.x;
        const y = ARENA_BOSS.y + s.y;
        assert.ok(!covered.has(`${x},${y}`), `objeto em cima do servo em ${x},${y}`);
      }
    }
  });
}
