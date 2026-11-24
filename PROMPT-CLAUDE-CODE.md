# Prompt para Claude Code · Ventana Peque (v2: Ventana Mágica a medida)

Eres el desarrollador principal del proyecto Ventana Peque, para el hackatón Campus DAI 4.0 (demo el 26 nov 2026, Zaragoza). Trabajas en esta carpeta. Lee antes `SPEC.md`, `CLAUDE.md` y `ROLES.md`.

## Qué construir
La Ventana Mágica es una experiencia hecha a medida de un niño hospitalizado de 6–12 años. El niño pide un escenario con su voz o con texto («quiero estar en un castillo con dragones amables») y la ventana crea ese mundo, con él como protagonista.

Entregable: que cualquier petición de un listado de 10 frases de prueba produzca un escenario válido, o tres alternativas seguras.

## Arquitectura obligatoria (por capas, sin dependencias nuevas salvo que se justifique)
1. **Entrada:** texto (y voz con la API de voz del navegador, como ya está en `mvp/index.html`).
2. **Interpretación (`mvp/escenario.js`):** convierte la frase en un objeto `Escenario`:
   `{ ambiente, paleta: [c1, c2], personajes: [...del catálogo], objetos: [...], sonido, rolNino: 'protagonista', avatar, alternativas?: [...] }`.
   - Sin modelo de lenguaje en la primera versión: reglas y sinónimos en un fichero de datos (`mvp/catalogo.js`).
   - Si la frase no encaja, devuelve `alternativas` (3 escenarios seguros) y nunca lanza error.
3. **Catálogo (`mvp/catalogo.js`):** lista cerrada de ambientes, personajes y objetos. Cada personaje tiene un nombre original. No incluyas nombres o diseños con marca registrada (Disney, Marvel, Avengers, Pixar, etc.); si una frase los pide, usa su equivalente original del catálogo.
4. **Composición (`mvp/escena.js`):** dibuja el escenario en capas con CSS/SVG sobre la ventana, con el avatar del niño en primer plano. Sin imágenes externas.
5. **Narración (`mvp/narracion.js`):** texto corto de 3–4 frases que incluye al niño por su rol (por ejemplo «tú eres la guardiana del castillo»). Se lee con la voz del navegador (respaldo).
6. **Integración:** `mvp/index.html` usa estas capas. Mantén los paisajes y el puzle que ya funcionan.

## Reglas de seguridad y privacidad (no negociables)
- Sin datos reales: nada de nombres reales de niños, fotos ni datos clínicos. El apodo, si existe, vive solo en memoria de la sesión.
- Sin contenido violento, de terror intenso o que haga sentir culpa al niño.
- No guardes audio ni peticiones fuera de la sesión.
- Nada se envía a servicios externos sin aprobación de Jamin. Si una función necesita un servicio externo, pregunta antes.

## Pruebas (obligatorias)
- Crea `evals/peticiones.json` con 10 peticiones: 5 válidas (castillo, espacio, selva, ciudad de superhéroes originales, playa), 3 con personajes de marca (deben dar alternativa), 2 fuera de catálogo (deben dar alternativa).
- Crea `mvp/escenario.test.mjs` y `mvp/narracion.test.mjs` con `node:test`.
- Todo debe pasar con `node --test mvp/*.test.mjs`. No des nada por hecho sin ejecutarlo.
- Comprueba `mvp/index.html`: que no hay ids que falten y que los módulos importan bien (`node --check`).

## Cómo te comunicas (sin WhatsApp)
Tú no escribes a nadie fuera de esta carpeta. Comunícate así:
- `ESTADO.md`: al terminar cada bloque, escribe qué hiciste, qué pasa en las pruebas y qué falta. Usa frases cortas.
- `PREGUNTAS.md`: cada duda que bloquee el trabajo, con la opción que recomiendas. El bot (Ventana Peque) lo lee y lo pregunta al equipo.
- No decidas por el equipo temas de marca, licencias, datos de niños o envíos. Anótalos en `PREGUNTAS.md` y sigue con lo demás.

## Orden de trabajo
1. Catálogo y reglas de escenario con pruebas.
2. Alternativas seguras y casos de las 10 peticiones.
3. Composición visual en capas.
4. Narración y conexión con `index.html`.
5. Actualizar `ESTADO.md`.

## Qué NO hacer
- No instales dependencias ni plugins sin aprobación.
- No hagas `git push`, ni despliegues, ni publiques nada.
- No cambies la especificación sin anotarlo en `PREGUNTAS.md`.
