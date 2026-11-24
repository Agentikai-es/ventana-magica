// Utilidades compartidas por las pantallas.

export const $ = (id) => document.getElementById(id);

// La app se guarda en el dispositivo para abrir sin conexión (ver sw.js).
if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => {});

export const MENSAJES = {
  sin_acceso: 'Tu acceso ha caducado o se ha retirado. Pide un código nuevo.',
  sin_conexion: 'Sin conexión con la caja ahora mismo. Tu ventana sigue funcionando; lo demás llegará en cuanto vuelva.',
  codigo_no_valido: 'Ese código no funciona: puede que ya se haya usado o que haya caducado. Pide otro a quien te lo mandó.',
  demasiados_intentos: 'Demasiados intentos. Espera un minuto.',
  formato: 'Ese archivo no es una foto válida.',
  demasiado_grande: 'La foto es demasiado grande.',
  voz_no_disponible: 'La voz no está disponible ahora. Escribe o usa los botones.',
  voz_fallo: 'No te he entendido bien. ¿Lo repites o lo escribes?',
  consentimiento: 'Falta la referencia del consentimiento firmado.',
  clave: 'Clave incorrecta.',
  alias: 'Escribe un alias con letras.',
  audio_vacio: 'No he oído nada. Toca «Hablar», di adónde quieres ir y luego «Ya está».',
};

export class ErrorApi extends Error {}

// Petición a la API. Añade la cabecera anti-CSRF y convierte errores en mensajes claros.
export async function api(ruta, { metodo = 'GET', cuerpo, tipo, cabeceras = {}, redirigir = !ruta.startsWith('/api/panel') } = {}) {
  const h = { ...cabeceras };
  let body = cuerpo;
  if (metodo !== 'GET') h['x-vp'] = '1';
  if (cuerpo !== undefined && !(cuerpo instanceof Blob)) { body = JSON.stringify(cuerpo); h['content-type'] = 'application/json'; }
  if (tipo) h['content-type'] = tipo;
  let r;
  try {
    r = await fetch(ruta, { method: metodo, headers: h, body, credentials: 'same-origin' });
  } catch {
    throw new ErrorApi(MENSAJES.sin_conexion);
  }
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401 && redirigir) { location.href = '/?sin=acceso'; throw new ErrorApi(MENSAJES.sin_acceso); }
  if (!r.ok) throw new ErrorApi(MENSAJES[datos.error] || 'Algo ha fallado. Inténtalo otra vez.');
  return datos;
}

// Tiempo real con reconexión automática (EventSource ya reintenta solo).
export function escuchar(rol, manejadores) {
  const fuente = new EventSource(`/api/eventos?rol=${rol}`);
  for (const [evento, fn] of Object.entries(manejadores)) {
    fuente.addEventListener(evento, (e) => fn(JSON.parse(e.data || '{}')));
  }
  return fuente;
}

export function haceCuanto(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'ahora mismo';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

// Campanita suave generada en el navegador (sin archivos).
export function campanita() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 1);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}
