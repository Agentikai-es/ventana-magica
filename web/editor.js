// Personalizar la ventana: el niño elige qué personajes y cosas salen, los coloca con el dedo y cambia el cielo.
// Parte siempre de lo que trae el lugar (opciones predeterminadas) y puede volver a ello con «Como venía».
// Solo usa el catálogo: nada de texto libre ni imágenes de fuera.
import { AMBIENTES, PERSONAJES, OBJETOS, MOMENTOS, CLIMAS } from './lib/catalogo.js';
import { construirEscenario, MAX_PERSONALIZADOS } from './lib/escenario.js';
import { componerEscena, pintarEscena } from './lib/escena.js';
import { $ } from './comun.js';
import { efecto } from './sonido.js';

const ICONO_MOMENTO = { dia: '☀️', atardecer: '🌅', noche: '🌙' };
const ICONO_CLIMA = { despejado: '🌤️', lluvia: '🌧️', nieve: '❄️', estrellas: '🌠', burbujas: '🫧', hojas: '🍂', confeti: '🎉' };
const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);

let borrador = null;
let alGuardar = null;
let nombre = null;

// Lo que se ve ahora, como escena personalizada (con sus posiciones actuales).
function aBorrador(esc) {
  return { ...esc, personalizado: true, personajes: [...esc.personajes], objetos: [...esc.objetos], pos: { ...(esc.pos || {}) } };
}
const reconstruir = () => construirEscenario(borrador.ambiente, borrador);

function pintar() {
  const esc = reconstruir();
  pintarEscena($('editorEscena'), componerEscena(esc, { nombre }));
  $('editorLugar').textContent = esc.nombre;
  for (const p of $('editorEscena').querySelectorAll('.pieza[data-clave]')) {
    p.tabIndex = 0;
    p.setAttribute('aria-roledescription', 'se puede mover');
  }
  fichas('fichasPersonajes', PERSONAJES, 'personajes', AMBIENTES[borrador.ambiente].personajes);
  fichas('fichasObjetos', OBJETOS, 'objetos', AMBIENTES[borrador.ambiente].objetos);
  $('cuentaPersonajes').textContent = `${borrador.personajes.length} de ${MAX_PERSONALIZADOS} · los del lugar tienen borde de puntos`;
  $('cuentaObjetos').textContent = `${borrador.objetos.length} de ${MAX_PERSONALIZADOS}`;
  opciones('edMomentos', MOMENTOS, 'momento', ICONO_MOMENTO);
  opciones('edClimas', CLIMAS, 'clima', ICONO_CLIMA);
}

function fichas(id, catalogo, campo, delLugar) {
  const lista = borrador[campo];
  // Primero lo que ya sale y lo del lugar; luego el resto del catálogo.
  const orden = [...new Set([...lista, ...delLugar, ...Object.keys(catalogo)])].filter((k) => catalogo[k]);
  $(id).replaceChildren(...orden.map((k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `ficha${delLugar.includes(k) ? ' del-lugar' : ''}`;
    const dentro = lista.includes(k);
    b.setAttribute('aria-pressed', String(dentro));
    b.append(Object.assign(document.createElement('span'), { className: 'emoji', textContent: catalogo[k].emoji }), capital(catalogo[k].nombre));
    b.onclick = () => {
      if (dentro) borrador[campo] = lista.filter((x) => x !== k);
      else if (lista.length >= MAX_PERSONALIZADOS) { efecto('toque'); $(campo === 'personajes' ? 'cuentaPersonajes' : 'cuentaObjetos').textContent = `Ya hay ${MAX_PERSONALIZADOS}: quita uno para poner otro.`; return; }
      else borrador[campo] = [...lista, k];
      borrador.personalizado = true;
      efecto(dentro ? 'toque' : 'encaja');
      pintar();
    };
    return b;
  }));
}

function opciones(id, catalogo, campo, iconos) {
  $(id).replaceChildren(...Object.entries(catalogo).map(([k, v]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opcion-diseno';
    b.setAttribute('aria-pressed', String(borrador[campo] === k));
    b.append(Object.assign(document.createElement('span'), { className: 'emoji', textContent: iconos[k] || '' }), capital(v.nombre));
    b.onclick = () => { borrador[campo] = k; efecto('toque'); pintar(); };
    return b;
  }));
}

// Arrastrar con el dedo (o ratón). Con teclado: flechas para mover la pieza que tiene el foco.
function activarArrastre() {
  const zona = $('editorEscena');
  let arrastre = null;
  const enPorcentaje = (x, y) => {
    const r = zona.getBoundingClientRect();
    return { x: ((x - r.left) / r.width) * 100, y: ((y - r.top) / r.height) * 100 };
  };
  const fijar = (pieza, x, y) => {
    const p = { x: Math.min(96, Math.max(4, x)), y: Math.min(90, Math.max(10, y)) };
    pieza.style.left = `${p.x}%`; pieza.style.top = `${p.y}%`;
    borrador.pos[pieza.dataset.clave] = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  };
  zona.addEventListener('pointerdown', (e) => {
    const pieza = e.target.closest('.pieza[data-clave]');
    if (!pieza) return;
    e.preventDefault();
    pieza.setPointerCapture(e.pointerId);
    pieza.classList.add('arrastrando');
    arrastre = { pieza };
  });
  zona.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const p = enPorcentaje(e.clientX, e.clientY);
    fijar(arrastre.pieza, p.x, p.y);
  });
  const soltar = () => {
    if (!arrastre) return;
    arrastre.pieza.classList.remove('arrastrando');
    arrastre = null;
    efecto('encaja');
    pintar(); // recoloca la profundidad (lo de abajo, más grande)
  };
  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);
  zona.addEventListener('keydown', (e) => {
    const pieza = e.target.closest('.pieza[data-clave]');
    const d = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] }[e.key];
    if (!pieza || !d) return;
    e.preventDefault();
    fijar(pieza, parseFloat(pieza.style.left) + d[0], parseFloat(pieza.style.top) + d[1]);
  });
}

function pestanas() {
  const tabs = [['edTabPersonajes', 'edPersonajes'], ['edTabObjetos', 'edObjetos'], ['edTabCielo', 'edCielo']];
  for (const [t, panel] of tabs) {
    $(t).onclick = () => {
      for (const [t2, p2] of tabs) { $(t2).setAttribute('aria-selected', String(t2 === t)); $(p2).hidden = t2 !== t; }
    };
  }
}

export function iniciarEditor() {
  activarArrastre();
  pestanas();
  $('editorReiniciar').onclick = () => {
    const base = construirEscenario(borrador.ambiente, { avatar: borrador.avatar, momento: borrador.momento, clima: borrador.clima, pose: borrador.pose, sitio: borrador.sitio });
    borrador = aBorrador({ ...base, pos: {} });
    borrador.personalizado = false;
    efecto('toque');
    pintar();
  };
  $('editorGuardar').onclick = async () => {
    const esc = reconstruir();
    $('editor').close();
    efecto('magia');
    await alGuardar?.(esc);
  };
}

export function abrirEditor(escena, { guardar, alias } = {}) {
  if (!escena) return;
  borrador = aBorrador(escena);
  alGuardar = guardar;
  nombre = alias || null;
  pintar();
  $('editor').showModal();
}
