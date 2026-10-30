import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { createWorldBoss } from '../src/worldboss.ts';
import {
  BOSS_EVERY_MS, BOSS_DURATION_MS, SPECIAL_BOSS_EVENTS, WORLD_BOSSES, XP_TABLE, WORLD_BOSS_NODE,
  bossSkillActive, bossSkillCount, bossSkillText, rotationBoss, type WorldBoss,
} from '@grimhold/shared';

/** Primeiro evento (início e duração) de cada chefe. */
function eventOf(boss: WorldBoss): { startsAt: number; durationMs: number } {
  const sp = SPECIAL_BOSS_EVENTS.find((e) => e.boss === boss.id);
  if (sp) return { startsAt: sp.startsAt, durationMs: sp.durationMs };
  const base = Math.floor(Date.UTC(2026, 10, 1) / BOSS_EVERY_MS);
  for (let n = base; n < base + 200; n++) if (rotationBoss(n).id === boss.id) return { startsAt: n * BOSS_EVERY_MS, durationMs: BOSS_DURATION_MS };
  throw new Error(boss.id);
}

const bosses = [...WORLD_BOSSES, ...(await import('@grimhold/shared')).SPECIAL_BOSSES].filter((b) => b.skills?.length);

test('chefes globais: todos (menos o Mímico comum) têm golpes próprios', () => {
  for (const b of WORLD_BOSSES) assert.ok(b.skills && b.skills.length >= 2, `${b.id} tem golpes`);
});

for (const b of bosses) {
  test(`${b.name}: a luta inteira com os golpes sem quebrar`, () => {
    const db = openDb(':memory:');
    const game = createGame(db);
    const engine = createWorldBoss(db, game);
    const vocs = ['warrior', 'hunter', 'arcanist', 'devout'] as const;
    const ids = [20, 45, 80, 110, 150, 190].map((lv, i) => {
      const c = db.createCharacter(db.accountForToken(db.createGuest())!, `Lutador${i}`, vocs[i % 4]);
      db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[lv] } }, 0, 0);
      return c.id;
    });
    const { startsAt: t0, durationMs } = eventOf(b);
    engine.tick(t0);
    for (const id of ids) assert.equal(engine.join(id, t0), null);
    const seen = new Set<string>();
    let results: ReturnType<typeof engine.tick>['results'] = [];
    let lastHp = engine.view(ids[0], t0).hp;
    let prevStanding = true;
    let end = t0;
    for (let t = t0 + 1000; t <= t0 + durationMs + 2000; t += 1000) {
      results = engine.tick(t).results;
      end = t;
      if (results.length) break;
      const v = engine.view(ids[0], t);
      const standing = prevStanding;
      prevStanding = v.fighters.some((f) => !f.downUntil || f.downUntil <= t);
      assert.ok(Number.isFinite(v.hp) && v.hp >= 0 && v.hp <= v.maxHp, `vida do chefe ${v.hp}/${v.maxHp}`);
      for (const f of v.fighters) assert.ok(Number.isFinite(f.hp) && f.hp >= 0 && f.hp <= 1, `vida de ${f.name}: ${f.hp}`);
      for (const k of b.skills!) {
        const fired = bossSkillCount(k, t0, t) !== bossSkillCount(k, t0, t - 1000);
        if (k.kind === 'immune' && bossSkillActive(k, t0, t) && bossSkillActive(k, t0, t - 1000)) {
          assert.ok(v.hp >= lastHp, `${k.id}: imune, mas a vida desceu ${lastHp} -> ${v.hp}`);
          seen.add(k.id);
        }
        if (!fired) continue;
        // Golpe em quem está de pé: se todos estão caídos (depois de um DOOM, ou caíram neste mesmo segundo), não tem em quem acertar.
        const allDown = v.fighters.every((f) => (f.downUntil ?? 0) > t);
        if (!standing || allDown) continue;
        if (k.kind === 'aoe') { assert.ok(v.fighters.some((f) => f.fireball?.at === t), `${k.id} acertou`); seen.add(k.id); }
        if (k.kind === 'stun') { assert.equal(v.swallowed?.at, t, `${k.id} prendeu alguém`); seen.add(k.id); }
        if (k.kind === 'heal') { assert.ok(v.hp > lastHp || v.hp === v.maxHp, `${k.id} curou`); seen.add(k.id); }
        if (k.kind === 'weaken' || k.kind === 'enrage') seen.add(k.id);
      }
      assert.doesNotThrow(() => bossSkillText(v.skills, v.startsAt, t));
      lastHp = v.hp;
    }
    for (const k of b.skills!) assert.ok(seen.has(k.id), `${k.id} aconteceu`);
    assert.equal(results.length, ids.length, 'todo mundo recebe o resultado');
    for (const r of results) {
      assert.ok(Number.isFinite(r.reward.xp) && Number.isFinite(r.reward.gold));
      if (b.pet && r.killed && r.damage > 0) assert.ok(db.petsFor(r.characterId).includes(b.pet));
      assert.notEqual(db.activityFor(r.characterId)?.node, WORLD_BOSS_NODE, 'saiu da arena');
    }
    console.log(`${b.name}: ${results[0].killed ? 'caiu' : 'fugiu'} em ${Math.round((end - t0) / 60_000)} de ${durationMs / 60_000} min`);
  });
}

test('chefe global: lutar gasta stamina (1 s por segundo na arena), como a caçada', async () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const engine = createWorldBoss(db, game);
  const c = db.createCharacter(db.accountForToken(db.createGuest())!, 'Cansado', 'warrior');
  db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[120] } }, 0, 0);
  const b = WORLD_BOSSES[0];
  const { startsAt: t0 } = eventOf(b);
  db.setStamina(c.id, 10 * 3600_000, t0 - 1000);
  engine.tick(t0);
  assert.equal(engine.join(c.id, t0), null);
  for (let t = t0 + 1000; t <= t0 + 120_000; t += 1000) engine.tick(t);
  const left = game.state(c.id, t0 + 120_000).stamina ?? 0;
  // 2 minutos na arena: uns 2 minutos a menos (sem voltar nada).
  assert.ok(left < 10 * 3600_000 - 100_000 && left > 10 * 3600_000 - 125_000, `stamina ${left}`);
});
