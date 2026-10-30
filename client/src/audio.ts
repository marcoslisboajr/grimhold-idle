/**
 * Som do jogo: música de fundo (uma faixa por lugar) e efeitos curtos.
 * Volumes e mudo ficam salvos no navegador. O navegador só deixa tocar depois
 * do primeiro clique, então tudo começa calado até lá.
 *
 * Música: Eric Matyas (soundimage.org); coleta: "Medieval: Harvest Season", Random Mind (CC0).
 * Efeitos: Kenney (CC0) e Mixkit.
 */

export type Track = 'city' | 'work' | 'gather' | 'hunt' | 'dungeon' | 'endgame' | 'boss' | 'malgoroth';
export type Sfx =
  | 'hit'
  | 'crit'
  | 'hurt'
  | 'spell'
  | 'kill'
  | 'coins'
  | 'trade'
  | 'rare'
  | 'quest'
  | 'death'
  | 'boss'
  | 'levelup'
  | 'click'
  | 'error'
  | 'drink'
  | 'heal'
  | `work_${string}`;

export interface AudioSettings {
  muted: boolean;
  music: number; // 0..1
  sfx: number; // 0..1
  /** Alerta sonoro quando nasce um chefe global (toca mesmo com o som do jogo desligado). */
  bossAlert: boolean;
}

const KEY = 'grimhold.audio';
const DEFAULTS: AudioSettings = { muted: false, music: 0.35, sfx: 0.6, bossAlert: true };

function load(): AudioSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

let settings = load();
const listeners = new Set<(s: AudioSettings) => void>();

export const audioSettings = () => settings;

export function setAudioSettings(next: Partial<AudioSettings>) {
  settings = { ...settings, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Sem armazenamento: vale só nesta aba.
  }
  applyMusicVolume();
  for (const l of listeners) l(settings);
}

export function onAudioSettings(fn: (s: AudioSettings) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Desbloqueio (o navegador exige um gesto do jogador) ─────────────────────

let unlocked = false;
let ctx: AudioContext | null = null;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  ctx = new AudioContext();
  if (wanted) playMusic(wanted);
}
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, unlock, { once: true, capture: true });
  // Clique em qualquer botão: um "tic" baixinho.
  window.addEventListener(
    'click',
    (e) => {
      if ((e.target as HTMLElement | null)?.closest?.('button, [role="tab"], select')) sfx('click');
    },
    { capture: true },
  );
}

// ── Efeitos ─────────────────────────────────────────────────────────────────

/** Variações de cada efeito (sorteia uma), o volume relativo e o intervalo mínimo. */
const SFX: Record<string, { files: string[]; vol: number; gapMs: number }> = {
  hit: { files: ['hit1', 'hit2', 'hit3'], vol: 0.35, gapMs: 90 },
  crit: { files: ['crit'], vol: 0.55, gapMs: 120 },
  hurt: { files: ['hurt1', 'hurt2'], vol: 0.35, gapMs: 120 },
  spell: { files: ['spell'], vol: 0.4, gapMs: 200 },
  kill: { files: ['kill'], vol: 0.5, gapMs: 200 },
  coins: { files: ['coins'], vol: 0.45, gapMs: 300 },
  trade: { files: ['trade'], vol: 0.5, gapMs: 200 },
  rare: { files: ['rare'], vol: 0.7, gapMs: 500 },
  quest: { files: ['quest'], vol: 0.7, gapMs: 500 },
  death: { files: ['death'], vol: 0.6, gapMs: 1000 },
  boss: { files: ['boss'], vol: 0.8, gapMs: 2000 },
  levelup: { files: ['levelup.wav'], vol: 0.6, gapMs: 1000 },
  click: { files: ['click'], vol: 0.25, gapMs: 60 },
  error: { files: ['error'], vol: 0.45, gapMs: 400 },
  drink: { files: ['quest'], vol: 0.3, gapMs: 1000 },
  heal: { files: ['spell'], vol: 0.4, gapMs: 1000 },
};
const WORK_SFX = new Set(['mining', 'woodcutting', 'fishing', 'smithing', 'cooking']);

const buffers = new Map<string, Promise<AudioBuffer | null>>();
function buffer(file: string) {
  let b = buffers.get(file);
  if (!b) {
    const url = `/assets/sfx/${file.includes('.') ? file : `${file}.ogg`}`;
    b = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx!.decodeAudioData(data))
      .catch(() => null);
    buffers.set(file, b);
  }
  return b;
}

const lastPlayed = new Map<string, number>();

/** Toca um efeito (ignora se mudo, sem desbloqueio ou repetido rápido demais). */
export function sfx(name: Sfx) {
  if (!ctx || settings.muted || settings.sfx <= 0) return;
  const def = name.startsWith('work_')
    ? { files: [WORK_SFX.has(name.slice(5)) ? name : 'work_default'], vol: 0.35, gapMs: 150 }
    : SFX[name];
  if (!def) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < def.gapMs) return;
  lastPlayed.set(name, now);
  const file = def.files[Math.floor(Math.random() * def.files.length)];
  const c = ctx;
  void buffer(file).then((buf) => {
    if (!buf || settings.muted) return;
    const src = c.createBufferSource();
    const gain = c.createGain();
    gain.gain.value = def.vol * settings.sfx;
    src.buffer = buf;
    src.connect(gain).connect(c.destination);
    src.start();
  });
}

/**
 * Alerta de chefe: toca o som do chefe e, logo depois, o de item raro, num volume próprio e baixo (0,3)
 * (vale mesmo com o jogo mudo ou os efeitos no zero; só a opção "Alerta de chefe" desliga).
 * Com a aba em segundo plano, o título pisca até o jogador voltar.
 */
export function bossAlert(title: string) {
  if (!settings.bossAlert) return;
  if (ctx) {
    const c = ctx;
    void c.resume?.();
    ['boss', 'rare'].forEach((file, i) => {
      void buffer(file).then((buf) => {
        if (!buf) return;
        const src = c.createBufferSource();
        const gain = c.createGain();
        gain.gain.value = 0.3;
        src.buffer = buf;
        src.connect(gain).connect(c.destination);
        src.start(c.currentTime + i * 0.9);
      });
    });
  }
  if (typeof document !== 'undefined' && document.hidden) {
    const original = document.title;
    let on = false;
    const blink = setInterval(() => {
      on = !on;
      document.title = on ? `⚔ ${title}` : original;
    }, 1000);
    const stop = () => {
      clearInterval(blink);
      document.title = original;
      document.removeEventListener('visibilitychange', stop);
    };
    document.addEventListener('visibilitychange', stop);
  }
}

// ── Música ──────────────────────────────────────────────────────────────────

let wanted: Track | null = null;
let current: { track: Track; el: HTMLAudioElement } | null = null;

function applyMusicVolume() {
  if (!current) return;
  current.el.volume = settings.muted ? 0 : settings.music;
  if (settings.muted || settings.music <= 0) current.el.pause();
  else if (current.el.paused && unlocked) void current.el.play().catch(() => {});
}

/** Troca a música de fundo (com um fade curto); a mesma faixa continua de onde está. */
export function playMusic(track: Track) {
  wanted = track;
  if (!unlocked || current?.track === track) return;
  const old = current;
  const oldVol = old?.el.volume ?? 0;
  const el = new Audio(`/assets/music/${track}.mp3`);
  el.loop = true;
  el.volume = 0;
  current = { track, el };
  if (!settings.muted && settings.music > 0) void el.play().catch(() => {});
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / 1200);
    if (current?.el === el) el.volume = settings.muted ? 0 : settings.music * k;
    if (old) old.el.volume = oldVol * (1 - k);
    if (k < 1) requestAnimationFrame(step);
    else old?.el.pause();
  };
  requestAnimationFrame(step);
}
