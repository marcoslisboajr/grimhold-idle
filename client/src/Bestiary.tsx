import { useMemo, useState, useEffect } from 'react';
import { Pix } from './Pix.tsx';
import {
  BESTIARY_STAGES,
  bestiaryStage,
  CHARMS,
  CHARM_MAX_LEVEL,
  charmLevelCost,
  ELEMENTS,
  charmPoints,
  charmPointsFor,
  itemById,
  levelForXp,
  PREY_BONUSES,
  PREY_DURATION_SECS,
  preyRerollCost,
  MONSTERS,
  monsterLevel,
  type PlayerState,
  bossEntry,
  parseHuntNode,
  charmById,
} from '@grimhold/shared';
import { ElementIcon, MonsterElements } from './ElementTags.tsx';
import { MonsterSprite } from './Battle.tsx';
import { BosstiaryPanel } from './Bosstiary.tsx';
import { t, onLangChange, getLang, tr, itemName, storyText } from './i18n.ts';

const icon = (name: string) => `/assets/icons/${name}.png`;

/**
 * Bestiário (como no Tibia): a ficha de cada espécie se revela com os abates
 * (vida e XP, depois o loot, depois completa). Fichas completas dão pontos
 * para liberar charms, que valem contra a espécie em que forem postos.
 */
export function BestiaryPanel(props: {
  state: PlayerState;
  onUnlock: (charm: string) => void;
  onUpgrade: (charm: string) => void;
  onAssign: (charm: string, monster: string | null) => void;
  onPreyReroll: (slot: number) => void;
  onPreyChoose: (slot: number, monster: string) => void;
}) {
  const [lang, setLangState] = useState(getLang());
  useEffect(() => onLangChange(setLangState), []);
  const [tab, setTab] = useState<'creatures' | 'bosses' | 'charms' | 'prey'>('creatures');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const kills = props.state.bestiary ?? {};
  const charms = props.state.charms ?? [];
  const pts = charmPoints(kills, charms, props.state.charmBonus ?? 0);
  // Só espécies das caçadas, das mais fracas às mais fortes.
  const species = useMemo(
    // Chefe de instância e de covil tem ficha no Bosstiary, não aqui.
    () => MONSTERS.filter((m) => (monsterLevel(m.id) > 1 || m.id === 'rat' || m.id === 'frog') && !bossEntry(m.id)).sort((a, b) => monsterLevel(a.id) - monsterLevel(b.id)),
    [],
  );
  const known = species.filter((m) => bestiaryStage(kills[m.id] ?? 0) >= 1);
  // Espécies da caçada em andamento (aparecem no topo da lista dos charms).
  const act = props.state.activity;
  const huntMonsters = new Set(act?.skill === 'combat' ? (parseHuntNode(act.node)?.hunt.monsters ?? []) : []);
  const complete = species.filter((m) => bestiaryStage(kills[m.id] ?? 0) === 3).length;
  const q = query.trim().toLowerCase();
  const shown = species.filter((m) => !q || ((kills[m.id] ?? 0) > 0 && m.name.toLowerCase().includes(q)));
  // As 3 fichas incompletas com mais abates: as próximas a dar pontos.
  const nextSheets = species
    .filter((m) => bestiaryStage(kills[m.id] ?? 0) < 3 && (kills[m.id] ?? 0) > 0)
    .sort((a, b) => (kills[b.id] ?? 0) - (kills[a.id] ?? 0))
    .slice(0, 3);

  return (
    <section className="panel bestiary">
      <p className="small">
        {t('bestiary.charm_pts')} <strong className="gold-text">{pts.free}</strong> {t('bestiary.free')} ({pts.earned} {t('bestiary.earned')}, {pts.spent} {t('bestiary.spent')}) · {t('bestiary.complete_sheets')} {complete}/
        {species.length}
      </p>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'creatures'} className={`tab ${tab === 'creatures' ? 'on' : ''}`} onClick={() => setTab('creatures')}>
          {t('bestiary.tab_creatures')}
        </button>
        <button role="tab" aria-selected={tab === 'bosses'} className={`tab ${tab === 'bosses' ? 'on' : ''}`} onClick={() => setTab('bosses')}>
          Bosstiary
        </button>
        <button role="tab" aria-selected={tab === 'charms'} className={`tab ${tab === 'charms' ? 'on' : ''}`} onClick={() => setTab('charms')}>
          {t('bestiary.tab_charms')}
        </button>
        <button role="tab" aria-selected={tab === 'prey'} className={`tab ${tab === 'prey' ? 'on' : ''}`} onClick={() => setTab('prey')}>
          {t('bestiary.tab_prey')}
        </button>
      </div>

      {tab === 'creatures' && (
        <>
          <input className="bestiary-search" placeholder={t('bestiary.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          <p className="small">
            {t('bestiary.kills_to_reveal')} {BESTIARY_STAGES[0]} ({t('stat.hp')} & XP), {BESTIARY_STAGES[1]} (Loot), {BESTIARY_STAGES[2]} ({t('bestiary.points')}).
          </p>
          {openId && (() => {
            const m = MONSTERS.find((x) => x.id === openId)!;
            const n = kills[m.id] ?? 0;
            const stage = bestiaryStage(n);
            return (
              <div className="beast-detail">
                <h4>{n === 0 ? '???' : m.name}</h4>
                {stage < 1 && <p className="small">{t('bestiary.defeat')} {BESTIARY_STAGES[0]} {t('bestiary.to_know_hp_xp')}</p>}
                {stage >= 1 && (
                  <p className="small">
                    {t('stat.hp')} {m.hp.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} · {t('stat.attack')} {Math.round(m.attack)} · {t('stat.defense')} {Math.round(m.defense)} · XP {Math.round(m.xp).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} · {t('bestiary.hunt_lvl')}{' '}
                    {monsterLevel(m.id)}
                  </p>
                )}
                {stage >= 1 && <MonsterElements id={m.id} />}
                {stage >= 2 ? (
                  <div className="beast-loot">
                    {m.loot
                      .filter((l) => !l.quest)
                      .map((l) => {
                        const it = itemById(l.item);
                        return (
                          <span key={l.item} className="beast-drop" title={(it ? itemName(it.name) : undefined)}>
                            <img className="icon tiny" src={icon(it?.icon ?? 'gold')} alt="" /> {(it ? itemName(it.name) : undefined) ?? l.item}{' '}
                            <em>{l.chance >= 1 ? t('bestiary.always') : `${+(l.chance * 100).toFixed(1)}%`}</em>
                          </span>
                        );
                      })}
                  </div>
                ) : (
                  stage >= 1 && <p className="small">{t('bestiary.defeat')} {BESTIARY_STAGES[1]} {t('bestiary.to_see_loot')}</p>
                )}
                {stage === 3 ? (
                  <p className="small gold-text">{t('bestiary.full_sheet')} +{charmPointsFor(m.id)} {t('bestiary.points')}</p>
                ) : (
                  <p className="small">{t('bestiary.full_with')} {BESTIARY_STAGES[2]} {t('bestiary.kills')}: +{charmPointsFor(m.id)} {t('bestiary.points')}</p>
                )}
              </div>
            );
          })()}
          <div className="bestiary-grid">
            {shown.map((m) => {
              const n = kills[m.id] ?? 0;
              const stage = bestiaryStage(n);
              const next = BESTIARY_STAGES[Math.min(stage, 2)];
              return (
                <button key={m.id} className={`beast-card stage-${stage} ${openId === m.id ? 'on' : ''}`} onClick={() => {
                    setOpenId(openId === m.id ? null : m.id);
                    // A ficha aparece acima da lista: leva a vista até ela.
                    requestAnimationFrame(() => document.querySelector('.beast-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
                  }}>
                  <span className={n === 0 ? 'beast-unknown' : ''}>
                    <MonsterSprite sprite={m.sprite} height={44} />
                  </span>
                  <strong>{n === 0 ? '???' : m.name}</strong>
                  <span className="beast-stars">{'★'.repeat(stage)}{'☆'.repeat(3 - stage)}</span>
                  <div className="bar thin">
                    <div className="fill xp" style={{ width: `${Math.min(100, (n / next) * 100)}%` }} />
                  </div>
                  <span className="small">{stage === 3 ? `${n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')} ${t('bestiary.kills')}` : `${n.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}/${next.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}`}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 'bosses' && <BosstiaryPanel kills={kills} />}

      {tab === 'prey' && (
        <div className="charm-list">
          <p className="small">
            {t('bestiary.prey_desc')}
          </p>
          <div className="prey-slots">
            {(props.state.prey ?? []).map((p, i) => (
              <PreyCard
                key={i}
                slot={p}
                cost={
                  !p.monster && !p.options
                    ? null
                    : props.state.preyFreeUsed
                    ? preyRerollCost(levelForXp(props.state.skills.combat ?? 0, 'combat'), props.state.preyPaidToday ?? 0)
                    : 0
                }
                lang={lang}
                onRoll={() => props.onPreyReroll(i)}
                onChoose={(m) => props.onPreyChoose(i, m)}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'charms' && (
        <div className="charm-list">
          <p className="small">{t('bestiary.charms_desc')}</p>
          <p className="small">
            <strong>{tr('Um charm por espécie:', 'One charm per species:')}</strong>{' '}
            {tr('pôr um charm numa espécie que já tem outro tira o antigo dela.', 'putting a charm on a species that already has one removes the old one.')}
          </p>
          {/* Fichas mais perto de completar: de onde vêm os próximos pontos. */}
          {nextSheets.length > 0 && (
            <div className="charm-next small">
              <strong>{tr('Próximos pontos', 'Next points')}:</strong>{' '}
              {nextSheets.map((m, k) => (
                <span key={m.id} className="charm-next-mon">
                  {k > 0 && ' · '}
                  <MonsterSprite sprite={m.sprite} height={24} />
                  {m.name} {(kills[m.id] ?? 0).toLocaleString('pt-BR')}/{BESTIARY_STAGES[2].toLocaleString('pt-BR')} (+{charmPointsFor(m.id)} pts)
                </span>
              ))}
            </div>
          )}
          {CHARM_GROUPS.map(([group, title]) => (
            <div key={group} className="charm-group">
              <h4>{title()}</h4>
              {CHARMS.filter((c) => c.group === group).map((c) => {
                const mine = charms.find((x) => x.id === c.id);
                const cName = t('charm.' + c.id + '.name', c.name);
                const level = mine ? (mine.level ?? CHARM_MAX_LEVEL) : 1;
                // Em português o texto sai do nível; a tradução em inglês é a do nível máximo.
                const cDesc = getLang() === 'pt' ? c.describe(level) : t('charm.' + c.id + '.desc', c.description);
                const nextCost = mine && level < CHARM_MAX_LEVEL ? charmLevelCost(c, level + 1) : 0;
                const target = mine?.monster ? species.find((m) => m.id === mine.monster) : undefined;
                const el = c.element ? ELEMENTS[c.element] : undefined;
                // Charm elemental na espécie certa: fraca ao elemento (golpe mais forte) ou resistente (mais fraco).
                const fit = c.element && target ? (target.weak?.includes(c.element) ? 'weak' : target.resist?.includes(c.element) ? 'resist' : null) : null;
                return (
                  <div key={c.id} className={`charm-row ${mine ? 'owned' : ''}`}>
                    {/* Foto da espécie em que o charm está (pedido do Gioseppi). */}
                    <div className="charm-portrait">{target ? <MonsterSprite sprite={target.sprite} height={40} /> : <span>?</span>}</div>
                    <div className="charm-info">
                      <strong>
                        {c.element && <ElementIcon el={c.element} />} 
                        {cName}
                        {mine && <span className="small gold-text"> {tr('Nível', 'Level')} {level}/{CHARM_MAX_LEVEL}</span>}
                      </strong>
                      <span className="small">{cDesc}</span>
                      {target && (
                        <span className="small">
                          {tr('Em', 'On')}: <strong>{target.name}</strong> · <MonsterElements id={target.id} />
                          {fit === 'weak' && <span className="loot-pos"> · {tr('fraca a esse elemento!', 'weak to this element!')}</span>}
                          {fit === 'resist' && <span className="loot-neg"> · {tr('resiste a esse elemento', 'resists this element')}</span>}
                        </span>
                      )}
                    </div>
                    {mine ? (
                      <select value={mine.monster ?? ''} onChange={(e) => props.onAssign(c.id, e.target.value || null)} aria-label={tr(`Espécie do charm ${c.name}`, `Species for charm ${c.name}`)}>
                        <option value="">{t('bestiary.no_species')}</option>
                        {/* Os da caçada atual primeiro (pedido do Monkoso); o resto em ordem alfabética. */}
                        {[
                          [tr('Na caçada atual', 'In your current hunt'), known.filter((m) => huntMonsters.has(m.id))],
                          [huntMonsters.size ? tr('Outras espécies', 'Other species') : '', known.filter((m) => !huntMonsters.has(m.id))],
                        ].map(([label, list]) => {
                          const opts = [...(list as typeof known)]
                            .sort((a, b) => storyText(a.name).localeCompare(storyText(b.name), getLang() === 'pt' ? 'pt-BR' : 'en'))
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {storyText(m.name)}
                                {(() => {
                                  const other = charms.find((o) => o.monster === m.id && o.id !== c.id);
                                  return other ? ` [${tr('tem', 'has')} ${charmById(other.id)?.name ?? other.id}]` : '';
                                })()}
                                {c.element && m.weak?.includes(c.element) ? ` (${tr('fraca a', 'weak to')} ${getLang() === 'pt' ? el?.pt : el?.en})` : ''}
                              </option>
                            ));
                          if (!opts.length) return null;
                          return label ? (
                            <optgroup key={label as string} label={label as string}>
                              {opts}
                            </optgroup>
                          ) : (
                            opts
                          );
                        })}
                      </select>
                    ) : null}
                    {mine && nextCost > 0 && (
                      <button className="small-btn" disabled={pts.free < nextCost} onClick={() => props.onUpgrade(c.id)} title={c.describe(level + 1)}>
                        {tr('Evoluir', 'Upgrade')} ({nextCost} pts)
                      </button>
                    )}
                    {mine ? null : (
                      <button className="primary small-btn" disabled={pts.free < charmLevelCost(c, 1)} onClick={() => props.onUnlock(c.id)}>
                        {t('bestiary.unlock')} ({charmLevelCost(c, 1)} pts)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const CHARM_GROUPS: ['base' | 'elemental' | 'effect', () => string][] = [
  ['elemental', () => tr('Elementais', 'Elemental')],
  ['effect', () => tr('Efeitos', 'Effects')],
  ['base', () => tr('Clássicos', 'Classic')],
];

const BONUS_ICON: Record<string, string> = { xp: 'ui_star', loot: 'gold', damage: 'steel_sword' };

/** Uma vaga do prey (como no Tibia): a criatura e o bônus, ou a lista de 9 para escolher. */
function PreyCard(props: {
  slot: PlayerState['prey'][number];
  /** Preço da próxima lista: null = vaga vazia (grátis), 0 = troca grátis do dia. */
  cost: number | null;
  lang: string;
  onRoll: () => void;
  onChoose: (monster: string) => void;
}) {
  const { slot } = props;
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [slot.options?.join()]);
  const m = slot.monster ? MONSTERS.find((x) => x.id === slot.monster) : undefined;
  const b = PREY_BONUSES.find((x) => x.id === slot.bonus);
  const bonusText = b ? `${t('prey.bonus.' + b.id + '.name', b.name)}: ${t('prey.bonus.' + b.id + '.desc', b.description)}` : '';
  const secs = slot.timeLeftSecs ?? 0;
  const pct = Math.max(0, Math.min(100, (secs / PREY_DURATION_SECS) * 100));
  const time = `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}`;
  const chosen = picked ? MONSTERS.find((x) => x.id === picked) : undefined;
  const fmt = (n: number) => n.toLocaleString(props.lang === 'pt' ? 'pt-BR' : 'en-US');
  return (
    <div className={`prey-card ${m ? 'active' : ''}`}>
      <div className="prey-card-title">{m ? m.name : slot.options ? (chosen?.name ?? tr('Escolha uma criatura', 'Pick a creature')) : t('bestiary.empty_slot')}</div>
      {slot.options ? (
        <div className="prey-grid">
          {slot.options.map((id) => {
            const mm = MONSTERS.find((x) => x.id === id);
            return (
              <button key={id} type="button" className={`prey-option ${picked === id ? 'on' : ''}`} title={mm?.name ?? id} onClick={() => setPicked(id)}>
                {mm && <MonsterSprite sprite={mm.sprite} height={40} />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="prey-portrait">{m ? <MonsterSprite sprite={m.sprite} height={72} /> : <span className="prey-unknown">?</span>}</div>
      )}
      {b && (
        <div className={`prey-banner bonus-${b.id}`} title={bonusText}>
          <span className="prey-banner-icon"><Pix name={BONUS_ICON[b.id]} /></span>
          <span className="small">{bonusText}</span>
        </div>
      )}
      {m && (
        <div className="prey-time" title={tr('Tempo de combate restante (corre em qualquer caçada)', 'Combat time left (runs in any hunt)')}>
          <div className="prey-time-fill" style={{ width: `${pct}%` }} />
          <span>{time}</span>
        </div>
      )}
      {slot.options && (
        <button type="button" className="primary small-btn" disabled={!picked} onClick={() => picked && props.onChoose(picked)}>
          {tr('Escolher', 'Choose')}
        </button>
      )}
      <button type="button" className="small-btn prey-roll" onClick={props.onRoll}>
        <Pix name="ui_swap" /> {slot.options || m ? tr('Nova lista', 'New list') : tr('Sortear lista', 'Roll list')} ·{' '}
        {props.cost === null || props.cost === 0 ? tr('Grátis', 'Free') : <>{fmt(props.cost)} <Pix name="gold" /></>}
      </button>
    </div>
  );
}
