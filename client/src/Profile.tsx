import { useEffect, useState } from 'react';
import {
  bossEntry,
  itemById,
  levelForXp,
  promotionById,
  SKILLS,
  VOCATIONS,
  type EquipSlot,
  type PlayerProfile,
  type SkillId,
  BIO_MAX_CHARS,
} from '@grimhold/shared';
import { api } from './api.ts';
import { titleName } from './Achievements.tsx';
import { bossName } from './Bosstiary.tsx';
import { bonusText, rarityStyle } from './Home.tsx';
import { Sprite } from './Sprite.tsx';
import { getLang, itemName, t, tr } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;
const SLOTS: [EquipSlot, string][] = [
  ['amulet', 'Amuleto'], ['helmet', 'Elmo'], ['cape', 'Capa'],
  ['weapon', 'Arma'], ['armor', 'Armadura'], ['shield', 'Escudo'],
  ['ring', 'Anel'], ['legs', 'Calças'], ['gem', 'Gema'], ['boots', 'Botas'],
];

/** Perfil público de um jogador: aparência, níveis, equipamento, conquistas e chefes. */
/** Só no próprio perfil: editar a bio (pública) e o email da conta (só o dono vê). */
function OwnProfileEdit(props: { token: string; bio: string; onBio: (bio: string) => void }) {
  const [bio, setBio] = useState(props.bio);
  const [email, setEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .account(props.token)
      .then((r) => {
        setEmail(r.email ?? '');
        setVerified(r.verified);
      })
      .catch(() => undefined);
  }, [props.token]);
  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await api.setBio(props.token, bio);
      props.onBio(r.bio);
      setBio(r.bio);
      const e = await api.setEmail(props.token, email);
      setEmail(e.email ?? '');
      setVerified(e.verified);
      setSaved(
        e.sent
          ? tr('Salvo! Mandamos um link para confirmar o email (olhe o spam).', 'Saved! We sent a link to confirm the email (check spam).')
          : tr('Salvo!', 'Saved!'),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="profile-edit">
      <label className="small">
        {tr('Bio (todos veem)', 'Bio (everyone sees it)')}
        <textarea value={bio} maxLength={BIO_MAX_CHARS} rows={2} onChange={(e) => setBio(e.target.value)} placeholder={tr('Conte algo sobre você…', 'Tell something about you…')} />
        <span className="muted">
          {bio.length}/{BIO_MAX_CHARS}
        </span>
      </label>
      <label className="small">
        {tr('Email da conta (só você vê)', 'Account email (only you see it)')}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
        {email && (
          <span className={verified ? 'loot-pos' : 'muted'}>
            {verified ? tr('✓ Confirmado', '✓ Confirmed') : tr('Não confirmado: clique no link que mandamos (ou salve de novo para reenviar).', 'Not confirmed: click the link we sent (or save again to resend).')}
          </span>
        )}
        <span className="muted">{tr('Com o email confirmado, dá para recuperar a conta em "Esqueci a senha", inclusive de convidado. Vale para todos os seus personagens.', 'With a confirmed email you can recover the account in "Forgot password", guest ones included. Applies to all your characters.')}</span>
      </label>
      <div>
        <button className="small-btn primary" disabled={busy} onClick={save}>
          {tr('Salvar', 'Save')}
        </button>{' '}
        {saved && <span className="small loot-pos">{saved}</span>}
        {error && <span className="small danger">{error}</span>}
      </div>
    </div>
  );
}

export function ProfileModal(props: { name: string; me: string; token?: string; onClose: () => void; onTrade?: () => void }) {
  const [p, setP] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lang = getLang();
  const fmt = (n: number) => Math.floor(n).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');

  useEffect(() => {
    let alive = true;
    setP(null);
    setError(null);
    api.profile(props.name).then((r) => alive && setP(r)).catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [props.name]);

  const voc = p ? (p.promotion ? t(`voc.${p.promotion}`, promotionById(p.promotion)?.name ?? p.promotion) : t(`voc.${p.vocation}`, VOCATIONS.find((v) => v.id === p.vocation)?.name ?? p.vocation)) : '';
  const lv = (id: SkillId) => levelForXp(p?.skills[id] ?? 0, id);
  const total = p ? SKILLS.reduce((s, sk) => s + lv(sk.id), 0) : 0;
  const bosses = p
    ? Object.entries(p.bossKills)
        .flatMap(([k, n]) => {
          const b = bossEntry(k);
          return b ? [{ b, n }] : [];
        })
        .sort((a, b) => b.n - a.n)
    : [];

  return (
    <div className="overlay profile-overlay" onClick={props.onClose}>
      <section className="panel picker profile" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr('Perfil', 'Profile')}>
        <header className="picker-head">
          <h3>{tr('Perfil', 'Profile')}</h3>
          <button className="close" onClick={props.onClose} aria-label={tr('Fechar', 'Close')}>
            ×
          </button>
        </header>
        {error ? (
          <p className="danger">{error}</p>
        ) : !p ? (
          <p className="muted">{tr('Carregando…', 'Loading…')}</p>
        ) : (
          <div className="profile-body">
            <div className="profile-top">
              <Sprite vocation={p.vocation} look={p.look} equipment={p.equipment} scale={3} />
              <div className="profile-id">
                <h4>
                  {p.name} <span className={`profile-dot ${p.online ? 'on' : ''}`} title={p.online ? 'Online' : 'Offline'} />
                </h4>
                {p.title && titleName(p.title) && <span className="chat-title">«{titleName(p.title)}»</span>}
                <span className="small">
                  {voc} · {tr('Combate', 'Combat')} {lv('combat')} · {tr('Nível total', 'Total level')} {total}
                </span>
                <span className="small muted">
                  {fmt(p.achievementPoints)} {tr('pontos de conquista', 'achievement points')} ({p.achievementCount}) · {fmt(p.kills)} {tr('monstros', 'monsters')} · {fmt(p.quests)} quests
                </span>
                {p.bio && <p className="profile-bio">“{p.bio}”</p>}
                <span className="small muted">
                  {tr('Criado em', 'Created on')} {new Date(p.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US')}
                </span>
                {props.onTrade && p.name !== props.me && (
                  <button className="small-btn" onClick={props.onTrade}>
                    {tr('Propor troca', 'Offer trade')}
                  </button>
                )}
              </div>
            </div>

            {props.token && p.name.toLowerCase() === props.me.toLowerCase() && (
              <OwnProfileEdit token={props.token} bio={p.bio} onBio={(bio) => setP({ ...p, bio })} />
            )}

            <h4>{tr('Equipamento', 'Equipment')}</h4>
            <div className="profile-equip">
              {SLOTS.map(([slot, pt]) => {
                const id = p.equipment[slot];
                const item = id ? itemById(id) : undefined;
                return (
                  <div key={slot} className={`slot ${item ? '' : 'empty'}`} style={id ? rarityStyle(id) : undefined} title={item ? `${itemName(item.name)} — ${bonusText(item.equip ?? {})}` : t(`slot.${slot}`, pt)}>
                    {item ? <img className="icon" src={icon(item.icon)} alt={itemName(item.name)} /> : <span className="slot-placeholder">{t(`slot.${slot}`, pt)}</span>}
                  </div>
                );
              })}
            </div>

            <h4>Skills</h4>
            <ul className="profile-skills">
              {SKILLS.map((s) => (
                <li key={s.id}>
                  <img className="icon tiny" src={icon(s.icon)} alt="" /> {t(`skill.${s.id}`, s.name)} <strong>{lv(s.id)}</strong>
                </li>
              ))}
            </ul>

            <h4>
              {tr('Chefes derrotados', 'Bosses defeated')} ({bosses.length})
            </h4>
            {bosses.length === 0 ? (
              <p className="small muted">{tr('Nenhum ainda.', 'None yet.')}</p>
            ) : (
              <ul className="profile-bosses">
                {bosses.map(({ b, n }) => (
                  <li key={b.key} className="small">
                    {bossName(b)} <strong>×{fmt(n)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
