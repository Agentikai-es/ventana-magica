#!/usr/bin/env bash
# Instala Ventana Mágica en un VPS Linux (Ubuntu 22.04/24.04 o Debian 12) detrás de Apache con HTTPS.
#
#   Uso (en el VPS, dentro de la carpeta del proyecto):
#     DOMINIO=ventana.tudominio.com CORREO=tu@correo bash scripts/instalar-vps.sh          # demo (datos ficticios)
#     DOMINIO=… CORREO=… DEMO=no bash scripts/instalar-vps.sh                              # sin datos de demo
#
# Antes: el dominio (registro A) debe apuntar a la IP del VPS, y los puertos 80 y 443 abiertos.
# Todo es software libre: Node 22, ffmpeg, Apache, certbot (Let's Encrypt). Sin dependencias de npm.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DOMINIO="${DOMINIO:?Falta DOMINIO=ventana.tudominio.com}"
CORREO="${CORREO:-}"  # opcional: avisos de caducidad del certificado
DEMO="${DEMO:-si}"
cd "$RAIZ"

echo "1/5 · Paquetes del sistema (Apache, ffmpeg, certbot)…"
sudo apt-get update -y
sudo apt-get install -y apache2 ffmpeg certbot python3-certbot-apache curl ca-certificates

echo "2/5 · Node 22…"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  # Repositorio oficial de NodeSource (paquete firmado por apt).
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v

echo "3/5 · Servicio que arranca solo (Node solo escucha en 127.0.0.1)…"
LINEAS_DEMO=""
if [ "$DEMO" = "si" ]; then
  LINEAS_DEMO=$'Environment=VP_DEMO=1\nEnvironment=VP_REINICIO_HORAS=6'
fi
sudo tee /etc/systemd/system/ventana-magica.service >/dev/null <<UNIT
[Unit]
Description=Ventana Mágica (detrás de Apache)
After=network-online.target
Wants=network-online.target

[Service]
User=$(id -un)
WorkingDirectory=$RAIZ
ExecStart=$(command -v node) servidor/servidor.mjs
Restart=always
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=VP_HOST=127.0.0.1
Environment=VP_URL_PUBLICA=https://$DOMINIO
${LINEAS_DEMO}

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now ventana-magica
sudo systemctl restart ventana-magica

# Oracle Cloud (Ubuntu) trae un cortafuegos interno que solo deja pasar SSH: abrimos 80 y 443.
if sudo iptables -S INPUT 2>/dev/null | grep -q "REJECT"; then
  for p in 80 443; do
    sudo iptables -C INPUT -p tcp --dport $p -m state --state NEW -j ACCEPT 2>/dev/null \
      || sudo iptables -I INPUT "$(sudo iptables -L INPUT --line-numbers | awk '/REJECT/{print $1; exit}')" -p tcp --dport $p -m state --state NEW -j ACCEPT
  done
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null
  sudo netfilter-persistent save >/dev/null
fi

echo "4/5 · Apache como proxy inverso…"
sudo a2enmod proxy proxy_http headers rewrite ssl >/dev/null
sed "s/DOMINIO/$DOMINIO/g" deploy/apache-ventana.conf | sudo tee /etc/apache2/sites-available/ventana-magica.conf >/dev/null
sudo a2ensite ventana-magica >/dev/null
sudo a2dissite 000-default >/dev/null 2>&1 || true
sudo apachectl configtest
sudo systemctl reload apache2

echo "5/5 · Certificado HTTPS gratuito (Let's Encrypt)…"
if [ -n "$CORREO" ]; then CUENTA=(-m "$CORREO"); else CUENTA=(--register-unsafely-without-email); fi
sudo certbot --apache -d "$DOMINIO" "${CUENTA[@]}" --agree-tos --redirect --non-interactive

sleep 2
echo
journalctl -u ventana-magica -n 10 --no-pager | grep -E "Ventana|demo|códigos|ffmpeg" || true
echo
echo "Listo: https://$DOMINIO"
echo "  Reiniciar:   sudo systemctl restart ventana-magica"
echo "  Ver el log:  journalctl -u ventana-magica -f"
echo "  Actualizar:  git pull && sudo systemctl restart ventana-magica"
