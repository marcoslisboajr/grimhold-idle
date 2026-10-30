import { useEffect, useState, type FormEvent } from 'react';
import { NewsPanel, GuidePanel, CreditsPanel } from './News.tsx';
import {
  DEFAULT_LOOKS,
  MAX_CHARACTERS,
  NAME_MAX,
  VOCATIONS,
  validateCharacterName,
  type Character,
  type Look,
  type VocationId,
} from '@grimhold/shared';
import { api, ApiError, loadToken, saveToken } from './api.ts';
import { Home } from './Home.tsx';
import { ForgotForm, LoginForm, ResetForm, SignupForm } from './Account.tsx';
import { Sprite } from './Sprite.tsx';
import { LookEditor } from './LookEditor.tsx';
import { ClassGuide } from './ClassGuide.tsx';
import { t, getLang, setLang, onLangChange, type Lang, tr } from './i18n.ts';

/** Links dos emails, lidos uma vez ao abrir a página (?verify= / ?reset=). */
const EMAIL_LINK = (() => {
  const p = new URLSearchParams(window.location.search);
  return { verify: p.get('verify'), reset: p.get('reset') };
})();

type Screen =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'reset'; resetToken: string }
  | { kind: 'create'; token: string; back?: boolean }
  | { kind: 'select'; token: string; characters: Character[]; username: string | null }
  | { kind: 'home'; token: string; character: Character; username: string | null };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);
  // Aviso verde (deu certo), como o de erro: some sozinho.
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  // Redesenha a tela de entrada quando troca o idioma.
  const [, setLangTick] = useState(0);
  useEffect(() => onLangChange(() => setLangTick((n) => n + 1)), []);

  /**
   * Entra na conta. No mesmo dia em que jogou neste navegador, vai direto para o último
   * personagem (uma atualização do jogo recarrega a página e não pode jogar o jogador na
   * seleção). Na primeira vez do dia, ou pedindo, abre a seleção de personagem.
   */
  function enter(token: string, chooser = false) {
    return api.me(token).then(async ({ character, characters, username }) => {
      if (characters.length === 0) return setScreen({ kind: 'create', token });
      let last = loadLastPlay();
      // Primeira vez com a seleção de personagem (atualização): continua no personagem de sempre.
      if (!last && character) {
        saveLastPlay(character.id);
        last = loadLastPlay();
      }
      // F5 (ou o deploy) na aba que já estava jogando volta direto ao jogo, em qualquer dia;
      // aba nova no dia seguinte abre a seleção, como antes.
      const tabId = loadTabPlay();
      // Recarregou a página (F5 depois de um deploy) sem a marca da aba (versão antiga): volta ao
      // personagem que a sessão já estava jogando no servidor.
      const reloaded = (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload';
      const pick = chooser
        ? undefined
        : tabId !== null
          ? characters.find((c) => c.id === tabId)
          : reloaded && character
            ? character
            : last?.day === today()
              ? characters.find((c) => c.id === last!.id)
              : undefined;
      if (!pick) return setScreen({ kind: 'select', token, characters, username });
      const chosen = character?.id === pick.id ? character : (await api.selectCharacter(token, pick.id)).character;
      saveTabPlay(chosen.id);
      setScreen({ kind: 'home', token, character: chosen, username });
    });
  }
  async function play(token: string, c: Character, username: string | null) {
    try {
      const { character } = await api.selectCharacter(token, c.id);
      saveLastPlay(character.id);
      setScreen({ kind: 'home', token, character, username });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // O aviso de erro some sozinho (e tem ×): não fica preso em cima do jogo.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(id);
  }, [error]);

  useEffect(() => {
    // Links dos emails: ?verify= confirma o email; ?reset= abre a recuperação da conta.
    const { verify, reset } = EMAIL_LINK;
    if (verify || reset) window.history.replaceState(null, '', window.location.pathname);
    // Só uma vez (o React em desenvolvimento roda o efeito duas vezes).
    EMAIL_LINK.verify = null;
    if (verify)
      api
        .verifyEmail(verify)
        .then((r) => setNotice(tr(`Email ${r.email} confirmado!`, `Email ${r.email} confirmed!`)))
        .catch((err) => setError((err as Error).message));
    if (reset) return setScreen({ kind: 'reset', resetToken: reset });
    const token = loadToken();
    if (!token) return setScreen({ kind: 'login' });
    // Sessão inválida vai para a tela de entrada. Outro erro (servidor reiniciando num
    // deploy, internet oscilando) tenta de novo antes de desistir.
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () =>
      enter(token).catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          saveToken(null);
          return setScreen({ kind: 'login' });
        }
        if (++tries < 6) {
          timer = setTimeout(attempt, 2000);
          return;
        }
        setError(err.message);
        setScreen({ kind: 'login' });
      });
    attempt();
    return () => clearTimeout(timer);
  }, []);

  async function playAsGuest() {
    setError(null);
    try {
      const { token } = await api.guest();
      saveToken(token);
      setScreen({ kind: 'create', token });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="shell">
      <h1 className="title">Grimhold Idle</h1>
      {error && (
        <div className="toast" role="alert">
          {error}
          <button className="toast-x" onClick={() => setError(null)} aria-label={tr('Fechar aviso', 'Close notice')}>
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="toast toast-ok" role="status">
          {notice}
          <button className="toast-x" onClick={() => setNotice(null)} aria-label={tr('Fechar aviso', 'Close notice')}>
            ×
          </button>
        </div>
      )}

      {screen.kind === 'loading' && <p className="muted">Carregando…</p>}

      {screen.kind === 'login' && (
        <section className="panel center">
          <div className="lineup">
            {VOCATIONS.map((v) => (
              <Sprite key={v.id} vocation={v.id} scale={3} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 12px' }}>
            <button
              type="button"
              className="small-btn lang-toggle-btn"
              onClick={() => setLang(getLang() === 'pt' ? 'en' : 'pt')}
              style={{ fontWeight: 'bold', padding: '4px 12px' }}
            >
              {getLang() === 'pt' ? 'Português' : 'English'} ▾
            </button>
          </div>
          <p className="muted">{getLang() === 'pt' ? 'Sua caçada começa no Bastião de Grimhold.' : 'Your hunt begins at the Bastion of Grimhold.'}</p>
          <details className="login-box" open>
            <summary>{tr('Entrar', 'Log in')}</summary>
            <LoginForm
              onToken={(token) => {
                saveToken(token);
                enter(token).catch((err) => setError((err as Error).message));
              }}
            />
          </details>
          <details className="login-box">
            <summary>{tr('Esqueci a senha', 'Forgot password')}</summary>
            <ForgotForm />
          </details>
          <details className="login-box signup-box">
            <summary>{tr('Ainda não tem conta? Crie a sua', "Don't have an account? Create one")}</summary>
            <SignupForm
              onToken={(token) => {
                saveToken(token);
                setScreen({ kind: 'create', token });
              }}
            />
          </details>
          <button className="small-btn" onClick={playAsGuest}>
            {t('auth.guest')}
          </button>
          <p className="small muted">{tr('Convidado: a conta fica só neste navegador (dá para proteger depois).', 'Guest: the account lives only in this browser (you can protect it later).')}</p>
        </section>
      )}

      {screen.kind === 'reset' && (
        <ResetForm
          resetToken={screen.resetToken}
          onToken={(token) => {
            saveToken(token);
            enter(token).catch((err) => setError((err as Error).message));
          }}
          onCancel={() => {
            const token = loadToken();
            if (token) enter(token).catch(() => setScreen({ kind: 'login' }));
            else setScreen({ kind: 'login' });
          }}
        />
      )}

      {screen.kind === 'select' && (
        <CharacterSelect
          characters={screen.characters}
          onPlay={(c) => play(screen.token, c, screen.username)}
          onCreate={() => setScreen({ kind: 'create', token: screen.token, back: true })}
          onLogout={async () => {
            await api.logout(screen.token).catch(() => undefined);
            saveToken(null);
            setScreen({ kind: 'login' });
          }}
        />
      )}

      {screen.kind === 'create' && (
        <CreateCharacter
          token={screen.token}
          onBack={
            screen.back
              ? () => enter(screen.token, true).catch((err) => setError((err as Error).message))
              : // Conta sem personagem (nova ou convidado): volta para a tela de entrar.
                async () => {
                  await api.logout(screen.token).catch(() => undefined);
                  saveToken(null);
                  setScreen({ kind: 'login' });
                }
          }
          onCreated={(character) => {
            saveLastPlay(character.id);
            api.me(screen.token).then(
              ({ username }) => setScreen({ kind: 'home', token: screen.token, character, username }),
              () => setScreen({ kind: 'home', token: screen.token, character, username: null }),
            );
          }}
        />
      )}

      {screen.kind === 'home' && (
        <Home
          token={screen.token}
          character={screen.character}
          username={screen.username}
          onLogout={async () => {
            await api.logout(screen.token).catch(() => undefined);
            saveToken(null);
            saveTabPlay(null);
            setScreen({ kind: 'login' });
          }}
          onSwitchCharacter={() => {
            saveTabPlay(null);
            enter(screen.token, true).catch((err) => setError((err as Error).message));
          }}
        />
      )}
    </main>
  );
}

/** Último personagem jogado neste navegador e o dia (local) em que entrou. */
const LAST_PLAY_KEY = 'grimhold.lastPlay';
const today = () => new Date().toLocaleDateString('sv-SE');
function loadLastPlay(): { id: number; day: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_PLAY_KEY) ?? 'null');
    return v && typeof v.id === 'number' && typeof v.day === 'string' ? v : null;
  } catch {
    return null;
  }
}
function saveLastPlay(id: number) {
  try {
    localStorage.setItem(LAST_PLAY_KEY, JSON.stringify({ id, day: today() }));
  } catch {
    /* sem localStorage: a seleção abre de novo, só isso */
  }
  saveTabPlay(id);
}
/** Personagem jogando nesta aba (sessionStorage: sobrevive ao F5, some ao fechar a aba). */
const TAB_PLAY_KEY = 'grimhold.tabPlay';
function loadTabPlay(): number | null {
  try {
    const v = Number(sessionStorage.getItem(TAB_PLAY_KEY));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
function saveTabPlay(id: number | null) {
  try {
    if (id === null) sessionStorage.removeItem(TAB_PLAY_KEY);
    else sessionStorage.setItem(TAB_PLAY_KEY, String(id));
  } catch {
    /* sem sessionStorage: vale a regra do dia */
  }
}

/** Seleção de personagem: os da conta (até MAX_CHARACTERS) e o botão de criar outro. */
function CharacterSelect(props: { characters: Character[]; onPlay: (c: Character) => void; onCreate: () => void; onLogout: () => void }) {
  const [tab, setTab] = useState<'chars' | 'news' | 'guide' | 'classes' | 'credits'>('chars');
  const tabs = [
    ['chars', tr('Personagens', 'Characters')],
    ['news', tr('Novidades', 'Patch notes')],
    ['guide', tr('Guia', 'Guide')],
    ['classes', tr('Guia de classes', 'Class guide')],
    ['credits', tr('Créditos', 'Credits')],
  ] as const;
  return (
    <section className="panel center char-select">
      <div className="char-tabs">
        {tabs.map(([id, label]) => (
          <button type="button" key={id} className={`small-btn ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'news' && <NewsPanel />}
      {tab === 'guide' && <GuidePanel />}
      {tab === 'classes' && <ClassGuide vocation={props.characters[0]?.vocation} level={props.characters[0]?.level} />}
      {tab === 'credits' && <CreditsPanel />}
      {tab === 'chars' && <h2>{tr('Escolha o personagem', 'Choose your character')}</h2>}
      {tab === 'chars' && <div className="char-list">
        {props.characters.map((c) => (
          <button type="button" key={c.id} className="char-card" onClick={() => props.onPlay(c)}>
            <Sprite vocation={c.vocation} look={c.look} scale={3} />
            <strong>{c.name}</strong>
            <span className="small">
              {VOCATIONS.find((v) => v.id === c.vocation)?.name ?? c.vocation} · {tr('Nível', 'Level')} {c.level}
            </span>
          </button>
        ))}
        {props.characters.length < MAX_CHARACTERS && (
          <button type="button" className="char-card new" onClick={props.onCreate}>
            <span className="char-plus">+</span>
            <strong>{tr('Criar personagem', 'Create character')}</strong>
            <span className="small">
              {props.characters.length}/{MAX_CHARACTERS}
            </span>
          </button>
        )}
      </div>}
      <button type="button" className="small-btn" onClick={props.onLogout}>
        {t('topbar.logout')}
      </button>
    </section>
  );
}

function CreateCharacter(props: { token: string; onCreated: (c: Character) => void; onBack?: () => void }) {
  const [name, setName] = useState('');
  const [vocation, setVocation] = useState<VocationId>('warrior');
  /** Aparência escolhida para cada vocação (trocar de vocação não perde o que já montou). */
  const [looks, setLooks] = useState<Record<VocationId, Look>>(DEFAULT_LOOKS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nameError = validateCharacterName(name);
    if (nameError) return setError(nameError);
    setBusy(true);
    setError(null);
    try {
      const { character } = await api.createCharacter(props.token, name, vocation, looks[vocation]);
      props.onCreated(character);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Criar personagem</h2>

      <label className="field">
        <span>Nome</span>
        <input
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Aria Vento"
          autoFocus
        />
      </label>

      <fieldset className="vocations">
        <legend>{tr('Vocação', 'Vocation')}</legend>
        {VOCATIONS.map((v) => (
          <label key={v.id} className={`vocation ${vocation === v.id ? 'selected' : ''}`}>
            <input
              type="radio"
              name="vocation"
              value={v.id}
              checked={vocation === v.id}
              onChange={() => setVocation(v.id)}
            />
            <Sprite vocation={v.id} look={looks[v.id]} acting={vocation === v.id} scale={3} />
            <strong>{v.name}</strong>
            <span className="muted">{v.role}</span>
            <span className="small">Mestre: {v.master}</span>
            <span className="small stats">
              Vida {v.base.hp} · Mana {v.base.mana} · Ataque {v.base.attack} · Defesa {v.base.defense}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="look-field">
        <legend>{tr('Aparência', 'Appearance')}</legend>
        <LookEditor vocation={vocation} look={looks[vocation]} onChange={(l) => setLooks({ ...looks, [vocation]: l })} />
      </fieldset>

      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy}>
        {busy ? tr('Criando…', 'Creating…') : tr('Começar', 'Start')}
      </button>
      {props.onBack && (
        <button type="button" className="small-btn" onClick={props.onBack}>
          {tr('Voltar', 'Back')}
        </button>
      )}
    </form>
  );
}
