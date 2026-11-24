// Pruebas de punta a punta del servidor local (HTTP real, SQLite real, ffmpeg real).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearApp } from './servidor.mjs';

let dir, app, servidor, base;
const CLAVE = 'clave-de-prueba';

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vp-test-'));
  app = await crearApp({ datos: dir, claveAdmin: CLAVE, registrar: () => {} });
  servidor = createServer(app.manejar);
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  servidor.close();
  app.cerrar();
  await rm(dir, { recursive: true, force: true });
});

function cookieDe(res) {
  return (res.headers.get('set-cookie') || '').split(';')[0];
}

async function pedir(ruta, { cookie, metodo = 'GET', cuerpo, tipo, cabeceras = {}, csrf = true } = {}) {
  const h = { ...cabeceras };
  if (cookie) h.cookie = cookie;
  if (csrf && metodo !== 'GET') h['x-vp'] = '1';
  let body = cuerpo;
  if (cuerpo && !Buffer.isBuffer(cuerpo)) { body = JSON.stringify(cuerpo); h['content-type'] = 'application/json'; }
  if (tipo) h['content-type'] = tipo;
  return fetch(base + ruta, { method: metodo, headers: h, body, redirect: 'manual' });
}

// JPEG real con un bloque EXIF falso que contiene «GPS-SECRETO».
function jpegConExif() {
  const f = join(dir, 'prueba.jpg');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=orange:s=320x240', '-frames:v', '1', f]);
  const jpg = execFileSync('cat', [f]);
  const carga = Buffer.from('Exif\0\0GPS-SECRETO-41.65N-0.88W');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, carga.length + 2]), carga]);
  return Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)]);
}

let admin, enlaces, galletas = {};

test('el panel exige la clave, enviada en el cuerpo y no en la URL', async () => {
  assert.equal((await pedir('/api/panel')).status, 401);
  assert.equal((await pedir('/api/panel/entrar', { metodo: 'POST', cuerpo: { clave: 'mala' } })).status, 401);
  const r = await pedir('/api/panel/entrar', { metodo: 'POST', cuerpo: { clave: CLAVE } });
  assert.equal(r.status, 200);
  admin = cookieDe(r);
  assert.ok(!admin.includes(CLAVE), 'la cookie es una sesión, no la clave');
  assert.equal((await pedir('/api/panel', { cookie: admin })).status, 200);
});

test('crear un espacio exige registrar el consentimiento', async () => {
  const r = await pedir('/api/panel/espacios', { cookie: admin, metodo: 'POST', cuerpo: { alias: 'Ana', avatar: 'osito' } });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'consentimiento');
});

test('crear espacio: alias limpio y 4 accesos con enlace y código', async () => {
  const r = await pedir('/api/panel/espacios', { cookie: admin, metodo: 'POST', cuerpo: { alias: 'Leo<script>', avatar: 'zorrito', dias: 30, aportadores: 'Familia, Clase', consentimientoRef: 'Hoja 2026-11-24-01' } });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.accesos.length, 4);
  enlaces = Object.fromEntries(d.accesos.map((a) => [a.etiqueta, a]));
  for (const a of d.accesos) {
    assert.match(a.codigo, /^\d{6}$/);
    assert.match(a.enlace, /\/t\/[\w-]{20,}$/);
    assert.equal(a.token, undefined);
  }
  const lista = await (await pedir('/api/panel', { cookie: admin })).json();
  assert.equal(lista.espacios[0].alias, 'Leoscript');
});

test('avatar inventado o alias vacío se rechazan', async () => {
  assert.equal((await pedir('/api/panel/espacios', { cookie: admin, metodo: 'POST', cuerpo: { alias: 'Ana', avatar: 'foto', consentimientoRef: 'x' } })).status, 400);
  assert.equal((await pedir('/api/panel/espacios', { cookie: admin, metodo: 'POST', cuerpo: { alias: '123', avatar: 'osito', consentimientoRef: 'x' } })).status, 400);
});

test('el enlace de invitación pone la cookie y lleva a su pantalla', async () => {
  const r = await pedir(new URL(enlaces.Tablet.enlace).pathname);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/ventana');
  galletas.ventana = cookieDe(r);
  assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const t = await pedir(new URL(enlaces['Adulto de confianza'].enlace).pathname);
  galletas.tutor = cookieDe(t);
});

test('el código de 6 cifras se canjea una sola vez', async () => {
  const r = await pedir('/api/canjear', { metodo: 'POST', cuerpo: { codigo: enlaces.Familia.codigo } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).destino, '/enviar');
  galletas.familia = cookieDe(r);
  const otra = await pedir('/api/canjear', { metodo: 'POST', cuerpo: { codigo: enlaces.Familia.codigo } });
  assert.equal(otra.status, 400);
});

test('sin la cabecera anti-CSRF no se cambia nada', async () => {
  const r = await pedir('/api/ventana/postal', { cookie: galletas.ventana, metodo: 'POST', csrf: false });
  assert.equal(r.status, 403);
});

test('cada rol solo entra en lo suyo', async () => {
  assert.equal((await pedir('/api/aprobar', { cookie: galletas.familia })).status, 401);
  assert.equal((await pedir('/api/ventana', { cookie: galletas.tutor })).status, 401);
  assert.equal((await pedir('/api/ventana')).status, 401);
});

test('la ventana guarda solo escenarios del catálogo', async () => {
  const ok = await pedir('/api/ventana/escena', { cookie: galletas.ventana, metodo: 'PUT', cuerpo: { ambiente: 'playa', personajes: ['tortuga_sabia', 'inventado'] } });
  assert.equal(ok.status, 200);
  const esc = await ok.json();
  assert.equal(esc.ambiente, 'playa');
  assert.ok(!esc.personajes.includes('inventado'));
  const mal = await pedir('/api/ventana/escena', { cookie: galletas.ventana, metodo: 'PUT', cuerpo: { ambiente: 'supermercado' } });
  assert.equal(mal.status, 400);
});

let fotoId;

test('foto de la familia: se quitan los metadatos y queda pendiente', async () => {
  const r = await pedir('/api/enviar', {
    cookie: galletas.familia, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg',
    cabeceras: { 'x-texto': encodeURIComponent('Toby en el parque <b>') },
  });
  assert.equal(r.status, 200);
  const f = await r.json();
  fotoId = f.id;
  assert.equal(f.estado, 'pendiente');
  assert.equal(f.texto, 'Toby en el parque b');
  const archivos = (await readdir(join(dir, 'fotos'))).filter((x) => x.endsWith('.jpg'));
  assert.equal(archivos.length, 1);
  const guardada = await readFile(join(dir, 'fotos', archivos[0]));
  assert.ok(!guardada.includes('GPS-SECRETO'), 'el EXIF no debe sobrevivir');
});

test('un archivo que no es imagen se rechaza', async () => {
  const r = await pedir('/api/enviar', { cookie: galletas.familia, metodo: 'POST', cuerpo: Buffer.from('%PDF-1.4 hola'), tipo: 'image/jpeg' });
  assert.equal(r.status, 415);
});

test('nada aparece en la ventana sin aprobación', async () => {
  const v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.equal(v.fotos.length, 0);
  assert.equal((await pedir(`/fotos/${fotoId}`, { cookie: galletas.ventana })).status, 404);
  assert.equal((await pedir(`/fotos/${fotoId}`, { cookie: galletas.tutor })).status, 200);
});

test('al aprobar, aparece en la ventana y suma una pieza', async () => {
  const pend = await (await pedir('/api/aprobar', { cookie: galletas.tutor })).json();
  assert.equal(pend.pendientes.length, 1);
  const r = await pedir('/api/aprobar/decidir', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { aporteId: fotoId, decision: 'aprobar' } });
  assert.equal(r.status, 200);
  const v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.equal(v.fotos.length, 1);
  assert.equal(v.fotos[0].juego, 'cerrado');
  assert.equal(v.fotos[0].autor, undefined, 'el niño no sabe aún quién la envió');
  assert.equal(v.puzle.hechas, 0, 'el álbum cuenta solo las fotos descubiertas');
  assert.equal(v.puzle.mensaje, null);
  assert.equal((await pedir(`/fotos/${fotoId}`, { cookie: galletas.ventana })).status, 200);
  const otra = await pedir('/api/aprobar/decidir', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { aporteId: fotoId, decision: 'rechazar' } });
  assert.equal(otra.status, 400);
});

test('ida y vuelta: el niño reacciona y envía su ventana; la familia lo ve', async () => {
  assert.equal((await pedir('/api/ventana/reaccion', { cookie: galletas.ventana, metodo: 'POST', cuerpo: { aporteId: fotoId, emoji: '💣' } })).status, 400);
  assert.equal((await pedir('/api/ventana/reaccion', { cookie: galletas.ventana, metodo: 'POST', cuerpo: { aporteId: fotoId, emoji: '❤️' } })).status, 200);
  assert.equal((await pedir('/api/ventana/postal', { cookie: galletas.ventana, metodo: 'POST' })).status, 200);
  const fam = await (await pedir('/api/enviar', { cookie: galletas.familia })).json();
  assert.equal(fam.mios[0].reaccion, '❤️');
  assert.equal(fam.postales.length, 1);
  assert.equal(fam.postales[0].escena.ambiente, 'playa');
});

// ---------- Juego: puzle → acertijo → descubierta ----------
async function fotoAprobada(cabeceras = {}) {
  const f = await (await pedir('/api/enviar', { cookie: galletas.familia, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg', cabeceras })).json();
  await pedir('/api/aprobar/decidir', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { aporteId: f.id, decision: 'aprobar' } });
  return f.id;
}

test('juego: montar el puzle abre el acertijo con pistas y opciones', async () => {
  const id = await fotoAprobada({ 'x-pistas': encodeURIComponent(JSON.stringify(['Te llevo al cole', 'Hago croquetas', '<b>x</b>', 'cuarta'])), 'x-lugar': encodeURIComponent('desde el parque') });
  assert.equal((await pedir(`/api/ventana/foto/${id}/adivinar`, { cookie: galletas.ventana, metodo: 'POST', cuerpo: { quien: 'Familia' } })).status, 404, 'sin montar el puzle no hay acertijo');
  const v = await (await pedir(`/api/ventana/foto/${id}/puzle`, { cookie: galletas.ventana, metodo: 'POST' })).json();
  assert.equal(v.juego, 'resuelto');
  assert.deepEqual(v.pistas, ['Te llevo al cole', 'Hago croquetas', 'bx/b']);
  assert.equal(v.opciones.quien.length, 3);
  assert.ok(v.opciones.quien.includes('Familia'));
  assert.ok(v.opciones.donde.includes('desde el parque'));
  assert.equal(v.autor, undefined);
  const mal = await (await pedir(`/api/ventana/foto/${id}/adivinar`, { cookie: galletas.ventana, metodo: 'POST', cuerpo: { quien: 'Tu tía', donde: 'desde el parque' } })).json();
  assert.equal(mal.quien, false);
  assert.equal(mal.donde, true);
  assert.equal(mal.foto.juego, 'resuelto');
  const bien = await (await pedir(`/api/ventana/foto/${id}/adivinar`, { cookie: galletas.ventana, metodo: 'POST', cuerpo: { quien: 'familia', donde: 'Desde el parque' } })).json();
  assert.equal(bien.foto.juego, 'descubierto');
  assert.equal(bien.foto.autor, 'Familia');
  assert.equal(bien.foto.lugar, 'desde el parque');
  const est = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.equal(est.puzle.hechas, 1);
});

test('juego: al tercer fallo la foto se descubre igualmente', async () => {
  const id = await fotoAprobada({ 'x-lugar': encodeURIComponent('desde casa') });
  await pedir(`/api/ventana/foto/${id}/puzle`, { cookie: galletas.ventana, metodo: 'POST' });
  let r;
  for (let i = 0; i < 3; i++) r = await (await pedir(`/api/ventana/foto/${id}/adivinar`, { cookie: galletas.ventana, metodo: 'POST', cuerpo: { quien: 'nadie', donde: 'luna' } })).json();
  assert.equal(r.foto.juego, 'descubierto');
  assert.equal(r.foto.autor, 'Familia');
});

// ---------- Chat interno (todo pasa por el adulto) ----------
let familiaId;
test('chat: lo que escribe el niño no sale sin aprobación', async () => {
  const v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  familiaId = v.chats.find((c) => c.nombre === 'Familia').accesoId;
  const m = await (await pedir('/api/ventana/mensaje', { cookie: galletas.ventana, metodo: 'POST', cuerpo: { para: familiaId, texto: '¡Gracias por la foto de Toby!' } })).json();
  assert.equal(m.estado, 'pendiente');
  assert.equal((await (await pedir('/api/enviar', { cookie: galletas.familia })).json()).chat.length, 0);
  const t = await (await pedir('/api/aprobar', { cookie: galletas.tutor })).json();
  assert.equal(t.mensajes.length, 1);
  assert.equal(t.mensajes[0].persona, 'Familia');
  await pedir('/api/aprobar/mensaje', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { id: m.id, decision: 'aprobar' } });
  const fam = await (await pedir('/api/enviar', { cookie: galletas.familia })).json();
  assert.equal(fam.chat.length, 1);
  assert.equal(fam.chat[0].texto, '¡Gracias por la foto de Toby!');
  assert.equal((await pedir('/api/ventana/mensaje', { cookie: galletas.ventana, metodo: 'POST', cuerpo: { para: 'otra-persona', texto: 'hola' } })).status, 400);
});

test('chat: el audio de la familia se convierte y el niño solo lo oye tras aprobarlo', async () => {
  const f = join(dir, 'voz.webm');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'libopus', f]);
  const r = await pedir('/api/enviar/mensaje', { cookie: galletas.familia, metodo: 'POST', cuerpo: await readFile(f), tipo: 'audio/webm' });
  assert.equal(r.status, 200);
  const m = await r.json();
  assert.equal(m.tipo, 'audio');
  assert.equal((await pedir(`/medios/${m.id}`, { cookie: galletas.ventana })).status, 404);
  await pedir('/api/aprobar/mensaje', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { id: m.id, decision: 'aprobar' } });
  const a = await pedir(`/medios/${m.id}`, { cookie: galletas.ventana });
  assert.equal(a.status, 200);
  assert.equal(a.headers.get('content-type'), 'audio/mp4');
});

test('puzle del niño: la familia lo monta y se desbloquea su mensaje secreto', async () => {
  const r = await pedir('/api/ventana/mensaje', { cookie: galletas.ventana, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg',
    cabeceras: { 'x-para': familiaId, 'x-tipo': 'puzle', 'x-secreto': encodeURIComponent('¡Mañana me quitan la vía! 🎉') } });
  assert.equal(r.status, 200);
  const m = await r.json();
  await pedir('/api/aprobar/mensaje', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { id: m.id, decision: 'aprobar' } });
  const antes = (await (await pedir('/api/enviar', { cookie: galletas.familia })).json()).chat.find((x) => x.id === m.id);
  assert.equal(antes.secreto, undefined, 'el secreto no se ve sin montar el puzle');
  assert.equal((await pedir(`/medios/${m.id}`, { cookie: galletas.familia })).status, 200);
  const res = await (await pedir(`/api/enviar/puzle/${m.id}`, { cookie: galletas.familia, metodo: 'POST' })).json();
  assert.equal(res.secreto, '¡Mañana me quitan la vía! 🎉');
  const sin = await pedir('/api/ventana/mensaje', { cookie: galletas.ventana, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg', cabeceras: { 'x-para': familiaId, 'x-tipo': 'puzle' } });
  assert.equal(sin.status, 400, 'un puzle sin mensaje secreto no tiene sentido');
});

test('postal del niño: quien la recibe adivina dónde está hoy para desbloquear el mensaje', async () => {
  await pedir('/api/ventana/escena', { cookie: galletas.ventana, metodo: 'PUT', cuerpo: { ambiente: 'castillo', personajes: ['dragon_amable'] } });
  const m = await (await pedir('/api/ventana/mensaje', { cookie: galletas.ventana, metodo: 'POST', cuerpo: { para: familiaId, tipo: 'postal', texto: 'Hoy he volado en dragón' } })).json();
  assert.equal(m.tipo, 'postal');
  await pedir('/api/aprobar/mensaje', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { id: m.id, decision: 'aprobar' } });
  const oculta = (await (await pedir('/api/enviar', { cookie: galletas.familia })).json()).chat.find((x) => x.id === m.id);
  assert.equal(oculta.texto, '', 'el mensaje no se ve antes de adivinar');
  assert.equal(oculta.escena, undefined);
  assert.equal(oculta.opciones.length, 3);
  assert.ok(oculta.opciones.includes('Castillo de las Nubes'));
  assert.deepEqual(oculta.pistas.personajes.slice(0, 1), ['🐉']);
  const fallo = await (await pedir(`/api/enviar/postal/${m.id}`, { cookie: galletas.familia, metodo: 'POST', cuerpo: { donde: 'Playa del Sol' } })).json();
  assert.equal(fallo.acierto, false);
  assert.equal(fallo.mensaje.texto, '');
  const ok = await (await pedir(`/api/enviar/postal/${m.id}`, { cookie: galletas.familia, metodo: 'POST', cuerpo: { donde: 'castillo de las nubes' } })).json();
  assert.equal(ok.acierto, true);
  assert.equal(ok.mensaje.texto, 'Hoy he volado en dragón');
  assert.equal(ok.mensaje.escena.ambiente, 'castillo');
});

test('vídeo de la familia: se limpia, el puzle usa un fotograma y el vídeo se ve al descubrirlo', async () => {
  for (const [nombre, args, tipo] of [
    ['clip.mp4', ['-c:v', 'libx264', '-pix_fmt', 'yuv420p'], 'video/mp4'],
    ['clip.webm', ['-c:v', 'libvpx'], 'video/webm'], // VP8 no cabe en MP4: obliga a recodificar
  ]) {
    const f = join(dir, nombre);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=10:duration=1', '-metadata', 'location=+41.65-000.88/', ...args, f]);
    const r = await pedir('/api/enviar', { cookie: galletas.familia, metodo: 'POST', cuerpo: await readFile(f), tipo, cabeceras: { 'x-lugar': encodeURIComponent('desde casa') } });
    assert.equal(r.status, 200, nombre);
    const { id } = await r.json();
    await pedir('/api/aprobar/decidir', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { aporteId: id, decision: 'aprobar' } });
    assert.equal((await pedir(`/fotos/${id}`, { cookie: galletas.ventana })).status, 200, 'el fotograma sirve de puzle');
    assert.equal((await pedir(`/video/${id}`, { cookie: galletas.ventana })).status, 404, 'el vídeo espera al acertijo');
    await pedir(`/api/ventana/foto/${id}/puzle`, { cookie: galletas.ventana, metodo: 'POST' });
    for (let i = 0; i < 3; i++) await pedir(`/api/ventana/foto/${id}/adivinar`, { cookie: galletas.ventana, metodo: 'POST', cuerpo: { quien: 'x' } });
    const v = await pedir(`/video/${id}`, { cookie: galletas.ventana });
    assert.equal(v.status, 200);
    const cuerpo = Buffer.from(await v.arrayBuffer());
    assert.ok(!cuerpo.includes('41.65'), 'sin ubicación');
  }
});

test('sin internet: una carta programada no llega hasta su día', async () => {
  const f = await (await pedir('/api/enviar', { cookie: galletas.familia, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg', cabeceras: { 'x-dias': '2' } })).json();
  assert.ok(f.entregarEn > Date.now() + 47 * 3600 * 1000, 'llega en 2 días');
  await pedir('/api/aprobar/decidir', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { aporteId: f.id, decision: 'aprobar' } });
  let v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.ok(!v.fotos.some((x) => x.id === f.id), 'aprobada pero aún no ha llegado');
  assert.equal((await pedir(`/api/ventana/foto/${f.id}/puzle`, { cookie: galletas.ventana, metodo: 'POST' })).status, 200, 'sigue existiendo');
  app.repo.db.prepare('UPDATE aportes SET entregar_en = ? WHERE id = ?').run(Date.now() - 1000, f.id); // pasa el tiempo
  assert.equal(app.repo.cartasQueLlegan(Date.now() - 5000, Date.now()).filter((c) => c.id === f.id).length, 1);
  v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.ok(v.fotos.some((x) => x.id === f.id), 'ya ha llegado');
});

test('sesiones cortas: el puzle puede ser 2×2 para ese niño', async () => {
  let v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.equal(v.lado, 3);
  const id = app.repo.listarEspacios()[0].id;
  await pedir(`/api/panel/espacios/${id}/lado`, { cookie: admin, metodo: 'POST', cuerpo: { lado: 2 } });
  v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.equal(v.lado, 2);
});

test('el tiempo real avisa a la ventana cuando se aprueba una foto', async () => {
  const ctrl = new AbortController();
  const r = await fetch(`${base}/api/eventos?rol=ventana`, { headers: { cookie: galletas.ventana }, signal: ctrl.signal });
  const lector = r.body.getReader();
  await lector.read(); // «retry»
  await pedir('/api/enviar', { cookie: galletas.familia, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg' });
  const pend = await (await pedir('/api/aprobar', { cookie: galletas.tutor })).json();
  await pedir('/api/aprobar/decidir', { cookie: galletas.tutor, metodo: 'POST', cuerpo: { aporteId: pend.pendientes[0].id, decision: 'aprobar' } });
  const { value } = await lector.read();
  assert.match(new TextDecoder().decode(value), /event: foto/);
  ctrl.abort();
});

test('un acceso revocado deja de funcionar', async () => {
  const r = await pedir('/api/panel/accesos', { cookie: admin, metodo: 'POST', cuerpo: { espacioId: (await (await pedir('/api/panel', { cookie: admin })).json()).espacios[0].id, rol: 'aportador', etiqueta: 'Abuela' } });
  const acc = await r.json();
  const entrar = await pedir(new URL(acc.enlace).pathname);
  const g = cookieDe(entrar);
  assert.equal((await pedir('/api/enviar', { cookie: g })).status, 200);
  await pedir(`/api/panel/accesos/${acc.id}/revocar`, { cookie: admin, metodo: 'POST' });
  assert.equal((await pedir('/api/enviar', { cookie: g })).status, 401);
});

test('URLs, cookies y cuerpos malformados no tumban el servidor', async () => {
  assert.equal((await pedir('/%')).status, 404);
  assert.equal((await pedir('/api/%E0%A4%A')).status, 404);
  assert.equal((await pedir('/api/ventana', { cookie: `otra=100%; ${galletas.ventana}` })).status, 200);
  assert.equal((await pedir('/api/canjear', { metodo: 'POST', cuerpo: Buffer.from('null'), tipo: 'application/json' })).status, 400);
  for (const ambiente of ['__proto__', 'constructor', 'toString']) {
    assert.equal((await pedir('/api/ventana/escena', { cookie: galletas.ventana, metodo: 'PUT', cuerpo: { ambiente } })).status, 400, ambiente);
  }
  const t = await pedir('/api/enviar', { cookie: galletas.familia, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg', cabeceras: { 'x-texto': '%E0%A4%A' } });
  assert.equal(t.status, 400);
  assert.equal((await pedir('/api/ventana', { cookie: galletas.ventana })).status, 200, 'sigue vivo');
});

test('la familia puede retirar su propia foto, pero no la de otro', async () => {
  const f = await (await pedir('/api/enviar', { cookie: galletas.familia, metodo: 'POST', cuerpo: jpegConExif(), tipo: 'image/jpeg' })).json();
  assert.equal((await pedir(`/api/enviar/${f.id}`, { cookie: galletas.familia, metodo: 'DELETE' })).status, 200);
  assert.equal((await pedir(`/fotos/${f.id}`, { cookie: galletas.tutor })).status, 404);
  assert.equal((await pedir(`/api/enviar/${fotoId}`, { cookie: galletas.tutor, metodo: 'DELETE' })).status, 401);
});

test('el tutor puede exportar todos los datos del espacio (art. 15 y 20)', async () => {
  const r = await pedir('/api/aprobar/exportar', { cookie: galletas.tutor });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment/);
  const d = await r.json();
  assert.equal(d.espacio.alias, 'Leoscript');
  assert.equal(d.espacio.consentimiento.referencia, 'Hoja 2026-11-24-01');
  assert.ok(d.aportes.length >= 1);
  assert.ok(!JSON.stringify(d).includes('token'), 'sin secretos');
});

test('la auditoría no guarda alias ni nombres', async () => {
  const id = app.repo.listarEspacios()[0].id;
  const txt = JSON.stringify(app.repo.auditoria(id));
  assert.ok(!txt.includes('Leo'), txt);
  assert.ok(!txt.includes('Familia'));
});

test('dos accesos nunca comparten un código vivo', () => {
  const id = app.repo.listarEspacios()[0].id;
  const codigos = new Set();
  for (let i = 0; i < 300; i++) codigos.add(app.repo.crearAcceso(id, 'aportador', `x${i}`).codigo);
  assert.equal(codigos.size, 300);
});

test('al revocar un acceso se corta su conexión en tiempo real', async () => {
  const id = app.repo.listarEspacios()[0].id;
  const acc = await (await pedir('/api/panel/accesos', { cookie: admin, metodo: 'POST', cuerpo: { espacioId: id, rol: 'ventana', etiqueta: 'Tablet 2' } })).json();
  const g = cookieDe(await pedir(new URL(acc.enlace).pathname));
  const r = await fetch(`${base}/api/eventos?rol=ventana`, { headers: { cookie: g } });
  const lector = r.body.getReader();
  await lector.read();
  await pedir(`/api/panel/accesos/${acc.id}/revocar`, { cookie: admin, metodo: 'POST' });
  const { done } = await lector.read();
  assert.equal(done, true);
});

test('no se puede salir de la carpeta web ni leer la base de datos', async () => {
  for (const ruta of ['/../datos/ventana.db', '/%2e%2e/servidor/db.mjs', '/lib/escenario.test.mjs']) {
    assert.equal((await pedir(ruta)).status, 404, ruta);
  }
});

test('demasiados códigos fallidos bloquean la IP un minuto', async () => {
  let ultimo;
  for (let i = 0; i < 12; i++) ultimo = await pedir('/api/canjear', { metodo: 'POST', cuerpo: { codigo: '000000' } });
  assert.equal(ultimo.status, 429);
});

test('«borrar todo» del tutor elimina fotos de la base de datos y del disco', async () => {
  assert.equal((await pedir('/api/aprobar/borrar-todo', { cookie: galletas.tutor, metodo: 'POST' })).status, 200);
  const v = await (await pedir('/api/ventana', { cookie: galletas.ventana })).json();
  assert.equal(v.fotos.length, 0);
  assert.equal((await readdir(join(dir, 'fotos'))).length, 0);
});

test('la limpieza programada borra espacios dados de alta y sus fotos', async () => {
  const futuro = Date.now() + 365 * 24 * 3600 * 1000;
  app.repo.limpiar(futuro);
  assert.equal(app.repo.listarEspacios().length, 0);
  assert.equal((await pedir('/api/ventana', { cookie: galletas.ventana })).status, 401);
});

test('sin internet: la web no carga nada de fuera (ni scripts, ni estilos, ni fuentes, ni imágenes)', async () => {
  const { readdir: ls, readFile: lee } = await import('node:fs/promises');
  const raiz = new URL('../web/', import.meta.url);
  const archivos = [];
  for (const sub of ['', 'lib/']) for (const f of await ls(new URL(sub, raiz))) if (/\.(html|js|css|webmanifest)$/.test(f)) archivos.push(new URL(sub + f, raiz));
  const externo = /(src|href|action)\s*=\s*["']https?:\/\/|from\s+["']https?:\/\/|import\(\s*["']https?:\/\/|url\(\s*["']?https?:\/\/|@import\s+["']?https?:\/\/|fetch\(\s*["'`]https?:\/\//i;
  for (const f of archivos) assert.ok(!externo.test(await lee(f, 'utf8')), `${f.pathname} usa un recurso de internet`);
  assert.ok(archivos.length > 15);
});

test('ligera: la web se sirve comprimida y se revalida sin volver a enviarla', async () => {
  const r = await fetch(`${base}/ventana.js`, { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-encoding'), 'gzip');
  const comprimido = Number(r.headers.get('content-length'));
  const original = (await (await import('node:fs/promises')).readFile(new URL('../web/ventana.js', import.meta.url))).length;
  assert.ok(comprimido < original / 2.5, `${comprimido} de ${original} bytes`);
  const etag = r.headers.get('etag');
  const otra = await fetch(`${base}/ventana.js`, { headers: { 'if-none-match': etag } });
  assert.equal(otra.status, 304);
});

test('modo demo: códigos fijos que no caducan, sirven en varios dispositivos y clave de panel 123456', async () => {
  const d2 = await mkdtemp(join(tmpdir(), 'vp-demo-'));
  const demo = await crearApp({ datos: d2, demo: true, registrar: () => {} });
  const srv = createServer(demo.manejar);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const b = `http://127.0.0.1:${srv.address().port}`;
  const canjear = (codigo) => fetch(`${b}/api/canjear`, { method: 'POST', headers: { 'x-vp': '1', 'content-type': 'application/json' }, body: JSON.stringify({ codigo }) });
  const t1 = await canjear('123456'); const t2 = await canjear('123456');
  assert.equal(t1.status, 200); assert.equal(t2.status, 200, 'el mismo código vale en un segundo dispositivo');
  assert.equal((await t1.json()).destino, '/ventana');
  for (const g of [cookieDe(t1), cookieDe(t2)]) assert.equal((await fetch(`${b}/api/ventana`, { headers: { cookie: g } })).status, 200, 'las dos sesiones siguen vivas');
  assert.equal((await (await canjear('111111')).json()).destino, '/enviar');
  assert.equal((await (await canjear('222222')).json()).destino, '/aprobar');
  const p = await fetch(`${b}/api/panel/entrar`, { method: 'POST', headers: { 'x-vp': '1', 'content-type': 'application/json' }, body: JSON.stringify({ clave: '123456' }) });
  assert.equal(p.status, 200);
  demo.repo.limpiar(Date.now() + 60 * 24 * 3600 * 1000); // pasan dos meses
  assert.equal((await canjear('123456')).status, 200, 'no caduca');
  const otra = await crearApp({ datos: d2, demo: true, registrar: () => {} }); // reiniciar no duplica nada
  assert.equal(otra.repo.listarEspacios().length, 1);
  otra.cerrar(); srv.close(); demo.cerrar();
  await rm(d2, { recursive: true, force: true });
});

test('la caché de la tablet cambia de versión sola cuando cambian los archivos de la web', async () => {
  const sw = await (await fetch(`${base}/sw.js`)).text();
  const v = sw.match(/const VERSION = '(vm-[0-9a-f]{10})';/);
  assert.ok(v, 'el service worker lleva la huella de la web');
  const otra = await (await fetch(`${base}/sw.js`)).text();
  assert.ok(otra.includes(v[1]), 'misma web, misma versión');
});
