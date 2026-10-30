import { ELEMENTS, monsterAttackElement, monsterById, type Element } from '@grimhold/shared';
import { getLang, tr } from './i18n.ts';

const name = (el: Element) => (getLang() === 'pt' ? ELEMENTS[el].pt : ELEMENTS[el].en);

/** Ícone em pixel de um elemento (ou do físico), com o nome no tooltip. */
export function ElementIcon(props: { el: Element | 'physical' }) {
  const title = props.el === 'physical' ? tr('Físico', 'Physical') : name(props.el);
  return <img className="icon tiny element-icon" src={`/assets/icons/element_${props.el}.png`} alt={title} title={title} />;
}

/** Ícones dos elementos de uma lista. */
function Icons(props: { list: (Element | 'physical')[] }) {
  return (
    <>
      {props.list.map((el) => (
        // O nome ao lado do ícone (antes só no tooltip, que não existe no celular).
        <span key={el} className="element-chip">
          <ElementIcon el={el} /> {el === 'physical' ? tr('Físico', 'Physical') : name(el)}
        </span>
      ))}
    </>
  );
}

/** Fraquezas e resistências de um monstro ("Fraco a [fogo] · Resiste a [água]"). */
export function MonsterElements(props: { id: string }) {
  const m = monsterById(props.id);
  if (!m?.weak?.length && !m?.resist?.length) return <span className="small muted">{tr('Sem fraqueza a elementos', 'No elemental weakness')}</span>;
  return (
    <span className="small element-tags">
      {m.weak?.length ? (
        <>
          {tr('Fraco a', 'Weak to')} <Icons list={m.weak} />
        </>
      ) : null}
      {m.weak?.length && m.resist?.length ? ' · ' : ''}
      {m.resist?.length ? (
        <>
          {tr('Resiste a', 'Resists')} <Icons list={m.resist} />
        </>
      ) : null}
    </span>
  );
}

/** Fraquezas que aparecem entre os monstros de uma caçada (para escolher a arma). */
export function HuntWeaknesses(props: { monsters: string[] }) {
  const weak = [...new Set(props.monsters.flatMap((id) => monsterById(id)?.weak ?? []))];
  // O golpe dos monstros tem parte do elemento deles (resistência a ele, dos anéis e colares, corta essa parte).
  const hits = [...new Set(props.monsters.flatMap((id) => { const m = monsterById(id); const el = m && monsterAttackElement(m); return el ? [el] : []; }))];
  if (!weak.length && !hits.length) return null;
  return (
    <>
      {weak.length > 0 && (
        <span className="small element-tags" title={tr('Elementos que estes monstros sofrem mais', 'Elements these monsters are weak to')}>
          {tr('Fraquezas:', 'Weak to:')} <Icons list={weak} />
        </span>
      )}
      {hits.length > 0 && (
        <span className="small element-tags" title={tr('Parte do golpe destes monstros é deste elemento: resistência a ele (anéis e colares da Joalheria) diminui o dano', "Part of these monsters' hits is this element: resistance to it (Jewelcrafting rings and necklaces) lowers the damage")}>
          {tr('Ataque:', 'Attack:')} <Icons list={hits} />
        </span>
      )}
    </>
  );
}
