import { rngFor, type Fighter } from './combat.ts';
import { itemById, xpForLevel, type EquipSlot } from './skills.ts';
import type { BossBonus } from './bosstiary.ts';
import type { Element } from './elements.ts';

export const BOSS_TOKEN = 'boss_token';
/** Instância da Casca Mortal de Zharvos e a chance do Chapéu do Arquimago por vitória. */
export const ZHARVOS_SANCTUM = 'zharvos_sanctum';
export const ZHARVOS_HAT_CHANCE = 0.008;
export const BOSS_TOKEN_COST = 50;
/** Preço de um item do Colecionador em fichas (as réplicas dos deuses custam muito mais). */
export const bossTokenPrice = (id: string) => itemById(id)?.tokenPrice ?? BOSS_TOKEN_COST;

/** Todos os itens vendidos pelo Colecionador de Troféus por Boss Tokens (peças de sets + bolsas de armas). */
export const BOSS_TOKEN_SHOP_ITEMS: readonly string[] = [
  // Dragão Ancestral
  'ancient_scales', 'ancient_helm',
  // Rei Lich
  'lich_crown', 'lich_boots',
  // Kraken Abissal
  'tide_armor', 'tide_legs',
  // Senhor do Abismo
  'abyss_horns', 'abyss_aegis',
  // Bolsas de armas (50 fichas)
  'ancient_weapon_pouch', 'lich_weapon_pouch', 'kraken_weapon_pouch', 'abyss_weapon_pouch',
  // Réplicas dos sets dos deuses: 80% dos atributos, 250 fichas cada (o drop continua o melhor).
  'replica_kharvos_helm', 'replica_kharvos_armor', 'replica_kharvos_legs', 'replica_kharvos_boots',
  'replica_sylveth_helm', 'replica_sylveth_armor', 'replica_sylveth_legs', 'replica_sylveth_boots',
  'replica_aethon_helm', 'replica_aethon_armor', 'replica_aethon_legs', 'replica_aethon_boots',
  'replica_lumira_helm', 'replica_lumira_armor', 'replica_lumira_legs', 'replica_lumira_boots',
  // Selo da Forja: +15% de chance numa tentativa de +5 a +7.
  'forge_ward',
];

/**
 * Chefe global: de tempos em tempos um chefe aparece para o servidor inteiro.
 * Quem entra luta junto contra a mesma vida (que cresce com o número de
 * jogadores); a recompensa sai pelo dano causado, com chance de um item lendário.
 */
export interface WorldBoss {
  id: string;
  /** Chefe diário de evento (repete várias vezes por dia): não entra no Bosstiary. */
  daily?: boolean;
  /** Traje que todo participante ganha (eventos especiais). */
  outfit?: string;
  /** Mascote que ganha quem bateu nele, se ele cair (eventos especiais). */
  pet?: string;
  /** Addon que cai para UM participante sorteado (quem bateu), se ele cair (eventos especiais). */
  addon?: string;
  /** Golpes próprios do chefe (com aviso na tela), de BOSS_SKILL_SETS. */
  skills?: BossSkill[];
  name: string;
  /** Sprite em public/assets/monsters/<sprite>_N.png. */
  sprite: string;
  defense: number;
  /** Item lendário principal que ele derruba (compatibilidade). */
  legendary: string;
  /** Set lendário completo e bolsa de armas que ele pode derrubar. */
  legendarySet: string[];
  /** Fala do anúncio. */
  shout: string;
  /** Servos que lutam ao lado (aparecem em volta dele e apertam quem está na luta). `shot`: o que cospem (padrão bola de fogo). */
  minions?: { name: string; sprite: string; count: number; shot?: string };
  /** Quanto mais forte ele aperta quem está na luta (1 = normal). */
  pressure?: number;
  /** Segundos do próprio dano que cada lutador soma à vida dele (padrão BOSS_SHARE_SECS). Mais = mais vida e mais recompensa. */
  shareSecs?: number;
  /** Música própria na luta (public/assets/music/<music>.mp3); sem ela, a dos chefes. */
  music?: string;
  /** Loot a mais de quem ajudou a derrubar: cada linha sorteada à parte (chance e quantidade). */
  loot?: { item: string; min: number; max: number; chance: number }[];
  /** Bolsa que cai com chance igual para todos que lutaram (sem contar o dano). */
  bag?: { item: string; chance: number };
  /** Texto do fim da luta: quando cai e quando foge (sem ele, o genérico). */
  ending?: { killedTitle: string; killed: string; fledTitle: string; fled: string };
  /** Avisos na tela antes de ele chegar, como os raids do Tibia (só chefes de evento). */
  /** DOOM (Ghaz'Morath): o grito, a janela do IK e o golpe que cura o chefe (ver BossDoom). */
  doom?: BossDoom;
  warnings?: { beforeMs: number; text: string }[];
}

/**
 * Chance de cada parte da arma divina e de cada peça do set para quem ajudou a derrubar o Avatar
 * (cheia com a parte inteira do dano, metade com pouco). Bem acima do covil (2,5% e 3% por vitória).
 */
export const GOD_PART_CHANCE = 0.01;
export const GOD_ARMOR_CHANCE = 0.005;

// Todos os do revezamento são as versões menores; os nomes cheios ficam para invasões especiais mais fortes.
export const WORLD_BOSSES: WorldBoss[] = [
  {
    id: 'ancient_dragon',
    name: 'Cria do Dragão Ancestral',
    sprite: 'fire_dragon',
    defense: 60,
    legendary: 'ancient_scales',
    legendarySet: ['ancient_scales', 'ancient_helm'],
    shout: 'O céu queima sobre o Bastião: a Cria do Dragão Ancestral despertou!',
    loot: [
      { item: 'ancient_dragon_essence', min: 1, max: 3, chance: 1 },
      { item: 'dragon_scale', min: 3, max: 8, chance: 0.8 },
      { item: 'elemental_dust', min: 2, max: 5, chance: 0.5 },
      { item: 'great_mana_potion', min: 5, max: 15, chance: 0.5 },
      { item: 'doom_rune', min: 5, max: 15, chance: 0.25 },
    ],
  },
  {
    id: 'lich_king',
    name: 'Sombra do Rei Lich',
    sprite: 'lich5',
    defense: 50,
    legendary: 'lich_crown',
    legendarySet: ['lich_crown', 'lich_boots'],
    shout: 'Os mortos se levantam: a Sombra do Rei Lich marcha sobre o Bastião!',
    loot: [
      { item: 'lich_essence', min: 1, max: 3, chance: 1 },
      { item: 'ectoplasm', min: 3, max: 8, chance: 0.8 },
      { item: 'ancient_bone', min: 1, max: 3, chance: 0.5 },
      { item: 'dark_essence', min: 5, max: 15, chance: 0.5 },
      { item: 'sudden_death_rune', min: 5, max: 15, chance: 0.25 },
    ],
  },
  {
    id: 'abyssal_kraken',
    name: 'Cria do Kraken Abissal',
    sprite: 'kraken',
    defense: 55,
    legendary: 'tide_armor',
    legendarySet: ['tide_armor', 'tide_legs'],
    shout: 'As águas tremem: a Cria do Kraken Abissal emergiu do abismo!',
    loot: [
      { item: 'kraken_essence', min: 1, max: 3, chance: 1 },
      { item: 'deep_scale', min: 3, max: 8, chance: 0.8 },
      { item: 'sea_pearl', min: 2, max: 6, chance: 0.5 },
      { item: 'coral', min: 5, max: 12, chance: 0.5 },
      { item: 'great_mana_potion', min: 5, max: 15, chance: 0.3 },
    ],
  },
  {
    id: 'demon_lord',
    name: 'Emissário do Senhor do Abismo',
    sprite: 'demon',
    defense: 65,
    legendary: 'abyss_aegis',
    legendarySet: ['abyss_horns', 'abyss_aegis'],
    shout: 'Uma fenda se abriu no Bastião: o Emissário do Senhor do Abismo chegou!',
    loot: [
      { item: 'abyss_essence', min: 1, max: 3, chance: 1 },
      { item: 'demon_horn', min: 2, max: 5, chance: 0.8 },
      { item: 'sulfur_chunk', min: 3, max: 8, chance: 0.5 },
      { item: 'demon_bone', min: 1, max: 2, chance: 0.35 },
      { item: 'infernal_core', min: 1, max: 1, chance: 0.15 },
    ],
  },
  // Chefes oldschool (inspirados nos clássicos do Tibia), versões menores do revezamento.
  // Os nomes cheios (Ferathos, Ghazrael, a Viúva Ancestral) ficam para as invasões especiais, mais fortes.
  {
    id: 'ferathos_avatar',
    name: 'Avatar de Ferathos',
    sprite: 'ferathos',
    defense: 60,
    legendary: 'ferathos_armor',
    legendarySet: ['ferathos_armor', 'ferathos_boots'],
    shout: 'Uma risada ecoa pelo Bastião: o Avatar de Ferathos surgiu com os seus demônios!',
    // Teleporta e conjura: aperta mais que os outros.
    minions: { name: 'Demônio de Ferathos', sprite: 'demon', count: 4 },
    loot: [
      { item: 'ferathos_essence', min: 1, max: 3, chance: 1 },
      { item: 'void_essence', min: 1, max: 3, chance: 0.6 },
      { item: 'void_shard', min: 1, max: 2, chance: 0.4 },
      { item: 'chaos_robe_cloth', min: 1, max: 1, chance: 0.25 },
      { item: 'great_mana_potion', min: 10, max: 25, chance: 0.6 },
      { item: 'doom_rune', min: 10, max: 25, chance: 0.3 },
    ],
  },
  {
    id: 'ghazrael_herald',
    name: 'Arauto de Ghazrael',
    sprite: 'ghazrael',
    defense: 70,
    legendary: 'ghazrael_helm',
    legendarySet: ['ghazrael_helm', 'ghazrael_legs'],
    shout: 'O portão do inferno se entreabre no Bastião: o Arauto de Ghazrael marcha com a legião!',
    minions: { name: 'Legionário de Ghazrael', sprite: 'demon', count: 8 },
    loot: [
      { item: 'ghazrael_essence', min: 1, max: 3, chance: 1 },
      { item: 'demon_horn', min: 3, max: 6, chance: 0.8 },
      { item: 'demon_bone', min: 2, max: 4, chance: 0.5 },
      { item: 'cursed_iron', min: 2, max: 5, chance: 0.5 },
      { item: 'infernal_core', min: 1, max: 2, chance: 0.3 },
    ],
  },
  {
    id: 'widow_daughter',
    name: 'Filha da Viúva Ancestral',
    sprite: 'old_widow',
    defense: 55,
    legendary: 'old_widow_helm',
    legendarySet: ['old_widow_helm', 'old_widow_armor'],
    shout: 'Teias cobrem os portões do Bastião: a Filha da Viúva Ancestral saiu do ninho!',
    // Veneno: tira vida mesmo entre os golpes.
    pressure: 1.15,
    loot: [
      { item: 'old_widow_essence', min: 1, max: 3, chance: 1 },
      { item: 'spider_silk', min: 15, max: 40, chance: 0.9 },
      { item: 'shadow_claw', min: 1, max: 3, chance: 0.5 },
      { item: 'dark_essence', min: 5, max: 12, chance: 0.5 },
      { item: 'nightmare_dust', min: 1, max: 2, chance: 0.25 },
    ],
  },
  // Deuses do Grimhold (scripts/data/gen_gods.py): o Avatar de cada deus deixa o set dele (como os outros
  // chefes) e as partes da arma divina com bem mais chance que o chefe do covil na aba Chefes.
  {
    id: 'kharvos_avatar',
    name: 'Avatar de Kharvos',
    sprite: 'kharvos_avatar',
    defense: 65,
    legendary: 'kharvos_armor',
    legendarySet: ['kharvos_helm', 'kharvos_armor', 'kharvos_legs', 'kharvos_boots'],
    shout: 'Tambores de guerra sacodem o Bastião: o Avatar de Kharvos, o Senhor da Guerra, desceu para a batalha!',
    minions: { name: 'Campeão de Kharvos', sprite: 'cavaleiro_negro', count: 4 },
    loot: [
      { item: 'kharvos_helm', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'kharvos_armor', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'kharvos_legs', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'kharvos_boots', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'kharvos_blade', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'kharvos_guard', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'kharvos_hilt', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'demon_horn', min: 2, max: 5, chance: 0.6 },
      { item: 'cursed_iron', min: 2, max: 5, chance: 0.5 },
      { item: 'primordial_bar', min: 1, max: 3, chance: 0.35 },
    ],
  },
  {
    id: 'sylveth_avatar',
    name: 'Avatar de Sylveth',
    sprite: 'sylveth_avatar',
    defense: 55,
    legendary: 'sylveth_armor',
    legendarySet: ['sylveth_helm', 'sylveth_armor', 'sylveth_legs', 'sylveth_boots'],
    shout: 'A lua cheia nasce vermelha sobre o Bastião: o Avatar de Sylveth, a Caçadora da Lua, começou a caçada!',
    minions: { name: 'Lobo de Sylveth', sprite: 'lobo', count: 4 },
    loot: [
      { item: 'sylveth_helm', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'sylveth_armor', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'sylveth_legs', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'sylveth_boots', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'sylveth_upper_limb', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'sylveth_lower_limb', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'sylveth_string', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'worldtree_logs', min: 3, max: 8, chance: 0.6 },
      { item: 'dark_feather', min: 1, max: 3, chance: 0.4 },
      { item: 'primordial_soul', min: 1, max: 3, chance: 0.35 },
    ],
  },
  {
    id: 'aethon_avatar',
    name: 'Avatar de Aethon',
    sprite: 'aethon_avatar',
    defense: 60,
    legendary: 'aethon_armor',
    legendarySet: ['aethon_helm', 'aethon_armor', 'aethon_legs', 'aethon_boots'],
    shout: 'Raios rasgam o céu do Bastião: o Avatar de Aethon, o Tecelão de Tempestades, chegou com a tormenta!',
    loot: [
      { item: 'aethon_helm', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'aethon_armor', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'aethon_legs', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'aethon_boots', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'aethon_shaft', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'aethon_storm_eye', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'aethon_crown_of_bolts', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'void_essence', min: 1, max: 3, chance: 0.6 },
      { item: 'elemental_dust', min: 2, max: 5, chance: 0.5 },
      { item: 'great_mana_potion', min: 10, max: 25, chance: 0.5 },
    ],
  },
  {
    id: 'lumira_avatar',
    name: 'Avatar de Lumira',
    sprite: 'lumira_avatar',
    defense: 60,
    legendary: 'lumira_armor',
    legendarySet: ['lumira_helm', 'lumira_armor', 'lumira_legs', 'lumira_boots'],
    shout: 'Uma luz dourada cega o Bastião: o Avatar de Lumira, a Chama Sagrada, desceu para julgar os vivos!',
    loot: [
      { item: 'lumira_helm', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'lumira_armor', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'lumira_legs', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'lumira_boots', min: 1, max: 1, chance: GOD_ARMOR_CHANCE },
      { item: 'lumira_hammer_head', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'lumira_haft', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'lumira_dawn_crest', min: 1, max: 1, chance: GOD_PART_CHANCE },
      { item: 'halo_shard', min: 1, max: 2, chance: 0.4 },
      { item: 'divine_ichor', min: 1, max: 1, chance: 0.25 },
      { item: 'great_mana_potion', min: 10, max: 25, chance: 0.5 },
    ],
  },
];

/**
 * Golpes próprios dos chefes, num relógio fixo a partir do começo da luta (o servidor aplica
 * e a tela mostra o aviso pelo mesmo cálculo; reiniciar o servidor não repete nem pula).
 * at: primeira vez (ms depois do começo); every: de quanto em quanto; ms: quanto dura; warn: aviso antes.
 * Tipos:
 *  - aoe: todos na luta perdem `pct` da vida (a resistência ao `element` diminui);
 *  - immune: o chefe não leva dano enquanto dura;
 *  - stun: um lutador sorteado fica preso `ms` (não bate);
 *  - weaken: todos causam `pct` a menos de dano enquanto dura;
 *  - enrage: o chefe aperta `pct` vezes mais enquanto dura;
 *  - heal: o chefe recupera `pct` da vida máxima.
 */
export interface BossSkill {
  id: string;
  kind: 'aoe' | 'immune' | 'stun' | 'weaken' | 'enrage' | 'heal';
  at: number;
  every: number;
  ms: number;
  warn: number;
  pct?: number;
  element?: Element;
  warnText: string;
  text: string;
}

const sk = (id: string, kind: BossSkill['kind'], at: number, every: number, ms: number, warn: number, pct: number | undefined, element: Element | undefined, warnText: string, text: string): BossSkill => ({
  id, kind, at, every, ms, warn, ...(pct !== undefined ? { pct } : {}), ...(element ? { element } : {}), warnText, text,
});

/** Dois ou três golpes por chefe: cada luta tem um ritmo diferente. */
export const BOSS_SKILL_SETS: Record<string, BossSkill[]> = {
  ancient_dragon: [
    sk('breath', 'aoe', 25_000, 45_000, 3000, 4000, 0.3, 'fire', 'A Cria do Dragão respira fundo...', 'SOPRO DE FOGO! Todos levam 30% de dano de fogo.'),
    sk('fly', 'immune', 50_000, 70_000, 8000, 3000, undefined, undefined, 'A Cria do Dragão abre as asas!', 'VOO! O dragão está no ar: nenhum golpe alcança por 8 s.'),
  ],
  lich_king: [
    sk('death_touch', 'stun', 20_000, 40_000, 8000, 0, undefined, undefined, '', 'TOQUE DA MORTE! Um lutador congelou de medo por 8 s.'),
    sk('tomb_wail', 'aoe', 35_000, 55_000, 3000, 4000, 0.22, 'death', 'A Sombra do Rei Lich ergue o cajado...', 'GRITO DO TÚMULO! Todos levam 22% de dano de morte.'),
  ],
  abyssal_kraken: [
    sk('tentacle', 'stun', 20_000, 35_000, 6000, 0, undefined, undefined, '', 'TENTÁCULOS! Um lutador foi agarrado por 6 s.'),
    sk('tide', 'enrage', 45_000, 60_000, 10_000, 4000, 2, undefined, 'A maré está subindo...', 'MARÉ ALTA! O Kraken bate o dobro por 10 s.'),
  ],
  demon_lord: [
    sk('hellfire', 'aoe', 25_000, 50_000, 3000, 4000, 0.25, 'fire', 'O Emissário junta chamas nas mãos...', 'CHAMA INFERNAL! Todos levam 25% de dano de fogo.'),
    sk('abyss_shield', 'immune', 40_000, 70_000, 10_000, 3000, undefined, undefined, 'Um escudo escuro cobre o Emissário!', 'ESCUDO DO ABISMO! Nenhum golpe entra por 10 s.'),
  ],
  ferathos_avatar: [
    sk('arcane_storm', 'aoe', 20_000, 45_000, 3000, 4000, 0.25, 'energy', 'O Avatar de Ferathos carrega energia...', 'TEMPESTADE ARCANA! Todos levam 25% de dano de energia.'),
    sk('teleport', 'immune', 30_000, 55_000, 6000, 3000, undefined, undefined, 'O Avatar de Ferathos some num clarão!', 'TELEPORTE! Ele sumiu: nenhum golpe alcança por 6 s.'),
  ],
  ghazrael_herald: [
    sk('war_cry', 'enrage', 30_000, 60_000, 12_000, 4000, 1.8, undefined, 'O Arauto de Ghazrael enche o peito...', 'GRITO DE GUERRA! A legião aperta 80% mais por 12 s.'),
    sk('charge', 'stun', 15_000, 40_000, 5000, 0, undefined, undefined, '', 'INVESTIDA! Um lutador foi derrubado por 5 s.'),
  ],
  widow_daughter: [
    sk('web', 'weaken', 30_000, 60_000, 12_000, 4000, 0.5, undefined, 'A Filha da Viúva tece fios no ar...', 'TEIA! Todos causam metade do dano por 12 s.'),
    sk('venom', 'aoe', 20_000, 45_000, 3000, 4000, 0.2, 'earth', 'Veneno pinga das presas...', 'VENENO! Todos levam 20% de dano de terra.'),
  ],
  kharvos_avatar: [
    sk('fury', 'enrage', 40_000, 70_000, 15_000, 4000, 1.8, undefined, 'O Avatar de Kharvos ruge de raiva...', 'FÚRIA DE KHARVOS! Ele aperta 80% mais por 15 s.'),
    sk('crush', 'stun', 20_000, 45_000, 5000, 0, undefined, undefined, '', 'GOLPE ESMAGADOR! Um lutador foi atordoado por 5 s.'),
  ],
  sylveth_avatar: [
    sk('howl', 'aoe', 25_000, 45_000, 3000, 4000, 0.2, 'earth', 'O Avatar de Sylveth chama a matilha...', 'UIVO DA MATILHA! Todos levam 20% de dano.'),
    sk('forest_heal', 'heal', 55_000, 80_000, 3000, 4000, 0.03, undefined, 'O Avatar de Sylveth recua para as árvores...', 'FUGA À FLORESTA! Ele recuperou 3% da vida.'),
  ],
  aethon_avatar: [
    sk('lightning', 'aoe', 20_000, 40_000, 3000, 4000, 0.28, 'energy', 'O céu escurece sobre o Avatar de Aethon...', 'RAIO! Todos levam 28% de dano de energia.'),
    sk('static', 'weaken', 50_000, 70_000, 10_000, 3000, 0.5, undefined, 'O ar fica carregado de estática...', 'CARGA ESTÁTICA! Todos causam metade do dano por 10 s.'),
  ],
  lumira_avatar: [
    sk('blinding_light', 'weaken', 30_000, 60_000, 10_000, 4000, 0.5, undefined, 'O Avatar de Lumira brilha cada vez mais...', 'LUZ CEGANTE! Todos causam metade do dano por 10 s.'),
    sk('blessing', 'heal', 50_000, 75_000, 3000, 4000, 0.03, undefined, 'O Avatar de Lumira começa uma prece...', 'BÊNÇÃO DE LUMIRA! Ela recuperou 3% da vida.'),
  ],
  zharvos: [
    sk('arcane_storm', 'aoe', 25_000, 45_000, 3000, 4000, 0.22, 'energy', 'Zharvos ergue o cajado e o céu do Bastião fica roxo...', 'TEMPESTADE ARCANA! Todos levam 22% de dano de energia.'),
    sk('blink', 'immune', 50_000, 70_000, 6000, 3000, undefined, undefined, 'Zharvos começa a sumir no ar...', 'TELEPORTE! Zharvos sumiu: nenhum golpe entra por 6 s.'),
    sk('mana_drain', 'heal', 70_000, 90_000, 3000, 4000, 0.02, undefined, 'Zharvos puxa a magia de todos para si...', 'DRENO DE MANA! Zharvos recuperou 2% da vida.'),
  ],
  ghazmorath: [
    sk('grave_chill', 'aoe', 30_000, 50_000, 3000, 4000, 0.18, 'death', "Ghaz'Morath sussurra o nome de cada um...", 'FRIO DO TÚMULO! Todos levam 18% de dano de morte.'),
    sk('bone_cage', 'stun', 45_000, 60_000, 6000, 0, undefined, undefined, '', 'GAIOLA DE OSSOS! Um lutador ficou preso por 6 s.'),
  ],
  malgoroth: [
    sk('darkness', 'aoe', 25_000, 45_000, 3000, 4000, 0.25, 'death', 'Malgoroth puxa as trevas para si...', 'TREVAS! Todos levam 25% de dano de morte.'),
    sk('pact', 'heal', 60_000, 120_000, 3000, 4000, 0.02, undefined, 'Malgoroth chama os servos para um pacto...', 'PACTO SOMBRIO! Ele recuperou 2% da vida.'),
  ],
  headless_horseman: [
    sk('scythe_sweep', 'aoe', 28_000, 48_000, 3000, 4000, 0.25, undefined, 'O Cavaleiro Sem Cabeça gira a lâmina espectral... protejam-se!', 'GOLPE DA NOITE! Todos levam 25% de dano.'),
    sk('spectral_flame', 'immune', 55_000, 80_000, 6000, 3000, undefined, undefined, 'Chamas espectrais azuis cobrem o Cavaleiro!', 'ESCUDO ESPECTRAL! Nenhum golpe entra por 6 s.'),
    sk('headless_fear', 'stun', 38_000, 58_000, 5000, 0, undefined, undefined, '', 'O Cavaleiro soltou uma gargalhada sobrenatural! Um lutador ficou atordoado por 5 s.'),
  ],
  mimic_king: [
    sk('coin_rain', 'aoe', 30_000, 50_000, 3000, 4000, 0.25, undefined, 'O Mímico Rei enche a boca de moedas... protejam-se!', 'CHUVA DE MOEDAS! Todos levam 25% de dano.'),
    sk('lid', 'immune', 55_000, 75_000, 8000, 3000, undefined, undefined, 'O Mímico Rei vai fechar a tampa!', 'TAMPA FECHADA! Nenhum golpe entra por 8 s.'),
    sk('swallow', 'stun', 40_000, 60_000, 6000, 0, undefined, undefined, '', 'O Mímico Rei engoliu um lutador! Ele volta em 6 s.'),
  ],
};

/**
 * DOOM (Ghaz'Morath, o Imortal): quando a vida chega a `at[i]` (fração), ele grita `shout` e o time tem
 * `windowMs` para zerar o resto (o IK, com `bonus[i]` a mais na recompensa). Se não der, ele grita
 * DOOM: todos na arena levam `pct` da vida máxima (a resistência a `element` diminui) e ele volta para
 * `back[i]`. Depois do último, morre normal ao chegar a 0.
 */
export interface BossDoom {
  at: number[];
  back: number[];
  bonus: number[];
  windowMs: number;
  /** Quantos DOOMs do começo não aceitam IK (o grito sempre acontece, mesmo zerando a vida). */
  noIk?: number;
  pct: number;
  element: Element;
  shout: string;
  /** Grito dos DOOMs sem IK (`noIk`). */
  firstShout?: string;
  text: string;
  killText: string;
}

/**
 * Um passo do DOOM: com a vida que falta (`left`) e o estado (`stage`, `until` = fim da janela do IK),
 * diz o que acontece agora: nada, abre a janela, IK (morre com bônus), DOOM (cura `heal` de vida)
 * ou morte normal (depois do último DOOM).
 */
export function doomStep(
  doom: BossDoom,
  state: { stage: number; until: number | null },
  left: number,
  maxHp: number,
  now: number,
): { kind: 'none' } | { kind: 'open'; until: number } | { kind: 'ik'; bonus: number } | { kind: 'doom'; heal: number } | { kind: 'dead' } {
  if (state.stage >= doom.at.length) return left <= 0 ? { kind: 'dead' } : { kind: 'none' };
  const ikOk = state.stage >= (doom.noIk ?? 0);
  if (state.until !== null) {
    if (left <= 0 && ikOk) return { kind: 'ik', bonus: doom.bonus[state.stage] };
    if (now >= state.until) return { kind: 'doom', heal: Math.max(0, doom.back[state.stage] * maxHp - left) };
    return { kind: 'none' };
  }
  if (left <= doom.at[state.stage] * maxHp) {
    // Passou direto do limite ao zero no mesmo trecho: é IK também.
    if (left <= 0 && ikOk) return { kind: 'ik', bonus: doom.bonus[state.stage] };
    return { kind: 'open', until: now + doom.windowMs };
  }
  return { kind: 'none' };
}

/**
 * Alguém entrou e a vida máxima mudou de `oldMax` para `newMax`: escala o dano de todos e a cura
 * (DOOM, pacto) juntos, para a fração de vida que falta continuar a mesma. Devolve a cura nova.
 * (Escalar só o dano, com a cura parada, devolvia ao chefe a cura dos DOOMs a cada entrada.)
 */
export function rescaleBossHp(damage: Map<number, number>, healed: number, oldMax: number, newMax: number): number {
  if (!(oldMax > 0) || !(newMax > 0) || oldMax === newMax) return healed;
  const scale = newMax / oldMax;
  for (const [id, dmg] of damage) if (dmg > 0) damage.set(id, dmg * scale);
  return healed * scale;
}

/** Quantas vezes o golpe já aconteceu até `now` (-1: ainda não). */
export function bossSkillCount(s: BossSkill, startsAt: number, now: number): number {
  const t = now - startsAt - s.at;
  return t < 0 ? -1 : Math.floor(t / s.every);
}

/** O golpe está valendo agora (dentro da duração dele). */
export function bossSkillActive(s: BossSkill, startsAt: number, now: number): boolean {
  const t = now - startsAt - s.at;
  return t >= 0 && t % s.every < s.ms;
}

/** Aviso para a tela: o golpe que está acontecendo ou vindo. Os instantâneos mostram o texto por 3 s. */
export function bossSkillText(skills: readonly BossSkill[] | undefined, startsAt: number, now: number): { text: string; hit: boolean } | undefined {
  for (const s of skills ?? []) {
    const t = now - startsAt - s.at;
    const shown = s.kind === 'aoe' || s.kind === 'heal' || s.kind === 'stun' ? 3000 : s.ms;
    if (t >= 0 && t % s.every < shown) return { text: s.text, hit: true };
  }
  for (const s of skills ?? []) {
    const t = now - startsAt - s.at;
    const next = t < 0 ? -t : s.every - (t % s.every);
    if (s.warn && next <= s.warn) return { text: s.warnText, hit: false };
  }
  return undefined;
}

/** Chefes que não entram no revezamento: só aparecem em eventos marcados. */
export const SPECIAL_BOSSES: WorldBoss[] = [
  {
    // Cavaleiro Sem Cabeça: Chefe Especial de Halloween (31/10 às 20h e sábados do evento).
    id: 'headless_horseman',
    name: 'Cavaleiro Sem Cabeça',
    sprite: 'headless_horseman',
    defense: 50,
    pressure: 1.4,
    shareSecs: 12 * 60,
    pet: 'pet_halloween_bat',
    minions: { name: 'Abóbora Sinistra', sprite: 'pumpkin_sinister', count: 4 },
    legendary: 'knight_lantern',
    legendarySet: ['knight_lantern'],
    shout: 'O trote de um corcel ecoa nas brumas do Bastião... O CAVALEIRO SEM CABEÇA surgiu brandindo sua lâmina espectral!',
    music: 'malgoroth',
    loot: [
      { item: 'halloween_candy', min: 40, max: 90, chance: 1 },
      { item: 'knight_lantern', min: 1, max: 1, chance: 0.15 },
      { item: 'boss_token', min: 8, max: 20, chance: 1 },
      { item: 'boss_essence', min: 1, max: 2, chance: 0.5 },
    ],
    ending: {
      killedTitle: 'O Cavaleiro Sem Cabeça tombou!',
      killed: 'O cavalo espectral relinchou e desapareceu na névoa, deixando para trás um rastro de doces e tesouros!',
      fledTitle: 'O Cavaleiro Sem Cabeça galopou para a escuridão',
      fled: 'O Cavaleiro ergueu sua lâmina e sumiu nas brumas da noite. Ele retornará em breve!',
    },
  },
  {
    // Halloween: chefe diário (reveza com a Abóbora Gigante). Dá mais Boss Tokens.
    id: 'scarecrow_king',
    daily: true,
    name: 'Rei Espantalho',
    sprite: 'scarecrow_king',
    defense: 45,
    legendary: 'halloween_candy',
    legendarySet: ['halloween_candy'],
    minions: { name: 'Abóbora Assombrada', sprite: 'pumpkin_haunted', count: 3 },
    shout: 'Um chapéu pontudo surgiu no meio da plantação do Bastião... o REI ESPANTALHO acordou! Derrubem ele antes que os corvos levem os doces!',
    shareSecs: 8 * 60,
    loot: [
      { item: 'halloween_candy', min: 30, max: 60, chance: 1 },
      { item: 'boss_token', min: 3, max: 6, chance: 1 },
    ],
    ending: {
      killedTitle: 'O Rei Espantalho caiu!',
      killed: 'A palha voou pela praça e o chapéu rolou até seus pés, cheio de doces e Boss Tokens!',
      fledTitle: 'O Rei Espantalho fugiu',
      fled: 'O Rei Espantalho voltou para a plantação com os doces. Ele volta mais tarde!',
    },
  },
  {
    // Halloween: chefe diário (reveza com o Rei Espantalho). Dá Essência de Chefe.
    id: 'giant_pumpkin',
    daily: true,
    name: 'Abóbora Gigante',
    sprite: 'giant_pumpkin',
    defense: 45,
    legendary: 'halloween_candy',
    legendarySet: ['halloween_candy'],
    shout: 'O chão do Bastião tremeu e uma abóbora enorme brotou, verde de musgo... é a ABÓBORA GIGANTE! Esmaguem ela e colham os doces!',
    shareSecs: 8 * 60,
    loot: [
      { item: 'halloween_candy', min: 30, max: 60, chance: 1 },
      { item: 'boss_essence', min: 1, max: 2, chance: 0.6 },
    ],
    ending: {
      killedTitle: 'A Abóbora Gigante foi esmagada!',
      killed: 'A casca rachou e espalhou sementes, doces e Essência de Chefe para todo mundo que lutou!',
      fledTitle: 'A Abóbora Gigante afundou na terra',
      fled: 'A Abóbora Gigante enterrou as raízes de novo e sumiu com os doces. Volta mais tarde!',
    },
  },
  {
    // Último Mímico do Dia das Crianças (14/10 às 22h): o rei dos baús, dourado, mais forte e no salão do tesouro.
    id: 'mimic_king',
    name: 'Mímico Rei',
    sprite: 'mimic_king',
    defense: 70,
    pressure: 1.5,
    shareSecs: 14 * 60,
    pet: 'pet_mimic',
    minions: { name: 'Baú Mordedor', sprite: 'giant_mimic', count: 4, shot: 'coin_spit' },
    legendary: 'mimic_bag',
    // Uma bolsa de armas de qualquer chefe do revezamento: é o baú do tesouro de todos eles.
    legendarySet: ['ancient_weapon_pouch', 'lich_weapon_pouch', 'kraken_weapon_pouch', 'abyss_weapon_pouch', 'ferathos_pouch', 'ghazrael_pouch', 'old_widow_pouch'],
    shout: 'O chão do Bastião se abriu num salão de ouro... o MÍMICO REI acordou! É o último baú do Dia das Crianças. Derrubem ele e o filhote vem com vocês!',
    music: 'malgoroth',
    loot: [
      { item: 'kids_candy', min: 80, max: 150, chance: 1 },
      { item: 'mimic_bag', min: 1, max: 2, chance: 0.5 },
      { item: 'donut_bag', min: 1, max: 1, chance: 0.25 },
      { item: 'boss_token', min: 10, max: 25, chance: 1 },
    ],
    ending: {
      killedTitle: 'O Mímico Rei caiu!',
      killed: 'A tampa dourada se abriu de vez: ouro, doces e bolsas para todo lado. E um baú pequenininho saiu pulando atrás de cada um que lutou... é o Mimiquinho!',
      fledTitle: 'O Mímico Rei fugiu',
      fled: 'O Mímico Rei fechou a tampa com o tesouro dentro e afundou no chão. O Dia das Crianças acabou...',
    },
    warnings: [
      { beforeMs: 3 * 3600_000, text: 'Um tilintar de moedas vem de baixo da praça... o último Mímico do Dia das Crianças vai ser diferente. Hoje às 22h!' },
      { beforeMs: 3600_000, text: 'O chão da praça brilha dourado. O MÍMICO REI acorda em 1 hora! Quem derrubar ele ganha o pet Mimiquinho.' },
      { beforeMs: 10 * 60_000, text: 'O Mímico Rei está abrindo a tampa! Em 10 minutos, o último baú do Dia das Crianças. Tragam tudo!' },
    ],
  },
  {
    // Dia das Crianças: um baú gigante que cospe doces em quem o derrota.
    id: 'giant_mimic',
    name: 'Mímico Gigante',
    sprite: 'giant_mimic',
    defense: 40,
    legendary: 'kids_candy',
    legendarySet: ['kids_candy'],
    shout: 'Um baú enorme abriu a boca no meio do Bastião... é o Mímico Gigante! Derrotem ele e ele cospe doces!',
    shareSecs: 8 * 60,
    loot: [{ item: 'kids_candy', min: 25, max: 50, chance: 1 }],
    bag: { item: 'mimic_bag', chance: 0.15 },
    ending: {
      killedTitle: 'O Mímico Gigante foi derrotado!',
      killed: 'O baú engasgou, tossiu e cuspiu uma chuva de doces em todo mundo que lutou!',
      fledTitle: 'O Mímico Gigante fugiu',
      fled: 'O Mímico Gigante fechou a tampa com os doces dentro e saiu pulando. Volta mais tarde!',
    },
    warnings: [
      { beforeMs: 3600_000, text: 'Um baú estranho apareceu na praça e está... roncando? O Mímico Gigante acorda em 1 hora!' },
      { beforeMs: 10 * 60_000, text: 'O Mímico Gigante está abrindo a boca! Em 10 minutos ele ataca o Bastião. Venham buscar doces!' },
    ],
  },
  {
    // Invasão: o Imortal. A luta dura 1 hora e ele só cai de vez depois de quatro DOOMs (ou num IK).
    id: 'ghazmorath',
    name: "Ghaz'Morath, o Imortal",
    sprite: 'ghazmorath',
    defense: 90,
    pressure: 1.3,
    // 15 minutos do dano de cada um: com os DOOMs curando, a luta vai longe.
    shareSecs: 15 * 60,
    legendary: 'ghazmorath_armor_warrior',
    legendarySet: ['ghazmorath_helm_warrior', 'ghazmorath_armor_warrior', 'ghazmorath_legs_warrior', 'ghazmorath_boots_warrior', 'ghazmorath_helm_hunter', 'ghazmorath_armor_hunter', 'ghazmorath_legs_hunter', 'ghazmorath_boots_hunter', 'ghazmorath_helm_arcanist', 'ghazmorath_armor_arcanist', 'ghazmorath_legs_arcanist', 'ghazmorath_boots_arcanist', 'ghazmorath_helm_devout', 'ghazmorath_armor_devout', 'ghazmorath_legs_devout', 'ghazmorath_boots_devout'],
    shout: "A terra do Bastião se abre como uma cova. GHAZ'MORATH, O IMORTAL, levantou! Ele não cai como os outros: quando estiver morrendo, acabem com ele rápido!",
    music: 'malgoroth',
    doom: {
      at: [0.1, 0.07, 0.05, 0.03],
      back: [0.7, 0.37, 0.2, 0.1],
      bonus: [0, 1, 0.5, 0.2],
      windowMs: 30_000,
      // O primeiro DOOM sempre vem: ninguém derruba o Imortal antes dele.
      noIk: 1,
      pct: 0.7,
      element: 'death',
      shout: "Ghaz'Morath: \"VOCÊS NÃO PODEM MATAR O QUE JÁ ESTÁ MORTO!\"",
      firstShout: "Ghaz'Morath: \"VOCÊS NÃO PODEM MATAR O QUE JÁ ESTÁ MORTO!\"",
      text: "DOOM! Ghaz'Morath esmagou todos e se refez!",
      killText: "IK! Ghaz'Morath foi derrubado antes do DOOM!",
    },
    loot: [
      { item: 'infernal_core', min: 2, max: 4, chance: 0.8 },
      { item: 'demon_bone', min: 3, max: 6, chance: 0.7 },
      { item: 'halo_shard', min: 1, max: 2, chance: 0.25 },
      { item: 'boss_token', min: 5, max: 12, chance: 1 },
      { item: 'sudden_death_rune', min: 20, max: 40, chance: 0.5 },
      { item: 'great_health_potion', min: 10, max: 20, chance: 0.6 },
      { item: 'great_mana_potion', min: 10, max: 20, chance: 0.6 },
      { item: 'void_essence', min: 1, max: 2, chance: 0.3 },
      { item: 'primordial_soul', min: 1, max: 1, chance: 0.08 },
    ],
    ending: {
      killedTitle: "Ghaz'Morath caiu!",
      killed: 'O Imortal finalmente morreu. Os ossos dele viram pó, e o Bastião guarda o nome de quem o derrubou.',
      fledTitle: "Ghaz'Morath voltou à cova",
      fled: "Uma hora não bastou. Ghaz'Morath riu e afundou na terra... ele vai voltar.",
    },
    warnings: [
      { beforeMs: 11 * 3600_000, text: "INVASÃO HOJE: Ghaz'Morath, o Imortal, levanta no Bastião às 20h, com 1 hora de luta! O set lendário do Imortal (nível 175) só cai dele." },
      { beforeMs: 8 * 3600_000, text: "Faltam 8 horas para Ghaz'Morath, o Imortal (20h)! Dizem que ele não morre como os outros..." },
      { beforeMs: 5 * 3600_000, text: "Ghaz'Morath, o Imortal, chega às 20h (faltam 5 horas)! Quem bater nele quando ele cair ganha a conquista Matador do Imortal." },
      { beforeMs: 3 * 3600_000, text: "Os túmulos do Bastião rangem sozinhos... Ghaz'Morath, o Imortal, levanta em 3 horas!" },
      { beforeMs: 2 * 3600_000, text: "A terra treme e cheira a cova. Ghaz'Morath, o Imortal, chega em 2 horas! Ninguém sabe o que acontece quando ele grita." },
      { beforeMs: 3600_000, text: "Falta 1 hora para Ghaz'Morath! Ele já voltou da cova antes... e vai tentar de novo." },
      { beforeMs: 10 * 60_000, text: "Ghaz'Morath, o Imortal, surge em 10 minutos! A luta dura 1 hora. Preparem-se!" },
    ],
  },
  {
    // Invasão: Zharvos, o Arquimago. Sempre deixa o Chapéu do Arquimago para um participante sorteado.
    id: 'zharvos',
    name: 'Zharvos, o Arquimago',
    sprite: 'zharvos',
    defense: 80,
    pressure: 1.2,
    // 12 minutos do dano de cada um: luta de uns 10 minutos para um servidor cheio.
    shareSecs: 12 * 60,
    addon: 'wizard_hat',
    minions: { name: 'Diabo do Feitiço', sprite: 'hex_fiend', count: 4 },
    // O set do deus arcano (Aethon): é o tesouro que o Arquimago guarda.
    legendary: 'aethon_helm',
    legendarySet: ['aethon_helm', 'aethon_armor', 'aethon_legs', 'aethon_boots'],
    shout: 'Os sinos param e o ar fica roxo: ZHARVOS, O ARQUIMAGO, abriu um portal no meio do Bastião! Quem derrubar ele pode levar o chapéu...',
    music: 'malgoroth',
    loot: [
      { item: 'arcane_shard', min: 3, max: 6, chance: 0.8 },
      { item: 'infernal_core', min: 1, max: 3, chance: 0.6 },
      { item: 'zharvos_key', min: 1, max: 1, chance: 0.15 },
      { item: 'boss_token', min: 5, max: 12, chance: 1 },
    ],
    ending: {
      killedTitle: 'Zharvos caiu!',
      killed: 'O Arquimago se desfez em faíscas roxas. Só o chapéu dele ficou no chão... e já tem dono.',
      fledTitle: 'Zharvos fechou o portal',
      fled: 'Zharvos riu, guardou o chapéu e sumiu pelo portal. Ele vai voltar.',
    },
    warnings: [
      { beforeMs: 3 * 3600_000, text: 'Os livros da biblioteca do Bastião estão se abrindo sozinhos... Zharvos, o Arquimago, chega em 3 horas!' },
      { beforeMs: 2 * 3600_000, text: 'Faíscas roxas no céu: Zharvos, o Arquimago, chega em 2 horas! Tragam resistência a energia.' },
      { beforeMs: 3600_000, text: 'Falta 1 hora para Zharvos! Quem bater nele quando cair concorre ao Chapéu do Arquimago.' },
      { beforeMs: 10 * 60_000, text: 'Zharvos, o Arquimago, abre o portal em 10 minutos! Preparem-se!' },
    ],
  },
  {
    id: 'malgoroth',
    name: 'Malgoroth, o Senhor Caído',
    // Quem lutou na invasão ganha o traje do Andarilho.
    outfit: 'wanderer',
    sprite: 'malgoroth',
    defense: 70,
    legendary: 'malgoroth_weapon_pouch',
    // A bolsa dá a arma da classe de quem abre (lâmina, besta, cajado ou martelo).
    legendarySet: ['malgoroth_weapon_pouch', 'fallen_shield', 'malgoroth_helm', 'infernal_armor'],
    shout: 'O chão do Bastião racha e a escuridão sobe: Malgoroth, o Senhor Caído, chegou com os seus servos!',
    minions: { name: 'Servo de Malgoroth', sprite: 'malgoroth_minion', count: 4 },
    loot: [
      { item: 'infernal_core', min: 1, max: 3, chance: 0.7 },
      { item: 'demon_bone', min: 2, max: 4, chance: 0.6 },
      { item: 'dark_feather', min: 1, max: 2, chance: 0.35 },
      { item: 'halo_shard', min: 1, max: 1, chance: 0.15 },
    ],
    // 18 minutos do dano de cada um (o normal é 5): o grupo precisa bater quase o evento inteiro.
    shareSecs: 18 * 60,
    music: 'malgoroth',
    ending: {
      killedTitle: 'Malgoroth foi derrotado!',
      killed: 'O Senhor Caído foi banido de volta às trevas. Os servos se desfazem em cinzas e o Bastião respira de novo.',
      fledTitle: 'Malgoroth voltou às trevas',
      fled: 'Malgoroth riu e afundou no abismo com os seus servos. O Bastião não foi forte o bastante... desta vez.',
    },
    warnings: [
      { beforeMs: 3 * 3600_000, text: 'Os sinos do Bastião tocam sozinhos... Malgoroth, o Senhor Caído, desperta em 3 horas!' },
      { beforeMs: 2 * 3600_000, text: 'O céu escurece sobre o Bastião. Malgoroth, o Senhor Caído, chega em 2 horas!' },
      { beforeMs: 3600_000, text: 'A terra treme e os servos de Malgoroth rondam os portões. Falta 1 hora!' },
      { beforeMs: 10 * 60_000, text: 'As trevas tomam o Bastião! Malgoroth, o Senhor Caído, surge em 10 minutos. Preparem-se!' },
    ],
  },
];

// Cada chefe com os seus golpes.
for (const b of [...WORLD_BOSSES, ...SPECIAL_BOSSES]) if (BOSS_SKILL_SETS[b.id]) b.skills = BOSS_SKILL_SETS[b.id];

/** Eventos especiais marcados (fora do horário de sempre). O id não colide com o revezamento. */
export const SPECIAL_BOSS_EVENTS: { id: number; boss: string; startsAt: number; durationMs: number }[] = [
  // 09/10/2026 às 20h30 (Brasília), 30 minutos.
  { id: 1_000_001, boss: 'malgoroth', startsAt: Date.UTC(2026, 9, 9, 23, 30), durationMs: 30 * 60_000 },
  // Ghaz'Morath, o Imortal: sábado 17/10/2026 das 20h às 21h (Brasília), 1 hora.
  { id: 1_000_200, boss: 'ghazmorath', startsAt: Date.UTC(2026, 9, 17, 23, 0), durationMs: 60 * 60_000 },
  // Zharvos, o Arquimago: sábado 24/10/2026 às 20h (Brasília), 30 minutos.
  { id: 1_000_300, boss: 'zharvos', startsAt: Date.UTC(2026, 9, 24, 23, 0), durationMs: 30 * 60_000 },
  // Cavaleiro Sem Cabeça: 31/10 às 20h (Brasília), e sábados do evento (24/10 às 22h, hora par, depois do Zharvos; 31/10 e 07/11 às 20h).
  { id: 1_000_401, boss: 'headless_horseman', startsAt: Date.UTC(2026, 9, 25, 1, 0), durationMs: 30 * 60_000 },
  { id: 1_000_402, boss: 'headless_horseman', startsAt: Date.UTC(2026, 9, 31, 23, 0), durationMs: 30 * 60_000 },
  { id: 1_000_403, boss: 'headless_horseman', startsAt: Date.UTC(2026, 10, 7, 23, 0), durationMs: 30 * 60_000 },
  // Halloween: chefe diário às 12h, 18h e 22h (horas pares; Brasília), 20 minutos, de 24/10 a 08/11, revezando
  // Rei Espantalho e Abóbora Gigante (o primeiro é hoje, 23/10 às 22h). Sem o das 22h de 24/10 (é o Cavaleiro Sem Cabeça).
  ...[Date.UTC(2026, 9, 24, 1, 0), ...Array.from({ length: 16 }, (_, d) => [12, 18, 22].map((h) => Date.UTC(2026, 9, 24 + d, h + 3, 0))).flat()]
    .filter((at) => at !== Date.UTC(2026, 9, 25, 1, 0))
    .map((startsAt, i) => ({ id: 1_000_500 + i, boss: i % 2 === 0 ? 'scarecrow_king' : 'giant_pumpkin', startsAt, durationMs: 20 * 60_000 })),
  // Dia das Crianças: o Mímico Gigante nas horas pares (os chefes de sempre são nas ímpares), 20 minutos.
  // 11/10 às 15h30, 18h e 22h; de 12 a 14/10 às 12h, 18h e 22h (Brasília).
  ...[
    [11, 15, 30], [11, 18, 0], [11, 22, 0],
    [12, 12, 0], [12, 18, 0], [12, 22, 0],
    [13, 12, 0], [13, 18, 0], [13, 22, 0],
    [14, 12, 0], [14, 18, 0], [14, 22, 0],
  ].map(([d, h, m], i, all) =>
    // O último (14/10 às 22h) é o Mímico Rei, com 30 minutos de luta.
    i === all.length - 1
      ? { id: 1_000_100 + i, boss: 'mimic_king', startsAt: Date.UTC(2026, 9, d, h + 3, m), durationMs: 30 * 60_000 }
      : { id: 1_000_100 + i, boss: 'giant_mimic', startsAt: Date.UTC(2026, 9, d, h + 3, m), durationMs: 20 * 60_000 },
  ),
];

/** Nó da atividade de quem está lutando contra o chefe global. */
export const WORLD_BOSS_NODE = 'world_boss';
/** De quanto em quanto tempo aparece e quanto tempo fica. */
export const BOSS_EVERY_MS = 2 * 60 * 60_000;
export const BOSS_DURATION_MS = 15 * 60_000;
/** Tempo antes do fim no qual a entrada é fechada (últimos 3 minutos). */
export const BOSS_JOIN_CUTOFF_MS = 3 * 60_000;
/** Fila do chefe (26/10): nos 5 min antes dele nascer dá para entrar na fila; na hora todos vão para a arena, até offline. */
export const BOSS_QUEUE_MS = 5 * 60_000;
/** Vida do chefe sem ninguém na luta (e régua antiga da recompensa). */
export const BOSS_HP_PER_PLAYER = 30_000;
/**
 * Cada lutador soma à vida do chefe o próprio dano de BOSS_SHARE_SECS segundos:
 * forte soma muito, fraco soma pouco, e a luta dura parecido para todos.
 */
export const BOSS_SHARE_SECS = 300;
/** Mínimo que cada lutador soma (nível bem baixo não deixa o chefe de papel). */
export const BOSS_SHARE_MIN = 3_000;

export interface BossEvent {
  /** Número do evento (muda a cada aparição). */
  id: number;
  boss: WorldBoss;
  startsAt: number;
  endsAt: number;
}

/** O evento em andamento ou o próximo, pelo relógio (os chefes se revezam). */
/**
 * Chefe do evento `id` do revezamento: a cada volta (um evento por chefe) a ordem é embaralhada,
 * então cada um aparece uma vez por volta, mas em horários diferentes a cada dia. O sorteio é
 * fixo pelo número da volta (reiniciar o servidor não troca o chefe) e nunca repete o último da volta anterior.
 */
function rotationOrder(round: number): number[] {
  const n = WORLD_BOSSES.length;
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = rngFor(round, 424_242);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export function rotationBoss(id: number): WorldBoss {
  const n = WORLD_BOSSES.length;
  const round = Math.floor(id / n);
  const order = rotationOrder(round);
  // O primeiro da volta não pode ser o último da volta anterior (o mesmo chefe duas vezes seguidas).
  if (n > 1 && order[0] === rotationOrder(round - 1)[n - 1]) [order[0], order[1]] = [order[1], order[0]];
  return WORLD_BOSSES[order[((id % n) + n) % n]];
}

function regularEventAt(now: number, everyMs: number, durationMs: number): BossEvent & { active: boolean } {
  const id = Math.floor(now / everyMs);
  const startsAt = id * everyMs;
  const active = now < startsAt + durationMs;
  const n = active ? id : id + 1;
  return {
    id: n,
    boss: rotationBoss(n),
    startsAt: n * everyMs,
    endsAt: n * everyMs + durationMs,
    active,
  };
}

/** O evento em andamento ou o próximo: o especial marcado tem prioridade quando está no ar ou vem antes. */
export function bossEventAt(
  now: number,
  everyMs = BOSS_EVERY_MS,
  durationMs = BOSS_DURATION_MS,
  specials = SPECIAL_BOSS_EVENTS,
): BossEvent & { active: boolean } {
  const regular = regularEventAt(now, everyMs, durationMs);
  for (const sp of specials) {
    const boss = SPECIAL_BOSSES.find((b) => b.id === sp.boss);
    if (!boss) continue;
    const ev = { id: sp.id, boss, startsAt: sp.startsAt, endsAt: sp.startsAt + sp.durationMs };
    if (now >= ev.startsAt && now < ev.endsAt) return { ...ev, active: true };
    if (!regular.active && now < ev.startsAt && ev.startsAt < regular.startsAt) return { ...ev, active: false };
  }
  return regular;
}

/** Aviso de raid que passou entre `from` (exclusive) e `to` (inclusive), se houver. */
export function specialBossWarning(from: number, to: number, specials = SPECIAL_BOSS_EVENTS): string | undefined {
  for (const sp of specials) {
    const boss = SPECIAL_BOSSES.find((b) => b.id === sp.boss);
    for (const w of boss?.warnings ?? []) {
      const at = sp.startsAt - w.beforeMs;
      if (at > from && at <= to) return w.text;
    }
  }
  return undefined;
}

/** Um evento pelo número (especial ou do revezamento), para retomar do banco. */
export function bossEventById(id: number, everyMs = BOSS_EVERY_MS, durationMs = BOSS_DURATION_MS): BossEvent {
  const sp = SPECIAL_BOSS_EVENTS.find((e) => e.id === id);
  const boss = sp && SPECIAL_BOSSES.find((b) => b.id === sp.boss);
  if (sp && boss) return { id, boss, startsAt: sp.startsAt, endsAt: sp.startsAt + sp.durationMs };
  return { id, boss: rotationBoss(id), startsAt: id * everyMs, endsAt: id * everyMs + durationMs };
}

/** Dano de um golpe de magia no chefe (já com o crítico médio). */
export function bossSpellHit(player: Fighter, boss: WorldBoss, mult: number): number {
  return Math.round(Math.max(1, player.attack * mult - boss.defense * 0.5) * (1 + (player.critChance ?? 0.05) * 0.5));
}

/**
 * Dano por segundo de um personagem contra o chefe: ataques básicos, buffs pela média
 * e, com `withStrikes`, os golpes de magia pela média (para o tamanho da vida do chefe;
 * na luta eles saem de verdade, um a um).
 */
export function bossDps(player: Fighter, boss: WorldBoss, withStrikes = true): number {
  let atk = player.attack;
  let crit = player.critChance ?? 0.05;
  for (const s of player.spells ?? []) {
    if (s.effect.kind === 'buff') {
      const uptime = Math.min(1, s.effect.durationMs / Math.max(1, s.cooldownMs));
      if (s.effect.attack) atk *= 1 + s.effect.attack * uptime;
      if (s.effect.crit) crit += s.effect.crit * uptime;
    }
  }
  const baseHit = Math.max(1, atk - boss.defense * 0.5);
  const baseDps = (baseHit * (1 + crit * 0.5) * 1000) / player.attackSpeedMs;

  let spellDps = 0;
  for (const s of withStrikes ? (player.spells ?? []) : []) {
    if (s.effect.kind === 'strike') {
      const strikeDmg = Math.max(1, atk * s.effect.mult - boss.defense * 0.5);
      spellDps += (strikeDmg * (1 + crit * 0.5) * 1000) / Math.max(1000, s.cooldownMs);
    }
  }

  return baseDps + spellDps;
}

/** Caído (vida zerou): quanto tempo fica sem bater antes de voltar com a vida cheia. */
export const BOSS_DOWN_MS = 30_000;
/** Fração da vida que o chefe tira por segundo de quem tem a defesa "pelada" do nível. */
export const BOSS_PRESSURE = 0.035;
/** Fração da vida que volta por segundo durante a luta. */
export const BOSS_REGEN = 0.01;
/** A regeneração corta no máximo esta fração da perda: ninguém fica imortal no chefe. */
export const BOSS_REGEN_MAX_CUT = 0.7;
/** Ninguém fica de pé mais que isto seguido (em segundos), por mais defesa que tenha. */
export const BOSS_MAX_ALIVE_SECS = 300;
/** Servos do chefe especial: cada lutador leva uma bola de fogo a cada tanto (ms, em média). */
export const MINION_FIREBALL_MS = 9000;
/** Fração da vida que a bola de fogo tira de quem tem a defesa "pelada" do nível. */
export const MINION_FIREBALL_PCT = 0.06;

/** Defesa em relação à de um personagem sem equipamento do mesmo nível (1 = pelado). */
export function bossArmor(player: Fighter, level: number): number {
  return Math.max(1, player.defense / (level * 0.85 + 5));
}

/** Quanto da vida (0 a 1) uma bola de fogo dos servos tira: a defesa ajuda, mas menos que contra o chefe. */
export function minionFireball(player: Fighter, level: number): number {
  return MINION_FIREBALL_PCT / Math.sqrt(bossArmor(player, level));
}


/**
 * Quanto da vida (fração por segundo, já descontada a regeneração) o personagem
 * perde para o chefe. Mais defesa que a do nível sem equipamento = apanha menos;
 * o devoto perde 30% menos. A regeneração corta até BOSS_REGEN_MAX_CUT da perda e
 * ninguém passa de BOSS_MAX_ALIVE_SECS de pé: sempre cai uma hora. As magias de
 * cura saem de verdade na luta (curam quando a vida baixa), então não entram aqui.
 */
export function bossDrain(player: Fighter, level: number, vocation: string): number {
  const armor = bossArmor(player, level);
  const healMult = vocation === 'devout' ? 0.7 : 1;
  let shieldReduce = 0;
  for (const s of player.spells ?? []) {
    if (s.effect.kind === 'shield') {
      const uptime = Math.min(1, s.effect.durationMs / Math.max(1, s.cooldownMs));
      shieldReduce += s.effect.reduce * uptime;
    }
  }
  const damageTakenMult = Math.max(0.2, 1 - shieldReduce);
  const raw = (BOSS_PRESSURE * healMult * damageTakenMult) / armor;
  return Math.max(raw - BOSS_REGEN, raw * (1 - BOSS_REGEN_MAX_CUT), 1 / BOSS_MAX_ALIVE_SECS);
}

export interface BossReward {
  xp: number;
  gold: number;
  /** Quantidade de Fichas do Chefe ganhas. */
  tokens?: number;
  /** Itens lendários que caíram (peças do set e/ou bolsa de armas). Sem duplicatas no mesmo drop. */
  legendaries?: string[];
  /** Loot a mais (materiais, poções, runas) de quem ajudou a derrubar. */
  loot?: Record<string, number>;
  /** Item lendário principal, se caiu (mantido para compatibilidade). */
  legendary?: string;
  /** Traje ganho por participar (eventos especiais). */
  outfit?: string;
  /** Mascote ganho por derrubar o chefe (eventos especiais). */
  pet?: string;
  /** Addon sorteado entre quem bateu (eventos especiais). */
  addon?: string;
}

/**
 * Recompensa pelo dano: quem causou a parte de um jogador (BOSS_HP_PER_PLAYER)
 * leva meio nível de XP e ouro; o maior dano tem mais chance dos lendários.
 * Derrotar o chefe garante Fichas do Chefe (Boss Tokens) para trocar no Colecionador do Bastião.
 * Se o chefe fugiu (tempo acabou), só um quarto e sem lendário nem fichas.
 */
/**
 * XP do chefe global: fração de um nível de quem bateu (parte inteira = 1; até 1,5 com muito dano).
 * Era 0,5 (até 0,75 nível por luta de ~10 min): no 200+ valia 3 a 4 horas da melhor caçada e
 * compensava ficar offline e entrar só para o chefe (17/10). Agora até ~0,25 nível (~1 hora).
 */
export const BOSS_XP_LEVEL = 0.17;

/**
 * Chefe global mais forte para os níveis baixos (18/10): ×4 até o 120, caindo em linha até ×1 no 150
 * (até ~0,7 nível por luta para quem faz a parte inteira).
 */
export const bossLowLevelXpMult = (combatLevel: number) =>
  combatLevel <= 120 ? 4 : combatLevel >= 150 ? 1 : 4 - (3 * (combatLevel - 120)) / 30;

export function bossReward(
  boss: WorldBoss,
  eventId: number,
  characterId: number,
  combatLevel: number,
  damage: number,
  killed: boolean,
  top: boolean,
  /** Vida que este lutador somou ao chefe: causar isso é a "parte inteira". */
  share: number = BOSS_HP_PER_PLAYER,
  /** Bônus do Bosstiary: mais XP e chance de drop (o lendário recebe só metade). Não muda os sorteios. */
  bonus?: BossBonus,
  /** IK no DOOM (Ghaz'Morath): XP, ouro e chance do lendário a mais (1 = o dobro). */
  ikBonus = 0,
  /** Vocação de quem ganhou: num set com peças por vocação, a peça sorteada é sempre da dela. */
  vocation?: string,
): BossReward {
  if (damage <= 0) return { xp: 0, gold: 0 };
  const lootUp = bonus && Number.isFinite(bonus.loot) ? Math.max(0, Math.min(1, bonus.loot)) : 0;
  const xpUp = bonus && Number.isFinite(bonus.xp) ? Math.max(0, Math.min(1, bonus.xp)) : 0;
  // Quem lutou leva pelo menos um pouco (5% da parte de um jogador), mesmo com pouco dano.
  const part = Math.min(1.5, Math.max(0.05, damage / share)) * (killed ? 1 : 0.25);
  const span = xpForLevel(combatLevel + 1) - xpForLevel(combatLevel);
  // Chefe com mais vida paga na mesma proporção (o esforço por minuto vale igual).
  const scale = (boss.shareSecs ?? BOSS_SHARE_SECS) / BOSS_SHARE_SECS;
  const ik = 1 + (Number.isFinite(ikBonus) ? Math.max(0, ikBonus) : 0);
  const reward: BossReward = { xp: Math.round(span * BOSS_XP_LEVEL * bossLowLevelXpMult(combatLevel) * part * scale * (1 + xpUp) * ik), gold: Math.round(300 * combatLevel * part * scale * ik) };
  if (killed) {
    // 1 a 3 Fichas do Chefe por vitória (top ganha 3, dano normal ganha 1 a 2)
    reward.tokens = Math.max(1, Math.min(3, Math.round(1 + 2 * Math.min(1, damage / share))));
    // Chance do lendário: 3% base + até 5% pelo dano + 4% para o top de dano (máximo 12%, antes 6%).
    const dropChance = (0.03 + 0.05 * Math.min(1, damage / share) + (top ? 0.04 : 0)) * (1 + lootUp / 2) * ik;
    const rng = rngFor(eventId, characterId);
    if (rng() < dropChance) {
      // Sorteia no máximo 1 peça do set/bolsa para o jogador vencedor
      const full = boss.legendarySet ?? [boss.legendary];
      // Set com peças por vocação (`_warrior`, `_hunter`...): só as da vocação de quem ganhou.
      const mine = vocation ? full.filter((id) => id.endsWith(`_${vocation}`)) : [];
      const set = mine.length ? mine : full;
      const rollItemIdx = Math.floor(rng() * set.length);
      const wonItem = set[rollItemIdx];
      reward.legendaries = [wonItem];
      reward.legendary = wonItem;
    }
    // Loot a mais: cada linha à parte; quem bateu pouco tem menos chance (metade com 0 de dano, cheia com a parte inteira).
    const weight = 0.5 + 0.5 * Math.min(1, damage / share);
    for (const l of boss.loot ?? []) {
      if (rng() >= Math.min(1, l.chance * weight * (1 + lootUp))) continue;
      const qty = l.min + Math.floor(rng() * (l.max - l.min + 1));
      reward.loot = { ...(reward.loot ?? {}), [l.item]: (reward.loot?.[l.item] ?? 0) + qty };
    }
    // Bolsa do chefe (Mímico Gigante): chance igual para todo mundo que lutou, sem contar o dano.
    if (boss.bag && rng() < Math.min(1, boss.bag.chance * (1 + lootUp))) reward.loot = { ...(reward.loot ?? {}), [boss.bag.item]: (reward.loot?.[boss.bag.item] ?? 0) + 1 };
  }
  return reward;
}

/** O que o cliente vê do chefe global. */
export interface BossView {
  eventId: number;
  boss: string;
  name: string;
  sprite: string;
  shout: string;
  startsAt: number;
  endsAt: number;
  active: boolean;
  hp: number;
  maxHp: number;
  /** Quantos entraram nos últimos BOSS_GREW_MS (a vida máxima subiu): o cliente avisa. */
  grew?: number;
  /** Se novas entradas ainda são permitidas (fecha nos últimos minutos). */
  canJoin?: boolean;
  /** Fila do chefe (26/10): dá para entrar nos BOSS_QUEUE_MS antes dele nascer, e este personagem está nela. */
  canQueue?: boolean;
  queued?: boolean;
  /** Este personagem está lutando. */
  joined: boolean;
  /** Quantos estão lutando (a arena desenha só os 12 de mais dano, e quem vê sempre entra). */
  fighting?: number;
  /** Servos em volta do chefe (só os chefes especiais têm). */
  minions?: { name: string; sprite: string; count: number; shot?: string };
  /** Golpes próprios (avisos na tela), ver BOSS_SKILL_SETS. */
  skills?: BossSkill[];
  /** Último lutador preso por um golpe do chefe (nome e quando). */
  swallowed?: { name: string; at: number; skill?: string };
  /** DOOM: quantos já vieram, de quantos, e até quando vai a janela do IK (se aberta). */
  doom?: { stage: number; total: number; until?: number; at?: number };
  /** Música própria da luta. */
  music?: string;
  /** Quem está lutando (os que mais causaram dano primeiro). */
  fighters: {
    name: string;
    vocation: string;
    look: unknown;
    equipment?: Partial<Record<EquipSlot, string>>;
    damage: number;
    /** Vida (0 a 1). */
    hp: number;
    /** Caído até este instante (não bate). */
    downUntil?: number;
    /** Última runa de ataque usada: quando e quanto de dano. */
    strike?: { at: number; dmg: number };
    /** Última runa de cura usada: quando e quanto curou (fração da vida). */
    heal?: { at: number; pct: number };
    /** Magias lançadas nos últimos segundos: qual, quando, dano no chefe ou cura (fração da vida). */
    casts?: { id: string; at: number; dmg?: number; heal?: number }[];
    /** Última bola de fogo dos servos que levou: quando e quanto da vida tirou. */
    fireball?: { at: number; pct: number };
  }[];
}

/** Por quanto tempo o aviso "+N jogadores entraram, vida aumentada" fica na barra. */
export const BOSS_GREW_MS = 8000;
/** Quantos resultados do chefe global cada jogador guarda. */
export const BOSS_HISTORY_MAX = 10;
/** Um resultado guardado do chefe global (o que o modal "X caiu!" mostrou). */
export interface BossHistoryEntry {
  at: number;
  boss: string;
  killed: boolean;
  damage: number;
  reward: BossReward;
}
