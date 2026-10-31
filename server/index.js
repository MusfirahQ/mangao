// Runs the app as a normal Node server (local development, or hosts like Render/Railway).
// On Vercel, api/index.js is used instead.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import app from './app.js';

process.env.ADMIN_EMAIL ??= 'admin@mangao.local';
process.env.ADMIN_PASSWORD ??= 'admin12345';
process.env.DEMO_PARTNER_EMAIL ??= 'kfc@mangao.local';
process.env.DEMO_PARTNER_PASSWORD ??= 'partner12345';

// Serve the built React app (after `npm run build`)
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => console.log(`Mangao API running on http://localhost:${PORT}`));
