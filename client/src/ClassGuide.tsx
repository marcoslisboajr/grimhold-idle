import { useState } from 'react';
import {
  EQUIP_SLOTS,
  ITEMS,
  STORIES,
  GUIDE_LEVELS,
  VOCATIONS,
  guideFor,
  itemById,
  itemSources,
  itemUses,
  monsterById,
  type Item,
  type GuideKind,
  type ItemSource,
  type EquipSlot,
} from '@grimhold/shared';
import { itemName, storyText, t, tr } from './i18n.ts';
import { bonusText, vocationNames } from './Home.tsx';
import { StatDiff, UpgradeArrow, upgradeVs } from './compare.tsx';

const SHOP_NAMES: Record<string, [string, string]> = {
  armor: ['Armeiro', 'Armorer'],
  weapons: ['Armas', 'Weapons'],
  jewelry: ['Joalheiro', 'Jeweler'],
  runes: ['Runista', 'Rune shop'],
  potions: ['Alquimista', 'Alchemist'],
};

const pct = (n: number) => `${n >= 0.1 ? Math.round(n * 100) : Math.round(n * 1000) / 10}%`;
const name = (id: string) => itemName(itemById(id)?.name ?? id);

/** Uma linha de "como conseguir"; materiais abrem as próprias fontes ao clicar (até 3 níveis). */
function Source(props: { s: ItemSource; depth: number }) {
  const { s } = props;
  if (s.kind === 'craft') {
    return (
      <li>
        <b>{tr('Fazer', 'Craft')}</b>: {t(`skill.${s.skill}`)} {tr('nível', 'level')} {s.level} —{' '}
        {Object.entries(s.inputs).map(([id, qty], i) => (
          <span key={id}>
            {i > 0 && ', '}
            <Material id={id} qty={qty} depth={props.depth} />
          </span>
        ))}
      </li>
    );
  }
  if (s.kind === 'gather') return <li><b>{tr('Coletar', 'Gather')}</b>: {t(`skill.${s.skill}`)} {tr('nível', 'level')} {s.level} ({storyText(s.node)})</li>;
  if (s.kind === 'hunt_gear') return <li><b>{tr('Cai em caçadas', 'Drops in hunts')}</b> {tr('do nível', 'of level')} {s.maxLevel >= 999 ? `${s.minLevel}+` : `${s.minLevel}–${s.maxLevel}`} {tr('(peça aleatória da faixa)', '(random piece of the tier)')}</li>;
  if (s.kind === 'shop') return <li><b>{tr('Loja', 'Shop')}</b>: {tr(...SHOP_NAMES[s.shop])} {tr('na cidade', 'in town')}</li>;
  if (s.kind === 'world_boss') return <li><b>{tr('Chefe mundial', 'World boss')}</b>: {storyText(s.boss)} {tr('(cai raro para quem ajuda)', '(rare drop for helpers)')}</li>;
  if (s.kind === 'arena') return <li><b>{tr('Arena', 'Arena')}</b>: {storyText(s.arena)} ({tr('nível', 'level')} {s.level}) {tr('— baú de arma ao vencer', '— weapon chest on win')}</li>;
  if (s.kind === 'quest') return <li><b>{tr('Quest', 'Quest')}</b>: {storyText(s.story)} ({tr('nível', 'level')} {s.level})</li>;
  if (s.kind === 'pouch') return <li><b>{tr('Bolsa de armas', 'Weapon pouch')}</b>: {name(s.pouch)} {tr('(arma sorteada)', '(random weapon)')}</li>;
  if (s.kind === 'note') return <li>{tr(s.pt, s.en)}</li>;
  if (s.kind === 'tokens') return <li><b>{tr('Fichas de chefe', 'Boss tokens')}</b>: {s.price} {tr('com o Valdemar', 'at Valdemar')}</li>;
  const m = monsterById(s.monster);
  const hunts = s.hunts.slice(0, 3).map((h) => `${storyText(h.name)} (${h.level})`).join(', ');
  return (
    <li>
      <b>{s.boss ? tr('Chefe', 'Boss') : 'Drop'}</b>: {storyText(m?.name ?? s.monster)} — {s.quest ? tr(`só durante a quest ${storyText(STORIES.find((x) => x.id === s.quest)?.name ?? s.quest)}`, `only during the quest ${storyText(STORIES.find((x) => x.id === s.quest)?.name ?? s.quest)}`) : pct(s.chance)}
      {hunts && <> · {hunts}{s.hunts.length > 3 ? '…' : ''}</>}
    </li>
  );
}

function Material(props: { id: string; qty: number; depth: number }) {
  const [open, setOpen] = useState(false);
  const sources = itemSources(props.id);
  const label = `${props.qty}× ${name(props.id)}`;
  if (!sources.length || props.depth >= 3) return <span>{label}</span>;
  return (
    <span className="guide-mat">
      <button type="button" className="link-btn" onClick={() => setOpen(!open)}>
        {label} {open ? '▴' : '▾'}
      </button>
      {open && <Sources id={props.id} depth={props.depth + 1} />}
    </span>
  );
}

function Sources(props: { id: string; depth: number }) {
  // Muitos monstros soltam o mesmo material: mostra os 4 de chance maior.
  const all = itemSources(props.id);
  const drops = all.flatMap((s) => (s.kind === 'drop' ? [s] : [])).sort((a, b) => b.chance - a.chance);
  const list: ItemSource[] = [...all.filter((s) => s.kind !== 'drop'), ...drops.slice(0, 4)];
  return (
    <ul className="guide-src">
      {list.map((s, i) => <Source key={i} s={s} depth={props.depth} />)}
      {drops.length > 4 && <li className="small">{tr(`e mais ${drops.length - 4} monstros`, `and ${drops.length - 4} more monsters`)}</li>}
    </ul>
  );
}

const KIND_LABEL: Record<GuideKind, [string, string]> = {
  craft: ['Fazer ou comprar', 'Craft or buy'],
  drop: ['Drop de caçada', 'Hunt drop'],
  boss: ['Chefe', 'Boss'],
  reward: ['Recompensa (quest ou arena)', 'Reward (quest or arena)'],
};

function Piece(props: { item: Item; kinds: GuideKind[]; rare?: boolean; equipment?: Partial<Record<EquipSlot, string>> }) {
  const e = props.item.equip!;
  return (
    <div className={`guide-piece ${props.rare ? 'rare' : ''}`}>
      <div className="guide-kind">{props.kinds.map((k) => tr(...KIND_LABEL[k])).join(' · ')}</div>
      <div className="guide-head">
        <img src={`/assets/icons/${props.item.icon}.png`} alt="" width={32} height={32} />
        <div>
          <strong>{itemName(props.item.name)}</strong>
          {props.equipment && <> <UpgradeArrow v={upgradeVs(props.item.id, props.equipment)} /></>}
          {props.rare && <span className="guide-tag">{tr('raro', 'rare')}</span>}
          <div className="small">{tr('Nível', 'Level')} {e.level} · {bonusText(e)}</div>
          {props.equipment && <div><StatDiff id={props.item.id} equipment={props.equipment} /></div>}
          <div className="small guide-vocs">
            {e.vocations ? vocationNames(e.vocations) : tr('Todas as classes', 'All classes')}
          </div>
        </div>
      </div>
      <Sources id={props.item.id} depth={0} />
    </div>
  );
}

// Busca sem acento e sem maiúscula ("espada de ferro" acha "Espada de Ferro").
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Para que serve o item (receitas, imbuements, chave, quest): até 6 e quantos mais. */
function ItemUses(props: { id: string }) {
  const uses = itemUses(props.id);
  if (!uses.length) return null;
  const text = (u: (typeof uses)[number]) =>
    u.kind === 'recipe'
      ? `${t(`skill.${u.skill}`)} ${tr('nível', 'level')} ${u.level}: ${name(u.output)}`
      : u.kind === 'imbuement'
        ? `${tr('Imbuement', 'Imbuement')}: ${storyText(u.name)}`
        : u.kind === 'key'
          ? `${tr('Chave da instância', 'Key to the instance')} ${storyText(u.hunt)} (${u.level})`
          : `${tr('Quest', 'Quest')}: ${storyText(u.story)}`;
  return (
    <div className="small guide-uses">
      <b>{tr('Serve para', 'Used for')}:</b> {uses.slice(0, 6).map(text).join(' · ')}
      {uses.length > 6 && ` · ${tr(`e mais ${uses.length - 6}`, `and ${uses.length - 6} more`)}`}
    </div>
  );
}

/** Busca de item pelo nome (português ou a língua do jogo): mostra de onde vem cada um. */
function ItemSearch(props: { equipment?: Partial<Record<EquipSlot, string>> }) {
  const [query, setQuery] = useState('');
  const q = fold(query.trim());
  const found = q.length < 2 ? [] : ITEMS.filter((it) => it.id !== 'gold' && (fold(it.name).includes(q) || fold(itemName(it.name)).includes(q))).slice(0, 12);
  return (
    <div className="guide-search">
      <input className="search" placeholder={tr('Procurar item (ex.: pena, espada de ferro)...', 'Search item (e.g. feather, iron sword)...')} value={query} onChange={(e) => setQuery(e.target.value)} />
      {q.length >= 2 && (
        <div className="guide-grid">
          {found.length === 0 && <p className="small">{tr('Nenhum item com esse nome.', 'No item with that name.')}</p>}
          {found.map((it) => (
            <section key={it.id} className="guide-slot">
              <div className="guide-head">
                <img src={`/assets/icons/${it.icon}.png`} alt="" width={32} height={32} />
                <div>
                  <strong>{itemName(it.name)}</strong>
                  {props.equipment && it.equip && <> <UpgradeArrow v={upgradeVs(it.id, props.equipment)} /></>}
                  {it.equip && <div className="small">{tr('Nível', 'Level')} {it.equip.level} · {bonusText(it.equip)}</div>}
                  {it.equip && <div className="small guide-vocs">{it.equip.vocations ? vocationNames(it.equip.vocations) : tr('Todas as classes', 'All classes')}</div>}
                </div>
              </div>
              <ItemUses id={it.id} />
              {itemSources(it.id).length ? <Sources id={it.id} depth={0} /> : <p className="small">{tr('Sem fonte no momento (item de evento ou que saiu do jogo).', 'No source right now (event item or no longer in the game).')}</p>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Guia de classes: o melhor equipamento por nível e como conseguir cada peça. */
/** Com `equipment`, cada peça da própria classe mostra a seta e a diferença para o equipado. */
export function ClassGuide(props: { vocation?: string; level?: number; equipment?: Partial<Record<EquipSlot, string>> }) {
  const [voc, setVoc] = useState(props.vocation ?? 'warrior');
  const start = GUIDE_LEVELS.filter((l) => l <= (props.level ?? 1)).at(-1) ?? 1;
  const [level, setLevel] = useState(start);
  const picks = guideFor(voc, level);
  return (
    <div className="class-guide">
      <p className="small">
        {tr(
          'O melhor equipamento de cada classe por nível, separado por jeito de conseguir: fazer ou comprar, drop de caçada, chefe e recompensa de quest ou arena. Clique num material para ver de onde ele vem. As peças marcadas como raras caem pouco.',
          'The best gear for each class by level, split by how to get it: craft or buy, hunt drop, boss, and quest or arena reward. Click a material to see where it comes from. Pieces marked rare seldom drop.',
        )}
      </p>
      <ItemSearch equipment={props.equipment} />
      <div className="char-tabs">
        {VOCATIONS.map((v) => (
          <button type="button" key={v.id} className={`small-btn ${voc === v.id ? 'on' : ''}`} onClick={() => setVoc(v.id)}>
            {vocationNames([v.id])}
          </button>
        ))}
      </div>
      <div className="char-tabs guide-levels">
        {GUIDE_LEVELS.map((l) => (
          <button type="button" key={l} className={`small-btn ${level === l ? 'on' : ''}`} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>
      <div className="guide-grid">
        {picks.map((p) => (
          <section key={p.slot + (p.group ?? '')} className="guide-slot">
            <h4>{p.group === 'grimoire' ? tr('Grimório (no lugar do escudo)', 'Spellbook (shield slot)') : t(`slot.${p.slot}`, EQUIP_SLOTS.find((s) => s.id === p.slot)?.name ?? p.slot)}</h4>
            {p.options.length ? (
              p.options.map((o) => <Piece key={o.item.id} item={o.item} kinds={o.kinds} rare={o.rare} equipment={voc === props.vocation ? props.equipment : undefined} />)
            ) : (
              <p className="small">{tr('Nada ainda neste nível.', 'Nothing yet at this level.')}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
