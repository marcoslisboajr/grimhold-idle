import test, { mock } from 'node:test';
mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 9, 27, 15) });
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  HUNTS,
  RAID_HUNTS,
  DIFFICULTIES,
  playerStats,
  xpForLevel,
  runCycle,
  simulateHunt,
  huntNode,
} from '@grimhold/shared';
import { openDb, migrateRaidSchema } from '../src/db.ts';

// 1. Caçadas comuns não mudam nada (10 casos que vencem com bônus de equipamento, gerados no commit 9345ea04)
// Inclui instância (general_crypt, falcon_gates), covil (boar_den, goblin_king_hall), bando de 7 (tribal_lands) e 500+ (starlit_rift).
const EXPECTED_HUNTS = [
  {
    huntId: 'river_bank',
    vocation: 'warrior' as const,
    lv: 5,
    seed: 101,
    seq: 0,
    pack: 1,
    bonus: { attack: 15, hp: 50, defense: 5 },
    outcome: 'win',
    xp: 7,
    loot: { gold: 1, 'wood_bow+1': 1 },
    fightMs: 1100,
    damageTaken: 0,
  },
  {
    huntId: 'boar_den',
    vocation: 'devout' as const,
    lv: 25,
    seed: 707,
    seq: 0,
    pack: 1,
    bonus: { attack: 80, hp: 600, defense: 40 },
    outcome: 'win',
    xp: 16875,
    loot: { gold: 16, boss_essence: 1 },
    fightMs: 29700,
    damageTaken: 273,
  },
  {
    huntId: 'general_crypt',
    vocation: 'hunter' as const,
    lv: 50,
    seed: 606,
    seq: 1,
    pack: 3,
    bonus: { attack: 250, hp: 1500, defense: 100 },
    outcome: 'win',
    xp: 754,
    loot: { gold: 56, iron_ore: 1, coal: 1 },
    fightMs: 6000,
    damageTaken: 8,
  },
  {
    huntId: 'tribal_lands',
    vocation: 'arcanist' as const,
    lv: 40,
    seed: 202,
    seq: 1,
    pack: 7,
    bonus: { attack: 350, hp: 1600, defense: 120 },
    outcome: 'win',
    xp: 186,
    loot: { gold: 37, leather: 2, fang: 6, wolf_pelt: 6, bone: 2, iron_axe: 1 },
    fightMs: 9100,
    damageTaken: 3,
  },
  {
    huntId: 'goblin_king_hall',
    vocation: 'warrior' as const,
    lv: 30,
    seed: 505,
    seq: 0,
    pack: 5,
    bonus: { attack: 120, hp: 900, defense: 80 },
    outcome: 'win',
    xp: 171,
    loot: { gold: 5, goblin_ear: 2, feather: 1 },
    fightMs: 5500,
    damageTaken: 9,
  },
  {
    huntId: 'orc_fortress',
    vocation: 'hunter' as const,
    lv: 35,
    seed: 303,
    seq: 2,
    pack: 3,
    bonus: { attack: 180, hp: 1100, defense: 90 },
    outcome: 'win',
    xp: 455,
    loot: { orc_tusk: 1 },
    fightMs: 6000,
    damageTaken: 7,
  },
  {
    huntId: 'ember_peak',
    vocation: 'devout' as const,
    lv: 45,
    seed: 404,
    seq: 0,
    pack: 1,
    bonus: { attack: 260, hp: 1400, defense: 110 },
    outcome: 'win',
    xp: 112,
    loot: { gold: 51, feather: 4 },
    fightMs: 2200,
    damageTaken: 1,
  },
  {
    huntId: 'valdeferro_walls',
    vocation: 'warrior' as const,
    lv: 250,
    seed: 909,
    seq: 0,
    pack: 1,
    bonus: { attack: 3500, hp: 18000, defense: 1500 },
    outcome: 'win',
    xp: 106657012,
    loot: {},
    fightMs: 3300,
    damageTaken: 2,
  },
  {
    huntId: 'falcon_gates',
    vocation: 'hunter' as const,
    lv: 260,
    seed: 1010,
    seq: 3,
    pack: 5,
    bonus: { attack: 4500, hp: 22000, defense: 1800 },
    outcome: 'win',
    xp: 1270522400,
    loot: { gold: 2977, falcon_insignia: 1 },
    fightMs: 12000,
    damageTaken: 26,
  },
  {
    huntId: 'starlit_rift',
    vocation: 'arcanist' as const,
    lv: 520,
    seed: 1111,
    seq: 0,
    pack: 1,
    bonus: { attack: 18000, hp: 70000, defense: 5000 },
    outcome: 'win',
    xp: 7306055762,
    loot: {},
    fightMs: 3900,
    damageTaken: 4,
  },
];

test('etapa 1: caçadas comuns idênticas (10 casos com vitória garantida, incluindo instância, covil, bando de 7 e 500+)', () => {
  for (const exp of EXPECTED_HUNTS) {
    const hunt = HUNTS.find((h) => h.id === exp.huntId)!;
    const player = playerStats(exp.vocation, xpForLevel(exp.lv), exp.bonus);
    const cycle = runCycle(hunt, player, exp.seed, exp.seq, DIFFICULTIES[0], exp.pack);
    assert.equal(cycle.outcome, exp.outcome, `${exp.huntId} outcome`);
    assert.equal(cycle.xp, exp.xp, `${exp.huntId} xp`);
    assert.deepEqual(cycle.loot, exp.loot, `${exp.huntId} loot`);
    assert.equal(cycle.fightMs, exp.fightMs, `${exp.huntId} fightMs`);
    assert.equal(cycle.damageTaken, exp.damageTaken, `${exp.huntId} damageTaken`);
  }
});

test('etapa 1: Raide II idêntica nas 3 fases (comportamento e golpes de antes da refatoração)', () => {
  const raidHunt = RAID_HUNTS[0];
  const p = playerStats('warrior', xpForLevel(450), { attack: 400_000, defense: 6000, hp: 500_000 }, null, [], {}, {});
  p.resistPct = { energy: 0.8 };

  // Fase 1: Escudo (-50% dano até levar 15% HP)
  const c1 = runCycle(raidHunt, p, 777, 0, DIFFICULTIES[0], 1);
  assert.equal(c1.outcome, 'win');
  assert.equal(c1.fightMs, 27500);
  assert.equal(c1.damageTaken, 19);
  assert.deepEqual(c1.monsters.map((m) => m.id), ['raid_usurper_1']);
  assert.equal(c1.hits.length, 44);

  // Fase 2: Invocação de guardas (ondas a cada 20s, até 3 ondas)
  const c2 = runCycle(raidHunt, p, 777, 1, DIFFICULTIES[0], 1);
  assert.equal(c2.outcome, 'win');
  assert.equal(c2.fightMs, 37400);
  assert.equal(c2.damageTaken, 53);
  assert.deepEqual(c2.monsters.map((m) => m.id), ['raid_usurper_2', 'raid_usurper_guard', 'raid_usurper_guard', 'raid_usurper_guard']);
  assert.equal(c2.hits.length, 88);

  // Fase 3: Golpe de energia (burst e dot periódico)
  const c3 = runCycle(raidHunt, p, 777, 2, DIFFICULTIES[0], 1);
  assert.equal(c3.outcome, 'win');
  assert.equal(c3.fightMs, 25300);
  assert.equal(c3.damageTaken, 32370);
  assert.deepEqual(c3.monsters.map((m) => m.id), ['raid_usurper_3']);
  assert.equal(c3.hits.length, 49);
});

test('etapa 1: duas raides não se misturam no raid_clears, e a migração mantém as linhas antigas', () => {
  // 1. Isolamento de duas raides na mesma conta e semana
  const db = openDb(':memory:');
  const accountId = db.accountForToken(db.createGuest())!;
  const c = db.createCharacter(accountId, 'Hero', 'warrior');

  // Limpa fase 1 da raid_usurper
  db.markRaidPhaseClear(c.id, '2026-W43', 'raid_usurper', 1, true, false, 1000);
  assert.equal(db.hasRaidPhaseClear(c.id, '2026-W43', 'raid_usurper', 1), true);
  assert.equal(db.hasRaidPhaseClear(c.id, '2026-W43', 'raid_souls', 1), false);
  assert.deepEqual(db.raidClearsFor(c.id, '2026-W43', 'raid_usurper'), [1]);
  assert.deepEqual(db.raidClearsFor(c.id, '2026-W43', 'raid_souls'), []);

  // Limpa fase 1 da raid_souls na mesma semana
  db.markRaidPhaseClear(c.id, '2026-W43', 'raid_souls', 1, false, false, 2000);
  assert.equal(db.hasRaidPhaseClear(c.id, '2026-W43', 'raid_usurper', 1), true);
  assert.equal(db.hasRaidPhaseClear(c.id, '2026-W43', 'raid_souls', 1), true);
  assert.deepEqual(db.raidClearsFor(c.id, '2026-W43', 'raid_usurper'), [1]);
  assert.deepEqual(db.raidClearsFor(c.id, '2026-W43', 'raid_souls'), [1]);

  // Pity independente por raide
  db.setRaidPity(c.id, 'raid_usurper', 4);
  db.setRaidPity(c.id, 'raid_souls', 1);
  assert.equal(db.raidPityFor(c.id, 'raid_usurper'), 4);
  assert.equal(db.raidPityFor(c.id, 'raid_souls'), 1);

  // 2. Migração de dados de schema legado
  const rawDb = new DatabaseSync(':memory:');
  rawDb.exec(`
    CREATE TABLE characters (id INTEGER PRIMARY KEY);
    INSERT INTO characters (id) VALUES (1);
    CREATE TABLE raid_clears (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      week         TEXT NOT NULL,
      raid_id      TEXT NOT NULL,
      phase        INTEGER NOT NULL,
      is_solo      INTEGER NOT NULL DEFAULT 0,
      got_piece    INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      PRIMARY KEY (character_id, week, phase)
    );
    CREATE TABLE raid_pity (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      weeks_failed INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO raid_clears (character_id, week, raid_id, phase, is_solo, got_piece, created_at)
    VALUES (1, '2026-W42', 'raid_usurper', 1, 1, 0, 12345),
           (1, '2026-W42', 'raid_usurper', 2, 1, 0, 12346);
    INSERT INTO raid_pity (character_id, weeks_failed) VALUES (1, 3);
  `);

  migrateRaidSchema(rawDb);

  // Linhas antigas preservadas com raid_id default
  const clears = rawDb.prepare(`SELECT * FROM raid_clears ORDER BY phase`).all() as any[];
  assert.equal(clears.length, 2);
  assert.equal(clears[0].raid_id, 'raid_usurper');
  assert.equal(clears[0].phase, 1);
  assert.equal(clears[1].phase, 2);

  const pity = rawDb.prepare(`SELECT * FROM raid_pity WHERE character_id = 1`).all() as any[];
  assert.equal(pity.length, 1);
  assert.equal(pity[0].raid_id, 'raid_usurper');
  assert.equal(pity[0].weeks_failed, 3);

  // Agora permite outra raide na mesma semana e mesma fase sem colisão de chave primária
  rawDb.prepare(`
    INSERT INTO raid_clears (character_id, week, raid_id, phase, is_solo, got_piece, created_at)
    VALUES (1, '2026-W42', 'raid_souls', 1, 0, 0, 12347)
  `).run();

  const clearsUpdated = rawDb.prepare(`SELECT * FROM raid_clears WHERE week = '2026-W42'`).all();
  assert.equal(clearsUpdated.length, 3);
});

test('etapa 1: raidRanking exige a fase final (phases.length) e só com fase 2 o ranking vem vazio', () => {
  const db = openDb(':memory:');
  const acc = db.accountForToken(db.createGuest())!;
  const c1 = db.createCharacter(acc, 'GuerreiroFase2', 'warrior');
  const week = '2026-W43';

  // Registra clear da fase 1 e fase 2 (mas não fase 3)
  db.markRaidPhaseClear(c1.id, week, 'raid_usurper', 1, false, false, 1000);
  db.markRaidPhaseClear(c1.id, week, 'raid_usurper', 2, false, false, 2000);

  // O ranking deve vir vazio, mesmo havendo registros com fase 2 (que seria o MAX(phase) no banco)
  const ranking = db.raidRanking(week, 'raid_usurper');
  assert.equal(ranking.length, 0);

  // Agora registra a fase 3 (fase final)
  db.markRaidPhaseClear(c1.id, week, 'raid_usurper', 3, true, true, 3000);
  const rankingAfter = db.raidRanking(week, 'raid_usurper');
  assert.equal(rankingAfter.length, 1);
  assert.equal(rankingAfter[0].name, 'GuerreiroFase2');
  assert.equal(rankingAfter[0].solo, true);
  assert.equal(rankingAfter[0].at, 3000);
});

test('etapa 1: a raide começa na fase 1 e passa pelas fases na ordem', () => {
  const r = simulateHunt(
    { skill: 'combat', node: huntNode('raid_usurper', 'normal', 1), since: 0, seed: 7, seq: 0 },
    3_600_000,
    {
      vocation: 'warrior',
      combatXp: xpForLevel(450),
      bank: {},
      bonus: { attack: 2_000_000, defense: 5000, hp: 500_000 },
    },
  );
  assert.deepEqual(r.gains.raidPhases, [1, 2, 3]);
  assert.equal(r.gains.cleared, 'raid_usurper');
  assert.equal(r.ended, true);
});
