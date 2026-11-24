// Voz local: ffmpeg convierte el audio y whisper.cpp lo transcribe en este mismo servidor.
// El audio nunca sale de la máquina y se borra nada más transcribirlo.

import { execFile, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
// Modelo de voz: el que haya en modelos/, del más preciso al más ligero (en una Raspberry Pi se instala «base» o «tiny»).
const MODELOS = ['ggml-small-q5_1.bin', 'ggml-base-q5_1.bin', 'ggml-tiny-q5_1.bin'].map((m) => join(RAIZ, 'modelos', m));
export const MODELO = process.env.VP_WHISPER_MODELO || MODELOS.find((m) => existsSync(m)) || MODELOS[0];
const HILOS = String(Math.max(1, Math.min(4, (await import('node:os')).availableParallelism())));
// whisper-cli local: primero el ejecutable único (herramientas/bin), si no, una compilación completa, si no, el del sistema.
const LOCALES = [join(RAIZ, 'herramientas', 'bin', 'whisper-cli'), join(RAIZ, 'herramientas', 'whisper.cpp', 'build', 'bin', 'whisper-cli')];
const WHISPER = process.env.VP_WHISPER_BIN || LOCALES.find((p) => existsSync(p)) || 'whisper-cli';
export const FFMPEG = process.env.VP_FFMPEG_BIN || 'ffmpeg';

// Frases que whisper «inventa» con silencio o ruido. Se tratan como vacío.
const ALUCINACIONES = [
  'subtitulos realizados por la comunidad de amara org', 'subtitulos por la comunidad de amara org',
  'gracias por ver el video', 'gracias por ver', 'suscribete', 'musica', 'aplausos', 'risas',
];

export function ejecutar(bin, args, ms = 30000) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: ms, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stderr }));
      else resolve(stdout);
    });
  });
}

export function limpiarTranscripcion(texto) {
  const t = String(texto || '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ') // [Música], (risas)…
    .replace(/\s+/g, ' ')
    .trim();
  const n = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n || ALUCINACIONES.includes(n)) return '';
  return t.slice(0, 200);
}

// ¿Hay ffmpeg? Hace falta para la voz, las fotos, los audios y los vídeos. Se mira una vez.
let hayFfmpeg = null;
export function ffmpegDisponible() {
  if (hayFfmpeg === null) hayFfmpeg = spawnSync(FFMPEG, ['-version'], { timeout: 5000 }).status === 0;
  return hayFfmpeg;
}

export function vozDisponible() {
  if (!ffmpegDisponible()) return false;
  return existsSync(MODELO) && (WHISPER !== 'whisper-cli' || !!process.env.VP_WHISPER_BIN || existsSync('/opt/homebrew/bin/whisper-cli'));
}

export async function transcribir(audio) {
  if (!vozDisponible()) throw new Error('modelo_no_encontrado');
  const dir = await mkdtemp(join(tmpdir(), 'vp-voz-'));
  const entrada = join(dir, 'entrada');
  const wav = join(dir, 'audio.wav');
  try {
    await writeFile(entrada, audio);
    await ejecutar(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', entrada, '-t', '20', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    const salida = await ejecutar(WHISPER, ['-m', MODELO, '-l', 'es', '-t', HILOS, '-nt', '-np', '-f', wav], 60000);
    return limpiarTranscripcion(salida);
  } finally {
    await rm(dir, { recursive: true, force: true }); // el audio se borra siempre, también si falla
  }
}

// Primera transcripción en frío (carga del modelo en la GPU): se hace al arrancar con 1 s de silencio.
export async function calentar() {
  if (!vozDisponible()) return;
  const dir = await mkdtemp(join(tmpdir(), 'vp-voz-'));
  try {
    const wav = join(dir, 'silencio.wav');
    await ejecutar(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '1', wav]);
    await ejecutar(WHISPER, ['-m', MODELO, '-l', 'es', '-nt', '-np', '-f', wav], 120000);
  } catch {} finally {
    await rm(dir, { recursive: true, force: true });
  }
}
