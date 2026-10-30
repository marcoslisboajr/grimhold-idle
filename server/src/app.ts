import { alerts } from './alerts.ts';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import {
  MAX_CHARACTERS,
  OFFLINE_CAP_MS,
  FREE_OUTFIT_IDS,
  RANKING_SIZE,
  CHAT_COOLDOWN_MS,
  CHAT_HISTORY,
  cleanChat,
  EQUIP_SLOTS,
  isSkillId,
  isVocationId,
  parseLook,
  normalizeCharacterName,
  validateCharacterName,
  validatePassword,
  validateUsername,
  WORLD_BOSS_NODE,
  placeOf,
  levelForXp,
  achievementPoints,
  bossEntry,
  type PlayerProfile,
  validateEmail,
  cleanBio,
  type OnlinePlayer,
  type ClientMessage,
  isSlayerSize,
  type Gains,
  type ServerMessage,
  KIDS_ANNOUNCEMENTS,
  KIDS_HOURLY,
  KIDS_HOURLY_TEXT,
  DISCORD_EVERY_MS,
  DISCORD_TEXT,
  KIDS_STAMINA_REFILL_AT,
  KIDS_STAMINA_TEXT,
  HALLOWEEN_ANNOUNCEMENTS,
  HALLOWEEN_HOURLY,
  HALLOWEEN_HOURLY_TEXT,
  HALLOWEEN_STAMINA_REFILL_AT,
  HALLOWEEN_STAMINA_TEXT,
  STAMINA_GIFTS,
  STAMINA_MAX_MS,
  VOTE_COIN,
  VOTE_COINS_PER_VOTE,
  huntById,
  itemById,
  LISTING_MS,
  CELEBRATE_PREFIX,
} from '@grimhold/shared';
import type { Db } from './db.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { createMailer, mailButton, type Mailer } from './mailer.ts';
import { createGame } from './game.ts';
import { createWorldBoss } from './worldboss.ts';
import { PartyManager } from './party.ts';
import { TradeManager } from './trade.ts';

const MAX_BODY = 4 * 1024;
/** Feedback: tamanho máximo do texto e envios por personagem a cada 24 h. */
const FEEDBACK_MAX_CHARS = 1000;
const FEEDBACK_PER_DAY = 5;
const AUTH_TIMEOUT_MS = 5000;
/** Tentativas de login erradas por IP antes de bloquear por um tempo. */
const LOGIN_MAX_FAILS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Cidade ao vivo: no máximo um andar repassado a cada tanto por personagem. */
export const CITY_MOVE_MIN_MS = 200;

export interface AppOptions {
  /** Intervalo do ping. Conexão que não responder até o próximo ping é derrubada. */
  heartbeatMs?: number;
  /** De quanto em quanto tempo o servidor credita as ações de quem está online. */
  tickMs?: number;
  /** Relógio (os testes trocam por um relógio falso). */
  now?: () => number;
  /** Chefe global: de quanto em quanto tempo aparece e quanto dura (padrão 2 h / 15 min). */
  bossEveryMs?: number;
  bossDurationMs?: number;
  /** Segredo do webhook de votos do TopIdle (sem ele a rota responde 503). */
  topidleSecret?: string;
  /** Pasta do cliente buildado (client/dist). Em produção o servidor entrega o jogo todo numa porta só. */
  staticDir?: string;
  /** Envio de email (confirmar email e recuperar conta). Sem ele, nada é enviado. */
  mailer?: Mailer;
  /** Endereço do jogo nos links dos emails. */
  publicUrl?: string;
}

/** Validade dos links de email: confirmar o email (2 dias) e recuperar a conta (30 min). */
const VERIFY_TTL_MS = 2 * 86_400_000;
const RESET_TTL_MS = 30 * 60_000;
/** Pedidos de email: um por minuto por conta (confirmar) e 5 por hora por IP (recuperar). */
const VERIFY_COOLDOWN_MS = 60_000;
const FORGOT_PER_HOUR = 5;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/** ETag de cada arquivo pelo conteúdo (um deploy que copia de novo o mesmo sprite não força baixar de novo). */
const etags = new Map<string, { size: number; etag: string }>();
const etagOf = (file: string, body: Buffer) => {
  const hit = etags.get(file);
  if (hit && hit.size === body.length) return hit.etag;
  const etag = `"${createHash('sha1').update(body).digest('base64url').slice(0, 20)}"`;
  etags.set(file, { size: body.length, etag });
  return etag;
};
/** Imagens, sons e fontes: 10 min sem nem perguntar; depois o navegador confere pelo ETag (304 se não mudou). */
const MEDIA = /\.(png|jpe?g|gif|webp|svg|ogg|mp3|wav|ttf|woff2?|ico)$/i;

/** Entrega um arquivo de `root`; caminho desconhecido cai no index.html. Nunca sai da pasta. */
async function serveStatic(root: string, pathname: string, res: http.ServerResponse, ifNoneMatch?: string): Promise<boolean> {
  const base = path.resolve(root);
  let file = path.resolve(base, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(base)) return false;
  if (file === base) file = path.join(base, 'index.html');
  let body: Buffer;
  try {
    body = await readFile(file);
  } catch {
    // Rota da aplicação (sem extensão): devolve o index.html.
    if (path.extname(file)) return false;
    file = path.join(base, 'index.html');
    try {
      body = await readFile(file);
    } catch {
      return false;
    }
  }
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  // Arquivos com hash (assets/index-*) ficam em cache para sempre; imagens e sons, 10 min; o resto (index.html,
  // version.json) é sempre conferido. Todos com ETag: se não mudou, 304 sem reenviar o arquivo.
  const cache = pathname.startsWith('/assets/index-') ? 'public, max-age=31536000, immutable' : MEDIA.test(file) ? 'public, max-age=600' : 'no-cache';
  const etag = etagOf(file, body);
  if (ifNoneMatch && ifNoneMatch.split(',').some((t) => t.trim() === etag)) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': cache });
    res.end();
    return true;
  }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ETag: etag });
  res.end(body);
  return true;
}

/** Abaixo disso não vale mostrar o resumo de "enquanto você estava fora". */
const OFFLINE_SUMMARY_MIN_MS = 60_000;
/**
 * Com o jogo fechado (personagem deslogado): as primeiras OFFLINE_FULL_MS rendem a XP inteira e o
 * resto, até o teto de 12 h, rende OFFLINE_XP. Quem fecha o jogo um pouco não perde nada.
 */
export const OFFLINE_XP = 0.7;
export const OFFLINE_FULL_MS = 4 * 60 * 60 * 1000;
/** Fração da XP de um trecho de `elapsedMs` com o jogo fechado (média das horas cheias e das de 70%). */
export function offlineXpMult(elapsedMs: number): number {
  const e = Math.min(elapsedMs, OFFLINE_CAP_MS);
  if (e <= OFFLINE_FULL_MS) return 1;
  return (OFFLINE_FULL_MS + (e - OFFLINE_FULL_MS) * OFFLINE_XP) / e;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readRaw(req: http.IncomingMessage): Promise<Buffer> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Corpo grande demais.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Prêmio de cada voto no TopIdle: Moedas de Voto, trocadas na Loja de Votos. */
export const VOTE_REWARD: Record<string, number> = { [VOTE_COIN]: VOTE_COINS_PER_VOTE };

/** Confere a assinatura do TopIdle: HMAC-SHA256 de "timestamp.corpo", no máximo 5 min de atraso. */
export function topidleSigOk(secret: string, timestamp: string, raw: Buffer, signature: string, nowMs: number): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > 300) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Corpo grande demais.');
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (typeof parsed !== 'object' || parsed === null) throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}

function bearer(req: http.IncomingMessage): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

/** Aviso de chefe vencido (covil ou instância) com o que caiu e a XP, para a janela de vitória. */
function clearedMessage(gains: Gains): ServerMessage {
  const loot = Object.fromEntries(Object.entries(gains.items ?? {}).filter(([, q]) => q > 0));
  return { type: 'cleared', hunt: gains.cleared!, loot, xp: Math.max(0, gains.xp.combat ?? 0) };
}

export function createApp(
  db: Db,
  { heartbeatMs = 30_000, tickMs = 1000, now = Date.now, staticDir, bossEveryMs, bossDurationMs, topidleSecret, mailer = createMailer({}), publicUrl = 'https://grimholdidle.com' }: AppOptions = {},
) {
  const game = createGame(db);
  const worldBoss = createWorldBoss(db, game, { everyMs: bossEveryMs, durationMs: bossDurationMs });
  const partyManager = new PartyManager(db);
  game.setPartyBonus((id, offline) => partyManager.partyBonusFor(id, isOnlineChar, offline));
  game.setPartyFights((id) => partyManager.lairMembersFor(id), (id) => partyManager.partyBuffsFor(id));
  const tradeManager = new TradeManager(db);
  function requireAccount(req: http.IncomingMessage): number {
    const token = bearer(req);
    const accountId = token ? db.accountForToken(token) : null;
    if (accountId === null) throw new HttpError(401, 'Sessão inválida.');
    return accountId;
  }

  // Último email de confirmação por conta e pedidos de recuperação por IP (contra spam).
  const verifySentAt = new Map<number, number>();
  const forgotByIp = new Map<string, { count: number; since: number }>();

  /** Manda o link de confirmação do email da conta (no máximo um por minuto). */
  async function sendVerifyEmail(accountId: number, email: string): Promise<boolean> {
    const at = now();
    if (at - (verifySentAt.get(accountId) ?? 0) < VERIFY_COOLDOWN_MS) return false;
    verifySentAt.set(accountId, at);
    const token = randomBytes(24).toString('hex');
    db.addEmailToken(tokenHash(token), accountId, 'verify', email, at + VERIFY_TTL_MS, at);
    return mailer.send(
      email,
      'Confirme seu email no Grimhold Idle',
      mailButton('Confirme seu email', 'Clique no botão para confirmar este email na sua conta do Grimhold Idle. Com ele confirmado, você consegue recuperar a conta se perder o acesso.', 'Confirmar email', `${publicUrl}/?verify=${token}`),
    );
  }

  // Falhas de login por IP: { quantas, desde quando }.
  const loginFails = new Map<string, { count: number; since: number }>();
  const clientIp = (req: http.IncomingMessage) =>
    String(req.headers['cf-connecting-ip'] ?? req.socket.remoteAddress ?? '?');

  async function route(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const key = `${req.method} ${url.pathname}`;

    switch (key) {
      case 'GET /api/health':
        return sendJson(res, 200, { ok: true, online: onlineCount() });

      case 'GET /api/ranking': {
        const skill = url.searchParams.get('skill') ?? 'combat';
        if (skill === 'skiller') return sendJson(res, 200, { skill, entries: db.skillerRanking(RANKING_SIZE) });
        if (skill === 'achievements') return sendJson(res, 200, { skill, entries: db.achievementRanking(RANKING_SIZE) });
        if (!isSkillId(skill)) throw new HttpError(400, 'Skill inválida.');
        return sendJson(res, 200, { skill, entries: db.ranking(skill, RANKING_SIZE) });
      }

      case 'GET /api/profile': {
        const c = db.characterByName(url.searchParams.get('name') ?? '');
        if (!c || c.id === 0) throw new HttpError(404, 'Personagem não encontrado.');
        const ach = Object.keys(db.achievementsFor(c.id));
        const bossKills = Object.fromEntries(Object.entries(db.bestiaryFor(c.id)).filter(([k, n]) => n > 0 && bossEntry(k)));
        const stats = db.statsFor(c.id);
        const profile: PlayerProfile = {
          name: c.name,
          vocation: c.vocation,
          promotion: c.promotion,
          look: c.look,
          title: db.titleFor(c.id),
          createdAt: c.createdAt,
          online: isOnlineChar(c.id),
          skills: db.skillsFor(c.id),
          equipment: db.equipmentFor(c.id),
          achievementPoints: achievementPoints(ach),
          achievementCount: ach.length,
          bossKills,
          kills: stats.kills ?? 0,
          quests: stats.quests ?? 0,
          bio: db.bioOf(c.id),
        };
        return sendJson(res, 200, profile);
      }

      case 'GET /api/account': {
        // Dados privados da conta (só para o dono): por enquanto o email.
        const accountId = requireAccount(req);
        return sendJson(res, 200, { email: db.emailOf(accountId), verified: db.emailVerified(accountId) });
      }

      case 'POST /api/account/email': {
        const accountId = requireAccount(req);
        const r = validateEmail((await readJson(req)).email);
        if ('error' in r) throw new HttpError(400, r.error);
        if (!db.setEmail(accountId, r.email)) throw new HttpError(409, 'Esse email já está em outra conta.');
        const verified = db.emailVerified(accountId);
        // Email novo (ou ainda não confirmado): manda o link de confirmação.
        const sent = r.email && !verified ? await sendVerifyEmail(accountId, r.email) : false;
        return sendJson(res, 200, { email: r.email, verified, sent });
      }

      case 'POST /api/auth/verify': {
        // Link do email de confirmação.
        const body = await readJson(req);
        const t = typeof body.token === 'string' ? db.takeEmailToken(tokenHash(body.token), 'verify', now()) : null;
        if (!t || !db.confirmEmail(t.accountId, t.email)) throw new HttpError(400, 'Link inválido ou vencido. Salve o email de novo no perfil para receber outro.');
        return sendJson(res, 200, { email: t.email });
      }

      case 'POST /api/auth/forgot': {
        // Esqueci a senha: manda o link para o email confirmado. A resposta é sempre a mesma
        // (não conta se o email existe).
        const ip = clientIp(req);
        const at = now();
        const f = forgotByIp.get(ip);
        const cur = f && at - f.since < 3_600_000 ? f : { count: 0, since: at };
        if (cur.count >= FORGOT_PER_HOUR) throw new HttpError(429, 'Muitos pedidos. Tente de novo mais tarde.');
        forgotByIp.set(ip, { count: cur.count + 1, since: cur.since });
        const r = validateEmail((await readJson(req)).email);
        if ('error' in r || !r.email) throw new HttpError(400, 'Email inválido.');
        const accountId = db.accountByVerifiedEmail(r.email);
        if (accountId !== null) {
          const token = randomBytes(24).toString('hex');
          db.addEmailToken(tokenHash(token), accountId, 'reset', r.email, at + RESET_TTL_MS, at);
          const user = db.usernameOf(accountId);
          await mailer.send(
            r.email,
            'Recuperar sua conta do Grimhold Idle',
            mailButton(
              'Recuperar conta',
              user ? `Seu usuário é <b>${user}</b>. Clique no botão para criar uma senha nova.` : 'Sua conta é de convidado. Clique no botão para criar um usuário e uma senha e entrar de qualquer navegador.',
              'Criar senha nova',
              `${publicUrl}/?reset=${token}`,
            ),
          );
        }
        return sendJson(res, 200, { ok: true });
      }

      case 'GET /api/auth/reset': {
        // Antes de mostrar o formulário: o link vale? A conta já tem usuário?
        const token = url.searchParams.get('token') ?? '';
        const t = db.peekEmailToken(tokenHash(token), 'reset', now());
        if (!t) throw new HttpError(400, 'Link inválido ou vencido. Peça outro em "Esqueci a senha".');
        return sendJson(res, 200, { username: db.usernameOf(t.accountId) });
      }

      case 'POST /api/auth/reset': {
        // Cria a senha nova (e o usuário, se a conta era de convidado) e já entra.
        const body = await readJson(req);
        const hash = typeof body.token === 'string' ? tokenHash(body.token) : '';
        const peek = db.peekEmailToken(hash, 'reset', now());
        if (!peek) throw new HttpError(400, 'Link inválido ou vencido. Peça outro em "Esqueci a senha".');
        const current = db.usernameOf(peek.accountId);
        const username = current ?? (body.username as string);
        const error = (current ? null : validateUsername(body.username)) ?? validatePassword(body.password);
        if (error) throw new HttpError(400, error);
        const owner = db.accountByUsername(username);
        if (owner && owner.id !== peek.accountId) throw new HttpError(409, 'Esse usuário já existe.');
        if (!db.takeEmailToken(hash, 'reset', now())) throw new HttpError(400, 'Link inválido ou vencido.');
        db.resetCredentials(peek.accountId, username, await hashPassword(body.password as string));
        return sendJson(res, 200, { token: db.createSession(peek.accountId), username });
      }

      case 'POST /api/profile/bio': {
        // Bio do personagem em uso (aparece no perfil público).
        requireAccount(req);
        const character = db.sessionCharacter(bearer(req)!);
        if (!character) throw new HttpError(400, 'Crie um personagem primeiro.');
        const bio = cleanBio((await readJson(req)).bio);
        db.setBio(character.id, bio);
        return sendJson(res, 200, { bio });
      }

      case 'POST /webhooks/topidle': {
        if (!topidleSecret) throw new HttpError(503, 'Votos desligados.');
        const raw = await readRaw(req);
        const sig = String(req.headers['x-topidle-signature'] ?? '');
        const ts = String(req.headers['x-topidle-timestamp'] ?? '');
        if (!topidleSigOk(topidleSecret, ts, raw, sig, now())) throw new HttpError(401, 'Assinatura inválida.');
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw.toString('utf8'));
        } catch {
          throw new HttpError(400, 'JSON inválido.');
        }
        const eventId = String(body.eventId ?? req.headers['x-topidle-vote-id'] ?? '');
        if (!eventId) throw new HttpError(400, 'Sem eventId.');
        const identifier = typeof body.playerIdentifier === 'string' ? body.playerIdentifier.trim() : null;
        const ch = identifier ? db.characterByName(identifier) : null;
        // Grava antes de pagar: reenvio do mesmo voto não paga duas vezes. Nome que não existe
        // também responde 2xx (reenviar não adiantaria); fica registrado para conferir à mão.
        if (!db.recordVote(eventId, identifier, ch?.id ?? null, now())) { res.writeHead(204); return res.end(); }
        if (ch) {
          const act = db.activityFor(ch.id);
          db.applyGains(ch.id, { actions: 0, items: { ...VOTE_REWARD }, xp: {} }, act?.since ?? now(), act?.seq ?? 0);
          console.log(`[topidle] voto ${eventId} pago para ${ch.name}`);
          for (const ws of socketsOf(ch.id)) {
            send(ws, { type: 'notice', text: `Obrigado pelo voto no TopIdle! Você ganhou ${VOTE_COINS_PER_VOTE} Moedas de Voto (troque na Loja de Votos).` });
            send(ws, { type: 'state', state: game.state(ch.id, now()) });
          }
        } else {
          console.log(`[topidle] voto ${eventId} sem personagem (${identifier ?? 'sem nome'})`);
        }
        res.writeHead(204);
        return res.end();
      }

      case 'POST /api/auth/guest':
        return sendJson(res, 200, { token: db.createGuest() });

      case 'GET /api/me': {
        const accountId = requireAccount(req);
        return sendJson(res, 200, {
          character: db.sessionCharacter(bearer(req)!),
          // Nível de combate de cada um (para a tela de seleção).
          characters: db.charactersOf(accountId).map((c) => ({ ...c, level: levelForXp(db.skillsFor(c.id).combat ?? 0, 'combat') })),
          username: db.usernameOf(accountId),
        });
      }

      case 'POST /api/character/select': {
        requireAccount(req);
        const body = await readJson(req);
        if (typeof body.id !== 'number' || !db.selectCharacter(bearer(req)!, body.id)) throw new HttpError(400, 'Personagem inválido.');
        return sendJson(res, 200, { character: db.sessionCharacter(bearer(req)!) });
      }

      case 'POST /api/auth/register': {
        // Protege a conta atual (de convidado) com usuário e senha; o personagem continua o mesmo.
        const accountId = requireAccount(req);
        if (db.usernameOf(accountId)) throw new HttpError(409, 'Essa conta já tem login.');
        const body = await readJson(req);
        const error = validateUsername(body.username) ?? validatePassword(body.password);
        if (error) throw new HttpError(400, error);
        const username = body.username as string;
        if (db.accountByUsername(username)) throw new HttpError(409, 'Esse usuário já existe.');
        db.setCredentials(accountId, username, await hashPassword(body.password as string));
        return sendJson(res, 200, { username });
      }

      case 'POST /api/auth/login': {
        const ip = clientIp(req);
        const at = now();
        const fails = loginFails.get(ip);
        if (fails && at - fails.since < LOGIN_WINDOW_MS && fails.count >= LOGIN_MAX_FAILS) {
          throw new HttpError(429, 'Muitas tentativas. Espere alguns minutos.');
        }
        const body = await readJson(req);
        const account = typeof body.username === 'string' ? db.accountByUsername(body.username) : null;
        const ok =
          account !== null && typeof body.password === 'string' && (await verifyPassword(body.password, account.passHash));
        if (!ok) {
          const current = fails && at - fails.since < LOGIN_WINDOW_MS ? fails : { count: 0, since: at };
          loginFails.set(ip, { count: current.count + 1, since: current.since });
          throw new HttpError(401, 'Usuário ou senha errados.');
        }
        loginFails.delete(ip);
        return sendJson(res, 200, { token: db.createSession(account!.id) });
      }

      case 'POST /api/auth/logout': {
        const token = bearer(req);
        if (token) db.deleteSession(token);
        return sendJson(res, 200, { ok: true });
      }

      case 'POST /api/character': {
        const accountId = requireAccount(req);
        if (db.charactersOf(accountId).length >= MAX_CHARACTERS) throw new HttpError(409, `Limite de ${MAX_CHARACTERS} personagens por conta.`);
        const body = await readJson(req);
        const nameError = validateCharacterName(body.name);
        if (nameError) throw new HttpError(400, nameError);
        if (!isVocationId(body.vocation)) throw new HttpError(400, 'Vocação inválida.');
        const look = body.look === undefined ? undefined : parseLook(body.look);
        if (look === null) throw new HttpError(400, 'Aparência inválida.');
        // Traje de quest não vem de graça na criação.
        if (look?.outfitId && !FREE_OUTFIT_IDS.includes(look.outfitId)) delete look.outfitId;
        const name = normalizeCharacterName(body.name as string);
        if (db.nameTaken(name)) throw new HttpError(409, 'Esse nome já está em uso.');
        const character = db.createCharacter(accountId, name, body.vocation, look);
        db.giveStarterKit(character.id, body.vocation);
        db.selectCharacter(bearer(req)!, character.id);
        return sendJson(res, 201, { character });
      }

      case 'POST /api/feedback': {
        // Bug ou sugestão do jogador; vai junto o que ele estava fazendo, para achar o problema.
        requireAccount(req);
        const character = db.sessionCharacter(bearer(req)!);
        if (!character) throw new HttpError(400, 'Crie um personagem primeiro.');
        const body = await readJson(req);
        if (body.kind !== 'bug' && body.kind !== 'idea') throw new HttpError(400, 'Tipo inválido.');
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (text.length < 5) throw new HttpError(400, 'Escreva um pouco mais.');
        if (text.length > FEEDBACK_MAX_CHARS) throw new HttpError(400, 'Texto longo demais.');
        const at = now();
        if (db.feedbackCountSince(character.id, at - 86_400_000) >= FEEDBACK_PER_DAY) {
          throw new HttpError(429, 'Limite de envios por hoje. Obrigado!');
        }
        const activity = db.activityFor(character.id);
        const context = JSON.stringify({
          level: character.level,
          vocation: character.vocation,
          activity: activity ? { skill: activity.skill, node: activity.node } : null,
          agent: String(req.headers['user-agent'] ?? '').slice(0, 200),
        });
        db.addFeedback(character.id, character.name, body.kind, text, context, at);
        return sendJson(res, 200, { ok: true });
      }

      default:
        if (req.method === 'GET' && staticDir && !url.pathname.startsWith('/api/')) {
          if (await serveStatic(staticDir, url.pathname, res, req.headers['if-none-match'])) return;
        }
        throw new HttpError(404, 'Rota não encontrada.');
    }
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((err) => {
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
      console.error('[http]', err);
      alerts.report('http', err);
      sendJson(res, 500, { error: 'Erro interno.' });
    });
  });

  // ── WebSocket ────────────────────────────────────────────────────────────
  // O cliente conecta em /ws e a primeira mensagem tem que ser { type: 'auth' }.

  const wss = new WebSocketServer({ server, path: '/ws' });
  /** Conexões autenticadas → personagem jogando (negativo: conta ainda sem personagem, -id-1). */
  const sockets = new Map<WebSocket, number>();
  const alive = new WeakSet<WebSocket>();

  const onlineCount = () => new Set(sockets.values()).size;
  /** Cidade ao vivo: o último tile de cada um na cidade e quando mandou (limite de mensagens). */
  const cityPos = new Map<number, { x: number; y: number; at: number }>();
  /** Lugar de cada um na última lista (para repassar o andar só a quem está na cidade, sem ir ao banco). */
  let placeById = new Map<number, string>();
  /** Quem está online e onde (cada um recebe a lista sem ele mesmo). */
  let lastPlayers = '';
  const onlinePlayers = (): OnlinePlayer[] =>
    [...new Set(sockets.values())].flatMap((charId) => {
      const ch = charId >= 0 ? db.characterById(charId) : null;
      if (!ch) return [];
      return [{
        id: ch.id,
        name: ch.name,
        vocation: ch.vocation,
        look: ch.look,
        equipment: db.equipmentFor(ch.id),
        level: levelForXp(db.skillsFor(ch.id).combat ?? 0, 'combat'),
        place: placeOf(db.activityFor(ch.id)),
        activePet: db.activePetFor(ch.id),
      }];
    }).map((p) => {
      const pos = p.place === 'city' ? cityPos.get(p.id) : undefined;
      if (p.place !== 'city') cityPos.delete(p.id);
      return pos ? { ...p, pos: { x: pos.x, y: pos.y } } : p;
    });
  const pushPlayers = (force = false) => {
    const players = onlinePlayers();
    placeById = new Map(players.map((p) => [p.id, p.place]));
    // A posição na cidade não entra na comparação: ela vai pelo city_move, ao vivo.
    const key = JSON.stringify(players.map(({ pos: _pos, ...p }) => p));
    if (!force && key === lastPlayers) return;
    lastPlayers = key;
    for (const [ws, me] of sockets) {
      send(ws, { type: 'players', players: players.filter((p) => p.id !== me) });
    }
  };
  const socketsOf = (characterId: number) =>
    [...sockets].filter(([, id]) => id === characterId).map(([ws]) => ws);
  /** Chave da conexão de um personagem (a própria id; null nunca, mantém o formato antigo). */
  const onlineKey = (characterId: number): number | null => characterId;
  const pushDeath = (accountId: number, death: NonNullable<Gains['death']>) => {
    for (const ws of socketsOf(accountId)) send(ws, { type: 'death', ...death });
  };
  const pushState = (accountId: number, characterId: number) => {
    const state = game.state(characterId, now());
    for (const ws of socketsOf(accountId)) send(ws, { type: 'state', state });
  };
  const send = (ws: WebSocket, msg: ServerMessage) => ws.send(JSON.stringify(msg));
  const broadcastMarket = () => {
    const listings = db.listings();
    const offers = db.offers();
    for (const ws of sockets.keys()) send(ws, { type: 'market', listings, offers });
  };
  // Último envio de cada personagem, para o limite de 1 mensagem por segundo.
  const lastChat = new Map<number, number>();
  const isOnlineChar = (charId: number) => [...sockets.values()].includes(charId);
  const pushParty = (characterId: number) => {
    const accountId = onlineKey(characterId);
    if (accountId === null) return;
    const view = partyManager.viewFor(characterId, isOnlineChar);
    for (const ws of socketsOf(accountId)) send(ws, { type: 'party', party: view });
  };
  const pushTradeSession = (session: import('./trade.ts').ActiveTradeSession, isStart = false) => {
    const accA = onlineKey(session.partyA.characterId);
    const accB = onlineKey(session.partyB.characterId);
    const type = isStart ? 'trade_start' : 'trade_update';
    if (accA !== null) {
      const viewA = tradeManager.toView(session, session.partyA.characterId);
      for (const ws of socketsOf(accA)) send(ws, { type, view: viewA });
    }
    if (accB !== null) {
      const viewB = tradeManager.toView(session, session.partyB.characterId);
      for (const ws of socketsOf(accB)) send(ws, { type, view: viewB });
    }
  };
  const notifyTradeClosed = (charAId: number, charBId: number, reason?: string) => {
    const accA = onlineKey(charAId);
    const accB = onlineKey(charBId);
    if (accA !== null) {
      for (const ws of socketsOf(accA)) send(ws, { type: 'trade_closed', reason });
    }
    if (accB !== null) {
      for (const ws of socketsOf(accB)) send(ws, { type: 'trade_closed', reason });
    }
  };
  const broadcastOnline = () => {
    const count = onlineCount();
    for (const ws of sockets.keys()) send(ws, { type: 'online', count });
  };
  const broadcastSystem = (text: string) => {
    const msg = db.addSystemChat(text, now());
    for (const ws of sockets.keys()) send(ws, { type: 'chat', messages: [{ ...msg, channel: 'global' as const }] });
  };

  // Heartbeat: derruba conexões mortas (aba fechada sem aviso, internet caiu, proxy travado).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
    }
  }, heartbeatMs);
  heartbeat.unref();
  server.on('close', () => clearInterval(heartbeat));

  let lastEventCheck = now();
  /** Dobro de XP pessoal (Poção Doce do voto ou da guilda) valendo agora: 2, senão 1. */
  const xpBoostFactor = (characterId: number, at: number) => (db.xpBoostUntil(characterId) > at ? 2 : 1);
  // Tick: credita as ações de quem está online e avisa só quando algo mudou.
  // O tick inteiro: um erro aqui não pode derrubar o servidor (repetiria a cada segundo).
  let lastListingSweep = 0;
  const runTick = () => {
    // Mercado: uma vez por minuto, os anúncios vencidos (LISTING_MS) voltam ao depósito do vendedor.
    if (now() - lastListingSweep >= 60_000) {
      lastListingSweep = now();
      db.expireListings(now() - LISTING_MS);
    }
    // Chefe global: anuncia quando aparece e paga todo mundo quando acaba.
    const boss = worldBoss.tick(now());
    if (boss.announce) {
      for (const ws of sockets.keys()) send(ws, { type: 'boss_announce', text: boss.announce });
      broadcastSystem(boss.announce);
    }
    // Aviso de raid (estilo Tibia): no meio da tela de todo mundo e no chat.
    if (boss.warning) {
      for (const ws of sockets.keys()) send(ws, { type: 'raid_warning', text: boss.warning });
      broadcastSystem(boss.warning);
    }
    for (const msg of game.takeAnnouncements()) broadcastSystem(msg);
    // Avisos de calendário (Dia das Crianças): dispara o que passou desde o último tick.
    const tNow = now();
    for (const a of KIDS_ANNOUNCEMENTS) {
      if (a.at > lastEventCheck && a.at <= tNow) {
        for (const ws of sockets.keys()) send(ws, { type: 'raid_warning', text: a.text });
        broadcastSystem(a.text);
      }
    }
    let staminaRefilled = false;
    // Presente: stamina cheia para todos (uma vez; o servidor que liga depois do horário não repete).
    if (KIDS_STAMINA_REFILL_AT > lastEventCheck && KIDS_STAMINA_REFILL_AT <= tNow) {
      db.refillAllStamina(STAMINA_MAX_MS, tNow);
      for (const ws of sockets.keys()) send(ws, { type: 'raid_warning', text: KIDS_STAMINA_TEXT });
      broadcastSystem(KIDS_STAMINA_TEXT);
      staminaRefilled = true;
    }
    for (const g of STAMINA_GIFTS) {
      if (tNow < g.from || tNow >= g.until || db.giftGiven(g.id)) continue;
      db.markGift(g.id, tNow);
      db.refillAllStamina(STAMINA_MAX_MS, tNow);
      for (const ws of sockets.keys()) send(ws, { type: 'raid_warning', text: g.text });
      broadcastSystem(g.text);
      staminaRefilled = true;
    }
    // Lembrete do evento de hora em hora, só no chat.
    if (KIDS_HOURLY.some((at) => at > lastEventCheck && at <= tNow)) broadcastSystem(KIDS_HOURLY_TEXT);
    for (const a of HALLOWEEN_ANNOUNCEMENTS) {
      if (a.at > lastEventCheck && a.at <= tNow) {
        for (const ws of sockets.keys()) send(ws, { type: 'raid_warning', text: a.text });
        broadcastSystem(a.text);
      }
    }
    if (HALLOWEEN_STAMINA_REFILL_AT > lastEventCheck && HALLOWEEN_STAMINA_REFILL_AT <= tNow) {
      db.refillAllStamina(STAMINA_MAX_MS, tNow);
      for (const ws of sockets.keys()) send(ws, { type: 'raid_warning', text: HALLOWEEN_STAMINA_TEXT });
      broadcastSystem(HALLOWEEN_STAMINA_TEXT);
      staminaRefilled = true;
    }
    if (HALLOWEEN_HOURLY.some((at) => at > lastEventCheck && at <= tNow)) broadcastSystem(HALLOWEEN_HOURLY_TEXT);
    // Lembrete do Discord (patch notes e novidades) a cada 3 h.
    if (Math.floor(tNow / DISCORD_EVERY_MS) > Math.floor(lastEventCheck / DISCORD_EVERY_MS)) broadcastSystem(DISCORD_TEXT);
    lastEventCheck = tNow;
    const tickXp = new Map<number, number>();
    const tickAccount = new Map<number, number>();
    // Fila do chefe: quem foi levado para a arena agora vê a luta sem precisar recarregar.
    const queueJoined = new Set(worldBoss.takeQueueJoined());
    for (const accountId of new Set(sockets.values())) {
      const character = accountId >= 0 ? db.characterById(accountId) : null;
      if (!character) continue;
      if (queueJoined.has(character.id)) {
        pushState(accountId, character.id);
        for (const ws of socketsOf(accountId)) send(ws, { type: 'boss', view: worldBoss.view(character.id, now()) });
      }
      const result = boss.results.find((r) => r.characterId === character.id);
      if (result) {
        const { characterId: _, ...msg } = result;
        for (const ws of socketsOf(accountId)) send(ws, { type: 'boss_result', ...msg });
        pushState(accountId, character.id);
      }
      // Ficou na arena de um evento que já não existe (servidor reiniciou): volta para a cidade.
      if (db.activityFor(character.id)?.node === WORLD_BOSS_NODE && !worldBoss.isFighting(character.id)) {
        game.stop(character.id, now());
        // Volta para o que fazia antes do chefe (ou a fila de profissões).
        const ret = db.bossReturnFor(character.id);
        db.setBossReturn(character.id, null);
        if (!(ret && game.resumeAfterBoss(character.id, ret, now()))) game.startQueued(character.id, now());
        pushState(accountId, character.id);
      }
      const view = worldBoss.view(character.id, now());
      for (const ws of socketsOf(accountId)) send(ws, { type: 'boss', view });
      const { gains, changed, broadcasts } = game.settle(character.id, now());
      for (const msg of broadcasts) {
        broadcastSystem(msg);
        if (msg.startsWith(CELEBRATE_PREFIX)) for (const ws of sockets.keys()) send(ws, { type: 'celebrate', text: msg.slice(CELEBRATE_PREFIX.length) });
      }
      if (gains.death) pushDeath(accountId, gains.death);
      if (gains.cleared) for (const ws of socketsOf(accountId)) send(ws, clearedMessage(gains));
      if (gains.instanceNoKey) {
        const key = huntById(gains.instanceNoKey)?.key;
        const text = `Você limpou a instância, mas o chefe só aparece com ${itemById(key ?? '')?.name ?? 'a chave'} (a primeira vitória do dia é grátis).`;
        for (const ws of socketsOf(accountId)) send(ws, { type: 'notice', text });
      }
      if (gains.instanceDaily) {
        const d = gains.instanceDaily;
        const text = `Primeira vitória do dia em ${huntById(d.id)?.name ?? d.id}: +${d.xp.toLocaleString('pt-BR')} XP e o Baú da Instância (${d.gold.toLocaleString('pt-BR')} de ouro${Object.keys(d.items).length ? ' e materiais' : ''}).`;
        for (const ws of socketsOf(accountId)) send(ws, { type: 'notice', text });
      }
      if (gains.arenaCleared) for (const ws of socketsOf(accountId)) send(ws, { type: 'arena_cleared', arena: gains.arenaCleared });
      if (changed || staminaRefilled) pushState(accountId, character.id);
      // Shared XP divide a XP sem o dobro pessoal (voto, guilda): cada um aplica o seu depois, na sua parte.
      tickXp.set(character.id, (gains.xp.combat ?? 0) / xpBoostFactor(character.id, tNow));
      tickAccount.set(character.id, accountId);
    }
    // Shared XP: quem caça junto na party divide a XP de combate do tick por igual.
    for (const [characterId, delta] of partyManager.sharedXpDeltas(tickXp, isOnlineChar)) {
      const activity = db.activityFor(characterId);
      if (!activity) continue;
      db.applyGains(characterId, { actions: 0, items: {}, xp: { combat: Math.round(delta * xpBoostFactor(characterId, tNow)) } }, activity.since, activity.seq);
      const accountId = tickAccount.get(characterId);
      if (accountId !== undefined) pushState(accountId, characterId);
    }
  };
  const tick = setInterval(() => {
    try {
      runTick();
    } catch (err) {
      console.error('[tick]', err);
      alerts.report('tick', err);
    }
  }, tickMs);
  tick.unref();
  server.on('close', () => clearInterval(tick));
  // Primeiro 99 numa profissão que veio por fora da profissão rodando (ex.: encomenda da Guilda).
  const first99Tick = setInterval(() => {
    try {
      for (const msg of game.first99Sweep(now())) {
        broadcastSystem(msg);
        for (const ws of sockets.keys()) send(ws, { type: 'celebrate', text: msg.slice(CELEBRATE_PREFIX.length) });
      }
    } catch (err) {
      console.error('[first99]', err);
    }
  }, 60_000);
  first99Tick.unref();
  server.on('close', () => clearInterval(first99Tick));
  const playersTick = setInterval(() => {
    pushPlayers();
    for (const charId of new Set(sockets.values())) {
      const ch = charId >= 0 ? db.characterById(charId) : null;
      if (ch && db.partyFor(ch.id)) pushParty(ch.id);
    }
  }, 2000);
  playersTick.unref();
  server.on('close', () => clearInterval(playersTick));

  wss.on('connection', (ws) => {
    alive.add(ws);
    ws.on('pong', () => alive.add(ws));

    const timeout = setTimeout(() => ws.close(4001, 'auth timeout'), AUTH_TIMEOUT_MS);

    ws.once('message', (raw) => {
      clearTimeout(timeout);
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return ws.close(4000, 'bad message');
      }
      const token = msg.type === 'auth' ? msg.token : '';
      const accountId = token ? db.accountForToken(token) : null;
      if (accountId === null) {
        send(ws, { type: 'error', message: 'Sessão inválida.' });
        return ws.close(4003, 'unauthorized');
      }

      const character = db.sessionCharacter(token);
      // Se o mesmo personagem já estiver conectado em outra aba/janela, desconecta a anterior.
      for (const [existingWs, existingId] of sockets.entries()) {
        if (character && existingId === character.id && existingWs !== ws) {
          send(existingWs, { type: 'error', message: 'Sua conta foi conectada em outra janela ou dispositivo.' });
          existingWs.close(4009, 'logged_in_elsewhere');
          sockets.delete(existingWs);
          alive.delete(existingWs);
        }
      }

      sockets.set(ws, character?.id ?? -accountId - 1);
      send(ws, { type: 'welcome', character });
      if (character) {
        const away = now() - (db.activityFor(character.id)?.since ?? now());
        const { gains, elapsedMs } = game.settle(character.id, now(), undefined, offlineXpMult(away));
        send(ws, { type: 'state', state: game.state(character.id, now()) });
        if ((gains.actions > 0 || gains.death) && elapsedMs >= OFFLINE_SUMMARY_MIN_MS) {
          send(ws, { type: 'offline', elapsedMs, gains });
        } else if (gains.death) {
          send(ws, { type: 'death', ...gains.death });
        } else if (gains.cleared) {
          send(ws, clearedMessage(gains));
        } else if (gains.arenaCleared) {
          send(ws, { type: 'arena_cleared', arena: gains.arenaCleared });
        }
      }
      broadcastOnline();
      pushPlayers(true);
      send(ws, { type: 'market', listings: db.listings(), offers: db.offers() });
      send(ws, { type: 'chat', messages: db.recentChat(CHAT_HISTORY) });
      if (character) {
        send(ws, { type: 'boss', view: worldBoss.view(character.id, now()) });
        send(ws, { type: 'party', party: partyManager.viewFor(character.id, isOnlineChar) });
        const inv = partyManager.inviteFor(character.id, now());
        if (inv) send(ws, { type: 'party_invite', invite: inv });
      }

      // Um comando que der erro não derruba o servidor: registra e avisa só quem mandou.
      const onMessage = (data: unknown) => {
        let cmd: ClientMessage;
        try {
          cmd = JSON.parse(String(data));
        } catch {
          return;
        }
        // O personagem pode ter sido criado depois que a conexão abriu.
        let key = sockets.get(ws) ?? -1;
        if (key < 0) {
          const created = db.sessionCharacter(token);
          if (created) sockets.set(ws, (key = created.id));
        }
        const ch = key >= 0 ? db.characterById(key) : null;
        if (!ch) return;
        if (cmd.type === 'start') {
          if (!isSkillId(cmd.skill) || typeof cmd.node !== 'string') return;
          const error = game.start(ch.id, cmd.skill, cmd.node, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'stop') {
          game.stop(ch.id, now());
        } else if (cmd.type === 'queue_set') {
          const error = game.setQueue(ch.id, cmd.queue, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'queue_limit') {
          if (cmd.hours !== null && typeof cmd.hours !== 'number') return;
          const error = game.setQueueLimit(ch.id, cmd.hours, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'equip') {
          if (typeof cmd.item !== 'string') return;
          const error = game.equip(ch.id, cmd.item, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'promote') {
          if (typeof cmd.promotion !== 'string') return;
          const error = game.promote(ch.id, cmd.promotion, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'chat') {
          const text = cleanChat(cmd.text);
          if (!text) return;
          const at = now();
          if (at - (lastChat.get(ch.id) ?? -Infinity) < CHAT_COOLDOWN_MS) {
            return send(ws, { type: 'error', message: 'Calma: uma mensagem por segundo.' });
          }
          lastChat.set(ch.id, at);
          const id = db.addChat(ch.id, text, at);
          const message = { id, name: ch.name, vocation: ch.vocation, title: db.titleFor(ch.id), text, at, channel: 'global' as const };
          for (const other of sockets.keys()) send(other, { type: 'chat', messages: [message] });
          return;
        } else if (cmd.type === 'set_look') {
          const look = parseLook(cmd.look);
          if (!look) return send(ws, { type: 'error', message: 'Aparência inválida.' });
          if (look.addons && look.addons.length > 0) {
            const unlocked = db.unlockedAddonsFor(ch.id);
            look.addons = look.addons.filter((a) => unlocked.includes(a));
          }
          if (look.outfitId) {
            const unlocked = db.unlockedOutfitsFor(ch.id);
            if (!unlocked.includes(look.outfitId)) {
              look.outfitId = (ch.vocation as any) ?? 'citizen';
            }
          }
          db.setLook(ch.id, look);
        } else if (cmd.type === 'set_daily_gather_preferences') {
          if (!Array.isArray(cmd.skills)) return;
          const error = game.setDailyGatherPreferences(ch.id, cmd.skills, now());
          if (error) return send(ws, { type: 'error', message: error });
          pushState(ch.id, ch.id);
        } else if (cmd.type === 'daily_claim') {
          const error = game.claimDaily(ch.id, Number(cmd.idx), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'first_step_claim') {
          const error = game.claimFirstStep(ch.id, String(cmd.id), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'mastery_unlock') {
          if (typeof cmd.node !== 'string') return;
          const count = Math.max(1, Math.min(20, Math.floor(Number(cmd.count) || 1)));
          for (let i = 0; i < count; i++) {
            const error = game.spendMasteryPoint(ch.id, cmd.node, now());
            if (error) {
              if (i === 0) return send(ws, { type: 'error', message: error });
              break;
            }
          }
        } else if (cmd.type === 'mastery_reset') {
          const error = game.resetMastery(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_combat_rules') {
          const error = game.setCombatRules(ch.id, cmd.rules, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_spells') {
          const error = game.setSpells(ch.id, cmd.spells, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_npc') {
          if (typeof cmd.item !== 'string') return;
          const error = game.buyNpc(ch.id, cmd.item, Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_raid_shop') {
          if (typeof cmd.item !== 'string') return;
          const r = game.buyRaidShop(ch.id, cmd.item, now());
          if (r.error) return send(ws, { type: 'error', message: r.error });
        } else if (cmd.type === 'buy_boss_token') {
          if (typeof cmd.item !== 'string') return;
          const error = game.buyBossToken(ch.id, cmd.item, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'imbue') {
          if (typeof cmd.imbuementId !== 'string') return;
          const error = game.imbue(ch.id, cmd.imbuementId, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'task_start') {
          if (typeof cmd.taskId !== 'string') return;
          const error = game.startHuntingTask(ch.id, cmd.taskId, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'daily_chest') {
          const error = game.claimDailyChest(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_task_shop') {
          if (!['prey_wildcard', 'imbuement_material', 'charm_points', 'stamina', 'xp_boost'].includes(cmd.item)) return;
          if (cmd.material !== undefined && typeof cmd.material !== 'string') return;
          const error = game.buyTaskShop(ch.id, cmd.item, cmd.material, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'task_claim') {
          if (typeof cmd.taskId !== 'string') return;
          const error = game.claimHuntingTask(ch.id, cmd.taskId, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'charm_unlock') {
          if (typeof cmd.charm !== 'string') return;
          const error = game.charmUnlock(ch.id, cmd.charm, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'charm_upgrade') {
          if (typeof cmd.charm !== 'string') return;
          const error = game.charmUpgrade(ch.id, cmd.charm, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'charm_assign') {
          if (typeof cmd.charm !== 'string' || (cmd.monster !== null && typeof cmd.monster !== 'string')) return;
          const error = game.charmAssign(ch.id, cmd.charm, cmd.monster, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'prey_reroll') {
          if (typeof cmd.slot !== 'number') return;
          const error = game.preyReroll(ch.id, cmd.slot, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'prey_choose') {
          if (typeof cmd.slot !== 'number' || typeof cmd.monster !== 'string') return;
          const error = game.preyChoose(ch.id, cmd.slot, cmd.monster, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'guild_start' || cmd.type === 'guild_claim' || cmd.type === 'guild_cancel') {
          if (typeof cmd.taskId !== 'string') return;
          const fn = cmd.type === 'guild_start' ? game.startGuildTask : cmd.type === 'guild_claim' ? game.claimGuildTask : game.cancelGuildTask;
          const error = fn.call(game, ch.id, cmd.taskId, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'guild_buy') {
          if (cmd.item !== 'xp_boost' && cmd.item !== 'gem' && cmd.item !== 'artisan_kit') return;
          const error = game.buyGuildShop(ch.id, cmd.item, now(), typeof cmd.gem === 'string' ? cmd.gem : undefined);
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'slayer_request') {
          if (typeof cmd.master !== 'string') return;
          const error = game.slayerRequest(ch.id, cmd.master, now(), isSlayerSize(cmd.size) ? cmd.size : 'normal');
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'slayer_buy') {
          if (typeof cmd.item !== 'string') return;
          const error = game.slayerBuy(ch.id, cmd.item, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'slayer_boost') {
          if (typeof cmd.boost !== 'string') return;
          const error = game.slayerBoost(ch.id, cmd.boost, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'slayer_cancel') {
          const error = game.slayerCancel(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'task_cancel') {
          if (typeof cmd.taskId !== 'string') return;
          const error = game.cancelHuntingTask(ch.id, cmd.taskId, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'story_choose') {
          if (typeof cmd.story !== 'string' || !Number.isInteger(cmd.choice)) return;
          const error = game.storyChoose(ch.id, cmd.story, cmd.choice, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'quest_claim') {
          if (typeof cmd.quest !== 'string') return;
          const error = game.claimQuest(ch.id, cmd.quest, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_food') {
          if (cmd.food !== null && typeof cmd.food !== 'string') return;
          const error = game.setFood(ch.id, cmd.food, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'eat_meal') {
          if (typeof cmd.item !== 'string') return;
          const error = game.eatMeal(ch.id, cmd.item, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_meal_auto') {
          const error = game.setMealAuto(ch.id, cmd.auto === true, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'boss_join') {
          const error = worldBoss.join(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
          for (const s of socketsOf(ch.id)) send(s, { type: 'boss', view: worldBoss.view(ch.id, now()) });
        } else if (cmd.type === 'boss_queue' || cmd.type === 'boss_unqueue') {
          const error = cmd.type === 'boss_queue' ? worldBoss.queueJoin(ch.id, now()) : (worldBoss.queueLeave(ch.id), null);
          if (error) return send(ws, { type: 'error', message: error });
          for (const s of socketsOf(ch.id)) send(s, { type: 'boss', view: worldBoss.view(ch.id, now()) });
        } else if (cmd.type === 'open_pouch') {
          if (typeof cmd.item !== 'string') return;
          const { error, item, qty } = game.openPouch(ch.id, cmd.item, now());
          if (error) return send(ws, { type: 'error', message: error });
          for (const s of socketsOf(ch.id)) send(s, { type: 'pouch_opened', pouch: cmd.item, item: item!, ...(qty ? { qty } : {}) });
        } else if (cmd.type === 'buy_bless') {
          const error = game.buyBless(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'reaper_redeem') {
          const error = game.reaperRedeem(ch.id, Number(cmd.pack), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_rune') {
          if ((cmd.rune !== null && typeof cmd.rune !== 'string') || (cmd.slot !== 'attack' && cmd.slot !== 'heal')) return;
          const error = game.setRune(ch.id, cmd.slot, cmd.rune, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_potion') {
          if (cmd.potion !== null && typeof cmd.potion !== 'string') return;
          const error = game.setPotion(ch.id, cmd.potion, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_mana_potion') {
          if (cmd.manaPotion !== null && typeof cmd.manaPotion !== 'string') return;
          const error = game.setManaPotion(ch.id, cmd.manaPotion, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_arrow') {
          if (cmd.arrow !== null && typeof cmd.arrow !== 'string') return;
          const error = game.setArrow(ch.id, cmd.arrow, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_sigil') {
          if (typeof cmd.slot !== 'number' || (cmd.item !== null && typeof cmd.item !== 'string')) return;
          const error = game.setSigil(ch.id, cmd.slot, cmd.item, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_title') {
          if (cmd.achievement !== null && typeof cmd.achievement !== 'string') return;
          const error = game.setTitle(ch.id, cmd.achievement);
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'set_pet') {
          if (cmd.pet !== null && typeof cmd.pet !== 'string') return;
          const error = game.setPet(ch.id, cmd.pet, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_kids_outfit') {
          if (typeof cmd.outfit !== 'string') return;
          const error = game.buyKidsOutfit(ch.id, cmd.outfit, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_kids_potion') {
          const error = game.buyKidsPotion(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_vote_shop') {
          if (cmd.item !== 'stamina' && cmd.item !== 'chest' && cmd.item !== 'xp') return;
          const r = game.buyVoteShop(ch.id, cmd.item, now());
          if (r.error) return send(ws, { type: 'error', message: r.error });
          if (r.text) send(ws, { type: 'notice', text: r.text });
        } else if (cmd.type === 'buy_vote_pet') {
          const error = game.buyVotePet(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_vote_outfit') {
          if (typeof cmd.outfit !== 'string') return;
          const error = game.buyVoteOutfit(ch.id, cmd.outfit, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'equip_combat_pet') {
          if (cmd.pet !== null && typeof cmd.pet !== 'string') return;
          const error = game.equipCombatPet(ch.id, cmd.pet);
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_halloween_pet') {
          if (typeof cmd.pet !== 'string') return;
          const error = game.buyHalloweenPet(ch.id, cmd.pet, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_halloween_outfit') {
          if (typeof cmd.outfit !== 'string') return;
          const error = game.buyHalloweenOutfit(ch.id, cmd.outfit, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_halloween_potion') {
          const error = game.buyHalloweenPotion(ch.id, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buy_halloween_item') {
          if (cmd.item !== 'boss_token' && cmd.item !== 'boss_essence') return;
          const error = game.buyHalloweenItem(ch.id, cmd.item, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'halloween_trick_or_treat') {
          const res = game.trickOrTreat(ch.id, now());
          if (res.error) return send(ws, { type: 'error', message: res.error });
          if (res.result) send(ws, { type: 'trick_or_treat_result', result: res.result });
        } else if (cmd.type === 'buy_kids_pet') {
          if (typeof cmd.pet !== 'string') return;
          const error = game.buyKidsPet(ch.id, cmd.pet, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'lock_item') {
          if (typeof cmd.item !== 'string') return;
          const error = game.lockItem(ch.id, cmd.item, !!cmd.locked);
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'account_banks') {
          send(ws, { type: 'account_banks', chars: game.altBanks(ch.id, now()) });
        } else if (cmd.type === 'take_from_alt') {
          const from = Number(cmd.from);
          if (!Number.isInteger(from) || typeof cmd.item !== 'string') return;
          const error = game.takeFromAlt(ch.id, from, cmd.item, Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
          pushState(from, from);
          send(ws, { type: 'account_banks', chars: game.altBanks(ch.id, now()) });
        } else if (cmd.type === 'sell_npc') {
          if (typeof cmd.item !== 'string') return;
          const error = game.sellNpc(ch.id, cmd.item, Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'buyback_npc') {
          const error = game.buybackNpc(ch.id, Number(cmd.id), Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'sell_npc_many') {
          if (!cmd.items || typeof cmd.items !== 'object' || Array.isArray(cmd.items)) return;
          const items: Record<string, number> = {};
          for (const [id, qty] of Object.entries(cmd.items as Record<string, unknown>)) items[id] = Number(qty);
          const error = game.sellNpcMany(ch.id, items, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'sell_rashid') {
          if (typeof cmd.item !== 'string') return;
          const error = game.sellRashid(ch.id, cmd.item, Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'market_list') {
          if (typeof cmd.item !== 'string') return;
          const error = game.marketList(ch.id, cmd.item, Number(cmd.qty), Number(cmd.price), now());
          if (error) return send(ws, { type: 'error', message: error });
          broadcastMarket();
        } else if (cmd.type === 'market_buy') {
          const { error, sellerId } = game.marketBuy(ch.id, Number(cmd.listing), Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
          broadcastMarket();
          const sellerAccount = sellerId ? onlineKey(sellerId) : null;
          if (sellerAccount !== null && sellerId) pushState(sellerAccount, sellerId);
        } else if (cmd.type === 'market_offer') {
          if (typeof cmd.item !== 'string') return;
          const error = game.marketOffer(ch.id, cmd.item, Number(cmd.qty), Number(cmd.price), now());
          if (error) return send(ws, { type: 'error', message: error });
          broadcastMarket();
        } else if (cmd.type === 'market_fill') {
          const { error, buyerId } = game.marketFill(ch.id, Number(cmd.offer), Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
          broadcastMarket();
          const buyerAccount = buyerId ? onlineKey(buyerId) : null;
          if (buyerAccount !== null && buyerId) pushState(buyerAccount, buyerId);
        } else if (cmd.type === 'market_offer_cancel') {
          const error = game.marketOfferCancel(ch.id, Number(cmd.offer), now());
          if (error) return send(ws, { type: 'error', message: error });
          broadcastMarket();
        } else if (cmd.type === 'market_cancel') {
          const error = game.marketCancel(ch.id, Number(cmd.listing), now());
          if (error) return send(ws, { type: 'error', message: error });
          broadcastMarket();
        } else if (cmd.type === 'unequip') {
          if (!EQUIP_SLOTS.some((s) => s.id === cmd.slot)) return;
          game.unequip(ch.id, cmd.slot, now());
        } else if (cmd.type === 'arena_start') {
          if (typeof cmd.arenaId !== 'string') return;
          const error = game.startArena(ch.id, cmd.arenaId, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'arena_claim_reward') {
          if (typeof cmd.arenaId !== 'string' || typeof cmd.weaponId !== 'string') return;
          const error = game.claimArenaReward(ch.id, cmd.arenaId, cmd.weaponId, now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'city_move') {
          // Só visual: confere o formato, o limite de mensagens e se ele está mesmo na cidade.
          const { x, y } = cmd;
          if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 500 || y > 500) return;
          if (placeOf(db.activityFor(ch.id)) !== 'city') return;
          const t = now();
          const last = cityPos.get(ch.id);
          if (last && t - last.at < CITY_MOVE_MIN_MS) return;
          cityPos.set(ch.id, { x, y, at: t });
          placeById.set(ch.id, 'city');
          for (const [other, otherId] of sockets) {
            if (otherId !== ch.id && placeById.get(otherId) === 'city') send(other, { type: 'city_move', id: ch.id, x, y });
          }
        } else if (cmd.type === 'party_invite') {
          if (typeof cmd.name !== 'string') return;
          const res = partyManager.invite(ch.id, cmd.name.trim(), now());
          if (res.error) return send(ws, { type: 'error', message: res.error });
          if (res.invite) {
            const targetAccount = onlineKey(res.invite.targetId);
            if (targetAccount !== null) {
              for (const s of socketsOf(targetAccount)) {
                send(s, {
                  type: 'party_invite',
                  invite: {
                    partyId: res.invite.partyId,
                    leaderName: ch.name,
                    expiresAt: res.invite.expiresAt,
                  },
                });
              }
            }
            pushParty(ch.id);
          }
        } else if (cmd.type === 'party_cancel_invite') {
          if (typeof cmd.targetId !== 'number') return;
          const res = partyManager.cancelInvite(ch.id, cmd.targetId);
          if (res.error) return send(ws, { type: 'error', message: res.error });
          pushParty(ch.id);
          const targetAccount = onlineKey(cmd.targetId);
          if (targetAccount !== null) {
            for (const s of socketsOf(targetAccount)) send(s, { type: 'party_invite', invite: null });
          }
        } else if (cmd.type === 'party_accept') {
          if (typeof cmd.partyId !== 'number') return;
          const res = partyManager.accept(ch.id, cmd.partyId, now());
          if (res.error) return send(ws, { type: 'error', message: res.error });
          send(ws, { type: 'party_invite', invite: null });
          const party = db.partyFor(ch.id);
          if (party) {
            for (const mId of party.members) pushParty(mId);
          }
        } else if (cmd.type === 'party_decline') {
          if (typeof cmd.partyId !== 'number') return;
          partyManager.decline(ch.id, cmd.partyId);
          send(ws, { type: 'party_invite', invite: null });
        } else if (cmd.type === 'party_leave') {
          const res = partyManager.leave(ch.id);
          if (res) {
            pushParty(ch.id);
            for (const mId of res.memberIds) pushParty(mId);
          }
        } else if (cmd.type === 'party_kick') {
          if (typeof cmd.memberId !== 'number') return;
          const res = partyManager.kick(ch.id, cmd.memberId);
          if (res.error) return send(ws, { type: 'error', message: res.error });
          if (res.memberIds) {
            for (const mId of res.memberIds) pushParty(mId);
          }
        } else if (cmd.type === 'party_chat') {
          const party = db.partyFor(ch.id);
          if (!party) return send(ws, { type: 'error', message: 'Você não está em um grupo.' });
          const text = cleanChat(cmd.text);
          if (!text) return;
          const at = now();
          if (at - (lastChat.get(ch.id) ?? -Infinity) < CHAT_COOLDOWN_MS) {
            return send(ws, { type: 'error', message: 'Calma: uma mensagem por segundo.' });
          }
          lastChat.set(ch.id, at);
          const msg = {
            id: -Math.floor(Math.random() * 1000000) - 1,
            name: ch.name,
            vocation: ch.vocation,
            text,
            at,
            channel: 'party' as const,
          };
          for (const mId of party.members) {
            const acc = onlineKey(mId);
            if (acc !== null) {
              for (const s of socketsOf(acc)) send(s, { type: 'chat', messages: [msg] });
            }
          }
        } else if (cmd.type === 'refine_item') {
          if (typeof cmd.item !== 'string') return;
          const error = game.refineItem(ch.id, cmd.item, now(), { protect: !!cmd.protect, onResult: (text) => send(ws, { type: 'notice', text }) });
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'ascend_item') {
          if (typeof cmd.item !== 'string' || !cmd.use || typeof cmd.use !== 'object') return;
          const use: Record<string, number> = {};
          for (const [id, q] of Object.entries(cmd.use)) use[id] = Number(q);
          const error = game.ascendItem(ch.id, cmd.item, use, now(), { protect: !!cmd.protect, onResult: (text) => send(ws, { type: 'notice', text }) });
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'dismantle_item') {
          if (typeof cmd.item !== 'string') return;
          const error = game.dismantleItem(ch.id, cmd.item, Number(cmd.qty), now());
          if (error) return send(ws, { type: 'error', message: error });
        } else if (cmd.type === 'trade_request') {
          const targetId = Number(cmd.targetCharacterId);
          if (!targetId || targetId === ch.id) return send(ws, { type: 'error', message: 'Alvo inválido para negociação.' });
          const targetAccount = onlineKey(targetId);
          if (targetAccount === null) return send(ws, { type: 'error', message: 'Jogador não encontrado ou offline.' });
          const reqRes = tradeManager.requestTrade(ch.id, ch.name, targetId);
          if (!reqRes.success) return send(ws, { type: 'error', message: reqRes.error ?? 'Não foi possível solicitar troca.' });
          // Avisa o alvo
          for (const s of socketsOf(targetAccount)) {
            send(s, {
              type: 'trade_invite',
              invite: { fromCharacterId: ch.id, fromCharacterName: ch.name },
            });
          }
          send(ws, { type: 'chat', messages: [{
            id: -Math.floor(Math.random() * 1000000) - 1,
            name: 'Grimhold',
            vocation: 'system',
            text: `Convite de negociação enviado para o outro jogador.`,
            at: now(),
            system: true,
            channel: 'global',
          }] });
        } else if (cmd.type === 'trade_respond') {
          const fromId = Number(cmd.fromCharacterId);
          const accept = Boolean(cmd.accept);
          const fromAccount = onlineKey(fromId);
          const respRes = tradeManager.respondTrade(ch.id, ch.name, fromId, accept);
          // Limpa convite na UI de quem respondeu
          send(ws, { type: 'trade_invite', invite: null });
          if (!accept) {
            if (fromAccount !== null) {
              for (const s of socketsOf(fromAccount)) {
                send(s, { type: 'error', message: `${ch.name} recusou seu pedido de troca.` });
              }
            }
            return;
          }
          if (!respRes.started || !respRes.session) {
            return send(ws, { type: 'error', message: respRes.error ?? 'Não foi possível iniciar a negociação.' });
          }
          // Negociação iniciada com sucesso para ambos!
          pushTradeSession(respRes.session, true);
        } else if (cmd.type === 'trade_set_gold') {
          const gold = Number(cmd.gold);
          const myBankGold = db.bankFor(ch.id).gold ?? 0;
          if (gold > myBankGold) return send(ws, { type: 'error', message: 'Você não tem essa quantia de ouro no banco.' });
          const res = tradeManager.setGold(ch.id, gold);
          if (!res) return send(ws, { type: 'error', message: 'Você não está em uma negociação ativa.' });
          pushTradeSession(res.session);
        } else if (cmd.type === 'trade_add_item') {
          if (typeof cmd.item !== 'string') return;
          const qty = Math.max(1, Math.floor(Number(cmd.qty) || 1));
          const currentOffer = tradeManager.getSessionByCharacter(ch.id);
          if (!currentOffer) return send(ws, { type: 'error', message: 'Você não está em uma negociação ativa.' });
          const side = currentOffer.partyA.characterId === ch.id ? currentOffer.partyA : currentOffer.partyB;
          const currentInTrade = side.items.find((i) => i.item === cmd.item)?.qty ?? 0;
          const bankQty = db.bankFor(ch.id)[cmd.item] ?? 0;
          if (currentInTrade + qty > bankQty) {
            return send(ws, { type: 'error', message: 'Você não possui mais essa quantidade no banco.' });
          }
          const res = tradeManager.addItem(ch.id, cmd.item, qty);
          if (!res) return send(ws, { type: 'error', message: 'Você não está em uma negociação ativa.' });
          if (res.error) return send(ws, { type: 'error', message: res.error });
          pushTradeSession(res.session);
        } else if (cmd.type === 'trade_remove_item') {
          if (typeof cmd.item !== 'string') return;
          const qty = Math.max(1, Math.floor(Number(cmd.qty) || 1));
          const res = tradeManager.removeItem(ch.id, cmd.item, qty);
          if (!res) return send(ws, { type: 'error', message: 'Você não está em uma negociação ativa.' });
          pushTradeSession(res.session);
        } else if (cmd.type === 'trade_accept') {
          const res = tradeManager.acceptTrade(ch.id);
          if (!res) return send(ws, { type: 'error', message: 'Você não está em uma negociação ativa.' });
          if (res.completed) {
            const charA = res.session.partyA.characterId;
            const charB = res.session.partyB.characterId;
            const accA = onlineKey(charA);
            const accB = onlineKey(charB);
            if (accA !== null) {
              for (const s of socketsOf(accA)) send(s, { type: 'trade_success', message: 'Troca realizada com sucesso!' });
              pushState(accA, charA);
            }
            if (accB !== null) {
              for (const s of socketsOf(accB)) send(s, { type: 'trade_success', message: 'Troca realizada com sucesso!' });
              pushState(accB, charB);
            }
          } else if (res.error) {
            // Falha na transação atômica (ex: saldo insuficiente)
            notifyTradeClosed(res.session.partyA.characterId, res.session.partyB.characterId, res.error);
            const accA = onlineKey(res.session.partyA.characterId);
            const accB = onlineKey(res.session.partyB.characterId);
            if (accA !== null) pushState(accA, res.session.partyA.characterId);
            if (accB !== null) pushState(accB, res.session.partyB.characterId);
          } else {
            pushTradeSession(res.session);
          }
        } else if (cmd.type === 'trade_cancel') {
          const res = tradeManager.cancelTrade(ch.id);
          if (res.session) {
            notifyTradeClosed(res.session.partyA.characterId, res.session.partyB.characterId, 'A negociação foi cancelada.');
          }
        } else {
          return;
        }
        pushState(ch.id, ch.id);
        const party = db.partyFor(ch.id);
        if (party) {
          for (const mId of party.members) pushParty(mId);
        }
      };
      ws.on('message', (data) => {
        try {
          onMessage(data);
        } catch (err) {
          console.error('[ws]', err);
          alerts.report('ws', err);
          try {
            send(ws, { type: 'error', message: 'Erro interno. Tente de novo.' });
          } catch {
            /* conexão já fechou */
          }
        }
      });

      ws.on('close', () => {
        const key = sockets.get(ws) ?? -1;
        sockets.delete(ws);
        if (key >= 0 && ![...sockets.values()].includes(key)) cityPos.delete(key);
        broadcastOnline();
        const ch = key >= 0 ? db.characterById(key) : null;
        if (ch) {
          const canceled = tradeManager.cancelTrade(ch.id);
          if (canceled.session) {
            notifyTradeClosed(canceled.session.partyA.characterId, canceled.session.partyB.characterId, 'O outro jogador desconectou.');
          }
          const party = db.partyFor(ch.id);
          if (party) {
            for (const mId of party.members) {
              if (mId !== ch.id) pushParty(mId);
            }
          }
        }
      });
    });
  });

  return server;
}
