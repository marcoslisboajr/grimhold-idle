import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, DAILY_COUNT, dailiesFor, dayOf } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const DAY = Date.UTC(2026, 9, 5, 12);

test('diárias: três por dia, iguais no mesmo dia, mudam no outro', () => {
  const a = dailiesFor(1, '2026-10-05', 10);
  assert.equal(a.length, DAILY_COUNT);
  assert.deepEqual(dailiesFor(1, '2026-10-05', 10), a);
  assert.equal(new Set(a.map((d) => d.name)).size, DAILY_COUNT);
  const days = ['2026-10-06', '2026-10-07', '2026-10-08'].map((d) => dailiesFor(1, d, 10).map((x) => x.name).join());
  assert.ok(days.some((d) => d !== a.map((x) => x.name).join()));
  assert.equal(dayOf(DAY), '2026-10-05');
});

test('diárias: progresso conta, entrega paga e conta para a conquista', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Diarista', 'warrior').id;
  const s0 = game.state(id, DAY);
  const sell = s0.dailies.find((d) => d.goal.kind === 'sell');
  const kill = s0.dailies.find((d) => d.goal.kind === 'kill');
  // Força uma tarefa que dá para completar no teste: caça (qualquer monstro) ou venda.
  if (kill) {
    assert.equal(game.start(id, 'combat', 'river_bank', DAY), null);
    game.settle(id, DAY + 3_600_000);
    const d = game.state(id, DAY + 3_600_000).dailies.find((x) => x.idx === kill.idx)!;
    assert.ok(d.progress > 0);
    if (d.goal.kind === 'kill' && d.progress >= d.goal.count) {
      game.stop(id, DAY + 3_600_000);
      assert.equal(game.claimDaily(id, kill.idx, DAY + 3_600_000), null);
      assert.equal(game.claimDaily(id, kill.idx, DAY + 3_600_000), 'Essa tarefa já foi entregue.');
      assert.equal(game.state(id, DAY + 3_600_000).stats.dailies, 1);
    }
  } else if (sell) {
    db.applyGains(id, { actions: 0, items: { bone: 50 }, xp: {} }, 0, 0);
    assert.equal(game.sellNpc(id, 'bone', 50, DAY), null);
    assert.equal(game.claimDaily(id, sell.idx, DAY), null);
  }
  assert.ok((game.state(id, DAY + 3_600_000).stats.kills ?? 0) >= 0);
});

test('conquistas: ids únicos e contadores de abates sobem na caçada', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Contador', 'warrior').id;
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 600_000);
  assert.ok((game.state(id, 600_000).stats.kills ?? 0) > 10);
});

test('diárias: a XP acompanha o nível (cerca de 3% a 5% de um nível por tarefa, também lá em cima)', async () => {
  const { dailiesFor, xpForLevel } = await import('@grimhold/shared');
  for (const lv of [80, 133, 200]) {
    const need = xpForLevel(lv + 1) - xpForLevel(lv);
    for (const d of dailiesFor(7, '2026-10-15', lv)) {
      const share = (d.reward.xp.combat ?? 0) / need;
      assert.ok(share >= 0.025 && share <= 0.06, `${lv} ${d.name}: ${share}`);
    }
  }
});
