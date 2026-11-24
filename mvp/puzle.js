// Puzle colectivo (F2): los aportes quedan pendientes hasta que un adulto los aprueba.
// Ninguna pieza aparece en la ventana sin aprobación.

export const ESTADO = { PENDIENTE: 'pendiente', APROBADO: 'aprobado', RECHAZADO: 'rechazado' };

export function crearPuzle(totalPiezas = 12) {
  return { totalPiezas, aportes: [] };
}

// Un aporte es un dibujo o foto. Se valida el tipo y el permiso antes de guardarlo.
export function añadirAporte(puzle, aporte) {
  const tiposOk = ['image/png', 'image/jpeg'];
  if (!aporte || !tiposOk.includes(aporte.tipo)) {
    return { ok: false, error: 'formato' };
  }
  if (aporte.permisoEscrito !== true) {
    return { ok: false, error: 'sin_permiso' };
  }
  const id = puzle.aportes.length + 1;
  const nuevo = { id, tipo: aporte.tipo, autor: aporte.autor || 'anónimo', estado: ESTADO.PENDIENTE };
  return { ok: true, puzle: { ...puzle, aportes: [...puzle.aportes, nuevo] }, aporte: nuevo };
}

export function aprobarAporte(puzle, id) {
  return cambiarEstado(puzle, id, ESTADO.APROBADO);
}

export function rechazarAporte(puzle, id) {
  return cambiarEstado(puzle, id, ESTADO.RECHAZADO);
}

function cambiarEstado(puzle, id, estado) {
  const existe = puzle.aportes.find((a) => a.id === id);
  if (!existe) return { ok: false, error: 'no_existe' };
  if (existe.estado !== ESTADO.PENDIENTE) return { ok: false, error: 'ya_decidido' };
  const aportes = puzle.aportes.map((a) => (a.id === id ? { ...a, estado } : a));
  return { ok: true, puzle: { ...puzle, aportes } };
}

// Piezas visibles para el niño: solo aportes aprobados, hasta el total del puzle.
export function piezasVisibles(puzle) {
  return puzle.aportes.filter((a) => a.estado === ESTADO.APROBADO).slice(0, puzle.totalPiezas);
}
