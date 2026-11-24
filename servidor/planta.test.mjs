// Pruebas de la comunidad de la planta (niños de la misma caja que se animan entre ellos).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearApp } from './servidor.mjs';

let dir, app, srv, base;
const tokens = {};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vp-planta-'));
  app = await crearApp({ datos: dir, demo: true, claveAdmin: 'clave-planta', registrar: () => {} });
  srv = createServer(app.manejar);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
  for (const [quien, codigo] of [['leo', '123456'], ['mama', '222222'], ['sara', '444444'], ['papaSara', '555555']]) {
    const r = await pedir('/api/canjear', { metodo: 'POST', cuerpo: { codigo } });
    tokens[quien] = (r.headers.get('set-cookie') || '').split(';')[0];
  }
});
after(async () => { srv.close(); app.cerrar(); await rm(dir, { recursive: true, force: true }); });

function pedir(ruta, { quien, metodo = 'GET', cuerpo, tipo, cabeceras = {} } = {}) {
  const h = { ...cabeceras };
  if (quien) h.cookie = tokens[quien];
  if (metodo !== 'GET') h['x-vp'] = '1';
  let body = cuerpo;
  if (cuerpo && !Buffer.isBuffer(cuerpo)) { body = JSON.stringify(cuerpo); h['content-type'] = 'application/json'; }
  if (tipo) h['content-type'] = tipo;
  return fetch(base + ruta, { method: metodo, headers: h, body });
}
const ventana = async (quien) => (await pedir('/api/ventana', { quien })).json();
const vecino = (v, alias) => v.planta.find((x) => x.alias === alias);

test('cada niño ve a los demás de la planta solo con alias, avatar y dónde está hoy', async () => {
  const v = await ventana('leo');
  assert.equal(v.comunidad, true);
  assert.deepEqual(v.planta.map((x) => x.alias), ['Nico', 'Sara']);
  const sara = vecino(v, 'Sara');
  assert.match(sara.lugar, /París/);
  assert.deepEqual(Object.keys(sara).sort(), ['alias', 'ambiente', 'avatar', 'id', 'lugar', 'mensajes', 'paleta']);
  assert.ok(v.animos.length >= 4);
});

test('un ánimo llega al momento; un texto espera al adulto de confianza de quien lo envía', async () => {
  const v = await ventana('leo');
  const sara = vecino(v, 'Sara').id;
  assert.equal((await pedir('/api/ventana/planta', { quien: 'leo', metodo: 'POST', cuerpo: { para: sara, tipo: 'animo', texto: 'inventado' } })).status, 400, 'solo ánimos de la lista');
  const r1 = await pedir('/api/ventana/planta', { quien: 'leo', metodo: 'POST', cuerpo: { para: sara, tipo: 'animo', texto: v.animos[0] } });
  assert.equal((await r1.json()).estado, 'aprobado');
  const r2 = await pedir('/api/ventana/planta', { quien: 'leo', metodo: 'POST', cuerpo: { para: sara, tipo: 'texto', texto: '¿A qué juegas hoy?' } });
  assert.equal((await r2.json()).estado, 'pendiente');

  let deLeo = vecino(await ventana('sara'), 'Leo').mensajes;
  assert.deepEqual(deLeo.map((m) => m.tipo), ['animo'], 'el texto aún no ha llegado');

  const pend = (await (await pedir('/api/aprobar', { quien: 'mama' })).json()).planta;
  assert.equal(pend.length, 1);
  assert.equal(pend[0].para, 'Sara');
  assert.equal((await pedir('/api/aprobar/planta', { quien: 'papaSara', metodo: 'POST', cuerpo: { id: pend[0].id, decision: 'aprobar' } })).status, 400, 'el adulto de otro niño no decide');
  assert.equal((await pedir('/api/aprobar/planta', { quien: 'mama', metodo: 'POST', cuerpo: { id: pend[0].id, decision: 'aprobar' } })).status, 200);
  deLeo = vecino(await ventana('sara'), 'Leo').mensajes;
  assert.deepEqual(deLeo.map((m) => m.texto), [v.animos[0], '¿A qué juegas hoy?']);
});

test('postal-acertijo entre niños: Sara adivina dónde está Leo hoy', async () => {
  await pedir('/api/ventana/escena', { quien: 'leo', metodo: 'PUT', cuerpo: { ambiente: 'polo', avatar: 'zorrito', momento: 'noche' } });
  const sara = vecino(await ventana('leo'), 'Sara').id;
  await pedir('/api/ventana/planta', { quien: 'leo', metodo: 'POST', cuerpo: { para: sara, tipo: 'postal', texto: '¡Aquí hace un frío!' } });
  const pend = (await (await pedir('/api/aprobar', { quien: 'mama' })).json()).planta;
  await pedir('/api/aprobar/planta', { quien: 'mama', metodo: 'POST', cuerpo: { id: pend[0].id, decision: 'aprobar' } });

  const postal = vecino(await ventana('sara'), 'Leo').mensajes.find((m) => m.tipo === 'postal');
  assert.equal(postal.texto, '', 'no se ve el mensaje hasta adivinar');
  assert.equal(postal.escena, undefined);
  assert.equal(postal.opciones.length, 3);
  const mal = postal.opciones.find((o) => o !== 'Polo Norte');
  assert.equal((await (await pedir(`/api/ventana/planta/${postal.id}/postal`, { quien: 'sara', metodo: 'POST', cuerpo: { donde: mal } })).json()).acierto, false);
  const ok = await (await pedir(`/api/ventana/planta/${postal.id}/postal`, { quien: 'sara', metodo: 'POST', cuerpo: { donde: 'Polo Norte' } })).json();
  assert.equal(ok.acierto, true);
  assert.equal(ok.mensaje.texto, '¡Aquí hace un frío!');
  assert.equal(ok.mensaje.escena.ambiente, 'polo');
  assert.equal(ok.de, undefined, 'la tablet no recibe ids de otros espacios');
});

test('ir de visita: Leo pone su ventana igual que la de Sara, con su propio avatar', async () => {
  const sara = vecino(await ventana('leo'), 'Sara').id;
  const r = await pedir(`/api/ventana/visitar/${sara}`, { quien: 'leo', metodo: 'POST' });
  assert.equal(r.status, 200);
  const esc = await r.json();
  assert.equal(esc.ambiente, 'paris');
  assert.equal(esc.avatar, 'zorrito');
  // Y le invita: la invitación lleva su escena y llega al momento.
  const inv = await (await pedir('/api/ventana/planta', { quien: 'leo', metodo: 'POST', cuerpo: { para: sara, tipo: 'visita' } })).json();
  assert.equal(inv.estado, 'aprobado');
});

test('foto-puzle entre niños: solo la ve el otro niño cuando está aprobada, y el secreto al montarla', async () => {
  const f = join(dir, 'p.jpg');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=teal:s=320x240', '-frames:v', '1', f]);
  const jpg = execFileSync('cat', [f]);
  const v = await ventana('sara');
  const leo = vecino(v, 'Leo').id;
  const r = await pedir('/api/ventana/planta', { quien: 'sara', metodo: 'POST', cuerpo: jpg, tipo: 'image/jpeg',
    cabeceras: { 'x-para': leo, 'x-secreto': encodeURIComponent('¡Mi dibujo para ti!'), 'x-texto': '' } });
  assert.equal(r.status, 200);
  const pend = (await (await pedir('/api/aprobar', { quien: 'papaSara' })).json()).planta.find((m) => m.tipo === 'puzle');
  assert.equal((await pedir(`/planta/${pend.id}`, { quien: 'leo' })).status, 404, 'Leo no la ve sin aprobar');
  assert.equal((await pedir(`/planta/${pend.id}`, { quien: 'papaSara' })).status, 200, 'el adulto la ve para decidir');
  await pedir('/api/aprobar/planta', { quien: 'papaSara', metodo: 'POST', cuerpo: { id: pend.id, decision: 'aprobar' } });
  assert.equal((await pedir(`/planta/${pend.id}`, { quien: 'leo' })).status, 200);
  const antes = vecino(await ventana('leo'), 'Sara').mensajes.find((m) => m.tipo === 'puzle');
  assert.equal(antes.secreto, undefined);
  const despues = await (await pedir(`/api/ventana/planta/${pend.id}/puzle`, { quien: 'leo', metodo: 'POST' })).json();
  assert.equal(despues.mensaje.secreto, '¡Mi dibujo para ti!');
});

test('sin comunidad activada no se ve a nadie ni se puede escribir; «borrar todo» borra lo de la planta', async () => {
  const nico = vecino(await ventana('leo'), 'Nico').id;
  const admin = (await pedir('/api/panel/entrar', { metodo: 'POST', cuerpo: { clave: 'clave-planta' } })).headers.get('set-cookie').split(';')[0];
  tokens.admin = admin;
  assert.equal((await pedir(`/api/panel/espacios/${nico}/comunidad`, { quien: 'admin', metodo: 'POST', cuerpo: { activa: false } })).status, 200);
  assert.equal(vecino(await ventana('leo'), 'Nico'), undefined);
  assert.equal((await pedir('/api/ventana/planta', { quien: 'leo', metodo: 'POST', cuerpo: { para: nico, tipo: 'animo', texto: '¡Ánimo! 💪' } })).status, 400);
  assert.equal((await pedir(`/api/ventana/visitar/${nico}`, { quien: 'leo', metodo: 'POST' })).status, 404);

  const fotosAntes = (await readdir(join(dir, 'fotos'))).length;
  await pedir('/api/aprobar/borrar-todo', { quien: 'papaSara', metodo: 'POST' });
  assert.ok((await readdir(join(dir, 'fotos'))).length < fotosAntes, 'la foto-puzle de Sara se borra del disco');
  assert.equal(vecino(await ventana('leo'), 'Sara').mensajes.filter((m) => !m.mio).length, 0);
  const exp = await (await pedir('/api/aprobar/exportar', { quien: 'mama' })).json();
  assert.ok(Array.isArray(exp.planta));
});
