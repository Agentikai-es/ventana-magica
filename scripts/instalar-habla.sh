#!/usr/bin/env bash
# Voz que sale, local (Piper, MIT/GPL): lee en voz alta la narración dentro de la caja. Una vez, con internet.
#   npm run habla            → voz es_ES (por defecto)
#   VOCES="es_ES es_MX" npm run habla
# Raspberry Pi / Linux aarch64: el ejecutable oficial (~26 MB). Mac: piper-tts en un entorno local (la versión
# oficial para Mac de 2023 viene rota). Sin esto, el móvil usa su propia voz.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p herramientas modelos/piper
SO="$(uname -s)"; ARQ="$(uname -m)"
if [ "$SO" = "Linux" ]; then
  if [ ! -x herramientas/piper/piper ]; then
    case "$ARQ" in aarch64|arm64) PAQ=piper_linux_aarch64 ;; armv7l) PAQ=piper_linux_armv7l ;; x86_64) PAQ=piper_linux_x86_64 ;; *) echo "Arquitectura $ARQ sin Piper"; exit 1 ;; esac
    curl -fL -o /tmp/piper.tgz "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/$PAQ.tar.gz"
    tar -xzf /tmp/piper.tgz -C herramientas && rm -f /tmp/piper.tgz
  fi
elif [ "$SO" = "Darwin" ]; then
  if [ ! -x herramientas/piper-venv/bin/piper ]; then
    if command -v uv >/dev/null; then uv venv -q -p 3.11 herramientas/piper-venv && uv pip install -q -p herramientas/piper-venv piper-tts
    else python3 -m venv herramientas/piper-venv && herramientas/piper-venv/bin/pip install -q piper-tts; fi
  fi
fi
for v in ${VOCES:-es_ES}; do
  case "$v" in es_ES) r=es_ES/davefx/medium/es_ES-davefx-medium ;; es_MX) r=es_MX/ald/medium/es_MX-ald-medium ;; *) echo "Voz $v desconocida (es_ES o es_MX)"; continue ;; esac
  n="$(basename "$r")"
  [ -f "modelos/piper/$n.onnx" ] || curl -fL -o "modelos/piper/$n.onnx" "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/$r.onnx"
  [ -f "modelos/piper/$n.onnx.json" ] || curl -fL -o "modelos/piper/$n.onnx.json" "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/$r.onnx.json"
done
echo "Voz local lista: $(ls modelos/piper/*.onnx | xargs -n1 basename | tr '\n' ' ')"
