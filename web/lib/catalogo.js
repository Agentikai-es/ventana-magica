// Catálogo cerrado de la Ventana Mágica (v3).
// Todo lo que puede aparecer en la ventana sale de aquí. Nombres 100 % originales:
// ningún personaje, nombre ni diseño con marca registrada.

// ---------- Ambientes ----------
// sinonimos: palabras (ya sin tildes) que eligen el ambiente.
// papel: el rol del niño como protagonista («Hoy tú eres …»).
export const AMBIENTES = {
  castillo: {
    nombre: 'Castillo de las Nubes',
    sinonimos: ['castillo', 'castillos', 'palacio', 'reino', 'torre', 'torres', 'princesa', 'principe', 'rey', 'reina', 'caballero', 'caballeros'],
    paleta: ['#c3b1e1', '#ffe5b4'],
    personajes: ['dragon_amable', 'hada_luz', 'unicornio'],
    objetos: ['bandera', 'llave', 'corona'],
    sonido: 'campanas',
    papel: 'quien guarda la llave dorada del castillo',
    avatar: 'mago',
  },
  espacio: {
    nombre: 'Viaje a las Estrellas',
    sinonimos: ['espacio', 'estrellas', 'estrella', 'luna', 'planeta', 'planetas', 'galaxia', 'cohete', 'nave', 'astronauta', 'cosmos', 'marte'],
    paleta: ['#0b0d2e', '#5c6bc0'],
    personajes: ['robot_amigo', 'marciano'],
    objetos: ['planeta', 'cohete', 'estrella'],
    sonido: 'cosmos',
    papel: 'quien pilota la nave de las estrellas',
    avatar: 'astronauta',
  },
  selva: {
    nombre: 'Selva Esmeralda',
    sinonimos: ['selva', 'jungla', 'tropical', 'safari', 'dinosaurios', 'dinosaurio'],
    paleta: ['#1b5e20', '#9ccc65'],
    personajes: ['leon_dormilon', 'mono_saltarin', 'loro'],
    objetos: ['palmera', 'flor', 'mariposa'],
    sonido: 'selva',
    papel: 'quien guía la expedición por la selva',
    avatar: 'zorrito',
  },
  ciudad: {
    nombre: 'Ciudad de los Héroes',
    sinonimos: ['ciudad', 'calle', 'calles', 'rascacielos', 'superheroe', 'superheroes', 'superheroina', 'heroe', 'heroes', 'heroina', 'superpoder', 'superpoderes'],
    paleta: ['#ff8a65', '#4fc3f7'],
    personajes: ['heroe_ciudad', 'heroe_armadura', 'perrito_rescate'],
    objetos: ['globo', 'arcoiris', 'capa'],
    sonido: 'ciudad',
    papel: 'quien protege la ciudad con el superpoder de ayudar',
    avatar: 'superheroe',
  },
  playa: {
    nombre: 'Playa del Sol',
    sinonimos: ['playa', 'arena', 'orilla', 'verano', 'isla'],
    paleta: ['#8fd3f4', '#f6d365'],
    personajes: ['tortuga_sabia', 'cangrejo_bailarin'],
    objetos: ['sol', 'concha', 'sombrilla'],
    sonido: 'olas',
    papel: 'quien construye el castillo de arena más grande del mundo',
    avatar: 'zorrito',
  },
  bosque: {
    nombre: 'Bosque de los Secretos',
    sinonimos: ['bosque', 'arboles', 'arbol', 'parque', 'campo', 'setas'],
    paleta: ['#2e7d32', '#c5e1a5'],
    personajes: ['buho', 'ardilla', 'criatura_chispa'],
    objetos: ['seta', 'pino', 'margarita'],
    sonido: 'pajaros',
    papel: 'quien cuida los secretos del bosque',
    avatar: 'osito',
  },
  montana: {
    nombre: 'Montaña Nevada',
    sinonimos: ['montana', 'montanas', 'nieve', 'sierra', 'cima', 'esquiar', 'trineo', 'pirineo', 'pirineos', 'invierno'],
    paleta: ['#607d8b', '#eceff1'],
    personajes: ['muneco_nieve', 'cabra_montes'],
    objetos: ['copo', 'trineo', 'pico'],
    sonido: 'viento',
    papel: 'quien llega antes que nadie a la cima nevada',
    avatar: 'osito',
  },
  mar: {
    nombre: 'Mar de Noche',
    sinonimos: ['mar', 'oceano', 'barco', 'submarino', 'olas', 'pirata', 'piratas', 'navegar'],
    paleta: ['#0d1b2a', '#1b4965'],
    personajes: ['ballena_canta', 'pez_naranja', 'pulpo'],
    objetos: ['luna', 'burbujas', 'velero'],
    sonido: 'nana',
    papel: 'quien navega bajo la luna',
    avatar: 'zorrito',
  },
  paris: {
    nombre: 'París y la Torre Eiffel',
    sinonimos: ['paris', 'francia', 'torre eiffel', 'eiffel', 'francesa', 'frances'],
    paleta: ['#f7c6d0', '#a7c5f2'],
    personajes: ['pintora', 'paloma', 'gatito'],
    objetos: ['croissant', 'globo', 'boina'],
    sonido: 'acordeon',
    papel: 'quien sube a lo más alto de la Torre Eiffel',
    avatar: 'gatita',
  },
  egipto: {
    nombre: 'Pirámides de Egipto',
    sinonimos: ['egipto', 'piramide', 'piramides', 'desierto', 'faraon', 'faraona', 'esfinge', 'oasis'],
    paleta: ['#f6d58e', '#f0a35e'],
    personajes: ['camello', 'escarabajo_dorado', 'gatito'],
    objetos: ['sol', 'pergamino', 'palmera'],
    sonido: 'desierto',
    papel: 'quien descubre el tesoro escondido de las pirámides',
    avatar: 'zorrito',
  },
  polo: {
    nombre: 'Polo Norte',
    sinonimos: ['polo norte', 'polo', 'artico', 'antartida', 'iglu', 'aurora', 'auroras', 'oso polar', 'focas', 'foca'],
    paleta: ['#1d3557', '#a8dadc'],
    personajes: ['oso_polar', 'foca', 'ballena_canta'],
    objetos: ['copo', 'estrella', 'trineo'],
    sonido: 'viento',
    papel: 'quien encuentra la aurora boreal más bonita',
    avatar: 'pinguino',
  },
};

// ---------- Personajes (originales) ----------
// casa: ambiente al que se va si el niño pide el personaje sin decir el lugar.
export const PERSONAJES = {
  dragon_amable: { nombre: 'Dragón Amable', emoji: '🐉', casa: 'castillo', sinonimos: ['dragon', 'dragones', 'dragona'] },
  hada_luz: { nombre: 'Hada de Luz', emoji: '🧚‍♀️', casa: 'castillo', sinonimos: ['hada', 'hadas'] },
  unicornio: { nombre: 'Unicornio de Algodón', emoji: '🦄', casa: 'castillo', sinonimos: ['unicornio', 'unicornios'] },
  princesa_cristal: { nombre: 'Princesa de Cristal', emoji: '👸', casa: 'castillo', sinonimos: ['princesa de cristal', 'princesa del hielo'] },
  mago_estrellas: { nombre: 'Mago de las Estrellas', emoji: '🧙‍♂️', casa: 'castillo', sinonimos: ['mago', 'magos', 'bruja buena', 'magia'] },
  robot_amigo: { nombre: 'Robot Amigo', emoji: '🤖', casa: 'espacio', sinonimos: ['robot', 'robots'] },
  marciano: { nombre: 'Marciano Simpático', emoji: '👽', casa: 'espacio', sinonimos: ['marciano', 'marcianos', 'extraterrestre', 'alien'] },
  heroe_armadura: { nombre: 'Capitán Armadura Roja', emoji: '🦸‍♂️', casa: 'ciudad', sinonimos: ['armadura', 'armaduras'] },
  trepamuros: { nombre: 'Chico Trepamuros', emoji: '🧗', casa: 'ciudad', sinonimos: ['trepamuros', 'escalador'] },
  pintora: { nombre: 'Pintora de Montmartre', emoji: '🧑‍🎨', casa: 'paris', sinonimos: ['pintora', 'pintor', 'pintar'] },
  paloma: { nombre: 'Paloma Viajera', emoji: '🕊️', casa: 'paris', sinonimos: ['paloma', 'palomas'] },
  camello: { nombre: 'Camello Paciente', emoji: '🐫', casa: 'egipto', sinonimos: ['camello', 'camellos'] },
  escarabajo_dorado: { nombre: 'Escarabajo Dorado', emoji: '🪲', casa: 'egipto', sinonimos: ['escarabajo', 'escarabajos'] },
  oso_polar: { nombre: 'Oso Polar Abrazón', emoji: '🐻‍❄️', casa: 'polo', sinonimos: ['oso polar', 'osos polares'] },
  foca: { nombre: 'Foca Juguetona', emoji: '🦭', casa: 'polo', sinonimos: ['foca', 'focas'] },
  heroe_ciudad: { nombre: 'Héroe de la Ciudad', emoji: '🦸‍♀️', casa: 'ciudad', sinonimos: [] },
  perrito_rescate: { nombre: 'Perrito Rescatador', emoji: '🐕', casa: 'ciudad', sinonimos: ['perro', 'perrito', 'perros', 'cachorro'] },
  leon_dormilon: { nombre: 'León Dormilón', emoji: '🦁', casa: 'selva', sinonimos: ['leon', 'leones'] },
  mono_saltarin: { nombre: 'Mono Saltarín', emoji: '🐒', casa: 'selva', sinonimos: ['mono', 'monos', 'monito'] },
  loro: { nombre: 'Loro Parlanchín', emoji: '🦜', casa: 'selva', sinonimos: ['loro', 'loros', 'pajaro tropical'] },
  dino_tranquilo: { nombre: 'Dino Tranquilo', emoji: '🦕', casa: 'selva', sinonimos: ['dinosaurio', 'dinosaurios', 'dino', 'dinos'] },
  tortuga_sabia: { nombre: 'Tortuga Sabia', emoji: '🐢', casa: 'playa', sinonimos: ['tortuga', 'tortugas'] },
  cangrejo_bailarin: { nombre: 'Cangrejo Bailarín', emoji: '🦀', casa: 'playa', sinonimos: ['cangrejo', 'cangrejos'] },
  pez_naranja: { nombre: 'Pececito Naranja', emoji: '🐠', casa: 'mar', sinonimos: ['pez', 'peces', 'pececito'] },
  ballena_canta: { nombre: 'Ballena Cantarina', emoji: '🐋', casa: 'mar', sinonimos: ['ballena', 'ballenas'] },
  pulpo: { nombre: 'Pulpo Abrazos', emoji: '🐙', casa: 'mar', sinonimos: ['pulpo', 'pulpos'] },
  sirena: { nombre: 'Sirena de las Mareas', emoji: '🧜', casa: 'mar', sinonimos: ['sirena', 'sirenas'] },
  buho: { nombre: 'Búho Sabelotodo', emoji: '🦉', casa: 'bosque', sinonimos: ['buho', 'buhos', 'lechuza'] },
  ardilla: { nombre: 'Ardilla Veloz', emoji: '🐿️', casa: 'bosque', sinonimos: ['ardilla', 'ardillas'] },
  criatura_chispa: { nombre: 'Chispa, la criatura eléctrica', emoji: '🐹', casa: 'bosque', sinonimos: ['criatura', 'criaturas'] },
  raton_aventurero: { nombre: 'Ratón Aventurero', emoji: '🐭', casa: 'bosque', sinonimos: ['raton', 'ratones', 'ratita'] },
  muneco_nieve: { nombre: 'Muñeco de Nieve Risueño', emoji: '⛄', casa: 'montana', sinonimos: ['muneco de nieve', 'munecos de nieve'] },
  cabra_montes: { nombre: 'Cabra Escaladora', emoji: '🐐', casa: 'montana', sinonimos: ['cabra', 'cabras'] },
  gatito: { nombre: 'Gatito Curioso', emoji: '🐈', casa: 'ciudad', sinonimos: ['gato', 'gatos', 'gatito', 'gatita'] },
};

// ---------- Objetos ----------
export const OBJETOS = {
  bandera: { emoji: '🚩', nombre: 'bandera' },
  llave: { emoji: '🗝️', nombre: 'llave dorada' },
  corona: { emoji: '👑', nombre: 'corona' },
  planeta: { emoji: '🪐', nombre: 'planeta con anillos' },
  cohete: { emoji: '🚀', nombre: 'cohete' },
  estrella: { emoji: '⭐', nombre: 'estrella' },
  palmera: { emoji: '🌴', nombre: 'palmera' },
  flor: { emoji: '🌺', nombre: 'flor' },
  mariposa: { emoji: '🦋', nombre: 'mariposa' },
  globo: { emoji: '🎈', nombre: 'globo' },
  arcoiris: { emoji: '🌈', nombre: 'arcoíris' },
  capa: { emoji: '🧣', nombre: 'capa' },
  sol: { emoji: '☀️', nombre: 'sol' },
  concha: { emoji: '🐚', nombre: 'concha' },
  sombrilla: { emoji: '⛱️', nombre: 'sombrilla' },
  seta: { emoji: '🍄', nombre: 'seta' },
  pino: { emoji: '🌲', nombre: 'pino' },
  margarita: { emoji: '🌼', nombre: 'margarita' },
  copo: { emoji: '❄️', nombre: 'copo de nieve' },
  trineo: { emoji: '🛷', nombre: 'trineo' },
  pico: { emoji: '🏔️', nombre: 'pico' },
  luna: { emoji: '🌙', nombre: 'luna' },
  burbujas: { emoji: '🫧', nombre: 'burbujas' },
  velero: { emoji: '⛵', nombre: 'velero' },
  croissant: { emoji: '🥐', nombre: 'cruasán' },
  boina: { emoji: '🎨', nombre: 'paleta de colores' },
  pergamino: { emoji: '📜', nombre: 'mapa del tesoro' },
};

// ---------- Avatares (el niño elige uno; nunca fotos reales) ----------
export const AVATARES = {
  zorrito: { nombre: 'Zorrito', emoji: '🦊' },
  osito: { nombre: 'Osito', emoji: '🐻' },
  astronauta: { nombre: 'Astronauta', emoji: '🧑‍🚀' },
  superheroe: { nombre: 'Superhéroe', emoji: '🦸' },
  mago: { nombre: 'Mago', emoji: '🧙' },
  hada: { nombre: 'Hada', emoji: '🧚' },
  gatita: { nombre: 'Gatita', emoji: '🐱' },
  pinguino: { nombre: 'Pingüino', emoji: '🐧' },
};

// ---------- Marcas registradas → equivalente original ----------
// Si una frase pide un personaje con marca, se usa este personaje original.
// La marca nunca se muestra ni se lee en la ventana.
export const MARCAS = {
  disney: 'hada_luz',
  pixar: 'robot_amigo',
  marvel: 'heroe_ciudad',
  avengers: 'heroe_armadura',
  vengadores: 'heroe_armadura',
  'spider man': 'trepamuros',
  spiderman: 'trepamuros',
  'hombre arana': 'trepamuros',
  'iron man': 'heroe_armadura',
  ironman: 'heroe_armadura',
  'tony stark': 'heroe_armadura',
  hulk: 'heroe_ciudad',
  thor: 'heroe_ciudad',
  'capitan america': 'heroe_ciudad',
  batman: 'heroe_ciudad',
  superman: 'heroe_ciudad',
  'wonder woman': 'heroe_ciudad',
  'mujer maravilla': 'heroe_ciudad',
  frozen: 'princesa_cristal',
  elsa: 'princesa_cristal',
  olaf: 'muneco_nieve',
  'harry potter': 'mago_estrellas',
  hogwarts: 'mago_estrellas',
  pokemon: 'criatura_chispa',
  pikachu: 'criatura_chispa',
  stitch: 'criatura_chispa',
  'toy story': 'robot_amigo',
  buzz: 'robot_amigo',
  'buzz lightyear': 'robot_amigo',
  'star wars': 'robot_amigo',
  nemo: 'pez_naranja',
  dory: 'pez_naranja',
  ariel: 'sirena',
  sirenita: 'sirena',
  vaiana: 'tortuga_sabia',
  moana: 'tortuga_sabia',
  simba: 'leon_dormilon',
  'rey leon': 'leon_dormilon',
  mickey: 'raton_aventurero',
  minnie: 'raton_aventurero',
  'patrulla canina': 'perrito_rescate',
  'paw patrol': 'perrito_rescate',
  bluey: 'perrito_rescate',
  'hello kitty': 'gatito',
};

// ---------- Contenido que no entra (violento o de miedo intenso) ----------
export const NO_PERMITIDO = [
  'matar', 'mata', 'muerte', 'morir', 'muerto', 'muertos', 'sangre', 'pistola', 'pistolas',
  'arma', 'armas', 'cuchillo', 'disparar', 'dispara', 'pelea', 'peleas', 'pegar', 'guerra',
  'bomba', 'bombas', 'explotar', 'zombi', 'zombis', 'zombie', 'zombies', 'terror', 'miedo',
  'monstruo', 'monstruos', 'demonio', 'diablo', 'asesino', 'herido', 'heridos',
];

// ---------- Cómo está el cielo: el niño lo cambia con la voz («que sea de noche», «que nieve») ----------
export const MOMENTOS = {
  dia: { nombre: 'de día', sinonimos: ['de dia', 'dia', 'por la manana', 'manana', 'sol'] },
  atardecer: { nombre: 'al atardecer', sinonimos: ['atardecer', 'puesta de sol', 'anochecer', 'por la tarde'] },
  noche: { nombre: 'de noche', sinonimos: ['noche', 'de noche', 'oscuro', 'oscuridad', 'por la noche'] },
};
export const CLIMAS = {
  despejado: { nombre: 'despejado', sinonimos: ['despejado', 'sin lluvia', 'que pare'] },
  lluvia: { nombre: 'con lluvia', sinonimos: ['lluvia', 'llueva', 'llover', 'lloviendo', 'llueve'] },
  nieve: { nombre: 'con nieve', sinonimos: ['nieve', 'nieva', 'nevando', 'nevar', 'nieve cayendo'] },
  estrellas: { nombre: 'con estrellas fugaces', sinonimos: ['estrellas fugaces', 'estrella fugaz', 'fuegos artificiales'] },
  burbujas: { nombre: 'con burbujas', sinonimos: ['burbujas', 'pompas'] },
  hojas: { nombre: 'con hojas de otoño', sinonimos: ['otono', 'hojas'] },
  confeti: { nombre: 'de fiesta', sinonimos: ['fiesta', 'confeti', 'cumpleanos', 'celebracion'] },
};

// Desde dónde se envía una foto (lo elige quien la manda; nunca se usa el GPS).
export const LUGARES = ['desde casa', 'desde el cole', 'desde el parque', 'desde la playa', 'desde el pueblo', 'desde el trabajo', 'desde el campo de fútbol', 'desde la montaña'];

// Orden de las alternativas seguras que se proponen cuando la petición no encaja.
export const ALTERNATIVAS_SEGURAS = ['playa', 'castillo', 'espacio', 'paris', 'bosque', 'polo', 'mar', 'selva', 'egipto', 'montana', 'ciudad'];

export function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
