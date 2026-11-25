// Presupuesto de tiempo de la voz: transcribir una frase de 5 s no puede pasar de VP_PRESUPUESTO_VOZ_MS (4000 por defecto).
// En la Raspberry Pi 4 este es el riesgo real de la demo. Sin whisper o sin modelo, la prueba se salta y lo dice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { transcribirWav, limpiarTranscripcion, vozDisponible, MODELO, calentar } from './voz.mjs';
import { interpretar } from '../web/lib/escenario.js';

const WAV = fileURLToPath(new URL('../evals/voz/frase-5s.wav', import.meta.url));
const PRESUPUESTO = Number(process.env.VP_PRESUPUESTO_VOZ_MS) || 4000;

test(`la voz transcribe una frase de 5 s en menos de ${PRESUPUESTO} ms y la ventana la entiende`, { skip: vozDisponible() ? false : 'sin whisper-cli, modelo o ffmpeg en esta máquina' }, async (t) => {
  await calentar(); // el servidor calienta al arrancar: la primera vez en frío no cuenta
  const t0 = performance.now();
  const texto = limpiarTranscripcion(await transcribirWav(WAV));
  const ms = Math.round(performance.now() - t0);
  t.diagnostic(`modelo ${MODELO.split('/').pop()} · ${ms} ms · «${texto}»`);
  assert.ok(ms <= PRESUPUESTO, `la voz tarda ${ms} ms y el presupuesto es ${PRESUPUESTO} ms`);
  assert.equal(interpretar(texto).ambiente, 'paris', `«${texto}» debería llevar a París`);
});
