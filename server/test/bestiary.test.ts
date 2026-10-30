import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCharms, applyPrey, bestiaryStage, BESTIARY_STAGES, charmPoints, charmPointsFor, monsterById, PREY_OPTIONS, HUNTS, runCycle, playerStats, XP_TABLE } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Bestia', 'warrior').id;
  return { db, game, id };
}

test('bestiário: a caçada conta os abates por espécie e a ficha avança por etapas', () => {
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[5] } }, 0, 0);
  assert.equal(game.start(id, 'combat', 'river_bank', 0), null);
  game.settle(id, 30 * 60 * 1000);
  const b = game.state(id, 30 * 60 * 1000).bestiary;
  assert.ok((b.rat ?? 0) + (b.frog ?? 0) > 0);
  assert.equal(bestiaryStage(BESTIARY_STAGES[0] - 1), 0);
  assert.equal(bestiaryStage(BESTIARY_STAGES[0]), 1);
  assert.equal(bestiaryStage(BESTIARY_STAGES[2]), 3);
});

test('charms: liberar custa pontos de fichas completas; pôr numa espécie exige conhecê-la', () => {
  const { db, game, id } = setup();
  assert.match(game.charmUnlock(id, 'ferocity', 0)!, /Faltam 30/);
  // Completa fichas até ter pontos para a Ferocidade (60).
  const done: Record<string, number> = {};
  for (const m of ['goblin', 'goblin_archer', 'goblin_shaman', 'orc', 'orc_warrior', 'orc_berserker', 'lizard', 'raptor']) done[m] = BESTIARY_STAGES[2];
  db.addBestiaryKills(id, done);
  assert.ok(charmPoints(done, []).free >= 60);
  assert.equal(game.charmUnlock(id, 'ferocity', 0), null);
  assert.equal(game.charmUnlock(id, 'ferocity', 0), 'Você já tem esse charm.');
  assert.equal(game.charmAssign(id, 'ferocity', 'dragon', 0), 'Conheça melhor a espécie antes (50 abates).');
  assert.equal(game.charmAssign(id, 'ferocity', 'goblin', 0), null);
  assert.deepEqual(game.state(id, 0).charms, [{ id: 'ferocity', monster: 'goblin', level: 1 }]);
  assert.equal(game.charmAssign(id, 'dodge', 'goblin', 0), 'Libere o charm antes.');
  assert.ok(charmPointsFor('demon') > charmPointsFor('rat'));
});

test('charms: mudam só a espécie escolhida, e a luta continua determinística', () => {
  const goblin = monsterById('goblin')!;
  const [g] = applyCharms([goblin], [{ id: 'ferocity', monster: 'goblin' }]);
  assert.equal(g.hp, Math.round(goblin.hp * 0.9));
  const [other] = applyCharms([monsterById('rat')!], [{ id: 'ferocity', monster: 'goblin' }]);
  assert.equal(other.hp, monsterById('rat')!.hp);

  const hunt = HUNTS.find((h) => h.id === 'goblin_den')!;
  const p = playerStats('warrior', XP_TABLE[6]);
  const charms = [{ id: 'wisdom', monster: 'goblin' }];
  assert.deepEqual(runCycle(hunt, p, 3, 1, undefined, 1, {}, charms), runCycle(hunt, p, 3, 1, undefined, 1, {}, charms));
});

test('prey: a troca do dia é grátis, depois custa ouro; o bônus vale só na espécie', () => {
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[10] } }, 0, 0);
  // Sortear dá uma lista de até 9 espécies e o bônus; escolher uma ativa a vaga.
  assert.equal(game.preyReroll(id, 0, 0, () => 0), null);
  let st = game.state(id, 0);
  assert.equal(st.prey[0].monster, null);
  assert.ok(st.prey[0].bonus && st.prey[0].options!.length > 1 && st.prey[0].options!.length <= PREY_OPTIONS);
  assert.equal(new Set(st.prey[0].options).size, st.prey[0].options!.length, 'sem repetidas');
  assert.equal(st.preyFreeUsed, false, 'vaga vazia não gasta a troca do dia');
  assert.match(game.preyChoose(id, 0, 'nao_existe', 0)!, /Sorteie/);
  const pick = st.prey[0].options![1];
  assert.equal(game.preyChoose(id, 0, pick, 0), null);
  st = game.state(id, 0);
  assert.equal(st.prey[0].monster, pick);
  assert.equal(st.prey[0].timeLeftSecs, 2 * 3600);
  assert.equal(st.prey[0].options, undefined);
  assert.equal(game.preyReroll(id, 1, 0), null);
  assert.ok(!game.state(id, 0).prey[1].options!.includes(pick), 'a lista não repete a espécie de outra vaga');
  assert.equal(game.preyReroll(id, 1, 0), null); // lista sem escolher conta como cheia: usa a grátis do dia
  assert.equal(game.state(id, 0).preyFreeUsed, true);
  assert.match(game.preyReroll(id, 1, 0)!, /Faltam moedas/);
  db.applyGains(id, { actions: 0, items: { gold: 10_000 }, xp: {} }, 0, 0);
  assert.equal(game.preyReroll(id, 1, 0), null);
  assert.ok((game.state(id, 0).bank.gold ?? 0) < 10_000);
  const gold = game.state(id, 0).bank.gold;
  assert.equal(game.preyReroll(id, 0, 24 * 3600 * 1000), null); // dia seguinte: grátis de novo
  assert.equal(game.state(id, 24 * 3600 * 1000).bank.gold, gold);
  assert.equal(game.preyReroll(id, 5, 0), 'Vaga inválida.');

  const goblin = monsterById('goblin')!;
  const [g] = applyPrey([goblin, monsterById('rat')!], [{ monster: 'goblin', bonus: 'xp' }]);
  assert.equal(g.xp, goblin.xp * 1.3);
  assert.equal(applyPrey([monsterById('rat')!], [{ monster: 'goblin', bonus: 'damage' }])[0].hp, monsterById('rat')!.hp);
});

test('prey: combate contra a espécie decrementa o tempo de 2h e limpa a vaga ao expirar', () => {
  const { db, game, id } = setup();
  // Garante que o slot 0 tenha 'rat'
  db.setPrey(id, 0, 'rat', 'xp', 100);
  assert.equal(game.state(id, 0).prey[0].timeLeftSecs, 100);

  // Inicia caçada de rato ('river_bank') por 40 segundos
  game.start(id, 'combat', 'river_bank', 0);
  game.settle(id, 40_000);
  assert.equal(game.state(id, 40_000).prey[0].monster, 'rat');
  const left = game.state(id, 40_000).prey[0].timeLeftSecs ?? 0;
  assert.ok(left < 100 && left > 0, 'tempo de prey diminuiu durante a caçada');

  // Caça por tempo longo (1 hora a mais), esgotando completamente os 100 segundos
  game.settle(id, 3_600_000);
  // O prey expirou e a vaga voltou a ficar vazia
  const p = game.state(id, 3_600_000).prey[0];
  assert.equal(p.monster, null);
  assert.equal(p.bonus, null);
});

test('prey: o tempo corre também numa caçada sem a espécie dela', () => {
  const { db, game, id } = setup();
  db.setPrey(id, 0, 'goblin', 'xp', 100);
  game.start(id, 'combat', 'river_bank', 0);
  game.settle(id, 40_000);
  const left = game.state(id, 40_000).prey[0].timeLeftSecs ?? 0;
  assert.ok(left < 100, `a prey do goblin gastou caçando ratos (${left}s)`);
});

test('prey: cada troca paga no mesmo dia custa mais que a anterior; o dia seguinte zera', () => {
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: { gold: 1_000_000 }, xp: { combat: XP_TABLE[10] } }, 0, 0);
  game.preyReroll(id, 0, 0);
  game.preyReroll(id, 0, 0); // grátis do dia
  const costs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const before = game.state(id, 0).bank.gold!;
    assert.equal(game.preyReroll(id, 0, 0), null);
    costs.push(before - game.state(id, 0).bank.gold!);
  }
  assert.ok(costs[1] > costs[0] && costs[2] > costs[1], `custos ${costs}`);
  const day2 = 24 * 3600 * 1000;
  game.preyReroll(id, 0, day2); // grátis
  const before = game.state(id, day2).bank.gold!;
  game.preyReroll(id, 0, day2);
  assert.equal(before - game.state(id, day2).bank.gold!, costs[0]);
});

test('prey: lista à espera da escolha não perde o bônus quando outra vaga expira', () => {
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: {}, xp: { combat: XP_TABLE[10] } }, 0, 0);
  assert.equal(game.preyReroll(id, 0, 0), null);
  db.setPrey(id, 1, 'rat', 'xp', 10);
  db.decrementPrey(id, 'rat', 60);
  const s = game.state(id, 0).prey[0];
  assert.ok(s.bonus, 'o bônus da lista continua');
  assert.equal(game.preyChoose(id, 0, s.options![0], 0), null);
  assert.equal(game.state(id, 0).prey[0].monster, s.options![0]);
});

test('skill do dia: uma profissão por dia (nunca combate), dá +50% de XP só nela', async () => {
  const { getBoostedSkill, boostedSkillMult, PROFESSIONS } = await import('@grimhold/shared');
  const seen = new Set<string>();
  for (let d = 0; d < 60; d++) {
    const s = getBoostedSkill(new Date(Date.UTC(2026, 9, 1 + d)));
    assert.ok(PROFESSIONS.includes(s), s);
    seen.add(s);
  }
  assert.ok(seen.size >= 6, 'varia ao longo dos dias');
  const day = Date.UTC(2026, 9, 9, 12);
  const today = getBoostedSkill(new Date(day));
  assert.equal(boostedSkillMult(today, day), 1.5);
  assert.equal(boostedSkillMult('combat', day), 1);
  assert.equal(getBoostedSkill(new Date(day)), getBoostedSkill(new Date(day + 3600_000)), 'o mesmo o dia inteiro');
});
