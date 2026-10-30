import test, { mock } from 'node:test';
mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 9, 27, 15) });
import assert from 'node:assert/strict';
import {
  RAID_HUNTS,
  RAID_MONSTERS,
  DIFFICULTIES,
  playerStats,
  xpForLevel,
  runCycle,
  simulateHunt,
  huntNode,
  raidById,
  weekOf,
  itemById,
  BLOOD_RAID_ID,
  BLOOD_RAID_SET_ITEMS,
  RAID_ITEMS,
  rollRaidPhaseReward,
  formatRaidPhaseMechanics,
  formatRaidPhaseTitle,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { PartyManager } from '../src/party.ts';

const bloodHunt = RAID_HUNTS.find((h) => h.id === BLOOD_RAID_ID)!;
const bloodRaid = raidById(BLOOD_RAID_ID)!;

test('etapa 5: Sangue Apodrecido passa as 5 fases na ordem', () => {
  assert.ok(bloodRaid, 'Raide de Sangue deve existir');
  assert.equal(bloodRaid.phases.length, 5);
  assert.equal(bloodRaid.minLevel, 550);
  assert.equal(bloodRaid.allowSolo, false);

  const r = simulateHunt(
    { skill: 'combat', node: huntNode(BLOOD_RAID_ID, 'normal', 1), since: 0, seed: 42, seq: 0 },
    3_600_000,
    {
      vocation: 'warrior',
      combatXp: xpForLevel(560),
      bank: {},
      bonus: { attack: 20_000_000, defense: 15_000, hp: 5_000_000 },
    },
  );

  assert.deepEqual(r.gains.raidPhases, [1, 2, 3, 4, 5]);
  assert.equal(r.gains.cleared, BLOOD_RAID_ID);
  assert.equal(r.ended, true);
});

test('etapa 5: cada mecânica dispara e é comprovada pelos ciclos de combate', () => {
  // 1. Dreno forte (Fase 1 - Morvek): o chefe se cura em 40% do dano que causa
  {
    const p = playerStats('warrior', xpForLevel(550), { attack: 150_000, defense: 1000, hp: 60_000_000 });
    p.resistPct = { death: 0.90 };
    const seed = 501;
    const cWithDrain = runCycle(bloodHunt, p, seed, 0, DIFFICULTIES[0], 1);

    const origDrain = bloodRaid.phases[0].drain;
    bloodRaid.phases[0].drain = undefined;
    const cNoDrain = runCycle(bloodHunt, p, seed, 0, DIFFICULTIES[0], 1);
    bloodRaid.phases[0].drain = origDrain;

    // A luta com dreno dura mais porque o chefe regenera vida continuamente
    assert.ok(cWithDrain.fightMs > cNoDrain.fightMs, `Luta com drain (${cWithDrain.fightMs}ms) deve durar mais que sem drain (${cNoDrain.fightMs}ms)`);
    const totalDmgWith = cWithDrain.hits.filter((h) => h.by === 'p' && h.target === 0).reduce((s, h) => s + h.dmg, 0);
    const totalDmgNo = cNoDrain.hits.filter((h) => h.by === 'p' && h.target === 0).reduce((s, h) => s + h.dmg, 0);
    assert.ok(totalDmgWith > totalDmgNo, `Jogador precisa infligir mais dano (${totalDmgWith} > ${totalDmgNo}) para compensar a cura do dreno`);
  }

  // 2. Escudo (Fase 2 - Drusca): -50% de dano até quebrar 15% de vida
  {
    const p = playerStats('warrior', xpForLevel(550), { attack: 1_500_000, defense: 3500, hp: 100_000 });
    const seed = 502;
    const cWithShield = runCycle(bloodHunt, p, seed, 1, DIFFICULTIES[0], 1);

    const origShield = bloodRaid.phases[1].shield;
    bloodRaid.phases[1].shield = undefined;
    const cNoShield = runCycle(bloodHunt, p, seed, 1, DIFFICULTIES[0], 1);
    bloodRaid.phases[1].shield = origShield;

    const hitsWith = cWithShield.hits.filter((h) => h.by === 'p' && h.dmg > 0 && h.target === 0);
    const hitsNo = cNoShield.hits.filter((h) => h.by === 'p' && h.dmg > 0 && h.target === 0);

    const totalShieldPool = cWithShield.monsters[0].hp * 0.15;
    let absorbedDmg = 0;
    let shieldDepletedHitIndex = -1;

    for (let i = 0; i < Math.min(hitsWith.length, hitsNo.length); i++) {
      const hWith = hitsWith[i];
      const hNo = hitsNo[i];
      if (absorbedDmg < totalShieldPool) {
        // Enquanto o escudo estiver ativo: dano é 50% do normal
        assert.equal(hWith.dmg, Math.max(1, Math.round(hNo.dmg * 0.50)), `Golpe ${i} deve ser 50% do normal`);
        absorbedDmg += hWith.dmg;
        if (absorbedDmg >= totalShieldPool) shieldDepletedHitIndex = i;
      } else {
        // Após o escudo: 100% igual ao normal
        assert.equal(hWith.dmg, hNo.dmg, `Golpe ${i} pós-escudo deve ser igual ao sem escudo`);
      }
    }
    assert.ok(shieldDepletedHitIndex > 0, 'O escudo deve ter sido esgotado durante a luta');
  }

  // 3. Adds em ondas grandes (Fase 3 - Velgra): 4 adds a cada 25s, até 5 ondas (20 no total)
  {
    const p = playerStats('devout', xpForLevel(550), { attack: 1000, defense: 3000, hp: 800_000 }, null, [], {}, {});
    const c = runCycle(bloodHunt, p, 503, 2, DIFFICULTIES[0], 1);
    const leeches = c.monsters.filter((m) => m.id === 'raid_blood_leech');
    assert.ok(leeches.length <= 20, 'No máximo 20 sanguessugas invocadas (5 ondas x 4)');
    assert.ok(leeches.length >= 4, 'Ao menos 1 onda de 4 sanguessugas invocadas');
  }

  // 4. Burst de morte a cada 25s (Fase 4 - Ostrel): 60% da vida, mitigado por resistência a morte
  {
    const pNoRes = playerStats('warrior', xpForLevel(550), { attack: 1000, defense: 2500, hp: 100_000 }, null, [], {}, {});
    const pRes = playerStats('warrior', xpForLevel(550), { attack: 1000, defense: 2500, hp: 100_000 }, null, [], {}, {});
    pRes.resistPct = { death: 0.85 };

    const cNoRes = runCycle(bloodHunt, pNoRes, 504, 3, DIFFICULTIES[0], 1);
    const cRes = runCycle(bloodHunt, pRes, 504, 3, DIFFICULTIES[0], 1);

    const bNoRes = cNoRes.hits.find((h) => h.elem?.element === 'death' && h.crit)!;
    const bRes = cRes.hits.find((h) => h.elem?.element === 'death' && h.crit)!;
    assert.ok(bNoRes && bRes, 'Golpe burst deve ocorrer em ambos');
    assert.ok(bRes.dmg < bNoRes.dmg * 0.25, `Burst mitigado por 85% de resistência (${bRes.dmg} < ${bNoRes.dmg * 0.25})`);
  }

  // 5. Sangrath (Fase 5): rampa + dreno + escudo + adds + burst combinados
  {
    const p = playerStats('warrior', xpForLevel(550), { attack: 120_000, defense: 6000, hp: 70_000_000 });
    p.resistPct = { death: 0.90 };
    const c5 = runCycle(bloodHunt, p, 505, 4, DIFFICULTIES[0], 1);

    // Adds na fase final
    const leeches = c5.monsters.filter((m) => m.id === 'raid_blood_leech');
    assert.ok(leeches.length >= 2, 'Pelo menos uma onda de adds na fase final');

    // Burst na fase final
    const bursts = c5.hits.filter((h) => h.by === 'm' && h.elem?.element === 'death' && h.crit);
    assert.ok(bursts.length >= 1, 'Burst de morte disparou na fase final');

    // Escudo: dano inicial mitigado
    const origP5 = { ...bloodRaid.phases[4] };
    bloodRaid.phases[4] = { ...origP5, shield: undefined, drain: undefined };
    const c5Clean = runCycle(bloodHunt, p, 505, 4, DIFFICULTIES[0], 1);
    bloodRaid.phases[4] = origP5;

    const firstHitWith = c5.hits.find((h) => h.by === 'p' && h.target === 0 && h.dmg > 0)!;
    const firstHitClean = c5Clean.hits.find((h) => h.by === 'p' && h.target === 0 && h.dmg > 0)!;
    assert.equal(firstHitWith.dmg, Math.round(firstHitClean.dmg * 0.60), 'Dano inicial no Sangrath reduzido pelo escudo em 40% (1 - 0.40 = 0.60)');
  }

  // 6. Pulso em TODAS as 5 fases: a cada 12s, dano direto em todos reduzido por resistência elemental
  for (let phaseIdx = 0; phaseIdx < 5; phaseIdx++) {
    const phaseDef = bloodRaid.phases[phaseIdx];
    assert.ok(phaseDef.pulse, `Fase ${phaseIdx + 1} deve ter mecânica de pulso`);
    assert.equal(phaseDef.pulse.everyMs, 12_000);

    const elem = phaseDef.pulse.element;
    const pNoRes = playerStats('warrior', xpForLevel(550), { attack: 100, defense: 5000, hp: 100_000 });
    const pRes = playerStats('warrior', xpForLevel(550), { attack: 100, defense: 5000, hp: 100_000 });
    pRes.resistPct = { [elem]: 0.75 };

    const cNoRes = runCycle(bloodHunt, pNoRes, 600 + phaseIdx, phaseIdx, DIFFICULTIES[0], 1);
    const cRes = runCycle(bloodHunt, pRes, 600 + phaseIdx, phaseIdx, DIFFICULTIES[0], 1);

    const pulseHitsNoRes = cNoRes.hits.filter((h) => h.by === 'm' && h.elem?.element === elem && !h.crit);
    const pulseHitsRes = cRes.hits.filter((h) => h.by === 'm' && h.elem?.element === elem && !h.crit);

    assert.ok(pulseHitsNoRes.length > 0, `Pulso deve ocorrer na fase ${phaseIdx + 1}`);
    assert.ok(
      pulseHitsRes[0].dmg < pulseHitsNoRes[0].dmg * 0.35,
      `Resistência a ${elem} deve reduzir substancialmente o pulso na fase ${phaseIdx + 1}`,
    );
  }
});

test('etapa 5: recompensa 1 vez por semana por fase e por raide', () => {
  const db = openDb(':memory:');
  const now = Date.now();
  const week = weekOf(now);
  const acc = db.accountForToken(db.createGuest())!;
  const c = db.createCharacter(acc, 'BloodHero', 'warrior');

  // Fase 1 limpa da Raide IV
  assert.equal(db.hasRaidPhaseClear(c.id, week, BLOOD_RAID_ID, 1), false);
  const r1 = rollRaidPhaseReward(1234, c.id, BLOOD_RAID_ID, 1, false, 0);
  assert.equal(r1.items.gold, 400_000);
  assert.equal(r1.items.raid_fragment, 6);
  db.markRaidPhaseClear(c.id, week, BLOOD_RAID_ID, 1, false, false, now);

  assert.equal(db.hasRaidPhaseClear(c.id, week, BLOOD_RAID_ID, 1), true);

  // Raide III e Raide II continuam com suas fases 1 livres (isolamento estrito)
  assert.equal(db.hasRaidPhaseClear(c.id, week, 'raid_souls', 1), false);
  assert.equal(db.hasRaidPhaseClear(c.id, week, 'raid_usurper', 1), false);
});

test('etapa 5: peça do set e traje liberados apenas na fase 5 via simulateHunt e game.settle', () => {
  const RAID_MONSTERS_SAVED = RAID_MONSTERS.map((m) => ({ id: m.id, hp: m.hp, attack: m.attack }));
  RAID_MONSTERS.forEach((m) => {
    if (m.id.startsWith('raid_blood_')) {
      m.hp = 2000;
      m.attack = 50;
    }
  });

  try {
    const db = openDb(':memory:');
    const game = createGame(db);
    const pm = new PartyManager(db);
    game.setPartyFights((id) => pm.lairMembersFor(id), (id) => pm.partyBuffsFor(id));

    const acc = db.accountForToken(db.createGuest())!;
    const c = db.createCharacter(acc, 'Hero', 'warrior');
    const c2 = db.createCharacter(acc, 'Partner', 'warrior');
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: xpForLevel(560) } }, 0, 0);
    db.applyGains(c2.id, { actions: 0, items: {}, xp: { combat: xpForLevel(560) } }, 0, 0);
    const partyId = db.createParty(c.id);
    db.addPartyMember(partyId, c2.id);

    const t0 = Date.UTC(2026, 9, 21, 12);
    for (const id of [c.id, c2.id]) {
      db.setActivity(id, { skill: 'combat', node: BLOOD_RAID_ID, since: t0, seed: 99, seq: 0 });
    }

    // 1. Simula e liquida até a fase 4 (4 fases * (900s + 30s) = 3_720_000ms)
    game.settle(c.id, t0 + 3_720_000);

    // Prova que as fases 1 a 4 foram concluídas
    const clearsP4 = db.raidClearsFor(c.id, weekOf(t0), BLOOD_RAID_ID);
    assert.deepEqual(clearsP4, [1, 2, 3, 4]);

    // Prova que vencer até a fase 4 NÃO libera o traje 'fallen_blood'
    assert.equal(db.unlockedOutfitsFor(c.id).includes('fallen_blood'), false);

    // 2. Simula e liquida a fase 5 (5ª fase: t0 + 5 * 930s = 4_650_000ms)
    game.settle(c.id, t0 + 4_650_000);

    // Prova que a fase 5 foi concluída
    const clearsP5 = db.raidClearsFor(c.id, weekOf(t0), BLOOD_RAID_ID);
    assert.deepEqual(clearsP5, [1, 2, 3, 4, 5]);

    // Prova que a fase final liberou o traje 'fallen_blood' via game.settle
    assert.equal(db.unlockedOutfitsFor(c.id).includes('fallen_blood'), true);
  } finally {
    // Restaura atributos dos monstros
    RAID_MONSTERS_SAVED.forEach((saved) => {
      const m = RAID_MONSTERS.find((x) => x.id === saved.id);
      if (m) {
        m.hp = saved.hp;
        m.attack = saved.attack;
      }
    });
  }
});

test('etapa 5: modo solo bloqueado com mensagem clara', () => {
  const prev = bloodRaid.enabled;
  bloodRaid.enabled = true;
  try {
    const db = openDb(':memory:');
    const game = createGame(db);
    const now = Date.now();
    const acc = db.accountForToken(db.createGuest())!;
    const c = db.createCharacter(acc, 'SoloSeeker', 'warrior');
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: xpForLevel(560) } }, 0, 0);

    const node = huntNode(BLOOD_RAID_ID, 'normal');
    const err = game.start(c.id, 'combat', node, now);

    assert.ok(err, 'Deve rejeitar iniciar a raide solo');
    assert.equal(err, `${bloodRaid.name} exige um grupo de 2 a 5 jogadores (modo solo indisponível).`);
  } finally {
    bloodRaid.enabled = prev;
  }
});

test('etapa 5: Set Sanguíneo (nível 550) ~8% acima do drop do tier 500', () => {
  assert.equal(BLOOD_RAID_SET_ITEMS.length, 4);

  for (const itemId of BLOOD_RAID_SET_ITEMS) {
    const it = itemById(itemId);
    assert.ok(it, `Item ${itemId} deve existir no catálogo de itens`);
    assert.equal(it.legendary, true, `${itemId} deve ser lendário`);
    assert.equal(it.equip?.level, 550, `${itemId} deve ser de nível 550`);
  }

  // Comparações com peças tier 500 (champion_throne e shattered_souls):
  // 1. Amuleto
  const sangAmulet = itemById('sanguine_amulet')!;
  const champAmulet = itemById('champion_throne_amulet')!;
  assert.ok(sangAmulet.equip!.defense! >= Math.round(champAmulet.equip!.defense! * 1.07));
  assert.ok(sangAmulet.equip!.hp! >= Math.round(champAmulet.equip!.hp! * 1.07));

  // 2. Anel
  const sangRing = itemById('sanguine_ring')!;
  const champRing = itemById('champion_throne_ring')!;
  assert.ok(sangRing.equip!.attack! >= Math.round(champRing.equip!.attack! * 1.07));

  // 3. Botas
  const sangBoots = itemById('sanguine_boots')!;
  const soulBoots = itemById('shattered_souls_boots')!;
  assert.ok(sangBoots.equip!.defense! >= Math.round(soulBoots.equip!.defense! * 1.07));
  assert.ok(sangBoots.equip!.hp! >= Math.round(soulBoots.equip!.hp! * 1.07));

  // 4. Elmo
  const sangHelm = itemById('sanguine_helmet')!;
  const soulHelm = itemById('shattered_souls_helmet')!;
  assert.ok(sangHelm.equip!.defense! >= Math.round(soulHelm.equip!.defense! * 1.07));
  assert.ok(sangHelm.equip!.hp! >= Math.round(soulHelm.equip!.hp! * 1.07));
});
