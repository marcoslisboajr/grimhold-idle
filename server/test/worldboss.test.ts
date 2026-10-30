import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_HP_PER_PLAYER, BOSS_SHARE_MIN, WORLD_BOSS_NODE, XP_TABLE, bossDrain, bossEventAt, bossEventById, bossReward, defaultSpells, playerStats, rotationBoss, WORLD_BOSSES, itemById as itemOf, BOSS_TOKEN_SHOP_ITEMS } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { createWorldBoss } from '../src/worldboss.ts';

const EVERY = 60_000;
const DURATION = 20_000;

function setup(durationMs = DURATION) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game, { everyMs: durationMs > EVERY ? durationMs * 4 : EVERY, durationMs });
  const make = (name: string, level: number) => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, name, 'warrior');
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[level] } }, 0, 0);
    return c.id;
  };
  return { db, game, boss, make };
}

test('agenda: aparece a cada intervalo, fica um tempo e os chefes se revezam', () => {
  const a = bossEventAt(EVERY + 1000, EVERY, DURATION);
  assert.equal(a.active, true);
  assert.equal(a.startsAt, EVERY);
  const b = bossEventAt(EVERY + DURATION + 1, EVERY, DURATION);
  assert.equal(b.active, false);
  assert.equal(b.startsAt, 2 * EVERY);
  assert.notEqual(a.boss.id, b.boss.id);
});

test('chefe global: entra, bate junto, cai e todos recebem pelo dano', () => {
  const { db, boss, make } = setup();
  const strong = make('Forte', 70);
  const weak = make('Fraco', 20);
  assert.equal(boss.join(strong, 0), 'Não há chefe global agora.');
  const t0 = EVERY;
  assert.ok(boss.tick(t0).announce, 'anuncia o chefe');
  assert.equal(boss.join(strong, t0), null);
  assert.equal(boss.join(weak, t0), null);
  assert.equal(db.activityFor(strong)?.node, WORLD_BOSS_NODE);
  const v = boss.view(strong, t0);
  assert.equal(v.active, true);
  // Cada um soma o próprio dano de BOSS_SHARE_SECS: o forte soma mais que o fraco.
  assert.ok(v.maxHp >= BOSS_SHARE_MIN * 2 && v.maxHp !== BOSS_HP_PER_PLAYER * 2, `vida ${v.maxHp}`);
  assert.equal(v.fighters.length, 2);
  assert.equal(v.grew, 1, 'avisa que a vida subiu com quem entrou');
  assert.equal(boss.view(strong, t0 + 60_000).grew, undefined, 'o aviso some');
  // Bate até cair ou o tempo acabar.
  let results: ReturnType<typeof boss.tick>['results'] = [];
  for (let t = t0 + 1000; t <= t0 + DURATION && results.length === 0; t += 1000) results = boss.tick(t).results;
  assert.equal(results.length, 2);
  const r = results.find((x) => x.characterId === strong)!;
  assert.ok(r.damage > results.find((x) => x.characterId === weak)!.damage);
  assert.ok(r.reward.xp > 0 && r.reward.gold > 0);
  assert.equal(db.activityFor(strong), null, 'sai da arena no fim');
  assert.ok((db.bankFor(strong).gold ?? 0) > 0);
  // O resultado fica guardado (o modal sumia ao fechar).
  const hist = db.bossResultsFor(strong);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].damage, r.damage);
  assert.equal(hist[0].reward.xp, r.reward.xp);
  // Caiu antes do fim do horário: a barra já mostra o próximo, não "em 0:00".
  const after = boss.view(strong, t0 + 5000);
  assert.equal(after.active, false);
  assert.equal(after.startsAt, 2 * EVERY);
});

test('chefe global: a vida acompanha a força; forte e fraco ganham a parte inteira batendo o que podem', () => {
  const LONG = 15 * 60_000;
  const { boss, make } = setup(LONG);
  const strong = make('Forte', 80);
  const weak = make('Fraco', 20);
  const t0 = LONG * 4;
  boss.tick(t0);
  boss.join(weak, t0);
  const onlyWeak = boss.view(weak, t0).maxHp;
  boss.join(strong, t0);
  const both = boss.view(weak, t0).maxHp;
  assert.ok(both - onlyWeak > onlyWeak * 2, `o forte soma bem mais vida (${onlyWeak} → ${both})`);
  let results: ReturnType<typeof boss.tick>['results'] = [];
  for (let t = t0 + 1000; t <= t0 + LONG && results.length === 0; t += 1000) results = boss.tick(t).results;
  const r = (id: number) => results.find((x) => x.characterId === id)!;
  assert.ok(r(strong).killed, `o chefe cai (${JSON.stringify(results.map((x) => [x.damage, x.killed]))} de ${both})`);
  // Recompensa relativa à própria parte: o fraco não fica com migalhas.
  assert.ok(r(weak).reward.tokens! >= 1);
  assert.ok(r(weak).reward.xp > 0);
});

test('recompensa: fugiu paga um quarto e nunca o lendário; sem dano, nada', () => {
  const b = WORLD_BOSSES[0];
  const killed = bossReward(b, 1, 1, 50, BOSS_HP_PER_PLAYER, true, true);
  const fled = bossReward(b, 1, 1, 50, BOSS_HP_PER_PLAYER, false, true);
  assert.equal(fled.xp, Math.round(killed.xp / 4));
  assert.equal(fled.legendary, undefined);
  assert.equal(fled.legendaries, undefined);
  assert.deepEqual(bossReward(b, 1, 1, 50, 0, true, true), { xp: 0, gold: 0 });
  // Cada abate agora tem chance rara de dropar no máximo 1 item do set (oldschool grinder)
  const perItem: Record<string, number> = {};
  let anyDrop = 0;
  for (let id = 1; id <= 1000; id++) {
    const r = bossReward(b, 7, id, 50, BOSS_HP_PER_PLAYER, true, false);
    assert.ok((r.tokens ?? 0) >= 1, 'derrotar dá fichas do chefe');
    const got = r.legendaries ?? [];
    assert.ok(got.length <= 1, 'no máximo um item lendário por vitória');
    if (got.length) {
      anyDrop++;
      for (const it of got) perItem[it] = (perItem[it] ?? 0) + 1;
    }
  }
  // Com ~4% de chance em 1000 vitórias, esperamos entre 20 e 70 drops no total
  assert.ok(anyDrop > 15 && anyDrop < 80, `drops raros esperados no grinder: ${anyDrop}/1000`);
});

test('chefes: todo item do set e das bolsas existe, é lendário e tem ícone', async () => {
  const { itemById } = await import('@grimhold/shared');
  const { existsSync } = await import('node:fs');
  for (const boss of WORLD_BOSSES) {
    for (const id of boss.legendarySet) {
      const it = itemById(id);
      assert.ok(it?.legendary, `${id} lendário`);
      assert.ok(existsSync(new URL(`../../client/public/assets/icons/${it!.icon}.png`, import.meta.url)), `ícone de ${id}`);
      if (it!.pouch) {
        assert.equal(it!.pool!.length, 4, 'uma arma por vocação');
        const vocs = it!.pool!.map((w) => itemById(w)!.equip!.vocations![0]).sort();
        assert.deepEqual(vocs, ['arcanist', 'devout', 'hunter', 'warrior']);
        for (const w of it!.pool!) assert.ok(itemById(w)?.legendary && existsSync(new URL(`../../client/public/assets/icons/${itemById(w)!.icon}.png`, import.meta.url)));
      }
    }
  }
});

test('bolsa de armas: abrir gasta a bolsa e entrega uma arma da lista', () => {
  const { db, game, make } = setup();
  const c = make('Sortudo', 40);
  assert.equal(game.openPouch(c, 'ancient_weapon_pouch', 0).error, 'Você não tem essa bolsa.');
  assert.equal(game.openPouch(c, 'iron_sword', 0).error, 'Isso não é uma bolsa.');
  db.applyGains(c, { actions: 0, items: { ancient_weapon_pouch: 2 }, xp: {} }, 0, 0);
  const { item } = game.openPouch(c, 'ancient_weapon_pouch', 0);
  assert.ok(BOSS_TOKEN_SHOP_ITEMS.includes('ancient_weapon_pouch'));
  assert.ok(['ancient_dragon_blade', 'ancient_dragon_bow', 'ancient_dragon_staff', 'ancient_dragon_mace'].includes(item!));
  const bank = db.bankFor(c);
  assert.equal(bank.ancient_weapon_pouch, 1);
  assert.equal(bank[item!], 1);
});

test('bolsa de armas: a arma da vocação de quem abre sai mais (perto de 55%)', () => {
  const { db, game, make } = setup();
  const c = make('Pesado', 40);
  db.applyGains(c, { actions: 0, items: { ancient_weapon_pouch: 400 }, xp: {} }, 0, 0);
  const vocation = db.characterById(c)!.vocation;
  let own = 0;
  for (let i = 0; i < 400; i++) {
    const { item } = game.openPouch(c, 'ancient_weapon_pouch', 0);
    if (itemOf(item!)?.equip?.vocations?.includes(vocation)) own++;
  }
  assert.ok(own > 400 * 0.45 && own < 400 * 0.65, `saiu ${own}/400 da vocação`);
});

test('chefe global: um reinício no meio do evento não apaga o dano', () => {
  const { db, game, boss, make } = setup();
  const a = make('Antes', 60);
  const t0 = EVERY;
  boss.tick(t0);
  assert.equal(boss.join(a, t0), null);
  boss.tick(t0 + 3000);
  const before = boss.view(a, t0 + 3000).fighters[0].damage;
  assert.ok(before > 0);
  // "Reinicia": um módulo novo, com o mesmo banco.
  const again = createWorldBoss(db, game, { everyMs: EVERY, durationMs: DURATION });
  const r = again.tick(t0 + 4000);
  assert.equal(r.announce, undefined, 'evento retomado não grita de novo');
  assert.ok(again.isFighting(a));
  assert.ok(again.view(a, t0 + 4000).fighters[0].damage >= before);
});

test('chefe global: evento que acabou com o servidor fora é pago ao voltar', () => {
  const { db, game, boss, make } = setup();
  const a = make('Caiu', 60);
  const t0 = EVERY;
  boss.tick(t0);
  boss.join(a, t0);
  boss.tick(t0 + 2000);
  const gold0 = db.bankFor(a).gold ?? 0;
  const again = createWorldBoss(db, game, { everyMs: EVERY, durationMs: DURATION });
  const r = again.tick(t0 + DURATION + 5000);
  assert.equal(r.results.length, 1);
  assert.equal(r.results[0].characterId, a);
  assert.ok((db.bankFor(a).gold ?? 0) > gold0);
  assert.equal(again.tick(t0 + DURATION + 6000).results.length, 0, 'não paga duas vezes');
});

test('chefe global bate: quem está sem equipamento cai, fica 30s sem bater e volta com a vida cheia', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game, { everyMs: 600_000, durationMs: 300_000 });
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Pelado', 'arcanist');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[20] } }, 0, 0);
  const t0 = 600_000;
  boss.tick(t0);
  assert.equal(boss.join(c.id, t0), null);
  let t = t0;
  let me = boss.view(c.id, t).fighters[0];
  while (!me.downUntil && t < t0 + 120_000) {
    t += 1000;
    boss.tick(t);
    me = boss.view(c.id, t).fighters[0];
  }
  assert.ok(me.downUntil, 'caiu');
  assert.ok(t - t0 < 60_000, 'sem equipamento cai em menos de 1 min');
  // Caído: o dano não sobe.
  const dmg = me.damage;
  boss.tick(t + 10_000);
  assert.equal(boss.view(c.id, t + 10_000).fighters[0].damage, dmg);
  // Depois de 30s volta a bater, com a vida cheia (menos o que já apanhou desde a volta).
  boss.tick(me.downUntil! + 1000);
  const back = boss.view(c.id, me.downUntil! + 1000).fighters[0];
  assert.equal(back.downUntil, undefined);
  assert.ok(back.damage > dmg);
  // Vida cheia na volta (um golpe em área do chefe, até 30%, pode acertar logo em seguida).
  assert.ok(back.hp > 0.6, `vida na volta ${back.hp}`);
});

test('chefe global: usa a poção, a runa de cura e a runa de ataque, gastando do banco', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game, { everyMs: 600_000, durationMs: 300_000 });
  const make = (name: string, items: Record<string, number>) => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, name, 'arcanist');
    db.applyGains(c.id, { actions: 0, items, xp: { combat: XP_TABLE[20] } }, 0, 0);
    return c.id;
  };
  const plain = make('Seco', {});
  const geared = make('Preparado', { strength_potion: 5, light_heal_rune: 20, spark_rune: 20 });
  db.setPotion(geared, 'strength_potion');
  db.setRune(geared, 'heal', 'light_heal_rune');
  db.setRune(geared, 'attack', 'spark_rune');
  const t0 = 600_000;
  boss.tick(t0);
  boss.join(plain, t0);
  boss.join(geared, t0);
  let fellPlain = 0;
  let fellGeared = 0;
  for (let t = t0 + 1000; t <= t0 + 60_000; t += 1000) {
    boss.tick(t);
    const v = boss.view(plain, t).fighters;
    if (!fellPlain && v.find((f) => f.name === 'Seco')?.downUntil) fellPlain = t;
    if (!fellGeared && v.find((f) => f.name === 'Preparado')?.downUntil) fellGeared = t;
  }
  const bank = db.bankFor(geared);
  assert.equal(bank.strength_potion, 4, 'bebeu 1 poção');
  assert.ok((bank.light_heal_rune ?? 0) < 20, 'usou runa de cura');
  assert.ok((bank.spark_rune ?? 0) < 20, 'usou runa de ataque');
  assert.ok(!fellGeared || fellGeared > fellPlain, 'com cura aguenta mais');
  const dmg = (name: string) => boss.view(plain, t0 + 60_000).fighters.find((f) => f.name === name)!.damage;
  assert.ok(dmg('Preparado') > dmg('Seco'), 'com poção e runa bate mais');
});

test('chefe global: escala dano proporcionalmente ao entrar novo membro e veda portal nos minutos finais', () => {
  const { db, boss, make } = setup();
  const c1 = make('Primeiro', 50);
  const c2 = make('Segundo', 50);

  const t0 = EVERY;
  boss.tick(t0);
  boss.join(c1, t0);

  // c1 bate por 5 segundos
  for (let t = t0 + 1000; t <= t0 + 5000; t += 1000) {
    boss.tick(t);
  }

  const v1 = boss.view(c1, t0 + 5000);
  const hpPercent1 = v1.hp / v1.maxHp;
  assert.ok(hpPercent1 < 1.0, 'o chefe já perdeu parte da vida');

  // c2 entra na luta agora: a porcentagem de vida do chefe deve ser preservada!
  boss.join(c2, t0 + 5000);
  const v2 = boss.view(c1, t0 + 5000);
  const hpPercent2 = v2.hp / v2.maxHp;
  // A diferença entre as porcentagens de HP não pode ser maior que 0.01 (1%)
  assert.ok(Math.abs(hpPercent1 - hpPercent2) < 0.01, `porcentagem preservada: antes=${hpPercent1}, depois=${hpPercent2}`);

  // Teste do portal vedado na fase final (ex: a menos de 3 minutos do fim)
  // No setup o DURATION é 20_000 e BOSS_JOIN_CUTOFF_MS é 3 * 60_000 (portanto já está no cutoff)
  const c3 = make('Atrasado', 30);
  const lateRes = boss.join(c3, t0 + 19_000);
  assert.match(lateRes ?? '', /selado/);
});


test('chefe global: as magias saem de verdade (aparecem lançadas, com dano) e ninguém fica imortal', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game, { everyMs: 600_000, durationMs: 300_000 });
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Mago', 'arcanist');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[60] } }, 0, 0);
  const t0 = 600_000;
  boss.tick(t0);
  assert.equal(boss.join(c.id, t0), null);
  const seen = new Set<string>();
  for (let t = t0 + 1000; t <= t0 + 30_000; t += 1000) {
    boss.tick(t);
    for (const k of boss.view(c.id, t).fighters[0].casts ?? []) if (k.dmg) seen.add(k.id);
  }
  assert.ok(seen.size > 0, 'lançou golpe de magia no chefe');

  // Defesa altíssima: a perda continua positiva e cai em até 5 min.
  for (const voc of ['devout', 'warrior']) {
    const p = playerStats(voc, XP_TABLE[100], { attack: 0, defense: 5000, hp: 0 }, null, defaultSpells(voc, 100));
    const d = bossDrain(p, 100, voc);
    assert.ok(d > 0 && 1 / d <= 300, `${voc} não fica imortal`);
  }
});

test('revezamento: ordem sorteada a cada volta, todos aparecem, sem repetir seguido e em horários variados', () => {
  const n = WORLD_BOSSES.length;
  const hours = new Map<string, Set<number>>();
  for (let id = 240_000; id < 240_000 + n * 100; id++) {
    assert.notEqual(rotationBoss(id).id, rotationBoss(id + 1).id, `repetiu em ${id}`);
    assert.equal(rotationBoss(id).id, rotationBoss(id).id, 'sorteio fixo pelo número do evento');
    assert.equal(bossEventById(id).boss.id, rotationBoss(id).id);
    const b = rotationBoss(id).id;
    if (!hours.has(b)) hours.set(b, new Set());
    hours.get(b)!.add(id % 12);
  }
  for (let r = 240_000 / n; r < 240_000 / n + 50; r++) {
    const round = new Set(Array.from({ length: n }, (_, k) => rotationBoss(Math.floor(r) * n + k).id));
    assert.equal(round.size, n, 'cada volta tem todos os chefes');
  }
  for (const w of WORLD_BOSSES) assert.ok((hours.get(w.id)?.size ?? 0) >= 8, `${w.id} aparece em vários horários`);
});

test('chefe global: com mais de 12 na arena, quem vê sempre aparece entre os desenhados', () => {
  const { boss, make } = setup();
  const t0 = EVERY;
  boss.tick(t0);
  // 12 fortes e um fraco (o de menos dano, fora dos 12 de cima).
  const ids = Array.from({ length: 12 }, (_, i) => make(`Forte${i}`, 90));
  const weak = make('Fraco', 5);
  for (const id of [...ids, weak]) assert.equal(boss.join(id, t0), null);
  for (let t = t0 + 1000; t <= t0 + 10_000; t += 1000) boss.tick(t);
  const v = boss.view(weak, t0 + 10_000);
  assert.equal(v.fighting, 13);
  assert.equal(v.fighters.length, 12);
  assert.ok(v.fighters.some((f) => f.name === 'Fraco'), 'o fraco se vê na arena');
  assert.ok(!boss.view(ids[0], t0 + 10_000).fighters.some((f) => f.name === 'Fraco'), 'para os outros, os 12 de mais dano');
});

test('chefe global: XP ×4 até o 120, caindo até ×1 no 150', async () => {
  const { bossLowLevelXpMult, bossReward, WORLD_BOSSES, BOSS_HP_PER_PLAYER } = await import('@grimhold/shared');
  assert.equal(bossLowLevelXpMult(1), 4);
  assert.equal(bossLowLevelXpMult(120), 4);
  assert.equal(bossLowLevelXpMult(135), 2.5);
  assert.equal(bossLowLevelXpMult(150), 1);
  assert.equal(bossLowLevelXpMult(260), 1);
  const b = WORLD_BOSSES[0];
  const r = (lv: number) => bossReward(b, 1, 1, lv, BOSS_HP_PER_PLAYER, true, false).xp;
  const { xpForLevel } = await import('@grimhold/shared');
  const frac = (lv: number) => r(lv) / (xpForLevel(lv + 1) - xpForLevel(lv));
  assert.ok(Math.abs(frac(80) / frac(200) - 4) < 0.01);
});

test('quests: XP ×3 até o 120, caindo até ×1 no 150', async () => {
  const { questLowLevelXpMult } = await import('@grimhold/shared');
  assert.equal(questLowLevelXpMult(1), 3);
  assert.equal(questLowLevelXpMult(120), 3);
  assert.equal(questLowLevelXpMult(135), 2);
  assert.equal(questLowLevelXpMult(150), 1);
  assert.equal(questLowLevelXpMult(300), 1);
});
