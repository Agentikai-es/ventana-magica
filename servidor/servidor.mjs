// Servidor local de la Ventana Mágica. Sin dependencias: solo Node.js (≥ 22.13).
// Arranque: node servidor/servidor.mjs   (HTTPS si existen certs/cert.pem y certs/key.pem)

import { createServer as crearHttp } from 'node:http';
import { createServer as crearHttps } from 'node:https';
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { networkInterfaces, tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

import { abrirDB, hash, ROLES, EMOJIS_REACCION, PIEZAS_PUZLE } from './db.mjs';
import { crearJuego } from './juego.mjs';
import { transcribir, vozDisponible, calentar, ejecutar, FFMPEG } from './voz.mjs';
import { construirEscenario } from '../web/lib/escenario.js';
import { AVATARES } from '../web/lib/catalogo.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const WEB = join(RAIZ, 'web');
const HORA = 60 * 60 * 1000;

const PAGINAS = {
  '/': 'index.html', '/panel': 'panel.html', '/ventana': 'ventana.html', '/enviar': 'enviar.html',
  '/aprobar': 'aprobar.html', '/privacidad': 'privacidad.html',
};
const DESTINO = { ventana: '/ventana', tutor: '/aprobar', aportador: '/enviar' };
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

class ErrorHttp extends Error {
  constructor(estado, codigo) { super(codigo); this.estado = estado; this.codigo = codigo; }
}

// ---------- Utilidades HTTP ----------
// Los valores de cookie son base64url: no se decodifican (un «%» suelto no puede romper nada).
function cookies(req) {
  const out = {};
  for (const par of (req.headers.cookie || '').split(';')) {
    const i = par.indexOf('=');
    if (i > 0) out[par.slice(0, i).trim()] = par.slice(i + 1).trim();
  }
  return out;
}

function decodificar(texto, codigoError, estado = 400) {
  try { return decodeURIComponent(texto); } catch { throw new ErrorHttp(estado, codigoError); }
}

function leerCuerpo(req, limite) {
  return new Promise((resolve, reject) => {
    const trozos = [];
    let total = 0;
    req.on('data', (t) => {
      total += t.length;
      if (total > limite) { reject(new ErrorHttp(413, 'demasiado_grande')); req.destroy(); return; }
      trozos.push(t);
    });
    req.on('end', () => resolve(Buffer.concat(trozos)));
    req.on('error', reject);
  });
}

async function leerJSON(req) {
  const b = await leerCuerpo(req, 64 * 1024);
  let v;
  try { v = JSON.parse(b.toString('utf8') || '{}'); } catch { throw new ErrorHttp(400, 'json'); }
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function cabecerasSeguridad(res) {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(self), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
}

function json(res, estado, datos) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos));
}

function ipsLocales() {
  return Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
}

const limpiarTexto = (t, max) => String(t ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

// ---------- Aplicación ----------
export async function crearApp({ datos = join(RAIZ, 'datos'), claveAdmin, registrar = console.log, urlsWifi = [], demo = process.env.VP_DEMO === '1' } = {}) {
  const FOTOS = join(datos, 'fotos');
  await mkdir(FOTOS, { recursive: true, mode: 0o700 });
  const repo = abrirDB(join(datos, 'ventana.db'));
  const juego = crearJuego(repo);

  // Clave del panel del hospital: se genera la primera vez y solo se guarda su hash.
  const rutaAdmin = join(datos, 'admin.json');
  let hashAdmin;
  let claveNueva = null;
  // Modo demo: clave del panel fija («123456») y espacio de Leo con códigos fijos. Nunca con niños reales.
  const infoDemo = demo ? repo.asegurarDemo() : null;
  if (demo && !claveAdmin) claveAdmin = '123456';
  if (claveAdmin) hashAdmin = hash(claveAdmin);
  else if (existsSync(rutaAdmin)) hashAdmin = JSON.parse(readFileSync(rutaAdmin, 'utf8')).hash;
  else {
    claveNueva = randomBytes(18).toString('base64url');
    hashAdmin = hash(claveNueva);
    await writeFile(rutaAdmin, JSON.stringify({ hash: hashAdmin }), { mode: 0o600 });
  }
  // Sesiones del panel: token aleatorio en memoria, 12 h. La clave nunca viaja en la URL ni en la cookie.
  const sesionesPanel = new Map();

  // Tiempo real (Server-Sent Events): espacio:rol → conexiones abiertas (cada una sabe su acceso).
  const canales = new Map();
  function avisar(espacioId, rol, evento, datosEvento = {}) {
    for (const res of canales.get(`${espacioId}:${rol}`) || []) {
      res.write(`event: ${evento}\ndata: ${JSON.stringify(datosEvento)}\n\n`);
    }
  }
  // Cierra al momento las conexiones de un acceso revocado o de un espacio borrado.
  function cortar(filtro) {
    for (const conjunto of canales.values()) {
      for (const res of conjunto) if (filtro(res)) { res.end(); conjunto.delete(res); }
    }
  }

  // Límites de uso (en memoria).
  const intentos = new Map();
  function limitar(clave, maximo = 10, ventanaMs = 60_000) {
    const ahora = Date.now();
    const lista = (intentos.get(clave) || []).filter((t) => ahora - t < ventanaMs);
    lista.push(ahora);
    intentos.set(clave, lista);
    if (lista.length > maximo) throw new ErrorHttp(429, 'demasiados_intentos');
  }

  let colaVoz = Promise.resolve(); // la transcripción va de una en una

  async function borrarArchivos(archivos) {
    await Promise.all(archivos.map((a) => rm(join(FOTOS, a), { force: true })));
  }

  async function limpiezaCompleta() {
    await borrarArchivos(repo.limpiar());
    // Restos de subidas interrumpidas (por si el proceso se cayó a mitad).
    for (const f of await readdir(FOTOS)) if (!/\.(jpg|m4a|mp4)$/.test(f)) await rm(join(FOTOS, f), { force: true });
    for (const [t, s] of sesionesPanel) if (s < Date.now()) sesionesPanel.delete(t);
    intentos.clear();
  }
  await limpiezaCompleta();
  // Cartas programadas: cada 30 s se mira si a alguna le ha llegado su hora y se avisa a la tablet.
  let ultimaRevision = Date.now();
  const entregas = setInterval(() => {
    const ahora = Date.now();
    for (const c of repo.cartasQueLlegan(ultimaRevision, ahora)) avisar(c.espacio_id, 'ventana', 'foto', {});
    ultimaRevision = ahora;
  }, 30_000);
  entregas.unref();
  const limpieza = setInterval(() => limpiezaCompleta().catch(() => {}), HORA);
  limpieza.unref();

  function esAdmin(req) {
    const t = cookies(req).vp_admin;
    const caduca = t && sesionesPanel.get(t);
    return !!caduca && caduca > Date.now();
  }

  function acceso(req, rol) {
    const a = repo.accesoPorToken(cookies(req)[`vp_${rol}`]);
    if (!a || a.rol !== rol) throw new ErrorHttp(401, 'sin_acceso');
    return a;
  }

  function ponerCookie(res, req, nombre, valor, segundos = 30 * 86400) {
    const segura = req.socket.encrypted ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${nombre}=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${segundos}${segura}`);
  }

  // Fotos y audios: el original vive en una carpeta temporal aparte y se borra siempre.
  // ffmpeg re-codifica: sin metadatos (GPS, cámara, fecha), tamaño acotado, formato que abre cualquier tablet.
  async function guardarMedio(datos, tipo) {
    const tmp = await mkdtemp(join(tmpdir(), 'vp-medio-'));
    const nombre = `${randomUUID()}.${tipo === 'audio' ? 'm4a' : 'jpg'}`;
    const args = tipo === 'audio'
      ? ['-t', '60', '-vn', '-ac', '1', '-c:a', 'aac', '-b:a', '64k']
      : ['-vf', "scale='min(1280,iw)':-2", '-frames:v', '1', '-q:v', '4'];
    try {
      await writeFile(join(tmp, 'original'), datos, { mode: 0o600 });
      await ejecutar(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(tmp, 'original'), '-map_metadata', '-1', ...args, join(tmp, nombre)], 30000);
      await writeFile(join(FOTOS, nombre), await readFile(join(tmp, nombre)), { mode: 0o600 });
      return nombre;
    } catch {
      throw new ErrorHttp(415, 'formato');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }

  // Vídeo corto (≤ 20 s): se re-empaqueta sin recodificar (rápido incluso en una Raspberry Pi) y sin metadatos.
  // Si el formato no cabe en MP4, se recodifica a 480p. El fotograma sirve de puzle.
  async function leerVideo(req) {
    if (!/^video\//.test(req.headers['content-type'] || '')) throw new ErrorHttp(415, 'formato');
    const datosVideo = await leerCuerpo(req, 40 * 1024 * 1024);
    const tmp = await mkdtemp(join(tmpdir(), 'vp-video-'));
    const base = randomUUID();
    const f = (n) => join(tmp, n);
    const ff = (args) => ejecutar(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], 120000);
    try {
      await writeFile(f('original'), datosVideo, { mode: 0o600 });
      try {
        await ff(['-i', f('original'), '-t', '20', '-map_metadata', '-1', '-c', 'copy', '-movflags', '+faststart', f('v.mp4')]);
      } catch {
        await ff(['-i', f('original'), '-t', '20', '-map_metadata', '-1', '-vf', "scale='min(854,iw)':-2", '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', f('v.mp4')]);
      }
      await ff(['-ss', '0.5', '-i', f('v.mp4'), '-map_metadata', '-1', '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '4', f('p.jpg')]);
      await writeFile(join(FOTOS, `${base}.mp4`), await readFile(f('v.mp4')), { mode: 0o600 });
      await writeFile(join(FOTOS, `${base}.jpg`), await readFile(f('p.jpg')), { mode: 0o600 });
      return { video: `${base}.mp4`, archivo: `${base}.jpg` };
    } catch {
      throw new ErrorHttp(415, 'formato');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }

  async function leerFoto(req) {
    const tipo = (req.headers['content-type'] || '').split(';')[0];
    if (!/^image\/(jpeg|png|webp)$/.test(tipo)) throw new ErrorHttp(415, 'formato');
    const datosFoto = await leerCuerpo(req, 6 * 1024 * 1024);
    const firmas = { 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/webp': [0x52, 0x49, 0x46, 0x46] };
    if (!firmas[tipo].every((b, i) => datosFoto[i] === b)) throw new ErrorHttp(415, 'formato');
    return guardarMedio(datosFoto, 'foto');
  }

  async function leerAudio(req) {
    if (!/^audio\//.test(req.headers['content-type'] || '')) throw new ErrorHttp(415, 'formato');
    const audio = await leerCuerpo(req, 3 * 1024 * 1024);
    if (audio.length < 1000) throw new ErrorHttp(400, 'audio_vacio');
    return guardarMedio(audio, 'audio');
  }

  const cabecera = (req, nombre, max) => limpiarTexto(decodificar(String(req.headers[nombre] || ''), 'texto'), max);

  const fotoPublica = (a) => ({ id: a.id, autor: a.autor, texto: a.texto, reaccion: a.reaccion, creado: a.creado, estado: a.estado, entregarEn: a.entregar_en });

  function estadoVentana(espacioId) {
    const e = repo.espacio(espacioId);
    const aprobadas = repo.aportes(espacioId, { estado: 'aprobado', tipo: 'foto', entregadas: true });
    const fotos = aprobadas.map(juego.vistaNino);
    const hechas = Math.min(aprobadas.filter((a) => a.juego === 'descubierto').length, PIEZAS_PUZLE);
    return {
      alias: e.alias, avatar: e.avatar, escena: e.escena ? JSON.parse(e.escena) : null, fotos, lado: e.lado || 3,
      puzle: { total: PIEZAS_PUZLE, hechas, mensaje: hechas >= PIEZAS_PUZLE ? e.mensaje_puzle : null },
      voz: vozDisponible(), emojis: EMOJIS_REACCION, chats: juego.chatsNino(espacioId),
    };
  }

  // ---------- Rutas de la API ----------
  async function api(req, res, ruta) {
    const m = req.method;
    // Protección CSRF: toda petición que cambia algo lleva esta cabecera (un formulario de otra web no puede ponerla).
    if (m !== 'GET' && req.headers['x-vp'] !== '1') throw new ErrorHttp(403, 'csrf');

    if (ruta === '/api/canjear' && m === 'POST') {
      limitar(`codigo:${req.socket.remoteAddress}`);
      limitar('codigo:global', 60); // detrás de un proxy todos comparten IP: tope global contra fuerza bruta
      const { codigo } = await leerJSON(req);
      const r = repo.canjearCodigo(String(codigo ?? '').replace(/\D/g, ''));
      if (!r) throw new ErrorHttp(400, 'codigo_no_valido');
      ponerCookie(res, req, `vp_${r.rol}`, r.token);
      return json(res, 200, { destino: DESTINO[r.rol] });
    }

    if (ruta === '/api/eventos' && m === 'GET') {
      const rol = new URL(req.url, 'http://x').searchParams.get('rol');
      if (!ROLES.includes(rol)) throw new ErrorHttp(400, 'rol');
      const a = acceso(req, rol);
      const token = cookies(req)[`vp_${rol}`];
      res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
      res.write('retry: 3000\n\n');
      res.accesoId = a.id;
      res.espacioId = a.espacio_id;
      const clave = `${a.espacio_id}:${rol}`;
      if (!canales.has(clave)) canales.set(clave, new Set());
      canales.get(clave).add(res);
      // Cada latido vuelve a comprobar el acceso: si caducó o se revocó, se cierra.
      const latido = setInterval(() => {
        if (!repo.accesoPorToken(token)) { res.end(); canales.get(clave)?.delete(res); return; }
        res.write(': latido\n\n');
      }, 25000);
      req.on('close', () => { clearInterval(latido); canales.get(clave)?.delete(res); });
      return;
    }

    // ----- Ventana (tablet del niño) -----
    if (ruta.startsWith('/api/ventana')) {
      const a = acceso(req, 'ventana');
      if (ruta === '/api/ventana' && m === 'GET') return json(res, 200, estadoVentana(a.espacio_id));
      if (ruta === '/api/ventana/escena' && m === 'PUT') {
        const { ambiente, personajes, avatar, sustituido, momento, clima } = await leerJSON(req);
        const esc = construirEscenario(String(ambiente), { avatar: String(avatar ?? ''), personajes: Array.isArray(personajes) ? personajes.map(String) : [], sustituido: !!sustituido, momento: String(momento ?? 'dia'), clima: String(clima ?? 'despejado') });
        if (!esc) throw new ErrorHttp(400, 'ambiente');
        repo.guardarEscena(a.espacio_id, esc);
        return json(res, 200, esc);
      }
      if (ruta === '/api/ventana/reaccion' && m === 'POST') {
        const { aporteId, emoji } = await leerJSON(req);
        const r = repo.reaccionar(a.espacio_id, String(aporteId), String(emoji));
        if (!r.ok) throw new ErrorHttp(400, r.error);
        avisar(a.espacio_id, 'aportador', 'actualizar');
        return json(res, 200, fotoPublica(r.aporte));
      }
      const mFoto = ruta.match(/^\/api\/ventana\/foto\/([\w-]+)\/(puzle|adivinar)$/);
      if (mFoto && m === 'POST') {
        if (mFoto[2] === 'puzle') {
          const v = juego.puzleResuelto(a.espacio_id, mFoto[1]);
          if (!v) throw new ErrorHttp(404, 'no_existe');
          return json(res, 200, v);
        }
        const { quien, donde } = await leerJSON(req);
        const r = juego.adivinar(a.espacio_id, mFoto[1], { quien: String(quien ?? ''), donde: String(donde ?? '') });
        if (!r) throw new ErrorHttp(404, 'no_existe');
        return json(res, 200, r);
      }
      // El niño escribe, graba o fotografía algo para una persona de fuera (lo aprueba el adulto antes de salir).
      if (ruta === '/api/ventana/mensaje' && m === 'POST') {
        limitar(`msg:${a.id}`, 30, HORA);
        const tipoCont = req.headers['content-type'] || '';
        let para, tipo, texto = '', secreto = '', archivo = null;
        let escena = null;
        if (tipoCont.startsWith('application/json')) {
          const c = await leerJSON(req);
          para = String(c.para ?? ''); tipo = c.tipo === 'postal' ? 'postal' : 'texto'; texto = limpiarTexto(c.texto, 200);
          if (!texto && tipo === 'texto') throw new ErrorHttp(400, 'texto');
        } else {
          para = cabecera(req, 'x-para', 64);
          tipo = cabecera(req, 'x-tipo', 10);
          if (!['audio', 'foto', 'puzle', 'postal'].includes(tipo)) throw new ErrorHttp(400, 'tipo');
          texto = cabecera(req, 'x-texto', 200);
          secreto = tipo === 'puzle' ? cabecera(req, 'x-secreto', 200) : '';
          if (tipo === 'puzle' && !secreto) throw new ErrorHttp(400, 'secreto');
          if (!juego.personasDe(a.espacio_id).some((p) => p.id === para)) throw new ErrorHttp(400, 'para');
          archivo = tipo === 'audio' || tipo === 'postal' ? await leerAudio(req) : await leerFoto(req);
        }
        // Postal-acertijo: lleva el escenario que el niño tiene ahora en su ventana.
        if (tipo === 'postal') {
          const e = repo.espacio(a.espacio_id);
          if (!e.escena) throw new ErrorHttp(400, 'sin_escena');
          escena = JSON.parse(e.escena);
        }
        if (!juego.personasDe(a.espacio_id).some((p) => p.id === para)) throw new ErrorHttp(400, 'para');
        const msg = juego.crearMensaje(a.espacio_id, { accesoId: para, de: 'nino', tipo, texto, secreto, archivo, escena });
        avisar(a.espacio_id, 'tutor', 'pendiente');
        return json(res, 200, juego.vistaMensaje(msg, 'nino'));
      }
      if (ruta === '/api/ventana/postal' && m === 'POST') {
        limitar(`postal:${a.id}`, 10);
        const e = repo.espacio(a.espacio_id);
        if (!e.escena) throw new ErrorHttp(400, 'sin_escena');
        const p = repo.crearAporte(a.espacio_id, { accesoId: a.id, autor: e.alias, tipo: 'postal_nino', escena: JSON.parse(e.escena), estado: 'aprobado' });
        avisar(a.espacio_id, 'aportador', 'actualizar');
        return json(res, 200, { id: p.id });
      }
    }

    if (ruta === '/api/voz' && m === 'POST') {
      const av = acceso(req, 'ventana');
      limitar(`voz:${av.id}`, 20);
      if (!vozDisponible()) throw new ErrorHttp(503, 'voz_no_disponible');
      const audio = await leerCuerpo(req, 4 * 1024 * 1024);
      if (audio.length < 1000) throw new ErrorHttp(400, 'audio_vacio');
      const trabajo = colaVoz.then(() => transcribir(audio));
      colaVoz = trabajo.catch(() => {});
      try {
        return json(res, 200, { texto: await trabajo });
      } catch (e) {
        registrar('Error de voz:', e.message);
        throw new ErrorHttp(500, 'voz_fallo');
      }
    }

    // ----- Enviar (familia y clase) -----
    if (ruta.startsWith('/api/enviar')) {
      const a = acceso(req, 'aportador');
      const e = repo.espacio(a.espacio_id);
      if (ruta === '/api/enviar' && m === 'GET') {
        return json(res, 200, {
          alias: e.alias, etiqueta: a.etiqueta,
          mios: repo.aportes(a.espacio_id, { tipo: 'foto', accesoId: a.id }).map(fotoPublica),
          postales: repo.aportes(a.espacio_id, { tipo: 'postal_nino' }).slice(0, 10).map((p) => ({ id: p.id, escena: p.escena, creado: p.creado })),
          chat: juego.chatFuera(a),
          descubiertas: repo.aportes(a.espacio_id, { tipo: 'foto', accesoId: a.id }).filter((x) => x.juego === 'descubierto').map((x) => x.id),
        });
      }
      if (ruta === '/api/enviar/mensaje' && m === 'POST') {
        limitar(`msg:${a.id}`, 30, HORA);
        let tipo = 'texto', texto = '', archivo = null;
        if ((req.headers['content-type'] || '').startsWith('application/json')) {
          texto = limpiarTexto((await leerJSON(req)).texto, 200);
          if (!texto) throw new ErrorHttp(400, 'texto');
        } else {
          tipo = 'audio';
          archivo = await leerAudio(req);
        }
        const msg = juego.crearMensaje(a.espacio_id, { accesoId: a.id, de: 'fuera', tipo, texto, archivo });
        avisar(a.espacio_id, 'tutor', 'pendiente');
        return json(res, 200, juego.vistaMensaje(msg, 'fuera'));
      }
      const mPo = ruta.match(/^\/api\/enviar\/postal\/([\w-]+)$/);
      if (mPo && m === 'POST') {
        const { donde } = await leerJSON(req);
        const r = juego.adivinarPostal(a, mPo[1], String(donde ?? ''));
        if (!r) throw new ErrorHttp(404, 'no_existe');
        if (r.mensaje.juego === 'resuelto') avisar(a.espacio_id, 'ventana', 'postal_resuelta', { nombre: a.etiqueta, acierto: r.acierto });
        return json(res, 200, r);
      }
      const mPz = ruta.match(/^\/api\/enviar\/puzle\/([\w-]+)$/);
      if (mPz && m === 'POST') {
        const v = juego.puzleFueraResuelto(a, mPz[1]);
        if (!v) throw new ErrorHttp(404, 'no_existe');
        avisar(a.espacio_id, 'ventana', 'puzle_resuelto', { nombre: a.etiqueta });
        return json(res, 200, v);
      }
      if (ruta === '/api/enviar' && m === 'POST') {
        limitar(`foto:${a.id}`, 20, HORA);
        const texto = cabecera(req, 'x-texto', 80);
        // Pistas para el acertijo del niño («¿quién soy?») y desde dónde se envía. Nunca GPS.
        let pistas = [];
        try { pistas = JSON.parse(decodificar(String(req.headers['x-pistas'] || '[]'), 'pistas')); } catch { throw new ErrorHttp(400, 'pistas'); }
        pistas = (Array.isArray(pistas) ? pistas : []).map((p) => limpiarTexto(p, 60)).filter(Boolean).slice(0, 3);
        const lugar = cabecera(req, 'x-lugar', 40);
        // Carta programada: llega dentro de N días (0 = en cuanto se apruebe). Para dejar sorpresas en una visita.
        const dias = Math.min(Math.max(parseInt(req.headers['x-dias'], 10) || 0, 0), 14);
        const entregarEn = dias ? Date.now() + dias * 24 * HORA : null;
        const esVideo = /^video\//.test(req.headers['content-type'] || '');
        const { archivo, video } = esVideo ? await leerVideo(req) : { archivo: await leerFoto(req), video: null };
        const ap = repo.crearAporte(a.espacio_id, { accesoId: a.id, autor: a.etiqueta, tipo: 'foto', texto, archivo, video, estado: 'pendiente', pistas, lugar, entregarEn });
        avisar(a.espacio_id, 'tutor', 'pendiente');
        return json(res, 200, fotoPublica(ap));
      }
      const mRet = ruta.match(/^\/api\/enviar\/([\w-]+)$/);
      if (mRet && m === 'DELETE') {
        const quitado = repo.retirarAporte(a.id, mRet[1]);
        if (!quitado) throw new ErrorHttp(404, 'no_existe');
        await borrarArchivos([quitado.archivo, quitado.video].filter(Boolean));
        for (const rol of ['ventana', 'tutor']) avisar(a.espacio_id, rol, 'actualizar');
        return json(res, 200, { ok: true });
      }
    }

    // ----- Aprobar (adulto de confianza) -----
    if (ruta.startsWith('/api/aprobar')) {
      const a = acceso(req, 'tutor');
      const e = repo.espacio(a.espacio_id);
      if (ruta === '/api/aprobar' && m === 'GET') {
        return json(res, 200, {
          alias: e.alias,
          escena: e.escena ? JSON.parse(e.escena) : null,
          pendientes: repo.aportes(a.espacio_id, { tipo: 'foto', estado: 'pendiente' }).map((x) => ({ ...fotoPublica(x), pistas: x.pistas, lugar: x.lugar, video: !!x.video })),
          recientes: repo.aportes(a.espacio_id, { tipo: 'foto' }).filter((x) => x.estado !== 'pendiente').slice(0, 20).map(fotoPublica),
          diasFotos: e.dias_fotos,
          mensajes: juego.pendientes(a.espacio_id),
        });
      }
      if (ruta === '/api/aprobar/mensaje' && m === 'POST') {
        const { id, decision } = await leerJSON(req);
        const r = juego.decidirMensaje(a.espacio_id, String(id), { aprobar: 'aprobado', rechazar: 'rechazado' }[decision] || '', a.id);
        if (!r.ok) throw new ErrorHttp(400, r.error);
        if (r.mensaje.estado === 'aprobado') {
          if (r.mensaje.de === 'fuera') avisar(a.espacio_id, 'ventana', 'mensaje', { accesoId: r.mensaje.acceso_id });
          else avisar(a.espacio_id, 'aportador', 'actualizar');
        }
        return json(res, 200, { ok: true });
      }
      if (ruta === '/api/aprobar/decidir' && m === 'POST') {
        const { aporteId, decision } = await leerJSON(req);
        const nuevo = { aprobar: 'aprobado', rechazar: 'rechazado' }[decision] || '';
        const r = repo.decidir(a.espacio_id, String(aporteId), nuevo, a.id);
        if (!r.ok) throw new ErrorHttp(400, r.error);
        if (r.aporte.estado === 'aprobado' && (r.aporte.entregar_en ?? 0) <= Date.now()) avisar(a.espacio_id, 'ventana', 'foto', {});
        avisar(a.espacio_id, 'aportador', 'actualizar');
        return json(res, 200, fotoPublica(r.aporte));
      }
      if (ruta === '/api/aprobar/borrar-todo' && m === 'POST') {
        await borrarArchivos(repo.borrarAportes(a.espacio_id, a.id));
        for (const rol of ['ventana', 'aportador']) avisar(a.espacio_id, rol, 'actualizar');
        return json(res, 200, { ok: true });
      }
      // Derecho de acceso y portabilidad: el tutor descarga todos los datos del espacio en JSON.
      if (ruta === '/api/aprobar/exportar' && m === 'GET') {
        repo.auditar(a.espacio_id, a.id, 'exportar', '');
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="ventana-magica-datos.json"',
        });
        return res.end(JSON.stringify(repo.exportar(a.espacio_id), null, 2));
      }
    }

    // ----- Panel del hospital -----
    if (ruta === '/api/panel/entrar' && m === 'POST') {
      limitar(`panel:${req.socket.remoteAddress}`, 5);
      const { clave } = await leerJSON(req);
      const x = Buffer.from(hash(String(clave ?? ''))); const y = Buffer.from(hashAdmin);
      if (!(x.length === y.length && timingSafeEqual(x, y))) throw new ErrorHttp(401, 'clave');
      const sesion = randomBytes(24).toString('base64url');
      sesionesPanel.set(sesion, Date.now() + 12 * HORA);
      ponerCookie(res, req, 'vp_admin', sesion, 12 * 3600);
      return json(res, 200, { ok: true });
    }
    if (ruta.startsWith('/api/panel')) {
      if (!esAdmin(req)) throw new ErrorHttp(401, 'sin_acceso');
      // Los enlaces apuntan a la dirección de la wifi (para tablets y móviles), no a localhost.
      const base = urlsWifi[0] || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
      const enlace = (x) => ({ ...x, enlace: `${base}/t/${x.token}`, token: undefined });

      if (ruta === '/api/panel' && m === 'GET') {
        return json(res, 200, { espacios: repo.listarEspacios(), avatares: AVATARES, urls: urlsWifi, voz: vozDisponible() });
      }
      if (ruta === '/api/panel/espacios' && m === 'POST') {
        const { alias, avatar, mensajePuzle, dias, aportadores, consentimientoRef, lado } = await leerJSON(req);
        const al = String(alias ?? '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, '').trim().slice(0, 20);
        if (!al) throw new ErrorHttp(400, 'alias');
        if (!Object.hasOwn(AVATARES, avatar)) throw new ErrorHttp(400, 'avatar');
        const ref = limpiarTexto(consentimientoRef, 40);
        if (!ref) throw new ErrorHttp(400, 'consentimiento');
        const nombres = String(aportadores ?? 'Familia, Clase').split(',').map((n) => limpiarTexto(n, 30)).filter(Boolean).slice(0, 8);
        const d = Math.min(Math.max(parseInt(dias, 10) || 30, 1), 90);
        const msg = limpiarTexto(mensajePuzle || '¡Te esperamos! Tu sitio sigue aquí.', 120);
        const r = repo.crearEspacio({ alias: al, avatar, mensajePuzle: msg, diasHastaBorrar: d, diasFotos: Math.min(d, 30),
          aportadores: nombres.length ? nombres : ['Familia'], consentimientoRef: ref, lado: Number(lado) === 2 ? 2 : 3 });
        return json(res, 200, { id: r.id, accesos: r.accesos.map(enlace) });
      }
      const mAcc = ruta.match(/^\/api\/panel\/accesos\/([\w-]+)\/(codigo|revocar)$/);
      if (mAcc && m === 'POST') {
        if (mAcc[2] === 'revocar') {
          const ok = repo.revocarAcceso(mAcc[1]);
          cortar((res) => res.accesoId === mAcc[1]);
          return json(res, 200, { ok });
        }
        const codigo = repo.nuevoCodigo(mAcc[1]);
        if (!codigo) throw new ErrorHttp(404, 'no_existe');
        return json(res, 200, { codigo });
      }
      if (ruta === '/api/panel/accesos' && m === 'POST') {
        const { espacioId, rol, etiqueta } = await leerJSON(req);
        if (!repo.espacio(String(espacioId))) throw new ErrorHttp(404, 'no_existe');
        if (!ROLES.includes(rol)) throw new ErrorHttp(400, 'rol');
        return json(res, 200, enlace(repo.crearAcceso(String(espacioId), rol, limpiarTexto(etiqueta, 30) || 'Invitación')));
      }
      const mLado = ruta.match(/^\/api\/panel\/espacios\/([\w-]+)\/lado$/);
      if (mLado && m === 'POST') {
        if (!repo.espacio(mLado[1])) throw new ErrorHttp(404, 'no_existe');
        repo.cambiarLado(mLado[1], Number((await leerJSON(req)).lado));
        avisar(mLado[1], 'ventana', 'actualizar');
        return json(res, 200, { ok: true });
      }
      const mEsp = ruta.match(/^\/api\/panel\/espacios\/([\w-]+)\/(alta|auditoria)$/);
      if (mEsp && mEsp[2] === 'alta' && m === 'POST') {
        await borrarArchivos(repo.borrarEspacio(mEsp[1], 'panel'));
        cortar((res) => res.espacioId === mEsp[1]);
        return json(res, 200, { ok: true });
      }
      if (mEsp && mEsp[2] === 'auditoria' && m === 'GET') return json(res, 200, repo.auditoria(mEsp[1]));
    }

    throw new ErrorHttp(404, 'no_existe');
  }

  async function fotos(req, res, id) {
    const a = repo.aporte(id);
    if (!a || !a.archivo) throw new ErrorHttp(404, 'no_existe');
    const galleta = cookies(req);
    const puede = ROLES.some((rol) => {
      const ac = repo.accesoPorToken(galleta[`vp_${rol}`]);
      if (!ac || ac.espacio_id !== a.espacio_id) return false;
      if (rol === 'ventana') return a.estado === 'aprobado';
      if (rol === 'aportador') return ac.id === a.acceso_id;
      return true;
    });
    if (!puede) throw new ErrorHttp(404, 'no_existe');
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(await readFile(join(FOTOS, a.archivo)));
  }

  // Vídeo de una foto-vídeo: el niño lo ve solo cuando la ha descubierto (antes, solo el puzle).
  async function videoAporte(req, res, id) {
    const a = repo.aporte(id);
    if (!a || !a.video) throw new ErrorHttp(404, 'no_existe');
    const galleta = cookies(req);
    const puede = ROLES.some((rol) => {
      const ac = repo.accesoPorToken(galleta[`vp_${rol}`]);
      if (!ac || ac.espacio_id !== a.espacio_id) return false;
      if (rol === 'ventana') return a.estado === 'aprobado' && a.juego === 'descubierto';
      if (rol === 'aportador') return ac.id === a.acceso_id;
      return true;
    });
    if (!puede) throw new ErrorHttp(404, 'no_existe');
    res.writeHead(200, { 'Content-Type': 'video/mp4' });
    res.end(await readFile(join(FOTOS, a.video)));
  }

  // Archivos del chat: cada uno solo a quien le corresponde.
  async function medios(req, res, id) {
    const msg = juego.mensaje(id);
    if (!msg || !msg.archivo) throw new ErrorHttp(404, 'no_existe');
    const galleta = cookies(req);
    const puede = ROLES.some((rol) => {
      const ac = repo.accesoPorToken(galleta[`vp_${rol}`]);
      if (!ac || ac.espacio_id !== msg.espacio_id) return false;
      if (rol === 'ventana') return msg.de === 'nino' || msg.estado === 'aprobado';
      if (rol === 'aportador') return ac.id === msg.acceso_id && (msg.de === 'fuera' || (msg.estado === 'aprobado' && !(msg.tipo === 'postal' && msg.juego !== 'resuelto')));
      return true;
    });
    if (!puede) throw new ErrorHttp(404, 'no_existe');
    res.writeHead(200, { 'Content-Type': msg.archivo.endsWith('.m4a') ? 'audio/mp4' : 'image/jpeg' });
    res.end(await readFile(join(FOTOS, msg.archivo)));
  }

  // Archivos de la web: se leen una vez, se guardan comprimidos en memoria y se revalidan con ETag (304).
  // En una Raspberry Pi con wifi propia, esto reduce a un tercio lo que viaja y evita leer el disco en cada petición.
  const cacheWeb = new Map();
  // Versión de la web = huella de todos sus archivos: el service worker cambia de caché solo cuando cambia algo.
  const huellaWeb = createHash('sha1');
  const recorrer = async (dir) => {
    for (const f of (await readdir(dir, { withFileTypes: true })).sort((x, y) => x.name.localeCompare(y.name))) {
      const ruta = join(dir, f.name);
      if (f.isDirectory()) await recorrer(ruta);
      else if (!f.name.endsWith('.test.mjs')) huellaWeb.update(f.name).update(await readFile(ruta));
    }
  };
  await recorrer(WEB);
  const versionWeb = `vm-${huellaWeb.digest('hex').slice(0, 10)}`;
  async function estatico(req, res, ruta) {
    const archivo = normalize(join(WEB, PAGINAS[ruta] || ruta));
    if (!archivo.startsWith(WEB + sep) || archivo.endsWith('.test.mjs')) throw new ErrorHttp(404, 'no_existe');
    let f = cacheWeb.get(archivo);
    if (!f) {
      let datosArchivo;
      try { datosArchivo = await readFile(archivo); } catch { throw new ErrorHttp(404, 'no_existe'); }
      if (archivo === join(WEB, 'sw.js')) datosArchivo = Buffer.from(datosArchivo.toString('utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${versionWeb}';`));
      const tipo = TIPOS[extname(archivo)] || 'application/octet-stream';
      const texto = /^(text|application\/(json|manifest))|svg/.test(tipo);
      f = { datos: datosArchivo, gz: texto && datosArchivo.length > 600 ? gzipSync(datosArchivo, { level: 9 }) : null, tipo,
        etag: `"${createHash('sha1').update(datosArchivo).digest('base64url').slice(0, 16)}"` };
      if (process.env.NODE_ENV === 'production' || process.env.VP_CACHE !== 'no') cacheWeb.set(archivo, f);
    }
    res.setHeader('Cache-Control', 'no-cache'); // se guarda, pero se revalida siempre (barato con ETag)
    res.setHeader('ETag', f.etag);
    res.setHeader('Vary', 'Accept-Encoding');
    if (req.headers['if-none-match'] === f.etag) { res.writeHead(304); return res.end(); }
    if (f.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      res.writeHead(200, { 'Content-Type': f.tipo, 'Content-Encoding': 'gzip', 'Content-Length': f.gz.length });
      return res.end(f.gz);
    }
    res.writeHead(200, { 'Content-Type': f.tipo, 'Content-Length': f.datos.length });
    res.end(f.datos);
  }

  async function manejar(req, res) {
    cabecerasSeguridad(res);
    try {
      const ruta = decodificar(new URL(req.url, 'http://x').pathname, 'no_existe', 404);
      if (ruta.startsWith('/api/')) return await api(req, res, ruta);
      // Certificado público de la autoridad local, para que las tablets confíen en el HTTPS.
      if (ruta === '/ca.pem' && existsSync(join(RAIZ, 'certs', 'ca.pem'))) {
        res.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert', 'Content-Disposition': 'attachment; filename="ventana-magica-ca.pem"' });
        return res.end(await readFile(join(RAIZ, 'certs', 'ca.pem')));
      }
      if (ruta.startsWith('/fotos/')) return await fotos(req, res, ruta.slice(7));
      if (ruta.startsWith('/medios/')) return await medios(req, res, ruta.slice(8));
      if (ruta.startsWith('/video/')) return await videoAporte(req, res, ruta.slice(7));
      // Enlace de invitación: /t/<token> → cookie del rol → su pantalla.
      if (ruta.startsWith('/t/')) {
        const token = ruta.slice(3);
        const a = repo.accesoPorToken(token);
        if (!a || !/^[\w-]+$/.test(token)) { res.writeHead(302, { Location: '/?enlace=caducado' }); return res.end(); }
        ponerCookie(res, req, `vp_${a.rol}`, token);
        res.writeHead(302, { Location: DESTINO[a.rol] });
        return res.end();
      }
      return await estatico(req, res, ruta);
    } catch (e) {
      if (e instanceof ErrorHttp) return json(res, e.estado, { error: e.codigo });
      registrar('Error:', e);
      return json(res, 500, { error: 'interno' });
    }
  }

  return { manejar, repo, claveNueva, infoDemo, cerrar: () => { clearInterval(limpieza); clearInterval(entregas); repo.db.close(); } };
}

// ---------- Arranque ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const PUERTO = Number(process.env.VP_PUERTO) || 8443;
  const PUERTO_LOCAL = Number(process.env.VP_PUERTO_LOCAL) || 8080;
  const cert = join(RAIZ, 'certs', 'cert.pem');
  const key = join(RAIZ, 'certs', 'key.pem');
  const https = existsSync(cert) && existsSync(key);
  const app = await crearApp({ urlsWifi: https ? ipsLocales().map((ip) => `https://${ip}:${PUERTO}`) : [] });
  // Siempre HTTP solo para este ordenador (localhost ya es contexto seguro para el micrófono).
  crearHttp(app.manejar).listen(PUERTO_LOCAL, '127.0.0.1');
  // La wifi solo se abre con HTTPS: sin certificados, nada sale de este ordenador.
  if (https) crearHttps({ cert: readFileSync(cert), key: readFileSync(key) }, app.manejar).listen(PUERTO, '0.0.0.0');
  calentar();
  console.log(`\nVentana Mágica · servidor local`);
  console.log(`  En este ordenador: http://localhost:${PUERTO_LOCAL}`);
  if (https) for (const ip of ipsLocales()) console.log(`  En la wifi: https://${ip}:${PUERTO}`);
  else console.log('  Sin HTTPS: la wifi está cerrada. Ejecuta «npm run certificados» para abrirla a tablets y móviles.');
  console.log(`  Voz local: ${vozDisponible() ? 'activa (whisper.cpp)' : 'NO disponible (ejecuta «npm run voz»)'}`);
  if (app.infoDemo) {
    console.log('\n  ⚠ MODO DEMO (datos ficticios; nunca con niños reales). Panel: clave 123456');
    for (const c of app.infoDemo.codigos) console.log(`    ${c.codigo}  ${c.etiqueta}`);
    console.log('');
  }
  if (app.claveNueva && !app.infoDemo) console.log(`\n  Clave del panel del hospital (guárdala, solo se muestra una vez): ${app.claveNueva}\n  Panel: http://localhost:${PUERTO_LOCAL}/panel\n`);
}
