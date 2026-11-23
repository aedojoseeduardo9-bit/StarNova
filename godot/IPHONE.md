# Star Nova en iPhone y iPad

Apple solo deja instalar apps que se firman en un Mac con Xcode. Por eso aquí va el **proyecto de Xcode** listo:

1. En un Mac, instala **Xcode** (gratis, en la App Store).
2. Descomprime `StarNova_iOS_Xcode.zip` y abre `ios/StarNova.xcodeproj`.
3. En Xcode: **Settings → Accounts** y entra con tu Apple ID (sirve la cuenta gratuita).
4. Elige el proyecto **StarNova** → pestaña **Signing & Capabilities** → en **Team** elige tu cuenta.
   Si Xcode se queja del identificador, cambia `com.nioro.starnova` por otro único (por ejemplo, con tu nombre).
5. Conecta el iPhone o iPad con el cable, elígelo arriba y pulsa **▶ (Run)**.
6. La primera vez, en el iPhone: **Ajustes → General → VPN y gestión de dispositivos** → confía en tu cuenta.

Con la cuenta gratuita la app dura 7 días (luego se vuelve a instalar igual). Con la cuenta de desarrollador
(99 USD al año) dura un año y se puede subir a TestFlight o a la App Store.

**Partidas:** en otro aparato, Menú → Sistema → «Copiar código de la partida». En el iPhone: Perfiles → «Importar partida».
