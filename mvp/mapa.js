// Mapa de lugares: palabra o sinónimo -> paisaje.
export const PAISAJES = {
  playa: { nombre: 'Playa', color: ['#8fd3f4', '#f6d365'] },
  bosque: { nombre: 'Bosque', color: ['#2e7d32', '#a5d6a7'] },
  montana: { nombre: 'Montaña', color: ['#607d8b', '#eceff1'] },
  espacio: { nombre: 'Espacio', color: ['#0b0d2e', '#5c6bc0'] },
  selva: { nombre: 'Selva', color: ['#1b5e20', '#66bb6a'] },
  mar: { nombre: 'Mar de noche', color: ['#0d1b2a', '#1b4965'] },
};

const SINONIMOS = {
  playa: ['playa', 'arena', 'orilla'],
  bosque: ['bosque', 'árboles', 'arboles', 'parque'],
  montana: ['montaña', 'montana', 'nieve', 'sierra'],
  espacio: ['espacio', 'estrellas', 'luna', 'planeta'],
  selva: ['selva', 'jungla'],
  mar: ['mar', 'océano', 'oceano'],
};

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .trim();
}

// Devuelve la clave de paisaje que aparece en la frase, o null si no hay ninguna.
export function paisajeDesde(frase) {
  if (!frase || typeof frase !== 'string') return null;
  const palabras = normalizar(frase).split(/\s+/);
  for (const [clave, lista] of Object.entries(SINONIMOS)) {
    const listaNormal = lista.map(normalizar);
    if (palabras.some((p) => listaNormal.includes(p))) return clave;
  }
  return null;
}
