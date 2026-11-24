// Comunidad de la planta: los niños ingresados en la misma caja se conocen y se animan entre ellos.
//
// · Solo entra quien tiene la comunidad activada en el panel (consentimiento de los tutores).
// · Entre ellos solo se ven alias, avatar y dónde está hoy su ventana («Leo está en París»). Nunca nombres ni habitaciones.
// · Ánimos y visitas son frases fijas: llegan al momento. Texto, postal-acertijo y foto-puzle los aprueba antes
//   el adulto de confianza de quien los envía. Sin audio entre niños (la voz de un menor es un dato personal).
// · Todo vive en la caja, sin internet, y se borra con el resto de datos del espacio.

import { createHash, randomUUID } from 'node:crypto';
import { AMBIENTES } from '../web/lib/catalogo.js';

const DIA = 24 * 60 * 60 * 1000;
const MAX_INTENTOS = 3;
export const ANIMOS = ['¡Ánimo! 💪', 'Te mando un abrazo 🤗', '¡Qué guay tu mundo! ✨', '¿Jugamos luego? 🎲', 'Hoy me siento bien 😊', 'Pienso en ti 💛'];
export const TIPOS_PLANTA = ['animo', 'visita', 'texto', 'postal', 'puzle'];
const DIRECTOS = ['animo', 'visita'];

const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function barajar(lista, semilla) {
  const peso = (x) => createHash('sha256').update(`${semilla}:${x}`).digest().readUInt32BE(0);
  return [...lista].sort((a, b) => peso(a) - peso(b));
}

export function prepararTablaPlanta(db) {
  const hay = db.prepare('PRAGMA table_info(espacios)').all().map((c) => c.name);
  if (!hay.includes('comunidad')) db.exec('ALTER TABLE espacios ADD COLUMN comunidad INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    CREATE TABLE IF NOT EXISTS planta (
      id TEXT PRIMARY KEY,
      de_espacio TEXT NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
      a_espacio TEXT NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('animo','visita','texto','postal','puzle')),
      texto TEXT NOT NULL DEFAULT '',
      secreto TEXT NOT NULL DEFAULT '',
      archivo TEXT,
      escena TEXT,
      estado TEXT NOT NULL CHECK (estado IN ('pendiente','aprobado','rechazado')),
      juego TEXT NOT NULL DEFAULT 'cerrado',
      intentos INTEGER NOT NULL DEFAULT 0,
      creado INTEGER NOT NULL,
      decidido INTEGER,
      borrar_en INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS planta_de ON planta(de_espacio);
    CREATE INDEX IF NOT EXISTS planta_a ON planta(a_espacio);
  `);
}

export function crearPlanta(repo) {
  const { db } = repo;
  const ahora = () => Date.now();
  const leerEscena = (e) => (e?.escena ? JSON.parse(e.escena) : null);

  const enComunidad = (id) => !!db.prepare('SELECT comunidad FROM espacios WHERE id = ?').get(id)?.comunidad;

  function activar(espacioId, activa, quien = 'panel') {
    db.prepare('UPDATE espacios SET comunidad = ? WHERE id = ?').run(activa ? 1 : 0, espacioId);
    repo.auditar(espacioId, quien, activa ? 'comunidad_si' : 'comunidad_no', '');
  }

  // Los demás niños de la planta: alias, avatar y dónde está hoy su ventana.
  function vecinos(espacioId) {
    if (!enComunidad(espacioId)) return [];
    return db.prepare('SELECT id, alias, avatar, escena FROM espacios WHERE comunidad = 1 AND id != ? ORDER BY alias').all(espacioId)
      .map((e) => {
        const esc = leerEscena(e);
        return { id: e.id, alias: e.alias, avatar: e.avatar, lugar: esc?.nombre || null, ambiente: esc?.ambiente || null, paleta: esc?.paleta || null };
      });
  }
  const esVecino = (de, a) => de !== a && enComunidad(de) && enComunidad(a);

  function mensaje(id) {
    return db.prepare('SELECT * FROM planta WHERE id = ?').get(id) || null;
  }

  function enviar(deEspacio, aEspacio, { tipo, texto = '', secreto = '', archivo = null }) {
    if (!TIPOS_PLANTA.includes(tipo)) return { ok: false, error: 'tipo' };
    if (!esVecino(deEspacio, aEspacio)) return { ok: false, error: 'para' };
    if (tipo === 'animo' && !ANIMOS.includes(texto)) return { ok: false, error: 'animo' };
    if (tipo === 'texto' && !texto) return { ok: false, error: 'texto' };
    if (tipo === 'puzle' && (!archivo || !secreto)) return { ok: false, error: 'secreto' };
    const yo = repo.espacio(deEspacio);
    const escena = tipo === 'postal' || tipo === 'visita' ? leerEscena(yo) : null;
    if ((tipo === 'postal' || tipo === 'visita') && !escena) return { ok: false, error: 'sin_escena' };
    if (tipo === 'visita') texto = `¡Ven a visitarme a ${escena.nombre}!`;
    const id = randomUUID();
    db.prepare(`INSERT INTO planta (id, de_espacio, a_espacio, tipo, texto, secreto, archivo, escena, estado, creado, decidido, borrar_en)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, deEspacio, aEspacio, tipo, texto, secreto, archivo, escena ? JSON.stringify(escena) : null,
      DIRECTOS.includes(tipo) ? 'aprobado' : 'pendiente', ahora(), DIRECTOS.includes(tipo) ? ahora() : null, ahora() + (yo?.dias_fotos ?? 30) * DIA);
    repo.auditar(deEspacio, 'ventana', `planta_${tipo}`, id);
    return { ok: true, mensaje: mensaje(id) };
  }

  function opcionesPostal(m, escena) {
    const otros = Object.values(AMBIENTES).map((a) => a.nombre).filter((n) => n !== escena.nombre);
    return barajar([escena.nombre, ...barajar(otros, m.id).slice(0, 2)], `${m.id}p`);
  }

  // Lo que ve cada niño de un mensaje. Quien lo recibe juega antes de verlo entero (postal y puzle).
  function vista(m, yo) {
    const mio = m.de_espacio === yo;
    const escena = m.escena ? JSON.parse(m.escena) : null;
    const v = { id: m.id, mio, tipo: m.tipo, texto: m.texto, estado: m.estado, juego: m.juego, creado: m.creado, archivo: !!m.archivo };
    const oculto = !mio && m.juego !== 'resuelto' && (m.tipo === 'postal' || m.tipo === 'puzle');
    if (m.tipo === 'puzle' && !oculto) v.secreto = m.secreto;
    if (m.tipo === 'postal' && oculto) {
      Object.assign(v, { texto: '', intentos: m.intentos, pistas: { paleta: escena.paleta }, opciones: opcionesPostal(m, escena) });
    } else if (escena) v.escena = escena;
    return v;
  }

  // Conversaciones del niño con cada vecino (lo suyo, aunque esté pendiente; lo de los demás, solo aprobado).
  function conversaciones(espacioId) {
    const lista = vecinos(espacioId);
    if (!lista.length) return [];
    const msgs = db.prepare(`SELECT * FROM planta WHERE ((de_espacio = ? AND estado != 'rechazado') OR (a_espacio = ? AND estado = 'aprobado')) ORDER BY creado`)
      .all(espacioId, espacioId);
    return lista.map((v) => ({
      ...v,
      mensajes: msgs.filter((m) => m.de_espacio === v.id || m.a_espacio === v.id).map((m) => vista(m, espacioId)),
    }));
  }

  // Para el adulto de confianza: lo que su niño quiere mandar a otros niños.
  function pendientes(espacioId) {
    return db.prepare(`SELECT p.*, e.alias AS para FROM planta p JOIN espacios e ON e.id = p.a_espacio
      WHERE p.de_espacio = ? AND p.estado = 'pendiente' ORDER BY p.creado`).all(espacioId)
      .map((m) => ({ ...vista(m, espacioId), para: m.para, secreto: m.secreto }));
  }

  function decidir(espacioId, id, decision, quien) {
    const m = mensaje(id);
    if (!m || m.de_espacio !== espacioId) return { ok: false, error: 'no_existe' };
    if (m.estado !== 'pendiente') return { ok: false, error: 'ya_decidido' };
    if (!['aprobado', 'rechazado'].includes(decision)) return { ok: false, error: 'decision' };
    db.prepare('UPDATE planta SET estado = ?, decidido = ? WHERE id = ?').run(decision, ahora(), id);
    repo.auditar(espacioId, quien, decision === 'aprobado' ? 'aprobar_planta' : 'rechazar_planta', id);
    return { ok: true, mensaje: mensaje(id) };
  }

  function recibido(espacioId, id, tipo) {
    const m = mensaje(id);
    if (!m || m.a_espacio !== espacioId || m.tipo !== tipo || m.estado !== 'aprobado') return null;
    return m;
  }

  function adivinarPostal(espacioId, id, donde) {
    const m = recibido(espacioId, id, 'postal');
    if (!m) return null;
    if (m.juego === 'resuelto') return { acierto: true, mensaje: vista(m, espacioId), de: m.de_espacio };
    const acierto = norm(donde) === norm(JSON.parse(m.escena).nombre);
    const intentos = m.intentos + 1;
    db.prepare('UPDATE planta SET intentos = ?, juego = ? WHERE id = ?').run(intentos, acierto || intentos >= MAX_INTENTOS ? 'resuelto' : 'cerrado', id);
    return { acierto, mensaje: vista(mensaje(id), espacioId), de: m.de_espacio };
  }

  function puzleResuelto(espacioId, id) {
    const m = recibido(espacioId, id, 'puzle');
    if (!m) return null;
    if (m.juego !== 'resuelto') db.prepare("UPDATE planta SET juego = 'resuelto' WHERE id = ?").run(id);
    return { mensaje: vista(mensaje(id), espacioId), de: m.de_espacio };
  }

  // Un niño puede ver la foto de un mensaje si lo envió él o si le llegó aprobado.
  function archivoVisible(espacioId, id) {
    const m = mensaje(id);
    if (!m?.archivo) return null;
    if (m.de_espacio === espacioId || (m.a_espacio === espacioId && m.estado === 'aprobado')) return m;
    return null;
  }

  function archivosDe(espacioId) {
    return db.prepare('SELECT archivo FROM planta WHERE (de_espacio = ? OR a_espacio = ?) AND archivo IS NOT NULL').all(espacioId, espacioId).map((r) => r.archivo);
  }

  // Al borrar los datos de un niño se borra todo lo que envió y recibió en la planta.
  function borrarDe(espacioId) {
    const archivos = archivosDe(espacioId);
    db.prepare('DELETE FROM planta WHERE de_espacio = ? OR a_espacio = ?').run(espacioId, espacioId);
    return archivos;
  }

  function limpiar(momento = ahora()) {
    const viejos = db.prepare(`SELECT id, archivo FROM planta WHERE borrar_en < ? OR (estado = 'rechazado' AND decidido < ?)`).all(momento, momento - DIA);
    for (const m of viejos) db.prepare('DELETE FROM planta WHERE id = ?').run(m.id);
    return viejos.map((m) => m.archivo).filter(Boolean);
  }

  // Para la exportación del tutor: lo que su niño envió y recibió (con alias, sin ids de otros espacios).
  function exportar(espacioId) {
    return db.prepare(`SELECT p.tipo, p.texto, p.estado, p.creado, p.de_espacio = ? AS enviado, e.alias AS con
      FROM planta p JOIN espacios e ON e.id = CASE WHEN p.de_espacio = ? THEN p.a_espacio ELSE p.de_espacio END
      WHERE p.de_espacio = ? OR p.a_espacio = ? ORDER BY p.creado`).all(espacioId, espacioId, espacioId, espacioId)
      .map((r) => ({ ...r, enviado: !!r.enviado }));
  }

  return { activar, enComunidad, vecinos, esVecino, enviar, conversaciones, pendientes, decidir, adivinarPostal, puzleResuelto, archivoVisible, archivosDe, borrarDe, limpiar, exportar, mensaje };
}
