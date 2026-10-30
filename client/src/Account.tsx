import { useEffect, useState, type FormEvent } from 'react';
import { PASSWORD_MIN, USERNAME_MAX, validatePassword, validateUsername } from '@grimhold/shared';
import { api } from './api.ts';
import { t, getLang, tr } from './i18n.ts';
import { serverText } from './serverText.ts';

/** Protege a conta de convidado com usuário e senha. O personagem continua o mesmo. */
export function ProtectAccount(props: { token: string; onDone: (username: string) => void; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem =
      validateUsername(username) ?? validatePassword(password) ?? (password !== confirm ? tr('As senhas não batem.', 'The passwords do not match.') : null);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const r = await api.register(props.token, username, password);
      props.onDone(r.username);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel modal account" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('auth.protect_title')}>
        <h3>{t('auth.protect_title')}</h3>
        <p className="small">
          {t('auth.protect_desc')}
        </p>
        <form className="account-form" onSubmit={submit}>
          <label>
            {t('auth.username')}
            <input value={username} maxLength={USERNAME_MAX} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            {t('auth.password')} ({tr('mín.', 'min.')} {PASSWORD_MIN})
            <input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label>
            {t('auth.confirm_password')}
            <input type="password" value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error && <p className="danger">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? t('auth.saving') : t('auth.save')}
          </button>
        </form>
      </section>
    </div>
  );
}

/**
 * Criar conta na tela inicial: abre uma conta e já põe usuário e senha nela
 * (o mesmo caminho do "Proteger conta"). Depois vem a criação do personagem.
 */
export function SignupForm(props: { onToken: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Se o usuário já existia, a conta aberta é reaproveitada na próxima tentativa.
  const [token, setToken] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem =
      validateUsername(username) ?? validatePassword(password) ?? (password !== confirm ? 'As senhas não batem.' : null);
    if (problem) return setError(serverText(problem));
    setBusy(true);
    setError(null);
    try {
      const tk = token ?? (await api.guest()).token;
      setToken(tk);
      await api.register(tk, username, password);
      props.onToken(tk);
    } catch (err) {
      setError(serverText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit}>
      <label>
        {t('auth.username')}
        <input value={username} maxLength={USERNAME_MAX} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        {t('auth.password')} ({tr('mín.', 'min.')} {PASSWORD_MIN})
        <input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label>
        {t('auth.confirm_password')}
        <input type="password" value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {error && <p className="danger">{error}</p>}
      <button className="primary" disabled={busy || !username || !password || !confirm}>
        {busy ? tr('Criando…', 'Creating…') : t('auth.register')}
      </button>
    </form>
  );
}

/** Entrar com usuário e senha (tela inicial). */
export function LoginForm(props: { onToken: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.login(username, password);
      props.onToken(token);
    } catch (err) {
      setError(serverText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit}>
      <label>
        {t('auth.username')}
        <input value={username} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        {t('auth.password')}
        <input type="password" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="danger">{error}</p>}
      <button className="primary" disabled={busy || !username || !password}>
        {busy ? (getLang() === 'pt' ? 'Entrando…' : 'Logging in…') : t('auth.login')}
      </button>
    </form>
  );
}

/** Esqueci a senha: manda o link de recuperação para o email confirmado da conta. */
export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgot(email);
      setDone(true);
    } catch (err) {
      setError(serverText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <p className="small">
        {tr(
          'Se esse email estiver confirmado numa conta, chega um link em alguns minutos (olhe o spam). O link vale 30 minutos.',
          'If that email is confirmed on an account, a link arrives in a few minutes (check spam). The link is valid for 30 minutes.',
        )}
      </p>
    );
  return (
    <form className="account-form" onSubmit={submit}>
      <p className="small muted">{tr('Funciona com o email confirmado no seu perfil (Social > Meu perfil).', 'Works with the email confirmed in your profile (Social > My profile).')}</p>
      <label>
        Email
        <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <p className="danger">{error}</p>}
      <button className="primary" disabled={busy || !email.includes('@')}>
        {tr('Mandar link', 'Send link')}
      </button>
    </form>
  );
}

/** Link do email de recuperação: cria a senha nova (e o usuário, se a conta era de convidado). */
export function ResetForm(props: { resetToken: string; onToken: (token: string) => void; onCancel: () => void }) {
  const [info, setInfo] = useState<{ username: string | null } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.resetInfo(props.resetToken).then(setInfo).catch((err) => setError(serverText((err as Error).message)));
  }, [props.resetToken]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = (info?.username ? null : validateUsername(username)) ?? validatePassword(password);
    if (err) return setError(serverText(err));
    setBusy(true);
    setError(null);
    try {
      const r = await api.reset(props.resetToken, username, password);
      props.onToken(r.token);
    } catch (err) {
      setError(serverText((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel center">
      <h3>{tr('Recuperar conta', 'Recover account')}</h3>
      {!info && !error && <p className="muted">{tr('Conferindo o link…', 'Checking the link…')}</p>}
      {info && (
        <form className="account-form" onSubmit={submit}>
          {info.username ? (
            <p className="small">
              {tr('Seu usuário', 'Your username')}: <b>{info.username}</b>
            </p>
          ) : (
            <label>
              {tr('Crie um usuário', 'Create a username')}
              <input value={username} maxLength={USERNAME_MAX} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
            </label>
          )}
          <label>
            {tr('Senha nova', 'New password')} ({tr('mín.', 'min.')} {PASSWORD_MIN})
            <input type="password" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="primary" disabled={busy || !password || (!info.username && !username)}>
            {tr('Salvar e entrar', 'Save and log in')}
          </button>
        </form>
      )}
      {error && <p className="danger">{error}</p>}
      <button className="small-btn" onClick={props.onCancel}>
        {tr('Voltar', 'Back')}
      </button>
    </section>
  );
}
