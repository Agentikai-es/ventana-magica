# Datos que guarda la Ventana Mágica (RGPD)

Todo se guarda en el servidor del hospital: `datos/ventana.db` (SQLite) y `datos/fotos/`. Nada sale de esa máquina.

| Dato | Clase | Para qué | Dónde | Cuánto tiempo |
|---|---|---|---|---|
| Alias del niño (no el nombre) | Personal; asociado a un ingreso = **salud (art. 9)** | Saludo en la ventana | `espacios.alias` | Hasta el alta (máx. 90 días) |
| Avatar y escenario elegido | No personal (catálogo cerrado) | Su rincón | `espacios.avatar`, `espacios.escena` | Hasta el alta |
| Fotos de familia y clase | Personal; pueden salir terceros | Mantener al niño conectado | `datos/fotos/` (sin metadatos ni GPS) | 30 días o el alta; rechazadas, 1 día |
| Texto corto de la foto (≤ 80) | Personal | Contexto de la foto | `aportes.texto` | Igual que la foto |
| Etiqueta del aportador («Familia», «Abuela») | Personal mínimo | Saber de quién es | `accesos.etiqueta` | Hasta el alta |
| Reacción del niño (emoji) | No sensible | Ida y vuelta | `aportes.reaccion` | Igual que la foto |
| Voz del niño | Personal; biométrica si se reutiliza | Entender la petición | **No se guarda**: archivo temporal que se borra al transcribir | Segundos |
| Texto transcrito | Personal | Elegir escenario | No se guarda en el servidor | — |
| Tokens y códigos | Seguridad | Acceso sin cuentas | Solo el **hash** SHA-256 | Caducan (códigos 30 min) |
| Estrellas (cantidad, motivo, fecha) | No sensible; ligado al alias | Recompensa del juego | `estrellas` | Hasta el alta (se borran con el espacio) |
| Flores del jardín (tipo, color, sitio) | No personal tras el alta | Jardín de los recuerdos de la planta | `flores` | Al alta pierden el vínculo con el niño (`espacio_id` = NULL) y quedan anónimas |
| Regalos entre niños (quién a quién) | Personal mínimo (alias) | Reconocimiento y contador «regalos dados» | `estrellas` (motivo `regalo`, `de_espacio`) | Hasta el alta de cualquiera de los dos |
| «En línea» | No se guarda | Punto verde en el jardín | Solo en memoria (canal de tiempo real abierto) | — |
| Auditoría (quién aprobó qué, cuándo) | Registro de seguridad | Responsabilidad (art. 5.2 y 32) | `auditoria` | 1 año |

## Lo que NO se recoge
Nombre real, fecha de nacimiento, diagnóstico, habitación, fotos del niño, ubicación, analítica, cookies de rastreo, direcciones IP en disco.

## Derechos
- **Supresión:** el tutor tiene el botón «Borrar todas las fotos»; el hospital, «Dar de alta y borrar todo». Hay limpieza automática cada hora.
- **Acceso y portabilidad:** pendiente (exportación ZIP para el tutor). Por ahora, a petición, desde el panel.

## Seguridad (art. 32)
HTTPS local; cookies `HttpOnly` y `SameSite=Strict`; cabecera anti-CSRF; CSP estricta; permisos por espacio y por rol; límites de intentos; las fotos se re-codifican con ffmpeg para quitar metadatos; los archivos se sirven solo a quien tiene permiso.

## Antes de un piloto real
EIPD (evaluación de impacto), registro de actividades, contrato de encargado del tratamiento (art. 28) con el hospital, texto de consentimiento para tutores y para el cole, y revisión del delegado de protección de datos del hospital.
