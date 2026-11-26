// Puzle deslizante por intercambio: toca una pieza y luego otra (o arrástrala) para cambiarlas de sitio.
// Las piezas bien colocadas se quedan fijas (ayuda a los más pequeños). Funciona con teclado y lector de pantalla.
import { efecto } from './sonido.js';

// Recorta la imagen en un cuadrado centrado (así cualquier foto vale de puzle).
async function cuadrado(url, lado = 720) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const m = Math.min(img.naturalWidth, img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = c.height = lado;
  c.getContext('2d').drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, lado, lado);
  return URL.createObjectURL(await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)));
}

// Mezcla que nunca deja el puzle resuelto y deja al menos la mitad de las piezas fuera de sitio.
function mezclar(n) {
  for (;;) {
    const o = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    if (o.filter((v, i) => v === i).length <= n / 3) return o;
  }
}

// Mezcla fácil (demo en vivo): solo dos parejas cambiadas → 4 piezas fuera de sitio, se resuelve en 2 toques dobles.
function mezclarFacil(n) {
  const o = [...Array(n).keys()];
  const libres = [...o].sort(() => Math.random() - 0.5).slice(0, 4);
  [o[libres[0]], o[libres[1]]] = [o[libres[1]], o[libres[0]]];
  [o[libres[2]], o[libres[3]]] = [o[libres[3]], o[libres[2]]];
  return o;
}

export async function crearPuzle(contenedor, url, { lado = 3, alResolver, titulo = 'Puzle', facil = false } = {}) {
  const imagen = await cuadrado(url);
  const n = lado * lado;
  const orden = facil ? mezclarFacil(n) : mezclar(n);          // orden[posición] = pieza
  let elegida = null;
  let terminado = false;

  const rejilla = document.createElement('div');
  rejilla.className = 'puzle-juego';
  rejilla.style.setProperty('--lado', lado);
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', `${titulo}: toca una pieza y luego otra para cambiarlas de sitio`);
  const estado = document.createElement('p');
  estado.className = 'puzle-estado';
  estado.setAttribute('role', 'status');
  contenedor.replaceChildren(rejilla, estado);

  const bien = () => orden.filter((p, i) => p === i).length;

  function pintar() {
    rejilla.replaceChildren(...orden.map((pieza, pos) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pieza-puzle';
      b.dataset.pos = pos;
      const fila = Math.floor(pieza / lado), col = pieza % lado;
      b.style.backgroundImage = `url(${imagen})`;
      b.style.backgroundSize = `${lado * 100}% ${lado * 100}%`;
      b.style.backgroundPosition = `${(col / (lado - 1)) * 100}% ${(fila / (lado - 1)) * 100}%`;
      const fija = pieza === pos;
      if (fija) b.classList.add('fija');
      if (elegida === pos) b.classList.add('elegida');
      b.setAttribute('aria-label', fija ? `Pieza ${pos + 1}: en su sitio` : `Pieza ${pos + 1}${elegida === pos ? ', elegida' : ''}`);
      b.disabled = fija || terminado;
      return b;
    }));
    estado.textContent = terminado ? '¡Puzle completo!' : `${bien()} de ${n} piezas en su sitio`;
  }

  function cambiar(a, b) {
    if (a === b) return;
    [orden[a], orden[b]] = [orden[b], orden[a]];
    efecto(orden[a] === a || orden[b] === b ? 'encaja' : 'toque');
    elegida = null;
    if (bien() === n) {
      terminado = true;
      rejilla.classList.add('completo');
      efecto('resuelto');
      pintar();
      setTimeout(() => alResolver?.(), 900);
      return;
    }
    pintar();
  }

  function tocar(pos) {
    if (terminado || orden[pos] === pos) return;
    if (elegida === null) { elegida = pos; efecto('toque'); pintar(); rejilla.querySelector(`[data-pos="${pos}"]`)?.focus(); return; }
    const antes = elegida;
    cambiar(antes, pos);
    rejilla.querySelector(`[data-pos="${pos}"]`)?.focus();
  }

  // Tocar / clic / teclado
  rejilla.addEventListener('click', (e) => {
    const b = e.target.closest('.pieza-puzle');
    if (b) tocar(Number(b.dataset.pos));
  });
  // Arrastrar: soltar una pieza encima de otra las cambia
  let arrastre = null;
  rejilla.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.pieza-puzle');
    if (b && !b.disabled) arrastre = { pos: Number(b.dataset.pos), x: e.clientX, y: e.clientY };
  });
  rejilla.addEventListener('pointerup', (e) => {
    if (!arrastre) return;
    const movio = Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) > 14;
    const destino = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pieza-puzle');
    if (movio && destino && !destino.disabled) { e.preventDefault(); cambiar(arrastre.pos, Number(destino.dataset.pos)); rejilla.dataset.arrastrado = '1'; }
    arrastre = null;
  });
  rejilla.addEventListener('click', (e) => { if (rejilla.dataset.arrastrado) { delete rejilla.dataset.arrastrado; e.stopImmediatePropagation(); } }, true);

  pintar();
  return { destruir: () => URL.revokeObjectURL(imagen) };
}
