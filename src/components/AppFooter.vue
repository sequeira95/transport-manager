<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Usuario } from '../types';
import { useI18n } from '../lib/i18n';
import { isNativePlatform } from '../lib/platform';
import { updateInfo, checkForAppUpdates, openUpdateModal } from '../lib/appUpdater';

const props = defineProps<{
  usuarioActual: Usuario | null;
}>();

const emit = defineEmits<{
  (e: 'abrirModalCrear'): void;
  (e: 'abrirHistorial'): void;
  (e: 'abrirModalApp'): void;
}>();

const { t } = useI18n();

const isNative = ref(false);
const checkingUpdate = ref(false);
const updateMessage = ref<string | null>(null);

onMounted(async () => {
  isNative.value = isNativePlatform();
  if (isNative.value) {
    await checkForAppUpdates();
  }
});

async function handleCheckUpdate() {
  checkingUpdate.value = true;
  updateMessage.value = null;
  const res = await checkForAppUpdates();
  checkingUpdate.value = false;
  if (res?.hasUpdate) {
    openUpdateModal();
  } else {
    updateMessage.value = t.value.mobileApp.appUpToDate.replace('{version}', res?.currentVersion || '1.0.0');
    setTimeout(() => {
      updateMessage.value = null;
    }, 4000);
  }
}
</script>

<template>
  <footer class="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md text-slate-600 dark:text-slate-400 text-xs transition-colors duration-200">
    
    <!-- CONTENIDO PRINCIPAL: 3 COLUMNAS -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
        
        <!-- COLUMNA 1: BRANDING & ESTADO EN VIVO (5 COLS) -->
        <div class="md:col-span-5 space-y-3.5">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-teal-500/25">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span class="text-sm font-black tracking-tight text-slate-900 dark:text-white">
              Passen<span class="text-emerald-600 dark:text-teal-400">go</span>
            </span>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
            {{ t.footer.brandDesc }}
          </p>

          <!-- Live Health Status Indicator -->
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            <span>{{ t.footer.allSystemsOperational }}</span>
          </div>
        </div>

        <!-- COLUMNA 2: ACCESOS RÁPIDOS OPERATIVOS (3 COLS) -->
        <div class="md:col-span-3 space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
            {{ t.footer.quickLinks }}
          </h3>
          <ul class="space-y-2">
            <li>
              <button
                type="button"
                @click="emit('abrirModalCrear')"
                class="hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
              >
                <span>{{ t.footer.newPassenger }}</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                @click="emit('abrirHistorial')"
                class="hover:text-amber-600 dark:hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
              >
                <span>{{ t.footer.paymentHistory }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- COLUMNA 3: SEGURIDAD & DATOS (4 COLS) -->
        <div class="md:col-span-4 space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
            {{ t.footer.securityTitle }}
          </h3>
          
          <div class="space-y-2 text-xs">
            <div class="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <span class="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                {{ t.footer.securityEncrypted }}
              </span>
            </div>

            <div class="flex items-center gap-2 pt-0.5">
              <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ t.footer.storageMode }}:</span>
              <span 
                v-if="usuarioActual" 
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                <span>Cloudflare D1</span>
              </span>
              <span 
                v-else 
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                <span>{{ t.header.guestMode }}</span>
              </span>
            </div>

            <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
              <span>{{ t.footer.mobileReady }}</span>
            </div>

            <!-- En APK: Si hay actualización disponible -->
            <button
              v-if="isNative && updateInfo?.hasUpdate"
              type="button"
              @click="openUpdateModal()"
              class="w-full mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-between shadow-md shadow-emerald-600/25 transition-all cursor-pointer animate-pulse"
            >
              <div class="flex items-center gap-2">
                <span>🔄 {{ t.mobileApp.updateBtn }}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">v{{ updateInfo.latestVersion }}</span>
            </button>

            <!-- En APK: Si no hay actualización, botón para verificar -->
            <button
              v-else-if="isNative"
              type="button"
              @click="handleCheckUpdate"
              :disabled="checkingUpdate"
              class="w-full mt-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-300/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <span>{{ checkingUpdate ? 'Verificando...' : (updateMessage || t.mobileApp.checkUpdates) }}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">APK</span>
            </button>

            <!-- En Web: Botón Descargar APK (Abre modal con instrucciones y QR) -->
            <button
              v-else
              type="button"
              @click="emit('abrirModalApp')"
              class="w-full mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600/10 to-teal-600/10 hover:from-emerald-600/20 hover:to-teal-600/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div class="flex items-center gap-2">
                <span>{{ t.mobileApp.downloadBtn }}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono">APK</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- BARRA INFERIOR DE CIERRE (COPYRIGHT & VERSION) -->
    <div class="border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-slate-950/60 py-4">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <p>
          © 2026 Passengo. {{ t.footer.rightsReserved }}
        </p>

        <div class="flex items-center gap-3">
          <!-- En Web: Botón Descargar APK -->
          <button
            v-if="!isNative"
            type="button"
            @click="emit('abrirModalApp')"
            class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Descargar APK</span>
          </button>

          <!-- En APK: Si hay actualización disponible, botón para abrir modal -->
          <button
            v-else-if="updateInfo?.hasUpdate"
            type="button"
            @click="openUpdateModal()"
            class="text-emerald-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-bold animate-pulse"
          >
            <span>🔄 Actualizar (v{{ updateInfo.latestVersion }})</span>
          </button>

          <span class="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300 text-[10px] shadow-sm">
            v1.0.0 {{ t.footer.version }}
          </span>
        </div>
      </div>
    </div>

  </footer>
</template>
