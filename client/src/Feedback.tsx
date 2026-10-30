import { useState } from 'react';
import { api } from './api.ts';
import { tr } from './i18n.ts';

/** Janela de feedback: o jogador manda um bug ou uma sugestão, que fica guardada no servidor. */
export function Feedback(props: { token: string; onClose: () => void }) {
  const [kind, setKind] = useState<'bug' | 'idea'>('bug');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = () => {
    setSending(true);
    setError(null);
    api
      .feedback(props.token, kind, text)
      .then(() => setSent(true))
      .catch((e: Error) => setError(e.message))
      .finally(() => setSending(false));
  };

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Feedback">
        <header className="picker-head">
          <h3>{tr('Bugs e sugestões', 'Bugs and suggestions')}</h3>
          <button className="close" onClick={props.onClose} aria-label={tr('Fechar', 'Close')}>
            ×
          </button>
        </header>
        {sent ? (
          <p>{tr('Recebido! Obrigado por ajudar a melhorar o Grimhold.', 'Received! Thanks for helping improve Grimhold.')}</p>
        ) : (
          <>
            <div className="tabs" role="tablist">
              <button className={`tab ${kind === 'bug' ? 'on' : ''}`} onClick={() => setKind('bug')}>
                {tr('Bug', 'Bug')}
              </button>
              <button className={`tab ${kind === 'idea' ? 'on' : ''}`} onClick={() => setKind('idea')}>
                {tr('Sugestão', 'Suggestion')}
              </button>
            </div>
            <p className="small">
              {kind === 'bug'
                ? tr('Conte o que aconteceu e o que você esperava. Já enviamos junto seu nível e o que você estava fazendo.', 'Tell us what happened and what you expected. Your level and current activity are sent along.')
                : tr('O que você gostaria de ver no jogo?', 'What would you like to see in the game?')}
            </p>
            <textarea
              className="feedback-text"
              style={{ width: "100%", boxSizing: "border-box" }}
              rows={6}
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={kind === 'bug' ? tr('Ex.: o prey não deu bônus depois que...', 'E.g.: the prey bonus did not apply after...') : tr('Ex.: seria legal ter...', 'E.g.: it would be cool to have...')}
            />
            <div className="small muted">{text.length}/1000</div>
            {error && <p className="danger">{error}</p>}
            <button className="primary" disabled={sending || text.trim().length < 5} onClick={send}>
              {sending ? tr('Enviando…', 'Sending…') : tr('Enviar', 'Send')}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
