import { itemById, type Bonus, type EquipSlot } from '@grimhold/shared';
import { tr } from './i18n.ts';

/** Atributos comparados entre um item e o equipado (depósito e Mercado). */
export const COMPARE_STATS: { key: Exclude<keyof Bonus, 'element' | 'spellGem' | 'spellGemPower'>; label: string; pct?: boolean }[] = [
  { key: 'attack', label: 'Ataque' },
  { key: 'elementAttack', label: 'Elemental' },
  { key: 'defense', label: 'Defesa' },
  { key: 'hp', label: 'Vida' },
  { key: 'crit', label: 'Crítico', pct: true },
  { key: 'lifesteal', label: 'Roubo de vida', pct: true },
  { key: 'speed', label: 'Velocidade', pct: true },
  { key: 'regen', label: 'Regeneração', pct: true },
  { key: 'mana', label: 'Mana', pct: true },
  { key: 'reduction', label: 'Redução de dano', pct: true },
  { key: 'resFire', label: 'Resist. fogo', pct: true },
  { key: 'resWater', label: 'Resist. água', pct: true },
  { key: 'resEarth', label: 'Resist. terra', pct: true },
  { key: 'resEnergy', label: 'Resist. energia', pct: true },
  { key: 'resHoly', label: 'Resist. sagrado', pct: true },
  { key: 'resDeath', label: 'Resist. morte', pct: true },
];

/** Compara com o equipado no mesmo espaço, atributo por atributo: 1 tudo melhor, -1 tudo pior, 2 misto (melhora uns e piora outros), 0 igual. */
export function upgradeVs(id: string, equipment: Partial<Record<EquipSlot, string>>): number {
  const eq = itemById(id)?.equip;
  if (!eq) return 0;
  const curId = equipment[eq.slot];
  const cur = curId ? itemById(curId)?.equip : undefined;
  let up = 0;
  let down = 0;
  for (const { key } of COMPARE_STATS) {
    // Velocidade no item é lentidão (0,2 = 20% mais lento): menos é melhor.
    const sign = key === 'speed' ? -1 : 1;
    const d = sign * (((eq[key] as number | undefined) ?? 0) - ((cur?.[key] as number | undefined) ?? 0));
    if (d > 1e-9) up++;
    else if (d < -1e-9) down++;
  }
  return up && down ? 2 : up ? 1 : down ? -1 : 0;
}

/** A setinha do comparativo (verde melhor, vermelha pior, amarela misto). */
export function UpgradeArrow({ v }: { v: number }) {
  if (!v) return null;
  const cls = v === 2 ? 'mixed' : v > 0 ? 'up' : 'down';
  const title = v === 2 ? tr('Melhora uns atributos e piora outros', 'Better in some stats, worse in others') : v > 0 ? tr('Melhor que o equipado', 'Better than equipped') : tr('Pior que o equipado', 'Worse than equipped');
  return <span className={`upgrade-arrow ${cls}`} title={title}>{v === 2 ? '◆' : v > 0 ? '▲' : '▼'}</span>;
}


/** Linha curta com os atributos do item e a diferença para o equipado ("Ataque 30 (+5) · Defesa 10 (−2)"). */
export function StatDiff({ id, equipment }: { id: string; equipment: Partial<Record<EquipSlot, string>> }) {
  const eq = itemById(id)?.equip;
  if (!eq) return null;
  const curId = equipment[eq.slot];
  const cur = curId ? itemById(curId)?.equip : undefined;
  const label: Record<string, string> = {
    attack: tr('Ataque', 'Attack'), elementAttack: tr('Elemental', 'Elemental'), defense: tr('Defesa', 'Defense'), hp: tr('Vida', 'HP'),
    crit: tr('Crítico', 'Crit'), lifesteal: tr('Roubo de vida', 'Lifesteal'), speed: tr('Velocidade', 'Speed'), regen: tr('Regeneração', 'Regen'), mana: tr('Mana', 'Mana'),
    reduction: tr('Redução de dano', 'Damage reduction'), resFire: tr('Resist. fogo', 'Fire res.'), resWater: tr('Resist. água', 'Water res.'),
    resEarth: tr('Resist. terra', 'Earth res.'), resEnergy: tr('Resist. energia', 'Energy res.'), resHoly: tr('Resist. sagrado', 'Holy res.'), resDeath: tr('Resist. morte', 'Death res.'),
  };
  const parts = COMPARE_STATS.flatMap(({ key, pct }) => {
    // Velocidade no item é lentidão (0,2 = 20% mais lento): mostra negativa, como o comparativo do depósito.
    const sign = key === 'speed' ? -1 : 1;
    const a = sign * ((eq[key] as number | undefined) ?? 0);
    const b = sign * ((cur?.[key] as number | undefined) ?? 0);
    if (!a && !b) return [];
    const f = (v: number) => (pct ? `${Math.round(v * 100)}%` : `${Math.round(v)}`);
    const d = a - b;
    const cls = d > 1e-9 ? 'loot-pos' : d < -1e-9 ? 'loot-neg' : '';
    return [
      <span key={key}>
        {label[key]} {f(a)}
        {Math.abs(d) > 1e-9 && <span className={cls}> ({d > 0 ? '+' : '−'}{f(Math.abs(d))})</span>}
      </span>,
    ];
  });
  return (
    <span className="small stat-diff">
      {tr('Nv', 'Lv')} {eq.level} · {parts.map((p, i) => (i ? [' · ', p] : p))}
    </span>
  );
}
