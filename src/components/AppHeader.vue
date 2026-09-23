<script setup lang="ts">
import { ref } from 'vue';
import type { Usuario } from '../types';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { useNotifications } from '../lib/notifications';

const props = defineProps<{
  usuarioActual: Usuario | null;
  pasajerosLocalesCount: number;
}>();

const emit = defineEmits<{
  (e: 'abrirModalAuth'): void;
  (e: 'cerrarSesion'): void;
  (e: 'sincronizarLocales'): void;
  (e: 'abrirModalNotificaciones'): void;
}>();

const { locale, t, toggleLocale, setLocale } = useI18n();
const { isDark, toggleTheme } = useTheme();
const { isGranted } = useNotifications();
const menuPerfilAbierto = ref(false);

function toggleMenuPerfil() {
  menuPerfilAbierto.value = !menuPerfilAbierto.value;
}

function handleCerrarSesion() {
  menuPerfilAbierto.value = false;
  emit('cerrarSesion');
}
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
      
      <!-- LOGO & BRANDING -->
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25 shrink-0">
          <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 sm:gap-2">
            <span class="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center whitespace-nowrap">
              Passen<span class="text-emerald-600 dark:text-teal-400">go</span>
            </span>

            <!-- Badge de estado de datos / sincronización -->
            <span 
              v-if="usuarioActual"
              class="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              {{ t.header.cloudSynced }}
            </span>
            <span 
              v-else
              class="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25"
              :title="t.header.guestTooltip"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
              {{ t.header.guestMode }}
            </span>
          </div>

          <p class="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-none">
            {{ t.header.subtitle }}
          </p>
        </div>
      </div>

      <!-- ALERTA DE DATOS LOCALES PENDIENTES (Si hay y está logueado) -->
      <div 
        v-if="usuarioActual && pasajerosLocalesCount > 0"
        class="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 animate-pulse"
      >
        <span>⚠️ {{ pasajerosLocalesCount }} {{ t.header.syncPending }}</span>
        <button 
          @click="emit('sincronizarLocales')"
          class="underline font-bold hover:text-slate-900 dark:hover:text-white cursor-pointer ml-1"
        >
          Sincronizar
        </button>
      </div>

      <!-- ACCIONES DERECHA: SELECTOR DE IDIOMA, BOTÓN TEMA Y PERFIL DE USUARIO -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        
        <!-- SELECTOR DE IDIOMA MULTI-LENGUAJE (COMPACTO ES / EN) -->
        <div class="relative">
          <div class="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-750 border border-slate-300/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-700 dark:text-slate-200 transition-all focus-within:border-emerald-500 shadow-sm">
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <select
              :value="locale"
              @change="(e: any) => setLocale(e.target.value)"
              class="bg-transparent text-xs font-black text-slate-800 dark:text-white focus:outline-none cursor-pointer appearance-none pr-3 uppercase tracking-wider"
              aria-label="Idioma / Language"
            >
              <option value="es" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white py-1">ES</option>
              <option value="en" class="bg-white text-slate-900 dark:bg-slate-900 dark:text-white py-1">EN</option>
            </select>
            <svg class="w-2.5 h-2.5 text-slate-400 absolute right-1.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <!-- CONMUTADOR DE TEMA (MODO OSCURO / CLARO) -->
        <button
          type="button"
          @click="toggleTheme"
          :title="isDark ? t.header.themeLight : t.header.themeDark"
          class="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center bg-slate-100 hover:bg-slate-200/80 border-slate-300/80 text-amber-500 dark:bg-slate-800/90 dark:hover:bg-slate-750 dark:border-slate-700/80 dark:text-amber-400 shadow-sm active:scale-95"
          aria-label="Toggle Dark/Light Mode"
        >
          <!-- Ícono de Sol para Modo Claro / Ícono de Luna para Modo Oscuro -->
          <svg v-if="isDark" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        <!-- BOTÓN DE CENTRO DE NOTIFICACIONES -->
        <button
          type="button"
          @click="emit('abrirModalNotificaciones')"
          :title="t.notifications.bellTooltip"
          class="relative p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center bg-slate-100 hover:bg-slate-200/80 border-slate-300/80 text-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-750 dark:border-slate-700/80 dark:text-slate-300 shadow-sm active:scale-95"
          aria-label="Notificaciones"
        >
          <svg class="w-4 h-4 text-amber-500 hover:text-amber-600 dark:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <!-- Badge indicador si requiere atención o permiso -->
          <span
            v-if="!isGranted"
            class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
            :title="t.notifications.permissionDefault"
          ></span>
        </button>

        <!-- USUARIO AUTENTICADO: PERFIL Y MENÚ -->
        <div v-if="usuarioActual" class="relative">
          <button
            type="button"
            @click="toggleMenuPerfil"
            class="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-750 border border-slate-300/80 dark:border-slate-700/80 text-slate-800 dark:text-white transition-all cursor-pointer focus:outline-none"
          >
            <!-- Avatar Iniciales -->
            <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              {{ usuarioActual.nombre ? usuarioActual.nombre.substring(0, 2).toUpperCase() : 'CO' }}
            </div>
            
            <div class="text-left hidden sm:block">
              <div class="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1">
                {{ usuarioActual.nombre }}
                <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {{ usuarioActual.email }}
              </div>
            </div>
          </button>

          <!-- DROPDOWN DEL PERFIL -->
          <div
            v-if="menuPerfilAbierto"
            class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div class="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
              <p class="text-xs font-bold text-slate-900 dark:text-white">{{ usuarioActual.nombre }}</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ usuarioActual.email }}</p>
              <div class="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                {{ t.header.cloudSynced }}
              </div>
            </div>

            <div class="px-2 pt-2">
              <button
                type="button"
                @click="handleCerrarSesion"
                class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {{ t.header.signOut }}
              </button>
            </div>
          </div>
        </div>

        <!-- USUARIO INVITADO / MODO LOCAL: BOTÓN INICIAR SESIÓN -->
        <div v-else class="flex items-center gap-2">
          <button
            type="button"
            @click="emit('abrirModalAuth')"
            class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:via-teal-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/25 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>{{ t.header.signIn }}</span>
          </button>
        </div>

      </div>

    </div>
  </header>
</template>
