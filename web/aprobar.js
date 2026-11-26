// Pantalla del adulto de confianza: nada llega a la ventana sin su aprobación.
import { componerEscena, pintarEscena } from './lib/escena.js';
import { $, api, escuchar, haceCuanto, campanita } from './comun.js';
import { ponerIconos } from './iconos.js';

ponerIconos();

const NOMBRE = { aprobado: 'En la ventana', rechazado: 'Rechazada' };
let alias = '';

function imagen(f) {
  const i = document.createElement('img');
  i.src = `/fotos/${f.id}`; i.alt = f.texto ? `${f.autor}: ${f.texto}` : `Foto de ${f.autor}`; i.loading = 'lazy';
  return i;
}

async function decidir(f, decision, tarjeta) {
  for (const b of tarjeta.querySelectorAll('button')) b.disabled = true;
  try {
    await api('/api/aprobar/decidir', { metodo: 'POST', cuerpo: { aporteId: f.id, decision } });
    $('hecho').textContent = decision === 'aprobar'
      ? `Ya está en la ventana de ${alias}.`
      : `Foto de ${f.autor} rechazada. No llegará a la ventana y se borrará mañana.`;
  } catch (e) {
    $('hecho').textContent = e.message;
  }
  await cargar();
  // El foco pasa a la siguiente foto pendiente, o al título si ya no quedan.
  (document.querySelector('#pendientes .aprobar') || $('tituloPendientes')).focus();
}

async function cargar() {
  const d = await api('/api/aprobar');
  alias = d.alias;
  $('titulo').textContent = `Fotos para ${d.alias}`;
  document.title = `Revisar fotos · ${d.alias}`;
  $('tituloPendientes').textContent = d.pendientes.length ? `Fotos esperando (${d.pendientes.length})` : 'Fotos esperando';
  $('borrado').textContent = `Las fotos se borran solas a los ${d.diasFotos} días o cuando ${d.alias} recibe el alta. Puedes descargar una copia de todos los datos o borrarlo todo ahora.`;

  $('marcoAhora').classList.toggle('oculto', !d.escena);
  if (d.escena) {
    pintarEscena($('escenaAhora'), componerEscena(d.escena, { nombre: d.alias }));
    $('textoAhora').textContent = `${d.alias} está en su ${d.escena.nombre}. Las fotos que apruebes aparecerán colgadas en su ventana.`;
  } else {
    $('textoAhora').textContent = `${d.alias} todavía no ha elegido escenario.`;
  }

  if (!d.pendientes.length) {
    const v = document.createElement('div');
    v.className = 'tarjeta vacio';
    const s = document.createElement('span'); s.textContent = '✨'; s.setAttribute('aria-hidden', 'true');
    v.append(s, 'No hay fotos esperando. Te avisaremos con un sonido cuando llegue una.');
    $('pendientes').replaceChildren(v);
  } else {
    $('pendientes').replaceChildren(...d.pendientes.map((f) => {
      const t = document.createElement('article');
      t.className = 'tarjeta foto-pendiente';
      t.setAttribute('aria-label', `${f.video ? 'Vídeo' : 'Foto'} de ${f.autor}`);
      const de = document.createElement('p'); de.className = 'de'; de.textContent = `De: ${f.autor}${f.lugar ? `, ${f.lugar}` : ''} · ${haceCuanto(f.creado)}`;
      if (f.entregarEn > Date.now()) de.textContent += ` · llegará el ${new Date(f.entregarEn).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}`;
      const txt = document.createElement('p'); txt.className = 'txt'; txt.textContent = f.texto ? `«${f.texto}»` : 'Sin texto';
      const pistas = document.createElement('ul'); pistas.className = 'pistas-rev';
      for (const p of f.pistas || []) pistas.appendChild(Object.assign(document.createElement('li'), { textContent: `Pista: ${p}` }));
      const bs = document.createElement('div'); bs.className = 'botones';
      const si = document.createElement('button'); si.className = 'aprobar'; si.type = 'button'; si.textContent = 'Aprobar';
      const no = document.createElement('button'); no.className = 'rechazar'; no.type = 'button'; no.textContent = 'Rechazar';
      si.setAttribute('aria-label', `Aprobar la foto de ${f.autor}`);
      no.setAttribute('aria-label', `Rechazar la foto de ${f.autor}`);
      si.onclick = () => decidir(f, 'aprobar', t);
      no.onclick = () => decidir(f, 'rechazar', t);
      bs.append(si, no);
      const media = f.video ? Object.assign(document.createElement('video'), { src: `/video/${f.id}`, controls: true, playsInline: true, poster: `/fotos/${f.id}` }) : imagen(f);
      t.append(media, de, txt, pistas, bs);
      return t;
    }));
  }

  pintarMensajes(d);

  $('sinRecientes').classList.toggle('oculto', d.recientes.length > 0);
  $('recientes').replaceChildren(...d.recientes.map((f) => {
    const c = document.createElement('figure'); c.className = 'reciente';
    const ins = document.createElement('span'); ins.className = `insignia ${f.estado}`; ins.textContent = NOMBRE[f.estado];
    c.append(imagen(f), ins);
    if (f.reaccion) {
      const r = document.createElement('span'); r.className = 'reac'; r.textContent = f.reaccion;
      r.setAttribute('aria-label', `${alias} ha respondido con ${f.reaccion}`);
      c.appendChild(r);
    }
    return c;
  }));
}

// Mensajes del chat en los dos sentidos: nada llega al niño ni sale de él sin pasar por aquí.
function pintarMensajes(d) {
  // Lo que el niño quiere mandar a otros niños de la planta va en la misma lista.
  d = { ...d, mensajes: [...d.mensajes, ...(d.planta || []).map((m) => ({ ...m, de: 'nino', persona: `${m.para} (otro niño de la planta)`, planta: true }))].sort((x, y) => x.creado - y.creado) };
  $('tituloMensajes').textContent = d.mensajes.length ? `Mensajes esperando (${d.mensajes.length})` : 'Mensajes esperando';
  if (!d.mensajes.length) {
    $('mensajes').replaceChildren(Object.assign(document.createElement('p'), { className: 'aviso', textContent: 'No hay mensajes esperando.', style: 'margin:0' }));
    return;
  }
  const TIPO = { texto: 'un mensaje', audio: 'un audio', foto: 'una foto', puzle: 'una foto-puzle', postal: 'una postal-acertijo' };
  $('mensajes').replaceChildren(...d.mensajes.map((m) => {
    const t = document.createElement('article'); t.className = 'tarjeta foto-pendiente';
    const de = document.createElement('p'); de.className = 'de';
    de.textContent = `${m.de === 'nino' ? `${d.alias} → ${m.persona}` : `${m.persona} → ${d.alias}`}: ${TIPO[m.tipo]} · ${haceCuanto(m.creado)}`;
    t.appendChild(de);
    if (m.tipo === 'postal' && m.escena) {
      const mp = document.createElement('div'); mp.className = 'mini-postal';
      mp.innerHTML = '<div class="marco"><div class="vista"><div class="escena"></div></div></div>';
      pintarEscena(mp.querySelector('.escena'), componerEscena(m.escena, { nombre: m.de === 'nino' ? d.alias : m.persona }));
      t.appendChild(mp);
    }
    if ((m.tipo === 'foto' || m.tipo === 'puzle') && m.archivo) t.appendChild(Object.assign(document.createElement('img'), { src: `${m.planta ? '/planta' : '/medios'}/${m.id}`, alt: TIPO[m.tipo] }));
    if (m.planta) t.appendChild(Object.assign(document.createElement('p'), { className: 'aviso', textContent: 'Entre niños solo se ven alias y avatar. Comprueba que no salen caras, nombres, pulseras ni datos del hospital.', style: 'margin:0' }));
    if ((m.tipo === 'audio' || m.tipo === 'postal') && m.archivo) t.appendChild(Object.assign(document.createElement('audio'), { src: `/medios/${m.id}`, controls: true }));
    const texto = m.tipo === 'puzle' ? `Mensaje secreto: «${m.secreto}»` : m.texto ? `«${m.texto}»` : '';
    if (texto) t.appendChild(Object.assign(document.createElement('p'), { className: 'txt', textContent: texto }));
    const bs = document.createElement('div'); bs.className = 'botones';
    const si = Object.assign(document.createElement('button'), { className: 'aprobar', type: 'button', textContent: 'Aprobar' });
    const no = Object.assign(document.createElement('button'), { className: 'rechazar', type: 'button', textContent: 'Rechazar' });
    const decide = async (decision) => {
      si.disabled = no.disabled = true;
      try {
        await api(m.planta ? '/api/aprobar/planta' : '/api/aprobar/mensaje', { metodo: 'POST', cuerpo: { id: m.id, decision } });
        $('hecho').textContent = decision === 'aprobar' ? `Enviado a ${m.de === 'nino' ? (m.para || m.persona) : d.alias}.` : 'Mensaje rechazado. No se enviará.';
      } catch (e) { $('hecho').textContent = e.message; }
      await cargar();
      (document.querySelector('#mensajes .aprobar') || $('tituloMensajes')).focus();
    };
    si.onclick = () => decide('aprobar'); no.onclick = () => decide('rechazar');
    bs.append(si, no);
    t.appendChild(bs);
    return t;
  }));
}

$('borrarTodo').onclick = async () => {
  if (!confirm(`Se borrarán todas las fotos y postales de ${alias}, también de su ventana. No se puede deshacer. ¿Seguir?`)) return;
  try {
    await api('/api/aprobar/borrar-todo', { metodo: 'POST' });
    $('hecho').textContent = 'Todas las fotos se han borrado.';
    cargar();
  } catch (e) { $('hecho').textContent = e.message; }
};

cargar().then(() => {
  const f = escuchar('tutor', { pendiente: () => { campanita(); cargar(); }, actualizar: () => cargar() });
  f.onopen = () => { $('conexion').textContent = 'Al día'; };
  f.onerror = () => { $('conexion').textContent = 'Reconectando…'; };
}).catch((e) => { $('hecho').textContent = e.message; });
