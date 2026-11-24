// Grabadora de audio sencilla: un botón para empezar y otro para terminar. Máximo `max` segundos.
// El audio se envía al servidor del hospital, que lo convierte y le quita los metadatos.

export function grabadoraDisponible() {
  return !!(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
}

export async function grabar({ max = 60, alTick } = {}) {
  const flujo = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const trozos = [];
  const rec = new MediaRecorder(flujo);
  rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);
  const inicio = Date.now();
  const reloj = setInterval(() => {
    const s = Math.floor((Date.now() - inicio) / 1000);
    alTick?.(s);
    if (s >= max) terminar();
  }, 250);
  let resolver;
  const listo = new Promise((r) => { resolver = r; });
  rec.onstop = () => {
    clearInterval(reloj);
    flujo.getTracks().forEach((t) => t.stop());
    resolver(new Blob(trozos, { type: rec.mimeType || 'audio/webm' }));
  };
  function terminar() { if (rec.state === 'recording') rec.stop(); }
  rec.start();
  return { terminar, listo };
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
