// Panel del hospital: crear espacios, repartir accesos (enlace o código), revocar y dar de alta.
import { $, api, ErrorApi } from './comun.js';
import { ponerIconos } from './iconos.js';

ponerIconos();

const ROL = { ventana: 'Tablet del niño', tutor: 'Aprueba fotos', aportador: 'Envía fotos' };
// Códigos y enlaces en claro: solo se conocen al crearlos y viven en esta pestaña (nunca se guardan).
const secretos = new Map();

function el(tag, props = {}, ...hijos) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...hijos);
  return e;
}

// Toda acción del panel: si falla, se dice; si la sesión caducó, vuelve a pedir la clave.
async function accion(fn) {
  try { await fn(); } catch (e) {
    if (e instanceof ErrorApi && /caducado/.test(e.message)) return mostrarEntrada();
    alert(e.message);
  }
}

async function copiar(texto, boton) {
  try { await navigator.clipboard.writeText(texto); boton.textContent = '¡Copiado!'; }
  catch { prompt('Copia este enlace:', texto); }
  setTimeout(() => { boton.textContent = 'Copiar enlace'; }, 1500);
}

function filaAcceso(a) {
  const s = secretos.get(a.id) || {};
  const tr = el('tr', { className: a.revocado ? 'revocado' : '' });
  const codigo = el('td');
  codigo.append(s.codigo ? el('span', { className: 'codigo', textContent: s.codigo }) : el('span', { className: 'aviso', textContent: '—' }));
  const acciones = el('td');
  if (!a.revocado) {
    if (s.enlace) {
      const c = el('button', { className: 'secundario', type: 'button', textContent: 'Copiar enlace' });
      c.setAttribute('aria-label', `Copiar el enlace de ${a.etiqueta}`);
      c.onclick = () => copiar(s.enlace, c);
      acciones.append(c, ' ');
    }
    const n = el('button', { className: 'secundario', type: 'button', textContent: 'Nuevo código' });
    n.setAttribute('aria-label', `Nuevo código para ${a.etiqueta}`);
    n.onclick = () => accion(async () => { const r = await api(`/api/panel/accesos/${a.id}/codigo`, { metodo: 'POST' }); secretos.set(a.id, { ...s, codigo: r.codigo }); await cargar(); });
    const x = el('button', { className: 'peligro', type: 'button', textContent: 'Revocar' });
    x.setAttribute('aria-label', `Revocar el acceso de ${a.etiqueta}`);
    x.onclick = () => accion(async () => {
      if (!confirm(`¿Quitar el acceso «${a.etiqueta}»? Dejará de funcionar al momento.`)) return;
      await api(`/api/panel/accesos/${a.id}/revocar`, { metodo: 'POST' });
      await cargar();
    });
    acciones.append(n, ' ', x);
  } else {
    acciones.append(el('span', { className: 'aviso', textContent: 'Revocado' }));
  }
  tr.append(el('td', { textContent: a.etiqueta }), el('td', { textContent: ROL[a.rol] }), codigo, acciones);
  return tr;
}

function tarjeta(e) {
  const borrarEn = new Date(e.borrar_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const alta = el('button', { className: 'peligro', type: 'button', textContent: 'Dar de alta y borrar todo' });
  alta.onclick = () => accion(async () => {
    if (!confirm(`Se borrará el espacio de ${e.alias} con todas sus fotos y accesos. No se puede deshacer. ¿Seguir?`)) return;
    await api(`/api/panel/espacios/${e.id}/alta`, { metodo: 'POST' });
    await cargar();
  });
  const cab = el('header', {},
    el('div', {}, el('h3', { textContent: e.alias }), el('p', { className: 'aviso', style: 'margin:.2rem 0 0', textContent: `Consentimiento: ${e.consentimiento_ref || '—'} · se borra solo el ${borrarEn}` })),
    alta);

  const tabla = el('table', {},
    el('caption', { className: 'sr-only', textContent: `Accesos de ${e.alias}` }),
    el('thead', {}, el('tr', {}, ...['Acceso', 'Para', 'Código (30 min)', 'Acciones'].map((t) => el('th', { scope: 'col', textContent: t })))),
    el('tbody', {}, ...e.accesos.map(filaAcceso)));

  const etiqueta = el('input', { placeholder: 'Tía Marta, Clase de 3.º B…', maxLength: 30 });
  etiqueta.setAttribute('aria-label', `Nombre del nuevo acceso para ${e.alias}`);
  const rol = el('select', {}, el('option', { value: 'aportador', textContent: 'Envía fotos' }), el('option', { value: 'tutor', textContent: 'Aprueba fotos' }));
  rol.setAttribute('aria-label', 'Qué puede hacer');
  const anadir = el('button', { className: 'secundario', type: 'button', textContent: '＋ Añadir acceso' });
  anadir.onclick = () => accion(async () => {
    if (!etiqueta.value.trim()) { etiqueta.focus(); return; }
    const a = await api('/api/panel/accesos', { metodo: 'POST', cuerpo: { espacioId: e.id, rol: rol.value, etiqueta: etiqueta.value } });
    secretos.set(a.id, { codigo: a.codigo, enlace: a.enlace });
    await cargar();
  });
  const lado = el('select', {}, el('option', { value: '3', textContent: 'Puzle 3×3' }), el('option', { value: '2', textContent: 'Puzle 2×2 (más fácil)' }));
  lado.value = String(e.lado || 3);
  lado.setAttribute('aria-label', `Dificultad del puzle de ${e.alias}`);
  lado.onchange = () => accion(() => api(`/api/panel/espacios/${e.id}/lado`, { metodo: 'POST', cuerpo: { lado: Number(lado.value) } }));
  return el('article', { className: 'tarjeta espacio' }, cab, tabla, el('div', { className: 'nueva' }, etiqueta, rol, anadir, lado));
}

async function cargar() {
  const d = await api('/api/panel');
  $('entrar').classList.add('oculto');
  $('contenido').classList.remove('oculto');
  $('info').replaceChildren(
    el('span', { textContent: d.voz ? 'Voz local activa' : 'Voz no disponible' }),
    ...(d.urls.length ? d.urls.map((u) => el('span', { textContent: `Wifi: ${u}` })) : [el('span', { textContent: 'Wifi cerrada (sin HTTPS)' })]),
  );
  if (!$('avatar').options.length) {
    $('avatar').append(...Object.entries(d.avatares).map(([id, a]) => el('option', { value: id, textContent: `${a.emoji} ${a.nombre}` })));
  }
  $('sinEspacios').classList.toggle('oculto', d.espacios.length > 0);
  $('espacios').replaceChildren(...d.espacios.map(tarjeta));
}

function mostrarEntrada() {
  $('contenido').classList.add('oculto');
  $('entrar').classList.remove('oculto');
  $('clave').focus();
}

$('entrar').onsubmit = async (ev) => {
  ev.preventDefault();
  $('errorEntrar').textContent = '';
  try {
    await api('/api/panel/entrar', { metodo: 'POST', cuerpo: { clave: $('clave').value } });
    $('clave').value = '';
    await cargar();
  } catch (e) {
    $('errorEntrar').textContent = e.message;
    $('clave').setAttribute('aria-invalid', 'true');
  }
};

$('crear').onsubmit = async (ev) => {
  ev.preventDefault();
  $('error').textContent = '';
  const f = new FormData($('crear'));
  try {
    const r = await api('/api/panel/espacios', { metodo: 'POST', cuerpo: {
      alias: f.get('alias'), avatar: f.get('avatar'), mensajePuzle: f.get('mensaje'), dias: f.get('dias'),
      aportadores: f.get('aportadores'), consentimientoRef: f.get('consentimiento'), lado: f.get('lado'),
    } });
    for (const a of r.accesos) secretos.set(a.id, { codigo: a.codigo, enlace: a.enlace });
    $('crear').reset();
    await cargar();
    $('espacios').querySelector('h3')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { $('error').textContent = e.message; }
};

cargar().catch(mostrarEntrada);
