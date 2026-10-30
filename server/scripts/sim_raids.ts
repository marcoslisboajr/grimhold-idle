/**
 * Calibração das Raides:
 * - Raide I (400+): 5 cenários sintéticos com 200 lutas cada
 * - Raide II / Guerra das Almas (500+): 3 cenários com personagens reais do snapshot (SNAP=caminho)
 *
 * Executar Raide I: npx tsx server/scripts/sim_raids.ts
 * Executar Raide II: SNAP=caminho/do/banco.db npx tsx server/scripts/sim_raids.ts
 */
import { copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  playerStats,
  xpForLevel,
  equipmentBonus,
  promotionsFor,
  runCycle,
  lairGroupFor,
  partyBuffsFor,
  huntFighter,
  type Fighter,
  type Monster,
  type Bonus,
  type HuntContext,
} from '../../shared/src/index.ts';
import { RAID_HUNTS, RAID_MONSTERS, SOUL_RAID_ID, BLOOD_RAID_ID, raidById, raidMonsterById } from '../../shared/src/raids.ts';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const raidHunt = RAID_HUNTS[0];

function gear400(voc: 'warrior' | 'hunter' | 'arcanist' | 'devout') {
  if (voc === 'warrior') {
    return {
      weapon: 'drop400_sword+10',
      shield: 'drop400_shield+10',
      helmet: 'drop400_helmet+10',
      armor: 'drop400_plate+10',
      legs: 'drop400_legs+10',
      boots: 'drop400_boots+10',
      ring: 'drop400_ring+10',
      amulet: 'drop400_amulet+10',
    };
  }
  if (voc === 'hunter') {
    return {
      weapon: 'drop400_bow+10',
      quiver: 'drop400_quiver+10',
      helmet: 'drop400_hood+10',
      armor: 'drop400_leather_armor+10',
      legs: 'drop400_leather_legs+10',
      boots: 'drop400_boots+10',
      ring: 'drop400_ring+10',
      amulet: 'drop400_amulet+10',
    };
  }
  if (voc === 'arcanist') {
    return {
      weapon: 'drop400_staff+10',
      spellbook: 'drop400_spellbook+10',
      helmet: 'drop400_hat+10',
      armor: 'drop400_robe+10',
      legs: 'drop400_robe_legs+10',
      boots: 'drop400_boots+10',
      ring: 'drop400_ring+10',
      amulet: 'drop400_amulet+10',
    };
  }
  return {
    weapon: 'drop400_mace+10',
    shield: 'drop400_shield+10',
    helmet: 'drop400_holy_helmet+10',
    armor: 'drop400_holy_armor+10',
    legs: 'drop400_holy_legs+10',
    boots: 'drop400_boots+10',
    ring: 'drop400_ring+10',
    amulet: 'drop400_amulet+10',
  };
}

const skills115 = {
  melee: xpForLevel(115),
  ranged: xpForLevel(115),
  magic_level: xpForLevel(115),
  shielding: xpForLevel(115),
};

interface SimPlayerOpts {
  voc: 'warrior' | 'hunter' | 'arcanist' | 'devout';
  level: number;
  phaseElement?: 'fire' | 'water' | 'earth';
  hasEnergyRes?: boolean;
  hasAoe?: boolean;
  unprepared?: boolean;
}

export function buildFighter(opts: SimPlayerOpts): Fighter {
  const baseBonus = equipmentBonus(gear400(opts.voc));
  const customBonus: Bonus = { ...baseBonus };

  if (opts.unprepared) {
    customBonus.resEnergy = 0;
    customBonus.element = undefined;
    customBonus.elementAttack = 0;
  } else {
    if (opts.phaseElement) {
      customBonus.element = opts.phaseElement;
      customBonus.elementAttack = 120;
    }
    if (opts.hasEnergyRes) {
      customBonus.resEnergy = 0.48;
    } else {
      customBonus.resEnergy = 0;
    }
  }

  const promo = promotionsFor(opts.voc)[0]?.id;

  let spells: string[];
  if (opts.hasAoe === false) {
    spells = opts.voc === 'warrior'
      ? ['brutal_strike', 'war_cry', 'iron_skin', 'heavy_strike']
      : opts.voc === 'hunter'
      ? ['aimed_shot', 'focus', 'field_bandage', 'sniper_shot']
      : opts.voc === 'arcanist'
      ? ['fireball', 'lightning', 'arcane_shield', 'arcane_bolt']
      : ['heal', 'great_heal', 'blessing', 'holy_strike'];
  } else {
    spells = opts.voc === 'warrior'
      ? ['earthquake', 'whirlwind', 'brutal_strike', 'iron_skin']
      : opts.voc === 'hunter'
      ? ['arrow_rain', 'explosive_arrows', 'aimed_shot', 'focus']
      : opts.voc === 'arcanist'
      ? ['meteor', 'flame_wave', 'ice_storm', 'arcane_shield']
      : ['great_heal', 'heal', 'judgement', 'blessing'];
  }

  const fighter = playerStats(opts.voc, xpForLevel(opts.level), customBonus, promo, spells, skills115);
  fighter.healthPotion = { id: 'supreme_health_potion', heal: 500, count: 100 };
  fighter.manaPotion = { id: 'supreme_mana_potion', mana: 300, count: 100 };
  return fighter;
}

export function simulateRaidRun(
  scenario: {
    party: SimPlayerOpts[];
    noAoe?: boolean;
  },
  seed: number,
): { won: boolean; failedPhase: number } {
  const isSolo = scenario.party.length === 1;
  const partyBuffs = partyBuffsFor(scenario.party.map((p) => p.voc));

  const phaseElements: ('fire' | 'water' | 'earth')[] = ['fire', 'water', 'earth'];

  for (let seq = 0; seq < 3; seq++) {
    const el = phaseElements[seq];
    const boss = RAID_MONSTERS[seq];

    const fighters = scenario.party.map((p, idx) => ({
      id: idx + 1,
      fighter: buildFighter({
        ...p,
        phaseElement: el,
        hasEnergyRes: p.hasEnergyRes,
        hasAoe: scenario.noAoe ? false : p.hasAoe,
        unprepared: p.unprepared,
      }),
    }));

    const mainIdx = seed % fighters.length;
    const mainFighter = fighters[mainIdx].fighter;
    let lairGroup = undefined;
    if (!isSolo) {
      const groups = lairGroupFor(fighters, boss, partyBuffs);
      lairGroup = groups.get(mainIdx + 1);
    }

    const cycle = runCycle(
      raidHunt,
      mainFighter,
      seed,
      seq,
      { id: 'normal', name: 'Normal', level: 0, xp: 1 },
      1,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      lairGroup,
      partyBuffs,
    );

    if (cycle.outcome !== 'win') {
      return { won: false, failedPhase: seq + 1 };
    }
  }

  return { won: true, failedPhase: 0 };
}

export function runCalibration(numRuns = 200) {
  console.log(`\n======================================================`);
  console.log(`SIMULAÇÃO DA RAIDE I (400+) - ${numRuns} LUTAS POR CENÁRIO`);
  console.log(`======================================================\n`);

  const c1Party: SimPlayerOpts[] = [
    { voc: 'warrior', level: 410, hasEnergyRes: true },
    { voc: 'arcanist', level: 410, hasEnergyRes: true },
    { voc: 'devout', level: 410, hasEnergyRes: true },
  ];
  let c1Wins = 0;
  const c1Fails: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (let s = 0; s < numRuns; s++) {
    const res = simulateRaidRun({ party: c1Party }, 10_000 + s);
    if (res.won) c1Wins++;
    else c1Fails[res.failedPhase]++;
  }

  const c2Party: SimPlayerOpts[] = [
    { voc: 'warrior', level: 410, hasEnergyRes: false },
    { voc: 'arcanist', level: 410, hasEnergyRes: false },
    { voc: 'devout', level: 410, hasEnergyRes: false },
  ];
  let c2Wins = 0;
  const c2Fails: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (let s = 0; s < numRuns; s++) {
    const res = simulateRaidRun({ party: c2Party }, 20_000 + s);
    if (res.won) c2Wins++;
    else c2Fails[res.failedPhase]++;
  }

  const c3Party: SimPlayerOpts[] = [
    { voc: 'warrior', level: 410, hasEnergyRes: true, hasAoe: false },
    { voc: 'arcanist', level: 410, hasEnergyRes: true, hasAoe: false },
    { voc: 'devout', level: 410, hasEnergyRes: true, hasAoe: false },
  ];
  let c3Wins = 0;
  const c3Fails: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (let s = 0; s < numRuns; s++) {
    const res = simulateRaidRun({ party: c3Party, noAoe: true }, 30_000 + s);
    if (res.won) c3Wins++;
    else c3Fails[res.failedPhase]++;
  }

  const c4Party: SimPlayerOpts[] = [
    { voc: 'warrior', level: 420, hasEnergyRes: true },
  ];
  let c4Wins = 0;
  const c4Fails: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (let s = 0; s < numRuns; s++) {
    const res = simulateRaidRun({ party: c4Party }, 40_000 + s);
    if (res.won) c4Wins++;
    else c4Fails[res.failedPhase]++;
  }

  const c5Party: SimPlayerOpts[] = [
    { voc: 'warrior', level: 430, unprepared: true },
    { voc: 'hunter', level: 430, unprepared: true },
    { voc: 'arcanist', level: 430, unprepared: true },
  ];
  let c5Wins = 0;
  const c5Fails: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (let s = 0; s < numRuns; s++) {
    const res = simulateRaidRun({ party: c5Party }, 50_000 + s);
    if (res.won) c5Wins++;
    else c5Fails[res.failedPhase]++;
  }

  const pct = (w: number) => ((w / numRuns) * 100).toFixed(1) + '%';

  console.log(`Cenário 1 (3 jogadores 410 preparados):`);
  console.log(`  Vitórias: ${c1Wins}/${numRuns} (${pct(c1Wins)}) [Alvo: ~75%] | Fails: F1=${c1Fails[1]}, F2=${c1Fails[2]}, F3=${c1Fails[3]}`);
  console.log(`\nCenário 2 (Os mesmos 3, SEM resistência a energia):`);
  console.log(`  Vitórias: ${c2Wins}/${numRuns} (${pct(c2Wins)}) [Alvo: ~10%] | Fails: F1=${c2Fails[1]}, F2=${c2Fails[2]}, F3=${c2Fails[3]}`);
  console.log(`\nCenário 3 (Os mesmos 3, SEM dano em área):`);
  console.log(`  Vitórias: ${c3Wins}/${numRuns} (${pct(c3Wins)}) [Alvo: ~25%] | Fails: F1=${c3Fails[1]}, F2=${c3Fails[2]}, F3=${c3Fails[3]}`);
  console.log(`\nCenário 4 (Solo, 1 jogador 420 bem preparado):`);
  console.log(`  Vitórias: ${c4Wins}/${numRuns} (${pct(c4Wins)}) [Alvo: ~30%] | Fails: F1=${c4Fails[1]}, F2=${c4Fails[2]}, F3=${c4Fails[3]}`);
  console.log(`\nCenário 5 (3 jogadores 430 despreparados):`);
  console.log(`  Vitórias: ${c5Wins}/${numRuns} (${pct(c5Wins)}) [Alvo: ~10%] | Fails: F1=${c5Fails[1]}, F2=${c5Fails[2]}, F3=${c5Fails[3]}`);
  console.log(`\n======================================================\n`);
}

export function runSoulsCalibration(snapPath: string, numRuns = 50) {
  const soulRaid = raidById(SOUL_RAID_ID)!;
  const soulHunt = RAID_HUNTS.find((h) => h.id === SOUL_RAID_ID)!;

  const f = join(tmpdir(), `sim_raids_snap_${process.pid}.db`);
  copyFileSync(snapPath, f);
  const db = openDb(f);
  const game = createGame(db);

  // Top 5 sem Gioseppi Camolle (comportamento de mortes anômalas no snapshot)
  const top5Names = ['Sixtwo', 'Didicorj', 'Montuno', 'Yaanmark', 'Monkoso'];
  const charMap = new Map<string, { id: number; name: string; fighter: Fighter }>();

  for (const name of top5Names) {
    const c = db.characterByName(name);
    if (!c) continue;
    const skills = db.skillsFor(c.id);
    const bonus = game.combatBonus(c.id);
    const ctx: HuntContext = {
      spells: db.spellsFor(c.id),
      vocation: c.vocation,
      combatXp: Math.max(skills.combat ?? 0, xpForLevel(500)),
      skills,
      bonus,
      promotion: c.promotion,
      food: db.foodFor(c.id),
      meal: db.mealFor(c.id),
      potion: db.potionFor(c.id),
      manaPotion: db.manaPotionFor(c.id),
      rules: db.combatRulesFor(c.id),
      arrow: db.arrowFor(c.id),
      runes: db.runesFor(c.id),
      blessed: db.blessedFor(c.id),
      bank: db.bankFor(c.id),
      charms: db.charmsFor(c.id),
      prey: db.preyFor(c.id, 2),
    };
    const fighter = huntFighter(ctx, Date.now());
    charMap.set(name, { id: c.id, name: c.name, fighter });
  }

  db.close();
  rmSync(f, { force: true });

  console.log('\n======================================================');
  console.log(`SIMULACAO DA GUERRA DAS ALMAS (500+) - ${numRuns} LUTAS POR CENARIO`);
  console.log('Personagens carregados do snapshot com equipamento, pocoes reais e regras:');
  console.log('  ' + top5Names.join(', '));
  console.log('======================================================\n');

  function simulateScenario(label: string, partyNames: string[]) {
    let fullClears = 0;
    const phaseClears = [0, 0, 0, 0, 0, 0];
    const phaseTimes = [0, 0, 0, 0, 0, 0];
    const deathsPerPhase: number[] = [0, 0, 0, 0, 0, 0];
    const survivorsPerPhase: number[] = [0, 0, 0, 0, 0, 0];
    const haltedAtPhase: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const deathCounts: Record<string, number> = {};
    const dpmSum: Record<string, number[]> = {};
    const dpmCount: Record<string, number[]> = {};
    for (const n of partyNames) {
      deathCounts[n] = 0;
      dpmSum[n] = [0, 0, 0, 0, 0, 0];
      dpmCount[n] = [0, 0, 0, 0, 0, 0];
    }

    for (let r = 0; r < numRuns; r++) {
      const baseSeed = 10_000 + r * 1000;
      let living = partyNames.map(name => charMap.get(name)!).filter(Boolean);
      let reached = 0;

      for (let seq = 0; seq < 6; seq++) {
        if (living.length === 0) break;

        const phaseDef = soulRaid.phases[seq];
        const boss = raidMonsterById(phaseDef.monster)!;
        const partyBuffs = partyBuffsFor(living.map(m => m.fighter.vocation));
        const fighters = living.map((m) => ({ id: m.id, fighter: m.fighter }));
        const lg = living.length > 1 ? lairGroupFor(fighters, boss, partyBuffs) : undefined;

        const results = living.map((m) => {
          // Varia a seed por membro e por luta
          const memberSeed = (baseSeed ^ (m.id * 2654435761)) >>> 0;
          const c = runCycle(
            soulHunt,
            m.fighter,
            memberSeed,
            seq,
            { id: 'normal', name: 'Normal', level: 0, xp: 1 },
            1,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            lg?.get(m.id),
            partyBuffs,
          );
          const dmgTaken = c.hits.filter(h => h.by === 'm' && h.dmg > 0).reduce((s, h) => s + h.dmg, 0);
          const mins = Math.max(0.05, c.fightMs / 60000);
          dpmSum[m.name][seq] += dmgTaken / mins;
          dpmCount[m.name][seq]++;
          return { member: m, outcome: c.outcome, fightMs: c.fightMs, dmgTaken, dpm: dmgTaken / mins };
        });

        const wins = results.filter(res => res.outcome === 'win');
        const deaths = results.filter(res => res.outcome === 'death');
        const draws = results.filter(res => res.outcome === 'draw');

        deathsPerPhase[seq] += deaths.length;
        for (const d of deaths) deathCounts[d.member.name] = (deathCounts[d.member.name] ?? 0) + 1;

        if (wins.length > 0 && draws.length === 0) {
          phaseClears[seq]++;
          survivorsPerPhase[seq] += wins.length;
          const avgMs = wins.reduce((s, w) => s + w.fightMs, 0) / wins.length;
          phaseTimes[seq] += avgMs;
          // Regra do jogo: apenas os sobreviventes continuam na próxima fase
          living = wins.map(w => w.member);
          reached = seq + 1;
        } else {
          // Fase falhou (todos morreram ou tempo limite de fúria atingido)
          break;
        }
      }

      haltedAtPhase[reached] = (haltedAtPhase[reached] ?? 0) + 1;
      if (reached === 6) fullClears++;
    }

    const avgTimes = phaseTimes.map((sum, i) =>
      phaseClears[i] > 0 ? (sum / phaseClears[i] / 60000).toFixed(1) + ' min' : '-'
    );
    const avgSurvivors = survivorsPerPhase.map((s, i) =>
      phaseClears[i] > 0 ? (s / phaseClears[i]).toFixed(1) : '-'
    );
    const winRate = ((fullClears / numRuns) * 100).toFixed(1) + '%';

    console.log(`Cenario: ${label}`);
    console.log(`  Vitorias Completas: ${fullClears}/${numRuns} (${winRate})`);
    console.log(`  Distribuicao de fases concluidas:`, haltedAtPhase);
    console.log(`  Fases concluidas (limpas):`, phaseClears);
    console.log(`  Tempos medios: [${avgTimes.join(', ')}]`);
    console.log(`  Sobreviventes medios ao fim de cada fase: [${avgSurvivors.join(', ')}]`);
    console.log(`  Mortes acumuladas:`, deathCounts);
    console.log(`  Dano medio por minuto (DPM) recebido:`);
    for (const n of partyNames) {
      const perPhase = dpmSum[n].map((sum, i) =>
        dpmCount[n][i] > 0 ? Math.round(sum / dpmCount[n][i]).toLocaleString('pt-BR') : '-'
      );
      console.log(`    ${n.padEnd(10)}: [${perPhase.join(', ')}]`);
    }
    console.log('');
  }

  simulateScenario('Grupo de 5 dos mais fortes (Sixtwo, Didicorj, Montuno, Yaanmark, Monkoso)', top5Names);
  simulateScenario('Grupo de 3 dos mais fortes (Sixtwo, Didicorj, Montuno)', ['Sixtwo', 'Didicorj', 'Montuno']);
  simulateScenario('Melhor jogador sozinho (Sixtwo)', ['Sixtwo']);
}

export function runBloodCalibration(snapPath: string, numRuns = 50) {
  const bloodRaid = raidById(BLOOD_RAID_ID)!;
  const bloodHunt = RAID_HUNTS.find((h) => h.id === BLOOD_RAID_ID)!;

  const f = join(tmpdir(), `sim_raids_blood_snap_${process.pid}.db`);
  copyFileSync(snapPath, f);
  const db = openDb(f);
  const game = createGame(db);

  const top5Names = ['Sixtwo', 'Didicorj', 'Montuno', 'Yaanmark', 'Monkoso'];
  const charMap = new Map<string, { id: number; name: string; fighter: Fighter }>();

  for (const name of top5Names) {
    const c = db.characterByName(name);
    if (!c) continue;
    const skills = db.skillsFor(c.id);
    const bonus = game.combatBonus(c.id);
    const ctx: HuntContext = {
      spells: db.spellsFor(c.id),
      vocation: c.vocation,
      combatXp: Math.max(skills.combat ?? 0, xpForLevel(550)),
      skills,
      bonus,
      promotion: c.promotion,
      food: db.foodFor(c.id),
      meal: db.mealFor(c.id),
      potion: db.potionFor(c.id),
      manaPotion: db.manaPotionFor(c.id),
      rules: db.combatRulesFor(c.id),
      arrow: db.arrowFor(c.id),
      runes: db.runesFor(c.id),
      blessed: db.blessedFor(c.id),
      bank: db.bankFor(c.id),
      charms: db.charmsFor(c.id),
      prey: db.preyFor(c.id, 2),
    };
    const fighter = huntFighter(ctx, Date.now());
    charMap.set(name, { id: c.id, name: c.name, fighter });
  }

  db.close();
  rmSync(f, { force: true });

  console.log('\n======================================================');
  console.log(`SIMULAÇÃO DA RAIDE III: SANGUE APODRECIDO (550+) - ${numRuns} LUTAS`);
  console.log('Personagens carregados do snapshot com equipamento, poções reais e regras:');
  console.log('  ' + top5Names.join(', '));
  console.log('======================================================\n');

  function simulateScenario(label: string, partyNames: string[]) {
    let fullClears = 0;
    const phaseClears = [0, 0, 0, 0, 0];
    const phaseTimes = [0, 0, 0, 0, 0];
    const deathsPerPhase: number[] = [0, 0, 0, 0, 0];
    const survivorsPerPhase: number[] = [0, 0, 0, 0, 0];
    const haltedAtPhase: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const deathCounts: Record<string, number> = {};
    const dpmSum: Record<string, number[]> = {};
    const dpmCount: Record<string, number[]> = {};
    for (const n of partyNames) {
      deathCounts[n] = 0;
      dpmSum[n] = [0, 0, 0, 0, 0];
      dpmCount[n] = [0, 0, 0, 0, 0];
    }

    for (let r = 0; r < numRuns; r++) {
      const baseSeed = 20_000 + r * 1000;
      let living = partyNames.map(name => charMap.get(name)!).filter(Boolean);
      let reached = 0;

      for (let seq = 0; seq < 5; seq++) {
        if (living.length === 0) break;

        const phaseDef = bloodRaid.phases[seq];
        const boss = raidMonsterById(phaseDef.monster)!;
        const partyBuffs = partyBuffsFor(living.map(m => m.fighter.vocation));
        const fighters = living.map((m) => ({ id: m.id, fighter: m.fighter }));
        const lg = living.length > 1 ? lairGroupFor(fighters, boss, partyBuffs) : undefined;

        const results = living.map((m) => {
          const memberSeed = (baseSeed ^ (m.id * 2654435761)) >>> 0;
          const c = runCycle(
            bloodHunt,
            m.fighter,
            memberSeed,
            seq,
            { id: 'normal', name: 'Normal', level: 0, xp: 1 },
            1,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            lg?.get(m.id),
            partyBuffs,
          );
          const dmgTaken = c.hits.filter(h => h.by === 'm' && h.dmg > 0).reduce((s, h) => s + h.dmg, 0);
          const mins = Math.max(0.05, c.fightMs / 60000);
          dpmSum[m.name][seq] += dmgTaken / mins;
          dpmCount[m.name][seq]++;
          return { member: m, outcome: c.outcome, fightMs: c.fightMs, dmgTaken, dpm: dmgTaken / mins };
        });

        const wins = results.filter(res => res.outcome === 'win');
        const deaths = results.filter(res => res.outcome === 'death');
        const draws = results.filter(res => res.outcome === 'draw');

        deathsPerPhase[seq] += deaths.length;
        for (const d of deaths) deathCounts[d.member.name] = (deathCounts[d.member.name] ?? 0) + 1;

        if (wins.length > 0 && draws.length === 0) {
          phaseClears[seq]++;
          survivorsPerPhase[seq] += wins.length;
          const avgMs = wins.reduce((s, w) => s + w.fightMs, 0) / wins.length;
          phaseTimes[seq] += avgMs;
          living = wins.map(w => w.member);
          reached = seq + 1;
        } else {
          break;
        }
      }

      haltedAtPhase[reached] = (haltedAtPhase[reached] ?? 0) + 1;
      if (reached === 5) fullClears++;
    }

    const avgTimes = phaseTimes.map((sum, i) =>
      phaseClears[i] > 0 ? (sum / phaseClears[i] / 60000).toFixed(1) + ' min' : '-'
    );
    const avgSurvivors = survivorsPerPhase.map((s, i) =>
      phaseClears[i] > 0 ? (s / phaseClears[i]).toFixed(1) : '-'
    );
    const winRate = ((fullClears / numRuns) * 100).toFixed(1) + '%';

    console.log(`Cenario: ${label}`);
    console.log(`  Vitorias Completas: ${fullClears}/${numRuns} (${winRate})`);
    console.log(`  Distribuicao de fases concluidas:`, haltedAtPhase);
    console.log(`  Fases concluidas (limpas):`, phaseClears);
    console.log(`  Tempos medios: [${avgTimes.join(', ')}]`);
    console.log(`  Sobreviventes medios ao fim de cada fase: [${avgSurvivors.join(', ')}]`);
    console.log(`  Mortes acumuladas:`, deathCounts);
    console.log(`  Dano medio por minuto (DPM) recebido:`);
    for (const n of partyNames) {
      const perPhase = dpmSum[n].map((sum, i) =>
        dpmCount[n][i] > 0 ? Math.round(sum / dpmCount[n][i]).toLocaleString('pt-BR') : '-'
      );
      console.log(`    ${n.padEnd(10)}: [${perPhase.join(', ')}]`);
    }
    console.log('');
  }

  simulateScenario('Grupo de 5 dos mais fortes (Sixtwo, Didicorj, Montuno, Yaanmark, Monkoso)', top5Names);
  simulateScenario('Grupo de 3 dos mais fortes (Sixtwo, Didicorj, Montuno)', ['Sixtwo', 'Didicorj', 'Montuno']);
  simulateScenario('Melhor jogador sozinho (Sixtwo)', ['Sixtwo']);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('sim_raids.ts')) {
  const snap = process.env.SNAP;
  if (snap) {
    if (process.env.RAID === 'souls') {
      runSoulsCalibration(snap, 50);
    } else {
      runBloodCalibration(snap, 50);
    }
  } else {
    runCalibration(200);
  }
}
