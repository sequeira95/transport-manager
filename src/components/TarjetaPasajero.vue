<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { PasajeroCompleto, DiaSemana, EstadoPago } from '../types';
import MapaRuta from './MapaRuta.vue';
import { updateLocalPago, toggleLocalActivo, deleteLocalPasajero, updateLocalNotificacionesPasajero } from '../lib/storage';
import { useI18n } from '../lib/i18n';
import { useNotifications, isNotifActiva } from '../lib/notifications';
import { apiFetch } from '../lib/api';

const props = defineProps<{
  pasajero: PasajeroCompleto;
  esModoLocal?: boolean;
}>();

const emit = defineEmits<{
  (e: 'pago-actualizado', payload: { suscripcionId: number; nuevoEstado: EstadoPago; suscripcion?: any }): void;
  (e: 'pasajero-eliminado', id: number): void;
  (e: 'editar-pasajero', pasajero: PasajeroCompleto): void;
  (e: 'activo-cambiado', payload: { id: number; activo: number }): void;
  (e: 'ver-historial', pasajero: PasajeroCompleto): void;
}>();

const { t, locale } = useI18n();

const diasSemana: DiaSemana[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

// Día actual por defecto o primer día con ruta
const getInitialDia = (): DiaSemana => {
  if (props.pasajero.rutas && props.pasajero.rutas.length > 0) {
    return props.pasajero.rutas[0].dia_semana;
  }
  return 'Lunes';
};

const diaSeleccionado = ref<DiaSemana>(getInitialDia());
const isUpdatingPago = ref(false);
const isUpdatingActivo = ref(false);
const isDeleting = ref(false);
const errorMensaje = ref<string | null>(null);

// Estado de pago y activo locales reactivos
const estadoPagoLocal = ref<EstadoPago>(props.pasajero.suscripcion?.estado_pago || 'Pendiente');
const activoLocal = ref<boolean>(props.pasajero.activo === 1);

// Estado de notificaciones individuales de la tarjeta
const { config: notifConfig } = useNotifications();
const notificacionesActivas = ref<boolean>(isNotifActiva(props.pasajero.notificaciones_activas));
const minutosAvisoLocal = ref<number>(
  props.pasajero.minutos_aviso != null ? Number(props.pasajero.minutos_aviso) : (notifConfig.value.defaultMinutesBefore || 30)
);
const menuNotifAbierto = ref(false);
const isUpdatingNotif = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

watch(
  () => props.pasajero.notificaciones_activas,
  (val) => {
    notificacionesActivas.value = isNotifActiva(val);
  }
);

watch(
  () => props.pasajero.minutos_aviso,
  (val) => {
    if (val != null) {
      minutosAvisoLocal.value = Number(val);
    }
  }
);

let timeoutLeave: any = null;

function onMouseEnter() {
  if (timeoutLeave) {
    clearTimeout(timeoutLeave);
    timeoutLeave = null;
  }
}

function onMouseLeave() {
  // Cierra suavemente cuando el cursor abandona el contenedor del menú
  timeoutLeave = setTimeout(() => {
    menuNotifAbierto.value = false;
  }, 250);
}

function handleClickOutside(e: MouseEvent) {
  if (menuNotifAbierto.value && dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    menuNotifAbierto.value = false;
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside);
  }
  if (timeoutLeave) {
    clearTimeout(timeoutLeave);
  }
});

async function alternarNotificaciones() {
  const nuevo = !notificacionesActivas.value;
  notificacionesActivas.value = nuevo;
  props.pasajero.notificaciones_activas = nuevo;
  isUpdatingNotif.value = true;

  // Persistir siempre en almacenamiento local
  updateLocalNotificacionesPasajero(props.pasajero.id, nuevo, minutosAvisoLocal.value);

  // Si hay sesión en la nube, sincronizar con Cloudflare D1
  if (!props.esModoLocal) {
    try {
      await apiFetch('/api/pasajeros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: props.pasajero.id,
          notificaciones_activas: nuevo ? 1 : 0
        })
      });
    } catch (err) {
      console.warn('Error alternando notificaciones en D1:', err);
    }
  }

  isUpdatingNotif.value = false;
}

async function cambiarMinutosAviso(minutos: number) {
  const minNum = Number(minutos);
  minutosAvisoLocal.value = minNum;
  props.pasajero.minutos_aviso = minNum;
  menuNotifAbierto.value = false;
  isUpdatingNotif.value = true;

  // Persistir siempre en almacenamiento local
  updateLocalNotificacionesPasajero(props.pasajero.id, notificacionesActivas.value, minNum);

  // Si hay sesión en la nube, sincronizar con Cloudflare D1
  if (!props.esModoLocal) {
    try {
      await apiFetch('/api/pasajeros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: props.pasajero.id,
          minutos_aviso: minNum
        })
      });
    } catch (err) {
      console.warn('Error actualizando minutos de aviso en D1:', err);
    }
  }

  isUpdatingNotif.value = false;
}

// Cálculo en tiempo real de días restantes o vencimiento respecto a la fecha de corte
const infoCorte = computed(() => {
  if (!props.pasajero.suscripcion?.fecha_corte) return null;

  const [y, m, d] = props.pasajero.suscripcion.fecha_corte.split('-').map(Number);
  const fechaCorte = new Date(y, m - 1, d);

  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  const diffTime = fechaCorte.getTime() - hoy.getTime();
  const diffDias = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    const dias = Math.abs(diffDias);
    return {
      estado: 'vencido',
      dias,
      badgeTexto: t.value.card.overdueBy.replace('{days}', String(dias)),
      textoLargo: `⚠️ ${t.value.card.overdueBy.replace('{days}', String(dias))}`,
      claseBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
      claseTexto: 'text-rose-400 font-bold',
      necesitaRenovacion: true
    };
  } else if (diffDias === 0) {
    return {
      estado: 'hoy',
      dias: 0,
      badgeTexto: t.value.card.dueToday,
      textoLargo: `🔔 ${t.value.card.dueToday}`,
      claseBadge: 'bg-amber-500/25 text-amber-300 border-amber-500/50 animate-pulse',
      claseTexto: 'text-amber-300 font-bold',
      necesitaRenovacion: true
    };
  } else if (diffDias <= 3) {
    return {
      estado: 'por_vencer',
      dias: diffDias,
      badgeTexto: t.value.card.dueIn.replace('{days}', String(diffDias)),
      textoLargo: `⏳ ${t.value.card.dueIn.replace('{days}', String(diffDias))}`,
      claseBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      claseTexto: 'text-amber-300 font-medium',
      necesitaRenovacion: false
    };
  } else {
    return {
      estado: 'al_dia',
      dias: diffDias,
      badgeTexto: estadoPagoLocal.value === 'Pagado' ? t.value.card.upToDateBadge : t.value.card.cutoffDate,
      textoLargo: t.value.card.daysLeft.replace('{days}', String(diffDias)),
      claseBadge: estadoPagoLocal.value === 'Pagado' 
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
        : 'bg-slate-700/60 text-slate-300 border-slate-600',
      claseTexto: 'text-slate-300',
      necesitaRenovacion: false
    };
  }
});

// Todas las rutas/paradas correspondientes al día seleccionado (ordenadas cronológicamente)
const rutasDelDia = computed(() => {
  return props.pasajero.rutas
    .filter(r => r.dia_semana === diaSeleccionado.value)
    .sort((a, b) => a.hora_recogida.localeCompare(b.hora_recogida));
});

// Lista de días que tienen ruta registrada
const diasConRuta = computed(() => {
  return new Set(props.pasajero.rutas.map(r => r.dia_semana));
});

// Enlace inteligente universal a Google Maps para la ruta del día seleccionado
const googleMapsUrlDia = computed(() => {
  const rutas = rutasDelDia.value;
  if (!rutas || rutas.length === 0) return '';
  const primera = rutas[0];
  const ultima = rutas[rutas.length - 1];

  const origin = (primera.lat_inicio != null && primera.lng_inicio != null)
    ? `${primera.lat_inicio},${primera.lng_inicio}`
    : encodeURIComponent(primera.punto_inicio || '');

  const destination = (ultima.lat_destino != null && ultima.lng_destino != null)
    ? `${ultima.lat_destino},${ultima.lng_destino}`
    : encodeURIComponent(ultima.punto_destino || '');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

  if (rutas.length > 1) {
    const waypoints: string[] = [];
    for (let i = 0; i < rutas.length - 1; i++) {
      const r = rutas[i];
      if (r.lat_destino != null && r.lng_destino != null) {
        waypoints.push(`${r.lat_destino},${r.lng_destino}`);
      } else if (r.punto_destino) {
        waypoints.push(encodeURIComponent(r.punto_destino));
      }
    }
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.join('|')}`;
    }
  }

  return url;
});

function getGoogleMapsSingleUrl(r: RutaHorario): string {
  const origin = (r.lat_inicio != null && r.lng_inicio != null)
    ? `${r.lat_inicio},${r.lng_inicio}`
    : encodeURIComponent(r.punto_inicio || '');

  const destination = (r.lat_destino != null && r.lng_destino != null)
    ? `${r.lat_destino},${r.lng_destino}`
    : encodeURIComponent(r.punto_destino || '');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

// Formateo de moneda
function formatMonto(monto?: number): string {
  if (monto == null) return '$0.00';
  return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(monto);
}

// Formateo de fecha
function formatFecha(fechaStr?: string): string {
  if (!fechaStr) return '--/--/----';
  const parts = fechaStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return fechaStr;
}

// Alternar estado de pago con llamada al endpoint de Astro SSR y renovación de ciclo si está vencido
async function alternarEstadoPago() {
  if (!props.pasajero.suscripcion) return;

  const esVencidoORequiereRenovacion = infoCorte.value?.necesitaRenovacion ?? false;
  // Si está vencido o vence hoy, al hacer clic se cobra el nuevo periodo y se avanza la fecha de corte
  const nuevoEstado: EstadoPago = esVencidoORequiereRenovacion 
    ? 'Pagado' 
    : (estadoPagoLocal.value === 'Pagado' ? 'Pendiente' : 'Pagado');
  const estadoAnterior = estadoPagoLocal.value;

  estadoPagoLocal.value = nuevoEstado;
  isUpdatingPago.value = true;
  errorMensaje.value = null;

  if (props.esModoLocal) {
    const updated = updateLocalPago(props.pasajero.suscripcion.id, nuevoEstado, esVencidoORequiereRenovacion);
    if (updated?.suscripcion) {
      props.pasajero.suscripcion.fecha_corte = updated.suscripcion.fecha_corte;
      props.pasajero.suscripcion.estado_pago = updated.suscripcion.estado_pago;
      estadoPagoLocal.value = updated.suscripcion.estado_pago;
    }
    emit('pago-actualizado', {
      suscripcionId: props.pasajero.suscripcion.id,
      nuevoEstado,
      suscripcion: updated?.suscripcion
    });
    isUpdatingPago.value = false;
    return;
  }

  try {
    const res = await apiFetch(`/api/pagos/${props.pasajero.suscripcion.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        estado_pago: nuevoEstado,
        monto: props.pasajero.suscripcion.monto,
        renovar_ciclo: esVencidoORequiereRenovacion
      })
    });

    if (!res.ok) {
      throw new Error(`Error en servidor: ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    if (data.suscripcion) {
      props.pasajero.suscripcion.fecha_corte = data.suscripcion.fecha_corte;
      props.pasajero.suscripcion.fecha_inicio = data.suscripcion.fecha_inicio;
      props.pasajero.suscripcion.estado_pago = data.suscripcion.estado_pago;
      estadoPagoLocal.value = data.suscripcion.estado_pago;
    }

    emit('pago-actualizado', {
      suscripcionId: props.pasajero.suscripcion.id,
      nuevoEstado,
      suscripcion: data.suscripcion
    });
  } catch (err: any) {
    estadoPagoLocal.value = estadoAnterior;
    errorMensaje.value = 'No se pudo guardar el cambio.';
    console.error('Error al actualizar pago:', err);
  } finally {
    isUpdatingPago.value = false;
  }
}

// Alternar entre Activo y Desactivado (pausar servicio)
async function alternarActivo() {
  const nuevoActivo = !activoLocal.value;
  activoLocal.value = nuevoActivo;
  isUpdatingActivo.value = true;

  if (props.esModoLocal) {
    toggleLocalActivo(props.pasajero.id, nuevoActivo ? 1 : 0);
    emit('activo-cambiado', {
      id: props.pasajero.id,
      activo: nuevoActivo ? 1 : 0
    });
    isUpdatingActivo.value = false;
    return;
  }

  try {
    const res = await apiFetch('/api/pasajeros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: props.pasajero.id,
        activo: nuevoActivo ? 1 : 0
      })
    });

    if (!res.ok) {
      throw new Error('Error al actualizar estado');
    }

    emit('activo-cambiado', {
      id: props.pasajero.id,
      activo: nuevoActivo ? 1 : 0
    });
  } catch (err) {
    activoLocal.value = !nuevoActivo;
    console.error('Error al alternar estado activo:', err);
  } finally {
    isUpdatingActivo.value = false;
  }
}

// Eliminar pasajero de la base de datos D1 o almacenamiento local
async function eliminarPasajero() {
  const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar a "${props.pasajero.nombre}" y todas sus rutas y cobros?`);
  if (!confirmacion) return;

  isDeleting.value = true;

  if (props.esModoLocal) {
    deleteLocalPasajero(props.pasajero.id);
    emit('pasajero-eliminado', props.pasajero.id);
    isDeleting.value = false;
    return;
  }

  try {
    const res = await apiFetch(`/api/pasajeros?id=${props.pasajero.id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      emit('pasajero-eliminado', props.pasajero.id);
    } else {
      alert('No se pudo eliminar el pasajero de D1.');
    }
  } catch (err) {
    console.error('Error al eliminar pasajero:', err);
    alert('Error al conectar con el servidor.');
  } finally {
    isDeleting.value = false;
  }
}

// Iniciales para el avatar
const iniciales = computed(() => {
  return props.pasajero.nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');
});

// Enlace limpio a WhatsApp (si tiene teléfono)
const tieneTelefono = computed(() => !!props.pasajero.telefono && props.pasajero.telefono.trim().length > 0);

const whatsappUrl = computed(() => {
  if (!tieneTelefono.value) return '#';
  const numLimpio = props.pasajero.telefono.replace(/[^0-9]/g, '');
  return `https://wa.me/${numLimpio}?text=Hola%20${encodeURIComponent(props.pasajero.nombre)},%20te%20contacto%20desde%20Passengo`;
});
</script>

<template>
  <div 
    :class="[
      'group relative bg-white dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-card dark:hover:shadow-card-hover overflow-hidden flex flex-col justify-between',
      activoLocal ? 'border-slate-200 dark:border-slate-700/80 hover:border-brand-500/60' : 'border-slate-200 dark:border-slate-800 opacity-75 bg-slate-50 dark:bg-slate-850/80'
    ]"
  >
    
    <!-- Top accent border depending on payment and overdue status -->
    <div 
      class="h-1.5 w-full transition-colors duration-300"
      :class="[
        !activoLocal
          ? 'bg-slate-400 dark:bg-slate-600'
          : infoCorte?.estado === 'vencido'
            ? 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
            : infoCorte?.estado === 'hoy'
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse'
              : infoCorte?.estado === 'por_vencer'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                : estadoPagoLocal === 'Pagado'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-amber-500 to-orange-400'
      ]"
    ></div>

    <div class="p-4 sm:p-6 space-y-4 sm:space-y-5">
      
      <!-- 1. Header: Pasajero (Nombre, teléfono, editar, eliminar y avatar) -->
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div class="flex items-start sm:items-center gap-3 min-w-0">
          <div 
            :class="[
              'w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-white font-bold flex items-center justify-center text-sm sm:text-base shadow-md shrink-0 transition-colors',
              activoLocal ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 shadow-teal-500/20' : 'bg-slate-400 dark:bg-slate-700 text-slate-100 dark:text-slate-400 shadow-none'
            ]"
          >
            {{ iniciales }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors truncate max-w-[150px] sm:max-w-none">
                {{ pasajero.nombre }}
              </h3>
              
              <!-- Botones de Acción: Editar, Historial, Notificaciones y Eliminar -->
              <div class="flex items-center gap-0.5">
                <!-- Botón de Notificaciones con Menú Rápido (Se cierra al salir el mouse o click afuera) -->
                <div
                  ref="dropdownRef"
                  class="relative"
                  @mouseenter="onMouseEnter"
                  @mouseleave="onMouseLeave"
                >
                  <button
                    type="button"
                    @click="menuNotifAbierto = !menuNotifAbierto"
                    class="p-1 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                    :class="[
                      notificacionesActivas
                        ? 'text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    ]"
                    :title="notificacionesActivas ? `${t.notifications.cardReminderActive.replace('{min}', String(minutosAvisoLocal))}` : t.notifications.cardReminderDisabled"
                  >
                    <svg v-if="notificacionesActivas" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <svg v-else class="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                    <span v-if="notificacionesActivas" class="text-[9px] font-black leading-none px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {{ minutosAvisoLocal }}m
                    </span>
                  </button>

                  <!-- Popover / Menú Desplegable de Ajuste de Minutos -->
                  <div
                    v-if="menuNotifAbierto"
                    class="absolute right-0 top-full mt-1.5 w-48 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-30 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div class="px-3 py-1 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {{ t.notifications.setLeadTime }}
                      </span>
                      <button
                        type="button"
                        @click="menuNotifAbierto = false"
                        class="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    <!-- Interruptor de activar/desactivar -->
                    <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between">
                      <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {{ notificacionesActivas ? 'Activadas' : 'Desactivadas' }}
                      </span>
                      <button
                        type="button"
                        @click="alternarNotificaciones"
                        :class="[
                          'w-8 h-4.5 rounded-full transition-colors relative cursor-pointer p-0.5',
                          notificacionesActivas ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                        ]"
                      >
                        <div
                          :class="[
                            'w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform',
                            notificacionesActivas ? 'translate-x-3.5' : 'translate-x-0'
                          ]"
                        ></div>
                      </button>
                    </div>

                    <!-- Opciones de minutos -->
                    <div class="p-1 space-y-0.5">
                      <button
                        v-for="min in [10, 15, 30, 45, 60]"
                        :key="min"
                        type="button"
                        @click="cambiarMinutosAviso(min)"
                        :class="[
                          'w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer',
                          minutosAvisoLocal === min && notificacionesActivas
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        ]"
                      >
                        <span>{{ min }} minutos antes</span>
                        <span v-if="minutosAvisoLocal === min && notificacionesActivas">✓</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  @click="emit('editar-pasajero', pasajero)"
                  class="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  :title="t.card.edit"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  type="button"
                  @click="emit('ver-historial', pasajero)"
                  class="text-slate-400 hover:text-amber-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  :title="t.card.viewReceipts"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </button>

                <button
                  type="button"
                  @click="eliminarPasajero"
                  :disabled="isDeleting"
                  class="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  :title="t.card.delete"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <a 
                v-if="tieneTelefono"
                :href="whatsappUrl" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium flex items-center gap-1 transition-colors"
                :title="t.card.whatsapp"
              >
                <svg class="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.42 0-2.82-.37-4.06-1.08l-.29-.17-3.12.82.83-3.04-.19-.3a8.212 8.212 0 01-1.26-4.46c0-4.54 3.7-8.24 8.24-8.24z"/>
                </svg>
                <span>{{ pasajero.telefono }}</span>
              </a>

              <span v-if="tieneTelefono" class="text-slate-400 dark:text-slate-600 hidden xs:inline">•</span>
              
              <!-- Botón Interactivo para Activar / Desactivar Pasajero -->
              <button
                type="button"
                @click="alternarActivo"
                :disabled="isUpdatingActivo"
                :class="[
                  'px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  activoLocal
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-amber-100 dark:bg-slate-700/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 hover:bg-amber-200 dark:hover:bg-slate-700'
                ]"
              >
                <span 
                  class="w-1.5 h-1.5 rounded-full" 
                  :class="activoLocal ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-amber-500 dark:bg-amber-400'"
                ></span>
                <span>{{ activoLocal ? t.card.active : t.card.paused }}</span>
              </button>

              <span v-if="esModoLocal" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {{ t.card.localBadge }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botón de Cobro Interactivo con Alerta de Vencimiento / Renovación -->
        <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-750">
          <button
            type="button"
            @click="alternarEstadoPago"
            :disabled="isUpdatingPago || !pasajero.suscripcion"
            :class="[
              'px-3 sm:px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer sm:ml-auto',
              infoCorte?.necesitaRenovacion
                ? 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400 dark:border-rose-500/50 hover:bg-rose-500/25 ring-1 ring-rose-500/30'
                : estadoPagoLocal === 'Pagado'
                  ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400 dark:border-amber-500/40 hover:bg-amber-500/25'
            ]"
          >
            <span 
              class="w-2 h-2 rounded-full"
              :class="[
                infoCorte?.necesitaRenovacion
                  ? 'bg-rose-500 dark:bg-rose-400 animate-ping'
                  : estadoPagoLocal === 'Pagado'
                    ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse'
                    : 'bg-amber-500 dark:bg-amber-400'
              ]"
            ></span>
            <span v-if="isUpdatingPago">...</span>
            <span v-else-if="infoCorte?.necesitaRenovacion">
              {{ t.card.payAndRenew }}
            </span>
            <span v-else>{{ estadoPagoLocal === 'Pagado' ? t.card.paid : t.card.pendingPayment }}</span>
          </button>

          <!-- Subtexto en tiempo real de vencimiento y recibos -->
          <div class="flex sm:flex-col items-end gap-2 sm:gap-0.5 text-right">
            <div v-if="infoCorte" class="text-[10px] font-medium" :class="infoCorte.claseTexto">
              {{ infoCorte.textoLargo }}
            </div>
            <div v-if="errorMensaje" class="text-[10px] text-rose-500 dark:text-rose-400">
              {{ errorMensaje }}
            </div>

            <!-- Enlace rápido a ver recibos del pasajero -->
            <button
              type="button"
              @click="emit('ver-historial', pasajero)"
              class="text-[10px] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>📜 {{ t.card.viewReceipts }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Gestión de Cobro (Monto, modalidad, fechas de corte con badge dinámico) -->
      <div v-if="pasajero.suscripcion" class="bg-slate-50 dark:bg-slate-900/70 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 grid grid-cols-3 gap-2 text-center">
        <div>
          <div class="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">{{ t.card.monthlyFee }}</div>
          <div class="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {{ formatMonto(pasajero.suscripcion.monto) }}
          </div>
        </div>
        <div>
          <div class="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">{{ t.modalPassenger.frequency }}</div>
          <div class="mt-0.5 inline-block text-[11px] font-semibold capitalize px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">
            {{ pasajero.suscripcion.modalidad }}
          </div>
        </div>
        <div>
          <div class="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">{{ t.card.cutoffDate }}</div>
          <div class="text-xs font-bold mt-0.5" :class="infoCorte?.claseTexto">
            {{ formatFecha(pasajero.suscripcion.fecha_corte) }}
          </div>
          <div v-if="infoCorte" class="mt-1">
            <span 
              class="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border"
              :class="infoCorte.claseBadge"
            >
              {{ infoCorte.badgeTexto }}
            </span>
          </div>
        </div>
      </div>

      <!-- 3. Itinerario de Rutas: Horarios y direcciones asignadas por día -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ t.card.weeklySchedule }}
          </div>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">
            {{ pasajero.rutas.length }} {{ t.card.stops.toLowerCase() }}
          </span>
        </div>

        <!-- Selector de días de la semana con badges -->
        <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="dia in diasSemana"
            :key="dia"
            type="button"
            @click="diaSeleccionado = dia"
            :class="[
              'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all shrink-0',
              diaSeleccionado === dia
                ? 'bg-brand-600 text-white shadow-sm'
                : diasConRuta.has(dia)
                  ? 'bg-slate-200 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                  : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
            ]"
          >
            {{ (t.days as any)[dia.toLowerCase().substring(0, 3)] || dia.substring(0, 3) }}
            <span 
              v-if="diasConRuta.has(dia)" 
              class="ml-0.5 inline-block w-1.5 h-1.5 rounded-full"
              :class="diaSeleccionado === dia ? 'bg-white' : 'bg-brand-500 dark:bg-brand-400'"
            ></span>
          </button>
        </div>

        <!-- Detalle de todas las paradas/tramos para el día seleccionado -->
        <div v-if="rutasDelDia.length > 0" class="space-y-2">
          <div 
            v-for="(r, idx) in rutasDelDia" 
            :key="r.id || idx"
            class="bg-slate-50 dark:bg-slate-900/70 rounded-xl p-3 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <div class="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
              <span class="flex items-center gap-1.5 text-brand-600 dark:text-brand-300 font-semibold">
                <span class="w-4 h-4 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {{ idx + 1 }}
                </span>
                <span>{{ t.card.stops }} #{{ idx + 1 }}</span>
              </span>
              <div class="flex items-center gap-2">
                <span class="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-white font-mono font-bold border border-slate-200 dark:border-slate-700 text-[11px] shadow-sm">
                  🕒 {{ r.hora_recogida }} hs
                </span>
                <a
                  :href="getGoogleMapsSingleUrl(r)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-teal-300 font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-emerald-500/20 shrink-0"
                  :title="t.card.navigateStop"
                >
                  <span>📍 {{ t.card.navigateStop }}</span>
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div class="space-y-1.5 text-[11px]">
              <div class="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <span class="text-emerald-500 font-bold mt-0.5">●</span>
                <div class="leading-tight">
                  <span class="text-slate-400 text-[10px] block">A:</span>
                  <span class="text-slate-900 dark:text-white font-medium">{{ r.punto_inicio }}</span>
                </div>
              </div>
              <div class="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <span class="text-rose-500 font-bold mt-0.5">■</span>
                <div class="leading-tight">
                  <span class="text-slate-400 text-[10px] block">B:</span>
                  <span class="text-slate-900 dark:text-white font-medium">{{ r.punto_destino }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="bg-slate-100/60 dark:bg-slate-900/40 rounded-xl p-3 border border-dashed border-slate-300 dark:border-slate-700/60 text-center text-xs text-slate-400">
          --
        </div>
      </div>

      <!-- 4. Integración de Mapa Interactivo con Leaflet + OpenStreetMap -->
      <div>
        <div class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between gap-2 flex-wrap">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ t.card.weeklySchedule }}
          </span>

          <div class="flex items-center gap-2">
            <span v-if="rutasDelDia.length > 1" class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              {{ rutasDelDia.length }} {{ t.card.stops.toLowerCase() }}
            </span>
            <a
              v-if="googleMapsUrlDia"
              :href="googleMapsUrlDia"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600/15 via-teal-600/15 to-blue-600/15 hover:from-emerald-600/25 hover:to-blue-600/25 text-emerald-700 dark:text-teal-300 border border-emerald-500/30 text-[11px] font-bold transition-all transform active:scale-95 shadow-sm cursor-pointer"
              title="Abrir este recorrido completo en Google Maps"
            >
              <span>🗺️ {{ t.card.openInGoogleMaps }}</span>
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
        <MapaRuta
          :key="`map-${pasajero.id}-${diaSeleccionado}-${rutasDelDia.length}`"
          :id-pasajero="pasajero.id"
          :rutas="rutasDelDia"
          :lat-inicio="rutasDelDia[0]?.lat_inicio"
          :lng-inicio="rutasDelDia[0]?.lng_inicio"
          :lat-destino="rutasDelDia[rutasDelDia.length - 1]?.lat_destino"
          :lng-destino="rutasDelDia[rutasDelDia.length - 1]?.lng_destino"
          :punto-inicio="rutasDelDia[0]?.punto_inicio || 'A'"
          :punto-destino="rutasDelDia[rutasDelDia.length - 1]?.punto_destino || 'B'"
        />
      </div>

    </div>

    <!-- Footer rápido de la tarjeta -->
    <div class="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
      <span class="truncate max-w-[160px] sm:max-w-[220px]" :title="pasajero.notas || ''">
        📝 {{ pasajero.notas || '--' }}
      </span>
      <a 
        v-if="tieneTelefono"
        :href="`tel:${pasajero.telefono}`" 
        class="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold flex items-center gap-1 shrink-0 ml-2"
      >
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {{ t.card.call }}
      </a>
    </div>

  </div>
</template>
