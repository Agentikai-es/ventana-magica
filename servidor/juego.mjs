// Juego y chat de la Ventana Mágica.
//
// Foto que llega al niño:  cerrado (puzle por montar) → resuelto (acertijo: ¿quién y desde dónde?) → descubierto.
// Mientras no la descubre, el niño NO ve quién la envió ni el texto: así el acertijo es de verdad.
// Chat: mensajes de texto, audio, foto o puzle entre el niño y cada persona de fuera.
// Todo lo que va al niño y todo lo que sale del niño pasa antes por el adulto de confianza.

import { createHash, randomUUID } from 'node:crypto';
import { AMBIENTES, PERSONAJES, LUGARES } from '../web/lib/catalogo.js';

const DIA = 24 * 60 * 60 * 1000;
export const MAX_INTENTOS = 3; // al tercer fallo se descubre igualmente: el juego nunca frustra
const PERSONAS_SENUELO = ['Tu profe', 'Un amigo del cole', 'Tu tía', 'Tu vecina'];

// Orden estable a partir de un id (mismo orden cada vez que se pide, distinto en cada foto).
function barajar(lista, semilla) {
  const peso = (x) => createHash('sha256').update(`${semilla}:${x}`).digest().readUInt32BE(0);
  return [...lista].sort((a, b) => peso(a) - peso(b));
}

const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function crearJuego(repo) {
  const { db } = repo;
  const ahora = () => Date.now();

  function personasDe(espacioId) {
    return db.prepare("SELECT id, etiqueta FROM accesos WHERE espacio_id = ? AND rol = 'aportador' AND revocado = 0 ORDER BY creado").all(espacioId);
  }

  function opciones(a) {
    const reales = personasDe(a.espacio_id).map((p) => p.etiqueta).filter((n) => n !== a.autor);
    const senuelos = PERSONAS_SENUELO.filter((n) => n !== a.autor && !reales.includes(n));
    const quien = barajar([a.autor, ...barajar([...reales, ...senuelos], a.id).slice(0, 2)], `${a.id}q`);
    const donde = a.lugar ? barajar([a.lugar, ...barajar(LUGARES.filter((l) => norm(l) !== norm(a.lugar)), a.id).slice(0, 2)], `${a.id}d`) : [];
    return { quien, donde };
  }

  // Lo que ve el niño de cada foto, según por dónde va el juego.
  function vistaNino(a) {
    const base = { id: a.id, juego: a.juego, reaccion: a.reaccion, creado: a.creado };
    if (a.juego === 'cerrado') return base;
    if (a.juego === 'resuelto') return { ...base, pistas: a.pistas, opciones: opciones(a), intentos: a.intentos };
    return { ...base, pistas: a.pistas, autor: a.autor, texto: a.texto, lugar: a.lugar, accesoId: a.acceso_id, video: !!a.video };
  }

  function fotoDelNino(espacioId, aporteId) {
    const a = repo.aporte(aporteId);
    if (!a || a.espacio_id !== espacioId || a.tipo !== 'foto' || a.estado !== 'aprobado') return null;
    return a;
  }

  // El niño ha montado el puzle: empieza el acertijo.
  function puzleResuelto(espacioId, aporteId) {
    const a = fotoDelNino(espacioId, aporteId);
    if (!a) return null;
    if (a.juego === 'cerrado') db.prepare("UPDATE aportes SET juego = 'resuelto' WHERE id = ?").run(a.id);
    return vistaNino(repo.aporte(a.id));
  }

  // El niño responde al acertijo. Devuelve si acertó cada parte y la foto (descubierta si toca).
  function adivinar(espacioId, aporteId, { quien, donde }) {
    const a = fotoDelNino(espacioId, aporteId);
    if (!a || a.juego === 'cerrado') return null;
    if (a.juego === 'descubierto') return { quien: true, donde: true, foto: vistaNino(a) };
    const okQuien = norm(quien) === norm(a.autor);
    const okDonde = !a.lugar || norm(donde) === norm(a.lugar);
    const intentos = a.intentos + 1;
    const descubre = (okQuien && okDonde) || intentos >= MAX_INTENTOS;
    db.prepare('UPDATE aportes SET intentos = ?, juego = ? WHERE id = ?').run(intentos, descubre ? 'descubierto' : 'resuelto', a.id);
    return { quien: okQuien, donde: okDonde, foto: vistaNino(repo.aporte(a.id)) };
  }

  // ---------- Chat ----------
  function crearMensaje(espacioId, { accesoId, de, tipo, texto = '', secreto = '', archivo = null, escena = null }) {
    const e = repo.espacio(espacioId);
    const id = randomUUID();
    db.prepare(`INSERT INTO mensajes (id, espacio_id, acceso_id, de, tipo, texto, secreto, archivo, escena, estado, creado, borrar_en)
      VALUES (?,?,?,?,?,?,?,?,?,'pendiente',?,?)`)
      .run(id, espacioId, accesoId, de, tipo, texto, secreto, archivo, escena ? JSON.stringify(escena) : null, ahora(), ahora() + (e?.dias_fotos ?? 30) * DIA);
    repo.auditar(espacioId, de === 'nino' ? 'ventana' : accesoId, `mensaje_${tipo}`, id);
    return mensaje(id);
  }

  function mensaje(id) {
    return db.prepare('SELECT * FROM mensajes WHERE id = ?').get(id) || null;
  }

  // Opciones de «¿Dónde está hoy?»: el lugar real y dos más, siempre en el mismo orden para esa postal.
  function opcionesPostal(m, escena) {
    const otros = Object.values(AMBIENTES).map((a) => a.nombre).filter((n) => n !== escena.nombre);
    return barajar([escena.nombre, ...barajar(otros, m.id).slice(0, 2)], `${m.id}p`);
  }

  // Vista de un mensaje para quien lo mira.
  // · Puzle del niño: el secreto solo se ve cuando quien lo recibe monta el puzle.
  // · Postal del niño: quien la recibe ve pistas (personajes y colores) hasta adivinar dónde está; después, la postal y el mensaje.
  function vistaMensaje(m, para) {
    const escena = m.escena ? JSON.parse(m.escena) : null;
    const oculto = para === 'fuera' && m.juego !== 'resuelto' && (m.tipo === 'puzle' || m.tipo === 'postal');
    const v = { id: m.id, de: m.de, tipo: m.tipo, texto: m.texto, estado: m.estado, juego: m.juego, creado: m.creado, archivo: !!m.archivo, accesoId: m.acceso_id };
    if (m.tipo === 'puzle' && !oculto) v.secreto = m.secreto;
    if (m.tipo === 'postal') {
      if (oculto) {
        Object.assign(v, { texto: '', archivo: false, intentos: m.intentos,
          pistas: { personajes: escena.personajes.slice(0, 2).map((id) => PERSONAJES[id]?.emoji).filter(Boolean), paleta: escena.paleta },
          opciones: opcionesPostal(m, escena) });
      } else v.escena = escena;
    }
    return v;
  }

  // Quien recibe la postal adivina dónde está el niño hoy. Al tercer fallo se desbloquea igualmente.
  function adivinarPostal(acceso, id, donde) {
    const m = mensaje(id);
    if (!m || m.acceso_id !== acceso.id || m.tipo !== 'postal' || m.estado !== 'aprobado') return null;
    const escena = JSON.parse(m.escena);
    if (m.juego === 'resuelto') return { acierto: true, mensaje: vistaMensaje(m, 'fuera') };
    const acierto = norm(donde) === norm(escena.nombre);
    const intentos = m.intentos + 1;
    db.prepare('UPDATE mensajes SET intentos = ?, juego = ? WHERE id = ?').run(intentos, acierto || intentos >= MAX_INTENTOS ? 'resuelto' : 'cerrado', id);
    return { acierto, mensaje: vistaMensaje(mensaje(id), 'fuera') };
  }

  // Conversaciones del niño: una por persona de fuera.
  function chatsNino(espacioId) {
    const msgs = db.prepare(`SELECT * FROM mensajes WHERE espacio_id = ? AND (estado = 'aprobado' OR de = 'nino') AND estado != 'rechazado' ORDER BY creado`).all(espacioId);
    return personasDe(espacioId).map((p) => ({
      accesoId: p.id, nombre: p.etiqueta,
      mensajes: msgs.filter((m) => m.acceso_id === p.id).map((m) => vistaMensaje(m, 'nino')),
    }));
  }

  // Conversación de una persona de fuera con el niño.
  function chatFuera(acceso) {
    return db.prepare(`SELECT * FROM mensajes WHERE espacio_id = ? AND acceso_id = ? AND (de = 'fuera' OR estado = 'aprobado') ORDER BY creado`)
      .all(acceso.espacio_id, acceso.id).map((m) => vistaMensaje(m, 'fuera'));
  }

  function pendientes(espacioId) {
    const nombres = Object.fromEntries(personasDe(espacioId).map((p) => [p.id, p.etiqueta]));
    return db.prepare("SELECT * FROM mensajes WHERE espacio_id = ? AND estado = 'pendiente' ORDER BY creado").all(espacioId)
      .map((m) => ({ ...vistaMensaje(m, 'nino'), persona: nombres[m.acceso_id] || 'Alguien' }));
  }

  function decidirMensaje(espacioId, id, decision, quien) {
    const m = mensaje(id);
    if (!m || m.espacio_id !== espacioId) return { ok: false, error: 'no_existe' };
    if (m.estado !== 'pendiente') return { ok: false, error: 'ya_decidido' };
    if (!['aprobado', 'rechazado'].includes(decision)) return { ok: false, error: 'decision' };
    db.prepare('UPDATE mensajes SET estado = ?, decidido = ? WHERE id = ?').run(decision, ahora(), id);
    repo.auditar(espacioId, quien, decision === 'aprobado' ? 'aprobar_mensaje' : 'rechazar_mensaje', id);
    return { ok: true, mensaje: mensaje(id) };
  }

  // Una persona de fuera ha montado el puzle que le envió el niño: se desbloquea su mensaje secreto.
  function puzleFueraResuelto(acceso, id) {
    const m = mensaje(id);
    if (!m || m.acceso_id !== acceso.id || m.tipo !== 'puzle' || m.estado !== 'aprobado') return null;
    if (m.juego !== 'resuelto') db.prepare("UPDATE mensajes SET juego = 'resuelto' WHERE id = ?").run(id);
    return vistaMensaje(mensaje(id), 'fuera');
  }

  return { personasDe, vistaNino, puzleResuelto, adivinar, crearMensaje, mensaje, vistaMensaje, chatsNino, chatFuera, pendientes, decidirMensaje, puzleFueraResuelto, adivinarPostal };
}
