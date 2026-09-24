<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import type { Usuario } from '../types';
import { useI18n } from '../lib/i18n';
import { apiFetch } from '../lib/api';

const props = defineProps<{
  isOpen: boolean;
  pasajerosLocalesCount?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'login-success', payload: { user: Usuario; migrarLocales: boolean }): void;
}>();

const { t } = useI18n();

type AuthView = 'login' | 'register' | 'verify_register' | 'forgot_password' | 'reset_password';
const view = ref<AuthView>('login');

const nombre = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);

// Campos específicos de OTP y recuperación
const otpCode = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const pendingEmail = ref('');

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Temporizador de reenvío
const resendCountdown = ref(0);
let countdownTimer: any = null;

function startResendTimer(seconds = 60) {
  resendCountdown.value = seconds;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    resendCountdown.value--;
    if (resendCountdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

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

function reiniciarFormulario() {
  view.value = 'login';
  nombre.value = '';
  email.value = '';
  password.value = '';
  showPassword.value = false;
  otpCode.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  showNewPassword.value = false;
  showConfirmPassword.value = false;
  pendingEmail.value = '';
  errorMessage.value = null;
  successMessage.value = null;
  loading.value = false;
  showMigrationPrompt.value = false;
  loggedUser.value = null;
  resendCountdown.value = 0;
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

watch(
  () => props.isOpen,
  (abierto) => {
    if (abierto) {
      reiniciarFormulario();
    }
  }
);

// Sanitizar OTP a solo números y 6 dígitos
function onOtpInput(e: Event) {
  const target = e.target as HTMLInputElement;
  otpCode.value = target.value.replace(/\D/g, '').slice(0, 6);
}

// 1. Submit Login o Registro
async function handleSubmitAuth() {
  errorMessage.value = null;
  successMessage.value = null;
  loading.value = true;

  try {
    const endpoint = view.value === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body: any = {
      email: email.value.trim().toLowerCase(),
      password: password.value
    };

    if (view.value === 'register') {
      body.nombre = nombre.value.trim();
    }

    const res = await apiFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      // Si el login detecta cuenta pendiente de verificación
      if (data.requiresVerification) {
        pendingEmail.value = data.email || email.value;
        view.value = 'verify_register';
        startResendTimer(60);
        errorMessage.value = data.error;
        return;
      }
      errorMessage.value = data.error || 'Error al autenticar.';
      return;
    }

    // Registro completado que requiere confirmación por email
    if (data.requiresVerification) {
      pendingEmail.value = data.email || email.value;
      view.value = 'verify_register';
      otpCode.value = '';
      startResendTimer(60);
      successMessage.value = t.value.modalAuth.codeSentSuccess;
      return;
    }

    // Login exitoso
    finalizarLogin(data.user, data.token);
  } catch (err: any) {
    console.error('Error en autenticación:', err);
    errorMessage.value = 'Error de conexión con el servidor.';
  } finally {
    loading.value = false;
  }
}

// 2. Submit Verificar Código de Registro
async function handleVerifyRegistration() {
  if (otpCode.value.length !== 6) {
    errorMessage.value = 'Por favor ingresa los 6 dígitos del código.';
    return;
  }

  errorMessage.value = null;
  successMessage.value = null;
  loading.value = true;

  try {
    const res = await apiFetch('/api/auth/verify-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: pendingEmail.value,
        codigo: otpCode.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      errorMessage.value = data.error || 'Código incorrecto o expirado.';
      return;
    }

    finalizarLogin(data.user, data.token);
  } catch (err) {
    console.error('Error al verificar código:', err);
    errorMessage.value = 'Error de conexión con el servidor.';
  } finally {
    loading.value = false;
  }
}

// 3. Submit Solicitar Código de Recuperación
async function handleForgotPassword() {
  if (!email.value || !email.value.includes('@')) {
    errorMessage.value = 'Por favor ingresa un correo electrónico válido.';
    return;
  }

  errorMessage.value = null;
  successMessage.value = null;
  loading.value = true;

  try {
    const res = await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim().toLowerCase()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      errorMessage.value = data.error || 'Error al solicitar recuperación.';
      return;
    }

    pendingEmail.value = email.value.trim().toLowerCase();
    view.value = 'reset_password';
    otpCode.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    startResendTimer(60);
    successMessage.value = t.value.modalAuth.codeSentSuccess;
  } catch (err) {
    console.error('Error al solicitar recuperación:', err);
    errorMessage.value = 'Error de conexión con el servidor.';
  } finally {
    loading.value = false;
  }
}

// 4. Submit Cambiar Contraseña con Código OTP
async function handleResetPassword() {
  if (otpCode.value.length !== 6) {
    errorMessage.value = 'Por favor ingresa los 6 dígitos del código.';
    return;
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = t.value.modalAuth.passwordPlaceholder;
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = t.value.modalAuth.passwordsDoNotMatch;
    return;
  }

  errorMessage.value = null;
  successMessage.value = null;
  loading.value = true;

  try {
    const res = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: pendingEmail.value,
        codigo: otpCode.value,
        newPassword: newPassword.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      errorMessage.value = data.error || 'Error al restablecer la contraseña.';
      return;
    }

    finalizarLogin(data.user, data.token);
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    errorMessage.value = 'Error de conexión con el servidor.';
  } finally {
    loading.value = false;
  }
}

// 5. Reenviar Código OTP
async function handleResend(tipo: 'registro' | 'recuperacion') {
  if (resendCountdown.value > 0) return;

  errorMessage.value = null;
  successMessage.value = null;

  try {
    const res = await apiFetch('/api/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: pendingEmail.value,
        tipo
      })
    });

    const data = await res.json();
    if (!res.ok) {
      errorMessage.value = data.error || 'No se pudo reenviar el código.';
      return;
    }

    startResendTimer(60);
    successMessage.value = t.value.modalAuth.codeSentSuccess;
  } catch (err) {
    errorMessage.value = 'Error al conectar con el servidor.';
  }
}

function finalizarLogin(user: Usuario, token?: string) {
  if (token) {
    localStorage.setItem('tm_auth_token', token);
  }

  loggedUser.value = user;

  if (props.pasajerosLocalesCount && props.pasajerosLocalesCount > 0) {
    showMigrationPrompt.value = true;
  } else {
    emit('login-success', { user, migrarLocales: false });
    emit('close');
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
    document.body.style.overflow = open ? 'hidden' : '';
  }
}, { immediate: true });

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

// Título y subtítulo dinámico del encabezado
const headerTitle = computed(() => {
  if (showMigrationPrompt.value) return t.value.modalAuth.migrationNoticeTitle;
  switch (view.value) {
    case 'login': return t.value.modalAuth.loginTitle;
    case 'register': return t.value.modalAuth.registerTitle;
    case 'verify_register': return t.value.modalAuth.verifyEmailTitle;
    case 'forgot_password': return t.value.modalAuth.forgotPasswordTitle;
    case 'reset_password': return t.value.modalAuth.resetPasswordBtn;
  }
});

const headerSubtitle = computed(() => {
  if (showMigrationPrompt.value) return '';
  switch (view.value) {
    case 'login': return t.value.modalAuth.loginSubtitle;
    case 'register': return t.value.modalAuth.registerSubtitle;
    case 'verify_register': return t.value.modalAuth.verifyEmailSubtitle.replace('{email}', pendingEmail.value);
    case 'forgot_password': return t.value.modalAuth.forgotPasswordSubtitle;
    case 'reset_password': return t.value.modalAuth.verifyEmailSubtitle.replace('{email}', pendingEmail.value);
  }
});
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
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto min-w-0"
        @click.stop
      >
        
        <!-- HEADER -->
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/90 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0 text-xl">
              <span v-if="view === 'forgot_password' || view === 'reset_password'">🔑</span>
              <span v-else-if="view === 'verify_register'">🔐</span>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                {{ headerTitle }}
              </h2>
              <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug break-words">
                {{ headerSubtitle }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="emit('close')"
            class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <!-- ALERTA DE ERROR -->
        <div v-if="errorMessage" class="mx-5 sm:mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
          <span class="shrink-0 text-sm">⚠️</span>
          <span class="break-words">{{ errorMessage }}</span>
        </div>

        <!-- ALERTA DE ÉXITO -->
        <div v-if="successMessage" class="mx-5 sm:mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
          <span class="shrink-0 text-sm">✓</span>
          <span class="break-words">{{ successMessage }}</span>
        </div>

        <!-- VISTA 1: LOGIN O REGISTRO -->
        <div v-if="!showMigrationPrompt && (view === 'login' || view === 'register')" class="p-5 sm:p-6 space-y-5">
          
          <!-- SELECTOR DE PESTAÑAS -->
          <div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              @click="view = 'login'; errorMessage = null; successMessage = null"
              :class="[
                'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer',
                view === 'login'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              ]"
            >
              {{ t.modalAuth.loginTab }}
            </button>
            <button
              type="button"
              @click="view = 'register'; errorMessage = null; successMessage = null"
              :class="[
                'py-2 text-xs font-bold rounded-lg transition-all cursor-pointer',
                view === 'register'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              ]"
            >
              {{ t.modalAuth.registerTab }}
            </button>
          </div>

          <!-- FORMULARIO LOGIN / REGISTRO -->
          <form @submit.prevent="handleSubmitAuth" class="space-y-4">
            
            <!-- Nombre (solo en registro) -->
            <div v-if="view === 'register'" class="space-y-1">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.fullName }}</label>
              <input
                v-model="nombre"
                type="text"
                required
                :placeholder="t.modalAuth.fullNamePlaceholder"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
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
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <!-- Contraseña -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.password }}</label>
                <!-- Enlace de contraseña olvidada -->
                <button
                  v-if="view === 'login'"
                  type="button"
                  @click="view = 'forgot_password'; errorMessage = null; successMessage = null"
                  class="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  {{ t.modalAuth.forgotPasswordLink }}
                </button>
              </div>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  :placeholder="t.modalAuth.passwordPlaceholder"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-xs cursor-pointer p-1"
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
              <span>{{ loading ? t.modalAuth.loading : (view === 'login' ? t.modalAuth.submitLogin : t.modalAuth.submitRegister) }}</span>
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

        <!-- VISTA 2: VERIFICAR CUENTA TRAS REGISTRO (OTP) -->
        <div v-else-if="!showMigrationPrompt && view === 'verify_register'" class="p-5 sm:p-6 space-y-5">
          <form @submit.prevent="handleVerifyRegistration" class="space-y-4">
            
            <div class="space-y-1.5 text-center">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {{ t.modalAuth.otpCodeLabel }}
              </label>
              
              <input
                :value="otpCode"
                @input="onOtpInput"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                required
                autofocus
                placeholder="• • • • • •"
                class="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/40 rounded-2xl py-3 text-emerald-700 dark:text-emerald-300 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-inner"
              />
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Revisa la bandeja de entrada o spam de <strong>{{ pendingEmail }}</strong>
              </p>
            </div>

            <!-- Botón de verificación e inicio de sesión automático -->
            <button
              type="submit"
              :disabled="loading || otpCode.length !== 6"
              class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ t.modalAuth.verifyAndLoginBtn }}</span>
            </button>
          </form>

          <!-- Opciones de Reenvío y Regreso -->
          <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              @click="view = 'login'; errorMessage = null; successMessage = null"
              class="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              ← {{ t.modalAuth.backToLogin }}
            </button>

            <button
              type="button"
              :disabled="resendCountdown > 0"
              @click="handleResend('registro')"
              class="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
            >
              {{ resendCountdown > 0 ? t.modalAuth.resendWait.replace('{sec}', resendCountdown.toString()) : t.modalAuth.resendCodeBtn }}
            </button>
          </div>
        </div>

        <!-- VISTA 3: SOLICITAR RECUPERACIÓN DE CONTRASEÑA -->
        <div v-else-if="!showMigrationPrompt && view === 'forgot_password'" class="p-5 sm:p-6 space-y-5">
          <form @submit.prevent="handleForgotPassword" class="space-y-4">
            
            <div class="space-y-1">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.email }}</label>
              <input
                v-model="email"
                type="email"
                required
                autofocus
                :placeholder="t.modalAuth.emailPlaceholder"
                class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ t.modalAuth.sendResetCodeBtn }}</span>
            </button>
          </form>

          <div class="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              @click="view = 'login'; errorMessage = null; successMessage = null"
              class="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium cursor-pointer"
            >
              ← {{ t.modalAuth.backToLogin }}
            </button>
          </div>
        </div>

        <!-- VISTA 4: RESTABLECER CONTRASEÑA CON OTP -->
        <div v-else-if="!showMigrationPrompt && view === 'reset_password'" class="p-5 sm:p-6 space-y-4">
          <form @submit.prevent="handleResetPassword" class="space-y-3.5">
            
            <!-- OTP Input -->
            <div class="space-y-1 text-center">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {{ t.modalAuth.otpCodeLabel }}
              </label>
              <input
                :value="otpCode"
                @input="onOtpInput"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                required
                placeholder="• • • • • •"
                class="w-full text-center tracking-[0.5em] text-xl font-mono font-bold bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/40 rounded-2xl py-2.5 text-emerald-700 dark:text-emerald-300 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>

            <!-- Nueva Contraseña -->
            <div class="space-y-1">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.newPasswordLabel }}</label>
              <div class="relative">
                <input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  :placeholder="t.modalAuth.newPasswordPlaceholder"
                  class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer p-1"
                >
                  {{ showNewPassword ? '👁️' : '🔒' }}
                </button>
              </div>
            </div>

            <!-- Confirmar Contraseña -->
            <div class="space-y-1">
              <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t.modalAuth.confirmPasswordLabel }}</label>
              <div class="relative">
                <input
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  :placeholder="t.modalAuth.confirmPasswordPlaceholder"
                  class="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  :class="[
                    confirmPassword && newPassword && confirmPassword !== newPassword
                      ? 'border-rose-400 dark:border-rose-500 bg-rose-50/20'
                      : 'border-slate-300 dark:border-slate-700'
                  ]"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer p-1"
                >
                  {{ showConfirmPassword ? '👁️' : '🔒' }}
                </button>
              </div>
              <p v-if="confirmPassword && newPassword && confirmPassword !== newPassword" class="text-[11px] text-rose-500 font-medium pt-0.5">
                {{ t.modalAuth.passwordsDoNotMatch }}
              </p>
            </div>

            <!-- Botón de Restablecer: sólo se activa cuando todos los campos están completos y válidos -->
            <button
              type="submit"
              :disabled="loading || otpCode.length !== 6 || newPassword.length < 6 || confirmPassword.length < 6 || newPassword !== confirmPassword"
              class="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ t.modalAuth.resetPasswordBtn }}</span>
            </button>
          </form>

          <div class="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              @click="view = 'login'; errorMessage = null; successMessage = null"
              class="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              ← {{ t.modalAuth.backToLogin }}
            </button>

            <button
              type="button"
              :disabled="resendCountdown > 0"
              @click="handleResend('recuperacion')"
              class="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
            >
              {{ resendCountdown > 0 ? t.modalAuth.resendWait.replace('{sec}', resendCountdown.toString()) : t.modalAuth.resendCodeBtn }}
            </button>
          </div>
        </div>

        <!-- PANTALLA DE MIGRACIÓN: CONFIRMACIÓN DE MIGRACIÓN LOCAL -> NUBE -->
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
