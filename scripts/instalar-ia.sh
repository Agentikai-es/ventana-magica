#!/usr/bin/env bash
# IA de texto local (opcional): llama.cpp + Qwen2.5 1,5B (~1,1 GB). Una vez, con internet; después funciona sin conexión.
# Uso: npm run ia   ·   Sin esto, la ventana usa solo las reglas del catálogo.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p modelos herramientas/bin
M=modelos/qwen2.5-1.5b-instruct-q4_k_m.gguf
if [ ! -f "$M" ]; then
  curl -L --fail -o "$M.part" "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"
  mv -f "$M.part" "$M"
fi
if [ ! -x herramientas/bin/llama-server ]; then
  [ -d herramientas/llama.cpp ] || git clone --depth 1 https://github.com/ggml-org/llama.cpp herramientas/llama.cpp
  cmake -S herramientas/llama.cpp -B herramientas/llama.cpp/build -DBUILD_SHARED_LIBS=OFF -DLLAMA_CURL=OFF
  cmake --build herramientas/llama.cpp/build --config Release -j "$(getconf _NPROCESSORS_ONLN)" --target llama-server
  cp herramientas/llama.cpp/build/bin/llama-server herramientas/bin/
  rm -rf herramientas/llama.cpp   # solo queda el ejecutable
fi
echo "IA local lista: $(du -h "$M" | cut -f1) de modelo + $(du -h herramientas/bin/llama-server | cut -f1) de programa."
