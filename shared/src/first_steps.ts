/**
 * Primeiros passos: onze metas para os primeiros ~30 minutos (caçar, profissões, Bestiário, quests e chefes), cada uma com recompensa.
 * A meta se cumpre pelo que o personagem já tem (skills, equipamento, contadores); o resgate fica
 * guardado nos contadores como `first_<id>` = 1, então cada recompensa sai uma vez só.
 */
import { levelForXp, type EquipSlot, type SkillId } from './skills.ts';

export interface FirstStepView {
  skills: Partial<Record<SkillId, number>>;
  equipment: Partial<Record<EquipSlot, string>>;
  stats: Partial<Record<string, number>>;
  charms?: { id: string; monster: string | null }[];
  prey?: { monster: string | null }[];
}

export interface FirstStep {
  id: string;
  name: [string, string];
  /** O que fazer e onde clicar. */
  hint: [string, string];
  reward: { gold: number; items?: Record<string, number> };
  done: (v: FirstStepView) => boolean;
}

const lv = (v: FirstStepView, s: SkillId) => levelForXp(v.skills[s] ?? 0, s);

export const FIRST_STEPS: FirstStep[] = [
  {
    id: 'weapon', name: ['Arme-se', 'Arm yourself'],
    hint: ['Abra o Personagem e equipe uma arma da mochila.', 'Open Character and equip a weapon from your bag.'],
    reward: { gold: 50 }, done: (v) => !!v.equipment.weapon,
  },
  {
    id: 'hunt', name: ['Primeira caçada', 'First hunt'],
    hint: ['Em Caçar, escolha a Margem do Rio ou os Porões da Cidade e derrote 10 monstros.', 'In Hunt, pick River Bank or City Cellars and defeat 10 monsters.'],
    reward: { gold: 100, items: { cooked_shrimp: 10 } }, done: (v) => (v.stats.kills ?? 0) >= 10,
  },
  {
    id: 'level5', name: ['Nível 5', 'Level 5'],
    hint: ['Continue caçando. Com o jogo fechado, o herói segue sozinho.', 'Keep hunting. Even with the game closed, your hero keeps going.'],
    reward: { gold: 200 }, done: (v) => lv(v, 'combat') >= 5,
  },
  {
    id: 'mine', name: ['Mão na picareta', 'Pick up the pickaxe'],
    hint: ['Em Profissões, minere cobre até o nível 3 de Mineração.', 'In Professions, mine copper until Mining level 3.'],
    reward: { gold: 150 }, done: (v) => lv(v, 'mining') >= 3,
  },
  {
    id: 'smith', name: ['Primeira barra', 'First bar'],
    hint: ['Em Profissões > Forja, derreta cobre e estanho em barras de bronze. Barras viram armas e armaduras no Artesanato e na Ferraria.', 'In Professions > Smithing, smelt copper and tin into bronze bars. Bars become weapons and armor in Crafting and Smithing.'],
    reward: { gold: 150 }, done: (v) => (v.skills.smithing ?? 0) > 0,
  },
  {
    id: 'cook', name: ['Comida no fogo', 'Food on the fire'],
    hint: ['Pesque camarões e cozinhe na Culinária: comida cura na caçada.', 'Fish shrimp and cook them: food heals you while hunting.'],
    reward: { gold: 150 }, done: (v) => (v.skills.cooking ?? 0) > 0,
  },
  {
    id: 'quest', name: ['Primeira quest', 'First quest'],
    hint: ['Fale com os NPCs da cidade e entregue uma quest.', 'Talk to the town NPCs and turn in a quest.'],
    reward: { gold: 300 }, done: (v) => (v.stats.quests ?? 0) >= 1,
  },
  {
    id: 'prey', name: ['Escolha uma presa', 'Pick a prey'],
    hint: ['No Bestiário, abra o Prey e escolha uma espécie da sua caçada: ela dá bônus de XP, dano, defesa ou loot só contra essa espécie.', 'In the Bestiary, open Prey and pick a species from your hunt: it gives an XP, damage, defense or loot bonus against that species only.'],
    reward: { gold: 300 }, done: (v) => (v.prey ?? []).some((p) => !!p.monster),
  },
  {
    id: 'charm', name: ['Primeiro charm', 'First charm'],
    hint: ['Cada espécie completada no Bestiário dá pontos de charm. Em Bestiário > Charms, libere um charm (dano extra, defesa, mais loot) e ponha numa espécie.', 'Every species completed in the Bestiary gives charm points. In Bestiary > Charms, unlock a charm (extra damage, defense, more loot) and set it on a species.'],
    reward: { gold: 400 }, done: (v) => (v.charms ?? []).length > 0,
  },
  {
    id: 'boss', name: ['Primeiro chefe', 'First boss'],
    hint: ['No nível 15, enfrente a Tecelã Sombria em Chefes (covis).', 'At level 15, face the Shadow Weaver under Bosses (lairs).'],
    reward: { gold: 500 }, done: (v) => (v.stats.bosses ?? 0) >= 1,
  },
  {
    id: 'level20', name: ['Nível 20', 'Level 20'],
    hint: ['Suba ao 20: novas caçadas e chefes se abrem em Caçar.', 'Reach level 20: new hunts and bosses open up in Hunt.'],
    reward: { gold: 1000 }, done: (v) => lv(v, 'combat') >= 20,
  },
];

export const firstStepKey = (id: string) => `first_${id}`;
export const firstStepClaimed = (stats: Partial<Record<string, number>>, id: string) => (stats[firstStepKey(id)] ?? 0) > 0;
/** A próxima meta ainda não resgatada (ou nenhuma: guia terminado). */
export const nextFirstStep = (stats: Partial<Record<string, number>>) => FIRST_STEPS.find((s) => !firstStepClaimed(stats, s.id)) ?? null;
