import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, huntNode, simulateHunt, xpForLevel, KIDS_DAY_START } from '@grimhold/shared';

// Um NaN na simulação prende o servidor no laço da caçada (12/10: o Diabrete num bando de 7).
// Varre todas as caçadas, bando de 1 e de 7, dentro e fora do evento, e exige números válidos.
test('simulação: todas as caçadas e bandos dão números válidos e terminam', () => {
  const vocs = ['warrior', 'hunter', 'arcanist', 'devout'] as const;
  let n = 0;
  for (const at of [KIDS_DAY_START + 5 * 3600_000, KIDS_DAY_START - 86_400_000]) {
    for (const h of HUNTS) {
      for (const pack of h.boss ? [1] : [1, 7]) {
        for (const v of vocs) {
          const act = { skill: 'combat' as const, node: huntNode(h.id, 'normal', pack), since: at - 2 * 3600_000, seed: 1000 + n++, seq: 0 };
          const r = simulateHunt(act, at, { vocation: v, combatXp: xpForLevel(h.level + 20), instanceFreeKey: true } as never);
          const vals = [r.since, r.seq, ...Object.values(r.gains.xp), ...Object.values(r.gains.items)] as number[];
          assert.ok(vals.every(Number.isFinite), `${h.id} bando ${pack} ${v}: ${JSON.stringify(r.gains.xp)}`);
          // A trava contra NaN para o laço cedo: sem fim de caçada, o tempo tem que chegar perto de agora.
          assert.ok(r.ended || at - r.since < 30 * 60_000, `${h.id} bando ${pack} ${v}: parou ${Math.round((at - r.since) / 60_000)} min antes`);
        }
      }
    }
  }
});

// Covis (aba Chefes): nível baixo e alto, dificuldades, sozinho e em grupo (inclusive valores fora do
// normal), 12 h seguidas (teto offline): números válidos, termina e não demora.
test('simulação: covis em qualquer nível, dificuldade e tamanho de grupo terminam com números válidos', () => {
  const vocs = ['warrior', 'hunter', 'arcanist', 'devout'] as const;
  const at = KIDS_DAY_START - 86_400_000;
  let n = 0;
  const t0 = Date.now();
  for (const h of HUNTS.filter((x) => x.lair)) {
    for (const level of [1, 60, h.level, 200]) {
      for (const diff of ['normal', 'nightmare'] as const) {
        const groups = [undefined, { killAt: 20_000, allies: [{ id: 2, hitMs: 1000, hit: 300 }] }, { killAt: 1, allies: [{ id: 2, hitMs: 1000, hit: 1 }] },
          { killAt: Number.NaN, allies: [{ id: 2, hitMs: 1000, hit: 300 }] }, { killAt: 20_000, allies: [{ id: 2, hitMs: 0, hit: Number.NaN }] }];
        for (const lairGroup of groups) {
          for (const v of vocs) {
            const act = { skill: 'combat' as const, node: huntNode(h.id, diff, 1), since: at - 12 * 3600_000, seed: 5000 + n++, seq: 0 };
            const r = simulateHunt(act, at, { vocation: v, combatXp: xpForLevel(level), lairGroup, partyBuffs: { guard: 0.08, basic: 0.1, spell: 0.1, heal: 0.15 } } as never);
            const vals = [r.since, r.seq, ...Object.values(r.gains.xp), ...Object.values(r.gains.items)] as number[];
            const tag = `${h.id} nível ${level} ${diff} grupo ${JSON.stringify(lairGroup)} ${v}`;
            assert.ok(vals.every(Number.isFinite), `${tag}: ${JSON.stringify(r.gains.xp)}`);
            assert.ok(r.ended || at - r.since < 30 * 60_000, `${tag}: parou ${Math.round((at - r.since) / 60_000)} min antes`);
          }
        }
      }
    }
  }
  assert.ok(Date.now() - t0 < 60_000, `${n} simulações de 12 h em ${Date.now() - t0} ms`);
});
