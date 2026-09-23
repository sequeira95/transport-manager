<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { PasajeroCompleto } from '../types';
import { useNotifications } from '../lib/notifications';
import { useI18n } from '../lib/i18n';

const props = defineProps<{
  isOpen: boolean;
  pasajeros: PasajeroCompleto[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();
const {
  config,
  permission,
  isSupported,
  isGranted,
  isDenied,
  isDefault,
  saveNotificationConfig,
  requestNotificationPermission,
  playNotificationSound,
  sendNotification,
  getUpcomingPickups,
  getDiaSemanaHoy
} = useNotifications();

const testFeedback = ref<string | null>(null);
const leadTimeOptions = [10, 15, 30, 45, 60];

// Bloqueo de scroll en body al abrir el modal
watch(
  () => props.isOpen,
  (val) => {
    if (typeof document !== 'undefined') {
      if (val) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

// Solicitar permisos del navegador
async function handleRequestPermission() {
  await requestNotificationPermission();
}

// Probar notificación
function handleSendTest() {
  playNotificationSound();
  sendNotification({
    title: t.value.notifications.testNotificationTitle,
    body: t.value.notifications.testNotificationBody,
    tag: `tm-test-${Date.now()}`
  });

  testFeedback.value = t.value.notifications.testSent;
  setTimeout(() => {
    testFeedback.value = null;
  }, 4000);
}

// Actualizar configuración
function toggleEnabled() {
  saveNotificationConfig({ enabled: !config.value.enabled });
}

function setLeadTime(minutes: number) {
  saveNotificationConfig({ defaultMinutesBefore: minutes });
}

function toggleSound() {
  saveNotificationConfig({ soundEnabled: !config.value.soundEnabled });
}

function toggleInAppBanner() {
  saveNotificationConfig({ inAppBannerEnabled: !config.value.inAppBannerEnabled });
}

// Lista de avisos programados para hoy
const avisosHoy = computed(() => {
  return getUpcomingPickups(props.pasajeros);
});

const diaHoyNombre = computed(() => {
  return getDiaSemanaHoy();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Modal Header -->
        <div class="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-brand-500/5 to-transparent">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm sm:text-lg font-black text-slate-900 dark:text-white leading-snug break-words">
                {{ t.notifications.title }}
              </h2>
              <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug break-words">
                {{ t.notifications.subtitle }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="emit('close')"
            class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Body (scrollable) -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200">
          
          <!-- SECCIÓN 1: ESTADO DE PERMISOS DEL NAVEGADOR -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {{ t.notifications.permissionStatus }}
                </span>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    v-if="isGranted"
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  >
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {{ t.notifications.permissionGranted }}
                  </span>
                  <span
                    v-else-if="isDenied"
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  >
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    {{ t.notifications.permissionDenied }}
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  >
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    {{ t.notifications.permissionDefault }}
                  </span>
                </div>
              </div>

              <!-- Botones de Acción de Permiso -->
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-if="!isGranted"
                  type="button"
                  @click="handleRequestPermission"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span>{{ t.notifications.requestPermissionBtn }}</span>
                </button>

                <button
                  type="button"
                  @click="handleSendTest"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ t.notifications.sendTestBtn }}</span>
                </button>
              </div>
            </div>

            <!-- Toast de feedback al probar -->
            <p v-if="testFeedback" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
              ✓ {{ testFeedback }}
            </p>
          </div>

          <!-- SECCIÓN 2: AJUSTES GENERALES -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ t.notifications.globalSettings }}
            </h3>

            <!-- Switch Maestro -->
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div class="min-w-0 pr-3">
                <span class="text-sm font-bold text-slate-900 dark:text-white block">
                  {{ t.notifications.enableNotifications }}
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  Calcula los recordatorios automáticamente según el horario de cada pasajero.
                </span>
              </div>
              <button
                type="button"
                @click="toggleEnabled"
                :class="[
                  'w-12 h-7 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 p-0.5',
                  config.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                ]"
              >
                <div
                  :class="[
                    'w-6 h-6 rounded-full bg-white shadow-md transform transition-transform',
                    config.enabled ? 'translate-x-5' : 'translate-x-0'
                  ]"
                ></div>
              </button>
            </div>

            <!-- Selector de Tiempo de Anticipación por Defecto -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-slate-900 dark:text-white">
                  {{ t.notifications.defaultAnticipation }}
                </span>
                <span class="text-xs font-black text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  {{ config.defaultMinutesBefore }} min
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ t.notifications.minutesBefore }}
              </p>

              <!-- Botones de píldora para seleccionar minutos -->
              <div class="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                <button
                  v-for="min in leadTimeOptions"
                  :key="min"
                  type="button"
                  @click="setLeadTime(min)"
                  :class="[
                    'py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border',
                    config.defaultMinutesBefore === min
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  ]"
                >
                  {{ min }}m
                </button>
              </div>
            </div>

            <!-- Toggles de Sonido y Banner In-App -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Alerta Sonora -->
              <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div class="flex items-center gap-2.5 min-w-0 pr-2">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {{ t.notifications.soundAlerts }}
                  </span>
                </div>
                <button
                  type="button"
                  @click="toggleSound"
                  :class="[
                    'w-10 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 p-0.5',
                    config.soundEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  ]"
                >
                  <div
                    :class="[
                      'w-5 h-5 rounded-full bg-white shadow transform transition-transform',
                      config.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    ]"
                  ></div>
                </button>
              </div>

              <!-- Banner In-App -->
              <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div class="flex items-center gap-2.5 min-w-0 pr-2">
                  <div class="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {{ t.notifications.inAppBanner }}
                  </span>
                </div>
                <button
                  type="button"
                  @click="toggleInAppBanner"
                  :class="[
                    'w-10 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 p-0.5',
                    config.inAppBannerEnabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
                  ]"
                >
                  <div
                    :class="[
                      'w-5 h-5 rounded-full bg-white shadow transform transition-transform',
                      config.inAppBannerEnabled ? 'translate-x-4' : 'translate-x-0'
                    ]"
                  ></div>
                </button>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: RECORDATORIOS PROGRAMADOS PARA HOY -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span>{{ t.notifications.todaySchedule }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300 font-bold border border-brand-500/30">
                  {{ diaHoyNombre }}
                </span>
              </h3>
              <span class="text-xs font-medium text-slate-500">
                {{ avisosHoy.length }} programados
              </span>
            </div>

            <!-- Lista de paradas de hoy -->
            <div v-if="avisosHoy.length > 0" class="space-y-2">
              <div
                v-for="aviso in avisosHoy"
                :key="aviso.rutaId"
                class="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 shadow-sm flex items-center justify-between gap-3 hover:border-amber-400/50 transition-colors"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {{ aviso.horaRecogida }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {{ aviso.pasajeroNombre }}
                      </span>
                      <span
                        v-if="aviso.esInminente"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse"
                      >
                        🔔 Inminente
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-md">
                      📍 {{ aviso.puntoInicio }} ➔ 🎯 {{ aviso.puntoDestino }}
                    </p>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                    {{ aviso.minutosAviso }}m antes
                  </span>
                  <span class="text-[10px] text-slate-400">
                    Avisa a las {{ aviso.horaNotificacionStr }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Sin paradas hoy -->
            <div
              v-else
              class="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 text-center space-y-1 text-slate-500 dark:text-slate-400"
            >
              <div class="w-10 h-10 mx-auto rounded-full bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center text-slate-400">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-xs font-medium">
                {{ t.notifications.noUpcomingToday }}
              </p>
            </div>
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-850/60 flex items-center justify-end">
          <button
            type="button"
            @click="emit('close')"
            class="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition-colors cursor-pointer"
          >
            {{ t.notifications.close }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
