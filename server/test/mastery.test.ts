import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HUNTS,
  MASTERY_MIN_LEVEL,
  MASTERY_NODES,
  MASTERY_POINT_XP,
  MASTERY_MAX_LEVEL,
  OVER_350_XP_MULT,
  OVER_400_XP_MULT,
  WHEEL_SLICES,
  WHEEL_SIDES,
  canInvestMasteryPoint,
  isSliceAvailable,
  isSliceComplete,
  masteryEffects,
  masteryPointCost,
  masteryResetCost,
  masterySpentPoints,
  playerLevelXpMult,
  playerStats,
  wheelRevelationLevel,
  wheelSideCompletedPoints,
  wheelSideInvestedPoints,
  xpForLevel, MASTERY_XP_MULT } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('stages de XP: 100% até o 199, 130% / 120% / 100% / 40% por faixa e 4% do 400 em diante', () => {
  assert.equal(OVER_350_XP_MULT, 0.4);
  assert.equal(OVER_400_XP_MULT, 0.04);
  const at = (l: number) => Number(playerLevelXpMult(l).toFixed(4));
  assert.deepEqual([1, 199, 200, 249, 250, 299, 300, 349, 350, 399, 400, 500].map(at), [1, 1, 1.3, 1.3, 1.2, 1.2, 1, 1, 0.4, 0.4, 0.04, 0.04]);
});

test('Roda da Maestria: estrutura de 4 lados e 36 fatias (400 pontos no total)', () => {
  assert.equal(WHEEL_SIDES.length, 4);
  assert.equal(WHEEL_SLICES.length, 36);

  // Cada lado tem 9 fatias que somam 100 pontos: 2 inner (5), 3 middle (10), 4 outer (15)
  for (const side of WHEEL_SIDES) {
    const slices = WHEEL_SLICES.filter((s) => s.side === side.id);
    assert.equal(slices.length, 9);
    const inner = slices.filter((s) => s.ring === 'inner');
    const mid = slices.filter((s) => s.ring === 'middle');
    const out = slices.filter((s) => s.ring === 'outer');
    assert.equal(inner.length, 2);
    assert.equal(mid.length, 3);
    assert.equal(out.length, 4);
    const sum = slices.reduce((acc, s) => acc + s.cost, 0);
    assert.equal(sum, 100, `lado ${side.id} soma 100 pontos`);
  }

  const totalPoints = WHEEL_SLICES.reduce((acc, s) => acc + s.cost, 0);
  assert.equal(totalPoints, 400);
  // Com 200 pontos (nível 200), não dá para completar a roda inteira (completa exatamente a metade).
  assert.ok(200 < totalPoints, 'com 200 pontos não dá para completar a roda inteira');
});

test('Roda da Maestria: caminho só abre pela vizinha completa e anel interno aberto pelo centro', () => {
  const emptyState = { xp: 0, points: 50, slices: {} };

  // Anel interno sempre aberto
  assert.equal(isSliceAvailable(emptyState.slices, 'fury_inner_0'), true);
  assert.equal(isSliceAvailable(emptyState.slices, 'fury_inner_1'), true);

  // Anéis médio e externo começam bloqueados
  assert.equal(isSliceAvailable(emptyState.slices, 'fury_mid_0'), false);
  assert.equal(isSliceAvailable(emptyState.slices, 'fury_out_0'), false);

  // Gastar parcialmente no anel interno não abre o anel médio
  const partialInner = { fury_inner_0: 4 };
  assert.equal(isSliceComplete(partialInner, 'fury_inner_0'), false);
  assert.equal(isSliceAvailable(partialInner, 'fury_mid_0'), false);

  // Completar a fatia interna abre as vizinhas no anel médio
  const completeInner = { fury_inner_0: 5 };
  assert.equal(isSliceComplete(completeInner, 'fury_inner_0'), true);
  assert.equal(isSliceAvailable(completeInner, 'fury_mid_0'), true);
  assert.equal(isSliceAvailable(completeInner, 'fury_mid_1'), true);
  // Mas a fatia externa continua bloqueada
  assert.equal(isSliceAvailable(completeInner, 'fury_out_0'), false);

  // Completando fatia média, abre fatias externas vizinhas
  const completeMid = { fury_inner_0: 5, fury_mid_0: 10 };
  assert.equal(isSliceAvailable(completeMid, 'fury_out_0'), true);
  assert.equal(isSliceAvailable(completeMid, 'fury_out_1'), true);
  assert.equal(isSliceAvailable(completeMid, 'fury_out_3'), false);
});

test('Roda da Maestria: Revelação liga com 40, 70 e 100 pontos completos', () => {
  assert.equal(wheelRevelationLevel(0), 0);
  assert.equal(wheelRevelationLevel(39), 0);
  assert.equal(wheelRevelationLevel(40), 1);
  assert.equal(wheelRevelationLevel(69), 1);
  assert.equal(wheelRevelationLevel(70), 2);
  assert.equal(wheelRevelationLevel(99), 2);
  assert.equal(wheelRevelationLevel(100), 3);
});

test('Roda da Maestria: progresso de XP do 400+, acúmulo de pontos e limite de 200', async () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const accountId = db.accountForToken(db.createGuest())!;
  const ch = db.createCharacter(accountId, 'VetWheel', 'warrior');

  // Abaixo do 400 não acumula maestria
  db.applyGains(ch.id, { actions: 0, items: {}, xp: { combat: xpForLevel(350) } }, 0, 0);
  assert.equal(game.start(ch.id, 'combat', HUNTS[0].id, 0), null);
  game.settle(ch.id, 60_000);
  assert.equal(db.masteryFor(ch.id).points, 0);
  assert.equal(game.spendMasteryPoint(ch.id, 'fury_inner_0', 60_000), 'A Maestria abre no nível 400 de combate.');

  // Nível 400 acumula XP cheia
  game.stop(ch.id, 60_000);
  const curXp = db.skillsFor(ch.id).combat ?? 0;
  db.applyGains(ch.id, { actions: 0, items: {}, xp: { combat: xpForLevel(MASTERY_MIN_LEVEL) - curXp } }, 60_000, 0);
  const hunt50 = HUNTS.find((h) => !h.boss && !h.lair && !h.quest && h.level >= 50)!.id;
  assert.equal(game.start(ch.id, 'combat', hunt50, 60_000), null);
  const settled = game.settle(ch.id, 180_000);
  const afterHunt = db.masteryFor(ch.id);
  const combatEarned = settled.gains.xp.combat ?? 0;
  assert.ok(combatEarned > 0, 'ganhou XP de combate');
  assert.equal(afterHunt.xp + afterHunt.points * MASTERY_POINT_XP, Math.floor(Math.round(combatEarned / playerLevelXpMult(MASTERY_MIN_LEVEL)) * MASTERY_XP_MULT));

  // Custo crescente e teto no nível 200
  assert.ok(masteryPointCost(100) > masteryPointCost(0) * 4);
  db.addMasteryXp(ch.id, masteryPointCost(0) * 1e6);
  assert.equal(db.masteryFor(ch.id).points, MASTERY_MAX_LEVEL);
  assert.equal(db.masteryFor(ch.id).xp, 0);
  db.close();
});

test('Roda da Maestria: investir pontos aos poucos e reset com ouro devolve tudo', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const accountId = db.accountForToken(db.createGuest())!;
  const ch = db.createCharacter(accountId, 'WheelMaster', 'hunter');
  db.applyGains(ch.id, { actions: 0, items: { gold: 1_000_000 }, xp: { combat: xpForLevel(400) } }, 0, 0);
  db.addMasteryPoints(ch.id, 20);

  // Fatia bloqueada rejeita
  assert.match(game.spendMasteryPoint(ch.id, 'fury_mid_0', 1000) ?? '', /bloqueado/);

  // Investe 5 pontos na fatia interna
  for (let i = 0; i < 5; i++) {
    assert.equal(game.spendMasteryPoint(ch.id, 'fury_inner_0', 1000 + i), null);
  }
  let st = db.masteryFor(ch.id);
  assert.equal(st.slices.fury_inner_0, 5);
  assert.equal(st.points, 15);

  // Agora a fatia média está disponível; investe 3 pontos nela (incompleta)
  for (let i = 0; i < 3; i++) {
    assert.equal(game.spendMasteryPoint(ch.id, 'fury_mid_0', 2000 + i), null);
  }
  st = db.masteryFor(ch.id);
  assert.equal(st.slices.fury_mid_0, 3);
  assert.equal(st.points, 12);
  assert.equal(masterySpentPoints(st.slices), 8);
  assert.equal(wheelSideInvestedPoints(st.slices, 'fury'), 8);
  // Pontos completos no lado: só os 5 da fatia interna
  assert.equal(wheelSideCompletedPoints(st.slices, 'fury'), 5);

  // Reset com ouro
  const cost = masteryResetCost(st.slices);
  assert.equal(cost, 8 * 50_000);
  assert.equal(game.resetMastery(ch.id, 3000), null);
  const afterReset = db.masteryFor(ch.id);
  assert.equal(afterReset.points, 20);
  assert.deepEqual(afterReset.slices, {});
  assert.equal(db.bankFor(ch.id).gold, 1_000_000 - cost);
  db.close();
});

test('Roda da Maestria: bônus de Dedicação e Convicção entram em playerStats', () => {
  // 10 pontos em Fúria (+1,5% ataque) e 10 pontos em Precisão (+0,5% crit, +1% critMult)
  const base = playerStats('warrior', xpForLevel(400), { attack: 200, defense: 200, hp: 1000 });
  const boosted = playerStats('warrior', xpForLevel(400), { attack: 200, defense: 200, hp: 1000 }, null, [], undefined, {
    fury_inner_0: 5,
    fury_inner_1: 5,
    precision_inner_0: 5,
    precision_inner_1: 5,
  });
  assert.ok(boosted.attack > base.attack, 'Dedicação de Fúria sobe o ataque');
  assert.ok((boosted.critChance ?? 0) > (base.critChance ?? 0), 'Dedicação de Precisão sobe o crítico');
  assert.ok((boosted.critMult ?? 0) > (base.critMult ?? 0), 'Dedicação de Precisão sobe o dano crítico');
});

test('Roda da Maestria: Revelações no combate funcionam conforme prometido', () => {
  // Caçador com Olho Mortal (Precisão 70 pts = nível 2): todo 5º ataque é crítico garantido
  const plWithout = playerStats('hunter', xpForLevel(400), { attack: 300, defense: 200, hp: 1000 }, null, [], undefined, {});
  // Fatias para dar 70 pontos completos em precision:
  // precision_inner_0 (5), precision_inner_1 (5), precision_mid_0 (10), precision_mid_1 (10), precision_mid_2 (10), precision_out_0 (15), precision_out_1 (15) = 70 pts
  const slices70Prec = {
    precision_inner_0: 5,
    precision_inner_1: 5,
    precision_mid_0: 10,
    precision_mid_1: 10,
    precision_mid_2: 10,
    precision_out_0: 15,
    precision_out_1: 15,
  };
  const plWith = playerStats('hunter', xpForLevel(400), { attack: 300, defense: 200, hp: 1000 }, null, [], undefined, slices70Prec);

  // A magia da Precisão do Caçador (wheel_precision_hunter) entra nas magias ativas com 70 pontos
  assert.ok(plWith.spells?.some((s) => s.id === 'wheel_precision_hunter'), 'magia da roda desbloqueia com 70 pontos');
  assert.ok(!plWithout.spells?.some((s) => s.id === 'wheel_precision_hunter'), 'sem pontos não tem magia da roda');

  // Com 100 pontos, a magia vira a versão Forte
  const slices100Prec = {
    ...slices70Prec,
    precision_out_2: 15,
    precision_out_3: 15,
  };
  const plWith100 = playerStats('hunter', xpForLevel(400), { attack: 300, defense: 200, hp: 1000 }, null, [], undefined, slices100Prec);
  const strongSpell = plWith100.spells?.find((s) => s.id === 'wheel_precision_hunter');
  assert.ok(strongSpell?.name.includes('Forte'), 'com 100 pontos a magia fica forte');
});
