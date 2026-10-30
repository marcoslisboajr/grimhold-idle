import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { PartyManager } from '../src/party.ts';
import {
  RAID_ID,
  SOUL_RAID_ID,
  raidById,
  weekOf,
  nextWeekResetAt,
  rollRaidPhaseReward,
  RAID_MIN_LEVEL,
  RAID_FRAGMENT_ID,
  RAID_SET_ITEMS,
  RAID_SHOP_SET_COST,
  RAID_CHEST_COST,
  RAID_CHEST_GOLD,
  RAID_CHEST_WEEKLY_LIMIT,
  runCycle,
  playerStats,
  xpForLevel,
  simulateHunt,
  huntNode,
} from '@grimhold/shared';
import { RAID_HUNTS, RAID_MONSTERS } from '../../shared/src/raids.ts';

function createTestChar(db: ReturnType<typeof openDb>, name: string, level = 400) {
  const accountId = db.accountForToken(db.createGuest())!;
  const char = db.createCharacter(accountId, name, 'warrior');
  if (level > 1) {
    db.applyGains(char.id, { actions: 0, items: {}, xp: { combat: xpForLevel(level) } }, 0, 0);
  }
  return char.id;
}

test('semana da raide: vira na segunda-feira às 00:00 BRT (03:00 UTC)', () => {
  // Segunda-feira 2026-10-19 02:59 UTC (domingo 23:59 BRT) -> semana de 2026-10-12
  const domNoite = Date.UTC(2026, 9, 19, 2, 59, 0);
  assert.equal(weekOf(domNoite), '2026-10-12');

  // Segunda-feira 2026-10-19 03:00 UTC (segunda 00:00 BRT) -> semana de 2026-10-19
  const segMeiaNoite = Date.UTC(2026, 9, 19, 3, 0, 0);
  assert.equal(weekOf(segMeiaNoite), '2026-10-19');

  // Próximo reset semanal a partir de domingo noite é a própria segunda 03:00 UTC
  const nextReset = nextWeekResetAt(domNoite);
  assert.equal(nextReset, segMeiaNoite);
});

test('recompensa de raide: grupo ganha valor cheio e solo ganha metade', () => {
  // Fase 1: 100k ouro, 3 frags (solo: 50k ouro, 1 frag)
  const rewGroup1 = rollRaidPhaseReward(12345, 1, 'raid_usurper', 1, false, 0);
  assert.equal(rewGroup1.items.gold, 100_000);
  assert.equal(rewGroup1.items[RAID_FRAGMENT_ID], 3);

  const rewSolo1 = rollRaidPhaseReward(12345, 1, 'raid_usurper', 1, true, 0);
  assert.equal(rewSolo1.items.gold, 50_000);
  assert.equal(rewSolo1.items[RAID_FRAGMENT_ID], 1);

  // Fase 2: 150k ouro, 4 frags (solo: 75k ouro, 2 frags)
  const rewGroup2 = rollRaidPhaseReward(12345, 1, 'raid_usurper', 2, false, 0);
  assert.equal(rewGroup2.items.gold, 150_000);
  assert.equal(rewGroup2.items[RAID_FRAGMENT_ID], 4);

  const rewSolo2 = rollRaidPhaseReward(12345, 1, 'raid_usurper', 2, true, 0);
  assert.equal(rewSolo2.items.gold, 75_000);
  assert.equal(rewSolo2.items[RAID_FRAGMENT_ID], 2);

  // Fase 3: 250k ouro, 6 frags (solo: 125k ouro, 3 frags)
  const rewGroup3 = rollRaidPhaseReward(12345, 1, 'raid_usurper', 3, false, 0);
  assert.equal(rewGroup3.items.gold, 250_000);
  assert.equal(rewGroup3.items[RAID_FRAGMENT_ID], 6);

  const rewSolo3 = rollRaidPhaseReward(12345, 1, 'raid_usurper', 3, true, 0);
  assert.equal(rewSolo3.items.gold, 125_000);
  assert.equal(rewSolo3.items[RAID_FRAGMENT_ID], 3);
});

test('piedade da fase 3: acumula +5% por semana e garante eventual drop', () => {
  // Com 20 semanas de piedade acumulada (+100%), o drop é garantido (112% > 100%)
  const rewGuaranteed = rollRaidPhaseReward(12345, 1, 'raid_usurper', 3, false, 20);
  assert.equal(rewGuaranteed.gotPiece, true);
  const foundPiece = RAID_SET_ITEMS.some((id) => (rewGuaranteed.items[id] ?? 0) > 0);
  assert.equal(foundPiece, true);
});

test('nível mínimo para entrar na raide é 400', () => {
  const r = raidById('raid_usurper')!;
  const prev = r.enabled;
  r.enabled = true;
  try {
    const db = openDb(':memory:');
    const game = createGame(db);
    const now = Date.now();

    const charId = createTestChar(db, 'SubLevelHero', 390);

    const err = game.start(charId, 'combat', 'raid_usurper', now);
    assert.match(err ?? '', /400\+/);

    // Sobe para 400
    db.applyGains(charId, { actions: 0, items: {}, xp: { combat: xpForLevel(400) - xpForLevel(390) } }, 0, 0);
    const ok = game.start(charId, 'combat', 'raid_usurper', now);
    assert.equal(ok, null);
  } finally {
    r.enabled = prev;
  }
});

test('fúria mata ao passar de 180s (3 minutos)', () => {
  const p = playerStats('warrior', xpForLevel(410), { defense: 9999, hp: 99999 });
  // Sem armas para a luta se estender até os 180s
  p.attack = 0;

  const cycle = runCycle(
    RAID_HUNTS[0],
    p,
    12345,
    0,
    { id: 'normal', name: 'Normal', level: 0, xp: 1 },
    1,
  );

  assert.equal(cycle.outcome, 'draw');
  const lastHit = cycle.hits[cycle.hits.length - 1];
  assert.equal(lastHit.t, 180_000);
});

test('golpe da fase 3 mata quem não tem resistência a energia no burst', () => {
  // Jogador com 0 de resistência a energia na fase 3
  const pUnres = playerStats('warrior', xpForLevel(410), { hp: 4000, defense: 500 });
  pUnres.resistPct = { energy: 0 };
  pUnres.attack = 0; // não mata o boss antes dos 30s

  const cycleUnres = runCycle(
    RAID_HUNTS[0],
    pUnres,
    12345,
    2, // Fase 3
    { id: 'normal', name: 'Normal', level: 0, xp: 1 },
    1,
  );

  assert.equal(cycleUnres.outcome, 'death');
});

test('loja de fragmentos: compra de set piece (70 frags, limite 1x) e baú de ouro (10 frags, máx 3/semana)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const now = Date.now();

  const charId = createTestChar(db, 'RaidShopper', 400);

  // Tenta comprar sem fragmentos
  const errNoFrags = game.buyRaidShop(charId, 'ascended_usurper_amulet', now);
  assert.match(errNoFrags.error ?? '', /insuficientes/i);

  // Adiciona 100 fragmentos
  db.applyGains(charId, { actions: 0, items: { [RAID_FRAGMENT_ID]: 100 }, xp: {} }, 0, 0);

  // Compra o amuleto por 70 fragmentos
  const buyAm = game.buyRaidShop(charId, 'ascended_usurper_amulet', now);
  assert.equal(buyAm.success, true);
  assert.equal(db.bankFor(charId)['ascended_usurper_amulet'], 1);
  assert.equal(db.bankFor(charId)[RAID_FRAGMENT_ID], 30);

  // Tenta comprar a mesma peça de novo (limite 1x)
  db.applyGains(charId, { actions: 0, items: { [RAID_FRAGMENT_ID]: 70 }, xp: {} }, 0, 0);
  const buyDup = game.buyRaidShop(charId, 'ascended_usurper_amulet', now);
  assert.match(buyDup.error ?? '', /já adquiriu/i);

  // Compra baús de ouro (10 frags cada, limite 3 na semana)
  const b1 = game.buyRaidShop(charId, 'raid_chest', now);
  assert.equal(b1.success, true);
  const b2 = game.buyRaidShop(charId, 'raid_chest', now);
  assert.equal(b2.success, true);
  const b3 = game.buyRaidShop(charId, 'raid_chest', now);
  assert.equal(b3.success, true);

  // 4º baú deve falhar (limite atingido)
  const b4 = game.buyRaidShop(charId, 'raid_chest', now);
  assert.match(b4.error ?? '', /atingido/i);

  // Ouro total recebido dos 3 baús = 900.000
  const gold = db.bankFor(charId).gold ?? 0;
  assert.equal(gold, 900_000);
});

test('clears semanais: 1 recompensa por fase por semana', () => {
  const db = openDb(':memory:');
  const now = Date.now();
  const week = weekOf(now);

  const charId = createTestChar(db, 'ClearTester', 400);

  assert.equal(db.hasRaidPhaseClear(charId, week, 'raid_usurper', 1), false);
  db.markRaidPhaseClear(charId, week, 'raid_usurper', 1, false, false, now);
  assert.equal(db.hasRaidPhaseClear(charId, week, 'raid_usurper', 1), true);
  assert.equal(db.hasRaidPhaseClear(charId, week, 'raid_usurper', 2), false);

  const clears = db.raidClearsFor(charId, week);
  assert.deepEqual(clears, [1]);
});

test('raide desligada: ninguém entra enquanto o campo enabled da raide for false', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Fechado', 'warrior').id;
  assert.match(game.start(id, 'combat', RAID_ID, Date.now()) ?? '', /em breve/);
  assert.match(game.start(id, 'combat', SOUL_RAID_ID, Date.now()) ?? '', /em breve/);
});

test('chave por raide: com a Guerra das Almas ligada e a Raide II desligada, dá para entrar na Guerra das Almas e não dá para entrar na Raide II', () => {
  const db = openDb(':memory:');
  const game = createGame(db);

  const p1 = createTestChar(db, 'LiderAlmas', 500);
  const p2 = createTestChar(db, 'MembroAlmas', 500);
  const partyId = db.createParty(p1);
  db.addPartyMember(partyId, p2);

  const raid1 = raidById(RAID_ID)!;
  const raid2 = raidById(SOUL_RAID_ID)!;

  const prev1 = raid1.enabled;
  const prev2 = raid2.enabled;

  try {
    raid1.enabled = false;
    raid2.enabled = true;

    const now = Date.now();
    // Raide II desligada -> bloqueia com 'A Raide abre em breve.'
    const errRaid1 = game.start(p1, 'combat', RAID_ID, now);
    assert.equal(errRaid1, 'A Raide abre em breve.');

    // Guerra das Almas ligada -> entra com sucesso
    const errRaid2 = game.start(p1, 'combat', SOUL_RAID_ID, now);
    assert.equal(errRaid2, null);
    const act = db.activityFor(p1);
    assert.equal(act?.node, SOUL_RAID_ID);

    // Desligando a Guerra das Almas também -> bloqueia com 'A Raide abre em breve.'
    raid2.enabled = false;
    const errRaid2Closed = game.start(p1, 'combat', SOUL_RAID_ID, now);
    assert.equal(errRaid2Closed, 'A Raide abre em breve.');
  } finally {
    raid1.enabled = prev1;
    raid2.enabled = prev2;
  }
});

test('fases da raide: vence 1, 2 e 3 em ordem (antes a 1 contava como 2 e a 3 nunca era lutada)', () => {
  const r = simulateHunt({ skill: 'combat', node: huntNode('raid_usurper', 'normal', 1), since: 0, seed: 7, seq: 0 }, 3_600_000, {
    vocation: 'warrior',
    combatXp: xpForLevel(450),
    bank: {},
    bonus: { attack: 2_000_000, defense: 5000, hp: 500_000 },
  });
  assert.deepEqual(r.gains.raidPhases, [1, 2, 3]);
  assert.equal(r.gains.cleared, 'raid_usurper');
  assert.equal(r.ended, true);
});

test('raide solo: o chefe não encolhe de uma luta para outra (antes a vida caía 38% a cada cálculo)', () => {
  const p = playerStats('warrior', xpForLevel(410), { defense: 9999, hp: 99999 });
  p.attack = 0;
  const hp0 = RAID_MONSTERS[0].hp;
  for (let i = 0; i < 3; i++) runCycle(RAID_HUNTS[0], p, 1, 0, { id: 'normal', name: 'Normal', level: 0, xp: 1 }, 1);
  assert.equal(RAID_MONSTERS[0].hp, hp0);
});

test('raide em grupo: cada fase ocupa horário fixo, o grupo começa a próxima fase junto', () => {
  const lairGroup = { killAt: Infinity, allies: [{ id: 2, hitMs: 1000, hit: 50_000, hasAoe: false, isHealer: false }] };
  const r = simulateHunt({ skill: 'combat', node: huntNode('raid_usurper', 'normal', 1), since: 0, seed: 7, seq: 0 }, 200_000 + 30_000 + 1, {
    vocation: 'warrior',
    combatXp: xpForLevel(450),
    bank: {},
    bonus: { attack: 2_000_000, defense: 5000, hp: 500_000 },
    lairGroup,
  } as any);
  assert.deepEqual(r.gains.raidPhases, [1]);
  assert.equal(r.since, 180_000 + 30_000);
});

test('raide em grupo: quem está offline ganha a recompensa de grupo, igual ao líder, mesmo com o servidor reiniciando no meio', () => {
  const saved = RAID_MONSTERS.map((m) => ({ hp: m.hp, attack: m.attack }));
  RAID_MONSTERS.forEach((m) => { m.hp = 2000; m.attack = 50; });
  try {
    const db = openDb(':memory:');
    const game = createGame(db);
    const pm = new PartyManager(db);
    game.setPartyFights((id) => pm.lairMembersFor(id), (id) => pm.partyBuffsFor(id));
    const a = createTestChar(db, 'Lider', 450);
    const b = createTestChar(db, 'Membro', 450);
    db.addPartyMember(db.createParty(a), b);
    const t0 = Date.UTC(2026, 9, 21, 12);
    for (const id of [a, b]) db.setActivity(id, { skill: 'combat', node: 'raid_usurper', since: t0, seed: 99, seq: 0 });
    const goldOf = (id: number) => game.state(id, t0).bank.gold ?? 0;
    const g0a = goldOf(a);
    const g0b = goldOf(b);
    const end = t0 + 20 * 60_000;
    // Líder acertado durante a raide (fase a fase); o membro só no fim, depois da raide do líder acabar.
    for (let t = t0 + 60_000; t <= t0 + 5 * 60_000; t += 60_000) game.settle(a, t);
    // Servidor reiniciou no meio da raide (a luta guardada na memória se perde).
    const game2 = createGame(db);
    game2.setPartyFights((id) => pm.lairMembersFor(id), (id) => pm.partyBuffsFor(id));
    for (let t = t0 + 6 * 60_000; t <= end; t += 60_000) game2.settle(a, t);
    game2.settle(b, end);
    assert.deepEqual(db.raidClearsFor(a, weekOf(t0)).sort(), [1, 2, 3]);
    assert.deepEqual(db.raidClearsFor(b, weekOf(t0)).sort(), [1, 2, 3]);
    assert.equal(goldOf(a) - g0a, 500_000);
    assert.equal(goldOf(b) - g0b, 500_000);
  } finally {
    RAID_MONSTERS.forEach((m, i) => { m.hp = saved[i].hp; m.attack = saved[i].attack; });
  }
});

test('fase 2 da raide: no máximo 3 ondas de guardas (antes passavam de 20 numa fase de 3 min)', () => {
  const p = playerStats('warrior', xpForLevel(410), { defense: 9999, hp: 99999 });
  p.attack = 0;
  const c = runCycle(RAID_HUNTS[0], p, 1, 1, { id: 'normal', name: 'Normal', level: 0, xp: 1 }, 1);
  assert.equal(c.monsters.length, 1 + 9);
});

test('set do Usurpador: bônus pela qualidade como os outros sets, sem contar em dobro (26/10)', async () => {
  const { setQualityBonus } = await import('@grimhold/shared');
  const set = (s: string) => ({ amulet: `ascended_usurper_amulet${s}`, ring: `ascended_usurper_ring${s}`, boots: `ascended_usurper_boots${s}`, helmet: `ascended_usurper_helmet${s}` });
  const b = setQualityBonus(set('+5#10'));
  assert.ok(Math.abs(b.attackPct - 0.8) < 1e-9 && Math.abs(b.xpPct - 0.4 / 3) < 1e-9 && Math.abs(b.lootPct - 0.2) < 1e-9, JSON.stringify(b));
  const low = setQualityBonus(set(''));
  assert.ok(low.attackPct < 0.1, 'sem refino quase nada');
  const two = setQualityBonus({ amulet: 'ascended_usurper_amulet#10', ring: 'ascended_usurper_ring#10' });
  assert.equal(two.xpPct, 0, '2 peças: só dano');
});
