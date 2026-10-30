import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { PartyManager } from '../src/party.ts';
import { createGame } from '../src/game.ts';

function setup() {
  const db = openDb(':memory:');
  const partyManager = new PartyManager(db);
  const game = createGame(db);

  const t1 = db.createGuest();
  const c1 = db.createCharacter(db.accountForToken(t1)!, 'HeroiUm', 'warrior');

  const t2 = db.createGuest();
  const c2 = db.createCharacter(db.accountForToken(t2)!, 'HeroiDois', 'hunter');

  const t3 = db.createGuest();
  const c3 = db.createCharacter(db.accountForToken(t3)!, 'HeroiTres', 'arcanist');

  const t4 = db.createGuest();
  const c4 = db.createCharacter(db.accountForToken(t4)!, 'HeroiQuatro', 'devout');

  const t5 = db.createGuest();
  const c5 = db.createCharacter(db.accountForToken(t5)!, 'HeroiCinco', 'warrior');

  return { db, partyManager, game, c1, c2, c3, c4, c5 };
}

test('convidar jogador cria party e convite pendente', () => {
  const { partyManager, c1, c2 } = setup();
  const res = partyManager.invite(c1.id, c2.name, 1000);
  assert.ok(!res.error);
  assert.ok(res.invite);
  assert.equal(res.invite.targetId, c2.id);
  assert.equal(res.invite.leaderId, c1.id);

  const inv = partyManager.inviteFor(c2.id, 1000);
  assert.ok(inv);
  assert.equal(inv.leaderName, c1.name);
});

test('não pode convidar a si mesmo ou jogador inexistente', () => {
  const { partyManager, c1 } = setup();
  assert.equal(partyManager.invite(c1.id, c1.name).error, 'Você não pode convidar a si mesmo.');
  assert.equal(partyManager.invite(c1.id, 'Fantasma').error, 'Jogador não encontrado.');
});

test('aceitar convite adiciona membro ao grupo', () => {
  const { partyManager, c1, c2 } = setup();
  const { invite, partyId } = partyManager.invite(c1.id, c2.name, 1000);
  assert.ok(partyId);

  const acceptRes = partyManager.accept(c2.id, partyId!, 1500);
  assert.ok(!acceptRes.error);

  const view = partyManager.viewFor(c1.id, () => true);
  assert.ok(view);
  assert.equal(view.members.length, 2);
  assert.equal(view.members[0].characterId, c1.id);
  assert.equal(view.members[0].isLeader, true);
  assert.equal(view.members[1].characterId, c2.id);
  assert.equal(view.members[1].isLeader, false);
});

test('recusar convite descarta o convite pendente', () => {
  const { partyManager, c1, c2 } = setup();
  const { partyId } = partyManager.invite(c1.id, c2.name, 1000);
  partyManager.decline(c2.id, partyId!);
  assert.equal(partyManager.inviteFor(c2.id, 1000), null);
});

test('expulsar membro: somente líder pode expulsar', () => {
  const { partyManager, c1, c2, c3 } = setup();
  const { partyId } = partyManager.invite(c1.id, c2.name, 1000);
  partyManager.accept(c2.id, partyId!, 1500);

  // Não líder tentando expulsar
  assert.equal(partyManager.kick(c2.id, c1.id).error, 'Apenas o líder pode expulsar membros.');

  // Líder expulsa c2
  const kickRes = partyManager.kick(c1.id, c2.id);
  assert.ok(!kickRes.error);

  const view = partyManager.viewFor(c1.id, () => true);
  assert.equal(view?.members.length, 1);
  assert.equal(partyManager.viewFor(c2.id, () => true), null);
});

test('sair do grupo transfere liderança ou desfaz a party se vazia', () => {
  const { partyManager, c1, c2 } = setup();
  const { partyId } = partyManager.invite(c1.id, c2.name, 1000);
  partyManager.accept(c2.id, partyId!, 1500);

  // Líder c1 sai
  const leaveRes = partyManager.leave(c1.id);
  assert.ok(leaveRes);
  assert.equal(leaveRes.disbanded, false);

  // c2 deve ser agora o novo líder
  const view2 = partyManager.viewFor(c2.id, () => true);
  assert.ok(view2);
  assert.equal(view2.leaderId, c2.id);
  assert.equal(view2.members.length, 1);

  // c2 sai também -> party desfeita
  const leaveRes2 = partyManager.leave(c2.id);
  assert.ok(leaveRes2);
  assert.equal(leaveRes2.disbanded, true);
  assert.equal(partyManager.viewFor(c2.id, () => true), null);
});

test('limite de 4 membros no grupo', () => {
  const { partyManager, c1, c2, c3, c4, c5 } = setup();
  const { partyId } = partyManager.invite(c1.id, c2.name, 1000);
  partyManager.accept(c2.id, partyId!, 1000);

  partyManager.invite(c1.id, c3.name, 1000);
  partyManager.accept(c3.id, partyId!, 1000);

  partyManager.invite(c1.id, c4.name, 1000);
  partyManager.accept(c4.id, partyId!, 1000);

  const view = partyManager.viewFor(c1.id, () => true);
  assert.equal(view?.members.length, 4);

  // Tentar convidar o 5º membro
  const inv5 = partyManager.invite(c1.id, c5.name, 1000);
  assert.ok(inv5.error?.includes('cheio'));
});

test('bônus de XP compartilhado na mesma caçada e membros online', () => {
  const { partyManager, game, c1, c2, c3 } = setup();
  const { partyId } = partyManager.invite(c1.id, c2.name, 1000);
  partyManager.accept(c2.id, partyId!, 1000);
  partyManager.invite(c1.id, c3.name, 1000);
  partyManager.accept(c3.id, partyId!, 1000);

  // Ambos c1 e c2 caçam na mesma caçada
  game.start(c1.id, 'combat', 'river_bank', 0);
  game.start(c2.id, 'combat', 'river_bank', 0);
  // c3 caça em outra caçada
  game.start(c3.id, 'combat', 'wolf_den', 0);

  // c1 (guerreiro) com c2 (caçador): +10% do aliado +5% da vocação diferente.
  // Vale com c2 offline também (a caçada segue com o jogo fechado).
  assert.equal(partyManager.partyBonusFor(c1.id), 0.15);
  // Offline vale 1/4: +2,5% do aliado +1,25% da vocação.
  assert.equal(partyManager.partyBonusFor(c1.id, (id) => id === c1.id), 0.038);
  assert.equal(partyManager.partyBonusFor(c1.id, () => true, true), 0.038);
  const share = (online: (id: number) => boolean, id: number) => partyManager.viewFor(c1.id, online)?.members.find((m) => m.characterId === id)?.share;
  assert.equal(share((id) => id === c1.id, c2.id), 'bonus_only');
  assert.notEqual(share(() => true, c3.id), 'sharing');

  // c3 (arcanista) vem também: +20% de dois aliados +10% de três vocações.
  game.start(c3.id, 'combat', 'river_bank', 0);
  assert.ok(Math.abs(partyManager.partyBonusFor(c1.id) - 0.3) < 1e-9);
  assert.equal(share(() => true, c3.id), 'sharing');
});

test('cancelar convite pendente e desmanchar party fantasma', () => {
  const { partyManager, db, c1, c2 } = setup();
  const { invite } = partyManager.invite(c1.id, c2.name, 1000);
  assert.ok(invite);

  let view = partyManager.viewFor(c1.id, () => true);
  assert.equal(view?.pendingInvites?.length, 1);
  assert.equal(view?.pendingInvites?.[0].targetId, c2.id);

  // Líder cancela o convite
  const cancelRes = partyManager.cancelInvite(c1.id, c2.id);
  assert.ok(!cancelRes.error);

  // Convite sumiu para o convidado
  assert.equal(partyManager.inviteFor(c2.id, 1000), null);

  // O líder não ficou preso em um grupo fantasma
  assert.equal(db.partyFor(c1.id), null);
});


test('shared XP: quem caça junto (online, mesmo nível) divide a XP por igual; nível baixo demais fica de fora', () => {
  const { db, partyManager, game, c1, c2, c3 } = setup();
  const { partyId } = partyManager.invite(c1.id, c2.name, 0);
  partyManager.accept(c2.id, partyId!, 0);
  partyManager.invite(c1.id, c3.name, 0);
  partyManager.accept(c3.id, partyId!, 0);
  const lv = (id: number, l: number) => db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[l] } }, 0, 0);
  lv(c1.id, 30);
  lv(c2.id, 25);
  lv(c3.id, 10);
  for (const c of [c1, c2, c3]) game.start(c.id, 'combat', 'river_bank', 0);

  // c3 (nível 10) tem menos de 2/3 do nível 30: não divide.
  const deltas = partyManager.sharedXpDeltas(new Map([[c1.id, 300], [c2.id, 100], [c3.id, 50]]), () => true);
  assert.equal(deltas.get(c1.id), -100, 'como no Tibia: o mais forte paga a parte do mais fraco');
  assert.equal(deltas.get(c2.id), 100);
  assert.equal(deltas.has(c3.id), false);

  // Offline não divide.
  assert.equal(partyManager.sharedXpDeltas(new Map([[c1.id, 300], [c2.id, 100]]), (id) => id === c1.id).size, 0);
});

test('shared XP (Tibia): ao longo de vários ticks o total do grupo não muda e cada um fica com a média', () => {
  const { db, partyManager, game, c1, c2 } = setup();
  const { partyId } = partyManager.invite(c1.id, c2.name, 0);
  partyManager.accept(c2.id, partyId!, 0);
  for (const c of [c1, c2]) db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[30] } }, 0, 0);
  for (const c of [c1, c2]) game.start(c.id, 'combat', 'river_bank', 0);
  const a = c1.id;
  const b = c2.id;
  // XP chega em blocos: o forte fecha lutas em ticks diferentes do fraco.
  const ticks: [number, number][] = [[300, 0], [0, 50], [300, 0], [0, 50], [300, 100]];
  let ownA = 0, ownB = 0, gotA = 0, gotB = 0;
  for (const [xa, xb] of ticks) {
    ownA += xa; ownB += xb;
    const d = partyManager.sharedXpDeltas(new Map([[a, xa], [b, xb]]), () => true);
    gotA += xa + (d.get(a) ?? 0);
    gotB += xb + (d.get(b) ?? 0);
  }
  assert.equal(gotA + gotB, ownA + ownB, 'não cria nem some XP');
  assert.ok(Math.abs(gotA - gotB) <= 1, `cada um com a média: ${gotA} e ${gotB}`);
});
