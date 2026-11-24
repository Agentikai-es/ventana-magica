// Narración (v2): 3–4 frases cortas con el niño como protagonista.
// La lee la voz del navegador (voz de respaldo). El apodo, si llega, no se guarda.

import { PERSONAJES } from './catalogo.js';

// Solo letras y espacios, máximo 15 caracteres. Cualquier otra cosa se descarta.
export function limpiarApodo(apodo) {
  if (typeof apodo !== 'string') return '';
  const limpio = apodo.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, '').replace(/\s+/g, ' ').trim();
  return limpio.slice(0, 15).trim();
}

function enumerar(lista) {
  if (lista.length === 0) return '';
  if (lista.length === 1) return lista[0];
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

function enumerarO(lista) {
  if (lista.length <= 1) return lista[0] || '';
  return `${lista.slice(0, -1).join(', ')} o ${lista[lista.length - 1]}`;
}

const ENTRADA_ALTERNATIVAS = {
  vacio: 'Dime adónde quieres ir hoy.',
  contenido: 'Vamos a buscar una aventura tranquila y bonita.',
  fuera_catalogo: 'Esa aventura todavía no cabe en la ventana, pero tengo otras preparadas.',
};

export function narrar(escenario, { apodo } = {}) {
  if (!escenario || typeof escenario !== 'object') return '';

  if (escenario.tipo === 'alternativas') {
    const nombres = (escenario.alternativas || []).map((a) => a.nombre);
    const entrada = ENTRADA_ALTERNATIVAS[escenario.motivo] || ENTRADA_ALTERNATIVAS.fuera_catalogo;
    return `${entrada} ¿Te apetece ir a ${enumerarO(nombres)}?`;
  }

  const nombre = limpiarApodo(apodo);
  const quien = nombre ? `Hoy, ${nombre}, eres` : 'Hoy tú eres';
  const amigos = (escenario.personajes || []).map((id) => PERSONAJES[id]?.nombre).filter(Boolean);

  const frases = [
    `La ventana se abre y aparece ${escenario.nombre}.`,
    `${quien} ${escenario.papel}.`,
  ];
  if (amigos.length === 1) frases.push(`${amigos[0]} te espera para jugar contigo.`);
  if (amigos.length > 1) frases.push(`${enumerar(amigos)} te esperan para jugar contigo.`);
  frases.push('Respira hondo, mira a tu alrededor y elige tu primera aventura.');
  return frases.join(' ');
}
