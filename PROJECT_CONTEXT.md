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
- **Móvil (PWA / Híbrido):** Capacitor (`@capacitor/android`) listo para compilar en APK de Android.

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
   - Banner visible e indicador en header informando que los datos residen en el dispositivo.

2. **Modo Cloudflare D1 (Nube):**
   - Autenticación con JWT / sesión (`usuarios`).
   - Sincronización multi-dispositivo y respaldo en Cloudflare D1.
   - Migración automática: si el usuario crea pasajeros en local y luego inicia sesión o se registra, un asistente modal le pregunta si desea transferir sus datos locales a su cuenta en la nube con un solo clic.

---

## 🌐 3. Sistema de Internacionalización (i18n)

Ubicación: [`src/lib/i18n.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/i18n.ts)

- **Idiomas soportados:** Español (`es`, por defecto) e Inglés (`en`).
- **Reactividad:** `ref<Locale>` reactivo con función helper `useI18n()`.
- **Persistencia:** Almacenado en `localStorage` bajo la clave `transport_manager_lang`.
- **Selector:** Menú desplegable profesional con banderas (`🇪🇸 Español`, `🇺🇸 English`) integrado en el Header.
- **Alcance de traducción:** Cubre el 100% de la interfaz:
  - Header, footer y barra de estado.
  - Dashboard de estadísticas y filtros de cobro.
  - Tarjetas de pasajeros, estados de pago y badges de itinerario.
  - Formulario de creación/edición de pasajeros y días de la semana.
  - Modal de historial de pagos y recibos.
  - Modal de autenticación y diálogos de migración.

---

## 🌓 4. Sistema de Temas (Modo Oscuro / Modo Claro)

Ubicación: [`src/lib/theme.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/theme.ts)

- **Temas:** `dark` (predeterminado) y `light`.
- **Anti-Flicker:** Script en línea en el `<head>` de [`Layout.astro`](file:///c:/Users/user/Documents/admitracionTransporte/src/layouts/Layout.astro) que detecta la preferencia guardada en `localStorage.getItem('transport_manager_theme')` o el esquema del sistema antes de renderizar el DOM, evitando destellos blancos u oscuros.
- **Selector:** Botón interactivo Sol/Luna (Sun/Moon) en el Header con micro-animaciones.
- **Diseño visual:**
  - **Dark:** `bg-slate-900 / bg-slate-950`, bordes `border-slate-800`, textos `text-slate-100 / text-white`.
  - **Light:** `bg-slate-100 / bg-white`, bordes `border-slate-200`, textos `text-slate-900`, tarjetas blancas con sombras suaves.

---

## 📱 5. Componentes Principales y Estado de Implementación

### A. [`AppHeader.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/AppHeader.vue)
- Logo y marca `TransportManager`.
- Badge dinámico de estado: `Sincronizado Nube` (verde) o `Modo Local` (ámbar con tooltip explicativo).
- Botón toggle de tema claro / oscuro.
- Menú desplegable de selección de idioma con banderas.
- Botón de perfil con menú desplegable (Avatar del usuario, botón de iniciar sesión o cerrar sesión).

### B. [`AppFooter.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/AppFooter.vue)
- Pie de página profesional con información del sistema y estado de conexión.
- Accesos rápidos a creación de pasajeros e historial de cobros.
- Indicador de versión y créditos.

### C. [`TransportApp.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/TransportApp.vue)
- Componente orquestador raíz en Vue 3 montado en `index.astro` con `client:only="vue"`.
- Maneja el ciclo de vida de pasajeros (carga, filtrado, búsqueda por texto, borrado y actualización de cobros).
- Controla la apertura de los 3 modales principales mediante `<Teleport to="body">`.

### D. [`StatsDashboard.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/StatsDashboard.vue)
- Métricas rápidas: Total de pasajeros, total recaudado, cobros pendientes y próximos vencimientos.
- Botones de filtrado rápido: `Todos`, `Pendientes`, `Pagados`, `Vencidos`.

### E. [`TarjetaPasajero.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/TarjetaPasajero.vue)
- Tarjeta individual completa de pasajero con pestañas por día de la semana.
- Enlace directo a WhatsApp con mensaje preconfigurado y llamada telefónica.
- Botón toggle interactivo de pago `[ Pagado / Pendiente ]`.
- Integración de [`MapaRuta.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/MapaRuta.vue) con Leaflet: trazo de ruta entre punto de recogida (verde) y destino (rojo).

### F. [`ModalNuevoPasajero.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalNuevoPasajero.vue)
- Formulario de alta y edición de pasajero.
- **Plan de cobro:** Monto, modalidad (semanal, quincenal, mensual) y fecha de corte.
- **Itinerario multi-día y multi-parada:**
  - Selección de días (Lunes a Domingo) con presets rápidos (`Lun a Vie`, `Todos`).
  - Múltiples tramos por día con horarios independientes.
  - Botón **"Copiar día"**, **"Pegar día"** y **"A todos"** para clonar itinerarios sin reescribir.
  - Botón **"+ Regreso invertido"** para generar automáticamente la ruta de vuelta invirtiendo origen y destino.
- **Autocompletado y Geolocalización:**
  - [`InputDireccionAutocomplete.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/InputDireccionAutocomplete.vue): Búsqueda en tiempo real mediante OpenStreetMap Nominatim.
  - [`SelectorMapaModal.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/SelectorMapaModal.vue): Ajuste manual de pines arrastrando sobre mapa interactivo Leaflet.
- **Adaptación móvil y de tema:**
  - Sin desbordamiento horizontal en pantallas pequeñas (`overflow-x-hidden`, contenedores responsivos).
  - Teleport a `<body>` con difuminado completo de fondo sin cortes superiores.

### G. [`ModalHistorialPagos.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalHistorialPagos.vue)
- Registro de transacciones y cobros realizados tanto a nivel general como por pasajero específico.
- Métricas de total cobrado, número de recibos y última fecha de pago.

### H. [`ModalAuth.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalAuth.vue)
- Pestañas de Iniciar Sesión y Registro con validación.
- Soporte para migración de datos locales a la nube con confirmación interactiva.

### I. [`ModalNotificaciones.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalNotificaciones.vue)
- Centro de control de recordatorios y avisos de recogida previos al horario de cada pasajero.
- Gestión interactiva de permisos del navegador (`Notification.requestPermission()`).
- Envío de notificación de prueba con campanilla sonora sintetizada (Web Audio API).
- Configuración de tiempo de anticipación por defecto (10m, 15m, 30m, 45m, 60m), alertas sonoras y banners in-app.
- Itinerario en tiempo real de paradas programadas para el día de hoy con indicación de avisos inminentes y cuenta regresiva.

---

## 🗄️ 6. Esquema de Base de Datos (Cloudflare D1)

Archivo: [`schema.sql`](file:///c:/Users/user/Documents/admitracionTransporte/schema.sql)

Tablas principales:
1. `usuarios`: Cuentas registradas (id, email, password_hash, nombre, fecha_registro).
2. `pasajeros`: Ficha de pasajeros (id, usuario_id, nombre, telefono, notas, activo).
3. `suscripciones_pagos`: Planes contratados (pasajero_id, modalidad, monto, estado_pago, fecha_corte).
4. `rutas_horarios`: Paradas e itinerarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat_inicio, lng_inicio, lat_destino, lng_destino).
5. `historial_pagos`: Bitácora inmutable de pagos registrados (pasajero_id, monto_pagado, fecha_pago, modalidad, periodo_cubierto).

---

## 💻 7. Comandos y Flujo de Trabajo

```bash
# Iniciar servidor de desarrollo local
npm run dev

# Compilar para producción (validación de tipos y bundle de Cloudflare)
npm run build

# Desplegar en Cloudflare Pages
npx wrangler pages deploy dist

# Ejecutar migraciones en Cloudflare D1 local o remoto
npx wrangler d1 execute transport-db --local --file=./schema.sql
npx wrangler d1 execute transport-db --remote --file=./schema.sql
```

---

## 📌 8. Buenas Prácticas y Reglas de Desarrollo en este Repositorio

1. **Modales:** Siempre envolver el contenedor raíz del diálogo en `<Teleport to="body">` y activar el bloqueo de scroll (`document.body.style.overflow = 'hidden'`) para garantizar que el difuminado cubra `100vw × 100vh` sin importar contextos de apilamiento.
2. **Mobile First:** Ningún componente o formulario debe generar scroll horizontal (`overflow-x`) en anchos móviles estándar (360px a 420px). Utilizar `min-w-0`, `max-w-full` y `flex-wrap` en barras de botones.
3. **Soporte Dual de Tema:** Todo elemento visual nuevo debe incluir clases para Modo Claro y Modo Oscuro (ejemplo: `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white`).
4. **Textos y Multi-idioma:** No codificar cadenas fijas en español o inglés directamente en los componentes visuales; registrar las claves en [`src/lib/i18n.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/i18n.ts) bajo `translations.es` y `translations.en` y consumirlas mediante `t.seccion.clave`.
5. **Persistencia Híbrida:** Al añadir nuevas entidades o campos a los pasajeros, actualizar simultáneamente los helpers en [`src/lib/storage.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/storage.ts) (para modo local) y los endpoints en `src/pages/api/` (para Cloudflare D1).

---

## 📱 9. Aplicación Móvil Android & CI/CD Automatizado

1. **Arquitectura Móvil:**
   - Construida con **Capacitor 7** sobre Android (`android/`).
   - Modo 100% offline nativo mediante entrada prerenderizada [`src/pages/mobile.astro`](file:///c:/Users/user/Documents/admitracionTransporte/src/pages/mobile.astro) que se copia a `dist/index.html` vía [`scripts/prepare-mobile.mjs`](file:///c:/Users/user/Documents/admitracionTransporte/scripts/prepare-mobile.mjs).
   - Comando de compilación y sincronización móvil: `npm run build:mobile`.

2. **Compilación y Publicación Continua (GitHub Actions):**
   - Workflow en [`.github/workflows/build-apk.yml`](file:///c:/Users/user/Documents/admitracionTransporte/.github/workflows/build-apk.yml).
   - Se ejecuta en cada `push` a `main` o ejecución manual.
   - Compila el proyecto con Java 17, Android SDK y Gradle (`assembleDebug`).
   - Publica o actualiza el release `latest` en GitHub Releases con el binario `TransportManager.apk`.
   - Enlace permanente de descarga directa:
     `https://github.com/sequeira95/transport-manager/releases/latest/download/TransportManager.apk`

3. **Experiencia de Descarga y Auto-Actualización:**
   - **Banner Inteligente:** [`src/components/BannerDescargaApp.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/BannerDescargaApp.vue) se muestra a visitantes en dispositivos Android.
   - **Modal de Descarga:** [`src/components/ModalDescargaApp.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/ModalDescargaApp.vue) incluye botón directo, código QR para escanear desde PC y guía de instalación en 3 pasos.
   - **Acceso Permanente:** Botón de descarga en el footer ([`src/components/AppFooter.vue`](file:///c:/Users/user/Documents/admitracionTransporte/src/components/AppFooter.vue)).
   - **Auto-Update In-App:** [`src/lib/appUpdater.ts`](file:///c:/Users/user/Documents/admitracionTransporte/src/lib/appUpdater.ts) consulta silenciosamente la API de GitHub Releases para notificar al usuario cuando hay una nueva versión del APK disponible para instalar con 1 toque.

