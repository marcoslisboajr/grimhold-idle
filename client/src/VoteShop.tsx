import { OUTFIT_DEFS, PETS, VOTE_CHEST, VOTE_OUTFITS, VOTE_OUTFIT_PRICE, VOTE_PET, VOTE_PET_PRICE, VOTE_SHOP, topidleVoteUrl, type ClientMessage, type VoteShopItem } from '@grimhold/shared';
import { storyText, t, tr } from './i18n.ts';

/** Loja de Votos: cada voto no TopIdle dá 2 Moedas de Voto, trocada aqui por stamina, XP em dobro e o Baú de Votos. */
export function VoteShop(props: { coins: number; name: string; xpBoostUntil: number; unlockedPets: string[]; unlockedOutfits: string[]; send: (msg: ClientMessage) => void; onClose: () => void }) {
  const { coins } = props;
  const boostLeft = Math.max(0, props.xpBoostUntil - Date.now());
  const pet = PETS.find((p) => p.id === VOTE_PET)!;
  const petOwned = props.unlockedPets.includes(VOTE_PET);
  const offers: { id: VoteShopItem; icon: string; title: string; text: string }[] = [
    { id: 'stamina', icon: 'ui_hourglass', title: tr('Stamina', 'Stamina'), text: tr('+2 h de stamina para caçar', '+2 h of hunting stamina') },
    {
      id: 'chest',
      icon: 'ui_gift',
      title: tr('Baú de Votos', 'Vote Chest'),
      text: tr(
        `Ouro pelo seu nível e mais um: 1 h de stamina, 30 min de XP em dobro ou ${VOTE_CHEST.mealQty} refeições de tier alto. ${Math.round(VOTE_CHEST.rareChance * 100)}% de chance do prêmio raro (tudo isso e ${VOTE_CHEST.rareGoldMult}x o ouro).`,
        `Gold by your level plus one: 1 h of stamina, 30 min of double XP or ${VOTE_CHEST.mealQty} high-tier meals. ${Math.round(VOTE_CHEST.rareChance * 100)}% chance of the rare prize (all of it and ${VOTE_CHEST.rareGoldMult}x the gold).`,
      ),
    },
    { id: 'xp', icon: 'ui_star', title: tr('XP em dobro', 'Double XP'), text: tr('XP em dobro por 1 hora (soma ao que já estiver ativo)', 'Double XP for 1 hour (adds to any active boost)') },
  ];
  return (
    <div className="overlay">
      <section className="panel picker vote-shop-modal" role="dialog" aria-label={tr('Loja de Votos', 'Vote Shop')}>
        <header className="picker-head">
          <h3>{tr('Loja de Votos', 'Vote Shop')}</h3>
          <span className="gold">
            <img className="icon tiny" src="/assets/icons/vote_coin.png" alt="" /> {coins}
          </span>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <p className="small">
          {tr(
            'Vote no Grimhold Idle no TopIdle uma vez por dia e ganhe 2 Moedas de Voto neste personagem. As moedas não se vendem nem vão ao Mercado.',
            'Vote for Grimhold Idle on TopIdle once a day and get 2 Vote Coins on this character. Coins cannot be sold or listed on the Market.',
          )}
        </p>
        <button type="button" className="primary small-btn vote-link" onClick={() => window.open(topidleVoteUrl(props.name), '_blank', 'noopener,noreferrer')}>
          {tr('Votar no TopIdle', 'Vote on TopIdle')}
        </button>
        {boostLeft > 0 && (
          <p className="small loot-pos">
            {tr('XP em dobro ativa', 'Double XP active')}: {Math.ceil(boostLeft / 60_000)} min
          </p>
        )}
        {offers.map((o) => (
          <div key={o.id} className="vote-row">
            <img className="vote-icon" src={`/assets/icons/${o.icon}.png`} alt="" />
            <span>
              <b>{o.title}</b> · {o.text}
            </span>
            <button type="button" className="primary small-btn" disabled={coins < VOTE_SHOP[o.id].price} onClick={() => props.send({ type: 'buy_vote_shop', item: o.id })}>
              {o.id === 'chest' ? tr('Abrir', 'Open') : tr('Usar', 'Use')} ({VOTE_SHOP[o.id].price})
            </button>
          </div>
        ))}

        <h4>
          {tr('Mascote exclusivo', 'Exclusive pet')} · {VOTE_PET_PRICE} <img className="icon tiny" src="/assets/icons/vote_coin.png" alt="" />
        </h4>
        <div className={`vote-pet ${petOwned ? 'owned' : ''}`}>
          <div className="pet-sprite-thumb vote-pet-anim" style={{ backgroundImage: `url(/assets/pets/${pet.sprite}.png)` }} />
          <span>
            <b>{t('pet.' + pet.id + '.name', pet.name)}</b> · {t('pet.' + pet.id + '.desc', pet.description)}
          </span>
          {petOwned ? (
            <span className="small loot-pos">{tr('Já é seu', 'Owned')}</span>
          ) : (
            <button type="button" className="primary small-btn" disabled={coins < VOTE_PET_PRICE} onClick={() => props.send({ type: 'buy_vote_pet' })}>
              {tr('Comprar', 'Buy')} ({VOTE_PET_PRICE})
            </button>
          )}
        </div>

        <h4>
          {tr('Trajes exclusivos', 'Exclusive outfits')} · {VOTE_OUTFIT_PRICE} <img className="icon tiny" src="/assets/icons/vote_coin.png" alt="" /> {tr('cada', 'each')}
        </h4>
        <div className="kids-pets">
          {VOTE_OUTFITS.map((id) => {
            const def = OUTFIT_DEFS.find((o) => o.id === id)!;
            const owned = props.unlockedOutfits.includes(id);
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
                  <button type="button" className="primary small-btn" disabled={coins < VOTE_OUTFIT_PRICE} onClick={() => props.send({ type: 'buy_vote_outfit', outfit: id })}>
                    {tr('Comprar', 'Buy')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="small muted">{tr('Mascote e trajes são enfeite (sem bônus): os trajes ficam na Aparência e o mascote na aba Mascotes.', 'Pet and outfits are cosmetic (no bonus): outfits go to Appearance and the pet to the Pets tab.')}</p>
      </section>
    </div>
  );
}
