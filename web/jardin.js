// Recompensas en la pantalla del niño: contador de estrellas, Jardín de los recuerdos, elegir y plantar flor, regalos.
// Colaborativo: no hay puestos ni «el mejor». Se cuenta lo que la planta consigue entre todos.
import { AVATARES } from './lib/catalogo.js';
import { $, api } from './comun.js';
import { efecto } from './sonido.js';
import { svgFlor, EMOJI_FLOR } from './flores.js';

let ctx = null;        // { estado: () => estado, recargar, aviso }
let jardin = null;     // último /api/ventana/jardin
let eleccion = { tipo: 'rosa', color: 'roja' };
let recienPlantada = null;

const el = (tag, props = {}, ...hijos) => { const e = Object.assign(document.createElement(tag), props); e.append(...hijos); return e; };

export function iniciarRecompensas(c) {
  ctx = c;
  $('estrellas').onclick = () => { efecto('toque'); abrirJardin(); };
  $('abrirJardin').onclick = () => { efecto('toque'); abrirJardin(); };
  $('plantarDesdePanel').onclick = () => abrirPlantar();
  $('plantarFlor').onclick = () => abrirPlantar();
  $('confirmarFlor').onclick = plantar;
  $('jardin').addEventListener('close', () => { recienPlantada = null; });
}

// ---------- Contador y panel ----------
export function pintarEstrellas(r) {
  if (!r) return;
  const hacia = r.estrellas % r.precio;
  const puede = r.estrellas >= r.precio;
  $('estrellasN').textContent = r.estrellas;
  $('estrellas').setAttribute('aria-label', `${r.estrellas} estrellas. Abrir el jardín`);
  $('estrellas').classList.toggle('lista', puede);
  // Diez huecos: los llenos son las estrellas que llevas hacia la siguiente flor.
  const llenas = puede ? r.precio : hacia;
  $('huecos').replaceChildren(...Array.from({ length: r.precio }, (_, i) => el('span', { className: `hueco${i < llenas ? ' llena' : ''}` })));
  $('huecos').setAttribute('aria-label', `${llenas} de ${r.precio} estrellas para tu próxima flor`);
  $('textoEstrellas').textContent = puede
    ? `¡Tienes ${r.estrellas} estrellas! Ya puedes plantar una flor.`
    : `Te faltan ${r.precio - hacia} para tu próxima flor.`;
  $('plantarDesdePanel').disabled = !puede;
  $('plantarFlor').disabled = !puede;
  $('globoJardin').classList.toggle('oculto', !puede);
  $('globoJardin').textContent = puede ? '!' : '';
}

// Lluvia de estrellas cuando se ganan (carta de la familia, postal de un amigo o regalo).
export function celebrar(estrellas, motivo) {
  if (!estrellas?.ganadas) return;
  efecto('estrella');
  const capa = el('div', { className: 'lluvia-estrellas' });
  capa.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 6 + estrellas.ganadas * 4; i++) {
    const s = el('span', { textContent: '★' });
    s.style.cssText = `left:${10 + Math.random() * 80}%;animation-delay:${Math.random() * 0.5}s;font-size:${1.2 + Math.random() * 1.6}rem`;
    capa.appendChild(s);
  }
  (document.querySelector('dialog[open]') || document.body).appendChild(capa);
  setTimeout(() => capa.remove(), 2600);
  $('estrellas').classList.remove('brinca'); void $('estrellas').offsetWidth; $('estrellas').classList.add('brinca');
  const total = estrellas.total ?? '';
  ctx.aviso(`★ +${estrellas.ganadas} ${estrellas.ganadas === 1 ? 'estrella' : 'estrellas'} ${motivo}${total !== '' ? ` · tienes ${total}` : ''}`);
}

// ---------- Regalo de reconocimiento ----------
export function botonRegalo(m, alias) {
  if (m.mio || m.juego !== 'resuelto' || !['postal', 'puzle'].includes(m.tipo) || m.regalado === undefined) return null;
  const b = el('button', { type: 'button', className: `regalo${m.regalado ? ' dado' : ''}` });
  b.disabled = !!m.regalado;
  b.textContent = m.regalado ? `🎁 Le regalaste 2 ★ a ${alias}` : `🎁 ¡Me gustó! Regalar 2 ★ a ${alias}`;
  b.onclick = async () => {
    b.disabled = true;
    try {
      await api('/api/ventana/regalo', { metodo: 'POST', cuerpo: { mensajeId: m.id } });
      efecto('regalo');
      m.regalado = true;
      b.classList.add('dado');
      b.textContent = `🎁 Le regalaste 2 ★ a ${alias}`;
      ctx.aviso(`🎁 ¡${alias} recibe 2 estrellas gracias a ti! Regalar también hace crecer el jardín.`);
      ctx.recargar();
    } catch (e) { b.disabled = false; ctx.aviso(e.message); }
  };
  return b;
}

// ---------- Jardín de los recuerdos ----------
async function cargarJardin() {
  jardin = await api('/api/ventana/jardin');
  return jardin;
}

export async function abrirJardin() {
  try { await cargarJardin(); } catch (e) { ctx.aviso(e.message); return; }
  pintarJardin();
  if (!$('jardin').open) $('jardin').showModal();
}

export async function refrescarJardin() {
  if (!$('jardin').open) return;
  await cargarJardin();
  pintarJardin();
}

function decorados(metas) {
  const hay = new Set(metas.conseguidas.map((m) => m.icono));
  const capas = [];
  if (hay.has('🌈')) capas.push(el('div', { className: 'j-arcoiris' }));
  if (hay.has('🌳')) capas.push(el('div', { className: 'j-arbol', textContent: '🌳' }));
  if (hay.has('⛲')) capas.push(el('div', { className: 'j-fuente', textContent: '⛲' }));
  if (hay.has('🦋')) for (let i = 0; i < 3; i++) { const b = el('span', { className: 'j-mariposa', textContent: '🦋' }); b.style.cssText = `--i:${i};top:${18 + i * 14}%`; capas.push(b); }
  if (hay.has('✨')) for (let i = 0; i < 8; i++) { const b = el('span', { className: 'j-luciernaga' }); b.style.cssText = `left:${8 + i * 11}%;top:${30 + (i % 3) * 12}%;animation-delay:${i * 0.4}s`; capas.push(b); }
  return capas;
}

function pintarJardin() {
  const j = jardin;
  const vista = $('jardinVista');
  const flores = j.flores.map((f) => {
    const prof = f.y / 100; // 0 = al fondo, 1 = delante
    const b = el('button', { type: 'button', className: `flor${f.mia ? ' mia' : ''}${f.id === recienPlantada ? ' crece' : ''}` });
    b.style.cssText = `left:${f.x}%;bottom:${4 + (1 - prof) * 38}%;--tam:${0.62 + prof * 0.55};z-index:${10 + Math.round(prof * 50)}`;
    b.innerHTML = svgFlor(f.tipo, j.catalogo[f.tipo]?.colores[f.color]);
    if (f.id === recienPlantada) b.append(el('span', { className: 'cartel', textContent: '¡Tu flor!' }));
    const quien = f.mia ? 'Tu flor' : f.alias ? `La flor de ${f.alias}` : 'Un recuerdo de un niño que ya está en casa';
    const nombre = `${j.catalogo[f.tipo]?.nombre || 'Flor'} ${f.color}`;
    b.setAttribute('aria-label', `${nombre}. ${quien}`);
    b.title = `${nombre} · ${quien}`;
    b.onclick = () => { efecto('toque'); $('jardinNota').textContent = `${EMOJI_FLOR[f.tipo] || '🌸'} ${nombre} · ${quien}`; };
    return b;
  });
  vista.replaceChildren(el('div', { className: 'j-cielo' }), el('div', { className: 'j-sol' }), ...decorados(j.metas),
    el('div', { className: 'j-colina j-colina-1' }), el('div', { className: 'j-colina j-colina-2' }), ...flores);

  $('jardinTotal').textContent = `Entre todos habéis plantado ${j.total} ${j.total === 1 ? 'flor' : 'flores'} y os habéis hecho ${j.regalosTotales} ${j.regalosTotales === 1 ? 'regalo' : 'regalos'}.`;
  $('jardinRecuerdos').textContent = j.recuerdos ? `${j.recuerdos} ${j.recuerdos === 1 ? 'flor es un recuerdo' : 'flores son recuerdos'} de niños que ya se fueron a casa. Siguen aquí, cuidando el jardín.` : '';
  const sig = j.metas.siguiente;
  const base = j.metas.conseguidas.at(-1)?.flores || 0;
  $('metaTexto').textContent = sig ? `Próxima sorpresa para toda la planta: ${sig.icono} ${sig.nombre} (faltan ${sig.flores - j.total} flores)` : '¡Habéis conseguido todas las sorpresas del jardín!';
  $('metaBarra').style.width = sig ? `${((j.total - base) / (sig.flores - base)) * 100}%` : '100%';
  $('metasHechas').replaceChildren(...j.metas.conseguidas.map((m) => el('span', { className: 'meta-hecha', textContent: `${m.icono} ${m.nombre}` })));

  $('companeros').replaceChildren(...j.companeros.map((c) => {
    const li = el('li', { className: c.yo ? 'yo' : '' });
    const av = el('span', { className: 'emoji-avatar', textContent: AVATARES[c.avatar]?.emoji || '🙂' });
    av.setAttribute('aria-hidden', 'true');
    const punto = el('span', { className: `en-linea${c.enLinea ? ' si' : ''}` });
    punto.setAttribute('aria-label', c.enLinea ? 'en línea' : 'no está ahora');
    const nombre = el('b', { textContent: c.yo ? `${c.alias} (tú)` : c.alias });
    const datos = el('small', { textContent: `🌸 ${c.flores} ${c.flores === 1 ? 'flor' : 'flores'} · 🎁 ${c.regalos} ${c.regalos === 1 ? 'regalo dado' : 'regalos dados'}` });
    li.append(av, el('span', { className: 'txt' }, nombre, datos), punto);
    return li;
  }));
  $('jardinNota').textContent = recienPlantada ? '¡Mira cómo crece tu flor!' : 'Toca una flor para ver de quién es.';
  pintarEstrellas(j);
}

// ---------- Elegir y plantar una flor ----------
function abrirPlantar() {
  const cat = jardin?.catalogo;
  if (!cat) { cargarJardin().then(abrirPlantar).catch((e) => ctx.aviso(e.message)); return; }
  if (!cat[eleccion.tipo]) eleccion = { tipo: 'rosa', color: 'roja' };
  pintarSelector();
  if (!$('plantar').open) $('plantar').showModal();
  efecto('toque');
}

function pintarSelector() {
  const cat = jardin.catalogo;
  $('tiposFlor').replaceChildren(...Object.entries(cat).map(([id, f]) => {
    const b = el('button', { type: 'button', className: 'tipo-flor' });
    b.setAttribute('aria-pressed', String(id === eleccion.tipo));
    const primero = Object.keys(f.colores)[0];
    b.innerHTML = svgFlor(id, f.colores[id === eleccion.tipo ? eleccion.color : primero] || f.colores[primero]);
    b.append(f.nombre);
    b.onclick = () => { efecto('toque'); eleccion = { tipo: id, color: Object.hasOwn(f.colores, eleccion.color) ? eleccion.color : primero }; pintarSelector(); };
    return b;
  }));
  const colores = cat[eleccion.tipo].colores;
  $('coloresFlor').replaceChildren(...Object.entries(colores).map(([nombre, hex]) => {
    const b = el('button', { type: 'button', className: 'color-flor' });
    b.style.setProperty('--c', hex);
    b.setAttribute('aria-pressed', String(nombre === eleccion.color));
    b.append(el('span', { className: 'muestra' }), nombre);
    b.onclick = () => { efecto('toque'); eleccion.color = nombre; pintarSelector(); };
    return b;
  }));
  $('previaFlor').innerHTML = svgFlor(eleccion.tipo, colores[eleccion.color]);
  $('previaNombre').textContent = `${cat[eleccion.tipo].nombre} ${eleccion.color}`;
  $('confirmarFlor').disabled = (jardin.estrellas ?? 0) < (jardin.precio ?? 10);
}

async function plantar() {
  $('confirmarFlor').disabled = true;
  try {
    const r = await api('/api/ventana/flor', { metodo: 'POST', cuerpo: eleccion });
    recienPlantada = r.flor.id;
    $('plantar').close();
    efecto('crece');
    await abrirJardin();
    ctx.aviso(`🌱 ¡Has plantado tu ${jardin.catalogo[r.flor.tipo].nombre.toLowerCase()} ${r.flor.color} en el Jardín de los recuerdos!`);
    ctx.recargar();
  } catch (e) { ctx.aviso(e.message); $('confirmarFlor').disabled = false; }
}
