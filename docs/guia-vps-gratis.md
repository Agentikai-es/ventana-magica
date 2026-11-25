# Ventana Mágica en internet por 0 € · Oracle Cloud + sslip.io

Coste total: **0 €**. Lo que hace Jamin son solo los pasos con cuentas (crearlas y meter la tarjeta de verificación). El resto lo hace un comando.

## Cómo quedó montado (25 nov 2026)
| Pieza | Valor |
|---|---|
| Cuenta | Oracle Cloud, Free Trial (créditos de prueba), región **Spain Central (Madrid)** |
| Red | `ventana-vcn` (asistente «VCN with internet connectivity»): subred pública + internet gateway. Security List: 22 (SSH), **80** y **443** abiertos |
| Máquina | `ventana-magica` · **VM.Standard.E5.Flex** (AMD, 1 OCPU, 12 GB) · Ubuntu 24.04 · IP pública **82.70.82.200** |
| Dominio | **`82-70-82-200.sslip.io`** (sin cuenta: el nombre lleva la IP dentro) |
| Acceso | SSH con llave `~/.ssh/ventana_oracle`, usuario `ubuntu` |
| App | `https://82-70-82-200.sslip.io` · Apache + Let's Encrypt → Node en 127.0.0.1:8080 · modo demo (datos ficticios, se reinicia cada 6 h) |

**Por qué así:**
- La máquina ARM gratuita (A1.Flex) daba «Out of capacity» en Madrid, y la Micro no existe en esa región. Por eso se usa una AMD pequeña pagada con los **créditos de prueba**: **0 € cobrados**.
  - Al acabar la prueba (30 días), Oracle la para sin cobrar, salvo que se pase a una cuenta de pago.
  - Para quedarse gratis para siempre: reintentar la A1.Flex más adelante y volver a lanzar `subir-vps.sh` con la nueva IP.
- **sslip.io en vez de DuckDNS:** no pide registrarse ni guardar ningún token. `82-70-82-200.sslip.io` siempre resuelve a `82.70.82.200`.
- **Certificado sin correo:** `CORREO` es opcional. Sin él, certbot se registra sin email y el certificado se renueva solo igualmente.

**Actualizar la app tras cambiar código** (desde el Mac):
```bash
IP=82.70.82.200 DOMINIO=82-70-82-200.sslip.io bash scripts/subir-vps.sh
```

---

## Parte 1 · Lo que hace Jamin (unos 20 minutos)

### 1. Clave SSH en el Mac (la «llave» para entrar al servidor)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/ventana_oracle -N ""
```
```bash
cat ~/.ssh/ventana_oracle.pub
```
Copia la línea que sale, que empieza por `ssh-ed25519`. Es la parte **pública**: se puede pegar en Oracle sin riesgo. El archivo sin `.pub` no se comparte nunca.

### 2. Cuenta gratis en Oracle Cloud
1. Entra en **oracle.com/cloud/free** y pulsa «Start for free».
2. **Home region:** elige **Spain Central (Madrid)** o **Germany Central (Frankfurt)**. Queda en la UE (RGPD) y **no se puede cambiar después**.
3. Te pedirá una tarjeta **solo para verificar** (puede hacer una retención de ~1 € que devuelve). Mientras no pulses «Upgrade to Pay As You Go», **nunca cobra**.

### 3. Crear el servidor (VM)
En la consola, ve a **Compute → Instances → Create instance**:

| Campo | Valor |
|---|---|
| Name | `ventana-magica` |
| Image | **Canonical Ubuntu 24.04** |
| Shape | **VM.Standard.A1.Flex** (Ampere, ARM): 2 OCPU y 12 GB. Si da «Out of capacity», usa **VM.Standard.E2.1.Micro** (también gratis, 1 GB). |
| Networking | Deja que cree la VCN y **marca «Assign a public IPv4 address»**. |
| Add SSH keys | «Paste public keys» → pega la línea del paso 1. |
| Boot volume | Por defecto (hasta 200 GB entran en lo gratis). |

Pulsa **Create**. A los 1–2 minutos aparece **Public IP address**: apúntala (por ejemplo, `141.1.2.3`).

### 4. Abrir la web en la red de Oracle (puertos 80 y 443)
1. En la instancia, entra en **Primary VNIC → Subnet** y luego en **Default Security List**.
2. Pulsa **Add Ingress Rules** y añade dos reglas:
   - Source CIDR `0.0.0.0/0`, protocolo TCP, **Destination port 80**.
   - Lo mismo con **443**.

El otro cortafuegos, el que va dentro de Ubuntu, lo abre el script automáticamente.

### 5. Dominio gratis (sslip.io, sin cuenta)
No hace falta hacer nada: con la IP `82.70.82.200` el dominio es `82-70-82-200.sslip.io`.

*Alternativa con cuenta: DuckDNS*
1. Entra en **duckdns.org** con GitHub o Google.
2. Escribe el subdominio (por ejemplo `ventanamagica`) y pulsa **add domain**.
3. En **current ip**, pon la IP pública de Oracle y pulsa **update ip**.

Ya tienes `ventanamagica.duckdns.org`, que apunta al servidor. El **token** de DuckDNS es secreto: no hace falta, y no se pega en ningún sitio.

### 6. Pásale a Claude estas tres cosas
- La IP pública.
- El dominio (`xxx.duckdns.org`).
- El correo para los avisos del certificado.

Y el OK para desplegar.

---

## Parte 2 · Lo que hace Claude (un comando, unos 5 minutos)
```bash
IP=141.1.2.3 DOMINIO=ventanamagica.duckdns.org CORREO=tu@correo bash scripts/subir-vps.sh
```
Esto hace, por orden:
1. Comprueba que el dominio apunta a la IP.
2. Copia **solo el código** al servidor por SSH. No pasa por GitHub ni lleva datos, modelos ni certificados.
3. Ejecuta en el servidor `scripts/instalar-vps.sh`, que:
   - Instala Apache, ffmpeg, certbot y Node 22.
   - Crea el servicio `ventana-magica` (systemd): Node escucha solo en `127.0.0.1:8080` y arranca solo si se reinicia el servidor.
   - Abre los puertos 80 y 443 en el cortafuegos interno de Ubuntu.
   - Configura Apache como proxy inverso con `deploy/apache-ventana.conf`.
   - Pide el certificado HTTPS gratuito de Let's Encrypt y redirige todo lo que llegue por HTTP a HTTPS.
4. Comprueba desde fuera que `https://dominio` responde.

Para **actualizar** después de cambiar código, se lanza el mismo comando.

---

## Parte 3 · Cómo contarlo (lo que se ha hecho y por qué)

> «Para que la familia mande fotos, vídeos o GIF **desde casa y en tiempo real**, la app vive en un **servidor Linux en la nube de Oracle, en su capa gratuita, en Madrid o Frankfurt, dentro de la UE**. Delante tiene **Apache**, que pone el candado HTTPS con un certificado gratuito de Let's Encrypt, y detrás **un único servidor Node.js con SQLite**. El dominio es gratuito, de DuckDNS. **Coste: 0 €.** Se instala con un comando, y el mismo código funciona en una Raspberry Pi sin internet si el hospital lo prefiere.»

**Las piezas, una por una:**

| Pieza | Qué es | Coste |
|---|---|---|
| Oracle Cloud Always Free | Ordenador Linux (Ubuntu 24.04) encendido 24 h en un centro de datos de la UE | 0 € |
| DuckDNS | Nombre fácil (`ventanamagica.duckdns.org`) en vez de una IP | 0 € |
| Let's Encrypt | Certificado HTTPS (el candado); el micrófono del móvil lo exige | 0 € |
| Apache | Puerta de entrada: HTTPS, y pasa las peticiones a Node | 0 € (libre) |
| Node.js + SQLite + ffmpeg | La app, la base de datos y la limpieza de fotos y vídeos | 0 € (libre) |

**Preguntas que pueden hacer:**
- **¿Es seguro?**
  - Solo están abiertos SSH (con llave, sin contraseña), el 80 y el 443.
  - Node no se ve desde fuera: escucha solo en el propio servidor.
  - Todo va cifrado con HTTPS.
  - Hay un adulto que aprueba cada foto, y se quitan la ubicación y los metadatos.
- **¿Y los datos de los niños en la nube?**
  - En la demo, todos los datos son ficticios.
  - En un hospital real: un servidor en la UE con contrato de encargado del tratamiento, o la máquina virtual del propio hospital, o la caja sin internet. Es el mismo código.
- **¿Y si Oracle cierra la capa gratuita?**
  - El instalador funciona en cualquier Ubuntu (Hetzner, OVH o el hospital). Moverlo es cambiar la IP y volver a lanzar un comando.
- **¿Por qué no PHP o LAMP?**
  - Es la misma arquitectura: Linux + Apache + base de datos + servidor.
  - Usamos Node porque el tiempo real es nativo, y SQLite porque es un solo archivo sin nada que administrar.

---

## Mantenimiento (desde el Mac)
```bash
ssh -i ~/.ssh/ventana_oracle ubuntu@IP 'sudo systemctl restart ventana-magica'
```
```bash
ssh -i ~/.ssh/ventana_oracle ubuntu@IP 'journalctl -u ventana-magica -n 50'
```
- El modo demo borra todo y vuelve a los datos ficticios cada 6 horas. Códigos: 123456 (Leo), 111111 (Abuela), 222222 (Mamá).
- El certificado se renueva solo. certbot deja un temporizador del sistema que lo hace.

## Si algo falla
| Qué pasa | Causa probable | Arreglo |
|---|---|---|
| «Out of capacity» al crear la VM | No quedan máquinas ARM gratis en la región | Prueba otra vez más tarde o usa `VM.Standard.E2.1.Micro` |
| El script dice que el dominio no apunta a la IP | DuckDNS no está actualizado | En duckdns.org, pon la IP y pulsa *update ip*; espera 1 minuto |
| certbot falla | Los puertos 80 y 443 están cerrados en la Security List | Revisa el paso 4 |
| `Permission denied (publickey)` | La clave no coincide | Comprueba que pegaste la `.pub` del paso 1 y que el usuario es `ubuntu` |
