#!/usr/bin/env bash
# Sube report.txt y las capturas de tools/ojos.cjs al release "diagnostico" (prerelease).
set +e
cd "${1:-ojos}" || exit 0
[ -f report.txt ] || echo "No se generó informe" > report.txt
{ echo "Rama: ${GITHUB_REF_NAME:-?} · commit ${GITHUB_SHA:0:7} · ejecución #${GITHUB_RUN_NUMBER:-?}"; echo; cat report.txt; } \
  | head -c 60000 > notes.txt
gh release delete diagnostico --yes --cleanup-tag || true
gh release create diagnostico --title "Diagnóstico (ojos)" --notes-file notes.txt --prerelease || echo "No se pudo crear el release"
ls *.png > /dev/null 2>&1 && zip -q capturas.zip *.png
for f in report.txt capturas.zip; do
  [ -f "$f" ] && { gh release upload diagnostico "$f" --clobber || echo "No se pudo subir $f"; }
done
exit 0
