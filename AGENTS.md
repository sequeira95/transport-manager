# AGENTS.md — Instrucciones y Contexto para Agentes de IA

Este archivo contiene el contexto fundamental y las directrices operativas obligatorias para cualquier agente de IA (Antigravity, Gemini, Copilot, etc.) que trabaje en este repositorio.

Consulta el documento maestro detallado en: [PROJECT_CONTEXT.md](file:///c:/Users/user/Documents/admitracionTransporte/PROJECT_CONTEXT.md)

---

## 🛑 Regla de Oro sobre Git (Control de Versiones)

> [!CAUTION]
> **NUNCA ejecutes `git commit` ni `git push` de forma autónoma o automática.**
> - Todos los cambios deben quedar en el árbol de trabajo local (`working tree`) para que el usuario pueda revisarlos e inspeccionarlos.
> - Solo se debe hacer `git commit` o `git push` si el usuario lo solicita o autoriza expresamente en el chat.

---

## 🧭 Resumen Rápido del Repositorio

- **Proyecto:** `Passengo` — Sistema full-stack para administración de pasajeros, rutas de transporte, itinerarios semanales y control de cobros.
- **Stack Web:** Astro 5 SSR (`@astrojs/cloudflare`), Vue 3 (Composition API con `<script setup lang="ts">`), Tailwind CSS, Leaflet Maps + OpenStreetMap Nominatim, Cloudflare D1 + LocalStorage.
- **Stack Móvil:** Capacitor 7 (`@capacitor/android`) + Capgo OTA (`@capgo/capacitor-updater`) para actualizaciones instantáneas en segundo plano.
- **Persistencia Híbrida:**
  - Si no hay sesión iniciada (`!usuarioActual`), la app opera en **Modo Local** (`src/lib/storage.ts`) usando `localStorage`.
  - Si hay sesión, opera en **Modo Nube** con Cloudflare D1 (`src/pages/api/`).
  - Al iniciar sesión o registrarse, se ofrece un asistente modal para migrar los datos locales a la nube con un solo clic.

---

## 🎯 Regla de Versiones (Single Source of Truth)

- **Única fuente de verdad:** La versión del proyecto se define **EXCLUSIVAMENTE** en `package.json` (`"version": "x.y.z"`).
- **Frontend:** Se consume a través de [`src/lib/version.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/version.ts) (`APP_VERSION`). **Nunca** escribir cadenas de versión quemadas o fijas (hardcodeadas) en componentes o modales.
- **Android:** [`android/app/build.gradle`](file:///c:/Users/user/Documents/admitracionTransporte/android/app/build.gradle) lee dinámicamente `versionName` y calcula `versionCode` desde `package.json`. No editar la versión en Gradle.
- **CI/CD:** [`.github/workflows/build-apk.yml`](file:///c:/Users/user/Documents/admitracionTransporte/.github/workflows/build-apk.yml) lee `package.json` para nombrar las etiquetas de release (`vX.Y.Z`).

---

## 📱 Sistema Móvil y Actualizaciones OTA (Capgo)

1. **Actualizaciones OTA (Over-The-Air):**
   - El script [`scripts/create-ota-bundle.mjs`](file:///c:/Users/user/Documents/admitracionTransporte/scripts/create-ota-bundle.mjs) empaqueta el frontend en `dist.zip` (~170 KB).
   - GitHub Actions publica tanto `Passengo.apk` como `dist.zip` en cada release.
   - En la app Android, las actualizaciones web se descargan de forma **100% invisible y silenciosa en segundo plano** vía Capgo y se aplican en el próximo inicio sin molestar al usuario.
2. **Actualizaciones APK Tradicionales:**
   - Solo se muestra el modal de actualización de APK si la nueva versión requiere cambios nativos de Java/Android o nuevos permisos en `AndroidManifest.xml`.
3. **Firma Digital (Keystore):**
   - Todas las compilaciones locales y de CI/CD se firman con la clave permanente [`android/app/passengo.keystore`](file:///c:/Users/user/Documents/admitracionTransporte/android/app/passengo.keystore) configurada en `signingConfigs.appSign` de Gradle.

---

## 🎨 Reglas de UI y Diseño Obligatorias

1. **Modo Oscuro y Claro:**
   - La aplicación soporta ambos temas de forma reactiva ([`src/lib/theme.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/theme.ts)) con persistencia en `transport_manager_theme`.
   - Todos los componentes y modales deben tener clases adaptativas: `bg-white dark:bg-slate-900`, `border-slate-200 dark:border-slate-800`, `text-slate-900 dark:text-white`.

2. **Modales y Diálogos:**
   - Todo modal debe estar envuelto en `<Teleport to="body">` con `position: fixed; inset: 0; z-50` y difuminado completo `bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md` para cubrir la totalidad del viewport sin cortes superiores.
   - Debe implementar bloqueo de scroll en el `body` (`document.body.style.overflow = 'hidden'`) mientras esté abierto.

3. **Responsive Móvil:**
   - Ningún contenedor puede provocar scroll horizontal (`overflow-x`) en pantallas móviles (360px–420px).
   - Siempre usar `min-w-0`, `max-w-full`, `overflow-x-hidden` en cuerpos de modales y pestañas con scroll horizontal táctil suave (`scrollbar-none`).

4. **Multi-idioma (i18n):**
   - Siempre usar el diccionario centralizado en [`src/lib/i18n.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/i18n.ts) (`translations.es` y `translations.en`). **Nunca escribir textos en español o inglés fijos en el template**.

---

## 🧪 Validación Obligatoria

Antes de dar por finalizada cualquier tarea o respuesta, siempre verificar compilación limpia con:
```bash
npm run build
```
El build debe completarse con código de salida 0.
