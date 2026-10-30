import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blessPrice, itemsLostOnDeath, simulateHunt, XP_TABLE, type Activity, HUNTS, DIFFICULTIES, playerStats, runCycle, monsterById, underLevelPenalty, UNDERLEVEL_DAMAGE, UNDERLEVEL_XP, HIGH_HUNT_HP,
  HUNT_STAT, HIGH_HUNT_DEFENSE, HIGH_HUNT_XP, isHighHunt, defaultSpells, highLevelXpMult } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const token = db.createGuest();
  const character = db.createCharacter(db.accountForToken(token)!, 'Teste', 'warrior');
  return { db, game, id: character.id };
}

const FULL = {
  helmet: 'iron_helmet', armor: 'iron_armor', legs: 'iron_legs', boots: 'iron_boots', shield: 'iron_shield', weapon: 'iron_sword',
} as const;

test('morte: cerca de 10% das peças se perdem, sempre o mesmo sorteio para a mesma luta', () => {
  let lost = 0;
  for (let seed = 1; seed <= 500; seed++) lost += itemsLostOnDeath(FULL, seed, 3).length;
  const rate = lost / (500 * 6);
  assert.ok(rate > 0.07 && rate < 0.13, `taxa ${rate}`);
  assert.deepEqual(itemsLostOnDeath(FULL, 9, 4), itemsLostOnDeath(FULL, 9, 4));
  assert.deepEqual(itemsLostOnDeath({}, 9, 4), []);
});

test('morte abençoada perde metade do XP', () => {
  const hunt: Activity = { skill: 'combat', node: 'tribal_lands', since: 0, seed: 5, seq: 0 };
  const ctx = { vocation: 'warrior', combatXp: XP_TABLE[3] + 200 };
  const plain = simulateHunt(hunt, 10 * 60_000, ctx).gains.death!;
  const blessed = simulateHunt(hunt, 10 * 60_000, { ...ctx, blessed: true }).gains.death!;
  assert.ok(plain && blessed);
  assert.equal(blessed.xpLost, Math.floor(plain.xpLost / 2));
});

test('bênção: compra no Templo, protege os itens na morte e é gasta', () => {
  const { db, game, id } = setup();
  db.applyGains(id, { actions: 0, items: { gold: 50 }, xp: { combat: XP_TABLE[3] } }, 0, 0);
  assert.equal(game.buyBless(id, 0), 'Ouro insuficiente.');
  db.applyGains(id, { actions: 0, items: { gold: blessPrice(3) }, xp: {} }, 0, 0);
  assert.equal(game.buyBless(id, 0), null);
  assert.equal(game.state(id, 0).blessed, true);
  assert.equal(game.buyBless(id, 0), 'Você já está abençoado.');
  for (const item of ['leather_cap', 'leather_armor', 'leather_legs', 'leather_boots']) {
    db.applyGains(id, { actions: 0, items: { [item]: 1 }, xp: {} }, 0, 0);
    assert.equal(game.equip(id, item, 0), null);
  }
  game.start(id, 'combat', 'tribal_lands', 0);
  const { gains } = game.settle(id, 10 * 60_000);
  assert.ok(gains.death?.blessed, 'a bênção foi usada');
  const after = game.state(id, 10 * 60_000);
  assert.equal(after.blessed, false);
  assert.equal(Object.keys(after.equipment).length, 4, 'nenhuma peça perdida');
});

test('caçada alta abaixo do nível: monstros tomam 25% do dano e a XP cai para 25%; instância, covil e caçada baixa não', () => {
  const hunt = HUNTS.find((h) => !h.boss && !h.lair && h.level >= 120)!;
  assert.equal(underLevelPenalty(hunt, hunt.level - 1), true);
  assert.equal(underLevelPenalty(hunt, hunt.level), false);
  assert.equal(underLevelPenalty(hunt, undefined), false);
  for (const h of HUNTS.filter((x) => x.boss || x.lair || x.level < 120)) assert.equal(underLevelPenalty(h, 1), false, h.id);
  const strong = playerStats('warrior', XP_TABLE[hunt.level], { attack: 3000, defense: 400, hp: 20000 });
  const at = { ...strong, level: hunt.level };
  const below = { ...strong, level: hunt.level - 1 };
  let checked = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const a = runCycle(hunt, at, seed, 0, DIFFICULTIES[0], 1);
    const b = runCycle(hunt, below, seed, 0, DIFFICULTIES[0], 1);
    const base = monsterById(a.monster.id)!;
    assert.equal(b.monsters[0].hp, Math.round(a.monsters[0].hp / UNDERLEVEL_DAMAGE), 'vida 4x = 25% do dano');
    assert.equal(a.monsters[0].hp, Math.round(Math.round(base.hp * HIGH_HUNT_HP) * HUNT_STAT.hp), 'caçada alta: +30% de vida (e os +10% de todas as caçadas comuns)');
    if (a.outcome === 'win' && b.outcome === 'win') {
      assert.ok(Math.abs(b.xp - a.xp * UNDERLEVEL_XP) <= 1, `XP ${a.xp} -> ${b.xp}`);
      checked++;
    }
  }
  assert.ok(checked > 0, 'comparou alguma vitória');
});

test('caçadas comuns do 120 para cima: -30% de XP, +30% de vida e +20% de defesa; instância, covil e abaixo do 120 não mudam', () => {
  const hunt = HUNTS.find((h) => isHighHunt(h))!;
  for (const h of HUNTS) assert.equal(isHighHunt(h), !h.boss && !h.lair && h.level >= 120, h.id);
  const p = { ...playerStats('warrior', XP_TABLE[hunt.level + 5], { attack: 3000, defense: 400, hp: 20000 }), level: hunt.level + 5 };
  const lower = { ...hunt, level: 119 };
  let checked = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const a = runCycle(hunt, p, seed, 0, DIFFICULTIES[0], 1);
    const b = runCycle(lower, p, seed, 0, DIFFICULTIES[0], 1);
    const base = monsterById(a.monster.id)!;
    assert.equal(a.monsters[0].hp, Math.round(Math.round(base.hp * HIGH_HUNT_HP) * HUNT_STAT.hp));
    assert.ok(Math.abs(a.monsters[0].defense - base.defense * HIGH_HUNT_DEFENSE) < 1e-9);
    assert.equal(b.monsters[0].hp, Math.round(base.hp * HUNT_STAT.hp), 'abaixo do 120 só os +10% de todas as caçadas comuns');
    if (a.outcome === 'win' && b.outcome === 'win') {
      // A XP de nível alto (highLevelXpMult) também muda do 119 para o nível da caçada.
      const lvl = highLevelXpMult(hunt.level) / highLevelXpMult(119);
      assert.ok(Math.abs(a.xp - b.xp * HIGH_HUNT_XP * lvl) <= 2, `XP ${b.xp} -> ${a.xp}`);
      checked++;
    }
  }
  assert.ok(checked > 0);
});

test('caçada: creditar a cada segundo (online) ou de uma vez (offline) dá a mesma luta e a mesma XP', () => {
  const spells = defaultSpells('warrior', 60);
  const run = (step: number) => {
    let a: Activity = { skill: 'combat', node: 'tribal_lands', since: 0, seed: 9, seq: 0 };
    let xp = XP_TABLE[60];
    const skills: Record<string, number> = {};
    for (let t = step; t <= 3600_000; t += step) {
      const r = simulateHunt(a, t, { vocation: 'warrior', combatXp: xp, spells, skills, boostedCreature: 'none' });
      xp += r.gains.xp.combat ?? 0;
      a = { ...a, since: r.since, seq: r.seq, mana: r.mana };
      for (const [k, v] of Object.entries(r.gains.xp)) if (k !== 'combat' && v) skills[k] = (skills[k] ?? 0) + v;
      if (r.ended) break;
    }
    return { xp, seq: a.seq };
  };
  const once = run(3600_000);
  const online = run(1000);
  // As skills sobem durante a hora online e só no fim no offline: até 1% de lutas de diferença.
  assert.ok(Math.abs(online.seq - once.seq) <= once.seq * 0.01, `lutas ${once.seq} x ${online.seq} (a mana continua de um crédito para o outro)`);
  assert.ok(Math.abs(online.xp - once.xp) <= once.xp * 0.01, `XP ${once.xp} x ${online.xp}`);
});

test('XP de nível alto: +50% até o 100, depois sobe sem cair', () => {
  assert.equal(highLevelXpMult(1), 1.5);
  assert.equal(highLevelXpMult(100), 1.5);
  let last = 1.5;
  for (let lv = 101; lv <= 400; lv++) {
    const m = highLevelXpMult(lv);
    assert.ok(m > last, `${lv}`);
    last = m;
  }
});
