<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Usuario } from '../types';
import { useI18n } from '../lib/i18n';

const props = defineProps<{
  isOpen: boolean;
  pasajerosLocalesCount?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'login-success', payload: { user: Usuario; migrarLocales: boolean }): void;
}>();

const { t } = useI18n();

const tab = ref<'login' | 'register'>('login');
const nombre = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

// Paso de confirmación de migración
const showMigrationPrompt = ref(false);
const loggedUser = ref<Usuario | null>(null);

// Cierre seguro con click en backdrop
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

watch(
  () => props.isOpen,
  (abierto) => {
    if (abierto) {
      errorMessage.value = null;
      loading.value = false;
      showMigrationPrompt.value = false;
      loggedUser.value = null;
    }
  }
);

async function handleSubmit() {
  errorMessage.value = null;
  loading.value = true;

  try {
    const endpoint = tab.value === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body: any = {
      email: email.value,
      password: password.value
    };

    if (tab.value === 'register') {
      body.nombre = nombre.value;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      errorMessage.value = data.error || 'Error al autenticar.';
      return;
    }

    if (data.token) {
      localStorage.setItem('tm_auth_token', data.token);
    }

    const user: Usuario = data.user;
    loggedUser.value = user;

    if (props.pasajerosLocalesCount && props.pasajerosLocalesCount > 0) {
      showMigrationPrompt.value = true;
    } else {
      emit('login-success', { user, migrarLocales: false });
      emit('close');
    }
  } catch (err: any) {
    console.error('Error en autenticación:', err);
    errorMessage.value = 'Error de conexión con el servidor.';
  } finally {
    loading.value = false;
  }
}

function confirmarMigracion(migrar: boolean) {
  if (loggedUser.value) {
    emit('login-success', { user: loggedUser.value, migrarLocales: migrar });
  }
  emit('close');
}

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
      class="fixed inset-0 z-50 w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      @mousedown="handleBackdropMouseDown"
      @click="handleBackdropClick"
    >
      <div 
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto"
        @click.stop
      >
        
        <!-- HEADER -->
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/90 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                {{ showMigrationPrompt ? t.modalAuth.migrationNoticeTitle : tab === 'login' ? t.modalAuth.loginTitle : t.modalAuth.registerTitle }}
              </h2>
              <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug break-words">
                {{ showMigrationPrompt ? '' : tab === 'login' ? t.modalAuth.loginSubtitle : t.modalAuth.registerSubtitle }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="emit('close')"
            class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- PANTALLA 1: FORMULARIO LOGIN / REGISTRO -->
        <div v-if="!showMigrationPrompt" class="p-5 sm:p-6 space-y-5">
          
          <!-- SELECTOR DE PESTAÑAS -->
          <div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              @click="tab = 'login'; errorMessage = null"
              :class="[
                'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer',
                tab === 'login'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              ]"
            >
              {{ t.modalAuth.loginTab }}
            </button>
            <button
              type="button"
              @click="tab = 'register'; errorMessage = null"
              :class="[
                'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer',
                tab === 'register'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              ]"
            >
              {{ t.modalAuth.registerTab }}
            </button>
          </div>

          <!-- ERROR ALERT -->
          <div v-if="errorMessage" class="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-500 dark:text-rose-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- FORMULARIO -->
          <form @submit.prevent="handleSubmit" class="space-y-4">
            
            <!-- Nombre (solo en registro) -->
            <div v-if="tab === 'register'" class="space-y-1">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.fullName }}</label>
              <input
                v-model="nombre"
                type="text"
                required
                :placeholder="t.modalAuth.fullNamePlaceholder"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
              />
            </div>

            <!-- Email -->
            <div class="space-y-1">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.email }}</label>
              <input
                v-model="email"
                type="email"
                required
                :placeholder="t.modalAuth.emailPlaceholder"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
              />
            </div>

            <!-- Contraseña -->
            <div class="space-y-1">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.password }}</label>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  :placeholder="t.modalAuth.passwordPlaceholder"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-xs cursor-pointer"
                >
                  {{ showPassword ? '👁️' : '🔒' }}
                </button>
              </div>
            </div>

            <!-- BOTÓN PRINCIPAL -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:via-teal-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ loading ? t.modalAuth.loading : (tab === 'login' ? t.modalAuth.submitLogin : t.modalAuth.submitRegister) }}</span>
            </button>
          </form>

          <!-- SEPARADOR Y MODO LOCAL -->
          <div class="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              @click="emit('close')"
              class="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200 font-semibold underline underline-offset-4 cursor-pointer"
            >
              {{ t.modalAuth.continueAsGuest }}
            </button>
          </div>

        </div>

        <!-- PANTALLA 2: CONFIRMACIÓN DE MIGRACIÓN LOCAL -> NUBE -->
        <div v-else class="p-5 sm:p-6 space-y-5 text-center">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 text-2xl">
            ☁️
          </div>

          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ t.modalAuth.migrationNoticeTitle }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {{ t.modalAuth.migrationNoticeDesc.replace('{count}', String(pasajerosLocalesCount || 0)) }}
            </p>
          </div>

          <div class="space-y-2 pt-2">
            <button
              type="button"
              @click="confirmarMigracion(true)"
              class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
            >
              <span>✓ {{ t.modalAuth.migrateYes }}</span>
            </button>

            <button
              type="button"
              @click="confirmarMigracion(false)"
              class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {{ t.modalAuth.migrateNo }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
