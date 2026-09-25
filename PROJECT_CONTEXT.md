# 📋 CONTEXTO DEL PROYECTO: Passengo

Este documento sirve como **fuente única de verdad (Single Source of Truth) y guía contextual** para cualquier sesión de desarrollo, mantenimiento o intervención de agentes de IA en este repositorio.

---

## 🚀 1. Visión General del Proyecto

**Passengo** es una plataforma web y móvil full-stack de administración integral de transporte de pasajeros, control de pagos recurrentes, itinerarios semanales y cálculo de rutas con geolocalización.

### Tecnologías Clave:
- **Framework Web:** [Astro 5](https://astro.build/) en modo SSR (`output: 'server'`).
- **Adaptador:** `@astrojs/cloudflare` para despliegue en Cloudflare Pages / Workers.
- **Frontend Reactivo:** [Vue 3](https://vuejs.org/) (Composition API con `<script setup lang="ts">`).
- **Estilos:** Tailwind CSS con arquitectura de diseño personalizado en Modo Oscuro y Modo Claro.
- **Base de Datos Principal:** Cloudflare D1 (SQLite serverless distribuido).
- **Almacenamiento Local (Offline-first):** `localStorage` para modo invitado con sincronización opcional a la nube.
- **Mapas y Geolocalización:** Leaflet 1.9 + OpenStreetMap + motor Nominatim para autocompletado de direcciones en tiempo real y detección GPS del navegador.
- **Móvil Híbrido:** [Capacitor 7](https://capacitorjs.com/) sobre Android nativo.
- **Actualizaciones Instantáneas OTA:** [@capgo/capacitor-updater](https://capgo.app/) para actualización en segundo plano sin reinstalar APK.
- **Servicio de Correos:** Webhook de Google Apps Script (`GMAIL_WEBHOOK_URL`) con fallback a Resend API.

---

## 🛠️ 2. Arquitectura de Datos y Modos de Operación

La aplicación opera bajo un **modelo híbrido de doble motor de persistencia**:

```
                              ┌───────────────────────────────────────────────┐
                              │             TransportApp.vue                  │
                              └───────┬───────────────────────────────┬───────┘
                                      │                               │
                 [Sin Sesión: Modo Invitado]              [Con Sesión: Modo Nube]
                                      │                               │
                                      ▼                               ▼
                           ┌────────────────────┐          ┌────────────────────┐
                           │   localStorage     │          │   Cloudflare D1    │
                           │  (Offline-First)   │          │ (API REST Endpoints)│
                           └──────────┬─────────┘          └────────────────────┘
                                      │
                                      ▼
                      Al iniciar sesión o registrarse:
                    Prompt de migración automática de
                    datos locales a Cloudflare D1
```

1. **Modo Invitado (Local Storage):**
   - Sin necesidad de registro para probar la aplicación.
   - Datos guardados de forma segura en `localStorage` bajo claves estructuradas (`transport_manager_local_pasajeros`, etc.).
   - Indicador dinámico en header informando que los datos residen en el dispositivo.

2. **Modo Cloudflare D1 (Nube):**
   - Autenticación con JWT / sesión (`usuarios`).
   - Sincronización multi-dispositivo y respaldo en Cloudflare D1.
   - Migración automática: si el usuario crea pasajeros en local y luego inicia sesión o se registra, un asistente modal le pregunta si desea transferir sus datos locales a su cuenta en la nube con un solo clic.

---

## 🎯 3. Sistema Centralizado de Versiones (Single Source of Truth)

- **Definición única:** En [`package.json`](file:///c:/Users/user/Documents/admitracionTransporte/package.json) bajo `"version": "x.y.z"`.
- **Frontend:** Consumido reactivamente vía [`src/lib/version.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/version.ts) (`APP_VERSION`). Ningún componente debe contener números de versión quemados.
- **Android Gradle:** [`android/app/build.gradle`](file:///c:/Users/user/Documents/admitracionTransporte/android/app/build.gradle) lee dinámicamente el `versionName` y calcula automáticamente el `versionCode` matemático (ej. `1.0.4` ➔ `10004`).
- **GitHub Actions:** Lee la versión de `package.json` para publicar el release correspondiente.

---

## 🌐 4. Sistema de Internacionalización (i18n)

Ubicación: [`src/lib/i18n.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/i18n.ts)

- **Idiomas soportados:** Español (`es`, por defecto) e Inglés (`en`).
- **Reactividad:** `ref<SupportedLocale>` reactivo con función helper `useI18n()`.
- **Persistencia:** Almacenado en `localStorage` bajo la clave `tm_lang`.
- **Selector:** Menú desplegable profesional con banderas (`🇪🇸 Español`, `🇺🇸 English`) integrado en el Header.
- **Alcance de traducción:** Cubre el 100% de la interfaz (header, footer, dashboard, modales, alertas y notificaciones).

---

## 🌓 5. Sistema de Temas (Modo Oscuro / Modo Claro)

Ubicación: [`src/lib/theme.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/theme.ts)

- **Temas:** `dark` (predeterminado) y `light`.
- **Anti-Flicker:** Script en línea en el `<head>` de [`Layout.astro`](file:///c:/Users/user/Documents/admitracionTransporte/src/layouts/Layout.astro) que detecta la preferencia guardada en `localStorage.getItem('transport_manager_theme')` o el esquema del sistema antes de renderizar el DOM.
- **Selector:** Botón interactivo Sol/Luna en el Header con micro-animaciones.

---

## 📱 6. Componentes Principales

### A. [`AppHeader.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/AppHeader.vue)
- Logo y marca `Passengo`.
- Badge dinámico de estado: `Sincronizado Nube` (verde) o `Modo Local` (ámbar).
- Toggle de tema claro / oscuro y selector de idioma con banderas.
- Menú de perfil y autenticación.

### B. [`AppFooter.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/AppFooter.vue)
- Accesos rápidos a creación de pasajeros e historial de cobros.
- Indicador de versión dinámica (`APP_VERSION`).
- Botón de comprobación de actualizaciones en APK (`handleCheckUpdate`).

### C. [`TransportApp.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/TransportApp.vue)
- Orquestador raíz en Vue 3 montado en `index.astro` con `client:only="vue"`.
- Maneja ciclo de vida de pasajeros (carga, filtrado, búsqueda, eliminación y cobros).

### D. [`StatsDashboard.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/StatsDashboard.vue)
- Métricas rápidas: Total de pasajeros, recaudación mensual, cobros pendientes y próximos cortes.
- Filtros rápidos: `Todos`, `Pendientes`, `Al Día`.

### E. [`TarjetaPasajero.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/TarjetaPasajero.vue)
- Tarjeta individual con pestañas por día de la semana.
- Enlace directo a WhatsApp y llamada telefónica.
- Botón interactivo de cobro `[ Pagado / Pendiente ]`.
- Trazo de ruta en mapa interactivo con Leaflet ([`MapaRuta.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/MapaRuta.vue)).

### F. [`ModalNuevoPasajero.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalNuevoPasajero.vue)
- Formulario de alta y edición con itinerario multi-día y multi-parada.
- Autocompletado de direcciones con Nominatim ([`InputDireccionAutocomplete.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/InputDireccionAutocomplete.vue)).
- Selector de pines arrastrables en mapa ([`SelectorMapaModal.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/SelectorMapaModal.vue)).
- Herramientas de productividad: "Copiar día", "Pegar", "A todos", "+ Regreso invertido".

### G. [`ModalHistorialPagos.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalHistorialPagos.vue)
- Bitácora inmutable de transacciones, recibos y métricas de cobro.

### H. [`ModalAuth.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalAuth.vue)
- Login y Registro con soporte de verificación por código de email y migración de datos locales.

### I. [`ModalNotificaciones.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalNotificaciones.vue)
- Recordatorios de recogida con anticipación programable (10m, 15m, 30m, etc.) y campanilla sonora Web Audio API.

### J. [`ModalActualizacionApp.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalActualizacionApp.vue) y [`BannerDescargaApp.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/BannerDescargaApp.vue)
- Gestión de invitaciones de descarga en web móvil y ejecutor de actualizaciones APK obligatorias.

---

## 📱 7. Aplicación Móvil Android & Sistema de Actualizaciones Híbrido

### A. Arquitectura Nativa (Capacitor 7)
- Contenedor nativo en `android/`.
- Entrada prerenderizada en [`src/pages/mobile.astro`](file:///c:/Users/user/Documents/admitracionTransporte/src/pages/mobile.astro) sincronizada con `dist/index.html`.
- Clave de firma persistente: [`android/app/passengo.keystore`](file:///c:/Users/user/Documents/admitracionTransporte/android/app/passengo.keystore) (formato PKCS12, 25+ años de validez). Todas las compilaciones locales y de CI usan siempre este certificado.

### B. Actualizaciones Instantáneas OTA (Capgo)
- **Plugin:** `@capgo/capacitor-updater` configurado en modo *self-hosted* (`autoUpdate: false`).
- **Paquete ligero:** [`scripts/create-ota-bundle.mjs`](file:///c:/Users/user/Documents/admitracionTransporte/scripts/create-ota-bundle.mjs) genera `dist.zip` (~170 KB) excluyendo el worker de Cloudflare.
- **Flujo 100% invisible en segundo plano:**
  - Al abrir la app en Android, consulta GitHub Releases.
  - Si hay nueva versión con `dist.zip`, se descarga en ~1 segundo en segundo plano sin interrumpir al usuario ni mostrar modales.
  - Se activa el nuevo bundle para la próxima apertura de la app.
  - Cuenta con **rollback automático** si un bundle presenta errores críticos de inicio.
- **Fallback a APK completo:**
  - Si se introducen cambios nativos (nuevos permisos en `AndroidManifest.xml`, librerías Java/Kotlin o plugins nativos de Capacitor), la app recurre al instalador tradicional de `Passengo.apk`.

### C. CI/CD Automatizado (GitHub Actions)
- Archivo: [`.github/workflows/build-apk.yml`](file:///c:/Users/user/Documents/admitracionTransporte/.github/workflows/build-apk.yml).
- Se activa en cada `push` a `main`.
- Compila el APK firmado y el paquete `dist.zip`, publicándolos juntos en GitHub Releases con la etiqueta de versión correspondiente.

---

## 🗄️ 8. Esquema de Base de Datos (Cloudflare D1)

Archivo: [`schema.sql`](file:///c:/Users/user/Documents/admitracionTransporte/schema.sql)

Tablas principales:
1. `usuarios`: Cuentas registradas (id, email, password_hash, nombre, fecha_registro).
2. `pasajeros`: Ficha de pasajeros (id, usuario_id, nombre, telefono, notas, activo).
3. `suscripciones_pagos`: Planes contratados (pasajero_id, modalidad, monto, estado_pago, fecha_corte).
4. `rutas_horarios`: Paradas e itinerarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat/lng).
5. `historial_pagos`: Bitácora inmutable de pagos registrados (pasajero_id, monto_pagado, fecha_pago, modalidad, periodo_cubierto).

---

## 💻 9. Comandos de Flujo de Trabajo

```bash
# Desarrollo local
npm run dev

# Compilar para producción (validación de build SSR)
npm run build

# Desplegar en Cloudflare Pages (producción web)
npm run deploy

# Compilar frontend móvil y sincronizar con Android
npm run build:mobile

# Crear paquete OTA manualmente
npm run bundle:ota

# Ejecutar migraciones en Cloudflare D1
npm run db:migrate:local
npm run db:migrate:prod
```

---

## 📌 10. Reglas de Desarrollo Obligatorias

1. **Git:** NUNCA ejecutar `git commit` ni `git push` automáticamente. Solo por orden expresa del usuario.
2. **Versiones:** Cambiar la versión únicamente en `package.json`.
3. **Modales:** Siempre con `<Teleport to="body">` y bloqueo de scroll en el `body`.
4. **Mobile First:** Sin `overflow-x` en resoluciones móviles estándar (360px–420px).
5. **Tema Dual:** Clases adaptativas `bg-white dark:bg-slate-900 text-slate-900 dark:text-white`.
6. **i18n:** Cero textos quemados en templates; siempre usar `t.seccion.clave` en [`src/lib/i18n.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/i18n.ts).
