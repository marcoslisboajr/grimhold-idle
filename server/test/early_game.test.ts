import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { FIRST_STEPS, HUNTING_TASKS, HUNTS, MONSTERS, itemById } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const NEW_HUNTS = ['city_cellars', 'boar_grove', 'kobold_camp', 'witch_bog', 'abandoned_mine', 'raven_isle'];
const NEW_LAIRS = ['weaver_web', 'rat_king_throne', 'old_mine_depths'];

test('early game: caçadas e covis novos existem, com monstros, sprites e loot válidos', () => {
  for (const id of [...NEW_HUNTS, ...NEW_LAIRS]) {
    const h = HUNTS.find((x) => x.id === id);
    assert.ok(h, id);
    assert.equal(!!h.lair, NEW_LAIRS.includes(id), id);
    for (const mid of h.monsters) {
      const m = MONSTERS.find((x) => x.id === mid);
      assert.ok(m, mid);
      assert.ok(existsSync(new URL(`../../client/public/assets/monsters/${m.sprite}_1.png`, import.meta.url)), m.sprite);
      for (const l of m.loot) assert.ok(l.item === 'gold' || itemById(l.item), `${mid}: ${l.item}`);
    }
  }
  // Cada covil solta equipamento de chefe (direto ou numa bolsa cujas peças existem).
  for (const id of NEW_LAIRS) {
    const boss = MONSTERS.find((m) => m.id === HUNTS.find((h) => h.id === id)!.monsters[0])!;
    const gear = boss.loot.flatMap((l) => itemById(l.item)?.pool ?? [l.item]).filter((i) => itemById(i)?.equip);
    assert.ok(gear.length > 0, id);
  }
});

test('early game: XP por monstro fica entre as caçadas vizinhas do mesmo nível', () => {
  const avgXp = (id: string) => {
    const h = HUNTS.find((x) => x.id === id)!;
    return h.monsters.reduce((s, m) => s + MONSTERS.find((x) => x.id === m)!.xp, 0) / h.monsters.length;
  };
  assert.ok(avgXp('city_cellars') >= avgXp('river_bank') && avgXp('city_cellars') <= avgXp('goblin_den'));
  assert.ok(avgXp('kobold_camp') > avgXp('tribal_lands') && avgXp('kobold_camp') < avgXp('orc_fortress'));
  assert.ok(avgXp('witch_bog') > avgXp('ashfen_barracks') && avgXp('witch_bog') < avgXp('minotaur_maze'));
  assert.ok(avgXp('abandoned_mine') > avgXp('shipwreck_beach') && avgXp('abandoned_mine') < avgXp('cyclops_lair'));
  assert.ok(avgXp('raven_isle') < avgXp('coral_depths'));
});

test('tarefas de caça novas apontam para monstros que existem', () => {
  for (const id of ['task_kobolds', 'task_bog_witches', 'task_mine_golems']) {
    const t = HUNTING_TASKS.find((x) => x.id === id);
    assert.ok(t, id);
    assert.equal(MONSTERS.find((m) => m.id === t.monsterId)?.name, t.monsterName);
  }
});

test('primeiros passos: só resgata meta cumprida, paga uma vez e guarda o resgate', () => {
  assert.equal(FIRST_STEPS.length, 11);
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Novato', 'warrior').id;
  assert.match(game.claimFirstStep(id, 'hunt', 1) ?? '', /ainda não/);
  assert.match(game.claimFirstStep(id, 'nada', 1) ?? '', /inválida/);
  const gold = db.bankFor(id).gold ?? 0;
  db.addStat(id, 'kills', 10);
  assert.equal(game.claimFirstStep(id, 'hunt', 2), null);
  assert.equal((db.bankFor(id).gold ?? 0) - gold, 100);
  assert.equal(db.bankFor(id).cooked_shrimp, 10);
  assert.match(game.claimFirstStep(id, 'hunt', 3) ?? '', /já foi resgatada/);
  assert.equal(db.statsFor(id)['first_hunt' as never], 1);
});

test('stages de XP: na mesma luta o 350 ganha 40% do que ganha o 190 (100%)', async () => {
  const { runCycle, playerStats, xpForLevel, equipmentBonus, HUNTS: H, OVER_350_XP_MULT } = await import('@grimhold/shared');
  assert.equal(OVER_350_XP_MULT, 0.4);
  // Caçada do 355 só com ratos: a regra de nível vale igual e a luta é sempre vencida.
  const hunt = { ...H.find((h) => h.id === 'raptor_plains')!, monsters: ['rat'] };
  const base = playerStats('hunter', xpForLevel(350), equipmentBonus({}));
  const at = (level: number) => runCycle(hunt, { ...base, level }, 7, 1);
  const a = at(190), b = at(350);
  assert.equal(a.outcome, b.outcome);
  assert.ok(a.xp > 0, 'a luta rende XP');
  // A XP de cada luta é arredondada.
  assert.ok(b.xp >= Math.floor(a.xp * 0.4) && b.xp <= Math.ceil(a.xp * 0.4), `190: ${a.xp}, 350: ${b.xp}`);
  const { playerLevelXpMult: f } = await import('@grimhold/shared');
  assert.equal(f(1), 1); assert.equal(f(200), 1.3); assert.equal(f(250), 1.2); assert.equal(f(300), 1); assert.equal(f(350), 0.4); assert.equal(f(400), 0.04);
});

test('primeiro 99 numa profissão: só o primeiro do servidor ganha o aviso de comemoração', async () => {
  const { CELEBRATE_PREFIX, levelForXp } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const game = createGame(db);
  const mk = (name: string) => db.createCharacter(db.accountForToken(db.createGuest())!, name, 'warrior').id;
  // Menor XP que dá o nível (busca binária).
  const xpAt = (lv: number) => { let lo = 0, hi = 1e13; while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (levelForXp(mid, 'mining') >= lv) hi = mid; else lo = mid + 1; } return lo; };
  const a = mk('Primeiro'), b = mk('Segundo');
  // A um passo do 99: minerar alguns minutos passa do nível.
  const near = xpAt(99) - 50;
  for (const id of [a, b]) db.applyGains(id, { actions: 0, items: {}, xp: { mining: near } }, 0, 0);
  const climb = (id: number, t0: number) => {
    assert.equal(game.start(id, 'mining', 'copper_vein', t0), null);
    const out = game.settle(id, t0 + 10 * 60_000).broadcasts;
    assert.ok(levelForXp(db.skillsFor(id).mining ?? 0, 'mining') >= 99, 'chegou no 99');
    return out;
  };
  const first = climb(a, 1_000);
  assert.ok(first.some((m) => m.startsWith(CELEBRATE_PREFIX) && m.includes('Primeiro')), 'o primeiro comemora');
  const second = climb(b, 200_000);
  assert.ok(!second.some((m) => m.startsWith(CELEBRATE_PREFIX)), 'o segundo não');
});

test('chaves da Ferraria: XP por segundo nunca cai com o nível (até o 115) e não fica abaixo das receitas do mesmo nível', async () => {
  const smithing = (await import('../../shared/data/smithing.json', { with: { type: 'json' } })).default as { output: string; level: number; xp: number; intervalMs: number }[];
  const keys = smithing.filter((r) => r.output.endsWith('_key')).sort((a, b) => a.level - b.level);
  const others = smithing.filter((r) => !r.output.endsWith('_key'));
  let best = 0;
  for (const k of keys) {
    const xps = k.xp / k.intervalMs;
    if (k.level < 120) { assert.ok(xps >= best * 0.999, `${k.output} (${k.level}) rende menos que uma chave de nível menor`); best = Math.max(best, xps); }
    const near = others.filter((o) => Math.abs(o.level - k.level) <= 5);
    const avg = near.reduce((s, o) => s + o.xp / o.intervalMs, 0) / near.length;
    assert.ok(xps >= avg, `${k.output} rende menos que as receitas do nível ${k.level}`);
  }
});

test('prey: em qualquer nível a faixa tem espécies para a lista cheia (9) mesmo com as outras duas vagas ocupadas', async () => {
  const { preyPool, PREY_OPTIONS } = await import('@grimhold/shared');
  for (let L = 1; L <= 500; L += 7) assert.ok(preyPool(L).length >= PREY_OPTIONS + 2, `nível ${L}: ${preyPool(L).length}`);
});

test('coleta: a ferramenta dá chance de item a mais por ação (bronze 5% ... primordial 55%)', async () => {
  const { simulate, toolYieldFor, xpForLevel } = await import('@grimhold/shared');
  const xp = xpForLevel(115) * 100;
  assert.equal(toolYieldFor('mining', xp, { bronze_pickaxe: 1 }), 0.05);
  assert.equal(toolYieldFor('mining', xp, { primordial_pickaxe: 1 }), 0.55);
  assert.equal(toolYieldFor('woodcutting', xp, { primordial_pickaxe: 1 }), 0, 'picareta não vale no lenhador');
  assert.ok(toolYieldFor('woodcutting', xp, Object.fromEntries((await import('@grimhold/shared')).toolsFor('woodcutting').map((t: { id: string }) => [t.id, 1]))) > 0.4, 'o melhor machado dá chance no lenhador');
  assert.equal(toolYieldFor('smithing', xp, {}), 0, 'só coleta');
  // Mesmo tempo e mesmo lugar: com a picareta sai mais minério por golpe.
  const act = { skill: 'mining' as const, node: 'copper_vein', since: 0, seed: 7, seq: 0 };
  const run = (bank: Record<string, number>) => {
    const r = simulate(act, 2 * 3_600_000, { skills: { mining: xp } as never, bank } as never);
    return (r.gains.items.copper_ore ?? 0) / r.gains.actions;
  };
  const none = run({}), best = run({ primordial_pickaxe: 1 });
  assert.ok(best - none > 0.45 && best - none < 0.65, `sem: ${none}, com: ${best}`);
});

test('primeiro 99 por fora da profissão rodando (ex.: encomenda): a checagem do minuto anuncia uma vez', async () => {
  const { levelForXp } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Pescadora', 'warrior').id;
  let xp = 0; while (levelForXp(xp, 'fishing') < 99) xp = Math.ceil(xp * 1.01) + 1000;
  db.applyGains(id, { actions: 0, items: {}, xp: { fishing: xp } }, 0, 0);
  const first = game.first99Sweep(1);
  assert.equal(first.length, 1);
  assert.match(first[0], /Pescadora.*99 em Pesca/);
  assert.equal(game.first99Sweep(2).length, 0, 'não repete');
});
