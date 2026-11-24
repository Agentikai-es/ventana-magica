#!/usr/bin/env bash
# Empaqueta solo lo que necesita la caja (unos cientos de KB): sin datos, claves, modelos, herramientas ni repos de apoyo.
# Uso: bash scripts/paquete.sh  →  ventana-magica.tar.gz  (cópialo a la Raspberry Pi y ejecuta allí scripts/instalar-raspberry.sh)
set -euo pipefail
cd "$(dirname "$0")/.."
tar -czf ventana-magica.tar.gz --exclude='.DS_Store' \
  package.json README.md SPEC.md CLAUDE.md ESTADO.md PREGUNTAS.md docs evals scripts servidor web
ls -lh ventana-magica.tar.gz | awk '{print "Paquete listo: ventana-magica.tar.gz (" $5 ")"}'
