import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  catchUpXpBoost,
  deathPenalty,
  earlyXpBoost, highLevelXpMult,
  huntById,
  levelForXp,
  OFFLINE_CAP_MS,
  PACK_XP_BONUS,
  playerStats,
  runCycle,
  simulateHunt,
  XP_TABLE,
  type Activity,
  instanceWaves,
  instanceRest,
} from '@grimhold/shared';

const hunt = (node: string, seed = 42, since = 0, seq = 0): Activity => ({ skill: 'combat', node, since, seed, seq });

test('mesma semente e mesmo ciclo dão a mesma luta', () => {
  const h = huntById('goblin_den')!;
  const p = playerStats('warrior', XP_TABLE[5]);
  assert.deepEqual(runCycle(h, p, 7, 3), runCycle(h, p, 7, 3));
  assert.notDeepEqual(runCycle(h, p, 7, 3), runCycle(h, p, 7, 4));
});

test('guerreiro nível 1 vence na Margem do Rio e ganha XP e loot', () => {
  const r = simulateHunt(hunt('river_bank'), 10 * 60_000, { vocation: 'warrior', combatXp: 0 });
  assert.equal(r.ended, false);
  assert.ok(r.gains.actions > 20, `abateu ${r.gains.actions}`);
  assert.ok((r.gains.xp.combat ?? 0) > 0);
  assert.ok(Object.keys(r.gains.items).length > 0, 'algum loot caiu');
});

test('nível 1 no Território das Tribos morre e a caçada acaba', () => {
  const xp = XP_TABLE[3] + 100;
  const r = simulateHunt(hunt('tribal_lands'), 10 * 60_000, { vocation: 'arcanist', combatXp: xp });
  assert.equal(r.ended, true);
  assert.ok(r.gains.death);
  assert.ok(r.gains.death!.xpLost > 0, 'perdeu XP');
  assert.ok(['wolf', 'boar', 'wolf_tribe', 'fox_tribe'].includes(r.gains.death!.monster));
});

test('morrer custa XP mas nunca derruba de nível', () => {
  assert.equal(deathPenalty(0), 0, 'nível 1 sem XP não perde nada');
  const justLeveled = XP_TABLE[10] + 5;
  assert.equal(deathPenalty(justLeveled), 5, 'só perde o que passou do início do nível');
  const span = XP_TABLE[11] - XP_TABLE[10];
  const mid = XP_TABLE[10] + Math.floor(span / 2);
  assert.equal(deathPenalty(mid), Math.floor(span * 0.1));
  assert.equal(levelForXp(mid - deathPenalty(mid), 'combat'), 10);

  // Funciona além do nível 120 com combate infinito
  const span150 = XP_TABLE[151] - XP_TABLE[150];
  const mid150 = XP_TABLE[150] + Math.floor(span150 / 2);
  assert.equal(deathPenalty(mid150), Math.floor(span150 * 0.1));
  assert.equal(levelForXp(mid150 - deathPenalty(mid150), 'combat'), 150);
});

test('creditar a cada segundo dá o mesmo que creditar tudo no fim', () => {
  const ctx0 = { vocation: 'hunter', combatXp: 0 };
  const end = 15 * 60_000;
  const once = simulateHunt(hunt('river_bank', 99), end, ctx0);

  let a = hunt('river_bank', 99);
  let xp = 0;
  let kills = 0;
  const items: Record<string, number> = {};
  // Como o servidor: a cada crédito as skills e a mana seguem de onde pararam.
  const skills: Record<string, number> = {};
  for (let t = 1000; t <= end; t += 1000) {
    const r = simulateHunt(a, t, { vocation: 'hunter', combatXp: xp, skills });
    a = { ...a, since: r.since, seq: r.seq, mana: r.mana };
    for (const [k, v] of Object.entries(r.gains.xp)) if (k !== 'combat' && v) skills[k] = (skills[k] ?? 0) + v;
    xp += r.gains.xp.combat ?? 0;
    kills += r.gains.actions;
    for (const [k, v] of Object.entries(r.gains.items)) items[k] = (items[k] ?? 0) + v;
  }
  assert.equal(kills, once.gains.actions);
  assert.equal(xp, once.gains.xp.combat);
  assert.deepEqual(items, once.gains.items);
  assert.equal(a.seq, once.seq);
});

test('offline da caçada também para no teto de 12 h', () => {
  const now = OFFLINE_CAP_MS * 2;
  const r = simulateHunt(hunt('river_bank'), now, { vocation: 'warrior', combatXp: 0 });
  assert.equal(r.since, now, 'o excedente é descartado');
  const capped = simulateHunt(hunt('river_bank'), OFFLINE_CAP_MS, { vocation: 'warrior', combatXp: 0 });
  assert.equal(r.gains.actions, capped.gains.actions);
});

test('luta com múltiplos monstros: bando de 2, 3, 5 e 7 monstros', () => {
  const h = huntById('river_bank')!;
  // Nível perto do da caçada: XP cheio (sem a perda por caçar muito abaixo).
  const p = playerStats('warrior', XP_TABLE[5]);
  const c2 = runCycle(h, p, 123, 0, undefined, 2);
  assert.equal(c2.monsters.length, 2);
  assert.ok(c2.xp >= c2.monsters[0].xp + c2.monsters[1].xp);

  const c3 = runCycle(h, p, 123, 0, undefined, 3);
  assert.equal(c3.monsters.length, 3);
  // Bando de 3: soma dos três com o bônus de bando.
  assert.equal(c3.xp, Math.round((c3.monsters[0].xp + c3.monsters[1].xp + c3.monsters[2].xp) * PACK_XP_BONUS[2] * earlyXpBoost(h.level) * catchUpXpBoost(p.level) * highLevelXpMult(h.level)));

  const c5 = runCycle(h, p, 123, 0, undefined, 5);
  assert.equal(c5.monsters.length, 5);
  const sum5 = c5.monsters.reduce((acc, m) => acc + m.xp, 0);
  assert.equal(c5.xp, Math.round(sum5 * PACK_XP_BONUS[4] * earlyXpBoost(h.level) * catchUpXpBoost(p.level) * highLevelXpMult(h.level)));

  const c7 = runCycle(h, p, 123, 0, undefined, 7);
  assert.equal(c7.monsters.length, 7);
  const sum7 = c7.monsters.reduce((acc, m) => acc + m.xp, 0);
  assert.equal(c7.xp, Math.round(sum7 * PACK_XP_BONUS[6] * earlyXpBoost(h.level) * catchUpXpBoost(p.level) * highLevelXpMult(h.level)));

  // Validação: com 7 ativos, todos os 7 monstros batem no jogador durante a luta
  const pTank = { ...p, hp: 100000, attack: 1 }; // garante que o jogador sobrevive e não mata instantâneo
  const c7Tank = runCycle(h, pTank, 123, 0, undefined, 7);
  const monsterHits = c7Tank.hits.filter((hit) => hit.by === 'm');
  const attackingTargets = new Set(monsterHits.map((hit) => hit.target));
  for (let i = 0; i < 7; i++) {
    assert.ok(attackingTargets.has(i), `Monstro #${i} deve ter desferido ataques na luta`);
  }

  // Mesma semente gera a mesma luta
  assert.deepEqual(runCycle(h, p, 123, 0, undefined, 7), c7);

  // Instância: a limpeza usa o bando escolhido (no máximo 5) e o chefe vem sozinho.
  const bossHunt = huntById('general_crypt')!;
  const waves = instanceWaves(bossHunt, 5);
  assert.equal(runCycle(bossHunt, p, 123, 0, undefined, 7).monsters.length, 5);
  assert.equal(runCycle(bossHunt, p, 123, waves.length, undefined, 7).monsters.length, 1);
  assert.equal(runCycle(bossHunt, p, 123, 0).monsters.length, instanceWaves(bossHunt)[0], 'sem escolher, o de sempre');
});

test('bando de monstros: creditar a cada segundo dá o mesmo que offline', () => {
  const ctx = { vocation: 'warrior', combatXp: XP_TABLE[10] };
  const end = 10 * 60_000;
  const node = 'river_bank:2';
  const once = simulateHunt(hunt(node, 77), end, ctx);

  let a = hunt(node, 77);
  let xp = 0;
  let kills = 0;
  const items: Record<string, number> = {};
  const skills: Record<string, number> = {};
  for (let t = 1000; t <= end; t += 1000) {
    const r = simulateHunt(a, t, { vocation: 'warrior', combatXp: ctx.combatXp + xp, skills });
    a = { ...a, since: r.since, seq: r.seq, mana: r.mana };
    for (const [k, v] of Object.entries(r.gains.xp)) if (k !== 'combat' && v) skills[k] = (skills[k] ?? 0) + v;
    xp += r.gains.xp.combat ?? 0;
    kills += r.gains.actions;
    for (const [k, v] of Object.entries(r.gains.items)) items[k] = (items[k] ?? 0) + v;
  }
  assert.equal(kills, once.gains.actions);
  assert.equal(xp, once.gains.xp.combat);
  assert.deepEqual(items, once.gains.items);
  assert.equal(a.seq, once.seq);
});

test('instância: o descanso entre as lutas é metade do normal', () => {
  assert.equal(instanceRest({ boss: true }, 5000), 2500);
  assert.equal(instanceRest({ boss: false }, 5000), 5000);
  assert.equal(instanceRest({}, 5000), 5000);
});

test('poção de vida: cura durante a luta no limite da barra, um gole a cada 2 s, e sai do banco', async () => {
  const { withHealthPotion, simulateHunt, huntNode, xpForLevel, HEALTH_POTION_COOLDOWN_MS, DIFFICULTIES } = await import('@grimhold/shared');
  const hunt = huntById('orc_fortress')!;
  const base = playerStats('arcanist', xpForLevel(12));
  const rules = { foodBelow: 0.6 };
  const potted = withHealthPotion({ ...base, rules }, null, { health_potion: 30 });
  assert.equal(potted.healthPotion?.id, 'health_potion');
  let sips = 0;
  for (let seq = 0; seq < 40; seq++) {
    const c = runCycle(hunt, potted, 11, seq, DIFFICULTIES[0], 1);
    const times = c.hits.filter((h) => h.healthPotion).map((h) => h.t);
    sips += times.length;
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= HEALTH_POTION_COOLDOWN_MS, 'intervalo de 2 s');
  }
  assert.ok(sips > 0, 'tomou poção no meio da luta');
  // Comida que não é poção não cura no meio da luta; desligada também não.
  assert.equal(withHealthPotion(base, 'mint_tonic', { mint_tonic: 5, health_potion: 5 }).healthPotion, undefined);
  assert.equal(withHealthPotion(base, 'none', { health_potion: 5 }).healthPotion, undefined);
  // Na caçada, o banco nunca fica negativo (luta + descanso usam a mesma pilha).
  const act = { skill: 'combat' as const, node: huntNode('orc_fortress'), since: 0, seed: 5, seq: 0 };
  const r = simulateHunt(act, 3600_000, { vocation: 'arcanist', combatXp: xpForLevel(12), bank: { health_potion: 20 }, rules } as never);
  assert.ok((r.gains.items.health_potion ?? 0) >= -20, `gastou ${r.gains.items.health_potion}`);
});

test('mithril: monstros do 40 ao 50 soltam barra e minério, e as caçadas do 35 ao 44 soltam equipamento de mithril', async () => {
  const { MONSTERS, DIFFICULTIES, xpForLevel, equipmentBonus } = await import('@grimhold/shared');
  const dropsBar = MONSTERS.filter((m) => m.loot.some((l) => l.item === 'mithril_bar')).map((m) => m.id);
  assert.ok(dropsBar.includes('cyclops') && dropsBar.includes('brontes'), dropsBar.join(', '));
  assert.ok(MONSTERS.some((m) => m.loot.some((l) => l.item === 'mithril_ore')));
  const hunt = huntById('cyclops_lair')!;
  const p = playerStats('warrior', xpForLevel(60), equipmentBonus({ weapon: 'mithril_sword', armor: 'mithril_armor', helmet: 'mithril_helmet', legs: 'mithril_legs' }));
  const got = new Set<string>();
  for (let seq = 0; seq < 400; seq++) for (const id of Object.keys(runCycle(hunt, p, 21, seq, DIFFICULTIES[0], 1).loot)) got.add(id.split('+')[0]);
  assert.ok([...got].some((id) => id.startsWith('mithril_') && id !== 'mithril_bar' && id !== 'mithril_ore'), [...got].join(', '));
});
