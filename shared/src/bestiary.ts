import huntsData from '../data/hunts.json';
import type { CharmMark, Monster } from './combat.ts';
import { ELEMENTS, type Element } from './elements.ts';

/**
 * Bestiário (como no Tibia): cada espécie tem uma ficha que vai se revelando
 * com os abates. Completar a ficha dá pontos de charm; os charms são bônus
 * permanentes contra uma espécie escolhida.
 */

/** Abates para cada etapa da ficha: 1 = vida e XP, 2 = loot, 3 = completa (dá pontos). */
export const BESTIARY_STAGES = [50, 1000, 5000] as const;

export function bestiaryStage(kills: number): 0 | 1 | 2 | 3 {
  if (kills >= BESTIARY_STAGES[2]) return 3;
  if (kills >= BESTIARY_STAGES[1]) return 2;
  if (kills >= BESTIARY_STAGES[0]) return 1;
  return 0;
}

/** Nível da caçada mais alta em que a espécie aparece (define o valor da ficha). */
const MONSTER_LEVEL: Record<string, number> = {};
// Os da limpeza das instâncias (trash) também: sem eles, essas espécies sumiam do Bestiário.
for (const h of huntsData as { level: number; monsters: string[]; trash?: string[] }[]) {
  for (const m of [...h.monsters, ...(h.trash ?? [])]) MONSTER_LEVEL[m] = Math.max(MONSTER_LEVEL[m] ?? 0, h.level);
}
export const monsterLevel = (id: string) => MONSTER_LEVEL[id] ?? 1;

/** Pontos de charm por completar a ficha: espécies mais fortes valem mais. */
export const charmPointsFor = (monsterId: string) => 5 + Math.round(monsterLevel(monsterId) / 4);

export interface Charm {
  id: string;
  name: string;
  /** Texto do nível máximo (3). */
  description: string;
  /** Custo do nível 2 (o nível 1 custa metade e o 3 o dobro). */
  cost: number;
  /** Grupo na tela: os clássicos, os elementais e os de efeito. */
  group: 'base' | 'elemental' | 'effect';
  /** Charm elemental: o elemento do golpe extra. */
  element?: Element;
  /** Texto do charm num nível. */
  describe: (level: number) => string;
  /** O que muda no monstro da espécie escolhida (antes da luta), no nível dado (3 se omitido). */
  apply: (m: Monster, level?: number) => Monster;
}

/** Níveis de charm (24/10): o 3 é o bônus de antes; o 1 vale metade e o 2 três quartos. */
export const CHARM_MAX_LEVEL = 3;
export const charmScale = (level = CHARM_MAX_LEVEL) => [0, 0.5, 0.75, 1][Math.max(1, Math.min(CHARM_MAX_LEVEL, Math.floor(level)))];
/** Custo para chegar a um nível vindo do anterior. */
export const charmLevelCost = (charm: Charm, level: number) => Math.round(charm.cost * [0, 0.5, 1, 2][level]);
const pct = (v: number) => `${Number((v * 100).toFixed(1)).toLocaleString('pt-BR')}%`;

const charm = (id: string, name: string, cost: number, group: Charm['group'], power: number, text: (v: string) => string, effect: (m: Monster, v: number) => Monster, element?: Element): Charm => ({
  id, name, cost, group, element,
  description: text(pct(power)),
  describe: (level) => text(pct(power * charmScale(level))),
  apply: (m, level) => effect(m, power * charmScale(level)),
});

/** Charm elemental: chance por golpe de causar parte da vida da espécie como dano do elemento. */
export const CHARM_PROC_CHANCE = 0.15;
export const CHARM_PROC_PCT = 0.08;

export const CHARMS: Charm[] = [
  charm('ferocity', 'Ferocidade', 60, 'base', 0.1, (v) => `A espécie tem ${v} menos vida contra você.`, (m, v) => ({ ...m, hp: Math.round(m.hp * (1 - v)) })),
  charm('dodge', 'Esquiva', 60, 'base', 0.12, (v) => `A espécie bate ${v} mais fraco em você.`, (m, v) => ({ ...m, attack: m.attack * (1 - v) })),
  charm('pierce', 'Perfuração', 80, 'base', 0.25, (v) => `A espécie tem ${v} menos defesa.`, (m, v) => ({ ...m, defense: m.defense * (1 - v) })),
  charm('scavenge', 'Saque', 120, 'base', 0.25, (v) => `+${v} de chance em todos os drops da espécie (exceto ouro).`,
    (m, v) => ({ ...m, loot: m.loot.map((l) => (l.item === 'gold' ? l : { ...l, chance: Math.min(1, l.chance * (1 + v)) })) })),
  charm('wisdom', 'Sabedoria', 150, 'base', 0.15, (v) => `+${v} de XP da espécie.`, (m, v) => ({ ...m, xp: m.xp * (1 + v) })),
  ...elementalCharms(),
  charm('precision', 'Golpe Certeiro', 90, 'effect', 0.08, (v) => `+${v} de chance de crítico contra a espécie.`, (m, v) => mark(m, { crit: (m.charm?.crit ?? 0) + v })),
  charm('leech', 'Sanguessuga', 100, 'effect', 0.05, (v) => `+${v} do dano vira vida contra a espécie.`, (m, v) => mark(m, { leech: (m.charm?.leech ?? 0) + v })),
  charm('mana_leech', 'Sede Arcana', 100, 'effect', 0.05, (v) => `+${v} do dano vira mana contra a espécie.`, (m, v) => mark(m, { manaLeech: (m.charm?.manaLeech ?? 0) + v })),
  charm('resilience', 'Resiliência', 70, 'effect', 0.2, (v) => `O descanso depois de lutar com a espécie fica ${v} mais curto.`, (m, v) => mark(m, { rest: Math.max(m.charm?.rest ?? 0, v) })),
];

/** Soma uma marca de charm ao monstro. */
function mark(m: Monster, add: CharmMark): Monster {
  return { ...m, charm: { ...m.charm, ...add } };
}

/** Os seis charms elementais (um por elemento). */
function elementalCharms(): Charm[] {
  const names: Record<Element, string> = { fire: 'Brasa', water: 'Maré', earth: 'Espinho', energy: 'Faísca', holy: 'Luz', death: 'Ruína' };
  return (Object.keys(ELEMENTS) as Element[]).map((element) =>
    charm(`elem_${element}`, names[element], 100, 'elemental', CHARM_PROC_PCT,
      (v) => `15% de chance por golpe de causar ${v} da vida da espécie como dano de ${ELEMENTS[element].pt} (mais forte se ela for fraca a ${ELEMENTS[element].pt}).`,
      (m, v) => mark(m, { proc: { element, chance: CHARM_PROC_CHANCE, pct: v } }), element));
}

export const charmById = (id: string) => CHARMS.find((c) => c.id === id);

/** Pontos gastos num charm até o nível dele. Os de antes dos níveis pagaram o custo antigo pelo nível 1 (sem devolução); as evoluções depois somam o preço normal. */
export function charmSpent(c: { id: string; level?: number; legacy?: boolean }): number {
  const def = charmById(c.id);
  if (!def) return 0;
  let s = c.legacy ? def.cost : charmLevelCost(def, 1);
  for (let l = 2; l <= (c.level ?? CHARM_MAX_LEVEL); l++) s += charmLevelCost(def, l);
  return s;
}

/** Pontos ganhos (fichas completas) menos os gastos (charms liberados e evoluídos). */
export function charmPoints(kills: Record<string, number>, unlocked: (string | { id: string; level?: number; legacy?: boolean })[], bonus = 0): { earned: number; spent: number; free: number } {
  // `bonus`: pontos comprados na Loja de Tarefas.
  let earned = bonus;
  for (const [id, n] of Object.entries(kills)) if (bestiaryStage(n) === 3) earned += charmPointsFor(id);
  // Só o id (sem nível): conta o custo antigo, de um nível só.
  const spent = unlocked.reduce((s, c) => s + (typeof c === 'string' ? charmById(c)?.cost ?? 0 : charmSpent(c)), 0);
  // Ficha que ficou mais longa não tira charm já comprado; só segura os próximos.
  return { earned, spent, free: Math.max(0, earned - spent) };
}

/** Charm liberado e a espécie em que está posto (null = ainda sem espécie). */
export interface CharmState {
  id: string;
  monster: string | null;
  /** 1 a 3 (sem nível = 3, o bônus de antes). */
  level?: number;
  /** Liberado antes dos níveis: pagou o custo antigo e fica no 3. */
  legacy?: boolean;
}

/** Aplica nos monstros da luta os charms postos na espécie de cada um. */
export function applyCharms(monsters: Monster[], charms: CharmState[] | undefined): Monster[] {
  if (!charms?.length) return monsters;
  return monsters.map((m) => {
    let out = m;
    for (const c of charms) if (c.monster === m.id) out = charmById(c.id)?.apply(out, c.level) ?? out;
    return out;
  });
}

// ── Prey ────────────────────────────────────────────────────────────────────

/** Prey (como no Tibia): 3 vagas, cada uma com uma espécie e um bônus contra ela. */
export const PREY_SLOTS = 3;

export interface PreyBonus {
  id: 'xp' | 'loot' | 'damage';
  name: string;
  description: string;
  apply: (m: Monster) => Monster;
}

export const PREY_BONUSES: PreyBonus[] = [
  { id: 'xp', name: 'Experiência', description: '+30% de XP', apply: (m) => ({ ...m, xp: m.xp * 1.3 }) },
  {
    id: 'loot',
    name: 'Saque',
    description: '+40% de chance nos drops (exceto ouro)',
    apply: (m) => ({ ...m, loot: m.loot.map((l) => (l.item === 'gold' ? l : { ...l, chance: Math.min(1, l.chance * 1.4) })) }),
  },
  { id: 'damage', name: 'Dano', description: 'a espécie tem 20% menos vida', apply: (m) => ({ ...m, hp: Math.round(m.hp * 0.8) }) },
];

export const preyBonusById = (id: string) => PREY_BONUSES.find((b) => b.id === id);

/** Duração de combate de um prey ativo (2 horas = 7.200 segundos). */
export const PREY_DURATION_SECS = 2 * 60 * 60;

/** Vaga de prey: espécie, bônus e segundos restantes de combate (null = vazia ou expirada). */
export interface PreySlot {
  monster: string | null;
  bonus: PreyBonus['id'] | null;
  timeLeftSecs?: number;
  /** Lista sorteada (como no Tibia): 9 espécies para escolher; o bônus já vem sorteado. */
  options?: string[];
}

/** Quantas espécies a lista do prey oferece para escolher. */
export const PREY_OPTIONS = 9;

/**
 * Espécies que podem cair no prey: as das caçadas perto do nível do personagem (chefes de instância e covil não).
 * Faixa do nível −25 ao +10; onde as caçadas repetem os mesmos monstros (do 230 ao 260 eram só 7 espécies e a
 * lista vinha com 4 a 6), a faixa se alarga aos poucos (mais para baixo) até ter `min` espécies.
 */
export function preyPool(level: number, min = PREY_OPTIONS + 2): string[] {
  const hunts = (huntsData as { level: number; monsters: string[]; boss?: boolean; lair?: boolean }[]).filter((h) => !h.boss && !h.lair);
  let out = new Set<string>();
  for (let extra = 0; extra <= 200; extra += 10) {
    out = new Set<string>();
    for (const h of hunts) if (h.level <= level + 10 + extra / 2 && h.level >= level - 25 - extra) for (const m of h.monsters) out.add(m);
    if (out.size >= min) break;
  }
  return [...out];
}

/** Espécies que valem no prey: as das caçadas normais (chefes de instância, de covil e o resto de fora). */
const PREY_SPECIES = new Set(
  (huntsData as { monsters: string[]; boss?: boolean; lair?: boolean }[]).filter((h) => !h.boss && !h.lair).flatMap((h) => h.monsters),
);
export const isPreySpecies = (monster: string | null | undefined) => !!monster && PREY_SPECIES.has(monster);

/** Ouro para sortear de novo depois da troca grátis do dia. */
/** Troca paga do prey: cada uma no mesmo dia custa 50% a mais que a anterior (`paid` = trocas pagas hoje). */
export const preyRerollCost = (level: number, paid = 0) => Math.round((100 + level * 25) * 1.5 ** paid);

/** Bônus do prey aplicados na luta (depois dos charms). */
export function applyPrey(monsters: Monster[], prey: PreySlot[] | undefined): Monster[] {
  if (!prey?.length) return monsters;
  return monsters.map((m) => {
    const slot = prey.find((p) => p.monster === m.id);
    return (slot?.bonus && preyBonusById(slot.bonus)?.apply(m)) || m;
  });
}
