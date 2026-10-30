/**
 * Teste de carga: N jogadores falsos caçando ao mesmo tempo, conectados por
 * WebSocket como o navegador. NUNCA aponte para o banco de produção: o script
 * se recusa a rodar se DB_PATH não terminar em "loadtest.db".
 *
 *   seed:  DB_PATH=/tmp/loadtest.db npx tsx scripts/loadtest.ts seed 200
 *   bots:  npx tsx scripts/loadtest.ts bots 200 ws://localhost:3002/ws 60
 *
 * Mede de quanto em quanto tempo chega a mensagem 'boss' (o servidor manda uma
 * por jogador a cada tick de 1s): se o servidor engasga, o intervalo cresce.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import WebSocket from 'ws';
import { huntNode, XP_TABLE } from '@grimhold/shared';

const [mode, nArg, url, secsArg] = process.argv.slice(2);
const N = Number(nArg ?? 50);
const TOKENS = '/tmp/loadtest-tokens.json';

if (mode === 'seed') {
  const dbPath = process.env.DB_PATH ?? '';
  if (!dbPath.endsWith('loadtest.db')) throw new Error('DB_PATH precisa terminar em loadtest.db (nunca o banco de produção).');
  const { openDb } = await import('../src/db.ts');
  const db = openDb(dbPath);
  const hunts = ['river_bank', 'goblin_den', 'tribal_lands'];
  const vocs = ['warrior', 'hunter', 'arcanist', 'devout'] as const;
  const tokens: string[] = [];
  for (let i = 0; i < N; i++) {
    const token = db.createGuest();
    const c = db.createCharacter(db.accountForToken(token)!, `Bot${i}`, vocs[i % 4]);
    db.applyGains(c.id, { actions: 0, items: {}, xp: { combat: XP_TABLE[15 + (i % 20)] } }, 0, 0);
    db.setActivity(c.id, { skill: 'combat', node: huntNode(hunts[i % 3], 'normal', 1 + (i % 3)), since: Date.now(), seed: i + 1, seq: 0 });
    tokens.push(token);
  }
  writeFileSync(TOKENS, JSON.stringify(tokens));
  console.log('criados', N);
} else if (mode === 'bots') {
  const tokens = (JSON.parse(readFileSync(TOKENS, 'utf8')) as string[]).slice(0, N);
  const secs = Number(secsArg ?? 60);
  const gaps: number[] = [];
  let connected = 0;
  let dropped = 0;
  for (const [i, token] of tokens.entries()) {
    // Conecta aos poucos (como gente entrando), 20 por segundo.
    setTimeout(() => {
      const ws = new WebSocket(url!);
      let last = 0;
      let done = false;
      ws.on('open', () => {
        connected++;
        ws.send(JSON.stringify({ type: 'auth', token }));
      });
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== 'boss') return;
        const now = Date.now();
        if (last) gaps.push(now - last);
        last = now;
      });
      ws.on('close', () => {
        if (!done) dropped++;
      });
      // De vez em quando fala no chat, como gente de verdade.
      const chat = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'chat', text: 'oi' })), 30_000 + i * 97);
      setTimeout(() => {
        done = true;
        clearInterval(chat);
        ws.close();
      }, secs * 1000);
    }, i * 50);
  }
  setTimeout(() => {
    gaps.sort((a, b) => a - b);
    const p = (q: number) => gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] ?? 0;
    console.log(JSON.stringify({ bots: N, conectados: connected, cairam: dropped, amostras: gaps.length, intervalo_ms: { mediana: p(0.5), p95: p(0.95), p99: p(0.99), max: gaps[gaps.length - 1] ?? 0 } }));
    process.exit(0);
  }, secs * 1000 + N * 50 + 2000);
}
