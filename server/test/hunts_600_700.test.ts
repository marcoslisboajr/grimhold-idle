import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { HUNTS, MONSTERS, HUNTING_TASKS, itemById } from '@grimhold/shared';

const ROOT = new URL('../../', import.meta.url);
const spriteExists = (s: string) => existsSync(new URL(`client/public/assets/monsters/${s}_1.png`, ROOT));
const worldView = readFileSync(new URL('client/src/world/WorldView.tsx', ROOT), 'utf8');
const mapTs = readFileSync(new URL('client/src/world/map.ts', ROOT), 'utf8');
const monsterDirs = JSON.parse(readFileSync(new URL('client/src/world/monsterDirs.json', ROOT), 'utf8')) as string[];

const hunts600 = HUNTS.filter((h) => h.level >= 600 && h.level < 700);

test('caçadas 600-700: total de 16 caçadas nas 4 regiões esperadas', () => {
  assert.equal(hunts600.length, 16, 'deve ter exatamente 16 caçadas entre o 600 e 700');
  const regions = new Set(hunts600.map((h) => h.region));
  assert.equal(regions.size, 4, 'deve possuir 4 regiões distintas');
  assert.ok(regions.has('Abismo do Vazio Primordial'));
  assert.ok(regions.has('Planalto dos Titãs'));
  assert.ok(regions.has('Ruínas do Sol Negro'));
  assert.ok(regions.has('Cidadela do Crepúsculo Eterno'));
});

test('caçadas 600-700: cada caçada tem mapa no WorldView e no map.ts', () => {
  for (const h of hunts600) {
    assert.ok(new RegExp(`\\b${h.id}:`).test(worldView), `${h.id} sem mapa no WorldView`);
    assert.ok(new RegExp(`\\b${h.id}:\\s*D\\(`).test(mapTs), `${h.id} sem dungeon no map.ts`);
  }
});

test('caçadas 600-700: monstros existem, têm sprites em disco e 4 lados em monsterDirs.json', () => {
  for (const h of hunts600) {
    for (const monId of h.monsters) {
      const m = MONSTERS.find((x) => x.id === monId);
      assert.ok(m, `monstro ${monId} da caçada ${h.id} deve existir`);
      assert.ok(spriteExists(m!.sprite), `sprite ${m!.sprite} deve existir em disco`);
      assert.ok(monsterDirs.includes(m!.sprite), `sprite ${m!.sprite} deve estar cadastrado com 4 lados em monsterDirs.json`);
      for (const loot of m!.loot) {
        assert.ok(loot.item === 'gold' || itemById(loot.item), `item de loot ${loot.item} deve existir`);
      }
    }
  }
});

test('caçadas 600-700: vida e XP dos monstros crescem com o nível', () => {
  const sorted = [...hunts600].sort((a, b) => a.level - b.level);
  
  // 1. XP médio dos monstros cresce estritamente a cada nível de caçada
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevMons = prev.monsters.map((id) => MONSTERS.find((m) => m.id === id)!);
    const currMons = curr.monsters.map((id) => MONSTERS.find((m) => m.id === id)!);
    const prevAvgXp = prevMons.reduce((s, m) => s + m.xp, 0) / prevMons.length;
    const currAvgXp = currMons.reduce((s, m) => s + m.xp, 0) / currMons.length;
    assert.ok(
      currAvgXp > prevAvgXp,
      `XP médio no nível ${curr.level} (${currAvgXp}) deve ser maior que no nível ${prev.level} (${prevAvgXp})`,
    );
  }

  // 2. Vida e XP médios crescem de região para região sucessiva
  const regionNames = ['Abismo do Vazio Primordial', 'Planalto dos Titãs', 'Ruínas do Sol Negro', 'Cidadela do Crepúsculo Eterno'];
  let lastHp = 0;
  let lastXp = 0;
  for (const reg of regionNames) {
    const rHunts = hunts600.filter((h) => h.region === reg);
    const mons = rHunts.flatMap((h) => h.monsters).map((id) => MONSTERS.find((m) => m.id === id)!);
    const avgHp = mons.reduce((s, m) => s + m.hp, 0) / mons.length;
    const avgXp = mons.reduce((s, m) => s + m.xp, 0) / mons.length;
    assert.ok(avgHp >= lastHp, `HP médio da região ${reg} (${avgHp}) deve ser >= região anterior (${lastHp})`);
    assert.ok(avgXp > lastXp, `XP médio da região ${reg} (${avgXp}) deve ser > região anterior (${lastXp})`);
    lastHp = avgHp;
    lastXp = avgXp;
  }

  // 3. A caçada final (696) tem vida média superior à primeira (605)
  const firstMons = sorted[0].monsters.map((id) => MONSTERS.find((m) => m.id === id)!);
  const lastMons = sorted[sorted.length - 1].monsters.map((id) => MONSTERS.find((m) => m.id === id)!);
  const firstAvgHp = firstMons.reduce((s, m) => s + m.hp, 0) / firstMons.length;
  const lastAvgHp = lastMons.reduce((s, m) => s + m.hp, 0) / lastMons.length;
  assert.ok(lastAvgHp > firstAvgHp * 1.3, `Vida média final (${lastAvgHp}) deve ser substancialmente maior que inicial (${firstAvgHp})`);
});

test('caçadas 600-700: cada caçada possui tarefa de caça correspondente', () => {
  for (const h of hunts600) {
    const task = HUNTING_TASKS.find((t) => t.minLevel === h.level);
    assert.ok(task, `deve haver tarefa para o nível ${h.level} (${h.id})`);
    assert.ok(h.monsters.includes(task!.monsterId), `tarefa ${task!.id} deve ser de um monstro da caçada ${h.id}`);
    assert.ok(task!.goldReward > 24_000_000, 'recompensa em ouro deve ser condizente com nível 600+');
    assert.ok(task!.points >= 385, 'pontos de caçador devem ser condizentes com nível 600+');
  }
});
