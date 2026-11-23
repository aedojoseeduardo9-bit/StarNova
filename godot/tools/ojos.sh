#!/usr/bin/env bash
# Star Nova — "los ojos": abre el juego con una pantalla virtual (Xvfb + OpenGL por software),
# recorre los 3 mundos, toma capturas, hace las pruebas automáticas y deja todo en <carpeta>/
# (report.txt + PNG). Uso: bash godot/tools/ojos.sh <godot> <carpeta_salida> [islas gemini soledad]
#   <godot>: el ejecutable del editor de Godot 4.7 para Linux.
set -u
GODOT="${1:?falta la ruta de Godot}"
OUT="$(mkdir -p "${2:?falta la carpeta de salida}" && cd "$2" && pwd)"
shift 2
SETS="${*:-islas gemini soledad}"
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
"$GODOT" --headless --path "$PROJ" --import > "$OUT/import.log" 2>&1
CODE=0
: > "$OUT/report.txt"
for S in $SETS; do
  EXTRA=""
  [ "$S" != "islas" ] && EXTRA="--auto --mundo=$S"
  # partidas guardadas de prueba aparte de las del jugador
  export XDG_DATA_HOME="$OUT/datos"
  timeout 900 xvfb-run -a -s "-screen 0 1280x720x24" "$GODOT" --path "$PROJ" --rendering-driver opengl3 --audio-driver Dummy \
    --resolution 1280x720 -- --ojos="$OUT" --ojos_set="$S" $EXTRA > "$OUT/juego_$S.log" 2>&1 || CODE=1
  cat "$OUT/report_$S.txt" >> "$OUT/report.txt" 2>/dev/null || { echo "FALLO: no hubo informe de $S" >> "$OUT/report.txt"; tail -30 "$OUT/juego_$S.log" >> "$OUT/report.txt"; CODE=1; }
done
# errores del motor o de los guiones también cuentan como fallo
if grep -hE "SCRIPT ERROR|Parse Error|Invalid call|Invalid access|Invalid assignment" "$OUT"/juego_*.log "$OUT/import.log" > "$OUT/errores.txt"; then
  echo "ERROR: hay errores en el registro (ver errores.txt)" >> "$OUT/report.txt"
  CODE=1
fi
grep -q "FALLO" "$OUT/report.txt" && CODE=1
cat "$OUT/report.txt"
exit $CODE
