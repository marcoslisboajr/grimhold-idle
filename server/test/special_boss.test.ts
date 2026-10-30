import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossEventAt, bossEventById, bossReward, specialBossWarning, SPECIAL_BOSS_EVENTS, itemById, BOSS_EVERY_MS } from '@grimhold/shared';

const sp = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'malgoroth')!;

test('Malgoroth: aparece só no horário marcado, por 30 minutos, e depois volta o revezamento', () => {
  assert.equal(sp.startsAt, Date.UTC(2026, 9, 9, 23, 30), '20h30 de Brasília');
  const before = bossEventAt(sp.startsAt - 10 * 60_000);
  assert.equal(before.boss.id, 'malgoroth', 'é o próximo anunciado');
  assert.equal(before.active, false);
  const during = bossEventAt(sp.startsAt + 29 * 60_000);
  assert.equal(during.boss.id, 'malgoroth');
  assert.equal(during.active, true);
  assert.equal(during.endsAt - during.startsAt, 30 * 60_000);
  const after = bossEventAt(sp.startsAt + 30 * 60_000);
  assert.notEqual(after.boss.id, 'malgoroth');
  assert.ok(after.id < 1_000_000);
  // Bem antes (enquanto um chefe normal está no ar) não atrapalha o revezamento.
  const regular = bossEventAt(Math.floor(sp.startsAt / BOSS_EVERY_MS) * BOSS_EVERY_MS + 60_000);
  assert.notEqual(regular.boss.id, 'malgoroth');
  assert.equal(regular.active, true);
});

test('Malgoroth: retoma pelo número do evento e só ele derruba os 4 itens', () => {
  const ev = bossEventById(sp.id);
  assert.equal(ev.boss.id, 'malgoroth');
  assert.equal(ev.startsAt, sp.startsAt);
  for (const id of ev.boss.legendarySet) assert.ok(itemById(id)?.legendary, id);
  // Algum lutador acaba ganhando um item do set dele.
  let got: string | undefined;
  for (let c = 1; c < 400 && !got; c++) got = bossReward(ev.boss, sp.id, c, 80, 50_000, true, true, 50_000).legendary;
  assert.ok(got && ev.boss.legendarySet.includes(got));
});

test('Malgoroth: vida de 18 minutos do grupo e recompensa na mesma proporção', () => {
  const mal = bossEventById(sp.id).boss;
  assert.equal(mal.shareSecs, 18 * 60);
  const normal = bossEventById(1).boss;
  // Mesma fração da parte de cada um: XP e ouro 3,6x maiores.
  const rN = bossReward(normal, 1, 7, 80, 1000, true, false, 1000);
  const rM = bossReward(mal, sp.id, 7, 80, 1000, true, false, 1000);
  assert.ok(Math.abs(rM.xp / rN.xp - 3.6) < 0.01, `${rM.xp} / ${rN.xp}`);
});

test('Malgoroth: avisos de raid 3h, 2h, 1h e 10 min antes, cada um uma vez só', () => {
  const at = (ms: number) => specialBossWarning(sp.startsAt - ms - 1000, sp.startsAt - ms);
  assert.match(at(3 * 3600_000)!, /3 horas/);
  assert.match(at(2 * 3600_000)!, /2 horas/);
  assert.match(at(3600_000)!, /1 hora/);
  assert.match(at(10 * 60_000)!, /10 minutos/);
  assert.equal(specialBossWarning(sp.startsAt - 3600_000, sp.startsAt - 3600_000 + 5000), undefined, 'não repete no tick seguinte');
  assert.equal(bossEventById(sp.id).boss.music, 'malgoroth');
});

test('chefes globais: todos têm loot a mais com itens que existem, e o set de cada um existe', async () => {
  const { WORLD_BOSSES, SPECIAL_BOSSES } = await import('@grimhold/shared');
  assert.equal(WORLD_BOSSES.length, 11, '4 antigos + Ferathos, Ghazrael e a Viúva + os Avatares dos 4 deuses');
  for (const b of [...WORLD_BOSSES, ...SPECIAL_BOSSES]) {
    assert.ok(b.loot?.length, `${b.id} tem loot`);
    for (const l of b.loot!) assert.ok(itemById(l.item), `${b.id}: ${l.item}`);
    for (const id of b.legendarySet) assert.ok(itemById(id), `${b.id}: ${id}`);
  }
  assert.equal(WORLD_BOSSES.find((b) => b.id === 'ferathos_avatar')!.minions!.count, 4);
  assert.equal(WORLD_BOSSES.find((b) => b.id === 'ghazrael_herald')!.minions!.count, 8);
  // Quem ajudou a derrubar leva loot a mais (alguém entre vários jogadores).
  const ghaz = WORLD_BOSSES.find((b) => b.id === 'ghazrael_herald')!;
  let got = 0;
  for (let c = 1; c <= 20; c++) got += Object.keys(bossReward(ghaz, 5, c, 70, 1000, true, false, 1000).loot ?? {}).length;
  assert.ok(got > 10, `loot sorteado: ${got}`);
  assert.equal(bossReward(ghaz, 5, 1, 70, 1000, false, false, 1000).loot, undefined, 'fugiu: sem loot');
});

test('Malgoroth: participantes ganham a outfit Andarilho (wanderer) ao fim da invasão', async () => {
  const { openDb } = await import('../src/db.ts');
  const { createGame } = await import('../src/game.ts');
  const { createWorldBoss } = await import('../src/worldboss.ts');
  const { XP_TABLE } = await import('@grimhold/shared');

  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game);

  const token = db.createGuest();
  const acc = db.accountForToken(token)!;
  const c = db.createCharacter(acc, 'Heroi', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[50] } }, 0, 0);

  assert.ok(!db.unlockedOutfitsFor(c.id).includes('wanderer'), 'começa sem a outfit');

  // Inicia o evento no horário de Malgoroth
  const t0 = sp.startsAt;
  boss.tick(t0);
  assert.equal(boss.join(c.id, t0), null, 'consegue entrar na invasão');

  // Causa dano
  boss.tick(t0 + 2000);

  // Termina o evento
  const finishResults = boss.tick(t0 + sp.durationMs).results;
  const myRes = finishResults.find((r) => r.characterId === c.id);

  assert.ok(myRes, 'jogador está nos resultados');
  assert.equal(myRes.reward.outfit, 'wanderer', 'recompensa inclui o traje wanderer');
  assert.ok(db.unlockedOutfitsFor(c.id).includes('wanderer'), 'traje foi liberado no banco para o jogador');
});


test('Zharvos: invasão de 30 min no sábado 24/10 às 20h; o chapéu cai para um só que bateu', async () => {
  const { openDb } = await import('../src/db.ts');
  const { createGame } = await import('../src/game.ts');
  const { createWorldBoss } = await import('../src/worldboss.ts');
  const { XP_TABLE } = await import('@grimhold/shared');
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'zharvos')!;
  assert.equal(ev.startsAt, Date.UTC(2026, 9, 24, 23, 0), '20h de Brasília');
  assert.equal(ev.durationMs, 30 * 60_000);
  assert.equal(bossEventById(ev.id).boss.addon, 'wizard_hat');

  const db = openDb(':memory:');
  const game = createGame(db);
  const boss = createWorldBoss(db, game);
  const ids = ['Mago', 'Guerreira', 'Arqueiro'].map((n, i) => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, n, (['arcanist', 'warrior', 'hunter'] as const)[i]);
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[150] } }, 0, 0);
    return c.id;
  });
  boss.tick(ev.startsAt);
  for (const id of ids) assert.equal(boss.join(id, ev.startsAt), null);
  let results: Awaited<ReturnType<typeof boss.tick>>['results'] = [];
  for (let t = ev.startsAt + 5000; t <= ev.startsAt + ev.durationMs && !results.length; t += 5000) results = boss.tick(t).results;
  assert.equal(results.length, 3);
  assert.ok(results[0].killed, 'o grupo derruba o Arquimago');
  const winners = results.filter((r) => r.reward.addon === 'wizard_hat');
  assert.equal(winners.length, 1, 'um só ganha o chapéu');
  assert.ok(db.unlockedAddonsFor(winners[0].characterId).includes('wizard_hat'));
  assert.equal(ids.filter((id) => db.unlockedAddonsFor(id).includes('wizard_hat')).length, 1);
  assert.ok(game.takeAnnouncements().some((m) => m.includes('Chapéu do Arquimago')), 'aviso no chat');
});

test('Zharvos: gente entrando no meio da luta não devolve vida, e reiniciar o servidor não estraga a luta', async () => {
  const { openDb } = await import('../src/db.ts');
  const { createGame } = await import('../src/game.ts');
  const { createWorldBoss } = await import('../src/worldboss.ts');
  const { XP_TABLE } = await import('@grimhold/shared');
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'zharvos')!;
  const db = openDb(':memory:');
  const game = createGame(db);
  let boss = createWorldBoss(db, game);
  const mk = (n: string, voc: 'arcanist' | 'warrior' | 'hunter' | 'devout') => {
    const c = db.createCharacter(db.accountForToken(db.createGuest())!, n, voc);
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[150] } }, 0, 0);
    return c.id;
  };
  const first = [mk('Um', 'arcanist'), mk('Dois', 'warrior')];
  const late = [mk('Tres', 'hunter'), mk('Quatro', 'devout'), mk('Cinco', 'arcanist')];
  boss.tick(ev.startsAt);
  for (const id of first) assert.equal(boss.join(id, ev.startsAt), null);
  const frac = (id: number, t: number) => {
    const v = boss.view(id, t) as { hp: number; maxHp: number };
    return v.hp / v.maxHp;
  };
  let t = ev.startsAt;
  // Bate uns minutos (passa por Dreno de Mana, que cura) e depois entra mais gente, um por vez.
  for (; t < ev.startsAt + 4 * 60_000; t += 5000) assert.equal(boss.tick(t).results.length, 0);
  for (const id of late) {
    const before = frac(first[0], t);
    assert.equal(boss.join(id, t), null);
    const after = frac(first[0], t);
    assert.ok(Math.abs(after - before) < 0.01, `entrar mudou a vida de ${before.toFixed(3)} para ${after.toFixed(3)}`);
  }
  // Reinicia o servidor no meio: a luta continua do banco e acaba.
  boss = createWorldBoss(db, game);
  let results: Awaited<ReturnType<typeof boss.tick>>['results'] = [];
  for (; t <= ev.startsAt + ev.durationMs && !results.length; t += 5000) results = boss.tick(t).results;
  assert.equal(results.length, first.length + late.length, 'todos nos resultados');
  assert.equal(results.filter((r) => r.reward.addon === 'wizard_hat').length, results[0].killed ? 1 : 0);
});

test('Casca Mortal de Zharvos: instância de demônios do 150, chance rara do chapéu', async () => {
  const { huntById, monsterById, ZHARVOS_SANCTUM, ZHARVOS_HAT_CHANCE } = await import('@grimhold/shared');
  const h = huntById(ZHARVOS_SANCTUM)!;
  assert.equal(h.level, 150);
  assert.ok(h.boss && h.key && itemById(h.key));
  assert.equal(h.monsters.at(-1), 'zharvos_shell');
  for (const m of [...h.monsters, ...(h.trash ?? [])]) assert.ok(monsterById(m), m);
  assert.ok(ZHARVOS_HAT_CHANCE > 0 && ZHARVOS_HAT_CHANCE < 0.01, 'menos de 1%');
});

test('covil (aba Chefes): muito abaixo toma IK no primeiro golpe; acima apanha mais; chefe global sem IK', async () => {
  const { HUNTS, lairIK, lairOverMult, bossMinLevel, playerStats, runCycle, XP_TABLE } = await import('@grimhold/shared');
  const nest = HUNTS.find((h) => h.id === 'falcon_nest')!;
  assert.equal(bossMinLevel(nest), 0, 'covil não trava a entrada');
  assert.ok(lairIK(nest, 219) && !lairIK(nest, 220));
  assert.equal(lairOverMult(nest, 240), 1);
  assert.equal(lairOverMult(nest, 265), 2);
  // IK: o personagem baixo cai no primeiro golpe do chefe.
  const low = { ...playerStats('warrior', XP_TABLE[150]), level: 150 };
  const c = runCycle(nest, low, 7, 0);
  assert.equal(c.outcome, 'death');
  assert.equal(c.hits.filter((h) => h.by !== 'p' && h.by !== 'a').length, 1, 'um golpe só');
});

test("Ghaz'Morath: avisos desde as 9h do dia (9h, 12h, 15h, 17h, 18h, 19h e 19h50)", () => {
  const ev = SPECIAL_BOSS_EVENTS.find((e) => e.boss === 'ghazmorath')!;
  const brt = (h: number, m = 0) => Date.UTC(2026, 9, 17, h + 3, m);
  for (const [h, m] of [[9, 0], [12, 0], [15, 0], [17, 0], [18, 0], [19, 0], [19, 50]]) {
    assert.ok(specialBossWarning(brt(h, m) - 1000, brt(h, m)), `aviso às ${h}h${m || ''}`);
  }
  assert.equal(specialBossWarning(brt(8, 59) - 1000, brt(8, 59)), undefined);
  assert.equal(ev.startsAt, brt(20));
});
