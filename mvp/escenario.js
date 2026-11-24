// Interpretación (v2): frase libre del niño → Escenario estructurado.
// Sin modelo de lenguaje: reglas y sinónimos del catálogo. Nunca lanza error.

import {
  AMBIENTES, PERSONAJES, OBJETOS, AVATARES, MARCAS, NO_PERMITIDO, ALTERNATIVAS_SEGURAS, normalizar,
} from './catalogo.js';

const MAX_PERSONAJES = 3;

// Posición de un término (una o varias palabras) dentro de la frase normalizada, o -1.
function posicion(fraseConEspacios, termino) {
  const t = normalizar(termino);
  if (!t) return -1;
  return fraseConEspacios.indexOf(` ${t} `);
}

function primerAmbiente(f) {
  let mejor = null;
  for (const [id, a] of Object.entries(AMBIENTES)) {
    for (const s of a.sinonimos) {
      const p = posicion(f, s);
      if (p >= 0 && (mejor === null || p < mejor.p)) mejor = { id, p };
    }
  }
  return mejor ? mejor.id : null;
}

// Personajes pedidos (incluidas las marcas, ya traducidas a su equivalente original), en orden de aparición.
function personajesPedidos(f) {
  const encontrados = [];
  for (const [id, pj] of Object.entries(PERSONAJES)) {
    for (const s of pj.sinonimos) {
      const p = posicion(f, s);
      if (p >= 0) encontrados.push({ id, p });
    }
  }
  let sustituido = false;
  for (const [marca, id] of Object.entries(MARCAS)) {
    const p = posicion(f, marca);
    if (p >= 0) {
      encontrados.push({ id, p });
      sustituido = true;
    }
  }
  encontrados.sort((a, b) => a.p - b.p);
  const ids = [...new Set(encontrados.map((e) => e.id))];
  return { ids, sustituido };
}

function avatarValido(avatar, porDefecto) {
  return avatar && AVATARES[avatar] ? avatar : porDefecto;
}

// Construye un escenario completo a partir de un ambiente del catálogo.
export function construirEscenario(ambiente, { avatar, personajes = [], sustituido = false } = {}) {
  const a = AMBIENTES[ambiente];
  if (!a) return null;
  const lista = [...new Set([...personajes.filter((p) => PERSONAJES[p]), ...a.personajes])].slice(0, MAX_PERSONAJES);
  return {
    tipo: 'escenario',
    ambiente,
    nombre: a.nombre,
    paleta: [...a.paleta],
    personajes: lista,
    objetos: a.objetos.filter((o) => OBJETOS[o]),
    sonido: a.sonido,
    rolNino: 'protagonista',
    papel: a.papel,
    avatar: avatarValido(avatar, a.avatar),
    sustituido,
  };
}

function hash(texto) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Tres escenarios seguros y distintos. Deterministas para la misma frase.
export function alternativasSeguras(frase = '', { avatar } = {}) {
  const n = ALTERNATIVAS_SEGURAS.length;
  const inicio = hash(normalizar(frase)) % n;
  return [0, 1, 2].map((i) => construirEscenario(ALTERNATIVAS_SEGURAS[(inicio + i) % n], { avatar }));
}

function respuestaAlternativas(motivo, frase, avatar) {
  return {
    tipo: 'alternativas',
    motivo, // 'vacio' | 'contenido' | 'fuera_catalogo'
    ambiente: null,
    rolNino: 'protagonista',
    avatar: avatarValido(avatar, 'zorrito'),
    alternativas: alternativasSeguras(frase, { avatar }),
  };
}

// Punto de entrada: frase (voz o texto) → escenario o 3 alternativas seguras.
export function interpretar(frase, { avatar } = {}) {
  try {
    const n = normalizar(frase);
    if (!n) return respuestaAlternativas('vacio', '', avatar);

    const palabras = n.split(' ');
    if (palabras.some((p) => NO_PERMITIDO.includes(p))) {
      return respuestaAlternativas('contenido', n, avatar);
    }

    const f = ` ${n} `;
    const { ids, sustituido } = personajesPedidos(f);
    let ambiente = primerAmbiente(f);
    if (!ambiente && ids.length > 0) ambiente = PERSONAJES[ids[0]].casa;
    if (!ambiente) return respuestaAlternativas('fuera_catalogo', n, avatar);

    return construirEscenario(ambiente, { avatar, personajes: ids, sustituido });
  } catch {
    return respuestaAlternativas('fuera_catalogo', '', avatar);
  }
}
