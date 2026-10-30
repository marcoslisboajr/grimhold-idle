import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_TOKEN_SHOP_ITEMS, HUNTING_TASKS, ITEMS, MONSTERS, ALL_RAID_SET_ITEMS, RAID_SET_ITEMS, SOUL_RAID_SET_ITEMS, BLOOD_RAID_SET_ITEMS, bossTokenPrice, gearScore, guideKinds, itemById } from '@grimhold/shared';
import { RECIPES } from '@grimhold/shared';

// Pedido de 16/10: os itens de chefe do nível 40 valem mais que qualquer peça comum (não de chefe) do 40 ao 100.
test('itens de chefe do 40 ganham de qualquer peça comum do mesmo espaço do 40 ao 100', () => {
  const boss = ITEMS.filter((i) => i.equip && guideKinds(i.id).has('boss') && i.equip.level >= 40 && i.equip.level <= 45);
  assert.ok(boss.length >= 20);
  for (const b of boss) {
    for (const r of ITEMS) {
      if (!r.equip || r.legendary || guideKinds(r.id).has('boss') || r.equip.slot !== b.equip!.slot || r.equip.level < 40 || r.equip.level > 100) continue;
      if (b.equip!.vocations && r.equip.vocations && !r.equip.vocations.some((v) => b.equip!.vocations!.includes(v))) continue;
      assert.ok(gearScore(b) > gearScore(r), `${b.id} (${gearScore(b)}) perde para ${r.id} (${gearScore(r)})`);
    }
  }
});

test('tarefas de caça das caçadas do 205 ao 245', () => {
  for (const id of ['falcon_squire', 'falcon_knight', 'falcon_paladin', 'fallen_lion_knight']) {
    assert.ok(MONSTERS.some((m) => m.id === id), id);
    assert.ok(HUNTING_TASKS.some((t) => t.monsterId === id && t.minLevel >= 205), `tarefa de ${id}`);
  }
});

test('itens de chefe do 40 ao 110: nenhum perde para um de chefe de nível menor no mesmo espaço', () => {
  const boss = ITEMS.filter((i) => i.equip && guideKinds(i.id).has('boss') && i.equip.level >= 40 && i.equip.level <= 110);
  for (const b of boss) for (const r of boss) {
    if (r.equip!.slot !== b.equip!.slot || r.equip!.level >= b.equip!.level) continue;
    if (b.equip!.vocations && r.equip!.vocations && !r.equip!.vocations.some((v) => b.equip!.vocations!.includes(v))) continue;
    assert.ok(gearScore(b) >= gearScore(r), `${b.id} (${b.equip!.level}) perde para ${r.id} (${r.equip!.level})`);
  }
});

test('itens de chefe acima do 110: nenhum perde para um de chefe de nível menor (peça sem classe só contra sem classe)', () => {
  const boss = ITEMS.filter((i) => i.equip && guideKinds(i.id).has('boss') && !i.id.startsWith('replica_') && i.equip.level >= 40);
  for (const b of boss.filter((i) => i.equip!.level > 110)) for (const r of boss) {
    if (r.equip!.slot !== b.equip!.slot || r.equip!.level >= b.equip!.level) continue;
    const bv = b.equip!.vocations;
    const rv = r.equip!.vocations;
    if (!bv ? !!rv : !!rv && !rv.some((v) => bv.includes(v))) continue;
    assert.ok(gearScore(b) >= gearScore(r), `${b.id} (${b.equip!.level}) perde para ${r.id} (${r.equip!.level})`);
  }
});

test('réplicas dos deuses (250 fichas) ganham das peças de 50 fichas do mesmo espaço', () => {
  const shop = BOSS_TOKEN_SHOP_ITEMS.map((id) => itemById(id)!).filter((i) => i.equip);
  for (const rep of shop.filter((i) => i.id.startsWith('replica_'))) for (const cheap of shop.filter((i) => bossTokenPrice(i.id) === 50)) {
    if (cheap.equip!.slot !== rep.equip!.slot) continue;
    assert.ok(gearScore(rep) > gearScore(cheap), `${rep.id} perde para ${cheap.id}`);
  }
});

test('item de chefe não perde para peça comum de até 20 níveis abaixo (mesmo espaço e classe; craft do 150+ é exceção)', () => {
  const eq = ITEMS.filter((i) => i.equip && !i.id.startsWith('replica_'));
  const bossIds = new Set(eq.filter((i) => guideKinds(i.id).has('boss')).map((i) => i.id));
  const isBoss = (id: string) => bossIds.has(id);
  // Desde 18/10 a arma e a armadura de craft do 150+ ganham de tudo do nível delas (craft_power.test.ts).
  const crafted = new Set(Object.values(RECIPES).flatMap((l) => (l as { output: string }[]).map((r) => r.output)));
  for (const b of eq.filter((i) => isBoss(i.id))) for (const r of eq) {
    if (crafted.has(r.id) && r.equip!.level >= 150) continue;
    if (isBoss(r.id) || (ALL_RAID_SET_ITEMS as readonly string[]).includes(r.id) || (RAID_SET_ITEMS as readonly string[]).includes(r.id) || (SOUL_RAID_SET_ITEMS as readonly string[]).includes(r.id) || (BLOOD_RAID_SET_ITEMS as readonly string[]).includes(r.id) || r.equip!.slot !== b.equip!.slot || r.equip!.level > b.equip!.level || r.equip!.level < b.equip!.level - 20) continue;
    const bv = b.equip!.vocations;
    const rv = r.equip!.vocations;
    if (!bv ? !!rv : !!rv && !rv.some((v) => bv.includes(v))) continue;
    assert.ok(gearScore(b) >= gearScore(r), `${b.id} (${b.equip!.level}) perde para ${r.id} (${r.equip!.level})`);
  }
});

test('armas das bolsas dos chefes globais contam como de chefe e ganham das comuns do nível delas ao 100', () => {
  const pouchWeapons = ITEMS.filter((i) => i.pouch).flatMap((p) => p.pool ?? []).map((id) => itemById(id)!).filter((i) => i?.equip && i.equip.level >= 40);
  assert.ok(pouchWeapons.length >= 32);
  for (const w of pouchWeapons) {
    assert.ok(guideKinds(w.id).has('boss'), `${w.id} é de chefe`);
    const voc = w.equip!.vocations;
    for (const r of ITEMS) {
      if (!r.equip || r.equip.slot !== 'weapon' || r.legendary || guideKinds(r.id).has('boss') || r.equip.level < w.equip!.level || r.equip.level > 100) continue;
      if (voc && r.equip.vocations && !r.equip.vocations.some((v) => voc.includes(v))) continue;
      assert.ok(gearScore(w) >= gearScore(r), `${w.id} perde para ${r.id}`);
    }
  }
});

test('instância pede o nível dela menos 20 (ninguém é carregado); caçada comum e covil não travam', async () => {
  const { openDb } = await import('../src/db.ts');
  const { createGame } = await import('../src/game.ts');
  const { XP_TABLE, bossMinLevel, HUNTS } = await import('@grimhold/shared');
  const db = openDb(':memory:');
  const game = createGame(db);
  const inst = HUNTS.find((h) => h.id === 'void_citadel')!;
  assert.equal(bossMinLevel(inst), 190);
  const low = db.createCharacter(db.accountForToken(db.createGuest())!, 'Baixinho', 'hunter').id;
  db.applyGains(low, { actions: 0, items: {}, xp: { combat: XP_TABLE[153] } }, 0, 0);
  assert.match(game.start(low, 'combat', inst.id, Date.now()) ?? '', /nível 190/);
  assert.equal(bossMinLevel(HUNTS.find((h) => !h.boss && !h.lair && h.level >= 200)!), 0);
  assert.equal(bossMinLevel(HUNTS.find((h) => h.id === 'falcon_nest')!), 0);
});
