import {
  HALLOWEEN_OUTFITS,
  HALLOWEEN_OUTFIT_PRICE,
  HALLOWEEN_SHOP_PETS,
  HALLOWEEN_PET_PRICE,
  HALLOWEEN_POTION_PRICE,
  HALLOWEEN_BOSS_TOKEN_PRICE,
  HALLOWEEN_ESSENCE_PRICE,
  OUTFIT_DEFS,
  PETS,
  type ClientMessage,
} from '@grimhold/shared';
import { storyText, t, tr } from './i18n.ts';

/**
 * Loja do Evento de Halloween: Jack, na praça do Bastião.
 * Troca doces por trajes, mascote, poção, tokens e gerencia o Doces ou Travessuras diário.
 */
export function HalloweenShop(props: {
  candies: number;
  unlockedPets: string[];
  unlockedOutfits: string[];
  xpBoostUntil: number;
  potionUsed: boolean;
  trickOrTreatedToday: boolean;
  trickResult?: { kind: string; amount?: number; message: string } | null;
  send: (msg: ClientMessage) => void;
  onClose: () => void;
}) {
  const { candies, trickResult } = props;
  const boostLeft = Math.max(0, props.xpBoostUntil - Date.now());
  const shopPets = PETS.filter((p) => (HALLOWEEN_SHOP_PETS as readonly string[]).includes(p.id));

  return (
    <div className="overlay">
      <section
        className="panel picker kids-shop-modal halloween-shop-modal"
        role="dialog"
        aria-label={tr('Loja de Halloween', 'Halloween Shop')}
        style={{ borderColor: '#d97706', boxShadow: '0 0 20px rgba(217, 119, 6, 0.25)' }}
      >
        <header className="picker-head" style={{ borderBottomColor: '#78350f' }}>
          <h3><img className="icon small" src="/assets/icons/knight_lantern.png" alt="" style={{ imageRendering: 'pixelated', verticalAlign: 'middle' }} /> {tr('Jack · Evento de Halloween', 'Jack · Halloween Event')}</h3>
          <span className="gold">
            <img className="icon tiny" src="/assets/icons/halloween_candy.png" alt="" /> {candies}
          </span>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>

        <p className="small" style={{ color: '#fed7aa' }}>
          {tr(
            '"Doces para os bravos! Ganhe doces a cada 3 minutos em qualquer atividade até 08/11. Troque por trajes, poção, o mascote e participe do Doces ou Travessuras todo dia!"',
            '"Candies for the brave! Earn candies every 3 minutes of any activity until Nov 08. Trade them for outfits, potion, the pet and play Trick or Treat every day!"',
          )}
        </p>

        {/* 1. Doces ou Travessuras diário */}
        <div className="kids-potion" style={{ background: '#27193d', border: '1px solid #7c3aed' }}>
          <div>
            <b><img className="icon small" src="/assets/icons/halloween_candy.png" alt="" style={{ imageRendering: 'pixelated', verticalAlign: 'middle' }} /> {tr('Doces ou Travessuras!', 'Trick or Treat!')}</b>
            <span className="small muted" style={{ display: 'block' }}>
              {tr(
                'Uma vez por dia (horário de Brasília), sorteie doces, ouro, um Boss Token ou um susto divertido!',
                'Once a day (BRT time), roll for candies, gold, a Boss Token, or a harmless spooky trick!',
              )}
            </span>
            {trickResult && (
              <div
                style={{
                  marginTop: 6,
                  padding: '6px 10px',
                  borderRadius: 4,
                  background: trickResult.kind === 'trick' ? '#3b0764' : '#14532d',
                  color: trickResult.kind === 'trick' ? '#e9d5ff' : '#bbf7d0',
                  fontSize: '0.85rem',
                }}
              >
                {trickResult.message}
              </div>
            )}
          </div>
          {props.trickOrTreatedToday ? (
            <span className="small muted">{tr('Já participou hoje! Volte amanhã.', 'Already played today! Come back tomorrow.')}</span>
          ) : (
            <button
              type="button"
              className="primary small-btn"
              style={{ background: '#ea580c', borderColor: '#c2410c' }}
              onClick={() => props.send({ type: 'halloween_trick_or_treat' })}
            >
              {tr('Tentar a sorte!', 'Try your luck!')}
            </button>
          )}
        </div>

        {/* 2. Poção de XP */}
        <div className="kids-potion" style={{ background: '#1c1917', border: '1px solid #44403c' }}>
          <span>
            <b><img className="icon small" src="/assets/icons/halloween_potion.png" alt="" style={{ imageRendering: 'pixelated', verticalAlign: 'middle' }} /> {tr('Poção das Bruxas', 'Witches Potion')}</b> ·{' '}
            {tr('XP em dobro por 1 hora, uma por dia', 'double XP for 1 hour, one per day')}
          </span>
          {boostLeft > 0 ? (
            <span className="loot-pos">
              {tr('Ativa', 'Active')}: {Math.ceil(boostLeft / 60_000)} min
            </span>
          ) : props.potionUsed ? (
            <span className="small muted">{tr('Já usada hoje. Volte amanhã.', 'Already used today. Come back tomorrow.')}</span>
          ) : (
            <button
              type="button"
              className="primary small-btn"
              disabled={candies < HALLOWEEN_POTION_PRICE}
              onClick={() => props.send({ type: 'buy_halloween_potion' })}
            >
              {tr('Usar agora', 'Use now')} ({HALLOWEEN_POTION_PRICE})
            </button>
          )}
        </div>

        {/* 3. Trajes de Halloween */}
        <h4 style={{ color: '#f97316' }}>
          {tr('Trajes de Halloween', 'Halloween Outfits')} · {HALLOWEEN_OUTFIT_PRICE} {tr('doces cada', 'candies each')}
        </h4>
        <div className="kids-pets">
          {HALLOWEEN_OUTFITS.map((id) => {
            const def = OUTFIT_DEFS.find((o) => o.id === id);
            if (!def) return null;
            const owned = props.unlockedOutfits.includes(id);
            const layers = [
              '/assets/paperdoll/base_m_2.png',
              `/assets/paperdoll/outfit_${id}_m.png`,
              `/assets/paperdoll/top_${id}_m.png`,
            ];
            return (
              <div key={id} className={`kids-pet ${owned ? 'owned' : ''}`} title={storyText(def.description)}>
                <div className="kids-outfit-thumb">
                  {layers.map((src) => (
                    <div key={src} style={{ backgroundImage: `url(${src})` }} />
                  ))}
                </div>
                <span className="small">{storyText(def.name)}</span>
                {owned ? (
                  <span className="small loot-pos">{tr('Já é seu', 'Owned')}</span>
                ) : (
                  <button
                    type="button"
                    className="primary small-btn"
                    disabled={candies < HALLOWEEN_OUTFIT_PRICE}
                    onClick={() => props.send({ type: 'buy_halloween_outfit', outfit: id })}
                  >
                    {tr('Comprar', 'Buy')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Mascote */}
        <h4 style={{ color: '#f97316' }}>
          {tr('Mascotes Exclusivos', 'Exclusive Pets')} · {HALLOWEEN_PET_PRICE} {tr('doces', 'candies')}
        </h4>
        <div className="kids-pets">
          {shopPets.map((pet) => {
            const petOwned = props.unlockedPets.includes(pet.id);
            return (
            <div key={pet.id} className={`kids-pet ${petOwned ? 'owned' : ''}`} title={pet.description}>
              <div
                className="pet-sprite-thumb"
                style={{
                  backgroundImage: `url(/assets/pets/${pet.sprite}.png)`,
                  backgroundPosition: '0 0',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '300% 400%',
                }}
              />
              <span className="small">{t('pet.' + pet.id + '.name', pet.name)}</span>
              {petOwned ? (
                <span className="small loot-pos">{tr('Já é seu', 'Owned')}</span>
              ) : (
                <button
                  type="button"
                  className="primary small-btn"
                  disabled={candies < HALLOWEEN_PET_PRICE}
                  onClick={() => props.send({ type: 'buy_halloween_pet', pet: pet.id })}
                >
                  {tr('Comprar', 'Buy')}
                </button>
              )}
            </div>
            );
          })}
        </div>

        {/* 5. Tesouros Especiais */}
        <h4 style={{ color: '#f97316' }}>{tr('Tesouros de Chefe', 'Boss Treasures')}</h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              flex: '1 1 180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#18181b',
              borderRadius: 6,
              border: '1px solid #3f3f46',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img className="icon small" src="/assets/icons/boss_token.png" alt="" />
              <div>
                <b style={{ fontSize: '0.9rem' }}>Boss Token</b>
                <span className="small muted" style={{ display: 'block' }}>
                  {HALLOWEEN_BOSS_TOKEN_PRICE} {tr('doces', 'candies')}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="primary small-btn"
              disabled={candies < HALLOWEEN_BOSS_TOKEN_PRICE}
              onClick={() => props.send({ type: 'buy_halloween_item', item: 'boss_token' })}
            >
              {tr('Trocar', 'Trade')}
            </button>
          </div>

          <div
            style={{
              flex: '1 1 180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#18181b',
              borderRadius: 6,
              border: '1px solid #3f3f46',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img className="icon small" src="/assets/icons/dark_essence.png" alt="" />
              <div>
                <b style={{ fontSize: '0.9rem' }}>{tr('Essência de Chefe', 'Boss Essence')}</b>
                <span className="small muted" style={{ display: 'block' }}>
                  {HALLOWEEN_ESSENCE_PRICE} {tr('doces', 'candies')}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="primary small-btn"
              disabled={candies < HALLOWEEN_ESSENCE_PRICE}
              onClick={() => props.send({ type: 'buy_halloween_item', item: 'boss_essence' })}
            >
              {tr('Trocar', 'Trade')}
            </button>
          </div>
        </div>

        <p className="small muted" style={{ marginTop: 12 }}>
          {tr(
            'Trajes e mascotes são cosméticos (sem bônus de combate). Os trajes ficam na janela Aparência e os mascotes na aba Mascotes.',
            'Outfits and pets are cosmetic (no combat bonus). Outfits are in Appearance and pets in the Pets tab.',
          )}
        </p>
      </section>
    </div>
  );
}
