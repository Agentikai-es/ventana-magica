// Servidor local sin dependencias para la demo: node mvp/servir.mjs
// Hace falta porque Chrome no carga módulos ni da el micrófono abriendo el HTML con file://.
// Solo escucha en 127.0.0.1 (no sale a la red).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PUERTO = Number(process.env.PORT) || 5173;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const archivo = normalize(join(RAIZ, ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(RAIZ.endsWith(sep) ? RAIZ : RAIZ + sep) || archivo.endsWith('.test.mjs')) {
    res.writeHead(404).end('No encontrado');
    return;
  }
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(datos);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
}).listen(PUERTO, '127.0.0.1', () => {
  console.log(`Ventana Peque en http://localhost:${PUERTO}`);
});
