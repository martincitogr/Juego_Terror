#!/bin/bash
# EL PABELLÓN — lanzador para Linux
# Arranca un servidor local y abre el juego en el navegador.
cd "$(dirname "$0")"

PORT=8666

if ! command -v python3 >/dev/null 2>&1; then
  echo "No se encontró python3. Instálalo con tu gestor de paquetes:"
  echo "  sudo apt install python3      (Debian/Ubuntu)"
  echo "  sudo dnf install python3      (Fedora)"
  echo "  sudo pacman -S python         (Arch)"
  echo "Alternativa: npx serve ."
  exit 1
fi

( sleep 1; xdg-open "http://localhost:$PORT" 2>/dev/null || echo "Abre http://localhost:$PORT en tu navegador" ) &
python3 -m http.server "$PORT"
