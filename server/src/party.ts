import {
  MAX_PARTY_MEMBERS,
  canShareLevel,
  PARTY_OFFLINE_WEIGHT,
  partyXpBonus,
  PARTY_INVITE_TIMEOUT_MS,
  levelForXp,
  playerStats,
  parseHuntNode,
  playerLevelXpMult,
  levelGap,
  partyBuffsFor,
  type PartyBuffs,
  type PartyInviteView,
  type PartyMemberView,
  type PartyOutgoingInviteView,
  type PartyView,
  type VocationId,
} from '@grimhold/shared';
import type { Db } from './db.ts';

export interface PendingInvite {
  partyId: number;
  leaderId: number;
  leaderName: string;
  targetId: number;
  expiresAt: number;
}

export class PartyManager {
  private invites = new Map<number, PendingInvite>(); // targetId -> PendingInvite

  constructor(private db: Db) {}

  /** Convida um jogador para o grupo. Devolve o erro ou o convite criado. */
  invite(
    leaderId: number,
    targetName: string,
    now: number = Date.now(),
  ): { error?: string; invite?: PendingInvite; partyId?: number } {
    const leader = this.db.characterById(leaderId);
    if (!leader) return { error: 'Líder não encontrado.' };

    const target = this.db.characterByName(targetName);
    if (!target) return { error: 'Jogador não encontrado.' };
    if (target.id === leaderId) return { error: 'Você não pode convidar a si mesmo.' };

    // Verifica se target já está em party
    const targetParty = this.db.partyFor(target.id);
    if (targetParty) return { error: 'Este jogador já está em um grupo.' };

    let party = this.db.partyFor(leaderId);
    let partyId = party?.id;

    if (!party) {
      // Cria a party agora com o líder
      partyId = this.db.createParty(leaderId, now);
      party = this.db.partyFor(leaderId);
    } else {
      if (party.leaderId !== leaderId) {
        return { error: 'Apenas o líder do grupo pode convidar novos membros.' };
      }
      if (party.members.length >= MAX_PARTY_MEMBERS) {
        return { error: `O grupo já está cheio (máximo de ${MAX_PARTY_MEMBERS} membros).` };
      }
    }

    const invite: PendingInvite = {
      partyId: partyId!,
      leaderId,
      leaderName: leader.name,
      targetId: target.id,
      expiresAt: now + PARTY_INVITE_TIMEOUT_MS,
    };
    this.invites.set(target.id, invite);
    return { invite, partyId: partyId! };
  }

  /** Cancela um convite enviado (apenas o líder). */
  cancelInvite(leaderId: number, targetId: number): { error?: string; partyId?: number; targetId?: number } {
    const invite = this.invites.get(targetId);
    if (!invite || invite.leaderId !== leaderId) {
      return { error: 'Convite não encontrado.' };
    }
    this.invites.delete(targetId);

    // Se o líder estava sozinho no grupo e não tem mais convites pendentes, desfaz o grupo fantasma
    const party = this.db.partyFor(leaderId);
    if (party && party.members.length === 1 && party.members[0] === leaderId) {
      const remainingForParty = [...this.invites.values()].some((inv) => inv.partyId === party.id);
      if (!remainingForParty) {
        this.db.removePartyMember(leaderId);
      }
    }

    return { partyId: invite.partyId, targetId };
  }

  /** Aceita o convite pendente. */
  accept(targetId: number, partyId: number, now: number = Date.now()): { error?: string; partyId?: number } {
    const invite = this.invites.get(targetId);
    if (!invite || invite.partyId !== partyId) {
      return { error: 'Convite expirado ou inexistente.' };
    }
    if (now > invite.expiresAt) {
      this.invites.delete(targetId);
      return { error: 'O convite expirou.' };
    }
    const currentParty = this.db.partyFor(targetId);
    if (currentParty) {
      return { error: 'Você já está em um grupo.' };
    }
    const party = this.db.partyFor(invite.leaderId);
    if (!party || party.id !== partyId) {
      this.invites.delete(targetId);
      return { error: 'O grupo foi desfeito.' };
    }
    if (party.members.length >= MAX_PARTY_MEMBERS) {
      this.invites.delete(targetId);
      return { error: 'O grupo já atingiu o limite de membros.' };
    }

    this.db.addPartyMember(partyId, targetId, now);
    this.invites.delete(targetId);
    return { partyId };
  }

  /** Recusa o convite pendente. */
  decline(targetId: number, partyId: number): void {
    const invite = this.invites.get(targetId);
    if (invite && invite.partyId === partyId) {
      this.invites.delete(targetId);
      // Se o líder estava sozinho e não há mais convites, desfaz a party
      const party = this.db.partyFor(invite.leaderId);
      if (party && party.members.length === 1 && party.members[0] === invite.leaderId) {
        const remainingForParty = [...this.invites.values()].some((inv) => inv.partyId === party.id);
        if (!remainingForParty) {
          this.db.removePartyMember(invite.leaderId);
        }
      }
    }
  }

  /** Sai do grupo. Se o líder sai, limpa os convites pendentes daquele grupo. */
  leave(characterId: number): { partyId: number; disbanded: boolean; memberIds: number[] } | null {
    const party = this.db.partyFor(characterId);
    if (!party) return null;
    const previousMembers = [...party.members];
    const isLeader = party.leaderId === characterId;
    const res = this.db.removePartyMember(characterId);
    if (!res) return null;

    if (res.disbanded || isLeader) {
      // Remove convites pendentes desta party
      for (const [tId, inv] of [...this.invites.entries()]) {
        if (inv.partyId === party.id) {
          this.invites.delete(tId);
        }
      }
    }

    return { partyId: res.partyId, disbanded: res.disbanded, memberIds: previousMembers };
  }

  /** Expulsa membro (só líder). */
  kick(
    leaderId: number,
    targetId: number,
  ): { error?: string; partyId?: number; memberIds?: number[] } {
    const party = this.db.partyFor(leaderId);
    if (!party) return { error: 'Você não está em um grupo.' };
    if (party.leaderId !== leaderId) return { error: 'Apenas o líder pode expulsar membros.' };
    if (leaderId === targetId) return { error: 'Você não pode expulsar a si mesmo.' };
    if (!party.members.includes(targetId)) return { error: 'Membro não encontrado no grupo.' };

    const previousMembers = [...party.members];
    const res = this.db.removePartyMember(targetId);
    if (!res) return { error: 'Erro ao remover membro.' };
    return { partyId: res.partyId, memberIds: previousMembers };
  }

  /** Nível de combate de um personagem. */
  private levelOf(characterId: number) {
    return levelForXp(this.db.skillsFor(characterId).combat ?? 0, 'combat');
  }

  /**
   * Quem da party está na mesma caçada (e dificuldade) que `characterId`, online ou
   * não (no idle a caçada segue com o jogo fechado), dentro da regra dos 2/3 do nível.
   * Vazio se o próprio personagem não está caçando ou fica de fora pelo nível.
   */
  private huntGroup(characterId: number): number[] {
    const party = this.db.partyFor(characterId);
    const act = this.db.activityFor(characterId);
    if (!party || party.members.length <= 1 || !act || act.skill !== 'combat' || !parseHuntNode(act.node)) return [];
    const same = party.members.filter((m) => {
      const a = this.db.activityFor(m);
      return a?.skill === 'combat' && a.node === act.node;
    });
    const level = new Map(same.map((m) => [m, this.levelOf(m)]));
    const top = Math.max(...level.values());
    const group = same.filter((m) => canShareLevel(level.get(m)!, top));
    return group.includes(characterId) ? group : [];
  }

  /**
   * Shared XP (como no Tibia): membros online da mesma party na mesma caçada
   * (e dificuldade) somam a XP de combate e dividem por igual; só entra quem tem
   * pelo menos 2/3 do nível do maior. O teto é o do Tibia: o mais forte paga a parte
   * do mais fraco (não se cria XP; o ganho do grupo vem do bônus de party). Devolve
   * quanto somar (ou tirar) de cada um.
   */
  sharedXpDeltas(gained: Map<number, number>, isOnline: (charId: number) => boolean): Map<number, number> {
    const deltas = new Map<number, number>();
    const done = new Set<number>();
    for (const characterId of gained.keys()) {
      if (done.has(characterId)) continue;
      const sharing = this.huntGroup(characterId).filter((m) => isOnline(m));
      for (const m of sharing) done.add(m);
      if (sharing.length < 2) continue;
      // A XP chega em blocos (fim de cada luta): comparar tick a tick criava XP do nada (quem não
      // fechou luta no tick subia até a média). Compara o acumulado de quem caça junto desde que o
      // grupo se formou: cada um fica com a média do grupo (o total não muda).
      const key = [...sharing].sort((a, b) => a - b).join(',') + '|' + (this.db.activityFor(characterId)?.node ?? '');
      let acc = this.shareAcc.get(key);
      if (!acc) this.shareAcc.set(key, (acc = { own: new Map(), paid: new Map() }));
      for (const m of sharing) acc.own.set(m, (acc.own.get(m) ?? 0) + Math.max(0, gained.get(m) ?? 0));
      // 21/10: cada um recebe a média na SUA taxa (freio de nível e corte por caçada baixa). Antes o
      // top level em grupo com alguém de nível menor ganhava a XP cheia do outro.
      const parsed = parseHuntNode(this.db.activityFor(characterId)?.node ?? '');
      const rate = (m: number) => {
        const L = levelForXp(this.db.skillsFor(m).combat ?? 0, 'combat');
        const gap = parsed ? levelGap(parsed.hunt.level + parsed.difficulty.level, L).xp : 1;
        return Math.max(1e-6, playerLevelXpMult(L) * gap);
      };
      const rates = new Map(sharing.map((m) => [m, rate(m)]));
      const avgRaw = sharing.reduce((sum, m) => sum + acc!.own.get(m)!, 0) / sharing.length;
      const avgBase = sharing.reduce((sum, m) => sum + acc!.own.get(m)! / rates.get(m)!, 0) / sharing.length;
      // Alvo: a média do grupo, mas nunca acima da média na taxa de cada um. Quem recebe é pago por
      // quem fez mais, na proporção do excesso; o total do grupo não cresce.
      const want = new Map(sharing.map((m) => [m, Math.min(avgRaw, avgBase * rates.get(m)!) - acc!.own.get(m)!]));
      const get = [...want.values()].filter((v) => v > 0).reduce((a, v) => a + v, 0);
      const give = -[...want.values()].filter((v) => v < 0).reduce((a, v) => a + v, 0);
      const k = give > 0 ? Math.min(1, get / give) : 0;
      for (const m of sharing) {
        const w = want.get(m)!;
        const net = w > 0 ? (give >= get ? w : w * (give / get)) : w * k;
        const due = Math.round(net) - (acc.paid.get(m) ?? 0);
        if (due !== 0) {
          deltas.set(m, due);
          acc.paid.set(m, (acc.paid.get(m) ?? 0) + due);
        }
      }
    }
    return deltas;
  }
  /** Acumulado da Shared XP por grupo (membros + caçada): XP de cada um e o ajuste líquido já aplicado. */
  private shareAcc = new Map<string, { own: Map<number, number>; paid: Map<number, number> }>();

  /**
   * Bônus de XP da party: aliados na mesma caçada, online ou não, e as vocações
   * diferentes do grupo (ver partyXpBonus).
   */
  partyBonusFor(characterId: number, isOnline: (charId: number) => boolean = () => true, selfOffline = false): number {
    const group = this.huntGroup(characterId);
    if (group.length < 2) return 0;
    const vocations = new Set(group.map((m) => this.db.characterById(m)?.vocation));
    // Aliado offline (ou o próprio com o jogo fechado) rende só uma fração: o grosso é jogar junto.
    const allies = group.filter((m) => m !== characterId);
    const weight = (m: number) => (selfOffline || !isOnline(m) ? PARTY_OFFLINE_WEIGHT : 1);
    return partyXpBonus(allies.reduce((sum, m) => sum + weight(m), 0), vocations.size, allies.length);
  }

  /**
   * Covil em grupo: quem da party está na mesma luta do covil (mesmo covil e mesma hora de começo,
   * porque quem entra pelo "Ir até ele" na espera cai na luta do outro). Inclui o próprio.
   */
  lairMembersFor(characterId: number): number[] {
    const act = this.db.activityFor(characterId);
    if (!act || act.skill !== 'combat' || !(parseHuntNode(act.node)?.hunt.lair || parseHuntNode(act.node)?.hunt.raid)) return [];
    const party = this.db.partyFor(characterId);
    if (!party) return [characterId];
    return party.members.filter((m) => {
      const a = this.db.activityFor(m);
      // Raide: o grupo é a mesma entrada (seed), mesmo se um membro foi acertado antes e já está na fase seguinte.
      if (parseHuntNode(act.node)?.hunt.raid) return a?.skill === 'combat' && a.node === act.node && a.seed === act.seed;
      return a?.skill === 'combat' && a.node === act.node && a.since === act.since;
    });
  }

  /** Buffs de party por vocação: as vocações de quem caça junto (mesma caçada, regra dos 2/3 do nível). */
  partyBuffsFor(characterId: number): PartyBuffs | undefined {
    const group = this.huntGroup(characterId);
    if (group.length < 2) return undefined;
    return partyBuffsFor(group.map((m) => this.db.characterById(m)?.vocation ?? ''));
  }

  /** Situação de um membro para quem olha o painel. */
  private shareStatus(viewer: number, member: number, isOnline: (charId: number) => boolean): PartyMemberView['share'] {
    const a = this.db.activityFor(member);
    if (!a || a.skill !== 'combat') return 'not_hunting';
    if (this.db.activityFor(viewer)?.node !== a.node) return 'other_hunt';
    if (!this.huntGroup(member).includes(viewer)) return 'level_gap';
    return isOnline(member) && isOnline(viewer) ? 'sharing' : 'bonus_only';
  }

  /** Monta a visão da party para o cliente. */
  viewFor(characterId: number, isOnline: (charId: number) => boolean): PartyView | null {
    const party = this.db.partyFor(characterId);
    if (!party) return null;

    const myBonus = this.partyBonusFor(characterId, isOnline);
    const members: PartyMemberView[] = party.members.map((mId) => {
      const ch = this.db.characterById(mId)!;
      const skills = this.db.skillsFor(mId);
      const combatLvl = levelForXp(skills.combat ?? 0, 'combat');
      const stats = playerStats(ch.vocation, skills.combat ?? 0);
      const act = this.db.activityFor(mId);
      const hunt = act?.skill === 'combat' ? parseHuntNode(act.node)?.hunt : null;

      return {
        characterId: mId,
        name: ch.name,
        vocation: ch.vocation as VocationId,
        level: combatLvl,
        hp: stats.hp,
        maxHp: stats.hp,
        // Só caçada de verdade: no boneco ou na arena o "Ir até ele" levava o outro para treinar.
        huntNode: hunt ? act!.node : null,
        huntName: hunt?.name ?? (act?.skill === 'combat' ? 'Treinando' : 'Bastião'),
        isLeader: party.leaderId === mId,
        online: isOnline(mId),
        ...(mId !== characterId ? { share: this.shareStatus(characterId, mId, isOnline) } : {}),
      };
    });

    const pendingInvites: PartyOutgoingInviteView[] = [...this.invites.values()]
      .filter((inv) => inv.partyId === party.id)
      .map((inv) => {
        const tch = this.db.characterById(inv.targetId);
        const tskills = this.db.skillsFor(inv.targetId);
        const tLevel = levelForXp(tskills.combat ?? 0, 'combat');
        return {
          targetId: inv.targetId,
          targetName: tch?.name ?? inv.targetId.toString(),
          targetVocation: (tch?.vocation ?? 'warrior') as VocationId,
          targetLevel: tLevel,
          expiresAt: inv.expiresAt,
        };
      });

    return {
      id: party.id,
      leaderId: party.leaderId,
      members,
      pendingInvites,
      sharedXpBonus: myBonus,
    };
  }

  /** Retorna convite pendente para o jogador, se houver. */
  inviteFor(characterId: number, now = Date.now()): PartyInviteView | null {
    const inv = this.invites.get(characterId);
    if (!inv) return null;
    if (now > inv.expiresAt) {
      this.invites.delete(characterId);
      return null;
    }
    return {
      partyId: inv.partyId,
      leaderName: inv.leaderName,
      expiresAt: inv.expiresAt,
    };
  }
}
