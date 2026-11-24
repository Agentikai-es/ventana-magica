#!/usr/bin/env bash
# Crea una autoridad de certificación local y un certificado HTTPS para este ordenador.
# Solo usa openssl (viene con macOS). Gratis y sin servicios externos.
# Las tablets deben instalar y confiar en certs/ca.pem una vez (se descarga en https://<IP>:8443/ca.pem).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs
chmod 700 certs

if [[ ! -f certs/ca.key ]]; then
  openssl genrsa -out certs/ca.key 3072 2>/dev/null
  openssl req -x509 -new -key certs/ca.key -sha256 -days 825 -out certs/ca.pem \
    -subj "/CN=Ventana Magica CA local/O=Ventana Peque"
  echo "Autoridad local creada: certs/ca.pem"
fi

# Nombres y direcciones por las que se entra al servidor.
SAN="DNS:localhost,IP:127.0.0.1,IP:10.42.0.1"   # 10.42.0.1 = la wifi propia de la caja
for ip in $( (ifconfig 2>/dev/null || ip -4 addr) | awk '/inet / {sub(/\/.*/,"",$2); if ($2 != "127.0.0.1" && $2 != "10.42.0.1") print $2}'); do SAN="$SAN,IP:$ip"; done
SAN="$SAN,DNS:$( (scutil --get LocalHostName 2>/dev/null) || hostname -s).local"

openssl genrsa -out certs/key.pem 2048 2>/dev/null
openssl req -new -key certs/key.pem -out certs/servidor.csr -subj "/CN=Ventana Magica"
openssl x509 -req -in certs/servidor.csr -CA certs/ca.pem -CAkey certs/ca.key -CAcreateserial \
  -out certs/cert.pem -days 397 -sha256 \
  -extfile <(printf "subjectAltName=%s\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment" "$SAN") 2>/dev/null
rm -f certs/servidor.csr
chmod 600 certs/*.key certs/key.pem

echo "Certificado HTTPS listo para: $SAN"
echo "Si cambia la IP de la wifi, vuelve a ejecutar este script."
