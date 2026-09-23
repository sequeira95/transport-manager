export type ModalidadPago = 'semanal' | 'quincenal' | 'mensual';
export type EstadoPago = 'Pagado' | 'Pendiente';
export type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  creado_en?: string;
}

export interface Pasajero {
  id: number;
  usuario_id?: number;
  nombre: string;
  telefono: string;
  activo: number;
  notas?: string;
  notificaciones_activas?: boolean;
  minutos_aviso?: number;
  creado_en?: string;
}

export interface NotificationConfig {
  enabled: boolean;
  defaultMinutesBefore: number;
  soundEnabled: boolean;
  inAppBannerEnabled: boolean;
}

export interface ScheduledPickupNotice {
  pasajeroId: number;
  pasajeroNombre: string;
  pasajeroTelefono?: string;
  rutaId: number;
  diaSemana: DiaSemana;
  horaRecogida: string;
  puntoInicio: string;
  puntoDestino: string;
  minutosAviso: number;
  minutosRestantes: number;
  horaNotificacionStr: string;
  esInminente: boolean;
}

export interface SuscripcionPago {
  id: number;
  pasajero_id: number;
  modalidad: ModalidadPago;
  monto: number;
  fecha_inicio: string;
  fecha_corte: string;
  estado_pago: EstadoPago;
  creado_en?: string;
  actualizado_en?: string;
}

export interface RutaHorario {
  id: number;
  pasajero_id: number;
  dia_semana: DiaSemana;
  hora_recogida: string;
  punto_inicio: string;
  punto_destino: string;
  lat_inicio: number | null;
  lng_inicio: number | null;
  lat_destino: number | null;
  lng_destino: number | null;
  creado_en?: string;
}

export interface HistorialPago {
  id: number;
  suscripcion_id: number;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago?: string;
  referencia?: string;
  pasajero_id?: number;
  pasajero_nombre?: string;
  pasajero_telefono?: string;
  modalidad?: ModalidadPago;
}

export interface PasajeroCompleto extends Pasajero {
  suscripcion?: SuscripcionPago;
  rutas: RutaHorario[];
  historial?: HistorialPago[];
}

export interface DashboardStats {
  totalPasajeros: number;
  pasajerosActivos: number;
  cobrosPendientesCount: number;
  montoPendienteTotal: number;
  montoCobradoTotal: number;
}
