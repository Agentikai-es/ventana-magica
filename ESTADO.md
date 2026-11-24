# Estado · Ventana Mágica

Última actualización: 24 nov 2026 (tarde-noche)

## Cómo comprobarlo (para OpenBot y el equipo)
- Pruebas: `timeout 240 npm test` (61 pruebas). Las de `mvp/` son del prototipo antiguo y ya no reflejan la app.
- Arrancar: `npm start` → `http://localhost:8080`. Panel: `/panel` con la clave de `datos/ACCESOS-DEMO.md` (no va a git).

## Documentos
- Presentación profesional (12 diapositivas, con notas del orador): https://claude.ai/artifact/7wZSB4TxUtFVAeTJRsyiRj
- Pitch del Demo Day (guion, demo, jurado, reparto, logo): https://claude.ai/artifact/8jVo9bs4iWxyXvvLgbq2iD
- Proyecto en 4 líneas: https://claude.ai/artifact/AjN71XyQzk2bsSkKDcsJaT
- Los tres son privados hasta que Jamin los comparta.

## Hecho y probado
- **Mi mundo:** voz y texto, lugares del mundo (París, Egipto, Polo Norte…), cielo (noche, lluvia, nieve, fiesta), sonido sintetizado, héroes originales («Iron Man» → Capitán Armadura Roja).
- **Buzón:** cada foto o vídeo llega como puzle (2×2 o 3×3) + acertijo «¿quién te la envía y desde dónde?».
- **Mi gente:** chat con texto, audio, postal-acertijo («¿Dónde está Leo hoy?») y foto-puzle con mensaje secreto.
- **Todo pasa por el adulto de confianza**, en los dos sentidos.
- **Cuatro reglas del hospital:** sin internet (caja con wifi propia, cartas programadas, la app abre sin conexión), desinfectable (botón de limpieza), sesiones cortas, sin datos reales.
- **Ligera:** la web se sirve comprimida (≈48 KB en total) con caché y ETag; la voz es un solo ejecutable de 7,5 MB (antes 146 MB de código fuente); `npm run paquete` crea el paquete mínimo para la caja.
- Pruebas: 63 de 63 en verde.

## Ciclo automático (hasta el 26 nov, 09:30)
- Backlog en `BACKLOG.md`; una mejora por vuelta, solo se sube con las pruebas en verde.
- 24 nov: recorrido de la demo con códigos fijos comprobado en tablet y móvil, sin fallos.
- 24 nov: la caché de la tablet cambia de versión sola con cada cambio de la web.

## Falta
- Instalar en una Raspberry Pi real (`bash scripts/instalar-raspberry.sh`) y probar su wifi propia.
- Probar con una tablet y dos móviles reales; ensayar el pitch dos veces; grabar el vídeo de respaldo.
