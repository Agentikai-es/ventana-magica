// Cuento de la noche (F3). Solo texto: la voz la pone el navegador (voz de respaldo).
// Se sustituye [APORTE] por la idea de un aporte aprobado; si no hay aportes, se quita el hueco.

export const MARCA = '[APORTE]';

export function construirCuento(base, aportesAprobados = []) {
  if (typeof base !== 'string' || base.trim() === '') return '';
  const ideas = aportesAprobados.map((a) => `un dibujo de ${a.autor}`);
  if (!base.includes(MARCA)) return base;
  if (ideas.length === 0) return base.split(MARCA).join('').replace(/\s+\n/g, '\n');
  // Un hueco por aporte; si sobran aportes, se repite el último hueco con el siguiente aporte.
  const partes = base.split(MARCA);
  let out = partes[0];
  for (let i = 1; i < partes.length; i++) {
    out += (ideas[i - 1] ?? ideas[ideas.length - 1]) + partes[i];
  }
  return out;
}
