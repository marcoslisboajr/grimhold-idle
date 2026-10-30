import { itemById, type TradeOfferItem, type TradeSessionView, type TradeSideState } from '@grimhold/shared';
import type { Database } from './db.ts';

export interface ActiveTradeSession {
  id: string;
  partyA: TradeSideState;
  partyB: TradeSideState;
  createdAt: number;
}

export interface TradeInvite {
  fromCharacterId: number;
  fromCharacterName: string;
  targetCharacterId: number;
  createdAt: number;
}

export class TradeManager {
  private sessions = new Map<string, ActiveTradeSession>();
  private characterToSession = new Map<number, string>();
  private invites = new Map<number, TradeInvite>(); // targetCharacterId -> Invite

  constructor(private db: Database) {}

  /** Obtém o convite pendente para um personagem */
  getPendingInvite(targetCharacterId: number): TradeInvite | null {
    const inv = this.invites.get(targetCharacterId);
    if (!inv) return null;
    if (Date.now() - inv.createdAt > 30_000) {
      this.invites.delete(targetCharacterId);
      return null;
    }
    return inv;
  }

  /** Cria ou atualiza convite de troca */
  requestTrade(fromId: number, fromName: string, targetId: number): { success: boolean; error?: string } {
    if (fromId === targetId) return { success: false, error: 'Você não pode negociar consigo mesmo.' };
    if (this.characterToSession.has(fromId)) return { success: false, error: 'Você já está em uma negociação.' };
    if (this.characterToSession.has(targetId)) return { success: false, error: 'O outro jogador já está em uma negociação.' };

    this.invites.set(targetId, {
      fromCharacterId: fromId,
      fromCharacterName: fromName,
      targetCharacterId: targetId,
      createdAt: Date.now(),
    });

    return { success: true };
  }

  /** Responde ao convite de troca */
  respondTrade(targetId: number, targetName: string, fromId: number, accept: boolean): {
    started: boolean;
    session?: ActiveTradeSession;
    error?: string;
  } {
    const inv = this.invites.get(targetId);
    if (!inv || inv.fromCharacterId !== fromId) {
      return { started: false, error: 'Convite de troca não encontrado ou expirado.' };
    }
    this.invites.delete(targetId);

    if (!accept) {
      return { started: false };
    }

    if (this.characterToSession.has(fromId) || this.characterToSession.has(targetId)) {
      return { started: false, error: 'Um dos jogadores já entrou em outra negociação.' };
    }

    const sessionId = `trade_${fromId}_${targetId}_${Date.now()}`;
    const session: ActiveTradeSession = {
      id: sessionId,
      partyA: {
        characterId: fromId,
        characterName: inv.fromCharacterName,
        gold: 0,
        items: [],
        accepted: false,
      },
      partyB: {
        characterId: targetId,
        characterName: targetName,
        gold: 0,
        items: [],
        accepted: false,
      },
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.characterToSession.set(fromId, sessionId);
    this.characterToSession.set(targetId, sessionId);

    return { started: true, session };
  }

  getSessionByCharacter(characterId: number): ActiveTradeSession | null {
    const sId = this.characterToSession.get(characterId);
    if (!sId) return null;
    return this.sessions.get(sId) ?? null;
  }

  /** Modifica o ouro oferecido. Reseta a aceitação de ambos imediatamente. */
  setGold(characterId: number, gold: number): { session: ActiveTradeSession; error?: string } | null {
    const session = this.getSessionByCharacter(characterId);
    if (!session) return null;

    const side = session.partyA.characterId === characterId ? session.partyA : session.partyB;
    const cleanGold = Math.max(0, Math.floor(gold));

    side.gold = cleanGold;
    // Mecanismo anti-scam: qualquer mudança desmarca o aceite de ambos
    session.partyA.accepted = false;
    session.partyB.accepted = false;

    return { session };
  }

  /** Adiciona um item na oferta. Reseta a aceitação de ambos imediatamente. */
  addItem(characterId: number, item: string, qty: number): { session: ActiveTradeSession; error?: string } | null {
    const session = this.getSessionByCharacter(characterId);
    if (!session) return null;

    // Item preso ao personagem (quest, Moeda de Voto, capa de maestria) não se negocia.
    if (itemById(item)?.questItem) return { session, error: 'Esse item não pode ser negociado.' };
    const side = session.partyA.characterId === characterId ? session.partyA : session.partyB;
    const cleanQty = Math.max(1, Math.floor(qty));

    const existing = side.items.find((i) => i.item === item);
    if (existing) {
      existing.qty += cleanQty;
    } else {
      if (side.items.length >= 16) {
        return { session, error: 'Limite de 16 itens na janela de troca atingido.' };
      }
      side.items.push({ item, qty: cleanQty });
    }

    session.partyA.accepted = false;
    session.partyB.accepted = false;
    return { session };
  }

  /** Remove ou diminui a quantidade de um item na oferta. Reseta aceite de ambos. */
  removeItem(characterId: number, item: string, qty: number): { session: ActiveTradeSession } | null {
    const session = this.getSessionByCharacter(characterId);
    if (!session) return null;

    const side = session.partyA.characterId === characterId ? session.partyA : session.partyB;
    const existing = side.items.find((i) => i.item === item);
    if (!existing) return { session };

    existing.qty -= qty;
    if (existing.qty <= 0) {
      side.items = side.items.filter((i) => i.item !== item);
    }

    session.partyA.accepted = false;
    session.partyB.accepted = false;
    return { session };
  }

  /** Marca o aceite de um dos lados. Se ambos aceitarem, executa a troca atômica. */
  acceptTrade(characterId: number): {
    session: ActiveTradeSession;
    completed: boolean;
    error?: string;
  } | null {
    const session = this.getSessionByCharacter(characterId);
    if (!session) return null;

    const side = session.partyA.characterId === characterId ? session.partyA : session.partyB;
    side.accepted = true;

    // Se ambos aceitaram, hora de executar no banco com transação atômica
    if (session.partyA.accepted && session.partyB.accepted) {
      const res = this.db.executeDirectTrade(
        { id: session.partyA.characterId, gold: session.partyA.gold, items: session.partyA.items },
        { id: session.partyB.characterId, gold: session.partyB.gold, items: session.partyB.items },
      );

      this.closeSession(session.id);

      if (!res.success) {
        return { session, completed: false, error: res.error ?? 'Falha ao executar a troca.' };
      }

      return { session, completed: true };
    }

    return { session, completed: false };
  }

  /** Cancela e encerra a sessão de troca */
  cancelTrade(characterId: number): { session: ActiveTradeSession | null } {
    const session = this.getSessionByCharacter(characterId);
    if (!session) return { session: null };
    this.closeSession(session.id);
    return { session };
  }

  closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.characterToSession.delete(session.partyA.characterId);
    this.characterToSession.delete(session.partyB.characterId);
    this.sessions.delete(sessionId);
  }

  /** Converte uma sessão no formato de visualização para um dos jogadores */
  toView(session: ActiveTradeSession, forCharacterId: number): TradeSessionView {
    const isPartyA = session.partyA.characterId === forCharacterId;
    const me = isPartyA ? session.partyA : session.partyB;
    const them = isPartyA ? session.partyB : session.partyA;

    return {
      sessionId: session.id,
      partnerId: them.characterId,
      partnerName: them.characterName,
      myGold: me.gold,
      myItems: [...me.items],
      myAccepted: me.accepted,
      theirGold: them.gold,
      theirItems: [...them.items],
      theirAccepted: them.accepted,
    };
  }
}
