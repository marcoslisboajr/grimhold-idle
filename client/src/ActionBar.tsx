import { useEffect, useRef, useState } from 'react';
import {
  IMBUEMENTS,
  ITEMS,
  NO_FOOD,
  RUNE_HEAL_MS,
  RUNE_STRIKE_MS,
  maxSpells,
  promotionById,
  spellById,
  spellsFor,
  ultimateFor,
  staminaXpMult,
  MAX_SPELLS,
  FOURTH_SPELL_LEVEL,
  type ClientMessage,
  type CombatRules,
  type PlayerState,
  type Spell,
  type StrikeWhen,
  type VocationId,
} from '@grimhold/shared';
import { casts } from './castBus.ts';
import { itemName, t, tr } from './i18n.ts';
import { itemEffectText } from './itemEffect.ts';

type Picker =
  | { kind: 'spell'; slot: number }
  | { kind: 'rune'; slot: 0 | 1 }
  | { kind: 'manaPotion' }
  | { kind: 'potion' }
  | { kind: 'arrow' }
  | { kind: 'food' }
  | { kind: 'meal' };

const icon = (name: string) => `/assets/icons/${name}.png`;
const spellIcon = (id: string) => icon(`spell_${id}`);
const FRACTIONS = [0.3, 0.4, 0.5, 0.6, 0.7];
const pct = (f: number) => `${Math.round(f * 100)}%`;

/**
 * Barra de ação no rodapé do jogo: as magias na ordem de prioridade, as runas, as
 * poções, a flecha e a comida. Clicar num espaço abre a escolha e a condição; arrastar
 * uma magia sobre outra troca as duas de lugar. A recarga aparece ao vivo.
 */
export function ActionBar(props: { vocation: VocationId; combatLevel: number; state: PlayerState; send: (cmd: ClientMessage) => void; mealOnly?: boolean; /** Diferença entre o relógio do servidor e o do aparelho. */ clockOffset?: number }) {
  const { state, send } = props;
  const rules: CombatRules = state.combatRules ?? {};
  const slots = maxSpells(props.combatLevel);
  const equipped = state.spells;
  const [picker, setPicker] = useState<Picker | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const bar = useRef<HTMLDivElement>(null);

  // Recarga ao vivo: a cena avisa quando cada magia/runa/poção aparece na luta.
  const lastCast = useRef<Record<string, number>>({});
  const [, tick] = useState(0);
  useEffect(() => {
    const on = (e: Event) => (lastCast.current[(e as CustomEvent<string>).detail] = performance.now());
    const reset = () => (lastCast.current = {});
    casts.addEventListener('cast', on);
    casts.addEventListener('reset', reset);
    const id = setInterval(() => tick((n) => n + 1), 200);
    return () => {
      casts.removeEventListener('cast', on);
      casts.removeEventListener('reset', reset);
      clearInterval(id);
    };
  }, []);
  // Fecha a escolha ao clicar fora da barra.
  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent) => {
      if (!bar.current?.contains(e.target as Node)) setPicker(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [picker]);

  const cooldownLeft = (id: string | null | undefined, ms: number) => {
    if (!id || !ms) return 0;
    const at = lastCast.current[id];
    return at ? Math.max(0, ms - (performance.now() - at)) : 0;
  };
  const saveRules = (next: CombatRules) => send({ type: 'set_combat_rules', rules: next });
  /** Põe a magia no espaço; se ela já está em outro, as duas trocam de lugar. */
  const putSpell = (slot: number, id: string | null) => {
    const list: (string | null)[] = Array.from({ length: slots }, (_, i) => equipped[i] ?? null);
    const from = id ? list.indexOf(id) : -1;
    if (from >= 0) list[from] = list[slot];
    list[slot] = id;
    send({ type: 'set_spells', spells: list.filter((x): x is string => !!x) });
  };
  const swapSlots = (a: number, b: number) => {
    if (a === b) return;
    const list: (string | null)[] = Array.from({ length: slots }, (_, i) => equipped[i] ?? null);
    [list[a], list[b]] = [list[b], list[a]];
    send({ type: 'set_spells', spells: list.filter((x): x is string => !!x) });
    if (!rules.priority) saveRules({ ...rules, priority: true });
  };

  const spellCond = (s: Spell) => {
    if (s.effect.kind === 'strike') {
      const w = rules.strike?.[s.id] ?? 'ready';
      return w === 'aoe2' ? tr('2+ monstros', '2+ mobs') : w === 'aoe3' ? tr('3+ monstros', '3+ mobs') : tr('pronta', 'ready');
    }
    if (s.effect.kind === 'heal') return `${tr('vida', 'HP')} < ${pct(rules.heal?.[s.id] ?? s.effect.below)}`;
    return tr('ao acabar', 'on expiry');
  };
  const bank = state.bank;
  const owned = (pred: (i: (typeof ITEMS)[number]) => boolean, current: string | null | undefined) =>
    ITEMS.filter((i) => pred(i) && ((bank[i.id] ?? 0) > 0 || i.id === current));
  const [runeAtk, runeHeal] = state.runes ?? [null, null];
  const runeHealItem = runeHeal ? ITEMS.find((i) => i.id === runeHeal) : undefined;
  const runeHealBelow = rules.runeHealBelow ?? (runeHealItem?.rune?.kind === 'heal' ? runeHealItem.rune.below : 0.5);
  const isHunter = props.vocation === 'hunter';

  // Chamada como função (não <Slot/>): definida aqui dentro, como componente seria recriada a cada
  // atualização da barra e o clique se perdia entre apertar e soltar.
  const Slot = (p: {
    key?: string | number;
    img?: string;
    title: string;
    cond?: string;
    count?: number;
    /** Selo curto sempre visível (também no celular, onde a condição some). */
    tag?: string;
    prio?: number;
    cdLeft?: number;
    cdTotal?: number;
    locked?: string;
    active?: boolean;
    onClick?: () => void;
    drag?: { index: number };
  }) => {
    const frac = p.cdTotal && p.cdLeft ? p.cdLeft / p.cdTotal : 0;
    return (
      <div
        key={p.key}
        className={`ab-slot ${p.img ? '' : 'empty'} ${p.active ? 'sel' : ''} ${p.locked ? 'locked' : ''}`}
        title={p.cond ? `${p.title} · ${p.cond}` : p.title}
        onClick={p.locked ? undefined : p.onClick}
        draggable={!!p.drag && !!p.img}
        onDragStart={p.drag ? () => setDrag(p.drag!.index) : undefined}
        onDragOver={p.drag ? (e) => e.preventDefault() : undefined}
        onDrop={p.drag ? () => drag !== null && swapSlots(drag, p.drag!.index) : undefined}
        onDragEnd={() => setDrag(null)}
      >
        {p.img ? <img src={p.img} alt="" /> : <span className="ab-plus">{p.locked ? '' : '+'}</span>}
        {p.prio !== undefined && <span className="ab-prio">{p.prio}</span>}
        {p.count !== undefined && <span className="ab-count">{p.count}</span>}
        {p.tag && <span className="ab-count ab-tag">{p.tag}</span>}
        {frac > 0 && <div className="ab-cd" style={{ ['--p' as string]: `${frac * 100}%` }} />}
        {frac > 0 && p.cdLeft! > 400 && <span className="ab-cdt">{Math.ceil(p.cdLeft! / 1000)}</span>}
        {p.locked && <span className="ab-lock">{p.locked}</span>}
        {p.cond && <span className="ab-cond">{p.cond}</span>}
      </div>
    );
  };

  // O "until" vem no relógio do servidor; com o relógio do aparelho adiantado a refeição parecia acabada.
  const serverNow = Date.now() + (props.clockOffset ?? 0);
  const mealActive = !!state.activeMeal && state.activeMeal.until > serverNow;

  // Escolha de item (runas, poções, flecha, comida): só o que há no banco.
  const ItemPick = (p: { items: (typeof ITEMS)[number][]; current: string | null | undefined; onPick: (id: string | null) => void; extra?: React.ReactNode; desc?: (i: (typeof ITEMS)[number]) => string }) =>
    p.desc ? (
      <div className="ab-picker">
        <ul className="ab-desc-list">
          {p.items.map((i) => (
            <li key={i.id}>
              <button type="button" className={`ab-desc ${p.current === i.id ? 'on' : ''}`} disabled={!(bank[i.id] ?? 0)} onClick={() => p.onPick(i.id)}>
                <img src={icon(i.icon)} alt="" />
                <span>
                  <strong>{itemName(i.name)}</strong> <span className="small">({bank[i.id] ?? 0})</span>
                  <br />
                  <span className="small loot-pos">{p.desc!(i)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {p.items.length === 0 && <span className="small">{tr('Nada no depósito.', 'Nothing in the depot.')}</span>}
        {p.extra}
      </div>
    ) : (
    <div className="ab-picker">
      <div className="ab-choices">
        <button type="button" className={`ab-choice none ${!p.current ? 'on' : ''}`} onClick={() => p.onPick(null)} title={tr('Nenhum', 'None')}>
          ×
        </button>
        {p.items.map((i) => (
          <button type="button" key={i.id} className={`ab-choice ${p.current === i.id ? 'on' : ''}`} onClick={() => p.onPick(i.id)} title={`${itemName(i.name)} (${bank[i.id] ?? 0})`}>
            <img src={icon(i.icon)} alt="" />
            <span className="ab-count">{bank[i.id] ?? 0}</span>
          </button>
        ))}
        {p.items.length === 0 && <span className="small">{tr('Nada no depósito.', 'Nothing in the depot.')}</span>}
      </div>
      {p.extra}
    </div>
  );
  const FracPick = (p: { label: string; value: number; onPick: (f: number) => void }) => (
    <div className="ab-row">
      {p.label}
      {FRACTIONS.map((f) => (
        <button type="button" key={f} className={`ab-opt ${Math.abs(p.value - f) < 0.001 ? 'on' : ''}`} onClick={() => p.onPick(f)}>
          {pct(f)}
        </button>
      ))}
    </div>
  );

  let pickerBody: React.ReactNode = null;
  if (picker?.kind === 'spell') {
    const current = equipped[picker.slot] ? spellById(equipped[picker.slot]) : undefined;
    pickerBody = (
      <div className="ab-picker">
        {current && (
          <>
            <h4>{t(`spell.${current.id}.name`, current.name)}</h4>
            <div className="small">
              {t(`spell.${current.id}.desc`, current.description)} · {current.cost} mana · {current.cooldownMs / 1000}s
            </div>
            {current.effect.kind === 'strike' && (
              <div className="ab-row">
                {tr('Usar:', 'Use:')}
                {(['ready', 'aoe2', 'aoe3'] as StrikeWhen[]).map((w) => (
                  <button
                    type="button"
                    key={w}
                    className={`ab-opt ${(rules.strike?.[current.id] ?? 'ready') === w ? 'on' : ''}`}
                    onClick={() => saveRules({ ...rules, priority: true, strike: { ...rules.strike, [current.id]: w } })}
                  >
                    {w === 'ready' ? tr('quando pronta', 'when ready') : w === 'aoe2' ? tr('com 2+ monstros', 'with 2+ monsters') : tr('com 3+', 'with 3+')}
                  </button>
                ))}
              </div>
            )}
            {current.effect.kind === 'heal' && (
              FracPick({ label: tr('Curar com vida abaixo de', 'Heal below HP'), value: rules.heal?.[current.id] ?? current.effect.below, onPick: (f) => saveRules({ ...rules, heal: { ...rules.heal, [current.id]: f } }) })
            )}
          </>
        )}
        <div className="ab-row">{current ? tr('Trocar por:', 'Swap for:') : tr('Escolha a magia:', 'Pick a spell:')}</div>
        <div className="ab-choices">
          <button type="button" className={`ab-choice none ${!current ? 'on' : ''}`} onClick={() => putSpell(picker.slot, null)} title={tr('Vazio', 'Empty')}>
            ×
          </button>
          {[...spellsFor(props.vocation)].sort((a, b) => a.level - b.level).map((s) => {
            const locked = s.level > props.combatLevel;
            const at = equipped.indexOf(s.id);
            return (
              <button
                type="button"
                key={s.id}
                className={`ab-choice ${locked ? 'locked' : ''} ${current?.id === s.id ? 'on' : ''}`}
                disabled={locked}
                onClick={() => putSpell(picker.slot, s.id)}
                title={locked ? `${t(`spell.${s.id}.name`, s.name)}: ${tr('libera no nível', 'unlocks at level')} ${s.level}` : `${t(`spell.${s.id}.name`, s.name)} · ${s.cost} mana · ${s.cooldownMs / 1000}s`}
              >
                <img src={spellIcon(s.id)} alt="" />
                {locked && <span className="ab-lock">{tr('Nv', 'Lv')} {s.level}</span>}
                {!locked && at >= 0 && <span className="ab-prio">{at + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="ab-row">
          {tr('Ordem:', 'Order:')}
          <button type="button" className={`ab-opt ${rules.priority ? 'on' : ''}`} onClick={() => saveRules({ ...rules, priority: true })}>
            {tr('a da barra', 'bar order')}
          </button>
          <button type="button" className={`ab-opt ${!rules.priority ? 'on' : ''}`} onClick={() => saveRules({ ...rules, priority: false })}>
            {tr('automática', 'automatic')}
          </button>
        </div>
      </div>
    );
  } else if (picker?.kind === 'rune') {
    const heal = picker.slot === 1;
    pickerBody = (
      ItemPick({ items: owned((i) => !!i.rune && (heal ? i.rune.kind === 'heal' : i.rune.kind !== 'heal'), heal ? runeHeal : runeAtk), current: heal ? runeHeal : runeAtk, onPick: (id) => send({ type: 'set_rune', slot: heal ? 'heal' : 'attack', rune: id }), extra: heal ? FracPick({ label: tr('Usar com vida abaixo de', 'Use below HP'), value: runeHealBelow, onPick: (f) => saveRules({ ...rules, runeHealBelow: f }) }) : null })
    );
  } else if (picker?.kind === 'manaPotion') {
    pickerBody = (
      ItemPick({ items: owned((i) => !!i.manaPotion, state.manaPotion), current: state.manaPotion, onPick: (id) => send({ type: 'set_mana_potion', manaPotion: id }), extra: 
          <>
            {FracPick({ label: tr('Tomar com mana abaixo de', 'Drink below mana'), value: rules.manaBelow ?? 0, onPick: (f) => saveRules({ ...rules, manaBelow: f }) })}
            <div className="small">{tr('Sem limite: toma só quando falta mana para a magia.', 'No limit: drinks only when a spell lacks mana.')}</div>
          </>
         })
    );
  } else if (picker?.kind === 'potion') {
    pickerBody = ItemPick({ items: owned((i) => !!i.potion, state.potion), current: state.potion, onPick: (id) => send({ type: 'set_potion', potion: id }) });
  } else if (picker?.kind === 'arrow') {
    pickerBody = ItemPick({ items: owned((i) => !!i.arrow, state.arrow), current: state.arrow, onPick: (id) => send({ type: 'set_arrow', arrow: id }) });
  } else if (picker?.kind === 'food') {
    // null no servidor = automático (a melhor do banco); o × precisa mandar NO_FOOD para não tomar nada.
    pickerBody = ItemPick({ items: owned((i) => !!i.food, state.food), current: state.food === NO_FOOD ? null : (state.food ?? 'auto'), onPick: (id) => send({ type: 'set_food', food: id ?? NO_FOOD }), extra: (
      <>
        {FracPick({ label: tr('Tomar com vida abaixo de', 'Drink below HP'), value: rules.foodBelow ?? 0, onPick: (f) => saveRules({ ...rules, foodBelow: f }) })}
        <div className="small">{tr('Vale durante a luta (um gole a cada 2 s) e depois dela, no descanso.', 'Works during the fight (one sip every 2 s) and after it, while resting.')}</div>
        <div className="ab-row">
          <button type="button" className={`ab-opt ${!rules.foodBelow ? 'on' : ''}`} onClick={() => saveRules({ ...rules, foodBelow: undefined })}>
            {tr('Sempre que levar dano', 'After any damage')}
          </button>
        </div>
      </>
    ) });
  } else if (picker?.kind === 'meal') {
    // Refeição: escolher já come (o bônus dura alguns minutos e aparece em cima da barra).
    pickerBody = (
      ItemPick({ items: ITEMS.filter((i) => !!i.meal), current: mealActive ? state.activeMeal!.item : null, desc: (i) => (i.meal ? `${mealBuffText(i.meal)} · ${tr('30 min', '30 min')}` : ''), onPick: (id) => {
          if (id) send({ type: 'eat_meal', item: id });
          setPicker(null);
        }, extra: state.activeMeal ? (
          <label className="ab-row">
            <input type="checkbox" checked={!!state.activeMeal.auto} onChange={(e) => send({ type: 'set_meal_auto', auto: e.target.checked })} />
            {tr('Renovar sozinho quando acabar (enquanto houver no depósito)', 'Renew automatically when it ends (while in the depot)')}
          </label>
        ) : null })
    );
  }

  const itemIcon = (id: string | null | undefined) => {
    const it = id ? ITEMS.find((i) => i.id === id) : undefined;
    return it ? icon(it.icon) : undefined;
  };
  const itemTitle = (id: string | null | undefined, empty: string) => {
    const it = id ? ITEMS.find((i) => i.id === id) : undefined;
    const effect = itemEffectText(it);
    return it ? `${itemName(it.name)} (${bank[it.id] ?? 0})${effect ? ` — ${effect}` : ''}` : empty;
  };
  const toggle = (p: Picker) => setPicker((cur) => (cur && JSON.stringify(cur) === JSON.stringify(p) ? null : p));
  const isOpen = (p: Picker) => !!picker && JSON.stringify(picker) === JSON.stringify(p);

  // Bônus ativos (com o efeito no tooltip).
  const promo = promotionById(state.promotion);
  const meal = mealActive ? ITEMS.find((i) => i.id === state.activeMeal!.item) : undefined;
  const potionItem = state.potion && (bank[state.potion] ?? 0) > 0 ? ITEMS.find((i) => i.id === state.potion) : undefined;

  // Imbuements ativos: o tempo só corre caçando, então mostra as horas de caçada que restam.
  const imbs = Object.entries(state.imbuements ?? {})
    .filter(([, secs]) => secs > 0)
    .flatMap(([id, secs]) => {
      const def = IMBUEMENTS.find((i) => i.id === id);
      return def ? [{ def, secs }] : [];
    });
  const fmtCombat = (secs: number) => (secs >= 3600 ? `${Math.floor(secs / 3600)}h${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}` : `${Math.ceil(secs / 60)} min`);

  // Fora da caçada (profissões, cidade): só a refeição, para comer e ver o bônus ativo.
  if (props.mealOnly) {
    const mealSlot = Slot({ img: meal ? icon(meal.icon) : undefined, title: meal ? `${itemName(meal.name)} (${meal.meal ? mealBuffText(meal.meal) : ''})` : tr('Refeição (bônus por alguns minutos)', 'Meal (timed bonus)'), cond: meal ? `${Math.ceil((state.activeMeal!.until - serverNow) / 60_000)} min` : undefined, active: isOpen({ kind: 'meal' }), onClick: () => toggle({ kind: 'meal' }) });
    return (
      <div className="action-bar meal-only" ref={bar}>
        {pickerBody && <div className="ab-pop">{pickerBody}</div>}
        <div className="ab-groups">
          <div className="ab-group">
            <span className="ab-label">{tr('Refeição', 'Meal')}</span>
            {mealSlot}
            <span className="small">
              {meal ? `${itemName(meal.name)}: ${meal.meal ? mealBuffText(meal.meal) : ''} · ${Math.ceil((state.activeMeal!.until - serverNow) / 60_000)} min` : tr('Nenhuma refeição ativa', 'No active meal')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="action-bar" ref={bar}>
      <div className="ab-buffs">
        {state.stamina !== undefined && (
          <span className="ab-buff" title={tr('Stamina: multiplica a XP da caçada', 'Stamina: hunt XP multiplier')}>
            <img src={icon('element_energy')} alt="" />
            <span>{Math.round(staminaXpMult(state.stamina) * 100)}%</span>
          </span>
        )}
        {meal && (
          <span className="ab-buff" title={`${itemName(meal.name)} (${meal.meal ? mealBuffText(meal.meal) : ''}): ${Math.ceil((state.activeMeal!.until - serverNow) / 60_000)} min`}>
            <img src={icon(meal.icon)} alt="" />
            <span>{Math.ceil((state.activeMeal!.until - serverNow) / 60_000)}m</span>
          </span>
        )}
        {potionItem && (
          <span className="ab-buff" title={itemName(potionItem.name)}>
            <img src={icon(potionItem.icon)} alt="" />
          </span>
        )}
        {promo && (
          <span className="ab-buff" title={`${promo.name}: ${promo.description}`}>
            <img src={icon('kraken_crown')} alt="" />
          </span>
        )}
      </div>
      {pickerBody && <div className="ab-pop">{pickerBody}</div>}
      <div className="ab-groups">
        <div className="ab-group">
          <span className="ab-label">{rules.priority ? tr('Magias (ordem da barra)', 'Spells (bar order)') : tr('Magias (automática)', 'Spells (automatic)')}</span>
          {Array.from({ length: MAX_SPELLS }, (_, i) => {
            if (i >= slots) return Slot({ key: i, title: `${tr('Libera no nível', 'Unlocks at level')} ${FOURTH_SPELL_LEVEL}`, locked: `${tr('Nv', 'Lv')} ${FOURTH_SPELL_LEVEL}` });
            const s = equipped[i] ? spellById(equipped[i]) : undefined;
            const off = s && s.level > props.combatLevel;
            return (
              Slot({ key: i, img: s ? spellIcon(s.id) : undefined, title: s ? `${t(`spell.${s.id}.name`, s.name)}${off ? ` (${tr('nível baixo: não sai', 'level too low: skipped')})` : ''}` : tr('Espaço vazio', 'Empty slot'), cond: s ? spellCond(s) : undefined, prio: s && rules.priority ? i + 1 : undefined, cdLeft: s ? cooldownLeft(s.id, s.cooldownMs) : 0, cdTotal: s?.cooldownMs, active: isOpen({ kind: 'spell', slot: i }), onClick: () => toggle({ kind: 'spell', slot: i }), drag: { index: i } })
            );
          })}
        </div>
        {(() => {
          // Ultimate da Ascensão Mítica: fora da barra, sai sozinha quando está pronta.
          const u = ultimateFor(state.promotion);
          if (!u) return null;
          return (
            <div className="ab-group">
              <span className="ab-label">Ultimate</span>
              {Slot({ img: spellIcon(u.id), title: `${t(`spell.${u.id}.name`, u.name)}: ${t(`spell.${u.id}.desc`, u.description)} · ${u.cooldownMs / 1000}s (${tr('sai sozinha, não gasta mana', 'casts by itself, no mana')})`, cond: tr('pronta', 'ready'), cdLeft: cooldownLeft(u.id, u.cooldownMs), cdTotal: u.cooldownMs })}
            </div>
          );
        })()}
        <div className="ab-group">
          <span className="ab-label">{tr('Runas', 'Runes')}</span>
          {Slot({ img: itemIcon(runeAtk), title: itemTitle(runeAtk, tr('Runa de ataque', 'Attack rune')), count: runeAtk ? (bank[runeAtk] ?? 0) : undefined, cond: runeAtk ? tr('pronta', 'ready') : undefined, cdLeft: cooldownLeft(runeAtk, RUNE_STRIKE_MS), cdTotal: RUNE_STRIKE_MS, active: isOpen({ kind: 'rune', slot: 0 }), onClick: () => toggle({ kind: 'rune', slot: 0 }) })}
          {Slot({ img: itemIcon(runeHeal), title: itemTitle(runeHeal, tr('Runa de cura', 'Healing rune')), count: runeHeal ? (bank[runeHeal] ?? 0) : undefined, cond: runeHeal ? `${tr('vida', 'HP')} < ${pct(runeHealBelow)}` : undefined, cdLeft: cooldownLeft(runeHeal, RUNE_HEAL_MS), cdTotal: RUNE_HEAL_MS, active: isOpen({ kind: 'rune', slot: 1 }), onClick: () => toggle({ kind: 'rune', slot: 1 }) })}
        </div>
        <div className="ab-group">
          <span className="ab-label">{tr('Poções', 'Potions')}</span>
          {Slot({ img: itemIcon(state.manaPotion), title: itemTitle(state.manaPotion, tr('Poção de mana', 'Mana potion')), count: state.manaPotion ? (bank[state.manaPotion] ?? 0) : undefined, cond: state.manaPotion ? (rules.manaBelow ? `mana < ${pct(rules.manaBelow)}` : tr('sem mana', 'no mana')) : undefined, active: isOpen({ kind: 'manaPotion' }), onClick: () => toggle({ kind: 'manaPotion' }) })}
          {Slot({ img: itemIcon(state.potion), title: itemTitle(state.potion, tr('Poção de caçada', 'Hunting potion')), count: state.potion ? (bank[state.potion] ?? 0) : undefined, cond: state.potion ? tr('por luta', 'per fight') : undefined, active: isOpen({ kind: 'potion' }), onClick: () => toggle({ kind: 'potion' }) })}
          {Slot({ img: itemIcon(state.food), title: itemTitle(state.food, state.food === NO_FOOD ? tr('Poção de vida: desligada', 'Health potion: off') : tr('Poção de vida: automática (a melhor do depósito)', 'Health potion: auto (best in depot)')), count: state.food && state.food !== NO_FOOD ? (bank[state.food] ?? 0) : undefined, cond: state.food !== NO_FOOD ? (rules.foodBelow ? `${tr('vida', 'HP')} < ${pct(rules.foodBelow)}` : tr('com dano', 'on damage')) : undefined, active: isOpen({ kind: 'food' }), onClick: () => toggle({ kind: 'food' }) })}
        </div>
        <div className="ab-group">
          <span className="ab-label">{isHunter ? tr('Flecha · Comida', 'Arrow · Food') : tr('Comida', 'Food')}</span>
          {isHunter && Slot({ img: itemIcon(state.arrow), title: itemTitle(state.arrow, tr('Flecha especial', 'Special arrow')), count: state.arrow ? (bank[state.arrow] ?? 0) : undefined, cond: state.arrow ? tr('1 por luta', '1 per fight') : undefined, active: isOpen({ kind: 'arrow' }), onClick: () => toggle({ kind: 'arrow' }) })}
          {Slot({ img: meal ? icon(meal.icon) : undefined, title: meal ? `${itemName(meal.name)} (${meal.meal ? mealBuffText(meal.meal) : ''})` : tr('Refeição (bônus por alguns minutos)', 'Meal (timed bonus)'), cond: meal ? `${Math.ceil((state.activeMeal!.until - serverNow) / 60_000)} min` : undefined, active: isOpen({ kind: 'meal' }), onClick: () => toggle({ kind: 'meal' }) })}
        </div>
        {imbs.length > 0 && (
          <div className="ab-group">
            <span className="ab-label">{tr('Imbuements', 'Imbuements')}</span>
            {imbs.map(({ def, secs }) =>
              Slot({ key: def.id, img: icon(def.icon), title: `${def.name}: ${def.description} (${tr('restam', 'left')} ${fmtCombat(secs)} ${tr('de caçada', 'of hunting')})`, tag: fmtCombat(secs).replace(' min', 'm') }),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** O que a refeição faz, em texto curto. */
export function mealBuffText(m: NonNullable<(typeof ITEMS)[number]['meal']>): string {
  const v = Math.round(m.value * 100);
  switch (m.buff) {
    case 'combat_xp': return tr(`+${v}% XP de combate`, `+${v}% combat XP`);
    case 'rest_speed': return tr(`descanso ${v}% mais rápido`, `rest ${v}% faster`);
    case 'loot': return `+${v}% loot`;
    case 'profession_xp': return tr(`+${v}% XP de profissão`, `+${v}% profession XP`);
    case 'stamina_cost': return tr(`-${v}% gasto de stamina`, `-${v}% stamina cost`);
    case 'crit_chance': return tr(`+${v}% chance de crítico`, `+${v}% crit chance`);
    case 'all_xp_loot': return tr(`+${v}% XP e +${v}% loot`, `+${v}% XP & +${v}% loot`);
    default: return '';
  }
}
