// Voz que sale (Piper): solo para la ventana, solo texto corto, y si no hay Piper el móvil usa su propia voz.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearApp } from './servidor.mjs';
import { hablaDisponible } from './habla.mjs';

let dir, app, srv, b, ventana, mama;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vp-habla-'));
  app = await crearApp({ datos: dir, demo: true, registrar: () => {} });
  srv = createServer(app.manejar);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  b = `http://127.0.0.1:${srv.address().port}`;
  const canjear = async (codigo) => (await fetch(`${b}/api/canjear`, { method: 'POST', headers: { 'x-vp': '1', 'content-type': 'application/json' }, body: JSON.stringify({ codigo }) })).headers.get('set-cookie').split(';')[0];
  ventana = await canjear('123456');
  mama = await canjear('222222');
});
after(async () => { srv.close(); app.cerrar(); await rm(dir, { recursive: true, force: true }); });

const hablarCon = (cookie, cuerpo) => fetch(`${b}/api/hablar`, { method: 'POST', headers: { cookie, 'x-vp': '1', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });

test('solo la ventana del niño puede pedir lectura, y solo texto corto', async () => {
  assert.equal((await hablarCon(mama, { texto: 'hola' })).status, 401);
  assert.equal((await hablarCon(ventana, { texto: '   ' })).status, 400);
  assert.equal((await hablarCon(ventana, { texto: 'a'.repeat(401) })).status, 400);
});

test('sin Piper responde 503 y la ventana sabe que no hay voz local', async () => {
  process.env.VP_PIPER = '0';
  try {
    assert.equal((await hablarCon(ventana, { texto: 'Hola Leo' })).status, 503);
    assert.equal((await (await fetch(`${b}/api/ventana`, { headers: { cookie: ventana } })).json()).habla, false);
  } finally { delete process.env.VP_PIPER; }
});

test('con Piper devuelve audio m4a y la segunda vez sale de la caché', { skip: hablaDisponible() ? false : 'sin Piper o sin voces en esta máquina' }, async (t) => {
  const texto = 'La ventana se abre y aparece París.';
  let t0 = performance.now();
  const r = await hablarCon(ventana, { texto, voz: 'es_ES' });
  const primera = Math.round(performance.now() - t0);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'audio/mp4');
  assert.ok((await r.arrayBuffer()).byteLength > 5000);
  t0 = performance.now();
  await (await hablarCon(ventana, { texto, voz: 'es_ES' })).arrayBuffer();
  const segunda = Math.round(performance.now() - t0);
  t.diagnostic(`Piper: ${primera} ms la primera vez, ${segunda} ms desde la caché`);
  assert.ok(segunda < primera);
});
