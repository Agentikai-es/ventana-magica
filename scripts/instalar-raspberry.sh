#!/usr/bin/env bash
# Instala la Ventana Mágica en una Raspberry Pi (Raspberry Pi OS de 64 bits, Pi 4 o Pi 5) o en cualquier Debian/Ubuntu.
# Deja el servidor arrancando solo al encender (systemd). Todo es software libre y gratuito.
#   bash scripts/instalar-raspberry.sh            → instalación para el hospital
#   DEMO=si bash scripts/instalar-raspberry.sh    → además, códigos fijos de la demo (123456…), datos ficticios
#   PUNTO_ACCESO=no …                            → sin wifi propia (usa la red a la que ya esté conectada)
# Probado para Raspberry Pi 4 de 4 GB con Raspberry Pi OS de 64 bits.
set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ="$(pwd)"

echo "1/7 · Paquetes del sistema (ffmpeg, git, cmake, compilador)…"
sudo apt-get update -y
sudo apt-get install -y ffmpeg git cmake build-essential curl ca-certificates openssl

echo "2/7 · Node.js 22 (hace falta ≥ 22.13 por SQLite integrado)…"
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)' 2>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "3/7 · Voz local (whisper.cpp) con el modelo adecuado a la memoria…"
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -ge 6000 ]; then MODELO=ggml-base-q5_1.bin; else MODELO=ggml-tiny-q5_1.bin; fi
mkdir -p herramientas modelos
# Con 4 GB, compilar whisper.cpp con todos los núcleos puede quedarse sin memoria: swap temporal de 1 GB solo para compilar.
SWAP_TEMP=""
if [ "$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 900 ]; then
  SWAP_TEMP=/var/tmp/ventana-swap
  sudo fallocate -l 1G "$SWAP_TEMP" && sudo chmod 600 "$SWAP_TEMP" && sudo mkswap "$SWAP_TEMP" >/dev/null && sudo swapon "$SWAP_TEMP" || SWAP_TEMP=""
fi
[ -d herramientas/whisper.cpp ] || git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git herramientas/whisper.cpp
# Un solo ejecutable, sin librerías aparte; después se borra el código fuente (de ~90 MB a ~1–2 MB).
cmake -S herramientas/whisper.cpp -B herramientas/whisper-estatico -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF >/dev/null
cmake --build herramientas/whisper-estatico -j "$(nproc 2>/dev/null || sysctl -n hw.ncpu)" --config Release --target whisper-cli
mkdir -p herramientas/bin && cp herramientas/whisper-estatico/bin/whisper-cli herramientas/bin/whisper-cli && strip herramientas/bin/whisper-cli 2>/dev/null || true
rm -rf herramientas/whisper.cpp herramientas/whisper-estatico
[ -n "$SWAP_TEMP" ] && { sudo swapoff "$SWAP_TEMP"; sudo rm -f "$SWAP_TEMP"; }
[ -f "modelos/$MODELO" ] || curl -fL -o "modelos/$MODELO" "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$MODELO"
echo "   Memoria: ${MEM_MB} MB → modelo $MODELO"

echo "4/7 · Voz que sale (Piper, es_ES): la caja lee en voz alta sin internet…"
VOCES="${VOCES:-es_ES}" bash scripts/instalar-habla.sh

echo "5/7 · Wifi propia de la caja (sin internet ni red del hospital)…"
# La Pi crea su propia red: las tablets y los móviles de las visitas se conectan a ella. No sale nada a internet.
if [ "${PUNTO_ACCESO:-si}" = "si" ] && command -v nmcli >/dev/null; then
  CLAVE_WIFI="${CLAVE_WIFI:-$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 12)}"
  sudo nmcli connection delete VentanaMagica >/dev/null 2>&1 || true
  sudo nmcli connection add type wifi ifname wlan0 con-name VentanaMagica autoconnect yes ssid "VentanaMagica" \
    802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared ipv4.addresses 10.42.0.1/24 \
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$CLAVE_WIFI" >/dev/null
  sudo nmcli connection up VentanaMagica >/dev/null
  echo "   Wifi: VentanaMagica · clave: $CLAVE_WIFI · dirección: https://10.42.0.1:8443"
else
  echo "   (Sin punto de acceso: se usará la red a la que ya esté conectada la caja.)"
fi

echo "6/7 · Certificados HTTPS locales…"
bash scripts/certificados.sh

echo "7/7 · Servicio que arranca solo…"
LINEA_DEMO=""
if [ "${DEMO:-no}" = "si" ]; then LINEA_DEMO="Environment=VP_DEMO=1"; fi
sudo tee /etc/systemd/system/ventana-magica.service >/dev/null <<UNIT
[Unit]
Description=Ventana Mágica (servidor local)
After=network-online.target
Wants=network-online.target

[Service]
User=$(id -un)
WorkingDirectory=$RAIZ
ExecStart=$(command -v node) servidor/servidor.mjs
Restart=always
Environment=NODE_ENV=production
${LINEA_DEMO}

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now ventana-magica
sleep 2
echo
journalctl -u ventana-magica -n 20 --no-pager | grep -E "Ventana|wifi|Voz|Clave|Panel|DEMO" || true
echo
echo "Medida de la voz en esta caja (objetivo: menos de 4 s por frase):"
npm run --silent medir-voz || echo "   ⚠ La voz pasa de 4 s: prueba VP_WHISPER_CTX=384 o deja el modelo tiny."
echo
sleep 3
npm run --silent comprobar || true
echo
echo "Listo. Si es la primera vez, la clave del panel aparece arriba (o en: journalctl -u ventana-magica)."
