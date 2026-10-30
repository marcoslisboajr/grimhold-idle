import { useState } from 'react';
import { tr } from './i18n.ts';

/**
 * "Como jogar" do Ajudante (24/10): explica o jogo para quem nunca jogou Tibia nem jogo idle.
 * Cada aba é um assunto; o texto é simples de propósito (pedido da comunidade: o iniciante se perdia).
 */
type Section = { id: string; title: [string, string]; parts: [[string, string], [string, string]][] };

const SECTIONS: Section[] = [
  {
    id: 'start',
    title: ['Primeiros passos', 'First steps'],
    parts: [
      [
        ['O que é um jogo idle?', 'What is an idle game?'],
        [
          'Aqui o seu personagem trabalha sozinho. Você escolhe o que ele faz (caçar monstros, minerar, pescar, cozinhar...) e ele continua fazendo mesmo com o jogo fechado, por até 12 horas. Quando você volta, recebe tudo o que ele ganhou nesse tempo.',
          'Your character works on their own. You choose what they do (hunt, mine, fish, cook...) and they keep doing it even with the game closed, for up to 12 hours. When you come back you get everything they earned.',
        ],
      ],
      [
        ['Seus primeiros 30 minutos', 'Your first 30 minutes'],
        [
          '1) Aperte "Organizar caçada" (embaixo, ou a tecla H) e escolha a caçada de nível mais baixo. 2) Abra Quests (J) e siga a missão do mestre da sua classe: ela ensina o caminho e dá ouro e itens. 3) Quando cair equipamento melhor, vista na janela Equipamento (C); a seta verde mostra o que é melhor. 4) Volte de vez em quando para trocar de caçada quando ficar fácil demais.',
          "1) Press \"Organize hunt\" (bottom, or H) and pick the lowest-level hunt. 2) Open Quests (J) and follow your class master's quest: it shows the way and gives gold and items. 3) When better gear drops, equip it in Equipment (C); the green arrow marks upgrades. 4) Come back now and then to move to a harder hunt.",
        ],
      ],
      [
        ['A barra de cima', 'The top bar'],
        [
          'Cada botão abre uma janela. Passe o mouse para ver o atalho do teclado (I mochila, C equipamento, J quests, K skills, P profissões, B bestiário, N mascotes, O conquistas, A arenas). Esc fecha a janela aberta. Em "Social" ficam votar, seu perfil, mascotes, conquistas, arenas, Discord e trocar de personagem.',
          'Each button opens a window. Hover to see its keyboard shortcut (I bag, C equipment, J quests, K skills, P professions, B bestiary, N pets, O achievements, A arenas). Esc closes the open window. "Social" has voting, your profile, pets, achievements, arenas, Discord and character switch.',
        ],
      ],
    ],
  },
  {
    id: 'combat',
    title: ['Combate e caçadas', 'Combat and hunts'],
    parts: [
      [
        ['Como funciona a luta', 'How fighting works'],
        [
          'Você escolhe uma caçada e o personagem luta sozinho, um grupo de monstros atrás do outro. Entre as lutas ele descansa para recuperar a vida. Cuidado com a morte: você perde parte da XP e pode perder itens (o Ceifador guarda os itens e devolve por ouro, por alguns dias). Antes de caçadas difíceis, compre a bênção no Templo (menu Serviços): ela protege os itens e metade da XP.',
          'You pick a hunt and your character fights on their own, one pack after another, resting between fights. Watch out for death: you lose some XP and may lose items (the Reaper keeps them and returns them for gold, for a few days). Before hard hunts, buy the Temple blessing (Services menu): it protects your items and half the XP.',
        ],
      ],
      [
        ['Foco em XP ou em loot', 'XP focus or loot focus'],
        [
          'Algumas caçadas dão muita experiência e pouco item; outras o contrário. Use as de XP para subir de nível e as de loot quando precisar de ouro ou de material. O Analisador (U) mostra quanto você ganha por hora.',
          'Some hunts give lots of experience and few items; others the opposite. Use XP hunts to level and loot hunts for gold and materials. The Analyzer (U) shows your hourly gains.',
        ],
      ],
      [
        ['Stamina', 'Stamina'],
        [
          'São até 42 horas de caça guardadas. As primeiras horas (acima de 39 h) dão XP extra (+80% e depois +50%). Fora da caçada ela volta sozinha, 1 hora por hora. Dica: treine uma profissão enquanto ela enche.',
          'You store up to 42 hours of hunting. The first hours (above 39 h) give bonus XP (+80%, then +50%). Outside hunts it refills 1 hour per hour. Tip: train a profession while it refills.',
        ],
      ],
      [
        ['Poções, runas e magias', 'Potions, runes and spells'],
        [
          'Poções de vida e mana são usadas sozinhas na luta (compre no Alquimista). Runas dão dano extra (Runista). Magias (G) são da sua classe: escolha quais ficam na barra e o personagem usa sozinho.',
          'Health and mana potions are used automatically (Alchemist). Runes add damage (Rune shop). Spells (G) belong to your class: choose which go on the bar and your character casts them.',
        ],
      ],
      [
        ['Promoção', 'Promotion'],
        [
          'No nível 30 aparece o botão "Promover": sua classe ganha um nome novo e fica mais forte. Não esqueça!',
          "At level 30 a \"Promote\" button appears: your class gets a new title and grows stronger. Don't forget it!",
        ],
      ],
    ],
  },
  {
    id: 'gear',
    title: ['Equipamento', 'Gear'],
    parts: [
      [
        ['Raridade', 'Rarity'],
        [
          'O mesmo item pode cair em cores diferentes: Comum (branco), Incomum (verde), Rara (azul), Épica (roxo) e Lendária (laranja). Quanto mais rara, mais forte. Acima disso (Mítica, Divina e Ancestral) só pela Ascensão.',
          'The same item drops in different colors: Common (white), Uncommon (green), Rare (blue), Epic (purple) and Legendary (orange). Rarer is stronger. Mythic, Divine and Ancestral only come from Ascension.',
        ],
      ],
      [
        ['Refino (+1 a +10)', 'Refining (+1 to +10)'],
        [
          'No Vulcanus você refina um item: cada + deixa ele 5% mais forte. Quanto mais alto, mais caro e mais chance de falhar. Itens que você não quer podem ser desmanchados lá para virar material.',
          'At Vulcanus you refine an item: each + makes it 5% stronger. Higher is pricier and riskier. Unwanted items can be dismantled there into materials.',
        ],
      ],
      [
        ['Imbuements', 'Imbuements'],
        [
          'Um encantamento temporário no equipamento (roubo de vida, de mana, dano elemental...). Feito na loja de Imbuements com materiais que caem dos monstros.',
          'A temporary enchantment on gear (life leech, mana leech, elemental damage...). Made at the Imbuement shop with monster materials.',
        ],
      ],
      [
        ['Onde conseguir cada item', 'Where to get each item'],
        [
          'Na aba "Equipamentos da classe" deste Ajudante: escolha a faixa de nível e veja o melhor item de cada parte do corpo e de onde ele vem (caçada, loja, profissão, chefe ou quest).',
          "In this Helper's \"Class gear\" tab: pick a level range to see the best item per slot and where it comes from (hunt, shop, profession, boss or quest).",
        ],
      ],
    ],
  },
  {
    id: 'prof',
    title: ['Profissões', 'Professions'],
    parts: [
      [
        ['Para que servem', 'What they are for'],
        [
          'Profissões (P) são o outro jeito de jogar: em vez de caçar, o personagem coleta ou fabrica. Uma alimenta a outra: a Mineração dá minério, que vira barra, e a Ferraria faz armas e armaduras com ela. Pesca e Cozinha fazem comida, que recupera vida na caçada. Lenhador e Arqueiraria fazem arcos e flechas, e assim por diante.',
          'Professions (P) are the other way to play: instead of hunting, your character gathers or crafts. They feed each other: Mining gives ore, which becomes bars, and Smithing turns them into weapons and armor. Fishing and Cooking make food that heals in hunts. Woodcutting and Fletching make bows and arrows, and so on.',
        ],
      ],
      [
        ['Nível 99, capas e mascotes', 'Level 99, capes and pets'],
        [
          'Chegar ao 99 numa profissão dá a capa dela (mais XP naquela profissão). Cada profissão também tem um mascote raro que cai trabalhando.',
          'Reaching 99 in a profession gives its cape (more XP in it). Each profession also has a rare pet that drops while working.',
        ],
      ],
    ],
  },
  {
    id: 'systems',
    title: ['Bestiário e charms', 'Bestiary and charms'],
    parts: [
      [
        ['Bestiário (B)', 'Bestiary (B)'],
        [
          'Cada espécie de monstro tem uma ficha que se revela com os abates: com 50 você vê a vida e a XP, com 1.000 o loot, e com 5.000 a ficha fica completa e dá pontos de charm.',
          'Each species has a sheet revealed by kills: 50 shows HP and XP, 1,000 the loot, and 5,000 completes it and gives charm points.',
        ],
      ],
      [
        ['Charms', 'Charms'],
        [
          'Com os pontos você libera um charm e escolhe em qual espécie ele vale (menos vida, mais XP, mais loot contra ela...). Cada charm tem 3 níveis: evolua os que mais usa. Dica: ponha nos monstros da caçada em que você mais fica.',
          "Points unlock a charm that you place on one species (less HP, more XP, more loot against it...). Each charm has 3 levels: upgrade the ones you use most. Tip: put them on your main hunt's monsters.",
        ],
      ],
      [
        ['Prey', 'Prey'],
        [
          'São 3 vagas que sorteiam uma espécie com um bônus por 2 horas. Escolha espécies da caçada em que você está. Uma troca por dia é grátis.',
          '3 slots that roll a species with a bonus for 2 hours. Pick species from your current hunt. One reroll per day is free.',
        ],
      ],
    ],
  },
  {
    id: 'bosses',
    title: ['Chefes e desafios', 'Bosses and challenges'],
    parts: [
      [
        ['Chefe global', 'World boss'],
        [
          'Nas horas ímpares aparece um chefe para o servidor inteiro. Aperte "Entrar" na barra do chefe: todo mundo bate junto e quem ajudou ganha recompensa (e chance de item raro e de mascote).',
          'On odd hours a boss appears for the whole server. Press "Join" on the boss bar: everyone fights together and helpers get rewards (and a chance at rare items and pets).',
        ],
      ],
      [
        ['Covis e tarefas', 'Lairs and tasks'],
        [
          'Covis são chefes menores que você enfrenta sozinho ou em grupo. O Mestre Alden dá tarefas de caça (matar uma quantidade de um monstro) com pontos para a Loja de Tarefas, e o Mestre de Slayer dá tarefas que sobem a skill Slayer.',
          'Lairs are smaller bosses you face alone or with a party. Master Alden gives hunting tasks with points for the Task Shop, and the Slayer Master gives tasks that train the Slayer skill.',
        ],
      ],
      [
        ['Arenas e conquistas', 'Arenas and achievements'],
        [
          'Arenas (A) são desafios por nível que dão baú de arma. Conquistas (O) e o Bosstiário dão pontos e títulos: use como lista do que ainda dá para fazer.',
          'Arenas (A) are level challenges with a weapon chest. Achievements (O) and the Bosstiary give points and titles: use them as a to-do list.',
        ],
      ],
    ],
  },
  {
    id: 'money',
    title: ['Ouro e comércio', 'Gold and trade'],
    parts: [
      [
        ['Ganhar ouro', 'Earning gold'],
        [
          'Venda o loot que você não usa para os NPCs da cidade. Caçadas com foco em loot rendem mais ouro.',
          "Sell loot you don't use to the town NPCs. Loot-focused hunts earn more gold.",
        ],
      ],
      [
        ['Mercado e troca', 'Market and trade'],
        [
          'No Mercado você põe itens à venda para outros jogadores e compra o que eles anunciam. Clicando em "online", no topo, você vê os jogadores e pode propor uma troca direta.',
          'At the Market you list items for other players and buy theirs. Clicking "online" at the top shows players so you can trade directly.',
        ],
      ],
      [
        ['Depósito e votos', 'Depot and votes'],
        [
          'O Depósito guarda o que você não quer carregar. Votando no jogo uma vez por dia (Social > Votar) você ganha pontos para a Loja de Votos.',
          "The Depot stores what you don't want to carry. Voting once a day (Social > Vote) gives points for the Vote Shop.",
        ],
      ],
    ],
  },
];

export function HowToPlay() {
  const [tab, setTab] = useState(SECTIONS[0].id);
  const sec = SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0];
  return (
    <div className="how-to-play">
      <div className="char-tabs">
        {SECTIONS.map((s) => (
          <button type="button" key={s.id} className={`small-btn ${s.id === tab ? 'on' : ''}`} onClick={() => setTab(s.id)}>
            {tr(...s.title)}
          </button>
        ))}
      </div>
      {sec.parts.map(([title, text]) => (
        <div key={title[0]} className="how-part">
          <h4>{tr(...title)}</h4>
          <p>{tr(...text)}</p>
        </div>
      ))}
    </div>
  );
}
