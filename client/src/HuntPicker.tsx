import { useCallback, useMemo, useRef, useState } from 'react';
import { Pix } from './Pix.tsx';
import {
  DIFFICULTIES,
  HUNTS,
  itemById,
  huntNode,
  monsterById,
  parseHuntNode,
  underLevelPenalty,
  overLevelXpMult,
  OVER_LEVEL_XP_GRACE,
  UNDERLEVEL_DAMAGE,
  UNDERLEVEL_XP,
  PACK_XP_BONUS,
  levelGap,
  HUNT_FOCUS,
  storyById,
  getBoostedCreature,
  BOOSTED_XP_MULT,
  BOOSTED_LOOT_MULT,
  type DifficultyId,
  type StoryState,
  type HuntFocusId,
  gearRequired,
  gearShortfall,
  endgameAttackMult,
  HUNT_DIFF_XP,
  endgameHpMult,
  MASTERY_MIN_LEVEL,
} from '@grimhold/shared';
import { HuntWeaknesses } from './ElementTags.tsx';
import { MonsterSprite } from './Battle.tsx';
import { InstanceList, QuestInstanceList } from './Instances.tsx';
import { LairList } from './Lairs.tsx';
import { RaidPanel } from './RaidPanel.tsx';
import { t, getLang, tr, itemName, storyText } from './i18n.ts';

const FAV_KEY = 'grimhold.favoriteHunts';

/** Abas de faixa de nível da lista de caçadas. */
export const LEVEL_RANGES: [number, number][] = [[1, 49], [50, 79], [80, 109], [110, 139], [140, 169], [170, 199], [200, 249], [250, 299], [300, 349], [350, 399], [400, 449], [450, 499], [500, 549], [550, 599], [600, 649], [650, 699], [700, Infinity]];
export const levelRangeOf = (level: number) => Math.max(0, LEVEL_RANGES.findIndex(([lo, hi]) => level >= lo && level <= hi));

const pct = (m: number) => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`;

/** Selo do foco da caçada: XP, loot ou meio-termo, com os números no título. */
/** 1234567 → "1,2kk" (estilo Tibia). */
function fmtXpH(n: number): string {
  const f = (v: number) => v.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 1 });
  if (n >= 1e9) return `${f(n / 1e9)}kkk`;
  if (n >= 1e6) return `${f(n / 1e6)}kk`;
  if (n >= 1e3) return `${f(n / 1e3)}k`;
  return String(n);
}

function HuntFocusTag(props: { focus: HuntFocusId }) {
  const f = HUNT_FOCUS[props.focus] ?? HUNT_FOCUS.balanced;
  const title =
    props.focus === 'balanced'
      ? tr('XP e loot normais: menos XP que as de XP, mais ouro e peças.', 'Normal XP and loot: less XP than XP hunts, more gold and gear.')
      : tr(
          `XP ${pct(f.xp)} · ouro ${pct(f.gold)} · drops ${pct(f.loot)} · peças de equipamento ${pct(f.gear)}`,
          `XP ${pct(f.xp)} · gold ${pct(f.gold)} · drops ${pct(f.loot)} · gear pieces ${pct(f.gear)}`,
        );
  const icon = props.focus === 'xp' ? 'steel_sword' : props.focus === 'loot' ? 'gold' : 'ui_swap';
  const label = props.focus === 'xp' ? t('hunt.xp_focus') : props.focus === 'loot' ? t('hunt.loot_focus') : tr('Meio-termo', 'Balanced');
  return (
    <span className={`hunt-focus ${props.focus}`} title={title}>
      <Pix name={icon} /> {label}
    </span>
  );
}

function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {
    /* sem storage: favoritos valem só nesta sessão */
  }
}

/** Janela "Organizar caçada": escolhe caçada e dificuldade. */
export function HuntPicker(props: {
  /** XP/h real do jogador por caçada (`hunt@dificuldade`). */
  huntXp?: Record<string, number>;
  combatLevel: number;
  /** Nota de equipamento do personagem (do 200+ cada caçada pede uma). */
  gearPower?: number;
  /** Nível que conta nas caçadas comuns (400+: combate + Maestria). Sem ele, vale combatLevel. */
  huntLevel?: number;
  bank: Record<string, number>;
  /** Histórias concluídas (liberam as caçadas de acesso). */
  doneStories: string[];
  current: string | null;
  /** Instâncias vencidas (último dia e total) e o dia de hoje, para a aba Instâncias. */
  instanceClears?: Record<string, { day: string; total: number }>;
  instanceFree?: Record<string, string>;
  today?: string;
  /** Está numa party (a aba Chefes explica o covil em grupo). */
  inParty?: boolean;
  /** Covis em cooldown (até quando, ms) e o relógio do servidor. */
  lairCooldowns?: Record<string, number>;
  /** Abates por espécie (Pesadelo dos covis). */
  kills?: Record<string, number>;
  serverNow?: number;
  /** Sem bênção: avisa que a morte pode levar peças (o Ceifador guarda por um tempo). */
  blessed?: boolean;
  blessPrice?: number;
  onBless?: () => void;
  /** Histórias (a aba Quests mostra as instâncias de quest abertas). */
  stories?: StoryState[];
  /** Dados da Raide semanal */
  party?: import('@grimhold/shared').PartyView | null;
  inventory?: { id: string; count: number }[];
  raidClears?: number[];
  raidPity?: number;
  raidClearsByRaid?: Record<string, number[]>;
  raidPityByRaid?: Record<string, number>;
  raidChestPurchases?: number;
  raidBoughtPieces?: string[];
  raidRanking?: { name: string; at: number; solo: boolean }[];
  raidRankings?: Record<string, { name: string; at: number; solo: boolean }[]>;
  onBuyRaidShop?: (item: string) => void;
  /** Aba para abrir (o botão da quest abre direto na aba Quests). */
  initialMode?: 'hunts' | 'instances' | 'lairs' | 'quests' | 'raids';
  initialHunt?: string;
  onPick: (node: string) => void;
  onClose: () => void;
}) {
  const parsedCurrent = props.current ? parseHuntNode(props.current) : null;
  const [mode, setMode] = useState<'hunts' | 'instances' | 'lairs' | 'quests' | 'raids'>(
    props.initialMode ?? (props.initialHunt ? 'hunts' : parsedCurrent?.hunt.quest ? 'quests' : parsedCurrent?.hunt.raid ? 'raids' : parsedCurrent?.hunt.boss ? 'instances' : parsedCurrent?.hunt.lair ? 'lairs' : 'hunts'),
  );
  // Rola até a caçada indicada só na primeira vez (antes rolava a cada atualização e não deixava subir).
  const scrolled = useRef(false);
  const scrollOnce = useCallback((el: HTMLLIElement | null) => {
    if (el && !scrolled.current) { scrolled.current = true; el.scrollIntoView?.({ block: 'nearest' }); }
  }, []);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyId>(parsedCurrent?.difficulty.id ?? 'normal');
  const [pack, setPack] = useState<number>(parsedCurrent?.pack ?? 1);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  // Faixa de nível: começa na da caçada atual (ou do personagem).
  const initialHuntObj = props.initialHunt ? HUNTS.find((h) => h.id === props.initialHunt) : undefined;
  const [range, setRange] = useState<number>(() => levelRangeOf(initialHuntObj ? initialHuntObj.level : parsedCurrent && !parsedCurrent.hunt.boss && !parsedCurrent.hunt.lair ? parsedCurrent.hunt.level : props.combatLevel));
  const diff = DIFFICULTIES.find((d) => d.id === difficulty)!;

  const hunts = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Cada faixa também mostra a última caçada da faixa de baixo (ex.: a 296 aparece na 300–349).
    const prevTop = range > 0
      ? Math.max(-1, ...HUNTS.filter((h) => !h.boss && !h.lair && levelRangeOf(h.level) === range - 1).map((h) => h.level))
      : -1;
    return [...HUNTS]
      .filter((h) => {
        // As instâncias e os covis têm as abas deles.
        if (h.boss || h.lair) return false;
        if (onlyFavorites && !favorites.includes(h.id)) return false;
        // A busca e os favoritos olham todas as faixas.
        if (!q && !onlyFavorites && range >= 0 && levelRangeOf(h.level) !== range && h.level !== prevTop) return false;
        if (!q) return true;
        const names = h.monsters.map((m) => monsterById(m)?.name ?? '').join(' ');
        return `${h.name} ${h.region} ${names}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.level - b.level);
  }, [query, onlyFavorites, favorites, range]);

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(next);
    saveFavorites(next);
  };

  const boostedId = getBoostedCreature();
  const boostedMonster = monsterById(boostedId);

  return (
    <div className="overlay" onClick={props.onClose}>
      <section className="panel picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('hunt.title', 'Organizar caçada')}>
        <header className="picker-head">
          <h3>{t('hunt.title', 'Organizar caçada')}</h3>
          <button className="close" onClick={props.onClose} aria-label={tr('Fechar', 'Close')}>
            ×
          </button>
        </header>

        {props.blessed === false && (
          <div className="bless-warning small">
            <strong>{tr('Você está sem bênção.', 'You are not blessed.')}</strong>{' '}
            {tr(
              'Se morrer, cada peça equipada tem 10% de chance de cair. O Ceifador guarda o que cair por 3 dias, mas cobra caro para devolver.',
              'If you die, each equipped piece has a 10% chance to drop. The Reaper keeps what drops for 3 days, but charges a lot to return it.',
            )}{' '}
            {props.onBless && props.blessPrice !== undefined && (
              <button
                className="primary small-btn"
                disabled={(props.bank.gold ?? 0) < props.blessPrice}
                onClick={props.onBless}
              >
                {tr('Comprar bênção', 'Buy blessing')} ({props.blessPrice.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US')} {tr('ouro', 'gold')})
              </button>
            )}
          </div>
        )}

        <div className="tabs picker-mode" role="tablist">
          <button role="tab" aria-selected={mode === 'hunts'} className={`tab ${mode === 'hunts' ? 'on' : ''}`} onClick={() => setMode('hunts')}>
            {tr('Caçadas', 'Hunts')}
          </button>
          <button role="tab" aria-selected={mode === 'instances'} className={`tab ${mode === 'instances' ? 'on' : ''}`} onClick={() => setMode('instances')}>
            {tr('Instâncias', 'Instances')}
          </button>
          <button role="tab" aria-selected={mode === 'lairs'} className={`tab ${mode === 'lairs' ? 'on' : ''}`} onClick={() => setMode('lairs')}>
            {tr('Chefes', 'Bosses')}
          </button>
          <button role="tab" aria-selected={mode === 'quests'} className={`tab ${mode === 'quests' ? 'on' : ''}`} onClick={() => setMode('quests')}>
            {tr('Quests', 'Quests')}
          </button>
          <button role="tab" aria-selected={mode === 'raids'} className={`tab ${mode === 'raids' ? 'on' : ''}`} onClick={() => setMode('raids')}>
            {tr('Raides', 'Raids')}
          </button>
        </div>

        {mode === 'raids' ? (
          <RaidPanel
            combatLevel={props.combatLevel}
            current={props.current}
            party={props.party ?? null}
            inventory={props.inventory ?? []}
            raidClears={props.raidClears}
            raidPity={props.raidPity}
            raidClearsByRaid={props.raidClearsByRaid}
            raidPityByRaid={props.raidPityByRaid}
            raidChestPurchases={props.raidChestPurchases}
            raidBoughtPieces={props.raidBoughtPieces}
            raidRanking={props.raidRanking}
            raidRankings={props.raidRankings}
            now={props.serverNow ?? Date.now()}
            onPick={props.onPick}
            onBuyShop={(itemId) => props.onBuyRaidShop?.(itemId)}
          />
        ) : mode === 'quests' ? (
          <QuestInstanceList
            combatLevel={props.combatLevel}
            current={props.current}
            stories={props.stories ?? []}
            instanceClears={props.instanceClears ?? {}}
            onPick={props.onPick}
          />
        ) : mode === 'lairs' ? (
          <LairList
            combatLevel={props.combatLevel}
            current={props.current}
            inParty={!!props.inParty}
            cooldowns={props.lairCooldowns ?? {}}
            kills={props.kills}
            now={props.serverNow ?? Date.now()}
            onPick={props.onPick}
          />
        ) : mode === 'instances' ? (
          <InstanceList
            combatLevel={props.combatLevel}
            bank={props.bank}
            current={props.current}
            instanceClears={props.instanceClears ?? {}}
            instanceFree={props.instanceFree ?? {}}
            today={props.today ?? ''}
            onPick={props.onPick}
          />
        ) : (
        <>
        {boostedMonster && (
          <div className="boosted-banner">
            <span className="boosted-badge"><Pix name="ui_star" /> {t('hunt.boosted_title')}</span>
            <div className="boosted-body">
              <span className="boosted-thumb">
                <MonsterSprite sprite={boostedMonster.sprite} height={48} />
              </span>
              <div className="boosted-desc">
                <span className="boosted-name">{boostedMonster.name}</span>
                <span className="boosted-perks">
                  +{Math.round((BOOSTED_XP_MULT - 1) * 100)}% XP · +{Math.round((BOOSTED_LOOT_MULT - 1) * 100)}% Loot
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="picker-tools">
          <div className="tabs" role="radiogroup" aria-label="Dificuldade">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                role="radio"
                aria-checked={difficulty === d.id}
                className={`tab ${difficulty === d.id ? 'on' : ''} diff-${d.id}`}
                onClick={() => setDifficulty(d.id)}
              >
                {d.id === 'normal' ? (getLang() === 'pt' ? 'Normal' : 'Normal') : d.id === 'hard' ? (getLang() === 'pt' ? 'Difícil' : 'Hard') : (getLang() === 'pt' ? 'Pesadelo' : 'Nightmare')}
              </button>
            ))}
          </div>
          <div className="tabs" role="radiogroup" aria-label="Bando de monstros">
            {[1, 2, 3, 5, 7].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={pack === n}
                className={`tab ${pack === n ? 'on' : ''}`}
                title={n === 1 ? tr('1 monstro por vez (seguro)', '1 monster at a time (safe)') : tr(`${n} monstros simultâneos (maior risco, ${n}x XP e drops)`, `${n} monsters at once (higher risk, ${n}x XP and drops)`)}
                onClick={() => setPack(n)}
              >
                {n}x {n === 1 ? t('hunt.solo') : t('hunt.pack')}
              </button>
            ))}
          </div>
          <button className={`tab ${onlyFavorites ? 'on' : ''}`} onClick={() => setOnlyFavorites((v) => !v)}>
            {t('hunt.favorites')}
          </button>
        </div>

        <input
          className="search"
          placeholder={t('hunt.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tabs hunt-ranges" role="radiogroup" aria-label={tr('Faixa de nível', 'Level range')}>
          {LEVEL_RANGES.map(([lo, hi], i) => (
            <button key={lo} role="radio" aria-checked={range === i} className={`tab ${range === i ? 'on' : ''}`} onClick={() => setRange(i)}>
              {hi === Infinity ? `${lo}+` : `${lo}–${hi}`}
            </button>
          ))}
          <button role="radio" aria-checked={range < 0} className={`tab ${range < 0 ? 'on' : ''}`} onClick={() => setRange(-1)}>
            {tr('Todas', 'All')}
          </button>
        </div>
        <p className="small">
          {hunts.length} {hunts.length === 1 ? t('hunt.available_singular') : t('hunt.available_plural')}
          {diff.level > 0 && ` · ${diff.name}: +${diff.level} levels, ${HUNT_DIFF_XP[diff.id] ?? diff.xp}x XP, ${diff.loot}x loot`}
          {pack > 1 && ` · ${t('hunt.pack')} ${pack}x: ${pack} monsters, +${Math.round((PACK_XP_BONUS[pack - 1] - 1) * 100)}% XP`}
        </p>

        <ul className="hunt-cards">
          {hunts.map((h) => {
            const node = huntNode(h.id, difficulty, h.boss ? 1 : pack);
            const level = h.level + diff.level;
            // Caçada comum: do 400 em diante conta combate + Maestria; covil e instância seguem o nível de combate.
            const pl = !h.boss && !h.lair && !h.raid ? (props.huntLevel ?? props.combatLevel) : props.combatLevel;
            const danger = pl < level;
            const gap = levelGap(level, pl);
            const lead = monsterById(h.monsters[0]);
            const fav = favorites.includes(h.id);
            const keys = h.key ? (props.bank[h.key] ?? 0) : null;
            const noKey = keys === 0;
            const sealed = !!h.requires && !props.doneStories.includes(h.requires);
            return (
              <li key={h.id} ref={props.initialHunt === h.id ? scrollOnce : undefined} className={`hunt-card ${props.current === node || props.initialHunt === h.id ? 'active' : ''} ${props.initialHunt === h.id ? 'selected' : ''} ${h.boss ? 'boss' : ''}`}>
                <button
                  className={`star ${fav ? 'on' : ''}`}
                  onClick={() => toggleFavorite(h.id)}
                  aria-label={fav ? 'Tirar dos favoritos' : 'Favoritar'}
                >
                  ★
                </button>
                <button className="hunt-card-body" disabled={noKey || sealed} onClick={() => props.onPick(node)}>
                  <span className="hunt-thumb">
                    <MonsterSprite sprite={lead?.sprite ?? ''} height={56} />
                  </span>
                  <span className="hunt-text">
                    <strong>{h.name}</strong>
                    <HuntFocusTag focus={h.focus ?? 'balanced'} />
                    {h.monsters.includes(boostedId) && (
                      <span
                        className="hunt-boosted-tag"
                        title={tr(`Contém a Criatura do Dia (${boostedMonster?.name})! +${Math.round((BOOSTED_XP_MULT - 1) * 100)}% XP e +${Math.round((BOOSTED_LOOT_MULT - 1) * 100)}% Loot`, `Has the Boosted Creature (${boostedMonster?.name})! +${Math.round((BOOSTED_XP_MULT - 1) * 100)}% XP and +${Math.round((BOOSTED_LOOT_MULT - 1) * 100)}% Loot`)}
                      >
                        <Pix name="ui_star" /> {t('hunt.boosted_tag')}
                      </span>
                    )}
                    <span className="small">{h.monsters.map((m) => monsterById(m)?.name).join(', ')}</span>
                    <HuntWeaknesses monsters={h.monsters} />
                  </span>
                </button>
                <footer className="hunt-foot small">
                  <span>
                    {h.boss ? `${t('hunt.instance')} · ` : pack > 1 ? `${t('hunt.pack')} ${pack}x · ` : ''}
                    {h.region}
                  </span>
                  {h.key && (
                    <span className={noKey ? 'danger' : ''} title={tr(`Gasta 1 ${itemById(h.key)?.name} por entrada`, `Uses 1 ${itemName(itemById(h.key)?.name ?? '')} per entry`)}>
                      <img className="icon tiny" src={`/assets/icons/${itemById(h.key)?.icon}.png`} alt="" /> {keys}
                    </span>
                  )}
                  <span
                    className={danger ? 'danger' : ''}
                    title={level >= MASTERY_MIN_LEVEL && !h.boss && !h.lair && !h.raid ? tr('Do 400 em diante, o nível que conta nas caçadas é o seu nível de combate + a sua Maestria', 'From 400 on, the level that counts in hunts is your combat level + your Mastery') : undefined}
                  >
                    {t('hunt.level')} {level}+
                    {level >= MASTERY_MIN_LEVEL && !h.boss && !h.lair && !h.raid && ` (${tr("combate + Maestria", "combat + Mastery")})`}
                  </span>
                </footer>
                {props.huntXp?.[`${h.id}@${difficulty}`] !== undefined && (
                  <p className="hunt-xph small" title={tr('Média da sua última caçada aqui (10 min ou mais), com todos os bônus', 'Average of your last hunt here (10+ min), with all bonuses')}>
                    {tr('Sua XP/h', 'Your XP/h')}: <b>{fmtXpH(props.huntXp[`${h.id}@${difficulty}`])}</b>
                  </p>
                )}
                {sealed && <p className="hunt-gap small danger"><Pix name="ui_lock" /> {t('hunt.requires_quest')} {storyText(storyById(h.requires!)?.name ?? '')}</p>}
                {gearRequired(h.level + diff.level) > 0 && !h.boss && !h.lair && !h.raid && props.gearPower !== undefined && (() => {
                  const short = gearShortfall(h, props.gearPower, diff.level);
                  return (
                    <p className={`hunt-gap small ${short > 0 ? 'danger' : 'low'}`}>
                      {tr(`Pede nota de equipamento ${gearRequired(h.level + diff.level)} (a sua: ${props.gearPower})`, `Needs gear score ${gearRequired(h.level + diff.level)} (yours: ${props.gearPower})`)}
                      {short > 0 &&
                        tr(
                          `: monstros com +${Math.round((endgameAttackMult(h, props.gearPower, diff.level) - 1) * 100)}% de ataque e +${Math.round((endgameHpMult(h, props.gearPower, diff.level) - 1) * 100)}% de vida`,
                          `: monsters get +${Math.round((endgameAttackMult(h, props.gearPower, diff.level) - 1) * 100)}% attack and +${Math.round((endgameHpMult(h, props.gearPower, diff.level) - 1) * 100)}% HP`,
                        )}
                    </p>
                  );
                })()}
                {underLevelPenalty(h, props.huntLevel ?? props.combatLevel) && (
                  <p className="hunt-gap small danger">
                    {tr(
                      `Abaixo do nível ${h.level}: os monstros tomam só ${Math.round(UNDERLEVEL_DAMAGE * 100)}% do seu dano e a XP cai para ${Math.round(UNDERLEVEL_XP * 100)}%`,
                      `Below level ${h.level}: monsters take only ${Math.round(UNDERLEVEL_DAMAGE * 100)}% of your damage and XP drops to ${Math.round(UNDERLEVEL_XP * 100)}%`,
                    )}
                  </p>
                )}
                {(gap.attack > 0 || gap.xp < 1) && (
                  <p className={`hunt-gap small ${gap.attack > 0 ? 'danger' : 'low'}`}>
                    {gap.attack > 0
                      ? (getLang() === 'pt' ? `Acima do seu nível: monstros com +${Math.round(gap.attack * 100)}% de ataque` : `Above your level: monsters have +${Math.round(gap.attack * 100)}% attack`)
                      : (getLang() === 'pt' ? `Abaixo do seu nível: só ${Math.round(gap.xp * 100)}% do XP` : `Below your level: only ${Math.round(gap.xp * 100)}% XP`)}
                  </p>
                )}
                {!h.boss && !h.lair && !h.raid && overLevelXpMult(h.level, level, pl) < 1 && (
                  <p className="hunt-gap small danger">
                    {tr(
                      `Muito acima do seu nível: a XP cai para ${Math.round(overLevelXpMult(h.level, level, pl) * 100)}% (cheia até ${OVER_LEVEL_XP_GRACE} níveis acima)`,
                      `Far above your level: XP drops to ${Math.round(overLevelXpMult(h.level, level, pl) * 100)}% (full up to ${OVER_LEVEL_XP_GRACE} levels above)`,
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        </>
        )}
      </section>
    </div>
  );
}
