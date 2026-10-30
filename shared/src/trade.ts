/**
 * Sistema de Troca Direta entre Jogadores (Trade estilo Tibia e RuneScape).
 */

export interface TradeOfferItem {
  item: string;
  qty: number;
}

export interface TradeSideState {
  characterId: number;
  characterName: string;
  gold: number;
  items: TradeOfferItem[];
  accepted: boolean;
}

export interface TradeSessionView {
  sessionId: string;
  partnerId: number;
  partnerName: string;
  myGold: number;
  myItems: TradeOfferItem[];
  myAccepted: boolean;
  theirGold: number;
  theirItems: TradeOfferItem[];
  theirAccepted: boolean;
}

export interface TradeInviteView {
  fromCharacterId: number;
  fromCharacterName: string;
}

/** Comandos enviados do cliente para o servidor */
export type TradeClientCommand =
  | { type: 'trade_request'; targetCharacterId: number }
  | { type: 'trade_respond'; fromCharacterId: number; accept: boolean }
  | { type: 'trade_set_gold'; gold: number }
  | { type: 'trade_add_item'; item: string; qty: number }
  | { type: 'trade_remove_item'; item: string; qty: number }
  | { type: 'trade_accept' }
  | { type: 'trade_cancel' };

/** Mensagens enviadas do servidor para o cliente */
export type TradeServerMessage =
  | { type: 'trade_invite'; invite: TradeInviteView | null }
  | { type: 'trade_start'; view: TradeSessionView }
  | { type: 'trade_update'; view: TradeSessionView }
  | { type: 'trade_success'; message: string }
  | { type: 'trade_closed'; reason?: string };
