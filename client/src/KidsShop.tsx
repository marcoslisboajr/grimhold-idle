import { KIDS_OUTFITS, KIDS_OUTFIT_PRICE, KIDS_PET_PRICE, KIDS_POTION_PRICE, OUTFIT_DEFS, PETS, type ClientMessage } from '@grimhold/shared';
import { storyText, t, tr } from './i18n.ts';

/** Loja do evento do Dia das Crianças: a Tia Jujuba, na frente da fonte da praça. Troca doces por mascotes e pela Poção Doce de XP. */
export function KidsShop(props: {
  candies: number;
  unlockedPets: string[];
  unlockedOutfits: string[];
  xpBoostUntil: number;
  potionUsed: boolean;
  send: (msg: ClientMessage) => void;
  onClose: () => void;
}) {
  const { candies } = props;
  const boostLeft = Math.max(0, props.xpBoostUntil - Date.now());
  const pets = PETS.filter((p) => p.kids);
  return (
    <div className="overlay">
      <section className="panel picker kids-shop-modal" role="dialog" aria-label={tr('Loja do Dia das Crianças', "Children's Day Shop")}>
        <header className="picker-head">
          <h3>{tr('Tia Jujuba · Dia das Crianças', "Aunt Jujuba · Children's Day")}</h3>
          <span className="gold">
            <img className="icon tiny" src="/assets/icons/kids_candy.png" alt="" /> {candies}
          </span>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <p className="small">
          {tr(
            '"Doce para quem trabalha! Cada 3 minutos de qualquer atividade, um doce. Troque aqui comigo até o fim de 14/10."',
            '"Candy for hard workers! Every 3 minutes of any activity, one candy. Trade them with me until the end of Oct 14."',
          )}
        </p>

        <div className="kids-potion">
          <span>
            <b>{tr('Poção Doce de XP', 'Sweet XP Potion')}</b> · {tr('XP em dobro por 1 hora, uma por conta', 'double XP for 1 hour, one per account')}
          </span>
          {boostLeft > 0 ? (
            <span className="loot-pos">
              {tr('Ativa', 'Active')}: {Math.ceil(boostLeft / 60_000)} min
            </span>
          ) : props.potionUsed ? (
            <span className="small muted">{tr('Já usada nesta conta.', 'Already used on this account.')}</span>
          ) : (
            <button type="button" className="primary small-btn" disabled={candies < KIDS_POTION_PRICE} onClick={() => props.send({ type: 'buy_kids_potion' })}>
              {tr('Usar agora', 'Use now')} ({KIDS_POTION_PRICE})
            </button>
          )}
        </div>

        <h4>{tr('Trajes', 'Outfits')} · {KIDS_OUTFIT_PRICE} {tr('doces cada', 'candies each')}</h4>
        <div className="kids-pets">
          {KIDS_OUTFITS.map((id) => {
            const def = OUTFIT_DEFS.find((o) => o.id === id)!;
            const owned = props.unlockedOutfits.includes(id);
            // Miniatura: corpo + roupa + o que vai por cima (quadro de frente, parado).
            const layers = ['/assets/paperdoll/base_m_2.png', `/assets/paperdoll/outfit_${id}_m.png`, `/assets/paperdoll/top_${id}_m.png`];
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
                  <button type="button" className="primary small-btn" disabled={candies < KIDS_OUTFIT_PRICE} onClick={() => props.send({ type: 'buy_kids_outfit', outfit: id })}>
                    {tr('Comprar', 'Buy')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <h4>{tr('Mascotes', 'Pets')} · {KIDS_PET_PRICE} {tr('doces cada', 'candies each')}</h4>
        <div className="kids-pets">
          {pets.map((p) => {
            const owned = props.unlockedPets.includes(p.id);
            return (
              <div key={p.id} className={`kids-pet ${owned ? 'owned' : ''}`}>
                <div
                  className="pet-sprite-thumb"
                  style={{ backgroundImage: `url(/assets/pets/${p.sprite}.png)`, backgroundPosition: '0 0', backgroundRepeat: 'no-repeat', backgroundSize: '300% 400%' }}
                />
                <span className="small">{t('pet.' + p.id + '.name', p.name)}</span>
                {owned ? (
                  <span className="small loot-pos">{tr('Já é seu', 'Owned')}</span>
                ) : (
                  <button type="button" className="primary small-btn" disabled={candies < KIDS_PET_PRICE} onClick={() => props.send({ type: 'buy_kids_pet', pet: p.id })}>
                    {tr('Comprar', 'Buy')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="small muted">{tr('Trajes e mascotes são enfeite (sem bônus): os trajes ficam na Aparência e os mascotes na aba Mascotes.', 'Outfits and pets are cosmetic (no bonus): outfits go to Appearance and pets to the Pets tab.')}</p>
      </section>
    </div>
  );
}
