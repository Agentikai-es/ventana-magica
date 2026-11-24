#!/usr/bin/env bash
# Chequeo rápido antes de la demo: npm run comprobar
# Mira que el servidor responde, que la voz y ffmpeg están, que el certificado vale para la IP de ahora
# y que los códigos fijos de la demo funcionan. No cambia nada.
cd "$(dirname "$0")/.."
PUERTO_LOCAL="${VP_PUERTO_LOCAL:-8080}"
PUERTO="${VP_PUERTO:-8443}"
fallos=0
bien() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
mal()  { printf '  \033[31m✗\033[0m %s\n' "$1"; fallos=$((fallos + 1)); }

echo "Ventana Mágica · chequeo antes de la demo"

# 1. Servidor
if curl -fsS -o /dev/null --max-time 3 "http://localhost:$PUERTO_LOCAL/"; then bien "Servidor en http://localhost:$PUERTO_LOCAL"
else mal "El servidor no responde: arráncalo con «npm run demo»"; fi

# 2. Herramientas
if command -v ffmpeg >/dev/null; then bien "ffmpeg instalado"; else mal "Falta ffmpeg (fotos, audios, vídeos y voz)"; fi
if [ -x herramientas/bin/whisper-cli ] || [ -x herramientas/whisper.cpp/build/bin/whisper-cli ] || command -v whisper-cli >/dev/null; then bien "whisper-cli listo"
else mal "Falta whisper-cli: «npm run voz» (sin él, solo texto y lugares)"; fi
if ls modelos/ggml-*.bin >/dev/null 2>&1; then bien "Modelo de voz: $(ls modelos/ggml-*.bin | head -1 | xargs basename)"
else mal "Falta el modelo de voz en modelos/: «npm run voz»"; fi

# 3. Certificado HTTPS para las IP de ahora
if [ -f certs/cert.pem ]; then
  san=$(openssl x509 -in certs/cert.pem -noout -ext subjectAltName 2>/dev/null)
  for ip in $( (ifconfig 2>/dev/null || ip -4 addr) | awk '/inet / {sub(/\/.*/,"",$2); if ($2 != "127.0.0.1") print $2}'); do
    if echo "$san" | grep -q "IP Address:$ip"; then bien "Certificado válido para $ip"
    else mal "El certificado no incluye $ip: ejecuta «npm run certificados» y reinicia"; fi
  done
  if openssl x509 -in certs/cert.pem -noout -checkend 604800 >/dev/null; then bien "El certificado no caduca esta semana"
  else mal "El certificado caduca en menos de 7 días: «npm run certificados»"; fi
  if curl -fsS -o /dev/null --max-time 3 --cacert certs/ca.pem "https://localhost:$PUERTO/"; then bien "HTTPS en el puerto $PUERTO"
  else mal "HTTPS no responde en el puerto $PUERTO"; fi
else
  mal "Sin certificados: la wifi está cerrada. «npm run certificados» y reinicia"
fi

# 4. Códigos fijos de la demo
for par in "123456:/ventana" "111111:/enviar" "222222:/aprobar" "333333:/enviar"; do
  codigo="${par%%:*}"; destino="${par##*:}"
  r=$(curl -fsS --max-time 3 -H 'x-vp: 1' -H 'content-type: application/json' -d "{\"codigo\":\"$codigo\"}" "http://localhost:$PUERTO_LOCAL/api/canjear" 2>/dev/null)
  if echo "$r" | grep -q "\"$destino\""; then bien "Código $codigo → $destino"
  else mal "El código $codigo no funciona: ¿has arrancado con «npm run demo»?"; fi
done

echo
if [ "$fallos" -eq 0 ]; then echo "Todo listo para la demo."; else echo "$fallos cosa(s) por arreglar antes de la demo."; fi
exit "$fallos"
