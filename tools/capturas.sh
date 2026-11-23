#!/usr/bin/env bash
# Descarga las capturas y el informe de la última corrida de "los ojos" en GitHub (release "diagnostico").
# Uso: bash tools/capturas.sh [carpeta_destino] [filtro]
#   bash tools/capturas.sh /tmp/shots        → todas
#   bash tools/capturas.sh /tmp/shots gemini → solo las que empiezan por "gemini"
set -e
DEST="${1:-./capturas}"
FILTRO="${2:-}"
REPO="aedojoseeduardo9-bit/StarNova"
BASE="https://github.com/$REPO/releases/download/diagnostico"
mkdir -p "$DEST"
curl -sSL -f -o "$DEST/report.txt" "$BASE/report.txt" || { echo "Todavía no hay informe (release diagnostico)"; exit 1; }
curl -sSL -f -o "$DEST/capturas.zip" "$BASE/capturas.zip" && (cd "$DEST" && unzip -oq capturas.zip "${FILTRO}*.png" 2>/dev/null; rm -f capturas.zip)
ls "$DEST" | grep -c png | sed 's/^/capturas: /'
echo "== fallos o errores:"
grep -E "ERROR|FALLO" "$DEST/report.txt" || echo "ninguno"
