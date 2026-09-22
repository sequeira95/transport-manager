export const prerender = false;
import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';
import type { PasajeroCompleto } from '../../../types';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'Debes iniciar sesión para migrar tus datos a la nube.' }),
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
    const pasajeros: PasajeroCompleto[] = body.pasajeros || [];

    if (!Array.isArray(pasajeros) || pasajeros.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'No hay pasajeros locales para migrar.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let migradosCount = 0;

    for (const p of pasajeros) {
      if (!p.nombre) continue;

      // 1. Insertar Pasajero con usuario_id del conductor
      const resPasajero: any = await db
        .prepare(`
          INSERT INTO pasajeros (usuario_id, nombre, telefono, activo, notas)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id
        `)
        .bind(
          sessionUser.id,
          p.nombre.trim(),
          p.telefono || '',
          p.activo ?? 1,
          p.notas || null
        )
        .first();

      const nuevoPasajeroId = resPasajero?.id;
      if (!nuevoPasajeroId) continue;

      // 2. Insertar Suscripción
      let nuevaSubId: number | null = null;
      if (p.suscripcion) {
        const subRes: any = await db
          .prepare(`
            INSERT INTO suscripciones_pagos (pasajero_id, modalidad, monto, fecha_inicio, fecha_corte, estado_pago)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id
          `)
          .bind(
            nuevoPasajeroId,
            p.suscripcion.modalidad || 'mensual',
            Number(p.suscripcion.monto) || 0,
            p.suscripcion.fecha_inicio || new Date().toISOString().split('T')[0],
            p.suscripcion.fecha_corte || new Date().toISOString().split('T')[0],
            p.suscripcion.estado_pago || 'Pendiente'
          )
          .first();

        nuevaSubId = subRes?.id;

        // Si ya tenía pagos o estaba pagado, registrar historial
        if (p.suscripcion.estado_pago === 'Pagado' && nuevaSubId) {
          await db
            .prepare(`
              INSERT INTO historial_pagos (suscripcion_id, monto_pagado, metodo_pago, referencia)
              VALUES (?, ?, 'Local Migrado', 'MIG-INICIAL')
            `)
            .bind(nuevaSubId, Number(p.suscripcion.monto) || 0)
            .run();
        }
      }

      // 3. Insertar Rutas
      if (Array.isArray(p.rutas) && p.rutas.length > 0) {
        for (const r of p.rutas) {
          if (!r.punto_inicio || !r.punto_destino) continue;
          await db
            .prepare(`
              INSERT INTO rutas_horarios (
                pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino,
                lat_inicio, lng_inicio, lat_destino, lng_destino
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              nuevoPasajeroId,
              r.dia_semana,
              r.hora_recogida || '07:30',
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

      migradosCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: migradosCount,
        message: `Se migraron con éxito ${migradosCount} pasajeros a tu cuenta en la nube.`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en POST /api/auth/migrar-locales:', error);
    return new Response(
      JSON.stringify({ error: 'Error al migrar datos locales.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
