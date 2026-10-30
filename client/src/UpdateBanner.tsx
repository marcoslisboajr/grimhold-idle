import { useEffect, useState } from 'react';
import { tr } from './i18n.ts';

declare const __BUILD_ID__: string;

const CHECK_MS = 60_000;
const RELOAD_IN = 15;
/** No máximo 1 recarga automática nesta janela (24/10: página antiga em cache recarregava sem parar). */
const AUTO_RELOAD_WINDOW_MS = 10 * 60_000;
const AUTO_KEY = 'grimhold.autoReloadAt';

/** Já recarregou sozinho há pouco? Então não recarrega de novo: só mostra o botão. */
function recentlyAutoReloaded(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(AUTO_KEY) ?? 0) < AUTO_RELOAD_WINDOW_MS;
  } catch {
    return false;
  }
}

/** Recarrega por um endereço novo: o navegador busca a página nova em vez de restaurar a antiga do cache. */
function reloadFresh(auto: boolean) {
  if (auto) {
    try {
      sessionStorage.setItem(AUTO_KEY, String(Date.now()));
    } catch {
      /* sem armazenamento: recarrega mesmo assim */
    }
  }
  const url = new URL(location.href);
  url.searchParams.set('v', String(Date.now()));
  location.replace(url.toString());
}

/**
 * Avisa quando saiu versão nova do jogo e recarrega sozinho.
 * Compara o id desta compilação com /version.json (gerado no build). O progresso fica no
 * servidor, então recarregar não perde nada. Em dev não existe version.json: não faz nada.
 */
export function UpdateBanner() {
  const [left, setLeft] = useState<number | null>(null);
  // Recarregou sozinho há pouco e a versão continua velha: só o botão, sem contagem (nunca entra em loop).
  const [manual, setManual] = useState(false);
  const notify = () => {
    if (recentlyAutoReloaded()) setManual(true);
    else setLeft((l) => l ?? RELOAD_IN);
  };

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let stop = false;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const { build } = (await r.json()) as { build?: string };
        if (!stop && build && build !== __BUILD_ID__) notify();
      } catch {
        // Servidor reiniciando: tenta de novo no próximo ciclo.
      }
    };
    check();
    const id = setInterval(check, CHECK_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    // Depois de um deploy o servidor reinicia e a conexão volta: confere logo, sem esperar o minuto
    // (aba em segundo plano às vezes nem roda o intervalo).
    const onReconnect = () => {
      check();
      setTimeout(check, 5000);
    };
    window.addEventListener('grimhold:reconnected', onReconnect);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    // Arquivo da versão antiga já não existe no servidor: recarrega para pegar a nova.
    const onPreloadError = () => notify();
    window.addEventListener('vite:preloadError', onPreloadError);
    return () => {
      window.removeEventListener('grimhold:reconnected', onReconnect);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      window.removeEventListener('vite:preloadError', onPreloadError);
      stop = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      reloadFresh(true);
      return;
    }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  if (left === null && !manual) return null;
  return (
    <div className="update-banner" role="status">
      {manual
        ? tr('Nova versão do Grimhold! Se não atualizar, aperte Ctrl+Shift+R (ou feche e abra a aba).', 'New Grimhold version! If it does not update, press Ctrl+Shift+R (or close and reopen the tab).')
        : tr(`Nova versão do Grimhold! Atualizando em ${left}s…`, `New Grimhold version! Updating in ${left}s…`)}
      <button className="primary small-btn" onClick={() => reloadFresh(false)}>
        {tr('Atualizar agora', 'Update now')}
      </button>
    </div>
  );
}
