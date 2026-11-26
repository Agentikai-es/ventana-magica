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

test('«no sé» o «sorpréndeme»: tres sugerencias distintas, primero con un amigo de la planta y con el cielo de la hora', async () => {
  const { sugerir, esNoSe } = await import('./escenario.js');
  assert.ok(esNoSe('No sé qué pedir') && esNoSe('¡sorpréndeme!') && !esNoSe('una playa'));
  const r = interpretar('no sé');
  assert.equal(r.tipo, 'alternativas');
  assert.equal(r.alternativas.length, 3);
  const s = sugerir({ avatar: 'zorrito', amigos: [{ id: 'x', alias: 'Sara', ambiente: 'paris' }], visitados: ['playa'], hora: 22, semilla: 3 });
  assert.equal(s.length, 3);
  assert.equal(s[0].ambiente, 'paris');
  assert.equal(s[0].conAmigo.alias, 'Sara');
  assert.equal(new Set(s.map((e) => e.ambiente)).size, 3);
  assert.ok(s.every((e) => e.momento === 'noche' && e.avatar === 'zorrito'));
  assert.ok(!s.some((e) => e.ambiente === 'playa'), 'propone sitios nuevos para él');
});

test('mundo sin límites: más de 30 lugares y miles de combinaciones, todos válidos y con decorado', async () => {
  const { MOMENTOS, CLIMAS, AVATARES } = await import('./catalogo.js');
  const { componerEscena } = await import('./escena.js');
  const lugares = Object.keys(AMBIENTES);
  assert.ok(lugares.length >= 30);
  assert.ok(lugares.length * Object.keys(MOMENTOS).length * Object.keys(CLIMAS).length * Object.keys(AVATARES).length > 5000);
  for (const id of lugares) assert.ok(componerEscena(construirEscenario(id)).capas[2].svg.length > 0, `${id} tiene decorado`);
  assert.equal(interpretar('llévame a la Gran Muralla China').ambiente, 'china');
  assert.equal(interpretar('quiero ir a Zaragoza a ver el Ebro').ambiente, 'zaragoza');
  assert.equal(interpretar('un panda').ambiente, 'china');
});

test('escena personalizada: personajes y cosas del catálogo, máximo 6, posiciones dentro de la escena', () => {
  const e = construirEscenario('playa', {
    personalizado: true, personajes: ['dragon_amable', 'inventado', 'dragon_amable', 'gatito'], objetos: ['globo', '<img>', 'helado'],
    pos: { 'p:dragon_amable': { x: 150, y: -20 }, 'p:gatito': { x: 30, y: 40 }, 'o:globo': { x: 'a', y: 1 }, avatar: { x: 10, y: 85 }, 'p:otro': { x: 5, y: 5 } },
  });
  assert.deepEqual(e.personajes, ['dragon_amable', 'gatito'], 'solo del catálogo y sin repetir');
  assert.deepEqual(e.objetos, ['globo', 'helado']);
  assert.deepEqual(e.pos['p:dragon_amable'], { x: 96, y: 10 }, 'se recorta al borde');
  assert.equal(e.pos['o:globo'], undefined, 'valores no numéricos fuera');
  assert.equal(e.pos['p:otro'], undefined, 'solo piezas que están en la escena');
  assert.deepEqual(e.pos.avatar, { x: 10, y: 85 });
  const muchos = construirEscenario('playa', { personalizado: true, personajes: Object.keys(PERSONAJES), objetos: Object.keys(OBJETOS) });
  assert.equal(muchos.personajes.length, 6); assert.equal(muchos.objetos.length, 6);
  const vacio = construirEscenario('playa', { personalizado: true, personajes: [], objetos: [] });
  assert.deepEqual(vacio.personajes, [], 'puede quitar a todos');
  const normal = construirEscenario('playa');
  assert.deepEqual(normal.objetos, AMBIENTES.playa.objetos, 'sin personalizar, lo que trae el lugar');
  assert.deepEqual(ajustar(e, { momento: 'noche' }).pos, e.pos, 'cambiar el cielo no pierde lo colocado');
});
