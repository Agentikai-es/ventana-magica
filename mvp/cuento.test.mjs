import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirCuento, MARCA } from './cuento.js';

const base = 'Había una vez un zorro. Un día llegó ' + MARCA + ' al bosque.';

test('sin aportes, quita el hueco', () => {
  assert.equal(construirCuento(base, []), 'Había una vez un zorro. Un día llegó  al bosque.');
});

test('con un aporte, lo mete en el hueco', () => {
  const t = construirCuento(base, [{ autor: 'Lucía' }]);
  assert.match(t, /un dibujo de Lucía/);
  assert.ok(!t.includes(MARCA));
});

test('sin marca, devuelve el texto tal cual', () => {
  assert.equal(construirCuento('Hola', [{ autor: 'x' }]), 'Hola');
});

test('texto vacío o no válido devuelve cadena vacía', () => {
  assert.equal(construirCuento('', []), '');
  assert.equal(construirCuento(undefined, []), '');
});
