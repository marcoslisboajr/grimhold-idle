// Balanceamento: XP/h e mortes por vocação, caçada e nível (1 h simulada, 20 sementes).
// Rodar: npx tsx server/scripts/balance.ts
import { HUNTS, simulateHunt, XP_TABLE, equipmentBonus, defaultSpells } from '@grimhold/shared';

const H = 3_600_000;
const gearFor = (lvl: number) =>
  lvl >= 45
    ? equipmentBonus({ helmet: 'abyssal_helmet', armor: 'abyssal_armor', legs: 'abyssal_legs', boots: 'abyssal_boots', shield: 'abyssal_shield', weapon: 'abyssal_sword' })
    : lvl >= 25
    ? equipmentBonus({ helmet: 'steel_helmet', armor: 'steel_armor', legs: 'steel_legs', boots: 'steel_boots', shield: 'steel_shield', weapon: 'steel_sword' })
    : lvl >= 10
    ? equipmentBonus({ helmet: 'iron_helmet', armor: 'iron_armor', legs: 'iron_legs', boots: 'iron_boots', shield: 'iron_shield', weapon: 'iron_sword' })
    : equipmentBonus({ weapon: 'bronze_sword', armor: 'bronze_armor' });

for (const voc of ['warrior', 'hunter', 'arcanist', 'devout']) {
  console.log(voc);
  for (const h of HUNTS) {
    const cells: string[] = [];
    for (const lvl of [h.level, h.level + 4, h.level + 8]) {
      let deaths = 0;
      let xp = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const r = simulateHunt({ skill: 'combat', node: h.id, since: 0, seed, seq: 0 }, H, {
          vocation: voc,
          combatXp: XP_TABLE[lvl],
          bonus: gearFor(lvl),
          spells: process.env.NO_SPELLS ? [] : defaultSpells(voc, lvl),
        });
        if (r.gains.death) deaths++;
        else xp += r.gains.xp.combat ?? 0;
      }
      cells.push(`nv${lvl}: ${deaths}/20 mortes, ${Math.round(xp / Math.max(1, 20 - deaths))} xp/h`);
    }
    console.log(`  ${h.id.padEnd(16)} ${cells.join(' | ')}`);
  }
}
