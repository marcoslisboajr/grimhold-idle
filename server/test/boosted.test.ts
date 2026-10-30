import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBoostedCreature,
  BOOSTED_MONSTER_POOL,
  BOOSTED_XP_MULT,
  BOOSTED_LOOT_MULT,
  monsterById,
  HUNTS,
  runCycle,
  playerStats,
  XP_TABLE,
} from '@grimhold/shared';

test('criatura do dia: rotação diária determinística', () => {
  assert.ok(BOOSTED_MONSTER_POOL.length > 5, 'deve ter uma lista rica de monstros comuns');
  const d1 = new Date('2026-10-07T12:00:00Z');
  const d2 = new Date('2026-10-07T23:59:59Z');
  const dNext = new Date('2026-10-08T00:00:01Z');

  const b1 = getBoostedCreature(d1);
  const b2 = getBoostedCreature(d2);
  const bNext = getBoostedCreature(dNext);

  assert.equal(b1, b2, 'o monstro do dia deve ser idêntico no mesmo dia UTC');
  assert.ok(BOOSTED_MONSTER_POOL.includes(b1));
  assert.ok(BOOSTED_MONSTER_POOL.includes(bNext));
});

test('criatura do dia: concede bônus de XP e chance de loot', () => {
  const hunt = HUNTS.find((h) => !h.boss && h.level >= 20)!;
  const targetMonsterId = hunt.monsters[0];
  const warrior = playerStats('warrior', XP_TABLE[hunt.level]);

  // Ciclo normal sem ser boosted:
  const normalCycle = runCycle(hunt, warrior, 42, 0, undefined, 1, {}, [], [], 'outro_monstro_inexistente');
  // Ciclo onde o monstro da hunt é a criatura do dia:
  const boostedCycle = runCycle(hunt, warrior, 42, 0, undefined, 1, {}, [], [], targetMonsterId);

  assert.equal(normalCycle.monster.id, targetMonsterId);
  assert.equal(boostedCycle.monster.id, targetMonsterId);
  assert.ok(
    boostedCycle.xp > normalCycle.xp,
    `boosted deve dar mais XP (${boostedCycle.xp} vs ${normalCycle.xp})`,
  );
  // A XP do monstro é arredondada no bônus (e ampliada pelos outros multiplicadores): aceita 3% de diferença.
  assert.ok(
    Math.abs(boostedCycle.xp - normalCycle.xp * BOOSTED_XP_MULT) <= Math.max(1, normalCycle.xp * BOOSTED_XP_MULT * 0.03),
    'deve multiplicar o XP por BOOSTED_XP_MULT',
  );
});

test('Criatura do Dia nunca é chefe (nem de instância nem de covil)', async () => {
  const { HUNTS } = await import('@grimhold/shared');
  const bosses = new Set(HUNTS.filter((h) => h.boss || h.lair).flatMap((h) => h.monsters));
  const regular = new Set(HUNTS.filter((h) => !h.boss && !h.lair).flatMap((h) => h.monsters));
  for (const id of BOOSTED_MONSTER_POOL) assert.ok(regular.has(id), id);
  for (let d = 0; d < 400; d++) {
    const id = getBoostedCreature(new Date(Date.UTC(2026, 0, 1) + d * 86_400_000));
    assert.ok(!bosses.has(id) || regular.has(id), `dia ${d}: ${id}`);
  }
});

test('Criatura do Dia: rodízio sem repetir até passarem todas', () => {
  const start = Date.UTC(2026, 10, 1);
  const seen = new Set<string>();
  for (let d = 0; d < BOOSTED_MONSTER_POOL.length; d++) seen.add(getBoostedCreature(new Date(start + d * 86_400_000)));
  assert.equal(seen.size, BOOSTED_MONSTER_POOL.length);
});

test('Criatura do Dia: monstros novos só entram no rodízio no dia marcado (o deploy não troca a de hoje)', async () => {
  const { getBoostedCreature: boosted, BOOSTED_MONSTER_POOL: pool, EARLY_GAME_MONSTERS, PRIMEVAL_MONSTERS, REGIONS_500_MONSTERS, REGIONS_600_MONSTERS } = await import('@grimhold/shared');
  const asuras = ['asura_matriarch', 'asura_sentinel', 'dawnfire_asura', 'dawnfire_dancer', 'frost_asura', 'frost_maiden', 'midnight_asura', 'midnight_stalker', 'true_asura', 'corrupted_beast', 'twisted_branch',
    'abyss_warrior', 'abyss_spearman', 'abyssal_jelly', 'abyss_tidecaller', 'abyssal_turtle', 'sea_hydra', 'abyssal_siren', 'elder_hydra', 'abyss_champion',
    ...EARLY_GAME_MONSTERS, ...PRIMEVAL_MONSTERS, ...REGIONS_500_MONSTERS, ...REGIONS_600_MONSTERS];
  // O rodízio de antes das Asuras, com a mesma mistura de sempre.
  const old = pool.filter((id) => !asuras.includes(id));
  let seed = 0xb005ed;
  for (let i = old.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [old[i], old[j]] = [old[j], old[i]];
  }
  const day18 = Date.UTC(2026, 9, 18) / 86_400_000;
  assert.equal(boosted(new Date(Date.UTC(2026, 9, 18, 2))), old[day18 % old.length], '18/10 continua a de antes do deploy');
  // Do 19/10 em diante as Asuras podem sair (a lista completa).
  let seen = false;
  for (let d = 0; d < pool.length * 2 && !seen; d++) seen = asuras.includes(boosted(new Date(Date.UTC(2026, 9, 19) + d * 86_400_000)));
  assert.ok(seen, 'as Asuras entram no rodízio');
  for (let d = 0; d < 30; d++) assert.ok(!asuras.includes(boosted(new Date(Date.UTC(2026, 8, 18) + d * 86_400_000))), 'antes do dia, nunca');
  // Early game e Vale Primevo: até 22/10 o rodízio é o mesmo de antes (publicar não troca a criatura de hoje).
  const fresh = [...EARLY_GAME_MONSTERS, ...PRIMEVAL_MONSTERS];
  for (let d = 19; d <= 22; d++) assert.ok(!fresh.includes(boosted(new Date(Date.UTC(2026, 9, d, 12)))), `${d}/10 sem monstro novo`);
});

test('Skill do Dia: desde 19/10 começa pela forja e nenhuma repete antes de todas passarem', async () => {
  const { getBoostedSkill: skill, PROFESSIONS: profs } = await import('@grimhold/shared');
  assert.equal(skill(new Date(Date.UTC(2026, 9, 18, 12))), 'mining', 'hoje (18/10) continua a mineração');
  assert.equal(skill(new Date(Date.UTC(2026, 9, 19, 12))), 'smithing', 'amanhã é a forja');
  const start = Date.UTC(2026, 9, 19, 12);
  const seen = new Set<string>();
  for (let d = 0; d < profs.length; d++) seen.add(skill(new Date(start + d * 86_400_000)));
  assert.equal(seen.size, profs.length, 'uma volta passa por todas as profissões, sem repetir');
  assert.equal(skill(new Date(start + profs.length * 86_400_000)), 'smithing', 'e recomeça');
});
