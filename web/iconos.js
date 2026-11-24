// Iconos propios (SVG, trazo 2, 24×24, color del texto). Sin librerías ni emojis en los controles.
const T = (cuerpo) => `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`;

export const ICONOS = {
  ventana: T('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 3.5v17M3.5 12h17"/>'),
  micro: T('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  parar: T('<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>'),
  magia: T('<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  altavoz: T('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  enviar: T('<path d="M20.5 3.5L10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4z"/>'),
  camara: T('<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  candado: T('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  escudo: T('<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>'),
  hospital: T('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>'),
  puzle: T('<path d="M4 4h6v2.2a1.8 1.8 0 1 0 3.6 0V4H20v6h-2.2a1.8 1.8 0 1 0 0 3.6H20V20h-6v-2.2a1.8 1.8 0 1 0-3.6 0V20H4z"/>'),
  sobre: T('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
  charla: T('<path d="M4 5.5h16v10H10l-4.5 3.5V15.5H4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  mapa: T('<path d="M3.5 6l5-2 7 2.5 5-2v13.5l-5 2-7-2.5-5 2z"/><path d="M8.5 4v13.5M15.5 6.5V20"/>'),
  gota: T('<path d="M12 3.5c3.5 4.4 6 7.8 6 10.8a6 6 0 0 1-12 0c0-3 2.5-6.4 6-10.8z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'),
  persona: T('<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
};

// Sustituye cada <span data-icono="nombre"></span> del documento por su icono.
export function ponerIconos(raiz = document) {
  for (const el of raiz.querySelectorAll('[data-icono]')) {
    const svg = ICONOS[el.dataset.icono];
    if (svg) el.innerHTML = svg; // SVG fijo de este archivo, nunca texto del usuario
  }
}
