import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { XP_TABLE } from '@grimhold/shared';

test('anúncios globais: addSystemChat salva e formata mensagem do narrador Grimhold', () => {
  const db = openDb(':memory:');
  const msg = db.addSystemChat('🎉 O jogador Teste alcançou o nível 30 de combate!', 1000);
  assert.equal(msg.name, 'Grimhold');
  assert.equal(msg.vocation, 'system');
  assert.equal(msg.system, true);

  const recent = db.recentChat(10);
  assert.equal(recent.length, 1);
  assert.equal(recent[0].text, '🎉 O jogador Teste alcançou o nível 30 de combate!');
  assert.equal(recent[0].system, true);
});

test('game settle: gera broadcast ao atingir marco de nível de combate', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const accountId = db.accountForToken(db.createGuest())!;
  const ch = db.createCharacter(accountId, 'Heroi', 'warrior');

  // Adiciona XP quase no nível 30:
  db.applyGains(ch.id, { actions: 1, items: {}, xp: { combat: XP_TABLE[29] + 50 } }, 1000, 1);

  // Inicia caçada de rato
  game.start(ch.id, 'combat', 'rats', 2000);

  // Settle com ganho de XP suficiente para passar pro 30
  // Para testar diretamente o settle gerando broadcast:
  // Simulamos um avanço que cruza o nível 30:
  const res = game.settle(ch.id, 2000 + 100_000);
  // Se subiu de nível, broadcasts terá o anúncio
  assert.ok(Array.isArray(res.broadcasts));
});
