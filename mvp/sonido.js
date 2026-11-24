// Banda sonora suave por ambiente, generada con Web Audio (sin archivos ni servicios externos).
// Apagada por defecto: solo suena si alguien toca el botón.

// Notas (Hz) de un acorde tranquilo por ambiente.
export const ACORDES = {
  campanas: [523.25, 659.25, 783.99],
  cosmos: [220, 329.63, 440],
  selva: [293.66, 369.99, 440],
  ciudad: [349.23, 440, 523.25],
  olas: [261.63, 329.63, 392],
  pajaros: [392, 493.88, 587.33],
  viento: [246.94, 311.13, 369.99],
  nana: [196, 246.94, 293.66],
};

export function crearMusica() {
  let ctx = null;
  let nodos = [];

  function parar() {
    for (const n of nodos) { try { n.stop(); } catch {} }
    nodos = [];
  }

  function tocar(sonido) {
    const notas = ACORDES[sonido];
    if (!notas) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    parar();
    const salida = ctx.createGain();
    salida.gain.value = 0;
    salida.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5);
    salida.connect(ctx.destination);
    notas.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      // Pequeño vaivén de volumen para que respire.
      const g = ctx.createGain();
      g.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.1 + i * 0.07;
      lfoG.gain.value = 0.3;
      lfo.connect(lfoG).connect(g.gain);
      o.connect(g).connect(salida);
      o.start();
      lfo.start();
      nodos.push(o, lfo);
    });
  }

  return { tocar, parar };
}
