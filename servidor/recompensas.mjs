// Recompensas colaborativas: estrellas → flores → Jardín de los recuerdos.
//
// · Resolver una carta de la familia (puzle + acertijo) = 1 estrella. Resolver una postal o un puzle de un amigo de la planta = 2.
// · Con 10 estrellas el niño elige una flor y la planta en el jardín de la planta (de toda la caja, sin internet).
// · Al resolver lo de otro niño puede mandarle un regalo: 2 estrellas de reconocimiento («¡Me gustó tu postal!»).
//   El regalo no le cuesta nada a quien lo da: nadie pierde por ser generoso.
// · El jardín no tiene ranking competitivo: cuenta lo que se ha plantado ENTRE TODOS y lo que cada uno ha regalado,
//   ordenado por alias, y hay metas comunes que cambian el jardín para todos (mariposas, fuente, arcoíris…).
// · Al alta las estrellas se borran con el espacio; las flores se quedan en el jardín SIN alias, como recuerdo anónimo.

import { createHash, randomUUID } from 'node:crypto';

export const PRECIO_FLOR = 10;
export const ESTRELLAS = { familia: 1, amigo: 2, regalo: 2 };

// Flores del catálogo: nombre y colores permitidos (nombre visible → color CSS).
export const FLORES = {
  rosa: { nombre: 'Rosa', colores: { roja: '#e53950', rosa: '#f48fb1', amarilla: '#ffd54f', blanca: '#fbf7ef', morada: '#9c6ade' } },
  girasol: { nombre: 'Girasol', colores: { amarillo: '#ffc928', naranja: '#ff9f3a' } },
  lirio: { nombre: 'Lirio', colores: { morado: '#8e7cc3', blanco: '#fbf7ef', naranja: '#ff9a5a' } },
  tulipan: { nombre: 'Tulipán', colores: { rojo: '#e5484d', amarillo: '#ffd54f', rosa: '#f7a1c4' } },
  margarita: { nombre: 'Margarita', colores: { blanca: '#fbf7ef', lila: '#c9b6f2' } },
  amapola: { nombre: 'Amapola', colores: { roja: '#e0412f', naranja: '#ff8a3d' } },
};

// Metas comunes del jardín: las consigue la planta entera, no un niño.
export const METAS = [
  { flores: 5, nombre: 'Llegan las mariposas', icono: '🦋' },
  { flores: 12, nombre: 'Brota una fuente', icono: '⛲' },
  { flores: 20, nombre: 'Sale el arcoíris', icono: '🌈' },
  { flores: 35, nombre: 'Crece el árbol de los deseos', icono: '🌳' },
  { flores: 50, nombre: 'Fiesta de luciérnagas', icono: '✨' },
];

export function prepararTablaRecompensas(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS estrellas (
      id TEXT PRIMARY KEY,
      espacio_id TEXT NOT NULL REFERENCES espacios(id) ON DELETE CASCADE,
      cantidad INTEGER NOT NULL,
      motivo TEXT NOT NULL CHECK (motivo IN ('familia','amigo','regalo','flor','demo')),
      ref TEXT NOT NULL,
      de_espacio TEXT REFERENCES espacios(id) ON DELETE SET NULL,
      creado INTEGER NOT NULL,
      UNIQUE (espacio_id, motivo, ref)
    );
    CREATE INDEX IF NOT EXISTS estrellas_de ON estrellas(de_espacio);
    CREATE TABLE IF NOT EXISTS flores (
      id TEXT PRIMARY KEY,
      espacio_id TEXT REFERENCES espacios(id) ON DELETE SET NULL,
      tipo TEXT NOT NULL,
      color TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      creado INTEGER NOT NULL
    );
  `);
}

// Sitio estable de cada flor en el jardín (0–100 en horizontal, 0–100 de fondo a frente).
function sitio(semilla) {
  const h = createHash('sha256').update(String(semilla)).digest();
  return { x: 6 + (h.readUInt16BE(0) / 65535) * 88, y: (h.readUInt16BE(2) / 65535) * 100 };
}

export function crearRecompensas(repo, { enLinea = () => false } = {}) {
  const { db } = repo;
  const ahora = () => Date.now();

  const saldo = (espacioId) => db.prepare('SELECT COALESCE(SUM(cantidad), 0) AS s FROM estrellas WHERE espacio_id = ?').get(espacioId).s;

  // Suma estrellas una sola vez por (motivo, ref). Devuelve las ganadas ahora (0 si ya se habían dado).
  function ganar(espacioId, motivo, ref, de = null) {
    const cantidad = ESTRELLAS[motivo];
    if (!cantidad || !repo.espacio(espacioId)) return { ganadas: 0, total: saldo(espacioId) };
    const r = db.prepare(`INSERT OR IGNORE INTO estrellas (id, espacio_id, cantidad, motivo, ref, de_espacio, creado) VALUES (?,?,?,?,?,?,?)`)
      .run(randomUUID(), espacioId, cantidad, motivo, String(ref), de, ahora());
    return { ganadas: r.changes ? cantidad : 0, total: saldo(espacioId) };
  }

  function plantar(espacioId, tipo, color) {
    const f = FLORES[tipo];
    if (!f || !Object.hasOwn(f.colores, color)) return { ok: false, error: 'flor' };
    if (saldo(espacioId) < PRECIO_FLOR) return { ok: false, error: 'estrellas' };
    const id = randomUUID();
    const { x, y } = sitio(id);
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO flores (id, espacio_id, tipo, color, x, y, creado) VALUES (?,?,?,?,?,?,?)').run(id, espacioId, tipo, color, x, y, ahora());
      db.prepare(`INSERT INTO estrellas (id, espacio_id, cantidad, motivo, ref, creado) VALUES (?,?,?,'flor',?,?)`).run(randomUUID(), espacioId, -PRECIO_FLOR, id, ahora());
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    repo.auditar(espacioId, 'ventana', 'plantar_flor', `${tipo}:${color}`);
    return { ok: true, flor: vistaFlor(db.prepare('SELECT * FROM flores WHERE id = ?').get(id), espacioId), total: saldo(espacioId) };
  }

  // Regalo: quien resolvió algo de otro niño le manda 2 estrellas. Una vez por mensaje.
  function regalar(deEspacio, aEspacio, mensajeId) {
    if (!aEspacio || aEspacio === deEspacio) return { ok: false, error: 'para' };
    if (regalado(deEspacio, mensajeId)) return { ok: false, error: 'ya_regalado' };
    const r = ganar(aEspacio, 'regalo', `${mensajeId}`, deEspacio);
    repo.auditar(deEspacio, 'ventana', 'regalo_estrellas', mensajeId);
    return { ok: true, ganadas: r.ganadas };
  }
  const regalado = (deEspacio, mensajeId) => !!db.prepare(`SELECT 1 FROM estrellas WHERE motivo = 'regalo' AND ref = ? AND de_espacio = ?`).get(String(mensajeId), deEspacio);

  function vistaFlor(f, yo) {
    const alias = f.espacio_id ? repo.espacio(f.espacio_id)?.alias : null;
    return { id: f.id, tipo: f.tipo, color: f.color, x: f.x, y: f.y, creado: f.creado, mia: f.espacio_id === yo, alias: alias || null };
  }

  function resumen(espacioId) {
    const regalos = db.prepare(`SELECT COUNT(*) AS n FROM estrellas WHERE motivo = 'regalo' AND espacio_id = ?`).get(espacioId).n;
    const flores = db.prepare('SELECT COUNT(*) AS n FROM flores WHERE espacio_id = ?').get(espacioId).n;
    return { estrellas: saldo(espacioId), precio: PRECIO_FLOR, flores, regalosRecibidos: regalos };
  }

  // El Jardín de los recuerdos de la planta. Solo alias de quien tiene la comunidad activada (y los tuyos).
  function jardin(espacioId) {
    const total = db.prepare('SELECT COUNT(*) AS n FROM flores').get().n;
    const comunidad = new Set(db.prepare('SELECT id FROM espacios WHERE comunidad = 1').all().map((e) => e.id));
    const flores = db.prepare('SELECT * FROM flores ORDER BY y, creado').all().map((f) => {
      const v = vistaFlor(f, espacioId);
      if (!v.mia && !comunidad.has(f.espacio_id)) v.alias = null; // sin consentimiento de comunidad: flor anónima
      return v;
    });
    const companeros = db.prepare(`SELECT e.id, e.alias, e.avatar,
        (SELECT COUNT(*) FROM flores f WHERE f.espacio_id = e.id) AS flores,
        (SELECT COUNT(*) FROM estrellas s WHERE s.motivo = 'regalo' AND s.de_espacio = e.id) AS regalos
      FROM espacios e WHERE e.comunidad = 1 OR e.id = ? ORDER BY e.alias COLLATE NOCASE`).all(espacioId)
      .map((e) => ({ alias: e.alias, avatar: e.avatar, flores: e.flores, regalos: e.regalos, yo: e.id === espacioId, enLinea: e.id === espacioId || enLinea(e.id) }));
    const conseguidas = METAS.filter((m) => total >= m.flores);
    const siguiente = METAS.find((m) => total < m.flores) || null;
    return {
      ...resumen(espacioId), total, flores, companeros,
      recuerdos: flores.filter((f) => !f.alias && !f.mia).length,
      regalosTotales: db.prepare(`SELECT COUNT(*) AS n FROM estrellas WHERE motivo = 'regalo'`).get().n,
      metas: { conseguidas, siguiente },
      catalogo: FLORES,
    };
  }

  function exportar(espacioId) {
    return {
      estrellas: db.prepare('SELECT cantidad, motivo, creado FROM estrellas WHERE espacio_id = ? ORDER BY creado').all(espacioId),
      flores: db.prepare('SELECT tipo, color, creado FROM flores WHERE espacio_id = ? ORDER BY creado').all(espacioId),
    };
  }

  // Demo ficticia: Leo empieza con 8 estrellas (una postal de un amigo le lleva a su primera flor) y el jardín ya tiene vida.
  function sembrarDemo(espacios) {
    const [leo, sara, nico] = espacios;
    db.prepare(`INSERT OR IGNORE INTO estrellas (id, espacio_id, cantidad, motivo, ref, creado) VALUES (?,?,8,'demo','inicio',?)`).run(randomUUID(), leo, ahora());
    if (db.prepare('SELECT COUNT(*) AS n FROM flores').get().n) return;
    const semillas = [[sara, 'girasol', 'amarillo'], [sara, 'tulipan', 'rosa'], [nico, 'rosa', 'roja'], [nico, 'lirio', 'morado'],
      [null, 'margarita', 'blanca'], [null, 'rosa', 'amarilla'], [null, 'amapola', 'roja']];
    semillas.forEach(([esp, tipo, color], i) => {
      const id = randomUUID();
      const { x, y } = sitio(`demo-${i}`);
      db.prepare('INSERT INTO flores (id, espacio_id, tipo, color, x, y, creado) VALUES (?,?,?,?,?,?,?)').run(id, esp, tipo, color, x, y, ahora() - (7 - i) * 3600_000);
    });
    if (sara && leo) db.prepare(`INSERT OR IGNORE INTO estrellas (id, espacio_id, cantidad, motivo, ref, de_espacio, creado) VALUES (?,?,2,'regalo','demo-sara',?,?)`)
      .run(randomUUID(), nico, sara, ahora());
  }

  // Vuelve la demo al punto de partida (Leo con 8 estrellas, jardín de ejemplo). Solo espacios de demo.
  function reiniciarDemo(espacios) {
    const marcas = espacios.map(() => '?').join(',');
    db.prepare(`DELETE FROM estrellas WHERE espacio_id IN (${marcas})`).run(...espacios);
    db.prepare(`DELETE FROM flores WHERE espacio_id IN (${marcas}) OR espacio_id IS NULL`).run(...espacios);
    sembrarDemo(espacios);
  }

  return { saldo, ganar, plantar, regalar, regalado, resumen, jardin, exportar, sembrarDemo, reiniciarDemo };
}
