// Pantalla de la familia o la clase: conversación con el niño (sus puzles y postales-acertijo) y envío de fotos o vídeos con pistas.
import { componerEscena, pintarEscena } from './lib/escena.js';
import { LUGARES } from './lib/catalogo.js';
import { $, api, escuchar, haceCuanto } from './comun.js';
import { ponerIconos } from './iconos.js';
import { efecto } from './sonido.js';
import { crearPuzle } from './puzle.js';
import { grabar, grabadoraDisponible, mmss } from './grabador.js';

ponerIconos();

let archivo = null;  // { blob, tipo }
let datos = null;
let alias = '';

$('lugar').append(...LUGARES.map((l) => Object.assign(document.createElement('option'), { value: l, textContent: l.replace(/^desde /, 'Desde ') })),
  Object.assign(document.createElement('option'), { value: '', textContent: 'Prefiero no decirlo' }));

for (const b of document.querySelectorAll('[data-cerrar]')) b.onclick = () => b.closest('dialog').close();
$('juego').addEventListener('click', (e) => { if (e.target === $('juego')) $('juego').close(); });

const img = (src, alt) => Object.assign(document.createElement('img'), { src, alt, loading: 'lazy' });

// ---------- Elegir foto o vídeo ----------
// La foto se redibuja en un lienzo (se pierden los metadatos ya en el móvil). El servidor lo vuelve a limpiar todo.
async function prepararFoto(f) {
  const mapa = await createImageBitmap(f, { imageOrientation: 'from-image' });
  const esc = Math.min(1, 1280 / Math.max(mapa.width, mapa.height));
  const c = document.createElement('canvas');
  c.width = Math.round(mapa.width * esc); c.height = Math.round(mapa.height * esc);
  c.getContext('2d').drawImage(mapa, 0, 0, c.width, c.height);
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Vista previa de tu foto');
  return { blob: await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85)), vista: c, tipo: 'image/jpeg' };
}

$('archivo').onchange = async () => {
  const f = $('archivo').files[0];
  if (!f) return;
  $('mensaje').textContent = '';
  try {
    if (f.type.startsWith('video/')) {
      if (f.size > 40 * 1024 * 1024) throw new Error('El vídeo es demasiado grande. Prueba con uno más corto (hasta 20 segundos).');
      const v = Object.assign(document.createElement('video'), { src: URL.createObjectURL(f), controls: true, playsInline: true, muted: true });
      archivo = { blob: f, tipo: f.type };
      $('previa').replaceChildren(v);
    } else {
      const { blob, vista, tipo } = await prepararFoto(f);
      archivo = { blob, tipo };
      $('previa').replaceChildren(vista);
    }
    $('previa').classList.remove('oculto');
    $('enviar').disabled = false;
    $('mensaje').textContent = `¡Lista! Escribe dos pistas para que ${alias} adivine que eres tú.`;
  } catch (e) {
    archivo = null; $('enviar').disabled = true;
    $('mensaje').textContent = e.message?.startsWith('El vídeo') ? e.message : 'No puedo abrir ese archivo. Prueba con otra foto o vídeo.';
  }
};

$('enviar').onclick = async () => {
  if (!archivo) return;
  $('enviar').disabled = true;
  $('mensaje').textContent = archivo.tipo.startsWith('video/') ? 'Mandando el vídeo… (puede tardar un poco)' : 'Mandando…';
  const pistas = ['pista1', 'pista2', 'pista3'].map((id) => $(id).value.trim()).filter(Boolean);
  try {
    await api('/api/enviar', { metodo: 'POST', cuerpo: archivo.blob, tipo: archivo.tipo, cabeceras: {
      'x-texto': encodeURIComponent($('texto').value.trim()),
      'x-pistas': encodeURIComponent(JSON.stringify(pistas)),
      'x-lugar': encodeURIComponent($('lugar').value),
      'x-dias': $('dias').value,
    } });
    efecto('envio');
    const cuando = $('dias').value === '0' ? 'Después le llegará' : `Le llegará ${$('dias').selectedOptions[0].textContent.toLowerCase()}`;
    $('mensaje').textContent = `✓ ¡Guardada! Quien cuida de ${alias} la verá primero. ${cuando} como un puzle con tus pistas.`;
    archivo = null;
    for (const id of ['archivo', 'texto', 'pista1', 'pista2', 'pista3']) $(id).value = '';
    $('previa').classList.add('oculto');
    cargar();
  } catch (e) {
    $('mensaje').textContent = e.message;
    $('enviar').disabled = false;
  }
};

// ---------- Conversación ----------
function abrirPuzleDelNino(m) {
  $('juegoTitulo').textContent = `Foto-puzle de ${alias}`;
  const ayuda = Object.assign(document.createElement('p'), { textContent: `Monta el puzle para leer el mensaje secreto de ${alias}. Toca una pieza y luego otra para cambiarlas.` });
  ayuda.style.cssText = 'margin:0 0 1rem;text-align:center';
  const caja = document.createElement('div');
  $('juegoContenido').replaceChildren(ayuda, caja);
  $('juego').showModal();
  $('juegoTitulo').focus();
  crearPuzle(caja, `/medios/${m.id}`, {
    titulo: `Puzle de ${alias}`,
    alResolver: async () => {
      const v = await api(`/api/enviar/puzle/${m.id}`, { metodo: 'POST' });
      const s = document.createElement('p'); s.className = 'quien'; s.style.textAlign = 'center';
      s.textContent = `«${v.secreto}»`;
      const pie = Object.assign(document.createElement('p'), { textContent: `Mensaje secreto de ${alias}` });
      pie.style.cssText = 'text-align:center;margin:0';
      caja.append(s, pie);
      cargar();
    },
  });
}

function misterioPostal(m) {
  const caja = document.createElement('div'); caja.className = 'misterio';
  const velo = document.createElement('div'); velo.className = 'velo';
  velo.style.background = `linear-gradient(180deg, ${m.pistas.paleta[0]}, ${m.pistas.paleta[1]})`;
  const em = document.createElement('span'); em.textContent = m.pistas.personajes.join(' ');
  velo.appendChild(em);
  const q = Object.assign(document.createElement('b'), { textContent: `¿Dónde está ${alias} hoy?` });
  const ops = document.createElement('div'); ops.className = 'opciones';
  const res = document.createElement('p'); res.setAttribute('role', 'status'); res.style.cssText = 'margin:0;font-weight:700;min-height:1.2em';
  for (const o of m.opciones) {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'opcion', textContent: o });
    b.onclick = async () => {
      const r = await api(`/api/enviar/postal/${m.id}`, { metodo: 'POST', cuerpo: { donde: o } });
      b.classList.add(r.acierto ? 'bien' : 'mal');
      efecto(r.acierto ? 'acierto' : 'fallo');
      if (r.mensaje.juego === 'resuelto') { res.textContent = r.acierto ? '¡Acertaste!' : `¡Casi! Estaba en ${r.mensaje.escena.nombre}.`; setTimeout(cargar, 900); }
      else res.textContent = '¡Casi! Mira bien los personajes y prueba otra vez.';
    };
    ops.appendChild(b);
  }
  caja.append(velo, q, ops, res);
  return caja;
}

function burbuja(m) {
  const d = document.createElement('div');
  d.className = `burbuja ${m.de === 'fuera' ? 'mia' : 'suya'}${m.estado === 'pendiente' ? ' espera' : ''}`;
  const audio = () => Object.assign(document.createElement('audio'), { src: `/medios/${m.id}`, controls: true, preload: 'none' });
  if (m.tipo === 'postal' && m.juego !== 'resuelto') d.appendChild(misterioPostal(m));
  else if (m.tipo === 'postal') {
    const mp = document.createElement('div'); mp.className = 'mini-postal';
    mp.innerHTML = '<div class="marco"><div class="vista"><div class="escena"></div></div></div>';
    pintarEscena(mp.querySelector('.escena'), componerEscena(m.escena));
    d.append(mp, Object.assign(document.createElement('div'), { textContent: `${alias} está en ${m.escena.nombre}` }));
    if (m.archivo) d.appendChild(audio());
  }
  if (m.tipo === 'puzle' && m.juego !== 'resuelto') {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'principal', textContent: `Montar el puzle de ${alias}` });
    b.onclick = () => abrirPuzleDelNino(m);
    d.append(Object.assign(document.createElement('div'), { textContent: `${alias} te ha mandado una foto-puzle con un mensaje secreto.` }), b);
  } else if (m.tipo === 'puzle') {
    d.append(img(`/medios/${m.id}`, `Foto de ${alias}`), Object.assign(document.createElement('div'), { textContent: `Mensaje secreto: «${m.secreto}»` }));
  }
  if (m.tipo === 'audio' && m.archivo) d.appendChild(audio());
  if (m.texto && (m.tipo === 'texto' || m.tipo === 'postal')) d.appendChild(Object.assign(document.createElement('div'), { textContent: m.texto }));
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.textContent = [haceCuanto(m.creado), m.estado === 'pendiente' ? `lo verá primero quien cuida de ${alias}` : m.estado === 'rechazado' ? 'no se ha enviado' : ''].filter(Boolean).join(' · ');
  d.appendChild(meta);
  return d;
}

$('componer').onsubmit = async (e) => {
  e.preventDefault();
  const texto = $('chatTexto').value.trim();
  if (!texto) return;
  try {
    await api('/api/enviar/mensaje', { metodo: 'POST', cuerpo: { texto } });
    $('chatTexto').value = ''; efecto('envio');
    $('chatAviso').textContent = `Enviado. Lo verá primero quien cuida de ${alias}.`;
    cargar();
  } catch (err) { $('chatAviso').textContent = err.message; }
};

let grab = null;
$('chatAudio').onclick = async () => {
  if (grab) { grab.terminar(); return; }
  if (!grabadoraDisponible()) { $('chatAviso').textContent = 'Este móvil no permite grabar audio aquí.'; return; }
  try { grab = await grabar({ max: 60, alTick: (s) => { $('chatAudioTexto').textContent = `Parar y enviar ${mmss(s)}`; } }); }
  catch { $('chatAviso').textContent = 'No puedo usar el micrófono.'; return; }
  $('chatAudio').classList.add('grabando');
  const audio = await grab.listo;
  grab = null;
  $('chatAudio').classList.remove('grabando');
  $('chatAudioTexto').textContent = 'Mandar un audio';
  try {
    await api('/api/enviar/mensaje', { metodo: 'POST', cuerpo: audio, tipo: audio.type || 'audio/webm' });
    efecto('envio');
    $('chatAviso').textContent = `Audio enviado. Lo escuchará primero quien cuida de ${alias}.`;
    cargar();
  } catch (err) { $('chatAviso').textContent = err.message; }
};

// ---------- Lo que has mandado ----------
function filaFoto(f) {
  const descubierta = datos.descubiertas.includes(f.id);
  const fila = document.createElement('div'); fila.className = 'tarjeta envio';
  const info = document.createElement('div');
  const t = Object.assign(document.createElement('p'), { textContent: f.texto || 'Sin mensaje' });
  const meta = document.createElement('p'); meta.className = 'aviso';
  const ins = document.createElement('span');
  ins.className = `insignia ${f.estado}`;
  ins.textContent = f.estado === 'pendiente' ? `La verá primero quien cuida de ${alias}`
    : f.estado === 'rechazado' ? 'No se ha publicado. Puedes mandar otra'
    : f.entregarEn > Date.now() ? `Le llegará el ${new Date(f.entregarEn).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}`
    : descubierta ? `¡${alias} te ha descubierto!` : `${alias} aún está con el puzle`;
  meta.append(ins, ` · ${haceCuanto(f.creado)}`);
  info.append(t, meta);
  const der = document.createElement('div'); der.className = 'derecha';
  if (f.reaccion) {
    der.append(Object.assign(document.createElement('span'), { className: 'reac', textContent: f.reaccion, ariaHidden: 'true' }),
      Object.assign(document.createElement('span'), { className: 'sr-only', textContent: `${alias} ha respondido con ${f.reaccion}` }));
  }
  const quitar = Object.assign(document.createElement('button'), { type: 'button', className: 'retirar', textContent: 'Retirar' });
  quitar.setAttribute('aria-label', `Retirar «${f.texto || 'sin mensaje'}»`);
  quitar.onclick = async () => {
    if (!confirm('¿Retirar? Desaparecerá también de la ventana.')) return;
    try { await api(`/api/enviar/${f.id}`, { metodo: 'DELETE' }); cargar(); } catch (e) { $('mensaje').textContent = e.message; }
  };
  der.appendChild(quitar);
  fila.append(img(`/fotos/${f.id}`, f.texto || 'Lo que mandaste'), info, der);
  return fila;
}

async function cargar() {
  datos = await api('/api/enviar');
  alias = datos.alias;
  $('titulo').textContent = `Ventana de ${alias}`;
  $('hola').textContent = `Hola, ${datos.etiqueta}. ${alias} está en el hospital y le encanta saber de ti. Mándale una sorpresa: le llegará como un puzle y tendrá que adivinar que eres tú.`;
  $('revisa').textContent = `Quien cuida de ${alias} lo verá antes que nadie.`;
  for (const el of document.querySelectorAll('.alias')) el.textContent = alias;
  document.title = `Ventana de ${alias}`;
  $('burbujas').replaceChildren(...(datos.chat.length ? datos.chat.map(burbuja)
    : [Object.assign(document.createElement('p'), { textContent: `Aquí verás lo que te mande ${alias}: mensajes, audios, postales con acertijo y fotos-puzle.`, style: 'margin:.2rem;color:#4a4c66' })]));
  $('sinMios').classList.toggle('oculto', datos.mios.length > 0);
  $('mios').replaceChildren(...datos.mios.map(filaFoto));
}

cargar().then(() => escuchar('aportador', { actualizar: cargar })).catch((e) => { $('mensaje').textContent = e.message; });
