// Sonido de la Ventana Mágica: paisajes sonoros y efectos, sintetizados en el navegador.
// Sin archivos ni servicios externos: funciona sin conexión y no carga al servidor.
// El navegador solo deja sonar tras un toque del niño: se activa en la primera interacción.

const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
let ctx = null;
let maestro = null;
let ambiente = null;   // { parar() }
let activo = localStorage.getItem('vp-sonido') !== 'no';
let pedido = null;     // { sonido, clima } a sonar en cuanto haya permiso

function asegurar() {
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    maestro = ctx.createGain();
    maestro.gain.value = activo ? 0.9 : 0;
    maestro.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Primer toque en cualquier sitio: se desbloquea el audio y suena el paisaje pendiente.
addEventListener('pointerdown', () => { if (asegurar() && pedido) paisaje(pedido.sonido, pedido.clima); }, { once: true, capture: true });

function ruido(segundos = 2) {
  const b = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate);
  const d = b.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < d.length; i++) { // ruido «rosado» suave
    ultimo = 0.97 * ultimo + 0.03 * (Math.random() * 2 - 1);
    d[i] = ultimo * 3;
  }
  const s = ctx.createBufferSource();
  s.buffer = b; s.loop = true;
  return s;
}

function gananciaLenta(destino, volumen) {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(volumen, ctx.currentTime + 2);
  g.connect(destino);
  return g;
}

// Capas reutilizables -------------------------------------------------------
function capaRuido(salida, { tipo = 'lowpass', freq = 600, q = 0.7, vol = 0.15, lfo = 0, lfoProf = 0, lfoFreq = false }) {
  const src = ruido(); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
  f.type = tipo; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  src.connect(f).connect(g).connect(salida);
  const nodos = [src];
  if (lfo) {
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.frequency.value = lfo; og.gain.value = lfoProf;
    o.connect(og).connect(lfoFreq ? f.frequency : g.gain);
    o.start(); nodos.push(o);
  }
  src.start();
  return nodos;
}

function capaAcorde(salida, notas, { vol = 0.035, tipo = 'sine' } = {}) {
  return notas.map((n, i) => {
    const o = ctx.createOscillator(); const g = ctx.createGain(); const l = ctx.createOscillator(); const lg = ctx.createGain();
    o.type = tipo; o.frequency.value = n; g.gain.value = vol;
    l.frequency.value = 0.07 + i * 0.05; lg.gain.value = vol * 0.6;
    l.connect(lg).connect(g.gain);
    o.connect(g).connect(salida); o.start(); l.start();
    return [o, l];
  }).flat();
}

// Sonidos sueltos que se repiten de vez en cuando (pájaros, campanas, acordeón…).
function cadaTanto(fn, min, max) {
  let t;
  const siguiente = () => { t = setTimeout(() => { fn(); siguiente(); }, min + Math.random() * (max - min)); };
  siguiente();
  return { stop: () => clearTimeout(t) };
}

function nota(salida, freq, { dur = 0.4, vol = 0.12, tipo = 'sine', cuando = 0, desliz = 0 } = {}) {
  const t = ctx.currentTime + cuando;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (desliz) o.frequency.exponentialRampToValueAtTime(freq * desliz, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(salida); o.start(t); o.stop(t + dur + 0.05);
}

const pajaro = (s) => { const f = 2200 + Math.random() * 1600; for (let i = 0; i < 3; i++) nota(s, f, { dur: 0.09, vol: 0.05, cuando: i * 0.12, desliz: 1.35 }); };
const campana = (s) => { const f = [523, 659, 784][Math.floor(Math.random() * 3)]; nota(s, f, { dur: 2.5, vol: 0.06 }); nota(s, f * 2.01, { dur: 1.6, vol: 0.02 }); };
const acordeon = (s) => { const base = [262, 330, 392, 349, 294][Math.floor(Math.random() * 5)]; [1, 1.25, 1.5].forEach((m, i) => nota(s, base * m, { dur: 0.5, vol: 0.025, tipo: 'sawtooth', cuando: i * 0.18 })); };

// Paisajes por escenario ----------------------------------------------------
const PAISAJES = {
  olas: (s) => [...capaRuido(s, { freq: 500, vol: 0.18, lfo: 0.12, lfoProf: 0.12 }), cadaTanto(() => pajaro(s), 6000, 14000)],
  nana: (s) => [...capaRuido(s, { freq: 380, vol: 0.14, lfo: 0.09, lfoProf: 0.1 }), ...capaAcorde(s, [196, 247, 294])],
  campanas: (s) => [...capaAcorde(s, [262, 330, 392], { vol: 0.025 }), cadaTanto(() => campana(s), 4000, 9000)],
  cosmos: (s) => capaAcorde(s, [110, 165, 220, 330], { vol: 0.03 }),
  selva: (s) => [...capaRuido(s, { tipo: 'bandpass', freq: 2500, q: 0.5, vol: 0.04 }), cadaTanto(() => pajaro(s), 1500, 4000)],
  pajaros: (s) => [...capaRuido(s, { tipo: 'bandpass', freq: 900, q: 0.4, vol: 0.05, lfo: 0.1, lfoProf: 0.03 }), cadaTanto(() => pajaro(s), 2000, 6000)],
  viento: (s) => capaRuido(s, { tipo: 'bandpass', freq: 700, q: 1.5, vol: 0.12, lfo: 0.08, lfoProf: 400, lfoFreq: true }),
  desierto: (s) => [...capaRuido(s, { tipo: 'bandpass', freq: 500, q: 1.2, vol: 0.08, lfo: 0.06, lfoProf: 250, lfoFreq: true }), ...capaAcorde(s, [147, 220], { vol: 0.025, tipo: 'triangle' })],
  ciudad: (s) => [...capaRuido(s, { freq: 300, vol: 0.06 }), ...capaAcorde(s, [349, 440, 523], { vol: 0.02 })],
  acordeon: (s) => [...capaRuido(s, { freq: 400, vol: 0.03 }), cadaTanto(() => acordeon(s), 2500, 5000)],
};
const CLIMAS = {
  lluvia: (s) => capaRuido(s, { tipo: 'highpass', freq: 1200, vol: 0.16 }),
  nieve: (s) => capaRuido(s, { tipo: 'bandpass', freq: 600, q: 2, vol: 0.05, lfo: 0.05, lfoProf: 200, lfoFreq: true }),
  burbujas: (s) => [cadaTanto(() => nota(s, 500 + Math.random() * 600, { dur: 0.12, vol: 0.05, desliz: 1.8 }), 400, 1400)],
  confeti: (s) => [cadaTanto(() => [523, 659, 784, 1047].forEach((f, i) => nota(s, f, { dur: 0.25, vol: 0.04, cuando: i * 0.08, tipo: 'triangle' })), 5000, 9000)],
};

function parar(nodos) {
  for (const n of nodos) { try { n.stop ? n.stop() : null; } catch {} }
}

// Cambia el paisaje sonoro con un fundido suave.
export function paisaje(sonido, clima) {
  pedido = { sonido, clima };
  if (!asegurar() || ctx.state !== 'running') return;
  const viejo = ambiente;
  if (viejo) {
    viejo.salida.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    setTimeout(() => parar(viejo.nodos), 1400);
  }
  const salida = gananciaLenta(maestro, 1);
  const nodos = [...(PAISAJES[sonido]?.(salida) || []), ...(CLIMAS[clima]?.(salida) || [])];
  ambiente = { salida, nodos };
}

// Efectos del juego ---------------------------------------------------------
const EFECTOS = {
  toque: (s) => nota(s, 660, { dur: 0.08, vol: 0.06, tipo: 'triangle' }),
  encaja: (s) => { nota(s, 520, { dur: 0.12, vol: 0.08, tipo: 'triangle' }); nota(s, 780, { dur: 0.16, vol: 0.06, tipo: 'triangle', cuando: 0.06 }); },
  resuelto: (s) => [523, 659, 784, 1047, 1319].forEach((f, i) => nota(s, f, { dur: 0.5, vol: 0.08, tipo: 'triangle', cuando: i * 0.09 })),
  acierto: (s) => { nota(s, 660, { dur: 0.2, vol: 0.09, tipo: 'triangle' }); nota(s, 990, { dur: 0.35, vol: 0.09, tipo: 'triangle', cuando: 0.12 }); },
  fallo: (s) => { nota(s, 330, { dur: 0.22, vol: 0.06 }); nota(s, 262, { dur: 0.3, vol: 0.06, cuando: 0.16 }); },
  llega: (s) => [880, 1319].forEach((f, i) => nota(s, f, { dur: 0.9, vol: 0.08, cuando: i * 0.13 })),
  envio: (s) => nota(s, 400, { dur: 0.45, vol: 0.07, desliz: 3, tipo: 'sine' }),
  magia: (s) => [784, 988, 1175, 1568].forEach((f, i) => nota(s, f, { dur: 0.6, vol: 0.05, cuando: i * 0.06 })),
};

export function efecto(nombre) {
  if (!activo || !asegurar()) return;
  EFECTOS[nombre]?.(maestro);
}

export function sonidoActivo() { return activo; }

export function alternarSonido() {
  activo = !activo;
  localStorage.setItem('vp-sonido', activo ? 'si' : 'no');
  if (asegurar()) maestro.gain.linearRampToValueAtTime(activo ? 0.9 : 0, ctx.currentTime + 0.4);
  if (activo && pedido) paisaje(pedido.sonido, pedido.clima);
  return activo;
}
