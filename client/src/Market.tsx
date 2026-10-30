import { useMemo, useState, useEffect } from 'react';
import { BUYBACK_MAX, LISTING_MS, GOLD, ITEMS, buybackPrice, RARITIES, hasUse, itemById, npcBuys, itemValue, rarityOf, splitRarity, type BuyOffer, type EquipSlot, type ClientMessage, type Listing } from '@grimhold/shared';
import { StatDiff, UpgradeArrow, upgradeVs } from './compare.tsx';
import { linkItemInChat } from './Chat.tsx';
import { itemTooltip } from './Home.tsx';
import { t, onLangChange, getLang, itemName, tr } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;

const MARKET_FILTERS_KEY = 'grimhold.marketFilters';
type MarketKind = 'all' | 'gear' | 'food' | 'potion' | 'ammo' | 'material' | 'other';
type MarketSort = 'price_unit' | 'price_total' | 'level' | 'name' | 'recent' | 'rarity' | 'type';

interface MarketFilters {
  kind: MarketKind;
  onlyMyVocation: boolean;
  minLevel: string;
  maxLevel: string;
  sort: MarketSort;
}

const DEFAULT_MARKET_FILTERS: MarketFilters = {
  kind: 'all',
  onlyMyVocation: false,
  minLevel: '',
  maxLevel: '',
  sort: 'price_unit',
};

const MARKET_KINDS: [MarketKind, string, string][] = [
  ['all', 'Todos', 'All'],
  ['gear', 'Equipamentos', 'Equipment'],
  ['food', 'Comida', 'Food'],
  ['potion', 'Poção', 'Potion'],
  ['ammo', 'Runa/Flecha', 'Rune/Arrow'],
  ['material', 'Materiais', 'Materials'],
  ['other', 'Outros', 'Other'],
];

const MARKET_SORTS: [MarketSort, string, string][] = [
  ['price_unit', 'Preço por unidade', 'Price per unit'],
  ['price_total', 'Preço', 'Price'],
  ['level', 'Nível do item', 'Item level'],
  ['name', 'Nome', 'Name'],
  ['recent', 'Mais recentes', 'Most recent'],
  ['rarity', 'Raridade', 'Rarity'],
  ['type', 'Tipo', 'Type'],
];

function loadMarketFilters(): MarketFilters {
  try {
    const raw = JSON.parse(localStorage.getItem(MARKET_FILTERS_KEY) ?? '{}');
    const kind = MARKET_KINDS.some(([k]) => k === raw.kind) ? (raw.kind as MarketKind) : 'all';
    const sort = MARKET_SORTS.some(([s]) => s === raw.sort) ? (raw.sort as MarketSort) : 'price_unit';
    return {
      kind,
      onlyMyVocation: !!raw.onlyMyVocation,
      minLevel: typeof raw.minLevel === 'string' ? raw.minLevel : '',
      maxLevel: typeof raw.maxLevel === 'string' ? raw.maxLevel : '',
      sort,
    };
  } catch {
    return DEFAULT_MARKET_FILTERS;
  }
}

function saveMarketFilters(f: MarketFilters) {
  try {
    localStorage.setItem(MARKET_FILTERS_KEY, JSON.stringify(f));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

function marketKindOf(id: string): Exclude<MarketKind, 'all'> {
  const it = itemById(id);
  if (it?.equip) return 'gear';
  if (it?.food || it?.meal) return 'food';
  if (it?.potion || it?.manaPotion) return 'potion';
  if (it?.rune || it?.arrow) return 'ammo';
  if (it?.pouch || it?.questItem || it?.outfit || it?.tool || it?.sigil || id === 'boss_token' || id === 'torn_map' || id === 'seal_shard') return 'other';
  return 'material';
}

function filterAndSortMarket<T extends { item: string; qty: number; price: number; createdAt: number }>(
  list: T[],
  query: string,
  filters: MarketFilters,
  vocation: string | undefined,
  lang: string,
): T[] {
  const fold = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = fold(query.trim());
  const minLv = Number(filters.minLevel) > 0 ? Number(filters.minLevel) : 0;
  const maxLv = Number(filters.maxLevel) > 0 ? Number(filters.maxLevel) : 0;
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const label = (id: string) => itemName(itemById(id)?.name ?? id);
  return list
    .filter((entry) => {
      const it = itemById(entry.item);
      if (q) {
        const ptName = fold(it?.name ?? entry.item);
        const trName = fold(label(entry.item));
        if (!ptName.includes(q) && !trName.includes(q)) return false;
      }
      if (filters.kind !== 'all' && marketKindOf(entry.item) !== filters.kind) return false;
      if (filters.onlyMyVocation) {
        if (!it?.equip) return false;
        if (it.equip.vocations && vocation && !it.equip.vocations.includes(vocation)) return false;
      }
      if (minLv > 0) {
        if (!it?.equip || it.equip.level < minLv) return false;
      }
      if (maxLv > 0) {
        if (!it?.equip || it.equip.level > maxLv) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === 'price_unit') return a.price - b.price || b.createdAt - a.createdAt;
      if (filters.sort === 'price_total') return a.price * a.qty - b.price * b.qty || a.price - b.price;
      if (filters.sort === 'level') {
        const la = itemById(a.item)?.equip?.level ?? 0;
        const lb = itemById(b.item)?.equip?.level ?? 0;
        return lb - la || a.price - b.price;
      }
      if (filters.sort === 'recent') return b.createdAt - a.createdAt;
      if (filters.sort === 'rarity') return splitRarity(b.item).tier - splitRarity(a.item).tier || a.price - b.price;
      if (filters.sort === 'type') {
        const ka = marketKindOf(a.item);
        const kb = marketKindOf(b.item);
        if (ka !== kb) return ka.localeCompare(kb);
        return (itemById(a.item)?.equip?.level ?? 0) - (itemById(b.item)?.equip?.level ?? 0) || label(a.item).localeCompare(label(b.item), locale);
      }
      return label(a.item).localeCompare(label(b.item), locale) || a.price - b.price;
    });
}

function MarketFilterBar(props: {
  query: string;
  onQuery: (q: string) => void;
  filters: MarketFilters;
  onChange: (patch: Partial<MarketFilters>) => void;
}) {
  const { filters, onChange } = props;
  return (
    <div className="market-filters">
      <div className="bank-header-tabs" role="group" aria-label={tr('Tipo de item', 'Item type')}>
        {MARKET_KINDS.map(([id, pt, en]) => (
          <button
            key={id}
            type="button"
            className={`bank-tab-btn ${filters.kind === id ? 'active' : ''}`}
            onClick={() => onChange({ kind: id })}
          >
            {tr(pt, en)}
          </button>
        ))}
      </div>
      <div className="bank-tools market-tools">
        <input
          type="search"
          className="bank-search-input"
          placeholder={t('market.search_placeholder')}
          value={props.query}
          onChange={(e) => props.onQuery(e.target.value)}
        />
        <label className="small market-filter-check">
          <input
            type="checkbox"
            checked={filters.onlyMyVocation}
            onChange={(e) => onChange({ onlyMyVocation: e.target.checked })}
          />{' '}
          {tr('Só minha vocação', 'My vocation only')}
        </label>
        <label className="small market-level-range">
          {tr('Nível:', 'Level:')}{' '}
          <input
            type="number"
            min={1}
            max={999}
            placeholder={tr('Mín', 'Min')}
            value={filters.minLevel}
            onChange={(e) => onChange({ minLevel: e.target.value })}
            aria-label={tr('Nível mínimo', 'Minimum level')}
          />
          <span>–</span>
          <input
            type="number"
            min={1}
            max={999}
            placeholder={tr('Máx', 'Max')}
            value={filters.maxLevel}
            onChange={(e) => onChange({ maxLevel: e.target.value })}
            aria-label={tr('Nível máximo', 'Maximum level')}
          />
        </label>
        <label className="small">
          {tr('Ordenar:', 'Sort:')}{' '}
          <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as MarketSort })}>
            {MARKET_SORTS.map(([id, pt, en]) => (
              <option key={id} value={id}>
                {tr(pt, en)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/** Mercado entre jogadores: comprar ofertas, anunciar itens do banco e cancelar as suas. */
export function Market(props: {
  listings: Listing[];
  /** Ofertas de compra ("compro X a Y cada"). */
  offers?: BuyOffer[];
  bank: Record<string, number>;
  characterId: number;
  vocation?: string;
  combatLevel?: number;
  /** Equipamento atual: o Mercado compara cada item com ele. */
  equipment?: Partial<Record<EquipSlot, string>>;
  /** Itens trancados: não aparecem para vender. */
  lockedItems?: string[];
  /** Recompra do Mercador (vendas das últimas 24 h). */
  buyback?: { id: number; item: string; qty: number; price: number; at: number }[];
  send: (msg: ClientMessage) => void;
  onClose: () => void;
  initialTab?: 'buy' | 'sell' | 'npc' | 'wanted' | 'buyback';
}) {
  const [lang, setLangState] = useState(getLang());
  useEffect(() => onLangChange(setLangState), []);
  const fmt = (n: number) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');

  const [tab, setTab] = useState<'buy' | 'sell' | 'npc' | 'wanted' | 'buyback'>(props.initialTab ?? 'buy');
  const [query, setQuery] = useState('');
  const [filters, setFiltersState] = useState<MarketFilters>(loadMarketFilters);
  const updateFilters = (patch: Partial<MarketFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch };
      saveMarketFilters(next);
      return next;
    });
  };
  const locked = new Set(props.lockedItems ?? []);
  const sellBank = Object.fromEntries(Object.entries(props.bank).filter(([id]) => !locked.has(id)));
  const gold = props.bank[GOLD] ?? 0;

  const offers = useMemo(
    () =>
      filterAndSortMarket(
        props.listings.filter((l) => l.sellerId !== props.characterId),
        query,
        filters,
        props.vocation,
        lang,
      ),
    [props.listings, props.characterId, query, filters, props.vocation, lang],
  );
  const mine = props.listings.filter((l) => l.sellerId === props.characterId);

  // Clicar fora não fecha: só o X (fechava sem querer no meio da compra).
  return (
    <div className="overlay">
      <section className="panel picker market" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('market.title')}>
        <header className="picker-head">
          <h3>{t('market.title')}</h3>
          <span className="gold">
            <img className="icon tiny" src={icon('gold')} alt="" /> {fmt(gold)}
          </span>
          <button className="close" onClick={props.onClose} aria-label={t('common.close')}>
            ×
          </button>
        </header>
        <div className="tabs" role="tablist">
          <button className={`tab ${tab === 'buy' ? 'on' : ''}`} onClick={() => setTab('buy')}>
            {t('market.tab_buy')}
          </button>
          <button className={`tab ${tab === 'sell' ? 'on' : ''}`} onClick={() => setTab('sell')}>
            {t('market.tab_sell')} {mine.length > 0 && `(${mine.length})`}
          </button>
          <button className={`tab ${tab === 'wanted' ? 'on' : ''}`} onClick={() => setTab('wanted')}>
            {tr('Compra-se', 'Wanted')} {(props.offers?.length ?? 0) > 0 && `(${props.offers!.length})`}
          </button>
          <button className={`tab ${tab === 'npc' ? 'on' : ''}`} onClick={() => setTab('npc')}>
            {t('market.tab_npc')}
          </button>
          <button className={`tab ${tab === 'buyback' ? 'on' : ''}`} onClick={() => setTab('buyback')}>
            {tr('Recomprar', 'Buy back')} {(props.buyback?.length ?? 0) > 0 && `(${props.buyback!.length})`}
          </button>
        </div>

        {tab === 'buyback' ? (
          <Buyback list={props.buyback ?? []} gold={gold} send={props.send} fmt={fmt} />
        ) : tab === 'wanted' ? (
          <Wanted offers={props.offers ?? []} bank={props.bank} characterId={props.characterId} gold={gold} send={props.send} fmt={fmt} filters={filters} onFiltersChange={updateFilters} vocation={props.vocation} lang={lang} />
        ) : tab === 'npc' ? (
          <NpcSell bank={sellBank} send={props.send} fmt={fmt} lang={lang} lockedCount={locked.size} />
        ) : tab === 'buy' ? (
          <>
            <MarketFilterBar query={query} onQuery={setQuery} filters={filters} onChange={updateFilters} />
            {offers.length === 0 ? (
              <p className="muted">{t('market.no_offers')}</p>
            ) : (
              <ul className="market-list">
                {offers.map((l) => (
                  <BuyRow key={l.id} listing={l} equipment={props.equipment ?? {}} gold={gold} send={props.send} fmt={fmt} lang={lang} />
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <SellForm bank={sellBank} send={props.send} fmt={fmt} />
            <h4>{lang === 'pt' ? 'Suas ofertas' : 'Your listings'}</h4>
            {mine.length === 0 ? (
              <p className="muted">{lang === 'pt' ? 'Você não tem nada à venda.' : 'You have no items listed.'}</p>
            ) : (
              <ul className="market-list">
                {mine.map((l) => (
                  <li key={l.id} className="market-row">
                    <ItemCell id={l.item} qty={l.qty} fmt={fmt} />
                    <span className="price">{fmt(l.price)} {t('shop.each')}</span>
                    {/* Vence em LISTING_MS: o que sobrar volta ao depósito. */}
                    <span className="small muted">
                      {(() => {
                        const left = Math.max(0, l.createdAt + LISTING_MS - Date.now());
                        const d = Math.floor(left / 86_400_000);
                        const h = Math.floor((left % 86_400_000) / 3_600_000);
                        return tr(`volta ao depósito em ${d ? `${d}d ` : ''}${h}h`, `returns to depot in ${d ? `${d}d ` : ''}${h}h`);
                      })()}
                    </span>
                    <button className="primary small-btn" onClick={() => props.send({ type: 'market_cancel', listing: l.id })}>
                      {t('market.cancel_btn')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** Recompra: o que você vendeu ao Mercador nas últimas 24 h, por 10% a mais do que recebeu. */
function Buyback(props: { list: { id: number; item: string; qty: number; price: number; at: number }[]; gold: number; send: (msg: ClientMessage) => void; fmt: (n: number) => string }) {
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  if (!props.list.length) return <p className="muted">{tr('Nada vendido ao Mercador nas últimas 24 horas.', 'Nothing sold to the Merchant in the last 24 hours.')}</p>;
  return (
    <>
      <p className="small muted">
        {tr(
          `Vendeu sem querer? Recompre aqui o que vendeu ao Mercador nas últimas 24 horas (as ${BUYBACK_MAX} últimas vendas), por 10% a mais do que recebeu.`,
          `Sold by mistake? Buy back what you sold to the Merchant in the last 24 hours (the last ${BUYBACK_MAX} sales), for 10% more than you got.`,
        )}
      </p>
      <ul className="market-list">
        {props.list.map((b) => {
          const n = Math.min(b.qty, Math.max(1, Math.floor(amounts[b.id] ?? b.qty)));
          const cost = buybackPrice(b.price) * n;
          const ago = Math.max(1, Math.round((Date.now() - b.at) / 60_000));
          return (
            <li key={b.id} className="market-row">
              <ItemCell id={b.item} qty={b.qty} fmt={props.fmt} />
              <span className="small muted">{ago < 60 ? tr(`há ${ago} min`, `${ago} min ago`) : tr(`há ${Math.round(ago / 60)} h`, `${Math.round(ago / 60)} h ago`)}</span>
              <span className="sell-amount">
                <input type="number" min={1} max={b.qty} value={n} onChange={(e) => setAmounts((p) => ({ ...p, [b.id]: Number(e.target.value) || 1 }))} aria-label={tr('Quantidade', 'Amount')} />
                <button type="button" className="primary small-btn" disabled={props.gold < cost} onClick={() => props.send({ type: 'buyback_npc', id: b.id, qty: n })}>
                  {tr('Recomprar', 'Buy back')} · {props.fmt(cost)}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Mercador do Bastião: compra qualquer item por um preço fixo (mais baixo que entre jogadores). */
type SellKind = 'all' | 'gear' | 'loot' | 'material' | 'consumable';
const SELL_KINDS: [SellKind, string, string][] = [
  ['all', 'Tudo', 'All'],
  ['gear', 'Equipamento', 'Gear'],
  ['loot', 'Loot', 'Loot'],
  ['material', 'Materiais', 'Materials'],
  ['consumable', 'Consumíveis', 'Consumables'],
];

function NpcSell(props: { bank: Record<string, number>; send: (msg: ClientMessage) => void; fmt: (n: number) => string; lang: string; lockedCount: number }) {
  const { fmt, lang } = props;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Quantidade escolhida em cada linha (padrão 1).
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  // Tipo, ordem e busca (pedido de 18/10): separa o que vender sem rolar a lista toda.
  const [kind, setKind] = useState<SellKind>('all');
  const [order, setOrder] = useState<'name' | 'value' | 'qty'>('name');
  const [query, setQuery] = useState('');
  // Loot: só o que não tem uso nenhum (fora chaves, imbuement, materiais de receita, consumíveis...).
  const isLoot = (id: string) => !hasUse(id);
  const kindOf = (id: string): SellKind => {
    const it = itemById(id);
    if (it?.equip) return 'gear';
    if (it && (it.food || it.potion || it.rune || it.arrow || it.manaPotion)) return 'consumable';
    return isLoot(id) ? 'loot' : 'material';
  };
  const label = (id: string) => itemName(itemById(id)?.name ?? id);
  const fold = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = fold(query.trim());
  const owned = Object.entries(props.bank).filter(([id, qty]) => id !== GOLD && qty > 0 && npcBuys(id));
  if (owned.length === 0) return <p className="muted">{lang === 'pt' ? 'Seu banco está vazio.' : 'Your bank is empty.'}</p>;
  const locale = lang === 'pt' ? 'pt-BR' : 'en';
  const items = owned
    .filter(([id]) => (kind === 'all' || kindOf(id) === kind) && (!q || fold(label(id)).includes(q)))
    .sort(([a, qa], [b, qb]) =>
      order === 'value' ? itemValue(b) * qb - itemValue(a) * qa : order === 'qty' ? qb - qa : label(a).localeCompare(label(b), locale),
    );
  const chosen = items.filter(([id]) => picked.has(id));
  const total = chosen.reduce((n, [id, qty]) => n + itemValue(id) * qty, 0);
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const sellPicked = () => {
    if (chosen.length === 0) return;
    // Itens com uso (equipamento, material de imbuement ou de receita, consumível): pergunta antes, com os nomes.
    const useful = chosen.filter(([id]) => hasUse(id)).map(([id]) => itemName(itemById(id)?.name ?? id));
    const list = useful.slice(0, 12).join(', ') + (useful.length > 12 ? '…' : '');
    const confirmMsg = lang === 'pt'
      ? `Vender ${chosen.length} itens por ${fmt(total)} de ouro?

Atenção: ${useful.length} têm uso (equipamento, imbuement, receita ou consumível):
${list}`
      : `Sell ${chosen.length} items for ${fmt(total)} gold?

Warning: ${useful.length} have a use (gear, imbuement, recipe or consumable):
${list}`;
    if (useful.length > 0 && !window.confirm(confirmMsg)) return;
    props.send({ type: 'sell_npc_many', items: Object.fromEntries(chosen) });
    setPicked(new Set());
  };
  return (
    <>
      <p className="small">{t('market.npc_desc')}</p>
      <p className="small muted">
        {tr(
          `🔒 tranca o item: ele some daqui e não é vendido por engano.${props.lockedCount ? ` Trancados: ${props.lockedCount} (destranque no Depósito).` : ''}`,
          `🔒 locks the item: it leaves this list and cannot be sold by mistake.${props.lockedCount ? ` Locked: ${props.lockedCount} (unlock in the Depot).` : ''}`,
        )}
      </p>
      <div className="sell-filters">
        <div className="sell-kinds" role="group" aria-label={tr('Tipo de item', 'Item type')}>
          {SELL_KINDS.map(([id, pt, en]) => (
            <button key={id} type="button" className={`small-btn ${kind === id ? 'primary' : ''}`} aria-pressed={kind === id} onClick={() => setKind(id)}>
              {tr(pt, en)} ({id === 'all' ? owned.length : owned.filter(([i]) => kindOf(i) === id).length})
            </button>
          ))}
        </div>
        <input className="search" placeholder={t('market.search_placeholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="small">
          {tr('Ordem', 'Sort')}{' '}
          <select value={order} onChange={(e) => setOrder(e.target.value as typeof order)}>
            <option value="name">{tr('A–Z', 'A–Z')}</option>
            <option value="value">{tr('Maior valor total', 'Highest total value')}</option>
            <option value="qty">{tr('Maior quantidade', 'Most units')}</option>
          </select>
        </label>
      </div>
      <div className="bulk-sell">
        <span className="small">{lang === 'pt' ? 'Selecionar:' : 'Select:'}</span>
        <button type="button" className="primary small-btn" onClick={() => setPicked(new Set(items.filter(([id]) => isLoot(id)).map(([id]) => id)))}>
          Loot
        </button>
        <button type="button" className="primary small-btn" onClick={() => setPicked(new Set(items.map(([id]) => id)))}>
          {lang === 'pt' ? 'Tudo' : 'All'}
        </button>
        <button type="button" className="primary small-btn" onClick={() => setPicked(new Set())}>
          {lang === 'pt' ? 'Nada' : 'None'}
        </button>
        <button type="button" className="primary small-btn sell-picked" disabled={chosen.length === 0} onClick={sellPicked}>
          {lang === 'pt' ? `Vender ${chosen.length} itens (${fmt(total)} ouro)` : `Sell ${chosen.length} items (${fmt(total)} gold)`}
        </button>
      </div>
      <ul className="market-list">
        {items.map(([id, qty]) => {
          const value = itemValue(id);
          const amount = Math.min(qty, Math.max(1, Math.floor(amounts[id] ?? 1)));
          const setAmount = (n: number) => setAmounts((prev) => ({ ...prev, [id]: Math.min(qty, Math.max(1, Math.floor(n) || 1)) }));
          return (
            <li key={id} className={`market-row ${picked.has(id) ? 'picked' : ''}`}>
              <input type="checkbox" className="pick" checked={picked.has(id)} onChange={() => toggle(id)} aria-label={tr('Selecionar para vender', 'Select to sell')} />
              <button type="button" className="small-btn lock-btn" title={tr('Trancar (não vende)', 'Lock (never sell)')} onClick={() => props.send({ type: 'lock_item', item: id, locked: true })}>
                🔒
              </button>
              <ItemCell id={id} qty={qty} fmt={fmt} />
              <span className="price">{fmt(value)} {t('shop.each')}</span>
              <span className="sell-amount">
                {[10, 100].filter((n) => n < qty).map((n) => (
                  <button key={n} type="button" className="small-btn" onClick={() => setAmount(n)}>
                    {n}
                  </button>
                ))}
                {qty > 2 && (
                  <button type="button" className="small-btn" onClick={() => setAmount(Math.floor(qty / 2))}>
                    ½
                  </button>
                )}
                <input type="number" min={1} max={qty} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label={tr('Quantidade', 'Amount')} />
              </span>
              <button className="primary small-btn" onClick={() => props.send({ type: 'sell_npc', item: id, qty: amount })}>
                {lang === 'pt' ? `Vender ${amount} (${fmt(value * amount)})` : `Sell ${amount} (${fmt(value * amount)})`}
              </button>
              <button className="primary small-btn" onClick={() => props.send({ type: 'sell_npc', item: id, qty })}>
                {t('market.sell_all')} ({fmt(value * qty)})
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ItemCell({ id, qty, fmt }: { id: string; qty: number; fmt: (n: number) => string }) {
  const item = itemById(id);
  const name = item ? itemName(item.name) : id;
  return (
    <span className="market-item" title={itemTooltip(id)}>
      <img className="icon" src={icon(item?.icon ?? '')} alt="" />
      <span>
        <strong style={{ color: splitRarity(id).tier > 0 ? rarityOf(id).color : undefined }}>{name}</strong>
        <span className="small"> ×{fmt(qty)}</span>
      </span>
      <button
        type="button"
        className="small-btn chat-link-item-btn"
        title={tr('Mostrar no chat', 'Link in chat')}
        onClick={() => linkItemInChat(id)}
      >
        💬 {tr('Mostrar no chat', 'Link in chat')}
      </button>
    </span>
  );
}

function BuyRow(props: { listing: Listing; equipment: Partial<Record<EquipSlot, string>>; gold: number; send: (msg: ClientMessage) => void; fmt: (n: number) => string; lang: string }) {
  const { listing: l, fmt, lang } = props;
  const [qty, setQty] = useState(1);
  const n = Math.max(1, Math.min(l.qty, Math.floor(qty) || 1));
  const cost = n * l.price;
  return (
    <li className="market-row">
      <span className="market-buy-item">
        <ItemCell id={l.item} qty={l.qty} fmt={fmt} />
        <UpgradeArrow v={upgradeVs(l.item, props.equipment)} />
        <StatDiff id={l.item} equipment={props.equipment} />
      </span>
      <span className="small">{lang === 'pt' ? 'por' : 'by'} {l.seller}</span>
      <span className="price">{fmt(l.price)} {t('shop.each')}</span>
      <input
        className="qty-input"
        type="number"
        min={1}
        max={l.qty}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        aria-label={tr('Quantidade', 'Quantity')}
      />
      <button
        className="primary small-btn"
        disabled={cost > props.gold}
        onClick={() => props.send({ type: 'market_buy', listing: l.id, qty: n })}
      >
        {t('market.buy_btn')} ({fmt(cost)})
      </button>
    </li>
  );
}

function SellForm(props: { bank: Record<string, number>; send: (msg: ClientMessage) => void; fmt: (n: number) => string }) {
  const { fmt } = props;
  const sellable = Object.entries(props.bank).filter(([id, qty]) => id !== GOLD && qty > 0);
  const [item, setItem] = useState(sellable[0]?.[0] ?? '');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(10);
  const have = props.bank[item] ?? 0;
  const valid = have > 0 && qty >= 1 && qty <= have && price >= 1;
  const lang = getLang();
  if (sellable.length === 0) return <p className="muted">{lang === 'pt' ? 'Seu banco está vazio.' : 'Your bank is empty.'}</p>;
  return (
    <form
      className="sell-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) props.send({ type: 'market_list', item, qty: Math.floor(qty), price: Math.floor(price) });
      }}
    >
      <label>
        Item
        <select value={item} onChange={(e) => setItem(e.target.value)}>
          {sellable.map(([id, n]) => (
            <option key={id} value={id}>
              {itemName(itemById(id)?.name ?? id)} ({fmt(n)})
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('market.quantity')}
        <input type="number" min={1} max={have} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
      </label>
      <label>
        {t('market.price_per_unit')}
        <input type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </label>
      <button className="primary" disabled={!valid}>
        {t('market.list_btn')} ({fmt(Math.floor(qty) * Math.floor(price) || 0)} {t('common.gold')})
      </button>
    </form>
  );
}

/**
 * Ofertas de compra: quem precisa de um item publica "compro X a Y cada" (o ouro fica reservado);
 * quem tem o item vende ali mesmo, parte ou tudo, e recebe na hora.
 */
function Wanted(props: {
  offers: BuyOffer[];
  bank: Record<string, number>;
  characterId: number;
  vocation?: string;
  combatLevel?: number;
  gold: number;
  send: (msg: ClientMessage) => void;
  fmt: (n: number) => string;
  filters: MarketFilters;
  onFiltersChange: (patch: Partial<MarketFilters>) => void;
  vocation?: string;
  lang: string;
}) {
  const { fmt } = props;
  const [query, setQuery] = useState('');
  const others = useMemo(
    () =>
      filterAndSortMarket(
        props.offers.filter((o) => o.buyerId !== props.characterId),
        query,
        props.filters,
        props.vocation,
        props.lang,
      ),
    [props.offers, props.characterId, query, props.filters, props.vocation, props.lang],
  );
  const mine = props.offers.filter((o) => o.buyerId === props.characterId);
  return (
    <>
      <p className="small">
        {tr(
          'Publique o que você quer comprar: o ouro fica reservado e quem tiver o item vende para você na hora, mesmo com você offline.',
          'Post what you want to buy: the gold is reserved and anyone with the item can sell it to you right away, even while you are offline.',
        )}
      </p>
      <OfferForm gold={props.gold} send={props.send} fmt={fmt} />
      <h4>{tr('Pedidos de compra', 'Buy orders')}</h4>
      <MarketFilterBar query={query} onQuery={setQuery} filters={props.filters} onChange={props.onFiltersChange} />
      {others.length === 0 ? (
        <p className="muted">{tr('Ninguém está comprando isso agora.', 'Nobody is buying that right now.')}</p>
      ) : (
        <ul className="market-list">
          {others.map((o) => (
            <FillRow key={o.id} offer={o} have={props.bank[o.item] ?? 0} send={props.send} fmt={fmt} />
          ))}
        </ul>
      )}
      <h4>{tr('Seus pedidos', 'Your orders')}</h4>
      {mine.length === 0 ? (
        <p className="muted">{tr('Você não tem pedidos de compra.', 'You have no buy orders.')}</p>
      ) : (
        <ul className="market-list">
          {mine.map((o) => (
            <li key={o.id} className="market-row">
              <ItemCell id={o.item} qty={o.qty} fmt={fmt} />
              <span className="price">{fmt(o.price)} {t('shop.each')}</span>
              <button className="primary small-btn" onClick={() => props.send({ type: 'market_offer_cancel', offer: o.id })}>
                {tr('Cancelar', 'Cancel')} (+{fmt(o.qty * o.price)})
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FillRow(props: { offer: BuyOffer; have: number; send: (msg: ClientMessage) => void; fmt: (n: number) => string }) {
  const { offer: o, fmt } = props;
  const max = Math.min(o.qty, props.have);
  const [qty, setQty] = useState(Math.max(1, max));
  const n = Math.max(1, Math.min(max, Math.floor(qty) || 1));
  return (
    <li className="market-row">
      <ItemCell id={o.item} qty={o.qty} fmt={fmt} />
      <span className="small">{tr('compra', 'wanted by')} {o.buyer}</span>
      <span className="price">{fmt(o.price)} {t('shop.each')}</span>
      <input className="qty-input" type="number" min={1} max={Math.max(1, max)} value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label={tr('Quantidade', 'Quantity')} />
      <button className="primary small-btn" disabled={max < 1} onClick={() => props.send({ type: 'market_fill', offer: o.id, qty: n })}>
        {max < 1 ? tr('Você não tem', 'You have none') : `${tr('Vender', 'Sell')} (+${fmt(n * o.price)})`}
      </button>
    </li>
  );
}

const RARITY_EN = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

/** Formulário do pedido de compra: qualquer item que se negocia (procura pelo nome). */
function OfferForm(props: { gold: number; send: (msg: ClientMessage) => void; fmt: (n: number) => string }) {
  const { fmt } = props;
  const tradable = useMemo(
    () => ITEMS.filter((i) => i.id !== GOLD && !i.questItem).map((i) => ({ id: i.id, name: itemName(i.name) })).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const [name, setName] = useState('');
  const [qty, setQty] = useState(100);
  const [price, setPrice] = useState(10);
  const [tier, setTier] = useState(0);
  const item = tradable.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
  // Equipamento tem raridade: o pedido é de uma raridade exata (id "peça+N").
  const hasRarity = !!item && !!itemById(item.id)?.equip && !itemById(item.id)?.legendary;
  const offerId = item ? (hasRarity && tier > 0 ? `${item.id}+${tier}` : item.id) : '';
  const total = Math.floor(qty) * Math.floor(price) || 0;
  const valid = !!item && qty >= 1 && price >= 1 && total <= props.gold;
  return (
    <form
      className="sell-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) props.send({ type: 'market_offer', item: offerId, qty: Math.floor(qty), price: Math.floor(price) });
      }}
    >
      <label>
        Item
        <input list="wanted-items" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Digite o nome', 'Type the name')} />
        <datalist id="wanted-items">
          {tradable.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
      </label>
      {hasRarity && (
        <label>
          {tr('Raridade', 'Rarity')}
          <select value={tier} onChange={(e) => setTier(Number(e.target.value))} style={{ color: RARITIES[tier].color }}>
            {RARITIES.map((r) => (
              <option key={r.tier} value={r.tier} style={{ color: r.color }}>
                {tr(r.name, RARITY_EN[r.tier])}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {t('market.quantity')}
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
      </label>
      <label>
        {t('market.price_per_unit')}
        <input type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </label>
      <button className="primary" disabled={!valid}>
        {tr('Publicar pedido', 'Post order')} ({fmt(total)} {t('common.gold')})
      </button>
    </form>
  );
}
