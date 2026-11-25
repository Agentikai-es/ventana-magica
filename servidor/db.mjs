// Base de datos local: SQLite integrado en Node (sin dependencias).
// Solo se guardan alias y datos mínimos. Los tokens y códigos se guardan como hash, nunca en claro.
// Clasificación de cada dato: docs/datos.md

import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { prepararTablaPlanta } from './planta.mjs';
import { prepararTablaRecompensas } from './recompensas.mjs';
import { construirEscenario } from '../web/lib/escenario.js';

const DIA = 24 * 60 * 60 * 1000;
const MIN30 = 30 * 60 * 1000;
export const ROLES = ['ventana', 'tutor', 'aportador'];
export const EMOJIS_REACCION = ['❤️', '😂', '👏', '🤩', '🥰'];
export const PIEZAS_PUZLE = 9;
export const VERSION_CONSENTIMIENTO = 'v1-2026-11';

export function hash(texto) {
  return createHash('sha256').update(String(texto)).digest('hex');
}

export function abrirDB(ruta = ':memory:') {
  const db = new DatabaseSync(ruta);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA secure_delete = ON;  -- lo borrado se sobrescribe con ceros en el archivo
    CREATE TABLE IF NOT EXISTS espacios (
      id TEXT PRIMARY KEY,
      alias TEXT NOT NULL,
      avatar TEXT NOT NULL,
      escena TEXT,
      mensaje_puzle TEXT NOT NULL,
      dias_fotos INTEGER NOT NULL,
      creado INTEGER NOT NULL,
      borrar_en INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accesos (
      id TEXT PRIMARY KEY,
      espacio_id TEXT NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
      rol TEXT NOT NULL CHECK (rol IN ('ventana','tutor','aportador')),
      etiqueta TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      codigo_hash TEXT,
      codigo_caduca INTEGER,
      creado INTEGER NOT NULL,
      caduca INTEGER NOT NULL,
      revocado INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS aportes (
      id TEXT PRIMARY KEY,
      espacio_id TEXT NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
      acceso_id TEXT,
      autor TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('foto','postal_nino')),
      texto TEXT NOT NULL DEFAULT '',
      archivo TEXT,
      escena TEXT,
      estado TEXT NOT NULL CHECK (estado IN ('pendiente','aprobado','rechazado')),
      reaccion TEXT,
      creado INTEGER NOT NULL,
      decidido INTEGER,
      borrar_en INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      espacio_id TEXT,
      quien TEXT NOT NULL,
      accion TEXT NOT NULL,
      detalle TEXT,
      cuando INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS aportes_espacio ON aportes(espacio_id, estado);
    CREATE INDEX IF NOT EXISTS accesos_codigo ON accesos(codigo_hash);
  `);
  // Columnas añadidas después: se crean también en bases de datos antiguas.
  const anadir = (tabla, cols) => {
    const hay = db.prepare(`PRAGMA table_info(${tabla})`).all().map((c) => c.name);
    for (const [col, tipo] of cols) if (!hay.includes(col)) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${col} ${tipo}`);
  };
  // Consentimiento de los tutores (art. 7 LOPDGDD).
  anadir('espacios', [['consentimiento_ref', 'TEXT'], ['consentimiento_version', 'TEXT'], ['consentimiento_fecha', 'INTEGER']]);
  // Juego de cada foto: puzle → acertijo («¿quién me la envió y desde dónde?») → descubierta.
  anadir('aportes', [['pistas', 'TEXT'], ['lugar', "TEXT NOT NULL DEFAULT ''"], ['juego', "TEXT NOT NULL DEFAULT 'cerrado'"], ['intentos', 'INTEGER NOT NULL DEFAULT 0']]);
  // Vídeo corto opcional: el puzle se monta con un fotograma y el vídeo se ve al descubrirlo.
  anadir('aportes', [['video', 'TEXT']]);
  // Cartas programadas (sin internet): la familia las deja en la visita y llegan el día elegido.
  anadir('aportes', [['entregar_en', 'INTEGER']]);
  // Modo demo: accesos con código fijo que no caduca ni se gasta, y varias sesiones por acceso.
  anadir('accesos', [['fijo', 'INTEGER NOT NULL DEFAULT 0']]);
  db.exec(`CREATE TABLE IF NOT EXISTS sesiones (
    token_hash TEXT PRIMARY KEY,
    acceso_id TEXT NOT NULL REFERENCES accesos(id) ON DELETE CASCADE,
    creado INTEGER NOT NULL
  )`);
  // Dificultad del puzle por niño: 2 (2×2, días cansados o peques) o 3 (3×3). Sesiones cortas.
  anadir('espacios', [['lado', 'INTEGER NOT NULL DEFAULT 3']]);
  // Chat interno entre el niño y cada persona de fuera (todo pasa por el adulto de confianza).
  db.exec(`
    CREATE TABLE IF NOT EXISTS mensajes (
      id TEXT PRIMARY KEY,
      espacio_id TEXT NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
      acceso_id TEXT NOT NULL,           -- la persona de fuera de esta conversación
      de TEXT NOT NULL CHECK (de IN ('nino','fuera')),
      tipo TEXT NOT NULL CHECK (tipo IN ('texto','audio','foto','puzle','postal')),
      texto TEXT NOT NULL DEFAULT '',
      secreto TEXT NOT NULL DEFAULT '',  -- mensaje oculto de un puzle del niño
      archivo TEXT,
      estado TEXT NOT NULL CHECK (estado IN ('pendiente','aprobado','rechazado')),
      juego TEXT NOT NULL DEFAULT 'cerrado',
      creado INTEGER NOT NULL,
      decidido INTEGER,
      borrar_en INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mensajes_espacio ON mensajes(espacio_id, acceso_id);
  `);
  // Postal-acertijo del niño: escenario elegido + «¿dónde está hoy?».
  anadir('mensajes', [['escena', 'TEXT'], ['intentos', 'INTEGER NOT NULL DEFAULT 0']]);
  // Comunidad de la planta: mensajes entre niños de la misma caja (servidor/planta.mjs).
  prepararTablaPlanta(db);
  prepararTablaRecompensas(db);
  return crearRepositorio(db);
}

function crearRepositorio(db) {
  const ahora = () => Date.now();
  const fila = (a) => (a ? { ...a, escena: a.escena ? JSON.parse(a.escena) : null, pistas: a.pistas ? JSON.parse(a.pistas) : [] } : null);

  // La auditoría guarda ids y roles, nunca alias ni nombres (sobrevive 1 año al alta).
  function auditar(espacioId, quien, accion, detalle = '') {
    db.prepare('INSERT INTO auditoria (espacio_id, quien, accion, detalle, cuando) VALUES (?,?,?,?,?)')
      .run(espacioId, quien, accion, detalle, ahora());
  }

  // Tras borrar datos personales: vacía el WAL para que no queden copias en disco.
  function compactar() {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  // Código de 6 cifras que no coincide con ningún otro código vivo.
  function codigoUnico() {
    for (;;) {
      const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const choque = db.prepare('SELECT 1 FROM accesos WHERE codigo_hash = ? AND codigo_caduca > ? AND revocado = 0').get(hash(codigo), ahora());
      if (!choque) return codigo;
    }
  }

  // Crea un acceso. Devuelve el token y el código en claro UNA sola vez.
  function crearAcceso(espacioId, rol, etiqueta, { dias = 30 } = {}) {
    if (!ROLES.includes(rol)) throw new Error('rol no válido');
    const token = randomBytes(24).toString('base64url');
    const codigo = codigoUnico();
    const id = randomUUID();
    db.prepare(`INSERT INTO accesos (id, espacio_id, rol, etiqueta, token_hash, codigo_hash, codigo_caduca, creado, caduca)
      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, espacioId, rol, etiqueta, hash(token), hash(codigo), ahora() + MIN30, ahora(), ahora() + dias * DIA);
    auditar(espacioId, 'panel', 'crear_acceso', `${rol}:${id}`);
    return { id, rol, etiqueta, token, codigo };
  }

  // Nuevo código de 6 cifras (30 min, un solo uso) para un acceso existente.
  function nuevoCodigo(accesoId) {
    const codigo = codigoUnico();
    const r = db.prepare('UPDATE accesos SET codigo_hash = ?, codigo_caduca = ? WHERE id = ? AND revocado = 0')
      .run(hash(codigo), ahora() + MIN30, accesoId);
    return r.changes ? codigo : null;
  }

  function crearEspacio({ alias, avatar, mensajePuzle, diasHastaBorrar = 30, diasFotos = 30, aportadores = ['Familia', 'Clase'], consentimientoRef, lado = 3 }) {
    if (!consentimientoRef) throw new Error('sin consentimiento');
    const id = randomUUID();
    db.prepare(`INSERT INTO espacios (id, alias, avatar, escena, mensaje_puzle, dias_fotos, creado, borrar_en,
      consentimiento_ref, consentimiento_version, consentimiento_fecha) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, alias, avatar, null, mensajePuzle, diasFotos, ahora(), ahora() + diasHastaBorrar * DIA,
        consentimientoRef, VERSION_CONSENTIMIENTO, ahora());
    db.prepare('UPDATE espacios SET lado = ? WHERE id = ?').run(lado === 2 ? 2 : 3, id);
    auditar(id, 'panel', 'crear_espacio', `consentimiento:${VERSION_CONSENTIMIENTO}`);
    const accesos = [
      crearAcceso(id, 'ventana', 'Tablet', { dias: diasHastaBorrar }),
      crearAcceso(id, 'tutor', 'Adulto de confianza', { dias: diasHastaBorrar }),
      ...aportadores.map((nombre) => crearAcceso(id, 'aportador', nombre, { dias: diasHastaBorrar })),
    ];
    return { id, accesos };
  }

  function accesoPorToken(token) {
    if (!token) return null;
    const h = hash(token);
    const a = db.prepare('SELECT * FROM accesos WHERE token_hash = ?').get(h)
      || db.prepare('SELECT a.* FROM sesiones s JOIN accesos a ON a.id = s.acceso_id WHERE s.token_hash = ?').get(h);
    if (!a || a.revocado || a.caduca < ahora()) return null;
    return a;
  }

  // Canjea un código de 6 cifras: devuelve un token nuevo y el código deja de valer.
  function canjearCodigo(codigo) {
    if (!/^\d{6}$/.test(String(codigo || ''))) return null;
    const a = db.prepare('SELECT * FROM accesos WHERE codigo_hash = ? AND revocado = 0 AND caduca > ? AND codigo_caduca > ?')
      .get(hash(codigo), ahora(), ahora());
    if (!a) return null;
    const token = randomBytes(24).toString('base64url');
    // Código fijo (demo): no se gasta; cada dispositivo recibe su propia sesión.
    if (a.fijo) db.prepare('INSERT INTO sesiones (token_hash, acceso_id, creado) VALUES (?,?,?)').run(hash(token), a.id, ahora());
    else db.prepare('UPDATE accesos SET token_hash = ?, codigo_hash = NULL, codigo_caduca = NULL WHERE id = ?').run(hash(token), a.id);
    auditar(a.espacio_id, a.rol, 'canjear_codigo', a.id);
    return { token, rol: a.rol, accesoId: a.id };
  }

  // Espacios de demostración con códigos fijos y fáciles. SOLO para el Demo Day: nunca con niños reales.
  // Leo es el protagonista; Sara y Nico son otros niños ficticios de la planta para enseñar la comunidad.
  const CODIGOS_DEMO = [['ventana', 'Tablet de Leo', '123456'], ['aportador', 'Abuela', '111111'], ['tutor', 'Mamá', '222222'], ['aportador', 'Clase de 3.º B', '333333']];
  const NINOS_DEMO = [
    { ref: 'DEMO ficticia (códigos fijos)', alias: 'Leo', avatar: 'zorrito', mensaje: '¡Te esperamos en clase! Tu sitio sigue aquí.', escena: null, codigos: CODIGOS_DEMO },
    { ref: 'DEMO ficticia (Sara)', alias: 'Sara', avatar: 'astronauta', mensaje: '¡Tu equipo de baloncesto te espera!', escena: ['paris', 'atardecer'],
      codigos: [['ventana', 'Tablet de Sara', '444444'], ['tutor', 'Papá de Sara', '555555']] },
    { ref: 'DEMO ficticia (Nico)', alias: 'Nico', avatar: 'superheroe', mensaje: '¡La clase te ha guardado el mejor sitio!', escena: ['egipto', 'dia'], codigos: [] },
  ];
  function asegurarDemo() {
    const LEJOS = ahora() + 365 * DIA;
    const espacios = [];
    for (const n of NINOS_DEMO) {
      let e = db.prepare('SELECT id, escena FROM espacios WHERE consentimiento_ref = ?').get(n.ref);
      if (!e) {
        const id = randomUUID();
        db.prepare(`INSERT INTO espacios (id, alias, avatar, escena, mensaje_puzle, dias_fotos, creado, borrar_en, consentimiento_ref, consentimiento_version, consentimiento_fecha)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, n.alias, n.avatar, null, n.mensaje, 30, ahora(), LEJOS, n.ref, VERSION_CONSENTIMIENTO, ahora());
        e = { id, escena: null };
      }
      db.prepare('UPDATE espacios SET comunidad = 1, borrar_en = ? WHERE id = ?').run(LEJOS, e.id);
      if (n.escena && !e.escena) guardarEscena(e.id, construirEscenario(n.escena[0], { avatar: n.avatar, momento: n.escena[1] }));
      for (const [rol, etiqueta, codigo] of n.codigos) {
        // El código vuelve a apuntar a este acceso aunque otro lo hubiera tomado.
        db.prepare('UPDATE accesos SET codigo_hash = NULL WHERE codigo_hash = ? AND fijo = 0').run(hash(codigo));
        const a = db.prepare('SELECT id FROM accesos WHERE espacio_id = ? AND etiqueta = ? AND fijo = 1').get(e.id, etiqueta);
        if (a) db.prepare('UPDATE accesos SET codigo_hash = ?, codigo_caduca = ?, caduca = ?, revocado = 0 WHERE id = ?').run(hash(codigo), LEJOS, LEJOS, a.id);
        else db.prepare(`INSERT INTO accesos (id, espacio_id, rol, etiqueta, token_hash, codigo_hash, codigo_caduca, creado, caduca, fijo)
          VALUES (?,?,?,?,?,?,?,?,?,1)`).run(randomUUID(), e.id, rol, etiqueta, hash(randomBytes(24).toString('base64url')), hash(codigo), LEJOS, ahora(), LEJOS);
      }
      espacios.push(e.id);
    }
    return {
      espacioId: espacios[0], espacios,
      codigos: NINOS_DEMO.flatMap((n) => n.codigos.map(([rol, etiqueta, codigo]) => ({ rol, etiqueta, codigo }))),
    };
  }

  function revocarAcceso(accesoId) {
    const a = db.prepare('SELECT espacio_id FROM accesos WHERE id = ?').get(accesoId);
    if (!a) return false;
    db.prepare('UPDATE accesos SET revocado = 1, codigo_hash = NULL WHERE id = ?').run(accesoId);
    auditar(a.espacio_id, 'panel', 'revocar_acceso', accesoId);
    return true;
  }

  function espacio(id) {
    return db.prepare('SELECT * FROM espacios WHERE id = ?').get(id) || null;
  }

  function listarEspacios() {
    const espacios = db.prepare('SELECT id, alias, avatar, creado, borrar_en, consentimiento_ref, lado, comunidad FROM espacios ORDER BY creado DESC').all();
    const acc = db.prepare('SELECT id, rol, etiqueta, caduca, revocado FROM accesos WHERE espacio_id = ? ORDER BY creado');
    return espacios.map((e) => ({ ...e, accesos: acc.all(e.id) }));
  }

  function guardarEscena(espacioId, escena) {
    db.prepare('UPDATE espacios SET escena = ? WHERE id = ?').run(JSON.stringify(escena), espacioId);
  }

  function crearAporte(espacioId, { accesoId, autor, tipo, texto = '', archivo = null, escena = null, estado, pistas = [], lugar = '', video = null, entregarEn = null }) {
    const e = espacio(espacioId);
    const id = randomUUID();
    const entrega = entregarEn ?? ahora();
    db.prepare(`INSERT INTO aportes (id, espacio_id, acceso_id, autor, tipo, texto, archivo, escena, estado, creado, borrar_en, pistas, lugar, video, entregar_en)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, espacioId, accesoId, autor, tipo, texto, archivo, escena ? JSON.stringify(escena) : null, estado, ahora(),
        Math.max(ahora(), entrega) + (e?.dias_fotos ?? 30) * DIA, JSON.stringify(pistas), lugar, video, entrega);
    auditar(espacioId, accesoId || 'sistema', `nuevo_${tipo}`, id);
    return aporte(id);
  }

  function aporte(id) {
    return fila(db.prepare('SELECT * FROM aportes WHERE id = ?').get(id));
  }

  function decidir(espacioId, aporteId, decision, quien = 'tutor') {
    if (!['aprobado', 'rechazado'].includes(decision)) return { ok: false, error: 'decision' };
    const a = aporte(aporteId);
    if (!a || a.espacio_id !== espacioId) return { ok: false, error: 'no_existe' };
    if (a.estado !== 'pendiente') return { ok: false, error: 'ya_decidido' };
    db.prepare('UPDATE aportes SET estado = ?, decidido = ? WHERE id = ?').run(decision, ahora(), aporteId);
    auditar(espacioId, quien, decision === 'aprobado' ? 'aprobar' : 'rechazar', aporteId);
    return { ok: true, aporte: aporte(aporteId) };
  }

  function reaccionar(espacioId, aporteId, emoji) {
    if (!EMOJIS_REACCION.includes(emoji)) return { ok: false, error: 'emoji' };
    const a = aporte(aporteId);
    if (!a || a.espacio_id !== espacioId || a.estado !== 'aprobado' || a.tipo !== 'foto') return { ok: false, error: 'no_existe' };
    db.prepare('UPDATE aportes SET reaccion = ? WHERE id = ?').run(emoji, aporteId);
    return { ok: true, aporte: aporte(aporteId) };
  }

  function aportes(espacioId, { estado, tipo, accesoId, entregadas } = {}) {
    let sql = 'SELECT * FROM aportes WHERE espacio_id = ?';
    const args = [espacioId];
    if (entregadas) { sql += ' AND (entregar_en IS NULL OR entregar_en <= ?)'; args.push(ahora()); }
    if (estado) { sql += ' AND estado = ?'; args.push(estado); }
    if (tipo) { sql += ' AND tipo = ?'; args.push(tipo); }
    if (accesoId) { sql += ' AND acceso_id = ?'; args.push(accesoId); }
    sql += ' ORDER BY creado DESC';
    return db.prepare(sql).all(...args).map(fila);
  }

  function archivosDe(espacioId) {
    return [
      ...db.prepare('SELECT archivo FROM aportes WHERE espacio_id = ? AND archivo IS NOT NULL').all(espacioId),
      ...db.prepare('SELECT video AS archivo FROM aportes WHERE espacio_id = ? AND video IS NOT NULL').all(espacioId),
      ...db.prepare('SELECT archivo FROM mensajes WHERE espacio_id = ? AND archivo IS NOT NULL').all(espacioId),
      ...db.prepare('SELECT archivo FROM planta WHERE (de_espacio = ? OR a_espacio = ?) AND archivo IS NOT NULL').all(espacioId, espacioId),
    ].map((r) => r.archivo);
  }

  // Quien envió una foto puede retirarla (sale de la ventana y del disco).
  function retirarAporte(accesoId, aporteId) {
    const a = aporte(aporteId);
    if (!a || a.acceso_id !== accesoId) return null;
    db.prepare('DELETE FROM aportes WHERE id = ?').run(aporteId);
    auditar(a.espacio_id, accesoId, 'retirar_foto', aporteId);
    compactar();
    return a;
  }

  // Borra un espacio entero (alta). Devuelve los archivos que hay que borrar del disco.
  function borrarEspacio(espacioId, quien) {
    const archivos = archivosDe(espacioId);
    db.prepare('DELETE FROM espacios WHERE id = ?').run(espacioId);
    auditar(espacioId, quien, 'borrar_espacio', `${archivos.length} fotos`);
    compactar();
    return archivos;
  }

  // Borra fotos y postales, pero mantiene el espacio (supresión a petición del tutor).
  function borrarAportes(espacioId, quien) {
    const archivos = archivosDe(espacioId);
    db.prepare('DELETE FROM aportes WHERE espacio_id = ?').run(espacioId);
    db.prepare('DELETE FROM mensajes WHERE espacio_id = ?').run(espacioId);
    db.prepare('DELETE FROM planta WHERE de_espacio = ? OR a_espacio = ?').run(espacioId, espacioId);
    auditar(espacioId, quien, 'borrar_aportes', `${archivos.length} fotos`);
    compactar();
    return archivos;
  }

  // Derecho de acceso y portabilidad (art. 15 y 20): todo lo que hay del espacio, sin secretos.
  function exportar(espacioId) {
    const e = espacio(espacioId);
    if (!e) return null;
    return {
      exportado: new Date().toISOString(),
      espacio: { alias: e.alias, avatar: e.avatar, escena: e.escena ? JSON.parse(e.escena) : null, creado: e.creado, borrar_en: e.borrar_en,
        consentimiento: { referencia: e.consentimiento_ref, version: e.consentimiento_version, fecha: e.consentimiento_fecha } },
      accesos: db.prepare('SELECT rol, etiqueta, creado, caduca, revocado FROM accesos WHERE espacio_id = ?').all(espacioId),
      aportes: aportes(espacioId).map(({ id, autor, tipo, texto, estado, reaccion, creado, decidido, borrar_en, escena, pistas, lugar }) =>
        ({ id, autor, tipo, texto, estado, reaccion, creado, decidido, borrar_en, escena, pistas, lugar })),
      mensajes: db.prepare('SELECT id, acceso_id, de, tipo, texto, secreto, estado, juego, creado, decidido, borrar_en FROM mensajes WHERE espacio_id = ? ORDER BY creado').all(espacioId),
      planta: db.prepare(`SELECT p.tipo, p.texto, p.estado, p.creado, p.de_espacio = ? AS enviado, e.alias AS con
        FROM planta p JOIN espacios e ON e.id = CASE WHEN p.de_espacio = ? THEN p.a_espacio ELSE p.de_espacio END
        WHERE p.de_espacio = ? OR p.a_espacio = ? ORDER BY p.creado`).all(espacioId, espacioId, espacioId, espacioId).map((x) => ({ ...x, enviado: !!x.enviado })),
      auditoria: auditoria(espacioId),
    };
  }

  // Limpieza programada: aportes caducados, rechazados de más de 1 día y espacios dados de alta.
  function limpiar(momento = ahora()) {
    const archivos = [];
    const caducados = db.prepare(`SELECT id, archivo, video FROM aportes WHERE borrar_en < ? OR (estado = 'rechazado' AND decidido < ?)`)
      .all(momento, momento - DIA);
    for (const a of caducados) {
      if (a.archivo) archivos.push(a.archivo);
      if (a.video) archivos.push(a.video);
      db.prepare('DELETE FROM aportes WHERE id = ?').run(a.id);
    }
    const viejos = db.prepare(`SELECT id, archivo FROM mensajes WHERE borrar_en < ? OR (estado = 'rechazado' AND decidido < ?)`).all(momento, momento - DIA);
    for (const m of viejos) {
      if (m.archivo) archivos.push(m.archivo);
      db.prepare('DELETE FROM mensajes WHERE id = ?').run(m.id);
    }
    const viejosPlanta = db.prepare(`SELECT id, archivo FROM planta WHERE borrar_en < ? OR (estado = 'rechazado' AND decidido < ?)`).all(momento, momento - DIA);
    for (const m of viejosPlanta) {
      if (m.archivo) archivos.push(m.archivo);
      db.prepare('DELETE FROM planta WHERE id = ?').run(m.id);
    }
    for (const e of db.prepare('SELECT id FROM espacios WHERE borrar_en < ?').all(momento)) {
      archivos.push(...borrarEspacio(e.id, 'limpieza'));
    }
    db.prepare('UPDATE accesos SET codigo_hash = NULL, codigo_caduca = NULL WHERE codigo_caduca < ?').run(momento);
    db.prepare('DELETE FROM auditoria WHERE cuando < ?').run(momento - 365 * DIA);
    if (caducados.length) compactar();
    return archivos;
  }

  // Cartas aprobadas cuya hora de llegada cae en (desde, hasta]: para avisar a la tablet cuando llegan.
  function cartasQueLlegan(desde, hasta) {
    return db.prepare(`SELECT id, espacio_id FROM aportes WHERE tipo = 'foto' AND estado = 'aprobado' AND entregar_en > ? AND entregar_en <= ?`).all(desde, hasta);
  }

  function cambiarLado(espacioId, lado) {
    db.prepare('UPDATE espacios SET lado = ? WHERE id = ?').run(lado === 2 ? 2 : 3, espacioId);
  }

  function auditoria(espacioId) {
    return db.prepare('SELECT quien, accion, detalle, cuando FROM auditoria WHERE espacio_id = ? ORDER BY id DESC LIMIT 200').all(espacioId);
  }

  return {
    db, crearEspacio, crearAcceso, nuevoCodigo, accesoPorToken, canjearCodigo, revocarAcceso, espacio, listarEspacios,
    guardarEscena, crearAporte, aporte, decidir, reaccionar, aportes, retirarAporte, borrarEspacio, borrarAportes, exportar,
    limpiar, auditoria, auditar, cartasQueLlegan, cambiarLado, asegurarDemo,
  };
}
