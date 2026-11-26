# Reparto de tareas · Ventana Peque

Equipo (de la captura): **Agentikai-es** (Dev / Tech) · **ChicaLobby** (Product & Pitch) · **David** (Product & Pitch).
Jamin: confirmar cuál de los tres es él y en qué rol queda. Hasta entonces, el reparto es por rol.

## Dev / Tech · Agentikai-es
Día 2 (25 nov)
- [ ] Ventana Mágica: reconocimiento de voz y cambio de paisaje (`mvp/`). Prioridad 1.
- [ ] Puzle: subida de aporte y aparición de la pieza tras aprobación.
- [ ] Cuento pregrabado: reproducción nocturna en la ventana.
- [ ] Despliegue en Render con URL pública (antes de cerrar el día).

Día 3 (26 nov)
- [ ] Congelar el código a mediodía; solo arreglos.
- [ ] Probar en la wifi del recinto y tener el vídeo de respaldo abierto.

Recompensas (25 nov, hecho en local, sin commit)
- [x] Estrellas (1 familia, 2 amigo), regalo de 2 ★, flor a elegir con animación, Jardín de los recuerdos local con metas comunes. `servidor/recompensas.mjs`, `web/jardin.js`, `web/flores.js`.
- [x] Más lugares (37), vida de fondo y sonidos nuevos en la escena, ideas variables con la IA local.
- [x] Diagrama de funcionamiento: `docs/diagrama-funcionamiento.pdf` (fuente `.html`, se regenera con `bash scripts/diagrama-pdf.sh`).
- [ ] Probar las ideas con IA en la Pi real (en el Mac solo está el modelo de 0,5B, que no se usa).
- [ ] Fase 2 (federación entre hospitales y acceso tras el alta): solo diseño, ver SPEC.md.

Cierre para la demo (26 nov, en local, sin commit)
- [x] Carta de la Abuela ya aprobada en la demo: «Toby en el parque» (dibujo propio) con puzle fácil (4 piezas fuera de sitio).
- [x] El niño, protagonista de su postal: elige pose y sitio, y su personaje sale grande y con su nombre en la postal.
- [x] `npm run demo:limpia` (datos en `datos-demo/`). Prueba de punta a punta en 390×844 y 844×390, con objetivos de 44 px.
- [x] Subido a GitHub/Render y a Oracle (OK de Jamin).
- [x] Personalizar la ventana (personajes, cosas, arrastrar, cielo), 61 lugares, iconos propios, etiquetas al tocar y profundidad. Congelar el código a las 16:00.

VPS + Apache (25 nov, indicación de los mentores; hecho en local, sin desplegar)
- [x] Vídeo o GIF de la familia: se pasa a MP4 sin metadatos y su último fotograma es el puzle.
- [x] Montaje en VPS: `scripts/instalar-vps.sh` (Node 22, ffmpeg, Apache, Let's Encrypt, systemd) y `deploy/apache-ventana.conf`. Probado con Apache en el Mac: subida, aviso en tiempo real y aprobación a través del proxy.
- [x] Guía para explicarlo: `docs/arquitectura.md`.
- [ ] Jamin: contratar el VPS (UE) y el dominio con su cuenta, y dar el OK para desplegar.
- [ ] Fase 2: caja en la planta + VPS solo como buzón (solo diseño).

## Product & Pitch · ChicaLobby
Día 2
- [ ] Guion de la demo en 3 minutos (orden: voz → paisaje; aporte → pieza; cuento).
- [ ] Los 10 casos de `evals/casos.json`: frases reales de niños y adultos, y resultado esperado.
- [ ] Textos de la ventana en español de España, revisados.

Día 3
- [ ] Deck: problema → solución → demo en vivo → impacto → evals → siguientes pasos.
- [ ] Ensayar el pitch 2 veces, cronometrado.

- [ ] Guion: añadir 30 s de recompensas (Leo resuelve la postal de Sara → +2 ★ → planta su flor → le regala 2 ★). Leo empieza la demo con 8 ★.

## Product & Pitch · David
Día 2
- [ ] Cuento de la noche: guion base con personajes y lugares ficticios (sin datos reales).
- [ ] Modelo de permiso por escrito para voces y aportes (texto que firman las familias).
- [ ] Revisar el listado de lugares de SPEC.md y añadir sinónimos.

Día 3
- [ ] Vídeo de respaldo de 60 s con la demo grabada.
- [ ] Respuestas preparadas para preguntas del jurado sobre privacidad y consentimiento.

## Jamin (aprobaciones y datos)
- [ ] Aprobar SPEC.md y el reparto.
- [ ] Dar el OK explícito antes de cualquier envío, publicación o contacto.
- [ ] Pasar los datos que faltan: reto oficial, criterios del jurado, horario confirmado, roles.
