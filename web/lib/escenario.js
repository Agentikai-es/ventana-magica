// Interpretación (v2): frase libre del niño → Escenario estructurado.
// Sin modelo de lenguaje: reglas y sinónimos del catálogo. Nunca lanza error.

import {
  AMBIENTES, PERSONAJES, OBJETOS, AVATARES, MARCAS, NO_PERMITIDO, ALTERNATIVAS_SEGURAS, MOMENTOS, CLIMAS, normalizar,
} from './catalogo.js';

const MAX_PERSONAJES = 3;

// Posición de un término (una o varias palabras) dentro de la frase normalizada, o -1.
function posicion(fraseConEspacios, termino) {
  const t = normalizar(termino);
  if (!t) return -1;
  return fraseConEspacios.indexOf(` ${t} `);
}

// El término que aparece antes; a igual posición, el más largo («torre eiffel» gana a «torre»).
function primero(f, grupos) {
  let mejor = null;
  for (const [id, g] of Object.entries(grupos)) {
    for (const s of g.sinonimos) {
      const p = posicion(f, s);
      if (p >= 0 && (mejor === null || p < mejor.p || (p === mejor.p && s.length > mejor.l))) mejor = { id, p, l: s.length };
    }
  }
  return mejor ? mejor.id : null;
}
const primerAmbiente = (f) => primero(f, AMBIENTES);

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
  return avatar && Object.hasOwn(AVATARES, avatar) ? avatar : porDefecto;
}

// Construye un escenario completo a partir de un ambiente del catálogo.
export function construirEscenario(ambiente, { avatar, personajes = [], sustituido = false, momento = 'dia', clima = 'despejado' } = {}) {
  if (!Object.hasOwn(AMBIENTES, ambiente)) return null;
  const a = AMBIENTES[ambiente];
  const lista = [...new Set([...personajes.filter((p) => Object.hasOwn(PERSONAJES, p)), ...a.personajes])].slice(0, MAX_PERSONAJES);
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
    momento: Object.hasOwn(MOMENTOS, momento) ? momento : 'dia',
    clima: Object.hasOwn(CLIMAS, clima) ? clima : 'despejado',
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

// «No sé», «sorpréndeme»…: el niño no sabe qué pedir y la ventana le propone ideas.
const NO_SE = ['no se', 'no lo se', 'ni idea', 'sorprendeme', 'sorpresa', 'lo que sea', 'lo que quieras', 'elige tu', 'decide tu', 'cualquiera', 'que me recomiendas', 'ideas', 'ayudame'];
export const esNoSe = (frase) => { const f = ` ${normalizar(frase)} `; return NO_SE.some((x) => f.includes(` ${x} `)); };

// Momento del día real: de noche la ventana propone cielos de noche.
const momentoDe = (hora) => (hora >= 21 || hora < 7 ? 'noche' : hora >= 18 ? 'atardecer' : 'dia');
const CLIMA_SUGERIDO = { polo: 'nieve', montana: 'nieve', islandia: 'nieve', canada: 'hojas', golosinas: 'confeti', circo: 'confeti', mar: 'burbujas', hawai: 'despejado' };

// Sugerencias para cuando el niño no sabe qué pedir. Primero, ir con un amigo de la planta; después, lugares
// que aún no ha visitado, con el cielo de la hora real. Siempre 3 y sin repetir. Deterministas con la misma semilla.
export function sugerir({ avatar, amigos = [], visitados = [], hora = 12, semilla = 0 } = {}) {
  const momento = momentoDe(hora);
  const out = [];
  const amigo = amigos.filter((a) => a.ambiente && Object.hasOwn(AMBIENTES, a.ambiente))[semilla % Math.max(1, amigos.length)] || amigos.find((a) => a.ambiente);
  if (amigo) out.push({ ...construirEscenario(amigo.ambiente, { avatar, momento }), conAmigo: { id: amigo.id, alias: amigo.alias } });
  const ids = Object.keys(AMBIENTES).filter((id) => !out.some((e) => e.ambiente === id));
  const nuevos = ids.filter((id) => !visitados.includes(id));
  const lista = (nuevos.length >= 3 ? nuevos : ids);
  const inicio = hash(`${semilla}`) % lista.length;
  for (let i = 0; out.length < 3 && i < lista.length; i++) {
    const id = lista[(inicio + i * 7) % lista.length];
    if (out.some((e) => e.ambiente === id)) continue;
    const clima = momento === 'noche' && !CLIMA_SUGERIDO[id] ? 'estrellas' : CLIMA_SUGERIDO[id] || 'despejado';
    out.push(construirEscenario(id, { avatar, momento, clima }));
  }
  return out;
}

// Aplica un ajuste de cielo a un escenario existente.
export function ajustar(escenario, { momento, clima } = {}) {
  if (!escenario || escenario.tipo !== 'escenario') return escenario;
  return construirEscenario(escenario.ambiente, {
    avatar: escenario.avatar, personajes: escenario.personajes, sustituido: escenario.sustituido,
    momento: momento || escenario.momento, clima: clima || escenario.clima,
  });
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
    if (esNoSe(n)) return { tipo: 'alternativas', motivo: 'no_se', ambiente: null, rolNino: 'protagonista', avatar: avatarValido(avatar, 'zorrito'), alternativas: sugerir({ avatar, semilla: hash(n) }) };

    const palabras = n.split(' ');
    if (palabras.some((p) => NO_PERMITIDO.includes(p))) {
      return respuestaAlternativas('contenido', n, avatar);
    }

    const f = ` ${n} `;
    const { ids, sustituido } = personajesPedidos(f);
    const momento = primero(f, MOMENTOS);
    const clima = primero(f, CLIMAS);
    let ambiente = primerAmbiente(f);
    if (!ambiente && ids.length > 0) ambiente = PERSONAJES[ids[0]].casa;
    // Solo cambia el cielo («que sea de noche», «que llueva»): se aplica sobre el escenario que ya tiene.
    if (!ambiente && (momento || clima)) return { tipo: 'ajuste', momento, clima };
    if (!ambiente) return respuestaAlternativas('fuera_catalogo', n, avatar);

    return construirEscenario(ambiente, { avatar, personajes: ids, sustituido, momento: momento || 'dia', clima: clima || 'despejado' });
  } catch {
    return respuestaAlternativas('fuera_catalogo', '', avatar);
  }
}
