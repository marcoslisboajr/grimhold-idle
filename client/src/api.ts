import type { Character, ClientMessage, RankingEntry, PlayerProfile, ServerMessage, VocationId, Look } from '@grimhold/shared';

const TOKEN_KEY = 'grimhold.token';

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sem storage: a sessão dura só esta aba */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, token: string | null, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined && path !== '/api/auth/guest' ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Falha na conexão.');
  return data as T;
}

export const api = {
  guest: () => call<{ token: string }>('/api/auth/guest', null),
  profile: (name: string) => call<PlayerProfile>(`/api/profile?name=${encodeURIComponent(name)}`, null),
  ranking: (skill: string) =>
    call<{ skill: string; entries: RankingEntry[] }>(`/api/ranking?skill=${encodeURIComponent(skill)}`, null),
  me: (token: string) => call<{ character: Character | null; characters: Character[]; username: string | null }>('/api/me', token),
  selectCharacter: (token: string, id: number) => call<{ character: Character }>('/api/character/select', token, { id }),
  login: (username: string, password: string) =>
    call<{ token: string }>('/api/auth/login', null, { username, password }),
  register: (token: string, username: string, password: string) =>
    call<{ username: string }>('/api/auth/register', token, { username, password }),
  logout: (token: string) => call<{ ok: boolean }>('/api/auth/logout', token, {}),
  createCharacter: (token: string, name: string, vocation: VocationId, look: Look) =>
    call<{ character: Character }>('/api/character', token, { name, vocation, look }),
  account: (token: string) => call<{ email: string | null; verified: boolean }>('/api/account', token),
  setEmail: (token: string, email: string) => call<{ email: string | null; verified: boolean; sent: boolean }>('/api/account/email', token, { email }),
  verifyEmail: (token: string) => call<{ email: string }>('/api/auth/verify', null, { token }),
  forgot: (email: string) => call<{ ok: boolean }>('/api/auth/forgot', null, { email }),
  resetInfo: (token: string) => call<{ username: string | null }>(`/api/auth/reset?token=${encodeURIComponent(token)}`, null),
  reset: (token: string, username: string, password: string) =>
    call<{ token: string; username: string }>('/api/auth/reset', null, { token, username, password }),
  setBio: (token: string, bio: string) => call<{ bio: string }>('/api/profile/bio', token, { bio }),
  feedback: (token: string, kind: 'bug' | 'idea', text: string) =>
    call<{ ok: boolean }>('/api/feedback', token, { kind, text }),
};

export interface Socket {
  send(msg: ClientMessage): void;
  close(): void;
}

/** Fechamentos em que reconectar não adianta: sessão inválida ou conta aberta em outra janela. */
const NO_RETRY = new Set([4000, 4003, 4009]);
/** Comando dado com a conexão caída espera até isto; depois é descartado (já não vale). */
const QUEUE_MS = 15_000;

/**
 * Abre o WebSocket já autenticado. Se a conexão cair (internet oscilou, celular
 * dormiu, servidor reiniciou), reconecta sozinho, e os comandos dados nesse meio
 * tempo vão assim que voltar.
 */
export function connectSocket(token: string, onMessage: (msg: ServerMessage) => void): Socket {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  let ws: WebSocket;
  let closed = false;
  let retryMs = 1000;
  let opened = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue: { msg: ClientMessage; at: number }[] = [];

  const open = () => {
    clearTimeout(timer);
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      retryMs = 1000;
      // Reconectou (o deploy reinicia o servidor): o aviso de versão nova confere na hora.
      if (opened) window.dispatchEvent(new Event('grimhold:reconnected'));
      opened = true;
      ws.send(JSON.stringify({ type: 'auth', token }));
      const now = Date.now();
      for (const q of queue.splice(0)) if (now - q.at < QUEUE_MS) ws.send(JSON.stringify(q.msg));
    };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = (e) => {
      if (closed || NO_RETRY.has(e.code)) return;
      timer = setTimeout(open, retryMs);
      retryMs = Math.min(10_000, retryMs * 2);
    };
  };
  open();

  // Voltou para a aba (ou o celular acordou) com a conexão caída: tenta na hora.
  const onVisible = () => {
    if (document.visibilityState === 'visible' && !closed && ws.readyState === WebSocket.CLOSED) open();
  };
  document.addEventListener('visibilitychange', onVisible);

  return {
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      else if (!closed) queue.push({ msg, at: Date.now() });
    },
    close: () => {
      closed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      ws.close();
    },
  };
}
