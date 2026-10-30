/**
 * Avisos de erro do servidor num canal do Discord (webhook em DISCORD_ALERT_WEBHOOK).
 * O primeiro erro de cada tipo sai na hora; os repetidos dentro da janela só contam e
 * vão juntos no próximo aviso daquele tipo, para não lotar o canal. Sem webhook, não faz nada.
 * Nunca lança erro: um aviso que falha não pode derrubar o servidor.
 */
export interface Alerts {
  /** Erro em algum ponto do servidor (`where`: http, tick, ws, uncaught...). */
  report(where: string, err: unknown): void;
  /** Mensagem avulsa (ex.: o servidor iniciou). */
  info(text: string): void;
}

type Post = (url: string, body: string) => Promise<unknown>;

const defaultPost: Post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

export function createAlerts(opts: { webhook?: string; post?: Post; now?: () => number; windowMs?: number } = {}): Alerts {
  const post = opts.post ?? defaultPost;
  const now = opts.now ?? Date.now;
  const windowMs = opts.windowMs ?? 10 * 60_000;
  const seen = new Map<string, { sentAt: number; skipped: number }>();
  const send = (content: string) => {
    if (!opts.webhook) return;
    try {
      post(opts.webhook, JSON.stringify({ content: content.slice(0, 1900) })).catch(() => {});
    } catch {
      // ignora: o aviso é só um extra
    }
  };
  return {
    report(where, err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const key = `${where}|${e.message.split('\n')[0]}`;
      const at = now();
      const s = seen.get(key);
      if (s && at - s.sentAt < windowMs) {
        s.skipped++;
        return;
      }
      const extra = s?.skipped ? ` (+${s.skipped} vezes desde o último aviso)` : '';
      seen.set(key, { sentAt: at, skipped: 0 });
      const stack = (e.stack ?? '').split('\n').slice(1, 6).join('\n');
      send(`⚠️ **[${where}]** ${e.message}${extra}${stack ? `\n\`\`\`\n${stack}\n\`\`\`` : ''}`);
    },
    info(text) {
      send(text);
    },
  };
}

/** Os avisos do processo (index.ts liga com o webhook; nos testes fica sem webhook e não faz nada). */
export let alerts: Alerts = createAlerts();
export function setAlerts(a: Alerts) {
  alerts = a;
}
