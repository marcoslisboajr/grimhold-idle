import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.ts';
import { createApp } from './app.ts';
import { createMailer } from './mailer.ts';
import { alerts, createAlerts, setAlerts } from './alerts.ts';

// Erros do servidor no Discord (webhook guardado só no servidor, nunca no código).
setAlerts(createAlerts({ webhook: process.env.DISCORD_ALERT_WEBHOOK }));
process.on('uncaughtException', (err) => {
  console.error('[uncaught]', err);
  alerts.report('uncaught', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandled]', err);
  alerts.report('unhandled', err);
});

const PORT = Number(process.env.SERVER_PORT ?? 3001);
const DB_PATH = process.env.DB_PATH ?? 'grimhold.db';
// Em produção o servidor também entrega o cliente buildado (npm run build).
const here = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = process.env.STATIC_DIR ?? path.resolve(here, '../../client/dist');

const db = openDb(DB_PATH);
const staticDir = existsSync(STATIC_DIR) ? STATIC_DIR : undefined;
// Chefe global: BOSS_EVERY_MIN / BOSS_DURATION_MIN encurtam o ciclo para testar.
const bossEveryMs = process.env.BOSS_EVERY_MIN ? Number(process.env.BOSS_EVERY_MIN) * 60_000 : undefined;
const bossDurationMs = process.env.BOSS_DURATION_MIN ? Number(process.env.BOSS_DURATION_MIN) * 60_000 : undefined;
createApp(db, { staticDir, bossEveryMs, bossDurationMs, topidleSecret: process.env.TOPIDLE_SECRET, mailer: createMailer({ apiKey: process.env.RESEND_API_KEY }), publicUrl: process.env.PUBLIC_URL }).listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}  (db: ${DB_PATH}${staticDir ? `, cliente: ${staticDir}` : ''})`);
  // Aviso de que o servidor (re)iniciou: deploy ou queda.
  alerts.info(`✅ Servidor iniciou (${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC).`);
});
