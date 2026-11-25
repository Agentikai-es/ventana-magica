// Mide cuánto tarda la voz local por frase (objetivo en la Raspberry Pi 4: menos de 4 s).
//   npm run medir-voz                       → modelo que usaría el servidor
//   npm run medir-voz -- tiny base small    → compara modelos
// Usa las frases de prueba de evals/voz (voz sintética del sistema, 5 s, 16 kHz mono). No graba ni envía nada.
import { readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableParallelism, cpus, totalmem } from 'node:os';
import { transcribirWav, limpiarTranscripcion, vozDisponible, MODELO } from '../servidor/voz.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PRESUPUESTO = Number(process.env.VP_PRESUPUESTO_VOZ_MS) || 4000;
const REPETICIONES = 3;
const hilos = Math.max(1, Math.min(4, availableParallelism()));
const frases = readdirSync(join(RAIZ, 'evals', 'voz')).filter((f) => f.endsWith('.wav')).sort().map((f) => join(RAIZ, 'evals', 'voz', f));
const pedidos = process.argv.slice(2);
const modelos = pedidos.length ? pedidos.map((m) => join(RAIZ, 'modelos', `ggml-${m}-q5_1.bin`)) : [MODELO];

if (!vozDisponible()) { console.error('Sin voz: falta whisper-cli, el modelo o ffmpeg («npm run voz»).'); process.exit(2); }
console.log(`Máquina: ${cpus()[0]?.model || '?'} · ${Math.round(totalmem() / 2 ** 30)} GB · ${hilos} hilos · presupuesto ${PRESUPUESTO} ms`);
let peorTotal = 0;
for (const modelo of modelos) {
  if (!existsSync(modelo)) { console.log(`\n${basename(modelo)}: no está en modelos/, se salta.`); continue; }
  await transcribirWav(frases[0], { modelo, hilos }); // en frío no cuenta: el servidor calienta al arrancar
  console.log(`\n${basename(modelo)}`);
  const tiempos = [];
  for (const f of frases) {
    const t = [];
    let texto = '';
    for (let i = 0; i < REPETICIONES; i++) {
      const t0 = performance.now();
      texto = limpiarTranscripcion(await transcribirWav(f, { modelo, hilos }));
      t.push(performance.now() - t0);
    }
    t.sort((a, b) => a - b);
    tiempos.push(...t);
    const med = Math.round(t[Math.floor(t.length / 2)]);
    const marca = t[t.length - 1] > PRESUPUESTO ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
    console.log(`  ${marca} ${basename(f).padEnd(20)} mediana ${String(med).padStart(5)} ms · peor ${String(Math.round(t[t.length - 1])).padStart(5)} ms · «${texto}»`);
  }
  tiempos.sort((a, b) => a - b);
  const peor = Math.round(tiempos[tiempos.length - 1]);
  peorTotal = Math.max(peorTotal, peor);
  console.log(`  Total: mediana ${Math.round(tiempos[Math.floor(tiempos.length / 2)])} ms · peor ${peor} ms${peor > PRESUPUESTO ? '  ← PASA DEL PRESUPUESTO' : ''}`);
}
process.exit(peorTotal > PRESUPUESTO ? 1 : 0);
