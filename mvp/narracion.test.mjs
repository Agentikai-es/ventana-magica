import { test } from 'node:test';
import assert from 'node:assert/strict';
import { narrar, limpiarApodo } from './narracion.js';
import { interpretar } from './escenario.js';
import { componerEscena } from './escena.js';
import { MARCAS, normalizar } from './catalogo.js';

function frases(t) {
  return t.split(/(?<=[.?!])\s+/).filter(Boolean);
}

test('el escenario se narra en 3–4 frases con el niño como protagonista', () => {
  const t = narrar(interpretar('castillo con dragones'));
  const n = frases(t).length;
  assert.ok(n >= 3 && n <= 4, `${n} frases: ${t}`);
  assert.match(t, /tú eres quien guarda la llave dorada/);
  assert.match(t, /Dragón Amable/);
});

test('con apodo, lo usa; sin apodo, «tú»', () => {
  assert.match(narrar(interpretar('playa'), { apodo: 'Pecas' }), /Hoy, Pecas, eres/);
  assert.match(narrar(interpretar('playa')), /Hoy tú eres/);
});

test('el apodo se limpia: sin símbolos ni textos largos', () => {
  assert.equal(limpiarApodo('<b>Pecas</b>'), 'bPecasb');
  assert.equal(limpiarApodo('Ñoño 123!'), 'Ñoño');
  assert.ok(limpiarApodo('a'.repeat(40)).length <= 15);
  assert.equal(limpiarApodo(undefined), '');
});

test('alternativas: propone las 3 por su nombre', () => {
  const r = interpretar('quiero ir a un supermercado');
  const t = narrar(r);
  for (const a of r.alternativas) assert.ok(t.includes(a.nombre), a.nombre);
  assert.match(t, /\?$/);
});

test('contenido de miedo: mensaje tranquilo, sin repetir la petición', () => {
  const t = narrar(interpretar('quiero matar zombis'));
  assert.match(t, /tranquila/);
  assert.ok(!/zombi|matar/i.test(t));
});

test('la narración nunca nombra una marca', () => {
  for (const f of ['Quiero ser Spider-Man', 'Elsa de Frozen', 'los Avengers', 'Pikachu', 'Nemo en el mar']) {
    const t = ` ${normalizar(narrar(interpretar(f)))} `;
    for (const m of Object.keys(MARCAS)) assert.ok(!t.includes(` ${m} `), `«${f}» nombra ${m}`);
  }
});

test('entrada no válida devuelve cadena vacía', () => {
  assert.equal(narrar(null), '');
  assert.equal(narrar(undefined), '');
});

test('la escena tiene las 5 capas en orden y el avatar delante', () => {
  const e = componerEscena(interpretar('espacio', { avatar: 'astronauta' }));
  assert.deepEqual(e.capas.map((c) => c.capa), ['fondo', 'decorado', 'objetos', 'personajes', 'avatar']);
  assert.match(e.capas[0].css, /linear-gradient/);
  assert.ok(e.capas[1].svg.length > 0);
  assert.equal(e.capas[4].item.emoji, '🧑‍🚀');
  assert.equal(componerEscena(interpretar('supermercado')), null);
});
