/**
 * Calibração da Raide 150 (Fortaleza do Inverno Eterno)
 * Utiliza o snapshot de produção em modo somente leitura (grimhold-snap.db)
 *
 * Metas da calibração:
 * - Grupo de 5: vence entre 40% e 70% das tentativas, 6 a 12 min por fase, com dano em todos;
 * - Grupo de 3: chega à fase 2 ou 3;
 * - Solo: passa da fase 1 com esforço e para na fase 2.
 *
 * Executar: npx tsx server/scripts/calibrate_raid_150.ts
 */
import { copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  xpForLevel,
  levelForXp,
  runCycle,
  lairGroupFor,
  partyBuffsFor,
  huntFighter,
  type Fighter,
  type HuntContext,
} from '../../shared/src/index.ts';
import {
  FROST_RAID_ID,
  RAID_HUNTS,
  raidById,
  raidMonsterById,
} from '../../shared/src/raids.ts';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const SNAP_PATH = process.env.SNAP || 'grimhold-snap.db';

export function runCalibration(snapPath = SNAP_PATH, numRuns = 60) {
  const raid = raidById(FROST_RAID_ID)!;
  const hunt = RAID_HUNTS.find((h) => h.id === FROST_RAID_ID)!;

  const tmpDb = join(tmpdir(), `sim_raid150_snap_${process.pid}_${Date.now()}.db`);
  copyFileSync(snapPath, tmpDb);
  const db = openDb(tmpDb);
  const game = createGame(db);

  // Jogadores reais do snapshot na faixa 130 a 220
  const candidateNames = ['Mydnat', 'Calax', 'Newzera', 'Carvao', 'Idrilla', 'Batata', 'Zhaskzz'];
  const charMap = new Map<string, { id: number; name: string; fighter: Fighter }>();

  for (const name of candidateNames) {
    const c = db.characterByName(name);
    if (!c) continue;
    const skills = { ...db.skillsFor(c.id) };
    // Escala para nível 150
    skills.combat = xpForLevel(150);
    // Garante skills de combate proporcionais a um nível 150 (skill ~100)
    for (const sk of ['melee', 'ranged', 'magic_level', 'defense'] as const) {
      if ((skills[sk] ?? 0) < xpForLevel(85)) skills[sk] = xpForLevel(95);
      if ((skills[sk] ?? 0) > xpForLevel(110)) skills[sk] = xpForLevel(105);
    }
    const bonus = game.combatBonus(c.id);

    const ctx: HuntContext = {
      spells: db.spellsFor(c.id),
      vocation: c.vocation,
      combatXp: xpForLevel(150),
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
  rmSync(tmpDb, { force: true });

  console.log('========================================================================');
  console.log(`CALIBRAÇÃO DA RAIDE 150 (FORTALEZA DO INVERNO ETERNO) - ${numRuns} RUNS`);
  console.log('Personagens reais escalados para nível 150:');
  for (const [name, data] of charMap.entries()) {
    console.log(`  - ${name} (${data.fighter.vocation}), HP: ${data.fighter.hp}, Def: ${data.fighter.defense}, Atk: ${data.fighter.attack}`);
  }
  console.log('========================================================================\n');

  function simulateScenario(label: string, partyNames: string[], allowSolo = false) {
    let fullClears = 0;
    const numPhases = raid.phases.length;
    const phaseClears = new Array(numPhases).fill(0);
    const phaseTimes = new Array(numPhases).fill(0);
    const deathsPerPhase = new Array(numPhases).fill(0);
    const survivorsPerPhase = new Array(numPhases).fill(0);
    const reachedPhaseCount = new Array(numPhases + 1).fill(0);

    const dpmSum: Record<string, number[]> = {};
    const dpmCount: Record<string, number[]> = {};
    for (const n of partyNames) {
      dpmSum[n] = new Array(numPhases).fill(0);
      dpmCount[n] = new Array(numPhases).fill(0);
    }

    for (let r = 0; r < numRuns; r++) {
      const baseSeed = 20_000 + r * 1000;
      let living = partyNames.map((name) => charMap.get(name)!).filter(Boolean);
      let reached = 0;

      for (let seq = 0; seq < numPhases; seq++) {
        if (living.length === 0) break;

        const phaseDef = raid.phases[seq];
        const boss = raidMonsterById(phaseDef.monster)!;
        const partyBuffs = partyBuffsFor(living.map((m) => m.fighter.vocation));
        const fighters = living.map((m) => ({ id: m.id, fighter: m.fighter }));
        const lg = living.length > 1 ? lairGroupFor(fighters, boss, partyBuffs) : undefined;

        const results = living.map((m) => {
          const memberSeed = (baseSeed + seq * 17923 + (m.id * 2654435761)) >>> 0;
          const c = runCycle(
            hunt,
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
          const dmgTaken = c.hits.filter((h) => h.by === 'm' && h.dmg > 0).reduce((s, h) => s + h.dmg, 0);
          const mins = Math.max(0.05, c.fightMs / 60000);
          dpmSum[m.name][seq] += dmgTaken / mins;
          dpmCount[m.name][seq]++;
          return { member: m, outcome: c.outcome, fightMs: c.fightMs, dmgTaken, dpm: dmgTaken / mins };
        });

        const wins = results.filter((res) => res.outcome === 'win');
        const deaths = results.filter((res) => res.outcome === 'death');
        const draws = results.filter((res) => res.outcome === 'draw');

        deathsPerPhase[seq] += deaths.length;

        if (wins.length > 0 && draws.length === 0) {
          phaseClears[seq]++;
          survivorsPerPhase[seq] += wins.length;
          const avgTime = results.reduce((s, x) => s + x.fightMs, 0) / results.length;
          phaseTimes[seq] += avgTime;
          reached = seq + 1;
          living = wins.map((w) => w.member);
        } else {
          reached = seq;
          break;
        }
      }

      reachedPhaseCount[reached]++;
      if (reached === numPhases) fullClears++;
    }

    const pct = (val: number, tot = numRuns) => ((val / tot) * 100).toFixed(1) + '%';
    const msToMinSec = (ms: number) => {
      const totalSec = Math.round(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}m ${sec < 10 ? '0' : ''}${sec}s`;
    };

    console.log(`------------------------------------------------------------------------`);
    console.log(`CENÁRIO: ${label} (${partyNames.join(', ')})`);
    console.log(`Taxa de Vitória Completa (Fase 4): ${fullClears}/${numRuns} (${pct(fullClears)})`);
    console.log(`Distribuição de Fim de Raide:`);
    for (let p = 0; p <= numPhases; p++) {
      console.log(`  - Parou na Fase ${p}: ${reachedPhaseCount[p]} (${pct(reachedPhaseCount[p])})`);
    }
    console.log(`Desempenho por Fase:`);
    for (let seq = 0; seq < numPhases; seq++) {
      const clears = phaseClears[seq];
      const avgMs = clears > 0 ? phaseTimes[seq] / clears : 0;
      const avgSurv = clears > 0 ? (survivorsPerPhase[seq] / clears).toFixed(2) : '0';
      const totDeaths = deathsPerPhase[seq];
      console.log(`  Fase ${seq + 1}: Clears: ${clears}/${numRuns} (${pct(clears)}) | Tempo Médio: ${msToMinSec(avgMs)} | Sobreviventes Médios: ${avgSurv} | Total Mortes: ${totDeaths}`);
    }

    console.log(`Dano Recebido por Minuto (DPM Médio por Membro):`);
    for (const n of partyNames) {
      const dpmPerPhase = dpmSum[n].map((sum, seq) => {
        const cnt = dpmCount[n][seq];
        return cnt > 0 ? Math.round(sum / cnt) : 0;
      });
      console.log(`  - ${n}: F1=${dpmPerPhase[0]}, F2=${dpmPerPhase[1]}, F3=${dpmPerPhase[2]}, F4=${dpmPerPhase[3]}`);
    }
    console.log(`\n`);

    return {
      fullClears,
      winRate: fullClears / numRuns,
      phaseClears,
      phaseTimes: phaseTimes.map((t, i) => (phaseClears[i] > 0 ? t / phaseClears[i] : 0)),
      reachedPhaseCount,
    };
  }

  // Cenário 1: Grupo de 5 jogadores
  const resGroup5 = simulateScenario(
    'Grupo Completo (5 jogadores: Warrior, Hunter, Arcanist, Devout, Hunter)',
    ['Mydnat', 'Calax', 'Newzera', 'Carvao', 'Idrilla']
  );

  // Cenário 2: Grupo de 3 jogadores
  const resGroup3 = simulateScenario(
    'Grupo Reduzido (3 jogadores: Warrior, Arcanist, Devout)',
    ['Mydnat', 'Newzera', 'Carvao']
  );

  // Cenário 3: Modo Solo (Warrior)
  const resSoloWarrior = simulateScenario('Modo Solo (Warrior: Mydnat)', ['Mydnat'], true);

  // Cenário 4: Modo Solo (Hunter: Calax)
  const resSoloHunter = simulateScenario('Modo Solo (Hunter: Calax)', ['Calax'], true);

  // Cenário 5: Modo Solo (Arcanist: Newzera)
  const resSoloArcanist = simulateScenario('Modo Solo (Arcanist: Newzera)', ['Newzera'], true);

  // Cenário 6: Modo Solo (Devout: Carvao)
  const resSoloDevout = simulateScenario('Modo Solo (Devout: Carvao)', ['Carvao'], true);

  return { resGroup5, resGroup3, resSoloWarrior, resSoloHunter, resSoloArcanist, resSoloDevout };
}

if (process.argv[1]?.endsWith('calibrate_raid_150.ts')) {
  runCalibration();
}
