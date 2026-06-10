#!/bin/bash
# EL PABELLÓN — lanzador para macOS
# Arranca un servidor local y abre el juego en el navegador.
cd "$(dirname "$0")"

PORT=8666

if ! command -v python3 >/dev/null 2>&1; then
  echo "No se encontró python3 (viene con macOS o con Xcode Command Line Tools)."
  echo "Alternativa: npx serve ."
  read -r -p "Pulsa Intro para salir..."
  exit 1
fi

( sleep 1; open "http://localhost:$PORT" ) &
python3 -m http.server "$PORT"
