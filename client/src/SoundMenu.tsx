import { useEffect, useRef, useState } from 'react';
import { Pix } from './Pix.tsx';
import { audioSettings, onAudioSettings, setAudioSettings, sfx } from './audio.ts';
import { getLang, onLangChange, setLang, t, tr } from './i18n.ts';
import { readableFont, setReadableFont } from './fontPref.ts';

/** Configurações no topo: feedback, som (volumes e alerta de chefe), idioma e fonte legível. */
export function SoundMenu(props: { onFeedback: () => void }) {
  const [s, setS] = useState(audioSettings);
  const [open, setOpen] = useState(false);
  const [lang, setLangState] = useState(getLang());
  const [clear, setClear] = useState(readableFont());
  useEffect(() => onLangChange(setLangState), []);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = onAudioSettings(setS);
    return () => {
      off();
    };
  }, []);
  // Fecha ao clicar fora (na captura: o mapa e outros painéis param o toque antes de chegar na janela, e no celular ele não fechava).
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [open]);

  const silent = s.muted || (s.music <= 0 && s.sfx <= 0);
  return (
    <div className="sound-menu" ref={ref}>
      <button
        className="primary small-btn sound-btn"
        title={tr('Configurações', 'Settings')}
        aria-label={tr('Configurações', 'Settings')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙ {tr('Config', 'Settings')} <Pix name={silent ? 'ui_sound_off' : 'ui_sound_on'} title={silent ? tr('Som desligado', 'Sound off') : tr('Som ligado', 'Sound on')} />
      </button>
      {open && (
        <div className="sound-pop panel" role="dialog" aria-label={tr('Configurações', 'Settings')}>
          <button type="button" className="close sound-close" onClick={() => setOpen(false)} aria-label={t('common.close')}>
            ×
          </button>
          <div className="config-row">
            <span>{tr('Idioma', 'Language')}</span>
            <button type="button" className={`small-btn ${lang === 'pt' ? 'on' : ''}`} onClick={() => setLang('pt')}>
              Português
            </button>
            <button type="button" className={`small-btn ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>
              English
            </button>
          </div>
          <div className="config-row">
            <span>{tr('Fonte', 'Font')}</span>
            <button type="button" className={`small-btn ${!clear ? 'on' : ''}`} onClick={() => { setReadableFont(false); setClear(false); }}>
              {tr('Pixelada', 'Pixel')}
            </button>
            <button type="button" className={`small-btn config-clear-font ${clear ? 'on' : ''}`} onClick={() => { setReadableFont(true); setClear(true); }}>
              {tr('Fácil de ler', 'Easy to read')}
            </button>
          </div>
          <h4 className="config-title">{t('sound.title')}</h4>
          <label className="sound-row">
            <input type="checkbox" checked={!s.muted} onChange={(e) => setAudioSettings({ muted: !e.target.checked })} />
            {t('sound.enabled')}
          </label>
          <label className="sound-row">
            <span>{t('sound.music')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(s.music * 100)}
              disabled={s.muted}
              onChange={(e) => setAudioSettings({ music: Number(e.target.value) / 100 })}
              aria-label={t('sound.music')}
            />
            <span className="small">{Math.round(s.music * 100)}%</span>
          </label>
          <label className="sound-row">
            <span>{t('sound.sfx')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(s.sfx * 100)}
              disabled={s.muted}
              onChange={(e) => setAudioSettings({ sfx: Number(e.target.value) / 100 })}
              onPointerUp={() => sfx('coins')}
              aria-label="Volume dos efeitos"
            />
            <span className="small">{Math.round(s.sfx * 100)}%</span>
          </label>
          <label className="sound-row" title={tr('Toca um aviso quando nasce um chefe global, mesmo com o som do jogo desligado.', 'Plays an alert when a world boss spawns, even with game sound off.')}>
            <input type="checkbox" checked={s.bossAlert} onChange={(e) => setAudioSettings({ bossAlert: e.target.checked })} />
            {tr('Alerta de chefe', 'Boss alert')}
          </label>
          <button
            type="button"
            className="primary small-btn config-feedback"
            onClick={() => {
              setOpen(false);
              props.onFeedback();
            }}
          >
            {tr('Feedback (bugs e sugestões)', 'Feedback (bugs and suggestions)')}
          </button>
        </div>
      )}
    </div>
  );
}
