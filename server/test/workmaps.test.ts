import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NODES, RECIPES } from '@grimhold/shared';
import { OBJECTS, walkable, workMapFor, workSlots } from '../../client/src/world/map.ts';

test('mapas de profissão: nenhum objeto fica na frente do mascote (atrás do personagem)', () => {
  const cases: [string, string][] = [['smithing', 'bronze_bar']];
  for (const [sk, list] of Object.entries(NODES)) for (const n of list) cases.push([sk, n.id]);
  for (const [sk, list] of Object.entries(RECIPES)) cases.push([sk, list[0].id]);
  for (const [sk, node] of cases) {
    const m = workMapFor(sk, node);
    if (!m?.work) continue;
    const { spot, face } = m.work;
    const px = spot.x + (face === 'left' ? 1 : -1);
    for (const o of m.objects) {
      const d = OBJECTS[o.kind];
      const covers = [spot.y, spot.y - 1].some((cy) => px >= o.x && px < o.x + d.w && cy >= o.y && cy < o.y + d.h);
      assert.ok(!(covers && o.y + d.h - 1 >= spot.y), `${sk}/${node}: ${o.kind} em (${o.x},${o.y}) cobre o mascote`);
    }
  }
});

test('mapas de profissão: os outros jogadores trabalham em lugares próprios, sem um em cima do outro', () => {
  const cases: [string, string][] = [['smithing', 'bronze_bar']];
  for (const [sk, list] of Object.entries(NODES)) for (const n of list) cases.push([sk, n.id]);
  for (const [sk, list] of Object.entries(RECIPES)) cases.push([sk, list[0].id]);
  for (const [sk, node] of cases) {
    const m = workMapFor(sk, node);
    if (!m?.work) continue;
    const slots = workSlots(m);
    assert.ok(slots.length >= 3, `${sk}/${node}: só ${slots.length} lugares`);
    const { spot, face, target } = m.work;
    const pet = { x: spot.x + (face === 'left' ? 1 : -1), y: spot.y };
    slots.forEach((t, i) => {
      assert.ok(walkable(m, t.x, t.y), `${sk}/${node}: lugar ${t.x},${t.y} não dá para pisar`);
      assert.ok(Math.abs(t.x - spot.x) + Math.abs(t.y - spot.y) >= 3, `${sk}/${node}: colado no personagem`);
      assert.ok(!(t.x === pet.x && t.y === pet.y), `${sk}/${node}: em cima do mascote`);
      assert.ok(Math.abs(t.x - target.x) + Math.abs(t.y - target.y) <= 8, `${sk}/${node}: longe do alvo`);
      for (const u of slots.slice(i + 1)) assert.ok(Math.abs(u.x - t.x) + Math.abs(u.y - t.y) >= 3, `${sk}/${node}: dois colados`);
    });
  }
});

test('pesca: nenhum objeto na frente de onde o personagem joga a linha (pescava na madeira do cais)', () => {
  for (const n of NODES.fishing) {
    const m = workMapFor('fishing', n.id);
    if (!m?.work) continue;
    const { spot, face } = m.work;
    const dx = face === 'left' ? -1 : 1;
    // A linha vai até 3 tiles à frente, na altura do personagem e uma acima.
    for (let k = 1; k <= 3; k++) {
      for (const cy of [spot.y, spot.y - 1]) {
        const cx = spot.x + dx * k;
        const hit = m.objects.find((o) => cx >= o.x && cx < o.x + OBJECTS[o.kind].w && cy >= o.y && cy < o.y + OBJECTS[o.kind].h);
        assert.ok(!hit, `${n.id}: ${hit?.kind} em (${hit?.x},${hit?.y}) na frente da linha`);
      }
    }
  }
});
