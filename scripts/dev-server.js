// Local development server: serves public/ and sends /api/* to the same handler Vercel uses.
// Uses PGlite (local Postgres) when DATABASE_URL is not set. Run with: npm run dev
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import handler from '../server/api.js';

process.env.PGLITE_DIR ??= './.pglite';
process.env.ADMIN_EMAIL ??= 'admin@mangao.local';
process.env.ADMIN_PASSWORD ??= 'admin12345';
process.env.DEMO_PARTNER_EMAIL ??= 'kfc@mangao.local';
process.env.DEMO_PARTNER_PASSWORD ??= 'partner12345';

const PORT = Number(process.env.PORT || 3000);
const ROOT = new URL('../public/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png' };

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    req.body = raw;
    return handler(req, res);
  }
  try {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT) || !(await stat(file)).isFile()) throw new Error('not found');
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Mangao running at http://localhost:${PORT}`));
