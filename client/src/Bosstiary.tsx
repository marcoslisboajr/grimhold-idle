import { useState } from 'react';
import {
  BOSSES,
  BOSS_STAGES,
  BOSSTIARY_MAX_LEVEL,
  SPECIAL_BOSSES,
  WORLD_BOSSES,
  bossPoints,
  bossStage,
  bossStagePoints,
  bosstiaryBonusAt,
  bosstiaryLevel,
  bosstiaryPoints,
  bosstiaryPointsFor,
  huntById,
  itemById,
  monsterById,
  type BossEntry,
  type BossKind,
} from '@grimhold/shared';
import { MonsterSprite } from './Battle.tsx';
import { getLang, itemName, tr } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;
const worldBoss = (id: string) => [...WORLD_BOSSES, ...SPECIAL_BOSSES].find((b) => b.id === id);

export function bossName(b: BossEntry): string {
  return b.kind === 'world' ? worldBoss(b.id)?.name ?? b.id : monsterById(b.id)?.name ?? b.id;
}
function bossSprite(b: BossEntry): string {
  return b.kind === 'world' ? worldBoss(b.id)?.sprite ?? '' : monsterById(b.id)?.sprite ?? '';
}

const KINDS: { id: BossKind; pt: string; en: string }[] = [
  { id: 'instance', pt: 'Instâncias', en: 'Instances' },
  { id: 'lair', pt: 'Covis', en: 'Lairs' },
  { id: 'world', pt: 'Chefes mundiais', en: 'World bosses' },
];

/**
 * Bosstiary: a ficha de cada chefe avança com as vitórias (1, 10 e 50; nos mundiais 1, 5 e 20).
 * Cada etapa dá pontos de chefe; o nível pelos pontos dá mais drop e XP contra todos os chefes.
 */
export function BosstiaryPanel(props: { kills: Record<string, number> }) {
  const lang = getLang();
  const fmt = (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const pct = (f: number) => `${+(f * 100).toFixed(1)}%`;
  const [kind, setKind] = useState<BossKind>('instance');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const kills = props.kills;
  const points = bosstiaryPoints(kills);
  const level = bosstiaryLevel(points);
  const bonus = bosstiaryBonusAt(level);
  const maxed = level >= BOSSTIARY_MAX_LEVEL;
  const from = bosstiaryPointsFor(level);
  const to = bosstiaryPointsFor(level + 1);
  const nextBonus = bosstiaryBonusAt(level + 1);
  const list = BOSSES.filter((b) => b.kind === kind);
  const beaten = BOSSES.filter((b) => (kills[b.key] ?? 0) > 0).length;
  const open = openKey ? BOSSES.find((b) => b.key === openKey) : undefined;

  return (
    <div className="bosstiary">
      <div className="bosstiary-head">
        <div>
          <strong className="gold-text">
            {tr('Nível', 'Level')} {level}/{BOSSTIARY_MAX_LEVEL}
          </strong>{' '}
          <span className="small">
            · {fmt(points)} {tr('pontos de chefe', 'boss points')} · {tr('chefes vencidos', 'bosses beaten')} {beaten}/{BOSSES.length}
          </span>
        </div>
        <div className="bar thin">
          <div className="fill xp" style={{ width: `${maxed ? 100 : Math.min(100, ((points - from) / (to - from)) * 100)}%` }} />
        </div>
        <p className="small">
          {tr('Bônus contra todos os chefes:', 'Bonus against all bosses:')} <strong className="loot-pos">+{pct(bonus.loot)}</strong> {tr('de chance de drop', 'drop chance')} ·{' '}
          <strong className="loot-pos">+{pct(bonus.xp)}</strong> XP
          {!maxed && (
            <>
              {' '}
              · {tr('próximo nível em', 'next level at')} {fmt(to)} {tr('pontos', 'points')} (+{pct(nextBonus.loot)} / +{pct(nextBonus.xp)})
            </>
          )}
        </p>
        <p className="small low">
          {tr(
            'Cada vitória conta: 1, 10 e 50 vitórias (nos chefes mundiais 1, 5 e 20) completam as etapas da ficha e dão pontos; chefes mais fortes valem mais. Os itens dos deuses recebem metade do bônus de drop.',
            'Every win counts: 1, 10 and 50 wins (1, 5 and 20 for world bosses) complete the sheet stages and give points; stronger bosses are worth more. Divine items get half the drop bonus.',
          )}
        </p>
      </div>

      <div className="tabs" role="tablist">
        {KINDS.map((k) => (
          <button key={k.id} role="tab" aria-selected={kind === k.id} className={`tab ${kind === k.id ? 'on' : ''}`} onClick={() => { setKind(k.id); setOpenKey(null); }}>
            {lang === 'pt' ? k.pt : k.en}
          </button>
        ))}
      </div>

      {open && open.kind === kind && <BossDetail boss={open} kills={kills[open.key] ?? 0} />}

      <div className="bestiary-grid">
        {list.map((b) => {
          const n = kills[b.key] ?? 0;
          const stage = bossStage(b, n);
          const next = BOSS_STAGES[b.kind][Math.min(stage, 2)];
          return (
            <button
              key={b.key}
              className={`beast-card stage-${stage} ${openKey === b.key ? 'on' : ''}`}
              onClick={() => {
                setOpenKey(openKey === b.key ? null : b.key);
                requestAnimationFrame(() => document.querySelector('.boss-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
              }}
            >
              <span className={n === 0 ? 'beast-unknown' : ''}>
                <MonsterSprite sprite={bossSprite(b)} height={44} />
              </span>
              <strong>{n === 0 ? '???' : bossName(b)}</strong>
              {b.kind !== 'world' && <span className="small low">{tr('nível', 'level')} {b.level}</span>}
              <span className="beast-stars">{'★'.repeat(stage)}{'☆'.repeat(3 - stage)}</span>
              <div className="bar thin">
                <div className="fill xp" style={{ width: `${Math.min(100, (n / next) * 100)}%` }} />
              </div>
              <span className="small">{stage === 3 ? `${fmt(n)} ${tr('vitórias', 'wins')}` : `${fmt(n)}/${fmt(next)}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Ficha do chefe: aberta na primeira vitória (vida, ataque e drops); antes, só o que falta. */
function BossDetail(props: { boss: BossEntry; kills: number }) {
  const { boss: b, kills: n } = props;
  const lang = getLang();
  const fmt = (x: number) => x.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const stage = bossStage(b, n);
  const stages = BOSS_STAGES[b.kind];
  const m = b.kind === 'world' ? undefined : monsterById(b.id);
  const wb = b.kind === 'world' ? worldBoss(b.id) : undefined;
  const drops: { item: string; chance?: number }[] = m
    ? m.loot.filter((l) => !l.quest && l.item !== 'gold').map((l) => ({ item: l.item, chance: l.chance }))
    : [...(wb?.legendarySet ?? []).map((item) => ({ item })), ...(wb?.loot ?? []).map((l) => ({ item: l.item, chance: l.chance })), ...(wb?.bag ? [{ item: wb.bag.item, chance: wb.bag.chance }] : [])];
  return (
    <div className="beast-detail boss-detail">
      <h4>{n === 0 ? '???' : bossName(b)}</h4>
      {b.hunt && <p className="small low">{huntById(b.hunt)?.name}</p>}
      {stage < 1 ? (
        <p className="small">{tr('Vença este chefe uma vez para abrir a ficha.', 'Defeat this boss once to open the sheet.')}</p>
      ) : (
        <>
          {m && (
            <p className="small">
              {tr('Vida', 'HP')} {fmt(m.hp)} · {tr('Ataque', 'Attack')} {Math.round(m.attack)} · {tr('Defesa', 'Defense')} {Math.round(m.defense)} · XP {fmt(Math.round(m.xp))}
            </p>
          )}
          {drops.length > 0 && (
            <div className="beast-loot">
              {drops.map((d) => {
                const it = itemById(d.item);
                return (
                  <span key={d.item} className="beast-drop" title={it ? itemName(it.name) : d.item}>
                    <img className="icon tiny" src={icon(it?.icon ?? 'gold')} alt="" /> {it ? itemName(it.name) : d.item}{' '}
                    {d.chance !== undefined && <em>{d.chance >= 1 ? tr('sempre', 'always') : `${+(d.chance * 100).toFixed(1)}%`}</em>}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
      <p className="small">
        {[1, 2, 3].map((s) => (
          <span key={s} className={stage >= s ? 'gold-text' : 'low'}>
            {s > 1 ? ' · ' : ''}
            {stages[s - 1]} {tr(stages[s - 1] === 1 ? 'vitória' : 'vitórias', stages[s - 1] === 1 ? 'win' : 'wins')}: +{bossStagePoints(b, s as 1 | 2 | 3)}
          </span>
        ))}{' '}
        {tr('pontos', 'points')} ({tr('ganhos', 'earned')} {bossPoints(b, n)})
      </p>
    </div>
  );
}
