import { useState } from 'react';
import { ADDON_NAMES, LOOK_ADDONS, STORIES, DEFAULT_LOOKS, LOOK_HAIR, LOOK_HAIR_COLORS, LOOK_OUTFITS, OUTFIT_DEFS, type EquipSlot, type Look, type LookAddon, type OutfitId, type VocationId } from '@grimhold/shared';
import { tr, storyText } from './i18n.ts';
import { Sprite } from './Sprite.tsx';

/** De que quest vem cada addon (para mostrar como conseguir os que faltam). */
const ADDON_QUEST: Partial<Record<LookAddon, { name: string; level: number }>> = {};
for (const st of STORIES) for (const end of Object.values(st.endings)) if (end.reward.addon && !ADDON_QUEST[end.reward.addon]) ADDON_QUEST[end.reward.addon] = { name: st.name, level: st.level };

const SKIN_TONES = ['#f2c9a8', '#f7d7c4', '#c98f62', '#7a4b2e', '#fbe3cf', '#d9a878', '#a8704a', '#4a2c1c', '#8fb4e8', '#c8483e'];
const HAIR_TONES: Record<Look['hairColor'], string> = {
  brown: '#8a5a32',
  blonde: '#e8c45a',
  black: '#2a2630',
  white: '#e8e4dc',
  red: '#c0402c',
  blue: '#3a6ad0',
  green: '#3e9a48',
  pink: '#e070b0',
  gray: '#8e8e8e',
  purple: '#7a4ab8',
  orange: '#e0782a',
  teal: '#2e9a92',
  burgundy: '#7a1e30',
};
const HAIR_NAMES = (): Record<Look['hairColor'], string> => ({
  brown: tr('Castanho', 'Brown'),
  blonde: tr('Loiro', 'Blonde'),
  black: tr('Preto', 'Black'),
  white: tr('Branco', 'White'),
  red: tr('Ruivo', 'Red'),
  blue: tr('Azul', 'Blue'),
  green: tr('Verde', 'Green'),
  pink: tr('Rosa', 'Pink'),
  gray: tr('Grisalho', 'Gray'),
  purple: tr('Roxo', 'Purple'),
  orange: tr('Laranja', 'Orange'),
  teal: tr('Turquesa', 'Teal'),
  burgundy: tr('Vinho', 'Burgundy'),
});

/** Escolha de gênero, pele, cabelo, cor do cabelo, cor da roupa e modelo de outfit, com o personagem ao vivo. */
export function LookEditor(props: {
  vocation: VocationId;
  look: Look;
  equipment?: Partial<Record<EquipSlot, string | null>>;
  unlockedAddons?: LookAddon[];
  unlockedOutfits?: OutfitId[];
  onChange: (look: Look) => void;
}) {
  const { look, vocation, unlockedAddons, unlockedOutfits, equipment } = props;
  const set = (patch: Partial<Look>) => props.onChange({ ...look, ...patch });
  // Addons fechados por padrão (a lista ocupava metade da janela).
  const [showAddons, setShowAddons] = useState(false);
  const styles = LOOK_HAIR[look.gender] as readonly number[];
  const styleIdx = Math.max(0, styles.indexOf(look.hair));

  const availableOutfits = unlockedOutfits && unlockedOutfits.length > 0
    ? OUTFIT_DEFS.filter((o) => unlockedOutfits.includes(o.id))
    : OUTFIT_DEFS.filter((o) => !o.quest);

  const currentOutfitId = look.outfitId ?? vocation;
  const currentOutfitIdx = Math.max(0, availableOutfits.findIndex((o) => o.id === currentOutfitId));
  const currentOutfit = availableOutfits[currentOutfitIdx] ?? availableOutfits[0];

  return (
    <div className="look-editor">
      <Sprite vocation={vocation} look={look} equipment={equipment} acting scale={4} />
      <div className="look-rows">
        <div className="look-row">
          <span>{tr('Traje', 'Outfit')}</span>
          <button
            type="button"
            className="chip"
            onClick={() => {
              const prev = availableOutfits[(currentOutfitIdx + availableOutfits.length - 1) % availableOutfits.length];
              set({ outfitId: prev.id });
            }}
          >
            ◀
          </button>
          <span className="small font-bold" title={currentOutfit?.description} style={{ minWidth: 80, textAlign: 'center' }}>
            {currentOutfit?.name ?? currentOutfitId}
          </span>
          <button
            type="button"
            className="chip"
            onClick={() => {
              const next = availableOutfits[(currentOutfitIdx + 1) % availableOutfits.length];
              set({ outfitId: next.id });
            }}
          >
            ▶
          </button>
          <span className="small muted">
            {currentOutfitIdx + 1}/{availableOutfits.length}
          </span>
        </div>
        <div className="look-row">
          <span>{tr('Gênero', 'Gender')}</span>
          {(['m', 'f'] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={`chip ${look.gender === g ? 'on' : ''}`}
              onClick={() =>
                g !== look.gender &&
                set({ gender: g, hair: DEFAULT_LOOKS[vocation].gender === g ? DEFAULT_LOOKS[vocation].hair : LOOK_HAIR[g][0] })
              }
            >
              {g === 'm' ? tr('Masculino', 'Male') : tr('Feminino', 'Female')}
            </button>
          ))}
        </div>
        <div className="look-row">
          <span>{tr('Pele', 'Skin')}</span>
          {SKIN_TONES.map((c, i) => (
            <button
              key={c}
              type="button"
              title={`Tom ${i + 1}`}
              className={`swatch ${look.skin === i + 1 ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => set({ skin: i + 1 })}
            />
          ))}
        </div>
        <div className="look-row">
          <span>{tr('Cabelo', 'Hair')}</span>
          <button type="button" className="chip" onClick={() => set({ hair: styles[(styleIdx + styles.length - 1) % styles.length] })}>
            ◀
          </button>
          <span className="small">
            {styleIdx + 1}/{styles.length}
          </span>
          <button type="button" className="chip" onClick={() => set({ hair: styles[(styleIdx + 1) % styles.length] })}>
            ▶
          </button>
        </div>
        <div className="look-row">
          <span>{tr('Cor do cabelo', 'Hair color')}</span>
          {LOOK_HAIR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={HAIR_NAMES()[c]}
              className={`swatch ${look.hairColor === c ? 'on' : ''}`}
              style={{ background: HAIR_TONES[c] }}
              onClick={() => set({ hairColor: c })}
            />
          ))}
        </div>
        <div className="look-row">
          <span>{tr('Cor da roupa', 'Clothes color')}</span>
          {LOOK_OUTFITS.map((h) => (
            <button
              key={String(h)}
              type="button"
              title={h === null ? tr('Original', 'Original') : undefined}
              className={`swatch ${look.outfit === h ? 'on' : ''} ${h === null ? 'original' : ''}`}
              style={h === null ? undefined : { background: `hsl(${h} 55% 45%)` }}
              onClick={() => set({ outfit: h })}
            >
              {h === null ? '★' : ''}
            </button>
          ))}
        </div>
        <label className="look-row">
          <input type="checkbox" checked={!!look.hideArmor} onChange={(e) => set({ hideArmor: e.target.checked })} />
          <span>{tr('Ocultar armadura e calças (exibe o traje puro)', 'Hide armor and legs (show the plain outfit)')}</span>
        </label>
        <label className="look-row">
          <input type="checkbox" checked={!!look.hideCape} onChange={(e) => set({ hideCape: e.target.checked })} />
          <span>{tr('Esconder a capa (os atributos continuam valendo)', 'Hide cape (its stats still apply)')}</span>
        </label>
        <label className="look-row">
          <input type="checkbox" checked={!!look.showHelmet} onChange={(e) => set({ showHelmet: e.target.checked })} />
          <span>{tr('Mostrar o elmo (cobre o cabelo)', 'Show helmet (covers hair)')}</span>
        </label>
        {/* Todos os addons: os que faltam aparecem apagados, com a quest que dá cada um. */}
        <div className="look-row">
          <button type="button" className="link-btn addons-toggle" aria-expanded={showAddons} onClick={() => setShowAddons(!showAddons)}>
            Addons ({(unlockedAddons ?? []).length}/{LOOK_ADDONS.length}) {showAddons ? '▴' : '▾'}
          </button>
          {showAddons && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LOOK_ADDONS.map((ad) => {
              const owned = (unlockedAddons ?? []).includes(ad);
              const active = owned && (look.addons ?? []).includes(ad);
              const q = ADDON_QUEST[ad];
              const how = q ? tr(`Quest: ${storyText(q.name)} (nível ${q.level})`, `Quest: ${storyText(q.name)} (level ${q.level})`) : ad === 'wizard_hat' ? tr('Zharvos, o Arquimago: sempre cai para alguém na invasão, ou raramente da Casca Mortal (instância 150)', 'Zharvos, the Archmage: always drops for someone in the invasion, or rarely from the Mortal Shell (instance 150)') : tr('Recompensa especial', 'Special reward');
              return (
                <button
                  key={ad}
                  type="button"
                  className={`chip ${active ? 'on' : ''} ${owned ? '' : 'locked'}`}
                  disabled={!owned}
                  title={owned ? storyText(ADDON_NAMES[ad] ?? ad) : how}
                  onClick={() => {
                    const next = active ? (look.addons ?? []).filter((x) => x !== ad) : [...(look.addons ?? []), ad];
                    set({ addons: next });
                  }}
                >
                  {active ? '✓ ' : owned ? '' : '🔒 '}
                  {storyText(ADDON_NAMES[ad] ?? ad)}
                  {!owned && <span className="small addon-how"> · {how}</span>}
                </button>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
