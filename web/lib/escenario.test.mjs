import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpretar, construirEscenario, alternativasSeguras, ajustar } from './escenario.js';
import { AMBIENTES, PERSONAJES, OBJETOS, AVATARES, MARCAS, normalizar } from './catalogo.js';

const { peticiones } = JSON.parse(readFileSync(new URL('../../evals/peticiones.json', import.meta.url), 'utf8'));

function esEscenarioValido(e) {
  assert.equal(e.tipo, 'escenario');
  assert.ok(AMBIENTES[e.ambiente], `ambiente ${e.ambiente}`);
  assert.equal(e.paleta.length, 2);
  assert.ok(e.personajes.length >= 1 && e.personajes.length <= 3);
  for (const p of e.personajes) assert.ok(PERSONAJES[p], `personaje ${p}`);
  for (const o of e.objetos) assert.ok(OBJETOS[o], `objeto ${o}`);
  assert.ok(AVATARES[e.avatar], `avatar ${e.avatar}`);
  assert.equal(e.rolNino, 'protagonista');
  assert.ok(e.papel && e.sonido && e.nombre);
}

function sinMarcas(obj) {
  const texto = normalizar(JSON.stringify(obj));
  for (const marca of Object.keys(MARCAS)) {
    assert.ok(!` ${texto} `.includes(` ${marca} `), `aparece la marca «${marca}»`);
  }
}

test('las 10 peticiones de evals/peticiones.json dan el resultado esperado', () => {
  assert.equal(peticiones.length, 10);
  for (const p of peticiones) {
    const r = interpretar(p.frase);
    assert.equal(r.tipo, p.esperado.tipo, `#${p.id} «${p.frase}»`);
    if (r.tipo === 'escenario') {
      esEscenarioValido(r);
      assert.equal(r.ambiente, p.esperado.ambiente, `#${p.id}`);
      for (const pj of p.esperado.personajes || []) assert.ok(r.personajes.includes(pj), `#${p.id} falta ${pj}`);
      if (p.esperado.sustituido) assert.equal(r.sustituido, true, `#${p.id}`);
    } else {
      assert.equal(r.motivo, p.esperado.motivo, `#${p.id}`);
      assert.equal(r.alternativas.length, 3);
      r.alternativas.forEach(esEscenarioValido);
    }
    for (const palabra of p.prohibido || []) {
      assert.ok(!JSON.stringify(r).toLowerCase().includes(palabra), `#${p.id} contiene «${palabra}»`);
    }
    sinMarcas(r);
  }
});

test('el pedido sale primero en la lista de personajes', () => {
  assert.equal(interpretar('un castillo con un unicornio').personajes[0], 'unicornio');
});

test('personaje sin lugar lleva a su casa', () => {
  assert.equal(interpretar('quiero ver dinosaurios').ambiente, 'selva');
  assert.equal(interpretar('una ballena').ambiente, 'mar');
});

test('el primer lugar nombrado manda', () => {
  assert.equal(interpretar('un castillo en el espacio').ambiente, 'castillo');
});

test('contenido violento o de miedo da 3 alternativas seguras', () => {
  for (const frase of ['quiero matar zombis', 'un castillo que dé miedo', 'una pelea con pistolas']) {
    const r = interpretar(frase);
    assert.equal(r.tipo, 'alternativas', frase);
    assert.equal(r.motivo, 'contenido');
    assert.equal(r.alternativas.length, 3);
  }
});

test('frase vacía o rara nunca lanza error', () => {
  for (const f of ['', '   ', undefined, null, 42, {}, '¿¿??', 'x'.repeat(5000)]) {
    const r = interpretar(f);
    assert.equal(r.tipo, 'alternativas');
    assert.equal(r.alternativas.length, 3);
  }
});

test('alternativas: 3 distintas y deterministas', () => {
  const a = alternativasSeguras('hola');
  assert.equal(new Set(a.map((e) => e.ambiente)).size, 3);
  assert.deepEqual(a, alternativasSeguras('hola'));
});

test('avatar elegido se respeta; avatar inventado no', () => {
  assert.equal(interpretar('playa', { avatar: 'pinguino' }).avatar, 'pinguino');
  assert.equal(interpretar('playa', { avatar: 'foto_real' }).avatar, AMBIENTES.playa.avatar);
});

test('todos los ambientes del catálogo dan escenario válido', () => {
  for (const id of Object.keys(AMBIENTES)) esEscenarioValido(construirEscenario(id));
});

test('las marcas apuntan a personajes originales que existen', () => {
  for (const [marca, id] of Object.entries(MARCAS)) assert.ok(PERSONAJES[id], `${marca} → ${id}`);
  for (const p of Object.values(PERSONAJES)) assert.ok(AMBIENTES[p.casa], p.nombre);
});

test('el escenario no guarda la frase del niño', () => {
  const r = interpretar('quiero un castillo secreto llamado Pepito');
  assert.ok(!JSON.stringify(r).toLowerCase().includes('pepito'));
});

test('ningún personaje se confunde con un avatar (emoji distinto)', () => {
  const deAvatar = new Set(Object.values(AVATARES).map((a) => a.emoji));
  for (const p of Object.values(PERSONAJES)) assert.ok(!deAvatar.has(p.emoji), p.nombre);
});

test('lugares del mundo: «torre Eiffel» lleva a París, no al castillo', () => {
  assert.equal(interpretar('quiero ver la torre Eiffel').ambiente, 'paris');
  assert.equal(interpretar('las pirámides de Egipto').ambiente, 'egipto');
  assert.equal(interpretar('quiero ir al polo norte con un oso polar').ambiente, 'polo');
  assert.equal(interpretar('una torre de un castillo').ambiente, 'castillo');
});

test('héroes de marca → héroes originales, sin nombrar la marca', () => {
  const r = interpretar('quiero ser Iron Man');
  assert.equal(r.ambiente, 'ciudad');
  assert.equal(r.personajes[0], 'heroe_armadura');
  assert.equal(r.sustituido, true);
  assert.ok(!JSON.stringify(r).toLowerCase().includes('iron'));
  assert.equal(interpretar('Spider-Man').personajes[0], 'trepamuros');
});

test('cielo: «que sea de noche» ajusta el escenario sin cambiar de lugar', () => {
  const r = interpretar('que sea de noche y que llueva');
  assert.deepEqual(r, { tipo: 'ajuste', momento: 'noche', clima: 'lluvia' });
  const base = interpretar('playa con tortugas');
  const noche = ajustar(base, r);
  assert.equal(noche.ambiente, 'playa');
  assert.equal(noche.momento, 'noche');
  assert.equal(noche.clima, 'lluvia');
  assert.deepEqual(noche.personajes, base.personajes);
});

test('cielo dentro de la petición: «una playa con nieve de noche»', () => {
  const r = interpretar('una playa con nieve de noche');
  assert.equal(r.ambiente, 'playa');
  assert.equal(r.momento, 'noche');
  assert.equal(r.clima, 'nieve');
  assert.equal(interpretar('fiesta en el castillo').clima, 'confeti');
});
