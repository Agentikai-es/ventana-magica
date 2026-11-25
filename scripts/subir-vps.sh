#!/usr/bin/env bash
# Sube Ventana Mágica desde este Mac a un VPS por SSH (sin GitHub) y la instala o actualiza.
#
#   IP=141.1.2.3 DOMINIO=ventanamagica.duckdns.org CORREO=tu@correo bash scripts/subir-vps.sh
#   (opcional) CLAVE=~/.ssh/ventana_oracle  USUARIO=ubuntu  DEMO=si
#
# Solo viaja el código (servidor/, web/, scripts/, deploy/, package.json). Nunca datos/, certs/, modelos/ ni vendor/.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
IP="${IP:?Falta IP=… (IP pública del VPS)}"
DOMINIO="${DOMINIO:?Falta DOMINIO=… (p. ej. ventanamagica.duckdns.org)}"
CORREO="${CORREO:-}"  # opcional
CLAVE="${CLAVE:-$HOME/.ssh/ventana_oracle}"
USUARIO="${USUARIO:-ubuntu}"
DEMO="${DEMO:-si}"
SSH=(ssh -i "$CLAVE" -o StrictHostKeyChecking=accept-new "$USUARIO@$IP")

echo "→ Comprobando que $DOMINIO apunta a $IP…"
RESUELTA="$(dig +short "$DOMINIO" | tail -1 || true)"
[ "$RESUELTA" = "$IP" ] || { echo "  ✗ $DOMINIO apunta a '${RESUELTA:-nada}', no a $IP. Corrígelo en DuckDNS y espera 1 minuto."; exit 1; }

echo "→ Copiando el código a $USUARIO@$IP:~/ventana …"
"${SSH[@]}" "mkdir -p ~/ventana"
tar -C "$RAIZ" -czf - package.json servidor web scripts deploy | "${SSH[@]}" "tar -C ~/ventana -xzf -"

echo "→ Instalando (la primera vez tarda unos 5 minutos)…"
"${SSH[@]}" "cd ~/ventana && DOMINIO='$DOMINIO' CORREO='$CORREO' DEMO='$DEMO' bash scripts/instalar-vps.sh"

echo "→ Comprobación desde fuera:"
curl -fsS -o /dev/null -w "  https://$DOMINIO → %{http_code}\n" "https://$DOMINIO/" || echo "  ✗ No responde por HTTPS todavía."
