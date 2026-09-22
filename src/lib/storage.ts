import type { PasajeroCompleto, EstadoPago } from '../types';

const STORAGE_KEY = 'tm_local_pasajeros_v1';

/**
 * Obtiene los pasajeros almacenados localmente en el dispositivo
 */
export function getLocalPasajeros(): PasajeroCompleto[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo pasajeros locales:', err);
    return [];
  }
}

/**
 * Guarda la lista completa de pasajeros en el almacenamiento local
 */
export function saveLocalPasajeros(pasajeros: PasajeroCompleto[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pasajeros));
  } catch (err) {
    console.error('Error guardando pasajeros locales:', err);
  }
}

/**
 * Cuenta la cantidad de pasajeros locales almacenados
 */
export function countLocalPasajeros(): number {
  return getLocalPasajeros().length;
}

/**
 * Agrega un nuevo pasajero al almacenamiento local
 */
export function addLocalPasajero(data: {
  nombre: string;
  telefono?: string;
  notas?: string;
  modalidad?: string;
  monto?: number;
  fecha_inicio?: string;
  fecha_corte?: string;
  estado_pago?: EstadoPago;
  rutas?: any[];
}): PasajeroCompleto {
  const pasajeros = getLocalPasajeros();
  const nextId = pasajeros.length > 0 ? Math.max(...pasajeros.map(p => p.id)) + 1 : 1;
  const nextSubId = Date.now();

  const nuevo: PasajeroCompleto = {
    id: nextId,
    nombre: data.nombre.trim(),
    telefono: (data.telefono || '').trim(),
    activo: 1,
    notas: data.notas || undefined,
    creado_en: new Date().toISOString(),
    suscripcion: data.modalidad ? {
      id: nextSubId,
      pasajero_id: nextId,
      modalidad: data.modalidad as any,
      monto: Number(data.monto) || 0,
      fecha_inicio: data.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_corte: data.fecha_corte || new Date().toISOString().split('T')[0],
      estado_pago: data.estado_pago || 'Pendiente'
    } : undefined,
    rutas: (data.rutas || []).map((r, idx) => ({
      id: nextId * 100 + idx,
      pasajero_id: nextId,
      dia_semana: r.dia_semana,
      hora_recogida: r.hora_recogida || '08:00',
      punto_inicio: r.punto_inicio,
      punto_destino: r.punto_destino,
      lat_inicio: r.lat_inicio ?? null,
      lng_inicio: r.lng_inicio ?? null,
      lat_destino: r.lat_destino ?? null,
      lng_destino: r.lng_destino ?? null
    }))
  };

  pasajeros.unshift(nuevo);
  saveLocalPasajeros(pasajeros);
  return nuevo;
}

/**
 * Actualiza un pasajero local existente
 */
export function updateLocalPasajero(data: {
  id: number;
  nombre: string;
  telefono?: string;
  notas?: string;
  modalidad?: string;
  monto?: number;
  fecha_corte?: string;
  estado_pago?: EstadoPago;
  rutas?: any[];
}): void {
  const pasajeros = getLocalPasajeros();
  const idx = pasajeros.findIndex(p => p.id === data.id);
  if (idx === -1) return;

  const p = pasajeros[idx];
  p.nombre = data.nombre.trim();
  p.telefono = (data.telefono || '').trim();
  p.notas = data.notas || undefined;

  if (p.suscripcion && data.modalidad) {
    p.suscripcion.modalidad = data.modalidad as any;
    p.suscripcion.monto = Number(data.monto) || 0;
    if (data.fecha_corte) p.suscripcion.fecha_corte = data.fecha_corte;
    if (data.estado_pago) p.suscripcion.estado_pago = data.estado_pago;
  }

  if (Array.isArray(data.rutas)) {
    p.rutas = data.rutas.map((r, i) => ({
      id: p.id * 100 + i,
      pasajero_id: p.id,
      dia_semana: r.dia_semana,
      hora_recogida: r.hora_recogida || '08:00',
      punto_inicio: r.punto_inicio,
      punto_destino: r.punto_destino,
      lat_inicio: r.lat_inicio ?? null,
      lng_inicio: r.lng_inicio ?? null,
      lat_destino: r.lat_destino ?? null,
      lng_destino: r.lng_destino ?? null
    }));
  }

  saveLocalPasajeros(pasajeros);
}

/**
 * Actualiza estado de cobro y renueva ciclo localmente
 */
export function updateLocalPago(
  suscripcionId: number,
  nuevoEstado: EstadoPago,
  renovarCiclo: boolean = false
): { suscripcion: any } | null {
  const pasajeros = getLocalPasajeros();
  let updatedSub: any = null;

  for (const p of pasajeros) {
    if (p.suscripcion && p.suscripcion.id === suscripcionId) {
      p.suscripcion.estado_pago = nuevoEstado;

      if (nuevoEstado === 'Pagado' && renovarCiclo && p.suscripcion.fecha_corte) {
        const [y, m, d] = p.suscripcion.fecha_corte.split('-').map(Number);
        const sigCorte = new Date(y, m - 1, d);
        const modalidad = p.suscripcion.modalidad || 'mensual';

        if (modalidad === 'semanal') {
          sigCorte.setDate(sigCorte.getDate() + 7);
        } else if (modalidad === 'quincenal') {
          sigCorte.setDate(sigCorte.getDate() + 15);
        } else {
          sigCorte.setMonth(sigCorte.getMonth() + 1);
        }

        const anio = sigCorte.getFullYear();
        const mes = String(sigCorte.getMonth() + 1).padStart(2, '0');
        const dia = String(sigCorte.getDate()).padStart(2, '0');
        p.suscripcion.fecha_corte = `${anio}-${mes}-${dia}`;
      }

      updatedSub = { ...p.suscripcion };
      break;
    }
  }

  if (updatedSub) {
    saveLocalPasajeros(pasajeros);
  }
  return updatedSub ? { suscripcion: updatedSub } : null;
}

/**
 * Alterna el estado activo / pausado de un pasajero local
 */
export function toggleLocalActivo(id: number, nuevoActivo: number): void {
  const pasajeros = getLocalPasajeros();
  const p = pasajeros.find(item => item.id === id);
  if (p) {
    p.activo = nuevoActivo;
    saveLocalPasajeros(pasajeros);
  }
}

/**
 * Elimina un pasajero del almacenamiento local
 */
export function deleteLocalPasajero(id: number): void {
  const pasajeros = getLocalPasajeros().filter(p => p.id !== id);
  saveLocalPasajeros(pasajeros);
}

/**
 * Limpia todos los pasajeros locales (ej. tras migrar a la nube)
 */
export function clearLocalPasajeros(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
