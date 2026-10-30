import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';
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

async function guest(): Promise<string> {
  const res = await fetch(`${base}/api/auth/guest`, { method: 'POST' });
  return ((await res.json()) as { token: string }).token;
}

function api(path: string, token: string, body?: unknown) {
  return fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('convidado começa sem personagem', async () => {
  const res = await api('/api/me', await guest());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { character: null, characters: [], username: null });
});

test('token inválido é recusado', async () => {
  const res = await api('/api/me', 'nao-existe');
  assert.equal(res.status, 401);
});

test('cria personagem e ele fica salvo', async () => {
  const token = await guest();
  const res = await api('/api/character', token, { name: '  aria  vento ', vocation: 'hunter' });
  assert.equal(res.status, 400, 'dois espaços seguidos não valem');

  const ok = await api('/api/character', token, { name: 'aria vento', vocation: 'hunter' });
  assert.equal(ok.status, 201);
  const { character } = (await ok.json()) as { character: { name: string; level: number } };
  assert.equal(character.name, 'Aria Vento');
  assert.equal(character.level, 1);

  const me = (await (await api('/api/me', token)).json()) as { character: { name: string } };
  assert.equal(me.character.name, 'Aria Vento');
});

test('recusa vocação inexistente, nome repetido e personagem além do limite', async () => {
  const a = await guest();
  assert.equal((await api('/api/character', a, { name: 'Brom', vocation: 'pirata' })).status, 400);
  assert.equal((await api('/api/character', a, { name: 'Brom', vocation: 'warrior' })).status, 201);
  for (const name of ['Outra', 'Terceira', 'Quarta', 'Quinta', 'Sexta', 'Setima', 'Oitava', 'Nona', 'Decima']) assert.equal((await api('/api/character', a, { name, vocation: 'hunter' })).status, 201);
  assert.equal((await api('/api/character', a, { name: 'Decima Primeira', vocation: 'warrior' })).status, 409);

  const b = await guest();
  assert.equal((await api('/api/character', b, { name: 'BROM', vocation: 'devout' })).status, 409);
});

test('mesma conta em duas abas conta como 1 online', async () => {
  const token = await guest();
  const url = `${base.replace('http', 'ws')}/ws`;
  const open = () =>
    new Promise<WebSocket>((resolve) => {
      const ws = new WebSocket(url);
      ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
      ws.once('message', () => resolve(ws));
    });
  const [a, b] = [await open(), await open()];
  const health = (await (await fetch(`${base}/api/health`)).json()) as { online: number };
  assert.equal(health.online, 1);
  a.close();
  b.close();
});

test('heartbeat derruba conexão que não responde ao ping', async () => {
  const db2 = openDb(':memory:');
  const srv = createApp(db2, { heartbeatMs: 50 });
  await new Promise<void>((r) => srv.listen(0, r));
  const port = (srv.address() as AddressInfo).port;
  const token = db2.createGuest();

  // autoPong: false simula um cliente travado que não responde ao ping.
  const ws = new WebSocket(`ws://localhost:${port}/ws`, { autoPong: false });
  ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
  const code = await new Promise<number>((r) => ws.on('close', (c) => r(c)));
  assert.equal(code, 1006, 'conexão terminada pelo servidor');

  const health = (await (await fetch(`http://localhost:${port}/api/health`)).json()) as { online: number };
  assert.equal(health.online, 0);
  srv.closeAllConnections();
  await new Promise((r) => srv.close(r));
  db2.close();
});

function connect(token: string): Promise<ServerMessage[]> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`);
    const got: ServerMessage[] = [];
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as ServerMessage;
      got.push(msg);
      if (msg.type === 'online') ws.close();
    });
    ws.on('close', () => resolve(got));
  });
}

test('websocket autentica e manda o personagem e o online', async () => {
  const token = await guest();
  await api('/api/character', token, { name: 'Kael', vocation: 'arcanist' });
  const [welcome, state, online] = await connect(token);
  assert.equal(welcome.type, 'welcome');
  assert.equal(welcome.type === 'welcome' && welcome.character?.name, 'Kael');
  assert.equal(state.type, 'state');
  assert.deepEqual(online, { type: 'online', count: 1 });
});

test('websocket: começar a minerar devolve o estado com a atividade', async () => {
  const token = await guest();
  await api('/api/character', token, { name: 'Mineira', vocation: 'warrior' });
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`);
  const states: ServerMessage[] = [];
  await new Promise<void>((resolve) => {
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as ServerMessage;
      if (msg.type === 'online') ws.send(JSON.stringify({ type: 'start', skill: 'mining', node: 'copper_vein' }));
      if (msg.type === 'state') states.push(msg);
      if (states.length === 2) resolve();
    });
  });
  ws.close();
  const last = states[1];
  assert.ok(last.type === 'state' && last.state.activity?.node === 'copper_vein');
});

test('websocket com token ruim é desconectado', async () => {
  const got = await connect('ruim');
  assert.deepEqual(got, [{ type: 'error', message: 'Sessão inválida.' }]);
});

test('chat: mensagem chega limpa a todos, com limite de 1 por segundo', async () => {
  const token = await guest();
  await api('/api/character', token, { name: 'Faladora', vocation: 'devout' });
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`);
  const got: ServerMessage[] = [];
  await new Promise<void>((resolve) => {
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token })));
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as ServerMessage;
      got.push(msg);
      if (msg.type === 'chat' && msg.messages.length === 0) {
        ws.send(JSON.stringify({ type: 'chat', text: '  olá\n  Bastião  ' }));
        ws.send(JSON.stringify({ type: 'chat', text: 'de novo' }));
      }
      if (got.some((m) => m.type === 'error')) resolve();
    });
  });
  ws.close();
  const chats = got.filter((m) => m.type === 'chat' && m.messages.length > 0);
  assert.equal(chats.length, 1);
  const [message] = chats[0].type === 'chat' ? chats[0].messages : [];
  assert.equal(message.text, 'olá Bastião');
  assert.equal(message.name, 'Faladora');
  assert.deepEqual(got.at(-1), { type: 'error', message: 'Calma: uma mensagem por segundo.' });
});

test('ranking: ordena por XP da skill e recusa skill inválida', async () => {
  const a = await guest();
  await api('/api/character', a, { name: 'Topo', vocation: 'warrior' });
  const b = await guest();
  await api('/api/character', b, { name: 'Segundo', vocation: 'hunter' });
  const top = db.characterFor(db.accountForToken(a)!)!.id;
  const second = db.characterFor(db.accountForToken(b)!)!.id;
  db.applyGains(top, { actions: 0, items: {}, xp: { fishing: 900 } }, 0, 0);
  db.applyGains(second, { actions: 0, items: {}, xp: { fishing: 300 } }, 0, 0);
  const res = await fetch(`${base}/api/ranking?skill=fishing`);
  const body = (await res.json()) as { entries: { name: string; xp: number }[] };
  assert.deepEqual(body.entries.map((e) => [e.name, e.xp]), [['Topo', 900], ['Segundo', 300]]);
  assert.equal((await fetch(`${base}/api/ranking?skill=voar`)).status, 400);
});

test('perfil: mostra níveis, equipamento e chefes; 404 para quem não existe', async () => {
  const a = await guest();
  await api('/api/character', a, { name: 'Perfilado', vocation: 'warrior' });
  const id = db.characterFor(db.accountForToken(a)!)!.id;
  db.applyGains(id, { actions: 0, items: {}, xp: { fishing: 900 } }, 0, 0);
  db.addBestiaryKills(id, { rat: 5 });
  const res = await fetch(`${base}/api/profile?name=perfilado`);
  assert.equal(res.status, 200);
  const p = (await res.json()) as { name: string; skills: Record<string, number>; bossKills: Record<string, number>; equipment: object };
  assert.equal(p.name, 'Perfilado');
  assert.equal(p.skills.fishing, 900);
  assert.deepEqual(p.bossKills, {});
  assert.equal(typeof p.equipment, 'object');
  assert.equal((await fetch(`${base}/api/profile?name=Ninguem`)).status, 404);
  assert.equal((await fetch(`${base}/api/profile?name=Grimhold`)).status, 404);
});

test('login: protege a conta de convidado e entra de outro lugar no mesmo personagem', async () => {
  const guestToken = await guest();
  await api('/api/character', guestToken, { name: 'Viajante', vocation: 'hunter' });

  assert.equal((await api('/api/auth/register', guestToken, { username: 'vi', password: '12345678' })).status, 400);
  assert.equal((await api('/api/auth/register', guestToken, { username: 'viajante', password: 'curta' })).status, 400);
  const reg = await api('/api/auth/register', guestToken, { username: 'Viajante_1', password: 'senha-forte-1' });
  assert.equal(reg.status, 200);
  assert.equal((await api('/api/auth/register', guestToken, { username: 'outro', password: 'senha-forte-1' })).status, 409);

  const other = await guest();
  assert.equal((await api('/api/auth/register', other, { username: 'VIAJANTE_1', password: 'senha-forte-2' })).status, 409);

  const bad = await api('/api/auth/login', '', { username: 'viajante_1', password: 'errada-123' });
  assert.equal(bad.status, 401);
  const login = await api('/api/auth/login', '', { username: 'viajante_1', password: 'senha-forte-1' });
  assert.equal(login.status, 200);
  const { token } = (await login.json()) as { token: string };
  assert.notEqual(token, guestToken);
  const me = (await (await api('/api/me', token)).json()) as { character: { name: string }; username: string };
  assert.equal(me.character.name, 'Viajante');
  assert.equal(me.username, 'Viajante_1');

  await api('/api/auth/logout', token, {});
  assert.equal((await api('/api/me', token)).status, 401);
  assert.equal((await api('/api/me', guestToken)).status, 200, 'a outra sessão continua');
});

test('vários personagens: escolhe na sessão e a conexão entra no escolhido', async () => {
  const a = await guest();
  const first = (await (await api('/api/character', a, { name: 'Primeira', vocation: 'warrior' })).json()).character;
  const second = (await (await api('/api/character', a, { name: 'Segunda', vocation: 'hunter' })).json()).character;
  let me = await (await api('/api/me', a)).json();
  assert.equal(me.characters.length, 2);
  assert.equal(me.character.id, second.id, 'quem acabou de criar já fica escolhido');
  assert.equal((await api('/api/character/select', a, { id: first.id })).status, 200);
  me = await (await api('/api/me', a)).json();
  assert.equal(me.character.id, first.id);
  const other = await guest();
  assert.equal((await api('/api/character/select', other, { id: first.id })).status, 400, 'não escolhe personagem de outra conta');
});

test('chat: marcadores de item válidos passam (com +N e #N), inválidos viram texto e acima de 3 são cortados', async () => {
  const { cleanChat } = await import('@grimhold/shared');
  // Marcador válido com +N e #N passa intacto
  assert.equal(cleanChat('Olha meu arco [item:drop165_bow+5#10] e [item:iron_sword+2#3]!'), 'Olha meu arco [item:drop165_bow+5#10] e [item:iron_sword+2#3]!');
  // Marcador inválido vira texto comum
  assert.equal(cleanChat('Olha [item:espada_inexistente] e [item:copper_ore+2] aqui'), 'Olha espada_inexistente e copper_ore+2 aqui');
  // Mais de 3 marcadores válidos: os excedentes são cortados
  assert.equal(
    cleanChat('[item:iron_sword] [item:bronze_sword] [item:copper_ore] [item:tin_ore] [item:coal] fim'),
    '[item:iron_sword] [item:bronze_sword] [item:copper_ore] fim',
  );
});
