# TransportManager 🚍

Sistema Full-Stack de Gestión de Transporte, Pasajeros, Control de Cobros e Itinerarios Semanales con integración de mapas interactivos.

Construido con **Astro (SSR)**, **Vue 3 (Composition API)**, **Cloudflare (Pages + D1)** y **Capacitor** para Android.

---

## 🌟 Características Principales

1. **Tarjetas Unificadas de Pasajero:**
   - **Información Directa:** Nombre, teléfono con enlace automático a WhatsApp y llamada telefónica directa.
   - **Gestión Interactiva de Cobro:** Tarifa, modalidad (semanal, quincenal, mensual), fechas de corte y botón interactivo `[ Pagado / Pendiente ]` que persiste el estado en Cloudflare D1 en tiempo real.
   - **Itinerario de Rutas Semanal:** Navegación por pestañas interactivas de días de la semana (Lunes a Domingo), mostrando horarios de recogida y direcciones.
   - **Mapa Dinámico con Leaflet + OpenStreetMap:** Marcadores visuales de recogida (verde) y destino (rojo) unidos por la traza del recorrido para el día seleccionado.

2. **Panel de Métricas (Dashboard):**
   - Conteo de pasajeros activos y registrados.
   - Monto total pendiente de cobro y total recaudado.
   - Filtros rápidos por estado de pago (`Todos`, `Pendientes`, `Al Día`).

3. **Arquitectura Cloudflare (100% Free Tier):**
   - **Hosting:** Cloudflare Pages en modo SSR con Workers runtime.
   - **Base de Datos:** Cloudflare D1 (SQLite serverless) con claves foráneas, índices de alta velocidad e historial automático de pagos.

4. **Soporte Móvil Nativo:**
   - Configurado con Capacitor (`@capacitor/android`) listo para compilar a APK de Android en Android Studio.

---

## 📂 Estructura del Proyecto

```text
├── src/
│   ├── components/
│   │   ├── MapaRuta.vue            # Componente de mapa Leaflet + OpenStreetMap
│   │   ├── ModalNuevoPasajero.vue  # Modal para registrar nuevo pasajero, plan y parada
│   │   ├── StatsDashboard.vue      # Métricas y barra de filtros de cobro
│   │   ├── TarjetaPasajero.vue     # Tarjeta unificada interactiva de pasajero
│   │   └── TransportApp.vue        # Aplicación orquestadora en Vue 3
│   ├── layouts/
│   │   └── Layout.astro            # Layout SSR con meta tags para Android y dark theme
│   ├── lib/
│   │   └── db.ts                   # Helper de conexión a Cloudflare D1
│   ├── pages/
│   │   ├── api/
│   │   │   ├── pasajeros.ts        # GET y POST de pasajeros y planes en D1
│   │   │   ├── pagos/[id].ts       # PATCH para alternar [ Pagado / Pendiente ] e historial
│   │   │   └── rutas.ts            # GET y POST de itinerarios semanales
│   │   └── index.astro             # Página principal SSR
│   ├── styles/
│   │   └── global.css              # Directivas Tailwind y estilos de Leaflet
│   └── types/
│       └── index.ts                # Modelos e interfaces TypeScript
├── astro.config.mjs                # Configuración Astro SSR + Cloudflare + Vue 3 + Tailwind
├── capacitor.config.json           # Configuración de Capacitor para Android
├── schema.sql                      # Esquema D1 optimizado con índices y claves foráneas
├── seed.sql                        # Datos semilla de prueba
├── wrangler.toml                   # Configuración del binding DB de Cloudflare D1
└── package.json                    # Scripts y dependencias
```

---

## 🚀 Guía de Inicio Rápido

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Configurar la Base de Datos D1 Localmente
Aplica el esquema y carga los datos de prueba en la base de datos D1 local:
```bash
# Crear las tablas
npm run db:migrate:local

# Poblar con datos iniciales (pasajeros, suscripciones y coordenadas)
npm run db:seed:local
```

### 3. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:4321](http://localhost:4321)

---

## ☁️ Despliegue en Cloudflare (100% Gratuito)

### 1. Iniciar sesión en Cloudflare CLI
```bash
npx wrangler login
```

### 2. Crear la base de datos D1 en producción
```bash
npm run db:create
```
*Copia el `database_id` que te devuelva la consola y pégalo en tu archivo `wrangler.toml`.*

### 3. Aplicar el esquema en producción
```bash
npm run db:migrate:prod
```

### 4. Desplegar la aplicación a Cloudflare Pages
```bash
npm run deploy
```

---

## 📱 Generación del APK de Android (Capacitor)

1. **Construir los assets del proyecto:**
   ```bash
   npm run build
   ```

2. **Agregar la plataforma Android:**
   ```bash
   npm run cap:add:android
   ```

3. **Sincronizar cambios web con Android:**
   ```bash
   npm run cap:sync
   ```

4. **Abrir el proyecto en Android Studio:**
   ```bash
   npm run cap:open:android
   ```
   *Dentro de Android Studio, ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)** para generar tu archivo `.apk` instalable.*

---

## 🛡️ Endpoints API SSR

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/pasajeros` | Obtiene la lista completa de pasajeros con suscripciones y rutas |
| `POST` | `/api/pasajeros` | Registra un nuevo pasajero con su suscripción y ruta inicial |
| `PATCH` | `/api/pagos/:id` | Alterna el estado `[ Pagado / Pendiente ]` y guarda en historial |
| `GET` | `/api/rutas` | Consulta las paradas asignadas por pasajero o día |
| `POST` | `/api/rutas` | Registra una nueva parada en el itinerario semanal |
