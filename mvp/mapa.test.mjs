import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paisajeDesde, PAISAJES } from './mapa.js';

test('palabras directas', () => {
  assert.equal(paisajeDesde('playa'), 'playa');
  assert.equal(paisajeDesde('quiero ir al bosque'), 'bosque');
});

test('sinónimos y tildes', () => {
  assert.equal(paisajeDesde('montana'), 'montana');
  assert.equal(paisajeDesde('la montaña, por favor'), 'montana');
  assert.equal(paisajeDesde('ver las estrellas'), 'espacio');
});

test('mayúsculas y signos', () => {
  assert.equal(paisajeDesde('¡PLAYA!'), 'playa');
});

test('palabra desconocida o vacía devuelve null', () => {
  assert.equal(paisajeDesde('dinosaurio'), null);
  assert.equal(paisajeDesde(''), null);
  assert.equal(paisajeDesde(undefined), null);
});

test('la noche sola no elige el mar', () => {
  assert.equal(paisajeDesde('de noche'), null);
});

test('cada paisaje tiene nombre y dos colores', () => {
  for (const p of Object.values(PAISAJES)) {
    assert.ok(p.nombre);
    assert.equal(p.color.length, 2);
  }
});
