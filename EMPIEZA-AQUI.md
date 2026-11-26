# Empieza aquí · Ventana Mágica (26 nov 2026)

## Dónde está todo
Todo está en esta carpeta del Mac, `~/dev/ventana-peque`. No hay nada en Notion. Lo de hoy no tiene commit en git todavía.

| Qué | Dónde |
|---|---|
| Qué hace la app y qué no | `SPEC.md` |
| Tareas y quién hace qué | `TAREAS.md` |
| Cómo explicar la arquitectura (pitch) | `docs/arquitectura.md` |
| Cómo se montó el servidor en Oracle | `docs/guia-vps-gratis.md` |
| Diagrama dibujado (PDF) | `docs/diagrama-funcionamiento.pdf` |
| Código | `servidor/` (Node) y `web/` (pantallas) |

## Cómo se enfoca ahora
**El mismo código funciona de dos maneras:**
1. **En internet (lo principal desde el 25 nov):** un servidor Linux en Oracle Cloud (Madrid) con Apache y HTTPS. La familia manda fotos, vídeos o GIF desde casa **en tiempo real**.
   - Dirección: https://82-70-82-200.sslip.io
2. **Caja Raspberry Pi en la planta (opcional):** para un hospital que no deje usar internet.
   - La Pi crea su propia wifi `VentanaMagica` y todo funciona dentro, sin internet.
   - Se instala con `bash scripts/instalar-raspberry.sh`.
   - **Para la demo no hace falta**: se cuenta como alternativa, no se enseña.

## Demo en vivo: cómo abrir la app en los móviles
⚠️ **La wifi del recinto (Fortinet) bloquea `sslip.io`**, porque la clasifica como «Dynamic DNS».

**Plan A (recomendado): los móviles con DATOS MÓVILES**, con la wifi apagada.
1. Abre **https://82-70-82-200.sslip.io**.
2. Mete el código de esa persona:
   - **123456**: tablet de Leo (la ventana del niño)
   - **111111**: Abuela (manda foto, vídeo o GIF)
   - **222222**: Mamá (aprueba)
   - 444444: Sara · 555555: Papá de Sara
3. Para instalarla como app:
   - En Android/Chrome: menú ⋮ → «Instalar app».
   - En iPhone/Safari: Compartir → «Añadir a pantalla de inicio».
4. Guion: la Abuela manda un GIF → a Mamá le llega al instante y lo aprueba → a Leo le llega el puzle → lo resuelve y gana ★.

**Plan B: el Mac hace de servidor y comparte su propia red** (si no hay datos móviles).
```bash
cd ~/dev/ventana-peque && npm run demo
```
- En el Mac, la app queda en `http://localhost:8080`. Los móviles en la misma wifi entran por `https://<IP-del-Mac>:8443`.
- Para eso, cada móvil tiene que instalar una vez `https://<IP-del-Mac>:8443/ca.pem`. Los pasos están en el README, en «Móviles en la wifi de la caja».

**Plan C (para la wifi del recinto): Render**, https://ventana-magica.onrender.com.
- Tiene la misma versión que Oracle (actualizada el 25 nov) y **sí pasa el cortafuegos del recinto**.
- Si lleva rato sin uso, tarda ~1 minuto en despertar: ábrelo un rato antes de la demo.
- Se actualiza solo con cada `git push` a `main`.

## Guion de la demo (lo que ya viene preparado)
- **Carta de la Abuela ya enviada y aprobada:** «Toby en el parque». Es un dibujo propio, sin fotos reales (`servidor/demo/perro-parque.svg`).
  - En la tablet de Leo (123456) cuelga un sobre «¡Ábreme!».
  - El puzle es 3×3 con solo 4 piezas fuera de sitio: se resuelve en 4 toques. Cada casilla es distinta: sol, nube con cometa, árbol, tobogán, cabeza del perro, casita de pájaros, flores, cuerpo con collar y pelota.
  - Acertijo: «Abuela» y «desde el parque» → +1 ★.
- **Leo protagonista de su postal:** «Mandar postal» abre «Tu postal: ¡tú eres el protagonista!».
  - Elige qué hace (saludando, saltando, con un corazón o haciendo una foto) y dónde se pone (izquierda, centro o derecha).
  - Quien la recibe ve a Leo grande, con su nombre.
- Para empezar con todo limpio: `npm run demo:limpia`. Borra solo la carpeta `datos-demo/`, nunca `datos/`.

## Arrancar y mantener
| Qué | Comando |
|---|---|
| Arrancar en el Mac (local) | `npm run demo:limpia` (demo desde cero) · `npm run demo` (sigue donde lo dejaste) · `npm start` (sin datos ficticios) |
| Parar | Ctrl+C en esa terminal |
| Pruebas | `npm test` |
| Subir cambios al servidor de Oracle | `IP=82.70.82.200 DOMINIO=82-70-82-200.sslip.io bash scripts/subir-vps.sh` |
| Reiniciar el servidor de Oracle | `ssh -i ~/.ssh/ventana_oracle ubuntu@82.70.82.200 'sudo systemctl restart ventana-magica'` |

La demo de Oracle borra todo y vuelve a los datos ficticios cada 6 horas.
