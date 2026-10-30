import { useEffect, useRef, useState } from 'react';
import { DEFAULT_LOOKS, type EquipSlot, type Look, type VocationId } from '@grimhold/shared';
import { drawLook, FRAME_H, FRAME_W, lookSheet, type Frame } from './paperdoll.ts';

// Personagem montado no paperdoll (ver paperdoll.ts), de frente.
const IDLE: Frame[] = ['stand'];
const ACTION: Frame[] = ['stand', 'walk1', 'stand', 'walk2'];

interface Props {
  vocation: VocationId;
  /** Aparência; sem ela usa a padrão da vocação. */
  look?: Look;
  /** Equipamento visível nas camadas (calças, armadura, elmo). */
  equipment?: Partial<Record<EquipSlot, string>>;
  /** true = andando no lugar (personagem selecionado). */
  acting?: boolean;
  /** Ampliação inteira, para o pixel continuar nítido. */
  scale?: number;
}

export function Sprite({ vocation, look, equipment, acting = false, scale = 4 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = acting ? ACTION : IDLE;
  const [i, setI] = useState(0);
  const l = look ?? DEFAULT_LOOKS[vocation];

  useEffect(() => {
    setI(0);
    if (frames.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % frames.length), 200);
    return () => clearInterval(id);
  }, [frames]);

  // Redesenha no quadro novo; enquanto as camadas carregam, tenta de novo no próximo frame.
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      const sheet = lookSheet(vocation, l, equipment);
      if (!sheet) {
        raf = requestAnimationFrame(paint);
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawLook(ctx, sheet, 'down', frames[i % frames.length], ctx.canvas.width / 2, ctx.canvas.height, scale);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  }, [vocation, l.gender, l.skin, l.hair, l.hairColor, l.outfit, l.outfitId, l.hideArmor, l.hideCape, l.showHelmet, (l.addons ?? []).join(','), equipment?.helmet, equipment?.armor, equipment?.legs, equipment?.cape, i, frames, scale]);

  return <canvas ref={canvas} className="sprite" width={(FRAME_W + 4) * scale} height={FRAME_H * scale} />;
}
