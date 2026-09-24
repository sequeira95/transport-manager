import { ref, computed } from 'vue';
import type { PasajeroCompleto, DiaSemana, NotificationConfig, ScheduledPickupNotice } from '../types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativePlatform } from './platform';

const STORAGE_CONFIG_KEY = 'tm_notifications_config_v1';
const FIRED_TODAY_PREFIX = 'tm_notif_fired_';

// Configuración por defecto
const defaultConfig: NotificationConfig = {
  enabled: true,
  defaultMinutesBefore: 30,
  soundEnabled: true,
  inAppBannerEnabled: true,
};

// Estado reactivo global
const config = ref<NotificationConfig>({ ...defaultConfig });
const permission = ref<NotificationPermission>('default');
const activeInAppToast = ref<{ title: string; body: string; id: number } | null>(null);

let channelInitialized = false;

/**
 * Registra el canal de notificaciones en Android con alta prioridad y sonido
 */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (channelInitialized || typeof window === 'undefined' || !isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: 'passengo_reminders',
      name: 'Recordatorios de Recogida',
      description: 'Avisos y recordatorios de transporte de pasajeros',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    channelInitialized = true;
  } catch (err) {
    console.warn('Error al crear canal de notificaciones en Android:', err);
  }
}

/**
 * Consulta el estado actual de los permisos de notificación (nativo o navegador)
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied';

  if (isNativePlatform()) {
    try {
      await ensureAndroidNotificationChannel();
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        permission.value = 'granted';
      } else if (status.display === 'denied') {
        permission.value = 'denied';
      } else {
        permission.value = 'default';
      }
      return permission.value;
    } catch (err) {
      console.warn('Error al verificar permisos nativos:', err);
      return 'default';
    }
  }

  if ('Notification' in window) {
    permission.value = Notification.permission;
    return Notification.permission;
  }

  return 'denied';
}

/**
 * Solicita los permisos automáticamente al abrir la app móvil en el teléfono si aún no han sido concedidos
 */
export async function autoPromptNotificationPermissionIfNative(): Promise<void> {
  if (typeof window === 'undefined' || !isNativePlatform()) return;

  try {
    await ensureAndroidNotificationChannel();
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      const res = await LocalNotifications.requestPermissions();
      permission.value = res.display === 'granted' ? 'granted' : 'denied';
    } else {
      permission.value = status.display === 'granted' ? 'granted' : 'denied';
    }
  } catch (err) {
    console.warn('Error al auto-solicitar permisos en nativo:', err);
  }
}

// Inicializar en cliente
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) {
      config.value = { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Error cargando configuración de notificaciones:', err);
  }

  if (isNativePlatform()) {
    checkNotificationPermission();
  } else if ('Notification' in window) {
    permission.value = Notification.permission;
  }
}

/**
 * Normaliza y comprueba si las notificaciones de un pasajero están activas,
 * contemplando booleanos, números de SQLite (0/1) y cadenas ('0', '1', 'false', 'true').
 */
export function isNotifActiva(val: any): boolean {
  if (val === false || val === 0 || val === '0' || val === 'false') {
    return false;
  }
  return true;
}

/**
 * Guarda la configuración en localStorage
 */
export function saveNotificationConfig(newConfig: Partial<NotificationConfig>) {
  config.value = { ...config.value, ...newConfig };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config.value));
    } catch (err) {
      console.warn('Error guardando configuración de notificaciones:', err);
    }
  }
}

/**
 * Sintetiza un sonido agradable de campanilla / chime mediante Web Audio API
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Primer tono: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);

    gain1.gain.setValueAtTime(0.001, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.22);

    // Segundo tono: 880 Hz (A5) más brillante
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);

    gain2.gain.setValueAtTime(0.001, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.48);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de notificación:', err);
  }
}

/**
 * Solicita permisos de notificación al usuario (vía Capacitor nativo en Android o API Notification web)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') {
    return 'denied';
  }

  if (isNativePlatform()) {
    try {
      await ensureAndroidNotificationChannel();
      const res = await LocalNotifications.requestPermissions();
      const granted = res.display === 'granted';
      permission.value = granted ? 'granted' : 'denied';
      return permission.value;
    } catch (err) {
      console.error('Error al solicitar permiso de notificaciones en Android:', err);
      permission.value = 'denied';
      return 'denied';
    }
  }

  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    const res = await Notification.requestPermission();
    permission.value = res;
    return res;
  } catch (err) {
    console.error('Error al solicitar permiso de notificaciones:', err);
    permission.value = 'denied';
    return 'denied';
  }
}

/**
 * Envía una notificación nativa y/o toast in-app con sonido
 */
export function sendNotification(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}): void {
  // Sonido si está habilitado
  if (config.value.soundEnabled) {
    playNotificationSound();
  }

  // Toast in-app
  if (config.value.inAppBannerEnabled) {
    const id = Date.now();
    activeInAppToast.value = {
      title: options.title,
      body: options.body,
      id
    };
    setTimeout(() => {
      if (activeInAppToast.value?.id === id) {
        activeInAppToast.value = null;
      }
    }, 6000);
  }

  // Si estamos en plataforma nativa móvil (Android APK / iOS)
  if (isNativePlatform()) {
    ensureAndroidNotificationChannel().then(() => {
      LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000) + 1,
            title: options.title,
            body: options.body,
            channelId: 'passengo_reminders',
            schedule: { at: new Date(Date.now() + 100) }
          }
        ]
      }).catch(err => {
        console.warn('Error al disparar LocalNotifications en Android:', err);
      });
    });
    return;
  }

  // Notificación del sistema si hay permisos concedidos en Web
  if (typeof window !== 'undefined' && 'Notification' in window && permission.value === 'granted') {
    try {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag || `tm-${Date.now()}`
      });
    } catch (e) {
      console.warn('Error al disparar Notification nativa:', e);
    }
  }
}

/**
 * Obtiene el día de la semana actual en el formato DiaSemana
 */
export function getDiaSemanaHoy(): DiaSemana {
  const dias: DiaSemana[] = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const hoyIndex = new Date().getDay();
  return dias[hoyIndex];
}

/**
 * Devuelve todas las paradas y avisos programados para el día actual
 */
export function getUpcomingPickups(pasajeros: PasajeroCompleto[]): ScheduledPickupNotice[] {
  if (typeof window === 'undefined') return [];

  const hoyDia = getDiaSemanaHoy();
  const ahora = new Date();
  const notices: ScheduledPickupNotice[] = [];

  for (const pasajero of pasajeros) {
    // Si el pasajero está pausado o tiene notificaciones expresamente apagadas
    if (pasajero.activo === 0 || !isNotifActiva(pasajero.notificaciones_activas)) {
      continue;
    }

    const minutosAviso = pasajero.minutos_aviso != null && pasajero.minutos_aviso > 0
      ? pasajero.minutos_aviso
      : config.value.defaultMinutesBefore;

    const rutasHoy = (pasajero.rutas || []).filter(r => r.dia_semana === hoyDia);

    for (const ruta of rutasHoy) {
      if (!ruta.hora_recogida) continue;

      const [hStr, mStr] = ruta.hora_recogida.split(':');
      const hora = parseInt(hStr, 10);
      const minuto = parseInt(mStr, 10);
      if (isNaN(hora) || isNaN(minuto)) continue;

      const pickupDate = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hora, minuto, 0);
      const notifDate = new Date(pickupDate.getTime() - minutosAviso * 60 * 1000);

      const diffMinutesToPickup = Math.round((pickupDate.getTime() - ahora.getTime()) / (60 * 1000));
      const diffMinutesToNotif = Math.round((notifDate.getTime() - ahora.getTime()) / (60 * 1000));

      const horaNotifH = String(notifDate.getHours()).padStart(2, '0');
      const horaNotifM = String(notifDate.getMinutes()).padStart(2, '0');
      const horaNotificacionStr = `${horaNotifH}:${horaNotifM}`;

      // Considerar inminente si falta entre 0 y el tiempo de aviso
      const esInminente = diffMinutesToNotif <= 0 && diffMinutesToPickup > 0;

      notices.push({
        pasajeroId: pasajero.id,
        pasajeroNombre: pasajero.nombre,
        pasajeroTelefono: pasajero.telefono,
        rutaId: ruta.id,
        diaSemana: hoyDia,
        horaRecogida: ruta.hora_recogida,
        puntoInicio: ruta.punto_inicio,
        puntoDestino: ruta.punto_destino,
        minutosAviso,
        minutosRestantes: diffMinutesToPickup,
        horaNotificacionStr,
        esInminente
      });
    }
  }

  // Ordenar cronológicamente por hora de recogida
  return notices.sort((a, b) => a.horaRecogida.localeCompare(b.horaRecogida));
}

/**
 * Evalúa los horarios de hoy y dispara las notificaciones programadas
 */
export function checkScheduledPickups(
  pasajeros: PasajeroCompleto[],
  texts?: {
    reminderTitle?: string;
    reminderBody?: string;
  }
): void {
  if (!config.value.enabled) return;

  const hoyDateStr = new Date().toISOString().split('T')[0];
  const notices = getUpcomingPickups(pasajeros);
  const ahora = new Date();

  for (const notice of notices) {
    const key = `${FIRED_TODAY_PREFIX}${hoyDateStr}_${notice.rutaId}`;

    // Si ya se disparó hoy en esta sesión/navegador, ignorar
    if (sessionStorage.getItem(key)) {
      continue;
    }

    const [hStr, mStr] = notice.horaRecogida.split(':');
    const pickupDate = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(hStr, 10), parseInt(mStr, 10), 0);
    const notifTargetTime = pickupDate.getTime() - notice.minutosAviso * 60 * 1000;
    const diffMs = notifTargetTime - ahora.getTime();

    // Ventana de disparo: cuando se alcanza la hora de aviso (con margen de 75 segundos)
    // y antes de la hora efectiva de recogida
    const estaEnVentana = diffMs <= 15000 && pickupDate.getTime() > ahora.getTime();

    if (estaEnVentana) {
      sessionStorage.setItem(key, '1');

      const title = (texts?.reminderTitle || '🔔 Recogida en {min} min: {name}')
        .replace('{min}', String(notice.minutosAviso))
        .replace('{name}', notice.pasajeroNombre);

      const body = (texts?.reminderBody || 'A las {time} en {origin}. Destino: {destination}')
        .replace('{time}', notice.horaRecogida)
        .replace('{origin}', notice.puntoInicio)
        .replace('{destination}', notice.puntoDestino);

      sendNotification({
        title,
        body,
        tag: `tm-pickup-${notice.rutaId}-${hoyDateStr}`
      });
    }
  }
}

/**
 * Inicia el temporizador en segundo plano que revisa periódicamente los avisos
 */
export function startNotificationScheduler(
  getPasajeros: () => PasajeroCompleto[],
  getTexts?: () => { reminderTitle?: string; reminderBody?: string }
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Ejecución inmediata
  checkScheduledPickups(getPasajeros(), getTexts ? getTexts() : undefined);

  // Intervalo cada 30 segundos
  const intervalId = window.setInterval(() => {
    checkScheduledPickups(getPasajeros(), getTexts ? getTexts() : undefined);
  }, 30000);

  return () => {
    window.clearInterval(intervalId);
  };
}

/**
 * Composable de notificaciones para usar en componentes Vue
 */
export function useNotifications() {
  const isSupported = computed(() => {
    if (typeof window === 'undefined') return false;
    return isNativePlatform() || 'Notification' in window;
  });

  const isGranted = computed(() => permission.value === 'granted');
  const isDenied = computed(() => permission.value === 'denied');
  const isDefault = computed(() => permission.value === 'default');

  function dismissToast() {
    activeInAppToast.value = null;
  }

  return {
    config,
    permission,
    isSupported,
    isGranted,
    isDenied,
    isDefault,
    activeInAppToast,
    saveNotificationConfig,
    requestNotificationPermission,
    checkNotificationPermission,
    autoPromptNotificationPermissionIfNative,
    playNotificationSound,
    sendNotification,
    dismissToast,
    getUpcomingPickups,
    getDiaSemanaHoy,
    startNotificationScheduler
  };
}
