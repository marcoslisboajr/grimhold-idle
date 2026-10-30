import {
  HUNTS,
  huntNode,
  instanceChestGold,
  instanceDailyXp,
  instanceKills,
  instanceMaxPack,
  INSTANCE_PACK_CHOICES,
  BOSS_NIGHTMARE,
  itemById,
  levelGap,
  monsterById,
  questInstanceOpen,
  storyById,
  type StoryState,
} from '@grimhold/shared';
import { bossMinLevel } from '@grimhold/shared';
import { MonsterSprite } from './Battle.tsx';
import { HuntWeaknesses } from './ElementTags.tsx';
import { Pix } from './Pix.tsx';
import { getLang, itemName, storyText, t, tr } from './i18n.ts';
import { useState } from 'react';

/**
 * Aba Instâncias (na janela de caçada): limpa as ondas de monstros e enfrenta o chefe.
 * A chave só é gasta no chefe; a primeira vitória do dia em cada uma não gasta chave
 * e dá XP bônus e o Baú da Instância.
 */
export function InstanceList(props: {
  combatLevel: number;
  bank: Record<string, number>;
  current: string | null;
  instanceClears: Record<string, { day: string; total: number }>;
  /** Dia em que a tentativa grátis de cada uma foi usada (ao entrar). */
  instanceFree: Record<string, string>;
  today: string;
  onPick: (node: string) => void;
}) {
  const fmt = (n: number) => n.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
  const list = HUNTS.filter((h) => h.boss && !h.quest).sort((a, b) => a.level - b.level);
  // Bando da limpeza (1 = o de sempre, crescendo devagar) e Pesadelo.
  const [pack, setPack] = useState(1);
  const [nightmare, setNightmare] = useState(false);
  const doneToday = list.filter((h) => props.instanceClears[h.id]?.day === props.today).length;
  return (
    <>
      <p className="small instance-intro">
        {tr(
          'Limpe as ondas de monstros e enfrente o chefe. A chave só é gasta quando o chefe aparece. A primeira entrada do dia em cada instância é grátis (não gasta chave) e, vencendo, dá XP bônus e o Baú da Instância. Morrer ou sair gasta a tentativa grátis. Na 2ª entrada do dia os monstros dão 40% da XP, e da 3ª em diante 10%.',
          'Clear the monster waves and face the boss. The key is only used when the boss appears. Your first entry of the day in each instance is free (no key) and, if you win, gives bonus XP and the Instance Chest. Dying or leaving uses up the free try. On your 2nd entry of the day monsters give 40% XP, and from the 3rd on 10%.',
        )}{' '}
        <b>
          {tr('Hoje', 'Today')}: {doneToday}/{list.length}
        </b>
      </p>
      <div className="picker-tools">
        <div className="tabs" role="radiogroup" aria-label={tr('Dificuldade', 'Difficulty')}>
          <button role="radio" aria-checked={!nightmare} className={`tab ${!nightmare ? 'on' : ''}`} onClick={() => setNightmare(false)}>
            Normal
          </button>
          <button
            role="radio"
            aria-checked={nightmare}
            className={`tab diff-nightmare ${nightmare ? 'on' : ''}`}
            title={tr(`Pesadelo: +16 níveis, ${BOSS_NIGHTMARE.hp}x vida, +50% dano, 1,8x XP e 2x drop; gasta ${BOSS_NIGHTMARE.keys} chaves. Libera depois de vencer a normal.`, `Nightmare: +16 levels, ${BOSS_NIGHTMARE.hp}x HP, +50% damage, 1.8x XP and 2x drops; uses ${BOSS_NIGHTMARE.keys} keys. Unlocks after beating the normal one.`)}
            onClick={() => setNightmare(true)}
          >
            {tr('Pesadelo', 'Nightmare')}
          </button>
        </div>
        <div className="tabs" role="radiogroup" aria-label={tr('Bando da limpeza', 'Clearing pack')}>
          {INSTANCE_PACK_CHOICES.map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={pack === n}
              className={`tab ${pack === n ? 'on' : ''}`}
              title={n === 1 ? tr('Bando padrão (cresce devagar, seguro)', 'Default pack (grows slowly, safe)') : tr(`${n} monstros por onda desde o começo: termina mais rápido, mais risco`, `${n} monsters per wave from the start: faster, riskier`)}
              onClick={() => setPack(n)}
            >
              {n === 1 ? tr('Padrão', 'Default') : `${n}x`}
            </button>
          ))}
        </div>
      </div>
      <ul className="hunt-cards">
        {list.map((h) => {
          const node = huntNode(h.id, nightmare ? 'nightmare' : 'normal', pack);
          const nmLocked = nightmare && !(props.instanceClears[h.id]?.total > 0);
          const boss = monsterById(h.monsters[h.monsters.length - 1]);
          const clears = props.instanceClears[h.id];
          const today = clears?.day === props.today;
          const freeUsed = props.instanceFree[h.id] === props.today;
          const keys = h.key ? (props.bank[h.key] ?? 0) : 0;
          const key = h.key ? itemById(h.key) : undefined;
          const danger = props.combatLevel < h.level;
          const gap = levelGap(h.level, props.combatLevel);
          return (
            <li key={h.id} className={`hunt-card boss instance-card ${props.current === node ? 'active' : ''} ${today ? 'done-today' : ''}`}>
              <button className="hunt-card-body" disabled={nmLocked} onClick={() => props.onPick(node)}>
                <span className="hunt-thumb">
                  <MonsterSprite sprite={boss?.sprite ?? ''} height={60} />
                </span>
                <span className="hunt-text">
                  <strong>{storyText(h.name)}</strong>
                  <span className="small">
                    {tr('Chefe', 'Boss')}: {storyText(boss?.name ?? '')}
                    {h.monsters.length > 1 && ` · ${tr('antes', 'before')}: ${h.monsters.slice(0, -1).map((m) => storyText(monsterById(m)?.name ?? '')).join(', ')}`}
                  </span>
                  <span className="small">
                    {fmt(instanceKills(h.level))} {tr('abates', 'kills')} · {pack > 1 ? tr(`ondas de ${pack}`, `waves of ${pack}`) : `${tr('ondas de até', 'waves of up to')} ${instanceMaxPack(h.level)}`} ·{' '}
                    {(h.trash ?? []).map((m) => storyText(monsterById(m)?.name ?? '')).join(', ')}
                  </span>
                  <HuntWeaknesses monsters={[...(h.trash ?? []), ...h.monsters]} />
                </span>
              </button>
              <footer className="hunt-foot small">
                {today ? (
                  <span className="loot-pos">
                    <Pix name="ui_check" /> {tr('Bônus de hoje feito', "Today's bonus done")}
                  </span>
                ) : freeUsed ? (
                  <span className="danger">{tr('Grátis de hoje usado: o chefe pede chave', "Today's free try used: the boss needs a key")}</span>
                ) : (
                  <span className="instance-daily" title={tr('Primeira vitória do dia: sem gastar chave, mais o XP e o baú', 'First win of the day: no key used, plus the XP and the chest')}>
                    <Pix name="ui_gift" /> +{fmt(instanceDailyXp(h))} XP · {fmt(instanceChestGold(h.level))} {t('common.gold')}
                  </span>
                )}
                {key && (
                  <span className={keys === 0 && freeUsed ? 'danger' : ''} title={tr(`${itemName(key.name)}: gasta 1 no chefe (a primeira do dia é grátis)`, `${itemName(key.name)}: 1 used at the boss (first of the day is free)`)}>
                    <img className="icon tiny" src={`/assets/icons/${key.icon}.png`} alt="" /> {keys}
                  </span>
                )}
                <span className={danger ? 'danger' : ''}>
                  {t('hunt.level')} {h.level}+
                </span>
              </footer>
              {props.combatLevel < bossMinLevel(h) && (
                <p className="hunt-gap small danger">
                  <Pix name="ui_lock" /> {tr(`Pede nível ${bossMinLevel(h)} de combate para entrar.`, `Requires combat level ${bossMinLevel(h)} to enter.`)}
                </p>
              )}
              {clears && <p className="hunt-gap small low">{tr('Vitórias', 'Wins')}: {clears.total}</p>}
              {nmLocked && <p className="hunt-gap small danger"><Pix name="ui_lock" /> {tr('Vença a normal uma vez para liberar o Pesadelo.', 'Beat the normal one once to unlock Nightmare.')}</p>}
              {nightmare && !nmLocked && key && <p className="hunt-gap small">{tr(`Pesadelo: o chefe gasta ${BOSS_NIGHTMARE.keys} ${itemName(key.name)}.`, `Nightmare: the boss uses ${BOSS_NIGHTMARE.keys} ${itemName(key.name)}.`)}</p>}
              {gap.attack > 0 && (
                <p className="hunt-gap small danger">
                  {tr(`Acima do seu nível: monstros com +${Math.round(gap.attack * 100)}% de ataque`, `Above your level: monsters have +${Math.round(gap.attack * 100)}% attack`)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Aba Quests (na janela de caçada): instâncias de quest. Abrem no passo da história que pede
 * vencê-las e se vencem uma vez só (sem chave, sem baú do dia e sem Pesadelo).
 */
export function QuestInstanceList(props: {
  combatLevel: number;
  current: string | null;
  stories: StoryState[];
  instanceClears: Record<string, { day: string; total: number }>;
  onPick: (node: string) => void;
}) {
  const fmt = (n: number) => n.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
  const list = HUNTS.filter((h) => h.quest).sort((a, b) => a.level - b.level);
  const [pack, setPack] = useState(1);
  return (
    <>
      <p className="small instance-intro">
        {tr(
          'Instâncias de quest: limpe as ondas e vença o chefe da história. Abrem no passo certo da quest e se vencem uma vez só. Não gastam chave. Morreu ou saiu, pode tentar de novo.',
          'Quest instances: clear the waves and beat the story boss. They open at the right quest step and are won only once. No key needed. If you die or leave, you can try again.',
        )}
      </p>
      <div className="picker-tools">
        <div className="tabs" role="radiogroup" aria-label={tr('Bando da limpeza', 'Clearing pack')}>
          {INSTANCE_PACK_CHOICES.map((n) => (
            <button key={n} role="radio" aria-checked={pack === n} className={`tab ${pack === n ? 'on' : ''}`} onClick={() => setPack(n)}>
              {n === 1 ? tr('Padrão', 'Default') : `${n}x`}
            </button>
          ))}
        </div>
      </div>
      <ul className="hunt-cards">
        {list.map((h) => {
          const node = huntNode(h.id, 'normal', pack);
          const boss = monsterById(h.monsters[h.monsters.length - 1]);
          const story = storyById(h.quest!);
          const won = (props.instanceClears[h.id]?.total ?? 0) > 0;
          const open = !won && questInstanceOpen(props.stories, h.id);
          const gap = levelGap(h.level, props.combatLevel);
          return (
            <li key={h.id} className={`hunt-card boss instance-card ${props.current === node ? 'active' : ''} ${won ? 'done-today' : ''}`}>
              <button className="hunt-card-body" disabled={!open} onClick={() => props.onPick(node)}>
                <span className="hunt-thumb">
                  <MonsterSprite sprite={boss?.sprite ?? ''} height={60} />
                </span>
                <span className="hunt-text">
                  <strong>{storyText(h.name)}</strong>
                  <span className="small">
                    {tr('Chefe', 'Boss')}: {storyText(boss?.name ?? '')} · {tr('Quest', 'Quest')}: {storyText(story?.name ?? '')}
                  </span>
                  <span className="small">
                    {fmt(instanceKills(h.level))} {tr('abates', 'kills')} · {pack > 1 ? tr(`ondas de ${pack}`, `waves of ${pack}`) : `${tr('ondas de até', 'waves of up to')} ${instanceMaxPack(h.level)}`} ·{' '}
                    {(h.trash ?? []).map((m) => storyText(monsterById(m)?.name ?? '')).join(', ')}
                  </span>
                  <HuntWeaknesses monsters={[...(h.trash ?? []), ...h.monsters]} />
                </span>
              </button>
              <footer className="hunt-foot small">
                {won ? (
                  <span className="loot-pos">
                    <Pix name="ui_check" /> {tr('Concluída', 'Completed')}
                  </span>
                ) : open ? (
                  <span className="loot-pos">{tr('Aberta: é o passo atual da quest', 'Open: it is the current quest step')}</span>
                ) : (
                  <span className="danger">
                    <Pix name="ui_lock" /> {tr(`Abre no passo certo de ${story?.name ?? ''}`, `Opens at the right step of ${storyText(story?.name ?? '')}`)}
                  </span>
                )}
                <span className={props.combatLevel < h.level ? 'danger' : ''}>
                  {t('hunt.level')} {h.level}+
                </span>
              </footer>
              {props.combatLevel < bossMinLevel(h) && (
                <p className="hunt-gap small danger">
                  <Pix name="ui_lock" /> {tr(`Pede nível ${bossMinLevel(h)} de combate para entrar.`, `Requires combat level ${bossMinLevel(h)} to enter.`)}
                </p>
              )}
              {gap.attack > 0 && (
                <p className="hunt-gap small danger">
                  {tr(`Acima do seu nível: monstros com +${Math.round(gap.attack * 100)}% de ataque`, `Above your level: monsters have +${Math.round(gap.attack * 100)}% attack`)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
