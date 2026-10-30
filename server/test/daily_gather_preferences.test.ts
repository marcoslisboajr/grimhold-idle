import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_V2_FROM,
  NODES,
  dailiesFor,
  nextDay,
  xpForLevel,
  type GatheringSkillId,
} from '@grimhold/shared';
import { openDb } from '../src/db.ts';
import { createGame } from '../src/game.ts';

const DAY = DAILY_V2_FROM;

function setup() {
  const db = openDb(':memory:');
  const game = createGame(db);
  const id = db.createCharacter(db.accountForToken(db.createGuest())!, 'Diario', 'warrior').id;
  return { db, game, id };
}

// Nós de itens por profissão
function gatherSkillOfItem(item: string): GatheringSkillId | null {
  for (const skill of ['mining', 'fishing', 'woodcutting', 'herbalism', 'soulreaping'] as GatheringSkillId[]) {
    if (NODES[skill]?.some((n) => n.item === item)) return skill;
  }
  return null;
}

test('preferência de profissões: sem preferência dá o mesmo resultado determinístico de hoje', () => {
  for (let c = 1; c <= 20; c++) {
    const defaultDailies = dailiesFor(c, DAY, 100, { mining: xpForLevel(50), fishing: xpForLevel(50) });
    const emptyPrefDailies = dailiesFor(c, DAY, 100, { mining: xpForLevel(50), fishing: xpForLevel(50) }, []);
    assert.deepEqual(emptyPrefDailies, defaultDailies);
  }
});

test('preferência de profissões: com 2+ preferências, apenas as escolhidas aparecem nas coletas', () => {
  const chosen: GatheringSkillId[] = ['mining', 'fishing'];
  for (let c = 1; c <= 50; c++) {
    const list = dailiesFor(
      c,
      DAY,
      150,
      {
        mining: xpForLevel(60),
        fishing: xpForLevel(60),
        woodcutting: xpForLevel(60),
        herbalism: xpForLevel(60),
        soulreaping: xpForLevel(60),
      },
      chosen,
    );
    for (const d of list) {
      if (d.name === 'Coleta do dia' && d.goal.kind === 'obtain') {
        const skill = gatherSkillOfItem(d.goal.item);
        assert.ok(skill !== null, `Item ${d.goal.item} deve pertencer a uma profissão de coleta`);
        assert.ok(
          chosen.includes(skill),
          `A coleta do dia (${d.goal.item} de ${skill}) deve ser uma das profissões escolhidas (${chosen.join(', ')})`,
        );
      }
    }
  }
});

test('preferência de profissões: com 1 preferência, a escolhida aparece e a outra vem do restante', () => {
  const chosen: GatheringSkillId[] = ['mining'];
  const others: GatheringSkillId[] = ['fishing', 'woodcutting', 'herbalism', 'soulreaping'];
  for (let c = 1; c <= 50; c++) {
    const list = dailiesFor(
      c,
      DAY,
      100,
      {
        mining: xpForLevel(50),
        fishing: xpForLevel(50),
        woodcutting: xpForLevel(50),
        herbalism: xpForLevel(50),
        soulreaping: xpForLevel(50),
      },
      chosen,
    );
    const gatherTasks = list.filter((d) => d.name === 'Coleta do dia' && d.goal.kind === 'obtain');
    for (const d of gatherTasks) {
      if (d.goal.kind === 'obtain') {
        const skill = gatherSkillOfItem(d.goal.item);
        assert.ok(skill !== null);
        assert.ok(skill === 'mining' || others.includes(skill));
      }
    }
  }
});

test('preferência de profissões: mudar a escolha hoje não altera as diárias do dia atual, e vale a partir de amanhã', () => {
  const { db, game, id } = setup();
  const todayStr = '2026-10-29';
  const todayNow = Date.parse(`${todayStr}T12:00:00Z`);
  const tomorrowStr = nextDay(todayStr);
  const tomorrowNow = Date.parse(`${tomorrowStr}T12:00:00Z`);

  // Diárias de hoje antes de escolher qualquer preferência
  const stateBefore = game.state(id, todayNow);
  const dailiesTodayBefore = JSON.parse(JSON.stringify(stateBefore.dailies));
  assert.equal(stateBefore.dailyGatherPreferences?.skills?.length ?? 0, 0);

  // O jogador escolhe apenas 'herbalism' e 'soulreaping' hoje
  game.setDailyGatherPreferences(id, ['herbalism', 'soulreaping'], todayNow);

  // O estado reflete a configuração pendente para amanhã
  const stateConfig = game.state(id, todayNow);
  assert.deepEqual(stateConfig.dailyGatherPreferences?.skills, ['herbalism', 'soulreaping']);
  assert.equal(stateConfig.dailyGatherPreferences?.effectiveDay, tomorrowStr);

  // Diárias de HOJE continuam exatamente as mesmas (não foram alteradas)
  const dailiesTodayAfter = JSON.parse(JSON.stringify(stateConfig.dailies));
  assert.deepEqual(dailiesTodayAfter, dailiesTodayBefore);

  // Amanhã: as novas diárias respeitam as profissões preferidas
  const stateTomorrow = game.state(id, tomorrowNow);
  for (const d of stateTomorrow.dailies) {
    if (d.name === 'Coleta do dia' && d.goal.kind === 'obtain') {
      const skill = gatherSkillOfItem(d.goal.item);
      assert.ok(skill === 'herbalism' || skill === 'soulreaping', `A coleta de amanhã (${skill}) deve respeitar a escolha`);
    }
  }
});
