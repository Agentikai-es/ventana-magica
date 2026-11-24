# Demo pública de Ventana Mágica (Render u otra nube con Docker).
# En el hospital NO se usa esto: allí va la caja local con scripts/instalar-raspberry.sh.
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
COPY servidor ./servidor
COPY web ./web
ENV NODE_ENV=production VP_DEMO=1 VP_REINICIO_HORAS=6
EXPOSE 10000
CMD ["node", "servidor/servidor.mjs"]
