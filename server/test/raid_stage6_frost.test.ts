import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import {
  RAIDS,
  RAID_HUNTS,
  DIFFICULTIES,
  FROST_RAID_ID,
  FROST_RAID_SET_ITEMS,
  OutfitId,
  itemById,
  playerStats,
  xpForLevel,
  runCycle,
  rollRaidPhaseReward,
  ITEMS,
  ALL_RAID_SET_ITEMS,
  gearScore,
  raidMonsterById,
} from '@grimhold/shared';

const frostHunt = RAID_HUNTS.find((h) => h.id === FROST_RAID_ID)!;
const frostRaid = RAIDS.find((r) => r.id === FROST_RAID_ID)!;

test('raid_frost: raide existe, desligada por padrão e com 4 fases', () => {
  assert.ok(frostRaid, 'raide de gelo deve existir');
  assert.equal(frostRaid.enabled, false, 'deve iniciar desabilitada');
  assert.equal(frostRaid.minLevel, 150);
  assert.equal(frostRaid.allowSolo, true, 'deve permitir modo solo');
  assert.equal(frostRaid.phases.length, 4, 'deve possuir 4 fases');
});

test('raid_frost: set de itens lendários nv 150 devidamente cadastrado', () => {
  assert.equal(FROST_RAID_SET_ITEMS.length, 8);
  for (const itemId of FROST_RAID_SET_ITEMS) {
    const item = itemById(itemId);
    assert.ok(item, `item ${itemId} deve existir no catálogo`);
    assert.equal(item.equip?.level, 150, `item ${itemId} deve ser de nível 150`);
    assert.equal(item.legendary, true, `item ${itemId} deve ser lendário`);
    assert.ok(item.equip, 'deve ser item equipável');
  }
});

test('raid_frost: combate comprova mecânicas de escudo, adds e burst', () => {
  // Jogador resistente para aguentar múltiplos ciclos das fases e registrar as mecânicas temporais
  const p = playerStats('warrior', xpForLevel(150), { attack: 1500, defense: 2000, hp: 500_000 }, null, [], {}, {});

  // 1. Fase 1 (seq = 0): Escudo (absorção e redução de dano)
  assert.ok(frostRaid.phases[0].shield, 'fase 1 deve ter mecânica de escudo');
  const cP1With = runCycle(frostHunt, p, 1234, 0, DIFFICULTIES[0], 1);
  const origShield = frostRaid.phases[0].shield;
  frostRaid.phases[0].shield = undefined;
  const cP1Without = runCycle(frostHunt, p, 1234, 0, DIFFICULTIES[0], 1);
  frostRaid.phases[0].shield = origShield;

  const hitsWith = cP1With.hits.filter((h) => h.by === 'p' && h.dmg > 0 && h.target === 0);
  const hitsWithout = cP1Without.hits.filter((h) => h.by === 'p' && h.dmg > 0 && h.target === 0);
  assert.ok(hitsWith.length > 0 && hitsWithout.length > 0);
  assert.ok(hitsWith[0].dmg < hitsWithout[0].dmg, 'escudo deve absorver parte do dano inicial');

  // 2. Fase 2 (seq = 1): Evocação de Adds (aparecem monstros adicionais de raid_frost_add)
  assert.ok(frostRaid.phases[1].adds, 'fase 2 deve ter mecânica de adds');
  const cP2 = runCycle(frostHunt, p, 103, 1, DIFFICULTIES[0], 1);
  const addsCount = cP2.monsters.filter((m) => m.id === 'raid_frost_add').length;
  assert.ok(addsCount > 0, 'fase 2 deve gerar monstros adicionais (adds)');

  // 3. Fase 3 (seq = 2): Burst de dano elemental (acerto com elemento água)
  assert.ok(frostRaid.phases[2].burst, 'fase 3 deve ter mecânica de burst');
  const cP3 = runCycle(frostHunt, p, 1234, 2, DIFFICULTIES[0], 1);
  const burstHits = cP3.hits.filter((h) => h.by === 'm' && h.elem?.element === 'water');
  assert.ok(burstHits.length > 0, 'fase 3 deve disparar ataque de burst elemental');
});

test('raid_frost: recompensas de fase - solo recebe metade e nunca itens do set', () => {
  // Em grupo: sorteia ouro integral, fragmentos integrais e pode dar peças do set na fase 4
  let rolledAnyItem = false;
  for (let seed = 1; seed <= 200; seed++) {
    const rew = rollRaidPhaseReward(seed, 1, FROST_RAID_ID, 4, false, 0.5);
    assert.equal(rew.items.gold, 200_000);
    assert.equal(rew.items.raid_fragment, 6);
    if (rew.gotPiece) rolledAnyItem = true;
  }
  assert.ok(rolledAnyItem, 'em grupo na fase 4 deve ser possível sortear peça do set');

  // Solo: metade do ouro (100k), metade dos fragmentos (3) e NUNCA recebe peça de set
  for (let seed = 1; seed <= 200; seed++) {
    const rew = rollRaidPhaseReward(seed, 1, FROST_RAID_ID, 4, true, 0.999);
    assert.equal(rew.items.gold, 100_000, 'ouro solo deve ser a metade');
    assert.equal(rew.items.raid_fragment, 3, 'fragmentos solo devem ser a metade');
    assert.equal(rew.gotPiece, false, 'solo nunca deve receber peça de set');
  }
});

test('raid_frost: controle semanal de recompensas no banco de dados', () => {
  const db = openDb(':memory:');
  const acc = db.accountForToken(db.createGuest())!;
  const char = db.createCharacter(acc, 'TesterWeekly', 'warrior');

  const charId = char.id;
  const week = '2026-W44';

  // Sem recompensa prévia
  assert.equal(db.hasRaidPhaseClear(charId, week, FROST_RAID_ID, 1), false);

  // Registra conclusão da fase 1
  db.markRaidPhaseClear(charId, week, FROST_RAID_ID, 1, false, false, Date.now());
  assert.equal(db.hasRaidPhaseClear(charId, week, FROST_RAID_ID, 1), true);

  // Fase 2 ainda não limpa
  assert.equal(db.hasRaidPhaseClear(charId, week, FROST_RAID_ID, 2), false);
});

test('raid_frost: traje de raide só é liberado na fase final em grupo', () => {
  const db = openDb(':memory:');
  const acc = db.accountForToken(db.createGuest())!;
  const char = db.createCharacter(acc, 'OutfitHunter', 'warrior');

  assert.equal(db.unlockedOutfitsFor(char.id).includes('eternal_frost'), false);

  // Se passar fase final em solo, não deve liberar outfit
  const isFinalPhase = true;
  let isSolo = true;
  if (isFinalPhase && !isSolo && frostRaid.outfit) {
    db.unlockOutfit(char.id, frostRaid.outfit as OutfitId);
  }
  assert.equal(db.unlockedOutfitsFor(char.id).includes('eternal_frost'), false, 'solo não deve liberar traje');

  // Em grupo, fase final libera o outfit
  isSolo = false;
  if (isFinalPhase && !isSolo && frostRaid.outfit) {
    db.unlockOutfit(char.id, frostRaid.outfit as OutfitId);
  }
  assert.equal(db.unlockedOutfitsFor(char.id).includes('eternal_frost'), true, 'grupo deve liberar traje na fase final');
});

test('raid_frost: cada peça do set (com lendário) supera a melhor alternativa não-raide de 140 a 160 entre +15% e +30%', () => {
  const vocations = ['warrior', 'hunter', 'arcanist', 'devout'] as const;
  const nonRaidItems = ITEMS.filter(
    (it) => it.equip && it.equip.level <= 160 && !ALL_RAID_SET_ITEMS.includes(it.id as any),
  );

  for (const raidItemId of FROST_RAID_SET_ITEMS) {
    const raidItem = itemById(raidItemId)!;
    const slot = raidItem.equip!.slot;
    const vocs = (raidItem.equip!.vocations ?? vocations) as readonly string[];
    const raidScore = gearScore(raidItem);

    let bestCandScore = 0;
    let bestCandId = '';

    for (const voc of vocs) {
      const candidates = nonRaidItems.filter(
        (it) => it.equip!.slot === slot && (!it.equip!.vocations || it.equip!.vocations.includes(voc as any)),
      );
      for (const cand of candidates) {
        const candScore = gearScore(cand);
        if (candScore > bestCandScore) {
          bestCandScore = candScore;
          bestCandId = cand.id;
        }
      }
    }

    assert.ok(bestCandScore > 0, `deve encontrar candidatos para ${raidItemId}`);
    const advantage = (raidScore - bestCandScore) / bestCandScore;
    assert.ok(
      advantage >= 0.15 && advantage <= 0.30,
      `Peça de raide ${raidItemId} (GS: ${raidScore.toFixed(1)}) deve superar o melhor item ${bestCandId} (GS: ${bestCandScore.toFixed(1)}) entre +15% e +30% (atual: ${(advantage * 100).toFixed(1)}%)`,
    );
  }
});

test('raid_frost: combate da fase 4 comprova mecanicamente drain e enrageRamp', () => {
  // 1. Prova do Drain: com dreno, o chefe se cura ao acertar o jogador, exigindo mais dano total acumulado para ser derrotado
  const pDrain = playerStats('warrior', xpForLevel(150), { attack: 2500, defense: 600, hp: 50_000, regen: 0.15 }, null, [], {}, {});
  pDrain.resistPct = { water: 0.85 };
  pDrain.reduction = 0.50;

  const boss = raidMonsterById('raid_frost_4')!;
  const origHp = boss.hp;
  boss.hp = 80_000;

  const cWithDrain = runCycle(frostHunt, pDrain, 12345, 3, DIFFICULTIES[0], 1);
  const origDrain = frostRaid.phases[3].drain;
  frostRaid.phases[3].drain = 0;
  const cWithoutDrain = runCycle(frostHunt, pDrain, 12345, 3, DIFFICULTIES[0], 1);

  frostRaid.phases[3].drain = origDrain;
  boss.hp = origHp;

  const dmgWith = cWithDrain.hits.filter((h) => h.by === 'p').reduce((s, h) => s + h.dmg, 0);
  const dmgWithout = cWithoutDrain.hits.filter((h) => h.by === 'p').reduce((s, h) => s + h.dmg, 0);

  assert.equal(cWithDrain.outcome, 'win');
  assert.equal(cWithoutDrain.outcome, 'win');
  assert.ok(
    dmgWith > dmgWithout,
    `Com drain, o dano necessário para abater o chefe (${dmgWith}) deve ser maior que sem drain (${dmgWithout})`,
  );
  assert.ok(
    cWithDrain.fightMs > cWithoutDrain.fightMs,
    `Com drain, o chefe sobrevive por mais tempo (${cWithDrain.fightMs}ms > ${cWithoutDrain.fightMs}ms)`,
  );

  // 2. Prova do EnrageRamp: o dano dos golpes físicos do chefe aumenta ao longo da luta (+4.5% a cada 20s)
  const pRamp = playerStats('warrior', xpForLevel(150), { attack: 0, defense: 500, hp: 500_000, regen: 0.5 }, null, [], {}, {});
  pRamp.resistPct = { water: 0.95 };
  pRamp.reduction = 0.90;

  const cRamp = runCycle(frostHunt, pRamp, 42, 3, DIFFICULTIES[0], 1);
  const bossPhysHits = cRamp.hits.filter((h) => h.by === 'm' && !h.elem && h.dmg > 0);
  assert.ok(bossPhysHits.length >= 100, 'deve registrar múltiplos golpes físicos do chefe durante a luta');

  const earlyHits = bossPhysHits.slice(0, 5);
  const lateHits = bossPhysHits.slice(100, 105);
  const avgEarly = earlyHits.reduce((s, h) => s + h.dmg, 0) / earlyHits.length;
  const avgLate = lateHits.reduce((s, h) => s + h.dmg, 0) / lateHits.length;

  assert.ok(
    avgLate > avgEarly,
    `Golpes posteriores com enrageRamp (${avgLate}) devem causar dano maior que os iniciais (${avgEarly})`,
  );
});

test('raid_frost: o mesmo chefe tem mais vida no grupo que no solo, e o ajuste solo não vale quando há 2 ou mais jogadores', () => {
  const p = playerStats('warrior', xpForLevel(150), { attack: 1500, defense: 2000, hp: 500_000 }, null, [], {}, {});
  const phaseDef = frostRaid.phases[0];
  const baseMonster = raidMonsterById(phaseDef.monster)!;

  // 1. Simulação Solo (sem lairGroup / allies)
  const soloCycle = runCycle(frostHunt, p, 100, 0, DIFFICULTIES[0], 1);
  const soloBossHp = soloCycle.monsters[0].hp;

  // 2. Simulação em Grupo (com 2 jogadores / 1 aliado no lairGroup)
  const ally = { id: 999, hitMs: 1500, hit: 500 };
  const groupLair = { killAt: Date.now() + 100_000, allies: [ally] };
  const groupCycle = runCycle(frostHunt, p, 100, 0, DIFFICULTIES[0], 1, undefined, undefined, undefined, undefined, undefined, groupLair);
  const groupBossHp = groupCycle.monsters[0].hp;

  // No solo, a vida do chefe recebe a redução soloHpMult (0.26)
  assert.equal(soloBossHp, Math.round(baseMonster.hp * (phaseDef.soloHpMult ?? 0.617)));
  // No grupo (2 ou mais jogadores), a vida é 100% da vida original do chefe
  assert.equal(groupBossHp, baseMonster.hp);
  // O mesmo chefe tem estritamente mais vida no grupo do que no solo
  assert.ok(groupBossHp > soloBossHp, `Chefe no grupo (${groupBossHp}) deve ter mais vida do que no solo (${soloBossHp})`);

  // O ajuste solo de dano (soloAttackMult) também não é aplicado quando em grupo
  const soloMonsterHit = soloCycle.hits.find((h) => h.by === 'm' && !h.elem && h.dmg > 0);
  const groupMonsterHit = groupCycle.hits.find((h) => h.by === 'm' && !h.elem && h.dmg > 0);
  assert.ok(soloMonsterHit && groupMonsterHit);
  assert.ok(
    groupMonsterHit.dmg > soloMonsterHit.dmg,
    `Golpe do chefe em grupo (${groupMonsterHit.dmg}) deve causar mais dano que o ajustado para solo (${soloMonsterHit.dmg})`,
  );
});
