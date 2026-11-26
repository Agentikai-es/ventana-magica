# Ventana Mágica · Especificación (v3, en depuración, 24 nov 2026)

> Sustituye a la v1 (paisajes, puzle de dibujos y cuento) y a la v2 (escenarios a medida).
> Desarrollo en pausa hasta cerrar esta especificación con Jamin.

## Fin del proyecto
Que un niño hospitalizado (6–12 años) no se quede fuera de su vida: que siga viendo el día a día de su familia y de su clase, que participe en él y que se sienta integrado, no aislado.

Pensado para hospitales reales: robusto, escalable y conforme al RGPD.

## Las cuatro reglas del hospital (condiciones del reto)
1. **Sin internet en la planta, familia desde casa por un VPS (revisado 25 nov con los mentores).** La tablet del niño no necesita internet propio: guarda la app y sigue funcionando sin conexión. Para que la familia y la clase manden fotos, vídeos o GIF **en tiempo real desde casa**, el servidor vive en un **VPS Linux con Apache (HTTPS, Let's Encrypt)** delante de Node. La misma app puede correr en una caja (Raspberry Pi) con su propia wifi cuando el hospital no permita salir a internet; entonces la familia deja cartas programadas en cada visita. La voz se transcribe dentro del servidor, nunca en servicios externos.
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
- (26 nov) El niño es el protagonista de su postal: antes de mandarla elige qué hace su personaje (saluda, salta, corazón, foto) y dónde sale (izquierda, centro o derecha). Quien la recibe lo ve grande y con su alias.

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

**P6 · Estrellas, flores y Jardín de los recuerdos (25 nov, acordado con Jamin para la demo del 26).** Recompensa colaborativa, no competitiva.
- Estrellas: resolver una carta de la familia o la clase (puzle + acertijo) = 1 ★; resolver una postal-acertijo o una foto-puzle de un amigo de la planta = 2 ★. Una sola vez por carta.
- Regalo: al resolver lo de otro niño, puede mandarle 2 ★ de reconocimiento («¡Me gustó tu postal!»). Una vez por mensaje; no le cuesta nada a quien regala. Llega al momento (frase fija, como los ánimos).
- Flor: con 10 ★ el niño elige flor (rosa de 5 colores, girasol, lirio, tulipán, margarita, amapola) y color, y la planta con animación de crecimiento.
- Jardín de los recuerdos: uno por caja (la planta). Muestra lo conseguido entre todos (flores y regalos), metas comunes (mariposas, fuente, arcoíris, árbol de los deseos, luciérnagas) y quién lo cuida por orden alfabético con flores aportadas y regalos dados. Sin puestos ni «el mejor». Punto verde «en línea» = ventana abierta ahora, solo dentro de la caja.
- Alias solo de quien tiene la comunidad activada. Al alta las estrellas se borran; la flor se queda en el jardín sin nombre («un recuerdo de un niño que ya está en casa»).
- Criterio: `node --test` cubre ganar, no repetir, plantar, regalar y alta; pantalla probada a 390×844 y 844×390 con objetivos táctiles ≥ 44 px.

**P5 (ampliado 25 nov):** 37 lugares (nuevos: Ordesa, Canarias, Alhambra, Barcelona, arrecife, cueva de cristales, islas de las tortugas); vida de fondo en la escena (nubes, pájaros, gaviotas, peces, luciérnagas, estrellas fugaces, destellos) y sonidos nuevos (río, guitarra, gotas de cueva, burbujeo, gaviotas, grillos de noche). Ideas que cambian cada vez: con la IA local, temas al azar (nunca texto del niño) → escenarios del catálogo; sin IA, reglas con lugares no visitados.

**Fase 2 (solo en el diagrama, no se programa para la demo):** ver `docs/diagrama-funcionamiento.pdf`, página 4.
- Jardines de otros hospitales: federación opcional entre cajas a través del proxy que el hospital ya usa para «Enviar»; solo viajan recuentos anónimos (flores, regalos, metas), firmados, una vez al día. Cada hospital decide (DPO + EIPD). «En línea» sigue siendo solo de la propia caja.
- Tras el alta: el tutor decide; código de alta; el niño entra con su alias por el proxy del hospital y solo escribe a amigos que hizo en la planta, con aprobación de los dos tutores; caduca y se revoca con un botón. Los datos siguen en la caja del hospital.

**Ideas para después de la demo:** reto del día compartido con la clase, «Hoy en mi clase» del profesor, cuenta atrás de visitas y cumpleaños, postales con audio corto del familiar.

## Qué NO hace
- Cuentos ni radio (quitados el 24 nov).
- Cuentas complejas, pagos, app nativa, integración con el hospital, historia clínica.
- Datos reales en la demo: todo ficticio.
- IA generativa en la nube o con datos del niño: la IA corre dentro de la caja y no guarda nada.
- Publicar, enviar o contactar a nadie sin OK de Jamin.

## Arquitectura (coste de software: 0 €; VPS ~5 €/mes)
Web app (PWA instalable) servida por un único servidor Node. Sin servicios de terceros ni suscripciones: el VPS es una máquina Linux alquilada, no una plataforma.

**Dos formas de montarlo, mismo código:**
- **VPS (por defecto desde el 25 nov):** Linux (Ubuntu/Debian) + Apache como proxy inverso con HTTPS de Let's Encrypt → Node en 127.0.0.1:8080 → SQLite + carpeta de fotos en el disco del VPS. Familia, clase, adulto y tablet entran por `https://dominio` desde cualquier sitio; los avisos llegan en tiempo real (SSE a través de Apache). Instalación: `scripts/instalar-vps.sh`, configuración en `deploy/apache-ventana.conf`. VPS en la UE (RGPD).
- **Caja en la planta (sin internet):** Raspberry Pi con wifi propia y HTTPS con autoridad local (`scripts/instalar-raspberry.sh`). Para hospitales que no dejan salir a internet.
- **Fase 2 · caja + VPS buzón:** la caja guarda todo y solo recoge del VPS (conexión de salida) lo que manda la familia; en el VPS nada se queda más que hasta entregarse.

1. **Web app** con tres vistas: Ventana (tablet del niño), Enviar (móvil del aportador, con enlace), Aprobar (móvil del adulto).
2. **Servidor Node.js sin dependencias externas**: SQLite integrado en Node (un archivo), fotos en una carpeta, invitaciones con token, tiempo real con Server-Sent Events y borrado programado.
3. **Voz local**: whisper.cpp + ffmpeg en el mismo servidor. El audio se borra nada más transcribirlo. La API de voz de Chrome no se usa (manda el audio a Google). Plan B: texto y botones.

- Interpretación: reglas y catálogo (`mvp/catalogo.js`, `mvp/escenario.js`, ya probados).
- Fotos: se reducen y se les quitan los metadatos en el navegador antes de enviarlas; el servidor comprueba el formato.
- Vídeo (≤ 20 s) o GIF animado: el servidor lo pasa a MP4 sin metadatos con ffmpeg; **su último fotograma es la foto del puzle** («el vídeo termina en foto»). El niño ve el vídeo al resolver el acertijo.
- Datos: espacios, invitaciones, aportes, reacciones, retos, auditoría.
- HTTPS (el micrófono lo exige): en el VPS, Let's Encrypt vía Apache (sin instalar nada en los móviles); en la caja, autoridad local.
- Dónde corre: en la demo, un VPS con datos ficticios (o el Mac en la wifi del recinto). En un hospital, un VPS en la UE contratado por el hospital, su máquina virtual, o una caja en la planta.
- Familias desde casa: por el VPS. Si el hospital usa la caja sin internet, su informática puede publicar solo «Enviar» por su proxy.
- Copia de seguridad: un archivo SQLite y una carpeta.

## RGPD
- Que un niño esté ingresado ya es un dato de salud (art. 9). Mínimos datos, alias, nada clínico.
- El hospital es el responsable del tratamiento; nosotros, el encargado (art. 28). Con VPS: proveedor en la UE con contrato de encargado (subencargado), disco cifrado, HTTPS obligatorio, solo Apache expuesto (Node escucha en 127.0.0.1) y los mismos borrados (30 días o alta). Con caja: los datos no salen del hospital.
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
