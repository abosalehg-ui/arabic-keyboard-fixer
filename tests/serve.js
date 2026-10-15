#!/usr/bin/env node
/**
 * Minimal static file server for the browser tests (and local preview).
 * The app has no build step, so serving the repository root is all it needs.
 * Usage: node tests/serve.js [port]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json'
};

createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = normalize(join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
        res.writeHead(403).end();
        return;
    }
    try {
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404).end();
    }
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
