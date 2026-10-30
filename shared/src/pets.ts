import type { Bonus, SkillId } from './skills.ts';

export interface PetDef {
  id: string;
  name: string;
  /** Skill que ganha +50% de XP. Mascote cosmético (loja de evento) não tem. */
  skill?: SkillId;
  /** Mascote da loja do Dia das Crianças (comprado com doces, sem bônus). */
  kids?: boolean;
  /** Mascote da loja de Halloween (comprado com doces de Halloween, sem bônus). */
  halloween?: boolean;
  /** Mascote da Loja de Votos (comprado com Moedas de Voto, sem bônus). */
  vote?: boolean;
  description: string;
  /** Recompensa de evento (não cai treinando). */
  event?: boolean;
  /** Loot a mais nas caçadas (0.15 = +15%). */
  loot?: number;
  /** Mascote de combate: o bônus vale só com ele equipado (1 por vez). */
  combat?: Partial<Bonus>;
  /** De onde vem o mascote de combate (texto da tela). */
  source?: string;
  /** Arquivo em public/assets/pets/<sprite>.png */
  sprite: string;
}

export const PET_XP_BONUS = 0.5; // +50% de XP: vale para todo mascote que o personagem tem (não precisa equipar)
export const PET_DROP_CHANCE = 1 / 250_000;
/** Mascote do Slayer: chance por abate da tarefa (o Slayer mata bem menos que as ações de profissão). */
export const SLAYER_PET = 'pet_slayer_skull';
export const SLAYER_PET_CHANCE = 1 / 50_000; // ~1 em 250.000 ações (1/50.000 saía em poucos dias)

export const PETS: PetDef[] = [
  {
    id: 'pet_jewelcrafting_spark',
    name: 'Centelha Lapidada',
    skill: 'jewelcrafting',
    description: 'O brilho de uma gema perfeita que se recusou a ficar presa no anel. Concede +50% de XP em Joalheria.',
    sprite: 'pet_jewelcrafting_spark',
  },
  {
    id: 'pet_mining_golem',
    name: 'Goleminho de Pedra',
    skill: 'mining',
    description: 'Uma rocha viva entalhada por forças arcanas das cavernas mais profundas do Grimhold. Concede +50% de XP em Mineração.',
    sprite: 'pet_mining_golem',
  },
  {
    id: 'pet_smithing_fire',
    name: 'Chama da Forja',
    skill: 'smithing',
    description: 'Um espírito elemental de fogo nascido das brasas e do calor da bigorna. Concede +50% de XP em Ferraria.',
    sprite: 'pet_smithing_fire',
  },
  {
    id: 'pet_woodcutting_treant',
    name: 'Brotinho Ancestral',
    skill: 'woodcutting',
    description: 'Uma muda consciente dos antigos ents guardiões das matas. Concede +50% de XP em Lenhador.',
    sprite: 'pet_woodcutting_treant',
  },
  {
    id: 'pet_herbalism_fairy',
    name: 'Fada Silvestre',
    skill: 'herbalism',
    description: 'Uma fadinha alada mágica que abençoa as ervas e colheitas da natureza. Concede +50% de XP em Herbalismo.',
    sprite: 'pet_herbalism_fairy',
  },
  {
    id: 'pet_fishing_water',
    name: 'Espírito das Marés',
    skill: 'fishing',
    description: 'Uma criatura líquida ancestral que emerge das correntes e profundezas oceânicas. Concede +50% de XP em Pesca.',
    sprite: 'pet_fishing_water',
  },
  {
    id: 'pet_runecraft_spark',
    name: 'Centelha Arcana',
    skill: 'runecraft',
    description: 'Uma emanação viva de puro fluxo de mana concentrada nos altares místicos. Concede +50% de XP em Criação de Runas.',
    sprite: 'pet_runecraft_spark',
  },
  {
    id: 'pet_cooking_slime',
    name: 'Slime Gelatinoso',
    skill: 'cooking',
    description: 'Uma geleia viva comilona que adora o cheiro de ensopados e assados no caldeirão. Concede +50% de XP em Culinária.',
    sprite: 'pet_cooking_slime',
  },
  {
    id: 'pet_alchemy_bubble',
    name: 'Essência Borbulhante',
    skill: 'alchemy',
    description: 'Um espírito verde que escapou de um caldeirão e nunca mais parou de borbulhar. Concede +50% de XP em Alquimia.',
    sprite: 'pet_alchemy_bubble',
  },
  {
    id: 'pet_soulreaping_ghost',
    name: 'Fantasminha',
    skill: 'soulreaping',
    description: 'Uma alma perdida que gostou de você e resolveu ficar. Concede +50% de XP em Colheita de Almas.',
    sprite: 'pet_soulreaping_ghost',
  },
  {
    id: 'pet_sigilism_gargoyle',
    name: 'Gárgula Rúnica',
    skill: 'sigilism',
    description: 'Uma gárgula de pedra que ganhou vida quando alguém traçou o sigilo errado. Concede +50% de XP em Sigilismo.',
    sprite: 'pet_sigilism_gargoyle',
  },
  {
    id: 'pet_fletching_owl',
    name: 'Coruja Flecheira',
    skill: 'fletching',
    description: 'Uma coruja que deixa cair as melhores penas bem onde você precisa. Concede +50% de XP em Criação de Flechas.',
    sprite: 'pet_fletching_owl',
  },
  {
    id: 'pet_slayer_skull',
    name: 'Caveira Sombria',
    skill: 'slayer',
    description: 'Uma caveira em chamas roxas que segue quem caça sem descanso. Cai das tarefas de Slayer. Concede +50% de XP de Slayer.',
    sprite: 'pet_slayer_skull',
  },
  {
    id: 'pet_crafting_bee',
    name: 'Abelha Artesã',
    skill: 'crafting',
    description: 'Uma abelha caprichosa que não deixa um ponto de costura torto. Concede +50% de XP em Artesanato.',
    sprite: 'pet_crafting_bee',
  },
];

// Mascotes do Dia das Crianças: só enfeite, comprados com doces na aba Mascotes.
const KIDS_PETS: [string, string, string][] = [
  ['mush_purple', 'Cogumelinho Roxo', 'Um cogumelinho tímido que solta esporos brilhantes quando fica feliz.'],
  ['mush_red', 'Cogumelinho Vermelho', 'Pula atrás de você o dia inteiro. Ninguém sabe se é venenoso; ninguém quer testar.'],
  ['flower', 'Florzinha Dançante', 'Uma flor que aprendeu a andar e não parou mais de dançar.'],
  ['bulb', 'Bulbinho', 'Um bulbo emburrado que só sorri quando chove.'],
  ['crab', 'Caranguejinho', 'Anda de lado, belisca de leve e jura que é perigoso.'],
  ['turtle', 'Tartaruguinha', 'Chega sempre atrasada, mas chega.'],
  ['octopus', 'Polvinho', 'Oito bracinhos e todos querem abraço.'],
  ['lizard', 'Lagartixa', 'Fugiu de um pântano e decidiu que você é a família dela agora.'],
  ['snake', 'Cobrinha', 'Sibila "oi". Só sabe essa palavra.'],
  ['slime', 'Gelatina de Morango', 'Prima rosa do slime da cozinha. Tem cheiro de doce.'],
];
for (const [key, name, description] of KIDS_PETS) {
  PETS.push({ id: `pet_kids_${key}`, name, description, sprite: `pet_kids_${key}`, kids: true });
}

PETS.push({
  id: 'pet_vote_phoenix',
  name: 'Fênix Votante',
  description: 'Uma fenixzinha que renasce a cada voto. Só existe na Loja de Votos.',
  sprite: 'pet_vote_phoenix',
  vote: true,
});

// Último Mímico do Dia das Crianças (14/10): quem ajudou a derrubar o Mímico Rei ganha o filhote.
// Mascote do Evento de Halloween: comprado na loja do Jack com doces de Halloween.
PETS.push({
  id: 'pet_halloween_bat',
  name: 'Morceguinho',
  description: 'Um morceguinho travesso que adora a noite das bruxas. Voa ao seu redor buscando doces.',
  sprite: 'pet_halloween_bat',
  halloween: true,
});
PETS.push({
  id: 'pet_halloween_ghost',
  name: 'Fantasma Tímido',
  description: 'Um fantasminha tímido que só aparece na noite das bruxas. Diz "buu" baixinho para não assustar ninguém.',
  sprite: 'pet_halloween_ghost',
  halloween: true,
});
PETS.push({
  id: 'pet_halloween_mummy',
  name: 'Múmia',
  description: 'Uma múmia pequenina que fugiu da tumba. Vai deixando faixas soltas pelo caminho.',
  sprite: 'pet_halloween_mummy',
  halloween: true,
});

PETS.push({
  id: 'pet_mimic',
  name: 'Mimiquinho',
  description: 'O filhote do Mímico Rei, que não quis voltar para dentro do baú. Fareja tesouro: +15% de loot nas caçadas.',
  sprite: 'pet_mimic',
  event: true,
  loot: 0.15,
});

/** Profissões com bônus de mascote: todo mascote que o personagem tem vale, equipado ou não. */
export const petSkillsOf = (owned: readonly string[]): SkillId[] => owned.flatMap((id) => (petById(id)?.skill ? [petById(id)!.skill!] : []));
/** Loot a mais nas caçadas pelos mascotes que o personagem tem. */
export const petLootOf = (owned: readonly string[]): number => owned.reduce((n, id) => n + (petById(id)?.loot ?? 0), 0);

export function petById(id: string): PetDef | undefined {
  return PETS.find((p) => p.id === id);
}

export function petForSkill(skill: SkillId): PetDef | undefined {
  return PETS.find((p) => !p.kids && !p.vote && !p.event && p.skill === skill);
}

// ── Mascotes de combate (24/10) ────────────────────────────────────────────
// Caem de chefes; o bônus é pequeno e vale só com o mascote equipado (um por vez).
export const COMBAT_PET_LAIR_CHANCE = 1 / 3000; // por vitória de covil
export const COMBAT_PET_BOSS_CHANCE = 1 / 400; // por participante quando o chefe mundial cai

const combatPet = (id: string, name: string, description: string, combat: Partial<Bonus>, source: string): PetDef => ({ id, name, description, combat, source, sprite: id });
export const COMBAT_PETS: PetDef[] = [
  combatPet('pet_wolf_cub', 'Lobinho', 'Um filhote de lobo que morde o calcanhar de quem se aproxima. Equipado: +4% de ataque.', { attackPct: 0.04 }, 'Covis até o nível 100'),
  combatPet('pet_stone_turtle', 'Tartaruguinha de Pedra', 'Casco duro e paciência infinita. Equipada: +4% de defesa e +2% de vida.', { defensePct: 0.04, hpPct: 0.02 }, 'Covis do 101 ao 250'),
  combatPet('pet_blood_bat', 'Morcego Sanguíneo', 'Bebe um gole de cada inimigo e devolve a você. Equipado: +1% de roubo de vida.', { lifesteal: 0.01 }, 'Covis do 251 ao 375'),
  combatPet('pet_healing_wisp', 'Fogo-fátuo Curandeiro', 'Uma chama verde que fecha as feridas. Equipado: +4% de regeneração e +2% de mana.', { regen: 0.04, mana: 0.02 }, 'Covis do 376 em diante'),
  combatPet('pet_ancient_whelp', 'Dragãozinho Ancestral', 'A cria da Cria: pequeno, mas cospe fogo de verdade. Equipado: +6% de ataque.', { attackPct: 0.06 }, 'Cria do Dragão Ancestral (chefe global)'),
  combatPet('pet_kraken_spawn', 'Krakenzinho', 'Oito bracinhos para segurar o escudo. Equipado: +6% de vida e +3% de defesa.', { hpPct: 0.06, defensePct: 0.03 }, 'Cria do Kraken Abissal (chefe global)'),
  combatPet('pet_sylveth_cub', 'Filhote de Sylveth', 'Um lobinho da floresta encantada que acha o ponto fraco do inimigo. Equipado: +3% de crítico e +6% de dano crítico.', { crit: 0.03, critMult: 0.06 }, 'Avatar de Sylveth (chefe global)'),
  combatPet('pet_little_lich', 'Liche Mirim', 'Um aprendiz de liche com mais vontade que poder. Equipado: +3% de ataque e +3% de mana.', { attackPct: 0.03, mana: 0.03 }, 'Sombra do Rei Lich (chefe global)'),
];
PETS.push(...COMBAT_PETS);

/** Mascote de combate de cada chefe mundial. */
export const WORLD_BOSS_COMBAT_PETS: Record<string, string> = {
  ancient_dragon: 'pet_ancient_whelp',
  abyssal_kraken: 'pet_kraken_spawn',
  sylveth_avatar: 'pet_sylveth_cub',
  lich_king: 'pet_little_lich',
};

/** Mascote de combate que um covil desse nível pode soltar. */
export function lairCombatPet(level: number): string {
  return level <= 100 ? 'pet_wolf_cub' : level <= 250 ? 'pet_stone_turtle' : level <= 375 ? 'pet_blood_bat' : 'pet_healing_wisp';
}

export const isCombatPet = (id: string | null | undefined): boolean => !!id && !!petById(id)?.combat;

/** Soma o bônus do mascote de combate equipado ao bônus do personagem. */
export function withCombatPet(bonus: Bonus, petId: string | null | undefined): Bonus {
  const combat = petId ? petById(petId)?.combat : undefined;
  if (!combat) return bonus;
  const out: Bonus = { ...bonus };
  for (const [k, v] of Object.entries(combat) as [keyof Bonus, number][]) (out as Record<string, number>)[k] = Number((((bonus as Record<string, number>)[k] ?? 0) + v).toFixed(6));
  return out;
}
