import { useState } from 'react';
import { HUNTER_RANKS, IMBUEMENT_MATERIALS, TASK_SHOP, itemById, taskShopPrice, type TaskShopItem } from '@grimhold/shared';
import { itemName, tr } from './i18n.ts';

/** Aba "Loja" do Mestre Adams: gasta o saldo de Pontos de Caça (a patente segue o total ganho). */
export function TaskShop(props: { points: number; spent: number; xpBoostsToday: number; onBuy: (item: TaskShopItem, material?: string) => void }) {
  const free = props.points - props.spent;
  const [material, setMaterial] = useState(IMBUEMENT_MATERIALS[0]);
  const rankName = (min: number) => HUNTER_RANKS.find((r) => r.minPoints === min)?.name ?? '';
  const offers: { id: TaskShopItem; title: string; text: string }[] = [
    { id: 'prey_wildcard', title: tr('Curinga de Presa', 'Prey Wildcard'), text: tr('Troca a lista de uma vaga da Presa sem gastar ouro.', 'Rerolls a Prey slot without spending gold.') },
    {
      id: 'imbuement_material',
      title: tr(`${TASK_SHOP.imbuement_material.qty} materiais de imbuement`, `${TASK_SHOP.imbuement_material.qty} imbuement materials`),
      text: tr('Escolha qual material receber.', 'Pick which material to get.'),
    },
    {
      id: 'charm_points',
      title: tr(`+${TASK_SHOP.charm_points.qty} pontos de charm`, `+${TASK_SHOP.charm_points.qty} charm points`),
      text: tr('Somam aos pontos das fichas do bestiário.', 'Added to your bestiary charm points.'),
    },
    { id: 'stamina', title: tr('+2 h de stamina', '+2 h stamina'), text: tr('Recarga até o máximo de 42 h.', 'Refills up to the 42 h cap.') },
    {
      id: 'xp_boost',
      title: tr('30 min de XP em dobro', '30 min double XP'),
      text: tr(
        `Soma ao boost que já estiver correndo. Cada compra no mesmo dia custa 5x a anterior (hoje: ${props.xpBoostsToday}).`,
        `Stacks with any running boost. Each purchase on the same day costs 5x the last (today: ${props.xpBoostsToday}).`,
      ),
    },
  ];
  return (
    <div className="shop-list" style={{ marginTop: 8 }}>
      <p className="small">
        {tr('Saldo', 'Balance')}: <b style={{ color: '#ffea88' }}>{free}</b> {tr('Pontos de Caça', 'Hunt Points')} ·{' '}
        {tr('gastar não tira sua patente.', 'spending does not lower your rank.')}
      </p>
      {offers.map((o) => {
        const offer = TASK_SHOP[o.id];
        const locked = props.points < offer.minPoints;
        const price = taskShopPrice(o.id, props.points, props.xpBoostsToday);
        return (
          <div key={o.id} className="vote-row">
            <span>
              <b>{o.title}</b> · {o.text}
              {locked && (
                <span className="small muted">
                  {' '}
                  ({tr('libera em', 'unlocks at')} {rankName(offer.minPoints)})
                </span>
              )}
              {o.id === 'imbuement_material' && !locked && (
                <select value={material} onChange={(e) => setMaterial(e.target.value)} style={{ marginLeft: 6 }}>
                  {IMBUEMENT_MATERIALS.map((m) => (
                    <option key={m} value={m}>
                      {itemName(itemById(m)?.name ?? m)}
                    </option>
                  ))}
                </select>
              )}
            </span>
            <button type="button" className="primary small-btn" disabled={locked || free < price} onClick={() => props.onBuy(o.id, o.id === 'imbuement_material' ? material : undefined)}>
              {tr('Comprar', 'Buy')} ({price})
            </button>
          </div>
        );
      })}
      <p className="small muted">{tr('Predador Lendário paga 20% menos em tudo.', 'Legendary Predators pay 20% less for everything.')}</p>
    </div>
  );
}
