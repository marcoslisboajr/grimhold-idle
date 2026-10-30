import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, instanceDailyXp, instanceKills, simulateHunt, XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup(bank: Record<string, number>) {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Invasora', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { cooked_shark: 1000, ...bank }, xp: { combat: XP_TABLE[90] } }, 0, 0);
  return { db, game, id };
}

const crypt = HUNTS.find((h) => h.id === 'general_crypt')!;
const run = (bank: Record<string, number>, instanceFreeKey: boolean) =>
  simulateHunt({ skill: 'combat', node: 'general_crypt', since: 0, seed: 3, seq: 0 }, 12 * 3_600_000, {
    vocation: 'warrior',
    combatXp: XP_TABLE[90],
    bank: { cooked_shark: 1000, ...bank },
    instanceFreeKey,
  });

test('instância: limpa as ondas, gasta a chave no chefe e acaba nele', () => {
  const r = run({ crypt_key: 1 }, false);
  assert.equal(r.gains.cleared, 'general_crypt');
  assert.equal(r.ended, true);
  // Os abates da limpeza mais o subchefe e o chefe.
  assert.equal(r.gains.actions, instanceKills(crypt.level) + crypt.monsters.length);
  // Mesma semente, mesma luta: a rodada paga tem exatamente 1 chave a menos que a grátis
  // (os monstros da limpeza também deixam cair chaves).
  const free = run({ crypt_key: 1 }, true);
  assert.equal((r.gains.items.crypt_key ?? 0) - (free.gains.items.crypt_key ?? 0), -1);
});

test('instância: sem chave, acaba depois da limpeza (fica o XP e o loot)', () => {
  const r = run({}, false);
  assert.equal(r.gains.cleared, undefined);
  assert.equal(r.gains.instanceNoKey, 'general_crypt');
  assert.equal(r.gains.actions, instanceKills(crypt.level));
  assert.ok((r.gains.xp.combat ?? 0) > 0);
});

test('instância: a primeira vitória do dia não gasta chave', () => {
  const r = run({}, true);
  assert.equal(r.gains.cleared, 'general_crypt');
  assert.ok((r.gains.items.crypt_key ?? 0) >= 0);
});

test('instância no servidor: entra sem chave; primeira do dia dá XP e baú; a segunda pede chave', () => {
  const { db, game, id } = setup({});
  assert.equal(game.start(id, 'combat', 'general_crypt', 0), null);
  const xp0 = db.skillsFor(id).combat!;
  const r = game.settle(id, 12 * 3_600_000);
  assert.equal(r.gains.cleared, 'general_crypt');
  assert.equal(r.gains.instanceDaily?.xp, instanceDailyXp(crypt));
  assert.ok((db.bankFor(id).gold ?? 0) >= r.gains.instanceDaily!.gold);
  assert.ok(db.skillsFor(id).combat! - xp0 >= instanceDailyXp(crypt));
  const day = game.state(id, 12 * 3_600_000).today!;
  assert.deepEqual(game.state(id, 12 * 3_600_000).instanceClears?.general_crypt, { day, total: 1 });
  // Mesmo dia, sem chave: limpa e para antes do chefe.
  const t1 = 12 * 3_600_000 + 1000;
  const keys = db.bankFor(id).crypt_key ?? 0; // a limpeza pode ter deixado cair alguma
  if (keys) db.applyGains(id, { actions: 0, items: { crypt_key: -keys }, xp: {} }, t1, 0);
  assert.equal(game.start(id, 'combat', 'general_crypt', t1), null);
  const r2 = game.settle(id, t1 + 12 * 3_600_000 - 2000);
  assert.equal(r2.gains.instanceNoKey, 'general_crypt');
});

test('instância: morrer ou sair gasta a tentativa grátis do dia', () => {
  const { db, game, id } = setup({});
  assert.equal(game.start(id, 'combat', 'general_crypt', 0), null);
  game.stop(id, 60_000); // saiu antes de vencer
  assert.equal(game.start(id, 'combat', 'general_crypt', 120_000), null);
  const r = game.settle(id, 120_000 + 11 * 3_600_000);
  // Sem chave e sem o grátis: limpa e para antes do chefe.
  if ((db.bankFor(id).crypt_key ?? 0) === 0 || r.gains.instanceNoKey) assert.ok(r.gains.instanceNoKey === 'general_crypt' || (r.gains.items.crypt_key ?? 0) < 0);
  assert.equal(r.gains.instanceDaily, undefined);
  assert.equal(game.state(id, 120_000).instanceFree?.general_crypt, game.state(id, 120_000).today);
});

test('instância no mesmo dia: 1ª entrada XP cheia, 2ª 40%, 3ª em diante 10%', async () => {
  const { instanceTryXp } = await import('@grimhold/shared');
  assert.deepEqual([1, 2, 3, 7].map(instanceTryXp), [1, 0.4, 0.1, 0.1]);
  const at = (n: number) =>
    simulateHunt({ skill: 'combat', node: 'general_crypt', since: 0, seed: 3, seq: 0 }, 12 * 3_600_000, {
      vocation: 'warrior', combatXp: XP_TABLE[90], bank: { cooked_shark: 1000, crypt_key: 1 }, instanceFreeKey: n === 1, instanceTry: n,
    }).gains.xp.combat ?? 0;
  const [a, b, c] = [at(1), at(2), at(3)];
  assert.ok(Math.abs(b / a - 0.4) < 0.02, `2ª: ${(b / a).toFixed(3)}`);
  assert.ok(Math.abs(c / a - 0.1) < 0.02, `3ª: ${(c / a).toFixed(3)}`);
});

test('instância: o servidor conta as entradas do dia e zera no dia seguinte', () => {
  const { db, game, id } = setup({ crypt_key: 5 });
  const DAY = 24 * 3_600_000;
  for (const t of [0, 1000, 2000]) assert.equal(game.start(id, 'combat', 'general_crypt', t), null);
  assert.equal(db.instanceTriesFor(id).general_crypt.tries, 3);
  assert.equal(game.start(id, 'combat', 'general_crypt', DAY + 5000), null);
  assert.equal(db.instanceTriesFor(id).general_crypt.tries, 1, 'dia novo zera');
});
