import { useEffect, useState } from 'react';
import { levelForXp, promotionById, SKILLS, VOCATIONS, type RankingEntry, type SkillId } from '@grimhold/shared';
import { api } from './api.ts';
import { titleName } from './Achievements.tsx';
import { t, getLang, tr } from './i18n.ts';

/** Ranking: os melhores de cada skill. Atualiza ao trocar de aba. */
export function Ranking(props: { me: string; onClose: () => void; onPlayer?: (name: string) => void }) {
  const [skill, setSkill] = useState<SkillId | 'skiller' | 'achievements'>('combat');
  const [entries, setEntries] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lang = getLang();

  useEffect(() => {
    let alive = true;
    setEntries(null);
    setError(null);
    api
      .ranking(skill)
      .then((r) => alive && setEntries(r.entries))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [skill]);

  const vocationLabel = (e: RankingEntry) => {
    if (e.promotion) {
      return t(`voc.${e.promotion}`, promotionById(e.promotion)?.name ?? e.promotion);
    }
    const voc = VOCATIONS.find((v) => v.id === e.vocation);
    return t(`voc.${e.vocation}`, voc?.name ?? e.vocation);
  };

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('ranking.title', 'Ranking')}>
        <header className="picker-head">
          <h3>{t('ranking.title', 'Ranking')}</h3>
          <button className="close" onClick={props.onClose} aria-label={t('ranking.close', 'Fechar')}>
            ×
          </button>
        </header>
        <div className="tabs ranking-tabs" role="tablist">
          {SKILLS.flatMap((s) => [
            <button key={s.id} className={`tab ${skill === s.id ? 'on' : ''}`} onClick={() => setSkill(s.id)}>
              <img className="icon tiny" src={`/assets/icons/${s.icon}.png`} alt="" /> {t(`skill.${s.id}`, s.name)}
            </button>,
            ...(s.id === 'combat' ? [
          <button key="skiller" className={`tab ${skill === 'skiller' ? 'on' : ''}`} onClick={() => setSkill('skiller')} title={tr('Soma do nível de todas as skills, menos as de combate', 'Sum of every skill level except combat ones')}>
            <img className="icon tiny" src="/assets/icons/skill_crafting.png" alt="" /> Skiller
          </button>,
              <button key="achievements" className={`tab ${skill === 'achievements' ? 'on' : ''}`} onClick={() => setSkill('achievements')} title={tr('Pontos de conquistas', 'Achievement points')}>
                <img className="icon tiny" src="/assets/icons/hunter_trophy_bronze.png" alt="" /> {tr('Conquistas', 'Achievements')}
              </button>,
            ] : []),
          ])}
        </div>
        {error ? (
          <p className="danger">{error}</p>
        ) : entries === null ? (
          <p className="muted">{t('ranking.loading', 'Carregando…')}</p>
        ) : entries.length === 0 ? (
          <p className="muted">{t('ranking.empty', 'Ninguém treinou essa skill ainda.')}</p>
        ) : (
          <ol className="ranking">
            {entries.map((e, i) => (
              <li key={e.name} className={`${e.name === props.me ? 'mine' : ''} ${props.onPlayer ? 'clickable' : ''}`} onClick={() => props.onPlayer?.(e.name)} title={tr('Ver perfil', 'View profile')}>
                <span className="rank">{i + 1}</span>
                <strong>{e.name}</strong>
                {e.title && titleName(e.title) && <span className="small chat-title">«{titleName(e.title)}»</span>}
                <span className="small">
                  {vocationLabel(e)}
                </span>
                <span className="rank-level">
                  {skill === 'achievements' ? `${e.achievementPoints ?? 0} ${tr('pontos', 'points')}` : skill === 'skiller' ? `${tr('Nível', 'Level')} ${e.skillerLevel ?? 0}` : `${lang === 'pt' ? 'Nv' : 'Lv'} ${levelForXp(e.xp, skill)}${e.mastery !== undefined ? ` · ${tr('Maestria', 'Mastery')} ${e.mastery}` : ''}`}
                </span>
                <span className="small">{skill === 'achievements' ? '' : e.totalLevel !== undefined ? `${tr('Nível total', 'Total level')} ${e.totalLevel}` : `${e.xp.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} XP`}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
