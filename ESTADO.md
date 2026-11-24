# Estado · Ventana Mágica

Última actualización: 24 nov 2026 (tarde-noche)

## Cómo comprobarlo (para OpenBot y el equipo)
- Pruebas: `timeout 240 npm test` (72 pruebas). Las de `mvp/` son del prototipo antiguo y ya no reflejan la app.
- Arrancar: `npm start` → `http://localhost:8080`. Panel: `/panel` con la clave de `datos/ACCESOS-DEMO.md` (no va a git).

## Demo en vivo
- https://ventana-magica.onrender.com · códigos 123456 (tablet), 111111 (familia), 222222 (adulto). Plan gratuito: la primera visita tras 15 min sin uso tarda ~1 min en despertar. Se borra sola cada 6 h. Sin voz (en la nube solo texto y lugares). Clave del panel: en `datos/ACCESOS-DEMO.md`.
- Código: https://github.com/Agentikai-es/ventana-magica

## Documentos
- Presentación profesional (12 diapositivas, con notas del orador): https://claude.ai/artifact/7wZSB4TxUtFVAeTJRsyiRj
- Pitch del Demo Day (guion, demo, jurado, reparto, logo): https://claude.ai/artifact/8jVo9bs4iWxyXvvLgbq2iD
- Proyecto en 4 líneas: https://claude.ai/artifact/AjN71XyQzk2bsSkKDcsJaT
- Los tres son privados hasta que Jamin los comparta.

## Hecho y probado
- **Mi mundo:** voz y texto, lugares del mundo (París, Egipto, Polo Norte…), cielo (noche, lluvia, nieve, fiesta), sonido sintetizado, héroes originales («Iron Man» → Capitán Armadura Roja).
- **Buzón:** cada foto o vídeo llega como puzle (2×2 o 3×3) + acertijo «¿quién te la envía y desde dónde?».
- **Mi gente:** chat con texto, audio, postal-acertijo («¿Dónde está Leo hoy?») y foto-puzle con mensaje secreto.
- **Amigos de la planta:** los niños de la misma caja se ven (alias, avatar y dónde está hoy cada uno), se mandan ánimos, postales-acertijo y foto-puzles, y se van de visita al mundo del otro. Demo: Sara (444444, su adulto 555555) y Nico.
- **Mundo sin límites:** 30 lugares (Gran Muralla, Nueva York, Zaragoza, safari…) × hora × clima × personajes × avatar = miles de escenarios; botón «Ideas» si el niño no sabe qué pedir.
- **Todo pasa por el adulto de confianza**, en los dos sentidos.
- **Cuatro reglas del hospital:** sin internet (caja con wifi propia, cartas programadas, la app abre sin conexión), desinfectable (botón de limpieza), sesiones cortas, sin datos reales.
- **Ligera:** la web se sirve comprimida (≈48 KB en total) con caché y ETag; la voz es un solo ejecutable de 7,5 MB (antes 146 MB de código fuente); `npm run paquete` crea el paquete mínimo para la caja.
- Pruebas: 72 de 72 en verde.

## Ciclo automático (hasta el 26 nov, 09:30)
- Backlog en `BACKLOG.md`; una mejora por vuelta, solo se sube con las pruebas en verde.
- 24 nov: recorrido de la demo con códigos fijos comprobado en tablet y móvil, sin fallos.
- 24 nov: la caché de la tablet cambia de versión sola con cada cambio de la web.
- 24 nov: avisos claros si falta la voz o ffmpeg; la voz nunca deja a la tablet esperando más de 25 s.
- 24 nov: `npm run comprobar`, chequeo de 11 puntos antes de la demo (hoy: todo listo).
- 24 nov: foco y anuncios accesibles en el juego y el chat.
- 24 nov: demo pública en Render (https://ventana-magica.onrender.com), se borra sola cada 6 h.
- 24 nov: la familia ve cuánto dura su vídeo y un aviso si pasa de 20 s.

## Falta
- Instalar en una Raspberry Pi real (`bash scripts/instalar-raspberry.sh`) y probar su wifi propia.
- Probar con una tablet y dos móviles reales; ensayar el pitch dos veces; grabar el vídeo de respaldo.
