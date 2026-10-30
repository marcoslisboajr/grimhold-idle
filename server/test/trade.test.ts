import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { TradeManager } from '../src/trade.ts';

test('sistema de trade: convite, troca de itens e ouro entre dois jogadores', () => {
  const db = openDb(':memory:');
  const t1 = db.createGuest();
  const t2 = db.createGuest();
  const char1 = db.createCharacter(db.accountForToken(t1)!, 'Alice', 'warrior');
  const char2 = db.createCharacter(db.accountForToken(t2)!, 'Bob', 'hunter');

  // Alice tem 1000 ouro e 5 espadas de ferro
  db.applyGains(char1.id, { actions: 0, items: { gold: 1000, iron_sword: 5 }, xp: {} }, 0, 0);

  // Bob tem 500 ouro e 10 flechas
  db.applyGains(char2.id, { actions: 0, items: { gold: 500, iron_arrow: 10 }, xp: {} }, 0, 0);

  const tradeManager = new TradeManager(db);

  // 1. Alice convida Bob
  const req = tradeManager.requestTrade(char1.id, char1.name, char2.id);
  assert.equal(req.success, true);

  // 2. Bob aceita o convite
  const resp = tradeManager.respondTrade(char2.id, char2.name, char1.id, true);
  assert.equal(resp.started, true);
  assert.ok(resp.session);

  // 3. Alice oferece 2 espadas de ferro e 200 de ouro
  tradeManager.addItem(char1.id, 'iron_sword', 2);
  tradeManager.setGold(char1.id, 200);

  // 4. Bob oferece 10 flechas e 100 de ouro
  tradeManager.addItem(char2.id, 'iron_arrow', 10);
  tradeManager.setGold(char2.id, 100);

  // 5. Alice aceita a troca
  const aAccept = tradeManager.acceptTrade(char1.id);
  assert.equal(aAccept?.completed, false);
  assert.equal(aAccept?.session.partyA.accepted, true);

  // Anti-scam: Bob altera sua oferta de ouro. Aceite de Alice deve cair!
  tradeManager.setGold(char2.id, 150);
  const sessionAfterEdit = tradeManager.getSessionByCharacter(char1.id);
  assert.equal(sessionAfterEdit?.partyA.accepted, false);
  assert.equal(sessionAfterEdit?.partyB.accepted, false);

  // Ambos aceitam
  tradeManager.acceptTrade(char1.id);
  const finalAccept = tradeManager.acceptTrade(char2.id);
  assert.equal(finalAccept?.completed, true);

  // Valida o saldo final no banco
  // Alice deu 200 ouro e ganhou 150 ouro -> 1000 - 200 + 150 = 950
  // Alice deu 2 iron_sword e ganhou 10 iron_arrow -> 3 iron_sword, 10 iron_arrow
  const bank1 = db.bankFor(char1.id);
  assert.equal(bank1.gold, 950);
  assert.equal(bank1.iron_sword, 3);
  assert.equal(bank1.iron_arrow, 10);

  // Bob deu 150 ouro e ganhou 200 ouro -> 500 - 150 + 200 = 550
  // Bob deu 10 iron_arrow e ganhou 2 iron_sword -> 0 iron_arrow (deve ser limpo ou 0), 2 iron_sword
  const bank2 = db.bankFor(char2.id);
  assert.equal(bank2.gold, 550);
  assert.equal(bank2.iron_sword, 2);
  assert.equal(bank2.iron_arrow ?? 0, 0);
});

test('sistema de trade anti-dupe: falha atômica se itens não existirem no banco no momento da confirmação', () => {
  const db = openDb(':memory:');
  const t1 = db.createGuest();
  const t2 = db.createGuest();
  const c1 = db.createCharacter(db.accountForToken(t1)!, 'Char1', 'warrior');
  const c2 = db.createCharacter(db.accountForToken(t2)!, 'Char2', 'hunter');

  db.applyGains(c1.id, { actions: 0, items: { magic_sword: 1 }, xp: {} }, 0, 0);

  const trade = new TradeManager(db);
  trade.requestTrade(c1.id, c1.name, c2.id);
  trade.respondTrade(c2.id, c2.name, c1.id, true);

  trade.addItem(c1.id, 'magic_sword', 1);

  // Simula que antes do clique final o jogador 1 gastou / sumiu com a espada de algum outro jeito
  db.applyGains(c1.id, { actions: 0, items: { magic_sword: -1 }, xp: {} }, 0, 0);

  trade.acceptTrade(c1.id);
  const acceptRes = trade.acceptTrade(c2.id);

  // A transação atômica deve falhar e não completar a troca
  assert.equal(acceptRes?.completed, false);
  assert.match(acceptRes?.error ?? '', /não possui .* do item oferecido/);

  // O jogador 2 NÃO deve ter recebido espada de forma alguma (dupe prevenido!)
  const bank2 = db.bankFor(c2.id);
  assert.equal(bank2.magic_sword ?? 0, 0);
});
