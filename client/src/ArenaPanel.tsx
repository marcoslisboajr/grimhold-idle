import React, { useState, useEffect } from 'react';
import { Pix } from './Pix.tsx';
import {
  ARENAS,
  ARENA_REST_MS,
  itemById,
  levelForXp,
  type PlayerState,
} from '@grimhold/shared';
import { MonsterSprite } from './Battle.tsx';
import { t, onLangChange, getLang, itemName, storyText } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;

export function ArenaPanel(props: {
  state: PlayerState;
  clockOffset: React.MutableRefObject<number>;
  onStart: (arenaId: string) => void;
  onClaimReward: (arenaId: string, weaponId: string) => void;
  onStop: () => void;
}) {
  const [lang, setLangState] = useState(getLang());
  useEffect(() => onLangChange(setLangState), []);
  const { state, onStart, onClaimReward, onStop } = props;
  const combatLevel = levelForXp(state.skills.combat ?? 0, 'combat');
  const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Relógio local para contagem regressiva suave
  const [now, setNow] = useState(() => Date.now() + props.clockOffset.current);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now() + props.clockOffset.current);
    }, 100);
    return () => clearInterval(timer);
  }, [props.clockOffset]);

  const activity = state.activity;
  const isFightingArena = activity?.skill === 'combat' && activity.node.startsWith('arena:');
  const activeArenaId = isFightingArena ? activity.node.slice('arena:'.length) : null;

  return (
    <section className="panel arena-panel">
      <div className="panel-header">
        <h3><Pix name="steel_sword" /> {t('arena.title')}</h3>
        <p className="small">
          {t('arena.desc')}
        </p>
      </div>

      <div className="arena-list">
        {ARENAS.filter((a) => !a.trial).map((arena) => {
          const arenaState = state.arenas.find((a) => a.arenaId === arena.id);
          const status = arenaState?.status ?? 'available';
          const isCurrentActive = isFightingArena && activeArenaId === arena.id;
          const isPending = status === 'reward_pending';
          const isDone = status === 'completed';
          const canEnter = combatLevel >= arena.level && !isDone && !isPending;

          return (
            <div key={arena.id} className={`arena-card ${isDone ? 'done' : ''} ${isPending ? 'pending' : ''} ${isCurrentActive ? 'active' : ''}`}>
              <div className="arena-header">
                <div>
                  <h4>{t('arena.' + arena.id + '.name', arena.name)}</h4>
                  <span className={`badge ${combatLevel >= arena.level ? 'badge-ok' : 'badge-req'}`}>
                    {t('common.level')} {arena.level}
                  </span>
                  {isDone && <span className="badge badge-gold">{t('arena.champion')}</span>}
                  {isPending && <span className="badge badge-pulse">{t('arena.victory_choose')}</span>}
                  {isCurrentActive && <span className="badge badge-fight">{t('arena.fighting')}</span>}
                </div>
              </div>

              <p className="arena-desc">{t('arena.' + arena.id + '.desc', arena.description)}</p>

              {/* TELA DE ESCOLHA DE RECOMPENSA (SVARGROND STYLE) */}
              {isPending && (
                <div className="reward-room">
                  <div className="reward-banner">
                    <h5>{t('arena.room_title')}</h5>
                    <p className="small">
                      {t('arena.room_desc')}
                    </p>
                  </div>

                  <div className="weapon-options-grid">
                    {arena.weapons.map((w) => {
                      const isSel = selectedWeapon === w.id;
                      return (
                        <div
                          key={w.id}
                          className={`weapon-card ${isSel ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedWeapon(w.id);
                            setConfirming(false);
                          }}
                        >
                          <img className="icon" src={icon(w.icon)} alt={itemName(w.name)} />
                          <div className="weapon-card-info">
                            <strong>{itemName(w.name)}</strong>
                            <span className="small tag-vocation">{lang === 'pt' ? w.vocation : w.vocation === 'Guerreiro' ? 'Warrior' : w.vocation === 'Caçador' ? 'Hunter' : w.vocation === 'Devoto' ? 'Devout' : w.vocation === 'Arcanista' ? 'Arcanist' : w.vocation} · {lang === 'pt' ? w.type : w.type === 'Espada' ? 'Sword' : w.type === 'Machado' ? 'Axe' : w.type === 'Maça' ? 'Mace' : w.type === 'Arco' ? 'Bow' : w.type === 'Cajado' ? 'Staff' : w.type}</span>
                            <span className="small weapon-desc">{storyText(w.description)}</span>
                          </div>
                          <div className="weapon-select-radio">
                            <input
                              type="radio"
                              name="arena_weapon"
                              checked={isSel}
                              onChange={() => {
                                setSelectedWeapon(w.id);
                                setConfirming(false);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="reward-claim-action">
                    {selectedWeapon ? (
                      confirming ? (
                        <div className="confirm-box">
                          <p className="small">
                            {lang === 'pt'
                              ? `Tem certeza que deseja escolher ${itemName(arena.weapons.find((w) => w.id === selectedWeapon)?.name ?? '')}? A escolha é definitiva!`
                              : `Are you sure you want to choose ${itemName(arena.weapons.find((w) => w.id === selectedWeapon)?.name ?? '')}? This choice is permanent!`}
                          </p>
                          <div className="row-btns">
                            <button
                              className="primary small-btn gold-btn"
                              onClick={() => onClaimReward(arena.id, selectedWeapon)}
                            >
                              {t('arena.claim_btn')}
                            </button>
                            <button
                              className="small-btn"
                              onClick={() => setConfirming(false)}
                            >
                              {t('arena.back')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="primary gold-btn"
                          onClick={() => setConfirming(true)}
                        >
                          {itemName(arena.weapons.find((w) => w.id === selectedWeapon)?.name ?? '')}
                        </button>
                      )
                    ) : (
                      <p className="small dim">{t('arena.select_weapon_first')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* SE JÁ CONCLUIU */}
              {isDone && (
                <div className="arena-completed-box">
                  <p className="small">
                    {t('arena.already_champ')}
                  </p>
                  {arenaState?.rewardChosen && (
                    <div className="chosen-weapon-display">
                      <span className="small">{t('arena.chosen_reward')}</span>
                      <div className="item-chip">
                        <img className="icon tiny" src={icon(itemById(arenaState.rewardChosen)?.icon ?? 'steel_sword')} alt="" />
                        <strong>{itemName(itemById(arenaState.rewardChosen)?.name ?? arenaState.rewardChosen)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* COMBATE EM ANDAMENTO */}
              {isCurrentActive && state.cycle && (
                <div className="arena-battle-box">
                  {(() => {
                    const waveIdx = Math.min(activity.seq, arena.opponents.length - 1);
                    const opp = arena.opponents[waveIdx];
                    const elapsedCycle = Math.max(0, now - activity.since);
                    const isResting = elapsedCycle >= state.cycle.fightMs;
                    const restLeftMs = Math.max(0, state.cycle.fightMs + ARENA_REST_MS - elapsedCycle);
                    const restSecs = Math.ceil(restLeftMs / 1000);

                    return (
                      <>
                        <div className="wave-progress">
                          <span className="small">
                            <strong>{t('arena.wave')} {waveIdx + 1} {t('arena.of')} {arena.opponents.length}:</strong> {opp.name}
                          </span>
                          <div className="wave-dots">
                            {arena.opponents.map((_, i) => (
                              <span
                                key={i}
                                className={`wave-dot ${i < waveIdx ? 'done' : i === waveIdx ? 'current' : ''}`}
                                title={`${t('arena.wave')} ${i + 1}: ${arena.opponents[i].name}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* INTERVALO DE 5 SEGUNDOS COM CONTAGEM REGRESSIVA */}
                        {isResting ? (
                          <div className="countdown-rest-box">
                            <span className="rest-title">{t('arena.challenger_defeated')}</span>
                            <div className="rest-timer">
                              {t('arena.next_monster_in')} <strong className="timer-sec">{restSecs}s</strong>
                            </div>
                            <div className="bar thin rest-bar">
                              <div
                                className="fill rest"
                                style={{ width: `${Math.max(0, Math.min(100, (restLeftMs / ARENA_REST_MS) * 100))}%` }}
                              />
                            </div>
                            <span className="small dim">{t('arena.catching_breath')}</span>
                          </div>
                        ) : (
                          <div className="active-duel-box">
                            <div className="duel-opponent">
                              <MonsterSprite sprite={opp.sprite} height={64} />
                              <div className="duel-opponent-info">
                                <strong>{opp.name}</strong>
                                <span className="small dim">{opp.hp} {t('stat.hp')} · {opp.attack} {t('stat.attack')}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="arena-actions">
                          <button className="small-btn danger-btn" onClick={onStop}>
                            {t('arena.give_up')}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* DISPONÍVEL PARA ENTRAR */}
              {!isCurrentActive && !isPending && !isDone && (
                <div className="arena-preview">
                  <div className="preview-opponents">
                    <span className="small bold">{t('arena.challengers_list')}</span>
                    <div className="opponent-grid">
                      {arena.opponents.map((opp, idx) => (
                        <div key={opp.id} className="opp-card">
                          <span className="opp-wave">{idx + 1}</span>
                          <MonsterSprite sprite={opp.sprite} height={48} />
                          <strong>{opp.name}</strong>
                          <span className="small">
                            {opp.hp.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('stat.hp')} · {opp.attack} {t('stat.attack')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="preview-weapons">
                    <span className="small bold">{t('arena.legendary_weapons')}</span>
                    <div className="weapon-preview-list">
                      {arena.weapons.map((w) => (
                        <div key={w.id} className="weapon-preview">
                          <img className="icon" src={icon(w.icon)} alt="" />
                          <div>
                            <strong>{itemName(w.name)}</strong>
                            <span className="small">
                              {' '}
                              · {lang === 'pt' ? w.vocation : w.vocation === 'Guerreiro' ? 'Warrior' : w.vocation === 'Caçador' ? 'Hunter' : w.vocation === 'Devoto' ? 'Devout' : w.vocation === 'Arcanista' ? 'Arcanist' : w.vocation} · {lang === 'pt' ? w.type : w.type === 'Espada' ? 'Sword' : w.type === 'Machado' ? 'Axe' : w.type === 'Maça' ? 'Mace' : w.type === 'Arco' ? 'Bow' : w.type === 'Cajado' ? 'Staff' : w.type}
                            </span>
                            <p className="small">{storyText(w.description)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="preview-rewards">
                    <span className="small bold">{lang === 'pt' ? 'Recompensa final:' : 'Final reward:'}</span>
                    <span className="small">
                      +{(arena.rewardGold).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} {t('common.gold')} · +{(arena.rewardXp).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} XP · {lang === 'pt' ? '1 Arma Lendária à sua escolha' : '1 Legendary Weapon of your choice'}
                    </span>
                  </div>

                  <div className="arena-enter-btn-wrap">
                    <button
                      className="primary gold-btn enter-btn"
                      disabled={!canEnter}
                      onClick={() => onStart(arena.id)}
                    >
                      {combatLevel < arena.level
                        ? `${lang === 'pt' ? 'Requer Nível' : 'Requires Level'} ${arena.level}`
                        : `${t('arena.enter_btn')} (${t('arena.' + arena.id + '.name', arena.name)})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
