# Ventana Mágica · Especificación (v3, en depuración, 24 nov 2026)

> Sustituye a la v1 (paisajes, puzle de dibujos y cuento) y a la v2 (escenarios a medida).
> Desarrollo en pausa hasta cerrar esta especificación con Jamin.

## Fin del proyecto
Que un niño hospitalizado (6–12 años) no se quede fuera de su vida: que siga viendo el día a día de su familia y de su clase, que participe en él y que se sienta integrado, no aislado.

Pensado para hospitales reales: robusto, escalable y conforme al RGPD.

## Las cuatro reglas del hospital (condiciones del reto)
1. **Sin internet.** Todo vive en una caja (Raspberry Pi) con su propia wifi. La familia deja cartas programadas en cada visita y llega una cada día. La tablet guarda la app y sigue funcionando sin conexión con la caja. La voz se transcribe dentro de la caja.
2. **Desinfectable.** Tablet táctil en funda lavable, sin auriculares ni accesorios compartidos. Botón «Limpiar pantalla» que bloquea el táctil 30 s.
3. **Sesiones cortas.** Cada carta: puzle + acertijo + respuesta en unos 2 minutos. Puzle 2×2 para días de cansancio.
4. **Sin datos reales.** Alias, nada clínico, demo con datos ficticios.

## Qué es
Un espacio en la tablet que el niño personaliza con su voz o con texto, y por el que le llega su vida de fuera.

**P1 · Mi mundo.** El niño pide su escenario («una playa con tortugas») y la ventana lo crea con él como protagonista (avatar de catálogo, nunca fotos suyas). Se queda guardado: es su rincón.
- Criterio: una petición del catálogo cambia la ventana en menos de 2 s.
- Si no encaja o da miedo, la ventana propone 3 alternativas seguras.
- Marcas registradas: nunca. Se usa su equivalente original.

**P2 · Mi gente.** La familia y la clase envían fotos de su día a día con un enlace de invitación (sin cuentas). Un adulto de confianza las aprueba y aparecen como postales. Cada foto aprobada es una pieza del puzle; al completarlo se descubre un mensaje de la clase.
- Criterio: nada aparece en la ventana sin aprobación humana.

**P3 · Ida y vuelta.** El niño reacciona a las postales (❤️ 😂 👏) y envía su escenario de vuelta como postal. Participa, no solo mira.

**P4 · Amigos de la planta (comunidad interna, 24 nov).** Los niños ingresados que usan la misma caja se conocen y se animan entre ellos, sin internet.
- Cada niño ve a los demás solo por alias, avatar y dónde está hoy su ventana («Sara está en París»). Nunca nombres, habitaciones ni nada clínico.
- Pueden mandarse: ánimos de una lista fija (llegan al momento), invitación «¡Ven a visitarme!» (llega al momento), texto, postal-acertijo («¿Dónde está Leo hoy?») y foto-puzle con mensaje secreto.
- Texto, postal y foto-puzle los aprueba antes el adulto de confianza de quien lo envía. Sin audio entre niños.
- «Ir de visita»: tu ventana se pone igual que la del amigo, con tu avatar. Así dos niños «están» juntos en el mismo sitio.
- Solo entra quien tiene la comunidad activada en el panel del hospital, con el consentimiento de los tutores. Se borra con el resto de datos.

**P5 · Mundo sin límites (24 nov).** El niño no elige entre dos o tres fondos: la ventana compone miles de escenarios (lugares del mundo × hora × clima × personajes × avatar), con sonido sintetizado.
- Si no sabe qué pedir, la ventana le sugiere lugares (y dónde están hoy sus amigos de la planta).
- IA local: voz con whisper.cpp; un modelo de texto pequeño dentro de la caja entiende frases libres y propone escenarios. Si no está, funcionan las reglas del catálogo.
- Imágenes y vídeo generados por IA en directo: no en una Raspberry Pi sin internet (tardaría minutos por imagen). La escena se compone con capas propias (SVG, emojis, animación).

**Ideas para después de la demo:** reto del día compartido con la clase, «Hoy en mi clase» del profesor, cuenta atrás de visitas y cumpleaños, postales con audio corto del familiar.

## Qué NO hace
- Cuentos ni radio (quitados el 24 nov).
- Cuentas complejas, pagos, app nativa, integración con el hospital, historia clínica.
- Datos reales en la demo: todo ficticio.
- IA generativa en la nube o con datos del niño: la IA corre dentro de la caja y no guarda nada.
- Publicar, enviar o contactar a nadie sin OK de Jamin.

## Arquitectura local (coste de software: 0 €)
Web app servida desde un servidor local. Sin nube ni suscripciones.

1. **Web app** con tres vistas: Ventana (tablet del niño), Enviar (móvil del aportador, con enlace), Aprobar (móvil del adulto).
2. **Servidor Node.js sin dependencias externas**: SQLite integrado en Node (un archivo), fotos en una carpeta, invitaciones con token, tiempo real con Server-Sent Events y borrado programado.
3. **Voz local**: whisper.cpp + ffmpeg en el mismo servidor. El audio se borra nada más transcribirlo. La API de voz de Chrome no se usa (manda el audio a Google). Plan B: texto y botones.

- Interpretación: reglas y catálogo (`mvp/catalogo.js`, `mvp/escenario.js`, ya probados).
- Fotos: se reducen y se les quitan los metadatos en el navegador antes de enviarlas; el servidor comprueba el formato.
- Datos: espacios, invitaciones, aportes, reacciones, retos, auditoría.
- HTTPS local con mkcert (el micrófono lo exige).
- Dónde corre: en la demo, el Mac en la wifi del recinto. En un hospital, un mini PC (200–400 €, una vez) o una máquina virtual suya.
- Familias desde casa: la informática del hospital publica solo «Enviar» por su proxy. En la demo, misma wifi.
- Copia de seguridad: un archivo SQLite y una carpeta.

## RGPD
- Que un niño esté ingresado ya es un dato de salud (art. 9). Mínimos datos, alias, nada clínico.
- El hospital es el responsable del tratamiento; nosotros, el encargado (art. 28). Los datos no salen del hospital.
- Menores de 14: consienten padres o tutores (art. 7 LOPDGDD), de forma expresa y por escrito.
- En las fotos de la clase salen otros niños: el cole sube solo con su propio permiso, la guía pide fotos sin caras y todo pasa por aprobación.
- Se quitan los metadatos y el GPS de las fotos. Sin reconocimiento facial, sin analítica ni rastreo.
- Las fotos se borran a los 30 días o al alta. El tutor tiene un botón de «borrar todo».
- Permisos por espacio en el servidor, invitaciones que caducan y se pueden revocar, enlaces firmados cortos y registro de aprobaciones.
- Antes de un piloto real: EIPD, registro de actividades y revisión del delegado de protección de datos del hospital.

## Demo (3 min, niño ficticio «Leo»)
1. Leo dice «quiero una playa con tortugas» y la ventana cambia.
2. Su madre envía una foto del perro. El adulto la aprueba en el móvil y aparece en tiempo real como postal y pieza del puzle.
3. Leo reacciona y envía su playa de vuelta.

## Decisiones abiertas (ver PREGUNTAS.md)
- Instalar whisper.cpp y mkcert en el Mac (gratis, con Homebrew).
- Quién aprueba: tutor legal, personal del hospital o los dos.
- Plazo de borrado: 30 días o al alta.
