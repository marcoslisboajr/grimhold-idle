import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  equipmentBonus,
  BOSSES,
  BOSSTIARY_MAX_LEVEL,
  BOSS_HP_PER_PLAYER,
  DIFFICULTIES,
  HUNTS,
  WORLD_BOSSES,
  XP_TABLE,
  boostedChance,
  bossEntry,
  bossPoints,
  bossReward,
  bossStage,
  bosstiaryBonus,
  bosstiaryLevel,
  bosstiaryPoints,
  bosstiaryPointsFor,
  playerStats,
  runCycle,
  worldBossKey,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { createWorldBoss } from '../src/worldboss.ts';

test('bosstiary: lista todos os chefes (instâncias, covis e mundiais) sem repetir', () => {
  const keys = new Set(BOSSES.map((b) => b.key));
  assert.equal(keys.size, BOSSES.length);
  for (const h of HUNTS.filter((x) => x.lair)) assert.equal(bossEntry(h.monsters[0])?.kind, 'lair', h.id);
  // Chefe de instância que também é monstro comum (caçada ou ondas) não tem ficha.
  const common = new Set(HUNTS.flatMap((h) => [...(h.trash ?? []), ...(h.boss || h.lair ? [] : h.monsters)]));
  for (const h of HUNTS.filter((x) => x.boss)) for (const m of h.monsters) assert.equal(!!bossEntry(m), !common.has(m), `${h.id}: ${m}`);
  for (const m of ['ice_witch', 'frost_dragon', 'lord_demon']) assert.equal(bossEntry(m), undefined, m);
  for (const w of WORLD_BOSSES) assert.equal(bossEntry(worldBossKey(w.id))?.kind, 'world', w.id);
});

test('bosstiary: etapas, pontos e nível', () => {
  const lair = BOSSES.find((b) => b.kind === 'lair')!;
  const world = BOSSES.find((b) => b.kind === 'world')!;
  assert.deepEqual([0, 1, 9, 10, 49, 50, 999].map((n) => bossStage(lair, n)), [0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual([0, 1, 5, 20].map((n) => bossStage(world, n)), [0, 1, 2, 3]);
  assert.ok(bossPoints(lair, 50) > bossPoints(lair, 10) && bossPoints(lair, 10) > bossPoints(lair, 1) && bossPoints(lair, 1) > 0);
  // Chefe mais forte vale mais.
  const weak = BOSSES.filter((b) => b.kind !== 'world').at(0)!;
  const strong = BOSSES.filter((b) => b.kind !== 'world').at(-1)!;
  assert.ok(bossPoints(strong, 1) > bossPoints(weak, 1));
  // Nível sobe com os pontos, nunca passa do teto, e o teto só vem perto de completar tudo.
  let last = 0;
  for (let p = 0; p <= 20_000; p += 50) {
    const l = bosstiaryLevel(p);
    assert.ok(l >= last && l <= BOSSTIARY_MAX_LEVEL);
    last = l;
  }
  const all = Object.fromEntries(BOSSES.map((b) => [b.key, 9999]));
  assert.equal(bosstiaryLevel(bosstiaryPoints(all)), BOSSTIARY_MAX_LEVEL);
  const firstOfEach = Object.fromEntries(BOSSES.map((b) => [b.key, 1]));
  assert.ok(bosstiaryLevel(bosstiaryPoints(firstOfEach)) < BOSSTIARY_MAX_LEVEL / 2, 'uma vitória em cada não chega na metade');
  assert.ok(bosstiaryPointsFor(BOSSTIARY_MAX_LEVEL) <= bosstiaryPoints(all));
});

test('bosstiary: bônus com teto, contagem inválida não quebra, lendário recebe metade', () => {
  const all = Object.fromEntries(BOSSES.map((b) => [b.key, 9999]));
  const max = bosstiaryBonus(all);
  assert.ok(max.loot > 0.2 && max.loot <= 0.25, `loot ${max.loot}`);
  assert.ok(max.xp > 0.1 && max.xp <= 0.15, `xp ${max.xp}`);
  assert.deepEqual(bosstiaryBonus({}), { loot: 0, xp: 0 });
  const junk = { [BOSSES[0].key]: NaN, [BOSSES[1].key]: -5, [BOSSES[2].key]: Infinity, 'monstro-que-nao-existe': 99 } as Record<string, number>;
  const b = bosstiaryBonus(junk);
  assert.ok(Number.isFinite(b.loot) && Number.isFinite(b.xp));
  assert.equal(boostedChance(0.1, { loot: 0.2, xp: 0 }, false), 0.1 * 1.2);
  assert.equal(boostedChance(0.1, { loot: 0.2, xp: 0 }, true), 0.1 * 1.1);
  assert.equal(boostedChance(0.95, { loot: 0.25, xp: 0 }, false), 1);
  assert.equal(boostedChance(0.1, { loot: NaN, xp: 0 }, false), 0.1);
  assert.equal(boostedChance(0.1, undefined, false), 0.1);
});

test('bosstiary: na luta de chefe dá mais XP e mais drop; na caçada comum não muda nada', () => {
  const lair = HUNTS.find((h) => h.id === 'boar_den')!;
  const p = playerStats('warrior', XP_TABLE[25], equipmentBonus({ weapon: 'iron_sword+3#5', armor: 'iron_armor+3#5', helmet: 'iron_helmet+3#5', legs: 'iron_legs+3#5', boots: 'iron_boots+3#5' })); // covil mais duro: no nível, com Épico +5
  const bonus = { loot: 0.25, xp: 0.15 };
  let xpA = 0;
  let xpB = 0;
  let dropsA = 0;
  let dropsB = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const a = runCycle(lair, p, seed, 0, DIFFICULTIES[0], 1);
    const b = runCycle(lair, p, seed, 0, DIFFICULTIES[0], 1, {}, [], [], undefined, undefined, undefined, {}, bonus);
    assert.equal(a.outcome, b.outcome, 'o bônus não muda a luta');
    assert.equal(a.fightMs, b.fightMs);
    xpA += a.xp;
    xpB += b.xp;
    dropsA += Object.entries(a.loot).filter(([id]) => id !== 'gold').reduce((s, [, q]) => s + q, 0);
    dropsB += Object.entries(b.loot).filter(([id]) => id !== 'gold').reduce((s, [, q]) => s + q, 0);
  }
  assert.ok(Math.abs(xpB / xpA - 1.15) < 0.01, `XP ${xpA} → ${xpB}`);
  assert.ok(dropsB > dropsA, `drops ${dropsA} → ${dropsB}`);
  // Caçada comum: igualzinho com ou sem bônus.
  const hunt = HUNTS.find((h) => !h.boss && !h.lair && h.level >= 20)!;
  for (let seed = 1; seed <= 20; seed++) {
    const a = runCycle(hunt, p, seed, 0, DIFFICULTIES[0], 3);
    const b = runCycle(hunt, p, seed, 0, DIFFICULTIES[0], 3, {}, [], [], undefined, undefined, undefined, {}, bonus);
    assert.deepEqual(b, a);
  }
});

test('bosstiary: chefe mundial com bônus dá mais XP e os mesmos sorteios sem bônus', () => {
  const b = WORLD_BOSSES[0];
  const none = bossReward(b, 7, 3, 60, BOSS_HP_PER_PLAYER, true, false);
  const zero = bossReward(b, 7, 3, 60, BOSS_HP_PER_PLAYER, true, false, BOSS_HP_PER_PLAYER, { loot: 0, xp: 0 });
  assert.deepEqual(zero, none);
  const up = bossReward(b, 7, 3, 60, BOSS_HP_PER_PLAYER, true, false, BOSS_HP_PER_PLAYER, { loot: 0.25, xp: 0.15 });
  assert.ok(Math.abs(up.xp - none.xp * 1.15) <= 1, 'XP 15% maior (arredondamento)');
  assert.equal(up.gold, none.gold);
  const junk = bossReward(b, 7, 3, 60, BOSS_HP_PER_PLAYER, true, false, BOSS_HP_PER_PLAYER, { loot: NaN, xp: Infinity });
  assert.ok(Number.isFinite(junk.xp));
});

test('bosstiary: vencer o chefe mundial conta uma vitória para quem bateu', () => {
  const LONG = 15 * 60_000;
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game, { everyMs: LONG * 4, durationMs: LONG });
  const make = (name: string, level: number) => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, name, 'warrior');
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
    return c.id;
  };
  const strong = make('Forte', 90);
  const idle = make('Parado', 90);
  const t0 = LONG * 4;
  boss.tick(t0);
  boss.join(strong, t0);
  let results: ReturnType<typeof boss.tick>['results'] = [];
  for (let t = t0 + 1000; t <= t0 + LONG && results.length === 0; t += 1000) results = boss.tick(t).results;
  assert.ok(results.find((r) => r.characterId === strong)?.killed, 'o chefe caiu');
  const key = Object.keys(db.bestiaryFor(strong)).find((k) => k.startsWith('wb:'));
  assert.ok(key && bossEntry(key)?.kind === 'world', `vitória registrada (${JSON.stringify(db.bestiaryFor(strong))})`);
  assert.equal(db.bestiaryFor(strong)[key!], 1);
  assert.equal(Object.keys(db.bestiaryFor(idle)).length, 0, 'quem não lutou não ganha');
  assert.ok(bosstiaryPoints(db.bestiaryFor(strong)) > 0);
});

test('bestiário: as espécies da limpeza das instâncias também entram (com o nível da instância)', async () => {
  const { HUNTS, monsterLevel, bossEntry } = await import('@grimhold/shared');
  for (const h of HUNTS) for (const m of h.trash ?? []) {
    if (bossEntry(m)) continue;
    assert.ok(monsterLevel(m) >= h.level, `${m}: ${monsterLevel(m)}`);
  }
});
