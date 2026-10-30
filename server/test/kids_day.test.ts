import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KIDS_CANDY,
  KIDS_DAY_END,
  KIDS_DAY_START,
  KIDS_PET_PRICE,
  KIDS_POTION_PRICE,
  KIDS_SHOP_END,
  PETS,
  isKidsDay,
  isKidsShopOpen,
  kidsCandiesFor,
  kidsDayOverlap,
  petForSkill,
  bossEventAt,
  bossReward,
  SPECIAL_BOSSES,
  KIDS_STAMINA_REFILL_AT,
  STAMINA_MAX_MS,
  HUNTS,
  playerStats,
  runCycle,
  XP_TABLE,
  huntNode,
  parseHuntNode,
  simulateHunt,
  xpForLevel,
  XP_EVENTS,
  xpEventBonus,
  withXpEvent,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('dia das crianças: de 11/10 12h50 até o fim de 14/10 (Brasília), loja junto', () => {
  assert.equal(new Date(KIDS_DAY_START).toISOString(), '2026-10-11T15:50:00.000Z');
  assert.equal(new Date(KIDS_DAY_END).toISOString(), '2026-10-15T03:00:00.000Z');
  assert.ok(!isKidsDay(KIDS_DAY_START - 1) && isKidsDay(KIDS_DAY_START) && !isKidsDay(KIDS_DAY_END));
  assert.ok(isKidsShopOpen(KIDS_DAY_END - 1) && !isKidsShopOpen(KIDS_SHOP_END));
  assert.equal(kidsDayOverlap(KIDS_DAY_START - 60_000, KIDS_DAY_START + 60_000), 60_000);
  assert.equal(kidsDayOverlap(0, 1000), 0);
  assert.equal(kidsCandiesFor(30 * 60_000, () => 1), 10); // um doce a cada 3 min
});

test('dia das crianças: mascotes da loja não caem de profissão', () => {
  const kids = PETS.filter((p) => p.kids);
  assert.equal(kids.length, 10);
  for (const p of kids) assert.equal(p.skill, undefined);
  assert.equal(petForSkill('cooking')?.id, 'pet_cooking_slime');
});

test('dia das crianças: coleta dá doces e a loja troca por mascote', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Criança', 'hunter').id;
  const t0 = KIDS_DAY_START;
  const t1 = t0 + 60 * 60_000;
  game.start(id, 'mining', 'copper_vein', t0);
  game.settle(id, t1);
  const candies = game.state(id, t1).bank[KIDS_CANDY] ?? 0;
  assert.ok(candies >= 19 && candies <= 21, `doces em 1 h: ${candies}`);

  game.stop(id, t1);
  assert.match(game.buyKidsPet(id, 'pet_kids_crab', t0 - 1) ?? '', /fechada/);
  assert.match(game.buyKidsPet(id, 'pet_mining_golem', t1) ?? '', /inválido/);
  db.applyGains(id, { actions: 0, items: { [KIDS_CANDY]: KIDS_PET_PRICE }, xp: {} }, t1, 0);
  const before = game.state(id, t1).bank[KIDS_CANDY] ?? 0;
  assert.equal(game.buyKidsPet(id, 'pet_kids_crab', t1), null);
  assert.equal(game.state(id, t1).bank[KIDS_CANDY] ?? 0, before - KIDS_PET_PRICE);
  assert.ok(db.petsFor(id).includes('pet_kids_crab'));
  assert.match(game.buyKidsPet(id, 'pet_kids_crab', t1) ?? '', /já tem/);
  // Equipar funciona como qualquer mascote.
  assert.equal(game.setPet(id, 'pet_kids_crab', t1), null);
});

test('dia das crianças: fora do dia não cai doce', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Adulto', 'hunter').id;
  const t0 = KIDS_DAY_END + 3600_000;
  game.start(id, 'mining', 'copper_vein', t0);
  game.settle(id, t0 + 60 * 60_000);
  assert.equal(game.state(id, t0 + 60 * 60_000).bank[KIDS_CANDY] ?? 0, 0);
});

test('dia das crianças: Poção Doce de XP dobra a XP por 1 h e é uma por conta', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const a = db.createCharacter(acc, 'Docinho', 'hunter').id;
  const b = db.createCharacter(acc, 'Docinha', 'hunter').id;
  const t0 = KIDS_DAY_START + 3600_000;
  db.applyGains(a, { actions: 0, items: { [KIDS_CANDY]: 250 }, xp: {} }, t0, 0);

  // Mesma mineração com e sem a poção (os dois no evento): a XP dobra.
  const other = db.createCharacter(db.accountForToken(db.createGuest())!, 'Controle', 'hunter').id;
  assert.equal(game.buyKidsPotion(a, t0), null);
  assert.equal(game.state(a, t0).bank[KIDS_CANDY], 250 - KIDS_POTION_PRICE);
  assert.ok((game.state(a, t0).xpBoostUntil ?? 0) > t0);
  game.start(a, 'mining', 'copper_vein', t0);
  game.start(other, 'mining', 'copper_vein', t0);
  const t1 = t0 + 30 * 60_000;
  game.settle(a, t1);
  game.settle(other, t1);
  const xa = db.skillsFor(a).mining ?? 0;
  const xo = db.skillsFor(other).mining ?? 0;
  assert.ok(xa > xo * 1.8 && xa < xo * 2.2, `com poção ${xa}, sem ${xo}`);

  // Uma por conta: nem o mesmo personagem nem outro da conta compram de novo.
  assert.match(game.buyKidsPotion(a, t1) ?? '', /uma por conta/);
  db.applyGains(b, { actions: 0, items: { [KIDS_CANDY]: 200 }, xp: {} }, t1, 0);
  assert.match(game.buyKidsPotion(b, t1) ?? '', /uma por conta/);
  assert.ok(game.state(b, t1).kidsPotionUsed);
});

test('dia das crianças: Mímico Gigante nas horas pares e cospe doces em quem derrota', () => {
  const brt = (d: number, h: number, m = 0) => Date.UTC(2026, 9, d, h + 3, m);
  assert.equal(bossEventAt(brt(11, 15, 35)).boss.id, 'giant_mimic');
  assert.ok(bossEventAt(brt(11, 15, 35)).active);
  assert.notEqual(bossEventAt(brt(11, 15, 5)).boss.id, 'giant_mimic');
  assert.equal(bossEventAt(brt(11, 18, 5)).boss.id, 'giant_mimic');
  assert.ok(bossEventAt(brt(11, 18, 5)).active);
  assert.notEqual(bossEventAt(brt(11, 19, 5)).boss.id, 'giant_mimic'); // o chefe de sempre (hora ímpar)
  assert.ok(bossEventAt(brt(11, 19, 5)).active);
  // O último (14/10 às 22h) é o Mímico Rei: mais forte, 30 minutos e dá o Mimiquinho a quem bate nele.
  assert.equal(bossEventAt(brt(14, 18, 10)).boss.id, 'giant_mimic');
  assert.equal(bossEventAt(brt(14, 22, 25)).boss.id, 'mimic_king');
  assert.ok(bossEventAt(brt(14, 22, 25)).active);
  const king = SPECIAL_BOSSES.find((b) => b.id === 'mimic_king')!;
  assert.equal(king.pet, 'pet_mimic');
  assert.ok(king.legendarySet.length >= 5 && king.legendarySet.every((id) => id.endsWith('_pouch')));
  assert.ok(!bossEventAt(brt(15, 12, 5)).active || bossEventAt(brt(15, 12, 5)).boss.id !== 'giant_mimic');
  const mimic = SPECIAL_BOSSES.find((b) => b.id === 'giant_mimic')!;
  const r = bossReward(mimic, 1_000_100, 1, 50, 100_000, true, true, 100_000);
  assert.ok((r.loot?.[KIDS_CANDY] ?? 0) >= 25);
});

test('dia das crianças: trajes da Tia Jujuba (400 doces) e vestir', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Baulzinho', 'warrior').id;
  const t0 = KIDS_DAY_START + 3600_000;
  assert.match(game.buyKidsOutfit(id, 'walking_chest', t0) ?? '', /Precisa de 400/);
  db.applyGains(id, { actions: 0, items: { [KIDS_CANDY]: 450 }, xp: {} }, t0, 0);
  assert.match(game.buyKidsOutfit(id, 'wanderer', t0) ?? '', /inválido/);
  assert.equal(game.buyKidsOutfit(id, 'walking_chest', t0), null);
  assert.equal(game.state(id, t0).bank[KIDS_CANDY], 50);
  assert.ok(game.state(id, t0).unlockedOutfits?.includes('walking_chest'));
  assert.match(game.buyKidsOutfit(id, 'walking_chest', t0) ?? '', /já tem/);
  assert.match(game.buyKidsOutfit(id, 'candy_maker', KIDS_SHOP_END) ?? '', /fechada/);
});

test('dia das crianças: recarga de stamina enche todo mundo (caçando ou parado)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const parado = db.createCharacter(acc, 'Parado', 'warrior').id;
  const cacando = db.createCharacter(acc, 'Cacando', 'warrior').id;
  const t0 = KIDS_STAMINA_REFILL_AT - 3600_000;
  db.setStamina(parado, 3600_000, t0);
  db.setStamina(cacando, 3600_000, t0);
  const hunt = HUNTS.find((h) => h.level <= 5)!;
  assert.equal(game.start(cacando, 'combat', `${hunt.id}`, t0), null);
  game.settle(cacando, t0 + 10 * 60_000);
  db.refillAllStamina(STAMINA_MAX_MS, KIDS_STAMINA_REFILL_AT);
  const t1 = KIDS_STAMINA_REFILL_AT + 1000;
  assert.ok((game.state(parado, t1).stamina ?? 0) >= STAMINA_MAX_MS - 2000, `parado: ${game.state(parado, t1).stamina}`);
  game.settle(cacando, t1);
  assert.ok((game.state(cacando, t1).stamina ?? 0) > 41 * 3600_000, `caçando: ${game.state(cacando, t1).stamina}`);
});

test('dia das crianças: profissões ganham +50% de XP', () => {
  const run = (t0: number) => {
    const db = openDb(':memory:');
    const game = createGame(db);
    const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Mineira', 'hunter').id;
    game.start(id, 'mining', 'copper_vein', t0);
    game.settle(id, t0 + 30 * 60_000);
    return db.skillsFor(id).mining ?? 0;
  };
  const fora = run(KIDS_DAY_END + 3600_000);
  const dentro = run(KIDS_DAY_START + 3600_000);
  assert.ok(dentro > fora * 1.4 && dentro < fora * 1.6, `dentro ${dentro}, fora ${fora}`);
});

test('Mímico Gigante: Bolsa do Mímico para ~15% de quem lutou, sem contar o dano; abre em 15 a 35 doces', () => {
  const mimic = SPECIAL_BOSSES.find((b) => b.id === 'giant_mimic')!;
  let bags = 0;
  for (let c = 1; c <= 2000; c++) if ((bossReward(mimic, 1_000_100, c, 50, c % 2 ? 1 : 100_000, true, false, 100_000).loot?.mimic_bag ?? 0) > 0) bags++;
  assert.ok(bags > 220 && bags < 380, `bolsas: ${bags}/2000`);
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Doceira', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { mimic_bag: 1 }, xp: {} }, 0, 0);
  const r = game.openPouch(id, 'mimic_bag', 0);
  assert.equal(r.item, KIDS_CANDY);
  assert.ok(r.qty! >= 15 && r.qty! <= 35);
  assert.equal(db.bankFor(id)[KIDS_CANDY], r.qty);
  assert.equal(db.bankFor(id).mimic_bag ?? 0, 0);
});

test('Diabrete Doceiro: entra em ~4% das lutas só no Dia das Crianças e solta doces', () => {
  const h = HUNTS.find((x) => x.id === 'goblin_den')!;
  const p = playerStats('warrior', XP_TABLE[30]);
  const inEvent = KIDS_DAY_START + 3_600_000;
  let imps = 0;
  let candy = 0;
  for (let seq = 0; seq < 3000; seq++) {
    const c = runCycle(h, p, 7, seq, undefined, 1, {}, [], [], undefined, inEvent);
    if (c.monsters.some((m) => m.id === 'candy_imp')) {
      imps++;
      candy += c.loot[KIDS_CANDY] ?? 0;
    }
    assert.ok(!runCycle(h, p, 7, seq, undefined, 1, {}, [], [], undefined, KIDS_DAY_END + 1).monsters.some((m) => m.id === 'candy_imp'));
  }
  assert.ok(imps > 70 && imps < 180, `diabretes: ${imps}/3000`);
  assert.ok(candy >= imps * 3);
});

test('Bolsa de Donuts (craft no evento): abre em 10 a 25 doces', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Ferreira', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { donut_bag: 1 }, xp: {} }, 0, 0);
  const r = game.openPouch(id, 'donut_bag', 0);
  assert.ok(r.qty! >= 10 && r.qty! <= 25);
});

test('Diabrete Doceiro num bando de 7: a XP continua um número e a simulação termina', () => {
  // Bando de 7 + o Diabrete = 8 monstros; o bônus de bando só ia até 7 e a XP virava NaN,
  // o que prendia o servidor no laço da simulação (12/10, queda no deploy).
  const node = huntNode('shipwreck_beach', 'normal', 7);
  const at = KIDS_DAY_START + 3600_000;
  let found = false;
  for (let seq = 0; seq < 400 && !found; seq++) {
    const c = runCycle(parseHuntNode(node)!.hunt, playerStats('warrior', xpForLevel(80)), 912681864, seq, undefined, 7, {}, [], [], undefined, at);
    if (c.monsters.length === 8) {
      found = true;
      assert.ok(Number.isFinite(c.xp), 'XP do ciclo com 8 monstros');
    }
  }
  assert.ok(found, 'algum ciclo teve o Diabrete num bando de 7');
  const r = simulateHunt({ skill: 'combat', node, since: at, seed: 912681864, seq: 0 }, at + 6 * 3600_000, { vocation: 'warrior', combatXp: xpForLevel(80) } as never);
  assert.ok(Number.isFinite(r.since) && Number.isFinite(r.gains.xp.combat ?? 0));
});

test('presente de stamina: marca no banco e não repete', () => {
  const db = openDb(':memory:');
  assert.equal(db.giftGiven('teste'), false);
  db.markGift('teste', 1);
  db.markGift('teste', 2);
  assert.equal(db.giftGiven('teste'), true);
  assert.equal(db.giftGiven('outro'), false);
});

test('fim de semana de XP: +50% só na parte do trecho dentro do evento', () => {
  const e = XP_EVENTS[0];
  assert.equal(xpEventBonus(e.from - 7200_000, e.from - 3600_000), 0);
  assert.equal(xpEventBonus(e.from, e.from + 3600_000), 0.5);
  assert.equal(xpEventBonus(e.until - 1800_000, e.until + 1800_000), 0.25);
});

test('fim de semana de XP: recompensas (quest, tarefa, chefe) também ganham +50%', () => {
  const e = XP_EVENTS[0];
  assert.deepEqual(withXpEvent({ combat: 1000, mining: 0 }, e.from + 1000), { combat: 1500, mining: 0 });
  assert.deepEqual(withXpEvent({ combat: 1000 }, e.until + 1000), { combat: 1000 });
});
