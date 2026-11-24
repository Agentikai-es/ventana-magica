# Ventana Mágica · Ventana Peque

**Demo en vivo:** https://ventana-magica.onrender.com — entra con `123456` (tablet del niño), `111111` (familia) o `222222` (adulto de confianza). Es una demo con datos ficticios que se borra cada 6 h; en el hospital la app corre en una caja local sin internet.

Web app local para que un niño hospitalizado (6–12 años) siga conectado con su familia y su clase.
El niño personaliza su ventana con la voz o con texto, y por ella le llegan fotos del día a día que un adulto aprueba antes.

- **Sin nube ni suscripciones.** Todo corre en un ordenador del hospital: Node.js + SQLite integrado + fotos en disco + voz con whisper.cpp.
- **Sin dependencias de npm.** Solo Node ≥ 22.13, ffmpeg, git y cmake (para compilar la voz).
- **Los datos no salen del servidor.** Ni la voz, ni las fotos, ni los alias.

## Arrancar la demo (Mac)

```bash
npm run voz            # una vez: compila whisper.cpp y descarga el modelo (~190 MB)
npm run certificados   # una vez (y si cambia la IP de la wifi): HTTPS local con openssl
npm start
```

El servidor muestra:
- `https://<IP-wifi>:8443` → para tablets y móviles en la misma wifi.
- `http://localhost:8080` → solo para este ordenador.
- **La clave del panel del hospital, una sola vez.** Si se pierde: borra `datos/admin.json` y reinicia.

## Flujo de la demo (3 minutos)
1. **Panel** (`http://localhost:8080/panel`): con la clave, crea el espacio de «Leo» (alias ficticio) con Abuela, Mamá y su clase. Cada persona recibe su enlace y su código.
2. **Tablet de Leo**: dice «quiero estar en la Torre Eiffel de noche» y la ventana cambia, con sonido.
3. **Móvil de la abuela**: manda una foto o un vídeo con dos pistas y desde dónde lo envía.
4. **Móvil de mamá** (adulto de confianza): la aprueba.
5. **Tablet**: llega una carta. Leo monta el puzle y resuelve el acertijo («¿quién te la envía y desde dónde?»).
6. **Tablet**: Leo contesta con una postal-acertijo desde su ventana (o un audio, o una foto-puzle con mensaje secreto). Mamá la aprueba.
7. **Móvil de la abuela**: adivina «¿Dónde está Leo hoy?» y desbloquea su mensaje.

## En una Raspberry Pi (o cualquier mini ordenador con Linux)
```bash
bash scripts/instalar-raspberry.sh
```
Instala Node 22, ffmpeg y whisper.cpp; elige el modelo de voz según la memoria (`base` con 6 GB o más, `tiny` con menos), crea los certificados y deja el servidor arrancando solo al encender. Funciona en Raspberry Pi 4 y 5 con Raspberry Pi OS de 64 bits. Los vídeos no se recodifican salvo que haga falta, para no cargar la Pi.

## Tablets en la wifi (HTTPS)
El micrófono exige HTTPS. Cada tablet confía una vez en la autoridad local:
- **iPad:** abre `https://<IP>:8443/ca.pem` → Ajustes → Perfil descargado → Instalar. Después: Ajustes → General → Información → Ajustes de confianza de certificados → activar.
- **Android:** descarga `ca.pem` → Ajustes → Seguridad → Instalar certificado CA.

## Estructura
- `servidor/`: servidor HTTP/HTTPS, base de datos SQLite, voz local y pruebas.
- `web/`: pantallas (`ventana`, `enviar`, `aprobar`, `panel`, `index`) y `web/lib/` (catálogo, intérprete de peticiones, escena, narración).
- `docs/datos.md`: qué datos se guardan, para qué y cuánto tiempo (RGPD).
- `datos/`, `certs/`, `modelos/`, `herramientas/`: se generan en local y nunca van al repositorio.

## Pruebas
```bash
npm test
```
