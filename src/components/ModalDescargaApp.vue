<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../lib/i18n';
import { DIRECT_APK_DOWNLOAD_URL } from '../lib/appUpdater';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

// URL del QR generada dinámicamente con alta resolución
const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(DIRECT_APK_DOWNLOAD_URL)}`;

// Bloqueo de scroll cuando el modal está abierto
watch(
  () => props.isOpen,
  (val) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = val ? 'hidden' : '';
    }
  }
);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
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
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      @click.self="emit('close')"
    >
      <div
        class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 min-w-0"
      >
        <!-- Encabezado con degradado moderno -->
        <div class="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-600 text-white relative">
          <button
            type="button"
            @click="emit('close')"
            class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>

          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-inner">
              🤖
            </div>
            <div>
              <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase mb-1">
                <span>Android APK</span>
                <span>•</span>
                <span>Offline + Auto-Update</span>
              </div>
              <h2 class="text-lg sm:text-xl font-black leading-tight">
                {{ t.mobileApp.downloadTitle }}
              </h2>
            </div>
          </div>
          <p class="text-xs text-white/90 mt-2 leading-relaxed">
            {{ t.mobileApp.downloadSubtitle }}
          </p>
        </div>

        <!-- Contenido Central Scrollable -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          <!-- Botón de Descarga Principal Directa -->
          <div class="text-center space-y-3">
            <a
              :href="DIRECT_APK_DOWNLOAD_URL"
              target="_blank"
              class="w-full inline-flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transform hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{{ t.mobileApp.downloadBtn }}</span>
              <span class="px-2 py-0.5 rounded-full bg-white/20 text-xs font-mono">v1.0.3</span>
            </a>

            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Descarga directa y segura desde GitHub Releases oficial.
            </p>
          </div>

          <!-- Código QR para Escaneo desde el Móvil -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div class="p-2 bg-white rounded-xl shadow-md border border-slate-200 shrink-0">
              <img
                :src="qrCodeUrl"
                alt="QR Descarga Android APK"
                class="w-28 h-28 object-contain"
                loading="lazy"
              />
            </div>
            <div class="space-y-1">
              <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {{ t.mobileApp.qrTitle }}
              </h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {{ t.mobileApp.qrSubtitle }}
              </p>
              <div class="pt-1 flex items-center justify-center sm:justify-start gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span>✓</span>
                <span>Instalación directa sin intermediarios</span>
              </div>
            </div>
          </div>

          <!-- Guía en 3 Pasos -->
          <div class="space-y-3">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ t.mobileApp.howToInstall }}
            </h4>
            <div class="space-y-2 text-xs">
              <div class="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">1</span>
                <span class="text-slate-700 dark:text-slate-300">{{ t.mobileApp.step1 }}</span>
              </div>
              <div class="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                <span class="text-slate-700 dark:text-slate-300">{{ t.mobileApp.step2 }}</span>
              </div>
              <div class="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">3</span>
                <span class="text-slate-700 dark:text-slate-300">{{ t.mobileApp.step3 }}</span>
              </div>
            </div>
          </div>

          <!-- Destacado de Actualizaciones -->
          <div class="p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
            <span class="text-lg">⚡</span>
            <div class="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong class="font-bold text-slate-900 dark:text-white block mb-0.5">{{ t.mobileApp.updatesNoticeTitle }}</strong>
              {{ t.mobileApp.updatesNoticeDesc }}
            </div>
          </div>

        </div>

        <!-- Footer del Modal -->
        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            @click="emit('close')"
            class="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
          >
            {{ t.history.close }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
