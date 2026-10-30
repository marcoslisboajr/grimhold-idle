import { useState, useEffect } from 'react';
import { Pix } from './Pix.tsx';
import {
  MAX_PARTY_MEMBERS,
  VOCATIONS,
  type PartyView,
  type PartyInviteView,
} from '@grimhold/shared';
import { Sprite } from './Sprite.tsx';
import { t, tr, onLangChange, getLang } from './i18n.ts';

interface PartyPanelProps {
  party: PartyView | null;
  myCharacterId: number;
  onInvite: (name: string) => void;
  onCancelInvite?: (targetId: number) => void;
  onKick: (memberId: number) => void;
  onLeave: () => void;
  /** Vai caçar onde o membro está caçando. */
  onJoin?: (huntNode: string) => void;
}

export function PartyPanel({
  party,
  myCharacterId,
  onInvite,
  onCancelInvite,
  onKick,
  onLeave,
  onJoin,
}: PartyPanelProps) {
  const [, setLangState] = useState(getLang());
  useEffect(() => onLangChange(setLangState), []);
  const [inviteName, setInviteName] = useState('');

  const isLeader = party?.leaderId === myCharacterId;
  const me = party?.members.find((m) => m.characterId === myCharacterId);
  const pendingCount = party?.pendingInvites?.length ?? 0;
  const canInvite = !party || (isLeader && (party.members.length + pendingCount) < MAX_PARTY_MEMBERS);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteName.trim();
    if (!trimmed) return;
    onInvite(trimmed);
    setInviteName('');
  };

  return (
    <div className="party-panel">
      {!party ? (
        <div className="party-empty">
          <p className="party-desc">
            {t('party.empty_desc')}
          </p>
          <form className="party-invite-form" onSubmit={handleInviteSubmit}>
            <input
              type="text"
              placeholder={t('party.invite_placeholder')}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              maxLength={20}
              className="party-input"
            />
            <button type="submit" className="primary small-btn" disabled={!inviteName.trim()}>
              {t('party.invite_btn')}
            </button>
          </form>
        </div>
      ) : (
        <div className="party-content">
          <div className="party-header-info">
            <div className="party-bonus-badge">
              {party.sharedXpBonus > 0 ? (
                <span className="party-bonus-active">
                  <Pix name="ui_star" /> +{Math.round(party.sharedXpBonus * 100)}% {t('party.bonus_active')}
                </span>
              ) : (
                <span className="party-bonus-inactive">
                  {t('party.bonus_inactive')}
                </span>
              )}
            </div>
            <span className="party-count">
              {party.members.length} / {MAX_PARTY_MEMBERS} {t('party.members_count')}
            </span>
          </div>

          <div className="party-members-list">
            {party.members.map((member) => {
              const voc = VOCATIONS.find((v) => v.id === member.vocation);
              const isMe = member.characterId === myCharacterId;
              const hpPct = Math.max(0, Math.min(100, Math.round((member.hp / member.maxHp) * 100)));

              return (
                <div key={member.characterId} className={`party-member-card ${isMe ? 'is-me' : ''}`}>
                  <div className="party-member-avatar">
                    <Sprite vocation={member.vocation} scale={1.5} />
                  </div>
                  <div className="party-member-info">
                    <div className="party-member-topline">
                      <span className="party-member-status" title={member.online ? 'Online' : 'Offline'}>
                        <span className={`status-dot ${member.online ? 'online' : 'offline'}`} />
                      </span>
                      <strong className="party-member-name">
                        {member.name}
                        {member.isLeader && <span className="leader-crown" title={t('party.leader')}> <Pix name="kraken_crown" /></span>}
                        {isMe && <span className="party-me-tag"> {t('party.you')}</span>}
                      </strong>
                      <span className="party-member-lvl">{t('common.level')} {member.level}</span>
                    </div>

                    <div className="party-member-subline">
                      <span className="party-member-voc">{t(`voc.${member.vocation}`, voc?.name ?? member.vocation)}</span>
                      <span className="party-member-location" title={placeName(member.huntName) ?? undefined}>
                        <Pix name="ui_pin" /> {placeName(member.huntName)}
                      </span>
                    </div>
                    {member.share && <div className={`party-share party-share-${member.share}`}>{shareText(member.share)}</div>}

                    <div className="party-hp-bar-bg" title={`HP: ${member.hp} / ${member.maxHp}`}>
                      <div className="party-hp-bar-fill" style={{ width: `${hpPct}%` }} />
                      <span className="party-hp-bar-text">{member.hp} / {member.maxHp}</span>
                    </div>
                  </div>

                  {!isMe && onJoin && member.huntNode && member.huntNode !== me?.huntNode && (
                    <button type="button" className="primary small-btn party-join-btn" title={tr('Caçar na mesma caçada', 'Hunt in the same place')} onClick={() => onJoin(member.huntNode!)}>
                      {tr('Ir até ele', 'Join')}
                    </button>
                  )}
                  {isLeader && !isMe && (
                    <button
                      className="party-kick-btn"
                      title={t('party.kick')}
                      onClick={() => onKick(member.characterId)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Convites pendentes aguardando resposta */}
          {party.pendingInvites && party.pendingInvites.length > 0 && (
            <div className="party-pending-section">
              <span className="party-pending-title small">{t('party.pending_invites')}</span>
              <div className="party-pending-list">
                {party.pendingInvites.map((inv) => (
                  <div key={inv.targetId} className="party-pending-card">
                    <span className="party-pending-name">
                      <Pix name="ui_hourglass" /> {inv.targetName} ({t('common.level')} {inv.targetLevel})
                    </span>
                    {isLeader && onCancelInvite && (
                      <button
                        type="button"
                        className="party-cancel-invite-btn"
                        title={t('party.cancel')}
                        onClick={() => onCancelInvite(inv.targetId)}
                      >
                        ✕ {t('party.cancel')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canInvite && (
            <form className="party-invite-form" onSubmit={handleInviteSubmit}>
              <input
                type="text"
                placeholder={t('party.invite_placeholder')}
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                maxLength={20}
                className="party-input"
              />
              <button type="submit" className="primary small-btn" disabled={!inviteName.trim()}>
                {t('party.invite_btn')}
              </button>
            </form>
          )}

          <div className="party-actions">
            <button className="secondary small-btn" onClick={onLeave}>
              {t('party.leave')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PartyInviteModal({
  invite,
  onAccept,
  onDecline,
}: {
  invite: PartyInviteView;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="party-invite-toast">
      <div className="party-invite-toast-content">
        <span className="party-invite-icon"><Pix name="kraken_crown" /></span>
        <div className="party-invite-text">
          <strong>{invite.leaderName}</strong> {t('party.invited_you')}
        </div>
        <div className="party-invite-buttons">
          <button className="primary small-btn" onClick={onAccept}>
            {t('party.accept')}
          </button>
          <button className="secondary small-btn" onClick={onDecline}>
            {t('party.decline')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Por que o membro divide (ou não) a XP com quem olha. */
function shareText(share: NonNullable<PartyView['members'][number]['share']>) {
  switch (share) {
    case 'sharing':
      return tr('Dividindo XP e bônus', 'Sharing XP and bonus');
    case 'bonus_only':
      return tr('Offline: conta 1/4 do bônus e não divide XP', 'Offline: 1/4 bonus, no XP share');
    case 'other_hunt':
      return tr('Outra caçada ou dificuldade', 'Other hunt or difficulty');
    case 'level_gap':
      return tr('Fora: nível abaixo de 2/3 do maior', 'Out: level below 2/3 of the highest');
    case 'not_hunting':
      return tr('Não está caçando', 'Not hunting');
  }
}

/** Onde o membro está: caçada pelo nome, ou cidade/treino traduzidos. */
function placeName(name: string | null | undefined): string | null | undefined {
  if (name === 'Bastião') return t('city.bastion', 'Bastião');
  if (name === 'Treinando') return tr('Treinando', 'Training');
  return name;
}
