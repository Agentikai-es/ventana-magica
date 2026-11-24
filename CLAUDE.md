# CLAUDE.md · Reglas del harness de Ventana Peque

Lee SPEC.md antes de tocar código. Si una tarea contradice SPEC.md, para y pregunta.

## Reglas duras
- No envíes mensajes, no publiques, no hagas push a remotos ni despliegues sin aprobación explícita de Jamin.
- No contactes a jurado ni mentores.
- No uses datos reales de pacientes ni nombres reales de niños. Solo datos ficticios.
- No clones ni reproduzcas una voz sin permiso escrito de esa persona registrado en el repo.
- No envíes voces, fotos ni audios a servicios externos sin aprobación.
- No guardes audio ni fotos de menores más tiempo del necesario.
- No escribas secretos (claves, tokens) en el repo. Usa variables de entorno.

## Cómo trabajar
- Un cambio por vez, pequeño y verificable. Prueba antes de dar algo por hecho.
- Antes de cerrar una tarea: `npm test` debe pasar.
- Sin dependencias de npm. Tecnología local y gratuita: Node + SQLite integrado + ffmpeg + whisper.cpp. Nada en la nube.
- Si algo falla, di qué falló y qué no pudiste comprobar.
- Mantén el alcance: si una idea no está en SPEC.md, va a la lista de «después del MVP».

## Estructura
- `SPEC.md` · qué hace y qué no hace.
- `TAREAS.md` · reparto por persona.
- `servidor/` · servidor local (HTTP/HTTPS, SQLite, voz) y sus pruebas.
- `web/` · pantallas de la web app; `web/lib/` · catálogo, intérprete, escena, narración.
- `docs/datos.md` · clasificación de datos (RGPD).
- `evals/peticiones.json` · 10 peticiones de prueba.
- `mvp/` · prototipo antiguo (v1/v2), solo de referencia.
- `vendor/` · guías y agentes de apoyo (agency-agents, agent-skills, ponytail, ui-ux-pro-max). No se sirven en la app.
