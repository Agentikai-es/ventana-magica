// Pruebas de la IA de texto local: nunca sale del catálogo y, sin modelo, la tablet sigue con las reglas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aEscenario, entender, prompt, ESQUEMA } from './ia.mjs';
import { crearApp } from './servidor.mjs';

test('la respuesta de la IA solo vale si son ids del catálogo', () => {
  const e = aEscenario('{"lugar":"polo","momento":"noche","clima":"nieve","personajes":["oso_polar","inventado"]}', { avatar: 'pinguino' });
  assert.equal(e.ambiente, 'polo');
  assert.equal(e.momento, 'noche');
  assert.equal(e.clima, 'nieve');
  assert.ok(e.personajes.includes('oso_polar'));
  assert.ok(!e.personajes.includes('inventado'));
  assert.equal(e.avatar, 'pinguino');
  assert.equal(aEscenario('{"lugar":"marte_oscuro"}'), null, 'un lugar que no existe se descarta');
  assert.equal(aEscenario('esto no es json'), null);
  assert.equal(aEscenario('{"lugar":"playa","momento":"medianoche","clima":"tormenta","personajes":"x"}').momento, 'dia', 'valores raros → por defecto');
});

test('el esquema obliga a elegir del catálogo y el prompt lista los lugares', () => {
  assert.ok(ESQUEMA.properties.lugar.enum.includes('china'));
  assert.ok(ESQUEMA.properties.personajes.items.enum.includes('panda'));
  assert.match(prompt('donde viven los pingüinos'), /polo = Polo Norte/);
  assert.ok(prompt('x'.repeat(500)).length < prompt('').length + 260, 'la frase se recorta');
});

test('entender: usa la IA, y si falla o no sabe devuelve null (la tablet propone alternativas)', async () => {
  const ok = await entender('donde viven los pingüinos', { avatar: 'zorrito', preguntarA: async () => '{"lugar":"polo","momento":"dia","clima":"despejado","personajes":[]}' });
  assert.equal(ok.ambiente, 'polo');
  assert.equal(await entender('algo', { preguntarA: async () => { throw new Error('tarda'); } }), null);
  assert.equal(await entender('', { preguntarA: async () => '{"lugar":"playa"}' }), null);
});

test('sin modelo, /api/ia responde 503 y la ventana dice que no hay IA', async () => {
  process.env.VP_IA = '0';
  const dir = await mkdtemp(join(tmpdir(), 'vp-ia-'));
  const app = await crearApp({ datos: dir, demo: true, registrar: () => {} });
  const srv = createServer(app.manejar);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const b = `http://127.0.0.1:${srv.address().port}`;
  const c = await fetch(`${b}/api/canjear`, { method: 'POST', headers: { 'x-vp': '1', 'content-type': 'application/json' }, body: JSON.stringify({ codigo: '123456' }) });
  const cookie = c.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await fetch(`${b}/api/ventana`, { headers: { cookie } })).json()).ia, false);
  const r = await fetch(`${b}/api/ia`, { method: 'POST', headers: { cookie, 'x-vp': '1', 'content-type': 'application/json' }, body: JSON.stringify({ frase: 'donde viven los pingüinos' }) });
  assert.equal(r.status, 503);
  srv.close(); app.cerrar(); delete process.env.VP_IA;
  await rm(dir, { recursive: true, force: true });
});

test('ideas variables: la IA recibe temas al azar (no texto del niño) y solo vale lo que está en el catálogo', async () => {
  const { idear, TEMAS } = await import('./ia.mjs');
  const vistos = [];
  const respuestas = ['{"lugar":"arrecife","momento":"dia","clima":"burbujas","personajes":["pulpo"]}', '{"lugar":"inventado"}', '{"lugar":"playa"}', '{"lugar":"ordesa","momento":"atardecer","clima":"hojas","personajes":[]}'];
  const ideas = await idear({ avatar: 'zorrito', evitar: ['playa'], preguntarA: async (t) => { vistos.push(t); return respuestas.shift(); } });
  assert.deepEqual(ideas.map((i) => i.ambiente), ['arrecife', 'ordesa'], 'descarta lo inventado y lo que hay que evitar');
  assert.ok(vistos.every((t) => TEMAS.includes(t)));
  assert.deepEqual(await idear({ preguntarA: async () => { throw new Error('sin modelo'); } }), [], 'si la IA falla, no hay ideas y la tablet usa las suyas');
});
