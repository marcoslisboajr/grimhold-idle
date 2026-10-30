import { titleName } from './Achievements.tsx';
import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX, CHAT_MAX_ITEMS, VOCATIONS, itemById, rarityOf, splitRarity, type ChatMessage } from '@grimhold/shared';
import { itemTooltip } from './Home.tsx';
import { t, onLangChange, getLang, itemName, tr } from './i18n.ts';
import { serverText } from './serverText.ts';

const LINK_ITEM_EVENT = 'grimhold:link-item';

/** Insere `[item:id]` no campo de texto do chat e abre o chat se estiver fechado/minimizado. */
export function linkItemInChat(itemId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<string>(LINK_ITEM_EVENT, { detail: itemId }));
  }
}

/** Links do Discord no texto do sistema viram clicáveis (só o convite do jogo). */
function withLinks(text: string) {
  const parts = text.split(/(https:\/\/discord\.gg\/\w+)/);
  return parts.map((p, i) =>
    i % 2 ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="chat-link">
        {p}
      </a>
    ) : (
      p
    ),
  );
}

/** Renderiza o texto da mensagem convertendo marcadores `[item:id]` em ícone + nome com cor da raridade e dica de atributos. */
function renderChatMessageText(
  text: string,
  msgKey: string | number,
  openTip: string | null,
  onToggleTip: (key: string) => void,
  vocation?: string,
  combatLevel?: number,
) {
  const parts = text.split(/(\[item:[^\]]+\])/g);
  return parts.map((part, idx) => {
    const m = /^\[item:([^\]]+)\]$/.exec(part);
    if (!m) return <span key={idx}>{part}</span>;
    const rawId = m[1].trim();
    const item = itemById(rawId);
    if (!item) return <span key={idx}>{rawId}</span>;
    const name = itemName(item.name);
    const tier = splitRarity(rawId).tier;
    const color = item.legendary || tier > 0 ? rarityOf(rawId).color : '#e8e2d4';
    const tip = itemTooltip(rawId, vocation, combatLevel);
    const tipKey = `${msgKey}:${idx}`;
    const isOpen = openTip === tipKey;
    return (
      <span key={idx} className="chat-item-wrap">
        <button
          type="button"
          className="chat-item-link"
          style={{ color }}
          title={tip}
          onClick={() => onToggleTip(tipKey)}
        >
          <img className="icon tiny" src={`/assets/icons/${item.icon}.png`} alt="" />
          <span>[{name}]</span>
        </button>
        {isOpen && <span className="chat-item-popover">{tip}</span>}
      </span>
    );
  });
}

const isDrop = (m: ChatMessage) => !!m.system && /encontrou um (item|mascote)/.test(m.text);
/** Aviso de chefe derrotado (instância ou covil): vai para a aba Chefes. */
const isBossKill = (m: ChatMessage) => !!m.system && / derrotou /.test(m.text);

const time = (at: number) => new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export type ChatMode = 'open' | 'min' | 'closed';

/**
 * Chat global e de grupo estilo Tibia:
 * aberto, minimizado (com contador de novas mensagens) ou fechado.
 */
export function Chat(props: {
  messages: ChatMessage[];
  me: string;
  vocation?: string;
  combatLevel?: number;
  onSend: (text: string, channel: 'global' | 'party') => void;
  mode: ChatMode;
  onMode: (mode: ChatMode) => void;
  hasParty?: boolean;
  onPlayerClick?: (name: string) => void;
}) {
  const [, setLangState] = useState(getLang());
  useEffect(() => onLangChange(setLangState), []);
  const [tab, setTab] = useState<'global' | 'party' | 'drops' | 'bosses'>('global');
  const [text, setText] = useState('');
  const [openTip, setOpenTip] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [seen, setSeen] = useState(props.messages.length);
  const unread = props.mode === 'open' ? 0 : Math.max(0, props.messages.length - seen);

  useEffect(() => {
    if (props.mode === 'open') setSeen(props.messages.length);
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [props.messages.length, props.mode, tab]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const itemId = (ev as CustomEvent<string>).detail;
      if (!itemId) return;
      if (props.mode !== 'open') props.onMode('open');
      if (tab === 'drops' || tab === 'bosses') setTab('global');
      setText((prev) => {
        const currentCount = (prev.match(/\[item:[^\]]+\]/g) ?? []).length;
        if (currentCount >= CHAT_MAX_ITEMS) return prev;
        const tag = `[item:${itemId}]`;
        const sep = prev && !prev.endsWith(' ') ? ' ' : '';
        const next = `${prev}${sep}${tag}`;
        return next.length <= CHAT_MAX ? next : prev;
      });
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener(LINK_ITEM_EVENT, handler);
    return () => window.removeEventListener(LINK_ITEM_EVENT, handler);
  }, [props.mode, props.onMode, tab]);

  if (props.mode === 'closed') return null;

  const filteredMessages = props.messages.filter((m) => {
    if (tab === 'party') return m.channel === 'party';
    if (tab === 'drops') return isDrop(m);
    if (tab === 'bosses') return isBossKill(m);
    return !isDrop(m) && !isBossKill(m); // Na aba Geral: global, sistema e grupo com tag (os drops ficam na aba deles)
  });

  const head = (
    <header className="chat-head">
      <div className="chat-head-left">
        <button
          className={`chat-tab-btn ${tab === 'global' ? 'active' : ''}`}
          onClick={() => {
            setTab('global');
            if (props.mode !== 'open') props.onMode('open');
          }}
        >
          {t('chat.tab_general')}{unread > 0 && props.mode !== 'open' && <span className="chat-unread">{unread}</span>}
        </button>
        <button
          className={`chat-tab-btn ${tab === 'party' ? 'active' : ''}`}
          onClick={() => {
            setTab('party');
            if (props.mode !== 'open') props.onMode('open');
          }}
        >
          {t('chat.tab_party')}
        </button>
        <button
          className={`chat-tab-btn ${tab === 'drops' ? 'active' : ''}`}
          onClick={() => {
            setTab('drops');
            if (props.mode !== 'open') props.onMode('open');
          }}
        >
          {t('chat.tab_drops', 'Drops')}
        </button>
        <button
          className={`chat-tab-btn ${tab === 'bosses' ? 'active' : ''}`}
          onClick={() => {
            setTab('bosses');
            if (props.mode !== 'open') props.onMode('open');
          }}
        >
          {tr('Chefes', 'Bosses')}
        </button>
      </div>
      <div className="chat-head-actions">
        <button
          className="chat-btn"
          onClick={() => props.onMode(props.mode === 'open' ? 'min' : 'open')}
          aria-label={props.mode === 'open' ? 'Minimizar chat' : 'Abrir chat'}
        >
          {props.mode === 'open' ? '–' : '▴'}
        </button>
        <button className="chat-btn" onClick={() => props.onMode('closed')} aria-label={tr('Fechar chat', 'Close chat')}>
          ×
        </button>
      </div>
    </header>
  );

  if (props.mode === 'min') return <section className="chat-dock min">{head}</section>;

  const toggleTip = (key: string) => setOpenTip((prev) => (prev === key ? null : key));

  return (
    <section className="chat-dock">
      {head}
      <ul className="chat-list" ref={list}>
        {tab === 'party' && !props.hasParty && (
          <li className="muted">{t('chat.no_party_warning')}</li>
        )}
        {filteredMessages.length === 0 && (
          <li className="muted">
            {tab === 'party' ? t('chat.empty_party') : t('chat.empty_general')}
          </li>
        )}
        {filteredMessages.map((m) => {
          const isSystem = m.vocation === 'system' || m.system;
          const isParty = m.channel === 'party';
          return (
            <li
              key={m.id}
              className={`${m.name === props.me ? 'mine' : ''} ${isSystem ? 'chat-system-msg' : ''} ${
                isParty ? 'chat-party-msg' : ''
              }`}
            >
              <span className="chat-time">{time(m.at)}</span>{' '}
              {isParty && <span className="chat-party-tag">[{t('chat.tab_party')}] </span>}
              {isSystem ? (
                <span className="chat-system-text">
                  {withLinks(serverText(m.text))}
                </span>
              ) : (
                <>
                  <strong
                    style={{ cursor: props.onPlayerClick && m.name !== props.me ? 'pointer' : 'default', textDecoration: props.onPlayerClick && m.name !== props.me ? 'underline' : 'none' }}
                    title={props.onPlayerClick && m.name !== props.me ? tr(`Ver perfil de ${m.name}`, `View ${m.name} profile`) : t(`voc.${m.vocation}`, VOCATIONS.find((v) => v.id === m.vocation)?.name ?? m.vocation)}
                    onClick={() => {
                      if (props.onPlayerClick && m.name !== props.me) props.onPlayerClick(m.name);
                    }}
                  >
                    {m.name}:
                  </strong>{' '}
                  {m.title && titleName(m.title) && <span className="chat-title">«{titleName(m.title)}»</span>}{m.title && titleName(m.title) ? ' ' : ''}
                  {renderChatMessageText(m.text, m.id, openTip, toggleTip, props.vocation, props.combatLevel)}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          props.onSend(text, tab === 'party' ? 'party' : 'global');
          setText('');
        }}
      >
        <input
          ref={inputRef}
          value={text}
          maxLength={CHAT_MAX}
          placeholder={tab === 'party' ? t('chat.party_placeholder') : t('chat.say_something')}
          onChange={(e) => setText(e.target.value)}
          aria-label="Mensagem"
          disabled={tab === 'party' && !props.hasParty}
        />
        <button className="primary small-btn" disabled={!text.trim() || (tab === 'party' && !props.hasParty)}>
          {t('chat.send')}
        </button>
      </form>
    </section>
  );
}
