// Pruebas de las recompensas colaborativas: estrellas, flores, regalos y Jardín de los recuerdos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearApp } from './servidor.mjs';
import { abrirDB } from './db.mjs';
import { crearRecompensas, PRECIO_FLOR, METAS } from './recompensas.mjs';

let dir, app, srv, base;
const tokens = {};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vp-recompensas-'));
  app = await crearApp({ datos: dir, demo: true, claveAdmin: 'clave-rec', registrar: () => {} });
  srv = createServer(app.manejar);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
  for (const [quien, codigo] of [['leo', '123456'], ['mama', '222222'], ['sara', '444444'], ['papaSara', '555555']]) {
    const r = await pedir('/api/canjear', { metodo: 'POST', cuerpo: { codigo } });
    tokens[quien] = (r.headers.get('set-cookie') || '').split(';')[0];
  }
});
after(async () => { srv.close(); app.cerrar(); await rm(dir, { recursive: true, force: true }); });

function pedir(ruta, { quien, metodo = 'GET', cuerpo } = {}) {
  const h = {};
  if (quien) h.cookie = tokens[quien];
  if (metodo !== 'GET') h['x-vp'] = '1';
  if (cuerpo) h['content-type'] = 'application/json';
  return fetch(base + ruta, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
}
const ventana = async (quien) => (await pedir('/api/ventana', { quien })).json();
const jardin = async (quien) => (await pedir('/api/ventana/jardin', { quien })).json();

test('la demo arranca con estrellas para Leo y un jardín con flores y recuerdos anónimos', async () => {
  const v = await ventana('leo');
  assert.equal(v.recompensas.estrellas, 8);
  assert.equal(v.recompensas.precio, PRECIO_FLOR);
  const j = await jardin('leo');
  assert.equal(j.total, 7);
  assert.equal(j.recuerdos, 3, 'flores sin dueño: recuerdos de niños que ya se fueron a casa');
  assert.ok(j.catalogo.rosa.colores.roja);
  assert.deepEqual(j.companeros.map((c) => c.alias), ['Leo', 'Nico', 'Sara'], 'orden alfabético, no un ranking');
  assert.equal(j.companeros.find((c) => c.alias === 'Sara').regalos, 1);
  assert.equal(j.metas.conseguidas.length, 1);
  assert.equal(j.metas.siguiente.flores, METAS[1].flores);
  for (const f of j.flores) assert.equal(f.id.length > 0 && 'espacio_id' in f, false, 'sin ids de espacios en la vista');
});

test('sin 10 estrellas no se planta; una postal de un amigo da 2 y llega la primera flor', async () => {
  assert.equal((await pedir('/api/ventana/flor', { quien: 'leo', metodo: 'POST', cuerpo: { tipo: 'rosa', color: 'roja' } })).status, 400);

  // Sara manda una postal-acertijo a Leo; la aprueba su padre.
  const leoId = (await ventana('sara')).planta.find((x) => x.alias === 'Leo').id;
  await pedir('/api/ventana/planta', { quien: 'sara', metodo: 'POST', cuerpo: { para: leoId, tipo: 'postal', texto: '¡Mira la torre!' } });
  const pend = (await (await pedir('/api/aprobar', { quien: 'papaSara' })).json()).planta[0];
  await pedir('/api/aprobar/planta', { quien: 'papaSara', metodo: 'POST', cuerpo: { id: pend.id, decision: 'aprobar' } });

  const postal = (await ventana('leo')).planta.find((x) => x.alias === 'Sara').mensajes.find((m) => m.tipo === 'postal');
  const r = await (await pedir(`/api/ventana/planta/${postal.id}/postal`, { quien: 'leo', metodo: 'POST', cuerpo: { donde: postal.opciones.find((o) => o.startsWith('París')) } })).json();
  assert.equal(r.acierto, true);
  assert.deepEqual(r.estrellas, { ganadas: 2, total: 10 });
  const otra = await (await pedir(`/api/ventana/planta/${postal.id}/postal`, { quien: 'leo', metodo: 'POST', cuerpo: { donde: postal.opciones.find((o) => o.startsWith('París')) } })).json();
  assert.equal(otra.estrellas.ganadas, 0, 'una postal resuelta no da estrellas dos veces');

  assert.equal((await pedir('/api/ventana/flor', { quien: 'leo', metodo: 'POST', cuerpo: { tipo: 'rosa', color: 'verde-neón' } })).status, 400, 'solo colores del catálogo');
  const f = await (await pedir('/api/ventana/flor', { quien: 'leo', metodo: 'POST', cuerpo: { tipo: 'rosa', color: 'morada' } })).json();
  assert.equal(f.ok, true);
  assert.equal(f.total, 0);
  assert.equal(f.flor.mia, true);
  assert.equal(f.flor.alias, 'Leo');
  assert.ok(f.flor.x >= 0 && f.flor.x <= 100);
  const j = await jardin('sara');
  assert.equal(j.total, 8);
  assert.equal(j.companeros.find((c) => c.alias === 'Leo').flores, 1);
});

test('regalo: Leo manda 2 estrellas a Sara por su postal, una sola vez y solo si la resolvió', async () => {
  const postal = (await ventana('leo')).planta.find((x) => x.alias === 'Sara').mensajes.find((m) => m.tipo === 'postal');
  assert.equal(postal.regalado, false);
  const antes = (await ventana('sara')).recompensas.estrellas;
  const r = await pedir('/api/ventana/regalo', { quien: 'leo', metodo: 'POST', cuerpo: { mensajeId: postal.id } });
  assert.equal(r.status, 200);
  assert.equal((await ventana('sara')).recompensas.estrellas, antes + 2);
  assert.equal((await pedir('/api/ventana/regalo', { quien: 'leo', metodo: 'POST', cuerpo: { mensajeId: postal.id } })).status, 400, 'una vez por postal');
  assert.equal((await ventana('leo')).planta.find((x) => x.alias === 'Sara').mensajes.find((m) => m.id === postal.id).regalado, true);
  assert.equal((await pedir('/api/ventana/regalo', { quien: 'sara', metodo: 'POST', cuerpo: { mensajeId: postal.id } })).status, 404, 'no te regalas a ti mismo');
  const j = await jardin('leo');
  assert.equal(j.companeros.find((c) => c.alias === 'Leo').regalos, 1);
});

test('al alta las estrellas se borran y las flores quedan en el jardín como recuerdo sin alias', () => {
  const repo = abrirDB(':memory:');
  const { espacios } = repo.asegurarDemo();
  const rec = crearRecompensas(repo);
  rec.sembrarDemo(espacios);
  const [leo, sara] = espacios;
  for (let i = 0; i < 5; i++) rec.ganar(leo, 'amigo', `m${i}`);
  assert.equal(rec.saldo(leo), 18);
  assert.equal(rec.plantar(leo, 'girasol', 'amarillo').ok, true);
  assert.equal(rec.plantar(leo, 'girasol', 'amarillo').ok, false, 'quedan 8: no llega');
  repo.borrarEspacio(leo, 'panel');
  assert.equal(repo.db.prepare('SELECT COUNT(*) AS n FROM estrellas WHERE espacio_id = ?').get(leo).n, 0);
  const j = rec.jardin(sara);
  assert.equal(j.total, 8);
  assert.equal(j.flores.filter((f) => f.tipo === 'girasol' && !f.alias).length, 1, 'el girasol de Leo sigue, sin nombre');
  repo.db.close();
});

test('reiniciar la demo deja a Leo con 8 estrellas y el jardín de ejemplo', () => {
  const repo = abrirDB(':memory:');
  const { espacios } = repo.asegurarDemo();
  const rec = crearRecompensas(repo);
  rec.sembrarDemo(espacios);
  rec.ganar(espacios[0], 'amigo', 'x');
  rec.plantar(espacios[0], 'rosa', 'roja');
  rec.reiniciarDemo(espacios);
  assert.equal(rec.saldo(espacios[0]), 8);
  assert.equal(rec.jardin(espacios[0]).total, 7);
  repo.db.close();
});
