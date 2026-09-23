# TransportManager 🚍

Sistema Full-Stack de Gestión de Transporte, Pasajeros, Control de Cobros e Itinerarios Semanales con integración de mapas interactivos, geolocalización, modo offline y sincronización en la nube.

Construido con **Astro 5 (SSR)**, **Vue 3 (Composition API)**, **Tailwind CSS**, **Cloudflare (Pages + D1)** y **Capacitor** para Android.

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
   - **Modo Nube (Cloudflare D1):** Base de datos SQLite serverless de alta velocidad.
   - **Asistente de Migración:** Al iniciar sesión o registrarse, permite migrar los datos locales a la nube con un solo clic.

4. **Multi-idioma (i18n):**
   - Soporte para **Español (ES)** e **Inglés (EN)** con selector interactivo y persistencia local.

5. **Modo Oscuro / Modo Claro (Dark & Light Theme):**
   - Tema adaptable con botón Sol/Luna en el Header y script anti-parpadeo.
   - Adaptación completa en todos los componentes, modales y mapas.

6. **Historial de Pagos y Recibos:**
   - Registro de transacciones tanto general como individual por pasajero.
   - Métricas de ingresos recaudados y conteo de cobros.

7. **Sistema de Notificaciones y Recordatorios de Recogida:**
   - Permisos nativos del navegador con Web Notifications API y alerta sonora sintetizada (Web Audio API).
   - Botón toggle de campana individual en cada tarjeta de pasajero con selector de anticipación (10m, 15m, 30m, 45m, 60m).
   - Centro de notificaciones (`ModalNotificaciones.vue`) con vista de paradas del día y cuenta regresiva.

8. **Diseño 100% Responsivo Móvil:**
   - Modales teletransportados al nodo raíz (`<Teleport to="body">`) con difuminado completo de fondo.
   - Sin desbordamiento horizontal en pantallas pequeñas.

---

## 📂 Estructura del Proyecto

```text
├── src/
│   ├── components/
│   │   ├── AppHeader.vue                   # Header con selector de idioma, tema y menú de usuario
│   │   ├── AppFooter.vue                   # Footer profesional con accesos rápidos y estado
│   │   ├── InputDireccionAutocomplete.vue  # Autocompletado de calles con OpenStreetMap
│   │   ├── MapaRuta.vue                    # Mapa interactivo Leaflet para tarjeta de pasajero
│   │   ├── ModalAuth.vue                   # Modal de inicio de sesión, registro y migración
│   │   ├── ModalHistorialPagos.vue         # Modal de historial de recibos y totales recaudados
│   │   ├── ModalNotificaciones.vue         # Modal de configuración de notificaciones y permisos
│   │   ├── ModalNuevoPasajero.vue          # Modal de creación y edición de pasajero e itinerarios
│   │   ├── SelectorMapaModal.vue           # Selector y ajuste manual de pines en mapa interactivo
│   │   ├── StatsDashboard.vue              # Dashboard con métricas de cobro y filtros rápidos
│   │   ├── TarjetaPasajero.vue             # Tarjeta unificada interactiva de pasajero
│   │   └── TransportApp.vue                # Orquestador principal de la aplicación en Vue 3
│   ├── layouts/
│   │   └── Layout.astro                    # Layout HTML con script anti-flicker de tema
│   ├── lib/
│   │   ├── auth.ts                         # Helpers de sesión y autenticación
│   │   ├── db.ts                           # Conexión a Cloudflare D1
│   │   ├── i18n.ts                         # Motor y diccionario de multi-idioma (ES / EN)
│   │   ├── storage.ts                      # Manejador de persistencia en localStorage
│   │   └── theme.ts                        # Gestor de tema claro / oscuro
│   ├── pages/
│   │   ├── api/                            # Endpoints REST para Cloudflare D1
│   │   └── index.astro                     # Página principal SSR
│   ├── styles/
│   │   └── global.css                      # Tailwind base y estilos personalizados
│   └── types/
│       └── index.ts                        # Tipos e interfaces TypeScript
├── PROJECT_CONTEXT.md                      # Documentación completa de contexto y arquitectura
├── AGENTS.md                               # Guía operativa para agentes de IA
├── schema.sql                              # Esquema de base de datos D1
├── wrangler.toml                           # Configuración Cloudflare
└── package.json
```

---

## 🚀 Comandos de Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo local
npm run dev

# Compilar para producción
npm run build
```

Para más detalles técnicos de arquitectura y reglas de diseño, consulta [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).
