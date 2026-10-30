import { useState } from 'react';
import { BOSS_NIGHTMARE, HUNTS, LAIR_GATHER_MS, huntNode, itemById, levelGap, monsterById } from '@grimhold/shared';
import { lairIK, LAIR_IK_GAP } from '@grimhold/shared';
import { MonsterSprite } from './Battle.tsx';
import { Pix } from './Pix.tsx';
import { HuntWeaknesses } from './ElementTags.tsx';
import { getLang, itemName, storyText, t, tr } from './i18n.ts';

// Set: peça que se equipa; parte da arma: o resto (só serve para montar a arma).
const isSetPiece = (id: string) => !!itemById(id)?.equip;

/**
 * Aba Chefes (na janela de caçada): os covis dos deuses do Grimhold. Uma luta contra o chefe por
 * entrada e 16 h de cooldown (também para quem entra pela party), com chance de soltar o set do
 * deus e as partes da arma divina (que só sai na criação). Em party no mesmo covil, lutam juntos.
 */
export function LairList(props: {
  combatLevel: number;
  current: string | null;
  inParty: boolean;
  /** Até quando (ms) cada covil está em cooldown. */
  cooldowns: Record<string, number>;
  now: number;
  /** Abates de cada espécie (libera o Pesadelo de quem já venceu o chefe). */
  kills?: Record<string, number>;
  onPick: (node: string) => void;
}) {
  const fmt = (n: number) => n.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
  const list = HUNTS.filter((h) => h.lair).sort((a, b) => a.level - b.level);
  const [nightmare, setNightmare] = useState(false);
  return (
    <>
      <p className="small instance-intro">
        {tr(
          'Chefes para enfrentar de novo a cada 16 horas: uma luta por entrada e 16 horas de cooldown depois de entrar (vencendo, morrendo ou saindo). Os covis simples (10 a 65) soltam pouco. Os dos deuses (80 em diante) têm chance de soltar uma peça do set do deus ou uma parte da arma divina, que só sai na Forja ou no Artesanato juntando as 3 partes; o Avatar do deus no chefe global também solta.',
          "Bosses to face again every 16 hours: one fight per entry and a 16-hour cooldown after entering (win, die or leave). The simple lairs (10 to 65) drop little. The gods' lairs (80 and up) can drop a piece of the god's set or a part of the divine weapon, which is only made at Smithing or Crafting from its 3 parts; the god's Avatar at the world boss drops them too.",
        )}
      </p>
      <div className="lair-group-tip">
        <strong>
          <Pix name="ui_star" /> {tr('Dá para enfrentar esses chefes em grupo!', 'You can fight these bosses as a group!')}
          {props.inParty && <span className="loot-pos"> {tr('(você está numa party)', "(you're in a party)")}</span>}
        </strong>
        <ol className="small">
          <li>{tr('Forme a party: abra o Grupo, digite o nome do amigo e clique em Convidar.', "Form a party: open Party, type your friend's name and click Invite.")}</li>
          <li>{tr('Um de vocês entra no covil aqui na aba Chefes. Em party, a luta espera ' + LAIR_GATHER_MS / 1000 + ' segundos na entrada.', 'One of you enters the lair here in the Bosses tab. In a party, the fight waits ' + LAIR_GATHER_MS / 1000 + ' seconds at the entrance.')}</li>
          <li>{tr('Nesse tempo, os outros abrem o Grupo e clicam em "Ir até ele" no nome de quem entrou.', 'Meanwhile, the others open Party and click "Join" on whoever entered.')}</li>
          <li>{tr('Vocês lutam juntos: o chefe apanha de todos, divide os ataques entre o grupo e cai na mesma hora para todo mundo.', 'You fight together: the boss takes hits from everyone, splits its attacks among the group and falls at the same moment for all.')}</li>
        </ol>
        <p className="small low">
          {tr('Cada um sorteia o próprio drop e ganha o próprio cooldown de 16 h. Quem chegar depois que a luta começou luta sozinho. Vocações diferentes ainda dão o buff de party: Guerreiro -8% de dano sofrido, Caçador +10% no ataque básico, Arcanista +10% nas magias, Devoto +15% de cura.', 'Everyone rolls their own drop and gets their own 16 h cooldown. Whoever arrives after the fight starts fights alone. Different vocations also give the party buff: Warrior -8% damage taken, Hunter +10% basic attack, Arcanist +10% spells, Devout +15% healing.')}
        </p>
      </div>
      <div className="tabs" role="radiogroup" aria-label={tr('Dificuldade', 'Difficulty')}>
        <button role="radio" aria-checked={!nightmare} className={`tab ${!nightmare ? 'on' : ''}`} onClick={() => setNightmare(false)}>
          Normal
        </button>
        <button
          role="radio"
          aria-checked={nightmare}
          className={`tab diff-nightmare ${nightmare ? 'on' : ''}`}
          title={tr(`Pesadelo: +16 níveis, ${BOSS_NIGHTMARE.hp}x vida, +50% dano, 1,8x XP e 2x drop. Libera depois de vencer o chefe uma vez; o cooldown é o mesmo (16 h).`, `Nightmare: +16 levels, ${BOSS_NIGHTMARE.hp}x HP, +50% damage, 1.8x XP and 2x drops. Unlocks after beating the boss once; same cooldown.`)}
          onClick={() => setNightmare(true)}
        >
          {tr('Pesadelo', 'Nightmare')}
        </button>
      </div>
      <ul className="hunt-cards">
        {list.map((h) => {
          const node = huntNode(h.id, nightmare ? 'nightmare' : 'normal');
          const nmLocked = nightmare && !((props.kills ?? {})[h.monsters[0]] > 0);
          const boss = monsterById(h.monsters[0]);
          const rare = (boss?.loot ?? []).filter((l) => itemById(l.item)?.legendary);
          const armor = rare.filter((l) => isSetPiece(l.item));
          const parts = rare.filter((l) => !isSetPiece(l.item));
          const gap = levelGap(h.level, props.combatLevel);
          const odds = (l: { chance: number }[]) => (l.length ? `${fmt(Math.round(l[0].chance * 1000) / 10)}%` : '');
          const left = (props.cooldowns[h.id] ?? 0) - props.now;
          const mins = Math.ceil(left / 60_000);
          const icons = (l: { item: string }[]) =>
            l.map(({ item }) => {
              const it = itemById(item)!;
              return <img key={item} className="icon tiny" src={`/assets/icons/${it.icon}.png`} alt="" title={itemName(it.name)} />;
            });
          return (
            <li key={h.id} className={`hunt-card boss instance-card ${props.current === node ? 'active' : ''}`}>
              <button className="hunt-card-body" disabled={nmLocked} onClick={() => props.onPick(node)}>
                <span className="hunt-thumb">
                  <MonsterSprite sprite={boss?.sprite ?? ''} height={60} />
                </span>
                <span className="hunt-text">
                  <strong>{storyText(h.name)}</strong>
                  <span className="small">
                    {tr('Chefe', 'Boss')}: {storyText(boss?.name ?? '')} · {storyText(h.region)}
                  </span>
                  {armor.length > 0 ? (
                    <>
                      <span className="small">
                        {tr('Set', 'Set')} ({odds(armor)} {tr('cada', 'each')}): {icons(armor)}
                      </span>
                      <span className="small">
                        {tr('Partes da arma', 'Weapon parts')} ({odds(parts)} {tr('cada', 'each')}): {icons(parts)}
                      </span>
                    </>
                  ) : (
                    <span className="small">{tr('Chefe simples: ouro, um pouco de material e, às vezes, um equipamento.', 'Simple boss: gold, some materials and sometimes a piece of gear.')}</span>
                  )}
                  <HuntWeaknesses monsters={h.monsters} />
                </span>
              </button>
              <footer className="hunt-foot small">
                {left > 0 ? (
                  <span className="danger">
                    {tr('Volta em', 'Back in')} {Math.floor(mins / 60)}h {mins % 60}min
                  </span>
                ) : (
                  <span className="loot-pos">{tr('Disponível · 1 luta, 16 h de cooldown', 'Available · 1 fight, 16 h cooldown')}</span>
                )}
                <span className={props.combatLevel < h.level ? 'danger' : ''}>
                  {t('hunt.level')} {h.level}+
                </span>
              </footer>
              {lairIK(h, props.combatLevel) && (
                <p className="hunt-gap small danger">
                  <Pix name="ui_lock" /> {tr(`Abaixo do nível ${h.level - LAIR_IK_GAP}: o chefe te derruba no primeiro golpe.`, `Below level ${h.level - LAIR_IK_GAP}: the boss takes you down with the first hit.`)}
                </p>
              )}
              {nmLocked && <p className="hunt-gap small danger"><Pix name="ui_lock" /> {tr('Vença o chefe uma vez para liberar o Pesadelo.', 'Beat the boss once to unlock Nightmare.')}</p>}
              {gap.attack > 0 && (
                <p className="hunt-gap small danger">
                  {tr(`Acima do seu nível: o chefe tem +${Math.round(gap.attack * 100)}% de ataque`, `Above your level: the boss has +${Math.round(gap.attack * 100)}% attack`)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
