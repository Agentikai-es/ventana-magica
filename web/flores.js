// Flores del Jardín de los recuerdos: SVG propios (sin imágenes ni librerías), con animación de crecimiento por CSS.
// Cada flor tiene tallo, hojas y cabeza; la cabeza se pinta con el color elegido por el niño.

const tallo = '<path class="f-tallo" d="M50 150 C50 120 46 100 50 70" stroke="#3f8f4a" stroke-width="5" fill="none" stroke-linecap="round"/>'
  + '<path class="f-hoja" d="M49 118 C34 112 28 100 30 92 C40 96 48 104 49 118Z" fill="#5bb36a"/>'
  + '<path class="f-hoja f-hoja2" d="M51 104 C66 98 72 88 70 80 C60 84 52 92 51 104Z" fill="#4ea65d"/>';

const petalos = (n, rx, ry, color, cy = 60, dist = 14) => Array.from({ length: n }, (_, i) =>
  `<ellipse cx="50" cy="${cy - dist}" rx="${rx}" ry="${ry}" fill="${color}" transform="rotate(${(360 / n) * i} 50 ${cy})"/>`).join('');

const oscuro = (hex, f = 0.78) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `rgb(${c.join(',')})`;
};

const CABEZAS = {
  rosa: (c) => `<circle cx="50" cy="60" r="20" fill="${oscuro(c)}"/>${petalos(5, 11, 13, c, 60, 8)}`
    + `<circle cx="50" cy="60" r="10" fill="${oscuro(c, 0.88)}"/><path d="M44 60 a6 6 0 1 1 12 0 a4 4 0 1 1 -8 0" fill="none" stroke="${oscuro(c, 0.65)}" stroke-width="2"/>`,
  girasol: (c) => `${petalos(14, 5, 13, c, 60, 16)}<circle cx="50" cy="60" r="12" fill="#6b4226"/><circle cx="50" cy="60" r="7" fill="#4a2c18"/>`,
  lirio: (c) => `${petalos(3, 8, 20, c, 62, 14)}${petalos(3, 6, 16, oscuro(c, 0.85), 62, 12).replace(/rotate\((\d+)/g, (m, g) => `rotate(${Number(g) + 60}`)}`
    + '<circle cx="50" cy="62" r="4" fill="#ffd54f"/>',
  tulipan: (c) => `<path d="M34 50 Q34 78 50 80 Q66 78 66 50 L58 60 L50 46 L42 60 Z" fill="${c}"/><path d="M42 60 L50 46 L58 60 Q54 74 50 76 Q46 74 42 60Z" fill="${oscuro(c, 0.86)}"/>`,
  margarita: (c) => `${petalos(12, 4.5, 13, c, 60, 14)}<circle cx="50" cy="60" r="8" fill="#ffc928"/>`,
  amapola: (c) => `${petalos(4, 15, 15, c, 60, 9)}<circle cx="50" cy="60" r="7" fill="#2b2d42"/><circle cx="50" cy="60" r="3" fill="#4a4c66"/>`,
};

// Devuelve el SVG de una flor (solo valores del catálogo: tipo y color CSS ya validados por el servidor).
export function svgFlor(tipo, color) {
  const cabeza = (CABEZAS[tipo] || CABEZAS.margarita)(/^#[0-9a-f]{6}$/i.test(color) ? color : '#fbf7ef');
  return `<svg class="flor-svg" viewBox="0 0 100 150" aria-hidden="true" focusable="false">${tallo}<g class="f-cabeza">${cabeza}</g></svg>`;
}

export const EMOJI_FLOR = { rosa: '🌹', girasol: '🌻', lirio: '🪻', tulipan: '🌷', margarita: '🌼', amapola: '🌺' };
