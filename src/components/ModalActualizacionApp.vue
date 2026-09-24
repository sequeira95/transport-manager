<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from '../lib/i18n';
import {
  updateInfo,
  isUpdateModalOpen,
  closeUpdateModal,
  startInAppUpdate,
  downloadStatus,
  downloadProgress,
  downloadedBytes,
  totalBytes,
  downloadErrorMsg,
  openPermissionSettings,
  DIRECT_APK_DOWNLOAD_URL
} from '../lib/appUpdater';
import { isNativePlatform } from '../lib/platform';

const { t } = useI18n();
const isNative = ref(false);

onMounted(() => {
  if (typeof window !== 'undefined') {
    isNative.value = isNativePlatform();
  }
});

// Bloqueo de scroll cuando el modal está abierto
watch(
  () => isUpdateModalOpen.value,
  (val) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = val ? 'hidden' : '';
    }
  }
);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isUpdateModalOpen.value && downloadStatus.value !== 'downloading') {
    closeUpdateModal();
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown);
    document.body.style.overflow = '';
  }
});

// Formateo de bytes para el progreso (ej. 4.5 MB / 15.2 MB)
const formattedBytes = computed(() => {
  if (totalBytes.value <= 0) return '';
  const currentMb = (downloadedBytes.value / (1024 * 1024)).toFixed(1);
  const totalMb = (totalBytes.value / (1024 * 1024)).toFixed(1);
  return `${currentMb} MB / ${totalMb} MB`;
});

async function handleStartUpdate() {
  await startInAppUpdate();
}

async function handleOpenSettings() {
  await openPermissionSettings();
}

function handleFallbackDownload() {
  const url = updateInfo.value?.downloadUrl || DIRECT_APK_DOWNLOAD_URL;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isUpdateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      @click.self="closeUpdateModal"
    >
      <div
        class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 min-w-0"
      >
        <!-- Encabezado -->
        <div class="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white relative">
          <button
            v-if="downloadStatus !== 'downloading'"
            type="button"
            @click="closeUpdateModal"
            class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>

          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-inner">
              🚀
            </div>
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase mb-1">
                <span>{{ updateInfo?.currentVersion || 'v1.0.0' }}</span>
                <span>➔</span>
                <span class="text-emerald-200">{{ updateInfo?.latestVersion || 'v1.0.1' }}</span>
              </div>
              <h2 class="text-lg sm:text-xl font-black leading-tight">
                {{ t.mobileApp.modalUpdateTitle }}
              </h2>
            </div>
          </div>
          <p class="text-xs text-white/90 mt-2 leading-relaxed">
            {{ t.mobileApp.modalUpdateSubtitle }}
          </p>
        </div>

        <!-- Cuerpo del Modal -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-5">
          <!-- Beneficio de actualización en caché privada -->
          <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-start gap-3">
            <span class="text-xl">✨</span>
            <div class="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <strong class="font-bold block mb-0.5">Actualización Limpia y Directa</strong>
              {{ t.mobileApp.inAppUpdateDesc }}
            </div>
          </div>

          <!-- Novedades de la Versión (Changelog) -->
          <div class="space-y-2">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ t.mobileApp.releaseNotesTitle }}
            </h4>
            <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 max-h-40 overflow-y-auto">
              <div
                v-if="updateInfo?.releaseNotes"
                class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans"
              >
                {{ updateInfo.releaseNotes }}
              </div>
              <div v-else class="text-xs text-slate-500 dark:text-slate-400 italic">
                {{ t.mobileApp.noReleaseNotes }}
              </div>
            </div>
          </div>

          <!-- ESTADO: Permiso Requerido en Android -->
          <div
            v-if="downloadStatus === 'permission_denied'"
            class="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 rounded-2xl space-y-3"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div>
                <h5 class="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {{ t.mobileApp.permissionNeededTitle }}
                </h5>
                <p class="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {{ t.mobileApp.permissionNeededDesc }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                @click="handleOpenSettings"
                class="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-colors cursor-pointer text-center"
              >
                {{ t.mobileApp.openSettingsBtn }}
              </button>
              <button
                type="button"
                @click="handleStartUpdate"
                class="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-medium text-xs hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Ya lo activé, continuar
              </button>
            </div>
          </div>

          <!-- ESTADO: Descargando con barra de progreso -->
          <div
            v-else-if="downloadStatus === 'downloading'"
            class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                {{ t.mobileApp.downloadingProgress.replace('{percent}', downloadProgress.toString()) }}
              </span>
              <span class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {{ downloadProgress }}%
              </span>
            </div>

            <!-- Barra de progreso -->
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                class="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-300 relative shadow-sm"
                :style="{ width: `${downloadProgress}%` }"
              >
                <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Guardando en memoria temporal limpia</span>
              <span v-if="formattedBytes" class="font-mono">{{ formattedBytes }}</span>
            </div>
          </div>

          <!-- ESTADO: Instalando / Abriendo instalador -->
          <div
            v-else-if="downloadStatus === 'installing'"
            class="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 rounded-2xl flex items-center gap-3.5"
          >
            <div class="w-8 h-8 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin shrink-0"></div>
            <div>
              <h5 class="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                {{ t.mobileApp.installingStatus }}
              </h5>
              <p class="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                {{ t.mobileApp.installingHint }}
              </p>
            </div>
          </div>

          <!-- ESTADO: Error -->
          <div
            v-else-if="downloadStatus === 'error'"
            class="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/50 rounded-2xl space-y-3"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div>
                <h5 class="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {{ t.mobileApp.updateErrorTitle }}
                </h5>
                <p class="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                  {{ downloadErrorMsg }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                @click="handleStartUpdate"
                class="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-colors cursor-pointer text-center"
              >
                {{ t.mobileApp.retryBtn }}
              </button>
              <button
                type="button"
                @click="handleFallbackDownload"
                class="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-medium text-xs hover:bg-rose-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {{ t.mobileApp.fallbackDownloadBtn }}
              </button>
            </div>
          </div>

          <!-- ESTADO: Idle / Botón Principal de Actualización -->
          <div v-if="downloadStatus === 'idle'" class="space-y-3 pt-1">
            <button
              type="button"
              @click="handleStartUpdate"
              class="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transform hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <svg class="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{{ t.mobileApp.downloadAndInstallBtn }}</span>
            </button>

            <!-- Opción alternativa con navegador -->
            <div class="text-center">
              <button
                type="button"
                @click="handleFallbackDownload"
                class="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
              >
                {{ t.mobileApp.fallbackDownloadBtn }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer del Modal -->
        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span class="text-[11px] text-slate-500 dark:text-slate-400">
            Passengo • {{ updateInfo?.latestVersion || 'v1.0.1' }}
          </span>
          <button
            v-if="downloadStatus !== 'downloading'"
            type="button"
            @click="closeUpdateModal"
            class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
          >
            {{ t.history.close }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
