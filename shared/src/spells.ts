import type { Element } from './elements.ts';
/**
 * Magias e habilidades das vocações. O jogador equipa até maxSpells(nível); na luta
 * elas são lançadas sozinhas (é um idle), na ordem: cura quando a vida está
 * baixa, escudo/buff quando não estão ativos, golpe forte no lugar do ataque.
 * O custo é uma fração da mana máxima, então elas não ficam baratas no nível alto.
 */
export type SpellEffect =
  /** Golpe no lugar do ataque normal, com o dano multiplicado (`area`: acerta todos os monstros). */
  | {
      kind: 'strike';
      mult: number;
      area?: boolean;
      /** Área sem a perda de dano nos outros alvos (todos levam o golpe cheio). */
      fullArea?: boolean;
      /** Golpe de misericórdia: alvo abaixo de `below` da vida leva `mult` vezes mais. */
      execute?: { below: number; mult: number };
      /** Atravessa: acerta também os próximos N monstros vivos com o golpe cheio. */
      pierce?: number;
      /** Cura esta fração do dano causado pela magia. */
      drain?: number;
      /** Sempre crítico. */
      sureCrit?: boolean;
      /** Depois do golpe, recebe menos dano por um tempo (como o escudo). */
      guard?: { reduce: number; durationMs: number };
    }

  /** Cura uma fração da vida máxima quando a vida cai abaixo de `below`. */
  | { kind: 'heal'; pct: number; below: number }
  /** Aumenta ataque e/ou crítico por um tempo. */
  | { kind: 'buff'; attack?: number; crit?: number; durationMs: number }
  /** Reduz o dano recebido por um tempo. */
  | {
      kind: 'shield';
      reduce: number;
      durationMs: number;
      /** Ao lançar, cura esta fração da vida máxima. */
      heal?: number;
      /** Também aumenta o ataque enquanto dura. */
      attack?: number;
    };

export interface Spell {
  /** Elemento do golpe (magia de ataque); sem ele, o golpe é físico como a arma. */
  element?: Element;
  id: string;
  vocation: string;
  name: string;
  description: string;
  /** Nível de combate para liberar. */
  level: number;
  /** Custo em pontos de mana. */
  cost: number;
  cooldownMs: number;
  effect: SpellEffect;
  /** Ultimate: só desta promoção (Tier 4, nível 200). Não ocupa vaga na barra e sai sozinha. */
  promotion?: string;
}

export const MAX_SPELLS = 4;

/** Quando a magia de ataque sai na barra de ação: assim que pronta, ou só com 2+/3+ monstros vivos. */
export type StrikeWhen = 'ready' | 'aoe2' | 'aoe3';

/**
 * Condições da barra de ação. Com `priority`, a magia de ataque que sai é a primeira
 * pronta na ordem da barra que cumpre a condição; sem ele, o jogo escolhe a que mais rende.
 * As frações de vida/mana trocam o limite padrão de cada cura, da runa de cura e da poção de mana.
 */
export interface CombatRules {
  priority?: boolean;
  strike?: Record<string, StrikeWhen>;
  heal?: Record<string, number>;
  manaBelow?: number;
  runeHealBelow?: number;
  /** Poção de vida depois da luta só com a vida abaixo disto (sem valor: depois de qualquer dano). */
  foodBelow?: number;
}

const fraction = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0.05 && v <= 0.95 ? Math.round(v * 100) / 100 : undefined);

/** Valida as condições vindas do cliente (só magias que existem e frações entre 5% e 95%). */
export function validCombatRules(raw: unknown): CombatRules | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: CombatRules = {};
  if (r.priority === true) out.priority = true;
  if (r.strike && typeof r.strike === 'object') {
    out.strike = {};
    for (const [id, w] of Object.entries(r.strike as Record<string, unknown>)) {
      if (spellById(id)?.effect.kind === 'strike' && (w === 'ready' || w === 'aoe2' || w === 'aoe3')) out.strike[id] = w;
    }
  }
  if (r.heal && typeof r.heal === 'object') {
    out.heal = {};
    for (const [id, v] of Object.entries(r.heal as Record<string, unknown>)) {
      const f = fraction(v);
      if (spellById(id)?.effect.kind === 'heal' && f !== undefined) out.heal[id] = f;
    }
  }
  const mana = fraction(r.manaBelow);
  if (mana !== undefined) out.manaBelow = mana;
  const rune = fraction(r.runeHealBelow);
  if (rune !== undefined) out.runeHealBelow = rune;
  const food = fraction(r.foodBelow);
  if (food !== undefined) out.foodBelow = food;
  return out;
}
/** Nível em que abre a 4ª vaga de magia. */
export const FOURTH_SPELL_LEVEL = 60;
/** Vagas de magia no nível: 3, e a 4ª no nível 60. */
export const maxSpells = (level: number) => (level >= FOURTH_SPELL_LEVEL ? 4 : 3);

/** Regeneração base de mana por segundo de luta para cada vocação. */
export const VOCATION_MANA_REGEN: Record<string, number> = {
  warrior: 2,
  hunter: 4,
  devout: 6,
  arcanist: 8,
};
/** @deprecated Usar VOCATION_MANA_REGEN */
export const MANA_REGEN = 0.03;

export const SPELLS: Spell[] = [
  // Guerreiro
  { id: 'brutal_strike', vocation: 'warrior', name: 'Golpe Brutal', description: 'Um golpe com 60% a mais de força.', level: 1, cost: 15, cooldownMs: 6000, effect: { kind: 'strike', mult: 1.6 } },
  { id: 'war_cry', vocation: 'warrior', name: 'Grito de Guerra', description: '+25% de ataque por 8s.', level: 8, cost: 25, cooldownMs: 20000, effect: { kind: 'buff', attack: 0.25, durationMs: 8000 } },
  { id: 'iron_skin', vocation: 'warrior', name: 'Pele de Ferro', description: 'Recebe 40% menos dano por 6s.', level: 15, cost: 30, cooldownMs: 18000, effect: { kind: 'shield', reduce: 0.4, durationMs: 6000 } },
  { id: 'whirlwind', vocation: 'warrior', name: 'Golpe Giratório', description: 'Golpe com o dobro da força.', level: 25, cost: 45, cooldownMs: 11000, effect: { kind: 'strike', mult: 2.1 } },
  { id: 'earthquake', vocation: 'warrior', name: 'Terremoto', description: 'Acerta todos os monstros com 1,8x o dano, sem perder força nos de trás.', level: 45, cost: 30, cooldownMs: 12000, effect: { kind: 'strike', mult: 1.8, area: true, fullArea: true }, element: 'earth' },
  { id: 'berserk', vocation: 'warrior', name: 'Fúria Berserker', description: '+20% de ataque e +5% de crítico por 10s.', level: 70, cost: 85, cooldownMs: 26000, effect: { kind: 'buff', attack: 0.2, crit: 0.05, durationMs: 10000 } },
  // 27/10: o guerreiro (pouca mana) ficava muito atrás nos bandos; área cheia barata, simulada com Mydnat, Myeggs e Xaolin.
  { id: 'seismic_rift', vocation: 'warrior', name: 'Fenda Sísmica', description: 'Abre o chão e acerta todos os monstros com 2,4x o dano, sem perder força nos de trás.', level: 100, cost: 40, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.4, area: true, fullArea: true }, element: 'earth' },
  { id: 'execution', vocation: 'warrior', name: 'Lâmina Executora', description: 'Golpe com 2,2x o dano; em quem está abaixo de 30% da vida, o dobro.', level: 100, cost: 110, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.2, execute: { below: 0.3, mult: 2 } } },
  // Caçador
  { id: 'aimed_shot', vocation: 'hunter', name: 'Flecha Certeira', description: 'Uma flecha com 50% a mais de dano.', level: 1, cost: 18, cooldownMs: 5000, effect: { kind: 'strike', mult: 1.5 } },
  { id: 'focus', vocation: 'hunter', name: 'Foco', description: '+25% de chance de crítico por 8s.', level: 8, cost: 25, cooldownMs: 18000, effect: { kind: 'buff', crit: 0.25, durationMs: 8000 } },
  { id: 'field_bandage', vocation: 'hunter', name: 'Curativo de Campo', description: 'Cura 25% da vida quando cai abaixo da metade.', level: 15, cost: 35, cooldownMs: 12000, effect: { kind: 'heal', pct: 0.25, below: 0.5 } },
  { id: 'arrow_rain', vocation: 'hunter', name: 'Chuva de Flechas', description: 'Uma saraivada com o dobro do dano.', level: 25, cost: 50, cooldownMs: 10000, effect: { kind: 'strike', mult: 2.1 } },
  { id: 'explosive_arrows', vocation: 'hunter', name: 'Flechas Explosivas', description: 'Acerta todos os monstros com 1,3x o dano.', level: 45, cost: 70, cooldownMs: 12000, effect: { kind: 'strike', mult: 1.3, area: true }, element: 'fire' },
  { id: 'eagle_eye', vocation: 'hunter', name: 'Olho de Águia', description: '+20% de crítico e +5% de ataque por 10s.', level: 70, cost: 85, cooldownMs: 26000, effect: { kind: 'buff', attack: 0.05, crit: 0.2, durationMs: 10000 } },
  { id: 'piercing_shot', vocation: 'hunter', name: 'Tiro Perfurante', description: 'Uma flecha com 2,2x o dano que atravessa e acerta mais 2 monstros com o dano cheio.', level: 100, cost: 120, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.2, pierce: 2 } },
  // Arcanista
  { id: 'fireball', vocation: 'arcanist', name: 'Bola de Fogo', description: 'Explosão com 1,7x o dano.', level: 1, cost: 25, cooldownMs: 5000, effect: { kind: 'strike', mult: 1.7 }, element: 'fire' },
  { id: 'lightning', vocation: 'arcanist', name: 'Raio', description: 'Descarga com 2,2x o dano.', level: 10, cost: 45, cooldownMs: 8000, effect: { kind: 'strike', mult: 2.2 }, element: 'energy' },
  { id: 'arcane_shield', vocation: 'arcanist', name: 'Escudo Arcano', description: 'Recebe 50% menos dano por 6s.', level: 15, cost: 55, cooldownMs: 16000, effect: { kind: 'shield', reduce: 0.5, durationMs: 6000 } },
  { id: 'ice_storm', vocation: 'arcanist', name: 'Tempestade de Gelo', description: 'Tempestade com 3x o dano.', level: 30, cost: 90, cooldownMs: 14000, effect: { kind: 'strike', mult: 3 }, element: 'water' },
  { id: 'meteor', vocation: 'arcanist', name: 'Chuva de Meteoros', description: 'Acerta todos os monstros com 1,6x o dano, sem perder força nos de trás.', level: 45, cost: 130, cooldownMs: 10000, effect: { kind: 'strike', mult: 1.6, area: true, fullArea: true }, element: 'fire' },
  { id: 'mana_barrier', vocation: 'arcanist', name: 'Barreira de Mana', description: 'Recebe 60% menos dano por 7s.', level: 70, cost: 160, cooldownMs: 20000, effect: { kind: 'shield', reduce: 0.6, durationMs: 7000 } },
  { id: 'arcane_inferno', vocation: 'arcanist', name: 'Inferno Arcano', description: 'Acerta todos os monstros com 2,6x o dano, sem perder força nos de trás.', level: 100, cost: 240, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.6, area: true, fullArea: true }, element: 'energy' },
  // Depois das outras: as magias padrão são as primeiras da lista e quem nunca escolheu não perde nenhuma.
  { id: 'flame_wave', vocation: 'arcanist', name: 'Onda de Chamas', description: 'Acerta todos os monstros com 1,2x o dano, sem perder força nos de trás.', level: 20, cost: 55, cooldownMs: 8000, effect: { kind: 'strike', mult: 1.2, area: true, fullArea: true }, element: 'fire' },
  // Devoto
  { id: 'heal', vocation: 'devout', name: 'Cura', description: 'Cura 30% da vida quando cai abaixo de 60%.', level: 1, cost: 25, cooldownMs: 6000, effect: { kind: 'heal', pct: 0.3, below: 0.6 } },
  { id: 'holy_light', vocation: 'devout', name: 'Luz Sagrada', description: 'Um golpe de luz com 50% a mais de dano.', level: 5, cost: 20, cooldownMs: 6000, effect: { kind: 'strike', mult: 1.5 }, element: 'holy' },
  { id: 'blessing', vocation: 'devout', name: 'Bênção', description: 'Recebe 35% menos dano por 8s.', level: 12, cost: 40, cooldownMs: 20000, effect: { kind: 'shield', reduce: 0.35, durationMs: 8000 } },
  { id: 'great_heal', vocation: 'devout', name: 'Grande Cura', description: 'Cura 55% da vida quando cai abaixo de 40%.', level: 25, cost: 70, cooldownMs: 12000, effect: { kind: 'heal', pct: 0.55, below: 0.4 } },
  { id: 'judgement', vocation: 'devout', name: 'Julgamento', description: 'Acerta todos os monstros com 1,3x o dano.', level: 45, cost: 110, cooldownMs: 12000, effect: { kind: 'strike', mult: 1.3, area: true }, element: 'holy' },
  { id: 'divine_heal', vocation: 'devout', name: 'Cura Divina', description: 'Cura 60% da vida quando cai abaixo de 70%.', level: 70, cost: 140, cooldownMs: 10000, effect: { kind: 'heal', pct: 0.6, below: 0.7 } },
  { id: 'divine_wrath', vocation: 'devout', name: 'Ira Divina', description: 'Um raio sagrado com 2,4x o dano que atravessa e acerta mais 1 monstro, e cura 25% do dano causado.', level: 100, cost: 200, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.4, pierce: 1, drain: 0.25 }, element: 'holy' },
  // Ultimates (Ascensão Mítica, nível 200): uma por caminho, de graça e com recarga longa.
  { id: 'divine_wall', vocation: 'warrior', promotion: 'eternal_aegis', name: 'Muralha Divina', description: 'Recebe 75% menos dano por 8s e cura 30% da vida.', level: 200, cost: 0, cooldownMs: 40000, effect: { kind: 'shield', reduce: 0.75, durationMs: 8000, heal: 0.3 } },
  { id: 'cataclysm', vocation: 'warrior', promotion: 'war_avatar', name: 'Cataclismo', description: 'Acerta todos os monstros com 3,5x o dano, sem perder força nos de trás.', level: 200, cost: 0, cooldownMs: 30000, effect: { kind: 'strike', mult: 3.5, area: true, fullArea: true }, element: 'earth' },
  { id: 'dark_harvest', vocation: 'warrior', promotion: 'perpetual_king', name: 'Colheita Sombria', description: 'Golpe com 4x o dano que cura 60% do dano causado.', level: 200, cost: 0, cooldownMs: 30000, effect: { kind: 'strike', mult: 4, drain: 0.6 }, element: 'death' },
  { id: 'celestial_shot', vocation: 'hunter', promotion: 'sky_eye', name: 'Tiro Celestial', description: 'Uma flecha com 5x o dano, sempre crítica.', level: 200, cost: 0, cooldownMs: 30000, effect: { kind: 'strike', mult: 5, sureCrit: true }, element: 'energy' },
  { id: 'thousand_blades', vocation: 'hunter', promotion: 'void_queen', name: 'Mil Lâminas', description: 'Golpe com 4x o dano que atravessa todos os monstros e cura 20% do dano causado.', level: 200, cost: 0, cooldownMs: 30000, effect: { kind: 'strike', mult: 4, pierce: 99, drain: 0.2 }, element: 'death' },
  { id: 'endless_hail', vocation: 'hunter', promotion: 'hail_lord', name: 'Saraivada Infinita', description: '+60% de ataque e +30% de crítico por 10s.', level: 200, cost: 0, cooldownMs: 35000, effect: { kind: 'buff', attack: 0.6, crit: 0.3, durationMs: 10000 } },
  { id: 'supernova', vocation: 'arcanist', promotion: 'star_mind', name: 'Supernova', description: 'Acerta todos os monstros com 3,75x o dano, sem perder força nos de trás.', level: 200, cost: 0, cooldownMs: 30000, effect: { kind: 'strike', mult: 3.75, area: true, fullArea: true }, element: 'fire' },
  { id: 'soul_drain', vocation: 'arcanist', promotion: 'lich_emperor', name: 'Dreno da Alma', description: 'Acerta todos os monstros com 4x o dano e cura 40% do dano causado.', level: 200, cost: 0, cooldownMs: 30000, effect: { kind: 'strike', mult: 4, area: true, drain: 0.4 }, element: 'death' },
  { id: 'absolute_zero', vocation: 'arcanist', promotion: 'glacial_era', name: 'Zero Absoluto', description: 'Acerta todos os monstros com 4,5x o dano de gelo e depois recebe 70% menos dano por 6s.', level: 200, cost: 0, cooldownMs: 35000, effect: { kind: 'strike', mult: 4.5, area: true, guard: { reduce: 0.7, durationMs: 6000 } }, element: 'water' },
  { id: 'resurrection', vocation: 'devout', promotion: 'living_miracle', name: 'Ressurreição', description: 'Cura toda a vida quando cai abaixo de 25%.', level: 200, cost: 0, cooldownMs: 45000, effect: { kind: 'heal', pct: 1, below: 0.25 } },
  { id: 'seraph_wings', vocation: 'devout', promotion: 'seraph', name: 'Asas do Serafim', description: 'Recebe 65% menos dano e tem +30% de ataque por 10s.', level: 200, cost: 0, cooldownMs: 40000, effect: { kind: 'shield', reduce: 0.65, durationMs: 10000, attack: 0.3 } },
  { id: 'final_judgement', vocation: 'devout', promotion: 'hand_of_god', name: 'Juízo Final', description: 'Acerta todos os monstros com 2,5x o dano sagrado; em quem está abaixo de 30% da vida, o dobro.', level: 200, cost: 0, cooldownMs: 35000, effect: { kind: 'strike', mult: 2.5, area: true, execute: { below: 0.3, mult: 2 } }, element: 'holy' },
];


export interface WheelSpellDef {
  side: 'fury' | 'precision' | 'bastion' | 'arcane';
  base: Spell;
  strong: Spell;
}

export const WHEEL_SPELLS: WheelSpellDef[] = [
  // 🔴 Fúria
  {
    side: 'fury',
    base: { id: 'wheel_fury_warrior', vocation: 'warrior', name: 'Redemoinho de Aço', description: 'Acerta todos os monstros com 150% do ataque a cada 12s.', level: 400, cost: 70, cooldownMs: 12000, effect: { kind: 'strike', mult: 1.5, area: true } },
    strong: { id: 'wheel_fury_warrior', vocation: 'warrior', name: 'Redemoinho de Aço (Forte)', description: 'Acerta todos os monstros com 220% do ataque a cada 10s.', level: 400, cost: 70, cooldownMs: 10000, effect: { kind: 'strike', mult: 2.2, area: true } }
  },
  {
    side: 'fury',
    base: { id: 'wheel_fury_hunter', vocation: 'hunter', name: 'Tempestade de Penas', description: 'Dispara 5 flechas de 60% do ataque em alvos aleatórios a cada 12s.', level: 400, cost: 80, cooldownMs: 12000, effect: { kind: 'strike', mult: 0.6, pierce: 4 } },
    strong: { id: 'wheel_fury_hunter', vocation: 'hunter', name: 'Tempestade de Penas (Forte)', description: 'Dispara 8 flechas de 60% do ataque em alvos aleatórios a cada 12s.', level: 400, cost: 80, cooldownMs: 12000, effect: { kind: 'strike', mult: 0.6, pierce: 7 } }
  },
  {
    side: 'fury',
    base: { id: 'wheel_fury_arcanist', vocation: 'arcanist', name: 'Queda Estelar', description: 'Explosão de fogo em área de 250% do ataque a cada 15s.', level: 400, cost: 150, cooldownMs: 15000, effect: { kind: 'strike', mult: 2.5, area: true, fullArea: true }, element: 'fire' },
    strong: { id: 'wheel_fury_arcanist', vocation: 'arcanist', name: 'Queda Estelar (Forte)', description: 'Explosão de fogo em área de 350% do ataque a cada 15s com chão queimando.', level: 400, cost: 150, cooldownMs: 15000, effect: { kind: 'strike', mult: 3.5, area: true, fullArea: true }, element: 'fire' }
  },
  {
    side: 'fury',
    base: { id: 'wheel_fury_devout', vocation: 'devout', name: 'Martelo da Justiça', description: 'Golpe sagrado de 200% do ataque e cura 5% da vida máxima a cada 12s.', level: 400, cost: 90, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.0, drain: 0.25 }, element: 'holy' },
    strong: { id: 'wheel_fury_devout', vocation: 'devout', name: 'Martelo da Justiça (Forte)', description: 'Golpe sagrado de 280% do ataque e cura 8% da vida máxima a cada 12s.', level: 400, cost: 90, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.8, drain: 0.35 }, element: 'holy' }
  },

  // 🔵 Precisão
  {
    side: 'precision',
    base: { id: 'wheel_precision_warrior', vocation: 'warrior', name: 'Execução', description: 'Golpe de 300% do ataque; mata instantaneamente se o alvo estiver abaixo de 15% de vida.', level: 400, cost: 80, cooldownMs: 15000, effect: { kind: 'strike', mult: 3.0, execute: { below: 0.15, mult: 99 } } },
    strong: { id: 'wheel_precision_warrior', vocation: 'warrior', name: 'Execução (Forte)', description: 'Golpe de 300% do ataque; mata instantaneamente se o alvo estiver abaixo de 20% de vida.', level: 400, cost: 80, cooldownMs: 15000, effect: { kind: 'strike', mult: 3.0, execute: { below: 0.20, mult: 99 } } }
  },
  {
    side: 'precision',
    base: { id: 'wheel_precision_hunter', vocation: 'hunter', name: 'Disparo Trespassante', description: 'Tiro de 220% do ataque que atravessa e acerta até 3 monstros a cada 10s.', level: 400, cost: 80, cooldownMs: 10000, effect: { kind: 'strike', mult: 2.2, pierce: 2 } },
    strong: { id: 'wheel_precision_hunter', vocation: 'hunter', name: 'Disparo Trespassante (Forte)', description: 'Tiro de 300% do ataque que atravessa e acerta até 5 monstros a cada 10s.', level: 400, cost: 80, cooldownMs: 10000, effect: { kind: 'strike', mult: 3.0, pierce: 4 } }
  },
  {
    side: 'precision',
    base: { id: 'wheel_precision_arcanist', vocation: 'arcanist', name: 'Lança de Gelo', description: 'Projétil de gelo de 280% do ataque a cada 12s.', level: 400, cost: 130, cooldownMs: 12000, effect: { kind: 'strike', mult: 2.8 }, element: 'water' },
    strong: { id: 'wheel_precision_arcanist', vocation: 'arcanist', name: 'Lança de Gelo (Forte)', description: 'Projétil de gelo de 360% do ataque a cada 12s.', level: 400, cost: 130, cooldownMs: 12000, effect: { kind: 'strike', mult: 3.6 }, element: 'water' }
  },
  {
    side: 'precision',
    base: { id: 'wheel_precision_devout', vocation: 'devout', name: 'Sentença', description: 'Marca o alvo por 6s com acerto crítico garantido em todo dano a cada 18s.', level: 400, cost: 100, cooldownMs: 18000, effect: { kind: 'strike', mult: 2.0, sureCrit: true }, element: 'holy' },
    strong: { id: 'wheel_precision_devout', vocation: 'devout', name: 'Sentença (Forte)', description: 'Marca o alvo por 8s com acerto crítico garantido em todo dano a cada 18s.', level: 400, cost: 100, cooldownMs: 18000, effect: { kind: 'strike', mult: 2.4, sureCrit: true }, element: 'holy' }
  },

  // 🟢 Bastião
  {
    side: 'bastion',
    base: { id: 'wheel_bastion_warrior', vocation: 'warrior', name: 'Muralha Viva', description: 'Reduz o dano recebido em 40% por 6s a cada 25s.', level: 400, cost: 60, cooldownMs: 25000, effect: { kind: 'shield', reduce: 0.40, durationMs: 6000 } },
    strong: { id: 'wheel_bastion_warrior', vocation: 'warrior', name: 'Muralha Viva (Forte)', description: 'Reduz o dano recebido em 50% por 8s a cada 25s.', level: 400, cost: 60, cooldownMs: 25000, effect: { kind: 'shield', reduce: 0.50, durationMs: 8000 } }
  },
  {
    side: 'bastion',
    base: { id: 'wheel_bastion_hunter', vocation: 'hunter', name: 'Rolamento', description: 'Esquiva e absorve impacto com 60% de redução por 5s a cada 20s.', level: 400, cost: 60, cooldownMs: 20000, effect: { kind: 'shield', reduce: 0.60, durationMs: 5000 } },
    strong: { id: 'wheel_bastion_hunter', vocation: 'hunter', name: 'Rolamento (Forte)', description: 'Esquiva e absorve impacto com 70% de redução por 6s a cada 20s.', level: 400, cost: 60, cooldownMs: 20000, effect: { kind: 'shield', reduce: 0.70, durationMs: 6000 } }
  },
  {
    side: 'bastion',
    base: { id: 'wheel_bastion_arcanist', vocation: 'arcanist', name: 'Véu Arcano', description: 'Barreira mística de proteção de 65% por 8s a cada 25s.', level: 400, cost: 120, cooldownMs: 25000, effect: { kind: 'shield', reduce: 0.65, durationMs: 8000 } },
    strong: { id: 'wheel_bastion_arcanist', vocation: 'arcanist', name: 'Véu Arcano (Forte)', description: 'Barreira mística de proteção de 75% por 12s a cada 25s.', level: 400, cost: 120, cooldownMs: 25000, effect: { kind: 'shield', reduce: 0.75, durationMs: 12000 } }
  },
  {
    side: 'bastion',
    base: { id: 'wheel_bastion_devout', vocation: 'devout', name: 'Bênção do Refúgio', description: 'Cura 20% da vida e concede escudo de 10% por 8s a cada 25s.', level: 400, cost: 110, cooldownMs: 25000, effect: { kind: 'shield', reduce: 0.35, durationMs: 8000, heal: 0.20 } },
    strong: { id: 'wheel_bastion_devout', vocation: 'devout', name: 'Bênção do Refúgio (Forte)', description: 'Cura 30% da vida e concede escudo de 15% por 10s a cada 25s.', level: 400, cost: 110, cooldownMs: 25000, effect: { kind: 'shield', reduce: 0.45, durationMs: 10000, heal: 0.30 } }
  },

  // 🟣 Arcano
  {
    side: 'arcane',
    base: { id: 'wheel_arcane_warrior', vocation: 'warrior', name: 'Avatar do Aço', description: '+25% de ataque e +25% de defesa por 10s a cada 40s.', level: 400, cost: 80, cooldownMs: 40000, effect: { kind: 'shield', reduce: 0.25, durationMs: 10000, attack: 0.25 } },
    strong: { id: 'wheel_arcane_warrior', vocation: 'warrior', name: 'Avatar do Aço (Forte)', description: '+35% de ataque e +35% de defesa por 10s a cada 40s.', level: 400, cost: 80, cooldownMs: 40000, effect: { kind: 'shield', reduce: 0.35, durationMs: 10000, attack: 0.35 } }
  },
  {
    side: 'arcane',
    base: { id: 'wheel_arcane_hunter', vocation: 'hunter', name: 'Avatar da Caça', description: '+30% de velocidade de ataque e +15% de crítico por 10s a cada 40s.', level: 400, cost: 80, cooldownMs: 40000, effect: { kind: 'buff', crit: 0.15, attack: 0.20, durationMs: 10000 } },
    strong: { id: 'wheel_arcane_hunter', vocation: 'hunter', name: 'Avatar da Caça (Forte)', description: '+40% de velocidade de ataque e +20% de crítico por 10s a cada 40s.', level: 400, cost: 80, cooldownMs: 40000, effect: { kind: 'buff', crit: 0.20, attack: 0.30, durationMs: 10000 } }
  },
  {
    side: 'arcane',
    base: { id: 'wheel_arcane_arcanist', vocation: 'arcanist', name: 'Avatar do Éter', description: '+30% de ataque e recarga de magias acelerada por 10s a cada 40s.', level: 400, cost: 160, cooldownMs: 40000, effect: { kind: 'buff', attack: 0.30, durationMs: 10000 } },
    strong: { id: 'wheel_arcane_arcanist', vocation: 'arcanist', name: 'Avatar do Éter (Forte)', description: '+45% de ataque e recarga de magias acelerada por 10s a cada 40s.', level: 400, cost: 160, cooldownMs: 40000, effect: { kind: 'buff', attack: 0.45, durationMs: 10000 } }
  },
  {
    side: 'arcane',
    base: { id: 'wheel_arcane_devout', vocation: 'devout', name: 'Avatar da Luz', description: '+40% de cura e 60% menos dano recebido por 8s a cada 40s.', level: 400, cost: 140, cooldownMs: 40000, effect: { kind: 'shield', reduce: 0.60, durationMs: 8000, heal: 0.40 } },
    strong: { id: 'wheel_arcane_devout', vocation: 'devout', name: 'Avatar da Luz (Forte)', description: '+55% de cura e 75% menos dano recebido por 10s a cada 40s.', level: 400, cost: 140, cooldownMs: 40000, effect: { kind: 'shield', reduce: 0.75, durationMs: 10000, heal: 0.55 } }
  }
];

export function wheelSpellFor(side: 'fury' | 'precision' | 'bastion' | 'arcane', vocation: string, isStrong: boolean): Spell | undefined {
  const found = WHEEL_SPELLS.find((w) => w.side === side && w.base.vocation === vocation);
  if (!found) return undefined;
  return isStrong ? found.strong : found.base;
}

export function allWheelSpells(): Spell[] {
  const res: Spell[] = [];
  for (const w of WHEEL_SPELLS) {
    res.push(w.base);
  }
  return res;
}

export const spellById = (id: string) => SPELLS.find((s) => s.id === id) ?? allWheelSpells().find((s) => s.id === id);

/** Ultimate da promoção (Tier 4), se tiver. */
export const ultimateFor = (promotion: string | null | undefined) => (promotion ? SPELLS.find((s) => s.promotion === promotion) : undefined);

/**
 * Gemas de Combate: uma por magia, no espaço Gema de Combate (só uma ativa).
 * Reforçam a magia delas enquanto ela estiver na barra de ação.
 */
/** Nome da classe no nome da gema, para ninguém criar a gema de outra classe. */
export const GEM_VOCATION_NAME: Record<string, string> = { warrior: 'Guerreiro', hunter: 'Caçador', arcanist: 'Arcanista', devout: 'Devoto' };
export const spellGemId = (spellId: string) => `spellgem_${spellId}`;
export const SPELL_GEMS = SPELLS.filter((s) => !s.promotion).map((s) => ({ id: spellGemId(s.id), spell: s.id, vocation: s.vocation, level: s.level, name: `Gema: ${s.name} (${GEM_VOCATION_NAME[s.vocation] ?? s.vocation})`, kind: s.effect.kind }));

/**
 * A magia com o reforço da gema, na força `power` (1 = gema +0 comum; o refino e a raridade sobem):
 * golpe +25% de dano e cura +30% (os dois gastam 20% menos mana); buff e escudo duram 50% mais
 * (buff +20% do efeito, escudo +5 pontos). Tudo vezes a força, com teto no desconto de mana (60%),
 * na cura (100% da vida) e na redução do escudo (90%).
 */
export function applySpellGem(s: Spell, power = 1): Spell {
  const e = s.effect;
  const r2 = (n: number) => Number(n.toFixed(2));
  const cost = Math.round(s.cost * (1 - Math.min(0.6, 0.2 * power)));
  if (e.kind === 'strike') return { ...s, cost, effect: { ...e, mult: r2(e.mult * (1 + 0.25 * power)) } };
  if (e.kind === 'heal') return { ...s, cost, effect: { ...e, pct: Math.min(1, r2(e.pct * (1 + 0.3 * power))) } };
  const durationMs = Math.round(e.durationMs * (1 + 0.5 * power));
  if (e.kind === 'buff') return { ...s, effect: { ...e, durationMs, ...(e.attack ? { attack: r2(e.attack * (1 + 0.2 * power)) } : {}), ...(e.crit ? { crit: r2(e.crit * (1 + 0.2 * power)) } : {}) } };
  return { ...s, effect: { ...e, durationMs, reduce: Math.min(0.9, r2(e.reduce + 0.05 * power)) } };
}

/** Texto do reforço da gema pelo tipo da magia, na força `power`. */
export function spellGemText(kind: SpellEffect['kind'], power = 1): [string, string] {
  const p = (n: number) => `${Math.round(n * power * 100)}%`;
  const mana = `${Math.round(Math.min(0.6, 0.2 * power) * 100)}%`;
  if (kind === 'strike') return [`+${p(0.25)} de dano e ${mana} menos mana`, `+${p(0.25)} damage and ${mana} less mana`];
  if (kind === 'heal') return [`+${p(0.3)} de cura e ${mana} menos mana`, `+${p(0.3)} healing and ${mana} less mana`];
  if (kind === 'buff') return [`+${p(0.5)} de duração e +${p(0.2)} do efeito`, `+${p(0.5)} duration and +${p(0.2)} effect`];
  return [`+${p(0.5)} de duração e +${Math.round(5 * power)} pontos de redução`, `+${p(0.5)} duration and +${Math.round(5 * power)} points of reduction`];
}
/** Texto da gema +0 (compatibilidade). */
export const SPELL_GEM_TEXT: Record<SpellEffect['kind'], [string, string]> = {
  strike: spellGemText('strike'),
  heal: spellGemText('heal'),
  buff: spellGemText('buff'),
  shield: spellGemText('shield'),
};
/** Magias da barra da vocação (as ultimates ficam de fora: vêm da promoção). */
export const spellsFor = (vocation: string) => SPELLS.filter((s) => s.vocation === vocation && !s.promotion);

/** Magias padrão de quem nunca escolheu: as liberadas da vocação, até o máximo. */
export function defaultSpells(vocation: string, level: number): string[] {
  return spellsFor(vocation)
    .filter((s) => s.level <= level)
    .slice(0, maxSpells(level))
    .map((s) => s.id);
}

/** Valida a escolha: da vocação, liberadas no nível, sem repetir, até o máximo. */
export function validSpells(ids: unknown, vocation: string, level: number): string[] | null {
  if (!Array.isArray(ids) || ids.length > maxSpells(level)) return null;
  if (new Set(ids).size !== ids.length) return null;
  for (const id of ids) {
    const s = typeof id === 'string' ? spellById(id) : undefined;
    if (!s || s.vocation !== vocation || s.level > level || s.promotion) return null;
  }
  return ids as string[];
}
