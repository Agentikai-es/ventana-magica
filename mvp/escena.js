// Composición (v2): dibuja el escenario en capas (fondo, decorado, objetos, personajes, avatar).
// Sin imágenes externas: degradado CSS, SVG propio y emojis del catálogo.

import { PERSONAJES, OBJETOS, AVATARES } from './catalogo.js';

// Decorado SVG por ambiente (viewBox 0 0 100 60). Formas simples y suaves.
const B = 'fill="#ffffff"';
export const DECORADOS = {
  castillo: `<circle cx="18" cy="14" r="5" ${B} opacity=".55"/>
    <ellipse cx="78" cy="12" rx="12" ry="3" ${B} opacity=".5"/><ellipse cx="30" cy="22" rx="10" ry="2.5" ${B} opacity=".4"/>
    <path d="M38 60V30h4v-4h3v4h4v-4h3v4h4V18l3-5 3 5v12h4v-4h3v4h4v-4h3v4h-0V60z" fill="#7e57c2" opacity=".55"/>
    <rect x="52" y="44" width="8" height="16" rx="4" fill="#4a2c82" opacity=".6"/>`,
  espacio: `<g ${B}><circle cx="8" cy="8" r=".6"/><circle cx="22" cy="18" r=".4"/><circle cx="35" cy="6" r=".5"/>
    <circle cx="61" cy="12" r=".6"/><circle cx="88" cy="7" r=".5"/><circle cx="94" cy="24" r=".4"/><circle cx="12" cy="32" r=".5"/>
    <circle cx="48" cy="26" r=".3"/><circle cx="72" cy="30" r=".5"/></g>
    <circle cx="80" cy="16" r="7" fill="#ffd54f" opacity=".85"/>
    <ellipse cx="50" cy="66" rx="70" ry="14" fill="#9fa8da" opacity=".35"/>`,
  selva: `<path d="M0 60V38c8-6 14-2 20 0s14-8 22-4 12 6 20 2 16-8 22-2 10 4 16 0V60z" fill="#1b5e20" opacity=".6"/>
    <path d="M0 60V48c10-4 20 2 30-1s20-6 32 0 24 4 38-2V60z" fill="#33691e" opacity=".7"/>
    <circle cx="82" cy="12" r="6" fill="#fff59d" opacity=".7"/>`,
  ciudad: `<g fill="#37474f" opacity=".55"><rect x="4" y="30" width="10" height="30"/><rect x="16" y="22" width="9" height="38"/>
    <rect x="27" y="36" width="12" height="24"/><rect x="62" y="26" width="10" height="34"/><rect x="74" y="18" width="9" height="42"/>
    <rect x="85" y="34" width="12" height="26"/></g>
    <g fill="#fff59d" opacity=".7"><rect x="18" y="26" width="2" height="2"/><rect x="21" y="32" width="2" height="2"/>
    <rect x="76" y="22" width="2" height="2"/><rect x="79" y="30" width="2" height="2"/><rect x="65" y="31" width="2" height="2"/></g>
    <circle cx="50" cy="10" r="6" fill="#fff176" opacity=".8"/>`,
  playa: `<circle cx="78" cy="14" r="8" fill="#fff59d" opacity=".9"/>
    <path d="M0 42c10-3 20 3 30 0s20-3 30 0 20 3 40 0V50H0z" fill="#4fc3f7" opacity=".7"/>
    <path d="M0 50c15-2 35 2 50 0s35-2 50 0V60H0z" fill="#ffe082"/>`,
  bosque: `<g fill="#1b5e20" opacity=".6"><path d="M6 60l8-26 8 26z"/><path d="M18 60l10-34 10 34z"/><path d="M64 60l9-30 9 30z"/>
    <path d="M80 60l8-24 8 24z"/></g><g fill="#2e7d32" opacity=".8"><path d="M34 60l7-20 7 20z"/><path d="M88 60l6-16 6 16z"/></g>
    <rect x="0" y="56" width="100" height="4" fill="#558b2f"/>`,
  montana: `<path d="M-5 60L28 18l33 42z" fill="#78909c" opacity=".8"/><path d="M40 60l30-36 35 36z" fill="#546e7a" opacity=".8"/>
    <path d="M22 26l6-8 6 8-3 2-3-2-3 2z" ${B}/><path d="M64 31l6-7 6 7-3 2-3-2-3 2z" ${B}/>
    <rect x="0" y="54" width="100" height="6" ${B} opacity=".9"/>`,
  mar: `<circle cx="76" cy="14" r="7" fill="#fffde7" opacity=".9"/>
    <g ${B} opacity=".7"><circle cx="12" cy="10" r=".5"/><circle cx="30" cy="6" r=".4"/><circle cx="50" cy="14" r=".5"/><circle cx="90" cy="30" r=".4"/></g>
    <path d="M0 40c8-2 16 2 25 0s17-2 25 0 17 2 25 0 17-2 25 0V60H0z" fill="#1b4965" opacity=".9"/>
    <path d="M0 48c8-2 16 2 25 0s17-2 25 0 17 2 25 0 17-2 25 0V60H0z" fill="#0b2a40"/>
    <path d="M70 40h12M68 44h16" stroke="#fffde7" stroke-width=".6" opacity=".5"/>`,
};

// Posiciones fijas (en %) para que la escena sea estable y no tape al avatar.
const SITIOS_OBJETOS = [{ x: 12, y: 18 }, { x: 88, y: 40 }, { x: 30, y: 72 }];
const SITIOS_PERSONAJES = [{ x: 22, y: 52 }, { x: 74, y: 60 }, { x: 46, y: 36 }];

// Datos puros de la escena: se pueden probar sin navegador.
export function componerEscena(escenario) {
  if (!escenario || escenario.tipo !== 'escenario') return null;
  const [c1, c2] = escenario.paleta;
  const objetos = escenario.objetos.slice(0, SITIOS_OBJETOS.length).map((id, i) => ({
    id, emoji: OBJETOS[id].emoji, etiqueta: OBJETOS[id].nombre, ...SITIOS_OBJETOS[i],
  }));
  const personajes = escenario.personajes.slice(0, SITIOS_PERSONAJES.length).map((id, i) => ({
    id, emoji: PERSONAJES[id].emoji, etiqueta: PERSONAJES[id].nombre, ...SITIOS_PERSONAJES[i],
  }));
  const av = AVATARES[escenario.avatar];
  return {
    ambiente: escenario.ambiente,
    capas: [
      { capa: 'fondo', css: `linear-gradient(180deg, ${c1}, ${c2})` },
      { capa: 'decorado', svg: DECORADOS[escenario.ambiente] || '' },
      { capa: 'objetos', items: objetos },
      { capa: 'personajes', items: personajes },
      { capa: 'avatar', item: { id: escenario.avatar, emoji: av.emoji, etiqueta: `Tú · ${av.nombre}`, x: 50, y: 80 } },
    ],
  };
}

function elemento(doc, clase, item, retraso) {
  const d = doc.createElement('div');
  d.className = `pieza ${clase}`;
  d.style.left = `${item.x}%`;
  d.style.top = `${item.y}%`;
  d.style.animationDelay = `${retraso}s`;
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', item.etiqueta);
  const e = doc.createElement('span');
  e.className = 'emoji';
  e.textContent = item.emoji;
  d.appendChild(e);
  if (clase !== 'objeto') {
    const t = doc.createElement('span');
    t.className = 'etiqueta';
    t.textContent = item.etiqueta;
    d.appendChild(t);
  }
  return d;
}

// Pinta la escena en el contenedor (solo navegador).
export function pintarEscena(contenedor, escena) {
  const doc = contenedor.ownerDocument;
  contenedor.replaceChildren();
  if (!escena) return;
  for (const c of escena.capas) {
    const capa = doc.createElement('div');
    capa.className = `capa capa-${c.capa}`;
    if (c.capa === 'fondo') capa.style.background = c.css;
    // El SVG sale solo de DECORADOS (código propio), nunca de texto del usuario.
    if (c.capa === 'decorado') capa.innerHTML = `<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${c.svg}</svg>`;
    if (c.capa === 'objetos') c.items.forEach((it, i) => capa.appendChild(elemento(doc, 'objeto', it, i * 0.15)));
    if (c.capa === 'personajes') c.items.forEach((it, i) => capa.appendChild(elemento(doc, 'personaje', it, 0.3 + i * 0.2)));
    if (c.capa === 'avatar') capa.appendChild(elemento(doc, 'avatar', c.item, 0.9));
    contenedor.appendChild(capa);
  }
}
