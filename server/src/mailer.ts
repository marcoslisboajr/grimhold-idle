/**
 * Envio de email pelo Resend (API HTTP, sem biblioteca). A chave fica só no servidor
 * (RESEND_API_KEY no serviço). Sem chave, não manda nada: só registra no log.
 */
export interface Mailer {
  /** Manda o email; devolve falso se não deu (sem chave ou erro do Resend). */
  send(to: string, subject: string, html: string): Promise<boolean>;
}

export function createMailer(opts: { apiKey?: string; from?: string }): Mailer {
  const from = opts.from ?? 'Grimhold Idle <nao-responda@grimholdidle.com>';
  return {
    async send(to, subject, html) {
      if (!opts.apiKey) {
        console.log(`[mail] sem RESEND_API_KEY; não enviado: ${subject}`);
        return false;
      }
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [to], subject, html }),
        });
        if (!res.ok) console.error(`[mail] Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return res.ok;
      } catch (err) {
        console.error('[mail] falha ao enviar', err);
        return false;
      }
    },
  };
}

/** Email simples com um botão (link) no visual do jogo. */
export function mailButton(title: string, text: string, label: string, url: string): string {
  return `<div style="font-family:Arial,sans-serif;background:#1e140e;color:#f1e3c8;padding:24px;max-width:480px">
<h2 style="color:#e8b64c;margin:0 0 12px">${title}</h2>
<p style="line-height:1.5">${text}</p>
<p style="margin:24px 0"><a href="${url}" style="background:#e8b64c;color:#1e140e;padding:10px 18px;text-decoration:none;border-radius:4px;font-weight:bold">${label}</a></p>
<p style="font-size:12px;color:#a8977c">Se não foi você, ignore este email. O link vale por pouco tempo.</p>
</div>`;
}
