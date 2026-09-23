<script lang="ts">
export interface CoordenadasGPS {
  lat: number;
  lng: number;
}
// Cache global en memoria durante la sesión para no re-pedir GPS en cada cambio de pestaña o tramo
let cachedUserCoords: CoordenadasGPS | null = null;
let cachedPermissionGranted = false;
</script>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps<{
  latInicio?: number | null;
  lngInicio?: number | null;
  latDestino?: number | null;
  lngDestino?: number | null;
  puntoInicio: string;
  puntoDestino: string;
}>();

const emit = defineEmits<{
  (e: 'update:coords', payload: {
    latInicio: number;
    lngInicio: number;
    latDestino: number;
    lngDestino: number;
    puntoInicio?: string;
    puntoDestino?: string;
  }): void;
  (e: 'geocodificando', estado: boolean): void;
  (e: 'user-location', payload: { lat: number; lng: number }): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const modoSeleccion = ref<'inicio' | 'destino'>('inicio');

// Estado de permiso de ubicación del usuario
const tienePermisoUbicacion = ref(cachedPermissionGranted);
const solicitandoUbicacion = ref(false);
const errorUbicacion = ref<string | null>(null);

// Coordenadas base del usuario (detectadas por GPS)
const cached = cachedUserCoords as CoordenadasGPS | null;
const userLat = ref<number | null>(cached ? cached.lat : null);
const userLng = ref<number | null>(cached ? cached.lng : null);

const currentLatA = ref<number>(props.latInicio ?? (cached?.lat ?? 10.4806));
const currentLngA = ref<number>(props.lngInicio ?? (cached?.lng ?? -66.9036));
const currentLatB = ref<number>(props.latDestino ?? (cached?.lat ? Number((cached.lat + 0.015).toFixed(5)) : 10.4950));
const currentLngB = ref<number>(props.lngDestino ?? (cached?.lng ? Number((cached.lng + 0.015).toFixed(5)) : -66.8850));

const estadoGeocodificacion = ref<string | null>(null);

let mapInstance: any = null;
let markerA: any = null;
let markerB: any = null;
let polylineLayer: any = null;

// Marcadores SVG personalizados
function createIcon(color: string, label: string) {
  if (typeof window === 'undefined') return undefined;
  const L = (window as any).L;
  if (!L) return undefined;

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: grab;">
        <div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4); border: 2.5px solid #ffffff;">
          <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 12px;">${label}</span>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });
}

// 1. SOLICITAR PERMISO DE UBICACIÓN
function pedirPermisoUbicacion() {
  if (cachedPermissionGranted && cachedUserCoords) {
    userLat.value = cachedUserCoords.lat;
    userLng.value = cachedUserCoords.lng;
    tienePermisoUbicacion.value = true;
    emit('user-location', cachedUserCoords);
    setTimeout(() => {
      initMap();
    }, 50);
    return;
  }

  if (typeof window === 'undefined' || !navigator.geolocation) {
    errorUbicacion.value = 'Tu navegador o dispositivo no soporta geolocalización GPS.';
    return;
  }

  solicitandoUbicacion.value = true;
  errorUbicacion.value = null;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat.value = Number(pos.coords.latitude.toFixed(5));
      userLng.value = Number(pos.coords.longitude.toFixed(5));
      cachedUserCoords = { lat: userLat.value, lng: userLng.value };
      cachedPermissionGranted = true;
      tienePermisoUbicacion.value = true;
      solicitandoUbicacion.value = false;
      emit('user-location', cachedUserCoords);

      // Si no hay coordenadas previas personalizadas, iniciar los pines en la zona del usuario
      if (!props.latInicio) {
        currentLatA.value = userLat.value;
        currentLngA.value = userLng.value;
        currentLatB.value = Number((userLat.value + 0.015).toFixed(5));
        currentLngB.value = Number((userLng.value + 0.015).toFixed(5));
        emitChanges();
      }

      setTimeout(() => {
        initMap();
      }, 150);
    },
    (err) => {
      solicitandoUbicacion.value = false;
      tienePermisoUbicacion.value = false;
      if (err.code === err.PERMISSION_DENIED) {
        errorUbicacion.value = 'Acceso a ubicación denegado en el navegador. Por favor permite la ubicación para habilitar el mapa.';
      } else {
        errorUbicacion.value = 'No se pudo obtener la ubicación GPS actual. Intenta de nuevo.';
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// 2. INICIALIZAR EL MAPA SOLO CUANDO HAY PERMISO
async function initMap() {
  if (!mapContainer.value || typeof window === 'undefined' || !tienePermisoUbicacion.value) return;

  const L = await import('leaflet');
  (window as any).L = L;

  const centerLat = currentLatA.value || userLat.value || 10.4806;
  const centerLng = currentLngA.value || userLng.value || -66.9036;

  if (mapInstance) {
    mapInstance.remove();
  }

  mapInstance = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: false
  }).setView([centerLat, centerLng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(mapInstance);

  // Marcador A (Recogida) - Arrastrable
  markerA = L.marker([currentLatA.value, currentLngA.value], {
    icon: createIcon('#10b981', 'A'),
    draggable: true
  }).addTo(mapInstance);

  markerA.on('dragend', (e: any) => {
    const pos = e.target.getLatLng();
    currentLatA.value = Number(pos.lat.toFixed(5));
    currentLngA.value = Number(pos.lng.toFixed(5));
    updatePolyline(L);
    emitChanges();
  });

  // Marcador B (Destino) - Arrastrable
  markerB = L.marker([currentLatB.value, currentLngB.value], {
    icon: createIcon('#ef4444', 'B'),
    draggable: true
  }).addTo(mapInstance);

  markerB.on('dragend', (e: any) => {
    const pos = e.target.getLatLng();
    currentLatB.value = Number(pos.lat.toFixed(5));
    currentLngB.value = Number(pos.lng.toFixed(5));
    updatePolyline(L);
    emitChanges();
  });

  // Clic en el mapa para ajustar manualmente el marcador activo
  mapInstance.on('click', (e: any) => {
    const lat = Number(e.latlng.lat.toFixed(5));
    const lng = Number(e.latlng.lng.toFixed(5));

    if (modoSeleccion.value === 'inicio') {
      currentLatA.value = lat;
      currentLngA.value = lng;
      markerA.setLatLng([lat, lng]);
      modoSeleccion.value = 'destino';
    } else {
      currentLatB.value = lat;
      currentLngB.value = lng;
      markerB.setLatLng([lat, lng]);
    }

    updatePolyline(L);
    emitChanges();
  });

  updatePolyline(L);

  // Ajustar vista para mostrar ambos pines
  mapInstance.fitBounds(
    [[currentLatA.value, currentLngA.value], [currentLatB.value, currentLngB.value]],
    { padding: [35, 35], maxZoom: 16 }
  );
}

// 3. GEOCODIFICACIÓN AUTOMÁTICA AL ESCRIBIR EN LOS INPUTS
let geocodeDebounceTimer: any = null;

async function buscarYPosicionar(direccion: string, tipo: 'inicio' | 'destino') {
  if (!direccion || direccion.trim().length < 3) return;

  clearTimeout(geocodeDebounceTimer);
  geocodeDebounceTimer = setTimeout(async () => {
    estadoGeocodificacion.value = `Ubicando en mapa: ${direccion}...`;
    emit('geocodificando', true);

    try {
      // Priorizar la búsqueda en la zona de la ubicación del usuario si está disponible
      let viewboxParam = '';
      if (userLat.value != null && userLng.value != null) {
        const delta = 0.5; // Aproximadamente 50km alrededor del usuario
        viewboxParam = `&viewbox=${userLng.value - delta},${userLat.value + delta},${userLng.value + delta},${userLat.value - delta}&bounded=0`;
      }

      const query = encodeURIComponent(direccion.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1${viewboxParam}`
      );

      if (res.ok) {
        const results = (await res.json()) as Array<{ lat: string; lon: string; name?: string }>;
        if (Array.isArray(results) && results.length > 0) {
          const lat = Number(parseFloat(results[0].lat).toFixed(5));
          const lng = Number(parseFloat(results[0].lon).toFixed(5));

          if (tipo === 'inicio') {
            currentLatA.value = lat;
            currentLngA.value = lng;
            if (markerA) markerA.setLatLng([lat, lng]);
          } else {
            currentLatB.value = lat;
            currentLngB.value = lng;
            if (markerB) markerB.setLatLng([lat, lng]);
          }

          if (mapInstance && typeof window !== 'undefined' && (window as any).L) {
            updatePolyline((window as any).L);
            mapInstance.fitBounds(
              [[currentLatA.value, currentLngA.value], [currentLatB.value, currentLngB.value]],
              { padding: [40, 40], maxZoom: 16 }
            );
          }

          emitChanges();
          estadoGeocodificacion.value = `✓ Ubicado automáticamente: ${results[0].name || direccion}`;
          setTimeout(() => {
            estadoGeocodificacion.value = null;
          }, 4000);
        } else {
          estadoGeocodificacion.value = `⚠️ Dirección no encontrada exacta. Puedes colocar el pin en el mapa manualmente.`;
        }
      }
    } catch (err) {
      console.warn('Error en geocodificación automática:', err);
    } finally {
      emit('geocodificando', false);
    }
  }, 600);
}

// Observar cambios en las direcciones que se escriben en los inputs
watch(
  () => props.puntoInicio,
  (nuevoInicio, anterior) => {
    if (nuevoInicio && nuevoInicio !== anterior && nuevoInicio.trim().length >= 4) {
      buscarYPosicionar(nuevoInicio, 'inicio');
    }
  }
);

watch(
  () => props.puntoDestino,
  (nuevoDestino, anterior) => {
    if (nuevoDestino && nuevoDestino !== anterior && nuevoDestino.trim().length >= 4) {
      buscarYPosicionar(nuevoDestino, 'destino');
    }
  }
);

// Observar coordenadas cambiadas externamente (por ejemplo al elegir una sugerencia de autocompletado)
watch(
  () => [props.latInicio, props.lngInicio],
  ([newLat, newLng]) => {
    if (newLat && newLng && (newLat !== currentLatA.value || newLng !== currentLngA.value)) {
      currentLatA.value = newLat;
      currentLngA.value = newLng;
      if (markerA) markerA.setLatLng([newLat, newLng]);
      if (mapInstance && typeof window !== 'undefined' && (window as any).L) {
        updatePolyline((window as any).L);
        mapInstance.fitBounds(
          [[currentLatA.value, currentLngA.value], [currentLatB.value, currentLngB.value]],
          { padding: [35, 35], maxZoom: 16 }
        );
      }
    }
  }
);

watch(
  () => [props.latDestino, props.lngDestino],
  ([newLat, newLng]) => {
    if (newLat && newLng && (newLat !== currentLatB.value || newLng !== currentLngB.value)) {
      currentLatB.value = newLat;
      currentLngB.value = newLng;
      if (markerB) markerB.setLatLng([newLat, newLng]);
      if (mapInstance && typeof window !== 'undefined' && (window as any).L) {
        updatePolyline((window as any).L);
        mapInstance.fitBounds(
          [[currentLatA.value, currentLngA.value], [currentLatB.value, currentLngB.value]],
          { padding: [35, 35], maxZoom: 16 }
        );
      }
    }
  }
);

function updatePolyline(L: any) {
  if (!mapInstance || !L) return;
  if (polylineLayer) {
    mapInstance.removeLayer(polylineLayer);
  }

  polylineLayer = L.polyline(
    [[currentLatA.value, currentLngA.value], [currentLatB.value, currentLngB.value]],
    { color: '#3b82f6', weight: 4, opacity: 0.85, dashArray: '6, 8' }
  ).addTo(mapInstance);
}

function emitChanges() {
  emit('update:coords', {
    latInicio: currentLatA.value,
    lngInicio: currentLngA.value,
    latDestino: currentLatB.value,
    lngDestino: currentLngB.value
  });
}

// Exponer método por si el padre lo quiere invocar directamente
defineExpose({
  buscarYPosicionar,
  pedirPermisoUbicacion
});

onMounted(() => {
  // Intentar solicitar permiso o comprobar permiso existente
  pedirPermisoUbicacion();
});

onBeforeUnmount(() => {
  clearTimeout(geocodeDebounceTimer);
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="space-y-3">
    
    <!-- CASO A: SI NO SE HA DADO ACCESO A LA UBICACIÓN -> NO SE MUESTRA EL MAPA -->
    <div 
      v-if="!tienePermisoUbicacion" 
      class="bg-slate-50 dark:bg-slate-950/90 border border-brand-500/30 rounded-2xl p-6 text-center space-y-4 shadow-sm dark:shadow-xl"
    >
      <div class="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto text-2xl">
        📍
      </div>

      <div class="max-w-md mx-auto space-y-1">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white">
          Se requiere acceso a tu ubicación GPS
        </h4>
        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Para no cargar un mapa genérico y centrarlo exactamente en tu calle y ciudad en tiempo real, permite el acceso a la ubicación de tu dispositivo.
        </p>
      </div>

      <div v-if="errorUbicacion" class="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 py-2 px-3 rounded-xl max-w-sm mx-auto">
        {{ errorUbicacion }}
      </div>

      <button
        type="button"
        @click="pedirPermisoUbicacion"
        :disabled="solicitandoUbicacion"
        class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:via-teal-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2 mx-auto active:scale-95 cursor-pointer"
      >
        <span v-if="solicitandoUbicacion" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ solicitandoUbicacion ? 'Detectando tu GPS...' : '📍 Activar Mi Ubicación y Ver Mapa' }}</span>
      </button>
    </div>

    <!-- CASO B: SI SE DIO ACCESO A LA UBICACIÓN -> SE MUESTRA EL MAPA INTERACTIVO -->
    <div v-else class="space-y-2.5">
      
      <!-- Indicador de Geocodificación Automática -->
      <div v-if="estadoGeocodificacion" class="bg-brand-500/15 border border-brand-500/30 text-brand-600 dark:text-brand-300 text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
        <span class="w-2 h-2 rounded-full bg-brand-500 dark:bg-brand-400 animate-pulse"></span>
        <span>{{ estadoGeocodificacion }}</span>
      </div>

      <!-- Barra de Marcadores Manuales -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <span class="text-slate-500 dark:text-slate-400 text-[11px]">
          Ubicado por dirección. También puedes arrastrar los pines o hacer clic para ajustar:
        </span>

        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            @click="modoSeleccion = 'inicio'"
            :class="[
              'px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer',
              modoSeleccion === 'inicio'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            ]"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            Ajustar Recogida (A)
          </button>
          <button
            type="button"
            @click="modoSeleccion = 'destino'"
            :class="[
              'px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer',
              modoSeleccion === 'destino'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            ]"
          >
            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
            Ajustar Destino (B)
          </button>
        </div>
      </div>

      <!-- Contenedor del Mapa -->
      <div class="relative w-full h-64 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 shadow-inner">
        <div ref="mapContainer" class="w-full h-full z-0"></div>
        
        <!-- Indicador flotante en el mapa -->
        <div class="absolute top-2 right-2 z-10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-300 shadow">
          Ajustando: <strong :class="modoSeleccion === 'inicio' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
            {{ modoSeleccion === 'inicio' ? 'Punto A (Recogida)' : 'Punto B (Destino)' }}
          </strong>
        </div>

        <div class="absolute bottom-2 left-2 z-10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400 shadow">
          💡 Puedes arrastrar los marcadores verdes y rojos libremente con el ratón
        </div>
      </div>

    </div>

  </div>
</template>
