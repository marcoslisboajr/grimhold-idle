import {
  formatRaidPhaseMechanics,
  formatRaidPhaseTitle,
  itemById,
  nextWeekResetAt,
  RAID_CHEST_COST,
  RAID_CHEST_GOLD,
  RAID_CHEST_WEEKLY_LIMIT,
  RAID_FRAGMENT_ID,
  RAID_ID,
  RAID_MAX_PARTY,
  RAID_MIN_LEVEL,
  RAID_MIN_PARTY,
  RAID_PITY_BONUS,
  RAID_SET_ITEMS,
  RAID_SHOP_SET_COST,
  RAIDS,
  raidMonsterById,
  SOUL_RAID_ID,
  SOUL_RAID_MIN_LEVEL,
  weekOf,
  type PartyView,
  type RaidDef,
} from '@grimhold/shared';
import { MonsterSprite } from './Battle.tsx';
import { getLang, itemName, t, tr } from './i18n.ts';
import { Pix } from './Pix.tsx';

interface RaidPanelProps {
  combatLevel: number;
  current: string | null;
  party: PartyView | null;
  inventory: { id: string; count: number }[];
  raidClears?: number[];
  raidPity?: number;
  raidClearsByRaid?: Record<string, number[]>;
  raidPityByRaid?: Record<string, number>;
  raidChestPurchases?: number;
  raidBoughtPieces?: string[];
  raidRanking?: { name: string; at: number; solo: boolean }[];
  raidRankings?: Record<string, { name: string; at: number; solo: boolean }[]>;
  now: number;
  onPick: (node: string) => void;
  onBuyShop: (item: string) => void;
}

export function RaidPanel(props: RaidPanelProps) {
  const fmt = (n: number) => n.toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
  const week = weekOf(props.now);
  const resetMs = Math.max(0, nextWeekResetAt(props.now) - props.now);
  const totalMins = Math.ceil(resetMs / 60_000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;

  const fragCount = props.inventory.find((i) => i.id === RAID_FRAGMENT_ID)?.count ?? 0;
  const chestBought = props.raidChestPurchases ?? 0;
  const boughtPieces = props.raidBoughtPieces ?? [];

  const members = props.party?.members ?? [];
  const isLeader = members.some((m) => m.isLeader && props.party?.leaderId === m.characterId);

  return (
    <div className="raid-tab">
      <p className="small instance-intro">
        {tr(
          'As Raides são os desafios supremos de fim de jogo para aventureiros preparados. Enfrente chefes colossais em fases sequenciais de alta intensidade. Cada fase garante recompensas 1 vez por semana por personagem, com reinício toda segunda-feira às 00:00 (horário de Brasília).',
          'Raids are the ultimate endgame challenges for prepared adventurers. Face colossal bosses in intense sequential phases. Each phase yields weekly rewards once per week per character, resetting every Monday at 00:00 BRT.',
        )}
      </p>

      {/* Semana e Timer */}
      <div className="lair-group-tip" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <strong>
            <Pix name="ui_star" /> {tr('Semana da Raide:', 'Raid Week:')} {week}
          </strong>
          <span className="small">
            {tr('Reinicia em', 'Resets in')} <b>{days}d {hours}h {mins}min</b> {tr('(segunda 00:00 BRT)', '(Monday 00:00 BRT)')}
          </span>
        </div>
      </div>

      {/* Lista das Raides */}
      {[...RAIDS].sort((a, b) => a.minLevel - b.minLevel).map((raid: RaidDef) => {
        const raidId = raid.id;
        const clears = props.raidClearsByRaid?.[raidId] ?? (raidId === RAID_ID ? (props.raidClears ?? []) : []);
        const pityWeeks = props.raidPityByRaid?.[raidId] ?? (raidId === RAID_ID ? (props.raidPity ?? 0) : 0);
        const pityPct = Math.round(pityWeeks * RAID_PITY_BONUS * 100);
        const finalPhase = raid.phases.length;
        const baseSetChance = raid.rewards[finalPhase]?.setChance ?? 0.12;
        const totalSetChance = Math.min(100, Math.round((baseSetChance + pityWeeks * RAID_PITY_BONUS) * 100));

        const minParty = raid.minParty ?? RAID_MIN_PARTY;
        const maxParty = raid.maxParty ?? RAID_MAX_PARTY;
        const inValidParty = members.length >= minParty && members.length <= maxParty;
        const underLevelMember = members.find((m) => m.level < raid.minLevel);
        const isThisRaidRunning = props.current === raidId;
        const isAnyRaidRunning = RAIDS.some((r) => r.id === props.current);

        const canStartGroup = props.combatLevel >= raid.minLevel && inValidParty && isLeader && !underLevelMember;
        const canStartSolo = !!raid.allowSolo && props.combatLevel >= raid.minLevel;

        const mainBoss = raid.phases[finalPhase - 1]?.monster ?? raid.phases[0]?.monster;
        const bossSprite = (mainBoss && raidMonsterById(mainBoss)?.sprite) ?? raid.reusedSprite ?? 'raid_usurper_king';
        const raidRanking = props.raidRankings?.[raidId] ?? (raidId === RAID_ID ? (props.raidRanking ?? []) : []);

        return (
          <div
            key={raidId}
            className={`hunt-card boss instance-card ${isThisRaidRunning ? 'active' : ''}`}
            style={{ marginBottom: 16 }}
          >
            <div className="hunt-card-body" style={{ cursor: 'default' }}>
              <span className="hunt-thumb">
                <MonsterSprite sprite={bossSprite} height={76} />
              </span>
              <span className="hunt-text" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{tr(raid.name, raid.en)}</strong>
                    {!raid.enabled && (
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          color: '#e4e4e7',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {tr('Em breve', 'Coming Soon')}
                      </span>
                    )}
                  </div>
                  <span className="small" style={{ color: '#ffd700' }}>
                    <Pix name="soul_gem" /> <b>{fmt(fragCount)}</b> {tr('Fragmentos', 'Fragments')}
                  </span>
                </div>
                <span className="small muted">
                  {tr('Chefe', 'Boss')}: <b>{tr(raid.bossName ?? '', raid.bossEn ?? '')}</b> · {tr(raid.region, raid.regionEn)}
                </span>

                {/* Fases */}
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  {raid.phases.map((phase, idx) => {
                    const phaseNum = idx + 1;
                    const isCleared = clears.includes(phaseNum);
                    const reward = raid.rewards[phaseNum];
                    const title = formatRaidPhaseTitle(phase, idx, getLang());
                    const mechanic = formatRaidPhaseMechanics(phase, getLang());
                    const isLast = phaseNum === finalPhase;

                    return (
                      <div
                        key={phaseNum}
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          padding: '6px 8px',
                          borderRadius: 4,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0 }}>
                            <MonsterSprite sprite={raidMonsterById(phase.monster)?.sprite ?? phase.monster} height={40} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 'bold', color: isCleared ? '#4ade80' : '#ffea88' }}>
                              {isCleared ? '✓ ' : ''}{title}
                            </span>
                            <div className="small muted">{mechanic}</div>
                          </div>
                        </div>
                        <span className="small" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Pix name="gold" /> {fmt(reward.gold)} · {reward.fragments}× <Pix name="soul_gem" />
                          {isLast ? (
                            <>
                              {' '}· <b>{totalSetChance}% Set</b>
                            </>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Piedade */}
                <div className="small muted" style={{ marginTop: 6 }}>
                  {tr(
                    `Piedade da Fase ${finalPhase}: +${pityPct}% de chance acumulada (${pityWeeks} semanas sem peça). Chance atual do set: ${totalSetChance}%.`,
                    `Phase ${finalPhase} Pity: +${pityPct}% accumulated chance (${pityWeeks} weeks without piece). Current set chance: ${totalSetChance}%.`,
                  )}
                </div>
              </span>
            </div>

            {/* Botões de Ação */}
            <footer
              className="hunt-foot small"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 12px' }}
            >
              <span className={props.combatLevel < raid.minLevel ? 'danger' : 'loot-pos'}>
                {tr(`Requer Nível ${raid.minLevel}+ de combate`, `Requires Combat Level ${raid.minLevel}+`)}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Botão Grupo */}
                <button
                  type="button"
                  className="primary small-btn"
                  disabled={!raid.enabled || !canStartGroup || isAnyRaidRunning}
                  onClick={() => props.onPick(raidId)}
                  title={
                    !raid.enabled
                      ? tr('A Raide abre em breve.', 'The Raid opens soon.')
                      : props.combatLevel < raid.minLevel
                        ? tr(`Requer nível ${raid.minLevel}+ de combate`, `Requires combat level ${raid.minLevel}+`)
                        : !inValidParty
                          ? tr(`Requer grupo com ${minParty} a ${maxParty} jogadores`, `Requires a party of ${minParty} to ${maxParty} players`)
                          : underLevelMember
                            ? tr(`${underLevelMember.name} precisa de nível ${raid.minLevel}+`, `${underLevelMember.name} needs level ${raid.minLevel}+`)
                            : !isLeader
                              ? tr('Apenas o líder pode iniciar', 'Leader only')
                              : ''
                  }
                >
                  {!raid.enabled
                    ? tr('Em breve', 'Coming Soon')
                    : isThisRaidRunning
                      ? tr('Raide em Andamento', 'Raid in Progress')
                      : !inValidParty
                        ? tr(`Grupo (${minParty}–${maxParty})`, `Party (${minParty}–${maxParty})`)
                        : !isLeader
                          ? tr('Líder Inicia', 'Leader Only')
                          : tr('Iniciar Raide (Grupo)', 'Start Raid (Party)')}
                </button>

                {/* Botão Solo */}
                {raid.allowSolo ? (
                  <button
                    type="button"
                    className="secondary small-btn"
                    disabled={!raid.enabled || !canStartSolo || isAnyRaidRunning}
                    onClick={() => props.onPick(raidId)}
                    title={!raid.enabled ? tr('A Raide abre em breve.', 'The Raid opens soon.') : undefined}
                  >
                    {!raid.enabled
                      ? tr('Em breve', 'Coming Soon')
                      : tr('Iniciar Raide (Solo 50%)', 'Start Raid (Solo 50%)')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary small-btn"
                    disabled={true}
                    title={tr(
                      `${tr(raid.name, raid.en)} exige um grupo de ${minParty} a ${maxParty} jogadores (modo solo indisponível).`,
                      `${tr(raid.name, raid.en)} requires a party of ${minParty} to ${maxParty} players (solo mode unavailable).`,
                    )}
                  >
                    {tr('Modo Solo Indisponível', 'Solo Mode Unavailable')}
                  </button>
                )}
              </div>
            </footer>

            {/* Ranking da Semana desta Raide */}
            <div className="small" style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <strong>{tr(`Primeiros a vencer ${tr(raid.name, raid.en)} nesta semana`, `First to clear ${tr(raid.name, raid.en)} this week`)}</strong>
              {raidRanking?.length ? (
                <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
                  {raidRanking.map((r) => (
                    <li key={r.name + r.at}>
                      {r.name}
                      {r.solo ? <span className="loot-pos"> · {tr('sozinho', 'solo')}</span> : null}
                      <span className="muted">
                        {' '}· {new Date(r.at).toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="muted">{tr('Ninguém venceu ainda nesta semana.', 'Nobody has cleared it yet this week.')}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loja de Fragmentos de Raide */}
      <div className="raid-shop-box" style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 6, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong>
            <Pix name="soul_gem" /> {tr('Loja de Fragmentos de Raide', 'Raid Fragment Shop')}
          </strong>
          <span className="small">
            {tr('Seu saldo:', 'Your balance:')} <b>{fmt(fragCount)}</b> {tr('Fragmentos', 'Fragments')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {/* Peças do Set do Usurpador */}
          {RAID_SET_ITEMS.map((itemId) => {
            const it = itemById(itemId);
            if (!it) return null;
            const bought = boughtPieces.includes(itemId);
            const canAfford = fragCount >= RAID_SHOP_SET_COST;
            return (
              <div
                key={itemId}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: 8,
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <img className="icon" src={`/assets/icons/${it.icon}.png`} alt="" />
                  <div>
                    <strong style={{ fontSize: 13, color: '#f39c12' }}>{itemName(it.name)}</strong>
                    <div className="small muted">
                      {it.equip?.slot ? t(`slot.${it.equip.slot}`) : ""} · Nv {it.equip?.level}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span className="small" style={{ color: '#ffd700' }}>
                    {RAID_SHOP_SET_COST}× <Pix name="soul_gem" />
                  </span>
                  {bought ? (
                    <span className="small muted">✓ {tr('Adquirido', 'Acquired')}</span>
                  ) : (
                    <button
                      type="button"
                      className="primary tiny-btn"
                      disabled={!canAfford}
                      onClick={() => props.onBuyShop(itemId)}
                    >
                      {tr('Comprar (1x)', 'Buy (1x)')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Baú de Ouro */}
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: 8,
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Pix name="gold_bar" />
              <div>
                <strong style={{ fontSize: 13, color: '#f1c40f' }}>{tr('Baú de Ouro da Raide', 'Raid Gold Chest')}</strong>
                <div className="small muted">
                  <Pix name="gold" /> 300.000 {tr('de ouro', 'gold')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span className="small" style={{ color: '#ffd700' }}>
                {RAID_CHEST_COST}× <Pix name="soul_gem" /> ({chestBought}/{RAID_CHEST_WEEKLY_LIMIT})
              </span>
              <button
                type="button"
                className="primary tiny-btn"
                disabled={fragCount < RAID_CHEST_COST || chestBought >= RAID_CHEST_WEEKLY_LIMIT}
                onClick={() => props.onBuyShop('raid_chest')}
              >
                {chestBought >= RAID_CHEST_WEEKLY_LIMIT ? tr('Esgotado', 'Sold Out') : tr('Comprar', 'Buy')}
              </button>
            </div>
          </div>
        </div>

        {/* Bônus dos Sets */}
        <div className="small muted" style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
          <strong>{tr('Bônus do Set do Usurpador Ascendido (Lendário, Nível 400):', 'Ascended Usurper Set Bonuses (Legendary, Level 400):')}</strong>
          <br />
          • {tr('2 peças: +4% de ataque', '2 pieces: +4% attack')}
          <br />
          • {tr('4 peças: +6% de vida máxima e +4% de resistência a todos os elementos', '4 pieces: +6% max hp and +4% all elemental resistances')}
          <br />
          • {tr('Pela qualidade (raridade e refino, como os outros sets): 2 peças dão dano; as 4 dão dano, XP e loot. Com tudo +4#10: +60% de dano, +10% de XP e +15% de loot; com tudo +7#10: +120%, +20% e +30%.', 'By quality (rarity and refine, like other sets): 2 pieces give damage; all 4 give damage, XP and loot. All +4#10: +60% damage, +10% XP and +15% loot; all +7#10: +120%, +20% and +30%.')}
          <br />
          • {tr('Vencer a fase 3 dá o traje Usurpador Ascendido.', 'Clearing phase 3 grants the Ascended Usurper outfit.')}
        </div>

        <div className="small muted" style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
          <strong>{tr('Bônus do Set das Almas Partidas (Lendário, Nível 500):', 'Shattered Souls Set Bonuses (Legendary, Level 500):')}</strong>
          <br />
          • {tr('2 peças: +4% de ataque', '2 pieces: +4% attack')}
          <br />
          • {tr('4 peças: +6% de vida máxima e +4% de resistência a todos os elementos', '4 pieces: +6% max hp and +4% all elemental resistances')}
          <br />
          • {tr('Força ~8% acima do drop comum do nível 500. Peças dropam exclusivamente na Fase 6 da Guerra das Almas (15% chance base + piedade).', '~8% stronger than common level 500 drops. Pieces drop exclusively from Phase 6 of War of Souls (15% base chance + pity).')}
          <br />
          • {tr('Vencer a fase 6 dá o traje Almas Partidas.', 'Clearing phase 6 grants the Shattered Souls outfit.')}
        </div>
      </div>
    </div>
  );
}
