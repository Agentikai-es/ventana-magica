#!/usr/bin/env bash
# Genera docs/diagrama-funcionamiento.pdf a partir de docs/diagrama-funcionamiento.html con Chrome sin ventana (local, sin red).
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v chromium || command -v chromium-browser || command -v google-chrome)"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --run-all-compositor-stages-before-draw --virtual-time-budget=3000 \
  --print-to-pdf="$PWD/docs/diagrama-funcionamiento.pdf" "file://$PWD/docs/diagrama-funcionamiento.html" 2>/dev/null
echo "PDF: docs/diagrama-funcionamiento.pdf"
