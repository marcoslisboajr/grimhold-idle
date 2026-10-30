import { levelForXp, xpForLevel, type Gains, type SkillId } from './skills.ts';
import { questProgress, type QuestGoal } from './quests.ts';
import type { LookAddon, OutfitId } from './index.ts';

/**
 * Quests de história: uma conversa em passos com os NPCs do Bastião. Cada passo
 * pode pedir um objetivo antes (caçar, juntar itens), e as escolhas levam a
 * caminhos e finais diferentes, cada um com uma recompensa única.
 */
export interface StoryChoice {
  text: string;
  /** Próximo passo, ou o final escolhido. */
  next?: number;
  ending?: string;
}

export interface StoryStep {
  /** Com quem falar neste passo. */
  npc: string;
  /** O que precisa fazer antes de falar (contado a partir do passo anterior). */
  need?: { goal: QuestGoal; text: string };
  lines: string[];
  choices: StoryChoice[];
}

export interface StoryEnding {
  name: string;
  text: string;
  reward: { gold?: number; xp?: Partial<Record<SkillId, number>>; items?: Record<string, number>; addon?: LookAddon; outfit?: OutfitId };
}

export interface Story {
  id: string;
  name: string;
  /** Nível de combate para começar. */
  level: number;
  summary: string;
  /** Quest de acesso: concluir libera esta caçada (id). */
  unlocks?: string;
  /** História que precisa estar concluída antes (id). */
  requires?: string;
  /** Níveis de profissão para começar (além do nível de combate). */
  skills?: Partial<Record<SkillId, number>>;
  /** Quest de item (estilo Annihilator/Demon Slayer): aparece em destaque e anuncia no chat ao terminar. */
  epic?: boolean;
  steps: StoryStep[];
  endings: Record<string, StoryEnding>;
}

export const STORIES: Story[] = [
  {
    id: 'ravine_shadow',
    name: 'Sombras na Ravina',
    level: 5,
    summary: 'Lenhadores somem na trilha da Ravina, e o Taverneiro não acredita que sejam só goblins.',
    steps: [
      {
        npc: 'Taverneiro',
        lines: [
          'Toda semana some um lenhador na trilha da Ravina. Dizem que são os goblins...',
          '...mas goblin não leva corpo embora. Alguém está pagando por isso. Você descobre quem?',
        ],
        choices: [{ text: 'Vou investigar', next: 1 }],
      },
      {
        npc: 'Taverneiro',
        need: { goal: { kind: 'kill', monsters: ['goblin', 'goblin_archer', 'goblin_shaman'], count: 20 }, text: 'Derrube 20 goblins na Toca dos Goblins' },
        lines: [
          'Então era verdade. E isto estava com o chefe deles?',
          'Um broche com o brasão de Ashfen. Leve a Hellel, ela vai saber o que significa.',
        ],
        choices: [{ text: 'Levar o broche a Hellel', next: 2 }],
      },
      {
        npc: 'Hellel',
        lines: [
          'Ashfen pagando goblins para sumir com gente do Bastião... isso é guerra disfarçada.',
          'Posso mandar você atrás dos mandantes, que se escondem com as tribos. Ou avisamos a guarda e protegemos a trilha.',
        ],
        choices: [
          { text: 'Ir atrás dos mandantes', next: 3 },
          { text: 'Avisar a guarda e proteger a trilha', next: 4 },
        ],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'kill', monsters: ['wolf_tribe', 'fox_tribe'], count: 25 }, text: 'Derrube 25 guerreiros das tribos que escondem os mandantes' },
        lines: ['Os espiões de Ashfen fugiram sem os aliados. A trilha está livre, e foi você quem limpou.'],
        choices: [{ text: 'Receber o capuz dos caçadores', ending: 'hunter' }],
      },
      {
        npc: 'Guarda',
        need: { goal: { kind: 'obtain', item: 'leather', count: 25 }, text: 'Junte 25 couros para as armaduras da guarda' },
        lines: ['Com esse couro a guarda patrulha a Ravina dia e noite. Ninguém mais some. Obrigado.'],
        choices: [{ text: 'Receber as botas da vigília', ending: 'warden' }],
      },
    ],
    endings: {
      hunter: { name: 'O Caçador de Espiões', text: 'Você caçou os aliados de Ashfen nas próprias terras deles.', reward: { gold: 1200, xp: { combat: 5000 }, items: { ravine_hood: 1 }, addon: 'strawhat' } },
      warden: { name: 'O Guardião da Trilha', text: 'A guarda do Bastião agora vigia a Ravina por sua causa.', reward: { gold: 1200, xp: { combat: 5000 }, items: { warden_boots: 1 }, addon: 'strawhat' } },
    },
  },
  {
    id: 'cemetery_oath',
    name: 'O Juramento do Cemitério',
    level: 20,
    summary: 'Os sinos do Cemitério Velho tocam sozinhos à noite, e o Sacerdote teme o que acordou.',
    steps: [
      {
        npc: 'Sacerdote',
        lines: [
          'Os sinos do Cemitério Velho tocam sozinhos à noite. Os mortos não descansam.',
          'Algo no campanário chama os ossos. Preciso de alguém que chegue até lá.',
        ],
        choices: [{ text: 'Eu vou ao cemitério', next: 1 }],
      },
      {
        npc: 'Sacerdote',
        need: { goal: { kind: 'kill', monsters: ['skeleton', 'ghoul', 'bat', 'floating_skull'], count: 40 }, text: 'Abra caminho até o campanário: 40 mortos-vivos no Cemitério Velho' },
        lines: [
          'Você trouxe o coração do sino... ele ainda pulsa com magia de morte.',
          'Posso purificá-lo com um ritual. Ou você pode guardar esse poder; Krash conhece quem forje com isso. A escolha é sua.',
        ],
        choices: [
          { text: 'Purificar o coração do sino', next: 2 },
          { text: 'Guardar o poder', next: 3 },
        ],
      },
      {
        npc: 'Sacerdote',
        need: { goal: { kind: 'obtain', item: 'bone', count: 30 }, text: 'Traga 30 ossos para o ritual de purificação' },
        lines: ['Os ossos voltam à terra e o sino silencia. A luz do Templo forjou um escudo com o que restou.'],
        choices: [{ text: 'Receber a Égide do Sino', ending: 'light' }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'obtain', item: 'dark_essence', count: 8 }, text: 'Junte 8 essências sombrias para o ferreiro do Krash' },
        lines: ['Hehe. Sabia que você tinha bom gosto. O elmo ficou pronto, e ele sussurra. Não ligue.'],
        choices: [{ text: 'Receber o Elmo da Cova', ending: 'shadow' }],
      },
    ],
    endings: {
      light: { name: 'O Sino Purificado', text: 'O Cemitério Velho dorme em paz, e o Templo lembra seu nome.', reward: { gold: 6000, xp: { combat: 32000 }, items: { bell_aegis: 1 }, addon: 'glasses' } },
      shadow: { name: 'O Pacto da Cova', text: 'O poder do sino agora é seu. O Sacerdote não olha mais nos seus olhos.', reward: { gold: 6000, xp: { combat: 32000 }, items: { grave_helm: 1 }, addon: 'glasses' } },
    },
  },
  {
    id: 'tide_call',
    name: 'O Chamado das Marés',
    level: 40,
    summary: 'Os pescadores voltam da costa sem rede e sem voz. Alva quer saber o que canta no mar.',
    steps: [
      {
        npc: 'Alva',
        lines: [
          'Os pescadores da costa voltam sem rede e sem voz. Só repetem uma canção.',
          'Algo na Praia dos Naufrágios está chamando. Vá até lá antes que chame mais gente.',
        ],
        choices: [{ text: 'Seguir a canção até a praia', next: 1 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'kill', monsters: ['shore_crab', 'fire_crab', 'sea_turtle', 'drowned'], count: 50 }, text: 'Limpe a Praia dos Naufrágios: 50 criaturas' },
        lines: [
          'Uma concha que canta... é ela que chama os afogados.',
          'Ifigenia pode forjá-la numa armadura, e a canção fica presa no aço. Ou devolvemos ao mar, onde é o lugar dela.',
        ],
        choices: [
          { text: 'Levar a concha a Ifigenia', next: 2 },
          { text: 'Devolver a concha ao mar', next: 3 },
        ],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'steel_bar', count: 10 }, text: 'Leve 10 barras de aço para Ifigenia forjar a concha' },
        lines: ['Nunca forjei nada que cantasse. A cota ficou leve como água e dura como recife.'],
        choices: [{ text: 'Vestir a Cota do Chamado', ending: 'forged' }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'kill', monsters: ['fishfolk', 'fishfolk_shaman', 'jellyfish', 'sea_serpent'], count: 30 }, text: 'Leve a concha ao Recife Partido: 30 criaturas no caminho' },
        lines: ['O mar aceitou a concha, e os pescadores voltaram a falar. Eles mandaram isto para você.'],
        choices: [{ text: 'Receber a Coroa de Pérolas', ending: 'returned' }],
      },
    ],
    endings: {
      forged: { name: 'A Canção no Aço', text: 'A concha virou armadura. Às vezes ela ainda canta, baixinho.', reward: { gold: 18000, xp: { combat: 180000 }, items: { tidecaller_mail: 1 }, addon: 'captain_hat' } },
      returned: { name: 'O Mar Agradece', text: 'A concha voltou ao mar, e a costa voltou a ter pescadores.', reward: { gold: 18000, xp: { combat: 180000 }, items: { pearl_crown: 1, cooked_shark: 50 }, addon: 'captain_hat' } },
    },
  },
  {
    id: 'minotaur_pass',
    name: 'A Passagem do Minotauro',
    level: 28,
    unlocks: 'minotaur_maze',
    summary: 'O Labirinto dos Minotauros está selado. Krash diz que Ashfen guarda o mapa do caminho.',
    steps: [
      {
        npc: 'Krash',
        lines: [
          'Quer entrar no Labirinto? Hehe. Ninguém acha o caminho sem o mapa.',
          'Os soldados de Ashfen rasgaram o mapa e cada um guarda um pedaço. Traga os pedaços.',
        ],
        choices: [{ text: 'Vou buscar os pedaços', next: 1 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'obtain', item: 'torn_map', count: 4 }, text: 'Junte 4 Pedaços do Mapa com os soldados do Quartel de Ashfen' },
        lines: ['Quatro pedaços... mas a entrada tem um selo. Hellel sabe abrir.'],
        choices: [{ text: 'Levar o mapa a Hellel', next: 2 }],
      },
      {
        npc: 'Hellel',
        need: {
          goal: { kind: 'kill', monsters: ['ashfen_soldier', 'ashfen_veteran', 'skeleton_spearman', 'skeleton_guard'], count: 40 },
          text: 'Limpe o Quartel de Ashfen para Hellel abrir o selo: 40 inimigos',
        },
        lines: ['O selo cedeu. O Labirinto está aberto para você.', 'Os minotauros guardavam três baús na entrada. Escolha um.'],
        choices: [
          { text: 'Baú de ferro (Machado de Aço raro)', ending: 'iron_chest' },
          { text: 'Baú de couro (Besta de Aço rara)', ending: 'leather_chest' },
          { text: 'Baú de seda (Manto do Xamã raro)', ending: 'silk_chest' },
        ],
      },
    ],
    endings: {
      iron_chest: { name: 'Baú de Ferro', text: 'O Labirinto dos Minotauros está aberto.', reward: { gold: 5000, xp: { combat: 50000 }, items: { 'steel_axe+2': 1 }, addon: 'sash' } },
      leather_chest: { name: 'Baú de Couro', text: 'O Labirinto dos Minotauros está aberto.', reward: { gold: 5000, xp: { combat: 50000 }, items: { 'steel_crossbow+2': 1 }, addon: 'sash' } },
      silk_chest: { name: 'Baú de Seda', text: 'O Labirinto dos Minotauros está aberto.', reward: { gold: 5000, xp: { combat: 50000 }, items: { 'shaman_robe_armor+2': 1 }, addon: 'sash' } },
    },
  },
  {
    id: 'abyssal_key_quest',
    name: 'A Chave Abissal',
    level: 48,
    unlocks: 'abyssal_trench',
    summary: 'A Fossa Abissal está trancada pelas marés. Para forjar a chave, Alva quer Pérolas Abissais do Recife Partido e Ifigenia vai precisar de barras de mithril.',
    steps: [
      {
        npc: 'Alva',
        lines: [
          'A Fossa Abissal guarda segredos do oceano profundo, mas um cadeado de coral tranca a fenda.',
          'As criaturas do Recife Partido guardam as Pérolas Abissais necessárias para moldar a chave.',
        ],
        choices: [{ text: 'Vou buscar as pérolas', next: 1 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'obtain', item: 'abyssal_pearl', count: 4 }, text: 'Colete 4 Pérolas Abissais no Recife Partido' },
        lines: ['Quatro pérolas brilhantes! Agora leve a Ifigenia junto com barras de mithril para fundir a chave.'],
        choices: [{ text: 'Levar as pérolas a Ifigenia', next: 2 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'mithril_bar', count: 5 }, text: 'Leve 5 Barras de Mithril para Ifigenia forjar a chave' },
        lines: [
          'A Chave Abissal está pronta e ressoa com as correntes marítimas! O caminho para a Fossa Abissal está aberto.',
          'Os exploradores do mar deixaram três baús de suprimentos. Escolha um.',
        ],
        choices: [
          { text: 'Baú de ferro (Armadura de Mithril rara)', ending: 'iron_chest' },
          { text: 'Baú de couro (Armadura de Chifre rara)', ending: 'leather_chest' },
          { text: 'Baú de seda (Manto de Seda raro)', ending: 'silk_chest' },
        ],
      },
    ],
    endings: {
      iron_chest: { name: 'Baú de Ferro', text: 'A Fossa Abissal está aberta.', reward: { gold: 16000, xp: { combat: 120000 }, items: { 'mithril_armor+2': 1 } } },
      leather_chest: { name: 'Baú de Couro', text: 'A Fossa Abissal está aberta.', reward: { gold: 16000, xp: { combat: 120000 }, items: { 'horn_leather_armor+2': 1 } } },
      silk_chest: { name: 'Baú de Seda', text: 'A Fossa Abissal está aberta.', reward: { gold: 16000, xp: { combat: 120000 }, items: { 'silk_robe_armor+2': 1 } } },
    },
  },
  {
    id: 'dragon_seal',
    name: 'O Selo do Dragão',
    level: 55,
    unlocks: 'dragon_nest',
    summary: 'Um selo antigo fecha as Montanhas de Fogo. Alva acha que os ciclopes quebraram o selo e esconderam os cacos.',
    steps: [
      {
        npc: 'Alva',
        lines: [
          'O Ninho dos Dragões foi selado há séculos. O selo se partiu, e os ciclopes levaram os cacos.',
          'Com os cacos, Ifigenia pode refazer o selo. Sem eles, ninguém passa.',
        ],
        choices: [{ text: 'Vou atrás dos cacos', next: 1 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'obtain', item: 'seal_shard', count: 5 }, text: 'Tome 5 Cacos do Selo dos ciclopes no Covil dos Ciclopes' },
        lines: ['Cinco cacos. Leve a Ifigenia, ela vai precisar de metal bom.'],
        choices: [{ text: 'Levar os cacos a Ifigenia', next: 2 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'abyssal_bar', count: 3 }, text: 'Leve 3 Barras Abissais para Ifigenia refazer o selo' },
        lines: ['Pronto: o selo está inteiro de novo, e abre para quem o carrega.', 'Os antigos guardiões deixaram três baús. Escolha um.'],
        choices: [
          { text: 'Baú de ferro (Machado de Adamantita raro)', ending: 'iron_chest' },
          { text: 'Baú de couro (Besta Anciã rara)', ending: 'leather_chest' },
          { text: 'Baú de seda (Manto Dracônico raro)', ending: 'silk_chest' },
        ],
      },
    ],
    endings: {
      iron_chest: { name: 'Baú de Ferro', text: 'O Ninho dos Dragões está aberto.', reward: { gold: 25000, xp: { combat: 200000 }, items: { 'adamant_axe+2': 1 }, addon: 'ranger_hat' } },
      leather_chest: { name: 'Baú de Couro', text: 'O Ninho dos Dragões está aberto.', reward: { gold: 25000, xp: { combat: 200000 }, items: { 'ancient_crossbow+2': 1 }, addon: 'ranger_hat' } },
      silk_chest: { name: 'Baú de Seda', text: 'O Ninho dos Dragões está aberto.', reward: { gold: 25000, xp: { combat: 200000 }, items: { 'dragon_robe_armor+2': 1 }, addon: 'ranger_hat' } },
    },
  },
  {
    id: 'vampire_blood_quest',
    name: 'O Sangue Antigo',
    level: 62,
    unlocks: 'vampire_crypt',
    summary: 'Um selo de sangue fecha os portões da Cripta Vampírica. O Sacerdote busca amostras de sangue para quebrar o feitiço sombrio.',
    steps: [
      {
        npc: 'Sacerdote',
        lines: [
          'Os portões de pedra da Cripta Vampírica estão selados por uma maldição ancestral de sangue.',
          'Para enfraquecer a barreira, precisamos de Frascos de Sangue Vampírico das criaturas da Tumba Profunda.',
        ],
        choices: [{ text: 'Vou coletar o sangue', next: 1 }],
      },
      {
        npc: 'Sacerdote',
        need: { goal: { kind: 'obtain', item: 'vampire_blood', count: 4 }, text: 'Colete 4 Frascos de Sangue Vampírico na Tumba Profunda' },
        lines: ['Esse sangue ainda ferve com poder sombrio. Junte Essências Sombrias para o rito final de abertura.'],
        choices: [{ text: 'Buscar as essências', next: 2 }],
      },
      {
        npc: 'Sacerdote',
        need: { goal: { kind: 'obtain', item: 'dark_essence', count: 12 }, text: 'Junte 12 Essências Sombrias para o rito de quebra do selo' },
        lines: [
          'As palavras sagradas romperam o pacto! A Cripta Vampírica está acessível para você.',
          'Em honra à sua coragem, os guardiões do Templo oferecem um dos três baús abençoados.',
        ],
        choices: [
          { text: 'Baú de ferro (Armadura de Adamantita rara)', ending: 'iron_chest' },
          { text: 'Baú de couro (Armadura das Sombras rara)', ending: 'leather_chest' },
          { text: 'Baú de seda (Manto Dracônico raro)', ending: 'silk_chest' },
        ],
      },
    ],
    endings: {
      iron_chest: { name: 'Baú de Ferro', text: 'A Cripta Vampírica está aberta.', reward: { gold: 35000, xp: { combat: 280000 }, items: { 'adamant_armor+2': 1 }, addon: 'tophat' } },
      leather_chest: { name: 'Baú de Couro', text: 'A Cripta Vampírica está aberta.', reward: { gold: 35000, xp: { combat: 280000 }, items: { 'shadow_leather_armor+2': 1 }, addon: 'tophat' } },
      silk_chest: { name: 'Baú de Seda', text: 'A Cripta Vampírica está aberta.', reward: { gold: 35000, xp: { combat: 280000 }, items: { 'dragon_robe_armor+2': 1 }, addon: 'tophat' } },
    },
  },
  {
    id: 'master_ascension',
    name: 'Provação dos Campeões',
    level: 70,
    summary: 'Os Mestres do Bastião reconhecem seu imenso poder e convocam você para o rito final da Ascensão no nível 70.',
    steps: [
      {
        npc: 'Hellel',
        lines: [
          'Você chegou aos limites do combate comum, campeão. As terras sombrias e abissais exigem mais do que treino.',
          'Para desbloquear a sua Segunda Promoção de Elite, prove sua maestria derrotando 900 demônios ou golens nas terras hostis.',
        ],
        choices: [{ text: 'Aceito a provação dos mestres', next: 1 }],
      },
      {
        npc: 'Hellel',
        need: {
          goal: {
            kind: 'kill',
            monsters: ['imp', 'lesser_demon', 'fire_devil', 'demon', 'sulfur_golem'],
            count: 900,
          },
          text: 'Derrote 900 criaturas demoníacas ou golens (Minas de Enxofre / Fendas Demoníacas)',
        },
        lines: [
          'Você superou a provação com glória inquestionável! O conselho dos mestres reconhece seu espírito como lendário.',
          'A Ascensão de Elite está concedida. Seu nome ecoará pelos séculos em Grimhold!',
        ],
        choices: [{ text: 'Consagrar minha Ascensão', ending: 'ascension_complete' }],
      },
    ],
    endings: {
      ascension_complete: {
        name: 'Ascensão Concluída',
        text: 'Você concluiu a Provação dos Campeões e está digno da Segunda Promoção!',
        reward: { gold: 60000, xp: { combat: 500000 } },
      },
    },
  },
  // ── Quests de item (estilo RuneScape e Tibia): recompensa única e traje ──
  {
    id: 'demon_slayer',
    name: 'O Caçador de Demônios',
    level: 50,
    epic: true,
    summary: 'Uma vidente viu o demônio Delrith voltar à Pedra Sombria. Só a lâmina Luzprata pode bani-lo de novo.',
    steps: [
      {
        npc: 'Alva',
        lines: [
          'Tive uma visão: o demônio Delrith, banido há cem anos, está voltando pela Pedra Sombria.',
          'Os cultistas dele já preparam o ritual. Só a lâmina Luzprata pode bani-lo. Você aceita o fardo?',
        ],
        choices: [{ text: 'Eu acabo com Delrith', next: 1 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'kill', monsters: ['bone_general'], count: 5 }, text: 'Derrote o General da Cripta 5 vezes para achar a chave do cofre (cada Chave da Cripta, feita na Forja, é uma entrada)' },
        lines: [
          'A chave do cofre estava com o General da Cripta, claro. Lá dentro está o que sobrou da Luzprata.',
          'A lâmina está partida. Só Ifigenia sabe reforjar prata sagrada, mas vai precisar de muito ferro.',
        ],
        choices: [{ text: 'Levar a lâmina a Ifigenia', next: 2 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'iron_bar', count: 25 }, text: 'Consiga 25 barras de ferro para reforjar a Luzprata' },
        lines: [
          'Pronto: a Luzprata brilha de novo. Guarde as palavras do banimento: Carlem, Aber, Camerinthum.',
          'Os cultistas estão reunidos na Pedra Sombria agora. Vá antes que o portal se abra.',
        ],
        choices: [{ text: 'Ir à Pedra Sombria', next: 3 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'trial', arena: 'trial_delrith', count: 1 }, text: 'Vença a provação "A Pedra Sombria" e bana Delrith' },
        lines: [
          'Eu senti o portal se fechar daqui. Delrith voltou ao abismo, e o Bastião dorme em paz.',
          'A Luzprata é sua. E vista as cores de quem baniu um demônio.',
        ],
        choices: [{ text: 'Receber a Luzprata', ending: 'banished' }],
      },
    ],
    endings: {
      banished: {
        name: 'Delrith Banido',
        text: 'Você baniu Delrith. Ganhou a Luzprata e o traje de Caçador de Demônios.',
        reward: { gold: 20000, xp: { combat: 180000 }, items: { silverlight: 1 }, outfit: 'demon_slayer' },
      },
    },
  },
  {
    id: 'dragon_slayer',
    name: 'O Matador de Dragões',
    level: 60,
    epic: true,
    requires: 'dragon_seal',
    summary: 'A dragoa Elvarg dominou a ilha de Crandor. O Bastião procura quem tenha coragem de atravessar o mar até ela.',
    steps: [
      {
        npc: 'Hellel',
        lines: [
          'Ninguém volta de Crandor. Elvarg queimou a ilha inteira e as crias dela já atacam os barcos.',
          'Para chegar lá você vai precisar de um mapa, de um barco e de um escudo que aguente o fogo dela.',
        ],
        choices: [{ text: 'Eu vou até Crandor', next: 1 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'kill', monsters: ['dragon_hatchling', 'dragon', 'wyvern'], count: 200 }, text: 'Derrote 200 dragões no Ninho dos Dragões e junte os pedaços do mapa de Crandor' },
        lines: ['Os três pedaços batem: aqui está a rota até Crandor. Agora falta o barco.'],
        choices: [{ text: 'Procurar quem conserte um barco', next: 2 }],
      },
      {
        npc: 'Taverneiro',
        need: { goal: { kind: 'obtain', item: 'oak_logs', count: 80 }, text: 'Consiga 80 toras de carvalho para remendar o barco' },
        lines: ['O casco ficou firme. Mas sem proteção o fogo de Elvarg derrete você antes do primeiro golpe.'],
        choices: [{ text: 'Pedir o escudo ao Sacerdote', next: 3 }],
      },
      {
        npc: 'Sacerdote',
        lines: [
          'Este é o Escudo Antidragão, abençoado no templo. Ele aguenta o sopro de Elvarg.',
          'Volte com ele, e com a cabeça dela, e o escudo será seu para sempre.',
        ],
        choices: [{ text: 'Zarpar para Crandor', next: 4 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'trial', arena: 'trial_elvarg', count: 1 }, text: 'Vença a provação "Ilha de Crandor" e derrube Elvarg' },
        lines: ['A cabeça de Elvarg! Crandor está livre. Seu nome vai ser cantado na taverna por anos.'],
        choices: [{ text: 'Receber o escudo e o traje', ending: 'elvarg_slain' }],
      },
    ],
    endings: {
      elvarg_slain: {
        name: 'Elvarg Derrotada',
        text: 'Você derrubou Elvarg. Ganhou o Escudo Antidragão e o traje de Matador de Dragões.',
        reward: { gold: 30000, xp: { combat: 300000 }, items: { anti_dragon_shield: 1 }, outfit: 'dragon_slayer' },
      },
    },
  },
  {
    id: 'annihilation',
    name: 'A Aniquilação',
    level: 80,
    epic: true,
    summary: 'Um selo antigo nas Fendas Demoníacas guarda a ponte da Aniquilação e um baú que ninguém conseguiu abrir.',
    steps: [
      {
        npc: 'Hellel',
        lines: [
          'Nas Fendas há um selo de quatro pontas. Atrás dele há uma ponte sobre a lava, demônios acorrentados em volta e o baú dos antigos campeões.',
          'Ninguém voltou de lá com vida. Quer tentar?',
        ],
        choices: [{ text: 'Quero a Aniquilação', next: 1 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'kill', monsters: ['imp', 'lesser_demon', 'fire_devil', 'demon'], count: 400 }, text: 'Derrote 400 demônios nas Fendas Demoníacas para juntar os quatro selos' },
        lines: ['Os quatro selos. Encaixe-os e o portão abre para a ponte. Depois disso, não tem volta até o Aniquilador cair.'],
        choices: [{ text: 'Abrir o portão', next: 2 }],
      },
      {
        npc: 'Sacerdote',
        need: { goal: { kind: 'trial', arena: 'trial_annihilation', count: 1 }, text: 'Vença a provação "A Aniquilação" (a ponte e os demônios da frente)' },
        lines: [
          'Você saiu vivo da Aniquilação. O baú dos campeões reconhece você.',
          'Ele guarda quatro armas. Só uma pode sair com você, para sempre. Escolha.',
        ],
        choices: [
          { text: 'Lâmina Aniquiladora (guerreiro)', ending: 'ann_blade' },
          { text: 'Arco Aniquilador (caçador)', ending: 'ann_bow' },
          { text: 'Cajado Aniquilador (arcanista)', ending: 'ann_staff' },
          { text: 'Martelo Aniquilador (devoto)', ending: 'ann_mace' },
        ],
      },
    ],
    endings: {
      ann_blade: { name: 'Lâmina Aniquiladora', text: 'Você abriu o baú da Aniquilação.', reward: { gold: 60000, xp: { combat: 700000 }, items: { annihilator_blade: 1 }, outfit: 'annihilator' } },
      ann_bow: { name: 'Arco Aniquilador', text: 'Você abriu o baú da Aniquilação.', reward: { gold: 60000, xp: { combat: 700000 }, items: { annihilator_bow: 1 }, outfit: 'annihilator' } },
      ann_staff: { name: 'Cajado Aniquilador', text: 'Você abriu o baú da Aniquilação.', reward: { gold: 60000, xp: { combat: 700000 }, items: { annihilator_staff: 1 }, outfit: 'annihilator' } },
      ann_mace: { name: 'Martelo Aniquilador', text: 'Você abriu o baú da Aniquilação.', reward: { gold: 60000, xp: { combat: 700000 }, items: { annihilator_mace: 1 }, outfit: 'annihilator' } },
    },
  },
  {
    id: 'ashfen_oak',
    name: 'O Carvalho de Ashfen',
    level: 90,
    epic: true,
    summary: 'Ashfen plantou uma semente maldita no Domínio de Sylveth. A árvore cresceu numa noite, apodrece o bosque e enlouqueceu até a Fenra.',
    steps: [
      {
        npc: 'Hellel',
        lines: [
          'Meus batedores voltaram de Sylveth pálidos. Ashfen plantou uma semente maldita no coração do bosque.',
          'Uma árvore cresceu numa noite. As raízes apodrecem tudo em volta e enlouqueceram até a Fenra. Você vai lá?',
        ],
        choices: [{ text: 'Eu cuido dessa árvore', next: 1 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'kill', monsters: ['fenra'], count: 1 }, text: 'Derrote a Fenra na Clareira dos Uivos (as raízes da árvore passam pelo covil dela)' },
        lines: [
          'A Fenra caiu, e no covil as raízes sangravam uma seiva preta. Eu senti daqui.',
          'Machado comum não corta isso. Precisamos de um óleo que queime a seiva: salgueiro e flor-de-sangue, na Alquimia.',
        ],
        choices: [{ text: 'Preparar o óleo', next: 2 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'obtain', item: 'purifying_oil', count: 10 }, text: 'Prepare 10 Óleos Purificadores na Alquimia (salgueiro e flor-de-sangue)' },
        lines: [
          'Dez frascos. O cheiro é horrível, ótimo sinal.',
          'Em volta da árvore o bosque virou o Bosque Apodrecido. Abra caminho pelas feras que ela corrompeu e queime o Carvalho na raiz.',
        ],
        choices: [{ text: 'Entrar no Bosque Apodrecido', next: 3 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'instance', hunt: 'rotten_grove', count: 1 }, text: 'Vença a instância Bosque Apodrecido (aba Quests em Organizar caçada) e queime o Carvalho de Ashfen' },
        lines: [
          'O Carvalho caiu e Sylveth já respira. Ashfen vai demorar a tentar isso de novo.',
          'Da madeira que sobrou, Ifigenia talhou três peças. Escolha a que serve para você.',
        ],
        choices: [
          { text: 'A Égide do Carvalho (escudo)', ending: 'aegis' },
          { text: 'O Grimório do Carvalho (Arcanista e Devoto)', ending: 'grimoire' },
          { text: 'A Aljava do Carvalho (Caçador)', ending: 'quiver' },
        ],
      },
    ],
    endings: {
      aegis: { name: 'Égide do Carvalho', text: 'Você queimou o Carvalho de Ashfen. Ganhou a Égide do Carvalho e o traje de Guardião do Bosque.', reward: { gold: 80000, xp: { combat: 1000000 }, items: { oak_aegis: 1 }, outfit: 'oak_warden' } },
      grimoire: { name: 'Grimório do Carvalho', text: 'Você queimou o Carvalho de Ashfen. Ganhou o Grimório do Carvalho e o traje de Guardião do Bosque.', reward: { gold: 80000, xp: { combat: 1000000 }, items: { oak_grimoire: 1 }, outfit: 'oak_warden' } },
      quiver: { name: 'Aljava do Carvalho', text: 'Você queimou o Carvalho de Ashfen. Ganhou a Aljava do Carvalho e o traje de Guardião do Bosque.', reward: { gold: 80000, xp: { combat: 1000000 }, items: { oak_quiver: 1 }, outfit: 'oak_warden' } },
    },
  },
  {
    id: 'inquisition',
    name: 'A Inquisição do Alvorecer',
    level: 60,
    epic: true,
    summary: 'Belghazar mandou cinco Arautos abrir caminho até o Bastião. A Ordem do Alvorecer pede que você cace os cinco, um por um, em cinco instâncias de quest.',
    steps: [
      {
        npc: 'Hellel',
        lines: ['A Ordem do Alvorecer pediu ajuda ao Bastião. Belghazar mandou cinco Arautos para abrir caminho até nós.', 'Cada um se escondeu num canto do mundo. Precisamos de alguém que cace os cinco, um por um.'],
        choices: [{ text: 'Eu entro na Inquisição', next: 1 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'instance', hunt: 'profane_chapel', count: 1 }, text: 'Vença a instância Capela Afogada (aba Quests em Organizar caçada) e derrube o Arauto Rubro' },
        lines: ['O Arauto Rubro caiu. No altar dele havia um mapa marcado com sangue.', 'O próximo está na Fenda dos Condenados, nas Terras Sombrias. Alva sabe mais.'],
        choices: [{ text: 'Falar com Alva', next: 2 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'instance', hunt: 'damned_rift', count: 1 }, text: 'Vença a instância Fenda dos Condenados e derrube o Arauto do Sangue' },
        lines: ['Eu vi o Arauto do Sangue cair nas minhas visões antes de você voltar.', 'O terceiro se esconde numa catedral caída nos Picos da Tempestade. Krash conhece o caminho.'],
        choices: [{ text: 'Procurar Krash', next: 3 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'instance', hunt: 'fallen_cathedral', count: 1 }, text: 'Vença a instância Catedral Caída e derrube o Arauto Sombrio' },
        lines: ['Esse Arauto lutava como cavaleiro. Lutou bem, e mesmo assim caiu.', 'O quarto fugiu para o gelo do norte. Alva vai sentir onde.'],
        choices: [{ text: 'Voltar a Alva', next: 4 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'instance', hunt: 'frozen_sanctum', count: 1 }, text: 'Vença a instância Santuário Gélido e derrube o Arauto do Vazio' },
        lines: ['O frio do Santuário Gélido sumiu junto com o Arauto do Vazio.', 'Resta o último: o Arquidemônio, no Trono de Belghazar. Hellel espera você.'],
        choices: [{ text: 'Ir até Hellel', next: 5 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'instance', hunt: 'belghazar_throne', count: 1 }, text: 'Vença a instância Trono de Belghazar e derrube o Arquidemônio de Belghazar' },
        lines: ['Os cinco Arautos caíram. Belghazar ficou sem caminho até nós.', 'A Ordem forjou um set para quem fez a Inquisição. Escolha o da sua classe.'],
        choices: [
          { text: 'Set do Guerreiro', ending: 'warrior' },
          { text: 'Set do Caçador', ending: 'hunter' },
          { text: 'Set do Arcanista', ending: 'arcanist' },
          { text: 'Set do Devoto', ending: 'devout' },
        ],
      },
    ],
    endings: {
      warrior: { name: 'Inquisidor Guerreiro', text: 'Você derrubou os cinco Arautos de Belghazar. Ganhou o set da Inquisição do Guerreiro e o traje de Inquisidor.', reward: { gold: 120000, xp: { combat: 2500000 }, items: { inq_plate: 1, inq_helmet: 1, inq_legs: 1, inq_boots: 1 }, outfit: 'inquisitor' } },
      hunter: { name: 'Inquisidor Caçador', text: 'Você derrubou os cinco Arautos de Belghazar. Ganhou o set da Inquisição do Caçador e o traje de Inquisidor.', reward: { gold: 120000, xp: { combat: 2500000 }, items: { inq_leather_armor: 1, inq_hood: 1, inq_leather_legs: 1, inq_hunter_boots: 1 }, outfit: 'inquisitor' } },
      arcanist: { name: 'Inquisidor Arcanista', text: 'Você derrubou os cinco Arautos de Belghazar. Ganhou o set da Inquisição do Arcanista e o traje de Inquisidor.', reward: { gold: 120000, xp: { combat: 2500000 }, items: { inq_robe: 1, inq_hat: 1, inq_robe_legs: 1, inq_mage_boots: 1 }, outfit: 'inquisitor' } },
      devout: { name: 'Inquisidor Devoto', text: 'Você derrubou os cinco Arautos de Belghazar. Ganhou o set da Inquisição do Devoto e o traje de Inquisidor.', reward: { gold: 120000, xp: { combat: 2500000 }, items: { inq_holy_armor: 1, inq_holy_helmet: 1, inq_holy_legs: 1, inq_holy_boots: 1 }, outfit: 'inquisitor' } },
    },
  },
  {
    id: 'pits_kharvos',
    name: 'Os Fossos de Kharvos',
    level: 80,
    epic: true,
    summary: 'Kharvos cavou sete fossos de lava no sul, cada um com um senhor que serve a ele. Desça os sete, um por vez, e derrube Kharvos no trono.',
    steps: [
      {
        npc: 'Krash',
        lines: ['Os vulcões do sul se abriram. Kharvos cavou sete fossos de lava, e em cada um mora um senhor que serve a ele.', 'Quem descer os sete chega ao trono dele. Ninguém voltou de lá ainda. Topa?'],
        choices: [{ text: 'Eu desço aos Fossos', next: 1 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'instance', hunt: 'ash_pit', count: 1 }, text: 'Vença a instância Fosso das Cinzas (aba Quests em Organizar caçada) e derrube o Senhor das Cinzas' },
        lines: ['Você voltou coberto de cinza, mas voltou. O primeiro senhor já era.', 'O segundo fosso é cheio de olhos. Alva diz que eles enxergam medo.'],
        choices: [{ text: 'Falar com Alva', next: 2 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'instance', hunt: 'eye_pit', count: 1 }, text: 'Vença a instância Fosso dos Olhos (aba Quests em Organizar caçada) e derrube o Senhor dos Olhos' },
        lines: ['Os olhos fecharam. Senti o fosso ficar em silêncio.', 'No terceiro, uma matilha guarda a passagem. Krash conhece cães de guerra.'],
        choices: [{ text: 'Procurar Krash', next: 3 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'instance', hunt: 'hound_pit', count: 1 }, text: 'Vença a instância Fosso da Matilha (aba Quests em Organizar caçada) e derrube o Cérbero dos Fossos' },
        lines: ['Três cabeças e nenhuma sobrou. Bom trabalho.', 'O quarto fosso é dos cavaleiros que Kharvos comprou com almas. Ifigenia quer falar com você antes.'],
        choices: [{ text: 'Ir até Ifigenia', next: 4 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'instance', hunt: 'damned_pit', count: 1 }, text: 'Vença a instância Fosso dos Condenados (aba Quests em Organizar caçada) e derrube o Cavaleiro Condenado' },
        lines: ['A armadura desse cavaleiro derreteu na minha bigorna. Lá embaixo o calor é pior que o de qualquer forja.', 'O quinto fosso é a Forja dos Condenados. Vou preparar uma proteção contra o calor, mas preciso de adamantita.'],
        choices: [{ text: 'Trazer a adamantita', next: 5 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'adamant_bar', count: 20 }, text: 'Consiga 20 Barras de Adamantita (Fundição) para Ifigenia proteger você do calor da Forja' },
        lines: ['Pronto. Com isso por baixo da armadura, o calor da Forja não te derruba.', 'Lá dentro trabalha Brakka, o ferreiro de Kharvos. Apague a forja dele.'],
        choices: [{ text: 'Descer à Forja', next: 6 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'instance', hunt: 'pit_forge', count: 1 }, text: 'Vença a instância Forja dos Condenados (aba Quests em Organizar caçada) e derrube Brakka, o Ferreiro dos Fossos' },
        lines: ['A forja de Kharvos esfriou. Sem ela, os demônios lá embaixo lutam com o que já têm.', 'Krash ouviu falar do sexto senhor: Gorrak, o Furioso.'],
        choices: [{ text: 'Falar com Krash', next: 7 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'instance', hunt: 'fury_pit', count: 1 }, text: 'Vença a instância Fosso da Fúria (aba Quests em Organizar caçada) e derrube Gorrak, o Furioso' },
        lines: ['Gorrak caiu bufando. Eu queria ter visto.', 'Falta o fosso mais fundo, o do Abismo. Alva vai sentir o caminho.'],
        choices: [{ text: 'Voltar a Alva', next: 8 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'instance', hunt: 'abyss_pit', count: 1 }, text: 'Vença a instância Fosso do Abismo (aba Quests em Organizar caçada) e derrube o Senhor do Abismo dos Fossos' },
        lines: ['O Abismo ficou vazio. Agora só resta Kharvos, sozinho no trono.', 'Hellel preparou o pagamento de quem chegar ao fim. Vá até ela depois do trono.'],
        choices: [{ text: 'Ir ao trono', next: 9 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'instance', hunt: 'kharvos_throne', count: 1 }, text: 'Vença a instância Trono de Kharvos (aba Quests em Organizar caçada) e derrube Kharvos' },
        lines: ['Kharvos caiu e os vulcões do sul se fecharam. Os sete fossos agora são só pedra fria.', 'Do metal do trono dele, Ifigenia forjou quatro armas. Escolha a sua.'],
        choices: [
          { text: 'Lâmina dos Fossos (Guerreiro)', ending: 'warrior' },
          { text: 'Arco dos Fossos (Caçador)', ending: 'hunter' },
          { text: 'Cajado dos Fossos (Arcanista)', ending: 'arcanist' },
          { text: 'Maça dos Fossos (Devoto)', ending: 'devout' },
        ],
      },
    ],
    endings: {
      warrior: { name: 'Lâmina dos Fossos', text: 'Você derrubou Kharvos no trono dos Fossos. Ganhou a Lâmina dos Fossos e o traje de Senhor dos Fossos.', reward: { gold: 150000, xp: { combat: 4000000 }, items: { pit_blade: 1 }, outfit: 'pit_lord' } },
      hunter: { name: 'Arco dos Fossos', text: 'Você derrubou Kharvos no trono dos Fossos. Ganhou a Arco dos Fossos e o traje de Senhor dos Fossos.', reward: { gold: 150000, xp: { combat: 4000000 }, items: { pit_bow: 1 }, outfit: 'pit_lord' } },
      arcanist: { name: 'Cajado dos Fossos', text: 'Você derrubou Kharvos no trono dos Fossos. Ganhou a Cajado dos Fossos e o traje de Senhor dos Fossos.', reward: { gold: 150000, xp: { combat: 4000000 }, items: { pit_staff: 1 }, outfit: 'pit_lord' } },
      devout: { name: 'Maça dos Fossos', text: 'Você derrubou Kharvos no trono dos Fossos. Ganhou a Maça dos Fossos e o traje de Senhor dos Fossos.', reward: { gold: 150000, xp: { combat: 4000000 }, items: { pit_mace: 1 }, outfit: 'pit_lord' } },
    },
  },
  {
    id: 'lirien_lament',
    name: 'O Lamento de Morvhena',
    level: 75,
    epic: true,
    summary: 'Uma voz chora no Vale dos Pesadelos e deixou enigmas pelo mundo. Siga o lamento, responda certo e descubra quem ela era antes de virar a Rainha dos Pesadelos.',
    steps: [
      {
        npc: 'Alva',
        lines: ['Há noites eu ouço um choro vindo do Vale dos Pesadelos. Não é um pesadelo: é alguém pedindo ajuda.', 'A voz deixou pistas pelo mundo, em forma de enigmas. Você me ajuda a seguir o lamento?'],
        choices: [{ text: 'Seguir o lamento', next: 1 }],
      },
      {
        npc: 'Alva',
        lines: ['No Cemitério Velho, os sinos tocam sozinhos à meia-noite. Dentro deles, a voz pergunta:', '"Toco sem mãos, choro sem olhos e chamo quem já partiu. O que sou?"'],
        choices: [{ text: 'Um fantasma', next: 2 }, { text: 'O sino', next: 3 }, { text: 'O vento', next: 2 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'kill', monsters: ['vampire', 'dhampir', 'nightstalker', 'banshee'], count: 50 }, text: 'A voz se calou. Acalme as banshees da Cripta Vampírica: derrote 50 criaturas de lá' },
        lines: ['As banshees da cripta se aquietaram, e a voz voltou a sussurrar.'],
        choices: [{ text: 'Ouvir o enigma dos sinos de novo', next: 1 }],
      },
      {
        npc: 'Hellel',
        lines: ['O sino! A voz se acalmou e disse metade de um nome: "Li...".', 'Ela pediu que você vá à Tumba Profunda. Lá há três lápides, e uma delas mente.'],
        choices: [{ text: 'Ir às lápides', next: 4 }],
      },
      {
        npc: 'Hellel',
        lines: ['Primeira lápide: "Aqui jaz quem nunca mentiu."', 'Segunda lápide: "A terceira lápide diz a verdade."', 'Terceira lápide: "A primeira lápide mente." Qual delas mente?'],
        choices: [{ text: 'A primeira', next: 6 }, { text: 'A segunda', next: 5 }, { text: 'A terceira', next: 5 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'kill', monsters: ['vampire', 'dhampir', 'nightstalker', 'banshee'], count: 50 }, text: 'A voz se calou. Acalme as banshees da Cripta Vampírica: derrote 50 criaturas de lá' },
        lines: ['As banshees da cripta se aquietaram, e a voz voltou a sussurrar.'],
        choices: [{ text: 'Ler as lápides de novo', next: 4 }],
      },
      {
        npc: 'Alva',
        lines: ['Embaixo da primeira lápide havia um nome riscado, só o fim: "...rien". A voz é de uma moça, e está sem forças.', 'Para ela falar de novo, precisa de lágrimas espectrais, colhidas das almas do mundo.'],
        choices: [{ text: 'Colher as lágrimas', next: 7 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'obtain', item: 'spectral_tear', count: 30 }, text: 'Colha 30 Lágrimas Espectrais no Túmulo Espectral, Cemitério Velho (Colheita de Almas nível 30; também vale comprar no Mercado)' },
        lines: ['Com as lágrimas, a voz ganhou forma: uma moça pálida, de vestido rasgado, chorando no Vale dos Pesadelos.', 'Ela diz: "Antes de ser rainha, eu tinha um nome. No sino eu disse o começo; na lápide ficou o fim. Qual era o meu nome?"'],
        choices: [{ text: 'Morvhena', next: 8 }, { text: 'Lirien', next: 9 }, { text: 'Lira', next: 8 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'kill', monsters: ['vampire', 'dhampir', 'nightstalker', 'banshee'], count: 50 }, text: 'A voz se calou. Acalme as banshees da Cripta Vampírica: derrote 50 criaturas de lá' },
        lines: ['As banshees da cripta se aquietaram, e a voz voltou a sussurrar.'],
        choices: [{ text: 'Responder de novo', next: 7 }],
      },
      {
        npc: 'Alva',
        lines: ['"Lirien... há quanto tempo ninguém me chamava assim."', '"A Rainha dos Pesadelos ainda dorme no Vale, mas a parte de mim que chorava pode partir. Ou ficar com você."'],
        choices: [{ text: 'Libertar Lirien', ending: 'freed' }, { text: 'Prender Lirien a você', ending: 'bound' }],
      },
    ],
    endings: {
      freed: { name: 'Lirien Libertada', text: 'Lirien descansou em paz e deixou o Amuleto do Lamento para você.', reward: { gold: 40000, xp: { combat: 600000 }, items: { lirien_amulet: 1 } } },
      bound: { name: 'A Banshee Presa', text: 'Lirien ficou presa a você. O choro dela agora mora no Anel da Banshee.', reward: { gold: 40000, xp: { combat: 600000 }, items: { lirien_ring: 1 } } },
    },
  },
  {
    id: 'master_harvest',
    name: 'A Colheita do Mestre',
    level: 1,
    skills: { woodcutting: 50, mining: 50, herbalism: 50, soulreaping: 50 },
    epic: true,
    summary: 'Ifigenia quer forjar uma ferramenta que sirva em toda coleta. Precisa de nível 50 em Lenhador, Mineração, Herbalismo e Colheita de Almas, e de 2.000 materiais de cada uma.',
    steps: [
      {
        npc: 'Ifigenia',
        lines: [
          'Machado, picareta, foice, ceifadeira... cansei de forjar uma ferramenta para cada coisa.',
          'Quero fazer uma só, que sirva em tudo. Mas ela precisa ser temperada com o que você colhe. Muito do que você colhe.',
        ],
        choices: [{ text: 'Eu trago os materiais', next: 1 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'ancient_logs', count: 2000 }, text: 'Junte 2.000 Toras Anciãs (Lenhador, nível 60) para o cabo' },
        lines: ['Madeira anciã: não racha nem no calor da forja. O cabo está pronto.', 'Agora o metal da cabeça: adamantita.'],
        choices: [{ text: 'Trazer a adamantita', next: 2 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'adamant_ore', count: 2000 }, text: 'Junte 2.000 Minérios de Adamantita (Mineração, nível 55) para a cabeça' },
        lines: ['A cabeça está fundida. Para a têmpera, eu uso óleo de lótus abissal.'],
        choices: [{ text: 'Trazer os lótus', next: 3 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'abyss_lotus', count: 2000 }, text: 'Junte 2.000 Lótus Abissais (Herbalismo, nível 60) para a têmpera' },
        lines: ['Temperada. Falta o último toque: uma alma abissal presa no metal, para ele nunca cegar.'],
        choices: [{ text: 'Trazer as almas', next: 4 }],
      },
      {
        npc: 'Ifigenia',
        need: { goal: { kind: 'obtain', item: 'abyssal_soul', count: 2000 }, text: 'Junte 2.000 Almas Abissais (Colheita de Almas, nível 60) para o encanto' },
        lines: ['Pronto. Corta madeira, quebra pedra, colhe ervas e ceifa almas. E mais rápido que qualquer outra.', 'É sua. Use bem.'],
        choices: [{ text: 'Receber a ferramenta', ending: 'forged' }],
      },
    ],
    endings: {
      forged: {
        name: 'Mestre Coletor',
        text: 'Ifigenia forjou a Ferramenta do Mestre Coletor: +20% de velocidade em Lenhador, Mineração, Herbalismo e Colheita de Almas, somada à melhor ferramenta de cada uma.',
        reward: { gold: 30000, xp: { woodcutting: 150000, mining: 150000, herbalism: 150000, soulreaping: 150000 }, items: { master_multitool: 1 } },
      },
    },
  },
  {
    id: 'legend_ascension',
    name: 'Provação das Lendas',
    level: 100,
    summary: 'A Rainha dos Pesadelos acordou no fundo do Vale. Só quem limpar o Vale das crias dela e vencê-la no trono vira lenda.',
    steps: [
      {
        npc: 'Hellel',
        lines: [
          'Poucos chegam tão longe. Mas lenda não se faz com nível: se faz com o que ninguém mais aguenta.',
          'Morvhena, a Rainha dos Pesadelos, acordou no fundo do Vale. As crias dela não acabam nunca. Vá até lá e não volte antes de quebrar a ninhada.',
        ],
        choices: [{ text: 'Aceito a provação', next: 1 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'kill', monsters: ['nightmare', 'shadow_beast', 'grim_reaper'], count: 7000 }, text: 'Derrote 7000 criaturas no Vale dos Pesadelos' },
        lines: [
          'Sete mil. O Vale está em silêncio pela primeira vez em séculos, e ela sabe quem fez isso.',
          'Morvhena vai esperar você no trono, com os dois últimos guardas. Morreu, volta do começo da sala. Vá quando estiver pronto.',
        ],
        choices: [{ text: 'Ir ao Trono dos Pesadelos', next: 2 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'trial', arena: 'trial_legends', count: 1 }, text: 'Vença a provação "Trono dos Pesadelos" e derrube Morvhena' },
        lines: [
          'Os Mestres sentiram o Vale acordar livre. A Rainha caiu, e foi pela sua mão.',
          'A Ascensão Lendária é sua. Escolha-a com o seu mestre.',
        ],
        choices: [{ text: 'Tornar-me uma lenda', ending: 'legend_complete' }],
      },
    ],
    endings: {
      legend_complete: {
        name: 'Lenda do Bastião',
        text: 'Você concluiu a Provação das Lendas e pode fazer a Ascensão Lendária.',
        reward: { gold: 300000, xp: { combat: 5000000 } },
      },
    },
  },
  {
    id: 'falcon_war',
    name: 'A Queda do Gavião',
    level: 200,
    epic: true,
    summary: 'A Ordem do Gavião tomou a Fortaleza de Valdeferro e a Guarda do Leão caiu. Rompa os portões, liberte o comandante dos leões e derrube o Grão-Mestre no trono.',
    steps: [
      {
        npc: 'Hellel',
        lines: ['Valdeferro caiu. A Ordem do Gavião subiu as muralhas numa noite só, e a Guarda do Leão, que jurou proteger a fortaleza, se rendeu.', 'Dizem que o Comandante Drevan entregou a espada ao Grão-Mestre Aldoran. Eu não acredito. Vá ver com os seus olhos.'],
        choices: [{ text: 'Eu vou a Valdeferro', next: 1 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'kill', monsters: ['falcon_squire', 'falcon_archer', 'falcon_knight', 'falcon_cleric'], count: 3000 }, text: 'Derrote 3000 soldados do Gavião nas Muralhas de Valdeferro e no Pátio dos Juramentos' },
        lines: ['As muralhas estão abertas e os soldados do Gavião recuaram para os portões.', 'No portão principal espera o Marechal da Ordem. Ele guarda a passagem para dentro da fortaleza.'],
        choices: [{ text: 'Romper os portões', next: 2 }],
      },
      {
        npc: 'Krash',
        need: { goal: { kind: 'instance', hunt: 'falcon_gates', count: 1 }, text: 'Vença a instância Portões de Valdeferro (aba Quests em Organizar caçada) e derrube o Marechal dos Portões' },
        lines: ['O Marechal caiu e o portão cedeu. Lá dentro, no peito dele, tinha uma carta com o selo do Gavião.', 'A carta diz que Drevan não se rendeu: ele está acorrentado na Câmara do Juramento, preso por um feitiço da Ordem. Para quebrar o feitiço, precisamos das insígnias deles.'],
        choices: [{ text: 'Juntar as insígnias', next: 3 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'obtain', item: 'falcon_insignia', count: 40 }, text: 'Consiga 40 Insígnias do Gavião (caem dos soldados da Ordem) para Alva quebrar o feitiço das correntes' },
        lines: ['Com as insígnias eu consigo desfazer o feitiço, mas só por pouco tempo. Drevan vai lutar contra você até as correntes caírem.', 'Não mate o comandante. Derrube-o, e o feitiço se quebra junto.'],
        choices: [{ text: 'Ir à Câmara do Juramento', next: 4 }],
      },
      {
        npc: 'Alva',
        need: { goal: { kind: 'instance', hunt: 'oath_chamber', count: 1 }, text: 'Vença a instância Câmara do Juramento (aba Quests em Organizar caçada) e derrube Drevan Acorrentado' },
        lines: ['As correntes caíram. Drevan olhou para você como quem acorda de um pesadelo.', '"Aldoran me enfeitiçou no dia em que a fortaleza caiu. Ele está no trono, e eu vou com você até a porta."'],
        choices: [{ text: 'Subir ao Trono do Gavião', next: 5 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'instance', hunt: 'falcon_throne', count: 1 }, text: 'Vença a instância Trono do Gavião (aba Quests em Organizar caçada) e derrube o Grão-Mestre Aldoran do Gavião' },
        lines: ['O Grão-Mestre caiu, e com ele a Ordem do Gavião. Drevan reergueu o estandarte do Leão nas muralhas de Valdeferro.', 'Ele mandou forjar quatro armas com o aço do trono, uma para cada caminho. Escolha a sua.'],
        choices: [
          { text: 'Lâmina do Leão Eterno (Guerreiro)', ending: 'warrior' },
          { text: 'Arco do Leão Eterno (Caçador)', ending: 'hunter' },
          { text: 'Cajado do Leão Eterno (Arcanista)', ending: 'arcanist' },
          { text: 'Maça do Leão Eterno (Devoto)', ending: 'devout' },
        ],
      },
    ],
    endings: {
      warrior: { name: 'Lâmina do Leão Eterno', text: 'Você derrubou o Grão-Mestre Aldoran e a Ordem do Gavião caiu. Ganhou a Lâmina do Leão Eterno e o traje de Cavaleiro do Leão.', reward: { gold: 2000000, xp: { combat: 20_000_000_000_000 }, items: { lion_blade: 1 }, outfit: 'lion_knight' } },
      hunter: { name: 'Arco do Leão Eterno', text: 'Você derrubou o Grão-Mestre Aldoran e a Ordem do Gavião caiu. Ganhou a Arco do Leão Eterno e o traje de Cavaleiro do Leão.', reward: { gold: 2000000, xp: { combat: 20_000_000_000_000 }, items: { lion_bow: 1 }, outfit: 'lion_knight' } },
      arcanist: { name: 'Cajado do Leão Eterno', text: 'Você derrubou o Grão-Mestre Aldoran e a Ordem do Gavião caiu. Ganhou a Cajado do Leão Eterno e o traje de Cavaleiro do Leão.', reward: { gold: 2000000, xp: { combat: 20_000_000_000_000 }, items: { lion_staff: 1 }, outfit: 'lion_knight' } },
      devout: { name: 'Maça do Leão Eterno', text: 'Você derrubou o Grão-Mestre Aldoran e a Ordem do Gavião caiu. Ganhou a Maça do Leão Eterno e o traje de Cavaleiro do Leão.', reward: { gold: 2000000, xp: { combat: 20_000_000_000_000 }, items: { lion_mace: 1 }, outfit: 'lion_knight' } },
    },
  },
  {
    id: 'mythic_ascension',
    name: 'Provação dos Mitos',
    level: 200,
    summary: 'Xal\'Zeth, o Devorador de Eras, acordou no Trono do Caos. Quem quebrar o exército dele e vencê-lo vira mito, e a classe muda de vez.',
    steps: [
      {
        npc: 'Hellel',
        lines: [
          'Lenda é quem os outros lembram. Mito é quem muda o que a vocação é.',
          'No Trono do Caos, Xal\'Zeth come o tempo dos mundos que acabaram. O exército dele não para de chegar. Quebre o exército e eu abro o caminho até ele.',
        ],
        choices: [{ text: 'Aceito a provação', next: 1 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'kill', monsters: ['chaos_avatar', 'ruin_seraph', 'entropy_stalker'], count: 8000 }, text: 'Derrote 8000 criaturas no Trono do Caos (Avatares do Caos, Serafins da Ruína e Perseguidores da Entropia)' },
        lines: [
          'Oito mil. O Trono está vazio, e ele está com fome.',
          'Xal\'Zeth espera com os dois últimos guardas. Morreu, volta do começo. Vá quando estiver pronto.',
        ],
        choices: [{ text: 'Ir até o Devorador de Eras', next: 2 }],
      },
      {
        npc: 'Hellel',
        need: { goal: { kind: 'trial', arena: 'trial_mythic', count: 1 }, text: 'Vença a provação "O Devorador de Eras" e derrube Xal\'Zeth' },
        lines: [
          'O tempo voltou a correr. Os mundos que ele comeu não voltam, mas o nosso continua.',
          'A Ascensão Mítica é sua. Fale com o seu mestre: a vocação muda, e com ela vem a sua ultimate.',
        ],
        choices: [{ text: 'Tornar-me um mito', ending: 'mythic_complete' }],
      },
    ],
    endings: {
      mythic_complete: {
        name: 'Mito do Bastião',
        text: 'Você concluiu a Provação dos Mitos e pode fazer a Ascensão Mítica.',
        reward: { gold: 1000000, xp: { combat: 150_000_000_000 } },
      },
    },
  },
];

/**
 * XP das histórias: o final paga pelo menos STORY_XP_LEVELS níveis de combate do nível da história
 * (do 45 para cima a recompensa tinha virado 3% a 40% de um nível). Quem já pagava mais fica como está.
 */
export const STORY_XP_LEVELS = 1;
for (const st of STORIES) {
  const floor = Math.round(STORY_XP_LEVELS * (xpForLevel(st.level + 1) - xpForLevel(st.level)));
  for (const end of Object.values(st.endings)) {
    const xp = end.reward.xp;
    if (xp?.combat !== undefined && xp.combat > 0 && xp.combat < floor) xp.combat = floor;
  }
}

export const storyById = (id: string) => STORIES.find((s) => s.id === id);

/** Estado de uma quest de história para um personagem. */
export interface StoryState {
  id: string;
  step: number;
  /** Progresso do objetivo do passo atual. */
  progress: number;
  status: 'active' | 'done';
  /** Final escolhido (quando termina). */
  ending?: string;
  /** Passos já cumpridos, em ordem (o caminho escolhido). */
  history: number[];
}

/** Título curto de uma missão (passo) para o quest log. */
export const missionTitle = (step: StoryStep) => step.need?.text ?? `Falar com ${step.npc}`;

/** A história que libera esta caçada (para mostrar o cadeado). */
export const storyUnlocking = (huntId: string) => STORIES.find((s) => s.unlocks === huntId);

/** Progresso que estes ganhos somam ao objetivo do passo. */
export const storyProgress = (step: StoryStep, gains: Gains) =>
  step.need ? questProgress({ goal: step.need.goal } as never, gains) : 0;

/** O objetivo do passo está cumprido? (sem objetivo, sempre). */
export function storyNeedDone(step: StoryStep, progress: number, skillsXp: Partial<Record<SkillId, number>>): boolean {
  const g = step.need?.goal;
  if (!g) return true;
  if (g.kind === 'level') return levelForXp(skillsXp[g.skill] ?? 0, g.skill) >= g.level;
  return progress >= g.count;
}

/** Progresso valendo: em "obter", o que já está no depósito também conta (barras feitas antes do passo). */
export function storyStepProgress(step: StoryStep, progress: number, bank: Record<string, number>): number {
  const g = step.need?.goal;
  return g?.kind === 'obtain' ? Math.max(progress, bank[g.item] ?? 0) : progress;
}

/** Alvo do objetivo do passo (para a barra de progresso). */
export const storyTarget = (step: StoryStep) => {
  const g = step.need?.goal;
  return !g ? 0 : g.kind === 'level' ? g.level : g.count;
};

/** A instância de quest está aberta para quem tem estas histórias (no passo que pede vencê-la, ainda sem vencer)? */
export function questInstanceOpen(stories: { id: string; step: number; progress: number; status: string }[], huntId: string): boolean {
  return stories.some((s) => {
    const g = s.status === 'active' ? storyById(s.id)?.steps[s.step]?.need?.goal : undefined;
    return g?.kind === 'instance' && g.hunt === huntId && s.progress < 1;
  });
}
