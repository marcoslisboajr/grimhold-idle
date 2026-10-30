import { useState } from 'react';
import {
  GOLD,
  MASTERY_MAX_LEVEL,
  MASTERY_MIN_LEVEL,
  NO_MASTERY,
  ORDERED_SIDES,
  WHEEL_SIDES,
  WHEEL_SLICES,
  canInvestMasteryPoint,
  isSliceAvailable,
  isSliceComplete,
  levelForXp,
  masteryEffects,
  masteryLevel,
  masteryPointCost,
  masteryResetCost,
  masterySpentPoints,
  revelationFor,
  wheelRevelationLevel,
  wheelSideCompletedPoints,
  wheelSideInvestedPoints,
  wheelSliceById,
  wheelSpellFor,
  type PlayerState,
  type WheelEffects,
  type WheelSideId,
  type WheelSlice,
} from '@grimhold/shared';
import { getLang, tr } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;

const WHEEL_SPELL_ICONS: Record<string, string> = {
  wheel_fury_warrior: 'spell_whirlwind',
  wheel_fury_hunter: 'spell_arrow_rain',
  wheel_fury_arcanist: 'spell_meteor',
  wheel_fury_devout: 'spell_holy_light',
  wheel_precision_warrior: 'spell_execution',
  wheel_precision_hunter: 'spell_piercing_shot',
  wheel_precision_arcanist: 'spell_ice_storm',
  wheel_precision_devout: 'spell_judgement',
  wheel_bastion_warrior: 'spell_iron_skin',
  wheel_bastion_hunter: 'cape_mastery',
  wheel_bastion_arcanist: 'spell_arcane_shield',
  wheel_bastion_devout: 'spell_blessing',
  wheel_arcane_warrior: 'spell_berserk',
  wheel_arcane_hunter: 'spell_eagle_eye',
  wheel_arcane_arcanist: 'spell_supernova',
  wheel_arcane_devout: 'spell_divine_wrath',
};

function spellIconFor(spellId: string, side: WheelSideId): string {
  const iconName = WHEEL_SPELL_ICONS[spellId] ?? (WHEEL_SIDES.find((s) => s.id === side)?.icon ?? 'skill_combat');
  return icon(iconName);
}

function fmtXp(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString();
}

function fmtPct(v: number): string {
  const pct = Number((v * 100).toFixed(2));
  return `${pct}%`;
}

// Geometria da Roda (viewBox 0 0 420 420, centro 210, 210)
const CX = 210;
const CY = 210;
const R_INNER_0 = 56;
const R_INNER_1 = 92;
const R_MID_0 = 96;
const R_MID_1 = 138;
const R_OUT_0 = 142;
const R_OUT_1 = 186;

const SIDE_BASE_ANGLES: Record<WheelSideId, number> = {
  fury: Math.PI, // 180° a 270° (NW / Top-Left)
  precision: 1.5 * Math.PI, // 270° a 360° (NE / Top-Right)
  bastion: 0, // 0° a 90° (SE / Bottom-Right)
  arcane: 0.5 * Math.PI, // 90° a 180° (SW / Bottom-Left)
};

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArcSector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, gap = 0.012) {
  const aStart = a0 + gap;
  const aEnd = a1 - gap;
  const p0 = polarToCartesian(cx, cy, r0, aStart);
  const p1 = polarToCartesian(cx, cy, r1, aStart);
  const p2 = polarToCartesian(cx, cy, r1, aEnd);
  const p3 = polarToCartesian(cx, cy, r0, aEnd);
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r1} ${r1} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} A ${r0} ${r0} 0 0 0 ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} Z`;
}

export function MasteryPanel(props: {
  vocation?: string;
  state: PlayerState;
  onUnlock: (nodeId: string, count?: number) => void;
  onReset: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedSliceId, setSelectedSliceId] = useState<string>('fury_inner_0');
  const [activeSide, setActiveSide] = useState<WheelSideId>('fury');
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);

  const lang = getLang();
  const pick = (pair: [string, string]) => (lang === 'en' ? pair[1] : pair[0]);

  const combatLevel = levelForXp(props.state.skills.combat ?? 0, 'combat');
  const mastery = props.state.mastery ?? NO_MASTERY;
  const slices = mastery.slices ?? mastery.nodes ?? {};
  const currentLvl = masteryLevel(mastery);
  const spent = masterySpentPoints(slices);
  const resetCost = masteryResetCost(slices);
  const gold = props.state.bank[GOLD] ?? 0;
  const costNext = masteryPointCost(currentLvl);
  const barPct = Math.max(0, Math.min(100, (mastery.xp / costNext) * 100));
  const eff: WheelEffects = masteryEffects(slices);

  // Bônus ativos somados para o cabeçalho
  const activeDedicationList: string[] = [];
  if (eff.attackPct > 0) activeDedicationList.push(`+${fmtPct(eff.attackPct)} ${tr('Ataque', 'Attack')}`);
  if (eff.crit > 0) activeDedicationList.push(`+${fmtPct(eff.crit)} ${tr('Crítico', 'Crit Chance')}`);
  if (eff.critMult > 0) activeDedicationList.push(`+${fmtPct(eff.critMult)} ${tr('Dano Crítico', 'Crit Damage')}`);
  if (eff.hpPct > 0) activeDedicationList.push(`+${fmtPct(eff.hpPct)} ${tr('Vida', 'Health')}`);
  if (eff.defensePct > 0) activeDedicationList.push(`+${fmtPct(eff.defensePct)} ${tr('Defesa', 'Defense')}`);
  if (eff.manaPct > 0) activeDedicationList.push(`+${fmtPct(eff.manaPct)} ${tr('Mana', 'Mana')}`);
  if (eff.spellDamagePct > 0) activeDedicationList.push(`+${fmtPct(eff.spellDamagePct)} ${tr('Dano de Magia', 'Spell Damage')}`);

  const activeConvictionList: string[] = [];
  if (eff.packDamagePct > 0) activeConvictionList.push(`+${fmtPct(eff.packDamagePct)} ${tr('Dano em Bando', 'Pack Damage')}`);
  if (eff.lifesteal > 0) activeConvictionList.push(`+${fmtPct(eff.lifesteal)} ${tr('Roubo de Vida', 'Lifesteal')}`);
  if (eff.bossDamagePct > 0) activeConvictionList.push(`+${fmtPct(eff.bossDamagePct)} ${tr('Dano contra Chefes', 'Boss Damage')}`);
  if (eff.speed < 0) activeConvictionList.push(`${tr('Ataques 3% mais rápidos', 'Attacks 3% faster')}`);
  if (eff.allResistPct > 0) activeConvictionList.push(`+${fmtPct(eff.allResistPct)} ${tr('Resistências Elementais', 'Elemental Resists')}`);
  if (eff.damageReductionPct > 0) activeConvictionList.push(`-${fmtPct(eff.damageReductionPct)} ${tr('Dano Recebido', 'Damage Taken')}`);
  if (eff.regen > 0) activeConvictionList.push(`+${fmtPct(eff.regen)} ${tr('Regeneração', 'Regen')}`);
  if (eff.spellCooldownReductionPct > 0) activeConvictionList.push(`-${fmtPct(eff.spellCooldownReductionPct)} ${tr('Recarga de Magia', 'Spell Cooldown')}`);
  if (eff.spellHealPct > 0) activeConvictionList.push(`+${fmtPct(eff.spellHealPct)} ${tr('Cura de Magia', 'Spell Heal')}`);

  // Vocation
  const vocation = props.vocation ?? 'warrior';
  const vocClass = `voc-${vocation}`;

  // Fatia selecionada
  const selectedSlice: WheelSlice = wheelSliceById(selectedSliceId) ?? WHEEL_SLICES[0];
  const selectedRank = slices[selectedSlice.id] ?? 0;
  const isSelectedComplete = selectedRank >= selectedSlice.cost;
  const isSelectedAvail = isSliceAvailable(slices, selectedSlice.id);
  const selectedCheck = canInvestMasteryPoint(mastery, selectedSlice.id);
  const neededToComplete = selectedSlice.cost - selectedRank;
  const maxSpendable = Math.max(1, Math.min(5, neededToComplete, mastery.points));

  const selectedSideInfo = WHEEL_SIDES.find((s) => s.id === selectedSlice.side)!;

  // Revelação e Magias do lado ativo
  const activeSideCompleted = wheelSideCompletedPoints(slices, activeSide);
  const activeSideInvested = wheelSideInvestedPoints(slices, activeSide);
  const activeSideRevLevel = wheelRevelationLevel(activeSideCompleted);
  const activeRevInfo = revelationFor(activeSide, vocation);
  const activeBaseSpell = wheelSpellFor(activeSide, vocation, false);
  const activeStrongSpell = wheelSpellFor(activeSide, vocation, true);

  const handleSelectSlice = (s: WheelSlice) => {
    setSelectedSliceId(s.id);
    setActiveSide(s.side);
  };

  return (
    <div className={`mastery-v2-panel ${vocClass}`}>
      {/* ── 1. Topo em Destaque ────────────────────────────────────────── */}
      <header className="mastery-header-card">
        <div className="mastery-header-main">
          <div className="mastery-title-group">
            <div className="mastery-level-badge">
              <span className="mastery-badge-sub">{tr('Roda da Maestria', 'Wheel of Destiny')}</span>
              <span className="mastery-badge-level">
                {tr('Nível', 'Level')} <strong>{currentLvl}</strong>
                <small> / {MASTERY_MAX_LEVEL}</small>
              </span>
            </div>

            <div className="mastery-desc-block">
              {combatLevel < MASTERY_MIN_LEVEL ? (
                <div className="small muted">
                  {tr(
                    `Requer nível ${MASTERY_MIN_LEVEL} de combate (atualmente ${combatLevel}). Toda XP de combate ganha no 400+ enche a barra de Maestria.`,
                    `Requires combat level ${MASTERY_MIN_LEVEL} (currently ${combatLevel}). All combat XP earned at 400+ fills the Mastery bar.`,
                  )}
                </div>
              ) : (
                <div className="small muted">
                  {tr(
                    'Cada nível ganho concede +1 Ponto de Maestria para forjar seu destino na Roda.',
                    'Each level reached grants +1 Mastery Point to shape your destiny in the Wheel.',
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mastery-header-actions">
            <div className={`mastery-points-seal ${mastery.points > 0 ? 'has-points' : ''}`}>
              <div className="seal-star">★</div>
              <div className="seal-info">
                <span className="seal-count">{mastery.points}</span>
                <span className="seal-label">{tr('Pontos Livres', 'Points Left')}</span>
              </div>
            </div>

            <div className="mastery-reset-wrap">
              <div className="small mastery-spent-count">
                {tr('Distribuídos:', 'Spent:')} <strong>{spent}</strong> / {MASTERY_MAX_LEVEL}
              </div>

              {spent > 0 && !confirmReset && (
                <button
                  type="button"
                  className="small-btn mastery-reset-btn"
                  disabled={gold < resetCost}
                  title={
                    gold < resetCost
                      ? tr(`Precisa de ${resetCost.toLocaleString('pt-BR')} de ouro`, `Needs ${resetCost.toLocaleString('en-US')} gold`)
                      : tr('Devolve todos os pontos gastos na roda', 'Refunds all points spent in the wheel')
                  }
                  onClick={() => setConfirmReset(true)}
                >
                  <img className="icon tiny" src={icon('gold')} alt="" />{' '}
                  {tr(`Resetar (${resetCost.toLocaleString('pt-BR')})`, `Reset (${resetCost.toLocaleString('en-US')})`)}
                </button>
              )}

              {spent > 0 && confirmReset && (
                <div className="mastery-reset-confirm">
                  <button
                    type="button"
                    className="primary small-btn"
                    disabled={gold < resetCost}
                    onClick={() => {
                      setConfirmReset(false);
                      props.onReset();
                    }}
                  >
                    {tr('Confirmar', 'Confirm')}
                  </button>
                  <button type="button" className="small-btn" onClick={() => setConfirmReset(false)}>
                    {tr('Cancelar', 'Cancel')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra dourada grande com XP atual e porcentagem */}
        <div className="mastery-xp-section">
          <div className="mastery-xp-header">
            <span>{tr('Progresso até o próximo ponto', 'Progress to next level')}</span>
            <span className="mastery-xp-numbers">
              <strong>{fmtXp(mastery.xp)}</strong> / {fmtXp(costNext)} XP ({barPct.toFixed(1)}%)
            </span>
          </div>
          <div className="mastery-gold-bar-track">
            <div className="mastery-gold-bar-fill" style={{ width: `${barPct}%` }} />
            <div className="mastery-gold-bar-shimmer" />
          </div>
        </div>

        {/* Resumo da soma de todos os bônus ativos */}
        <div className="mastery-active-summary">
          <div className="summary-section">
            <span className="summary-title">{tr('Dedicação Ativa:', 'Active Dedication:')}</span>
            {activeDedicationList.length > 0 ? (
              <span className="summary-list">{activeDedicationList.join(' · ')}</span>
            ) : (
              <span className="summary-empty small muted">
                {tr('Nenhum ponto investido ainda.', 'No points spent yet.')}
              </span>
            )}
          </div>

          {activeConvictionList.length > 0 && (
            <div className="summary-section convictions-row">
              <span className="summary-title highlight-gold">{tr('Convicções Ativas:', 'Active Convictions:')}</span>
              <span className="summary-list">{activeConvictionList.join(' · ')}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── 2. Contadores dos 4 Quadrantes (Em volta da Roda) ──────────── */}
      <div className="wheel-quadrants-bar">
        {WHEEL_SIDES.map((side) => {
          const invested = wheelSideInvestedPoints(slices, side.id);
          const completed = wheelSideCompletedPoints(slices, side.id);
          const revLevel = wheelRevelationLevel(completed);
          const isCurrentActive = activeSide === side.id;

          return (
            <button
              key={side.id}
              type="button"
              className={`quadrant-card side-${side.id} ${isCurrentActive ? 'focused' : ''}`}
              onClick={() => {
                setActiveSide(side.id);
                // seleciona a primeira fatia interna deste lado
                const first = WHEEL_SLICES.find((s) => s.side === side.id && s.ring === 'inner');
                if (first) setSelectedSliceId(first.id);
              }}
            >
              <div className="quadrant-card-top">
                <span className="quadrant-dot" style={{ backgroundColor: side.color }} />
                <strong className="quadrant-name">{pick(side.name)}</strong>
                <span className="quadrant-pts">
                  <strong>{invested}</strong>/100
                </span>
              </div>

              <div className="quadrant-mini-track">
                <div
                  className="quadrant-mini-fill"
                  style={{ width: `${Math.min(100, invested)}%`, backgroundColor: side.color }}
                />
              </div>

              <div className="quadrant-sub">
                <span className="quadrant-rev-badge">
                  {revLevel > 0 ? `Rank ${revLevel} ✓` : tr('Rank 0', 'Rank 0')}
                </span>
                <span className="quadrant-completed-sub">{completed} {tr('completos', 'done')}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 3. Layout Principal: Roda SVG à esquerda, Detalhes à direita ─ */}
      <div className="wheel-main-layout">
        {/* Coluna da Roda Interativa */}
        <section className="wheel-stage-container">
          <div className="wheel-svg-wrap">
            <svg viewBox="0 0 420 420" className="wheel-svg" role="img" aria-label="Wheel of Destiny">
              <defs>
                <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.8" />
                </filter>
                <radialGradient id="hub-gradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2c221c" />
                  <stop offset="85%" stopColor="#15100c" />
                  <stop offset="100%" stopColor="#080605" />
                </radialGradient>
              </defs>

              {/* Anéis de Guia / Fundo */}
              <circle cx={CX} cy={CY} r={R_OUT_1 + 4} fill="#0d1117" stroke="#2a2f3a" strokeWidth="2" />
              <circle cx={CX} cy={CY} r={R_OUT_0} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx={CX} cy={CY} r={R_MID_0} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx={CX} cy={CY} r={R_INNER_0} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              {/* 36 Fatias da Roda */}
              <g className="wheel-slices-group">
                {WHEEL_SLICES.map((slice) => {
                  const sideInfo = WHEEL_SIDES.find((s) => s.id === slice.side)!;
                  const rank = slices[slice.id] ?? 0;
                  const complete = rank >= slice.cost;
                  const inProgress = rank > 0 && !complete;
                  const available = !complete && isSliceAvailable(slices, slice.id);
                  const locked = !complete && !available && rank === 0;

                  const isSelected = selectedSliceId === slice.id;
                  const isHovered = hoveredSliceId === slice.id;

                  // Cálculo do arco
                  const baseAngle = SIDE_BASE_ANGLES[slice.side];
                  let span = 0;
                  let r0 = R_INNER_0;
                  let r1 = R_INNER_1;

                  if (slice.ring === 'inner') {
                    span = Math.PI / 4; // 2 fatias por 90°
                    r0 = R_INNER_0;
                    r1 = R_INNER_1;
                  } else if (slice.ring === 'middle') {
                    span = Math.PI / 6; // 3 fatias por 90°
                    r0 = R_MID_0;
                    r1 = R_MID_1;
                  } else {
                    span = Math.PI / 8; // 4 fatias por 90°
                    r0 = R_OUT_0;
                    r1 = R_OUT_1;
                  }

                  const a0 = baseAngle + slice.indexInRing * span;
                  const a1 = a0 + span;
                  const d = describeArcSector(CX, CY, r0, r1, a0, a1, 0.014);

                  // Ponto central da fatia para texto/ícone
                  const aMid = (a0 + a1) / 2;
                  const rMid = (r0 + r1) / 2;
                  const labelPos = polarToCartesian(CX, CY, rMid, aMid);

                  // Cores e Estilos dinâmicos
                  let fill = '#12151b';
                  let stroke = 'rgba(255,255,255,0.1)';
                  let strokeWidth = 1;
                  let opacity = 1;

                  if (complete) {
                    fill = sideInfo.color;
                    stroke = '#fbbf24';
                    strokeWidth = 2;
                  } else if (inProgress) {
                    fill = sideInfo.color;
                    opacity = 0.45;
                    stroke = '#ffffff';
                    strokeWidth = 1.5;
                  } else if (available) {
                    fill = '#202633';
                    stroke = sideInfo.color;
                    strokeWidth = 1.5;
                  } else if (locked) {
                    fill = '#11141a';
                    stroke = 'rgba(255,255,255,0.06)';
                    opacity = 0.35;
                  }

                  if (isSelected) {
                    stroke = '#ffffff';
                    strokeWidth = 3;
                  }

                  return (
                    <g
                      key={slice.id}
                      className={`slice-g ${slice.side} ${complete ? 'state-complete' : ''} ${available ? 'state-avail' : ''} ${locked ? 'state-locked' : ''} ${isSelected ? 'state-selected' : ''}`}
                      onClick={() => handleSelectSlice(slice)}
                      onMouseEnter={() => setHoveredSliceId(slice.id)}
                      onMouseLeave={() => setHoveredSliceId((c) => (c === slice.id ? null : c))}
                      style={{ cursor: 'pointer' }}
                    >
                      <path
                        d={d}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        filter={isSelected ? 'url(#gold-glow)' : undefined}
                        className="slice-arc-path"
                      >
                        <title>
                          {pick(slice.name)} ({rank}/{slice.cost})
                        </title>
                      </path>

                      {/* Elementos Visuais no Centro da Fatia */}
                      {slice.conviction ? (
                        <image
                          href={icon(slice.conviction.icon)}
                          x={labelPos.x - 9}
                          y={labelPos.y - 9}
                          width="18"
                          height="18"
                          opacity={locked ? 0.3 : complete ? 1 : 0.85}
                          style={{ pointerEvents: 'none' }}
                        />
                      ) : complete ? (
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          ✓
                        </text>
                      ) : inProgress ? (
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {rank}/{slice.cost}
                        </text>
                      ) : available ? (
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 3}
                          textAnchor="middle"
                          fill={sideInfo.color}
                          fontSize="10"
                          fontWeight="bold"
                          opacity="0.9"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          +{slice.cost}
                        </text>
                      ) : (
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 3}
                          textAnchor="middle"
                          fill="#555d6e"
                          fontSize="9"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {slice.cost}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* ── Centro da Roda: Selo de Maestria ─────────────────── */}
              <g className="wheel-hub-group" style={{ pointerEvents: 'none' }}>
                <circle cx={CX} cy={CY} r={50} fill="url(#hub-gradient)" stroke="#d97706" strokeWidth="2.5" />
                <circle cx={CX} cy={CY} r={44} fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
                <text
                  x={CX}
                  y={CY - 16}
                  textAnchor="middle"
                  fill="#f59e0b"
                  fontSize="8.5"
                  letterSpacing="1.5"
                  fontWeight="bold"
                >
                  {tr('MAESTRIA', 'MASTERY')}
                </text>
                <text
                  x={CX}
                  y={CY + 8}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="22"
                  fontWeight="bold"
                  filter="drop-shadow(0 0 4px rgba(245,158,11,0.6))"
                >
                  {currentLvl}
                </text>
                <text
                  x={CX}
                  y={CY + 24}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontWeight="500"
                >
                  {spent}/200 {tr('pts', 'pts')}
                </text>
              </g>
            </svg>
          </div>
        </section>

        {/* Coluna da Direita: Inspetor da Fatia e Revelações do Lado */}
        <section className="wheel-details-column">
          {/* ── Painel 1: Inspetor da Fatia Selecionada ───────────────── */}
          <div className="wheel-card slice-inspector-card">
            <div className="inspector-header">
              <div className="inspector-title-row">
                <span className="inspector-side-badge" style={{ backgroundColor: selectedSideInfo.color }}>
                  <img className="icon tiny" src={icon(selectedSideInfo.icon)} alt="" />
                  {pick(selectedSideInfo.name)}
                </span>
                <span className="inspector-ring-badge">
                  {selectedSlice.ring === 'inner'
                    ? tr('Anel Interno (5 pts)', 'Inner Ring (5 pts)')
                    : selectedSlice.ring === 'middle'
                    ? tr('Anel Mediano (10 pts)', 'Middle Ring (10 pts)')
                    : tr('Anel Externo (15 pts)', 'Outer Ring (15 pts)')}
                </span>
              </div>
              <h3 className="inspector-slice-name">{pick(selectedSlice.name)}</h3>
            </div>

            {/* Barra de Progresso da Fatia */}
            <div className="slice-progress-box">
              <div className="slice-progress-header">
                <span>{tr('Pontos Investidos:', 'Points Invested:')}</span>
                <strong>
                  {selectedRank} / {selectedSlice.cost}
                </strong>
              </div>
              <div className="slice-progress-track">
                <div
                  className="slice-progress-fill"
                  style={{
                    width: `${(selectedRank / selectedSlice.cost) * 100}%`,
                    backgroundColor: selectedSideInfo.color,
                  }}
                />
              </div>
            </div>

            {/* Dedicação da Fatia */}
            <div className="slice-dedication-block">
              <div className="block-title">{tr('Bônus de Dedicação (por ponto):', 'Dedication Bonus (per point):')}</div>
              <div className="dedication-val-row">
                <span className="dedication-tag">{pick(selectedSideInfo.dedicationPerPoint)}</span>
                <span className="dedication-accumulated small muted">
                  {selectedRank > 0
                    ? tr(`(acumulado nesta fatia: ${selectedRank}×)`, `(accumulated in this slice: ${selectedRank}×)`)
                    : tr(`(dará até ${selectedSlice.cost}× ao completar)`, `(will grant up to ${selectedSlice.cost}× when maxed)`)}
                </span>
              </div>
            </div>

            {/* Convicção (se houver nesta fatia) */}
            {selectedSlice.conviction && (
              <div className={`conviction-card ${isSelectedComplete ? 'conviction-active' : 'conviction-inactive'}`}>
                <div className="conviction-header">
                  <div className="conviction-icon-frame">
                    <img className="icon" src={icon(selectedSlice.conviction.icon)} alt="" />
                  </div>
                  <div>
                    <div className="conviction-title-row">
                      <strong className="conviction-name">{pick(selectedSlice.conviction.name)}</strong>
                      <span className="conviction-status-tag">
                        {isSelectedComplete ? tr('Ativa ✓', 'Active ✓') : tr('Requer fatia completa', 'Requires complete slice')}
                      </span>
                    </div>
                    <p className="conviction-desc">{pick(selectedSlice.conviction.desc)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação para Investir Pontos */}
            <div className="slice-actions-area">
              {isSelectedComplete ? (
                <div className="slice-complete-badge">
                  ✓ {tr('Fatia Completa! Todos os bônus e convicções estão ativos.', 'Slice Complete! All bonuses and convictions active.')}
                </div>
              ) : isSelectedAvail ? (
                <div className="slice-invest-buttons">
                  <button
                    type="button"
                    className="primary invest-btn"
                    disabled={mastery.points < 1}
                    onClick={() => props.onUnlock(selectedSlice.id, 1)}
                  >
                    +1 {tr('Ponto', 'Point')}
                  </button>

                  {neededToComplete >= 2 && (
                    <button
                      type="button"
                      className="primary invest-btn"
                      disabled={mastery.points < 2}
                      onClick={() => props.onUnlock(selectedSlice.id, maxSpendable)}
                    >
                      +{maxSpendable} {tr('Pontos', 'Points')}
                    </button>
                  )}

                  {mastery.points === 0 && (
                    <span className="no-points-notice small muted">
                      {tr('Você não tem pontos livres de Maestria.', 'You have no free Mastery points.')}
                    </span>
                  )}
                </div>
              ) : (
                <div className="slice-locked-notice">
                  <div className="locked-msg">
                    🔒 {tr('Caminho Bloqueado: complete ao menos uma fatia vizinha para abrir:', 'Path Locked: complete at least one neighboring slice to unlock:')}
                  </div>
                  <div className="slice-neighbors-list">
                    {selectedSlice.neighbors.map((nId) => {
                      const nSlice = wheelSliceById(nId);
                      if (!nSlice) return null;
                      const nDone = isSliceComplete(slices, nId);
                      return (
                        <span
                          key={nId}
                          className={`neighbor-chip ${nDone ? 'chip-done' : 'chip-locked'}`}
                          onClick={() => handleSelectSlice(nSlice)}
                          title={tr('Clique para inspecionar', 'Click to inspect')}
                        >
                          {nDone ? '✓' : '🔒'} {pick(nSlice.name)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Painel 2: Revelações e Magias do Lado Ativo ─────────── */}
          <div className="wheel-card revelations-card">
            <div className="revelations-header">
              <div className="revelations-tabs">
                {WHEEL_SIDES.map((side) => {
                  const isCur = activeSide === side.id;
                  return (
                    <button
                      key={side.id}
                      type="button"
                      className={`rev-side-tab ${isCur ? 'active' : ''}`}
                      style={{ borderColor: isCur ? side.color : undefined }}
                      onClick={() => setActiveSide(side.id)}
                    >
                      <span className="dot" style={{ backgroundColor: side.color }} />
                      <span>{pick(side.name)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="side-progress-overview">
                <div className="overview-text">
                  <span>{tr('Pontos Completos:', 'Completed Points:')}</span>
                  <strong>
                    {activeSideCompleted}/100 {tr('pts', 'pts')}
                  </strong>
                  <small className="muted">
                    ({activeSideInvested}/100 {tr('investidos', 'invested')})
                  </small>
                </div>
                <div className="side-overview-track">
                  <div
                    className="side-overview-fill"
                    style={{
                      width: `${activeSideCompleted}%`,
                      backgroundColor: WHEEL_SIDES.find((s) => s.id === activeSide)?.color,
                    }}
                  />
                  {/* Marcadores dos Marcos */}
                  <div className="track-marker" style={{ left: '40%' }} title="Rank 1 (40 pts)" />
                  <div className="track-marker" style={{ left: '70%' }} title="Rank 2 + Magia (70 pts)" />
                  <div className="track-marker" style={{ left: '100%' }} title="Rank 3 + Magia Forte (100 pts)" />
                </div>
              </div>
            </div>

            {/* Info da Revelação da Vocação */}
            {activeRevInfo && (
              <div className="revelation-details-body">
                <div className="rev-intro">
                  <div className="rev-intro-top">
                    <h4 className="rev-name">{pick(activeRevInfo.name)}</h4>
                    <span className="rev-level-tag">
                      {activeSideRevLevel > 0
                        ? tr(`Nível ${activeSideRevLevel} Ativo`, `Level ${activeSideRevLevel} Active`)
                        : tr('Inativa', 'Inactive')}
                    </span>
                  </div>
                  <p className="rev-desc small muted">{pick(activeRevInfo.desc)}</p>
                </div>

                {/* 3 Marcos de Revelação */}
                <div className="rev-milestones-list">
                  {/* Marco 40 pts */}
                  <div className={`milestone-item ${activeSideCompleted >= 40 ? 'milestone-unlocked' : 'milestone-locked'}`}>
                    <div className="milestone-badge">
                      <span>40 pts</span>
                      <strong>Rank 1</strong>
                    </div>
                    <div className="milestone-content">
                      <div className="milestone-status">
                        {activeSideCompleted >= 40 ? (
                          <span className="status-ok">✓ {tr('Desbloqueado', 'Unlocked')}</span>
                        ) : (
                          <span className="status-need">
                            🔒 {tr(`Requer 40 pts (faltam ${40 - activeSideCompleted})`, `Requires 40 pts (${40 - activeSideCompleted} left)`)}
                          </span>
                        )}
                      </div>
                      <div className="milestone-effect">{pick(activeRevInfo.ranks[0])}</div>
                    </div>
                  </div>

                  {/* Marco 70 pts + Magia da Roda */}
                  <div className={`milestone-item ${activeSideCompleted >= 70 ? 'milestone-unlocked' : 'milestone-locked'}`}>
                    <div className="milestone-badge">
                      <span>70 pts</span>
                      <strong>Rank 2</strong>
                    </div>
                    <div className="milestone-content">
                      <div className="milestone-status">
                        {activeSideCompleted >= 70 ? (
                          <span className="status-ok">✓ {tr('Desbloqueado + Magia', 'Unlocked + Spell')}</span>
                        ) : (
                          <span className="status-need">
                            🔒 {tr(`Requer 70 pts (faltam ${70 - activeSideCompleted})`, `Requires 70 pts (${70 - activeSideCompleted} left)`)}
                          </span>
                        )}
                      </div>
                      <div className="milestone-effect">{pick(activeRevInfo.ranks[1])}</div>

                      {/* Card da Magia Desbloqueada */}
                      {activeBaseSpell && (
                        <div className="wheel-spell-card">
                          <div className="spell-icon-box">
                            <img className="icon" src={spellIconFor(activeBaseSpell.id, activeSide)} alt="" />
                          </div>
                          <div className="spell-meta">
                            <div className="spell-name-row">
                              <strong className="spell-title">{activeBaseSpell.name}</strong>
                              <span className="spell-cooldown-badge">
                                {activeBaseSpell.cooldownMs / 1000}s {tr('recarga', 'cooldown')}
                              </span>
                            </div>
                            <p className="spell-description">{activeBaseSpell.description}</p>
                            <div className="spell-tag-sub">
                              ⚡ {activeBaseSpell.cost} {tr('mana', 'mana')} · {tr('Usada sozinha no combate', 'Cast automatically in combat')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Marco 100 pts (Lado Completo) + Magia Forte */}
                  <div className={`milestone-item ${activeSideCompleted >= 100 ? 'milestone-unlocked' : 'milestone-locked'}`}>
                    <div className="milestone-badge">
                      <span>100 pts</span>
                      <strong>Rank 3</strong>
                    </div>
                    <div className="milestone-content">
                      <div className="milestone-status">
                        {activeSideCompleted >= 100 ? (
                          <span className="status-ok">★ {tr('Lado Completo! Magia Fortalecida', 'Full Side! Empowered Spell')}</span>
                        ) : (
                          <span className="status-need">
                            🔒 {tr(`Requer 100 pts (faltam ${100 - activeSideCompleted})`, `Requires 100 pts (${100 - activeSideCompleted} left)`)}
                          </span>
                        )}
                      </div>
                      <div className="milestone-effect">{pick(activeRevInfo.ranks[2])}</div>

                      {/* Magia Fortalecida */}
                      {activeStrongSpell && (
                        <div className="wheel-spell-card strong-spell">
                          <div className="spell-icon-box">
                            <img className="icon" src={spellIconFor(activeStrongSpell.id, activeSide)} alt="" />
                          </div>
                          <div className="spell-meta">
                            <div className="spell-name-row">
                              <strong className="spell-title">{activeStrongSpell.name}</strong>
                              <span className="spell-cooldown-badge gold">
                                ★ {tr('Fortalecida', 'Empowered')}
                              </span>
                            </div>
                            <p className="spell-description">{activeStrongSpell.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
