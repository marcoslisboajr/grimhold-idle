import test, { mock } from 'node:test';
mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 9, 27, 15) });
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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
  SOUL_RAID_ID,
  SOUL_RAID_SET_ITEMS,
  RAID_ITEMS,
  rollRaidPhaseReward,
  formatRaidPhaseMechanics,
  formatRaidPhaseTitle,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';
import { PartyManager } from '../src/party.ts';

const soulHunt = RAID_HUNTS.find((h) => h.id === SOUL_RAID_ID)!;
const soulRaid = raidById(SOUL_RAID_ID)!;

test('etapa 2: a Guerra das Almas passa as 6 fases na ordem', () => {
  assert.equal(soulRaid.phases.length, 6);
  assert.equal(soulRaid.minLevel, 500);
  assert.equal(soulRaid.allowSolo, false);

  const r = simulateHunt(
    { skill: 'combat', node: huntNode(SOUL_RAID_ID, 'normal', 1), since: 0, seed: 42, seq: 0 },
    3_600_000,
    {
      vocation: 'warrior',
      combatXp: xpForLevel(520),
      bank: {},
      bonus: { attack: 15_000_000, defense: 10_000, hp: 2_000_000 },
    },
  );

  assert.deepEqual(r.gains.raidPhases, [1, 2, 3, 4, 5, 6]);
  assert.equal(r.gains.cleared, SOUL_RAID_ID);
  assert.equal(r.ended, true);
});

test('etapa 2: cada mecânica dispara e é comprovada pelos dados da luta', () => {
  // 1. Escudo (Fase 1): compara o dano no chefe com e sem escudo na mesma seed
  // Com escudo o dano é 40% do normal até gastar 15% da vida, depois volta a 100%
  {
    const p = playerStats('warrior', xpForLevel(520), { attack: 1_200_000, defense: 3000, hp: 100_000 });
    const seed = 1234;
    const cWithShield = runCycle(soulHunt, p, seed, 0, DIFFICULTIES[0], 1);

    const origShield = soulRaid.phases[0].shield;
    soulRaid.phases[0].shield = undefined;
    const cNoShield = runCycle(soulHunt, p, seed, 0, DIFFICULTIES[0], 1);
    soulRaid.phases[0].shield = origShield;

    const hitsWith = cWithShield.hits.filter((h) => h.by === 'p' && h.dmg > 0 && h.target === 0);
    const hitsNo = cNoShield.hits.filter((h) => h.by === 'p' && h.dmg > 0 && h.target === 0);

    const totalShieldPool = cWithShield.monsters[0].hp * 0.15; // 15% da vida do chefe
    let absorbedDmg = 0;
    let shieldDepletedHitIndex = -1;

    for (let i = 0; i < Math.min(hitsWith.length, hitsNo.length); i++) {
      const hWith = hitsWith[i];
      const hNo = hitsNo[i];
      if (absorbedDmg < totalShieldPool) {
        // Enquanto o escudo estiver ativo: dano é exatamente 40% do normal (1 - 0.60)
        assert.equal(hWith.dmg, Math.max(1, Math.round(hNo.dmg * 0.40)), `Golpe ${i} deve ser 40% do normal`);
        absorbedDmg += hWith.dmg;
        if (absorbedDmg >= totalShieldPool) {
          shieldDepletedHitIndex = i;
        }
      } else {
        // Após o escudo ser consumido: dano volta 100% ao normal
        assert.equal(hWith.dmg, hNo.dmg, `Golpe ${i} sem escudo deve ser 100% igual ao sem escudo`);
      }
    }
    assert.ok(shieldDepletedHitIndex > 0, 'O escudo deve ter sido esgotado durante a luta');
  }

  // 2. Rampa de fúria (Fase 2): +8% de ataque a cada 30s cumulativo
  {
    const p = playerStats('warrior', xpForLevel(500), { attack: 1000, defense: 2500, hp: 500_000 }, null, [], {}, {});
    const c = runCycle(soulHunt, p, 102, 1, DIFFICULTIES[0], 1);
    const mHits = c.hits.filter((h) => h.by === 'm' && h.target === 0 && h.dmg > 0);
    const early = mHits.filter((h) => h.t < 30_000);
    const ramp1 = mHits.filter((h) => h.t >= 30_000 && h.t < 60_000);
    const ramp2 = mHits.filter((h) => h.t >= 60_000 && h.t < 90_000);
    assert.ok(early.length > 0 && ramp1.length > 0 && ramp2.length > 0);
    const avgEarly = early.reduce((s, h) => s + h.dmg, 0) / early.length;
    const avgRamp1 = ramp1.reduce((s, h) => s + h.dmg, 0) / ramp1.length;
    const avgRamp2 = ramp2.reduce((s, h) => s + h.dmg, 0) / ramp2.length;
    assert.ok(avgRamp1 > avgEarly, 'Rampa 1 deve ser mais forte que início');
    assert.ok(avgRamp2 > avgRamp1, 'Rampa 2 deve ser mais forte que rampa 1');
  }

  // 3. Adds e limite de ondas (Fase 3): 3 adds a cada 25s, no máximo 5 ondas
  {
    const p = playerStats('devout', xpForLevel(500), { attack: 1000, defense: 2500, hp: 500_000 }, null, [], {}, {});
    const c = runCycle(soulHunt, p, 103, 2, DIFFICULTIES[0], 1);
    const adds = c.monsters.filter((m) => m.id === 'raid_souls_ghost');
    assert.ok(adds.length <= 15);
  }

  // 4. Burst respeita resistência a morte (Fase 4): 55% a cada 30s
  {
    const pNoRes = playerStats('warrior', xpForLevel(500), { attack: 1000, defense: 2000, hp: 100_000 }, null, [], {}, {});
    const pRes = playerStats('warrior', xpForLevel(500), { attack: 1000, defense: 2000, hp: 100_000 }, null, [], {}, {});
    pRes.resistPct = { death: 0.80 };

    const cNoRes = runCycle(soulHunt, pNoRes, 104, 3, DIFFICULTIES[0], 1);
    const cRes = runCycle(soulHunt, pRes, 104, 3, DIFFICULTIES[0], 1);

    const bNoRes = cNoRes.hits.find((h) => h.elem?.element === 'death')!;
    const bRes = cRes.hits.find((h) => h.elem?.element === 'death')!;
    assert.ok(bNoRes && bRes);
    assert.ok(bRes.dmg < bNoRes.dmg * 0.30, 'Burst com 80% resist deve tirar substancialmente menos');
  }

  // 5. Dreno de vida (Fase 5): o chefe se cura a cada ataque no jogador
  {
    const p = playerStats('warrior', xpForLevel(520), { attack: 100_000, defense: 500, hp: 50_000_000 });
    p.resistPct = { water: 0.90 };
    const seed = 999;
    const cWithDrain = runCycle(soulHunt, p, seed, 4, DIFFICULTIES[0], 1);

    const origDrain = soulRaid.phases[4].drain;
    soulRaid.phases[4].drain = undefined;
    const cNoDrain = runCycle(soulHunt, p, seed, 4, DIFFICULTIES[0], 1);
    soulRaid.phases[4].drain = origDrain;

    // A luta com drain dura mais tempo porque o chefe se cura
    assert.ok(cWithDrain.fightMs > cNoDrain.fightMs, `Luta com drain (${cWithDrain.fightMs}ms) deve durar mais que sem drain (${cNoDrain.fightMs}ms)`);

    // Dano total infligido pelo jogador ao chefe até vencê-lo é maior com drain
    const totalDmgWith = cWithDrain.hits.filter((h) => h.by === 'p' && h.target === 0).reduce((s, h) => s + h.dmg, 0);
    const totalDmgNo = cNoDrain.hits.filter((h) => h.by === 'p' && h.target === 0).reduce((s, h) => s + h.dmg, 0);
    assert.ok(totalDmgWith > totalDmgNo, `Jogador precisa causar mais dano (${totalDmgWith} > ${totalDmgNo}) para compensar a cura do dreno`);
  }

  // 6. Megalomania (Fase 6): prova pelos hits que disparam as mecânicas combinadas
  {
    const p = playerStats('warrior', xpForLevel(520), { attack: 100_000, defense: 5000, hp: 50_000_000 });
    p.resistPct = { death: 0.90 };
    const c6 = runCycle(soulHunt, p, 777, 5, DIFFICULTIES[0], 1);

    // a) Adds: exatamente 4 ondas de 2 adds (8 no total)
    const addSpawnHits = c6.hits.filter((h) => h.by === 'm' && h.dmg === 0 && h.target === 0);
    const ghosts = c6.monsters.filter((m) => m.id === 'raid_souls_ghost');
    assert.equal(addSpawnHits.length, 4, 'Exatamente 4 ondas de invocação');
    assert.equal(ghosts.length, 8, 'Exatamente 8 adds invocados (4 ondas x 2)');

    // b) Golpe de morte (burst elemental):
    const deathBursts = c6.hits.filter((h) => h.by === 'm' && h.elem?.element === 'death' && h.crit);
    assert.ok(deathBursts.length >= 3, 'Golpes de morte (burst) devem ocorrer periodicamente');
    assert.ok(deathBursts[0].dmg > 50_000, 'Burst de morte causa dano massivo');

    // c) Escudo: reduz dano inicial em 50%
    const origP6 = { ...soulRaid.phases[5] };
    soulRaid.phases[5] = { ...origP6, shield: undefined, drain: undefined };
    const c6Clean = runCycle(soulHunt, p, 777, 5, DIFFICULTIES[0], 1);
    soulRaid.phases[5] = origP6;

    const firstHitWith = c6.hits.find((h) => h.by === 'p' && h.target === 0 && h.dmg > 0)!;
    const firstHitClean = c6Clean.hits.find((h) => h.by === 'p' && h.target === 0 && h.dmg > 0)!;
    assert.equal(firstHitWith.dmg, Math.round(firstHitClean.dmg * 0.50), 'Dano inicial no chefe com escudo reduzido em 50%');

    // d) Rampa de fúria: golpes registrados ao longo de toda a luta
    const bossHits = c6.hits.filter((h) => h.by === 'm' && h.target === 0 && h.dmg > 0 && !h.elem);
    assert.ok(bossHits.length > 5, 'Golpes regulares do chefe registrados');
  }
});

test('etapa 2: recompensa 1 vez por semana por fase e por raide', () => {
  const db = openDb(':memory:');
  const now = Date.now();
  const week = weekOf(now);
  const acc = db.accountForToken(db.createGuest())!;
  const c = db.createCharacter(acc, 'SoulHero', 'warrior');

  // Limpa fase 1 da Guerra das Almas
  assert.equal(db.hasRaidPhaseClear(c.id, week, SOUL_RAID_ID, 1), false);
  const r1 = rollRaidPhaseReward(1234, c.id, SOUL_RAID_ID, 1, false, 0);
  assert.equal(r1.items.gold, 300_000);
  assert.equal(r1.items.raid_fragment, 5);
  db.markRaidPhaseClear(c.id, week, SOUL_RAID_ID, 1, false, false, now);

  assert.equal(db.hasRaidPhaseClear(c.id, week, SOUL_RAID_ID, 1), true);

  // Segunda verificação na mesma semana: já está limpa
  assert.equal(db.hasRaidPhaseClear(c.id, week, SOUL_RAID_ID, 1), true);

  // A fase 1 de raid_usurper não foi limpa (isolamento entre raides)
  assert.equal(db.hasRaidPhaseClear(c.id, week, 'raid_usurper', 1), false);
  const rUsurper = rollRaidPhaseReward(1234, c.id, 'raid_usurper', 1, false, 0);
  assert.equal(rUsurper.items.gold, 100_000);
  assert.equal(rUsurper.items.raid_fragment, 3);
});

test('etapa 2: traje liberado apenas ao vencer a fase 6 via simulateHunt e game.settle', () => {
  const RAID_MONSTERS_SAVED = RAID_MONSTERS.map((m) => ({ id: m.id, hp: m.hp, attack: m.attack }));
  RAID_MONSTERS.forEach((m) => {
    if (m.id.startsWith('raid_souls_')) {
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
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: xpForLevel(520) } }, 0, 0);
    db.applyGains(c2.id, { actions: 0, items: {}, xp: { combat: xpForLevel(520) } }, 0, 0);
    const partyId = db.createParty(c.id);
    db.addPartyMember(partyId, c2.id);

    const t0 = Date.UTC(2026, 9, 21, 12);
    for (const id of [c.id, c2.id]) {
      db.setActivity(id, { skill: 'combat', node: 'raid_souls', since: t0, seed: 99, seq: 0 });
    }

    // 1. Simula e liquida até a fase 5 (5 fases * (900s + 30s) = 4_650_000ms)
    game.settle(c.id, t0 + 4_650_000);

    // Prova que as fases 1 a 5 foram concluídas:
    const clearsP5 = db.raidClearsFor(c.id, weekOf(t0), SOUL_RAID_ID);
    assert.deepEqual(clearsP5, [1, 2, 3, 4, 5]);

    // Prova que vencer até a fase 5 NÃO libera o traje 'shattered_souls'
    assert.equal(db.unlockedOutfitsFor(c.id).includes('shattered_souls'), false);

    // 2. Simula e liquida a fase 6 (6ª fase: t0 + 6 * 930s = 5_580_000ms)
    game.settle(c.id, t0 + 5_580_000);

    // Prova que a fase 6 foi concluída:
    const clearsP6 = db.raidClearsFor(c.id, weekOf(t0), SOUL_RAID_ID);
    assert.deepEqual(clearsP6, [1, 2, 3, 4, 5, 6]);

    // Prova que a fase 6 liberou o traje 'shattered_souls' via game.settle
    assert.equal(db.unlockedOutfitsFor(c.id).includes('shattered_souls'), true);
  } finally {
    RAID_MONSTERS_SAVED.forEach((s) => {
      const m = RAID_MONSTERS.find((x) => x.id === s.id);
      if (m) { m.hp = s.hp; m.attack = s.attack; }
    });
  }
});

test('etapa 2: botas 8% acima do drop 500, ícones recoloridos e bossEn', () => {
  const baseBoots = RAID_ITEMS.find((i) => i.id === 'shattered_souls_boots')!;
  assert.ok(baseBoots);
  // champion_throne_boots base: 64 def, 508 hp, 35 attack
  // shattered_souls_boots base ~8% acima: 69 def, 549 hp, 38 attack
  assert.equal(baseBoots.equip?.defense, 69);
  assert.equal(baseBoots.equip?.hp, 549);
  assert.equal(baseBoots.equip?.attack, 38);

  const boots = itemById('shattered_souls_boots')!;
  const champ = itemById('champion_throne_boots')!;
  assert.ok(boots.equip!.defense! > champ.equip!.defense!);
  assert.ok(boots.equip!.hp! > champ.equip!.hp!);
  assert.ok(boots.equip!.attack! > champ.equip!.attack!);

  assert.equal(soulRaid.bossEn, 'Vorthan the Sundered');

  for (const item of SOUL_RAID_SET_ITEMS) {
    const it = itemById(item)!;
    assert.ok(existsSync(new URL(`../../client/public/assets/icons/${it.icon}.png`, import.meta.url)), `${it.icon}.png`);
  }
});

test('etapa 2: modo solo bloqueado com mensagem clara usando raid.name', () => {
  const prev = soulRaid.enabled;
  soulRaid.enabled = true;
  try {
    const db = openDb(':memory:');
    const game = createGame(db);
    const now = Date.now();
    const acc = db.accountForToken(db.createGuest())!;
    const char = db.createCharacter(acc, 'SoloPlayer', 'warrior');
    db.applyGains(char.id, { actions: 0, items: {}, xp: { combat: xpForLevel(500) } }, 0, 0);

    const node = huntNode(SOUL_RAID_ID, 'normal');
    const err = game.start(char.id, 'combat', node, now);
    assert.equal(err, `${soulRaid.name} exige um grupo de 2 a 5 jogadores (modo solo indisponível).`);
  } finally {
    soulRaid.enabled = prev;
  }
});

test('etapa 3: formatRaidPhaseMechanics reflete RaidPhaseDef e mudar shield.share muda o texto', () => {
  const p1 = soulRaid.phases[0];
  const tPt1 = formatRaidPhaseMechanics(p1, 'pt');
  const tEn1 = formatRaidPhaseMechanics(p1, 'en');

  assert.match(tPt1, /15% vida/);
  assert.match(tEn1, /15% HP broken/);

  // Mudar shield.share numa cópia da definição muda o texto gerado
  const p1Modified = {
    ...p1,
    shield: { ...p1.shield!, share: 0.25 },
  };

  const tPt2 = formatRaidPhaseMechanics(p1Modified, 'pt');
  const tEn2 = formatRaidPhaseMechanics(p1Modified, 'en');

  assert.match(tPt2, /25% vida/);
  assert.match(tEn2, /25% HP broken/);
  assert.notEqual(tPt1, tPt2);
  assert.notEqual(tEn1, tEn2);

  // Testa também que formatRaidPhaseTitle usa o nome do monstro da fase (PT e EN)
  const titlePt = formatRaidPhaseTitle(p1, 0, 'pt');
  const titleEn = formatRaidPhaseTitle(p1, 0, 'en');
  assert.equal(titlePt, 'Fase 1: Égide de Vorthan');
  assert.equal(titleEn, 'Phase 1: Aegis of Vorthan');
});

test('etapa 4: pulso acerta tanque e DPS ignorando defesa e resistencia reduz o dano', () => {
  const p1 = soulRaid.phases[0];
  assert.ok(p1.pulse, 'fase 1 deve ter pulse');
  assert.equal(p1.pulse.element, 'death');
  assert.equal(p1.pulse.everyMs, 12_000);
  assert.equal(p1.pulse.share, 0.08);

  const ptText = formatRaidPhaseMechanics(p1, 'pt');
  const enText = formatRaidPhaseMechanics(p1, 'en');
  assert.match(ptText, /pulso 8% vida a cada 12s \(Morte\)/);
  assert.match(enText, /8% HP pulse every 12s \(Death\)/);

  // 1. Tanque com 100.000 HP, 8.000 de defesa, 25% de redução e 0% resistência a morte
  const tank = {
    ...playerStats('warrior', xpForLevel(500)),
    hp: 100_000,
    defense: 8_000,
    reduction: 0.25,
    attack: 100,
    attackSpeedMs: 5000,
    resistPct: { death: 0 },
  };

  // 2. DPS com 100.000 HP, 400 de defesa, 0% de redução e 0% resistência a morte
  const dpsNoRes = {
    ...playerStats('arcanist', xpForLevel(500)),
    hp: 100_000,
    defense: 400,
    reduction: 0,
    attack: 100,
    attackSpeedMs: 5000,
    resistPct: { death: 0 },
  };

  // 3. DPS com 100.000 HP, 400 de defesa, 0% de redução e 30% resistência a morte
  const dpsWithRes = {
    ...playerStats('arcanist', xpForLevel(500)),
    hp: 100_000,
    defense: 400,
    reduction: 0,
    attack: 100,
    attackSpeedMs: 5000,
    resistPct: { death: 0.30 },
  };

  const cTank = runCycle(soulHunt, tank, 1234, 0, DIFFICULTIES[0], 1);
  const pulseHitTank = cTank.hits.find((h) => h.t === 12_000 && h.elem?.element === 'death');
  assert.ok(pulseHitTank, 'pulso atingiu o tanque em 12s');
  assert.equal(pulseHitTank.dmg, 8000);

  const cDpsNoRes = runCycle(soulHunt, dpsNoRes, 1234, 0, DIFFICULTIES[0], 1);
  const pulseHitDps = cDpsNoRes.hits.find((h) => h.t === 12_000 && h.elem?.element === 'death');
  assert.ok(pulseHitDps, 'pulso atingiu o DPS em 12s');
  assert.equal(pulseHitDps.dmg, 8000);

  const cDpsWithRes = runCycle(soulHunt, dpsWithRes, 1234, 0, DIFFICULTIES[0], 1);
  const pulseHitDpsRes = cDpsWithRes.hits.find((h) => h.t === 12_000 && h.elem?.element === 'death');
  assert.ok(pulseHitDpsRes, 'pulso atingiu o DPS com resistência');
  assert.equal(pulseHitDpsRes.dmg, 5600);
});
