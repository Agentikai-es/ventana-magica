# Cómo está montada Ventana Mágica (para explicarlo en 1 minuto)

## La frase
> «Es una **PWA** —una web que se instala en el móvil como una app—. La sirve **un solo servidor Node.js** con **SQLite**, en un **VPS Linux detrás de Apache** con HTTPS. La familia manda una foto, un vídeo o un GIF desde casa, un adulto la aprueba y al niño le llega **en tiempo real** como puzle. Sin librerías externas, sin servicios de terceros, y la voz y la IA corren dentro del servidor.»

## El dibujo

```
 Móvil de la abuela (casa)          Móvil de mamá (aprueba)          Tablet de Leo (hospital)
   «Enviar»: foto/vídeo/GIF           «Aprobar»                        «Ventana»: escena, puzle, jardín
            │                                │                                   ▲
            └──────────── HTTPS (candado, Let's Encrypt) ───────────────────────┘
                                         │
                         ┌───────────────▼────────────────┐   VPS Linux (Ubuntu), en la UE
                         │ Apache  · proxy inverso         │   · solo abre 80/443
                         │   HTTPS, dominio, IP real       │
                         ├───────────────┬────────────────┤
                         │ Node.js 22 (127.0.0.1:8080)     │   · un solo proceso, 0 dependencias npm
                         │  · API + páginas + tiempo real  │
                         │  · ffmpeg: limpia fotos/vídeos  │
                         │  · whisper.cpp: voz → texto     │
                         │  · IA local opcional (llama.cpp)│
                         ├───────────────┴────────────────┤
                         │ SQLite (un archivo) + carpeta   │   · se borra a los 30 días o al alta
                         │ de fotos                        │
                         └─────────────────────────────────┘
```

## Cada pieza y por qué

| Pieza | Qué hace | Por qué esta y no otra |
|---|---|---|
| **PWA** (HTML + CSS + JavaScript, sin framework) | Las 4 pantallas: Ventana (niño), Enviar (familia), Aprobar (adulto), Panel (hospital). Se instala con «Añadir a pantalla de inicio» y funciona sin conexión (`manifest.webmanifest` + `sw.js`). | No hay que pasar por App Store ni Google Play, y funciona en cualquier móvil o tablet. |
| **Linux** (Ubuntu en el VPS; Raspberry Pi OS en la caja) | El sistema operativo del servidor. | Es el estándar en servidores: gratis y estable. |
| **Apache** | La puerta de entrada: pone el **HTTPS** (certificado gratuito de Let's Encrypt), el dominio y la IP real, y pasa todo a Node. | El micrófono del móvil exige HTTPS, y con Let's Encrypt no hay que instalar nada en los móviles. Node no se expone a internet. |
| **Node.js 22** | El servidor: API, páginas, invitaciones, aprobaciones, recompensas y **tiempo real**. | Un solo lenguaje (JavaScript) en el móvil y en el servidor. Sin dependencias de npm: menos fallos y menos riesgos de seguridad. |
| **SQLite** (integrado en Node) | La base de datos: espacios, invitaciones, aportes, estrellas, flores, auditoría. | Un solo archivo: la copia de seguridad es copiar un archivo. Cumple el papel de la «M» (MySQL) de LAMP sin montar un servidor de base de datos. |
| **Server-Sent Events (SSE)** | El aviso instantáneo: «hay una foto para aprobar» o «te ha llegado una carta». | Es más sencillo que WebSockets y pasa sin problema por Apache. |
| **ffmpeg** | Quita GPS y metadatos de fotos, audio y vídeo. Convierte vídeo y GIF a MP4 y saca **el último fotograma como foto del puzle**. | Es software libre y funciona igual en el VPS y en una Raspberry Pi. |
| **whisper.cpp** y **Piper** | Voz → texto («quiero una playa con tortugas») y texto → voz que lee al niño. | Corren dentro del servidor: la voz del niño nunca va a Google ni a OpenAI. |
| **llama.cpp** (opcional) | Ideas de lugares que cambian cada vez. | Es local. Si no está, se usan reglas. |

**«¿Por qué no LAMP con PHP?»**
- Es la misma idea: Linux + Apache + base de datos + lenguaje de servidor.
- Cambiamos PHP por Node porque el tiempo real (SSE) es natural en Node.
- Cambiamos MySQL por SQLite porque es un solo archivo y no hay nada más que administrar.
- Apache y Linux están igual que en LAMP.

## Recorrido de una foto, un vídeo o un GIF
1. **La abuela** abre su enlace en el móvil y elige una foto, un vídeo de hasta 20 s o un GIF. Escribe dos pistas («Te llevo al cole») y dice desde dónde lo manda.
2. **El móvil** reduce la foto y le quita los metadatos. El vídeo y el GIF viajan tal cual por HTTPS.
3. **El servidor** lo limpia con ffmpeg: sin GPS, en MP4, y el **último fotograma** se guarda como foto del puzle. Queda **pendiente**.
4. **Mamá** recibe el aviso al instante (SSE) en «Aprobar» y lo aprueba o lo rechaza. **Nada llega al niño sin aprobación humana.**
5. **Leo** recibe el aviso al instante: le ha llegado una carta. Monta el puzle, adivina quién se la manda y desde dónde, ve el vídeo y gana ★.
6. **Leo contesta** con una postal, un audio o una foto-puzle. Vuelve por el mismo camino: Mamá la aprueba y la abuela la ve.

## Seguridad y RGPD (lo que preguntan)
- Sin cuentas ni contraseñas. Cada persona tiene un **enlace o código de invitación** que caduca y se puede revocar.
- **Siempre aprueba un adulto.** Todo queda en el registro de auditoría.
- Alias, nunca nombres reales. No se guarda nada clínico.
- Fotos, vídeos y audios **sin metadatos**. Se borran a los 30 días o al alta, y el tutor puede borrarlo todo.
- En el VPS:
  - Proveedor de la UE.
  - HTTPS obligatorio.
  - Node solo escucha en 127.0.0.1: desde fuera solo se ve Apache.
  - El disco va cifrado.
- La voz, la IA y el procesado de fotos se hacen dentro del servidor: nada se manda a servicios externos.
- Si el hospital no deja salir a internet, **el mismo código** corre en una caja Raspberry Pi con wifi propia dentro de la planta.

## Montarlo
**En el VPS** (Ubuntu 24.04, con un dominio apuntando a su IP):
```bash
git clone <repo> ventana && cd ventana
DOMINIO=ventana.tudominio.com CORREO=tu@correo bash scripts/instalar-vps.sh
```
El script instala Node 22, ffmpeg, Apache y certbot. También deja Node como servicio que arranca solo, configura Apache (`deploy/apache-ventana.conf`) y pide el certificado HTTPS. Para la voz local, después: `npm run voz`.

**Operación diaria:**
```bash
sudo systemctl restart ventana-magica     # reiniciar
journalctl -u ventana-magica -f           # ver qué pasa
git pull && sudo systemctl restart ventana-magica   # actualizar
```

**En local** (Mac, para desarrollar): `npm run demo` → http://localhost:8080.

## Qué viene después (fase 2)
- **La caja guarda y el VPS solo hace de buzón.** Los datos del niño se quedan en el hospital. El VPS solo guarda lo que manda la familia hasta que la caja lo recoge, con una conexión de salida, sin abrir puertos en el hospital.
- **Varios hospitales:** cada uno tendría su espacio. Entre ellos solo se compartirían recuentos anónimos (flores del jardín).
