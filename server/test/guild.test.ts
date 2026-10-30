import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUILD_TASKS, XP_TABLE, guildTaskById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Artesã', 'warrior').id;
  return { db, game, id };
}

test('Encomendas da Guilda: todas as profissões (menos Sigilismo) têm encomendas, do nível 1 em diante', () => {
  const skills = new Set(GUILD_TASKS.map((t) => t.skill));
  for (const s of ['mining', 'fishing', 'woodcutting', 'herbalism', 'soulreaping', 'smithing', 'cooking', 'crafting', 'alchemy', 'runecraft', 'fletching', 'jewelcrafting']) {
    assert.ok(skills.has(s as never), s);
    assert.ok(GUILD_TASKS.some((t) => t.skill === s && t.level <= 1), `${s} tem encomenda de nível 1`);
  }
  assert.equal(new Set(GUILD_TASKS.map((t) => t.id)).size, GUILD_TASKS.length, 'ids únicos');
});

test('Encomenda: uma por profissão, conta o que a profissão rende, entrega dá XP, ouro e Selos; a loja gasta Selos', () => {
  const { db, game, id } = setup();
  const def = GUILD_TASKS.find((t) => t.skill === 'mining' && t.level === 1)!;
  assert.match(game.startGuildTask(id, GUILD_TASKS.find((t) => t.skill === 'mining' && t.level > 1)!.id, 0)!, /nível/);
  assert.equal(game.startGuildTask(id, def.id, 0), null);
  assert.match(game.startGuildTask(id, def.id, 0)!, /já tem uma encomenda/);
  // Outra profissão ao mesmo tempo pode.
  assert.equal(game.startGuildTask(id, GUILD_TASKS.find((t) => t.skill === 'fishing' && t.level === 1)!.id, 0), null);

  assert.equal(def.item, 'rune_stone');
  assert.equal(game.start(id, 'mining', 'rune_stone_vein', 0), null);
  game.settle(id, 6 * 3_600_000);
  const st = game.state(id, 6 * 3_600_000);
  const order = st.guildTasks!.find((t) => t.id === def.id)!;
  assert.equal(order.progress, def.count, 'para na meta');
  assert.equal(order.status, 'ready');
  const xpBefore = db.skillsFor(id).mining ?? 0;
  assert.equal(game.claimGuildTask(id, def.id, 6 * 3_600_000), null);
  assert.equal((db.skillsFor(id).mining ?? 0) - xpBefore >= def.xp, true);
  assert.equal(game.state(id, 6 * 3_600_000).guildPoints, def.points);
  assert.equal(game.state(id, 6 * 3_600_000).guildTasks!.some((t) => t.id === def.id), false, 'sai da lista ao entregar');
  assert.match(game.buyGuildShop(id, 'xp_boost', 6 * 3_600_000)!, /Selos/);
});

test('Encomenda: cancelar libera a profissão; ids desconhecidos dão erro', () => {
  const { game, id } = setup();
  const def = GUILD_TASKS.find((t) => t.skill === 'cooking' && t.level === 1)!;
  assert.equal(game.startGuildTask(id, def.id, 0), null);
  assert.equal(game.cancelGuildTask(id, def.id, 0), null);
  assert.equal(game.startGuildTask(id, def.id, 0), null);
  assert.equal(guildTaskById('nao_existe'), undefined);
  assert.match(game.startGuildTask(id, 'nao_existe', 0)!, /desconhecida/);
  void XP_TABLE;
});

test('Patentes da Guilda: cinco, a última é o Grão-Mestre, e cada uma dá +5% de XP e velocidade nas profissões', async () => {
  const { GUILD_RANKS, guildBonus, simulate } = await import('@grimhold/shared');
  assert.equal(GUILD_RANKS.length, 5);
  assert.equal(GUILD_RANKS[4].name, 'Grão-Mestre da Guilda');
  assert.deepEqual(GUILD_RANKS.map((r) => r.bonus), [0, 0.05, 0.1, 0.15, 0.2]);
  assert.equal(guildBonus(59), 0);
  assert.equal(guildBonus(60), 0.05);
  const act = { skill: 'mining' as const, node: 'copper_vein', since: 0, seq: 0, seed: 1 };
  const base = simulate(act as never, 3_600_000, { bank: {}, skills: {} } as never);
  const ranked = simulate(act as never, 3_600_000, { bank: {}, skills: {}, guildPoints: 400 } as never);
  assert.ok(ranked.gains.actions > base.gains.actions, 'mais rápido');
  assert.ok((ranked.gains.xp.mining ?? 0) > (base.gains.xp.mining ?? 0) * 1.3, 'XP e velocidade somam');
});

test('Loja da Guilda: 15 gemas à escolha (precisa escolher uma válida) e Kit do Artesão (+25% de velocidade, só no tempo dele)', async () => {
  const { GUILD_GEM_QTY, GUILD_SHOP, ARTISAN_KIT_MS, simulate } = await import('@grimhold/shared');
  const { game, id, db } = setup() as any;
  db.addStat(id, 'guild_points', 100);
  assert.match(game.buyGuildShop(id, 'gem', 0, 'pedra_qualquer')!, /Escolha/);
  assert.equal(game.buyGuildShop(id, 'gem', 0, 'gem_ruby'), null);
  assert.equal(db.bankFor(id).gem_ruby, GUILD_GEM_QTY);
  assert.equal(game.buyGuildShop(id, 'artisan_kit', 1_000), null);
  assert.equal(db.artisanKitUntil(id), 1_000 + ARTISAN_KIT_MS);
  const st = db.statsFor(id);
  assert.equal((st.guild_spent ?? 0), GUILD_SHOP.gem.price + GUILD_SHOP.artisan_kit.price);
  // Mesmo trecho de mineração: com o kit ativo rende mais ações; trecho bem depois do fim não ganha nada.
  const act = { skill: 'mining' as const, node: 'copper_vein', since: 0, seed: 3, seq: 0 };
  const run = (until: number, since = 0) => simulate({ ...act, since }, since + 3_600_000, { skills: {}, bank: {}, artisanKitUntil: until } as never).gains.actions;
  assert.ok(run(10 * 3_600_000) > run(0) * 1.15, 'kit acelera');
  assert.equal(run(1, 5 * 3_600_000), run(0, 5 * 3_600_000), 'kit vencido não vale');
});
