# AGENTS.md — Instrucciones y Contexto para Agentes de IA

Este archivo contiene el contexto fundamental y las directrices operativas para cualquier agente de IA (Antigravity, Gemini, etc.) que trabaje en este repositorio.

Consulta el documento maestro detallado en: [PROJECT_CONTEXT.md](file:///c:/Users/user/Documents/admitracionTransporte/PROJECT_CONTEXT.md)

---

## 🧭 Resumen Rápido del Repositorio

- **Proyecto:** `TransportManager` — Sistema full-stack para administración de pasajeros, rutas de transporte, itinerarios semanales y control de cobros.
- **Stack:** Astro 5 SSR (`@astrojs/cloudflare`), Vue 3 (Composition API), Tailwind CSS, Leaflet Maps + OpenStreetMap Nominatim, Cloudflare D1 + LocalStorage.
- **Persistencia Híbrida:**
  - Si no hay sesión iniciada (`!usuarioActual`), la app opera en **Modo Local** (`src/lib/storage.ts`) usando `localStorage`.
  - Si hay sesión, opera en **Modo Nube** con Cloudflare D1 (`src/pages/api/`).
  - Al iniciar sesión o registrarse, se ofrece un asistente modal para migrar los datos locales a la nube.

---

## 🎨 Reglas de UI y Diseño Obligatorias

1. **Modo Oscuro y Claro:**
   - La aplicación soporta ambos temas de forma reactiva (`src/lib/theme.ts`) con persistencia en `transport_manager_theme`.
   - Todos los componentes y modales deben tener clases adaptativas: `bg-white dark:bg-slate-900`, `border-slate-200 dark:border-slate-800`, `text-slate-900 dark:text-white`.

2. **Modales y Diálogos:**
   - Todo modal debe estar envuelto en `<Teleport to="body">` con `position: fixed; inset: 0; z-50` y difuminado completo `bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md` para cubrir la totalidad del viewport sin cortes superiores.
   - Debe implementar bloqueo de scroll en el `body` (`document.body.style.overflow = 'hidden'`) mientras esté abierto.

3. **Responsive Móvil:**
   - Ningún contenedor puede provocar scroll horizontal (`overflow-x`) en pantallas móviles (360px–420px).
   - Siempre usar `min-w-0`, `max-w-full`, `overflow-x-hidden` en cuerpos de modales y pestañas con scroll horizontal táctil suave (`scrollbar-none`).

4. **Multi-idioma (i18n):**
   - Siempre usar el diccionario centralizado en `src/lib/i18n.ts` (`translations.es` y `translations.en`). Nunca escribir textos duros en la interfaz.

---

## 🧪 Validación

Antes de finalizar cualquier tarea, siempre verificar compilación limpia con:
```bash
npm run build
```
El build debe completarse con código de salida 0.
