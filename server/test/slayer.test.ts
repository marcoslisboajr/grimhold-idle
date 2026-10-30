import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HUNTS,
  SLAYER_MASTERS,
  SLAYER_MONSTER_LEVEL,
  XP_TABLE,
  levelForXp,
  rollSlayerTask,
  slayerCandidates,
  slayerMasterById,
  slayerStreakMult,
  slayerTaskPoints,
  slayerXpPerKill,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(combatLevel = 5) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Matador', 'warrior').id;
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[combatLevel] } }, 0, 0);
  return { db, game, id };
}

test('slayer: XP por abate é 3 × nível^1,6 arredondado', () => {
  assert.equal(slayerXpPerKill(10), 119);
  assert.equal(slayerXpPerKill(50), 1568);
  assert.equal(slayerXpPerKill(100), 4755);
  assert.equal(slayerXpPerKill(1), 3);
});

test('slayer: a skill vai até o 120 com a curva das profissões', () => {
  assert.equal(levelForXp(XP_TABLE[120] * 10, 'slayer'), 120);
  assert.equal(levelForXp(XP_TABLE[50], 'slayer'), 50);
});

test('slayer: sequência de pontos (10ª ×5, 50ª ×15, 100ª ×25)', () => {
  assert.equal(slayerStreakMult(1), 1);
  assert.equal(slayerStreakMult(10), 5);
  assert.equal(slayerStreakMult(20), 5);
  assert.equal(slayerStreakMult(50), 15);
  assert.equal(slayerStreakMult(100), 25);
  assert.equal(slayerStreakMult(200), 25);
  const turael = slayerMasterById('turael')!;
  assert.equal(slayerTaskPoints(turael, 3), 3);
  assert.equal(slayerTaskPoints(turael, 10), 15);
  assert.equal(slayerTaskPoints(turael, 10, 'short'), 3);
  assert.equal(slayerTaskPoints(turael, 10, 'normal'), 45);
  assert.equal(slayerTaskPoints(turael, 3, 'long'), 30);
});

test('slayer: cada mestre sorteia só espécies de caçadas comuns da faixa, e abates na faixa', () => {
  const common = new Set(HUNTS.filter((h) => !h.boss && !h.lair && !h.requires && !h.quest).flatMap((h) => h.monsters));
  for (const m of SLAYER_MASTERS) {
    const list = slayerCandidates(m);
    assert.ok(list.length > 0, `${m.name} tem espécies`);
    for (const c of list) {
      assert.ok(common.has(c.monster));
      assert.ok(c.level >= m.monsterRange[0] && c.level <= m.monsterRange[1], `${c.monster} (${c.level}) na faixa de ${m.name}`);
    }
    for (let i = 0; i < 50; i++) {
      const t = rollSlayerTask(m, m.combatLevel + 10)!;
      assert.ok(list.some((c) => c.monster === t.monster));
      assert.equal(t.target, 1000);
    }
  }
});

test('slayer: o sorteio pesa mais as espécies perto do nível do jogador', () => {
  const m = slayerMasterById('mazchna')!;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const avg = (lvl: number) => {
    let sum = 0;
    for (let i = 0; i < 2000; i++) sum += SLAYER_MONSTER_LEVEL.get(rollSlayerTask(m, lvl, rand)!.monster)!;
    return sum / 2000;
  };
  assert.ok(avg(35) + 10 < avg(90), 'nível baixo puxa monstros mais baixos');
});

test('slayer: pedir tarefa exige o combate do mestre e não pode ter duas', () => {
  const { db, game, id } = setup(5);
  assert.match(game.slayerRequest(id, 'mazchna', 0)!, /nível 40/);
  assert.equal(game.slayerRequest(id, 'nada', 0), 'Mestre desconhecido.');
  assert.equal(game.slayerRequest(id, 'turael', 0), null);
  const st = db.slayerFor(id);
  assert.equal(st.master, 'turael');
  assert.ok(st.monster && st.target === 1000 && st.size === 'normal');
  assert.match(game.slayerRequest(id, 'turael', 0)!, /já tem/);
  assert.deepEqual(game.state(id, 0).slayer, st);
});

test('slayer: abates da espécie na caçada contam, dão XP de Slayer e terminam com pontos', () => {
  const { db, game, id } = setup(5);
  db.setSlayer(id, { master: 'turael', monster: 'rat', target: 5, progress: 0, streak: 9, points: 0, completed: 9 });
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 2 * 60 * 1000);
  let st = db.slayerFor(id);
  const kills = db.bestiaryFor(id).rat ?? 0;
  assert.ok(kills > 0, 'matou ratos');
  if (kills < 5) {
    assert.equal(st.progress, kills);
    assert.equal(db.skillsFor(id).slayer, kills * slayerXpPerKill(1));
  }
  game.settle(id, 60 * 60 * 1000);
  st = db.slayerFor(id);
  assert.equal(st.monster, null, 'tarefa terminou');
  assert.equal(st.streak, 10);
  assert.equal(st.completed, 10);
  assert.equal(st.points, 15, '10ª seguida: 3 × 5');
  // Só os 5 abates da meta dão XP (o resto da caçada não).
  assert.equal(db.skillsFor(id).slayer, 5 * slayerXpPerKill(SLAYER_MONSTER_LEVEL.get('rat')!));
});

test('slayer: abates de outra espécie não contam; cancelar zera a sequência', () => {
  const { db, game, id } = setup(5);
  db.setSlayer(id, { master: 'turael', monster: 'wolf', target: 80, progress: 3, streak: 4, points: 8, completed: 4 });
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 30 * 60 * 1000);
  assert.equal(db.slayerFor(id).progress, 3);
  assert.equal(db.skillsFor(id).slayer ?? 0, 0);
  assert.equal(game.slayerCancel(id, 30 * 60 * 1000), null);
  const st = db.slayerFor(id);
  assert.equal(st.monster, null);
  assert.equal(st.streak, 0);
  assert.equal(st.points, 8, 'os pontos ficam');
  assert.equal(game.slayerCancel(id, 30 * 60 * 1000), 'Você não tem tarefa de Slayer.');
});

test('Slayer: a tarefa nunca pede espécie de caçada muito acima do nível (nível 1 não recebe monstro do 34)', async () => {
  const { rollSlayerTask, slayerCandidates, SLAYER_MASTERS, SLAYER_LEVEL_SLACK } = await import('@grimhold/shared');
  const turael = SLAYER_MASTERS[0];
  const levelOf = new Map(slayerCandidates(turael).map((c) => [c.monster, c.level]));
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
  for (let i = 0; i < 500; i++) {
    const t = rollSlayerTask(turael, 1, rand)!;
    assert.ok(levelOf.get(t.monster)! <= 1 + SLAYER_LEVEL_SLACK, `${t.monster} (${levelOf.get(t.monster)}) para nível 1`);
  }
});

test('slayer: loja troca pontos por equipamento e todos os itens existem', async () => {
  const { SLAYER_SHOP, itemById } = await import('@grimhold/shared');
  for (const o of SLAYER_SHOP) assert.ok(itemById(o.item)?.equip, o.item);
  const { db, game, id } = setup(30);
  assert.match(game.slayerBuy(id, 'slayer25_sword', 0) ?? '', /pontos/);
  db.setSlayer(id, { ...db.slayerFor(id), points: 25 });
  assert.equal(game.slayerBuy(id, 'slayer25_sword', 0), null);
  assert.equal(db.slayerFor(id).points, 5);
  assert.equal(db.bankFor(id).slayer25_sword, 1);
  assert.equal(game.slayerBuy(id, 'gold', 0), 'Item inválido.');
});

test('slayer: XP de combate extra forte até o 100', async () => {
  const { slayerCombatXpMult } = await import('@grimhold/shared');
  assert.equal(slayerCombatXpMult(50), 1);
  assert.equal(slayerCombatXpMult(150), 0.25);
});

test('slayer: boosts de loot e de Bestiário custam pontos, somam 1 h e não misturam loot 25 com 50', () => {
  const { db, game, id } = setup(200);
  assert.match(game.slayerBoost(id, 'loot25', 0) ?? '', /pontos/);
  db.setSlayer(id, { ...db.slayerFor(id), points: 500 });
  assert.equal(game.slayerBoost(id, 'loot25', 0), null);
  assert.equal(game.slayerBoost(id, 'loot25', 0), null);
  assert.deepEqual(db.slayerBoostsFor(id), { lootUntil: 2 * 3_600_000, lootMult: 0.25, bestiaryUntil: 0 });
  assert.match(game.slayerBoost(id, 'loot50', 0) ?? '', /outro boost/);
  assert.equal(game.slayerBoost(id, 'bestiary', 0), null);
  assert.equal(db.slayerBoostsFor(id).bestiaryUntil, 3_600_000);
  assert.equal(db.slayerFor(id).points, 500 - 40 - 40 - 50);
  assert.equal(game.slayerBoost(id, 'xyz', 0), 'Boost inválido.');
});

test('slayer: Bestiário em dobro e loot +50% numa caçada', () => {
  const { db, game, id } = setup(30);
  const hunt = HUNTS.find((h) => h.id === 'river_bank')!;
  db.setSlayer(id, { ...db.slayerFor(id), points: 1000 });
  game.slayerBoost(id, 'bestiary', 0);
  game.slayerBoost(id, 'loot50', 0);
  assert.equal(game.start(id, 'combat', hunt.id, 0), null);
  game.settle(id, 30 * 60 * 1000);
  const kills = db.statsFor(id).kills ?? 0;
  assert.ok(kills > 0);
  const best = Object.values(db.bestiaryFor(id)).reduce((a, b) => a + b, 0);
  assert.ok(best > 0);
  assert.equal(best, 2 * kills, 'cada abate conta 2 no Bestiário');
});

test('slayer: tarefa de chefe sorteia covil (3) ou instância (5) da faixa, paga ×6 sem bônus de sequência', async () => {
  const { SLAYER_BOSS_LEVEL, rollSlayerBossTask } = await import('@grimhold/shared');
  assert.ok(SLAYER_BOSS_LEVEL.size > 20);
  assert.equal(SLAYER_BOSS_LEVEL.get('boar_king')?.lair, true);
  for (const master of SLAYER_MASTERS) {
    for (let i = 0; i < 20; i++) {
      const t = rollSlayerBossTask(master, master.monsterRange[1], () => i / 20);
      if (!t) continue;
      const b = SLAYER_BOSS_LEVEL.get(t.monster)!;
      assert.ok(b.level >= master.monsterRange[0] && b.level <= master.monsterRange[1], `${master.id} ${t.monster}`);
      assert.equal(t.target, b.lair ? 3 : 5);
    }
  }
  // Nível 1 só recebe chefe até o 11.
  const low = rollSlayerBossTask(slayerMasterById('turael')!, 1, () => 0.5)!;
  assert.ok(SLAYER_BOSS_LEVEL.get(low.monster)!.level <= 11);
  const m = slayerMasterById('vannaka')!;
  assert.equal(slayerTaskPoints(m, 10, 'boss'), m.points * 6);
});

test('slayer: vitória no covil conta na tarefa de chefe, dá XP de Slayer e a conquista', () => {
  const { db, game, id } = setup(15);
  // Covil mais duro (23/10): entra no nível dele, com equipamento melhorado.
  const kit = ['iron_sword+3#5', 'iron_armor+3#5', 'iron_helmet+3#5', 'iron_legs+3#5', 'iron_boots+3#5'];
  db.applyGains(id, { actions: 0, items: Object.fromEntries(kit.map((i) => [i, 1])), xp: {} }, 0, 0);
  for (const i of kit) game.equip(id, i, 0);
  db.setSlayer(id, { master: 'turael', monster: 'boar_king', target: 1, progress: 0, streak: 0, points: 0, completed: 0, size: 'boss' });
  assert.equal(game.start(id, 'combat', 'boar_den', 0), null);
  game.settle(id, 10 * 60 * 1000);
  const st = db.slayerFor(id);
  assert.equal(st.monster, null, 'tarefa de chefe terminou');
  assert.equal(st.points, 3 * 6);
  assert.ok((db.skillsFor(id).slayer ?? 0) >= slayerXpPerKill(10) * 15);
  assert.equal(db.statsFor(id).slayer_boss, 1);
});

test('slayer: pedir tarefa de chefe no mestre', () => {
  const { db, game, id } = setup(20);
  assert.equal(game.slayerRequest(id, 'turael', 0, 'boss'), null);
  const st = db.slayerFor(id);
  assert.equal(st.size, 'boss');
  assert.ok(st.target === 3 || st.target === 5);
});

test('slayer: capa (+5%) e mascote (+50%) multiplicam a XP de Slayer; o mascote cai dos abates da tarefa', async () => {
  const { SLAYER_PET, petById, xpForLevel } = await import('@grimhold/shared');
  assert.equal(petById(SLAYER_PET)?.skill, 'slayer');
  const run = (cape: boolean, pet: boolean, forceDrop = false) => {
    const { db, game, id } = setup(5);
    if (cape) { db.applyGains(id, { actions: 0, items: { cape_slayer: 1 }, xp: { slayer: Math.ceil(xpForLevel(99)) } }, 0, 0); assert.equal(game.equip(id, 'cape_slayer', 0), null); }
    const before = db.skillsFor(id).slayer ?? 0;
    if (pet) db.unlockPet(id, SLAYER_PET);
    db.setSlayer(id, { master: 'turael', monster: 'rat', target: 5, progress: 0, streak: 0, points: 0, completed: 0 });
    game.start(id, 'combat', 'river_bank', 0);
    const rnd = Math.random;
    if (forceDrop) Math.random = () => 0;
    try { game.settle(id, 60 * 60 * 1000); } finally { Math.random = rnd; }
    return { xp: (db.skillsFor(id).slayer ?? 0) - before, pets: db.petsFor(id), cape: db.equipmentFor(id).cape };
  };
  const base = 5 * slayerXpPerKill(SLAYER_MONSTER_LEVEL.get('rat')!);
  assert.equal(run(false, false).xp, base);
  assert.equal(run(false, true).xp, Math.round(base * 1.5));
  const withCape = run(true, false);
  assert.equal(withCape.cape, 'cape_slayer');
  assert.equal(withCape.xp, Math.round(base * 1.05));
  assert.ok(run(false, false, true).pets.includes(SLAYER_PET), 'com a sorte forçada o mascote cai');
});
