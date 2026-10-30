import {
  BOSS_DURATION_MS,
  BOSS_EVERY_MS,
  BOSS_HP_PER_PLAYER,
  BOSS_GREW_MS,
  BOSS_SHARE_MIN,
  BOSS_SHARE_SECS,
  BOSS_JOIN_CUTOFF_MS,
  BOSS_QUEUE_MS,
  GOLD,
  WORLD_BOSS_NODE,
  BOSS_DOWN_MS,
  bossSkillActive,
  runeBase,
  doomStep,
  rescaleBossHp,
  bossSkillCount,
  bossDps,
  bossDrain,
  bossSpellHit,
  minionFireball,
  MINION_FIREBALL_MS,
  type Fighter,
  bossEventAt,
  bossEventById,
  specialBossWarning,
  bossReward,
  equipmentBonus,
  withSigils,
  itemById,
  levelForXp,
  withPotion,
  RUNE_HEAL_MS,
  RUNE_STRIKE_MS,
  playerStats,
  defaultSpells,
  type BossReward,
  type OutfitId,
  type BossView,
  type WorldBoss,
  bosstiaryBonus,
  worldBossKey,
  withXpEvent,
  rngFor,
  ADDON_NAMES,
  type LookAddon,
  parseHuntNode,
  isDummyNode,
  WORLD_BOSS_COMBAT_PETS,
  COMBAT_PET_BOSS_CHANCE,
  petById,
} from '@grimhold/shared';
import type { Db } from './db.ts';

/** Para onde dá para voltar sozinho depois do chefe: profissão, boneco ou caçada comum (instância, covil e arena gastariam chave ou recarga). */
function canReturnTo(a: { skill: string; node: string }): boolean {
  if (a.skill !== 'combat') return true;
  if (isDummyNode(a.node)) return true;
  const hunt = parseHuntNode(a.node)?.hunt;
  return !!hunt && !hunt.boss && !hunt.lair;
}
import type { createGame } from './game.ts';

type Game = ReturnType<typeof createGame>;

/** No chefe global uma poção dura este tempo de luta (lá não há "lutas" contadas). */
export const BOSS_POTION_MS = 120_000;

export interface BossResult {
  characterId: number;
  boss: string;
  killed: boolean;
  damage: number;
  reward: BossReward;
}

/**
 * Chefe global no servidor: guarda o dano de quem entrou (no banco, para um
 * reinício não apagar a luta), soma o dano por segundo a cada tick e, quando o
 * chefe cai ou o tempo acaba, paga todo mundo e tira da arena. Evento que ficou
 * aberto porque o servidor caiu é pago no primeiro tick depois de voltar.
 */
export function createWorldBoss(db: Db, game: Game, opts: { everyMs?: number; durationMs?: number; cutoffMs?: number } = {}) {
  const everyMs = opts.everyMs ?? BOSS_EVERY_MS;
  const durationMs = opts.durationMs ?? BOSS_DURATION_MS;
  const cutoffMs = opts.cutoffMs ?? (durationMs <= 60_000 ? Math.floor(durationMs * 0.15) : BOSS_JOIN_CUTOFF_MS);
  // Último tick: os avisos de raid saem quando o horário deles passa entre um tick e outro.
  let lastTickAt: number | null = null;
  // Fila do chefe: quem entrou nos BOSS_QUEUE_MS antes vai para a arena quando ele nascer (só em memória).
  const queue = new Set<number>();
  // Quem a fila acabou de levar para a arena: o app manda o estado novo para a tela deles.
  let queueJoined: number[] = [];
  let current: { id: number; boss: WorldBoss; startsAt: number; endsAt: number; damage: Map<number, number>; lastAt: number; done: boolean } | null = null;

  // Vida (0 a 1) e queda de cada lutador. Só em memória: um reinício devolve todos com a vida cheia.
  const life = new Map<number, number>();
  const downUntil = new Map<number, number>();
  // Poção ativa até quando, e quando cada runa fica pronta de novo (também só em memória).
  const potionUntil = new Map<number, number>();
  const healReady = new Map<number, number>();
  const strikeReady = new Map<number, number>();
  // Última runa usada (para o cliente mostrar o número).
  const lastStrike = new Map<number, { at: number; dmg: number }>();
  const lastHeal = new Map<number, { at: number; pct: number }>();
  // Recarga de cada magia e as lançadas nos últimos segundos (para a barra e os efeitos).
  const spellReady = new Map<number, Map<string, number>>();
  const recentCasts = new Map<number, { id: string; at: number; dmg?: number; heal?: number }[]>();
  // Próxima bola de fogo dos servos em cada lutador e a última que levou.
  const fireballAt = new Map<number, number>();
  const lastFireball = new Map<number, { at: number; pct: number }>();
  const CASTS_SHOWN_MS = 6000;
  /** Entre uma magia e outra (como no Tibia): antes saíam todas as prontas no mesmo instante e voltavam juntas. Cura conta à parte. */
  const SPELL_GCD_MS = 2000;
  const nextAttackCast = new Map<number, number>();
  const nextHealCast = new Map<number, number>();

  /**
   * Magias prontas saem de verdade, na ordem da barra: golpes batem no chefe (as
   * marcadas para 2+/3+ monstros não saem, ele é um só), cura só abaixo do limite
   * da barra. Buffs e escudo seguem pela média no dano e na perda de vida, mas
   * também aparecem lançados. Devolve o dano no chefe e a cura (fração da vida).
   */
  function castSpells(characterId: number, level: number, stats: Fighter, now: number, hp: number): { dmg: number; heal: number } {
    if (!current) return { dmg: 0, heal: 0 };
    const rules = db.combatRulesFor(characterId);
    let ready = spellReady.get(characterId);
    if (!ready) spellReady.set(characterId, (ready = new Map()));
    const casts = (recentCasts.get(characterId) ?? []).filter((c) => now - c.at < CASTS_SHOWN_MS);
    let dmg = 0;
    let heal = 0;
    for (const sp of stats.spells ?? []) {
      if (sp.level > level || (ready.get(sp.id) ?? 0) > now) continue;
      const e = sp.effect;
      // Uma magia por vez: a cura tem a vez dela; golpe, buff e escudo dividem a outra.
      const gcd = e.kind === 'heal' ? nextHealCast : nextAttackCast;
      if ((gcd.get(characterId) ?? 0) > now) continue;
      if (e.kind === 'strike') {
        const when = rules?.strike?.[sp.id];
        if (when === 'aoe2' || when === 'aoe3') continue;
        const hit = bossSpellHit(stats, current.boss, e.mult);
        dmg += hit;
        casts.push({ id: sp.id, at: now, dmg: hit });
      } else if (e.kind === 'heal') {
        if (hp + heal >= (rules?.heal?.[sp.id] ?? e.below)) continue;
        const amount = Math.min(e.pct, 1 - hp - heal);
        heal += amount;
        casts.push({ id: sp.id, at: now, heal: amount });
      } else if (e.kind === 'shield' && e.heal) {
        // Escudo que também cura (Muralha Divina).
        const amount = Math.max(0, Math.min(e.heal, 1 - hp - heal));
        heal += amount;
        casts.push({ id: sp.id, at: now, heal: amount });
      } else {
        casts.push({ id: sp.id, at: now });
      }
      ready.set(sp.id, now + sp.cooldownMs);
      gcd.set(characterId, now + SPELL_GCD_MS);
    }
    recentCasts.set(characterId, casts);
    return { dmg, heal };
  }

  // Vida que cada lutador somou ao chefe (o próprio dano de BOSS_SHARE_SECS), calculada na entrada.
  const shares = new Map<number, number>();
  function shareOf(characterId: number): number {
    let v = shares.get(characterId);
    if (v === undefined) {
      const s = statsOf(characterId);
      const dps = s && current ? bossDps(s.stats, current.boss) : 0;
      // Desconta o tempo caído: quem morre rápido bate menos, então soma menos vida.
      const drain = s ? bossDrain(s.stats, s.level, s.ch.vocation) * (current?.boss.pressure ?? 1) : 0;
      const alive = drain > 0 ? 1 / drain : Infinity;
      const uptime = alive === Infinity ? 1 : alive / (alive + BOSS_DOWN_MS / 1000);
      const secs = current?.boss.shareSecs ?? BOSS_SHARE_SECS;
      v = Math.max((BOSS_SHARE_MIN * secs) / BOSS_SHARE_SECS, Math.round(dps * uptime * secs));
      shares.set(characterId, v);
    }
    return v;
  }
  const maxHp = () => (current?.damage.size ? [...current.damage.keys()].reduce((sum, id) => sum + shareOf(id), 0) : BOSS_HP_PER_PLAYER);
  const dealt = () => [...(current?.damage.values() ?? [])].reduce((a, b) => a + b, 0);

  /** Quantos lutadores a arena desenha (os lugares em volta do chefe). */
  const BOSS_SHOWN = 12;

  /** Golpes próprios do chefe já aplicados nesta luta (qual volta do relógio). */
  const skillDone = new Map<string, number>();
  let swallowed: { name: string; at: number; skill?: string } | undefined;
  /** Vida que o chefe recuperou com os golpes de cura nesta luta. */
  let healed = 0;
  /** DOOM: quantos já vieram e até quando vai a janela do IK aberta (null: fechada). */
  let doomStage = 0;
  let doomUntil: number | null = null;
  let doomAt = 0;
  /** Quando cada um entrou (a vida máxima sobe com quem entra: o cliente avisa "+N jogadores"). */
  let joins: number[] = [];

  function statsOf(characterId: number) {
    const ch = db.characterById(characterId);
    if (!ch) return null;
    const skills = db.skillsFor(characterId);
    const xp = skills.combat ?? 0;
    const level = levelForXp(xp, 'combat');
    const spells = db.spellsFor(characterId) ?? defaultSpells(ch.vocation, level);
    return {
      ch,
      level,
      stats: playerStats(ch.vocation, xp, game.combatBonus(characterId), ch.promotion, spells, skills),
    };
  }

  /**
   * Um trecho de luta de um lutador: perde vida para o chefe e, se zerar, cai
   * por BOSS_DOWN_MS (não bate). Devolve o dano causado no trecho.
   */
  function fight(characterId: number, now: number, dt: number, enrage = 1): number {
    const s = statsOf(characterId);
    if (!s || !current) return 0;
    // Na arena (lutando ou caído) a stamina corre como na caçada (antes ficava parada e até voltava).
    game.spendStamina(characterId, dt, now);
    const down = downUntil.get(characterId) ?? 0;
    if (now < down) return 0;
    // Voltou da queda: volta com a vida cheia e só bate a partir de agora.
    let from = now - dt;
    if (down > 0) {
      downUntil.delete(characterId);
      life.set(characterId, 1);
      from = Math.max(from, down);
    }
    const secs = (now - from) / 1000;
    // Poção escolhida: bebe 1 do banco e vale BOSS_POTION_MS (mais ou menos 10 lutas normais).
    const potion = db.potionFor(characterId);
    if (potion && itemById(potion)?.potion && (potionUntil.get(characterId) ?? 0) <= now && db.useItem(characterId, potion)) {
      potionUntil.set(characterId, now + BOSS_POTION_MS);
    }
    const stats = potion && (potionUntil.get(characterId) ?? 0) > now ? withPotion(s.stats, potion) : s.stats;
    // Alguns chefes especiais apertam mais (pressure > 1); os com servos apertam pelas bolas de fogo.
    const drain = bossDrain(stats, s.level, s.ch.vocation) * (current.boss.pressure ?? 1) * enrage;
    let before = life.get(characterId) ?? 1;
    // Runa de cura: abaixo do limite, cura e gasta 1 (recarga como na caçada).
    const [runeAtk, runeHeal] = db.runesFor(characterId);
    const heal = runeHeal ? itemById(runeHeal)?.rune : undefined;
    if (heal?.kind === 'heal' && before < (db.combatRulesFor(characterId)?.runeHealBelow ?? heal.below) && (healReady.get(characterId) ?? 0) <= now && db.useItem(characterId, runeHeal!)) {
      healReady.set(characterId, now + RUNE_HEAL_MS);
      lastHeal.set(characterId, { at: now, pct: Math.min(heal.pct, 1 - before) });
      before = Math.min(1, before + heal.pct);
    }
    // Servos do chefe especial: de tempos em tempos uma bola de fogo (a defesa ajuda menos).
    if (current.boss.minions) {
      const next = fireballAt.get(characterId);
      if (next === undefined) fireballAt.set(characterId, now + Math.random() * MINION_FIREBALL_MS);
      else if (next <= now) {
        const pct = minionFireball(stats, s.level);
        before -= pct;
        lastFireball.set(characterId, { at: now, pct });
        // Mais servos, mais bolas (o padrão é para 4).
        fireballAt.set(characterId, now + ((MINION_FIREBALL_MS * 4) / current.boss.minions.count) * (0.6 + Math.random() * 0.8));
      }
    }
    // Magias: golpes e cura saem de verdade (a cura entra antes da perda do trecho).
    const cast = before > 0 ? castSpells(characterId, s.level, stats, now, before) : { dmg: 0, heal: 0 };
    before = Math.min(1, before + cast.heal);
    const hp = Math.min(1, before - drain * secs);
    const dps = bossDps(stats, current.boss, false);
    // Runa de ataque: um golpe extra no chefe a cada recarga.
    const strike = runeAtk ? itemById(runeAtk)?.rune : undefined;
    let bonus = cast.dmg;
    if (strike?.kind === 'strike' && hp > 0 && (strikeReady.get(characterId) ?? 0) <= now && db.useItem(characterId, runeAtk!)) {
      strikeReady.set(characterId, now + RUNE_STRIKE_MS);
      const runeHit = Math.max(1, runeBase({ attack: stats.attack, level: s.level }, current.boss.defense) * strike.mult);
      bonus += runeHit;
      lastStrike.set(characterId, { at: now, dmg: Math.round(runeHit) });
    }
    if (hp <= 0) {
      // Caiu no meio do trecho: bateu só até a vida zerar.
      const alive = Math.max(0, Math.min(secs, before / drain));
      downUntil.set(characterId, from + alive * 1000 + BOSS_DOWN_MS);
      life.set(characterId, 0);
      return dps * alive + bonus;
    }
    life.set(characterId, hp);
    return dps * secs + bonus;
  }

  /** Retoma um evento do banco (o dano de quem já tinha entrado continua valendo). */
  function load(eventId: number, now: number) {
    shares.clear();
    skillDone.clear();
    swallowed = undefined;
    healed = 0;
    doomStage = 0;
    doomUntil = null;
    doomAt = 0;
    joins = [];
    const saved = db.bossEvent(eventId);
    const ev = bossEventById(eventId, everyMs, durationMs);
    return {
      id: eventId,
      boss: ev.boss,
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      damage: saved.damage,
      lastAt: now,
      done: saved.done,
    };
  }

  function finish(now: number, killed: boolean, ikBonus = 0): BossResult[] {
    if (!current) return [];
    current.done = true;
    life.clear();
    downUntil.clear();
    db.saveBossDamage(current.id, current.damage);
    db.finishBossEvent(current.id);
    const ranking = [...current.damage.entries()].sort((a, b) => b[1] - a[1]);
    const results: BossResult[] = [];
    // Addon do evento: um só, sorteado entre quem bateu (o sorteio é fixo pelo evento).
    const hitters = ranking.filter(([, d]) => d > 0).map(([id]) => id).sort((a, b) => a - b);
    const addonWinner = killed && current.boss.addon && hitters.length ? hitters[Math.floor(rngFor(current.id, 0)() * hitters.length)] : undefined;
    for (const [characterId, damage] of ranking) {
      const level = levelForXp(db.skillsFor(characterId).combat ?? 0, 'combat');
      // Bônus do Bosstiary pelas vitórias de antes (esta conta para a próxima).
      const reward = bossReward(current.boss, current.id, characterId, level, Math.round(damage), killed, characterId === ranking[0][0], shareOf(characterId), bosstiaryBonus(db.bestiaryFor(characterId)), ikBonus, db.characterById(characterId)?.vocation);
      // Evento especial: todo participante ganha o traje do chefe.
      if (current.boss.outfit) {
        reward.outfit = current.boss.outfit;
        db.unlockOutfit(characterId, current.boss.outfit as OutfitId);
      }
      // Evento especial: quem bateu ganha o mascote do chefe, se ele cair.
      if (killed && damage > 0 && current.boss.pet) {
        reward.pet = current.boss.pet;
        db.unlockPet(characterId, current.boss.pet);
      }
      // Mascote de combate do chefe mundial: chance rara para quem bateu, se ele cair.
      const combatPet = WORLD_BOSS_COMBAT_PETS[current.boss.id];
      if (killed && damage > 0 && combatPet && !db.petsFor(characterId).includes(combatPet) && Math.random() < COMBAT_PET_BOSS_CHANCE) {
        db.unlockPet(characterId, combatPet);
        game.announce(`${db.characterById(characterId)?.name ?? 'Um aventureiro'} ganhou o mascote ${petById(combatPet)?.name ?? combatPet} de ${current.boss.name}!`);
      }
      if (characterId === addonWinner && current.boss.addon) {
        reward.addon = current.boss.addon;
        db.unlockAddon(characterId, current.boss.addon as LookAddon);
        const addonName = ADDON_NAMES[current.boss.addon as LookAddon] ?? current.boss.addon;
        game.announce(`${db.characterById(characterId)?.name ?? 'Um aventureiro'} ganhou o ${addonName} de ${current.boss.name}!`);
      }
      const items: Record<string, number> = { [GOLD]: reward.gold };
      if (reward.tokens && reward.tokens > 0) {
        items['boss_token'] = reward.tokens;
        // Essência de Chefe para refinar e ascender as peças de chefe.
        items['boss_essence'] = Math.max(2, Math.ceil(reward.tokens / 3));
      }
      for (const [item, qty] of Object.entries(reward.loot ?? {})) items[item] = (items[item] ?? 0) + qty;
      if (reward.legendaries && reward.legendaries.length > 0) {
        for (const item of reward.legendaries) items[item] = (items[item] ?? 0) + 1;
      } else if (reward.legendary) {
        items[reward.legendary] = 1;
      }
      // Sai da arena só quem ainda está nela (pode ter ido fazer outra coisa).
      const inArena = db.activityFor(characterId)?.node === WORLD_BOSS_NODE;
      db.applyGains(characterId, { actions: 0, items, xp: withXpEvent({ combat: reward.xp }, now) }, now, 0, inArena);
      // Volta para o que fazia antes do chefe (se não der: a fila de profissões, ou fica na cidade).
      const ret = db.bossReturnFor(characterId);
      db.setBossReturn(characterId, null);
      if (inArena && !(ret && game.resumeAfterBoss(characterId, ret, now))) game.startQueued(characterId, now);
      if (killed) db.addStat(characterId, 'bosses', 1);
      // Título do Imortal: quem bateu nele quando ele caiu.
      if (killed && damage > 0 && current.boss.doom) db.addStat(characterId, 'immortal_slain', 1);
      // Bosstiary: vitória no chefe mundial para quem bateu nele.
      if (killed && damage > 0) db.addBestiaryKills(characterId, { [worldBossKey(current.boss.id)]: 1 });
      results.push({ characterId, boss: current.boss.name, killed, damage: Math.round(damage), reward });
      db.addBossResult(characterId, now, { boss: current.boss.name, killed, damage: Math.round(damage), reward });
    }
    return results;
  }

  return {
    /** Avança o evento. Devolve o anúncio (quando o chefe aparece) e os resultados (quando acaba). */
    tick(now: number): { announce?: string; warning?: string; results: BossResult[] } {
      const warning = lastTickAt === null ? undefined : specialBossWarning(lastTickAt, now);
      lastTickAt = now;
      const ev = bossEventAt(now, everyMs, durationMs);
      let announce: string | undefined;
      const results: BossResult[] = [];
      // Eventos que ficaram sem pagar (o servidor caiu no meio): paga pelo dano salvo.
      for (const old of db.openBossEvents(ev.active ? ev.id : -1)) {
        current = load(old, now);
        results.push(...finish(now, dealt() >= maxHp()));
      }
      if (ev.active && current?.id !== ev.id) {
        current = load(ev.id, now);
        // Retomado depois de um reinício: não grita de novo.
        if (!current.done && current.damage.size === 0) announce = ev.boss.shout;
        // Fila: todos entram agora, mesmo offline (o join guarda o que faziam para voltar no fim).
        if (!current.done) for (const id of queue) if (this.join(id, now) === null) queueJoined.push(id);
        queue.clear();
      }
      if (results.length) return { announce, warning, results };
      if (!current || current.done) return { announce, warning, results: [] };
      const dt = Math.max(0, Math.min(5000, now - current.lastAt));
      current.lastAt = now;
      const skills = current.boss.skills ?? [];
      const on = (kind: string) => skills.filter((k) => k.kind === kind && bossSkillActive(k, current!.startsAt, now));
      // Imune (voo, escudo, tampa): o golpe sai (gasta, a vida cai), mas nenhum dano entra no chefe.
      const immune = on('immune').length > 0;
      // Enfraquecido (teia, luz cegante): todos causam menos dano; fúria: o chefe aperta mais.
      const weak = on('weaken').reduce((m, k) => m * (1 - (k.pct ?? 0)), 1);
      const enrage = on('enrage').reduce((m, k) => m * (k.pct ?? 1), 1);
      for (const id of current.damage.keys()) {
        // Saiu da arena (foi caçar, minerar...): para de bater, mas o dano feito conta.
        if (db.activityFor(id)?.node !== WORLD_BOSS_NODE) continue;
        const hit = fight(id, now, dt, enrage);
        current.damage.set(id, current.damage.get(id)! + (immune ? 0 : hit * weak));
      }
      // Golpes instantâneos: cada um uma vez por volta do relógio.
      const inArena = [...current.damage.keys()].filter((id) => db.activityFor(id)?.node === WORLD_BOSS_NODE && (downUntil.get(id) ?? 0) <= now);
      for (const k of skills) {
        if (k.kind !== 'aoe' && k.kind !== 'stun' && k.kind !== 'heal') continue;
        const n = bossSkillCount(k, current.startsAt, now);
        if (n < 0 || n === skillDone.get(k.id)) continue;
        skillDone.set(k.id, n);
        if (k.kind === 'aoe') {
          for (const id of inArena) {
            // A resistência ao elemento do golpe diminui o dano.
            const res = k.element ? Math.min(0.8, statsOf(id)?.stats.resistPct?.[k.element] ?? 0) : 0;
            const pct = (k.pct ?? 0) * (1 - res);
            const hp = (life.get(id) ?? 1) - pct;
            if (hp <= 0) {
              life.set(id, 0);
              downUntil.set(id, now + BOSS_DOWN_MS);
            } else life.set(id, hp);
            lastFireball.set(id, { at: now, pct });
          }
        } else if (k.kind === 'stun') {
          if (inArena.length) {
            const victim = inArena[Math.floor(Math.random() * inArena.length)];
            downUntil.set(victim, now + k.ms);
            swallowed = { name: db.characterById(victim)?.name ?? '', at: now, skill: k.id };
          }
        } else {
          // Cura: volta parte da vida máxima (nunca acima da cheia).
          healed = Math.min(dealt(), healed + maxHp() * (k.pct ?? 0));
        }
      }
      db.saveBossDamage(current.id, current.damage);
      // DOOM: grito com pouca vida, 30 s para o IK; se não der, dano em todos e ele se refaz.
      const doom = current.boss.doom;
      if (doom) {
        const step = doomStep(doom, { stage: doomStage, until: doomUntil }, maxHp() - (dealt() - healed), maxHp(), now);
        if (step.kind === 'ik') return { announce: doom.killText, warning, results: finish(now, true, step.bonus) };
        if (step.kind === 'open') {
          doomUntil = step.until;
          return { announce: doomStage < (doom.noIk ?? 0) && doom.firstShout ? doom.firstShout : doom.shout, warning, results: [] };
        }
        if (step.kind === 'doom') {
          for (const id of inArena) {
            const res = Math.min(0.8, statsOf(id)?.stats.resistPct?.[doom.element] ?? 0);
            const pct = doom.pct * (1 - res);
            const hp = (life.get(id) ?? 1) - pct;
            if (hp <= 0) {
              life.set(id, 0);
              downUntil.set(id, now + BOSS_DOWN_MS);
            } else life.set(id, hp);
            lastFireball.set(id, { at: now, pct });
          }
          healed += step.heal;
          doomStage++;
          doomUntil = null;
          doomAt = now;
          return { announce: doom.text, warning, results: [] };
        }
        // Antes do último DOOM ele não cai sem a janela do IK.
        if (doomStage < doom.at.length) return now >= current.endsAt ? { announce, warning, results: finish(now, false) } : { announce, warning, results: [] };
      }
      if (dealt() - healed >= maxHp()) return { announce, warning, results: finish(now, true) };
      if (now >= current.endsAt) return { announce, warning, results: finish(now, false) };
      return { announce, warning, results: [] };
    },

    /** Entra na luta (troca a atividade atual pela arena). Devolve o erro, ou null. */
    join(characterId: number, now: number): string | null {
      if (!current || current.done || now >= current.endsAt) return 'Não há chefe global agora.';
      if (now >= current.endsAt - cutoffMs && !current.damage.has(characterId)) {
        return 'O portal para o chefe global já foi selado nesta fase final!';
      }
      game.settle(characterId, now);
      // Guarda o que fazia antes (caçada comum, boneco ou profissão) para voltar quando o chefe acabar.
      const prev = db.activityFor(characterId);
      // A hora marcada da fila (ex.: 30 min minerando) também volta: guarda quanto faltava.
      const until = db.queueFor(characterId).until;
      const leftMs = until !== null ? Math.max(0, until - now) : null;
      if (prev?.node !== WORLD_BOSS_NODE) db.setBossReturn(characterId, prev && canReturnTo(prev) ? { skill: prev.skill, node: prev.node, leftMs } : null);
      db.setActivity(characterId, { skill: 'combat', node: WORLD_BOSS_NODE, since: now, seed: 0, seq: 0 });
      if (!current.damage.has(characterId)) {
        const oldMax = maxHp();
        current.damage.set(characterId, 0);
        if (current.damage.size > 1) joins.push(now);
        // A barra não pode resetar nem devolver a cura dos DOOMs: dano e cura escalam juntos.
        healed = rescaleBossHp(current.damage, healed, oldMax, maxHp());

        db.saveBossDamage(current.id, current.damage);
      }
      return null;
    },

    /** Fila do chefe: entra nos BOSS_QUEUE_MS antes dele nascer (com ele já vivo, entra direto na luta). */
    queueJoin(characterId: number, now: number): string | null {
      const ev = bossEventAt(now, everyMs, durationMs);
      if (ev.active && current && !current.done && current.id === ev.id) return this.join(characterId, now);
      const next = ev.active ? bossEventAt(ev.endsAt, everyMs, durationMs) : ev;
      if (next.startsAt - now > BOSS_QUEUE_MS) return 'A fila do chefe abre 5 minutos antes dele aparecer.';
      queue.add(characterId);
      return null;
    },
    queueLeave(characterId: number) {
      queue.delete(characterId);
    },
    /** Quem a fila levou para a arena desde a última chamada (e limpa a lista). */
    takeQueueJoined(): number[] {
      const out = queueJoined;
      queueJoined = [];
      return out;
    },

    /** Está na luta atual (quem ficou na arena depois de um reinício não está). */
    isFighting(characterId: number) {
      return !!current && !current.done && current.damage.has(characterId);
    },

    view(characterId: number, now: number): BossView {
      let ev = bossEventAt(now, everyMs, durationMs);
      // O do horário já caiu (ou fugiu): mostra o próximo em vez de "em 0:00".
      if (ev.active && current?.id === ev.id && current.done) ev = bossEventAt(ev.endsAt, everyMs, durationMs);
      const live = current && !current.done && current.id === ev.id ? current : null;
      const inArena = live ? [...live.damage.entries()].filter(([id]) => db.activityFor(id)?.node === WORLD_BOSS_NODE).sort((a, b) => b[1] - a[1]) : [];
      // A arena desenha BOSS_SHOWN lutadores: os de mais dano, e quem está vendo sempre entra
      // (o 13º não se achava na lista, ficava em cima do chefe e parecia não bater).
      const shown = inArena.slice(0, BOSS_SHOWN);
      const meIn = inArena.find(([id]) => id === characterId);
      if (meIn && !shown.includes(meIn)) shown[BOSS_SHOWN - 1] = meIn;
      const fighters = live
        ? shown
            .map(([id, damage]) => {
              const ch = db.characterById(id)!;
              const down = downUntil.get(id) ?? 0;
              return {
                name: ch.name,
                vocation: ch.vocation,
                look: ch.look,
                equipment: db.equipmentFor(id),
                damage: Math.round(damage),
                hp: life.get(id) ?? 1,
                ...(down > now ? { downUntil: down } : {}),
                ...(lastStrike.has(id) ? { strike: lastStrike.get(id) } : {}),
                ...(lastHeal.has(id) ? { heal: lastHeal.get(id) } : {}),
                ...(recentCasts.get(id)?.length ? { casts: recentCasts.get(id)!.filter((c) => now - c.at < CASTS_SHOWN_MS) } : {}),
                ...(lastFireball.has(id) ? { fireball: lastFireball.get(id) } : {}),
              };
            })
        : [];
      return {
        eventId: ev.id,
        boss: ev.boss.id,
        name: ev.boss.name,
        sprite: ev.boss.sprite,
        shout: ev.boss.shout,
        ...(ev.boss.minions ? { minions: ev.boss.minions } : {}),
        ...(ev.boss.skills ? { skills: ev.boss.skills } : {}),
        ...(live && swallowed ? { swallowed } : {}),
        ...(live && ev.boss.doom ? { doom: { stage: doomStage, total: ev.boss.doom.at.length, ...(doomUntil !== null ? { until: doomUntil } : {}), ...(doomAt ? { at: doomAt } : {}) } } : {}),
        ...(ev.boss.music ? { music: ev.boss.music } : {}),
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        active: !!live,
        hp: live ? Math.max(0, Math.round(maxHp() - dealt() + healed)) : 0,
        maxHp: live ? maxHp() : BOSS_HP_PER_PLAYER,
        ...(live && joins.some((at) => now - at < BOSS_GREW_MS) ? { grew: joins.filter((at) => now - at < BOSS_GREW_MS).length } : {}),
        canJoin: !!live && (now < live.endsAt - BOSS_JOIN_CUTOFF_MS || live.damage.has(characterId)),
        ...(!live && ev.startsAt > now && ev.startsAt - now <= BOSS_QUEUE_MS ? { canQueue: true, queued: queue.has(characterId) } : {}),
        joined: !!live && live.damage.has(characterId) && db.activityFor(characterId)?.node === WORLD_BOSS_NODE,
        fighters,
        fighting: inArena.length,
      };
    },
  };
}
