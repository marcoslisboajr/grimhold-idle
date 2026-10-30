import { HUNTS, playerStats, runCycle, XP_TABLE, equipmentBonus } from '@grimhold/shared';
const hunt = HUNTS.find((h) => h.id === 'general_crypt')!;
const bonus = equipmentBonus({ helmet: 'steel_helmet', armor: 'steel_armor', legs: 'steel_legs', boots: 'steel_boots', shield: 'steel_shield', weapon: 'steel_sword' });
for (const lvl of [32, 40]) {
  const p = playerStats('warrior', XP_TABLE[lvl], bonus);
  for (const seq of [0, 1]) {
    const c = runCycle(hunt, p, 5, seq);
    console.log(lvl, c.monster.id, c.outcome, c.fightMs, 'playerHp', p.hp, 'atk', p.attack.toFixed(0), 'def', p.defense.toFixed(0), 'dmgTaken', c.damageTaken, 'hits', c.hits.length);
  }
}
