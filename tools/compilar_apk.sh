#!/usr/bin/env bash
# Compila la app de Android (Godot) en el contenedor, sin GitHub. Uso: bash tools/compilar_apk.sh <carpeta_cache>
# Descarga (solo la primera vez) Godot 4.7 con sus plantillas y el SDK de Android 36 en <carpeta_cache>.
# Firma con una llave LOCAL (se crea en la caché): esa APK no se instala encima de la de GitHub (habría que desinstalar).
set -e
C="$(mkdir -p "${1:?falta la carpeta de caché}" && cd "$1" && pwd)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V="4.7-stable"
G="$C/godot/Godot_v${V}_linux.x86_64"
T="$HOME/.local/share/godot/export_templates/4.7.stable"
if [ ! -x "$G" ]; then
  mkdir -p "$C/godot"
  curl -sSL -f -o "$C/g.zip" "https://github.com/godotengine/godot/releases/download/$V/Godot_v${V}_linux.x86_64.zip"
  (cd "$C/godot" && unzip -q -o ../g.zip && rm ../g.zip)
fi
if [ ! -f "$T/android_release.apk" ]; then
  mkdir -p "$T"
  curl -sSL -f -o "$C/t.tpz" "https://github.com/godotengine/godot/releases/download/$V/Godot_v${V}_export_templates.tpz"
  (cd "$C" && unzip -q -o t.tpz -d tpl && cp -r tpl/templates/* "$T/" && rm -rf t.tpz tpl)
fi
if [ ! -d "$C/sdk/platforms/android-36" ]; then
  curl -sSL -f -o "$C/cmdtools.zip" https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
  mkdir -p "$C/sdk/cmdline-tools" && (cd "$C" && unzip -q -o cmdtools.zip -d sdk/cmdline-tools && rm cmdtools.zip)
  mv "$C/sdk/cmdline-tools/cmdline-tools" "$C/sdk/cmdline-tools/latest" 2>/dev/null || true
  yes | "$C/sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$C/sdk" --licenses > /dev/null 2>&1 || true
  "$C/sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$C/sdk" "platforms;android-36" "build-tools;36.0.0" "platform-tools" > /dev/null
fi
if [ ! -f "$C/local.jks" ]; then
  openssl rand -hex 16 > "$C/local_pass.txt"
  keytool -genkeypair -keystore "$C/local.jks" -storepass "$(cat "$C/local_pass.txt")" -keypass "$(cat "$C/local_pass.txt")" \
    -alias starnova -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Star Nova local, O=nioro, C=CL" > /dev/null 2>&1
fi
S="$HOME/.config/godot/editor_settings-4.7.tres"
"$G" --headless --path "$ROOT/godot" --quit > /dev/null 2>&1 || true
if [ -f "$S" ]; then
  grep -q "^export/android/android_sdk_path" "$S" && sed -i "s#^export/android/android_sdk_path = .*#export/android/android_sdk_path = \"$C/sdk\"#" "$S" \
    || echo "export/android/android_sdk_path = \"$C/sdk\"" >> "$S"
fi
export GODOT_ANDROID_KEYSTORE_RELEASE_PATH="$C/local.jks" GODOT_ANDROID_KEYSTORE_RELEASE_USER=starnova
GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD="$(cat "$C/local_pass.txt")"
export GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD
python3 "$ROOT/godot/tools/hd_mundo.py"
"$G" --headless --path "$ROOT/godot" --import > /dev/null 2>&1 || true
mkdir -p "$ROOT/godot/build/android"
"$G" --headless --path "$ROOT/godot" --export-release Android "$ROOT/godot/build/android/StarNova.apk"
cp "$ROOT/godot/build/android/StarNova.apk" "$C/StarNova.apk"
echo "APK lista: $C/StarNova.apk"
