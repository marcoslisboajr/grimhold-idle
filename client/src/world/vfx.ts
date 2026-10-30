import meta from '../../public/assets/vfx/vfx.json';
import { image, loaded } from './render.ts';

/**
 * Efeitos visuais das magias (folhas do Elemental VFX, geradas por
 * scripts/vfx_spells.py). Cada magia vira um ou mais efeitos: projétil que voa
 * do personagem até o alvo e/ou animação no alvo ou no próprio personagem.
 */

type Fx = keyof typeof meta;

interface Step {
  fx: Fx;
  /** Onde aparece: no alvo, no personagem, ou voando do personagem até o alvo. */
  at: 'target' | 'self' | 'fly';
  /** Tamanho relativo (1 = o tamanho gerado). */
  scale?: number;
  /** Espera antes de começar (ms). */
  delay?: number;
}

const FLY_MS = 260;

/** O que cada magia mostra. Magias sem entrada usam o impacto genérico. */
const SPELL_FX: Record<string, Step[]> = {
  // Guerreiro
  brutal_strike: [{ fx: 'impact', at: 'target', scale: 0.7 }],
  war_cry: [{ fx: 'aura', at: 'self' }],
  iron_skin: [{ fx: 'shield', at: 'self' }],
  whirlwind: [{ fx: 'swords', at: 'target' }],
  earthquake: [{ fx: 'impact', at: 'target' }],
  seismic_rift: [{ fx: 'impact', at: 'target', scale: 1.3 }, { fx: 'impact', at: 'target', delay: 200 }],
  berserk: [{ fx: 'aura', at: 'self', scale: 1.3 }],
  execution: [{ fx: 'swords', at: 'target', scale: 1.2 }, { fx: 'impact', at: 'target', delay: 250 }],
  // Caçador
  aimed_shot: [{ fx: 'dagger', at: 'fly' }, { fx: 'impact', at: 'target', scale: 0.5, delay: FLY_MS }],
  focus: [{ fx: 'focus', at: 'self' }],
  field_bandage: [{ fx: 'heal', at: 'self', scale: 0.8 }],
  arrow_rain: [
    { fx: 'dagger', at: 'fly' },
    { fx: 'dagger', at: 'fly', delay: 90 },
    { fx: 'dagger', at: 'fly', delay: 180 },
    { fx: 'impact', at: 'target', scale: 0.6, delay: FLY_MS + 180 },
  ],
  explosive_arrows: [{ fx: 'dagger', at: 'fly' }, { fx: 'burst', at: 'target', scale: 0.8, delay: FLY_MS }],
  eagle_eye: [{ fx: 'focus', at: 'self', scale: 1.3 }],
  piercing_shot: [{ fx: 'dagger', at: 'fly', scale: 1.4 }, { fx: 'lightning', at: 'target', scale: 0.7, delay: FLY_MS }],
  // Arcanista
  fireball: [{ fx: 'fireball', at: 'fly' }, { fx: 'burst', at: 'target', scale: 0.8, delay: FLY_MS }],
  lightning: [{ fx: 'lightning', at: 'target' }],
  arcane_shield: [{ fx: 'shield', at: 'self' }],
  ice_storm: [{ fx: 'ice', at: 'target' }],
  meteor: [{ fx: 'fireball', at: 'fly', scale: 1.3 }, { fx: 'burst', at: 'target', delay: FLY_MS }],
  flame_wave: [{ fx: 'burst', at: 'target' }],
  mana_barrier: [{ fx: 'shield', at: 'self', scale: 1.3 }, { fx: 'focus', at: 'self' }],
  arcane_inferno: [{ fx: 'burst', at: 'target', scale: 1.3 }, { fx: 'holy', at: 'target', delay: 120 }],
  // Devoto
  heal: [{ fx: 'heal', at: 'self' }],
  holy_light: [{ fx: 'holy', at: 'target' }],
  blessing: [{ fx: 'shield', at: 'self' }],
  great_heal: [{ fx: 'heal', at: 'self', scale: 1.3 }],
  judgement: [{ fx: 'holy', at: 'target' }, { fx: 'orb', at: 'target', scale: 0.8, delay: 150 }],
  divine_heal: [{ fx: 'heal', at: 'self', scale: 1.15 }, { fx: 'orb', at: 'self', scale: 0.7 }],
  divine_wrath: [{ fx: 'holy', at: 'target', scale: 1.3 }, { fx: 'lightning', at: 'target', delay: 200 }],
  // Runas (cada golpe de área chama de novo, um por monstro)
  spark_rune: [{ fx: 'lightning', at: 'target', scale: 0.5 }],
  boulder_rune: [{ fx: 'impact', at: 'target', scale: 0.7 }],
  heavy_missile_rune: [{ fx: 'orb', at: 'fly', scale: 0.6 }, { fx: 'impact', at: 'target', scale: 0.6, delay: FLY_MS }],
  fireball_rune: [{ fx: 'burst', at: 'target', scale: 0.7 }],
  // Moeda cuspida pelos Baús Mordedores do Mímico Rei.
  coin_spit: [{ fx: 'coin', at: 'fly', scale: 0.7 }, { fx: 'impact', at: 'target', scale: 0.35, delay: FLY_MS }],
  avalanche_rune: [{ fx: 'ice', at: 'target', scale: 0.8 }],
  explosion_rune: [{ fx: 'burst', at: 'target', scale: 0.9 }],
  sudden_death_rune: [{ fx: 'orb', at: 'fly', scale: 0.8 }, { fx: 'holy', at: 'target', scale: 0.8, delay: FLY_MS }],
  storm_rune: [{ fx: 'lightning', at: 'target', scale: 0.9 }],
  doom_rune: [{ fx: 'burst', at: 'target', scale: 1.1 }, { fx: 'lightning', at: 'target', scale: 0.8, delay: 150 }],
  rune_heal: [{ fx: 'heal', at: 'self', scale: 0.9 }],
};

/** Quadros por segundo das animações. */
const FPS = 30;

interface Live {
  fx: Fx;
  t0: number;
  scale: number;
  /** Posição (mundo). Projétil: de `from` até `to`. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  fly: boolean;
}

export class SpellFx {
  private live: Live[] = [];

  /** Dispara os efeitos de uma magia: `self` é o personagem, `target` o alvo (pés, em pixels do mundo). */
  cast(spell: string, self: { x: number; y: number }, target: { x: number; y: number }, now: number) {
    const steps = SPELL_FX[spell] ?? [{ fx: 'impact', at: 'target', scale: 0.6 }];
    for (const s of steps) {
      const at = s.at === 'self' ? self : target;
      this.live.push({
        fx: s.fx,
        t0: now + (s.delay ?? 0),
        scale: s.scale ?? 1,
        from: s.at === 'fly' ? self : at,
        to: at,
        fly: s.at === 'fly',
      });
    }
  }

  /** Projétil simples (ataque normal de quem luta de longe). */
  shoot(fx: Fx, from: { x: number; y: number }, to: { x: number; y: number }, now: number, scale = 1) {
    this.live.push({ fx, t0: now, scale, from, to, fly: true });
  }

  clear() {
    this.live = [];
  }

  draw(ctx: CanvasRenderingContext2D, cam: { x: number; y: number }, now: number) {
    this.live = this.live.filter((l) => now - l.t0 < this.duration(l));
    for (const l of this.live) {
      const k = now - l.t0;
      if (k < 0) continue;
      const m = meta[l.fx];
      const img = image(`/assets/vfx/${l.fx}.png`);
      if (!loaded(img)) continue;
      const frame = Math.min(m.frames - 1, Math.floor((k / 1000) * FPS) % m.frames);
      const w = m.w * l.scale;
      const h = m.h * l.scale;
      ctx.save();
      if (l.fly) {
        const p = Math.min(1, k / FLY_MS);
        const x = l.from.x + (l.to.x - l.from.x) * p - cam.x;
        // O projétil sai da altura do peito e chega no corpo do alvo.
        const y = l.from.y - 40 + (l.to.y - l.from.y) * p - cam.y;
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(l.to.y - l.from.y, l.to.x - l.from.x));
        ctx.drawImage(img, frame * m.w, 0, m.w, m.h, -w / 2, -h / 2, w, h);
      } else {
        // Ancora pela base: o efeito "nasce" no chão onde está o alvo.
        ctx.globalAlpha = Math.min(1, (this.duration(l) - k) / 150);
        ctx.drawImage(img, frame * m.w, 0, m.w, m.h, l.to.x - cam.x - w / 2, l.to.y - cam.y - h + 8, w, h);
      }
      ctx.restore();
    }
  }

  private duration(l: Live) {
    return l.fly ? FLY_MS : (meta[l.fx].frames / FPS) * 1000;
  }
}
