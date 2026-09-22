export const prerender = false;
import type { APIRoute } from 'astro';
import type { Pasajero, SuscripcionPago, RutaHorario, PasajeroCompleto } from '../../types';
import { getSessionUser } from '../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'No autenticado. Inicia sesión para acceder a tus pasajeros en la nube.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = (locals as any)?.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener pasajeros del usuario autenticado
    const pasajerosResult = await db
      .prepare('SELECT * FROM pasajeros WHERE usuario_id = ? ORDER BY id DESC')
      .bind(sessionUser.id)
      .all<Pasajero>();
    const pasajeros = pasajerosResult.results || [];

    if (pasajeros.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ids = pasajeros.map(p => p.id);
    const placeholders = ids.map(() => '?').join(',');

    // 2. Obtener suscripciones de esos pasajeros
    const suscripcionesResult = await db
      .prepare(`SELECT * FROM suscripciones_pagos WHERE pasajero_id IN (${placeholders})`)
      .bind(...ids)
      .all<SuscripcionPago>();
    const suscripciones = suscripcionesResult.results || [];

    // 3. Obtener rutas de esos pasajeros
    const rutasResult = await db
      .prepare(`SELECT * FROM rutas_horarios WHERE pasajero_id IN (${placeholders}) ORDER BY dia_semana ASC, hora_recogida ASC`)
      .bind(...ids)
      .all<RutaHorario>();
    const rutas = rutasResult.results || [];

    // Consolidar estructuras
    const pasajerosCompletos: PasajeroCompleto[] = pasajeros.map(p => {
      const suscripcion = suscripciones.find(s => s.pasajero_id === p.id);
      const rutasPasajero = rutas.filter(r => r.pasajero_id === p.id);
      return {
        ...p,
        suscripcion,
        rutas: rutasPasajero
      };
    });

    return new Response(JSON.stringify(pasajerosCompletos), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error en GET /api/pasajeros:', error);
    return new Response(
      JSON.stringify({ error: 'Error al consultar pasajeros', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'No autenticado. Inicia sesión para guardar pasajeros en la nube.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = (locals as any)?.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      nombre,
      telefono,
      notas,
      modalidad,
      monto,
      fecha_inicio,
      fecha_corte,
      estado_pago,
      rutas
    } = body;

    if (!nombre || !nombre.trim()) {
      return new Response(
        JSON.stringify({ error: 'El nombre es obligatorio.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Inserción en D1: 1. Pasajero con usuario_id
    const telefonoLimpio = (telefono || '').trim();
    const insertPasajero = await db
      .prepare('INSERT INTO pasajeros (usuario_id, nombre, telefono, activo, notas) VALUES (?, ?, ?, 1, ?) RETURNING id')
      .bind(sessionUser.id, nombre.trim(), telefonoLimpio, notas || '')
      .first<{ id: number }>();

    const pasajeroId = insertPasajero?.id;
    if (!pasajeroId) {
      throw new Error('No se pudo obtener el ID del pasajero creado.');
    }

    const estadoInicial = estado_pago === 'Pagado' ? 'Pagado' : 'Pendiente';

    // Inserción en D1: 2. Suscripción de Pago
    if (modalidad && monto != null) {
      const subResult = await db
        .prepare(`
          INSERT INTO suscripciones_pagos (pasajero_id, modalidad, monto, fecha_inicio, fecha_corte, estado_pago)
          VALUES (?, ?, ?, ?, ?, ?) RETURNING id
        `)
        .bind(
          pasajeroId,
          modalidad,
          Number(monto) || 0,
          fecha_inicio || new Date().toISOString().split('T')[0],
          fecha_corte || new Date().toISOString().split('T')[0],
          estadoInicial
        )
        .first<{ id: number }>();

      // Si se crea ya pagado, registrar en historial
      if (estadoInicial === 'Pagado' && subResult?.id) {
        await db
          .prepare(`
            INSERT INTO historial_pagos (suscripcion_id, monto_pagado, metodo_pago, referencia)
            VALUES (?, ?, 'Inicial', 'REG-ALTA')
          `)
          .bind(subResult.id, Number(monto) || 0)
          .run();
      }
    }

    // Inserción en D1: 3. Múltiples rutas
    if (Array.isArray(rutas) && rutas.length > 0) {
      for (const r of rutas) {
        if (r.dia_semana && r.punto_inicio && r.punto_destino) {
          await db
            .prepare(`
              INSERT INTO rutas_horarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat_inicio, lng_inicio, lat_destino, lng_destino)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              pasajeroId,
              r.dia_semana,
              r.hora_recogida || '08:00',
              r.punto_inicio,
              r.punto_destino,
              r.lat_inicio ?? null,
              r.lng_inicio ?? null,
              r.lat_destino ?? null,
              r.lng_destino ?? null
            )
            .run();
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: pasajeroId, message: 'Pasajero creado con éxito' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en POST /api/pasajeros:', error);
    return new Response(
      JSON.stringify({ error: 'Error al crear pasajero', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT: Edición completa de un pasajero existente
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'No autenticado.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = (locals as any)?.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      id,
      nombre,
      telefono,
      notas,
      modalidad,
      monto,
      fecha_corte,
      estado_pago,
      rutas
    } = body;

    if (!id || !nombre?.trim()) {
      return new Response(
        JSON.stringify({ error: 'ID y Nombre son obligatorios para actualizar.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar propiedad
    const pasajeroExistente = await db
      .prepare('SELECT id FROM pasajeros WHERE id = ? AND usuario_id = ?')
      .bind(id, sessionUser.id)
      .first();

    if (!pasajeroExistente) {
      return new Response(
        JSON.stringify({ error: 'Pasajero no encontrado o no tienes permiso para editarlo.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Actualizar pasajero
    await db
      .prepare('UPDATE pasajeros SET nombre = ?, telefono = ?, notas = ? WHERE id = ? AND usuario_id = ?')
      .bind(nombre.trim(), (telefono || '').trim(), notas || '', id, sessionUser.id)
      .run();

    // 2. Actualizar suscripción
    if (modalidad && monto != null) {
      await db
        .prepare(`
          UPDATE suscripciones_pagos 
          SET modalidad = ?, monto = ?, fecha_corte = ?, estado_pago = ?, actualizado_en = CURRENT_TIMESTAMP
          WHERE pasajero_id = ?
        `)
        .bind(modalidad, Number(monto) || 0, fecha_corte, estado_pago || 'Pendiente', id)
        .run();
    }

    // 3. Reemplazar rutas
    if (Array.isArray(rutas)) {
      await db.prepare('DELETE FROM rutas_horarios WHERE pasajero_id = ?').bind(id).run();
      for (const r of rutas) {
        if (r.dia_semana && r.punto_inicio && r.punto_destino) {
          await db
            .prepare(`
              INSERT INTO rutas_horarios (pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino, lat_inicio, lng_inicio, lat_destino, lng_destino)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              id,
              r.dia_semana,
              r.hora_recogida || '08:00',
              r.punto_inicio,
              r.punto_destino,
              r.lat_inicio ?? null,
              r.lng_inicio ?? null,
              r.lat_destino ?? null,
              r.lng_destino ?? null
            )
            .run();
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Pasajero actualizado correctamente' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en PUT /api/pasajeros:', error);
    return new Response(
      JSON.stringify({ error: 'Error al actualizar pasajero', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PATCH: Activar o desactivar pasajero (pausar servicio sin eliminar)
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'No autenticado.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = (locals as any)?.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { id, activo } = body;

    if (id == null || activo == null) {
      return new Response(
        JSON.stringify({ error: 'ID y estado activo (0 o 1) son requeridos.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const nuevoActivo = activo ? 1 : 0;
    await db
      .prepare('UPDATE pasajeros SET activo = ? WHERE id = ? AND usuario_id = ?')
      .bind(nuevoActivo, id, sessionUser.id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        activo: nuevoActivo,
        message: nuevoActivo ? 'Pasajero activado' : 'Pasajero desactivado'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en PATCH /api/pasajeros:', error);
    return new Response(
      JSON.stringify({ error: 'Error al cambiar estado del pasajero', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request, url, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'No autenticado.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = (locals as any)?.runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID de pasajero no proporcionado.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminación en cascada garantizando propiedad del usuario
    await db
      .prepare('DELETE FROM pasajeros WHERE id = ? AND usuario_id = ?')
      .bind(id, sessionUser.id)
      .run();

    return new Response(
      JSON.stringify({ success: true, message: `Pasajero #${id} eliminado correctamente.` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en DELETE /api/pasajeros:', error);
    return new Response(
      JSON.stringify({ error: 'Error al eliminar pasajero', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
