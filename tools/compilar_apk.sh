#!/usr/bin/env bash
# Compila la APK en el contenedor (sin depender de GitHub Actions).
# Uso: bash tools/compilar_apk.sh <carpeta_cache> [salida.apk]
# Descarga (solo la primera vez) Gradle 8.14.3 y el SDK de Android 36 en <carpeta_cache>.
# Firma con una llave local guardada en <carpeta_cache> (NUNCA en el repositorio).
# Ojo: esa llave es distinta a la de CI; una APK firmada así no se instala encima de la de GitHub (y viceversa).
set -e
C="$(cd "${1:?falta carpeta de caché}" 2>/dev/null || mkdir -p "$1" && cd "$1" && pwd)"
OUT="${2:-$C/StarNova.apk}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -x "$C/gradle-8.14.3/bin/gradle" ]; then
  curl -sSL -f -o "$C/gradle.zip" https://services.gradle.org/distributions/gradle-8.14.3-bin.zip
  (cd "$C" && unzip -q -o gradle.zip && rm gradle.zip)
fi
if [ ! -d "$C/sdk/platforms/android-36" ]; then
  curl -sSL -f -o "$C/cmdtools.zip" https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
  mkdir -p "$C/sdk/cmdline-tools" && (cd "$C" && unzip -q -o cmdtools.zip -d sdk/cmdline-tools && rm cmdtools.zip)
  mv "$C/sdk/cmdline-tools/cmdline-tools" "$C/sdk/cmdline-tools/latest" 2>/dev/null || true
  yes | "$C/sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$C/sdk" --licenses > /dev/null 2>&1 || true
  "$C/sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$C/sdk" "platforms;android-36" "build-tools;36.0.0" > /dev/null
fi
if [ ! -f "$C/local.jks" ]; then
  openssl rand -hex 16 > "$C/pass.txt"
  keytool -genkeypair -keystore "$C/local.jks" -storepass "$(cat "$C/pass.txt")" -keypass "$(cat "$C/pass.txt")" \
    -alias starnova -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Star Nova, O=nioro, C=CL" > /dev/null 2>&1
fi
mkdir -p "$ROOT/android/app/src/main/assets"
cp -r "$ROOT"/index.html "$ROOT"/manifest.webmanifest "$ROOT"/icon.svg "$ROOT"/css "$ROOT"/js "$ROOT"/vendor "$ROOT/android/app/src/main/assets/"
echo "sdk.dir=$C/sdk" > "$ROOT/android/local.properties"
export ANDROID_HOME="$C/sdk" GRADLE_USER_HOME="$C/gradle-home"
export STARNOVA_KEYSTORE="$C/local.jks" STARNOVA_KEYSTORE_PASSWORD="$(cat "$C/pass.txt")" STARNOVA_KEY_ALIAS=starnova
"$C/gradle-8.14.3/bin/gradle" -p "$ROOT/android" :app:assembleRelease --no-daemon -q
cp "$ROOT/android/app/build/outputs/apk/release/app-release.apk" "$OUT"
echo "APK lista: $OUT"
