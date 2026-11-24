import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPuzle, añadirAporte, aprobarAporte, rechazarAporte, piezasVisibles, ESTADO } from './puzle.js';

const ok = { tipo: 'image/png', autor: 'Amigo 1', permisoEscrito: true };

test('un aporte nuevo queda pendiente y no es visible', () => {
  let p = crearPuzle(3);
  const r = añadirAporte(p, ok);
  assert.equal(r.ok, true);
  assert.equal(r.aporte.estado, ESTADO.PENDIENTE);
  assert.equal(piezasVisibles(r.puzle).length, 0);
});

test('sin permiso escrito no se acepta', () => {
  const r = añadirAporte(crearPuzle(), { ...ok, permisoEscrito: false });
  assert.deepEqual(r, { ok: false, error: 'sin_permiso' });
});

test('formato no válido no se acepta', () => {
  const r = añadirAporte(crearPuzle(), { ...ok, tipo: 'application/pdf' });
  assert.deepEqual(r, { ok: false, error: 'formato' });
});

test('al aprobar, la pieza aparece', () => {
  let p = añadirAporte(crearPuzle(), ok).puzle;
  p = aprobarAporte(p, 1).puzle;
  assert.equal(piezasVisibles(p).length, 1);
});

test('rechazado no aparece y no se puede aprobar después', () => {
  let p = añadirAporte(crearPuzle(), ok).puzle;
  p = rechazarAporte(p, 1).puzle;
  assert.equal(piezasVisibles(p).length, 0);
  assert.deepEqual(aprobarAporte(p, 1), { ok: false, error: 'ya_decidido' });
});

test('aprobar un id que no existe falla', () => {
  assert.deepEqual(aprobarAporte(crearPuzle(), 99), { ok: false, error: 'no_existe' });
});

test('el puzle no muestra más piezas que su total', () => {
  let p = crearPuzle(2);
  for (let i = 0; i < 3; i++) p = añadirAporte(p, ok).puzle;
  for (let i = 1; i <= 3; i++) p = aprobarAporte(p, i).puzle;
  assert.equal(piezasVisibles(p).length, 2);
});
