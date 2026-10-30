import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../src/db.ts';

test('migração: banco antigo (1 personagem por conta) vira vários sem perder nada', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'grimhold-mig-'));
  const file = path.join(dir, 'old.db');
  try {
    const old = new DatabaseSync(file);
    old.exec(`
      CREATE TABLE accounts (id INTEGER PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'guest', created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE sessions (token TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE characters (
        id INTEGER PRIMARY KEY,
        account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        vocation TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        xp INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE skills (character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE, skill TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (character_id, skill));
      INSERT INTO accounts (id) VALUES (7);
      INSERT INTO sessions (token, account_id) VALUES ('tok', 7);
      INSERT INTO characters (id, account_id, name, vocation) VALUES (42, 7, 'Antigo', 'warrior');
      INSERT INTO skills (character_id, skill, xp) VALUES (42, 'mining', 1234);
    `);
    old.close();

    const db = openDb(file);
    assert.equal(db.characterById(42)?.name, 'Antigo');
    assert.equal(db.skillsFor(42).mining, 1234, 'as skills continuam ligadas ao personagem');
    assert.equal(db.sessionCharacter('tok')?.id, 42, 'a sessão antiga entra no personagem que já existia');
    const second = db.createCharacter(7, 'Novo', 'hunter');
    assert.deepEqual(db.charactersOf(7).map((c) => c.id), [42, second.id]);
    // Abrir de novo não migra outra vez nem perde nada.
    const again = openDb(file);
    assert.equal(again.charactersOf(7).length, 2);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows: o arquivo ainda está aberto; a pasta temporária fica */
    }
  }
});
