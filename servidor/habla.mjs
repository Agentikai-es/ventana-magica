// Voz que sale, local: Piper lee en voz alta la narración de la ventana dentro de la caja.
// · Sin internet: el programa y las voces (es_ES y es_MX, «medium») están en herramientas/ y modelos/piper/.
// · Solo lee texto que genera la propia ventana (narración del catálogo), como mucho 400 caracteres.
// · El audio se crea en una carpeta temporal y se borra; solo queda en una caché pequeña en memoria.
// · Sin Piper, el móvil usa la voz del propio dispositivo, como siempre.

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ejecutar, FFMPEG, ffmpegDisponible } from './voz.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
// En la Pi: el ejecutable oficial (herramientas/piper/piper). En un Mac: piper-tts en un entorno local (herramientas/piper-venv).
const BINARIOS = [join(RAIZ, 'herramientas', 'piper', 'piper'), join(RAIZ, 'herramientas', 'piper-venv', 'bin', 'piper')];
export const VOCES = { es_ES: 'es_ES-davefx-medium', es_MX: 'es_MX-ald-medium' };
export const MAX_TEXTO = 400;
const MAX_CACHE = 40;

const binario = () => process.env.VP_PIPER_BIN || BINARIOS.find((p) => existsSync(p)) || null;
const modeloDe = (voz) => join(RAIZ, 'modelos', 'piper', `${VOCES[voz] || VOCES[process.env.VP_PIPER_VOZ] || VOCES.es_ES}.onnx`);

export function hablaDisponible(voz) {
  return process.env.VP_PIPER !== '0' && !!binario() && ffmpegDisponible() && existsSync(modeloDe(voz));
}

function piper(texto, modelo, salida) {
  return new Promise((resolve, reject) => {
    const p = spawn(binario(), ['--model', modelo, '--output_file', salida], { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = '';
    const reloj = setTimeout(() => p.kill(), 30000);
    p.stderr.on('data', (d) => { error += d; });
    p.on('error', reject);
    p.on('close', (codigo) => { clearTimeout(reloj); codigo === 0 ? resolve() : reject(new Error(`piper ${codigo}: ${error.slice(-200)}`)); });
    p.stdin.end(texto);
  });
}

const cache = new Map();
let cola = Promise.resolve();

// Texto → audio m4a (AAC mono). Una síntesis cada vez: en la Pi la CPU se reparte con la voz que entra.
export async function hablar(texto, { voz } = {}) {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO);
  if (!limpio) throw new Error('texto');
  if (!hablaDisponible(voz)) throw new Error('habla_no_disponible');
  const modelo = modeloDe(voz);
  const clave = createHash('sha1').update(`${modelo}\n${limpio}`).digest('hex');
  if (cache.has(clave)) return cache.get(clave);
  const trabajo = cola.then(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vp-habla-'));
    try {
      await piper(limpio, modelo, join(dir, 'voz.wav'));
      await ejecutar(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', join(dir, 'voz.wav'), '-ac', '1', '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart', join(dir, 'voz.m4a')]);
      return await readFile(join(dir, 'voz.m4a'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  cola = trabajo.catch(() => {});
  const audio = await trabajo;
  cache.set(clave, audio);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return audio;
}
