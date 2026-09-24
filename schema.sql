-- ========================================================
-- TransportManager - Cloudflare D1 Database Schema
-- ========================================================

-- Habilitar claves foráneas
PRAGMA foreign_keys = ON;

-- 1. Tabla de Usuarios / Conductores
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    email_verificado INTEGER NOT NULL DEFAULT 0, -- 0: pendiente de confirmación, 1: verificado
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Pasajeros (vinculados al conductor/usuario)
CREATE TABLE IF NOT EXISTS pasajeros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1, -- 1: activo, 0: inactivo
    notas TEXT,
    notificaciones_activas INTEGER NOT NULL DEFAULT 1, -- 1: activas, 0: desactivadas
    minutos_aviso INTEGER NOT NULL DEFAULT 30, -- minutos previos de anticipación
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 3. Tabla de Suscripciones y Gestión de Cobros
CREATE TABLE IF NOT EXISTS suscripciones_pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pasajero_id INTEGER NOT NULL,
    modalidad TEXT NOT NULL CHECK(modalidad IN ('semanal', 'quincenal', 'mensual')),
    monto REAL NOT NULL DEFAULT 0.0,
    fecha_inicio DATE NOT NULL,
    fecha_corte DATE NOT NULL,
    estado_pago TEXT NOT NULL CHECK(estado_pago IN ('Pagado', 'Pendiente')) DEFAULT 'Pendiente',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pasajero_id) REFERENCES pasajeros(id) ON DELETE CASCADE
);

-- 4. Tabla de Itinerario de Rutas y Horarios por Día de la Semana
CREATE TABLE IF NOT EXISTS rutas_horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pasajero_id INTEGER NOT NULL,
    dia_semana TEXT NOT NULL CHECK(dia_semana IN ('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo')),
    hora_recogida TEXT NOT NULL, -- Formato HH:MM (24h)
    punto_inicio TEXT NOT NULL,
    punto_destino TEXT NOT NULL,
    lat_inicio REAL,
    lng_inicio REAL,
    lat_destino REAL,
    lng_destino REAL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pasajero_id) REFERENCES pasajeros(id) ON DELETE CASCADE
);

-- 5. Tabla de Historial de Pagos
CREATE TABLE IF NOT EXISTS historial_pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suscripcion_id INTEGER NOT NULL,
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_pagado REAL NOT NULL,
    metodo_pago TEXT DEFAULT 'Efectivo',
    referencia TEXT,
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones_pagos(id) ON DELETE CASCADE
);

-- 6. Tabla de Códigos de Verificación OTP (Registro y Recuperación de Contraseña)
CREATE TABLE IF NOT EXISTS codigos_verificacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    codigo TEXT NOT NULL, -- Código de 6 dígitos numéricos
    tipo TEXT NOT NULL CHECK(tipo IN ('registro', 'recuperacion')),
    expira_en DATETIME NOT NULL,
    usado INTEGER NOT NULL DEFAULT 0,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización de consultas
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_pasajeros_usuario ON pasajeros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_pasajero ON suscripciones_pagos(pasajero_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones_pagos(estado_pago);
CREATE INDEX IF NOT EXISTS idx_rutas_pasajero ON rutas_horarios(pasajero_id);
CREATE INDEX IF NOT EXISTS idx_rutas_dia ON rutas_horarios(dia_semana);
CREATE INDEX IF NOT EXISTS idx_historial_suscripcion ON historial_pagos(suscripcion_id);
CREATE INDEX IF NOT EXISTS idx_codigos_email_tipo ON codigos_verificacion(email, tipo, usado);

