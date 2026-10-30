import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { openDb } from '../src/db.ts';
import { CITY_MOVE_MIN_MS, createApp } from '../src/app.ts';
import type { ServerMessage } from '@grimhold/shared';

const db = openDb(':memory:');
const server = createApp(db);
let base = '';
before(async () => {
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  db.close();
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Conta nova com personagem, conectada; guarda tudo que chega. */
async function player(name: string) {
  const token = ((await (await fetch(`${base}/api/auth/guest`, { method: 'POST' })).json()) as { token: string }).token;
  await fetch(`${base}/api/character`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, vocation: 'warrior' }),
  });
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`);
  const got: ServerMessage[] = [];
  await new Promise<void>((resolve) => {
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as ServerMessage;
      got.push(msg);
      if (msg.type === 'online') resolve();
    });
  });
  const welcome = got.find((m) => m.type === 'welcome');
  const id = welcome && welcome.type === 'welcome' ? welcome.character!.id : -1;
  return { ws, got, id, send: (m: unknown) => ws.send(JSON.stringify(m)), moves: () => got.filter((m) => m.type === 'city_move') };
}

test('cidade ao vivo: quem está na cidade vê o outro andar; quem caça não recebe; formato e limite conferidos', async () => {
  const a = await player('Andarilho');
  const b = await player('Olheiro');
  const c = await player('Cacador');
  c.send({ type: 'start', skill: 'combat', node: 'river_bank' });
  await wait(2300); // a lista de lugares do servidor atualiza a cada 2 s

  a.send({ type: 'city_move', x: 30, y: 20 });
  await wait(150);
  const seen = b.moves();
  assert.equal(seen.length, 1, 'quem está na cidade recebe');
  assert.deepEqual(seen[0], { type: 'city_move', id: a.id, x: 30, y: 20 });
  assert.equal(c.moves().length, 0, 'quem está caçando não recebe');
  assert.equal(a.moves().length, 0, 'ninguém recebe o próprio andar');

  // Rápido demais: ignorado.
  a.send({ type: 'city_move', x: 31, y: 20 });
  await wait(100);
  assert.equal(b.moves().length, 1, 'limite de mensagens');

  // Formato errado, negativo, fora do mapa ou quebrado: ignorado e o servidor continua de pé.
  await wait(CITY_MOVE_MIN_MS + 50);
  for (const bad of [{ x: -1, y: 2 }, { x: 1.5, y: 2 }, { x: 9999, y: 1 }, { x: 'a', y: 1 }, {}, { x: null, y: null }]) a.send({ type: 'city_move', ...bad });
  await wait(150);
  assert.equal(b.moves().length, 1, 'posição inválida não passa');

  a.send({ type: 'city_move', x: 32, y: 21 });
  await wait(150);
  assert.deepEqual(b.moves().at(-1), { type: 'city_move', id: a.id, x: 32, y: 21 });

  // Caçando, não manda andar de cidade.
  c.send({ type: 'city_move', x: 10, y: 10 });
  await wait(150);
  assert.ok(!b.moves().some((m) => m.type === 'city_move' && m.id === c.id), 'quem caça não anda na cidade');

  // Quem chega depois já recebe a posição dele na lista de jogadores.
  const d = await player('Recem');
  await wait(2300);
  const lists = d.got.filter((m) => m.type === 'players');
  const last = lists.at(-1);
  const seenA = last && last.type === 'players' ? last.players.find((p: { id: number }) => p.id === a.id) : undefined;
  assert.deepEqual(seenA?.pos, { x: 32, y: 21 });

  await Promise.all([a, b, c, d].map((p) => new Promise((r) => { p.ws.once('close', r); p.ws.close(); })));
  await wait(200);
});
