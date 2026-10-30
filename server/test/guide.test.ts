import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUIDE_LEVELS, ITEMS, VOCATIONS, guideFor, guideKinds, isReliable, itemById, itemSources, itemUses } from '@grimhold/shared';
import { cityMap, walkable, GUIDE_NPC_POS, REFINERY_NPC_POS } from '../../client/src/world/map.ts';

test('guia de classes: cada peça serve na vocação e no nível, e tem de onde vir', () => {
  for (const v of VOCATIONS) {
    let lastWeapon = 0;
    for (const level of GUIDE_LEVELS) {
      const picks = guideFor(v.id, level);
      const weapon = picks.find((p) => p.slot === 'weapon')?.options.find((o) => o.kinds.includes('craft'))?.item;
      assert.ok(weapon, `${v.id} ${level}: tem arma`);
      for (const p of picks) {
        assert.equal(new Set(p.options.map((o) => o.item.id)).size, p.options.length, 'sem peça repetida');
        for (const { item: it, kinds, rare } of p.options) {
          for (const kind of kinds) assert.ok(guideKinds(it.id).has(kind), `${it.id} é mesmo de ${kind}`);
          assert.equal(rare, !isReliable(it.id));
          assert.equal(it.equip?.slot, p.slot, `${it.id} no espaço certo`);
          assert.ok(it.equip!.level <= level, `${it.id} não passa do nível ${level}`);
          assert.ok(!it.equip!.vocations || it.equip!.vocations.includes(v.id), `${it.id} serve em ${v.id}`);
          assert.ok(itemSources(it.id).length > 0, `${it.id} tem de onde vir`);
        }
      }
      // Subir de nível nunca troca a arma por uma pior.
      const atk = weapon!.equip!.attack ?? 0;
      assert.ok(atk >= lastWeapon, `${v.id} ${level}: arma não piora`);
      lastWeapon = atk;
    }
  }
});

test('guia de classes: materiais das receitas existem e têm de onde vir', () => {
  const missing = new Set<string>();
  for (const v of VOCATIONS) {
    for (const level of GUIDE_LEVELS) {
      for (const p of guideFor(v.id, level)) {
        for (const s of p.options.flatMap((o) => itemSources(o.item.id))) {
          if (s.kind !== 'craft') continue;
          for (const id of Object.keys(s.inputs)) {
            assert.ok(itemById(id), `material ${id} existe`);
            if (!itemSources(id).length) missing.add(id);
          }
        }
      }
    }
  }
  assert.deepEqual([...missing], [], 'material sem fonte');
});

test('NPC Guia: na cidade, num lugar só dele e com chão para chegar perto', () => {
  const m = cityMap();
  const guide = m.npcs?.find((n) => n.id === 'guide');
  assert.ok(guide, 'o Guia está na cidade');
  assert.deepEqual({ x: guide!.x, y: guide!.y }, GUIDE_NPC_POS);
  assert.equal(m.npcs!.filter((n) => n.x === guide!.x && n.y === guide!.y).length, 1, 'ninguém no mesmo tile');
  const near = [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => walkable(m, guide!.x + dx, guide!.y + dy));
  assert.ok(near, 'dá para chegar perto');
});

test('guia de classes: do 30 em diante, todo espaço tem peça de drop e de fazer da faixa do nível', () => {
  const gaps: string[] = [];
  for (const v of VOCATIONS) {
    for (const level of GUIDE_LEVELS.filter((l) => l >= 30)) {
      for (const p of guideFor(v.id, level)) {
        for (const kind of ['drop', 'craft'] as const) {
          const o = p.options.find((x) => x.kinds.includes(kind));
          // Receitas vão até o 160 (joias até o 140): acima disso só o drop acompanha o nível.
          const top = kind === 'craft' ? Math.min(level, p.slot === 'amulet' || p.slot === 'ring' ? 140 : 160) : level;
          // Acima do 250 o drop vem a cada 50 níveis.
          if (!o || o.item.equip!.level < top - (top > 250 ? 50 : 25)) gaps.push(`${v.id} ${level} ${p.slot} ${kind}: ${o?.item.id ?? '-'}`);
        }
      }
    }
  }
  assert.deepEqual(gaps, []);
});

test('guia: busca de item acha de onde vem tudo (nenhum item sem fonte)', () => {
  const none = ITEMS.filter((i) => i.id !== 'gold' && !itemSources(i.id).length).map((i) => i.id).sort();
  assert.deepEqual(none, []);
  assert.ok(itemSources('ferathos_blade').some((s) => s.kind === 'pouch'));
});

test('guia: "serve para" mostra receitas, imbuements e a instância que a chave abre', () => {
  assert.ok(itemUses('kharvos_blade').some((u) => u.kind === 'recipe'), 'peça da arma divina vira receita');
  assert.ok(itemUses('shadow_claw').some((u) => u.kind === 'imbuement'), 'material de imbuement');
  assert.ok(itemUses('goblin_key').some((u) => u.kind === 'key'), 'chave abre instância');
  assert.deepEqual(itemUses('demon_horn'), [], 'loot sem uso');
});

test('NPC Vulcanus: na entrada da praça, num lugar só dele e com chão para chegar perto', () => {
  const m = cityMap();
  const v = m.npcs?.find((n) => n.id === 'refinery');
  assert.ok(v, 'o Vulcanus está na cidade');
  assert.deepEqual({ x: v!.x, y: v!.y }, REFINERY_NPC_POS);
  assert.equal(m.npcs!.filter((n) => n.x === v!.x && n.y === v!.y).length, 1, 'ninguém no mesmo tile');
  assert.ok([[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => walkable(m, v!.x + dx, v!.y + dy)), 'dá para chegar perto');
  // Perto de onde se chega na cidade (o começo do mapa).
  assert.ok(Math.abs(v!.x - m.start.x) + Math.abs(v!.y - m.start.y) <= 4, 'na entrada');
});

test('NPCs da cidade: todo sprite existe na pasta (o Vulcanus ficou invisível por um sprite que não existia)', async () => {
  const { existsSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const dir = fileURLToPath(new URL('../../client/public/assets/npcs/', import.meta.url));
  const missing = (cityMap().npcs ?? []).filter((n) => !existsSync(`${dir}${n.sprite}/${n.face ?? 'down'}_stand.png`)).map((n) => `${n.id}:${n.sprite}`);
  assert.deepEqual(missing, []);
});
