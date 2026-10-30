/**
 * Avisos da cena para a barra de ação: cada vez que uma magia, runa ou poção aparece
 * na luta, a barra marca o instante para desenhar a recarga.
 */
export const casts = new EventTarget();

export function emitCast(id: string) {
  casts.dispatchEvent(new CustomEvent('cast', { detail: id }));
}

/** Começou uma luta nova: no servidor toda recarga volta a zero, então a barra zera também. */
export function emitCastReset() {
  casts.dispatchEvent(new Event('reset'));
}
