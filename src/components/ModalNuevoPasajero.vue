<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ModalidadPago, DiaSemana, EstadoPago, PasajeroCompleto } from '../types';
import SelectorMapaModal from './SelectorMapaModal.vue';
import InputDireccionAutocomplete from './InputDireccionAutocomplete.vue';
import { addLocalPasajero, updateLocalPasajero } from '../lib/storage';
import { useI18n } from '../lib/i18n';
import { isNotifActiva } from '../lib/notifications';
import { apiFetch } from '../lib/api';

const props = defineProps<{
  isOpen: boolean;
  pasajeroEditar?: PasajeroCompleto | null;
  esModoLocal?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'pasajero-guardado'): void;
}>();

const { t } = useI18n();

const loading = ref(false);
const error = ref<string | null>(null);

const todosLosDias: DiaSemana[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

// Ubicación GPS detectada para priorizar autocompletado en la zona del usuario
const userGpsLat = ref<number | null>(null);
const userGpsLng = ref<number | null>(null);

function onUserLocationDetected(coords: { lat: number; lng: number }) {
  userGpsLat.value = coords.lat;
  userGpsLng.value = coords.lng;
}

// Días seleccionados para el transporte
const diasSeleccionados = ref<DiaSemana[]>(['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']);

// Día y tramo activo que se está configurando / visualizando en el mapa
const diaConfigurando = ref<DiaSemana>('Lunes');
const tramoActivoIndex = ref<number>(0);

interface TramoItem {
  id: string;
  hora_recogida: string;
  punto_inicio: string;
  punto_destino: string;
  lat_inicio: number;
  lng_inicio: number;
  lat_destino: number;
  lng_destino: number;
}

function crearTramoInicial(hora: string = '07:30', inicio: string = '', destino: string = ''): TramoItem {
  const latBase = userGpsLat.value || 10.4806;
  const lngBase = userGpsLng.value || -66.9036;
  return {
    id: Math.random().toString(36).substring(2, 9),
    hora_recogida: hora,
    punto_inicio: inicio,
    punto_destino: destino,
    lat_inicio: latBase,
    lng_inicio: lngBase,
    lat_destino: Number((latBase + 0.015).toFixed(5)),
    lng_destino: Number((lngBase + 0.015).toFixed(5))
  };
}

// Configuración de múltiples tramos/paradas por cada día de la semana (por defecto en blanco)
const configPorDia = ref<Record<DiaSemana, TramoItem[]>>({
  Lunes: [crearTramoInicial('07:30', '', '')],
  Martes: [crearTramoInicial('07:30', '', '')],
  Miercoles: [crearTramoInicial('07:30', '', '')],
  Jueves: [crearTramoInicial('07:30', '', '')],
  Viernes: [crearTramoInicial('07:30', '', '')],
  Sabado: [crearTramoInicial('08:30', '', '')],
  Domingo: [crearTramoInicial('09:00', '', '')],
});

// Datos generales del pasajero
const form = ref({
  nombre: '',
  telefono: '',
  notas: '',
  notificaciones_activas: true,
  minutos_aviso: 30,
  modalidad: 'mensual' as ModalidadPago,
  monto: 0,
  estado_pago: 'Pendiente' as EstadoPago,
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_corte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
});

// Función para reiniciar el formulario completamente a valores de fábrica en blanco
function reiniciarFormularioAFabrica() {
  form.value = {
    nombre: '',
    telefono: '',
    notas: '',
    notificaciones_activas: true,
    minutos_aviso: 30,
    modalidad: 'mensual',
    monto: 0,
    estado_pago: 'Pendiente',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_corte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  configPorDia.value = {
    Lunes: [crearTramoInicial('07:30', '', '')],
    Martes: [crearTramoInicial('07:30', '', '')],
    Miercoles: [crearTramoInicial('07:30', '', '')],
    Jueves: [crearTramoInicial('07:30', '', '')],
    Viernes: [crearTramoInicial('07:30', '', '')],
    Sabado: [crearTramoInicial('08:30', '', '')],
    Domingo: [crearTramoInicial('09:00', '', '')],
  };

  diasSeleccionados.value = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
  diaConfigurando.value = 'Lunes';
  tramoActivoIndex.value = 0;
  diaCopiado.value = null;
  paradasCopiadas.value = null;
  paradaCopiada.value = null;
  mensajeNotificacion.value = null;
  error.value = null;
}

// Inicializar o rellenar el formulario cuando se abre o cambia pasajeroEditar
watch(
  () => [props.isOpen, props.pasajeroEditar],
  ([isOpen, pEditar]) => {
    if (!isOpen) return;

    error.value = null;
    if (pEditar) {
      // Modo Edición: Cargar datos existentes
      const p = pEditar as PasajeroCompleto;
      form.value = {
        nombre: p.nombre,
        telefono: p.telefono || '',
        notas: p.notas || '',
        notificaciones_activas: isNotifActiva(p.notificaciones_activas),
        minutos_aviso: p.minutos_aviso ?? 30,
        modalidad: p.suscripcion?.modalidad || 'mensual',
        monto: p.suscripcion?.monto || 0,
        estado_pago: p.suscripcion?.estado_pago || 'Pendiente',
        fecha_inicio: p.suscripcion?.fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_corte: p.suscripcion?.fecha_corte || new Date().toISOString().split('T')[0],
      };

      // Cargar rutas existentes agrupadas por día
      const nuevosDias = new Set<DiaSemana>();
      const nuevaConfig: Record<DiaSemana, TramoItem[]> = {
        Lunes: [],
        Martes: [],
        Miercoles: [],
        Jueves: [],
        Viernes: [],
        Sabado: [],
        Domingo: []
      };

      if (p.rutas && p.rutas.length > 0) {
        for (const r of p.rutas) {
          nuevosDias.add(r.dia_semana);
          nuevaConfig[r.dia_semana].push({
            id: String(r.id || Math.random()),
            hora_recogida: r.hora_recogida,
            punto_inicio: r.punto_inicio,
            punto_destino: r.punto_destino,
            lat_inicio: r.lat_inicio ?? -34.6037,
            lng_inicio: r.lng_inicio ?? -58.3816,
            lat_destino: r.lat_destino ?? -34.5875,
            lng_destino: r.lng_destino ?? -58.4124
          });
        }
      }

      // Asegurar que cada día tenga al menos un tramo
      for (const d of todosLosDias) {
        if (nuevaConfig[d].length === 0) {
          nuevaConfig[d] = [crearTramoInicial('07:30', '', '')];
        }
      }

      configPorDia.value = nuevaConfig;
      diasSeleccionados.value = nuevosDias.size > 0 ? Array.from(nuevosDias) : ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
      diaConfigurando.value = diasSeleccionados.value[0];
      tramoActivoIndex.value = 0;
    } else {
      // Modo Creación: Siempre limpio de fábrica
      reiniciarFormularioAFabrica();
    }
  },
  { immediate: true }
);

// Tramos del día seleccionado
const tramosDelDiaActivo = computed(() => {
  return configPorDia.value[diaConfigurando.value] || [];
});

// Tramo que se está editando en el mapa actualmente
const tramoActivo = computed(() => {
  const tramos = tramosDelDiaActivo.value;
  if (tramoActivoIndex.value >= tramos.length) {
    tramoActivoIndex.value = 0;
  }
  return tramos[tramoActivoIndex.value] || tramos[0];
});

// Mensajes de confirmación visual en el formulario
const mensajeNotificacion = ref<string | null>(null);

function mostrarAviso(msg: string) {
  mensajeNotificacion.value = msg;
  setTimeout(() => {
    if (mensajeNotificacion.value === msg) {
      mensajeNotificacion.value = null;
    }
  }, 2800);
}

// Portapapeles en memoria para copiar/pegar itinerario entre días específicos
const diaCopiado = ref<DiaSemana | null>(null);
const paradasCopiadas = ref<TramoItem[] | null>(null);

function copiarDiaActual() {
  const tramos = configPorDia.value[diaConfigurando.value];
  if (!tramos || tramos.length === 0) return;

  diaCopiado.value = diaConfigurando.value;
  paradasCopiadas.value = tramos.map(t => ({
    ...t,
    id: Math.random().toString(36).substring(2, 9)
  }));
  mostrarAviso(`📋 Paradas del ${diaConfigurando.value} copiadas`);
}

function pegarEnDiaActual() {
  if (!paradasCopiadas.value || paradasCopiadas.value.length === 0 || !diaCopiado.value) return;

  const diaDestino = diaConfigurando.value;
  configPorDia.value[diaDestino] = paradasCopiadas.value.map(t => ({
    ...t,
    id: Math.random().toString(36).substring(2, 9)
  }));
  tramoActivoIndex.value = 0;
  mostrarAviso(`✓ Paradas pegadas en ${diaDestino}`);
}

// Replicar toda la lista de tramos del día activo a los otros días seleccionados
function replicarATodosLosDias() {
  const origen = configPorDia.value[diaConfigurando.value];
  for (const dia of diasSeleccionados.value) {
    configPorDia.value[dia] = origen.map(t => ({
      ...t,
      id: Math.random().toString(36).substring(2, 9)
    }));
  }
  mostrarAviso(`✓ Itinerario replicado a todos los días`);
}

// Invertir sentido (origen ⇄ destino) de una parada existente
function invertirTramo(tramo: TramoItem) {
  const tempNombre = tramo.punto_inicio;
  const tempLat = tramo.lat_inicio;
  const tempLng = tramo.lng_inicio;

  tramo.punto_inicio = tramo.punto_destino;
  tramo.lat_inicio = tramo.lat_destino;
  tramo.lng_inicio = tramo.lng_destino;

  tramo.punto_destino = tempNombre;
  tramo.lat_destino = tempLat;
  tramo.lng_destino = tempLng;

  mostrarAviso(`🔄 Invertido: ${tramo.punto_inicio} ➔ ${tramo.punto_destino}`);
}

// Portapapeles para copiar y pegar una parada individual
const paradaCopiada = ref<TramoItem | null>(null);

function copiarParada(tramo: TramoItem) {
  paradaCopiada.value = {
    ...tramo,
    id: Math.random().toString(36).substring(2, 9)
  };
  mostrarAviso(`📋 Parada "${tramo.punto_inicio} ➔ ${tramo.punto_destino}" copiada`);
}

function pegarParadaEnDiaActual() {
  if (!paradaCopiada.value) return;
  const tramos = configPorDia.value[diaConfigurando.value];
  tramos.push({
    ...paradaCopiada.value,
    id: Math.random().toString(36).substring(2, 9)
  });
  tramoActivoIndex.value = tramos.length - 1;
  mostrarAviso(`✓ Parada pegada en ${diaConfigurando.value}`);
}

// Agregar otro tramo/parada al día actual (con opción de invertir la anterior)
function agregarTramoAlDia(invertirAnterior = false) {
  const tramos = configPorDia.value[diaConfigurando.value];
  const anterior = tramos[tramos.length - 1];

  let nuevaHora = '17:00';
  let nuevoInicio = 'Trabajo';
  let nuevoDestino = 'Casa';
  let latIni = userGpsLat.value || 10.4806;
  let lngIni = userGpsLng.value || -66.9036;
  let latDest = userGpsLat.value ? Number((userGpsLat.value + 0.015).toFixed(5)) : 10.4950;
  let lngDest = userGpsLng.value ? Number((userGpsLng.value + 0.015).toFixed(5)) : -66.8850;

  if (anterior) {
    if (invertirAnterior) {
      // Invertir exactamente el tramo anterior: A ➔ B pasa a ser B ➔ A
      nuevoInicio = anterior.punto_destino;
      nuevoDestino = anterior.punto_inicio;
      latIni = anterior.lat_destino;
      lngIni = anterior.lng_destino;
      latDest = anterior.lat_inicio;
      lngDest = anterior.lng_inicio;

      // Calcular hora lógica de retorno posterior
      const partesHora = (anterior.hora_recogida || '').split(':');
      if (partesHora.length === 2) {
        const horaNum = parseInt(partesHora[0], 10);
        if (horaNum < 12) {
          nuevaHora = '17:00';
        } else if (horaNum < 18) {
          nuevaHora = '21:30';
        } else {
          nuevaHora = '23:00';
        }
      }
    } else {
      // Continuación: donde terminó la anterior
      nuevoInicio = anterior.punto_destino || 'Punto intermedio';
      latIni = anterior.lat_destino;
      lngIni = anterior.lng_destino;
      nuevoDestino = tramos[0]?.punto_inicio || 'Casa';
      latDest = tramos[0]?.lat_inicio || latDest;
      lngDest = tramos[0]?.lng_inicio || lngDest;
      nuevaHora = '17:00';
    }
  }

  const nuevoTramo: TramoItem = {
    id: Math.random().toString(36).substring(2, 9),
    hora_recogida: nuevaHora,
    punto_inicio: nuevoInicio,
    punto_destino: nuevoDestino,
    lat_inicio: latIni,
    lng_inicio: lngIni,
    lat_destino: latDest,
    lng_destino: lngDest
  };

  tramos.push(nuevoTramo);
  tramoActivoIndex.value = tramos.length - 1;
  mostrarAviso(invertirAnterior ? '🔄 Retorno invertido añadido' : '+ Nueva parada añadida');
}

// Eliminar un tramo del día actual
function eliminarTramo(index: number) {
  const tramos = configPorDia.value[diaConfigurando.value];
  if (tramos.length > 1) {
    tramos.splice(index, 1);
    if (tramoActivoIndex.value >= tramos.length) {
      tramoActivoIndex.value = tramos.length - 1;
    }
  }
}

// Alternar selección de un día
function toggleDia(dia: DiaSemana) {
  const index = diasSeleccionados.value.indexOf(dia);
  if (index > -1) {
    if (diasSeleccionados.value.length > 1) {
      diasSeleccionados.value.splice(index, 1);
      if (diaConfigurando.value === dia) {
        diaConfigurando.value = diasSeleccionados.value[0];
        tramoActivoIndex.value = 0;
      }
    }
  } else {
    diasSeleccionados.value.push(dia);
    diaConfigurando.value = dia;
    tramoActivoIndex.value = 0;
  }
}

// Presets de selección rápida de días
function seleccionarPreset(preset: 'semana' | 'todos' | 'finde') {
  if (preset === 'semana') {
    diasSeleccionados.value = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
  } else if (preset === 'todos') {
    diasSeleccionados.value = [...todosLosDias];
  } else if (preset === 'finde') {
    diasSeleccionados.value = ['Sabado', 'Domingo'];
  }
  if (!diasSeleccionados.value.includes(diaConfigurando.value)) {
    diaConfigurando.value = diasSeleccionados.value[0];
    tramoActivoIndex.value = 0;
  }
}

// Actualización de coordenadas desde el mapa para el tramo activo
function onCoordsActualizadas(coords: {
  latInicio: number;
  lngInicio: number;
  latDestino: number;
  lngDestino: number;
  puntoInicio?: string;
  puntoDestino?: string;
}) {
  if (tramoActivo.value) {
    tramoActivo.value.lat_inicio = coords.latInicio;
    tramoActivo.value.lng_inicio = coords.lngInicio;
    tramoActivo.value.lat_destino = coords.latDestino;
    tramoActivo.value.lng_destino = coords.lngDestino;
    if (coords.puntoInicio) {
      tramoActivo.value.punto_inicio = coords.puntoInicio;
    }
    if (coords.puntoDestino) {
      tramoActivo.value.punto_destino = coords.puntoDestino;
    }
  }
}

// Al seleccionar una sugerencia del autocompletado, asignar dirección y coordenadas instantáneamente
function onUbicacionSeleccionada(
  tramo: TramoItem,
  tipo: 'inicio' | 'destino',
  payload: { lat: number; lng: number; nombre: string; direccionCompleta: string }
) {
  if (tipo === 'inicio') {
    tramo.punto_inicio = payload.nombre;
    tramo.lat_inicio = payload.lat;
    tramo.lng_inicio = payload.lng;
  } else {
    tramo.punto_destino = payload.nombre;
    tramo.lat_destino = payload.lat;
    tramo.lng_destino = payload.lng;
  }
}

async function handleSubmit() {
  if (!form.value.nombre.trim()) {
    error.value = 'El nombre del pasajero es obligatorio.';
    return;
  }

  if (diasSeleccionados.value.length === 0) {
    error.value = 'Debes seleccionar al menos un día de la semana para el transporte.';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const rutasPayload: any[] = [];
    for (const dia of diasSeleccionados.value) {
      const tramos = configPorDia.value[dia] || [];
      for (const t of tramos) {
        if (t.punto_inicio.trim() && t.punto_destino.trim()) {
          rutasPayload.push({
            dia_semana: dia,
            hora_recogida: t.hora_recogida,
            punto_inicio: t.punto_inicio.trim(),
            punto_destino: t.punto_destino.trim(),
            lat_inicio: t.lat_inicio,
            lng_inicio: t.lng_inicio,
            lat_destino: t.lat_destino,
            lng_destino: t.lng_destino
          });
        }
      }
    }

    if (rutasPayload.length === 0) {
      throw new Error('Debes ingresar al menos una parada con punto de recogida y destino.');
    }

    const isEdit = !!props.pasajeroEditar?.id;
    const payload = isEdit
      ? {
          id: props.pasajeroEditar!.id,
          ...form.value,
          rutas: rutasPayload
        }
      : {
          ...form.value,
          rutas: rutasPayload
        };

    // Si está en Modo Local (Invitado / sin sesión en la nube)
    if (props.esModoLocal) {
      if (isEdit) {
        updateLocalPasajero(payload);
      } else {
        addLocalPasajero(payload);
      }
      reiniciarFormularioAFabrica();
      emit('pasajero-guardado');
      emit('close');
      return;
    }

    const url = '/api/pasajeros';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Error al guardar pasajero');
    }

    reiniciarFormularioAFabrica();
    emit('pasajero-guardado');
    emit('close');
  } catch (err: any) {
    error.value = err.message || 'Error inesperado';
  } finally {
    loading.value = false;
  }
}

// Control para evitar cierre accidental si el usuario hace clic dentro y arrastra/suelta fuera
let mousedownEnBackdrop = false;

function onBackdropMouseDown(e: MouseEvent) {
  mousedownEnBackdrop = e.target === e.currentTarget;
}

function onBackdropMouseUp(e: MouseEvent) {
  if (mousedownEnBackdrop && e.target === e.currentTarget) {
    emit('close');
  }
  mousedownEnBackdrop = false;
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
      class="fixed inset-0 z-50 w-full h-full min-h-screen flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      @mousedown="onBackdropMouseDown"
      @mouseup="onBackdropMouseUp"
    >
      <!-- Modal Card con Header y Footer Sticky para evitar cortes -->
      <div class="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        <!-- 1. HEADER STICKY (Siempre visible arriba con la X grande de cierre) -->
        <div class="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/20 dark:border-emerald-500/30 shrink-0">
              {{ pasajeroEditar ? '✏️' : '🚍' }}
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 leading-snug break-words">
                {{ pasajeroEditar ? `${t.modalPassenger.editTitle}: ${pasajeroEditar.nombre}` : t.modalPassenger.createTitle }}
              </h2>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words">
                {{ pasajeroEditar ? 'Modifica los datos personales, plan de cobro o paradas.' : 'Registra los datos, plan de cobro y múltiples paradas por día.' }}
              </p>
            </div>
          </div>

          <!-- Botón "X" de cierre SIEMPRE visible -->
          <button
            type="button"
            @click="emit('close')"
            class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white flex items-center justify-center text-lg font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm cursor-pointer shrink-0 ml-2"
            title="Cerrar (Esc)"
          >
            ✕
          </button>
        </div>

        <!-- Alerta de error fija si ocurre -->
        <div v-if="error" class="shrink-0 mx-4 sm:mx-6 mt-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
          <span>⚠️</span> {{ error }}
        </div>

        <!-- 2. CUERPO DEL FORMULARIO CON SCROLL INDEPENDIENTE (Evitando scroll horizontal en móvil) -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-6 py-4 space-y-5 sm:space-y-6 text-xs scrollbar-thin">
          
          <!-- 1. DATOS PERSONALES -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              <span>👤</span>
              <span>1. Datos del Pasajero</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div>
                <label class="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Nombre Completo *</label>
                <input
                  v-model="form.nombre"
                  type="text"
                  required
                  placeholder="Ej. Lucas Benítez"
                  class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
                />
              </div>
              <div>
                <label class="block text-slate-700 dark:text-slate-300 mb-1 font-medium">
                  Teléfono / WhatsApp <span class="text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
                </label>
                <input
                  v-model="form.telefono"
                  type="text"
                  placeholder="+54 9 11 ... (opcional)"
                  class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-slate-700 dark:text-slate-300 mb-1 font-medium">
                Notas o Indicaciones <span class="text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
              </label>
              <input
                v-model="form.notas"
                type="text"
                placeholder="Ej. Esperar en el portón negro, timbre 2B"
                class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
              />
            </div>

            <!-- SECCIÓN: RECORDATORIOS Y ALERTAS DE RECOGIDA -->
            <div class="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-slate-800/40 border border-amber-500/20 dark:border-slate-750 space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-amber-500 text-sm">🔔</span>
                  <span class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Recordatorio de Recogida
                  </span>
                </div>
                <button
                  type="button"
                  @click="form.notificaciones_activas = !form.notificaciones_activas"
                  :class="[
                    'w-10 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none shrink-0 p-0.5',
                    form.notificaciones_activas ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  ]"
                >
                  <div
                    :class="[
                      'w-5 h-5 rounded-full bg-white shadow transform transition-transform',
                      form.notificaciones_activas ? 'translate-x-4' : 'translate-x-0'
                    ]"
                  ></div>
                </button>
              </div>

              <!-- Selector de minutos si las notificaciones están activas -->
              <div v-if="form.notificaciones_activas" class="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-amber-500/10 dark:border-slate-700/60">
                <span class="text-xs text-slate-600 dark:text-slate-400">
                  Avisar con anticipación:
                </span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button
                    v-for="min in [10, 15, 30, 45, 60]"
                    :key="min"
                    type="button"
                    @click="form.minutos_aviso = min"
                    :class="[
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                      form.minutos_aviso === min
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    ]"
                  >
                    {{ min }}m
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. PLAN DE COBRO CON OPCIÓN [ PAGADO / PENDIENTE ] -->
          <div class="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                <span>💳</span>
                <span>2. Plan de Cobro</span>
              </div>

              <!-- Opción para tildar si ya está Pagado o Pendiente -->
              <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 mr-1 pl-1 font-medium">Estado inicial:</span>
                <button
                  type="button"
                  @click="form.estado_pago = 'Pendiente'"
                  :class="[
                    'px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer',
                    form.estado_pago === 'Pendiente'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  ]"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Pendiente
                </button>
                <button
                  type="button"
                  @click="form.estado_pago = 'Pagado'"
                  :class="[
                    'px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer',
                    form.estado_pago === 'Pagado'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  ]"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  ✓ Ya Pagado
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Monto ($) *</label>
                <input
                  v-model.number="form.monto"
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="Ej. 100 o 35000"
                  class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
                />
              </div>

              <div>
                <label class="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Modalidad</label>
                <div class="relative">
                  <select
                    v-model="form.modalidad"
                    class="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors pr-8 cursor-pointer shadow-sm"
                  >
                    <option value="semanal" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Semanal</option>
                    <option value="quincenal" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Quincenal</option>
                    <option value="mensual" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mensual</option>
                  </select>
                  <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Fecha de Corte</label>
                <input
                  v-model="form.fecha_corte"
                  type="date"
                  required
                  class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer shadow-sm"
                />
              </div>
            </div>
          </div>

          <!-- 3. DÍAS DE TRANSPORTE Y MÚLTIPLES PARADAS POR DÍA -->
          <div class="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                <span>🗺️</span>
                <span>3. Días e Itinerario con Múltiples Paradas</span>
              </div>
              
              <!-- Presets rápidos -->
              <div class="flex items-center gap-1.5 text-[10px]">
                <span class="text-slate-500 dark:text-slate-400">Seleccionar:</span>
                <button
                  type="button"
                  @click="seleccionarPreset('semana')"
                  class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Lun a Vie
                </button>
                <button
                  type="button"
                  @click="seleccionarPreset('todos')"
                  class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Todos
                </button>
              </div>
            </div>

            <!-- Selector de días con botones toggle -->
            <div>
              <label class="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Días en los que se le brindará transporte:
              </label>
              <div class="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                <button
                  v-for="dia in todosLosDias"
                  :key="dia"
                  type="button"
                  @click="toggleDia(dia)"
                  :class="[
                    'py-2 px-1 text-center font-bold text-xs rounded-xl border transition-all cursor-pointer',
                    diasSeleccionados.includes(dia)
                      ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:bg-slate-850 dark:border-slate-700/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                  ]"
                >
                  {{ dia.substring(0, 3) }}
                  <span class="block text-[9px] font-normal mt-0.5">
                    {{ diasSeleccionados.includes(dia) ? `${configPorDia[dia]?.length || 1} paradas` : 'Sin ruta' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Configuración de Tramos/Paradas para el Día Activo -->
            <div class="bg-slate-50 dark:bg-slate-950/70 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              
              <!-- Barra de Pestañas de Días y Acciones de Copiar/Pegar -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                <div class="flex items-center gap-2 min-w-0 max-w-full">
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">Día:</span>
                  <div class="flex items-center gap-1 overflow-x-auto max-w-full pb-1 scrollbar-none">
                    <button
                      v-for="dia in diasSeleccionados"
                      :key="`tab-${dia}`"
                      type="button"
                      @click="diaConfigurando = dia; tramoActivoIndex = 0"
                      :class="[
                        'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
                        diaConfigurando === dia
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/50'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white'
                      ]"
                    >
                      <span>{{ dia }}</span>
                      <span class="text-[10px] bg-slate-300 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 px-1.5 py-0.2 rounded-full font-mono">
                        {{ configPorDia[dia]?.length || 1 }}
                      </span>
                    </button>
                  </div>
                </div>

                <!-- Botones de Acción de Itinerario: Copiar Día, Pegar Día, Replicar Todos -->
                <div class="flex items-center gap-1.5 flex-wrap">
                  <!-- Aviso flotante en línea -->
                  <span
                    v-if="mensajeNotificacion"
                    class="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg font-bold animate-in fade-in"
                  >
                    {{ mensajeNotificacion }}
                  </span>

                  <!-- Copiar este día -->
                  <button
                    type="button"
                    @click="copiarDiaActual"
                    class="text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium flex items-center gap-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    :title="`Copiar todas las paradas del ${diaConfigurando} al portapapeles`"
                  >
                    <span>📋</span> Copiar día
                  </button>

                  <!-- Pegar en este día (solo visible si hay un día copiado) -->
                  <button
                    v-if="diaCopiado"
                    type="button"
                    @click="pegarEnDiaActual"
                    class="text-[11px] text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-2.5 py-1 rounded-lg transition-all shadow-sm shadow-emerald-500/20 animate-pulse cursor-pointer"
                    :title="`Pegar paradas de ${diaCopiado} en ${diaConfigurando}`"
                  >
                    <span>📥</span> Pegar en {{ diaConfigurando }}
                    <span class="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal">({{ diaCopiado }})</span>
                  </button>

                  <!-- Copiar a todos los días -->
                  <button
                    type="button"
                    @click="replicarATodosLosDias"
                    class="text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold flex items-center gap-1 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Copia todas las paradas de este día a los otros días seleccionados"
                  >
                    <span>🔄</span> A todos
                  </button>
                </div>
              </div>

              <!-- Lista de Tramos / Paradas del Día (Casa -> Trabajo -> Universidad -> Casa) -->
              <div class="space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Paradas del {{ diaConfigurando }}</span>
                    <span class="text-[11px] text-slate-500 dark:text-slate-400 font-normal">({{ tramosDelDiaActivo.length }})</span>
                  </span>

                  <div class="flex items-center gap-1.5 flex-wrap">
                    <!-- Pegar parada individual copiada si existe -->
                    <button
                      v-if="paradaCopiada"
                      type="button"
                      @click="pegarParadaEnDiaActual"
                      class="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Pegar parada guardada en el portapapeles"
                    >
                      <span>📥</span> Pegar parada copiada
                    </button>

                    <!-- Añadir parada normal -->
                    <button
                      type="button"
                      @click="agregarTramoAlDia(false)"
                      class="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Añadir una parada adicional a este día"
                    >
                      <span>+</span> Añadir parada
                    </button>

                    <!-- Añadir parada anterior invertida (Retorno: B -> A) -->
                    <button
                      v-if="tramosDelDiaActivo.length > 0"
                      type="button"
                      @click="agregarTramoAlDia(true)"
                      class="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Añade automáticamente el viaje de regreso invirtiendo el origen y destino de la parada anterior"
                    >
                      <span>🔄</span> + Regreso invertido
                    </button>
                  </div>
                </div>

                <!-- Iteración de cada tramo del día -->
                <div 
                  v-for="(tramo, index) in tramosDelDiaActivo" 
                  :key="tramo.id"
                  :class="[
                    'p-3 sm:p-3.5 rounded-xl border transition-all space-y-3',
                    tramoActivoIndex === index
                      ? 'bg-white dark:bg-slate-900 border-brand-500 shadow-sm ring-1 ring-brand-500/30'
                      : 'bg-white/90 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  ]"
                >
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-full bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {{ index + 1 }}
                      </span>
                      <span class="text-xs font-bold text-slate-900 dark:text-white">
                        Parada #{{ index + 1 }}
                      </span>
                      <span v-if="index === 0" class="text-[10px] text-slate-500 dark:text-slate-400">(ej. Ida Casa ➔ Trabajo)</span>
                      <span v-else-if="index === 1" class="text-[10px] text-slate-500 dark:text-slate-400">(ej. Trabajo ➔ Universidad)</span>
                      <span v-else class="text-[10px] text-slate-500 dark:text-slate-400">(ej. Retorno ➔ Casa)</span>
                    </div>

                    <div class="flex items-center gap-1.5 flex-wrap">
                      <!-- Botón para invertir origen y destino en esta parada -->
                      <button
                        type="button"
                        @click="invertirTramo(tramo)"
                        class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 dark:hover:text-amber-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Invertir origen y destino de esta parada (A ⇄ B)"
                      >
                        <span>🔄</span> Invertir
                      </button>

                      <!-- Botón para copiar esta parada individual -->
                      <button
                        type="button"
                        @click="copiarParada(tramo)"
                        class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copiar los datos de esta parada al portapapeles"
                      >
                        <span>📋</span> Copiar
                      </button>

                      <!-- Botón para ubicar en mapa -->
                      <button
                        type="button"
                        @click="tramoActivoIndex = index"
                        :class="[
                          'px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer',
                          tramoActivoIndex === index
                            ? 'bg-brand-600 text-white font-bold shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white'
                        ]"
                      >
                        {{ tramoActivoIndex === index ? '📍 En mapa' : 'Ubicar en mapa' }}
                      </button>

                      <!-- Botón eliminar si hay más de 1 tramo -->
                      <button
                        v-if="tramosDelDiaActivo.length > 1"
                        type="button"
                        @click="eliminarTramo(index)"
                        class="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Eliminar este tramo"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <!-- Inputs de recogida, destino y hora para este tramo con AUTOCOMPLETADO FLOTANTE -->
                  <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div class="sm:col-span-5 relative focus-within:z-30">
                      <InputDireccionAutocomplete
                        v-model="tramo.punto_inicio"
                        label="Punto de Recogida:"
                        tipo="inicio"
                        placeholder="Escribe calle, urbanización, punto de ref..."
                        :user-lat="userGpsLat"
                        :user-lng="userGpsLng"
                        @select-location="(loc) => onUbicacionSeleccionada(tramo, 'inicio', loc)"
                      />
                    </div>

                    <div class="sm:col-span-5 relative focus-within:z-30">
                      <InputDireccionAutocomplete
                        v-model="tramo.punto_destino"
                        label="Punto de Destino:"
                        tipo="destino"
                        placeholder="Escribe trabajo, universidad, centro..."
                        :user-lat="userGpsLat"
                        :user-lng="userGpsLng"
                        @select-location="(loc) => onUbicacionSeleccionada(tramo, 'destino', loc)"
                      />
                    </div>

                    <div class="sm:col-span-2">
                      <label class="block text-slate-600 dark:text-slate-400 text-[10px] mb-1 font-medium">Hora:</label>
                      <input
                        v-model="tramo.hora_recogida"
                        type="time"
                        required
                        class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 text-slate-900 dark:text-white font-mono focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-brand-500 text-xs cursor-pointer shadow-sm"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <!-- Mapa Interactivo para posicionar los puntos del tramo activo -->
              <div class="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs text-slate-800 dark:text-slate-300 font-bold">
                    📍 Ubicación en Mapa de la Parada #{{ tramoActivoIndex + 1 }} ({{ tramoActivo?.punto_inicio || 'Inicio' }} ➔ {{ tramoActivo?.punto_destino || 'Destino' }}):
                  </span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400">Haz clic en el mapa para ajustar A o B</span>
                </div>

                <SelectorMapaModal
                  :key="`map-modal-${diaConfigurando}-${tramoActivoIndex}`"
                  :lat-inicio="tramoActivo?.lat_inicio"
                  :lng-inicio="tramoActivo?.lng_inicio"
                  :lat-destino="tramoActivo?.lat_destino"
                  :lng-destino="tramoActivo?.lng_destino"
                  :punto-inicio="tramoActivo?.punto_inicio || ''"
                  :punto-destino="tramoActivo?.punto_destino || ''"
                  @update:coords="onCoordsActualizadas"
                  @user-location="onUserLocationDetected"
                />
              </div>

            </div>
          </div>

        </div>

        <!-- 3. FOOTER STICKY (Siempre visible abajo con botones de acción) -->
        <div class="shrink-0 flex items-center justify-end gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-20">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="loading"
            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:via-teal-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <span v-if="loading" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ loading ? 'Guardando en D1...' : (pasajeroEditar ? 'Guardar Cambios' : 'Crear Pasajero') }}</span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
