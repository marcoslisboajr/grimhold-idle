import { useState } from 'react';
import {
  NO_SLAYER,
  SLAYER_MASTERS,
  SLAYER_MONSTER_LEVEL,
  levelForXp,
  levelProgress,
  monsterById,
  slayerMasterById,
  slayerStreakMult,
  slayerXpPerKill,
  slayerCandidates,
  SLAYER_SHOP,
  SLAYER_BOOSTS,
  SLAYER_SIZES,
  SLAYER_BOSS_LEVEL,
  SLAYER_BOSS_XP_MULT,
  HUNTS,
  slayerTaskPoints,
  type SlayerBoostId,
  type SlayerSize,
  itemById,
  type SlayerMaster,
  type ClientMessage,
  type PlayerState,
  type SlayerState,
} from '@grimhold/shared';
import { MonsterSprite } from './Battle.tsx';
import { getLang, storyText, tr } from './i18n.ts';

/** "Slayer: 87/150 Lobos" para a tela da caçada (null sem tarefa). */
export function slayerTaskLine(st?: SlayerState): string | null {
  if (!st?.monster) return null;
  const name = storyText(monsterById(st.monster)?.name ?? st.monster);
  return `Slayer: ${st.progress}/${st.target} ${name}`;
}

/** Mestres de Slayer (no Bastião): pedir tarefa, ver o progresso e cancelar. Loja vem depois. */
export function SlayerPanel(props: { state: PlayerState; combatLevel: number; send: (cmd: ClientMessage) => void; onClose: () => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [tab, setTab] = useState<'masters' | 'shop'>('masters');
  const fmt = (n: number) => n.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
  const st = props.state.slayer ?? NO_SLAYER;
  const xp = props.state.skills.slayer ?? 0;
  const level = levelForXp(xp, 'slayer');
  const master = st.master ? slayerMasterById(st.master) : undefined;
  const monster = st.monster ? monsterById(st.monster) : undefined;
  const bossInfo = st.monster && st.size === 'boss' ? SLAYER_BOSS_LEVEL.get(st.monster) : undefined;
  const mLevel = st.monster ? (bossInfo?.level ?? SLAYER_MONSTER_LEVEL.get(st.monster) ?? 1) : 1;
  const bossHunt = bossInfo ? HUNTS.find((h) => h.id === bossInfo.hunt) : undefined;
  const nextMult = slayerStreakMult(st.streak + 1);
  const mName = (m?: SlayerMaster) => (m ? (getLang() === 'pt' ? m.name : m.nameEn) : '');
  const pct = Math.min(100, (st.progress / Math.max(1, st.target)) * 100);
  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker slayer-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Slayer">
        <header className="picker-head">
          <div>
            <h3 style={{ margin: 0 }}>{tr('Slayer', 'Slayer')}</h3>
            <span className="small" style={{ opacity: 0.8 }}>{tr('Caçadores de recompensa do Bastião', 'Bounty hunters of the Bastion')}</span>
          </div>
          <button className="close" onClick={props.onClose} aria-label={tr('Fechar', 'Close')}>
            ×
          </button>
        </header>
        <div className="slayer-stats">
          <div>
            <b>{level}</b>
            <span>{tr('Nível', 'Level')}</span>
            <i style={{ width: `${Math.floor(levelProgress(xp, 'slayer') * 100)}%` }} />
          </div>
          <div>
            <b>{fmt(st.points)}</b>
            <span>{tr('Pontos', 'Points')}</span>
          </div>
          <div>
            <b>{st.streak}</b>
            <span>{tr('Sequência', 'Streak')}</span>
          </div>
          <div>
            <b>{fmt(st.completed)}</b>
            <span>{tr('Tarefas', 'Tasks')}</span>
          </div>
        </div>
        {st.monster ? (
          <div className="slayer-task">
            {monster && <MonsterSprite sprite={monster.sprite} height={64} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small" style={{ opacity: 0.8 }}>
                {tr('Tarefa de', 'Task from')} {mName(master)}
              </div>
              <div className="slayer-task-title">
                {bossInfo ? tr('Derrote', 'Defeat') : tr('Mate', 'Kill')} {fmt(st.target)}{bossInfo ? 'x' : ''} {storyText(monster?.name ?? st.monster)}
              </div>
              {bossHunt && (
                <div className="small" style={{ opacity: 0.85 }}>
                  {bossInfo!.lair ? tr('Covil', 'Lair') : tr('Instância', 'Instance')}: {storyText(bossHunt.name)} ({tr('nível', 'level')} {bossHunt.level})
                </div>
              )}
              <div className="slayer-bar">
                <div style={{ width: `${pct}%` }} />
                <span>
                  {fmt(st.progress)}/{fmt(st.target)}
                </span>
              </div>
              <div className="small" style={{ marginTop: 4 }}>
                {fmt(slayerXpPerKill(mLevel) * (bossInfo ? SLAYER_BOSS_XP_MULT : 1))} {bossInfo ? tr('XP por vitória', 'XP per win') : tr('XP por abate', 'XP per kill')} · {tr('ao terminar', 'on completion')}: {master ? slayerTaskPoints(master, st.streak + 1, st.size) : 0} pts
                {nextMult > 1 && st.size !== 'short' && st.size !== 'boss' && <span style={{ color: '#ffea88' }}> (×{Number(nextMult.toFixed(2))})</span>}
              </div>
            </div>
            <button className="small-btn" onClick={() => (confirmCancel ? (props.send({ type: 'slayer_cancel' }), setConfirmCancel(false)) : setConfirmCancel(true))}>
              {confirmCancel ? tr('Confirmar (zera a sequência)', 'Confirm (resets streak)') : tr('Cancelar', 'Cancel')}
            </button>
          </div>
        ) : (
          <p className="small slayer-help">
            {tr(
              'Escolha um mestre e peça uma tarefa: mate a espécie pedida nas caçadas comuns para ganhar XP de Slayer por abate e pontos ao terminar. Escolha o tamanho: curta (300), normal (1.000, pontos ×3) ou longa (3.000, pontos ×10). Ou peça uma tarefa de Chefe: vencer 3 vezes um chefe de covil ou 5 um de instância da faixa do mestre (pontos ×6). A 10ª tarefa seguida vale 5x os pontos, a 50ª 15x e a 100ª 25x (a curta conta na sequência, mas sem o bônus); cancelar zera a sequência.',
              'Pick a master and ask for a task: kill the given species in regular hunts to earn Slayer XP per kill and points on completion. Pick the size: short (300), normal (1,000, points ×3) or long (3,000, points ×10). Or ask for a Boss task: beat a lair boss 3 times or an instance boss 5 times from the master’s range (points ×6). The 10th task in a row is worth 5x points, the 50th 15x and the 100th 25x (short tasks count for the streak but get no bonus); cancelling resets the streak.',
            )}
          </p>
        )}
        <nav className="slayer-tabs">
          <button className={tab === 'masters' ? 'on' : ''} onClick={() => setTab('masters')}>
            {tr('Mestres', 'Masters')}
          </button>
          <button className={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>
            {tr('Loja', 'Shop')} ({fmt(st.points)} pts)
          </button>
        </nav>
        {tab === 'shop' && (
          <div className="slayer-shop">
            {(Object.keys(SLAYER_BOOSTS) as SlayerBoostId[]).map((id) => {
              const o = SLAYER_BOOSTS[id];
              const b = props.state.slayerBoosts;
              const until = id === 'bestiary' ? (b?.bestiaryUntil ?? 0) : b && b.lootMult === (id === 'loot50' ? 0.5 : 0.25) ? b.lootUntil : 0;
              const left = Math.max(0, Math.ceil((until - Date.now()) / 60000));
              return (
                <div key={id} className="slayer-item boost">
                  <img className="icon" src={`/assets/icons/${id === 'bestiary' ? 'golden_spellbook' : 'gold'}.png`} alt="" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="slayer-master-name">{tr(o.name, o.nameEn)}</div>
                    <div className="small" style={{ opacity: 0.85 }}>
                      {left > 0
                        ? tr(`Ativo: mais ${left} min`, `Active: ${left} min left`)
                        : id === 'bestiary'
                          ? tr('Abates contam 2x no Bestiário', 'Kills count 2x in the Bestiary')
                          : tr('Itens e ouro das caçadas (sem lendários)', 'Hunt items and gold (no legendaries)')}
                    </div>
                  </div>
                  <button className="small-btn primary" disabled={st.points < o.price} onClick={() => props.send({ type: 'slayer_boost', boost: id })}>
                    {o.price} pts
                  </button>
                </div>
              );
            })}
            {SLAYER_SHOP.map((o) => {
              const it = itemById(o.item);
              const eq = it?.equip;
              const voc = eq?.vocations?.length === 1 ? ` · ${tr({ warrior: 'Guerreiro', hunter: 'Caçador', arcanist: 'Arcanista', devout: 'Devoto' }[eq.vocations[0]] ?? '', eq.vocations[0])}` : '';
              return (
                <div key={o.item} className="slayer-item">
                  <img className="icon" src={`/assets/icons/${it?.icon}.png`} alt="" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="slayer-master-name">{storyText(it?.name ?? o.item)}</div>
                    <div className="small" style={{ opacity: 0.85 }}>
                      {tr('Nv', 'Lv')} {eq?.level}
                      {voc}
                      {eq?.attack ? ` · ${tr('ataque', 'attack')} ${eq.attack}` : ''}
                      {eq?.defense ? ` · ${tr('defesa', 'defense')} ${eq.defense}` : ''}
                      {eq?.hp ? ` · +${eq.hp} ${tr('vida', 'HP')}` : ''}
                    </div>
                  </div>
                  <button className="small-btn primary" disabled={st.points < o.price} onClick={() => props.send({ type: 'slayer_buy', item: o.item })}>
                    {o.price} pts
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'masters' && <div className="slayer-masters">
          {SLAYER_MASTERS.map((m) => {
            const ok = props.combatLevel >= m.combatLevel;
            const face = slayerCandidates(m).sort((a, b) => b.level - a.level)[0];
            const faceMon = face ? monsterById(face.monster) : undefined;
            const active = st.master === m.id && !!st.monster;
            return (
              <div key={m.id} className={`slayer-master${ok ? '' : ' locked'}${active ? ' active' : ''}`}>
                <div className="slayer-face">{faceMon && <MonsterSprite sprite={faceMon.sprite} height={48} />}</div>
                <div className="slayer-master-name">{mName(m)}</div>
                <div className="small">
                  {ok ? `${tr('Monstros', 'Monsters')} ${m.monsterRange[0]}–${m.monsterRange[1]}` : `🔒 ${tr('Combate', 'Combat')} ${m.combatLevel}`}
                </div>
                <div className="slayer-sizes">
                  {(Object.keys(SLAYER_SIZES) as SlayerSize[]).map((size) => {
                    const z = SLAYER_SIZES[size];
                    return (
                      <button key={size} className="small-btn primary" disabled={!ok || !!st.monster} onClick={() => props.send({ type: 'slayer_request', master: m.id, size })}>
                        <b>{tr(z.name, z.nameEn)}</b>
                        <span>
                          {size === 'boss' ? tr('3–5 vitórias', '3–5 wins') : fmt(z.kills)} · {slayerTaskPoints(m, 1, size)} pts
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>}
      </section>
    </div>
  );
}
