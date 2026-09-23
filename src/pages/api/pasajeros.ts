export const prerender = false;
import type { APIRoute } from 'astro';
import type { Pasajero, SuscripcionPago, RutaHorario, PasajeroCompleto } from '../../types';
import { getSessionUser } from '../../lib/auth';
import { ensureDbSchema } from '../../lib/db';

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

    await ensureDbSchema(db);

    // 1. Obtener pasajeros del usuario autenticado
    const pasajerosResult: any = await db
      .prepare('SELECT * FROM pasajeros WHERE usuario_id = ? ORDER BY id DESC')
      .bind(sessionUser.id)
      .all();
    const pasajeros: any[] = pasajerosResult.results || [];

    if (pasajeros.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ids = pasajeros.map((p: any) => p.id);
    const placeholders = ids.map(() => '?').join(',');

    // 2. Obtener suscripciones de esos pasajeros
    const suscripcionesResult: any = await db
      .prepare(`SELECT * FROM suscripciones_pagos WHERE pasajero_id IN (${placeholders})`)
      .bind(...ids)
      .all();
    const suscripciones: any[] = suscripcionesResult.results || [];

    // 3. Obtener rutas de esos pasajeros
    const rutasResult: any = await db
      .prepare(`SELECT * FROM rutas_horarios WHERE pasajero_id IN (${placeholders}) ORDER BY dia_semana ASC, hora_recogida ASC`)
      .bind(...ids)
      .all();
    const rutas: any[] = rutasResult.results || [];

    // Consolidar estructuras
    const pasajerosCompletos: PasajeroCompleto[] = pasajeros.map((p: any) => {
      const suscripcion = suscripciones.find((s: any) => s.pasajero_id === p.id);
      const rutasPasajero = rutas.filter((r: any) => r.pasajero_id === p.id);
      const notifActiva = p.notificaciones_activas !== 0 && p.notificaciones_activas !== '0' && p.notificaciones_activas !== false && p.notificaciones_activas !== 'false';
      return {
        ...p,
        notificaciones_activas: notifActiva,
        minutos_aviso: p.minutos_aviso != null ? Number(p.minutos_aviso) : 30,
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

    await ensureDbSchema(db);

    const body = (await request.json()) as any;
    const {
      nombre,
      telefono,
      notas,
      notificaciones_activas,
      minutos_aviso,
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
    const notifActivas = (notificaciones_activas !== false && notificaciones_activas !== 0 && notificaciones_activas !== '0' && notificaciones_activas !== 'false') ? 1 : 0;
    const minAviso = Number(minutos_aviso) || 30;

    let pasajeroId: number | undefined;
    try {
      const insertPasajero: any = await db
        .prepare('INSERT INTO pasajeros (usuario_id, nombre, telefono, activo, notas, notificaciones_activas, minutos_aviso) VALUES (?, ?, ?, 1, ?, ?, ?) RETURNING id')
        .bind(sessionUser.id, nombre.trim(), telefonoLimpio, notas || '', notifActivas, minAviso)
        .first();
      pasajeroId = insertPasajero?.id;
    } catch (e) {
      // Fallback en caso de que la tabla D1 remota aún no tenga las nuevas columnas
      const insertFallback: any = await db
        .prepare('INSERT INTO pasajeros (usuario_id, nombre, telefono, activo, notas) VALUES (?, ?, ?, 1, ?) RETURNING id')
        .bind(sessionUser.id, nombre.trim(), telefonoLimpio, notas || '')
        .first();
      pasajeroId = insertFallback?.id;
    }

    if (!pasajeroId) {
      throw new Error('No se pudo obtener el ID del pasajero creado.');
    }

    const estadoInicial = estado_pago === 'Pagado' ? 'Pagado' : 'Pendiente';

    // Inserción en D1: 2. Suscripción de Pago
    if (modalidad && monto != null) {
      const subResult: any = await db
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
        .first();

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

    await ensureDbSchema(db);

    const body = (await request.json()) as any;
    const {
      id,
      nombre,
      telefono,
      notas,
      notificaciones_activas,
      minutos_aviso,
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

    // 1. Actualizar pasajero (con soporte para nuevas columnas de notificaciones)
    const notifVal = (notificaciones_activas !== false && notificaciones_activas !== 0 && notificaciones_activas !== '0' && notificaciones_activas !== 'false') ? 1 : 0;
    const minVal = Number(minutos_aviso) || 30;

    try {
      await db
        .prepare('UPDATE pasajeros SET nombre = ?, telefono = ?, notas = ?, notificaciones_activas = ?, minutos_aviso = ? WHERE id = ? AND usuario_id = ?')
        .bind(nombre.trim(), (telefono || '').trim(), notas || '', notifVal, minVal, id, sessionUser.id)
        .run();
    } catch (e) {
      // Fallback si la tabla remota no tiene aún las columnas nuevas
      await db
        .prepare('UPDATE pasajeros SET nombre = ?, telefono = ?, notas = ? WHERE id = ? AND usuario_id = ?')
        .bind(nombre.trim(), (telefono || '').trim(), notas || '', id, sessionUser.id)
        .run();
    }

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

// PATCH: Activar/desactivar pasajero o actualizar configuración rápida de notificaciones
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

    const body = (await request.json()) as any;
    const { id, activo, notificaciones_activas, minutos_aviso } = body;

    if (id == null) {
      return new Response(
        JSON.stringify({ error: 'ID es requerido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Actualización rápida de notificaciones
    if (notificaciones_activas !== undefined || minutos_aviso !== undefined) {
      await ensureDbSchema(db);
      try {
        const isActiva = notificaciones_activas !== false && notificaciones_activas !== 0 && notificaciones_activas !== '0' && notificaciones_activas !== 'false';
        if (notificaciones_activas !== undefined && minutos_aviso !== undefined) {
          await db
            .prepare('UPDATE pasajeros SET notificaciones_activas = ?, minutos_aviso = ? WHERE id = ? AND usuario_id = ?')
            .bind(isActiva ? 1 : 0, Number(minutos_aviso) || 30, id, sessionUser.id)
            .run();
        } else if (notificaciones_activas !== undefined) {
          await db
            .prepare('UPDATE pasajeros SET notificaciones_activas = ? WHERE id = ? AND usuario_id = ?')
            .bind(isActiva ? 1 : 0, id, sessionUser.id)
            .run();
        } else if (minutos_aviso !== undefined) {
          await db
            .prepare('UPDATE pasajeros SET minutos_aviso = ? WHERE id = ? AND usuario_id = ?')
            .bind(Number(minutos_aviso) || 30, id, sessionUser.id)
            .run();
        }
        return new Response(
          JSON.stringify({ success: true, message: 'Ajuste de notificaciones actualizado' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        console.warn('Columnas de notificaciones aún no migradas en D1:', err);
        return new Response(
          JSON.stringify({ success: true, message: 'Actualizado localmente' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Actualización de estado activo / pausado
    if (activo != null) {
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
    }

    return new Response(
      JSON.stringify({ error: 'No se especificó ninguna propiedad a modificar.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
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
