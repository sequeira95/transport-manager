<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { PasajeroCompleto, EstadoPago, Usuario } from '../types';
import AppHeader from './AppHeader.vue';
import AppFooter from './AppFooter.vue';
import TarjetaPasajero from './TarjetaPasajero.vue';
import StatsDashboard from './StatsDashboard.vue';
import ModalNuevoPasajero from './ModalNuevoPasajero.vue';
import ModalHistorialPagos from './ModalHistorialPagos.vue';
import ModalAuth from './ModalAuth.vue';
import { getLocalPasajeros, countLocalPasajeros, clearLocalPasajeros } from '../lib/storage';
import { useI18n } from '../lib/i18n';

const props = defineProps<{
  initialPasajeros?: PasajeroCompleto[];
  initialUser?: Usuario | null;
}>();

const { t } = useI18n();

// Estado de usuario y modo de datos (Cloudflare D1 vs Local Storage)
const usuarioActual = ref<Usuario | null>(props.initialUser || null);
const esModoLocal = computed(() => !usuarioActual.value);
const modalAuthAbierto = ref(false);
const pasajerosLocalesCount = ref(0);
const notificacionMigracion = ref<string | null>(null);

const pasajeros = ref<PasajeroCompleto[]>(props.initialPasajeros || []);
const loading = ref(false);
const search = ref('');
const filtroActual = ref<'todos' | 'Pendiente' | 'Pagado' | 'Vencido'>('todos');
const modalAbierto = ref(false);
const pasajeroEnEdicion = ref<PasajeroCompleto | null>(null);

// Estado del Modal de Historial de Pagos
const modalHistorialAbierto = ref(false);
const pasajeroHistorialSeleccionado = ref<PasajeroCompleto | null>(null);

function abrirHistorialGeneral() {
  pasajeroHistorialSeleccionado.value = null;
  modalHistorialAbierto.value = true;
}

function abrirHistorialPasajero(pasajero: PasajeroCompleto) {
  pasajeroHistorialSeleccionado.value = pasajero;
  modalHistorialAbierto.value = true;
}

function abrirModalAuth() {
  pasajerosLocalesCount.value = countLocalPasajeros();
  modalAuthAbierto.value = true;
}

async function cargarPasajeros() {
  loading.value = true;
  try {
    if (usuarioActual.value) {
      const res = await fetch('/api/pasajeros');
      if (res.ok) {
        const data = (await res.json()) as PasajeroCompleto[];
        pasajeros.value = data;
      }
    } else {
      // Modo local
      pasajeros.value = getLocalPasajeros();
    }
  } catch (err) {
    console.error('Error cargando pasajeros:', err);
  } finally {
    loading.value = false;
  }
}

async function verificarSesion() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = (await res.json()) as { authenticated?: boolean; user?: Usuario };
      if (data.authenticated && data.user) {
        usuarioActual.value = data.user;
      } else {
        usuarioActual.value = null;
      }
    }
  } catch (err) {
    console.warn('Error verificando sesión:', err);
  }

  await cargarPasajeros();
  pasajerosLocalesCount.value = countLocalPasajeros();
}

async function sincronizarLocalesDirecto() {
  const locales = getLocalPasajeros();
  if (locales.length > 0 && usuarioActual.value) {
    try {
      const res = await fetch('/api/auth/migrar-locales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasajeros: locales })
      });
      const data = (await res.json()) as { success?: boolean; count?: number; message?: string };
      if (res.ok) {
        clearLocalPasajeros();
        pasajerosLocalesCount.value = 0;
        notificacionMigracion.value = `✓ Se migraron exitosamente ${data.count ?? locales.length} pasajeros a tu cuenta en la nube.`;
        await cargarPasajeros();
        setTimeout(() => {
          notificacionMigracion.value = null;
        }, 6000);
      }
    } catch (err) {
      console.error('Error sincronizando pasajeros locales:', err);
    }
  }
}

async function onLoginSuccess(payload: { user: Usuario; migrarLocales: boolean }) {
  usuarioActual.value = payload.user;

  if (payload.migrarLocales) {
    const locales = getLocalPasajeros();
    if (locales.length > 0) {
      try {
        const res = await fetch('/api/auth/migrar-locales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pasajeros: locales })
        });
        const data = (await res.json()) as { success?: boolean; count?: number; message?: string };
        if (res.ok) {
          clearLocalPasajeros();
          pasajerosLocalesCount.value = 0;
          notificacionMigracion.value = `✓ Se migraron exitosamente ${data.count ?? locales.length} pasajeros a tu cuenta en la nube.`;
          setTimeout(() => {
            notificacionMigracion.value = null;
          }, 6000);
        }
      } catch (err) {
        console.error('Error migrando pasajeros:', err);
      }
    }
  }

  await cargarPasajeros();
}

async function cerrarSesion() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('tm_auth_token');
    usuarioActual.value = null;
    await cargarPasajeros();
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
}

// Abrir modal en modo crear
function abrirModalCrear() {
  pasajeroEnEdicion.value = null;
  modalAbierto.value = true;
}

// Abrir modal en modo editar
function abrirModalEditar(pasajero: PasajeroCompleto) {
  pasajeroEnEdicion.value = pasajero;
  modalAbierto.value = true;
}

// Actualización reactiva instantánea cuando una tarjeta emite cambio de pago y renovación
function onPagoActualizado({ suscripcionId, nuevoEstado, suscripcion }: { suscripcionId: number; nuevoEstado: EstadoPago; suscripcion?: any }) {
  const pasajero = pasajeros.value.find(p => p.suscripcion?.id === suscripcionId);
  if (pasajero && pasajero.suscripcion) {
    pasajero.suscripcion.estado_pago = nuevoEstado;
    if (suscripcion?.fecha_corte) {
      pasajero.suscripcion.fecha_corte = suscripcion.fecha_corte;
    }
    if (suscripcion?.fecha_inicio) {
      pasajero.suscripcion.fecha_inicio = suscripcion.fecha_inicio;
    }
  }
}

// Actualización reactiva cuando se activa o desactiva (pausa) un pasajero
function onActivoCambiado({ id, activo }: { id: number; activo: number }) {
  const pasajero = pasajeros.value.find(p => p.id === id);
  if (pasajero) {
    pasajero.activo = activo;
  }
}

// Eliminación reactiva instantánea cuando una tarjeta elimina un pasajero
function onPasajeroEliminado(id: number) {
  pasajeros.value = pasajeros.value.filter(p => p.id !== id);
}

// Filtrado combinado por texto (nombre, notas, paradas) y estado de cobro
const pasajerosFiltrados = computed(() => {
  return pasajeros.value.filter(p => {
    // Filtro de estado
    if (filtroActual.value !== 'todos') {
      if (filtroActual.value === 'Vencido') {
        if (!p.suscripcion?.fecha_corte) return false;
        const [y, m, d] = p.suscripcion.fecha_corte.split('-').map(Number);
        const corte = new Date(y, m - 1, d);
        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        if (corte.getTime() >= hoy.getTime()) return false;
      } else if (p.suscripcion?.estado_pago !== filtroActual.value) {
        return false;
      }
    }

    // Filtro de búsqueda
    if (search.value.trim()) {
      const query = search.value.toLowerCase();
      const matchNombre = p.nombre.toLowerCase().includes(query);
      const matchTelefono = p.telefono.toLowerCase().includes(query);
      const matchRutas = p.rutas.some(
        r => r.punto_inicio.toLowerCase().includes(query) || r.punto_destino.toLowerCase().includes(query)
      );
      return matchNombre || matchTelefono || matchRutas;
    }

    return true;
  });
});

onMounted(() => {
  verificarSesion();
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    
    <!-- HEADER PROFESIONAL INTEGRADO CON PERFIL Y MULTI-IDIOMA -->
    <AppHeader
      :usuario-actual="usuarioActual"
      :pasajeros-locales-count="pasajerosLocalesCount"
      @abrir-modal-auth="abrirModalAuth"
      @cerrar-sesion="cerrarSesion"
      @sincronizar-locales="sincronizarLocalesDirecto"
    />

    <!-- CONTENEDOR PRINCIPAL -->
    <div class="max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6 flex-1 min-w-0">
      
      <!-- ENCABEZADO DE SECCIÓN DINÁMICO TRADUCIDO -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 sm:pb-5">
        <div>
          <h1 class="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {{ t.dashboard.title }}
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            {{ t.dashboard.subtitle }}
          </p>
        </div>
      </div>

      <!-- BANNER DE AVISO DE MODO LOCAL / INVITADO (Visible cuando NO hay sesión iniciada) -->
      <div 
        v-if="!usuarioActual"
        class="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-slate-900/90 dark:to-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 sm:p-5 shadow-sm dark:shadow-lg backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
      >
        <div class="flex items-start sm:items-center gap-3 w-full sm:w-auto min-w-0">
          <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 mt-0.5 sm:mt-0">
            💾
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
                {{ t.bannerLocal.title }}
              </h2>
              <span class="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {{ t.bannerLocal.badge }}
              </span>
            </div>
            <p class="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {{ t.bannerLocal.description }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            @click="abrirModalAuth"
            class="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <svg class="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>{{ t.bannerLocal.button }}</span>
          </button>
        </div>
      </div>

      <!-- BANNER DE NOTIFICACIÓN DE MIGRACIÓN EXITOSA -->
      <div 
        v-if="notificacionMigracion" 
        class="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-fade-in"
      >
        <div class="flex items-center gap-2">
          <span class="text-emerald-500 font-bold">✓</span>
          <span>{{ notificacionMigracion }}</span>
        </div>
        <button @click="notificacionMigracion = null" class="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer">✕</button>
      </div>

      <!-- Sección de Métricas y Filtros -->
      <StatsDashboard
        :pasajeros="pasajeros"
        :filtro-actual="filtroActual"
        @cambiar-filtro="(f) => filtroActual = f"
      />

      <!-- Barra de Búsqueda y Botón de Nuevo Pasajero -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-slate-200/50 dark:bg-slate-800/40 p-2.5 sm:p-3 rounded-2xl border border-slate-300/80 dark:border-slate-700/60">
        <div class="relative flex-1 min-w-0">
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="search"
            type="text"
            :placeholder="t.actions.searchPlaceholder"
            class="w-full bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
          />
          <button
            v-if="search"
            @click="search = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            @click="cargarPasajeros"
            :disabled="loading"
            class="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shrink-0 shadow-sm"
            :title="t.actions.reload"
          >
            <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            type="button"
            @click="abrirHistorialGeneral"
            class="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 border border-slate-300 dark:border-slate-700 hover:border-amber-500/40 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 shrink-0 cursor-pointer"
            :title="t.actions.paymentHistory"
          >
            <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span class="hidden sm:inline">{{ t.actions.paymentHistory }}</span>
          </button>

          <button
            type="button"
            @click="abrirModalCrear"
            class="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/25 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer shrink-0"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="whitespace-nowrap">{{ t.actions.newPassenger }}</span>
          </button>
        </div>
      </div>

      <!-- Indicador de cantidad y modo -->
      <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          {{ pasajerosFiltrados.length }} / {{ pasajeros.length }}
          <span v-if="esModoLocal" class="text-amber-600 dark:text-amber-400 font-medium ml-1">({{ t.header.guestMode }})</span>
        </span>
        <span v-if="loading" class="text-brand-600 dark:text-brand-400 animate-pulse">...</span>
      </div>

      <!-- Grid de Tarjetas Unificadas de Pasajero -->
      <div v-if="pasajerosFiltrados.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
        <TarjetaPasajero
          v-for="p in pasajerosFiltrados"
          :key="p.id"
          :pasajero="p"
          :es-modo-local="esModoLocal"
          @pago-actualizado="onPagoActualizado"
          @pasajero-eliminado="onPasajeroEliminado"
          @editar-pasajero="abrirModalEditar"
          @activo-cambiado="onActivoCambiado"
          @ver-historial="abrirHistorialPasajero"
        />
      </div>

      <!-- Estado Vacío -->
      <div v-else class="text-center py-16 bg-white dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-3">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1">
          {{ search ? t.actions.noResultsSearch : (esModoLocal ? t.actions.noPassengersGuest : t.actions.noPassengersCloud) }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
          {{ search ? '' : (esModoLocal ? t.modalAuth.guestExplanation : '') }}
        </p>
        <button
          v-if="!search"
          type="button"
          @click="abrirModalCrear"
          class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md"
        >
          {{ t.actions.createFirstPassenger }}
        </button>
      </div>

      <!-- Modal Nuevo / Editar Pasajero -->
      <ModalNuevoPasajero
        :is-open="modalAbierto"
        :pasajero-editar="pasajeroEnEdicion"
        :es-modo-local="esModoLocal"
        @close="modalAbierto = false"
        @pasajero-guardado="cargarPasajeros"
      />

      <!-- Modal Historial de Pagos (Individual y General) -->
      <ModalHistorialPagos
        :is-open="modalHistorialAbierto"
        :pasajero="pasajeroHistorialSeleccionado"
        @close="modalHistorialAbierto = false"
      />

      <!-- Modal de Autenticación (Login, Registro y Migración) -->
      <ModalAuth
        :is-open="modalAuthAbierto"
        :pasajeros-locales-count="pasajerosLocalesCount"
        @close="modalAuthAbierto = false"
        @login-success="onLoginSuccess"
      />

    </div>

    <!-- FOOTER PROFESIONAL MULTI-IDIOMA CON ESTADO Y ACCESOS RÁPIDOS -->
    <AppFooter
      :usuario-actual="usuarioActual"
      @abrir-modal-crear="abrirModalCrear"
      @abrir-historial="abrirHistorialGeneral"
    />
  </div>
</template>
