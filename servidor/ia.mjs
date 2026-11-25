// IA de texto local: un modelo pequeño (Qwen2.5 1,5B, ~1 GB) con llama.cpp, dentro de la misma caja.
//
// Para qué: entender frases libres que las reglas del catálogo no entienden («donde viven los pingüinos»,
// «un sitio con mucho calor y camellos») y convertirlas en un escenario.
// Límites de seguridad:
// · La IA nunca escribe texto para el niño: solo elige ids del catálogo (lugar, hora, clima, personajes),
//   forzada por un esquema JSON. Lo que no esté en el catálogo se descarta.
// · La frase no se guarda ni sale de la máquina. Sin internet.
// · Si no hay modelo o tarda, la tablet usa las reglas y las alternativas seguras de siempre.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableParallelism } from 'node:os';
import { AMBIENTES, PERSONAJES, MOMENTOS, CLIMAS } from '../web/lib/catalogo.js';
import { construirEscenario } from '../web/lib/escenario.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const BINARIOS = [join(RAIZ, 'herramientas', 'bin', 'llama-server'), join(RAIZ, 'herramientas', 'llama.cpp', 'build', 'bin', 'llama-server')];
const BIN = process.env.VP_LLAMA_BIN || BINARIOS.find((p) => existsSync(p));
// Solo modelos probados que entienden bien al niño. El de 0,5B se probó el 24 nov y acertó 3 de cada 10: no se usa.
export const MODELOS_IA = ['qwen2.5-1.5b-instruct-q4_k_m.gguf', 'qwen2.5-3b-instruct-q4_k_m.gguf'];
function buscarModelo() {
  if (process.env.VP_IA_MODELO) return process.env.VP_IA_MODELO;
  return MODELOS_IA.map((m) => join(RAIZ, 'modelos', m)).find((m) => existsSync(m)) || null;
}
const MODELO = buscarModelo();
const PUERTO = Number(process.env.VP_IA_PUERTO) || 8091;

// Esquema que obliga al modelo a responder solo con ids del catálogo.
export const ESQUEMA = {
  type: 'object',
  properties: {
    lugar: { type: 'string', enum: Object.keys(AMBIENTES) },
    momento: { type: 'string', enum: Object.keys(MOMENTOS) },
    clima: { type: 'string', enum: Object.keys(CLIMAS) },
    personajes: { type: 'array', items: { type: 'string', enum: Object.keys(PERSONAJES) }, maxItems: 3 },
  },
  required: ['lugar', 'momento', 'clima', 'personajes'],
};

const LISTA_LUGARES = Object.entries(AMBIENTES).map(([id, a]) => `${id} = ${a.nombre}`).join('; ');
const LISTA_PERSONAJES = Object.entries(PERSONAJES).map(([id, p]) => `${id} = ${p.nombre}`).join('; ');

// Ejemplos: con un modelo tan pequeño, enseñar el formato con casos funciona mucho mejor que explicarlo.
const EJEMPLOS = [
  ['quiero ir donde hace mucho frío y hay osos blancos', '{"lugar":"polo","momento":"dia","clima":"nieve","personajes":["oso_polar"]}'],
  ['un sitio con arena, mucho calor y camellos', '{"lugar":"egipto","momento":"dia","clima":"despejado","personajes":["camello"]}'],
  ['la estatua grande de América por la noche', '{"lugar":"nueva_york","momento":"noche","clima":"despejado","personajes":[]}'],
  ['donde comen bambú los pandas', '{"lugar":"china","momento":"dia","clima":"despejado","personajes":["panda"]}'],
  ['vacas y gallinas y que llueva', '{"lugar":"granja","momento":"dia","clima":"lluvia","personajes":["vaca","gallina"]}'],
];

export function prompt(frase) {
  const ej = EJEMPLOS.map(([p, r]) => `<|im_start|>user\n${p}<|im_end|>\n<|im_start|>assistant\n${r}<|im_end|>`).join('\n');
  return `<|im_start|>system
Conviertes lo que pide un niño en un escenario. Lugares posibles: ${LISTA_LUGARES}.
Personajes posibles: ${LISTA_PERSONAJES}.
Responde solo con JSON.<|im_end|>
${ej}
<|im_start|>user
${String(frase).slice(0, 200)}<|im_end|>
<|im_start|>assistant
`;
}

// Convierte la respuesta del modelo en un escenario válido, o null. Nunca confía en el texto: todo se valida.
export function aEscenario(respuesta, { avatar } = {}) {
  let r;
  try { r = typeof respuesta === 'string' ? JSON.parse(respuesta) : respuesta; } catch { return null; }
  if (!r || !Object.hasOwn(AMBIENTES, r.lugar)) return null;
  const personajes = (Array.isArray(r.personajes) ? r.personajes : []).filter((p) => Object.hasOwn(PERSONAJES, p)).slice(0, 3);
  return construirEscenario(r.lugar, {
    avatar, personajes,
    momento: Object.hasOwn(MOMENTOS, r.momento) ? r.momento : 'dia',
    clima: Object.hasOwn(CLIMAS, r.clima) ? r.clima : 'despejado',
  });
}

export function iaDisponible() {
  return process.env.VP_IA !== '0' && !!BIN && !!MODELO && existsSync(MODELO);
}

let proceso = null;
let listo = null;

// Arranca llama-server la primera vez que hace falta (o al calentar) y espera a que responda.
function arrancar() {
  if (listo) return listo;
  const hilos = String(Math.max(1, Math.min(4, availableParallelism())));
  proceso = spawn(BIN, ['-m', MODELO, '--host', '127.0.0.1', '--port', String(PUERTO), '-c', '4096', '-t', hilos, '--log-disable'], { stdio: 'ignore' });
  proceso.unref();
  proceso.on('exit', () => { proceso = null; listo = null; });
  listo = (async () => {
    for (let i = 0; i < 120; i++) {
      try { if ((await fetch(`http://127.0.0.1:${PUERTO}/health`)).ok) return true; } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('ia_no_arranca');
  })();
  listo.catch(() => { listo = null; });
  return listo;
}

export async function calentarIA() {
  if (!iaDisponible()) return;
  try { await arrancar(); await preguntar('una playa'); } catch {}
}

async function preguntar(frase, ms = 12000, temperatura = 0) {
  await arrancar();
  const r = await fetch(`http://127.0.0.1:${PUERTO}/completion`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: prompt(frase), json_schema: ESQUEMA, n_predict: 80, temperature: temperatura, cache_prompt: true }),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw new Error('ia_fallo');
  return (await r.json()).content;
}

// Punto de entrada: frase libre → escenario del catálogo, o null si la IA no sabe o no está.
export async function entender(frase, { avatar, preguntarA = preguntar } = {}) {
  if (!String(frase || '').trim()) return null;
  try { return aEscenario(await preguntarA(frase), { avatar }); } catch { return null; }
}

// Ideas que no se repiten: la IA recibe un tema al azar (nunca texto del niño) y propone un escenario del catálogo.
// Con temperatura > 0 cada vez sale algo distinto; todo se valida con aEscenario y se descartan los lugares a evitar.
export const TEMAS = [
  'un sitio con mucha agua y animales', 'un lugar de España precioso', 'una aventura muy fría', 'algo con mucho calor y arena',
  'un sitio mágico de noche con estrellas', 'una ciudad famosa del mundo', 'un bosque con animales del bosque', 'un sitio para bucear',
  'una montaña muy alta', 'un lugar con música y fiesta', 'un sitio con dinosaurios o animales grandes', 'un lugar escondido y misterioso',
  'una isla tranquila', 'un viaje al espacio', 'una granja con animales', 'un lugar con nieve y renos',
];
export async function idear({ avatar, evitar = [], cuantas = 2, azar = Math.random, preguntarA = (f) => preguntar(f, 12000, 0.9) } = {}) {
  const temas = [...TEMAS].sort(() => azar() - 0.5).slice(0, cuantas + 2);
  const ideas = [];
  for (const tema of temas) {
    if (ideas.length >= cuantas) break;
    try {
      const e = aEscenario(await preguntarA(tema), { avatar });
      if (e && !evitar.includes(e.ambiente) && !ideas.some((x) => x.ambiente === e.ambiente)) ideas.push({ ...e, tema });
    } catch {}
  }
  return ideas;
}

export function pararIA() {
  if (proceso) { proceso.kill(); proceso = null; listo = null; }
}
