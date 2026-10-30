import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { HUNTS, HUNT_FOCUS, MONSTERS, itemById } from '@grimhold/shared';
import smithing from '../../shared/data/smithing.json' with { type: 'json' };
import crafting from '../../shared/data/crafting.json' with { type: 'json' };

const ROOT = new URL('../../', import.meta.url);
const spriteExists = (s: string) => existsSync(new URL(`client/public/assets/monsters/${s}_1.png`, ROOT));
const worldView = readFileSync(new URL('client/src/world/WorldView.tsx', ROOT), 'utf8');

test('caçadas: monstros, sprites, loot e mapa existem', () => {
  for (const h of HUNTS) {
    assert.ok(new RegExp(`\\b${h.id}:`).test(worldView), `${h.id} sem mapa no WorldView`);
    for (const id of [...h.monsters, ...(h.trash ?? [])]) {
      const m = MONSTERS.find((x) => x.id === id);
      assert.ok(m, `${h.id}: monstro ${id} não existe`);
      assert.ok(spriteExists(m!.sprite), `${id}: sprite ${m!.sprite} não existe`);
      for (const l of m!.loot) assert.ok(l.item === 'gold' || itemById(l.item), `${id}: item ${l.item} não existe`);
    }
  }
});

test('caçadas de chefe: a chave existe e tem receita (forja ou artesanato)', () => {
  const recipes = [...smithing, ...crafting] as { output: string }[];
  for (const h of HUNTS.filter((x) => x.key)) {
    assert.ok(itemById(h.key!), `${h.id}: chave ${h.key} não existe`);
    assert.ok(recipes.some((r) => r.output === h.key), `${h.id}: chave ${h.key} sem receita`);
  }
});

test('caçadas novas: do 130 ao 200 tem XP e loot a cada 10 níveis e um chefe a cada 20', () => {
  for (let L = 130; L <= 200; L += 10) {
    assert.ok(HUNTS.some((h) => h.level === L && h.focus === 'xp'), `falta caçada de XP no ${L}`);
    assert.ok(HUNTS.some((h) => h.level === L && h.focus === 'loot'), `falta caçada de loot no ${L}`);
    if (L % 20 === 0) assert.ok(HUNTS.some((h) => h.level === L && h.boss), `falta chefe no ${L}`);
  }
});

test('foco: XP dá mais XP e menos ouro, peças e drops; loot o inverso; meio-termo no meio', () => {
  const { xp, balanced, loot } = HUNT_FOCUS;
  assert.ok(xp.xp > balanced.xp && balanced.xp > loot.xp);
  for (const k of ['gold', 'gear', 'loot'] as const) assert.ok(xp[k] < balanced[k] && balanced[k] < loot[k], k);
  for (const h of HUNTS.filter((x) => !x.boss && !x.lair)) assert.ok(h.focus && h.focus in HUNT_FOCUS, `${h.id} sem foco`);
  assert.ok(HUNTS.filter((h) => h.focus === 'balanced').length >= 5, 'há caçadas de meio-termo');
});

test('instâncias: todas têm ondas de limpeza, chave com receita e chefe no fim', () => {
  const inst = HUNTS.filter((h) => h.boss);
  assert.ok(inst.length >= 22);
  for (const h of inst) {
    assert.ok(h.trash?.length, `${h.id} sem monstros de limpeza`);
    if (!h.quest) assert.ok(h.key, `${h.id} sem chave`);
  }
});

test('instâncias acima do 200: Cidadela do Vazio, Céu Estilhaçado e Caos Primordial, cada uma mais forte que a anterior', () => {
  const ids = ['ozzarak_end', 'void_citadel', 'shattered_heaven', 'primal_chaos'];
  const hp = (id: string) => HUNTS.find((h) => h.id === id)!.trash!.reduce((a, m) => a + MONSTERS.find((x) => x.id === m)!.hp, 0) / HUNTS.find((h) => h.id === id)!.trash!.length;
  for (let i = 1; i < ids.length; i++) {
    const h = HUNTS.find((x) => x.id === ids[i])!;
    assert.ok(h.boss && h.level > 200 && h.trash!.length >= 4, ids[i]);
    assert.ok(hp(ids[i]) > hp(ids[i - 1]), `${ids[i]} mais forte que ${ids[i - 1]}`);
    // A chave também cai de quem vem antes.
    const prev = HUNTS.find((x) => x.id === (i === 1 ? 'chaos_throne' : ids[i - 1]))!;
    assert.ok([...(prev.trash ?? prev.monsters)].some((m) => MONSTERS.find((x) => x.id === m)!.loot.some((l) => l.item === h.key)), `${h.key} cai antes`);
  }
});

test('sigilos: o monstro do eco aparece numa caçada comum (chefe de instância só cai 1 por vez)', async () => {
  const { HUNTS, RECIPES } = await import('@grimhold/shared');
  for (const r of RECIPES.sigilism) {
    if (!r.kills) continue;
    const ok = HUNTS.some((h) => !h.boss && !h.lair && h.monsters.includes(r.kills!.monster));
    assert.ok(ok, `${r.id}: ${r.kills.monster} não está em nenhuma caçada comum`);
  }
});
