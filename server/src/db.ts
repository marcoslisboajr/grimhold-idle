import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { RAID_ID, raidById, SKILLS, levelForXp, isCombatSkill, isPreySpecies, achievementPoints, ARENAS, DEFAULT_LOOKS, STARTER_KIT, FIRST_QUESTS, LOOK_ADDONS, OUTFIT_IDS, FREE_OUTFIT_IDS, parseLook, MAX_SIGILS, validCombatRules, BOSS_HISTORY_MAX, NO_SLAYER, MASTERY_NODES, MASTERY_POINT_XP, NO_MASTERY, MASTERY_MAX_LEVEL, masteryLevel, masteryPointCost, MASTERY_MIN_LEVEL } from '@grimhold/shared';
import type { MasteryNodeId, MasteryState } from '@grimhold/shared';
import type { Activity, BossHistoryEntry, BuyOffer, CombatRules, Character, CharacterArenaState, ChatMessage, RankingEntry, EquipSlot, Gains, HuntingTaskState, Listing, SlayerBoosts, SlayerMasterId, SlayerSize, SlayerState, Look, LookAddon, OutfitId, PreyBonus, PreySlot, QueuedActivity, QuestState, SkillId, GatheringSkillId, SpellAura, StatKey, StoryState, VocationId } from '@grimhold/shared';

interface CharacterRow {
  id: number;
  name: string;
  vocation: VocationId;
  promotion: string | null;
  look: string | null;
  unlocked_addons?: string | null;
  unlocked_outfits?: string | null;
  unlocked_pets?: string | null;
  active_pet?: string | null;
  level: number;
  xp: number;
  created_at: string;
}

const toCharacter = (r: CharacterRow): Character => ({
  id: r.id,
  name: r.name,
  vocation: r.vocation,
  look: lookOf(r),
  unlockedAddons: parseUnlockedAddons(r.unlocked_addons),
  unlockedOutfits: parseUnlockedOutfits(r.unlocked_outfits, r.vocation),
  unlockedPets: parseJsonList(r.unlocked_pets),
  activePet: r.active_pet ?? null,
  promotion: r.promotion ?? null,
  level: r.level,
  xp: r.xp,
  createdAt: r.created_at,
});

function parseJsonList(s: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(s ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseUnlockedAddons(s: string | null | undefined): LookAddon[] {
  try {
    const arr = JSON.parse(s ?? '[]');
    return Array.isArray(arr) ? arr.filter((a): a is LookAddon => (LOOK_ADDONS as readonly string[]).includes(a)) : [];
  } catch {
    return [];
  }
}

function parseUnlockedOutfits(s: string | null | undefined, _vocation?: string): OutfitId[] {
  // Os trajes comuns são de todos; os de quest só depois de ganhar (guardados na coluna).
  let saved: string[] = [];
  try {
    saved = JSON.parse(s ?? '[]');
  } catch {
    /* coluna inválida: só os comuns */
  }
  return [...FREE_OUTFIT_IDS, ...OUTFIT_IDS.filter((id) => !FREE_OUTFIT_IDS.includes(id) && saved.includes(id))];
}

/** Aparência salva, ou a padrão da vocação (personagens antigos, JSON inválido). */
function lookOf(r: CharacterRow): Look {
  try {
    return parseLook(JSON.parse(r.look ?? 'null')) ?? DEFAULT_LOOKS[r.vocation];
  } catch {
    return DEFAULT_LOOKS[r.vocation];
  }
}

export type Db = ReturnType<typeof openDb>;

/** Abre (ou cria) o banco. Use ':memory:' nos testes. */
/** Lista de ids de itens salva em JSON (texto inválido vira lista vazia, sem derrubar o servidor). */
function parseItems(text: string): string[] {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Buff e escudo guardados na atividade (JSON); qualquer coisa estranha vira nenhum. */
function parseAura(raw: unknown): SpellAura | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const v = JSON.parse(raw) as SpellAura;
    const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 600_000;
    const out: SpellAura = {};
    if (v.buff && ok(v.buff.left)) out.buff = { left: v.buff.left, attack: Number(v.buff.attack) || 0, crit: Number(v.buff.crit) || 0 };
    if (v.shield && ok(v.shield.left)) out.shield = { left: v.shield.left, reduce: Math.min(0.9, Math.max(0, Number(v.shield.reduce) || 0)) };
    return out.buff || out.shield ? out : null;
  } catch {
    return null;
  }
}

/** Sessão de caçada precisa de 10 min para valer na XP/h do cartão. */
const HUNT_XP_MIN_MS = 10 * 60 * 1000;

export function openDb(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS accounts (
      id         INTEGER PRIMARY KEY,
      kind       TEXT NOT NULL DEFAULT 'guest',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id         INTEGER PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      vocation   TEXT NOT NULL,
      level      INTEGER NOT NULL DEFAULT 1,
      xp         INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO accounts (id, kind) VALUES (0, 'system');
    INSERT OR IGNORE INTO characters (id, account_id, name, vocation) VALUES (0, 0, 'Grimhold', 'system');

    CREATE TABLE IF NOT EXISTS skills (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      skill        TEXT NOT NULL,
      xp           INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, skill)
    );

    CREATE TABLE IF NOT EXISTS bank (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      item         TEXT NOT NULL,
      qty          INTEGER NOT NULL,
      PRIMARY KEY (character_id, item)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      slot         TEXT NOT NULL,
      item         TEXT NOT NULL,
      PRIMARY KEY (character_id, slot)
    );

    CREATE TABLE IF NOT EXISTS listings (
      id         INTEGER PRIMARY KEY,
      seller_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      item       TEXT NOT NULL,
      qty        INTEGER NOT NULL,
      price      INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topidle_votes (
      event_id     TEXT PRIMARY KEY,
      identifier   TEXT,
      character_id INTEGER,
      created_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id           INTEGER PRIMARY KEY,
      character_id INTEGER NOT NULL,
      name         TEXT NOT NULL,
      kind         TEXT NOT NULL,
      text         TEXT NOT NULL,
      context      TEXT,
      created_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buy_offers (
      id         INTEGER PRIMARY KEY,
      buyer_id   INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      item       TEXT NOT NULL,
      qty        INTEGER NOT NULL,
      price      INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat (
      id           INTEGER PRIMARY KEY,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      text         TEXT NOT NULL,
      at           INTEGER NOT NULL
    );

    -- Quests dos mestres: progresso contado e se já foi entregue.
    CREATE TABLE IF NOT EXISTS quests (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      quest        TEXT NOT NULL,
      progress     INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'active',
      PRIMARY KEY (character_id, quest)
    );

    -- Quests de história: passo atual, progresso do objetivo do passo e o final.
    CREATE TABLE IF NOT EXISTS stories (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      story        TEXT NOT NULL,
      step         INTEGER NOT NULL DEFAULT 0,
      progress     INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'active',
      ending       TEXT,
      PRIMARY KEY (character_id, story)
    );

    -- Tarefas diárias: progresso de cada uma no dia (AAAA-MM-DD, UTC).
    -- Entradas do dia em cada instância (a XP cai na 2ª e na 3ª): o dia, quantas e a semente da última.
    CREATE TABLE IF NOT EXISTS instance_tries (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      instance     TEXT NOT NULL,
      day          TEXT NOT NULL,
      tries        INTEGER NOT NULL DEFAULT 0,
      seed         INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, instance)
    );
    -- Resultados do chefe global de cada jogador (o modal "X caiu!" sumia ao fechar): guarda os últimos.
    CREATE TABLE IF NOT EXISTS boss_results (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      at           INTEGER NOT NULL,
      data         TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS boss_results_char ON boss_results(character_id, at);
    -- Encomendas da Guilda: uma por profissão (a linha some ao entregar ou cancelar).
    CREATE TABLE IF NOT EXISTS guild_tasks (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      skill        TEXT NOT NULL,
      task_id      TEXT NOT NULL,
      progress     INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, skill)
    );
    CREATE TABLE IF NOT EXISTS instance_free (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      instance     TEXT NOT NULL,
      day          TEXT NOT NULL,
      seed         INTEGER NOT NULL,
      PRIMARY KEY (character_id, instance)
    );
    -- Ceifador: as peças que caíram numa morte sem bênção, guardadas até expires_at (ms) para resgate.
    CREATE TABLE IF NOT EXISTS reaper_items (
      id           INTEGER PRIMARY KEY,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      items        TEXT NOT NULL,
      price        INTEGER NOT NULL,
      died_at      INTEGER NOT NULL,
      expires_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reaper_items_char ON reaper_items (character_id);
    -- Covis da aba Chefes: até quando (ms) o personagem fica sem poder entrar de novo.
    CREATE TABLE IF NOT EXISTS achievements (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      id           TEXT NOT NULL,
      at           INTEGER NOT NULL,
      PRIMARY KEY (character_id, id)
    );
    CREATE TABLE IF NOT EXISTS activity_queue (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      queue        TEXT NOT NULL DEFAULT '[]',
      until        INTEGER
    );
    -- Por que a profissão parou sozinha (material acabou, fila pulou tarefas): aviso para o jogador.
    CREATE TABLE IF NOT EXISTS activity_stop (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      text         TEXT NOT NULL,
      at           INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS first99 (
      skill        TEXT PRIMARY KEY,
      character_id INTEGER,
      at           INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS boss_return (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      skill        TEXT NOT NULL,
      node         TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lair_cooldowns (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      lair         TEXT NOT NULL,
      until        INTEGER NOT NULL,
      PRIMARY KEY (character_id, lair)
    );
    CREATE TABLE IF NOT EXISTS instance_clears (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      instance     TEXT NOT NULL,
      day          TEXT NOT NULL,
      total        INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, instance)
    );
    CREATE TABLE IF NOT EXISTS raid_clears (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      week         TEXT NOT NULL,
      raid_id      TEXT NOT NULL,
      phase        INTEGER NOT NULL,
      is_solo      INTEGER NOT NULL DEFAULT 0,
      got_piece    INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      PRIMARY KEY (character_id, week, raid_id, phase)
    );
    CREATE TABLE IF NOT EXISTS raid_pity (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      raid_id      TEXT NOT NULL,
      weeks_failed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, raid_id)
    );
    CREATE TABLE IF NOT EXISTS raid_shop_purchases (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      week         TEXT NOT NULL,
      item_id      TEXT NOT NULL,
      count        INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (character_id, week, item_id)
    );
    CREATE TABLE IF NOT EXISTS dailies (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      day          TEXT NOT NULL,
      idx          INTEGER NOT NULL,
      progress     INTEGER NOT NULL DEFAULT 0,
      claimed      INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, day, idx)
    );

    -- Contadores para as conquistas (abates, chefes, vendas...).
    CREATE TABLE IF NOT EXISTS stats (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      key          TEXT NOT NULL,
      value        INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, key)
    );

    -- Chefe global: eventos (pago ou não) e o dano de cada um, para sobreviver a reinícios.
    CREATE TABLE IF NOT EXISTS world_boss (
      event_id INTEGER PRIMARY KEY,
      done     INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS world_boss_damage (
      event_id     INTEGER NOT NULL REFERENCES world_boss(event_id) ON DELETE CASCADE,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      damage       REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (event_id, character_id)
    );

    -- Bestiário: abates por espécie.
    CREATE TABLE IF NOT EXISTS bestiary (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      monster      TEXT NOT NULL,
      kills        INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, monster)
    );

    -- Prey: vagas com espécie, bônus e segundos restantes.
    CREATE TABLE IF NOT EXISTS prey (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      slot         INTEGER NOT NULL,
      monster      TEXT,
      bonus        TEXT,
      seconds_left INTEGER NOT NULL DEFAULT 7200,
      PRIMARY KEY (character_id, slot)
    );
    -- Dia da última troca grátis do prey.
    CREATE TABLE IF NOT EXISTS prey_free (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      day          TEXT NOT NULL
    );

    -- Baú diário (24/10): último dia aberto e a sequência de dias seguidos.
    CREATE TABLE IF NOT EXISTS daily_chest (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      last_day     TEXT NOT NULL,
      streak       INTEGER NOT NULL DEFAULT 1
    );

    -- Profissões de coleta preferidas para as diárias (válidas a partir de effective_day).
    CREATE TABLE IF NOT EXISTS daily_gather_preferences (
      character_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      effective_day TEXT NOT NULL,
      skills        TEXT NOT NULL,
      PRIMARY KEY (character_id, effective_day)
    );

    -- Charms liberados e a espécie em que cada um está posto.
    CREATE TABLE IF NOT EXISTS charms (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      charm        TEXT NOT NULL,
      monster      TEXT,
      PRIMARY KEY (character_id, charm)
    );

    -- Imbuements ativos no personagem (segundos restantes de combate).
    CREATE TABLE IF NOT EXISTS imbuements (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      imbuement_id TEXT NOT NULL,
      seconds_left INTEGER NOT NULL,
      PRIMARY KEY (character_id, imbuement_id)
    );

    -- Tasks de caça (Grizzly Adams): progresso de abates e status.
    CREATE TABLE IF NOT EXISTS hunting_tasks (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      task_id      TEXT NOT NULL,
      progress     INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'active',
      PRIMARY KEY (character_id, task_id)
    );

    -- XP/h real de cada caçada (por dificuldade): a sessão atual e a última sessão com 10+ min.
    CREATE TABLE IF NOT EXISTS hunt_xp (
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      hunt         TEXT NOT NULL,
      seed         INTEGER NOT NULL DEFAULT 0,
      cur_xp       REAL NOT NULL DEFAULT 0,
      cur_ms       REAL NOT NULL DEFAULT 0,
      xp           REAL NOT NULL DEFAULT 0,
      ms           REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, hunt)
    );

    -- Slayer: tarefa do mestre (uma por personagem), sequência, pontos e espécies bloqueadas.
    CREATE TABLE IF NOT EXISTS slayer_tasks (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      master       TEXT,
      monster      TEXT,
      target       INTEGER NOT NULL DEFAULT 0,
      progress     INTEGER NOT NULL DEFAULT 0,
      streak       INTEGER NOT NULL DEFAULT 0,
      points       INTEGER NOT NULL DEFAULT 0,
      completed    INTEGER NOT NULL DEFAULT 0,
      blocked      TEXT NOT NULL DEFAULT '[]'
    );

    -- Pontos de Maestria (nível 400+): barra de XP, pontos livres e nós aprendidos.
    CREATE TABLE IF NOT EXISTS mastery (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      xp           INTEGER NOT NULL DEFAULT 0,
      points       INTEGER NOT NULL DEFAULT 0,
      nodes        TEXT NOT NULL DEFAULT '{}'
    
    );

    -- Arenas de gladiadores (Svargrond style).
    CREATE TABLE IF NOT EXISTS arenas (
      character_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      arena_id      TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'available',
      current_wave  INTEGER NOT NULL DEFAULT 0,
      reward_chosen TEXT,
      completed_at  INTEGER,
      PRIMARY KEY (character_id, arena_id)
    );

    -- Grupos de jogadores (Party estilo Tibia).
    CREATE TABLE IF NOT EXISTS parties (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      leader_id  INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS party_members (
      party_id     INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
      joined_at    INTEGER NOT NULL,
      PRIMARY KEY (party_id, character_id)
    );

    -- Uma atividade por personagem. 'since' em ms do relógio do servidor.
    -- Recompra do Mercador: o que foi vendido nas últimas 24 h (price = ouro recebido por unidade).
    CREATE TABLE IF NOT EXISTS npc_buyback (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      item         TEXT NOT NULL,
      qty          INTEGER NOT NULL,
      price        INTEGER NOT NULL,
      sold_at      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS npc_buyback_char ON npc_buyback (character_id, sold_at);

    CREATE TABLE IF NOT EXISTS activities (
      character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      skill        TEXT NOT NULL,
      node         TEXT NOT NULL,
      since        INTEGER NOT NULL,
      seed         INTEGER NOT NULL DEFAULT 0,
      seq          INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migração: bancos criados antes da caçada não têm seed/seq.
  const activityCols = (db.prepare(`PRAGMA table_info(activities)`).all() as { name: string }[]).map((c) => c.name);
  for (const col of ['seed', 'seq']) {
    if (!activityCols.includes(col)) db.exec(`ALTER TABLE activities ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
  }
  // Migração: a mana da caçada guardada entre um crédito e outro (vazio = cheia).
  if (!activityCols.includes('mana')) db.exec(`ALTER TABLE activities ADD COLUMN mana REAL`);
  // Migração: buff e escudo de magia que ainda valem entre um crédito e outro (JSON; vazio = nenhum).
  if (!activityCols.includes('aura')) db.exec(`ALTER TABLE activities ADD COLUMN aura TEXT`);

  // Migração: contas ganham login (usuário + senha) além do token de convidado.
  const accountCols = (db.prepare(`PRAGMA table_info(accounts)`).all() as { name: string }[]).map((c) => c.name);
  if (!accountCols.includes('username')) db.exec(`ALTER TABLE accounts ADD COLUMN username TEXT`);
  if (!accountCols.includes('pass_hash')) db.exec(`ALTER TABLE accounts ADD COLUMN pass_hash TEXT`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS accounts_username ON accounts (username COLLATE NOCASE)`);
  // Email da conta (só o dono vê; serve para recuperar a conta), um por conta.
  if (!accountCols.includes('email')) db.exec(`ALTER TABLE accounts ADD COLUMN email TEXT`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS accounts_email ON accounts (email COLLATE NOCASE)`);
  if (!accountCols.includes('email_verified')) db.exec(`ALTER TABLE accounts ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
  // Links de email (confirmar o email / recuperar a conta): guarda só o hash do token.
  db.exec(`CREATE TABLE IF NOT EXISTS email_tokens (
    hash       TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    email      TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`);
  const selectAccount = db.prepare(`SELECT username FROM accounts WHERE id = ?`);
  const selectByUsername = db.prepare(`SELECT id, pass_hash FROM accounts WHERE username = ? COLLATE NOCASE`);
  const updateCredentials = db.prepare(`UPDATE accounts SET username = ?, pass_hash = ?, kind = 'user' WHERE id = ?`);
  const deleteSession = db.prepare(`DELETE FROM sessions WHERE token = ?`);

  const characterCols = (db.prepare(`PRAGMA table_info(characters)`).all() as { name: string }[]).map((c) => c.name);
  if (!characterCols.includes('bio')) db.exec(`ALTER TABLE characters ADD COLUMN bio TEXT NOT NULL DEFAULT ''`);
  if (!characterCols.includes('promotion')) db.exec(`ALTER TABLE characters ADD COLUMN promotion TEXT`);
  const updatePromotion = db.prepare(`UPDATE characters SET promotion = ? WHERE id = ?`);
  if (!characterCols.includes('food')) db.exec(`ALTER TABLE characters ADD COLUMN food TEXT`);
  const updateFood = db.prepare(`UPDATE characters SET food = ? WHERE id = ?`);
  const selectFood = db.prepare(`SELECT food FROM characters WHERE id = ?`);
  if (!characterCols.includes('meal')) db.exec(`ALTER TABLE characters ADD COLUMN meal TEXT`);
  const updateMeal = db.prepare(`UPDATE characters SET meal = ? WHERE id = ?`);
  const selectMeal = db.prepare(`SELECT meal FROM characters WHERE id = ?`);
  if (!characterCols.includes('sigils')) db.exec(`ALTER TABLE characters ADD COLUMN sigils TEXT`);
  const updateSigils = db.prepare(`UPDATE characters SET sigils = ? WHERE id = ?`);
  const selectSigils = db.prepare(`SELECT sigils FROM characters WHERE id = ?`);
  if (!characterCols.includes('blessed')) db.exec(`ALTER TABLE characters ADD COLUMN blessed INTEGER NOT NULL DEFAULT 0`);
  const updateBlessed = db.prepare(`UPDATE characters SET blessed = ? WHERE id = ?`);
  const selectBlessed = db.prepare(`SELECT blessed FROM characters WHERE id = ?`);
  if (!characterCols.includes('potion')) db.exec(`ALTER TABLE characters ADD COLUMN potion TEXT`);
  const updatePotion = db.prepare(`UPDATE characters SET potion = ? WHERE id = ?`);
  const selectPotion = db.prepare(`SELECT potion FROM characters WHERE id = ?`);
  if (!characterCols.includes('mana_potion')) db.exec(`ALTER TABLE characters ADD COLUMN mana_potion TEXT`);
  // Título escolhido (id da conquista que o libera).
  if (!characterCols.includes('title')) db.exec(`ALTER TABLE characters ADD COLUMN title TEXT`);
  // Stamina: o que sobrou (vazio = cheia) e até quando foi contada.
  if (!characterCols.includes('stamina_ms')) db.exec(`ALTER TABLE characters ADD COLUMN stamina_ms INTEGER`);
  const preyFreeCols = (db.prepare(`PRAGMA table_info(prey_free)`).all() as { name: string }[]).map((c) => c.name);
  if (!preyFreeCols.includes('paid')) db.exec(`ALTER TABLE prey_free ADD COLUMN paid INTEGER NOT NULL DEFAULT 0`);
  if (!characterCols.includes('stamina_at')) db.exec(`ALTER TABLE characters ADD COLUMN stamina_at INTEGER NOT NULL DEFAULT 0`);
  const selectStamina = db.prepare(`SELECT stamina_ms, stamina_at FROM characters WHERE id = ?`);
  const updateStamina = db.prepare(`UPDATE characters SET stamina_ms = ?, stamina_at = ? WHERE id = ?`);
  // Recarga geral (evento): cheia a partir do começo do trecho de atividade em aberto (ou de agora).
  const refillStaminaAll = db.prepare(
    `UPDATE characters SET stamina_ms = ?, stamina_at = COALESCE((SELECT since FROM activities WHERE character_id = characters.id), ?) WHERE id <> 0`,
  );
  const updateManaPotion = db.prepare(`UPDATE characters SET mana_potion = ? WHERE id = ?`);
  const selectManaPotion = db.prepare(`SELECT mana_potion FROM characters WHERE id = ?`);
  if (!characterCols.includes('arrow')) db.exec(`ALTER TABLE characters ADD COLUMN arrow TEXT`);
  const updateArrow = db.prepare(`UPDATE characters SET arrow = ? WHERE id = ?`);
  const selectArrow = db.prepare(`SELECT arrow FROM characters WHERE id = ?`);
  if (!characterCols.includes('rune_attack')) db.exec(`ALTER TABLE characters ADD COLUMN rune_attack TEXT`);
  if (!characterCols.includes('rune_heal')) db.exec(`ALTER TABLE characters ADD COLUMN rune_heal TEXT`);
  const selectRunes = db.prepare(`SELECT rune_attack, rune_heal FROM characters WHERE id = ?`);
  const updateRuneAttack = db.prepare(`UPDATE characters SET rune_attack = ? WHERE id = ?`);
  const updateRuneHeal = db.prepare(`UPDATE characters SET rune_heal = ? WHERE id = ?`);
  if (!characterCols.includes('look')) db.exec(`ALTER TABLE characters ADD COLUMN look TEXT`);
  const updateLook = db.prepare(`UPDATE characters SET look = ? WHERE id = ?`);
  if (!characterCols.includes('spells')) db.exec(`ALTER TABLE characters ADD COLUMN spells TEXT`);
  const updateSpells = db.prepare(`UPDATE characters SET spells = ? WHERE id = ?`);
  const selectSpells = db.prepare(`SELECT spells FROM characters WHERE id = ?`);
  if (!characterCols.includes('combat_rules')) db.exec(`ALTER TABLE characters ADD COLUMN combat_rules TEXT`);
  const updateCombatRules = db.prepare(`UPDATE characters SET combat_rules = ? WHERE id = ?`);
  const selectCombatRules = db.prepare(`SELECT combat_rules FROM characters WHERE id = ?`);
  if (!characterCols.includes('locked_items')) db.exec(`ALTER TABLE characters ADD COLUMN locked_items TEXT NOT NULL DEFAULT '[]'`);
  const updateLockedItems = db.prepare(`UPDATE characters SET locked_items = ? WHERE id = ?`);
  const selectLockedItems = db.prepare(`SELECT locked_items FROM characters WHERE id = ?`);
  const insertBuyback = db.prepare(`INSERT INTO npc_buyback (character_id, item, qty, price, sold_at) VALUES (?, ?, ?, ?, ?)`);
  const selectBuyback = db.prepare(`SELECT id, item, qty, price, sold_at AS at FROM npc_buyback WHERE character_id = ? AND sold_at >= ? ORDER BY sold_at DESC, id DESC`);
  const pruneBuyback = db.prepare(
    `DELETE FROM npc_buyback WHERE character_id = ? AND (sold_at < ? OR id NOT IN (SELECT id FROM npc_buyback WHERE character_id = ? ORDER BY sold_at DESC, id DESC LIMIT ?))`,
  );
  const takeBuyback = db.prepare(`UPDATE npc_buyback SET qty = qty - ? WHERE id = ? AND character_id = ? AND qty >= ?`);
  const dropEmptyBuyback = db.prepare(`DELETE FROM npc_buyback WHERE id = ? AND qty <= 0`);
  if (!characterCols.includes('unlocked_addons')) db.exec(`ALTER TABLE characters ADD COLUMN unlocked_addons TEXT NOT NULL DEFAULT '[]'`);
  const updateUnlockedAddons = db.prepare(`UPDATE characters SET unlocked_addons = ? WHERE id = ?`);
  const selectUnlockedAddons = db.prepare(`SELECT unlocked_addons FROM characters WHERE id = ?`);
  if (!characterCols.includes('unlocked_outfits')) db.exec(`ALTER TABLE characters ADD COLUMN unlocked_outfits TEXT NOT NULL DEFAULT '[]'`);
  const updateUnlockedOutfits = db.prepare(`UPDATE characters SET unlocked_outfits = ? WHERE id = ?`);
  const selectUnlockedOutfits = db.prepare(`SELECT unlocked_outfits FROM characters WHERE id = ?`);
  if (!characterCols.includes('unlocked_pets')) db.exec(`ALTER TABLE characters ADD COLUMN unlocked_pets TEXT NOT NULL DEFAULT '[]'`);
  const updateUnlockedPets = db.prepare(`UPDATE characters SET unlocked_pets = ? WHERE id = ?`);
  const selectUnlockedPets = db.prepare(`SELECT unlocked_pets FROM characters WHERE id = ?`);
  if (!characterCols.includes('active_pet')) db.exec(`ALTER TABLE characters ADD COLUMN active_pet TEXT`);
  const updateActivePet = db.prepare(`UPDATE characters SET active_pet = ? WHERE id = ?`);
  const selectActivePet = db.prepare(`SELECT active_pet FROM characters WHERE id = ?`);
  // Dia das Crianças: XP em dobro até (por personagem) e a poção que cada conta já comprou.
  // Slayer: boosts de loot (+25% ou +50%) e de Bestiário (2x) comprados com pontos.
  const slayerCols = (db.prepare(`PRAGMA table_info(slayer_tasks)`).all() as { name: string }[]).map((c) => c.name);
  if (!slayerCols.includes('loot_until')) db.exec(`ALTER TABLE slayer_tasks ADD COLUMN loot_until INTEGER NOT NULL DEFAULT 0`);
  if (!slayerCols.includes('loot_mult')) db.exec(`ALTER TABLE slayer_tasks ADD COLUMN loot_mult REAL NOT NULL DEFAULT 0`);
  if (!slayerCols.includes('size')) db.exec(`ALTER TABLE slayer_tasks ADD COLUMN size TEXT`);
  // Volta do chefe global: quanto faltava da hora marcada da fila (null = sem hora marcada).
  const bossReturnCols = (db.prepare(`PRAGMA table_info(boss_return)`).all() as { name: string }[]).map((c) => c.name);
  if (!bossReturnCols.includes('left_ms')) db.exec(`ALTER TABLE boss_return ADD COLUMN left_ms INTEGER`);
  if (!slayerCols.includes('bestiary_until')) db.exec(`ALTER TABLE slayer_tasks ADD COLUMN bestiary_until INTEGER NOT NULL DEFAULT 0`);
  if (!characterCols.includes('xp_boost_until')) db.exec(`ALTER TABLE characters ADD COLUMN xp_boost_until INTEGER NOT NULL DEFAULT 0`);
  if (!characterCols.includes('artisan_kit_until')) db.exec(`ALTER TABLE characters ADD COLUMN artisan_kit_until INTEGER NOT NULL DEFAULT 0`);
  // Mascote de combate equipado (24/10): um por vez, o bônus só vale com ele.
  if (!characterCols.includes('combat_pet')) db.exec(`ALTER TABLE characters ADD COLUMN combat_pet TEXT`);
  // Níveis de charm (24/10): quem já tinha o charm fica no nível 3 (o bônus antigo); os novos começam no 1.
  const charmCols = (db.prepare(`PRAGMA table_info(charms)`).all() as { name: string }[]).map((c) => c.name);
  if (!charmCols.includes('level')) db.exec(`ALTER TABLE charms ADD COLUMN level INTEGER NOT NULL DEFAULT 3`);
  // legacy = pago no custo antigo (as linhas de antes ficam 1; as novas entram 0).
  if (!charmCols.includes('legacy')) db.exec(`ALTER TABLE charms ADD COLUMN legacy INTEGER NOT NULL DEFAULT 1`);
  // 24/10 (tarde): os charms de antes também vão para o nível 1 (sem devolver ponto), para os top level terem
  // onde gastar. legacy = 2 marca "pagou o custo antigo e já foi rebaixado": a migração só pega legacy = 1,
  // então roda uma vez só e não desfaz evolução feita depois.
  db.exec(`UPDATE charms SET level = 1, legacy = 2 WHERE legacy = 1`);
  // 25/10: um charm por espécie. Onde havia vários, fica o de nível mais alto (empate: o mais antigo);
  // os outros voltam para "sem espécie" (continuam liberados e no mesmo nível).
  db.exec(`UPDATE charms SET monster = NULL WHERE monster IS NOT NULL AND EXISTS (
    SELECT 1 FROM charms o WHERE o.character_id = charms.character_id AND o.monster = charms.monster AND o.charm <> charms.charm
      AND (o.level > charms.level OR (o.level = charms.level AND o.rowid < charms.rowid)))`);
  // 25/10: um imbuement por família (I, II e III não somam mais). Fica o nível mais alto, com o tempo de todos somado.
  {
    const rows = db.prepare(`SELECT character_id, imbuement_id, seconds_left FROM imbuements WHERE seconds_left > 0`).all() as { character_id: number; imbuement_id: string; seconds_left: number }[];
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.character_id}:${r.imbuement_id.replace(/_\d$/, '')}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    const zero = db.prepare(`UPDATE imbuements SET seconds_left = 0 WHERE character_id = ? AND imbuement_id = ?`);
    const set = db.prepare(`UPDATE imbuements SET seconds_left = ? WHERE character_id = ? AND imbuement_id = ?`);
    db.exec('BEGIN');
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const top = g.reduce((x, y) => (y.imbuement_id > x.imbuement_id ? y : x));
      for (const r of g) if (r !== top) zero.run(r.character_id, r.imbuement_id);
      set.run(g.reduce((n, r) => n + r.seconds_left, 0), top.character_id, top.imbuement_id);
    }
    db.exec('COMMIT');
  }
  if (!accountCols.includes('kids_potion')) db.exec(`ALTER TABLE accounts ADD COLUMN kids_potion INTEGER NOT NULL DEFAULT 0`);
  if (!accountCols.includes('halloween_potion')) db.exec(`ALTER TABLE accounts ADD COLUMN halloween_potion INTEGER NOT NULL DEFAULT 0`);
  db.exec(`CREATE TABLE IF NOT EXISTS halloween_trick_or_treat (
    character_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (character_id, day)
  )`);
  const selectXpBoost = db.prepare(`SELECT xp_boost_until FROM characters WHERE id = ?`);
  const updateXpBoost = db.prepare(`UPDATE characters SET xp_boost_until = ? WHERE id = ?`);
  const selectQueue = db.prepare(`SELECT queue, until FROM activity_queue WHERE character_id = ?`);
  const upsertQueue = db.prepare(
    `INSERT INTO activity_queue (character_id, queue, until) VALUES (?, ?, ?) ON CONFLICT (character_id) DO UPDATE SET queue = excluded.queue, until = excluded.until`,
  );
  const selectKidsPotion = db.prepare(`SELECT kids_potion FROM accounts WHERE id = ?`);
  const updateKidsPotion = db.prepare(`UPDATE accounts SET kids_potion = 1 WHERE id = ?`);
  const selectHalloweenPotion = db.prepare(`SELECT halloween_potion FROM accounts WHERE id = ?`);
  const updateHalloweenPotion = db.prepare(`UPDATE accounts SET halloween_potion = ? WHERE id = ?`);
  const selectTrickOrTreat = db.prepare(`SELECT 1 FROM halloween_trick_or_treat WHERE character_id = ? AND day = ?`);
  const insertTrickOrTreat = db.prepare(`INSERT INTO halloween_trick_or_treat (character_id, day, created_at) VALUES (?, ?, ?)`);

  const storyCols = (db.prepare(`PRAGMA table_info(stories)`).all() as { name: string }[]).map((c) => c.name);
  if (!storyCols.includes('history')) db.exec(`ALTER TABLE stories ADD COLUMN history TEXT NOT NULL DEFAULT '[]'`);

  // Migração: prey ganha segundos restantes de combate (padrão 2h = 7200s).
  const preyCols = (db.prepare(`PRAGMA table_info(prey)`).all() as { name: string }[]).map((c) => c.name);
  if (!preyCols.includes('seconds_left')) db.exec(`ALTER TABLE prey ADD COLUMN seconds_left INTEGER NOT NULL DEFAULT 7200`);
  // Lista de 9 espécies sorteada esperando a escolha (JSON).
  if (!preyCols.includes('options')) db.exec(`ALTER TABLE prey ADD COLUMN options TEXT`);
  const selectStories = db.prepare(`SELECT story, step, progress, status, ending, history FROM stories WHERE character_id = ? ORDER BY rowid`);
  const updateStoryHistory = db.prepare(`UPDATE stories SET history = ? WHERE character_id = ? AND story = ?`);
  const upsertStoryStep = db.prepare(
    `INSERT INTO stories (character_id, story, step) VALUES (?, ?, ?)
     ON CONFLICT (character_id, story) DO UPDATE SET step = excluded.step, progress = 0`,
  );
  const addStoryProgress = db.prepare(`UPDATE stories SET progress = progress + ? WHERE character_id = ? AND story = ? AND status = 'active'`);
  const finishStory = db.prepare(`UPDATE stories SET status = 'done', ending = ? WHERE character_id = ? AND story = ? AND status = 'active'`);
  const selectQuests = db.prepare(`SELECT quest, progress, status FROM quests WHERE character_id = ? ORDER BY rowid`);
  const insertQuest = db.prepare(`INSERT OR IGNORE INTO quests (character_id, quest) VALUES (?, ?)`);
  const addQuestProgress = db.prepare(`UPDATE quests SET progress = progress + ? WHERE character_id = ? AND quest = ? AND status = 'active'`);
  const claimQuest = db.prepare(`UPDATE quests SET status = 'claimed' WHERE character_id = ? AND quest = ? AND status = 'active'`);

  const selectDailies = db.prepare(`SELECT idx, progress, claimed FROM dailies WHERE character_id = ? AND day = ? ORDER BY idx`);
  const insertDaily = db.prepare(`INSERT OR IGNORE INTO dailies (character_id, day, idx) VALUES (?, ?, ?)`);
  const addDaily = db.prepare(`UPDATE dailies SET progress = progress + ? WHERE character_id = ? AND day = ? AND idx = ? AND claimed = 0`);
  const claimDaily = db.prepare(`UPDATE dailies SET claimed = 1 WHERE character_id = ? AND day = ? AND idx = ? AND claimed = 0`);
  const selectStats = db.prepare(`SELECT key, value FROM stats WHERE character_id = ?`);
  const setStat = db.prepare(
    `INSERT INTO stats (character_id, key, value) VALUES (?, ?, ?) ON CONFLICT (character_id, key) DO UPDATE SET value = excluded.value`,
  );
  const addStat = db.prepare(
    `INSERT INTO stats (character_id, key, value) VALUES (?, ?, ?) ON CONFLICT (character_id, key) DO UPDATE SET value = value + excluded.value`,
  );

  // Primeiros passos: marca o resgate uma vez só (o contador nasce com 1 e nunca muda).
  const claimFirstStep = db.prepare(`INSERT INTO stats (character_id, key, value) VALUES (?, ?, 1) ON CONFLICT (character_id, key) DO NOTHING`);

  const selectImbuements = db.prepare(`SELECT imbuement_id, seconds_left FROM imbuements WHERE character_id = ?`);
  const upsertImbuement = db.prepare(`
    INSERT INTO imbuements (character_id, imbuement_id, seconds_left)
    VALUES (?, ?, ?)
    ON CONFLICT (character_id, imbuement_id) DO UPDATE SET seconds_left = excluded.seconds_left
  `);
  const updateImbuementSeconds = db.prepare(`UPDATE imbuements SET seconds_left = MAX(0, seconds_left - ?) WHERE character_id = ?`);
  const deleteExpiredImbuements = db.prepare(`DELETE FROM imbuements WHERE character_id = ? AND seconds_left <= 0`);

  const selectHuntingTasks = db.prepare(`SELECT task_id, progress, status FROM hunting_tasks WHERE character_id = ? ORDER BY rowid`);
  const insertHuntingTask = db.prepare(`
    INSERT INTO hunting_tasks (character_id, task_id, progress, status)
    VALUES (?, ?, 0, 'active')
    ON CONFLICT (character_id, task_id) DO UPDATE SET progress = 0, status = 'active'
  `);
  const addHuntingTaskProgress = db.prepare(`
    UPDATE hunting_tasks SET progress = progress + ? WHERE character_id = ? AND task_id = ? AND status = 'active'
  `);
  const setHuntingTaskStatus = db.prepare(`
    UPDATE hunting_tasks SET status = ? WHERE character_id = ? AND task_id = ?
  `);
  const deleteHuntingTask = db.prepare(`
    DELETE FROM hunting_tasks WHERE character_id = ? AND task_id = ?
  `);

  const selectArenas = db.prepare(`SELECT arena_id, status, current_wave, reward_chosen, completed_at FROM arenas WHERE character_id = ?`);
  const upsertArenaStatus = db.prepare(`
    INSERT INTO arenas (character_id, arena_id, status, current_wave)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (character_id, arena_id) DO UPDATE SET
      status = excluded.status,
      current_wave = excluded.current_wave
  `);
  const completeArenaStmt = db.prepare(`
    UPDATE arenas SET
      status = 'completed',
      reward_chosen = ?,
      completed_at = ?
    WHERE character_id = ? AND arena_id = ?
  `);

  // Mais de um personagem por conta: bancos antigos tinham UNIQUE em characters.account_id.
  // Recria a tabela sem ele (mesmas colunas, mesmos dados) uma vez só.
  const charactersSql = (db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'characters'`).get() as { sql: string }).sql;
  if (/account_id\s+INTEGER\s+NOT\s+NULL\s+UNIQUE/i.test(charactersSql)) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      db.exec(
        charactersSql
          .replace(/CREATE TABLE\s+(IF NOT EXISTS\s+)?"?characters"?/i, 'CREATE TABLE characters_new')
          .replace(/(account_id\s+INTEGER\s+NOT\s+NULL)\s+UNIQUE/i, '$1'),
      );
      db.exec('INSERT INTO characters_new SELECT * FROM characters');
      db.exec('DROP TABLE characters');
      db.exec('ALTER TABLE characters_new RENAME TO characters');
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }
  db.exec('CREATE INDEX IF NOT EXISTS characters_account ON characters (account_id)');
  migrateRaidSchema(db);

  // Cada sessão (navegador) lembra qual personagem está jogando.
  const sessionCols = (db.prepare(`PRAGMA table_info(sessions)`).all() as { name: string }[]).map((c) => c.name);
  if (!sessionCols.includes('character_id')) db.exec(`ALTER TABLE sessions ADD COLUMN character_id INTEGER`);
  const selectSessionCharacter = db.prepare(`SELECT account_id, character_id FROM sessions WHERE token = ?`);
  const updateSessionCharacter = db.prepare(`UPDATE sessions SET character_id = ? WHERE token = ?`);
  const selectCharactersOf = db.prepare(`SELECT * FROM characters WHERE account_id = ? ORDER BY id`);

  const insertAccount = db.prepare(`INSERT INTO accounts (kind) VALUES ('guest')`);
  const insertSession = db.prepare(`INSERT INTO sessions (token, account_id) VALUES (?, ?)`);
  const selectSession = db.prepare(`SELECT account_id FROM sessions WHERE token = ?`);
  const selectCharacter = db.prepare(`SELECT * FROM characters WHERE account_id = ?`);
  const selectCharacterById = db.prepare(`SELECT * FROM characters WHERE id = ?`);
  const selectCharacterByName = db.prepare(`SELECT * FROM characters WHERE name = ? COLLATE NOCASE`);
  const selectName = db.prepare(`SELECT 1 FROM characters WHERE name = ?`);
  const insertCharacter = db.prepare(
    `INSERT INTO characters (account_id, name, vocation, look) VALUES (?, ?, ?, ?) RETURNING *`,
  );

  // XP lida como decimal: o inteiro do SQLite passa do maior inteiro exato do JavaScript (~nível 255) e a leitura quebraria.
  const selectSkills = db.prepare(`SELECT skill, CAST(xp AS REAL) AS xp FROM skills WHERE character_id = ?`);
  const selectBank = db.prepare(`SELECT item, qty FROM bank WHERE character_id = ? ORDER BY item`);
  const selectActivity = db.prepare(`SELECT skill, node, since, seed, seq, mana, aura FROM activities WHERE character_id = ?`);
  // Atividade nova começa sem mana guardada (cheia).
  const upsertActivity = db.prepare(
    `INSERT INTO activities (character_id, skill, node, since, seed, seq, mana, aura) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
     ON CONFLICT (character_id) DO UPDATE SET
       skill = excluded.skill, node = excluded.node, since = excluded.since,
       seed = excluded.seed, seq = excluded.seq, mana = NULL, aura = NULL`,
  );
  const updateActivityMana = db.prepare(`UPDATE activities SET mana = ? WHERE character_id = ?`);
  const updateActivityAura = db.prepare(`UPDATE activities SET aura = ? WHERE character_id = ?`);
  const updateProgress = db.prepare(`UPDATE activities SET since = ?, seq = ? WHERE character_id = ?`);
  const deleteActivity = db.prepare(`DELETE FROM activities WHERE character_id = ?`);
  const addXp = db.prepare(
    `INSERT INTO skills (character_id, skill, xp) VALUES (?, ?, ?)
     ON CONFLICT (character_id, skill) DO UPDATE SET xp = xp + excluded.xp`,
  );
  const addItem = db.prepare(
    `INSERT INTO bank (character_id, item, qty) VALUES (?, ?, ?)
     ON CONFLICT (character_id, item) DO UPDATE SET qty = qty + excluded.qty`,
  );

  // Item que chega a zero sai do banco (a produção gasta materiais).
  const pruneBank = db.prepare(`DELETE FROM bank WHERE character_id = ? AND qty <= 0`);
  const selectEquipment = db.prepare(`SELECT slot, item FROM equipment WHERE character_id = ?`);
  const upsertEquipment = db.prepare(
    `INSERT INTO equipment (character_id, slot, item) VALUES (?, ?, ?)
     ON CONFLICT (character_id, slot) DO UPDATE SET item = excluded.item`,
  );
  const removeEquipment = db.prepare(`DELETE FROM equipment WHERE character_id = ? AND slot = ?`);

  const selectListings = db.prepare(
    `SELECT l.id, l.seller_id, c.name AS seller, l.item, l.qty, l.price, l.created_at
     FROM listings l JOIN characters c ON c.id = l.seller_id
     ORDER BY l.item, l.price, l.created_at LIMIT 500`,
  );
  const selectListing = db.prepare(`SELECT * FROM listings WHERE id = ?`);
  const insertListing = db.prepare(
    `INSERT INTO listings (seller_id, item, qty, price, created_at) VALUES (?, ?, ?, ?, ?)`,
  );
  const reduceListing = db.prepare(`UPDATE listings SET qty = qty - ? WHERE id = ?`);
  const selectOffers = db.prepare(
    `SELECT o.id, o.buyer_id, c.name AS buyer, o.item, o.qty, o.price, o.created_at
     FROM buy_offers o JOIN characters c ON c.id = o.buyer_id
     ORDER BY o.item, o.price DESC, o.created_at LIMIT 500`,
  );
  const selectOffer = db.prepare(`SELECT * FROM buy_offers WHERE id = ?`);
  const insertOffer = db.prepare(`INSERT INTO buy_offers (buyer_id, item, qty, price, created_at) VALUES (?, ?, ?, ?, ?)`);
  const reduceOffer = db.prepare(`UPDATE buy_offers SET qty = qty - ? WHERE id = ?`);
  const removeOffer = db.prepare(`DELETE FROM buy_offers WHERE id = ?`);
  const deleteListing = db.prepare(`DELETE FROM listings WHERE id = ?`);
  const selectAccountOf = db.prepare(`SELECT account_id FROM characters WHERE id = ?`);
  const selectQty = db.prepare(`SELECT qty FROM bank WHERE character_id = ? AND item = ?`);

  const insertChat = db.prepare(`INSERT INTO chat (character_id, text, at) VALUES (?, ?, ?) RETURNING id`);
  const selectChat = db.prepare(
    `SELECT m.id, c.name, c.vocation, c.title, m.text, m.at, (c.id = 0) as system FROM chat m JOIN characters c ON c.id = m.character_id
     ORDER BY m.id DESC LIMIT ?`,
  );

  const selectRanking = db.prepare(
    `SELECT c.id, c.name, c.vocation, c.promotion, CAST(s.xp AS REAL) AS xp FROM skills s JOIN characters c ON c.id = s.character_id
     WHERE s.skill = ? AND s.xp > 0 ORDER BY s.xp DESC, c.id LIMIT ?`,
  );

  const insertParty = db.prepare(`INSERT INTO parties (leader_id, created_at) VALUES (?, ?) RETURNING id`);
  const insertPartyMember = db.prepare(`INSERT OR REPLACE INTO party_members (party_id, character_id, joined_at) VALUES (?, ?, ?)`);
  const deletePartyMember = db.prepare(`DELETE FROM party_members WHERE character_id = ?`);
  const deleteParty = db.prepare(`DELETE FROM parties WHERE id = ?`);
  const updatePartyLeader = db.prepare(`UPDATE parties SET leader_id = ? WHERE id = ?`);
  const selectPartyOf = db.prepare(`SELECT party_id FROM party_members WHERE character_id = ?`);
  const selectParty = db.prepare(`SELECT id, leader_id FROM parties WHERE id = ?`);
  const selectPartyMembers = db.prepare(`SELECT character_id FROM party_members WHERE party_id = ? ORDER BY joined_at ASC`);

  function transaction<T>(fn: () => T): T {
    db.exec('BEGIN');
    try {
      const out = fn();
      db.exec('COMMIT');
      return out;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  // Primeiros 99 já anunciados antes da tabela first99 (pelo texto no chat): não anunciar de novo.
  for (const sk of SKILLS) {
    if (db.prepare(`SELECT 1 FROM chat WHERE text LIKE ?`).get(`%primeiro do servidor a alcançar o nível 99 em ${sk.name}!%`)) {
      db.prepare(`INSERT OR IGNORE INTO first99 (skill, character_id, at) VALUES (?, NULL, 0)`).run(sk.id);
    }
  }

  return {
    /** Cria uma conta de convidado e devolve o token da sessão. */
    createGuest(): string {
      const { lastInsertRowid } = insertAccount.run();
      const token = randomBytes(32).toString('hex');
      insertSession.run(token, Number(lastInsertRowid));
      return token;
    },

    /** Abre uma sessão nova para a conta e devolve o token. */
    createSession(accountId: number): string {
      const token = randomBytes(32).toString('base64url');
      insertSession.run(token, accountId);
      return token;
    },

    deleteSession(token: string) {
      deleteSession.run(token);
    },

    usernameOf(accountId: number): string | null {
      return (selectAccount.get(accountId) as { username: string | null } | undefined)?.username ?? null;
    },

    accountByUsername(username: string): { id: number; passHash: string } | null {
      const row = selectByUsername.get(username) as { id: number; pass_hash: string } | undefined;
      return row ? { id: row.id, passHash: row.pass_hash } : null;
    },

    emailOf(accountId: number): string | null {
      return (db.prepare(`SELECT email FROM accounts WHERE id = ?`).get(accountId) as { email: string | null } | undefined)?.email ?? null;
    },

    /** Grava o email (null apaga). Falso se outra conta já usa esse email. */
    setEmail(accountId: number, email: string | null): boolean {
      if (email) {
        const other = db.prepare(`SELECT id FROM accounts WHERE email = ? COLLATE NOCASE AND id != ?`).get(email, accountId);
        if (other) return false;
      }
      // Email novo volta a ser não confirmado (o mesmo de antes continua como estava).
      db.prepare(`UPDATE accounts SET email_verified = CASE WHEN email = ? COLLATE NOCASE THEN email_verified ELSE 0 END, email = ? WHERE id = ?`).run(email, email, accountId);
      return true;
    },

    emailVerified(accountId: number): boolean {
      return !!(db.prepare(`SELECT email_verified AS v FROM accounts WHERE id = ?`).get(accountId) as { v: number } | undefined)?.v;
    },

    /** Conta com esse email já confirmado (para recuperar). */
    accountByVerifiedEmail(email: string): number | null {
      const r = db.prepare(`SELECT id FROM accounts WHERE email = ? COLLATE NOCASE AND email_verified = 1`).get(email) as { id: number } | undefined;
      return r?.id ?? null;
    },

    /** Guarda um link de email (só o hash); some com os vencidos e com o anterior do mesmo tipo. */
    addEmailToken(hash: string, accountId: number, kind: 'verify' | 'reset', email: string, expiresAt: number, now: number) {
      db.prepare(`DELETE FROM email_tokens WHERE expires_at < ? OR (account_id = ? AND kind = ?)`).run(now, accountId, kind);
      db.prepare(`INSERT INTO email_tokens (hash, account_id, kind, email, expires_at) VALUES (?, ?, ?, ?, ?)`).run(hash, accountId, kind, email, expiresAt);
    },

    /** Olha um link sem usar: a conta e o email, ou null se não vale. */
    peekEmailToken(hash: string, kind: 'verify' | 'reset', now: number): { accountId: number; email: string } | null {
      const r = db.prepare(`SELECT account_id, email FROM email_tokens WHERE hash = ? AND kind = ? AND expires_at >= ?`).get(hash, kind, now) as
        | { account_id: number; email: string }
        | undefined;
      return r ? { accountId: r.account_id, email: r.email } : null;
    },

    /** Usa um link: devolve a conta e o email (o link deixa de valer), ou null se não vale. */
    takeEmailToken(hash: string, kind: 'verify' | 'reset', now: number): { accountId: number; email: string } | null {
      const r = db.prepare(`SELECT account_id, email, expires_at FROM email_tokens WHERE hash = ? AND kind = ?`).get(hash, kind) as
        | { account_id: number; email: string; expires_at: number }
        | undefined;
      if (!r) return null;
      db.prepare(`DELETE FROM email_tokens WHERE hash = ?`).run(hash);
      return r.expires_at >= now ? { accountId: r.account_id, email: r.email } : null;
    },

    /** Marca o email como confirmado, se ainda é o da conta. */
    confirmEmail(accountId: number, email: string): boolean {
      return db.prepare(`UPDATE accounts SET email_verified = 1 WHERE id = ? AND email = ? COLLATE NOCASE`).run(accountId, email).changes > 0;
    },

    /** Login novo pela recuperação: troca a senha (cria o usuário se era convidado) e derruba as sessões abertas. */
    resetCredentials(accountId: number, username: string, passHash: string) {
      db.prepare(`UPDATE accounts SET username = ?, pass_hash = ?, kind = 'user' WHERE id = ?`).run(username, passHash, accountId);
      db.prepare(`DELETE FROM sessions WHERE account_id = ?`).run(accountId);
    },

    bioOf(characterId: number): string {
      return (db.prepare(`SELECT bio FROM characters WHERE id = ?`).get(characterId) as { bio: string } | undefined)?.bio ?? '';
    },

    setBio(characterId: number, bio: string) {
      db.prepare(`UPDATE characters SET bio = ? WHERE id = ?`).run(bio, characterId);
    },

    setCredentials(accountId: number, username: string, passHash: string) {
      updateCredentials.run(username, passHash, accountId);
    },

    accountForToken(token: string): number | null {
      const row = selectSession.get(token) as { account_id: number } | undefined;
      return row ? row.account_id : null;
    },

    /** Personagens da conta, na ordem de criação. */
    charactersOf(accountId: number): Character[] {
      return (selectCharactersOf.all(accountId) as unknown as CharacterRow[]).map(toCharacter);
    },

    /** O personagem escolhido nesta sessão (ou o primeiro da conta, se ainda não escolheu). */
    sessionCharacter(token: string): Character | null {
      const row = selectSessionCharacter.get(token) as { account_id: number; character_id: number | null } | undefined;
      if (!row) return null;
      const list = this.charactersOf(row.account_id);
      return list.find((c) => c.id === row.character_id) ?? list[0] ?? null;
    },

    /** Escolhe o personagem da sessão (só um da própria conta). */
    selectCharacter(token: string, characterId: number): boolean {
      const row = selectSessionCharacter.get(token) as { account_id: number } | undefined;
      if (!row || !this.charactersOf(row.account_id).some((c) => c.id === characterId)) return false;
      updateSessionCharacter.run(characterId, token);
      return true;
    },

    characterFor(accountId: number): Character | null {
      const row = selectCharacter.get(accountId) as CharacterRow | undefined;
      return row ? toCharacter(row) : null;
    },

    characterById(id: number): Character | null {
      const row = selectCharacterById.get(id) as CharacterRow | undefined;
      return row ? toCharacter(row) : null;
    },

    characterByName(name: string): Character | null {
      const row = selectCharacterByName.get(name) as CharacterRow | undefined;
      return row ? toCharacter(row) : null;
    },

    blessedFor(characterId: number): boolean {
      return (selectBlessed.get(characterId) as { blessed: number } | undefined)?.blessed === 1;
    },

    setBlessed(characterId: number, blessed: boolean) {
      updateBlessed.run(blessed ? 1 : 0, characterId);
    },

    /** Some com a peça equipada (perdida na morte). */
    loseEquipment(characterId: number, slot: EquipSlot) {
      removeEquipment.run(characterId, slot);
    },

    potionFor(characterId: number): string | null {
      return (selectPotion.get(characterId) as { potion: string | null } | undefined)?.potion ?? null;
    },
    manaPotionFor(characterId: number): string | null {
      return (selectManaPotion.get(characterId) as { mana_potion: string | null } | undefined)?.mana_potion ?? null;
    },
    setManaPotion(characterId: number, manaPotion: string | null) {
      updateManaPotion.run(manaPotion, characterId);
    },

    arrowFor(characterId: number): string | null {
      return (selectArrow.get(characterId) as { arrow: string | null } | undefined)?.arrow ?? null;
    },
    setArrow(characterId: number, arrow: string | null) {
      updateArrow.run(arrow, characterId);
    },

    /** Runas escolhidas para a caçada: [ataque, cura]. */
    runesFor(characterId: number): [string | null, string | null] {
      const r = selectRunes.get(characterId) as { rune_attack: string | null; rune_heal: string | null } | undefined;
      return [r?.rune_attack ?? null, r?.rune_heal ?? null];
    },
    setRune(characterId: number, slot: 'attack' | 'heal', rune: string | null) {
      (slot === 'attack' ? updateRuneAttack : updateRuneHeal).run(rune, characterId);
    },
    setPotion(characterId: number, potion: string | null) {
      updatePotion.run(potion, characterId);
    },

    foodFor(characterId: number): string | null {
      return (selectFood.get(characterId) as { food: string | null } | undefined)?.food ?? null;
    },

    /** Sigilos nos espaços (Sigilismo): sempre MAX_SIGILS posições, null = vazio. */
    sigilsFor(characterId: number): (string | null)[] {
      const raw = (selectSigils.get(characterId) as { sigils: string | null } | undefined)?.sigils;
      let list: unknown = [];
      try {
        list = JSON.parse(raw ?? '[]');
      } catch {
        /* json inválido: espaços vazios */
      }
      const arr = Array.isArray(list) ? list : [];
      return Array.from({ length: MAX_SIGILS }, (_, i) => (typeof arr[i] === 'string' ? (arr[i] as string) : null));
    },

    /**
     * Põe (ou tira, com null) um sigilo no espaço: o sigilo sai do depósito e o que
     * estava ali volta para ele. Tudo numa transação.
     */
    placeSigil(characterId: number, slot: number, item: string | null): string | null {
      return transaction(() => {
        const sigils = this.sigilsFor(characterId);
        if (item) {
          const have = (selectQty.get(characterId, item) as { qty: number } | undefined)?.qty ?? 0;
          if (have < 1) return 'Você não tem esse sigilo no depósito.';
          addItem.run(characterId, item, -1);
        }
        const old = sigils[slot];
        if (old) addItem.run(characterId, old, 1);
        sigils[slot] = item;
        updateSigils.run(JSON.stringify(sigils), characterId);
        pruneBank.run(characterId);
        return null;
      });
    },

    mealFor(characterId: number): { item: string; until: number; auto?: boolean } | null {
      const raw = (selectMeal.get(characterId) as { meal: string | null } | undefined)?.meal;
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.item === 'string' && typeof parsed.until === 'number') {
          return parsed.auto ? { item: parsed.item, until: parsed.until, auto: true } : { item: parsed.item, until: parsed.until };
        }
      } catch {
        /* json inválido */
      }
      return null;
    },

    setMeal(characterId: number, meal: { item: string; until: number; auto?: boolean } | null) {
      updateMeal.run(meal ? JSON.stringify(meal) : null, characterId);
    },

    /** Quests do personagem; quem ainda não tem nenhuma ganha as primeiras de cada mestre. */
    storiesFor(characterId: number): StoryState[] {
      return (
        selectStories.all(characterId) as { story: string; step: number; progress: number; status: 'active' | 'done'; ending: string | null; history: string }[]
      ).map((r) => ({
        id: r.story,
        step: r.step,
        progress: r.progress,
        status: r.status,
        history: JSON.parse(r.history || '[]') as number[],
        ...(r.ending ? { ending: r.ending } : {}),
      }));
    },

    /** Grava os passos já cumpridos da história. */
    setStoryHistory(characterId: number, story: string, history: number[]) {
      updateStoryHistory.run(JSON.stringify(history), characterId, story);
    },

    /** Vai para o passo (começa a história se ainda não começou); zera o progresso. */
    setStoryStep(characterId: number, story: string, step: number) {
      upsertStoryStep.run(characterId, story, step);
    },

    addStoryProgress(characterId: number, story: string, amount: number) {
      addStoryProgress.run(amount, characterId, story);
    },

    finishStory(characterId: number, story: string, ending: string): boolean {
      return Number(finishStory.run(ending, characterId, story).changes) > 0;
    },

    questsFor(characterId: number): QuestState[] {
      let rows = selectQuests.all(characterId) as { quest: string; progress: number; status: QuestState['status'] }[];
      if (rows.length === 0) {
        for (const q of FIRST_QUESTS) insertQuest.run(characterId, q);
        rows = selectQuests.all(characterId) as typeof rows;
      }
      return rows.map((r) => ({ id: r.quest, progress: r.progress, status: r.status }));
    },

    addQuestProgress(characterId: number, quest: string, amount: number) {
      addQuestProgress.run(amount, characterId, quest);
    },

    /** Marca como entregue e libera a próxima (se houver). Devolve false se não estava ativa. */
    claimQuest(characterId: number, quest: string, next: string | undefined): boolean {
      db.exec('BEGIN');
      try {
        const changed = Number(claimQuest.run(characterId, quest).changes) > 0;
        if (changed && next) insertQuest.run(characterId, next);
        db.exec('COMMIT');
        return changed;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    /** Magias escolhidas, ou null se nunca escolheu (usa as padrão da vocação). */
    spellsFor(characterId: number): string[] | null {
      const raw = (selectSpells.get(characterId) as { spells: string | null } | undefined)?.spells;
      try {
        const v = JSON.parse(raw ?? 'null');
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
      } catch {
        return null;
      }
    },

    /** Condições da barra de ação, ou null se nunca configurou (o jogo escolhe sozinho). */
    combatRulesFor(characterId: number): CombatRules | null {
      const raw = (selectCombatRules.get(characterId) as { combat_rules: string | null } | undefined)?.combat_rules;
      try {
        return validCombatRules(JSON.parse(raw ?? 'null'));
      } catch {
        return null;
      }
    },
    setCombatRules(characterId: number, rules: CombatRules) {
      updateCombatRules.run(JSON.stringify(rules), characterId);
    },

    setSpells(characterId: number, spells: string[]) {
      updateSpells.run(JSON.stringify(spells), characterId);
    },

    /** Progresso das diárias do dia (cria as linhas na primeira vez). */
    dailiesFor(characterId: number, day: string, count: number): { idx: number; progress: number; claimed: boolean }[] {
      for (let i = 0; i < count; i++) insertDaily.run(characterId, day, i);
      return (selectDailies.all(characterId, day) as { idx: number; progress: number; claimed: number }[]).map((r) => ({
        idx: r.idx,
        progress: r.progress,
        claimed: r.claimed === 1,
      }));
    },

    /** Linhas de tarefas com índices escolhidos (diárias e semanais de fim de jogo: `key` é o dia ou a semana). */
    dailyRows(characterId: number, key: string, idxs: number[]): { idx: number; progress: number; claimed: boolean }[] {
      for (const i of idxs) insertDaily.run(characterId, key, i);
      return (selectDailies.all(characterId, key) as { idx: number; progress: number; claimed: number }[])
        .filter((r) => idxs.includes(r.idx))
        .map((r) => ({ idx: r.idx, progress: r.progress, claimed: r.claimed === 1 }));
    },

    addDailyProgress(characterId: number, day: string, idx: number, amount: number) {
      addDaily.run(amount, characterId, day, idx);
    },

    claimDaily(characterId: number, day: string, idx: number): boolean {
      return Number(claimDaily.run(characterId, day, idx).changes) > 0;
    },

    /** Capas que o personagem já recebeu (não volta a ganhar a mesma depois de evoluir, refinar ou vender). */
    capesGranted(characterId: number): Set<string> {
      return new Set((selectStats.all(characterId) as { key: string }[]).filter((r) => r.key.startsWith('gcape_')).map((r) => r.key.slice(6)));
    },
    markCapeGranted(characterId: number, capeId: string) {
      setStat.run(characterId, `gcape_${capeId}`, 1);
    },

    statsFor(characterId: number): Partial<Record<StatKey, number>> {
      return Object.fromEntries((selectStats.all(characterId) as { key: StatKey; value: number }[]).filter((r) => !r.key.startsWith('forge_') && !r.key.startsWith('gcape_') && !r.key.startsWith('xpbuy_')).map((r) => [r.key, r.value]));
    },

    /** Loja de Tarefas: XP em dobro comprados no dia `day` (o preço sobe a cada um). */
    taskXpBoostsOn(characterId: number, day: string): number {
      return (selectStats.all(characterId) as { key: string; value: number }[]).find((r) => r.key === `xpbuy_${day}`)?.value ?? 0;
    },
    addTaskXpBoost(characterId: number, day: string) {
      setStat.run(characterId, `xpbuy_${day}`, this.taskXpBoostsOn(characterId, day) + 1);
    },

    /** Forja: falhas seguidas em cada passo ('pity' = Ascensão, por raridade; 'rpity' = refino, por +K). */
    forgePityFor(characterId: number, kind: 'pity' | 'rpity' = 'pity'): number[] {
      const out = new Array(10).fill(0) as number[];
      for (const r of selectStats.all(characterId) as { key: string; value: number }[]) {
        const m = /^forge_(r?pity)_(\d)$/.exec(r.key);
        if (m && m[1] === kind) out[Number(m[2])] = r.value;
      }
      return out;
    },

    setForgePity(characterId: number, step: number, fails: number, kind: 'pity' | 'rpity' = 'pity') {
      setStat.run(characterId, `forge_${kind}_${step}`, fails);
    },

    /** Marca o resgate de uma meta dos Primeiros passos; false se já tinha sido resgatada. */
    claimFirstStep(characterId: number, key: string): boolean {
      return Number(claimFirstStep.run(characterId, key).changes) > 0;
    },

    /** XP de todos os outros personagens numa skill (para saber quem é o primeiro a chegar num nível). */
    /** Marca o primeiro 99 da profissão; true só para quem marcou agora (anunciar uma vez). */
    claimFirst99(skill: string, characterId: number, at = Date.now()): boolean {
      return db.prepare(`INSERT OR IGNORE INTO first99 (skill, character_id, at) VALUES (?, ?, ?)`).run(skill, characterId, at).changes > 0;
    },
    first99Done(skill: string): boolean {
      return !!db.prepare(`SELECT 1 FROM first99 WHERE skill = ?`).get(skill);
    },
    /** Quem tem mais XP na skill (para o aviso do primeiro 99 que veio por fora da profissão rodando). */
    topSkillHolder(skill: string): { characterId: number; name: string; xp: number } | undefined {
      return db.prepare(`SELECT s.character_id AS characterId, c.name AS name, CAST(s.xp AS REAL) AS xp FROM skills s JOIN characters c ON c.id = s.character_id WHERE s.skill = ? ORDER BY s.xp DESC LIMIT 1`).get(skill) as never;
    },

    skillXpsOfOthers(skill: string, characterId: number): number[] {
      return (db.prepare(`SELECT CAST(xp AS REAL) AS xp FROM skills WHERE skill = ? AND character_id != ?`).all(skill, characterId) as { xp: number }[]).map((r) => r.xp);
    },

    addStat(characterId: number, key: StatKey, amount: number) {
      if (amount > 0) addStat.run(characterId, key, amount);
    },

    setLook(characterId: number, look: Look) {
      updateLook.run(JSON.stringify(look), characterId);
    },

    /** Instâncias vencidas: o último dia (AAAA-MM-DD) e quantas vezes ao todo. */
    instanceClearsFor(characterId: number): Record<string, { day: string; total: number }> {
      const rows = db.prepare(`SELECT instance, day, total FROM instance_clears WHERE character_id = ?`).all(characterId) as { instance: string; day: string; total: number }[];
      return Object.fromEntries(rows.map((r) => [r.instance, { day: r.day, total: r.total }]));
    },
    /** Encomendas da Guilda em andamento (uma por profissão). */
    guildTasksFor(characterId: number): { id: string; skill: string; progress: number }[] {
      return db.prepare(`SELECT task_id AS id, skill, progress FROM guild_tasks WHERE character_id = ?`).all(characterId) as { id: string; skill: string; progress: number }[];
    },
    startGuildTask(characterId: number, skill: string, taskId: string) {
      db.prepare(`INSERT INTO guild_tasks (character_id, skill, task_id, progress) VALUES (?, ?, ?, 0)`).run(characterId, skill, taskId);
    },
    addGuildProgress(characterId: number, skill: string, n: number) {
      db.prepare(`UPDATE guild_tasks SET progress = progress + ? WHERE character_id = ? AND skill = ?`).run(n, characterId, skill);
    },
    endGuildTask(characterId: number, skill: string) {
      db.prepare(`DELETE FROM guild_tasks WHERE character_id = ? AND skill = ?`).run(characterId, skill);
    },
    /** Guarda um resultado do chefe global e mantém só os BOSS_HISTORY_MAX mais novos. */
    addBossResult(characterId: number, at: number, data: object) {
      db.prepare(`INSERT INTO boss_results (character_id, at, data) VALUES (?, ?, ?)`).run(characterId, at, JSON.stringify(data));
      db.prepare(
        `DELETE FROM boss_results WHERE character_id = ? AND id NOT IN (SELECT id FROM boss_results WHERE character_id = ? ORDER BY id DESC LIMIT ${BOSS_HISTORY_MAX})`,
      ).run(characterId, characterId);
    },
    /** Últimos resultados do chefe global, o mais novo primeiro. */
    bossResultsFor(characterId: number): BossHistoryEntry[] {
      const rows = db.prepare(`SELECT at, data FROM boss_results WHERE character_id = ? ORDER BY id DESC`).all(characterId) as { at: number; data: string }[];
      return rows.map((r) => ({ at: r.at, ...JSON.parse(r.data) }));
    },
    /** Conta mais uma entrada do dia na instância (zera num dia novo) e guarda a semente dela. */
    addInstanceTry(characterId: number, instance: string, day: string, seed: number) {
      db.prepare(
        `INSERT INTO instance_tries (character_id, instance, day, tries, seed) VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(character_id, instance) DO UPDATE SET tries = CASE WHEN day = excluded.day THEN tries + 1 ELSE 1 END, day = excluded.day, seed = excluded.seed`,
      ).run(characterId, instance, day, seed);
    },
    /** Entradas do dia em cada instância: o dia, quantas e a semente da última. */
    instanceTriesFor(characterId: number): Record<string, { day: string; tries: number; seed: number }> {
      const rows = db.prepare(`SELECT instance, day, tries, seed FROM instance_tries WHERE character_id = ?`).all(characterId) as { instance: string; day: string; tries: number; seed: number }[];
      return Object.fromEntries(rows.map((r) => [r.instance, { day: r.day, tries: r.tries, seed: r.seed }]));
    },
    /** Tentativa grátis do dia em cada instância: o dia em que foi usada e a semente da entrada que a gastou. */
    instanceFreeFor(characterId: number): Record<string, { day: string; seed: number }> {
      const rows = db.prepare(`SELECT instance, day, seed FROM instance_free WHERE character_id = ?`).all(characterId) as { instance: string; day: string; seed: number }[];
      return Object.fromEntries(rows.map((r) => [r.instance, { day: r.day, seed: r.seed }]));
    },
    useInstanceFree(characterId: number, instance: string, day: string, seed: number) {
      db.prepare(
        `INSERT INTO instance_free (character_id, instance, day, seed) VALUES (?, ?, ?, ?)
         ON CONFLICT(character_id, instance) DO UPDATE SET day = excluded.day, seed = excluded.seed`,
      ).run(characterId, instance, day, seed);
    },
    /** Covis em cooldown: até quando (ms) cada um. */
    /** Guarda as peças de uma morte com o Ceifador (só os `max` pacotes mais novos ficam). */
    addReaperPack(characterId: number, items: string[], price: number, diedAt: number, expiresAt: number, max: number) {
      if (!items.length) return;
      db.prepare(`INSERT INTO reaper_items (character_id, items, price, died_at, expires_at) VALUES (?, ?, ?, ?, ?)`).run(characterId, JSON.stringify(items), price, diedAt, expiresAt);
      db.prepare(`DELETE FROM reaper_items WHERE character_id = ? AND id NOT IN (SELECT id FROM reaper_items WHERE character_id = ? ORDER BY id DESC LIMIT ?)`).run(characterId, characterId, max);
    },
    /** Pacotes do Ceifador ainda no prazo (os vencidos são apagados aqui). */
    reaperPacksFor(characterId: number, now: number): { id: number; items: string[]; price: number; diedAt: number; expiresAt: number }[] {
      db.prepare(`DELETE FROM reaper_items WHERE character_id = ? AND expires_at <= ?`).run(characterId, now);
      const rows = db.prepare(`SELECT id, items, price, died_at, expires_at FROM reaper_items WHERE character_id = ? ORDER BY id`).all(characterId) as { id: number; items: string; price: number; died_at: number; expires_at: number }[];
      return rows.map((r) => ({ id: r.id, items: parseItems(r.items), price: r.price, diedAt: r.died_at, expiresAt: r.expires_at }));
    },
    /** Tira um pacote do Ceifador (uma vez só: quem chegar depois recebe null). */
    takeReaperPack(characterId: number, id: number, now: number): { items: string[]; price: number } | null {
      const row = db.prepare(`DELETE FROM reaper_items WHERE id = ? AND character_id = ? AND expires_at > ? RETURNING items, price`).get(id, characterId, now) as { items: string; price: number } | undefined;
      return row ? { items: parseItems(row.items), price: row.price } : null;
    },
    /** Conquistas feitas: id → quando (ms). */
    achievementsFor(characterId: number): Record<string, number> {
      const rows = db.prepare(`SELECT id, at FROM achievements WHERE character_id = ?`).all(characterId) as { id: string; at: number }[];
      return Object.fromEntries(rows.map((r) => [r.id, r.at]));
    },
    addAchievements(characterId: number, ids: string[], at: number) {
      const ins = db.prepare(`INSERT OR IGNORE INTO achievements (character_id, id, at) VALUES (?, ?, ?)`);
      transaction(() => {
        for (const id of ids) ins.run(characterId, id, at);
      });
    },
    titleFor(characterId: number): string | null {
      return (db.prepare(`SELECT title FROM characters WHERE id = ?`).get(characterId) as { title: string | null } | undefined)?.title ?? null;
    },
    setTitle(characterId: number, achievement: string | null) {
      db.prepare(`UPDATE characters SET title = ? WHERE id = ?`).run(achievement, characterId);
    },
    /** Ranking de conquistas: soma dos pontos (desempate por quem chegou antes). */
    achievementRanking(limit: number): RankingEntry[] {
      const rows = db.prepare(`SELECT character_id AS cid, id, at FROM achievements`).all() as { cid: number; id: string; at: number }[];
      const by = new Map<number, { points: number; last: number }>();
      for (const r of rows) {
        const e = by.get(r.cid) ?? { points: 0, last: 0 };
        e.points += achievementPoints([r.id]);
        e.last = Math.max(e.last, r.at);
        by.set(r.cid, e);
      }
      return [...by].filter(([cid]) => cid !== 0).sort((a, b) => b[1].points - a[1].points || a[1].last - b[1].last).slice(0, limit).flatMap(([cid, e]) => {
        const c = db.prepare(`SELECT name, vocation, promotion, title FROM characters WHERE id = ?`).get(cid) as (Pick<RankingEntry, 'name' | 'vocation' | 'promotion'> & { title: string | null }) | undefined;
        return c ? [{ name: c.name, vocation: c.vocation, promotion: c.promotion, title: c.title, xp: 0, achievementPoints: e.points }] : [];
      });
    },
    lairCooldownsFor(characterId: number): Record<string, number> {
      const rows = db.prepare(`SELECT lair, until FROM lair_cooldowns WHERE character_id = ?`).all(characterId) as { lair: string; until: number }[];
      return Object.fromEntries(rows.map((r) => [r.lair, r.until]));
    },
    setLairCooldown(characterId: number, lair: string, until: number) {
      db.prepare(
        `INSERT INTO lair_cooldowns (character_id, lair, until) VALUES (?, ?, ?)
         ON CONFLICT(character_id, lair) DO UPDATE SET until = excluded.until`,
      ).run(characterId, lair, until);
    },
    markInstanceClear(characterId: number, instance: string, day: string) {
      db.prepare(
        `INSERT INTO instance_clears (character_id, instance, day, total) VALUES (?, ?, ?, 1)
         ON CONFLICT(character_id, instance) DO UPDATE SET day = excluded.day, total = total + 1`,
      ).run(characterId, instance, day);
    },
    raidClearsFor(characterId: number, week: string, raidId = RAID_ID): number[] {
      const rows = db.prepare(`SELECT phase FROM raid_clears WHERE character_id = ? AND week = ? AND raid_id = ? ORDER BY phase`).all(characterId, week, raidId) as { phase: number }[];
      return rows.map((r) => r.phase);
    },
    /** Ranking da raide: os primeiros a vencer a fase final (phases.length) na semana (e se foi sozinho). */
    raidRanking(week: string, raidId: string, limit = 10): { name: string; at: number; solo: boolean }[] {
      const raid = raidById(raidId);
      const finalPhase = raid ? raid.phases.length : 3;
      return (db
        .prepare(`SELECT c.name AS name, r.created_at AS at, r.is_solo AS solo FROM raid_clears r JOIN characters c ON c.id = r.character_id WHERE r.week = ? AND r.raid_id = ? AND r.phase = ? ORDER BY r.created_at LIMIT ?`)
        .all(week, raidId, finalPhase, limit) as { name: string; at: number; solo: number }[]).map((r) => ({ name: r.name, at: Number(r.at), solo: !!r.solo }));
    },
    hasRaidPhaseClear(characterId: number, week: string, raidId: string, phase: number): boolean {
      return !!db.prepare(`SELECT 1 FROM raid_clears WHERE character_id = ? AND week = ? AND raid_id = ? AND phase = ?`).get(characterId, week, raidId, phase);
    },
    markRaidPhaseClear(characterId: number, week: string, raidId: string, phase: number, isSolo: boolean, gotPiece: boolean, now: number) {
      db.prepare(
        `INSERT INTO raid_clears (character_id, week, raid_id, phase, is_solo, got_piece, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(character_id, week, raid_id, phase) DO UPDATE SET is_solo = min(is_solo, excluded.is_solo), got_piece = max(got_piece, excluded.got_piece), created_at = min(created_at, excluded.created_at)`,
      ).run(characterId, week, raidId, phase, isSolo ? 1 : 0, gotPiece ? 1 : 0, now);
    },
    raidPityFor(characterId: number, raidId = RAID_ID): number {
      const row = db.prepare(`SELECT weeks_failed FROM raid_pity WHERE character_id = ? AND raid_id = ?`).get(characterId, raidId) as { weeks_failed: number } | undefined;
      return row?.weeks_failed ?? 0;
    },
    setRaidPity(characterId: number, raidId: string, weeks: number) {
      db.prepare(
        `INSERT INTO raid_pity (character_id, raid_id, weeks_failed) VALUES (?, ?, ?)
         ON CONFLICT(character_id, raid_id) DO UPDATE SET weeks_failed = excluded.weeks_failed`,
      ).run(characterId, raidId, Math.max(0, weeks));
    },
    raidShopChestCount(characterId: number, week: string): number {
      const row = db.prepare(`SELECT count FROM raid_shop_purchases WHERE character_id = ? AND week = ? AND item_id = 'raid_chest'`).get(characterId, week) as { count: number } | undefined;
      return row?.count ?? 0;
    },
    hasBoughtRaidSetPiece(characterId: number, itemId: string): boolean {
      return !!db.prepare(`SELECT 1 FROM raid_shop_purchases WHERE character_id = ? AND item_id = ?`).get(characterId, itemId);
    },
    recordRaidShopPurchase(characterId: number, week: string, itemId: string) {
      db.prepare(
        `INSERT INTO raid_shop_purchases (character_id, week, item_id, count) VALUES (?, ?, ?, 1)
         ON CONFLICT(character_id, week, item_id) DO UPDATE SET count = count + 1`,
      ).run(characterId, week, itemId);
    },

    /** Recompra: guarda uma venda ao Mercador e apaga as velhas (mais de `keepMs`) e as além de `max`. */
    addBuyback(characterId: number, item: string, qty: number, price: number, now: number, keepMs: number, max: number) {
      insertBuyback.run(characterId, item, qty, price, now);
      pruneBuyback.run(characterId, now - keepMs, characterId, max);
    },

    buybackFor(characterId: number, since: number): { id: number; item: string; qty: number; price: number; at: number }[] {
      return selectBuyback.all(characterId, since) as { id: number; item: string; qty: number; price: number; at: number }[];
    },

    /** Tira `qty` de uma venda guardada; false se não for do personagem ou não tiver tudo isso. */
    takeBuyback(characterId: number, id: number, qty: number): boolean {
      const ok = Number(takeBuyback.run(qty, id, characterId, qty).changes) > 0;
      if (ok) dropEmptyBuyback.run(id);
      return ok;
    },

    /** Itens que o jogador trancou (não vendem sem querer). */
    lockedItemsFor(characterId: number): string[] {
      const raw = (selectLockedItems.get(characterId) as { locked_items: string } | undefined)?.locked_items;
      try {
        const v = JSON.parse(raw ?? '[]');
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
      } catch {
        return [];
      }
    },
    setItemLocked(characterId: number, item: string, locked: boolean) {
      const cur = new Set(this.lockedItemsFor(characterId));
      if (locked) cur.add(item);
      else cur.delete(item);
      updateLockedItems.run(JSON.stringify([...cur].slice(0, 500)), characterId);
    },

    unlockedAddonsFor(characterId: number): LookAddon[] {
      const row = selectUnlockedAddons.get(characterId) as { unlocked_addons: string } | undefined;
      return parseUnlockedAddons(row?.unlocked_addons);
    },

    unlockAddon(characterId: number, addon: LookAddon): boolean {
      const current = this.unlockedAddonsFor(characterId);
      if (current.includes(addon)) return false;
      current.push(addon);
      updateUnlockedAddons.run(JSON.stringify(current), characterId);
      return true;
    },

    unlockedOutfitsFor(characterId: number): OutfitId[] {
      const ch = this.characterById(characterId);
      const row = selectUnlockedOutfits.get(characterId) as { unlocked_outfits: string } | undefined;
      return parseUnlockedOutfits(row?.unlocked_outfits, ch?.vocation);
    },

    unlockOutfit(characterId: number, outfit: OutfitId): boolean {
      const current = this.unlockedOutfitsFor(characterId);
      if (current.includes(outfit)) return false;
      current.push(outfit);
      updateUnlockedOutfits.run(JSON.stringify(current), characterId);
      return true;
    },

    petsFor(characterId: number): string[] {
      const row = selectUnlockedPets.get(characterId) as { unlocked_pets?: string } | undefined;
      return parseJsonList(row?.unlocked_pets);
    },

    /** Stamina guardada: o que sobrou (null = cheia) e até quando foi contada. */
    staminaFor(characterId: number): { ms: number | null; at: number } {
      const row = selectStamina.get(characterId) as { stamina_ms: number | null; stamina_at: number } | undefined;
      return { ms: row?.stamina_ms ?? null, at: row?.stamina_at ?? 0 };
    },

    /** Presente de evento já entregue? (marca no personagem do sistema, id 0). */
    giftGiven(id: string): boolean {
      return !!db.prepare(`SELECT 1 FROM stats WHERE character_id = 0 AND key = ?`).get(`gift:${id}`);
    },
    markGift(id: string, now: number) {
      db.prepare(`INSERT OR IGNORE INTO stats (character_id, key, value) VALUES (0, ?, ?)`).run(`gift:${id}`, Math.round(now));
    },

    /** Stamina cheia para todos os personagens (presente de evento). */
    refillAllStamina(ms: number, now: number): number {
      return Number(refillStaminaAll.run(Math.round(ms), Math.round(now)).changes);
    },

    setStamina(characterId: number, ms: number, at: number) {
      updateStamina.run(Math.round(ms), Math.round(at), characterId);
    },

    activePetFor(characterId: number): string | null {
      const row = selectActivePet.get(characterId) as { active_pet?: string | null } | undefined;
      return row?.active_pet ?? null;
    },

    setActivePet(characterId: number, pet: string | null) {
      updateActivePet.run(pet, characterId);
    },

    xpBoostUntil(characterId: number): number {
      return (selectXpBoost.get(characterId) as { xp_boost_until?: number } | undefined)?.xp_boost_until ?? 0;
    },

    combatPetFor(characterId: number): string | null {
      return (db.prepare(`SELECT combat_pet FROM characters WHERE id = ?`).get(characterId) as { combat_pet?: string | null } | undefined)?.combat_pet ?? null;
    },
    setCombatPet(characterId: number, petId: string | null) {
      db.prepare(`UPDATE characters SET combat_pet = ? WHERE id = ?`).run(petId, characterId);
    },
    artisanKitUntil(characterId: number): number {
      return (db.prepare(`SELECT artisan_kit_until FROM characters WHERE id = ?`).get(characterId) as { artisan_kit_until?: number } | undefined)?.artisan_kit_until ?? 0;
    },
    setArtisanKitUntil(characterId: number, until: number) {
      db.prepare(`UPDATE characters SET artisan_kit_until = ? WHERE id = ?`).run(Math.round(until), characterId);
    },

    setXpBoostUntil(characterId: number, until: number) {
      updateXpBoost.run(Math.round(until), characterId);
    },

    kidsPotionUsed(accountId: number): boolean {
      return !!(selectKidsPotion.get(accountId) as { kids_potion?: number } | undefined)?.kids_potion;
    },

    markKidsPotion(accountId: number) {
      updateKidsPotion.run(accountId);
    },

    /** 26/10: uma por dia (era uma por conta). A coluna guarda o dia do uso como AAAAMMDD; o 1 antigo nunca bate. */
    halloweenPotionUsed(accountId: number, day: string): boolean {
      return (selectHalloweenPotion.get(accountId) as { halloween_potion?: number } | undefined)?.halloween_potion === Number(day.replace(/-/g, ''));
    },

    markHalloweenPotion(accountId: number, day: string) {
      updateHalloweenPotion.run(Number(day.replace(/-/g, '')), accountId);
    },

    hasTrickOrTreatedToday(characterId: number, day: string): boolean {
      return !!selectTrickOrTreat.get(characterId, day);
    },

    recordTrickOrTreat(characterId: number, day: string, at = Date.now()) {
      insertTrickOrTreat.run(characterId, day, at);
    },

    unlockPet(characterId: number, pet: string): boolean {
      const current = this.petsFor(characterId);
      if (current.includes(pet)) return false;
      current.push(pet);
      updateUnlockedPets.run(JSON.stringify(current), characterId);
      if (!this.activePetFor(characterId)) {
        this.setActivePet(characterId, pet);
      }
      return true;
    },

    setFood(characterId: number, food: string | null) {
      updateFood.run(food, characterId);
    },

    setPromotion(characterId: number, promotion: string) {
      updatePromotion.run(promotion, characterId);
    },

    nameTaken(name: string): boolean {
      return selectName.get(name) !== undefined;
    },

    createCharacter(accountId: number, name: string, vocation: VocationId, look: Look = DEFAULT_LOOKS[vocation]): Character {
      const row = insertCharacter.get(accountId, name, vocation, JSON.stringify(look)) as unknown as CharacterRow;
      return toCharacter(row);
    },

    /** Veste o kit inicial da vocação (personagem recém-criado pelo jogo). */
    giveStarterKit(characterId: number, vocation: VocationId) {
      for (const [slot, item] of Object.entries(STARTER_KIT[vocation] ?? {})) if (item) upsertEquipment.run(characterId, slot, item);
    },

    skillsFor(characterId: number): Record<string, number> {
      const rows = selectSkills.all(characterId) as { skill: string; xp: number }[];
      return Object.fromEntries(rows.map((r) => [r.skill, r.xp]));
    },

    bankFor(characterId: number): Record<string, number> {
      const rows = selectBank.all(characterId) as { item: string; qty: number }[];
      return Object.fromEntries(rows.map((r) => [r.item, r.qty]));
    },

    /** Chefe global: abre o evento (se ainda não existe) e devolve se já foi pago e o dano salvo. */
    bossEvent(eventId: number): { done: boolean; damage: Map<number, number> } {
      db.prepare(`INSERT OR IGNORE INTO world_boss (event_id) VALUES (?)`).run(eventId);
      const done = (db.prepare(`SELECT done FROM world_boss WHERE event_id = ?`).get(eventId) as { done: number }).done === 1;
      const rows = db.prepare(`SELECT character_id, damage FROM world_boss_damage WHERE event_id = ?`).all(eventId) as { character_id: number; damage: number }[];
      return { done, damage: new Map(rows.map((r) => [r.character_id, r.damage])) };
    },

    /** Eventos que ficaram abertos (o servidor caiu antes de pagar), menos o atual. */
    openBossEvents(exceptId: number): number[] {
      return (db.prepare(`SELECT event_id FROM world_boss WHERE done = 0 AND event_id <> ? ORDER BY event_id`).all(exceptId) as { event_id: number }[]).map((r) => r.event_id);
    },

    saveBossDamage(eventId: number, damage: Map<number, number>) {
      const st = db.prepare(
        `INSERT INTO world_boss_damage (event_id, character_id, damage) VALUES (?, ?, ?)
         ON CONFLICT (event_id, character_id) DO UPDATE SET damage = excluded.damage`,
      );
      transaction(() => {
        for (const [id, d] of damage) st.run(eventId, id, d);
      });
    },

    finishBossEvent(eventId: number) {
      db.prepare(`UPDATE world_boss SET done = 1 WHERE event_id = ?`).run(eventId);
    },

    bestiaryFor(characterId: number): Record<string, number> {
      const rows = db.prepare(`SELECT monster, kills FROM bestiary WHERE character_id = ?`).all(characterId) as { monster: string; kills: number }[];
      return Object.fromEntries(rows.map((r) => [r.monster, r.kills]));
    },

    addBestiaryKills(characterId: number, kills: Record<string, number>) {
      const st = db.prepare(
        `INSERT INTO bestiary (character_id, monster, kills) VALUES (?, ?, ?)
         ON CONFLICT (character_id, monster) DO UPDATE SET kills = kills + excluded.kills`,
      );
      for (const [m, n] of Object.entries(kills)) if (n > 0) st.run(characterId, m, n);
    },

    preyFor(characterId: number, slots: number): PreySlot[] {
      const rows = db.prepare(`SELECT slot, monster, bonus, seconds_left, options FROM prey WHERE character_id = ?`).all(characterId) as { slot: number; monster: string | null; bonus: string | null; seconds_left: number; options: string | null }[];
      return Array.from({ length: slots }, (_, i) => {
        const r = rows.find((x) => x.slot === i);
        // Lista sorteada esperando a escolha: o bônus já está definido, a espécie não.
        // Listas e vagas antigas com chefe de instância ou de covil (de antes do filtro) somem; a vaga vazia sorteia de graça.
        const options = r && !r.monster && r.options ? (JSON.parse(r.options) as string[]).filter(isPreySpecies) : [];
        if (options.length) {
          return { monster: null, bonus: (r!.bonus as PreyBonus['id']) ?? null, timeLeftSecs: 0, options };
        }
        if (!r || !r.monster || !isPreySpecies(r.monster) || !r.bonus || (r.seconds_left ?? 0) <= 0) {
          return { monster: null, bonus: null, timeLeftSecs: 0 };
        }
        return {
          monster: r.monster,
          bonus: (r.bonus as PreyBonus['id']) ?? null,
          timeLeftSecs: r.seconds_left,
        };
      });
    },

    setPrey(characterId: number, slot: number, monster: string, bonus: string, secondsLeft: number = 7200) {
      db.prepare(
        `INSERT INTO prey (character_id, slot, monster, bonus, seconds_left) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (character_id, slot) DO UPDATE SET monster = excluded.monster, bonus = excluded.bonus, seconds_left = excluded.seconds_left, options = NULL`,
      ).run(characterId, slot, monster, bonus, secondsLeft);
    },

    /** Guarda a lista sorteada da vaga (tira a espécie atual até o jogador escolher). */
    setPreyOptions(characterId: number, slot: number, options: string[], bonus: string) {
      db.prepare(
        `INSERT INTO prey (character_id, slot, monster, bonus, seconds_left, options) VALUES (?, ?, NULL, ?, 0, ?)
         ON CONFLICT (character_id, slot) DO UPDATE SET monster = NULL, bonus = excluded.bonus, seconds_left = 0, options = excluded.options`,
      ).run(characterId, slot, bonus, JSON.stringify(options));
    },

    decrementPrey(characterId: number, monsterId: string, secondsUsed: number) {
      if (secondsUsed <= 0) return;
      transaction(() => {
        db.prepare(
          `UPDATE prey SET seconds_left = MAX(0, seconds_left - ?) WHERE character_id = ? AND monster = ? AND seconds_left > 0`,
        ).run(secondsUsed, characterId, monsterId);
        // Quando expira (chega a 0 segundos), a vaga é limpa (volta a ficar vazia)
        db.prepare(
          `UPDATE prey SET monster = NULL, bonus = NULL, seconds_left = 0 WHERE character_id = ? AND seconds_left <= 0 AND monster IS NOT NULL`,
        ).run(characterId);
      });
    },

    preyFreeDay(characterId: number): string | null {
      return (db.prepare(`SELECT day FROM prey_free WHERE character_id = ?`).get(characterId) as { day: string } | undefined)?.day ?? null;
    },

    setPreyFreeDay(characterId: number, day: string) {
      db.prepare(`INSERT INTO prey_free (character_id, day, paid) VALUES (?, ?, 0) ON CONFLICT (character_id) DO UPDATE SET day = excluded.day, paid = 0`).run(characterId, day);
    },

    /** Trocas pagas do prey no dia `day` (0 se o dia guardado é outro). */
    preyPaidOn(characterId: number, day: string): number {
      const row = db.prepare(`SELECT day, paid FROM prey_free WHERE character_id = ?`).get(characterId) as { day: string; paid: number } | undefined;
      return row && row.day === day ? row.paid : 0;
    },

    addPreyPaid(characterId: number) {
      db.prepare(`UPDATE prey_free SET paid = paid + 1 WHERE character_id = ?`).run(characterId);
    },

    charmsFor(characterId: number): { id: string; monster: string | null; level: number; legacy?: boolean }[] {
      const rows = db.prepare(`SELECT charm, monster, level, legacy FROM charms WHERE character_id = ? ORDER BY rowid`).all(characterId) as { charm: string; monster: string | null; level: number; legacy: number }[];
      return rows.map((r) => ({ id: r.charm, monster: r.monster, level: r.level, ...(r.legacy ? { legacy: true } : {}) }));
    },

    unlockCharm(characterId: number, charm: string) {
      db.prepare(`INSERT OR IGNORE INTO charms (character_id, charm, monster, level, legacy) VALUES (?, ?, NULL, 1, 0)`).run(characterId, charm);
    },

    dailyChestFor(characterId: number): { lastDay: string | null; streak: number } {
      const r = db.prepare(`SELECT last_day, streak FROM daily_chest WHERE character_id = ?`).get(characterId) as { last_day: string; streak: number } | undefined;
      return { lastDay: r?.last_day ?? null, streak: r?.streak ?? 0 };
    },

    /** Marca o baú do dia como aberto; false se já estava (dois cliques ao mesmo tempo). */
    openDailyChest(characterId: number, day: string, streak: number): boolean {
      const r = db.prepare(`INSERT INTO daily_chest (character_id, last_day, streak) VALUES (?, ?, ?)
        ON CONFLICT(character_id) DO UPDATE SET last_day = excluded.last_day, streak = excluded.streak WHERE daily_chest.last_day <> excluded.last_day`).run(characterId, day, streak);
      return Number(r.changes) > 0;
    },

    dailyGatherPreferencesFor(characterId: number, day: string): GatheringSkillId[] {
      const row = db.prepare(`SELECT skills FROM daily_gather_preferences WHERE character_id = ? AND effective_day <= ? ORDER BY effective_day DESC LIMIT 1`).get(characterId, day) as { skills: string } | undefined;
      if (!row) return [];
      try {
        const parsed = JSON.parse(row.skills);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },

    setDailyGatherPreferences(characterId: number, skills: GatheringSkillId[], effectiveDay: string): void {
      db.prepare(`INSERT INTO daily_gather_preferences (character_id, effective_day, skills) VALUES (?, ?, ?)
        ON CONFLICT(character_id, effective_day) DO UPDATE SET skills = excluded.skills`).run(characterId, effectiveDay, JSON.stringify(skills));
    },

    dailyGatherPreferencesConfig(characterId: number, today: string): { skills: GatheringSkillId[]; effectiveDay?: string } {
      const row = db.prepare(`SELECT skills, effective_day FROM daily_gather_preferences WHERE character_id = ? ORDER BY effective_day DESC LIMIT 1`).get(characterId) as { skills: string; effective_day: string } | undefined;
      if (!row) return { skills: [] };
      try {
        const parsed = JSON.parse(row.skills);
        return {
          skills: Array.isArray(parsed) ? parsed : [],
          effectiveDay: row.effective_day,
        };
      } catch {
        return { skills: [] };
      }
    },

    setCharmLevel(characterId: number, charm: string, level: number) {
      db.prepare(`UPDATE charms SET level = ? WHERE character_id = ? AND charm = ?`).run(level, characterId, charm);
    },

    /** Um charm por espécie: o que já estava nela volta para "sem espécie". */
    assignCharm(characterId: number, charm: string, monster: string | null) {
      if (monster !== null) db.prepare(`UPDATE charms SET monster = NULL WHERE character_id = ? AND monster = ? AND charm <> ?`).run(characterId, monster, charm);
      db.prepare(`UPDATE charms SET monster = ? WHERE character_id = ? AND charm = ?`).run(monster, characterId, charm);
    },

    imbuementsFor(characterId: number): Record<string, number> {
      const rows = selectImbuements.all(characterId) as { imbuement_id: string; seconds_left: number }[];
      return Object.fromEntries(rows.filter((r) => r.seconds_left > 0).map((r) => [r.imbuement_id, r.seconds_left]));
    },

    setImbuement(characterId: number, imbuementId: string, seconds: number) {
      upsertImbuement.run(characterId, imbuementId, seconds);
    },

    decrementImbuements(characterId: number, secondsUsed: number) {
      if (secondsUsed <= 0) return;
      transaction(() => {
        updateImbuementSeconds.run(secondsUsed, characterId);
        deleteExpiredImbuements.run(characterId);
      });
    },

    huntingTasksFor(characterId: number): HuntingTaskState[] {
      const rows = selectHuntingTasks.all(characterId) as { task_id: string; progress: number; status: 'active' | 'ready' | 'claimed' }[];
      return rows.map((r) => ({
        id: r.task_id,
        progress: r.progress,
        status: r.status,
      }));
    },

    startHuntingTask(characterId: number, taskId: string) {
      insertHuntingTask.run(characterId, taskId);
    },

    addHuntingTaskProgress(characterId: number, taskId: string, amount: number) {
      addHuntingTaskProgress.run(amount, characterId, taskId);
    },

    setHuntingTaskStatus(characterId: number, taskId: string, status: 'active' | 'ready' | 'claimed') {
      setHuntingTaskStatus.run(status, characterId, taskId);
    },

    cancelHuntingTask(characterId: number, taskId: string) {
      deleteHuntingTask.run(characterId, taskId);
    },

    slayerFor(characterId: number): SlayerState {
      const r = db.prepare(`SELECT master, monster, target, progress, streak, points, completed, size FROM slayer_tasks WHERE character_id = ?`).get(characterId) as
        | { master: SlayerMasterId | null; monster: string | null; target: number; progress: number; streak: number; points: number; completed: number; size: SlayerSize | null }
        | undefined;
      return r ? { ...r } : { ...NO_SLAYER };
    },

    setSlayer(characterId: number, st: SlayerState) {
      db.prepare(
        `INSERT INTO slayer_tasks (character_id, master, monster, target, progress, streak, points, completed, size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (character_id) DO UPDATE SET master = excluded.master, monster = excluded.monster, target = excluded.target,
           progress = excluded.progress, streak = excluded.streak, points = excluded.points, completed = excluded.completed, size = excluded.size`,
      ).run(characterId, st.master, st.monster, st.target, st.progress, st.streak, st.points, st.completed, st.monster ? (st.size ?? null) : null);
    },

    /** Soma XP de combate e tempo na sessão de caçada; sessão nova (outra seed) guarda a anterior se teve 10+ min. */
    addHuntXp(characterId: number, hunt: string, seed: number, xp: number, ms: number) {
      const r = db.prepare(`SELECT seed, cur_xp, cur_ms, xp, ms FROM hunt_xp WHERE character_id = ? AND hunt = ?`).get(characterId, hunt) as
        | { seed: number; cur_xp: number; cur_ms: number; xp: number; ms: number }
        | undefined;
      let row = r ?? { seed, cur_xp: 0, cur_ms: 0, xp: 0, ms: 0 };
      if (row.seed !== seed) row = { seed, cur_xp: 0, cur_ms: 0, ...(row.cur_ms >= HUNT_XP_MIN_MS ? { xp: row.cur_xp, ms: row.cur_ms } : { xp: row.xp, ms: row.ms }) };
      row.cur_xp += xp;
      row.cur_ms += ms;
      db.prepare(
        `INSERT INTO hunt_xp (character_id, hunt, seed, cur_xp, cur_ms, xp, ms) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (character_id, hunt) DO UPDATE SET seed = excluded.seed, cur_xp = excluded.cur_xp, cur_ms = excluded.cur_ms, xp = excluded.xp, ms = excluded.ms`,
      ).run(characterId, hunt, row.seed, row.cur_xp, row.cur_ms, row.xp, row.ms);
    },

    /** XP/h de cada caçada: a sessão atual se já tem 10+ min, senão a última que teve. */
    huntXpRates(characterId: number): Record<string, number> {
      const rows = db.prepare(`SELECT hunt, cur_xp, cur_ms, xp, ms FROM hunt_xp WHERE character_id = ?`).all(characterId) as {
        hunt: string;
        cur_xp: number;
        cur_ms: number;
        xp: number;
        ms: number;
      }[];
      const out: Record<string, number> = {};
      for (const r of rows) {
        const [x, m] = r.cur_ms >= HUNT_XP_MIN_MS ? [r.cur_xp, r.cur_ms] : [r.xp, r.ms];
        if (m >= HUNT_XP_MIN_MS) out[r.hunt] = Math.round((x / m) * 3_600_000);
      }
      return out;
    },

    slayerBoostsFor(characterId: number): SlayerBoosts {
      const r = db.prepare(`SELECT loot_until, loot_mult, bestiary_until FROM slayer_tasks WHERE character_id = ?`).get(characterId) as
        | { loot_until: number; loot_mult: number; bestiary_until: number }
        | undefined;
      return { lootUntil: r?.loot_until ?? 0, lootMult: r?.loot_mult ?? 0, bestiaryUntil: r?.bestiary_until ?? 0 };
    },

    setSlayerBoosts(characterId: number, b: SlayerBoosts) {
      db.prepare(`INSERT OR IGNORE INTO slayer_tasks (character_id) VALUES (?)`).run(characterId);
      db.prepare(`UPDATE slayer_tasks SET loot_until = ?, loot_mult = ?, bestiary_until = ? WHERE character_id = ?`).run(b.lootUntil, b.lootMult, b.bestiaryUntil, characterId);
    },

    arenasFor(characterId: number): CharacterArenaState[] {
      const rows = selectArenas.all(characterId) as {
        arena_id: string;
        status: 'available' | 'in_progress' | 'reward_pending' | 'completed';
        current_wave: number;
        reward_chosen: string | null;
        completed_at: number | null;
      }[];
      const map = new Map(rows.map((r) => [r.arena_id, r]));
      return ARENAS.map((a) => {
        const found = map.get(a.id);
        if (found) {
          return {
            arenaId: found.arena_id,
            status: found.status,
            currentWave: found.current_wave,
            rewardChosen: found.reward_chosen,
            completedAt: found.completed_at,
          };
        }
        return {
          arenaId: a.id,
          status: 'available',
          currentWave: 0,
        };
      });
    },

    setArenaStatus(characterId: number, arenaId: string, status: 'available' | 'in_progress' | 'reward_pending' | 'completed', wave: number = 0) {
      upsertArenaStatus.run(characterId, arenaId, status, wave);
    },

    completeArena(characterId: number, arenaId: string, weaponId: string, now: number): boolean {
      const info = completeArenaStmt.run(weaponId, now, characterId, arenaId);
      return info.changes > 0;
    },

    activityFor(characterId: number): Activity | null {
      const row = selectActivity.get(characterId) as Activity | undefined;
      return row
        ? {
            skill: row.skill as SkillId,
            node: row.node,
            since: Number(row.since),
            seed: Number(row.seed),
            seq: Number(row.seq),
            mana: row.mana === null || row.mana === undefined || !Number.isFinite(Number(row.mana)) ? null : Number(row.mana),
            aura: parseAura((row as { aura?: unknown }).aura),
          }
        : null;
    },

    /** Caçada: guarda a mana do começo do próximo ciclo (o próximo crédito continua dela). */
    setActivityMana(characterId: number, mana: number | null) {
      updateActivityMana.run(mana === null || !Number.isFinite(mana) ? null : mana, characterId);
    },

    /** Caçada: guarda o buff e o escudo que ainda valem (o próximo crédito não lança de novo antes de acabar). */
    setActivityAura(characterId: number, aura: SpellAura | null) {
      updateActivityAura.run(aura && (aura.buff || aura.buffs?.length || aura.shield) ? JSON.stringify(aura) : null, characterId);
    },

    /** Chefe global: a atividade de antes de entrar (volta para ela quando o chefe acaba). */
    activityStopFor(characterId: number): { text: string; at: number } | null {
      return (db.prepare(`SELECT text, at FROM activity_stop WHERE character_id = ?`).get(characterId) as { text: string; at: number } | undefined) ?? null;
    },

    setActivityStop(characterId: number, text: string, at: number) {
      db.prepare(`INSERT INTO activity_stop (character_id, text, at) VALUES (?, ?, ?) ON CONFLICT (character_id) DO UPDATE SET text = excluded.text, at = excluded.at`).run(characterId, text, at);
    },

    /** O que fazia antes do chefe global e quanto faltava da hora marcada da fila (leftMs null = sem hora). */
    bossReturnFor(characterId: number): { skill: SkillId; node: string; leftMs: number | null } | null {
      const r = db.prepare(`SELECT skill, node, left_ms FROM boss_return WHERE character_id = ?`).get(characterId) as { skill: SkillId; node: string; left_ms: number | null } | undefined;
      return r ? { skill: r.skill, node: r.node, leftMs: r.left_ms ?? null } : null;
    },
    setBossReturn(characterId: number, ret: { skill: SkillId; node: string; leftMs?: number | null } | null) {
      if (ret) db.prepare(`INSERT INTO boss_return (character_id, skill, node, left_ms) VALUES (?, ?, ?, ?) ON CONFLICT (character_id) DO UPDATE SET skill = excluded.skill, node = excluded.node, left_ms = excluded.left_ms`).run(characterId, ret.skill, ret.node, ret.leftMs ?? null);
      else db.prepare(`DELETE FROM boss_return WHERE character_id = ?`).run(characterId);
    },

    /** Fila de profissões: o que vem depois da atual e até quando a atual vai (null = até acabar o material). */
    queueFor(characterId: number): { queue: QueuedActivity[]; until: number | null } {
      const row = selectQueue.get(characterId) as { queue: string; until: number | null } | undefined;
      if (!row) return { queue: [], until: null };
      let queue: QueuedActivity[] = [];
      try {
        queue = JSON.parse(row.queue) as QueuedActivity[];
      } catch {
        queue = [];
      }
      return { queue, until: row.until ?? null };
    },
    setQueue(characterId: number, queue: QueuedActivity[], until: number | null) {
      upsertQueue.run(characterId, JSON.stringify(queue), until);
    },

    setActivity(characterId: number, activity: Activity | null) {
      if (activity) {
        upsertActivity.run(characterId, activity.skill, activity.node, activity.since, activity.seed, activity.seq);
      }
      else deleteActivity.run(characterId);
    },

    /**
     * Grava os ganhos e o progresso da atividade de uma vez só — ou tudo, ou nada.
     * Com `end`, a atividade é encerrada no mesmo passo (morte).
     */
    applyGains(characterId: number, gains: Gains, since: number, seq: number, end = false) {
      transaction(() => {
        for (const [skill, xp] of Object.entries(gains.xp)) addXp.run(characterId, skill, xp ?? 0);
        for (const [item, qty] of Object.entries(gains.items)) addItem.run(characterId, item, qty);
        pruneBank.run(characterId);
        if (end) deleteActivity.run(characterId);
        else updateProgress.run(since, seq, characterId);
      });
    },

    equipmentFor(characterId: number): Partial<Record<EquipSlot, string>> {
      const rows = selectEquipment.all(characterId) as { slot: EquipSlot; item: string }[];
      return Object.fromEntries(rows.map((r) => [r.slot, r.item]));
    },

    /**
     * Troca o que está no espaço: o item novo sai do banco e o antigo volta
     * para ele, numa transação só. `item` null só tira.
     */
    swapEquipment(characterId: number, slot: EquipSlot, item: string | null) {
      transaction(() => {
        const current = (selectEquipment.all(characterId) as { slot: string; item: string }[]).find((r) => r.slot === slot);
        if (current) addItem.run(characterId, current.item, 1);
        if (item) {
          addItem.run(characterId, item, -1);
          upsertEquipment.run(characterId, slot, item);
        } else {
          removeEquipment.run(characterId, slot);
        }
        pruneBank.run(characterId);
      });
    },

    listings(): Listing[] {
      const rows = selectListings.all() as {
        id: number; seller_id: number; seller: string; item: string; qty: number; price: number; created_at: number;
      }[];
      return rows.map((r) => ({
        id: r.id, sellerId: r.seller_id, seller: r.seller, item: r.item, qty: r.qty, price: r.price, createdAt: r.created_at,
      }));
    },

    accountOfCharacter(characterId: number): number | null {
      const row = selectAccountOf.get(characterId) as { account_id: number } | undefined;
      return row?.account_id ?? null;
    },

    /** Gasta 1 unidade do banco (poção ou runa fora da caçada normal). Devolve se havia. */
    useItem(characterId: number, item: string): boolean {
      return transaction(() => {
        const have = (selectQty.get(characterId, item) as { qty: number } | undefined)?.qty ?? 0;
        if (have < 1) return false;
        addItem.run(characterId, item, -1);
        pruneBank.run(characterId);
        return true;
      });
    },

    /** Põe à venda: o item sai do banco na hora. Devolve o erro, ou null. */
    /** Passa itens de um depósito para outro numa transação só (confere o saldo dentro dela). */
    moveItem(fromId: number, toId: number, item: string, qty: number): boolean {
      return transaction(() => {
        const have = (selectQty.get(fromId, item) as { qty: number } | undefined)?.qty ?? 0;
        if (have < qty) return false;
        addItem.run(fromId, item, -qty);
        pruneBank.run(fromId);
        addItem.run(toId, item, qty);
        return true;
      });
    },

    createListing(sellerId: number, item: string, qty: number, price: number, now: number): string | null {
      return transaction(() => {
        const have = (selectQty.get(sellerId, item) as { qty: number } | undefined)?.qty ?? 0;
        if (have < qty) return 'Você não tem tudo isso.';
        addItem.run(sellerId, item, -qty);
        pruneBank.run(sellerId);
        insertListing.run(sellerId, item, qty, price, now);
        return null;
      });
    },

    /** Compra parte ou toda a oferta. O ouro vai direto para o banco do vendedor. */
    buyListing(buyerId: number, listingId: number, qty: number, gold: string): { error: string | null; sellerId?: number } {
      return transaction(() => {
        const l = selectListing.get(listingId) as { seller_id: number; item: string; qty: number; price: number } | undefined;
        if (!l) return { error: 'Essa oferta já acabou.' };
        if (l.seller_id === buyerId) return { error: 'Essa oferta é sua.' };
        if (qty > l.qty) return { error: `Só restam ${l.qty}.` };
        const cost = l.price * qty;
        const have = (selectQty.get(buyerId, gold) as { qty: number } | undefined)?.qty ?? 0;
        if (have < cost) return { error: 'Ouro insuficiente.' };
        addItem.run(buyerId, gold, -cost);
        addItem.run(buyerId, l.item, qty);
        addItem.run(l.seller_id, gold, cost);
        pruneBank.run(buyerId);
        if (qty === l.qty) deleteListing.run(listingId);
        else reduceListing.run(qty, listingId);
        return { error: null, sellerId: l.seller_id };
      });
    },

    offers(): BuyOffer[] {
      const rows = selectOffers.all() as { id: number; buyer_id: number; buyer: string; item: string; qty: number; price: number; created_at: number }[];
      return rows.map((r) => ({ id: r.id, buyerId: r.buyer_id, buyer: r.buyer, item: r.item, qty: r.qty, price: r.price, createdAt: r.created_at }));
    },

    /** Oferta de compra: o ouro de tudo sai do banco na hora (fica reservado). */
    createOffer(buyerId: number, item: string, qty: number, price: number, gold: string, now: number): string | null {
      return transaction(() => {
        const cost = qty * price;
        const have = (selectQty.get(buyerId, gold) as { qty: number } | undefined)?.qty ?? 0;
        if (have < cost) return 'Ouro insuficiente para reservar a oferta.';
        addItem.run(buyerId, gold, -cost);
        pruneBank.run(buyerId);
        insertOffer.run(buyerId, item, qty, price, now);
        return null;
      });
    },

    /** Vende para uma oferta de compra: o item vai para o comprador e o ouro reservado para quem vendeu. */
    fillOffer(sellerId: number, offerId: number, qty: number, gold: string): { error: string | null; buyerId?: number } {
      return transaction(() => {
        const o = selectOffer.get(offerId) as { buyer_id: number; item: string; qty: number; price: number } | undefined;
        if (!o) return { error: 'Essa oferta já acabou.' };
        if (o.buyer_id === sellerId) return { error: 'Essa oferta é sua.' };
        if (qty > o.qty) return { error: `Só faltam ${o.qty}.` };
        const have = (selectQty.get(sellerId, o.item) as { qty: number } | undefined)?.qty ?? 0;
        if (have < qty) return { error: 'Você não tem tudo isso.' };
        addItem.run(sellerId, o.item, -qty);
        addItem.run(sellerId, gold, o.price * qty);
        addItem.run(o.buyer_id, o.item, qty);
        pruneBank.run(sellerId);
        if (qty === o.qty) removeOffer.run(offerId);
        else reduceOffer.run(qty, offerId);
        return { error: null, buyerId: o.buyer_id };
      });
    },

    /** Cancela a oferta de compra e devolve o ouro do que faltava comprar. */
    cancelOffer(buyerId: number, offerId: number, gold: string): string | null {
      return transaction(() => {
        const o = selectOffer.get(offerId) as { buyer_id: number; qty: number; price: number } | undefined;
        if (!o || o.buyer_id !== buyerId) return 'Essa oferta não é sua.';
        addItem.run(buyerId, gold, o.qty * o.price);
        removeOffer.run(offerId);
        return null;
      });
    },

    /** Anúncios mais velhos que `before`: devolve o que sobrou a cada vendedor e tira do mercado. */
    expireListings(before: number): { sellerId: number; item: string; qty: number }[] {
      return transaction(() => {
        const rows = db.prepare(`SELECT id, seller_id, item, qty FROM listings WHERE created_at < ?`).all(before) as { id: number; seller_id: number; item: string; qty: number }[];
        for (const l of rows) {
          addItem.run(l.seller_id, l.item, l.qty);
          deleteListing.run(l.id);
        }
        return rows.map((l) => ({ sellerId: l.seller_id, item: l.item, qty: l.qty }));
      });
    },

    /** Tira do mercado e devolve o que sobrou ao banco. */
    cancelListing(sellerId: number, listingId: number): string | null {
      return transaction(() => {
        const l = selectListing.get(listingId) as { seller_id: number; item: string; qty: number } | undefined;
        if (!l || l.seller_id !== sellerId) return 'Essa oferta não é sua.';
        addItem.run(sellerId, l.item, l.qty);
        deleteListing.run(listingId);
        return null;
      });
    },

    /**
     * Executa uma troca direta entre dois jogadores de forma 100% atômica.
     * Valida ouro e itens de ambos no banco antes de transferir.
     * Se qualquer jogador não tiver o prometido, faz rollback imediato.
     */
    executeDirectTrade(
      partyA: { id: number; gold: number; items: { item: string; qty: number }[] },
      partyB: { id: number; gold: number; items: { item: string; qty: number }[] },
      goldItem: string = 'gold'
    ): { success: boolean; error?: string } {
      return transaction(() => {
        // 1. Validar Ouro de A
        if (partyA.gold > 0) {
          const haveA = (selectQty.get(partyA.id, goldItem) as { qty: number } | undefined)?.qty ?? 0;
          if (haveA < partyA.gold) return { success: false, error: 'Jogador 1 não possui o ouro oferecido.' };
        }
        // 2. Validar Itens de A
        for (const it of partyA.items) {
          if (it.qty <= 0) continue;
          const have = (selectQty.get(partyA.id, it.item) as { qty: number } | undefined)?.qty ?? 0;
          if (have < it.qty) return { success: false, error: `Jogador 1 não possui ${it.qty}x do item oferecido.` };
        }

        // 3. Validar Ouro de B
        if (partyB.gold > 0) {
          const haveB = (selectQty.get(partyB.id, goldItem) as { qty: number } | undefined)?.qty ?? 0;
          if (haveB < partyB.gold) return { success: false, error: 'Jogador 2 não possui o ouro oferecido.' };
        }
        // 4. Validar Itens de B
        for (const it of partyB.items) {
          if (it.qty <= 0) continue;
          const have = (selectQty.get(partyB.id, it.item) as { qty: number } | undefined)?.qty ?? 0;
          if (have < it.qty) return { success: false, error: `Jogador 2 não possui ${it.qty}x do item oferecido.` };
        }

        // 5. Transferir Ouro
        if (partyA.gold > 0) {
          addItem.run(partyA.id, goldItem, -partyA.gold);
          addItem.run(partyB.id, goldItem, partyA.gold);
        }
        if (partyB.gold > 0) {
          addItem.run(partyB.id, goldItem, -partyB.gold);
          addItem.run(partyA.id, goldItem, partyB.gold);
        }

        // 6. Transferir Itens de A para B
        for (const it of partyA.items) {
          if (it.qty <= 0) continue;
          addItem.run(partyA.id, it.item, -it.qty);
          addItem.run(partyB.id, it.item, it.qty);
        }

        // 7. Transferir Itens de B para A
        for (const it of partyB.items) {
          if (it.qty <= 0) continue;
          addItem.run(partyB.id, it.item, -it.qty);
          addItem.run(partyA.id, it.item, it.qty);
        }

        // 8. Limpar zeros dos bancos de ambos
        pruneBank.run(partyA.id);
        pruneBank.run(partyB.id);

        return { success: true };
      });
    },

    addChat(characterId: number, text: string, at: number): number {
      return (insertChat.get(characterId, text, at) as { id: number }).id;
    },

    addSystemChat(text: string, at = Date.now()): ChatMessage {
      const id = (insertChat.get(0, text, at) as { id: number }).id;
      return { id, name: 'Grimhold', vocation: 'system', text, at, system: true };
    },

    /** Últimas mensagens, da mais antiga para a mais nova. */
    recentChat(limit: number): ChatMessage[] {
      const rows = selectChat.all(limit) as unknown as (ChatMessage & { system?: number })[];
      return rows.map((r) => ({ ...r, system: r.vocation === 'system' || !!r.system })).reverse();
    },

    createParty(leaderId: number, at = Date.now()): number {
      return transaction(() => {
        deletePartyMember.run(leaderId);
        const partyId = (insertParty.get(leaderId, at) as { id: number }).id;
        insertPartyMember.run(partyId, leaderId, at);
        return partyId;
      });
    },

    addPartyMember(partyId: number, characterId: number, at = Date.now()): void {
      transaction(() => {
        deletePartyMember.run(characterId);
        insertPartyMember.run(partyId, characterId, at);
      });
    },

    removePartyMember(characterId: number): { partyId: number; disbanded: boolean; newLeaderId?: number } | null {
      return transaction(() => {
        const row = selectPartyOf.get(characterId) as { party_id: number } | undefined;
        if (!row) return null;
        const partyId = row.party_id;
        deletePartyMember.run(characterId);
        const members = (selectPartyMembers.all(partyId) as { character_id: number }[]).map((m) => m.character_id);
        if (members.length === 0) {
          deleteParty.run(partyId);
          return { partyId, disbanded: true };
        }
        const party = selectParty.get(partyId) as { id: number; leader_id: number } | undefined;
        let newLeaderId: number | undefined;
        if (party?.leader_id === characterId) {
          newLeaderId = members[0];
          updatePartyLeader.run(newLeaderId, partyId);
        }
        return { partyId, disbanded: false, newLeaderId };
      });
    },

    partyFor(characterId: number): { id: number; leaderId: number; members: number[] } | null {
      const row = selectPartyOf.get(characterId) as { party_id: number } | undefined;
      if (!row) return null;
      const party = selectParty.get(row.party_id) as { id: number; leader_id: number } | undefined;
      if (!party) return null;
      const members = (selectPartyMembers.all(row.party_id) as { character_id: number }[]).map((m) => m.character_id);
      return { id: party.id, leaderId: party.leader_id, members };
    },

    disbandParty(partyId: number): void {
      deleteParty.run(partyId);
    },

    ranking(skill: string, limit: number): RankingEntry[] {
      // Total level (como no RuneScape): a soma do nível de todas as skills.
      return (selectRanking.all(skill, limit) as unknown as (RankingEntry & { id: number })[]).map(({ id, ...e }) => {
        const xp = this.skillsFor(id) as Record<string, number | undefined>;
        const mastery = skill === 'combat' && levelForXp(e.xp, 'combat') >= MASTERY_MIN_LEVEL ? masteryLevel(this.masteryFor(id)) : undefined;
        return { ...e, totalLevel: SKILLS.reduce((sum, s) => sum + levelForXp(xp[s.id] ?? 0, s.id), 0), ...(mastery !== undefined ? { mastery } : {}) };
      });
    },

    /** Skiller: soma do nível de todas as skills menos as de combate (desempate pela XP delas). */
    skillerRanking(limit: number): RankingEntry[] {
      const nonCombat = SKILLS.filter((s) => !isCombatSkill(s.id));
      const rows = db.prepare(`SELECT character_id AS id, skill, CAST(xp AS REAL) AS xp FROM skills WHERE xp > 0`).all() as { id: number; skill: string; xp: number }[];
      const by = new Map<number, Record<string, number>>();
      for (const r of rows) {
        if (!by.has(r.id)) by.set(r.id, {});
        by.get(r.id)![r.skill] = r.xp;
      }
      const scored = [...by].map(([id, xp]) => ({
        id,
        level: nonCombat.reduce((sum, s) => sum + levelForXp(xp[s.id] ?? 0, s.id), 0),
        xp: nonCombat.reduce((sum, s) => sum + (xp[s.id] ?? 0), 0),
      })).filter((x) => x.xp > 0);
      scored.sort((a, b) => b.level - a.level || b.xp - a.xp || a.id - b.id);
      return scored.slice(0, limit).flatMap(({ id, level, xp }) => {
        const c = db.prepare(`SELECT name, vocation, promotion FROM characters WHERE id = ?`).get(id) as Pick<RankingEntry, 'name' | 'vocation' | 'promotion'> | undefined;
        return c && id !== 0 ? [{ ...c, xp, skillerLevel: level }] : [];
      });
    },

    /** Guarda um bug ou sugestão enviado pelo jogador (lido depois direto no banco). */
    /** Registra um voto do TopIdle; false se esse evento já tinha sido pago (reenvio). */
    recordVote(eventId: string, identifier: string | null, characterId: number | null, now: number): boolean {
      const r = db.prepare(`INSERT OR IGNORE INTO topidle_votes (event_id, identifier, character_id, created_at) VALUES (?, ?, ?, ?)`).run(
        eventId, identifier, characterId, now,
      );
      return r.changes > 0;
    },

    /** Quando este personagem votou pela última vez (os testes do painel do TopIdle não contam). */
    lastVoteAt(characterId: number): number {
      const r = db.prepare(`SELECT MAX(created_at) AS at FROM topidle_votes WHERE character_id = ? AND event_id NOT LIKE 'test_%'`).get(characterId) as { at: number | null } | undefined;
      return r?.at ?? 0;
    },

    addFeedback(characterId: number, name: string, kind: string, text: string, context: string, now: number) {
      db.prepare(`INSERT INTO feedback (character_id, name, kind, text, context, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
        characterId, name, kind, text, context, now,
      );
    },

    /** Quantos feedbacks o personagem mandou desde `since` (limite contra flood). */
    masteryFor(characterId: number): MasteryState {
      const row = db
        .prepare(`SELECT CAST(xp AS REAL) AS xp, points, nodes FROM mastery WHERE character_id = ?`)
        .get(characterId) as { xp: number; points: number; nodes: string } | undefined;
      if (!row) return { ...NO_MASTERY, slices: {}, nodes: {} };
      const slices: Partial<Record<string, number>> = {};
      try {
        const parsed = JSON.parse(row.nodes ?? '{}');
        if (parsed && typeof parsed === 'object') {
          for (const s of MASTERY_NODES) {
            const v = Math.floor(Number((parsed as Record<string, unknown>)[s.id]) || 0);
            if (v > 0) slices[s.id] = Math.min(s.cost, v);
          }
        }
      } catch {
        /* JSON invalido: ignora */
      }
      return {
        xp: Math.max(0, Math.floor(Number(row.xp) || 0)),
        points: Math.max(0, Math.floor(Number(row.points) || 0)),
        slices,
        nodes: slices,
      };
    },

    setMastery(characterId: number, state: MasteryState): void {
      const cleanSlices: Partial<Record<string, number>> = {};
      const src = state.slices ?? state.nodes ?? {};
      for (const s of MASTERY_NODES) {
        const v = Math.floor(Number(src[s.id]) || 0);
        if (v > 0) cleanSlices[s.id] = Math.min(s.cost, v);
      }
      db.prepare(
        `INSERT INTO mastery (character_id, xp, points, nodes) VALUES (?, ?, ?, ?)
         ON CONFLICT(character_id) DO UPDATE SET xp = excluded.xp, points = excluded.points, nodes = excluded.nodes`,
      ).run(
        characterId,
        Math.max(0, Math.floor(Number(state.xp) || 0)),
        Math.max(0, Math.floor(Number(state.points) || 0)),
        JSON.stringify(cleanSlices),
      );
    },

    addMasteryXp(characterId: number, gain: number): { xp: number; pointsGained: number; points: number } {
      const add = Math.floor(Number(gain) || 0);
      const cur = this.masteryFor(characterId);
      if (add <= 0) return { xp: cur.xp, pointsGained: 0, points: cur.points };
      // Cada nível de Maestria custa mais que o anterior (masteryPointCost); para no nível máximo.
      let xp = cur.xp + add;
      let level = masteryLevel(cur);
      let pointsGained = 0;
      while (level < MASTERY_MAX_LEVEL && xp >= masteryPointCost(level)) {
        xp -= masteryPointCost(level);
        level++;
        pointsGained++;
      }
      if (level >= MASTERY_MAX_LEVEL) xp = 0;
      const points = cur.points + pointsGained;
      this.setMastery(characterId, { xp, points, nodes: cur.nodes });
      return { xp, pointsGained, points };
    },

    addMasteryPoints(characterId: number, add: number): MasteryState {
      const pts = Math.floor(Number(add) || 0);
      const cur = this.masteryFor(characterId);
      if (pts <= 0) return cur;
      const next: MasteryState = { ...cur, points: cur.points + pts };
      this.setMastery(characterId, next);
      return next;
    },

    feedbackCountSince(characterId: number, since: number): number {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM feedback WHERE character_id = ? AND created_at >= ?`).get(characterId, since) as { n: number };
      return row.n;
    },

    close() {
      db.close();
    },
  };
}


export function migrateRaidSchema(db: DatabaseSync) {
  const raidClearCols = (db.prepare(`PRAGMA table_info(raid_clears)`).all() as { name: string; pk: number }[]);
  const raidIdPk = raidClearCols.find((c) => c.name === 'raid_id')?.pk ?? 0;
  if (raidIdPk === 0) {
    db.exec('PRAGMA foreign_keys = OFF');
    try {
      db.exec('BEGIN TRANSACTION');
      db.exec(`
        CREATE TABLE raid_clears_new (
          character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
          week         TEXT NOT NULL,
          raid_id      TEXT NOT NULL,
          phase        INTEGER NOT NULL,
          is_solo      INTEGER NOT NULL DEFAULT 0,
          got_piece    INTEGER NOT NULL DEFAULT 0,
          created_at   INTEGER NOT NULL,
          PRIMARY KEY (character_id, week, raid_id, phase)
        );
        INSERT OR IGNORE INTO raid_clears_new (character_id, week, raid_id, phase, is_solo, got_piece, created_at)
          SELECT character_id, week, COALESCE(NULLIF(raid_id, ''), 'raid_usurper'), phase, is_solo, got_piece, created_at FROM raid_clears;
        DROP TABLE raid_clears;
        ALTER TABLE raid_clears_new RENAME TO raid_clears;
      `);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }

  const raidPityCols = (db.prepare(`PRAGMA table_info(raid_pity)`).all() as { name: string; pk: number }[]);
  const pityRaidIdPk = raidPityCols.find((c) => c.name === 'raid_id')?.pk ?? 0;
  if (pityRaidIdPk === 0) {
    db.exec('PRAGMA foreign_keys = OFF');
    try {
      db.exec('BEGIN TRANSACTION');
      db.exec(`
        CREATE TABLE raid_pity_new (
          character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
          raid_id      TEXT NOT NULL,
          weeks_failed INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (character_id, raid_id)
        );
        INSERT OR IGNORE INTO raid_pity_new (character_id, raid_id, weeks_failed)
          SELECT character_id, 'raid_usurper', weeks_failed FROM raid_pity;
        DROP TABLE raid_pity;
        ALTER TABLE raid_pity_new RENAME TO raid_pity;
      `);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }
}
