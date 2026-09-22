<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  label: string;
  tipo: 'inicio' | 'destino';
  userLat?: number | null;
  userLng?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'select-location', payload: {
    lat: number;
    lng: number;
    nombre: string;
    direccionCompleta: string;
  }): void;
}>();

interface SugerenciaLugar {
  id: string;
  nombre: string;
  display_name: string;
  lat: number;
  lng: number;
}

const sugerencias = ref<SugerenciaLugar[]>([]);
const cargando = ref(false);
const mostrarDropdown = ref(false);
const seleccionadoIndex = ref(-1);

let debounceTimer: any = null;

async function buscarSugerencias(query: string) {
  if (!query || query.trim().length < 2) {
    sugerencias.value = [];
    mostrarDropdown.value = false;
    return;
  }

  cargando.value = true;
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    try {
      let viewboxParam = '';
      if (props.userLat != null && props.userLng != null) {
        const delta = 1.0; // ~100km alrededor de la posición del usuario
        viewboxParam = `&viewbox=${props.userLng - delta},${props.userLat + delta},${props.userLng + delta},${props.userLat - delta}&bounded=0`;
      }

      const q = encodeURIComponent(query.trim());
      // Si no hay coordenadas de GPS aún, limitamos por país Venezuela
      const countryParam = (props.userLat != null && props.userLng != null) ? '' : '&countrycodes=ve';

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}${countryParam}&limit=6&addressdetails=1${viewboxParam}`
      );

      if (res.ok) {
        const data = await res.json();
        sugerencias.value = (data || []).map((item: any) => {
          const partes = (item.display_name || '').split(',');
          const nombrePrincipal = item.name || partes[0] || 'Lugar';
          const subDetalle = partes.slice(1, 4).join(',').trim();

          return {
            id: String(item.place_id || Math.random()),
            nombre: nombrePrincipal,
            display_name: subDetalle || item.display_name,
            lat: Number(parseFloat(item.lat).toFixed(5)),
            lng: Number(parseFloat(item.lon).toFixed(5))
          };
        });

        mostrarDropdown.value = true;
        seleccionadoIndex.value = -1;
      }
    } catch (err) {
      console.warn('Error buscando sugerencias de dirección:', err);
    } finally {
      cargando.value = false;
    }
  }, 300);
}

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  emit('update:modelValue', val);
  buscarSugerencias(val);
}

function limpiarTexto() {
  emit('update:modelValue', '');
  sugerencias.value = [];
  mostrarDropdown.value = false;
}

function seleccionarSugerencia(sug: SugerenciaLugar) {
  const nombreFinal = sug.nombre ? `${sug.nombre}` : sug.display_name;
  emit('update:modelValue', nombreFinal);
  emit('select-location', {
    lat: sug.lat,
    lng: sug.lng,
    nombre: sug.nombre,
    direccionCompleta: sug.display_name
  });
  mostrarDropdown.value = false;
  sugerencias.value = [];
}

// Navegación con teclado (Flechas, Enter, Escape)
function onKeyDown(e: KeyboardEvent) {
  if (!mostrarDropdown.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (sugerencias.value.length > 0) {
      seleccionadoIndex.value = (seleccionadoIndex.value + 1) % sugerencias.value.length;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (sugerencias.value.length > 0) {
      seleccionadoIndex.value = (seleccionadoIndex.value - 1 + sugerencias.value.length) % sugerencias.value.length;
    }
  } else if (e.key === 'Enter') {
    if (seleccionadoIndex.value >= 0 && seleccionadoIndex.value < sugerencias.value.length) {
      e.preventDefault();
      seleccionarSugerencia(sugerencias.value[seleccionadoIndex.value]);
    }
  } else if (e.key === 'Escape') {
    mostrarDropdown.value = false;
  }
}

// Cerrar si hace clic fuera
function onBlur() {
  setTimeout(() => {
    mostrarDropdown.value = false;
  }, 250);
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="relative w-full">
    <!-- Etiqueta del campo -->
    <label class="block text-slate-600 dark:text-slate-400 text-[10px] mb-1 flex items-center justify-between font-medium">
      <span class="flex items-center gap-1">
        <span 
          class="w-2 h-2 rounded-full inline-block"
          :class="tipo === 'inicio' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'"
        ></span>
        {{ label }}
      </span>
      <span v-if="cargando" class="text-[9px] text-brand-600 dark:text-brand-400 animate-pulse flex items-center gap-1 font-semibold">
        <span class="w-2 h-2 border border-brand-500 border-t-transparent rounded-full animate-spin"></span>
        Buscando lugares...
      </span>
    </label>

    <!-- Contenedor del Input -->
    <div class="relative">
      <input
        :value="modelValue"
        type="text"
        required
        autocomplete="off"
        :placeholder="placeholder"
        @input="onInput"
        @keydown="onKeyDown"
        @blur="onBlur"
        @focus="buscarSugerencias(modelValue)"
        class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs transition-colors shadow-sm"
        :class="tipo === 'inicio' ? 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40' : 'focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40'"
      />

      <!-- Botón de borrar o icono de ubicación -->
      <button
        v-if="modelValue"
        type="button"
        @click="limpiarTexto"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white p-0.5 rounded transition-colors text-xs"
        title="Borrar texto"
      >
        ✕
      </button>
      <span v-else class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
        📍
      </span>
    </div>

    <!-- LISTA DESPLEGABLE FLOTANTE DE SUGERENCIAS -->
    <div
      v-if="mostrarDropdown"
      class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Cabecera de la lista -->
      <div class="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/90 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <span class="flex items-center gap-1.5">
          <span>📍</span>
          <span>Sugerencias de Ubicación</span>
        </span>
        <span class="text-slate-400 dark:text-slate-500 text-[9px] font-normal">Toca para ubicar</span>
      </div>

      <!-- Lista de resultados -->
      <div v-if="sugerencias.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800/80">
        <button
          v-for="(sug, idx) in sugerencias"
          :key="sug.id"
          type="button"
          @mousedown.prevent="seleccionarSugerencia(sug)"
          :class="[
            'w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 transition-colors cursor-pointer',
            seleccionadoIndex === idx 
              ? 'bg-brand-600 text-white' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
          ]"
        >
          <span 
            class="text-sm mt-0.5 shrink-0" 
            :class="tipo === 'inicio' ? 'text-emerald-500' : 'text-rose-500'"
          >
            {{ tipo === 'inicio' ? '🟢' : '🔴' }}
          </span>
          <div class="flex-1 min-w-0">
            <div 
              class="font-bold truncate text-xs"
              :class="seleccionadoIndex === idx ? 'text-white' : 'text-slate-900 dark:text-white'"
            >
              {{ sug.nombre }}
            </div>
            <div 
              class="text-[10px] truncate mt-0.5"
              :class="seleccionadoIndex === idx ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'"
            >
              {{ sug.display_name }}
            </div>
          </div>
        </button>
      </div>

      <!-- Estado vacío cuando no hay resultados pero se escribió algo -->
      <div v-else-if="!cargando && modelValue.length >= 2" class="px-3 py-3 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p class="font-medium text-slate-700 dark:text-slate-300">No encontramos coincidencias exactas</p>
        <p class="text-[10px] text-slate-400 dark:text-slate-500">Puedes escribir la dirección o mover el pin directamente en el mapa.</p>
      </div>
    </div>
  </div>
</template>
