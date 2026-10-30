import { useState } from 'react';
import { Pix } from './Pix.tsx';
import type { TradeInviteView, TradeSessionView } from '@grimhold/shared';
import { itemById, splitRarity, rarityOf } from '@grimhold/shared';
import { t, itemName, tr } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;

const RARITY_COLORS: Record<string, string> = {
  common: '#8a6a48',
  uncommon: '#3cb371',
  rare: '#4169e1',
  epic: '#9932cc',
  legendary: '#ffd700',
};

function rarityStyle(id: string): React.CSSProperties | undefined {
  const r = rarityOf(id);
  if (r.tier === 0) return undefined;
  const color = r.color;
  return { borderColor: color, boxShadow: `0 0 6px ${color}88 inset` };
}

export function TradeInviteModal(props: {
  invite: TradeInviteView;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="trade-invite-toast">
      <div className="trade-invite-content">
        <span className="trade-invite-icon"><Pix name="ui_swap" /></span>
        <div className="trade-invite-text">
          <strong>{props.invite.fromCharacterName}</strong>
          <span>{tr('deseja negociar com você!', 'wants to trade with you!')}</span>
        </div>
      </div>
      <div className="trade-invite-actions">
        <button className="primary small-btn" onClick={props.onAccept}>
          {tr('Aceitar', 'Accept')}
        </button>
        <button className="small-btn danger-btn" onClick={props.onDecline}>
          {tr('Recusar', 'Decline')}
        </button>
      </div>
    </div>
  );
}

export function TradeModal(props: {
  trade: TradeSessionView;
  bank: Record<string, number>;
  onSetGold: (gold: number) => void;
  onAddItem: (item: string, qty: number) => void;
  onRemoveItem: (item: string, qty: number) => void;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const { trade, bank } = props;
  const [goldInput, setGoldInput] = useState<string>(String(trade.myGold));
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedBankItem, setSelectedBankItem] = useState<string | null>(null);
  const [addItemQty, setAddItemQty] = useState<number>(1);

  const availableBankGold = bank.gold ?? 0;

  const handleGoldChange = (valStr: string) => {
    setGoldInput(valStr);
    const parsed = Math.max(0, Math.min(availableBankGold, parseInt(valStr, 10) || 0));
    props.onSetGold(parsed);
  };

  // Itens disponíveis no banco que podem ser negociados (exclui ouro pois tem campo próprio)
  const bankItemsList = Object.entries(bank)
    .filter(([id, qty]) => id !== 'gold' && qty > 0)
    .filter(([id]) => {
      if (!searchFilter.trim()) return true;
      const it = itemById(splitRarity(id).base);
      const name = it ? itemName(it.name) : id;
      return name.toLowerCase().includes(searchFilter.toLowerCase());
    });

  // Quantidade de um item já colocado na janela de troca
  const myOfferedCount = (itemId: string) => {
    return trade.myItems.find((i) => i.item === itemId)?.qty ?? 0;
  };

  return (
    <div className="overlay" onClick={props.onCancel}>
      <section
        className="panel picker big-modal trade-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={tr('Janela de Negociação', 'Trade window')}
      >
        <header className="picker-head">
          <div className="trade-head-title">
            <h3>{tr('Negociação com', 'Trading with')} {trade.partnerName}</h3>
            <span className="small trade-head-hint">
              {tr('Anti-dupe & anti-scam ativados: qualquer alteração de oferta cancela o aceite de ambos.', 'Anti-dupe & anti-scam on: any change to an offer cancels both acceptances.')}
            </span>
          </div>
          <button className="close" onClick={props.onCancel} aria-label={tr('Cancelar troca', 'Cancel trade')}>
            ×
          </button>
        </header>

        <div className="trade-layout">
          {/* Lado Esquerdo: Minha Oferta */}
          <div className={`trade-side my-side ${trade.myAccepted ? 'accepted' : ''}`}>
            <div className="trade-side-header">
              <h4>{tr('Sua Oferta', 'Your Offer')}</h4>
              <span className={`trade-status-badge ${trade.myAccepted ? 'ok' : 'pending'}`}>
                {trade.myAccepted ? tr('✓ Pronto / Aceito', '✓ Ready / Accepted') : tr('Modificando', 'Editing')}
              </span>
            </div>

            <div className="trade-gold-box">
              <label>
                <img className="icon tiny" src={icon('gold')} alt="" />
                <span>{tr('Ouro oferecido:', 'Gold offered:')}</span>
              </label>
              <div className="trade-gold-input-row">
                <input
                  type="number"
                  min={0}
                  max={availableBankGold}
                  value={goldInput}
                  onChange={(e) => handleGoldChange(e.target.value)}
                  disabled={trade.myAccepted}
                  aria-label={tr('Ouro oferecido', 'Gold offered')}
                />
                <button
                  type="button"
                  className="small-btn"
                  disabled={trade.myAccepted}
                  onClick={() => handleGoldChange(String(availableBankGold))}
                  title={tr('Oferecer todo o ouro do banco', 'Offer all the gold in your bank')}
                >
                  {tr('Máx', 'Max')} ({availableBankGold.toLocaleString('pt-BR')})
                </button>
              </div>
            </div>

            <div className="trade-items-box">
              <span className="trade-items-title">{tr('Itens Oferecidos', 'Items Offered')} ({trade.myItems.length}/16):</span>
              <ul className="trade-slots-grid">
                {Array.from({ length: 16 }).map((_, idx) => {
                  const offer = trade.myItems[idx];
                  if (!offer) {
                    return <li key={idx} className="trade-slot empty" />;
                  }
                  const { base } = splitRarity(offer.item);
                  const item = itemById(base);
                  const title = item ? `${itemName(item.name)} (x${offer.qty})` : offer.item;
                  return (
                    <li
                      key={idx}
                      className="trade-slot filled"
                      style={rarityStyle(offer.item)}
                      title={`${title} - ${tr('Clique para remover', 'Click to remove')}`}
                      onClick={() => !trade.myAccepted && props.onRemoveItem(offer.item, 1)}
                    >
                      <img className="icon" src={icon(item?.icon ?? 'item')} alt="" />
                      {offer.qty > 1 && <span className="qty">{offer.qty}</span>}
                      {!trade.myAccepted && <span className="remove-tag">×</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Lado Direito: Oferta do Parceiro */}
          <div className={`trade-side their-side ${trade.theirAccepted ? 'accepted' : ''}`}>
            <div className="trade-side-header">
              <h4>{tr('Oferta de', 'Offer from')} {trade.partnerName}</h4>
              <span className={`trade-status-badge ${trade.theirAccepted ? 'ok' : 'pending'}`}>
                {trade.theirAccepted ? tr('✓ Pronto / Aceito', '✓ Ready / Accepted') : tr('Modificando', 'Editing')}
              </span>
            </div>

            <div className="trade-gold-box">
              <label>
                <img className="icon tiny" src={icon('gold')} alt="" />
                <span>{tr('Ouro oferecido:', 'Gold offered:')}</span>
              </label>
              <div className="trade-gold-display">
                <span className="gold-val">{trade.theirGold.toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div className="trade-items-box">
              <span className="trade-items-title">{tr('Itens Oferecidos', 'Items Offered')} ({trade.theirItems.length}/16):</span>
              <ul className="trade-slots-grid">
                {Array.from({ length: 16 }).map((_, idx) => {
                  const offer = trade.theirItems[idx];
                  if (!offer) {
                    return <li key={idx} className="trade-slot empty" />;
                  }
                  const { base } = splitRarity(offer.item);
                  const item = itemById(base);
                  const title = item ? `${itemName(item.name)} (x${offer.qty})` : offer.item;
                  return (
                    <li key={idx} className="trade-slot filled" style={rarityStyle(offer.item)} title={title}>
                      <img className="icon" src={icon(item?.icon ?? 'item')} alt="" />
                      {offer.qty > 1 && <span className="qty">{offer.qty}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Seletor rápido de itens do seu Banco para adicionar à oferta */}
        <div className="trade-inventory-section">
          <div className="trade-inv-head">
            <h5>{tr('Adicionar item do seu Depósito:', 'Add an item from your Depot:')}</h5>
            <input
              type="search"
              placeholder={tr('Filtrar itens do banco...', 'Filter bank items...')}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="trade-search-input"
            />
          </div>

          <div className="trade-inv-list">
            {bankItemsList.length === 0 ? (
              <span className="small muted">{tr('Nenhum item disponível no banco.', 'No items available in your bank.')}</span>
            ) : (
              bankItemsList.map(([id, totalQty]) => {
                const offered = myOfferedCount(id);
                const remain = totalQty - offered;
                const { base } = splitRarity(id);
                const item = itemById(base);
                const isSelected = selectedBankItem === id;

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={remain <= 0 || trade.myAccepted}
                    className={`trade-inv-item-btn ${isSelected ? 'selected' : ''}`}
                    style={rarityStyle(id)}
                    onClick={() => {
                      setSelectedBankItem(id);
                      setAddItemQty(1);
                    }}
                    title={`${item ? itemName(item.name) : id} (${remain} ${tr('disponíveis', 'available')})`}
                  >
                    <img className="icon" src={icon(item?.icon ?? 'item')} alt="" />
                    <span className="inv-item-name">{item ? itemName(item.name) : id}</span>
                    <span className="inv-item-qty">{remain}x</span>
                  </button>
                );
              })
            )}
          </div>

          {selectedBankItem && (
            <div className="trade-add-bar">
              {(() => {
                const total = bank[selectedBankItem] ?? 0;
                const remain = total - myOfferedCount(selectedBankItem);
                const item = itemById(splitRarity(selectedBankItem).base);
                return (
                  <>
                    <span>
                      {tr('Adicionar', 'Add')} <strong>{item ? itemName(item.name) : selectedBankItem}</strong>:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={remain}
                      value={addItemQty}
                      onChange={(e) => setAddItemQty(Math.max(1, Math.min(remain, parseInt(e.target.value, 10) || 1)))}
                      disabled={trade.myAccepted}
                    />
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => setAddItemQty(remain)}
                      disabled={trade.myAccepted}
                    >
                      {tr('Todos', 'All')} ({remain})
                    </button>
                    <button
                      type="button"
                      className="primary small-btn"
                      disabled={remain <= 0 || trade.myAccepted}
                      onClick={() => {
                        props.onAddItem(selectedBankItem, addItemQty);
                        setSelectedBankItem(null);
                        setAddItemQty(1);
                      }}
                    >
                      + {tr('Ofertar', 'Offer')}
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Rodapé com botões de Ação */}
        <footer className="trade-footer">
          <div className="trade-footer-info">
            {trade.myAccepted && !trade.theirAccepted && (
              <span className="trade-waiting">{tr(`Aguardando ${trade.partnerName} aceitar a troca...`, `Waiting for ${trade.partnerName} to accept the trade...`)}</span>
            )}
            {!trade.myAccepted && trade.theirAccepted && (
              <span className="trade-prompt">{tr(`${trade.partnerName} já aceitou! Revise as ofertas e clique em Aceitar.`, `${trade.partnerName} has accepted! Review the offers and click Accept.`)}</span>
            )}
            {trade.myAccepted && trade.theirAccepted && (
              <span className="trade-finalizing">{tr('Ambos aceitaram! Finalizando transferência...', 'Both accepted! Finalizing transfer...')}</span>
            )}
          </div>
          <div className="trade-footer-buttons">
            <button className="small-btn danger-btn" onClick={props.onCancel}>
              {tr('Cancelar Troca', 'Cancel Trade')}
            </button>
            <button
              className={`primary trade-accept-btn ${trade.myAccepted ? 'accepted-done' : ''}`}
              onClick={props.onAccept}
              disabled={trade.myAccepted}
            >
              {trade.myAccepted ? tr('✓ Aceite Confirmado', '✓ Acceptance Confirmed') : tr('Aceitar Troca', 'Accept Trade')}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
