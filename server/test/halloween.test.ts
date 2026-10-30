import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HALLOWEEN_START,
  HALLOWEEN_END,
  HALLOWEEN_SHOP_END,
  HALLOWEEN_CANDY,
  HALLOWEEN_CANDY_EVERY_MS,
  HALLOWEEN_OUTFITS,
  HALLOWEEN_OUTFIT_PRICE,
  HALLOWEEN_PET,
  HALLOWEEN_PET_PRICE,
  HALLOWEEN_POTION_PRICE,
  HALLOWEEN_POTION_MS,
  HALLOWEEN_BOSS_TOKEN_PRICE,
  HALLOWEEN_ESSENCE_PRICE,
  HALLOWEEN_EVENT_MOB,
  HALLOWEEN_EVENT_MOB_CHANCE,
  isHalloween,
  isHalloweenShopOpen,
  halloweenCandiesFor,
  halloweenDayOverlap,
  SPECIAL_BOSS_EVENTS,
  SPECIAL_BOSSES,
  PETS,
  monsterById,
  runCycle,
  playerStats,
  xpForLevel,
  HUNTS,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('evento de halloween: liga e desliga nas datas corretas, loja aberta mais 2 dias', () => {
  assert.ok(isHalloween(HALLOWEEN_START));
  assert.ok(!isHalloween(HALLOWEEN_START - 1));
  assert.ok(isHalloween(HALLOWEEN_END - 1));
  assert.ok(!isHalloween(HALLOWEEN_END));

  // A loja fica aberta durante o evento e mais 2 dias após o término
  assert.ok(isHalloweenShopOpen(HALLOWEEN_START));
  assert.ok(isHalloweenShopOpen(HALLOWEEN_END + 24 * 3600_000));
  assert.ok(isHalloweenShopOpen(HALLOWEEN_SHOP_END - 1));
  assert.ok(!isHalloweenShopOpen(HALLOWEEN_SHOP_END));

  // Geração de doces: 1 a cada 3 minutos
  assert.equal(halloweenCandiesFor(30 * 60_000, () => 1), 10);
  assert.equal(halloweenCandiesFor(0), 0);
  assert.equal(halloweenDayOverlap(HALLOWEEN_START - 60_000, HALLOWEEN_START + 60_000), 60_000);
});

test('abóbora assombrada: só aparece durante o evento de halloween e solta doces', () => {
  const mob = monsterById(HALLOWEEN_EVENT_MOB);
  assert.ok(mob, 'Abóbora Assombrada existe');
  assert.equal(mob?.name, 'Abóbora Assombrada');
  assert.ok(mob?.loot.some((l) => l.item === HALLOWEEN_CANDY));

  const hunt = HUNTS.find((h) => h.id === 'river_bank')!;
  const stats = playerStats('warrior', xpForLevel(30));

  // Durante o Halloween com semente conhecida que engatilha o mob
  let spawnedDuring = false;
  let spawnedOutside = false;

  for (let seq = 0; seq < 100; seq++) {
    const cycleDuring = runCycle(hunt, stats, 12345, seq, undefined, 1, {}, [], [], undefined, HALLOWEEN_START + 10_000);
    if (cycleDuring.monsters.some((m) => m.id === HALLOWEEN_EVENT_MOB)) spawnedDuring = true;

    const cycleOutside = runCycle(hunt, stats, 12345, seq, undefined, 1, {}, [], [], undefined, HALLOWEEN_END + 10_000);
    if (cycleOutside.monsters.some((m) => m.id === HALLOWEEN_EVENT_MOB)) spawnedOutside = true;
  }

  assert.ok(spawnedDuring, 'A Abóbora apareceu durante o evento');
  assert.ok(!spawnedOutside, 'A Abóbora NUNCA deve aparecer fora do evento');
});

test('doces e loja de halloween: ganho de doces e compra de mascote, trajes, poção e itens', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const char = db.createCharacter(acc, 'Corajoso', 'warrior').id;

  const t0 = HALLOWEEN_START + 10_000;
  const t1 = t0 + 60 * 60_000; // 1 hora de mineração

  game.start(char, 'mining', 'copper_vein', t0);
  game.settle(char, t1);

  const candies = game.state(char, t1).bank[HALLOWEEN_CANDY] ?? 0;
  assert.ok(candies >= 19 && candies <= 21, `Doces em 1h: ${candies}`);
  game.stop(char, t1);

  // Tentativa de compra sem doces suficientes
  assert.match(game.buyHalloweenPet(char, HALLOWEEN_PET, t1) ?? '', /doces/);

  // Adiciona doces para testar todas as compras da loja
  db.applyGains(char, { actions: 0, items: { [HALLOWEEN_CANDY]: 10_000 }, xp: {} }, t1, 0);

  // 1. Compra de Mascote (Morceguinho)
  assert.equal(game.buyHalloweenPet(char, HALLOWEEN_PET, t1), null);
  assert.ok(db.petsFor(char).includes(HALLOWEEN_PET));
  assert.match(game.buyHalloweenPet(char, HALLOWEEN_PET, t1) ?? '', /já tem/);

  // 2. Compra de Trajes (Bruxa, Vampiro, Esqueleto)
  for (const outfit of HALLOWEEN_OUTFITS) {
    assert.equal(game.buyHalloweenOutfit(char, outfit, t1), null);
    assert.ok(db.unlockedOutfitsFor(char).includes(outfit as any));
    assert.match(game.buyHalloweenOutfit(char, outfit, t1) ?? '', /já tem/);
  }

  // 3. Poção de Halloween (uma por dia por conta; 26/10: era uma por conta)
  assert.equal(game.buyHalloweenPotion(char, t1), null);
  assert.ok((game.state(char, t1).xpBoostUntil ?? 0) >= t1 + HALLOWEEN_POTION_MS);
  assert.match(game.buyHalloweenPotion(char, t1) ?? '', /uma por dia/);

  // Outro char da mesma conta não pode comprar de novo no mesmo dia; no dia seguinte pode
  const char2 = db.createCharacter(acc, 'Irmao', 'hunter').id;
  db.applyGains(char2, { actions: 0, items: { [HALLOWEEN_CANDY]: 500 }, xp: {} }, t1, 0);
  assert.match(game.buyHalloweenPotion(char2, t1) ?? '', /uma por dia/);
  assert.equal(game.buyHalloweenPotion(char2, t1 + 24 * 3_600_000), null);

  // 4. Compra de Boss Token e Essência
  const tokensBefore = game.state(char, t1).bank['boss_token'] ?? 0;
  assert.equal(game.buyHalloweenItem(char, 'boss_token', t1), null);
  assert.equal(game.state(char, t1).bank['boss_token'], tokensBefore + 1);

  const essenceBefore = game.state(char, t1).bank['boss_essence'] ?? 0;
  assert.equal(game.buyHalloweenItem(char, 'boss_essence', t1), null);
  assert.equal(game.state(char, t1).bank['boss_essence'], essenceBefore + 1);
});

test('doces ou travessuras: vale 1 vez por dia (horário BRT)', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const char = db.createCharacter(acc, 'Sortudo', 'arcanist').id;

  const t0 = HALLOWEEN_START + 12 * 3600_000;

  // Primeira vez no dia: sucesso
  const res1 = game.trickOrTreat(char, t0);
  assert.equal(res1.error, undefined);
  assert.ok(res1.result, 'Retornou resultado');
  assert.ok(['candies', 'gold', 'token', 'trick'].includes(res1.result.kind));
  assert.ok(res1.result.message.length > 0);

  // Segunda vez no mesmo dia: erro
  const res2 = game.trickOrTreat(char, t0 + 3600_000);
  assert.match(res2.error ?? '', /já participou/);

  // No dia seguinte (24h depois): sucesso novamente
  const tNextDay = t0 + 24 * 3600_000;
  const res3 = game.trickOrTreat(char, tNextDay);
  assert.equal(res3.error, undefined);
  assert.ok(res3.result, 'Conseguiu participar no dia seguinte');
});

test('cavaleiro sem cabeça: chefe global especial agendado e configurado', () => {
  const boss = SPECIAL_BOSSES.find((b) => b.id === 'headless_horseman');
  assert.ok(boss, 'Chefe Cavaleiro Sem Cabeça existe');
  assert.equal(boss?.name, 'Cavaleiro Sem Cabeça');
  assert.equal(boss?.pet, 'pet_halloween_bat');
  assert.equal(boss?.legendary, 'knight_lantern');
  assert.ok(boss?.loot.some((l) => l.item === 'halloween_candy'));

  // Eventos agendados nos sábados e 31/10
  const events = SPECIAL_BOSS_EVENTS.filter((e) => e.boss === 'headless_horseman');
  assert.ok(events.length >= 3, 'Tem pelo menos 3 aparições agendadas');

  // Checa se 31/10 às 20h BRT (23h UTC) está na lista
  const oct31 = Date.UTC(2026, 9, 31, 23, 0);
  assert.ok(events.some((e) => e.startsAt === oct31), 'Agendado em 31/10 às 20h BRT');
});

test('loja de halloween: fica aberta 2 dias após o fim e depois fecha', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const acc = db.accountForToken(db.createGuest())!;
  const char = db.createCharacter(acc, 'Tardio', 'warrior').id;

  // 1 dia após o fim do evento: evento acabou, mas loja ainda aberta
  const tAfterEvent = HALLOWEEN_END + 24 * 3600_000;
  assert.ok(!isHalloween(tAfterEvent));
  assert.ok(isHalloweenShopOpen(tAfterEvent));

  db.applyGains(char, { actions: 0, items: { [HALLOWEEN_CANDY]: 2000 }, xp: {} }, tAfterEvent, 0);
  assert.equal(game.buyHalloweenOutfit(char, 'witch', tAfterEvent), null);

  // Após fechamento da loja
  const tAfterShop = HALLOWEEN_SHOP_END + 1000;
  assert.ok(!isHalloweenShopOpen(tAfterShop));
  assert.match(game.buyHalloweenOutfit(char, 'plague_doctor', tAfterShop) ?? '', /fechada/);
  assert.match(game.buyHalloweenPet(char, HALLOWEEN_PET, tAfterShop) ?? '', /fechada/);
  assert.match(game.trickOrTreat(char, tAfterShop).error ?? '', /não está ativo/);
});

test('abóbora assombrada: personagem alto em caçada fraca só ganha os doces do tempo (sem farm de bando x7)', async () => {
  const { huntNode } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const game = createGame(db);
  const make = (name: string) => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, name, 'warrior').id;
    db.applyGains(c, { actions: 0, items: {}, xp: { combat: Math.round(xpForLevel(200)), melee: Math.round(xpForLevel(90)) } }, 0, 0);
    return c;
  };
  const low = HUNTS.find((h) => !h.boss && !h.lair && h.level <= 10)!;
  const t0 = HALLOWEEN_START + 10_000;
  const t1 = t0 + 3 * 60 * 60_000;
  const alto = make('Alto');
  game.start(alto, 'combat', huntNode(low.id, 'normal', 7), t0);
  game.settle(alto, t1);
  const candies = game.state(alto, t1).bank[HALLOWEEN_CANDY] ?? 0;
  // 3 h de atividade = ~60 doces do tempo; sem a trava, centenas de abóboras no bando x7.
  assert.ok(candies <= 62, `doces em caçada fraca: ${candies}`);
});

test('halloween: Rei Espantalho e Abóbora Gigante revezam às 12h, 18h e 22h e cada um tem o seu loot', async () => {
  const { bossEventAt, bossReward } = await import('@grimhold/shared');
  const brt = (d: number, h: number, m = 0) => Date.UTC(2026, 9, d, h + 3, m);
  const ids = [brt(23, 22, 5), brt(24, 12, 5), brt(24, 18, 5), brt(25, 12, 5)].map((t) => bossEventAt(t).boss.id);
  assert.deepEqual(ids, ['scarecrow_king', 'giant_pumpkin', 'scarecrow_king', 'giant_pumpkin']);
  assert.equal(bossEventAt(brt(24, 22, 5)).boss.id, 'headless_horseman', '24/10 às 22h é o Cavaleiro');
  assert.ok(bossEventAt(brt(25, 22, 5)).active);
  assert.ok(!['scarecrow_king', 'giant_pumpkin'].includes(bossEventAt(Date.UTC(2026, 10, 9, 15, 5)).boss.id), 'acaba em 08/11');
  // Nenhum chefe diário cai no horário ímpar (chefes de sempre).
  for (const e of SPECIAL_BOSS_EVENTS.filter((e) => e.boss === 'scarecrow_king' || e.boss === 'giant_pumpkin')) assert.equal(((new Date(e.startsAt).getUTCHours() - 3 + 24) % 24) % 2, 0);
  const king = SPECIAL_BOSSES.find((b) => b.id === 'scarecrow_king')!;
  const pumpkin = SPECIAL_BOSSES.find((b) => b.id === 'giant_pumpkin')!;
  const rk = bossReward(king, 1_000_500, 1, 50, 100_000, true, true, 100_000);
  const rp = bossReward(pumpkin, 1_000_501, 1, 50, 100_000, true, true, 100_000);
  assert.ok((rk.loot?.[HALLOWEEN_CANDY] ?? 0) >= 30 && (rk.loot?.boss_token ?? 0) >= 3);
  assert.ok((rp.loot?.[HALLOWEEN_CANDY] ?? 0) >= 30 && !rp.loot?.boss_token);
});
