/**
 * Eventos de calendário (fora os chefes, que ficam em worldboss.ts).
 *
 * Dia das Crianças (11/10 12h50 até o fim de 14/10/2026, horário de Brasília):
 * - os monstros e o chefe global aparecem pequenos ("filhotes");
 * - +25% de XP no combate e +50% nas profissões;
 * - toda atividade (caçada, coleta, criação) solta doces com o tempo;
 * - os doces compram mascotes cosméticos na aba Mascotes (loja aberta durante todo o evento).
 */

const BRT = 3 * 3600_000; // Brasília = UTC−3
export const KIDS_DAY_START = Date.UTC(2026, 9, 11, 12, 50) + BRT;
export const KIDS_DAY_END = Date.UTC(2026, 9, 15) + BRT;
/** A loja de doces fecha junto com o evento (fim de 14/10). */
export const KIDS_SHOP_END = KIDS_DAY_END;

export const KIDS_CANDY = 'kids_candy';
/** Um doce a cada tantos ms de atividade (qualquer skill, online ou offline). */
export const KIDS_CANDY_EVERY_MS = 3 * 60_000;
export const KIDS_XP_BONUS = 0.25;
/** Profissões (coleta e criação) ganham mais: a stamina cheia do evento só ajuda quem caça. */
export const KIDS_PROF_XP_BONUS = 0.5;
/** Tamanho dos monstros e do chefe no Dia das Crianças. */
export const KIDS_MONSTER_SCALE = 0.65;
/** Preço de cada mascote da loja, em doces. */
export const KIDS_PET_PRICE = 200;
/** Poção Doce de XP: XP em dobro por 1 h, uma por conta. */
export const KIDS_POTION_PRICE = 150;
export const KIDS_POTION_MS = 3600_000;
/** Trajes da Tia Jujuba e o preço de cada um, em doces. */
export const KIDS_OUTFITS = ['mimic_hunter', 'walking_chest', 'candy_maker'] as const;
export const KIDS_OUTFIT_PRICE = 400;

/** Diabrete Doceiro: monstro do evento que entra em qualquer luta de caçada (fora chefes) com esta chance. */
export const KIDS_EVENT_MOB = 'candy_imp';
export const KIDS_EVENT_MOB_CHANCE = 0.04;
/** Bolsa do Mímico: 15% para cada um que lutou contra o Mímico Gigante; abre em 15 a 35 doces. */
export const MIMIC_BAG = 'mimic_bag';
export const MIMIC_BAG_CHANCE = 0.15;
export const MIMIC_BAG_CANDIES: [number, number] = [15, 35];

// ── Evento de Halloween (23/10 às 20h a 08/11/2026, horário de Brasília) ───────────
export const HALLOWEEN_START = Date.UTC(2026, 9, 23, 20, 0) + BRT; // hoje às 20h, depois do deploy (o anúncio sai no chat)
export const HALLOWEEN_END = Date.UTC(2026, 10, 8, 23, 59, 59) + BRT;
/** A loja de Halloween fica aberta por mais 2 dias após o fim do evento para troca de doces. */
export const HALLOWEEN_SHOP_END = Date.UTC(2026, 10, 10, 23, 59, 59) + BRT;

export const HALLOWEEN_CANDY = 'halloween_candy';
/** Um doce de Halloween a cada 3 minutos de atividade (qualquer skill, online ou offline). */
export const HALLOWEEN_CANDY_EVERY_MS = 3 * 60_000;
export const HALLOWEEN_XP_BONUS = 0.25;
export const HALLOWEEN_PROF_XP_BONUS = 0.5;

/** Preços na Loja de Halloween: trajes em ~2 dias de jogo, mascote em ~5 dias. */
export const HALLOWEEN_OUTFITS = ['witch', 'vampire', 'plague_doctor'] as const;
export const HALLOWEEN_OUTFIT_PRICE = 900;
export const HALLOWEEN_PET = 'pet_halloween_bat';
/** Mascotes à venda na loja do Jack (o Morceguinho também cai do chefe das 20h). */
export const HALLOWEEN_SHOP_PETS = ['pet_halloween_bat', 'pet_halloween_ghost', 'pet_halloween_mummy'] as const;
export const HALLOWEEN_PET_PRICE = 2400;
export const HALLOWEEN_POTION_PRICE = 150;
export const HALLOWEEN_POTION_MS = 3600_000;
export const HALLOWEEN_BOSS_TOKEN_PRICE = 100;
export const HALLOWEEN_ESSENCE_PRICE = 250;

/** Abóbora Assombrada: monstro do evento que surge nas caçadas com chance e solta doces. */
export const HALLOWEEN_EVENT_MOB = 'pumpkin_haunted';
export const HALLOWEEN_EVENT_MOB_CHANCE = 0.04;
/** A abóbora só solta doce em caçada com nível de pelo menos 70% do nível de combate do personagem. */
export const HALLOWEEN_MIN_HUNT_SHARE = 0.7;

export const isHalloween = (now: number) => now >= HALLOWEEN_START && now < HALLOWEEN_END;
export const isHalloweenShopOpen = (now: number) => now >= HALLOWEEN_START && now < HALLOWEEN_SHOP_END;

/** Doces de Halloween de um trecho de atividade de `ms`. */
export function halloweenCandiesFor(ms: number, rand: () => number = Math.random): number {
  if (ms <= 0) return 0;
  const n = ms / HALLOWEEN_CANDY_EVERY_MS;
  return Math.floor(n) + (rand() < n - Math.floor(n) ? 1 : 0);
}

/** Quanto do trecho [from, to) cai dentro do Evento de Halloween. */
export function halloweenDayOverlap(from: number, to: number): number {
  return Math.max(0, Math.min(to, HALLOWEEN_END) - Math.max(from, HALLOWEEN_START));
}

/** Presente do Dia das Bruxas: stamina cheia para todos às 12h de 31/10 (Brasília). */
export const HALLOWEEN_STAMINA_REFILL_AT = Date.UTC(2026, 9, 31, 12, 0) + BRT;
export const HALLOWEEN_STAMINA_TEXT = 'Gostosuras ou Travessuras! O Halloween chegou com stamina cheia (42 h) para todos!';

export const HALLOWEEN_HOURLY_TEXT =
  'Evento de Halloween: +25% de XP no combate, +50% nas profissões e doces em toda atividade. Troque com o Jack no Bastião. Rei Espantalho e Abóbora Gigante às 12h, 18h e 22h; Cavaleiro Sem Cabeça nos sábados às 20h!';
export const HALLOWEEN_HOURLY: number[] = [];
for (let t = Math.ceil(HALLOWEEN_START / 3600_000) * 3600_000; t < HALLOWEEN_END; t += 3600_000) HALLOWEEN_HOURLY.push(t);

export const HALLOWEEN_ANNOUNCEMENTS: { at: number; text: string }[] = [
  {
    at: HALLOWEEN_START,
    text: 'A névoa desce sobre o Bastião e as abóboras se iluminam... Começou o Evento de Halloween! +25% de XP em combate, +50% nas profissões e doces em tudo o que você fizer. Jack espera na praça!',
  },
  {
    at: Date.UTC(2026, 9, 24, 21, 0) + BRT,
    text: 'Atenção aventureiros: as brumas se adensam... O Cavaleiro Sem Cabeça cavalga em direção ao Bastião em 1 hora (às 22h)!',
  },
  {
    at: Date.UTC(2026, 9, 31, 19, 0) + BRT,
    text: 'A Noite das Bruxas chegou! O Cavaleiro Sem Cabeça cavalga em direção ao Bastião em 1 hora (às 20h)! Preparem suas armas!',
  },
  {
    at: Date.UTC(2026, 10, 7, 19, 0) + BRT,
    text: 'Último fim de semana do Halloween! O Cavaleiro Sem Cabeça desce ao Bastião em 1 hora (às 20h)!',
  },
  {
    at: HALLOWEEN_END - 3 * 3600_000,
    text: 'Faltam 3 horas para o fim do Halloween! A loja do Jack continuará aberta por mais 2 dias para você gastar seus doces.',
  },
];

/** Bolsa de Donuts: chance por item criado (forja, culinária, artesanato...) durante o evento; abre em 10 a 25 doces. */
export const DONUT_BAG = 'donut_bag';
export const DONUT_BAG_CRAFT_CHANCE = 0.001;

export const isKidsDay = (now: number) => now >= KIDS_DAY_START && now < KIDS_DAY_END;
export const isKidsShopOpen = (now: number) => now >= KIDS_DAY_START && now < KIDS_SHOP_END;

/** Doces de um trecho de atividade de `ms` (a parte quebrada vira chance). */
export function kidsCandiesFor(ms: number, rand: () => number = Math.random): number {
  if (ms <= 0) return 0;
  const n = ms / KIDS_CANDY_EVERY_MS;
  return Math.floor(n) + (rand() < n - Math.floor(n) ? 1 : 0);
}

/** Quanto do trecho [from, to) cai dentro do Dia das Crianças. */
export function kidsDayOverlap(from: number, to: number): number {
  return Math.max(0, Math.min(to, KIDS_DAY_END) - Math.max(from, KIDS_DAY_START));
}

/** Presente do Dia das Crianças: stamina cheia para todos, uma vez, às 13h20 de 11/10 (Brasília). */
export const KIDS_STAMINA_REFILL_AT = Date.UTC(2026, 9, 11, 13, 20) + BRT;
export const KIDS_STAMINA_TEXT = 'Presente do Dia das Crianças: stamina cheia (42 h) para todos! E agora as profissões rendem +50% de XP (combate +25%).';

/** Fins de semana de XP: +`bonus` em todas as skills (combate e profissões) dentro da janela. */
export const XP_EVENTS: { from: number; until: number; bonus: number }[] = [
  // Sexta 16/10 ao fim do domingo 18/10/2026 (Brasília): +50% em tudo.
  { from: Date.UTC(2026, 9, 16, 12) + BRT, until: Date.UTC(2026, 9, 19) + BRT, bonus: 0.5 },
];

/** Bônus de XP médio de um trecho [from, to) (0 = nenhum). */
export function xpEventBonus(from: number, to: number): number {
  if (to <= from) return 0;
  let sum = 0;
  for (const e of XP_EVENTS) sum += Math.max(0, Math.min(to, e.until) - Math.max(from, e.from)) * e.bonus;
  return sum / (to - from);
}

/** XP de recompensa (quest, diária, tarefa, arena, chefe) com o bônus do evento que vale em `now`. */
export function withXpEvent<T extends Record<string, number | undefined>>(xp: T, now: number): T {
  const b = xpEventBonus(now, now + 1);
  if (b <= 0) return xp;
  return Object.fromEntries(Object.entries(xp).map(([k, v]) => [k, v && v > 0 ? Math.round(v * (1 + b)) : v])) as T;
}

/**
 * Presentes de stamina cheia: valem uma vez, no primeiro tick do servidor dentro da janela
 * (o deploy pode cair a qualquer hora dela). O servidor guarda que já deu, para não repetir.
 */
export const STAMINA_GIFTS: { id: string; from: number; until: number; text: string }[] = [
  {
    id: 'sexta_2026_10_16',
    from: Date.UTC(2026, 9, 16, 12) + BRT,
    until: Date.UTC(2026, 9, 18, 0) + BRT,
    text: 'Sextou! Stamina cheia (42 h) para todos e +50% de XP em tudo até o fim de domingo. Bom fim de semana!',
  },
];

/** Avisos do Dia das Crianças (no meio da tela e no chat, como os raids). */
const day = (d: number, h: number) => Date.UTC(2026, 9, d, h) + BRT;
/** Lembrete de hora em hora no chat (sem o aviso grande na tela), do começo ao fim do evento. */
export const KIDS_HOURLY_TEXT =
  'Dia das Crianças: +25% de XP no combate, +50% nas profissões e doces em toda atividade. Troque com a Tia Jujuba, na fonte da praça. Mímico Gigante às 12h, 18h e 22h. Até o fim de 14/10!';
export const KIDS_HOURLY: number[] = [];
for (let t = Math.ceil(KIDS_DAY_START / 3600_000) * 3600_000; t < KIDS_DAY_END; t += 3600_000) KIDS_HOURLY.push(t);

export const KIDS_ANNOUNCEMENTS: { at: number; text: string }[] = [
  {
    at: KIDS_DAY_START,
    text: 'Os monstros do Bastião acordaram... pequenos? Começou o Dia das Crianças! Até o fim de 14/10: +25% de XP e doces em tudo o que você fizer. A Tia Jujuba espera na fonte da praça.',
  },
  ...[12, 13, 14].flatMap((d) => [
    { at: day(d, 12), text: 'Dia das Crianças: troque seus doces com a Tia Jujuba, na frente da fonte da praça!' },
    { at: day(d, 20), text: 'Dia das Crianças: +25% de XP no combate, +50% nas profissões e doces em toda atividade até o fim de 14/10.' },
  ]),
  { at: KIDS_DAY_END - 3 * 3600_000, text: 'Faltam 3 horas para o fim do Dia das Crianças. Gaste seus doces com a Tia Jujuba, na fonte da praça!' },
];

/** Discord do jogo (botão no topo e aviso no chat). */
export const DISCORD_URL = 'https://discord.gg/7XCWvnkRh';
/** Aviso do Discord no chat a cada DISCORD_EVERY_MS (nas horas cheias múltiplas de 3, em UTC). */
export const DISCORD_EVERY_MS = 3 * 60 * 60_000;
export const DISCORD_TEXT = `Quer saber o patch notes e o que vem por aí? Entre no Discord do Grimhold: ${DISCORD_URL}`;
