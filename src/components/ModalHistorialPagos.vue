<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PasajeroCompleto, HistorialPago } from '../types';
import { useI18n } from '../lib/i18n';

const props = defineProps<{
  isOpen: boolean;
  pasajero?: PasajeroCompleto | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t, locale } = useI18n();

const pagos = ref<HistorialPago[]>([]);
const loading = ref(false);
const errorMensaje = ref<string | null>(null);

// Control seguro de clic en backdrop (evitar cierre al arrastrar el mouse)
const isMouseDownOnBackdrop = ref(false);

function handleBackdropMouseDown(e: MouseEvent) {
  isMouseDownOnBackdrop.value = e.target === e.currentTarget;
}

function handleBackdropClick(e: MouseEvent) {
  if (isMouseDownOnBackdrop.value && e.target === e.currentTarget) {
    emit('close');
  }
  isMouseDownOnBackdrop.value = false;
}

async function cargarHistorial() {
  loading.value = true;
  errorMensaje.value = null;
  try {
    let url = '/api/historial-pagos';
    if (props.pasajero?.id) {
      url += `?pasajero_id=${props.pasajero.id}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Error al consultar historial.');
    }
    const data = (await res.json()) as HistorialPago[];
    pagos.value = data;
  } catch (err: any) {
    console.error('Error cargando historial de pagos:', err);
    errorMensaje.value = 'No se pudo cargar el historial.';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.isOpen,
  (abierto) => {
    if (abierto) {
      cargarHistorial();
    }
  }
);

// Formatear montos
function formatMonto(monto: number): string {
  return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(monto);
}

// Formatear fecha y hora
function formatFechaHora(fechaStr: string): string {
  if (!fechaStr) return '-';
  try {
    const limpia = fechaStr.replace(' ', 'T');
    const d = new Date(limpia);
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleString(locale.value === 'en' ? 'en-US' : 'es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return fechaStr;
  }
}

// Total acumulado
const totalRecaudado = computed(() => {
  return pagos.value.reduce((acc, p) => acc + p.monto_pagado, 0);
});
watch(() => props.isOpen, (open) => {
  if (typeof document !== 'undefined') {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 w-full h-full min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      @mousedown="handleBackdropMouseDown"
      @click="handleBackdropClick"
    >
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up my-auto"
        @click.stop
      >
        <!-- HEADER -->
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/90 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {{ pasajero ? `${t.history.title}: ${pasajero.nombre}` : t.history.title }}
                </h2>
              </div>
              <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug break-words">
                {{ t.history.subtitle }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              @click="cargarHistorial"
              :disabled="loading"
              class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              @click="emit('close')"
              class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- BODY CON SCROLL -->
        <div class="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          <!-- RESUMEN RÁPIDO -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 col-span-2 sm:col-span-1 shadow-sm">
              <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t.history.totalCollected }}</p>
              <p class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{{ formatMonto(totalRecaudado) }}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 shadow-sm">
              <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t.history.totalReceipts }}</p>
              <p class="text-xl font-black text-slate-900 dark:text-white mt-0.5">{{ pagos.length }}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 shadow-sm">
              <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t.history.lastPayment }}</p>
              <p class="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1 leading-snug break-words">
                {{ pagos.length > 0 ? formatFechaHora(pagos[0].fecha_pago) : '--' }}
              </p>
            </div>
          </div>

          <!-- ESTADO DE CARGA -->
          <div v-if="loading" class="py-12 text-center text-slate-400">
            <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          </div>

          <!-- ERROR -->
          <div v-else-if="errorMensaje" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
            <p class="text-xs font-semibold text-rose-500 dark:text-rose-400">{{ errorMensaje }}</p>
            <button
              type="button"
              @click="cargarHistorial"
              class="mt-2 text-xs text-brand-600 dark:text-brand-400 underline hover:text-brand-500 cursor-pointer"
            >
              {{ t.actions.reload }}
            </button>
          </div>

          <!-- LISTA SIMPLE DE PAGOS -->
          <div v-else-if="pagos.length > 0" class="space-y-2">
            <div
              v-for="pago in pagos"
              :key="pago.id"
              class="bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors shadow-sm"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span v-if="!pasajero" class="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {{ pago.pasajero_nombre || 'Pasajero' }}
                    </span>
                    
                    <span v-if="pago.modalidad" class="text-[10px] capitalize text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 shrink-0">
                      {{ pago.modalidad }}
                    </span>
                  </div>

                  <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="break-words leading-tight">{{ formatFechaHora(pago.fecha_pago) }}</span>
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                  +{{ formatMonto(pago.monto_pagado) }}
                </div>
                <span class="inline-block text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {{ t.card.paid }}
                </span>
              </div>
            </div>
          </div>

          <!-- ESTADO VACÍO -->
          <div v-else class="py-12 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 bg-slate-50/50 dark:bg-transparent">
            <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-2">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ t.history.noPayments }}</p>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ pagos.length }} {{ t.history.totalReceipts.toLowerCase() }}
          </span>
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            {{ t.history.close }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(51, 65, 85, 0.8);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 85, 105, 1);
}
</style>
