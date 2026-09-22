-- ========================================================
-- TransportManager - Datos Semilla de Prueba (Seed Data)
-- ========================================================

-- Limpieza preventiva
DELETE FROM historial_pagos;
DELETE FROM rutas_horarios;
DELETE FROM suscripciones_pagos;
DELETE FROM pasajeros;

-- 1. Pasajeros
INSERT INTO pasajeros (id, nombre, telefono, activo, notas) VALUES
(1, 'Carlos Mendoza', '+54 9 11 5555-0101', 1, 'Pasa a buscarlo siempre puntual en la esquina'),
(2, 'Valentina Ruiz', '+54 9 11 5555-0202', 1, 'Lleva mochila grande. Notificar 5 min antes'),
(3, 'Esteban Morales', '+54 9 11 5555-0303', 1, 'Cobro a través de transferencia bancaria'),
(4, 'Mariana Gómez', '+54 9 11 5555-0404', 1, 'Turno mañana en el centro corporativo');

-- 2. Suscripciones de Pago
INSERT INTO suscripciones_pagos (id, pasajero_id, modalidad, monto, fecha_inicio, fecha_corte, estado_pago) VALUES
(1, 1, 'mensual', 45000.00, '2026-09-01', '2026-10-01', 'Pendiente'),
(2, 2, 'quincenal', 24000.00, '2026-09-15', '2026-09-30', 'Pagado'),
(3, 3, 'semanal', 12500.00, '2026-09-22', '2026-09-28', 'Pendiente'),
(4, 4, 'mensual', 48000.00, '2026-09-01', '2026-10-01', 'Pagado');

-- 3. Rutas y Horarios por Día de la Semana (Ejemplo con coordenadas urbanas reales)
-- Carlos Mendoza: Lunes a Viernes
INSERT INTO rutas_horarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat_inicio, lng_inicio, lat_destino, lng_destino) VALUES
(1, 'Lunes', '07:15', 'Av. Santa Fe 3200, Palermo', 'Torre Bellini, Microcentro', -34.5875, -58.4124, -34.6012, -58.3754),
(1, 'Martes', '07:15', 'Av. Santa Fe 3200, Palermo', 'Torre Bellini, Microcentro', -34.5875, -58.4124, -34.6012, -58.3754),
(1, 'Miercoles', '07:15', 'Av. Santa Fe 3200, Palermo', 'Torre Bellini, Microcentro', -34.5875, -58.4124, -34.6012, -58.3754),
(1, 'Jueves', '07:15', 'Av. Santa Fe 3200, Palermo', 'Torre Bellini, Microcentro', -34.5875, -58.4124, -34.6012, -58.3754),
(1, 'Viernes', '07:30', 'Av. Santa Fe 3200, Palermo', 'Torre Bellini, Microcentro', -34.5875, -58.4124, -34.6012, -58.3754);

-- Valentina Ruiz: Lunes, Miercoles, Viernes
INSERT INTO rutas_horarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat_inicio, lng_inicio, lat_destino, lng_destino) VALUES
(2, 'Lunes', '07:45', 'Av. Cabildo 2040, Belgrano', 'Campus Universitario UBA', -34.5621, -58.4562, -34.5428, -58.4439),
(2, 'Miercoles', '07:45', 'Av. Cabildo 2040, Belgrano', 'Campus Universitario UBA', -34.5621, -58.4562, -34.5428, -58.4439),
(2, 'Viernes', '08:00', 'Av. Cabildo 2040, Belgrano', 'Campus Universitario UBA', -34.5621, -58.4562, -34.5428, -58.4439);

-- Esteban Morales: Lunes a Sabado
INSERT INTO rutas_horarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat_inicio, lng_inicio, lat_destino, lng_destino) VALUES
(3, 'Lunes', '06:30', 'Av. Rivadavia 6500, Flores', 'Parque Patricios Tech Hub', -34.6291, -58.4632, -34.6398, -58.4065),
(3, 'Martes', '06:30', 'Av. Rivadavia 6500, Flores', 'Parque Patricios Tech Hub', -34.6291, -58.4632, -34.6398, -58.4065),
(3, 'Miercoles', '06:30', 'Av. Rivadavia 6500, Flores', 'Parque Patricios Tech Hub', -34.6291, -58.4632, -34.6398, -58.4065),
(3, 'Jueves', '06:30', 'Av. Rivadavia 6500, Flores', 'Parque Patricios Tech Hub', -34.6291, -58.4632, -34.6398, -58.4065),
(3, 'Viernes', '06:30', 'Av. Rivadavia 6500, Flores', 'Parque Patricios Tech Hub', -34.6291, -58.4632, -34.6398, -58.4065),
(3, 'Sabado', '08:00', 'Av. Rivadavia 6500, Flores', 'Parque Patricios Tech Hub', -34.6291, -58.4632, -34.6398, -58.4065);

-- Mariana Gómez: Lunes a Viernes
INSERT INTO rutas_horarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat_inicio, lng_inicio, lat_destino, lng_destino) VALUES
(4, 'Lunes', '08:15', 'Calle Juncal 1420, Recoleta', 'Catalinas Norte, Retiro', -34.5932, -58.3887, -34.5976, -58.3712),
(4, 'Martes', '08:15', 'Calle Juncal 1420, Recoleta', 'Catalinas Norte, Retiro', -34.5932, -58.3887, -34.5976, -58.3712),
(4, 'Miercoles', '08:15', 'Calle Juncal 1420, Recoleta', 'Catalinas Norte, Retiro', -34.5932, -58.3887, -34.5976, -58.3712),
(4, 'Jueves', '08:15', 'Calle Juncal 1420, Recoleta', 'Catalinas Norte, Retiro', -34.5932, -58.3887, -34.5976, -58.3712),
(4, 'Viernes', '08:15', 'Calle Juncal 1420, Recoleta', 'Catalinas Norte, Retiro', -34.5932, -58.3887, -34.5976, -58.3712);

-- 4. Historial de Pagos previo
INSERT INTO historial_pagos (suscripcion_id, fecha_pago, monto_pagado, metodo_pago, referencia) VALUES
(2, '2026-09-15 10:24:00', 24000.00, 'Transferencia', 'TRX-99812'),
(4, '2026-09-02 18:40:00', 48000.00, 'MercadoPago', 'MP-55421');
