#!/usr/bin/env bash
# Compila whisper.cpp (código abierto, MIT) y descarga el modelo «small» multilingüe.
# Todo queda en local: herramientas/ y modelos/. Necesita git, cmake y ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p herramientas modelos
[ -d herramientas/whisper.cpp ] || git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git herramientas/whisper.cpp
# Un solo ejecutable, sin librerías aparte; después se borra el código fuente (de ~90 MB a ~1–2 MB).
cmake -S herramientas/whisper.cpp -B herramientas/whisper-estatico -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF >/dev/null
cmake --build herramientas/whisper-estatico -j "$(nproc 2>/dev/null || sysctl -n hw.ncpu)" --config Release --target whisper-cli
mkdir -p herramientas/bin && cp herramientas/whisper-estatico/bin/whisper-cli herramientas/bin/whisper-cli && strip herramientas/bin/whisper-cli 2>/dev/null || true
rm -rf herramientas/whisper.cpp herramientas/whisper-estatico
[[ -f modelos/ggml-small-q5_1.bin ]] || curl -fL -o modelos/ggml-small-q5_1.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin
echo "Voz local lista."
