#!/usr/bin/env bash
# Star Nova nativo — "los ojos": abre el juego con una pantalla virtual (Xvfb + OpenGL por software),
# toma capturas, hace las pruebas automáticas y deja todo en <carpeta>/ (report.txt + PNG).
# Uso: bash godot/tools/ojos_nativo.sh <godot> <carpeta_salida>
#   <godot>: el ejecutable del editor de Godot 4.7 para Linux.
set -u
GODOT="${1:?falta la ruta de Godot}"
OUT="$(mkdir -p "${2:?falta la carpeta de salida}" && cd "$2" && pwd)"
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
# 1) importar el proyecto (crea la caché .godot/ la primera vez)
"$GODOT" --headless --path "$PROJ" --import > "$OUT/import.log" 2>&1
# 2) jugar con pantalla virtual y tomar capturas
xvfb-run -a -s "-screen 0 1280x720x24" "$GODOT" --path "$PROJ" --rendering-driver opengl3 --audio-driver Dummy \
  --resolution 1280x720 -- --ojos="$OUT" > "$OUT/juego.log" 2>&1
CODE=$?
# 3) errores del motor o de los guiones también cuentan como fallo
if grep -E "SCRIPT ERROR|ERROR:|Parse Error|Invalid" "$OUT/juego.log" "$OUT/import.log" > "$OUT/errores.txt"; then
  echo "ERROR: hay errores en el registro (ver errores.txt)" >> "$OUT/report.txt"
  CODE=1
fi
cat "$OUT/report.txt" 2>/dev/null || { echo "FALLO: no hubo informe"; tail -30 "$OUT/juego.log"; CODE=1; }
exit $CODE
