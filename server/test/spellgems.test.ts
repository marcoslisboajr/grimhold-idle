import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, SPELLS, SPELL_GEMS, equipmentBonus, itemById, playerStats, spellGemId } from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

test('Gemas de Combate: uma por magia, com item no espaço Gema e receita na Joalheria', () => {
  assert.equal(SPELL_GEMS.length, SPELLS.filter((s) => !s.promotion).length);
  for (const s of SPELLS.filter((x) => !x.promotion)) {
    const it = itemById(spellGemId(s.id));
    assert.ok(it, s.id);
    assert.equal(it!.equip?.slot, 'gem');
    assert.equal(it!.icon, `spellgem_${s.vocation}`);
    assert.deepEqual(it!.equip?.vocations, [s.vocation]);
    const r = RECIPES.jewelcrafting.find((x) => x.output === it!.id);
    assert.ok(r, `receita ${s.id}`);
    for (const input of Object.keys(r!.inputs)) assert.ok(itemById(input), `${s.id}: ${input}`);
  }
});

test('Gema de Combate reforça só a magia dela', () => {
  const xp = 10_000_000;
  const plain = playerStats('warrior', xp, equipmentBonus({}), null, ['brutal_strike', 'war_cry', 'iron_skin']);
  const gem = playerStats('warrior', xp, equipmentBonus({ gem: spellGemId('brutal_strike') }), null, ['brutal_strike', 'war_cry', 'iron_skin']);
  const a = plain.spells!.find((s) => s.id === 'brutal_strike')!;
  const b = gem.spells!.find((s) => s.id === 'brutal_strike')!;
  assert.ok(b.effect.kind === 'strike' && a.effect.kind === 'strike' && b.effect.mult > a.effect.mult * 1.2);
  assert.equal(b.cooldownMs, a.cooldownMs, 'a recarga não muda (zera a cada onda)');
  assert.ok(b.cost < a.cost, 'gasta menos mana');
  assert.deepEqual(gem.spells!.find((s) => s.id === 'war_cry'), plain.spells!.find((s) => s.id === 'war_cry'));
  const shield = playerStats('warrior', xp, equipmentBonus({ gem: spellGemId('iron_skin') }), null, ['iron_skin']).spells![0];
  assert.ok(shield.effect.kind === 'shield' && shield.effect.reduce === 0.45 && shield.effect.durationMs === 9000);
});

test('Gema de Combate: só equipa a da sua vocação', () => {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Gemista', 'warrior').id;
  db.applyGains(id, { actions: 0, items: { [spellGemId('brutal_strike')]: 1, [spellGemId('fireball')]: 1 }, xp: {} }, 0, 0);
  assert.ok(game.equip(id, spellGemId('fireball'), Date.now()));
  assert.equal(game.equip(id, spellGemId('brutal_strike'), Date.now()), null);
  assert.equal(db.equipmentFor(id).gem, spellGemId('brutal_strike'));
});

test('Gema de Combate: refino e raridade sobem o reforço', () => {
  const xp = 10_000_000;
  const strike = (gem: string) => playerStats('warrior', xp, equipmentBonus({ gem }), null, ['brutal_strike']).spells![0];
  const g0 = strike(spellGemId('brutal_strike'));
  const g10 = strike(`${spellGemId('brutal_strike')}#10`);
  const anc = strike(`${spellGemId('brutal_strike')}+7#10`);
  const mult = (s: typeof g0) => (s.effect.kind === 'strike' ? s.effect.mult : 0);
  assert.ok(mult(g10) > mult(g0) && mult(anc) > mult(g10));
  assert.ok(g10.cost < g0.cost && anc.cost <= g10.cost);
});

test('Gemas de Combate em 3 tiers: tier 1 é a de antes (Joalheria 20), tier 2 (50) e 3 (80) pedem a de baixo e reforçam mais', async () => {
  const { SPELL_GEM_TIERS, spellGemTierId } = await import('@grimhold/shared');
  assert.deepEqual(SPELL_GEM_TIERS.map((t) => t.level), [20, 50, 80]);
  for (const s of SPELLS.filter((x) => !x.promotion)) {
    for (const t of SPELL_GEM_TIERS) {
      const id = spellGemTierId(s.id, t.tier);
      assert.ok(itemById(id), id);
      const r = RECIPES.jewelcrafting.find((x) => x.output === id)!;
      assert.equal(r.level, t.level, id);
      if (t.tier > 1) assert.equal(r.inputs[spellGemTierId(s.id, t.tier - 1)], 1, `${id} pede a do tier de baixo`);
      for (const input of Object.keys(r.inputs)) assert.ok(itemById(input), `${id}: ${input}`);
    }
  }
  assert.equal(spellGemTierId('brutal_strike', 1), spellGemId('brutal_strike'), 'o tier 1 é a gema que os jogadores já têm');
  const xp = 10_000_000;
  const mult = (gem: string) => { const s = playerStats('warrior', xp, equipmentBonus({ gem }), null, ['brutal_strike']).spells![0]; return s.effect.kind === 'strike' ? s.effect.mult : 0; };
  const [m1, m2, m3] = [1, 2, 3].map((t) => mult(spellGemTierId('brutal_strike', t)));
  assert.ok(m1 < m2 && m2 < m3, `${m1} ${m2} ${m3}`);
  assert.ok(mult(`${spellGemTierId('brutal_strike', 3)}#10`) > m3, 'o refino sobe também o tier 3');
});
