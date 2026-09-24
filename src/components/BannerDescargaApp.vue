<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from '../lib/i18n';
import { updateInfo, checkForAppUpdates, DIRECT_APK_DOWNLOAD_URL, openUpdateModal, cleanUpdateCache } from '../lib/appUpdater';
import { isNativePlatform, isMobileBrowser } from '../lib/platform';

const emit = defineEmits<{
  (e: 'abrirModal'): void;
}>();

const { t } = useI18n();

const visible = ref(false);
const isNative = ref(false);

const DISMISS_KEY = 'tm_mobile_banner_dismissed';

onMounted(async () => {
  if (typeof window !== 'undefined') {
    isNative.value = isNativePlatform();
    const isMobileWeb = isMobileBrowser();

    // Limpiar caché vieja si la hubiera al iniciar
    cleanUpdateCache();

    // 1. Comprobar si hay actualización disponible
    const res = await checkForAppUpdates();
    if (res?.hasUpdate) {
      visible.value = true;
      return;
    }

    // 2. Si estamos dentro del APK nativo, NO mostrar la burbuja para descargar APK
    if (isNative.value) {
      visible.value = false;
      return;
    }

    // 3. Si estamos en navegador móvil web y no se ha descartado, mostrar invitación a descargar APK
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (isMobileWeb && !dismissed) {
      visible.value = true;
    } else {
      // En navegador de escritorio / PC: no mostrar la burbuja flotante
      visible.value = false;
    }
  }
});

function descartar() {
  visible.value = false;
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISS_KEY, '1');
  }
}
</script>

<template>
  <transition
    enter-active-class="transform transition ease-out duration-300"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="visible"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-emerald-500/20">
          {{ updateInfo?.hasUpdate ? '🔄' : '🤖' }}
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">
              {{ updateInfo?.hasUpdate ? t.mobileApp.updateAvailable.replace('{version}', updateInfo.latestVersion) : t.mobileApp.bannerTitle }}
            </h4>
            <button
              type="button"
              @click="descartar"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer p-0.5"
            >
              ✕
            </button>
          </div>

          <p class="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
            {{ updateInfo?.hasUpdate ? t.mobileApp.updateDesc : t.mobileApp.bannerDesc }}
          </p>

          <div class="mt-2.5 flex items-center gap-2">
            <!-- Si hay actualización: abre el modal interactivo de actualización in-app -->
            <button
              v-if="updateInfo?.hasUpdate"
              type="button"
              @click="openUpdateModal()"
              class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{{ t.mobileApp.updateBtn }}</span>
            </button>

            <!-- Si NO hay actualización (invitación a descargar APK en móvil web) -->
            <a
              v-else
              :href="DIRECT_APK_DOWNLOAD_URL"
              target="_blank"
              class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{{ t.mobileApp.bannerBtn }}</span>
            </a>

            <button
              v-if="!isNative && !updateInfo?.hasUpdate"
              type="button"
              @click="emit('abrirModal')"
              class="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Más info
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
