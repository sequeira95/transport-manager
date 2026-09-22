<script setup lang="ts">
import { computed } from 'vue';
import type { PasajeroCompleto } from '../types';
import { useI18n } from '../lib/i18n';

const props = defineProps<{
  pasajeros: PasajeroCompleto[];
  filtroActual: 'todos' | 'Pendiente' | 'Pagado' | 'Vencido';
}>();

const emit = defineEmits<{
  (e: 'cambiar-filtro', filtro: 'todos' | 'Pendiente' | 'Pagado' | 'Vencido'): void;
}>();

const { t, locale } = useI18n();

const totalPasajeros = computed(() => props.pasajeros.length);
const totalActivos = computed(() => props.pasajeros.filter(p => p.activo).length);

function esVencido(p: PasajeroCompleto): boolean {
  if (!p.suscripcion?.fecha_corte) return false;
  const [y, m, d] = p.suscripcion.fecha_corte.split('-').map(Number);
  const corte = new Date(y, m - 1, d);
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return corte.getTime() < hoy.getTime();
}

const vencidosCount = computed(() => {
  return props.pasajeros.filter(esVencido).length;
});

const pendientesCount = computed(() => {
  return props.pasajeros.filter(p => p.suscripcion?.estado_pago === 'Pendiente').length;
});

const pagadosCount = computed(() => {
  return props.pasajeros.filter(p => p.suscripcion?.estado_pago === 'Pagado').length;
});

const montoPendienteTotal = computed(() => {
  return props.pasajeros
    .filter(p => p.suscripcion?.estado_pago === 'Pendiente')
    .reduce((acc, p) => acc + (p.suscripcion?.monto || 0), 0);
});

const montoCobradoTotal = computed(() => {
  return props.pasajeros
    .filter(p => p.suscripcion?.estado_pago === 'Pagado')
    .reduce((acc, p) => acc + (p.suscripcion?.monto || 0), 0);
});

function formatMonto(monto: number): string {
  return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(monto);
}
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Grid de Métricas Clave -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      
      <!-- Card: Pasajeros Activos -->
      <div class="bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-card flex items-center justify-between">
        <div>
          <p class="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.dashboard.totalPassengers }}</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{{ totalActivos }}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">/ {{ totalPasajeros }}</span>
          </div>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>

      <!-- Card: Pendientes de Cobro -->
      <div class="bg-white dark:bg-slate-800/80 backdrop-blur border border-amber-300/80 dark:border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-card flex items-center justify-between">
        <div>
          <p class="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400/90">{{ t.dashboard.pending }}</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-300">{{ pendientesCount }}</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ formatMonto(montoPendienteTotal) }}</p>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <!-- Card: Cobros al Día -->
      <div class="bg-white dark:bg-slate-800/80 backdrop-blur border border-emerald-300/80 dark:border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-card flex items-center justify-between">
        <div>
          <p class="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400/90">{{ t.dashboard.upToDate }}</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-300">{{ pagadosCount }}</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ formatMonto(montoCobradoTotal) }}</p>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <!-- Card: Total a Recaudar Mensual -->
      <div class="bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-card flex items-center justify-between">
        <div>
          <p class="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.dashboard.monthlyRevenue }}</p>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {{ formatMonto(montoCobradoTotal + montoPendienteTotal) }}
            </span>
          </div>
        </div>
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

    </div>

    <!-- Barra de Filtros Rápidos -->
    <div class="pt-1">
      <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button
          type="button"
          @click="emit('cambiar-filtro', 'todos')"
          :class="[
            'px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm',
            filtroActual === 'todos'
              ? 'bg-brand-600 text-white shadow-brand-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
          ]"
        >
          {{ t.dashboard.filterAll }} ({{ totalPasajeros }})
        </button>
        <button
          type="button"
          @click="emit('cambiar-filtro', 'Pendiente')"
          :class="[
            'px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm',
            filtroActual === 'Pendiente'
              ? 'bg-amber-500 text-slate-950 shadow-amber-500/20 font-bold'
              : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300/80 hover:bg-amber-50 dark:hover:bg-slate-700 border border-amber-300 dark:border-amber-500/30'
          ]"
        >
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          {{ t.dashboard.filterPending }} ({{ pendientesCount }})
        </button>
        <button
          type="button"
          @click="emit('cambiar-filtro', 'Pagado')"
          :class="[
            'px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm',
            filtroActual === 'Pagado'
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 font-bold'
              : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300/80 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-500/30'
          ]"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          {{ t.dashboard.filterUpToDate }} ({{ pagadosCount }})
        </button>
        <button
          v-if="vencidosCount > 0"
          type="button"
          @click="emit('cambiar-filtro', 'Vencido')"
          :class="[
            'px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer animate-pulse shadow-sm',
            filtroActual === 'Vencido'
              ? 'bg-rose-500 text-white shadow-rose-500/30 font-bold'
              : 'bg-white dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/25 border border-rose-300 dark:border-rose-500/40'
          ]"
        >
          <span class="w-2 h-2 rounded-full bg-rose-400"></span>
          {{ t.dashboard.filterOverdue }} ({{ vencidosCount }})
        </button>
      </div>
    </div>
  </div>
</template>

