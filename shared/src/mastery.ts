/**
 * Roda da Maestria (estilo Wheel of Destiny do Tibia).
 * Substitui a antiga árvore de maestria.
 *
 * 4 lados: fury (Fúria), precision (Precisão), bastion (Bastião), arcane (Arcano).
 * Cada lado tem 9 fatias em 3 anéis:
 * - inner (interno): 2 fatias, custo 5 cada (10 pts)
 * - middle (do meio): 3 fatias, custo 10 cada (30 pts)
 * - outer (externo): 4 fatias, custo 15 cada (60 pts)
 * Total por lado = 100 pontos. Total da roda = 400 pontos.
 * Com o teto de 200 pontos de Maestria (níveis 1 a 200), o jogador preenche metade da roda.
 */

export const MASTERY_MIN_LEVEL = 400;
export const MASTERY_POINT_XP = 1_500_000_000_000_000;
/** Multiplicador da XP de Maestria ganha (25/10: x3; 27/10: x0,25, com as caçadas até o 800; a curva de custo não muda). */
export const MASTERY_XP_MULT = 0.25;
export const MASTERY_MAX_LEVEL = 200;
/** Nível que conta nas caçadas comuns: do 400 em diante, combate + Maestria (27/10; antes 400 + Maestria, que parava no 600). */
export const huntLevelFor = (combatLevel: number, masteryLvl = 0) => (combatLevel >= MASTERY_MIN_LEVEL ? combatLevel + masteryLvl : combatLevel);
export const MASTERY_COST_GROWTH = 1.015;

export const masteryPointCost = (level: number) => Math.round(MASTERY_POINT_XP * MASTERY_COST_GROWTH ** Math.max(0, level));
export const masteryLevel = (st: { points: number; slices?: Partial<Record<string, number>>; nodes?: Partial<Record<string, number>> }) =>
  masterySpentPoints(st.slices ?? st.nodes) + st.points;

export const MASTERY_RESET_MIN_GOLD = 100_000;
export const MASTERY_RESET_GOLD_PER_POINT = 50_000;

export type WheelSideId = 'fury' | 'precision' | 'bastion' | 'arcane';
export type WheelRing = 'inner' | 'middle' | 'outer';

export interface WheelSlice {
  id: string;
  side: WheelSideId;
  ring: WheelRing;
  indexInRing: number; // 0..1 (inner), 0..2 (middle), 0..3 (outer)
  cost: number; // 5, 10 ou 15
  name: [string, string];
  neighbors: string[]; // ids das fatias vizinhas
  conviction?: WheelConviction;
}

export interface WheelConviction {
  id: string;
  name: [string, string];
  desc: [string, string];
  icon: string;
  effects: Partial<WheelEffects>;
}

export interface WheelEffects {
  attackPct: number;
  crit: number;
  critMult: number;
  hpPct: number;
  defensePct: number;
  manaPct: number;
  spellDamagePct: number;
  packDamagePct: number; // +5% dano em bando (3+ monstros)
  lifesteal: number; // +1% roubo de vida
  bossDamagePct: number; // +6% dano contra chefes
  speed: number; // -3% tempo de ataque (3% mais rápido)
  allResistPct: number; // +3% resistência a todos os elementos
  damageReductionPct: number; // -2% de dano recebido
  regen: number; // +25% regeneração
  spellCooldownReductionPct: number; // 5% menos recarga
  spellHealPct: number; // +10% cura das magias
}

export interface WheelSideInfo {
  id: WheelSideId;
  name: [string, string];
  color: string;
  desc: [string, string];
  dedicationPerPoint: [string, string];
  icon: string;
}

export const WHEEL_SIDES: WheelSideInfo[] = [
  {
    id: 'fury',
    name: ['Fúria', 'Fury'],
    color: '#e54d42',
    desc: ['Poder de ataque brutal e combate agressivo.', 'Brutal attack power and aggressive combat.'],
    dedicationPerPoint: ['+0,15% de Ataque', '+0.15% Attack'],
    icon: 'steel_sword',
  },
  {
    id: 'precision',
    name: ['Precisão', 'Precision'],
    color: '#3b82f6',
    desc: ['Golpes críticos letais e velocidade de ataque.', 'Lethal critical hits and attack speed.'],
    dedicationPerPoint: ['+0,05% Crítico e +0,1% Dano Crítico', '+0.05% Crit and +0.1% Crit Damage'],
    icon: 'gold_ruby_ring',
  },
  {
    id: 'bastion',
    name: ['Bastião', 'Bastion'],
    color: '#10b981',
    desc: ['Vida reforçada, defesa impenetrável e resistências.', 'Bolstered health, impenetrable defense and resistances.'],
    dedicationPerPoint: ['+0,15% Vida e +0,1% Defesa', '+0.15% HP and +0.1% Defense'],
    icon: 'bronze_shield',
  },
  {
    id: 'arcane',
    name: ['Arcano', 'Arcane'],
    color: '#a855f7',
    desc: ['Reserva de mana expandida e magias devastadoras.', 'Expanded mana pool and devastating spells.'],
    dedicationPerPoint: ['+0,2% Mana e +0,1% Dano de Magia', '+0.2% Mana and +0.1% Spell Damage'],
    icon: 'arcane_shard',
  },
];

export const ORDERED_SIDES: WheelSideId[] = ['fury', 'precision', 'bastion', 'arcane'];

/**
 * Montagem das 36 fatias da Roda da Maestria.
 * Fatias indexadas de forma contínua no sentido horário:
 * inner: 8 fatias no total (2 por lado: 0, 1)
 * middle: 12 fatias no total (3 por lado: 0, 1, 2)
 * outer: 16 fatias no total (4 por lado: 0, 1, 2, 3)
 */
function buildWheelSlices(): WheelSlice[] {
  const slices: WheelSlice[] = [];

  const sideConvictions: Record<WheelSideId, { mid: WheelConviction; out1: WheelConviction; out2: WheelConviction }> = {
    fury: {
      mid: {
        id: 'fury_pack_hunter',
        name: ['Fúria em Bando', 'Pack Fury'],
        desc: ['+5% de dano contra bandos de 3 ou mais monstros.', '+5% damage against packs of 3+ monsters.'],
        icon: 'skill_combat',
        effects: { packDamagePct: 0.05 },
      },
      out1: {
        id: 'fury_leech',
        name: ['Sede Sangrenta', 'Bloodthirst'],
        desc: ['+1% de Roubo de Vida.', '+1% Lifesteal.'],
        icon: 'gold_ruby_ring',
        effects: { lifesteal: 0.01 },
      },
      out2: {
        id: 'fury_boss_slayer',
        name: ['Caçador de Titãs', 'Titan Slayer'],
        desc: ['+6% de dano contra chefes de covis, instâncias e chefes globais.', '+6% damage against bosses.'],
        icon: 'dragonite_sword',
        effects: { bossDamagePct: 0.06 },
      },
    },
    precision: {
      mid: {
        id: 'precision_celerity',
        name: ['Celeridade', 'Celerity'],
        desc: ['Ataques 3% mais rápidos.', 'Attacks 3% faster.'],
        icon: 'cape_mastery',
        effects: { speed: -0.03 },
      },
      out1: {
        id: 'precision_crit_mult',
        name: ['Fio Mortal', 'Deadly Edge'],
        desc: ['+8% de Dano Crítico.', '+8% Critical Damage.'],
        icon: 'steel_sword',
        effects: { critMult: 0.08 },
      },
      out2: {
        id: 'precision_crit_chance',
        name: ['Olho de Falcão', 'Hawk Eye'],
        desc: ['+1,5% de Chance de Crítico.', '+1.5% Critical Chance.'],
        icon: 'cyclops_eye',
        effects: { crit: 0.015 },
      },
    },
    bastion: {
      mid: {
        id: 'bastion_elements',
        name: ['Proteção Elemental', 'Elemental Ward'],
        desc: ['+3% de resistência a todos os elementos.', '+3% resistance to all elements.'],
        icon: 'anti_dragon_shield',
        effects: { allResistPct: 0.03 },
      },
      out1: {
        id: 'bastion_reduction',
        name: ['Armadura Inflexível', 'Unyielding Armor'],
        desc: ['-2% de dano recebido.', '-2% damage taken.'],
        icon: 'bronze_armor',
        effects: { damageReductionPct: 0.02 },
      },
      out2: {
        id: 'bastion_regen',
        name: ['Vigor Eterno', 'Eternal Vigor'],
        desc: ['+25% de Regeneração de vida.', '+25% Health Regeneration.'],
        icon: 'health_potion',
        effects: { regen: 0.25 },
      },
    },
    arcane: {
      mid: {
        id: 'arcane_cooldown',
        name: ['Fluxo Temporal', 'Time Flow'],
        desc: ['Magias com 5% menos recarga.', 'Spells have 5% lower cooldown.'],
        icon: 'apprentice_spellbook',
        effects: { spellCooldownReductionPct: 0.05 },
      },
      out1: {
        id: 'arcane_mana_pool',
        name: ['Fonte Arcana', 'Arcane Spring'],
        desc: ['+10% de Mana máxima.', '+10% Max Mana.'],
        icon: 'mana_potion',
        effects: { manaPct: 0.1 },
      },
      out2: {
        id: 'arcane_healing_power',
        name: ['Luz da Restauração', 'Light of Restoration'],
        desc: ['+10% na cura de magias.', '+10% spell healing.'],
        icon: 'emerald_amulet',
        effects: { spellHealPct: 0.1 },
      },
    },
  };

  const sideNamesPt: Record<WheelSideId, string> = { fury: 'Fúria', precision: 'Precisão', bastion: 'Bastião', arcane: 'Arcano' };
  const sideNamesEn: Record<WheelSideId, string> = { fury: 'Fury', precision: 'Precision', bastion: 'Bastion', arcane: 'Arcane' };

  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const side = ORDERED_SIDES[sIdx];
    const convictions = sideConvictions[side];

    // Inner: 2 fatias (custo 5)
    for (let i = 0; i < 2; i++) {
      slices.push({
        id: `${side}_inner_${i}`,
        side,
        ring: 'inner',
        indexInRing: i,
        cost: 5,
        name: [`${sideNamesPt[side]} Interior ${i + 1}`, `${sideNamesEn[side]} Inner ${i + 1}`],
        neighbors: [],
      });
    }

    // Middle: 3 fatias (custo 10). A fatia central (índice 1) ganha a Convicção do meio.
    for (let i = 0; i < 3; i++) {
      slices.push({
        id: `${side}_mid_${i}`,
        side,
        ring: 'middle',
        indexInRing: i,
        cost: 10,
        name: [`${sideNamesPt[side]} Mediano ${i + 1}`, `${sideNamesEn[side]} Middle ${i + 1}`],
        neighbors: [],
        conviction: i === 1 ? convictions.mid : undefined,
      });
    }

    // Outer: 4 fatias (custo 15). Fatias 1 e 2 ganham as duas convicções externas.
    for (let i = 0; i < 4; i++) {
      slices.push({
        id: `${side}_out_${i}`,
        side,
        ring: 'outer',
        indexInRing: i,
        cost: 15,
        name: [`${sideNamesPt[side]} Exterior ${i + 1}`, `${sideNamesEn[side]} Outer ${i + 1}`],
        neighbors: [],
        conviction: i === 1 ? convictions.out1 : i === 2 ? convictions.out2 : undefined,
      });
    }
  }

  // Mapeamento de vizinhos contínuos (anel mesmo nível, adjacentes radiais e bordas entre lados)
  const TOTAL_INNER = 8;
  const TOTAL_MID = 12;
  const TOTAL_OUT = 16;

  const innerId = (globalIdx: number) => {
    const mod = (globalIdx + TOTAL_INNER) % TOTAL_INNER;
    const side = ORDERED_SIDES[Math.floor(mod / 2)];
    return `${side}_inner_${mod % 2}`;
  };

  const midId = (globalIdx: number) => {
    const mod = (globalIdx + TOTAL_MID) % TOTAL_MID;
    const side = ORDERED_SIDES[Math.floor(mod / 3)];
    return `${side}_mid_${mod % 3}`;
  };

  const outId = (globalIdx: number) => {
    const mod = (globalIdx + TOTAL_OUT) % TOTAL_OUT;
    const side = ORDERED_SIDES[Math.floor(mod / 4)];
    return `${side}_out_${mod % 4}`;
  };

  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const side = ORDERED_SIDES[sIdx];

    // Inner 0 e 1
    for (let i = 0; i < 2; i++) {
      const g = sIdx * 2 + i;
      const s = slices.find((x) => x.id === `${side}_inner_${i}`)!;
      const n: string[] = [innerId(g - 1), innerId(g + 1)];
      // Radial para middle: cada fatia interna cobre 1.5 fatias medianas.
      // i=0 toca em mid 0 e 1. i=1 toca em mid 1 e 2.
      n.push(`${side}_mid_${i}`);
      n.push(`${side}_mid_${i + 1}`);
      s.neighbors = Array.from(new Set(n));
    }

    // Mid 0, 1 e 2
    for (let i = 0; i < 3; i++) {
      const g = sIdx * 3 + i;
      const s = slices.find((x) => x.id === `${side}_mid_${i}`)!;
      const n: string[] = [midId(g - 1), midId(g + 1)];
      // Conexão interna
      if (i === 0) n.push(`${side}_inner_0`);
      else if (i === 1) {
        n.push(`${side}_inner_0`);
        n.push(`${side}_inner_1`);
      } else if (i === 2) n.push(`${side}_inner_1`);

      // Conexão externa (3 fatias medianas encontram 4 externas):
      // mid 0 toca em out 0 e 1
      // mid 1 toca em out 1 e 2
      // mid 2 toca em out 2 e 3
      if (i === 0) {
        n.push(`${side}_out_0`);
        n.push(`${side}_out_1`);
      } else if (i === 1) {
        n.push(`${side}_out_1`);
        n.push(`${side}_out_2`);
      } else if (i === 2) {
        n.push(`${side}_out_2`);
        n.push(`${side}_out_3`);
      }
      s.neighbors = Array.from(new Set(n));
    }

    // Out 0, 1, 2 e 3
    for (let i = 0; i < 4; i++) {
      const g = sIdx * 4 + i;
      const s = slices.find((x) => x.id === `${side}_out_${i}`)!;
      const n: string[] = [outId(g - 1), outId(g + 1)];
      // Conexão com anel mediano
      if (i === 0) n.push(`${side}_mid_0`);
      else if (i === 1) {
        n.push(`${side}_mid_0`);
        n.push(`${side}_mid_1`);
      } else if (i === 2) {
        n.push(`${side}_mid_1`);
        n.push(`${side}_mid_2`);
      } else if (i === 3) n.push(`${side}_mid_2`);
      s.neighbors = Array.from(new Set(n));
    }
  }

  return slices;
}

export const WHEEL_SLICES: WheelSlice[] = buildWheelSlices();

export const wheelSliceById = (id: string | null | undefined): WheelSlice | undefined =>
  WHEEL_SLICES.find((s) => s.id === id);

export interface MasteryState {
  /** Progresso atual na barra do próximo nível de maestria. */
  xp: number;
  /** Pontos de Maestria disponíveis para investir na roda. */
  points: number;
  /** Pontos investidos em cada fatia da roda (0 <= pontos <= slice.cost). */
  slices: Partial<Record<string, number>>;
  /** Compatibilidade legado */
  nodes?: Partial<Record<string, number>>;
}

export const NO_MASTERY: MasteryState = { xp: 0, points: 0, slices: {}, nodes: {} };

/** Total de pontos gastos em todas as fatias da roda. */
export function masterySpentPoints(slices?: Partial<Record<string, number>>): number {
  if (!slices) return 0;
  let sum = 0;
  for (const s of WHEEL_SLICES) {
    const v = Math.max(0, Math.min(s.cost, Math.floor(Number(slices[s.id]) || 0)));
    sum += v;
  }
  return sum;
}

/** Pontos investidos em um lado específico da roda (inclui fatias em andamento). */
export function wheelSideInvestedPoints(slices: Partial<Record<string, number>> | undefined, side: WheelSideId): number {
  if (!slices) return 0;
  let sum = 0;
  for (const s of WHEEL_SLICES) {
    if (s.side !== side) continue;
    sum += Math.max(0, Math.min(s.cost, Math.floor(Number(slices[s.id]) || 0)));
  }
  return sum;
}

/** Pontos completos em um lado da roda (só fatias 100% completas contam para a Revelação). */
export function wheelSideCompletedPoints(slices: Partial<Record<string, number>> | undefined, side: WheelSideId): number {
  if (!slices) return 0;
  let sum = 0;
  for (const s of WHEEL_SLICES) {
    if (s.side !== side) continue;
    const v = Math.floor(Number(slices[s.id]) || 0);
    if (v >= s.cost) sum += s.cost;
  }
  return sum;
}

/** Verifica se a fatia está 100% completa. */
export function isSliceComplete(slices: Partial<Record<string, number>> | undefined, sliceId: string): boolean {
  if (!slices) return false;
  const s = wheelSliceById(sliceId);
  if (!s) return false;
  return (slices[sliceId] ?? 0) >= s.cost;
}

/**
 * Regra do caminho:
 * Só pode investir numa fatia se ela já tem pontos ou se é do anel interno,
 * OU se possui ao menos uma fatia vizinha 100% completa.
 */
export function isSliceAvailable(slices: Partial<Record<string, number>> | undefined, sliceId: string): boolean {
  const s = wheelSliceById(sliceId);
  if (!s) return false;
  const current = slices?.[sliceId] ?? 0;
  if (current >= s.cost) return false; // Já completa
  if (current > 0) return true; // Já começou a investir
  if (s.ring === 'inner') return true; // Fatias internas começam abertas pelo centro
  // Verifica se há vizinho completo
  return s.neighbors.some((nId) => isSliceComplete(slices, nId));
}

/** Valida se o jogador pode colocar 1 ponto na fatia indicada. */
export function canInvestMasteryPoint(state: MasteryState, sliceId: string): { ok: boolean; error?: string } {
  const s = wheelSliceById(sliceId);
  if (!s) return { ok: false, error: 'Fatia inválida.' };
  if (state.points < 1) return { ok: false, error: 'Você não tem pontos de Maestria disponíveis.' };
  const current = state.slices?.[s.id] ?? 0;
  if (current >= s.cost) return { ok: false, error: 'Esta fatia já está completa.' };
  if (!isSliceAvailable(state.slices, s.id)) {
    return { ok: false, error: 'Caminho bloqueado: complete uma fatia vizinha primeiro.' };
  }
  return { ok: true };
}

/** Custo em ouro para resetar a Roda da Maestria. */
export function masteryResetCost(slices?: Partial<Record<string, number>>): number {
  const spent = masterySpentPoints(slices);
  if (spent <= 0) return 0;
  return Math.max(MASTERY_RESET_MIN_GOLD, spent * MASTERY_RESET_GOLD_PER_POINT);
}

/**
 * Revelações (por classe e por lado):
 * Ativam com pontos completos naquele lado:
 * - 40 pontos: nível 1
 * - 70 pontos: nível 2
 * - 100 pontos: nível 3
 */
export function wheelRevelationLevel(completedPointsOnSide: number): 0 | 1 | 2 | 3 {
  if (completedPointsOnSide >= 100) return 3;
  if (completedPointsOnSide >= 70) return 2;
  if (completedPointsOnSide >= 40) return 1;
  return 0;
}

export interface RevelationInfo {
  side: WheelSideId;
  vocation: string;
  name: [string, string];
  desc: [string, string];
  ranks: [string, string][];
}

export const REVELATIONS: RevelationInfo[] = [
  // 🔴 Fúria
  {
    side: 'fury',
    vocation: 'warrior',
    name: ['Fúria Sangrenta', 'Bloody Fury'],
    desc: ['Abaixo de 30% de vida, concede um bônus massivo de ataque.', 'Below 30% HP, grants massive bonus attack.'],
    ranks: [
      ['Abaixo de 30% de vida, +10% de ataque.', 'Below 30% HP, +10% attack.'],
      ['Abaixo de 30% de vida, +18% de ataque.', 'Below 30% HP, +18% attack.'],
      ['Abaixo de 30% de vida, +25% de ataque.', 'Below 30% HP, +25% attack.'],
    ],
  },
  {
    side: 'fury',
    vocation: 'hunter',
    name: ['Flecha Ricocheteante', 'Bouncing Arrow'],
    desc: ['Chance de o tiro acertar mais um monstro vivo.', 'Chance for shots to hit an additional monster.'],
    ranks: [
      ['8% de chance de acertar +1 alvo.', '8% chance to hit +1 target.'],
      ['12% de chance de acertar +1 alvo.', '12% chance to hit +1 target.'],
      ['16% de chance de acertar +1 alvo.', '16% chance to hit +1 target.'],
    ],
  },
  {
    side: 'fury',
    vocation: 'arcanist',
    name: ['Explosão Arcana', 'Arcane Burst'],
    desc: ['A cada 10 golpes, causa uma explosão em área.', 'Every 10 hits, triggers an AoE burst.'],
    ranks: [
      ['A cada 10 golpes, explosão em área de 100% do ataque.', 'Every 10 hits, AoE burst of 100% attack.'],
      ['A cada 10 golpes, explosão em área de 150% do ataque.', 'Every 10 hits, AoE burst of 150% attack.'],
      ['A cada 10 golpes, explosão em área de 200% do ataque.', 'Every 10 hits, AoE burst of 200% attack.'],
    ],
  },
  {
    side: 'fury',
    vocation: 'devout',
    name: ['Martelo Sagrado', 'Holy Hammer'],
    desc: ['Golpes restauram vida com base no dano causado.', 'Hits restore health based on damage dealt.'],
    ranks: [
      ['Golpes curam 1% do dano causado.', 'Hits heal 1% of damage dealt.'],
      ['Golpes curam 2% do dano causado.', 'Hits heal 2% of damage dealt.'],
      ['Golpes curam 3% do dano causado.', 'Hits heal 3% of damage dealt.'],
    ],
  },

  // 🔵 Precisão
  {
    side: 'precision',
    vocation: 'warrior',
    name: ['Golpe Executor', 'Executioner Strike'],
    desc: ['Aumenta o dano causado em alvos com pouca vida.', 'Deals increased damage against low health targets.'],
    ranks: [
      ['+15% de dano em monstros abaixo de 30% de vida.', '+15% damage to monsters below 30% HP.'],
      ['+25% de dano em monstros abaixo de 30% de vida.', '+25% damage to monsters below 30% HP.'],
      ['+35% de dano em monstros abaixo de 30% de vida.', '+35% damage to monsters below 30% HP.'],
    ],
  },
  {
    side: 'precision',
    vocation: 'hunter',
    name: ['Olho Mortal', 'Deadly Eye'],
    desc: ['Ataques periódicos têm acerto crítico garantido.', 'Periodic attacks are guaranteed critical strikes.'],
    ranks: [
      ['Todo 6º ataque é crítico garantido.', 'Every 6th attack is a guaranteed critical hit.'],
      ['Todo 5º ataque é crítico garantido.', 'Every 5th attack is a guaranteed critical hit.'],
      ['Todo 4º ataque é crítico garantido.', 'Every 4th attack is a guaranteed critical hit.'],
    ],
  },
  {
    side: 'precision',
    vocation: 'arcanist',
    name: ['Ruptura', 'Shatter'],
    desc: ['Críticos mágicos reduzem a defesa do alvo.', 'Spell critical hits reduce target defense.'],
    ranks: [
      ['Críticos de magia reduzem a defesa em 5% por 5s.', 'Spell crits reduce defense by 5% for 5s.'],
      ['Críticos de magia reduzem a defesa em 8% por 5s.', 'Spell crits reduce defense by 8% for 5s.'],
      ['Críticos de magia reduzem a defesa em 12% por 5s.', 'Spell crits reduce defense by 12% for 5s.'],
    ],
  },
  {
    side: 'precision',
    vocation: 'devout',
    name: ['Veredito Divino', 'Divine Verdict'],
    desc: ['Acertos críticos curam o grupo ou o personagem.', 'Critical strikes heal the party or player.'],
    ranks: [
      ['Críticos curam 1% da vida.', 'Crits heal 1% HP.'],
      ['Críticos curam 2% da vida.', 'Crits heal 2% HP.'],
      ['Críticos curam 3% da vida.', 'Crits heal 3% HP.'],
    ],
  },

  // 🟢 Bastião
  {
    side: 'bastion',
    vocation: 'warrior',
    name: ['Último Bastião', 'Last Bastion'],
    desc: ['Ao chegar à beira da morte, recupera vida de emergência uma vez por luta.', 'Once per fight, recover HP when dropping low.'],
    ranks: [
      ['Uma vez por luta, ao cair de 20%, recupera 15% de vida.', 'Once per fight, dropping below 20% recovers 15% HP.'],
      ['Uma vez por luta, ao cair de 20%, recupera 25% de vida.', 'Once per fight, dropping below 20% recovers 25% HP.'],
      ['Uma vez por luta, ao cair de 20%, recupera 35% de vida.', 'Once per fight, dropping below 20% recovers 35% HP.'],
    ],
  },
  {
    side: 'bastion',
    vocation: 'hunter',
    name: ['Passo Ágil', 'Nimble Step'],
    desc: ['Chance passiva de esquivar de ataques inimigos.', 'Passive chance to dodge incoming enemy attacks.'],
    ranks: [
      ['4% de chance de esquiva.', '4% dodge chance.'],
      ['7% de chance de esquiva.', '7% dodge chance.'],
      ['10% de chance de esquiva.', '10% dodge chance.'],
    ],
  },
  {
    side: 'bastion',
    vocation: 'arcanist',
    name: ['Barreira Arcana', 'Arcane Barrier'],
    desc: ['Começa cada luta protegido por um escudo místico.', 'Starts each fight with a protective mystic shield.'],
    ranks: [
      ['Escudo de 5% da vida máxima no início da luta.', 'Shield of 5% max HP at start of fight.'],
      ['Escudo de 8% da vida máxima no início da luta.', 'Shield of 8% max HP at start of fight.'],
      ['Escudo de 12% da vida máxima no início da luta.', 'Shield of 12% max HP at start of fight.'],
    ],
  },
  {
    side: 'bastion',
    vocation: 'devout',
    name: ['Manto Sagrado', 'Sacred Mantle'],
    desc: ['Curas excedentes geram um escudo protetor temporário.', 'Overhealing converts into a protective shield.'],
    ranks: [
      ['Cura excedente vira escudo (até 10% da vida).', 'Overhealing converts to shield (up to 10% HP).'],
      ['Cura excedente vira escudo (até 15% da vida).', 'Overhealing converts to shield (up to 15% HP).'],
      ['Cura excedente vira escudo (até 20% da vida).', 'Overhealing converts to shield (up to 20% HP).'],
    ],
  },

  // 🟣 Arcano
  {
    side: 'arcane',
    vocation: 'warrior',
    name: ['Brado do Campeão', "Champion's Shout"],
    desc: ['Inicia o combate inflamado com bônus de ataque.', 'Starts combat empowered with bonus attack.'],
    ranks: [
      ['No início da luta, +8% de ataque por 10s.', 'At start of fight, +8% attack for 10s.'],
      ['No início da luta, +12% de ataque por 10s.', 'At start of fight, +12% attack for 10s.'],
      ['No início da luta, +16% de ataque por 10s.', 'At start of fight, +16% attack for 10s.'],
    ],
  },
  {
    side: 'arcane',
    vocation: 'hunter',
    name: ['Flecha Encantada', 'Enchanted Arrow'],
    desc: ['Aumenta o poder e a penetração elemental do imbuement.', 'Increases elemental power and penetration of imbuement.'],
    ranks: [
      ['+5% de dano elemental do imbuement.', '+5% imbuement elemental damage.'],
      ['+8% de dano elemental do imbuement.', '+8% imbuement elemental damage.'],
      ['+12% de dano elemental do imbuement.', '+12% imbuement elemental damage.'],
    ],
  },
  {
    side: 'arcane',
    vocation: 'arcanist',
    name: ['Fluxo Infinito', 'Infinite Flow'],
    desc: ['Chance de conjurar magias sem gastar mana.', 'Chance to cast spells without consuming mana.'],
    ranks: [
      ['8% de chance de magia não gastar mana.', '8% chance for free spellcast.'],
      ['12% de chance de magia não gastar mana.', '12% chance for free spellcast.'],
      ['16% de chance de magia não gastar mana.', '16% chance for free spellcast.'],
    ],
  },
  {
    side: 'arcane',
    vocation: 'devout',
    name: ['Graça Divina', 'Divine Grace'],
    desc: ['Potencializa a cura de todas as magias.', 'Increases the healing of all spells.'],
    ranks: [
      ['+10% na cura das magias.', '+10% spell healing.'],
      ['+18% na cura das magias.', '+18% spell healing.'],
      ['+25% na cura das magias.', '+25% spell healing.'],
    ],
  },
];

export function revelationFor(side: WheelSideId, vocation?: string): RevelationInfo | undefined {
  return REVELATIONS.find((r) => r.side === side && r.vocation === (vocation ?? 'warrior'));
}

/** Calcula todos os bônus estáticos somados da Roda da Maestria. */
export function masteryEffects(slices?: Partial<Record<string, number>>): WheelEffects {
  const out: WheelEffects = {
    attackPct: 0,
    crit: 0,
    critMult: 0,
    hpPct: 0,
    defensePct: 0,
    manaPct: 0,
    spellDamagePct: 0,
    packDamagePct: 0,
    lifesteal: 0,
    bossDamagePct: 0,
    speed: 0,
    allResistPct: 0,
    damageReductionPct: 0,
    regen: 0,
    spellCooldownReductionPct: 0,
    spellHealPct: 0,
  };

  if (!slices) return out;

  // 1. Dedicação: por ponto investido em cada lado
  const furyPts = wheelSideInvestedPoints(slices, 'fury');
  const precPts = wheelSideInvestedPoints(slices, 'precision');
  const bastPts = wheelSideInvestedPoints(slices, 'bastion');
  const arcaPts = wheelSideInvestedPoints(slices, 'arcane');

  out.attackPct += Number((furyPts * 0.0015).toFixed(6));
  out.crit += Number((precPts * 0.0005).toFixed(6));
  out.critMult += Number((precPts * 0.001).toFixed(6));
  out.hpPct += Number((bastPts * 0.0015).toFixed(6));
  out.defensePct += Number((bastPts * 0.001).toFixed(6));
  out.manaPct += Number((arcaPts * 0.002).toFixed(6));
  out.spellDamagePct += Number((arcaPts * 0.001).toFixed(6));

  // 2. Convicções: fatias completas que concedem efeitos adicionais
  for (const s of WHEEL_SLICES) {
    if (!s.conviction) continue;
    const v = Math.floor(Number(slices[s.id]) || 0);
    if (v < s.cost) continue; // Convicção só com fatia completa

    for (const [k, val] of Object.entries(s.conviction.effects) as [keyof WheelEffects, number][]) {
      out[k] = Number(((out[k] ?? 0) + val).toFixed(6));
    }
  }

  return out;
}

import type { Bonus } from './skills.ts';

/** Aplica os bônus da Maestria no objeto Bonus do jogador. */
export function withMastery(bonus: Bonus, slices?: Partial<Record<string, number>>): Bonus {
  if (!slices) return bonus;
  const eff = masteryEffects(slices);

  return {
    ...bonus,
    ...(eff.attackPct ? { attackPct: Number(((bonus.attackPct ?? 0) + eff.attackPct).toFixed(6)) } : {}),
    ...(eff.crit ? { crit: Number(((bonus.crit ?? 0) + eff.crit).toFixed(6)) } : {}),
    ...(eff.critMult ? { critMult: Number(((bonus.critMult ?? 0) + eff.critMult).toFixed(6)) } : {}),
    ...(eff.hpPct ? { hpPct: Number(((bonus.hpPct ?? 0) + eff.hpPct).toFixed(6)) } : {}),
    ...(eff.defensePct ? { defensePct: Number(((bonus.defensePct ?? 0) + eff.defensePct).toFixed(6)) } : {}),
    ...(eff.lifesteal ? { lifesteal: Number(((bonus.lifesteal ?? 0) + eff.lifesteal).toFixed(6)) } : {}),
    ...(eff.speed ? { speed: Number(((bonus.speed ?? 0) + eff.speed).toFixed(6)) } : {}),
    ...(eff.regen ? { regen: Number(((bonus.regen ?? 0) + eff.regen).toFixed(6)) } : {}),
    ...(eff.manaPct ? { mana: Number(((bonus.mana ?? 0) + eff.manaPct).toFixed(6)) } : {}),
    ...(eff.damageReductionPct ? { reduction: Number(((bonus.reduction ?? 0) + eff.damageReductionPct).toFixed(6)) } : {}),
    ...(eff.allResistPct
      ? {
          resFire: Number(((bonus.resFire ?? 0) + eff.allResistPct).toFixed(6)),
          resWater: Number(((bonus.resWater ?? 0) + eff.allResistPct).toFixed(6)),
          resEarth: Number(((bonus.resEarth ?? 0) + eff.allResistPct).toFixed(6)),
          resEnergy: Number(((bonus.resEnergy ?? 0) + eff.allResistPct).toFixed(6)),
          resHoly: Number(((bonus.resHoly ?? 0) + eff.allResistPct).toFixed(6)),
          resDeath: Number(((bonus.resDeath ?? 0) + eff.allResistPct).toFixed(6)),
        }
      : {}),
  };
}

// Compatibilidade transitória para código existente
export type MasteryNodeId = string;
export const MASTERY_NODES = WHEEL_SLICES;
export const masteryNodesFor = (_voc?: string) => WHEEL_SLICES;
export const masteryNodeById = wheelSliceById;
export const canUnlockMasteryNode = canInvestMasteryPoint;
export const masteryBranchSpent = wheelSideInvestedPoints;
