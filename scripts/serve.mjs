// Serves v1/ the way the deploy publishes it (v1/ is the site root): a folder
// answers with its index.html, and a folder asked for without its trailing
// slash is redirected to it. Local checks only; no dependencies.
//   node scripts/serve.mjs [port]        (default 4173)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../v1/', import.meta.url).pathname;
const port = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8'
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = normalize(decodeURIComponent(url.pathname));
  if (path.includes('..')) { res.writeHead(400).end(); return; }
  let file = join(root, path);
  try {
    let s = await stat(file);
    if (s.isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(308, { Location: path + '/' + url.search }).end(); return; }
      file = join(file, 'index.html');
      s = await stat(file);
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
  }
}).listen(port, () => console.log(`serving v1/ on http://localhost:${port}/`));
