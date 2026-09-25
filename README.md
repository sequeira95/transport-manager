# Passengo 🚍

Sistema Full-Stack de Gestión de Transporte, Pasajeros, Control de Cobros e Itinerarios Semanales con integración de mapas interactivos, geolocalización, modo offline, sincronización en la nube y aplicación móvil con actualizaciones automáticas Over-The-Air (OTA).

Construido con **Astro 5 (SSR)**, **Vue 3 (Composition API)**, **Tailwind CSS**, **Cloudflare (Pages + D1)** y **Capacitor 7** para Android con soporte **Capgo OTA**.

---

## 🌟 Características Principales

1. **Tarjetas Unificadas de Pasajero:**
   - **Información Directa:** Nombre, teléfono con enlace directo a WhatsApp y llamada telefónica.
   - **Gestión Interactiva de Cobro:** Tarifa, modalidad (semanal, quincenal, mensual), fechas de corte y botón interactivo `[ Pagado / Pendiente ]` que persiste el estado en tiempo real.
   - **Itinerario Semanal Multidía:** Navegación por pestañas de días (Lunes a Domingo), mostrando horarios de recogida y direcciones de cada tramo.
   - **Mapa Dinámico con Leaflet + OpenStreetMap:** Marcadores visuales de recogida (verde) y destino (rojo) unidos por la traza del recorrido para el día seleccionado.

2. **Formulario Inteligente de Pasajeros:**
   - **Autocompletado de Direcciones en Tiempo Real:** Motor Nominatim (OpenStreetMap) con priorización según GPS del dispositivo.
   - **Ajuste Manual de Pines en Mapa:** Selector interactivo de coordenadas arrastrando los marcadores en el mapa.
   - **Herramientas de Productividad:** Atajos de **"Copiar día"**, **"Pegar"**, **"A todos"** y **"+ Regreso invertido"** para duplicar itinerarios en segundos.

3. **Arquitectura de Persistencia Híbrida (Offline-First):**
   - **Modo Invitado / Local:** Funciona inmediatamente sin registro utilizando `localStorage`.
   - **Modo Nube (Cloudflare D1):** Base de datos SQLite serverless distribuida de alta velocidad.
   - **Asistente de Migración:** Al iniciar sesión o registrarse, permite migrar los datos locales a la nube con un solo clic.

4. **Multi-idioma (i18n):**
   - Soporte para **Español (ES)** e **Inglés (EN)** con selector interactivo y persistencia local.

5. **Modo Oscuro / Modo Claro (Dark & Light Theme):**
   - Tema adaptable con botón Sol/Luna en el Header y script anti-parpadeo para evitar destellos al cargar.

6. **Historial de Pagos y Recibos:**
   - Registro de transacciones tanto general como individual por pasajero, con métricas de recaudación.

7. **Sistema de Notificaciones y Recordatorios de Recogida:**
   - Web Notifications API y alerta sonora sintetizada (Web Audio API) con selector de anticipación (10m, 15m, 30m, etc.).

8. **Aplicación Móvil Android con Actualizaciones OTA:**
   - **Actualizaciones Silenciosas (Capgo OTA):** Los cambios de interfaz y lógica web se descargan en segundo plano de forma invisible en paquetes ligeros (~170 KB) sin pedir permisos ni instalar APKs.
   - **Firma Persistente:** APK firmado con keystore permanente propio para garantizar actualizaciones sin conflictos.
   - **CI/CD Automatizado:** Cada push a `main` compila y publica automáticamente el APK y el paquete OTA en GitHub Releases.

9. **Versión Centralizada:**
   - Controlada en un único punto desde `package.json`, sincronizando automáticamente la web, la app móvil y Gradle.

---

## 📂 Estructura del Proyecto

```text
├── android/                                # Proyecto nativo Android (Capacitor 7)
│   └── app/
│       ├── build.gradle                    # Configuración Gradle con versión dinámica
│       └── passengo.keystore               # Certificado de firma digital permanente
├── scripts/
│   ├── prepare-mobile.mjs                  # Preparación de index.html para entorno móvil
│   └── create-ota-bundle.mjs               # Empaquetador de dist.zip para Capgo OTA
├── src/
│   ├── components/
│   │   ├── AppHeader.vue                   # Header con selector de idioma, tema y perfil
│   │   ├── AppFooter.vue                   # Footer con estado, accesos y versión dinámica
│   │   ├── BannerDescargaApp.vue           # Notificación inteligente de descarga/actualización
│   │   ├── InputDireccionAutocomplete.vue  # Autocompletado de calles con Nominatim
│   │   ├── MapaRuta.vue                    # Mapa interactivo Leaflet para tarjeta de pasajero
│   │   ├── ModalActualizacionApp.vue       # Modal para instalación de APK
│   │   ├── ModalAuth.vue                   # Inicio de sesión, registro y migración
│   │   ├── ModalDescargaApp.vue            # Modal con QR y descarga directa del APK
│   │   ├── ModalHistorialPagos.vue         # Historial de recibos y totales recaudados
│   │   ├── ModalNotificaciones.vue         # Centro de recordatorios de recogida
│   │   ├── ModalNuevoPasajero.vue          # Formulario de alta y edición con itinerarios
│   │   ├── SelectorMapaModal.vue           # Selector y ajuste manual de pines en mapa
│   │   ├── StatsDashboard.vue              # Métricas de cobro y filtros rápidos
│   │   ├── TarjetaPasajero.vue             # Tarjeta interactiva de pasajero
│   │   └── TransportApp.vue                # Orquestador principal de la app en Vue 3
│   ├── layouts/
│   │   └── Layout.astro                    # Layout HTML con script anti-flicker de tema
│   ├── lib/
│   │   ├── api.ts                          # Cliente HTTP para endpoints REST
│   │   ├── appUpdater.ts                   # Gestor híbrido de actualizaciones OTA + APK
│   │   ├── auth.ts                         # Helpers de sesión y JWT
│   │   ├── db.ts                           # Conexión a Cloudflare D1
│   │   ├── i18n.ts                         # Motor y diccionario multi-idioma (ES / EN)
│   │   ├── notifications.ts                # Programador de notificaciones sonoras y web
│   │   ├── platform.ts                     # Detección de plataforma (Nativo, Móvil, PC)
│   │   ├── storage.ts                      # Persistencia en localStorage (modo offline)
│   │   ├── theme.ts                        # Gestor de tema claro / oscuro
│   │   └── version.ts                      # Constante centralizada de versión del proyecto
│   ├── pages/
│   │   ├── api/                            # Endpoints REST para Cloudflare D1
│   │   ├── mobile.astro                    # Entrada SPA prerenderizada para Capacitor
│   │   └── index.astro                     # Página principal SSR
│   ├── styles/
│   │   └── global.css                      # Tailwind base y estilos personalizados
│   └── types/
│       └── index.ts                        # Tipos e interfaces TypeScript
├── .github/
│   └── workflows/
│       └── build-apk.yml                   # CI/CD: Compilación de APK + paquete OTA
├── PROJECT_CONTEXT.md                      # Documentación maestra de arquitectura
├── AGENTS.md                               # Directrices operativas para agentes de IA
├── capacitor.config.json                   # Configuración de Capacitor y Capgo
├── schema.sql                              # Esquema de base de datos Cloudflare D1
├── wrangler.toml                           # Configuración de Cloudflare Pages y D1
└── package.json                            # Dependencias, scripts y versión única
```

---

## 🚀 Comandos Principales

```bash
# Iniciar servidor de desarrollo local
npm run dev

# Compilar para producción (validación de build)
npm run build

# Desplegar en Cloudflare Pages
npm run deploy

# Compilar frontend móvil y sincronizar con Android
npm run build:mobile

# Crear paquete OTA manualmente (dist.zip)
npm run bundle:ota

# Ejecutar migraciones en Cloudflare D1
npm run db:migrate:local
npm run db:migrate:prod
```

Para directrices de desarrollo, diseño y arquitectura en profundidad, consulta [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) y [AGENTS.md](./AGENTS.md).
