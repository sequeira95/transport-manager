<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PasajeroCompleto, DiaSemana, EstadoPago } from '../types';
import MapaRuta from './MapaRuta.vue';
import { updateLocalPago, toggleLocalActivo, deleteLocalPasajero } from '../lib/storage';
import { useI18n } from '../lib/i18n';

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
    const res = await fetch(`/api/pagos/${props.pasajero.suscripcion.id}`, {
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
    const res = await fetch('/api/pasajeros', {
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
    const res = await fetch(`/api/pasajeros?id=${props.pasajero.id}`, {
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
  return `https://wa.me/${numLimpio}?text=Hola%20${encodeURIComponent(props.pasajero.nombre)},%20te%20contacto%20desde%20TransportManager`;
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
              activoLocal ? 'bg-gradient-to-br from-brand-600 to-indigo-700 shadow-brand-500/20' : 'bg-slate-400 dark:bg-slate-700 text-slate-100 dark:text-slate-400 shadow-none'
            ]"
          >
            {{ iniciales }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors truncate max-w-[150px] sm:max-w-none">
                {{ pasajero.nombre }}
              </h3>
              
              <!-- Botones de Acción: Editar, Historial y Eliminar -->
              <div class="flex items-center gap-0.5">
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
              <span class="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-white font-mono font-bold border border-slate-200 dark:border-slate-700 text-[11px] shadow-sm">
                🕒 {{ r.hora_recogida }} hs
              </span>
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
        <div class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ t.card.weeklySchedule }}
          </span>
          <span v-if="rutasDelDia.length > 1" class="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
            {{ rutasDelDia.length }} {{ t.card.stops.toLowerCase() }}
          </span>
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
