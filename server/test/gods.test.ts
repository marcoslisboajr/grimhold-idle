import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSS_HP_MULT,
  BOSS_MAX_FIGHT_MS,
  HUNTS,
  MONSTERS,
  RECIPES,
  WORLD_BOSSES,
  XP_TABLE,
  itemById,
  lairGroupFor,
  partyBuffsFor,
  fighterDps,
  monsterById,
  parseHuntNode,
  playerStats,
  runCycle,
  DIFFICULTIES,
  equipmentBonus,
  LAIR_COOLDOWN_MS,
  LAIR_GATHER_MS,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { PartyManager } from '../src/party.ts';
import { createGame } from '../src/game.ts';

// Deuses do Grimhold: set que cai, arma só por criação (3 partes), covis da aba Chefes e o Avatar no chefe global.
const GODS = [
  { id: 'kharvos', voc: 'warrior', weapon: 'kharvos_greatsword', lair: 'kharvos_fortress' },
  { id: 'sylveth', voc: 'hunter', weapon: 'sylveth_moonbow', lair: 'sylveth_grove' },
  { id: 'aethon', voc: 'arcanist', weapon: 'aethon_stormstaff', lair: 'aethon_spire' },
  { id: 'lumira', voc: 'devout', weapon: 'lumira_dawnhammer', lair: 'lumira_cathedral' },
];

test('deuses: set de 4 peças da vocação e arma que só sai na criação, com as 3 partes', () => {
  const allRecipes = Object.values(RECIPES).flat();
  for (const g of GODS) {
    for (const part of ['helm', 'armor', 'legs', 'boots']) {
      const it = itemById(`${g.id}_${part}`);
      assert.ok(it?.legendary && it.equip, `${g.id}_${part}`);
      assert.deepEqual(it.equip!.vocations, [g.voc]);
    }
    const recipe = allRecipes.find((r) => r.output === g.weapon);
    assert.ok(recipe, `receita do ${g.weapon}`);
    const parts = Object.keys(recipe.inputs).filter((i) => i.startsWith(`${g.id}_`));
    assert.equal(parts.length, 3, `${g.weapon} pede as 3 partes`);
    assert.deepEqual(itemById(g.weapon)!.equip!.vocations, [g.voc]);
    // Arma: nenhum monstro nem chefe global solta.
    assert.ok(!MONSTERS.some((m) => m.loot.some((l) => l.item === g.weapon)), `${g.weapon} não cai de monstro`);
    assert.ok(!WORLD_BOSSES.some((b) => b.legendarySet.includes(g.weapon) || b.loot?.some((l) => l.item === g.weapon)));
    // Peças e partes: chance mínima no covil, bem maior no Avatar.
    const boss = monsterById(HUNTS.find((h) => h.id === g.lair)!.monsters[0])!;
    const avatar = WORLD_BOSSES.find((b) => b.id === `${g.id}_avatar`)!;
    for (const p of parts) {
      const lair = boss.loot.find((l) => l.item === p)!.chance;
      const world = avatar.loot!.find((l) => l.item === p)!.chance;
      // Partes a 2% no covil (pedido de 17/10); o Avatar continua soltando também.
      assert.ok(lair === 0.02 && world > 0, `${p}: covil ${lair}, Avatar ${world}`);
    }
    assert.ok(boss.loot.some((l) => l.item === `${g.id}_armor`));
    // Covil menor (80 a 120): o mesmo set; desde 17/10 os dois soltam a 2% (o menor nunca acima do principal).
    const lesser = HUNTS.filter((h) => h.lair && h.level < 130 && monsterById(h.monsters[0])!.loot.some((l) => l.item === `${g.id}_armor`));
    assert.equal(lesser.length, 1, `${g.id} tem um covil menor`);
    const lesserChance = monsterById(lesser[0].monsters[0])!.loot.find((l) => l.item === `${g.id}_armor`)!.chance;
    assert.ok(lesserChance <= boss.loot.find((l) => l.item === `${g.id}_armor`)!.chance);
    assert.ok(avatar.legendarySet.includes(`${g.id}_armor`));
  }
});

test('covil: uma luta por entrada e 24 h de cooldown, também para quem entra pela party', () => {
  const db = openDb(':memory:');
  const party = new PartyManager(db);
  const game = createGame(db);
  const gear = ['primordial_mace+3#5', 'primordial_holy_armor+3#5', 'primordial_holy_helmet+3#5', 'primordial_holy_legs+3#5', 'primordial_boots+3#5']; // covil mais duro: Épico +5
  const [a, b, c] = ['Lider', 'Aliado', 'Solo'].map((n) => db.createCharacter(db.accountForToken(db.createGuest())!, n, 'devout'));
  for (const ch of [a, b, c]) {
    db.applyGains(ch.id, { actions: 0, items: Object.fromEntries(gear.map((i) => [i, 1])), xp: { combat: XP_TABLE[165] } }, 0, 0);
    for (const id of gear) assert.equal(game.equip(ch.id, id, 0), null);
  }
  // Sozinho: uma luta, acaba, e não entra de novo antes de 16 h.
  assert.equal(game.start(c.id, 'combat', 'aethon_spire', 0), null);
  const r = game.settle(c.id, 3600_000);
  assert.equal(r.gains.kills?.oruun, 1, 'uma luta só');
  assert.equal(db.activityFor(c.id), null, 'a caçada acabou');
  assert.match(game.start(c.id, 'combat', 'aethon_spire', 3600_000)!, /de novo em 15h/);
  assert.equal(game.start(c.id, 'combat', 'aethon_spire', LAIR_COOLDOWN_MS + 1), null, 'depois de 16 h, pode');
  // Party: o líder entra, espera o grupo; o aliado entra pelo Ir até ele, cai na mesma luta e ganha o cooldown.
  const { partyId } = party.invite(a.id, b.name, 0);
  party.accept(b.id, partyId!, 0);
  assert.equal(game.start(a.id, 'combat', 'aethon_spire', 1000), null);
  const leaderSince = db.activityFor(a.id)!.since;
  assert.equal(leaderSince, 1000 + LAIR_GATHER_MS, 'em party, espera o grupo');
  assert.equal(game.start(b.id, 'combat', 'aethon_spire', 11_000), null);
  assert.equal(db.activityFor(b.id)!.since, leaderSince, 'mesma luta do líder');
  assert.deepEqual(party.lairMembersFor(a.id).sort(), [a.id, b.id].sort());
  assert.ok(db.lairCooldownsFor(b.id).aethon_spire! > 11_000 + LAIR_COOLDOWN_MS - 1, 'quem entra pela party também fica em cooldown');
  assert.match(game.start(b.id, 'combat', 'aethon_spire', 60_000)!, /de novo em/);
  // Outro covil não tem cooldown.
  assert.equal(game.start(b.id, 'combat', 'lumira_cathedral', 60_000), null);
});

test('covis simples (10 a 65): sem itens dos deuses, pouco loot, e cobrem o nível baixo', () => {
  const low = HUNTS.filter((h) => h.lair && h.level < 80);
  assert.ok(low.length >= 5);
  assert.ok(low.some((h) => h.level <= 10), 'tem covil no nível 10');
  for (const h of low) {
    const boss = monsterById(h.monsters[0])!;
    assert.ok(!boss.loot.some((l) => itemById(l.item)?.legendary), `${h.id} não solta item dos deuses`);
    assert.ok(boss.loot.length <= 4, `${h.id}: pouco loot`);
  }
});

test('covil: um chefe só, sempre sozinho', () => {
  for (const g of GODS) {
    const parsed = parseHuntNode(`${g.lair}:3`)!;
    assert.equal(parsed.pack, 1, 'covil não tem bando');
    assert.equal(parsed.hunt.monsters.length, 1);
  }
});

// 23/10: covil mais duro (LAIR_HP_MULT/LAIR_ATK_MULT): pede equipamento melhorado, Épico +5.
const GEAR = { weapon: 'primordial_mace+3#5', armor: 'primordial_holy_armor+3#5', helmet: 'primordial_holy_helmet+3#5', legs: 'primordial_holy_legs+3#5', boots: 'primordial_boots+3#5' };

test('covil em grupo: luta compartilhada, o chefe tem a vida inteira e cai na mesma hora para todos', () => {
  const hunt = HUNTS.find((h) => h.id === 'lumira_cathedral')!;
  const boss = monsterById(hunt.monsters[0])!;
  const a = playerStats('devout', XP_TABLE[135], equipmentBonus(GEAR));
  const b = playerStats('devout', XP_TABLE[135], equipmentBonus(GEAR));
  const groups = lairGroupFor([{ id: 1, fighter: a }, { id: 2, fighter: b }], boss);
  const ga = groups.get(1)!;
  const gb = groups.get(2)!;
  assert.equal(ga.killAt, gb.killAt, 'mesma hora para os dois');
  assert.equal(ga.allies[0].id, 2);
  const solo = runCycle(hunt, a, 7, 0, DIFFICULTIES[0], 1);
  const ca = runCycle(hunt, a, 7, 0, DIFFICULTIES[0], 1, {}, [], [], undefined, undefined, ga);
  const cb = runCycle(hunt, b, 8, 0, DIFFICULTIES[0], 1, {}, [], [], undefined, undefined, gb);
  assert.equal(ca.monster.hp, solo.monster.hp, 'o chefe tem a vida inteira');
  assert.equal(ca.outcome, 'win');
  assert.equal(cb.outcome, 'win');
  assert.equal(ca.fightMs, ga.killAt, 'cai exatamente na hora do grupo');
  assert.equal(cb.fightMs, ga.killAt);
  // Sozinho, a mesma vida levaria bem mais (o chefe tem BOSS_HP_MULT de vida).
  const soloAt = lairGroupFor([{ id: 1, fighter: a }], boss).get(1)!.killAt;
  assert.ok(ca.fightMs < soloAt * 0.7, `${ca.fightMs} ms em grupo contra ${soloAt} sozinho`);
  // Os golpes do aliado entram na luta, e o chefe divide os ataques (bate menos em cada um).
  assert.ok(ca.hits.some((h) => h.by === 'a' && h.ally === 2 && h.dmg > 0));
  const per = (c: typeof ca) => c.hits.filter((h) => h.by === 'm').length / c.fightMs;
  assert.ok(per(ca) < per(solo) * 0.7, 'o chefe divide os ataques entre o grupo');
  const total = ca.hits.filter((h) => h.by !== 'm').reduce((n, h) => n + h.dmg, 0);
  assert.ok(total >= boss.hp * BOSS_HP_MULT, 'a soma dos golpes derruba o chefe');
});

test('covil em grupo: dado inválido de aliado é ignorado (não prende a luta)', () => {
  const hunt = HUNTS.find((h) => h.id === 'lumira_cathedral')!;
  const a = playerStats('devout', XP_TABLE[135], equipmentBonus(GEAR));
  for (const bad of [
    { killAt: Number.NaN, allies: [{ id: 2, hitMs: 1000, hit: 100 }] },
    { killAt: 5000, allies: [{ id: 2, hitMs: Number.NaN, hit: 100 }] },
    { killAt: 5000, allies: [{ id: 2, hitMs: 0, hit: 100 }] },
    { killAt: 5000, allies: [{ id: 2, hitMs: 1000, hit: Number.NaN }] },
    { killAt: 1e12, allies: [{ id: 2, hitMs: 1000, hit: 100 }] },
  ]) {
    const c = runCycle(hunt, a, 7, 0, DIFFICULTIES[0], 1, {}, [], [], undefined, undefined, bad);
    assert.ok(Number.isFinite(c.fightMs) && c.fightMs <= BOSS_MAX_FIGHT_MS && Number.isFinite(c.xp), JSON.stringify(bad));
  }
});

test('covil em grupo: os dois da party vencem juntos no servidor, mesmo acertando em horas diferentes', () => {
  const db = openDb(':memory:');
  const party = new PartyManager(db);
  const game = createGame(db);
  game.setPartyFights((id) => party.lairMembersFor(id), (id) => party.partyBuffsFor(id));
  const gear = Object.values(GEAR).map((g) => g.replace('+3#5', '+4#10')); // covil mais duro: dois devotos com Lendária +10
  const [a, b] = ['Forte', 'Fraco'].map((n) => db.createCharacter(db.accountForToken(db.createGuest())!, n, 'devout'));
  for (const [ch, lv] of [[a, 175], [b, 160]] as const) {
    db.applyGains(ch.id, { actions: 0, items: Object.fromEntries(gear.map((i) => [i, 1])), xp: { combat: XP_TABLE[lv] } }, 0, 0);
    for (const id of gear) assert.equal(game.equip(ch.id, id, 0), null);
  }
  const { partyId } = party.invite(a.id, b.name, 0);
  party.accept(b.id, partyId!, 0);
  assert.equal(game.start(a.id, 'combat', 'kharvos_fortress', 0), null);
  assert.equal(game.start(b.id, 'combat', 'kharvos_fortress', 5000), null);
  // O primeiro acerta e sai do covil; o segundo acerta depois e ainda tem a mesma luta.
  const ra = game.settle(a.id, 3600_000);
  const rb = game.settle(b.id, 3600_000 + 60_000);
  assert.equal(ra.gains.kills?.gorrak, 1, 'o forte venceu');
  assert.equal(rb.gains.kills?.gorrak, 1, 'o fraco venceu na mesma luta (antes, morria depois do chefe cair)');
  assert.ok(!rb.gains.death);
});

test('party: cada vocação dá o seu buff para o grupo todo', () => {
  assert.deepEqual(partyBuffsFor(['warrior', 'hunter', 'arcanist', 'devout']), { guard: 0.08, basic: 0.1, spell: 0.1, heal: 0.15 });
  assert.deepEqual(partyBuffsFor(['warrior', 'warrior']), { guard: 0.08 }, 'vocação repetida não soma');
  const hunt = HUNTS.find((h) => !h.boss && !h.lair && h.level >= 40)!;
  const p = playerStats('warrior', XP_TABLE[40]);
  const base = runCycle(hunt, p, 3, 0, DIFFICULTIES[0], 1);
  const guarded = runCycle(hunt, p, 3, 0, DIFFICULTIES[0], 1, {}, [], [], undefined, undefined, undefined, { guard: 0.5 });
  const firstHit = (c: typeof base, by: 'p' | 'm') => c.hits.find((h) => h.by === by && h.dmg > 1)!.dmg;
  assert.ok(firstHit(guarded, 'm') < firstHit(base, 'm'), 'guerreiro: menos dano sofrido');
  const strong = runCycle(hunt, p, 3, 0, DIFFICULTIES[0], 1, {}, [], [], undefined, undefined, undefined, { basic: 0.5 });
  assert.ok(firstHit(strong, 'p') > firstHit(base, 'p'), 'caçador: mais dano no ataque básico');
  assert.ok(fighterDps(p, { defense: 0 }, { basic: 0.1 }) > fighterDps(p, { defense: 0 }));
});

test('party: o servidor dá os buffs a quem caça junto (mesma caçada)', () => {
  const db = openDb(':memory:');
  const party = new PartyManager(db);
  const game = createGame(db);
  const [w, h] = ([['Muralha', 'warrior'], ['Flecha', 'hunter']] as const).map(([n, v]) => db.createCharacter(db.accountForToken(db.createGuest())!, n, v));
  const { partyId } = party.invite(w.id, h.name, 0);
  party.accept(h.id, partyId!, 0);
  game.start(w.id, 'combat', 'river_bank', 0);
  game.start(h.id, 'combat', 'mill_fields', 0);
  assert.equal(party.partyBuffsFor(w.id), undefined, 'caçadas diferentes: sem buff');
  game.start(h.id, 'combat', 'river_bank', 0);
  assert.deepEqual(party.partyBuffsFor(w.id), { guard: 0.08, basic: 0.1 });
});
