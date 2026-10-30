/**
 * Fonte legível (pedido de jogador): troca a fonte pixelada pela do sistema, mais fácil de ler.
 * Fica guardada só neste aparelho; sem armazenamento, começa sempre na pixelada.
 */
const KEY = 'grimhold.font';

export function readableFont(): boolean {
  try {
    return localStorage.getItem(KEY) === 'clear';
  } catch {
    return false;
  }
}

export function applyFont(clear = readableFont()) {
  document.documentElement.dataset.font = clear ? 'clear' : '';
}

export function setReadableFont(clear: boolean) {
  try {
    if (clear) localStorage.setItem(KEY, 'clear');
    else localStorage.removeItem(KEY);
  } catch {
    /* sem armazenamento: vale só até recarregar */
  }
  applyFont(clear);
}
