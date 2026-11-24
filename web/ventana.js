// Tablet del niño: Mi mundo (escenario a su gusto) · Buzón (puzle → acertijo → descubierta) · Mi gente (chat de ida y vuelta).
import { AMBIENTES, AVATARES, PERSONAJES } from './lib/catalogo.js';
import { interpretar, construirEscenario, ajustar } from './lib/escenario.js';
import { componerEscena, pintarEscena } from './lib/escena.js';
import { narrar } from './lib/narracion.js';
import { $, api, escuchar, haceCuanto } from './comun.js';
import { ICONOS, ponerIconos } from './iconos.js';
import { paisaje, efecto, alternarSonido, sonidoActivo } from './sonido.js';
import { crearPuzle } from './puzle.js';
import { grabar, grabadoraDisponible, mmss } from './grabador.js';

ponerIconos();

let estado = null;      // lo que devuelve /api/ventana
let actual = null;      // escenario en pantalla
let avatar = null;
let chatAbierto = null; // accesoId de la conversación abierta
const vistos = JSON.parse(localStorage.getItem('vp-vistos') || '{}'); // último mensaje visto por conversación (solo en esta tablet)

// =============== Mi mundo ===============
async function aplicar(esc, { guardar = true } = {}) {
  actual = esc;
  pintarEscena($('escena'), componerEscena(esc));
  $('titulo').textContent = esc.nombre;
  $('narracion').textContent = narrar(esc);
  $('alternativas').replaceChildren();
  for (const b of $('lugares').children) b.setAttribute('aria-pressed', String(b.dataset.id === esc.ambiente));
  paisaje(AMBIENTES[esc.ambiente].sonido, esc.clima);
  // Copia local del escenario (solo catálogo, nada personal) para abrir igual sin conexión.
  localStorage.setItem('vp-escena', JSON.stringify({ ambiente: esc.ambiente, personajes: esc.personajes, avatar: esc.avatar, momento: esc.momento, clima: esc.clima }));
  if (guardar) await guardarEscena();
}

async function guardarEscena() {
  if (!estado?.alias) return; // sin conexión: se guarda solo en la tablet
  try {
    await api('/api/ventana/escena', { metodo: 'PUT', cuerpo: {
      ambiente: actual.ambiente, personajes: actual.personajes, avatar: actual.avatar, sustituido: actual.sustituido, momento: actual.momento, clima: actual.clima,
    } });
    if (estado) estado.escena = actual;
  } catch (e) { $('estado').textContent = e.message; }
}

function mostrarAlternativas(r) {
  $('narracion').textContent = narrar(r);
  $('alternativas').replaceChildren(...r.alternativas.map((alt) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${PERSONAJES[alt.personajes[0]].emoji} ${alt.nombre}`;
    b.onclick = () => { efecto('magia'); aplicar(construirEscenario(alt.ambiente, { avatar })); };
    return b;
  }));
}

function pedir(frase) {
  const r = interpretar(frase, { avatar });
  if (r.tipo === 'escenario') { efecto('magia'); aplicar(r); return '¡Listo! Mira tu ventana.'; }
  if (r.tipo === 'ajuste' && actual) { efecto('magia'); aplicar(ajustar(actual, r)); return '¡Hecho! Mira el cielo.'; }
  mostrarAlternativas(r);
  return 'Elige una de estas aventuras.';
}

$('formPeticion').onsubmit = (e) => {
  e.preventDefault();
  const frase = $('peticion').value;
  if (!frase.trim()) return;
  $('estado').textContent = pedir(frase);
  $('peticion').value = '';
};

for (const [id, a] of Object.entries(AMBIENTES)) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'lugar'; b.dataset.id = id;
  b.setAttribute('aria-pressed', 'false');
  const e = document.createElement('span'); e.className = 'e'; e.setAttribute('aria-hidden', 'true');
  e.textContent = PERSONAJES[a.personajes[0]].emoji;
  b.append(e, a.nombre);
  b.onclick = () => { efecto('magia'); aplicar(construirEscenario(id, { avatar, momento: actual?.momento, clima: actual?.clima })); };
  $('lugares').appendChild(b);
}

function pintarAvatares() {
  const av = AVATARES[avatar];
  $('soyEmoji').textContent = av.emoji;
  $('soyNombre').textContent = `Soy ${av.nombre}`;
  $('soy').setAttribute('aria-label', `Soy ${av.nombre}. Cambiar quién soy`);
  $('avatares').replaceChildren(...Object.entries(AVATARES).map(([id, a]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(id === avatar));
    const e = document.createElement('span'); e.setAttribute('aria-hidden', 'true'); e.textContent = a.emoji;
    b.append(e, a.nombre);
    b.onclick = () => {
      avatar = id; pintarAvatares(); $('avatar').close(); efecto('toque');
      if (actual) aplicar(construirEscenario(actual.ambiente, { avatar, personajes: actual.personajes, sustituido: actual.sustituido, momento: actual.momento, clima: actual.clima }));
    };
    return b;
  }));
}
$('soy').onclick = () => { $('avatar').showModal(); $('avatares').querySelector('[aria-pressed="true"]')?.focus(); };
for (const d of document.querySelectorAll('dialog')) d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
for (const b of document.querySelectorAll('[data-cerrar]')) b.onclick = () => b.closest('dialog').close();

// Sonido
function pintarSonido() {
  $('sonido').setAttribute('aria-pressed', String(sonidoActivo()));
  $('sonido').setAttribute('aria-label', sonidoActivo() ? 'Quitar el sonido' : 'Poner el sonido');
}
$('sonido').onclick = () => { alternarSonido(); pintarSonido(); };

// Voz local: se graba aquí y se transcribe en el servidor del hospital.
let grabacion = null;
$('mic').onclick = async () => {
  if (grabacion) { grabacion.terminar(); return; }
  window.speechSynthesis?.cancel();
  try {
    grabacion = await grabar({ max: 20 });
  } catch {
    $('estado').textContent = 'No puedo usar el micrófono. Escribe o toca un lugar.';
    return;
  }
  $('mic').classList.add('grabando');
  $('mic').firstElementChild.innerHTML = ICONOS.parar;
  $('micTexto').textContent = 'Ya está';
  $('estado').textContent = 'Te escucho… di adónde quieres ir y toca «Ya está».';
  const audio = await grabacion.listo;
  grabacion = null;
  $('mic').classList.remove('grabando');
  $('mic').firstElementChild.innerHTML = ICONOS.micro;
  $('micTexto').textContent = 'Hablar';
  $('estado').textContent = 'Pensando…';
  try {
    const { texto } = await api('/api/voz', { metodo: 'POST', cuerpo: audio, tipo: audio.type || 'audio/webm', espera: 25000 });
    $('estado').textContent = texto ? `He oído «${texto}». ${pedir(texto)}` : 'No te he oído bien. ¿Lo repites?';
  } catch (e) { $('estado').textContent = e.message; elegirPestana('Lugares'); }
};

// Lectura en voz alta: solo voces del propio dispositivo.
$('leer').onclick = () => {
  if (!('speechSynthesis' in window)) return;
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('es') && v.localService);
  const v = voces.find((x) => x.lang === 'es-ES') || voces[0];
  if (!v) { $('estado').textContent = 'Este dispositivo no tiene voz en español instalada.'; return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance($('narracion').textContent);
  u.voice = v; u.lang = v.lang; u.rate = 0.92;
  speechSynthesis.speak(u);
};

$('enviarPostal').onclick = () => {
  elegirPestana('Gente');
  $('estado').textContent = `Elige a quién mandar tu ${actual?.nombre || 'ventana'} como postal-acertijo.`;
  $('personas').querySelector('button')?.focus();
};

// =============== Modo limpieza (pantalla desinfectable) ===============
// Bloquea el táctil 30 s para pasar la toallita sin pulsar nada.
$('limpiar').onclick = () => {
  const capa = $('limpieza');
  let s = 30;
  capa.classList.remove('oculto');
  $('limpiezaCuenta').textContent = s;
  capa.focus();
  const t = setInterval(() => {
    s -= 1;
    $('limpiezaCuenta').textContent = s;
    if (s <= 0) { clearInterval(t); capa.classList.add('oculto'); efecto('acierto'); $('limpiar').focus(); }
  }, 1000);
};

// =============== Pestañas ===============
const PESTANAS = ['Buzon', 'Gente', 'Lugares'];
function elegirPestana(nombre) {
  for (const p of PESTANAS) {
    const sel = p === nombre;
    $(`tab${p}`).setAttribute('aria-selected', String(sel));
    $(`tab${p}`).tabIndex = sel ? 0 : -1;
    $(`panel${p}`).classList.toggle('oculto', !sel);
  }
}
for (const p of PESTANAS) {
  $(`tab${p}`).onclick = () => { efecto('toque'); elegirPestana(p); };
  $(`tab${p}`).onkeydown = (e) => {
    const i = PESTANAS.indexOf(p) + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0);
    if (i !== PESTANAS.indexOf(p) && PESTANAS[i]) { elegirPestana(PESTANAS[i]); $(`tab${PESTANAS[i]}`).focus(); }
  };
}

// =============== Buzón ===============
const img = (src, alt) => Object.assign(document.createElement('img'), { src, alt, loading: 'lazy' });

function pintarBuzon() {
  const { fotos, puzle } = estado;
  const pendientes = fotos.filter((f) => f.juego !== 'descubierto');
  $('cartas').replaceChildren(...pendientes.map((f) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `carta${f.juego === 'resuelto' ? ' acertijo' : ''}`;
    const s = document.createElement('span'); s.className = 'sobre'; s.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span');
    const tt = document.createElement('b'); tt.textContent = f.juego === 'resuelto' ? '¿Quién te la envía?' : '¡Te ha llegado una carta!';
    const st = document.createElement('small'); st.textContent = `${f.juego === 'resuelto' ? 'Resuelve el acertijo' : 'Monta el puzle para abrirla'} · ${haceCuanto(f.creado)}`;
    t.append(tt, st);
    b.append(s, t);
    b.onclick = () => abrirJuego(f.id);
    return b;
  }));
  $('sinCartas').classList.toggle('oculto', pendientes.length > 0);
  $('globoBuzon').textContent = pendientes.length;
  $('globoBuzon').classList.toggle('oculto', !pendientes.length);

  const descubiertas = fotos.filter((f) => f.juego === 'descubierto').reverse().slice(0, puzle.total);
  $('album').replaceChildren(...Array.from({ length: puzle.total }, (_, i) => {
    const f = descubiertas[i];
    if (!f) { const d = document.createElement('div'); d.setAttribute('aria-hidden', 'true'); return d; }
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = f.id;
    b.appendChild(img(`/fotos/${f.id}`, `Foto de ${f.autor}`));
    if (f.reaccion) { const r = document.createElement('span'); r.className = 'r'; r.textContent = f.reaccion; b.appendChild(r); }
    b.onclick = () => abrirJuego(f.id);
    return b;
  }));
  $('progreso').textContent = `${puzle.hechas} de ${puzle.total} fotos descubiertas`;
  $('barraProgreso').style.width = `${(puzle.hechas / puzle.total) * 100}%`;
  $('premio').classList.toggle('oculto', !puzle.mensaje);
  $('premio').textContent = puzle.mensaje ? `¡Álbum completo! ${puzle.mensaje}` : '';

  // La cuerda de la ventana: las tres últimas cartas (sobres cerrados o fotos ya descubiertas).
  $('cuerda').replaceChildren(...fotos.slice(0, 3).map((f, i) => {
    const p = document.createElement('button');
    p.type = 'button'; p.className = 'postal quieta';
    p.style.left = `${4 + i * 33}%`;
    const pinza = document.createElement('span'); pinza.className = 'pinza';
    p.appendChild(pinza);
    if (f.juego === 'descubierto') p.appendChild(img(`/fotos/${f.id}`, `Foto de ${f.autor}`));
    else { const s = document.createElement('span'); s.className = 'sobre-colgado'; s.textContent = '¡Ábreme!'; p.appendChild(s); p.setAttribute('aria-label', 'Carta sin abrir'); }
    p.onclick = () => abrirJuego(f.id);
    return p;
  }));
}

// =============== Juego: puzle → acertijo → descubierta ===============
function pasos(n) { ['paso1', 'paso2', 'paso3'].forEach((id, i) => $(id).classList.toggle('hecho', i < n)); }

function abrirJuego(id) {
  const f = estado.fotos.find((x) => x.id === id);
  if (!f) return;
  if (!$('juego').open) $('juego').showModal();
  if (f.juego === 'cerrado') mostrarPuzle(f);
  else if (f.juego === 'resuelto') mostrarAcertijo(f);
  else mostrarDescubierta(f);
}

function mostrarPuzle(f) {
  pasos(1);
  $('juegoTitulo').textContent = 'Monta el puzle';
  const ayuda = document.createElement('p');
  ayuda.style.cssText = 'margin:0 0 1rem;text-align:center;font-size:1.05rem';
  ayuda.textContent = 'Toca una pieza y luego otra para cambiarlas. ¡Descubre la foto!';
  const caja = document.createElement('div');
  $('juegoContenido').replaceChildren(ayuda, caja);
  crearPuzle(caja, `/fotos/${f.id}`, {
    lado: estado.lado || 3,
    titulo: 'Puzle de tu carta',
    alResolver: async () => {
      const v = await api(`/api/ventana/foto/${f.id}/puzle`, { metodo: 'POST' });
      Object.assign(f, v);
      pintarBuzon();
      mostrarAcertijo(f);
    },
  });
}

function grupoOpciones(titulo, opciones) {
  const caja = document.createElement('fieldset');
  caja.style.cssText = 'border:0;padding:0;margin:0 0 1rem';
  const lg = document.createElement('legend'); lg.textContent = titulo;
  lg.style.cssText = 'font-weight:800;font-size:1.15rem;margin-bottom:.6rem';
  const rej = document.createElement('div'); rej.className = 'opciones';
  let elegida = null;
  for (const o of opciones) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opcion'; b.textContent = o;
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      elegida = o; efecto('toque');
      for (const x of rej.children) { x.setAttribute('aria-pressed', String(x === b)); x.classList.remove('mal', 'bien'); }
      caja.dispatchEvent(new Event('cambio'));
    };
    rej.appendChild(b);
  }
  caja.append(lg, rej);
  return { caja, valor: () => elegida, marcar: (ok) => rej.querySelector('[aria-pressed="true"]')?.classList.add(ok ? 'bien' : 'mal') };
}

function mostrarAcertijo(f) {
  pasos(2);
  $('juegoTitulo').textContent = '¿Quién te la envía?';
  const cont = [];
  const foto = img(`/fotos/${f.id}`, 'La foto de tu carta');
  foto.style.cssText = 'width:100%;max-height:28vh;object-fit:cover;border-radius:18px;margin-bottom:1rem';
  cont.push(foto);
  const ul = document.createElement('ul'); ul.className = 'pistas';
  if (f.pistas?.length) f.pistas.forEach((p, i) => {
    const li = document.createElement('li'); li.style.animationDelay = `${i * 0.25}s`;
    const b = document.createElement('b'); b.textContent = `Pista ${i + 1}: `;
    li.append(b, p); ul.appendChild(li);
  });
  else { const li = document.createElement('li'); li.textContent = 'Esta carta no trae pistas: ¡usa tu intuición!'; ul.appendChild(li); }
  cont.push(ul);
  const quien = grupoOpciones('¿Quién te la ha enviado?', f.opciones.quien);
  cont.push(quien.caja);
  const donde = f.opciones.donde.length ? grupoOpciones('¿Desde dónde?', f.opciones.donde) : null;
  if (donde) cont.push(donde.caja);
  const aviso = document.createElement('p'); aviso.setAttribute('role', 'status'); aviso.style.cssText = 'font-weight:700;min-height:1.3em';
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'principal'; ok.textContent = 'Comprobar'; ok.disabled = true;
  const listo = () => { ok.disabled = !quien.valor() || (donde && !donde.valor()); };
  quien.caja.addEventListener('cambio', listo); donde?.caja.addEventListener('cambio', listo);
  ok.onclick = async () => {
    ok.disabled = true;
    const r = await api(`/api/ventana/foto/${f.id}/adivinar`, { metodo: 'POST', cuerpo: { quien: quien.valor(), donde: donde?.valor() || '' } });
    quien.marcar(r.quien); donde?.marcar(r.donde);
    Object.assign(f, r.foto);
    if (r.foto.juego === 'descubierto') {
      efecto(r.quien && r.donde ? 'acierto' : 'llega');
      aviso.textContent = r.quien && r.donde ? '¡Lo has adivinado!' : '¡Casi! Te lo cuento yo…';
      setTimeout(async () => { await recargar(); mostrarDescubierta(estado.fotos.find((x) => x.id === f.id) || f); }, 1100);
    } else {
      efecto('fallo');
      aviso.textContent = r.quien ? '¡Has acertado quién! Ahora, ¿desde dónde?' : '¡Casi! Lee otra vez las pistas y prueba de nuevo.';
      listo();
    }
  };
  cont.push(aviso, ok);
  $('juegoContenido').replaceChildren(...cont);
}

function mostrarDescubierta(f) {
  pasos(3);
  $('juegoTitulo').textContent = `¡Era ${f.autor}!`;
  const caja = document.createElement('div'); caja.className = 'revelado';
  if (f.video) {
    const v = document.createElement('video');
    Object.assign(v, { src: `/video/${f.id}`, controls: true, playsInline: true, autoplay: true, poster: `/fotos/${f.id}` });
    caja.appendChild(v);
  } else caja.appendChild(img(`/fotos/${f.id}`, f.texto || `Foto de ${f.autor}`));
  const q = document.createElement('p'); q.className = 'quien';
  q.textContent = `${f.autor}${f.lugar ? `, ${f.lugar}` : ''}`;
  const t = document.createElement('p'); t.style.cssText = 'font-size:1.1rem;margin:.2rem 0 1rem'; t.textContent = f.texto ? `«${f.texto}»` : '';
  const emojis = document.createElement('div'); emojis.style.cssText = 'display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem';
  const gracias = document.createElement('p'); gracias.setAttribute('role', 'status'); gracias.style.cssText = 'font-weight:700;min-height:1.3em;margin:0 0 .8rem';
  for (const em of estado.emojis) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = em; b.className = 'opcion'; b.style.cssText = 'font-size:1.8rem;padding:.4rem .8rem';
    b.setAttribute('aria-pressed', String(f.reaccion === em)); b.setAttribute('aria-label', `Responder con ${em}`);
    b.onclick = async () => {
      await api('/api/ventana/reaccion', { metodo: 'POST', cuerpo: { aporteId: f.id, emoji: em } });
      f.reaccion = em; efecto('envio');
      for (const x of emojis.children) x.setAttribute('aria-pressed', String(x === b));
      gracias.textContent = `¡Se lo he dicho a ${f.autor}! 💌`;
    };
    emojis.appendChild(b);
  }
  const contestar = document.createElement('button'); contestar.type = 'button'; contestar.className = 'principal';
  contestar.innerHTML = ICONOS.charla; contestar.append(`Contestar a ${f.autor}`);
  contestar.onclick = () => { $('juego').close(); abrirChat(f.accesoId); };
  caja.append(q, t, emojis, gracias, contestar);
  $('juegoContenido').replaceChildren(caja);
}

$('juego').addEventListener('close', () => { recargar(); });

// =============== Mi gente (chat) ===============
const ultimo = (c) => c.mensajes[c.mensajes.length - 1];
const sinLeer = (c) => c.mensajes.filter((m) => m.de === 'fuera' && m.creado > (vistos[c.accesoId] || 0)).length;

function resumen(m) {
  if (!m) return 'Todavía no habéis hablado';
  const quien = m.de === 'nino' ? 'Tú: ' : '';
  return quien + ({ texto: m.texto, audio: 'Audio', foto: 'Foto', puzle: 'Foto-puzle', postal: 'Postal-acertijo' }[m.tipo] || '');
}

function pintarPersonas() {
  const total = estado.chats.reduce((n, c) => n + sinLeer(c), 0);
  $('globoGente').textContent = total;
  $('globoGente').classList.toggle('oculto', !total);
  $('personas').replaceChildren(...estado.chats.map((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'persona';
    const ini = document.createElement('span'); ini.className = 'inicial'; ini.textContent = c.nombre.slice(0, 1).toUpperCase(); ini.setAttribute('aria-hidden', 'true');
    const txt = document.createElement('span'); txt.className = 'txt';
    const n = document.createElement('b'); n.textContent = c.nombre;
    const s = document.createElement('small'); s.textContent = resumen(ultimo(c));
    txt.append(n, s);
    b.append(ini, txt);
    if (sinLeer(c)) { const p = document.createElement('span'); p.className = 'punto'; p.setAttribute('aria-label', 'Mensajes nuevos'); b.appendChild(p); }
    b.onclick = () => abrirChat(c.accesoId);
    return b;
  }));
}

function burbuja(m, nombre) {
  const d = document.createElement('div');
  d.className = `burbuja ${m.de === 'nino' ? 'mia' : 'suya'}${m.estado === 'pendiente' ? ' espera' : ''}`;
  const audio = () => Object.assign(document.createElement('audio'), { src: `/medios/${m.id}`, controls: true, preload: 'none' });
  if (m.tipo === 'audio' && m.archivo) d.appendChild(audio());
  if ((m.tipo === 'foto' || m.tipo === 'puzle') && m.archivo) d.appendChild(img(`/medios/${m.id}`, m.tipo === 'puzle' ? 'Tu foto-puzle' : 'Foto'));
  if (m.tipo === 'postal' && m.escena) {
    const mp = document.createElement('div'); mp.className = 'mini-postal';
    mp.innerHTML = '<div class="marco"><div class="vista"><div class="escena"></div></div></div>';
    pintarEscena(mp.querySelector('.escena'), componerEscena(m.escena));
    d.appendChild(mp);
  }
  if (m.tipo === 'postal' && m.archivo) d.appendChild(audio());
  const t = document.createElement('div');
  t.textContent = m.tipo === 'puzle' ? `Mensaje secreto: «${m.secreto}»` : m.texto;
  if (t.textContent) d.appendChild(t);
  const meta = document.createElement('div'); meta.className = 'meta';
  const extra = m.estado === 'pendiente' ? 'esperando a que lo vea quien te cuida'
    : m.estado === 'rechazado' ? 'no se ha enviado'
    : m.tipo === 'puzle' ? (m.juego === 'resuelto' ? `¡${nombre} ya lo ha resuelto!` : `${nombre} aún lo está montando`)
    : m.tipo === 'postal' && m.de === 'nino' ? (m.juego === 'resuelto' ? `¡${nombre} ha adivinado dónde estabas!` : `${nombre} tiene que adivinar dónde estás`) : '';
  meta.textContent = [haceCuanto(m.creado), extra].filter(Boolean).join(' · ');
  d.appendChild(meta);
  return d;
}

function pintarBurbujas() {
  const c = estado.chats.find((x) => x.accesoId === chatAbierto);
  if (!c) return;
  $('chatTitulo').textContent = c.nombre;
  $('burbujas').replaceChildren(...(c.mensajes.length ? c.mensajes.map((m) => burbuja(m, c.nombre))
    : [Object.assign(document.createElement('p'), { className: 'aviso', textContent: `Escribe a ${c.nombre}, mándale un audio, una postal-acertijo desde tu ventana o una foto convertida en puzle.`, style: 'color:#4a4c66' })]));
  const u = ultimo(c);
  if (u) { vistos[c.accesoId] = Math.max(vistos[c.accesoId] || 0, u.creado); localStorage.setItem('vp-vistos', JSON.stringify(vistos)); }
  requestAnimationFrame(() => { $('burbujas').lastElementChild?.scrollIntoView({ block: 'end' }); });
}

function abrirChat(accesoId) {
  chatAbierto = accesoId;
  $('chatAviso').textContent = '';
  pintarBurbujas();
  if (!$('chat').open) $('chat').showModal();
  $('chatTexto').focus();
}
$('chat').addEventListener('close', () => { chatAbierto = null; pintarPersonas(); });

async function enviarMensaje(peticion, ok) {
  try {
    await peticion();
    efecto('envio');
    $('chatAviso').textContent = ok;
    await recargar();
  } catch (e) { $('chatAviso').textContent = e.message; }
}

$('componer').onsubmit = (e) => {
  e.preventDefault();
  const texto = $('chatTexto').value.trim();
  if (!texto) return;
  $('chatTexto').value = '';
  enviarMensaje(() => api('/api/ventana/mensaje', { metodo: 'POST', cuerpo: { para: chatAbierto, texto } }), 'Enviado. Lo verá quien te cuida y enseguida le llegará.');
};

let grabChat = null;
$('chatAudio').onclick = async () => {
  if (grabChat) { grabChat.terminar(); return; }
  if (!grabadoraDisponible()) { $('chatAviso').textContent = 'Aquí no se puede grabar audio.'; return; }
  try {
    grabChat = await grabar({ max: 60, alTick: (s) => { $('chatAudioTexto').textContent = `Parar ${mmss(s)}`; } });
  } catch { $('chatAviso').textContent = 'No puedo usar el micrófono.'; return; }
  $('chatAudio').classList.add('grabando');
  const audio = await grabChat.listo;
  grabChat = null;
  $('chatAudio').classList.remove('grabando');
  $('chatAudioTexto').textContent = 'Audio';
  enviarMensaje(() => api('/api/ventana/mensaje', { metodo: 'POST', cuerpo: audio, tipo: audio.type || 'audio/webm', cabeceras: { 'x-para': chatAbierto, 'x-tipo': 'audio' } }), 'Audio enviado. Lo escuchará primero quien te cuida.');
};

$('chatPostal').onclick = async () => {
  if (!actual) return;
  if (!estado.escena) await guardarEscena();
  const texto = $('chatTexto').value.trim();
  $('chatTexto').value = '';
  enviarMensaje(() => api('/api/ventana/mensaje', { metodo: 'POST', cuerpo: { para: chatAbierto, tipo: 'postal', texto } }),
    `Postal de tu ${actual.nombre} enviada. ¡Tendrá que adivinar dónde estás!${texto ? '' : ' Consejo: escribe antes un mensaje y se desbloqueará al acertar.'}`);
};

// Foto-puzle: el niño hace una foto (un dibujo, su peluche…) y su mensaje secreto se desbloquea al montarla.
$('chatFoto').onchange = async () => {
  const archivo = $('chatFoto').files[0];
  $('chatFoto').value = '';
  if (!archivo) return;
  const secreto = $('chatTexto').value.trim();
  if (!secreto) { $('chatAviso').textContent = 'Primero escribe tu mensaje secreto en la caja de texto y luego haz la foto.'; $('chatTexto').focus(); return; }
  try {
    const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    const esc = Math.min(1, 1280 / Math.max(mapa.width, mapa.height));
    const c = document.createElement('canvas'); c.width = Math.round(mapa.width * esc); c.height = Math.round(mapa.height * esc);
    c.getContext('2d').drawImage(mapa, 0, 0, c.width, c.height);
    const foto = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    $('chatTexto').value = '';
    enviarMensaje(() => api('/api/ventana/mensaje', { metodo: 'POST', cuerpo: foto, tipo: 'image/jpeg', cabeceras: { 'x-para': chatAbierto, 'x-tipo': 'puzle', 'x-secreto': encodeURIComponent(secreto) } }),
      '¡Foto-puzle enviada! Tu mensaje secreto aparecerá cuando lo monten. Recuerda: mejor sin caras de otros niños.');
  } catch { $('chatAviso').textContent = 'No puedo abrir esa foto.'; }
};

// =============== Avisos en tiempo real ===============
function aviso(texto) {
  $('estado').textContent = texto;
  const d = document.createElement('div');
  d.className = 'aviso-llegada'; d.textContent = texto; d.setAttribute('aria-hidden', 'true');
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 4500);
}

async function recargar() {
  estado = await api('/api/ventana');
  pintarBuzon();
  pintarPersonas();
  if (chatAbierto) pintarBurbujas();
}

async function iniciar() {
  estado = await api('/api/ventana');
  avatar = estado.escena?.avatar || estado.avatar;
  $('saludo').textContent = `La ventana de ${estado.alias}`;
  document.title = `Ventana de ${estado.alias}`;
  pintarAvatares();
  pintarSonido();
  const e = estado.escena;
  if (e) aplicar(construirEscenario(e.ambiente, { avatar, personajes: e.personajes, sustituido: e.sustituido, momento: e.momento, clima: e.clima }), { guardar: false });
  else {
    await aplicar(construirEscenario('playa', { avatar }), { guardar: false });
    $('narracion').textContent = 'Pídele a la ventana adónde quieres ir. Por ejemplo: «llévame a la Torre Eiffel de noche».';
  }
  if (!estado.voz || !grabadoraDisponible()) {
    $('mic').disabled = true;
    $('micTexto').textContent = 'Sin voz';
    $('mic').title = 'La voz no está disponible: escribe o toca un lugar';
    $('estado').textContent = 'Hoy la voz descansa: escribe adónde quieres ir o toca un lugar en «Lugares».';
  }
  pintarBuzon();
  pintarPersonas();

  const nombre = (id) => estado.chats.find((c) => c.accesoId === id)?.nombre || 'Alguien';
  const fuente = escuchar('ventana', {
    foto: async () => { await recargar(); efecto('llega'); aviso('📬 ¡Te ha llegado una carta! Ábrela en tu buzón.'); elegirPestana('Buzon'); },
    mensaje: async (d) => { await recargar(); efecto('llega'); aviso(`💬 ¡${nombre(d.accesoId)} te ha escrito!`); },
    puzle_resuelto: async (d) => { await recargar(); efecto('acierto'); aviso(`🧩 ¡${d.nombre} ha montado tu foto-puzle y ha leído tu secreto!`); },
    postal_resuelta: async (d) => { await recargar(); efecto('acierto'); aviso(d.acierto ? `🎉 ¡${d.nombre} ha adivinado dónde estás!` : `💌 ${d.nombre} ya ha abierto tu postal.`); },
    actualizar: () => recargar(),
  });
  fuente.onopen = () => { $('conexion').textContent = 'Conectada'; $('conexion').className = 'aviso ok'; };
  fuente.onerror = () => { $('conexion').textContent = 'Reconectando…'; $('conexion').className = 'aviso mal'; };
}

// Sin conexión con la caja: Mi mundo funciona igual (catálogo, escena, sonido y voz de lectura son locales).
async function sinConexion(e) {
  $('estado').textContent = e.message;
  $('conexion').textContent = 'Sin conexión'; $('conexion').className = 'aviso mal';
  const g = JSON.parse(localStorage.getItem('vp-escena') || 'null');
  avatar = g?.avatar || 'zorrito';
  pintarAvatares(); pintarSonido();
  if (!actual) await aplicar(construirEscenario(g?.ambiente || 'playa', { avatar, personajes: g?.personajes || [], momento: g?.momento, clima: g?.clima }), { guardar: false });
  estado = { fotos: [], chats: [], puzle: { total: 9, hechas: 0, mensaje: null }, emojis: [], lado: 3 };
  pintarBuzon(); pintarPersonas();
  setTimeout(() => location.reload(), 60_000); // vuelve a intentarlo cada minuto
}

iniciar().catch(sinConexion);
