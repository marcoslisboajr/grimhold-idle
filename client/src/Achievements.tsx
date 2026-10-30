import { useState } from 'react';
import {
  ACH_CATEGORIES,
  ACHIEVEMENT_LIST,
  ACHIEVEMENT_MAX_POINTS,
  achievementById,
  achievementPoints,
  achievementProgress,
  titlesFrom,
  type AchCategory,
  type PlayerState,
} from '@grimhold/shared';
import { getLang, tr } from './i18n.ts';

const pick = (pair: [string, string]) => (getLang() === 'pt' ? pair[0] : pair[1]);

/** Nome do título de uma conquista no idioma do jogador (vazio se não tiver). */
export function titleName(achievement: string | null | undefined): string {
  const a = achievement ? achievementById(achievement) : undefined;
  return a?.title ? pick(a.title) : '';
}

/** Conquistas: pontos, título escolhido e a lista por categoria com o progresso. */
export function AchievementsPanel(props: { state: PlayerState; onTitle: (achievement: string | null) => void }) {
  const [cat, setCat] = useState<AchCategory | 'all'>('all');
  const [hideDone, setHideDone] = useState(false);
  const got = props.state.achievements ?? {};
  const lang = getLang();
  const fmt = (n: number) => Math.floor(n).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const points = achievementPoints(Object.keys(got));
  const titles = titlesFrom(Object.keys(got));
  const shown = ACHIEVEMENT_LIST.filter((a) => (cat === 'all' || a.cat === cat) && (!hideDone || !(a.id in got)));
  return (
    <div className="ach-panel">
      <div className="ach-head">
        <div>
          <strong className="ach-points">{fmt(points)}</strong> / {fmt(ACHIEVEMENT_MAX_POINTS)} {tr('pontos', 'points')}
          <span className="small muted">
            {' '}· {Object.keys(got).length}/{ACHIEVEMENT_LIST.length} {tr('conquistas', 'achievements')}
          </span>
        </div>
        <label className="small ach-title-pick">
          {tr('Título', 'Title')}:{' '}
          <select value={props.state.title ?? ''} onChange={(e) => props.onTitle(e.target.value || null)}>
            <option value="">{tr('— nenhum —', '— none —')}</option>
            {titles.map((t) => (
              <option key={t.id} value={t.id}>
                {pick(t.title)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="quest-category-tags ach-cats">
        <button className={`cat-pill ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
          {tr('Todas', 'All')}
        </button>
        {ACH_CATEGORIES.map((c) => {
          const total = ACHIEVEMENT_LIST.filter((a) => a.cat === c.id);
          const done = total.filter((a) => a.id in got).length;
          return (
            <button key={c.id} className={`cat-pill ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
              {pick(c.name)} ({done}/{total.length})
            </button>
          );
        })}
        <label className="small" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> {tr('Esconder feitas', 'Hide done')}
        </label>
      </div>
      <ul className="ach-list">
        {shown.map((a) => {
          const at = got[a.id];
          const done = at !== undefined;
          const hidden = a.secret && !done;
          const [now, goal] = achievementProgress(a, props.state);
          const pct = done ? 100 : Math.min(100, Math.floor((now / goal) * 100));
          return (
            <li key={a.id} className={`ach-row ${done ? 'got' : ''}`}>
              <span className="ach-star" aria-hidden="true">{done ? '★' : '☆'}</span>
              <div className="ach-body">
                <div className="ach-line">
                  <strong>{hidden ? '???' : pick(a.name)}</strong>
                  <span className="ach-pts">{a.points} pts</span>
                </div>
                <span className="small">{hidden ? tr('Conquista secreta.', 'Secret achievement.') : pick(a.desc)}</span>
                {a.title && !hidden && (
                  <span className="small ach-title">
                    {tr('Título', 'Title')}: «{pick(a.title)}»
                  </span>
                )}
                {done ? (
                  <span className="small muted">{tr('Feita em', 'Done on')} {date(at)}</span>
                ) : (
                  !hidden && (
                    <>
                      <div className="bar thin">
                        <div className="fill xp" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="small muted">
                        {fmt(Math.min(now, goal))}/{fmt(goal)}
                      </span>
                    </>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
