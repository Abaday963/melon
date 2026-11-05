// Сайт и сервер на компьютере, без Supabase: тот же server/schema.sql в Postgres в памяти.
// Запуск: node tools/dev_server.mjs [порт]. Данные пропадают при выключении.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize as normPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] ?? 8769);
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec('create role anon nologin; create role authenticated nologin;');
await db.exec(await readFile(join(root, 'server/schema.sql'), 'utf8'));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

async function rpc(name, args) {
  const keys = Object.keys(args);
  const params = keys.map((key, i) => `${key} => $${i + 1}`).join(', ');
  const values = keys.map((key) => (args[key] !== null && typeof args[key] === 'object' ? JSON.stringify(args[key]) : args[key]));
  await db.exec('set role anon');
  try {
    return (await db.query(`select ${name}(${params}) as r`, values)).rows[0].r;
  } finally {
    await db.exec('reset role');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname.startsWith('/rest/v1/rpc/')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    const name = url.pathname.split('/').pop();
    try {
      if (!/^melon_\w+$/.test(name)) throw new Error('bad name');
      const data = await rpc(name, JSON.parse(body));
      const empty = data === null || data === '';
      res.writeHead(empty ? 204 : 200, { 'Content-Type': 'application/json' });
      res.end(empty ? undefined : JSON.stringify(data));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: error.message }));
    }
    return;
  }
  if (url.pathname === '/js/config.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(`export const SUPABASE_URL = ${JSON.stringify(`http://localhost:${port}`)};\nexport const SUPABASE_KEY = 'dev';\n`);
    return;
  }
  if (url.pathname === '/sw.js') {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const path = normPath(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = await readFile(join(root, path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, '127.0.0.1', () => console.log(`Melon dev: http://localhost:${port}`));
