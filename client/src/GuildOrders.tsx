import { useState } from 'react';
import { GUILD_GEMS, GUILD_GEM_QTY, GUILD_RANKS, GUILD_SHOP, GUILD_TASKS, guildRankFor, guildTaskById, itemById, levelForXp, type ClientMessage, type PlayerState, type SkillId } from '@grimhold/shared';
import { getLang, itemName, tr } from './i18n.ts';

/** O verbo de cada profissão na encomenda ("Extraia 400 Minérios de Ferro"). */
const VERB: Partial<Record<SkillId, [string, string]>> = {
  mining: ['Extraia', 'Mine'], fishing: ['Pesque', 'Catch'], woodcutting: ['Corte', 'Chop'], herbalism: ['Colha', 'Gather'], soulreaping: ['Colha', 'Reap'],
  smithing: ['Faça', 'Make'], cooking: ['Cozinhe', 'Cook'], crafting: ['Faça', 'Craft'], alchemy: ['Prepare', 'Brew'], runecraft: ['Faça', 'Make'],
  fletching: ['Faça', 'Fletch'], jewelcrafting: ['Lapide', 'Craft'], sigilism: ['Faça', 'Make'],
};

/**
 * Encomendas da Guilda, no topo de cada profissão: a encomenda em andamento (uma por profissão)
 * ou as que dá para aceitar, os Selos do Artesão, a patente e a loja.
 */
export function GuildOrders(props: { skill: SkillId; state: PlayerState; send: (cmd: ClientMessage) => void }) {
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const fmt = (n: number) => n.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
  const level = levelForXp(props.state.skills[props.skill] ?? 0, props.skill);
  const points = props.state.guildPoints ?? 0;
  const balance = points - (props.state.guildSpent ?? 0);
  const rank = guildRankFor(points);
  const next = GUILD_RANKS.find((r) => r.minPoints > points);
  const current = (props.state.guildTasks ?? []).find((t) => guildTaskById(t.id)?.skill === props.skill);
  const def = current ? guildTaskById(current.id) : undefined;
  const offers = GUILD_TASKS.filter((t) => t.skill === props.skill);
  const label = (d: NonNullable<typeof def>) => {
    const [pt, en] = VERB[d.skill] ?? ['Faça', 'Make'];
    const it = itemById(d.item);
    return `${tr(pt, en)} ${fmt(d.count)} ${itemName(it?.name ?? d.item)}`;
  };
  const reward = (d: NonNullable<typeof def>) => tr(`${fmt(d.xp)} XP · ${fmt(d.gold)} de ouro · ${d.points} Selos`, `${fmt(d.xp)} XP · ${fmt(d.gold)} gold · ${d.points} Seals`);
  if (offers.length === 0) return null;
  return (
    <section className="panel guild-orders">
      <header className="guild-head">
        <strong>{tr('Encomendas da Guilda', 'Guild Orders')}</strong>
        <span className="small">
          {getLang() === 'pt' ? rank.name : rank.en} · {fmt(balance)} {tr('Selos do Artesão', 'Artisan Seals')}
          {rank.bonus > 0 && <span> · {tr(`+${Math.round(rank.bonus * 100)}% de XP e velocidade nas profissões`, `+${Math.round(rank.bonus * 100)}% profession XP and speed`)}</span>}
          {(props.state.artisanKitUntil ?? 0) > Date.now() && (
            <span className="good"> · {tr(`Kit do Artesão ativo: +25% de velocidade (${Math.ceil(((props.state.artisanKitUntil ?? 0) - Date.now()) / 60_000)} min)`, `Artisan Kit active: +25% speed (${Math.ceil(((props.state.artisanKitUntil ?? 0) - Date.now()) / 60_000)} min)`)}</span>
          )}
          {next && <span className="muted"> ({tr(`${next.minPoints - points} para ${next.name}: +${Math.round(next.bonus * 100)}%`, `${next.minPoints - points} to ${next.en}: +${Math.round(next.bonus * 100)}%`)})</span>}
        </span>
        <button className="small-btn" onClick={() => setShop((v) => !v)}>{tr('Loja', 'Shop')}</button>
      </header>
      {shop && (
        <div className="guild-shop small">
          <button className="small-btn" disabled={balance < GUILD_SHOP.xp_boost.price} onClick={() => props.send({ type: 'guild_buy', item: 'xp_boost' })}>
            {tr(`XP em dobro por 1 h (${GUILD_SHOP.xp_boost.price} Selos)`, `Double XP for 1 h (${GUILD_SHOP.xp_boost.price} Seals)`)}
          </button>
          <button className="small-btn" disabled={balance < GUILD_SHOP.artisan_kit.price} onClick={() => props.send({ type: 'guild_buy', item: 'artisan_kit' })} title={tr('+25% de velocidade em todas as profissões por 2 h.', '+25% speed in every profession for 2 h.')}>
            {tr(`Kit do Artesão: +25% de velocidade por 2 h (${GUILD_SHOP.artisan_kit.price} Selos)`, `Artisan Kit: +25% speed for 2 h (${GUILD_SHOP.artisan_kit.price} Seals)`)}
          </button>
          <span>{tr(`${GUILD_GEM_QTY} gemas à escolha (${GUILD_SHOP.gem.price} Selos):`, `${GUILD_GEM_QTY} gems of your choice (${GUILD_SHOP.gem.price} Seals):`)}</span>
          {GUILD_GEMS.map((g) => (
            <button key={g} className="small-btn" disabled={balance < GUILD_SHOP.gem.price} onClick={() => props.send({ type: 'guild_buy', item: 'gem', gem: g })}>
              {itemName(itemById(g)?.name ?? g)}
            </button>
          ))}
          <span className="muted">
            {tr('Patentes (Selos ganhos, gastar não tira): ', 'Ranks (Seals earned, spending keeps them): ')}
            {GUILD_RANKS.slice(1).map((r) => `${getLang() === 'pt' ? r.name : r.en} ${r.minPoints} (+${Math.round(r.bonus * 100)}%)`).join(' · ')}
            {tr('. O Grão-Mestre também dá o traje Artesão (visual) e +5% de XP nas profissões de criação com a roupa de Artesão completa.', '. Grandmaster also gives the Artisan look and +5% XP in crafting professions with the full Artisan outfit.')}
          </span>
        </div>
      )}
      {def && current ? (
        <div className="guild-current">
          <span>{label(def)}</span>
          <div className="bar">
            <div className="fill" style={{ width: `${Math.min(100, (current.progress / def.count) * 100)}%` }} />
          </div>
          <span className="small">
            {fmt(Math.min(current.progress, def.count))}/{fmt(def.count)} · {reward(def)}
          </span>
          <span className="guild-actions">
            {current.status === 'ready' ? (
              <button className="primary small-btn" onClick={() => props.send({ type: 'guild_claim', taskId: def.id })}>{tr('Entregar', 'Turn in')}</button>
            ) : (
              <span className="small muted">{tr('Conta sozinho enquanto a profissão roda.', 'Counts by itself while the profession runs.')}</span>
            )}
            {/* Dois cliques (o confirm do navegador pode estar bloqueado): o progresso se perde. */}
            <button className="small-btn" onClick={() => (confirmCancel ? (props.send({ type: 'guild_cancel', taskId: def.id }), setConfirmCancel(false)) : setConfirmCancel(true))}>
              {confirmCancel ? tr('Confirmar: perde o progresso', 'Confirm: lose progress') : tr('Cancelar', 'Cancel')}
            </button>
          </span>
        </div>
      ) : (
        <>
          <button className="small-btn" onClick={() => setOpen((v) => !v)}>
            {open ? tr('Esconder encomendas', 'Hide orders') : tr(`Ver encomendas (${offers.length})`, `See orders (${offers.length})`)}
          </button>
          {open && (
            <ul className="guild-list small">
              {offers.map((d) => (
                <li key={d.id} className={level < d.level ? 'dim' : ''}>
                  <span>
                    <b>{label(d)}</b> · {tr('nível', 'level')} {d.level}
                    <br />
                    <span className="muted">{reward(d)}</span>
                  </span>
                  <button className="primary small-btn" disabled={level < d.level} onClick={() => props.send({ type: 'guild_start', taskId: d.id })}>
                    {tr('Aceitar', 'Accept')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
