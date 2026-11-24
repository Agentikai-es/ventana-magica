# Backlog de mejoras automáticas · hasta el congelado (26 nov, 10:00)

Reglas del ciclo automático:
- Una mejora por vuelta, pequeña. Si no cabe en una vuelta, se parte.
- Solo se sube a GitHub si `npm test` pasa entero. Si algo falla y no se arregla en la vuelta, se deshace.
- Nada de dependencias nuevas, nada de internet en la app, nada de datos reales.
- No se toca el modo demo (códigos 123456/111111/222222/333333) ni se cambia la mecánica del pitch.
- A partir del 26 nov a las 09:30 no se cambia nada más.
- Marca cada punto hecho con [x] y una línea de qué se hizo.

## Prioridad 1 · que la demo no falle
- [x] Comprobar en el navegador (tablet 1180×820 y móvil 390×844) el recorrido completo de la demo con los códigos fijos y arreglar lo que se vea roto.
  Hecho 24 nov: 123456/111111/222222 entran en su pantalla; foto con pistas → aprobación → carta en la ventana; tablet, aprobar y enviar se ven bien y sin errores de consola. Nada roto.
- [x] Que la caché del service worker cambie de versión sola cuando cambian los archivos (que nadie vea una versión vieja el día de la demo).
  Hecho 24 nov: el servidor calcula una huella de todos los archivos de `web/` al arrancar y la pone como versión de `sw.js`; con cualquier cambio, la tablet descarta la caché vieja. Con prueba.
- [x] Mensajes de error claros si el servidor no tiene voz (falta el modelo) o ffmpeg; que la tablet ofrezca texto y lugares sin quedarse esperando.
  Hecho 24 nov: el servidor detecta si falta ffmpeg (aviso al arrancar y error claro «sin_ffmpeg» al subir); sin voz, la tablet muestra «Sin voz» y propone escribir o tocar un lugar; la petición de voz corta a los 25 s y abre «Lugares».
- [x] `scripts/comprobar.sh`: chequeo rápido antes de la demo (servidor responde, voz lista, certificado vale para la IP actual, códigos demo activos).
  Hecho 24 nov: `npm run comprobar` revisa servidor, ffmpeg, whisper, modelo, certificado (IP actual y caducidad), HTTPS y los 4 códigos fijos; hoy sale «Todo listo para la demo».

## Prioridad 2 · calidad que se nota
- [x] Accesibilidad: repasar foco y anuncios en el juego (puzle → acertijo → descubierta) y en el chat con teclado.
  Hecho 24 nov: cada paso del juego lleva el foco a su título (comprobado en el navegador); las conversaciones son un registro que el lector anuncia; tras enviar, el foco vuelve a la caja de texto.
- [ ] Pantalla de la familia: vista previa del vídeo con su duración y aviso si pasa de 20 s.
- [ ] Panel: botón «Copiar códigos de la demo» y aviso visible cuando el servidor está en modo demo.
- [ ] Pruebas para `web/puzle.js` (mezcla nunca resuelta) y `web/lib/escena.js` (capas de cielo y clima).

## Prioridad 3 · ligereza y orden
- [ ] Revisar tamaño de `web/` y quitar código muerto (rutas o estilos que ya no se usan, p. ej. `/api/ventana/postal` antigua si nada la usa).
- [ ] README: sección corta «Demo en 5 minutos» con los códigos fijos y capturas en texto.
