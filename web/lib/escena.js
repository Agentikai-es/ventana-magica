// Composición (v2): dibuja el escenario en capas (fondo, decorado, objetos, personajes, avatar).
// Sin imágenes externas: degradado CSS, SVG propio y emojis del catálogo.

import { AMBIENTES, PERSONAJES, OBJETOS, AVATARES } from './catalogo.js';

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

Object.assign(DECORADOS, {
  paris: `<ellipse cx="22" cy="14" rx="11" ry="3" ${B} opacity=".55"/><ellipse cx="40" cy="22" rx="8" ry="2" ${B} opacity=".4"/>
    <g fill="#f3e3d3" opacity=".85"><rect x="2" y="38" width="12" height="22" rx="1"/><rect x="15" y="42" width="10" height="18" rx="1"/><rect x="26" y="36" width="11" height="24" rx="1"/></g>
    <g fill="#c9a98b" opacity=".7"><path d="M2 38h12l-2-3H4z"/><path d="M26 36h11l-2-3h-7z"/></g>
    <g fill="#5d4b72" opacity=".78"><path d="M60 60l6.4-26h7.2L80 60h-4.2c-1-6-3-9.5-5.8-9.5S65.2 54 64.2 60z"/><path d="M66.6 34l2.2-16h2.4l2.2 16z"/><path d="M69.3 18l.7-11 .7 11z"/>
    <rect x="64.8" y="33" width="10.4" height="1.6" rx=".5"/><rect x="67.9" y="18" width="4.2" height="1.2" rx=".4"/></g>
    <path d="M0 55c12-2 24 2 36 0s26-2 40 0 18 1 24 0V60H0z" fill="#6b9bd1" opacity=".75"/>`,
  egipto: `<circle cx="82" cy="13" r="7" fill="#fff3c4" opacity=".9"/>
    <path d="M24 58L46 24l22 34z" fill="#e2ae55"/><path d="M46 24l22 34H52z" fill="#bd863a"/>
    <path d="M62 58l12-18 12 18z" fill="#e6b663"/><path d="M74 40l12 18h-7z" fill="#c38d42"/>
    <path d="M0 52c14-6 30 2 44-1s28-6 56 0V60H0z" fill="#f0c97a"/><path d="M0 56c20-3 40 2 60 0s30-3 40 0V60H0z" fill="#e9b763"/>`,
  polo: `<g ${B} opacity=".8"><circle cx="10" cy="8" r=".5"/><circle cx="30" cy="5" r=".4"/><circle cx="55" cy="9" r=".5"/><circle cx="88" cy="6" r=".4"/><circle cx="72" cy="15" r=".3"/></g>
    <path d="M-5 26c20-14 40 6 58-6s34-6 52 2" stroke="#7ef0c1" stroke-width="5" fill="none" opacity=".35"/>
    <path d="M-5 32c22-10 38 4 56-6s36-2 54 4" stroke="#8be0ff" stroke-width="3" fill="none" opacity=".3"/>
    <path d="M8 60l8-18 6 8 5-6 9 16z" fill="#eaf6ff"/><path d="M60 60l10-22 7 10 4-4 10 16z" fill="#d7ecfa"/>
    <path d="M0 54c16-2 34 2 50 0s34-2 50 0V60H0z" fill="#f4fbff"/>`,
});

// Campo de colinas: base de la granja, Japón, el circo y el país de las golosinas.
DECORADOS.campo = `<circle cx="80" cy="14" r="7" fill="#fff59d" opacity=".85"/>
    <ellipse cx="24" cy="15" rx="10" ry="3" ${B} opacity=".55"/><ellipse cx="44" cy="22" rx="7" ry="2" ${B} opacity=".4"/>
    <path d="M0 60V44c14-8 30-8 46-2s30 4 54-4V60z" fill="#7cb342" opacity=".7"/>
    <path d="M0 60V50c20-5 40 2 60-1s28-4 40 0V60z" fill="#558b2f" opacity=".9"/>`;

// Llanura cálida sin monumentos: base de la sabana, Australia y la India (el monumento lo pone cada lugar).
DECORADOS.llanura = `<circle cx="82" cy="13" r="7" fill="#fff3c4" opacity=".9"/>
    <path d="M0 50c14-5 30 1 46-1s30-5 54 0V60H0z" fill="#e9b763" opacity=".85"/>
    <path d="M0 55c20-3 40 2 60 0s30-3 40 0V60H0z" fill="#d9a24f"/>
    <g fill="#6d8b3a" opacity=".75"><path d="M14 50h1.2v-7h-1.2z"/><ellipse cx="14.6" cy="42.5" rx="6" ry="1.8"/></g>`;

// Cielo según la hora: una veladura encima del fondo.
export const CIELOS = {
  dia: '',
  atardecer: 'linear-gradient(180deg, rgba(255,140,120,.45), rgba(255,196,120,.25) 55%, rgba(255,196,120,0))',
  noche: 'linear-gradient(180deg, rgba(10,14,48,.82), rgba(22,30,72,.55) 60%, rgba(22,30,72,.35))',
};

// Partículas del clima: posiciones fijas (la escena se ve igual cada vez que se pinta).
const CUANTAS = { lluvia: 46, nieve: 34, estrellas: 5, burbujas: 16, hojas: 14, confeti: 40 };
function particulas(clima) {
  const n = CUANTAS[clima] || 0;
  return Array.from({ length: n }, (_, i) => ({
    x: (i * 37 + 11) % 100,
    retraso: ((i * 53) % 100) / 100 * (clima === 'estrellas' ? 6 : 3),
    duracion: clima === 'lluvia' ? 0.7 + ((i * 7) % 5) / 10 : clima === 'estrellas' ? 3 + (i % 3) : 4 + ((i * 11) % 6),
    tam: 0.6 + ((i * 13) % 7) / 10,
    tono: i % 5,
  }));
}

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
      { capa: 'cielo', css: CIELOS[escenario.momento] || '', momento: escenario.momento || 'dia' },
      { capa: 'decorado', svg: DECORADOS[escenario.ambiente] || DECORADOS[AMBIENTES[escenario.ambiente]?.base] || '', monumento: AMBIENTES[escenario.ambiente]?.monumento || null },
      { capa: 'objetos', items: objetos },
      { capa: 'personajes', items: personajes },
      { capa: 'avatar', item: { id: escenario.avatar, emoji: av.emoji, etiqueta: `Tú · ${av.nombre}`, x: 50, y: 80 } },
      { capa: 'clima', clima: escenario.clima || 'despejado', items: particulas(escenario.clima) },
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

// Vida de fondo (25 nov): nubes que pasan, pájaros, peces, luciérnagas, estrellas fugaces y destellos.
// Depende del lugar y de la hora; posiciones fijas por índice para que la escena sea estable.
const INTERIOR = ['espacio', 'mar', 'cueva'];
export function vidaDeFondo(ambiente, momento = 'dia') {
  const base = AMBIENTES[ambiente]?.base || ambiente;
  const noche = momento === 'noche';
  const v = [];
  const cielo = !INTERIOR.includes(base) && !INTERIOR.includes(ambiente);
  if (cielo && !noche) v.push(['nube', 3]);
  if (cielo && !noche && !['polo'].includes(base)) v.push([base === 'playa' ? 'gaviota' : 'ave', 2]);
  if (base === 'mar') v.push(['pez', 4]);
  if (noche && ['bosque', 'campo', 'selva', 'llanura', 'castillo'].includes(base)) v.push(['luz', 10]);
  if ((noche && cielo) || base === 'espacio') v.push(['fugaz', 2]);
  if (ambiente === 'cueva') v.push(['destello', 12]);
  return v.flatMap(([tipo, n]) => Array.from({ length: n }, (_, i) => ({ tipo, i })));
}

const PECES = ['🐠', '🐟', '🐡', '🐠'];
function pintarVida(doc, ambiente, momento) {
  const capa = doc.createElement('div');
  capa.className = 'capa capa-vida';
  capa.setAttribute('aria-hidden', 'true');
  for (const { tipo, i } of vidaDeFondo(ambiente, momento)) {
    const e = doc.createElement('i');
    e.className = `vida vida-${tipo}`;
    e.style.setProperty('--i', i);
    if (tipo === 'pez') e.textContent = PECES[i % PECES.length];
    if (tipo === 'ave' || tipo === 'gaviota') e.innerHTML = '<svg viewBox="0 0 24 10"><path d="M1 7 Q6 1 12 7 Q18 1 23 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    if (tipo === 'destello') e.textContent = '✦';
    e.style.left = `${(i * 29 + 7) % 92}%`;
    e.style.top = `${tipo === 'pez' ? 40 + ((i * 17) % 40) : tipo === 'luz' || tipo === 'destello' ? 30 + ((i * 23) % 55) : 6 + ((i * 13) % 26)}%`;
    capa.appendChild(e);
  }
  return capa;
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
    if (c.capa === 'cielo') {
      capa.style.background = c.css;
      contenedor.dataset.momento = c.momento; // el CSS atenúa el decorado de noche
      if (c.momento === 'noche') for (let i = 0; i < 18; i++) {
        const e = doc.createElement('i'); e.className = 'brillo';
        e.style.left = `${(i * 41 + 7) % 100}%`; e.style.top = `${(i * 23 + 3) % 45}%`; e.style.animationDelay = `${(i % 6) * 0.5}s`;
        capa.appendChild(e);
      }
    }
    if (c.capa === 'clima') {
      capa.dataset.clima = c.clima;
      capa.setAttribute('aria-hidden', 'true');
      for (const p of c.items) {
        const e = doc.createElement('i');
        e.className = `gota tono-${p.tono}`;
        e.style.left = `${p.x}%`;
        e.style.animationDelay = `${p.retraso}s`;
        e.style.animationDuration = `${p.duracion}s`;
        e.style.setProperty('--tam', p.tam);
        capa.appendChild(e);
      }
    }
    // El SVG sale solo de DECORADOS (código propio), nunca de texto del usuario.
    if (c.capa === 'decorado') {
      capa.innerHTML = `<svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${c.svg}</svg>`;
      if (c.monumento) {
        const m = doc.createElement('span');
        m.className = 'monumento'; m.textContent = c.monumento; m.setAttribute('aria-hidden', 'true');
        capa.appendChild(m);
      }
    }
    if (c.capa === 'objetos') c.items.forEach((it, i) => capa.appendChild(elemento(doc, 'objeto', it, i * 0.15)));
    if (c.capa === 'personajes') c.items.forEach((it, i) => capa.appendChild(elemento(doc, 'personaje', it, 0.3 + i * 0.2)));
    if (c.capa === 'avatar') capa.appendChild(elemento(doc, 'avatar', c.item, 0.9));
    contenedor.appendChild(capa);
    if (c.capa === 'decorado') contenedor.appendChild(pintarVida(doc, escena.ambiente, contenedor.dataset.momento));
  }
}
