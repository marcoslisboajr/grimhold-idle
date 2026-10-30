import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';

test('produção: entrega o cliente, cai no index.html e não sai da pasta', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'grimhold-static-'));
  writeFileSync(path.join(dir, 'index.html'), '<h1>jogo</h1>');
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log(1)');
  const db = openDb(':memory:');
  const server = createApp(db, { staticDir: dir });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  try {
    const home = await fetch(`${base}/`);
    assert.equal(await home.text(), '<h1>jogo</h1>');
    const js = await fetch(`${base}/assets/app.js`);
    assert.match(js.headers.get('content-type') ?? '', /javascript/);
    assert.equal(await (await fetch(`${base}/qualquer/rota`)).text(), '<h1>jogo</h1>');
    assert.equal((await fetch(`${base}/assets/nao-existe.png`)).status, 404);
    assert.equal((await fetch(`${base}/..%2f..%2fpackage.json`)).status, 404);
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    db.close();
  }
});
