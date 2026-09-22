<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import type { RutaHorario } from '../types';

const props = defineProps<{
  rutas?: RutaHorario[];
  latInicio?: number | null;
  lngInicio?: number | null;
  latDestino?: number | null;
  lngDestino?: number | null;
  puntoInicio?: string;
  puntoDestino?: string;
  idPasajero: number;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let mapInstance: any = null;
let markersLayer: any = null;
let polylineLayer: any = null;

// Marcadores personalizados SVG para paradas y tramos múltiples
function createCustomIcon(color: string, label: string) {
  if (typeof window === 'undefined') return undefined;
  const L = (window as any).L;
  if (!L) return undefined;

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
        <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4); border: 2px solid #ffffff;">
          <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 11px;">${label}</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

async function initMap() {
  if (!mapContainer.value || typeof window === 'undefined') return;

  const L = await import('leaflet');
  (window as any).L = L;

  let defaultLat = 10.4806;
  let defaultLng = -66.9036;

  if (props.rutas && props.rutas.length > 0 && props.rutas[0].lat_inicio != null) {
    defaultLat = props.rutas[0].lat_inicio;
    defaultLng = props.rutas[0].lng_inicio || defaultLng;
  } else if (props.latInicio != null && props.lngInicio != null) {
    defaultLat = props.latInicio;
    defaultLng = props.lngInicio;
  }

  if (mapInstance) {
    mapInstance.remove();
  }

  mapInstance = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: false
  }).setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);
  renderMarkers(L);
}

const coloresTramo = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

function renderMarkers(L: any) {
  if (!mapInstance || !L) return;

  if (markersLayer) markersLayer.clearLayers();
  if (polylineLayer) {
    mapInstance.removeLayer(polylineLayer);
    polylineLayer = null;
  }

  const bounds: [number, number][] = [];
  const linePoints: [number, number][] = [];

  // Caso 1: Array de rutas/tramos para el día
  if (props.rutas && props.rutas.length > 0) {
    props.rutas.forEach((ruta, idx) => {
      const tramoNum = idx + 1;
      const color = coloresTramo[idx % coloresTramo.length];

      if (ruta.lat_inicio != null && ruta.lng_inicio != null) {
        const iconInicio = createCustomIcon(color, `${tramoNum}A`);
        L.marker([ruta.lat_inicio, ruta.lng_inicio], { icon: iconInicio })
          .bindPopup(`<strong>Tramo #${tramoNum} (Recogida ${ruta.hora_recogida})</strong><br>${ruta.punto_inicio}`)
          .addTo(markersLayer);
        bounds.push([ruta.lat_inicio, ruta.lng_inicio]);
        linePoints.push([ruta.lat_inicio, ruta.lng_inicio]);
      }

      if (ruta.lat_destino != null && ruta.lng_destino != null) {
        const iconDestino = createCustomIcon('#ef4444', `${tramoNum}B`);
        L.marker([ruta.lat_destino, ruta.lng_destino], { icon: iconDestino })
          .bindPopup(`<strong>Tramo #${tramoNum} (Destino)</strong><br>${ruta.punto_destino}`)
          .addTo(markersLayer);
        bounds.push([ruta.lat_destino, ruta.lng_destino]);
        linePoints.push([ruta.lat_destino, ruta.lng_destino]);
      }
    });
  } 
  // Caso 2: Parámetros simples individuales
  else {
    if (props.latInicio != null && props.lngInicio != null) {
      const originIcon = createCustomIcon('#10b981', 'A');
      L.marker([props.latInicio, props.lngInicio], { icon: originIcon })
        .bindPopup(`<strong>Punto de Recogida</strong><br>${props.puntoInicio || ''}`)
        .addTo(markersLayer);
      bounds.push([props.latInicio, props.lngInicio]);
      linePoints.push([props.latInicio, props.lngInicio]);
    }

    if (props.latDestino != null && props.lngDestino != null) {
      const destIcon = createCustomIcon('#ef4444', 'B');
      L.marker([props.latDestino, props.lngDestino], { icon: destIcon })
        .bindPopup(`<strong>Destino</strong><br>${props.puntoDestino || ''}`)
        .addTo(markersLayer);
      bounds.push([props.latDestino, props.lngDestino]);
      linePoints.push([props.latDestino, props.lngDestino]);
    }
  }

  // Trazado de ruta conectando las paradas del día
  if (linePoints.length > 1) {
    polylineLayer = L.polyline(linePoints, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.85,
      dashArray: '6, 8'
    }).addTo(mapInstance);
  }

  if (bounds.length > 1) {
    mapInstance.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
  } else if (bounds.length === 1) {
    mapInstance.setView(bounds[0], 14);
  }
}

watch(
  () => [props.rutas, props.latInicio, props.lngInicio, props.latDestino, props.lngDestino],
  async () => {
    if (typeof window !== 'undefined' && (window as any).L) {
      renderMarkers((window as any).L);
    }
  },
  { deep: true }
);

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="relative w-full h-48 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-inner">
    <div ref="mapContainer" class="w-full h-full z-0"></div>
    <div class="absolute bottom-2 left-2 z-10 bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] text-slate-300 border border-slate-700/50 flex items-center gap-2">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Recogida</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Destino</span>
      <span v-if="rutas && rutas.length > 1" class="text-brand-300 font-bold ml-1">({{ rutas.length }} paradas)</span>
    </div>
  </div>
</template>
