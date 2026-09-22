export const prerender = false;
import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'No autenticado.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    const db = (locals as any)?.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID de suscripción requerido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { estado_pago, monto, metodo_pago } = body;

    if (!estado_pago || (estado_pago !== 'Pagado' && estado_pago !== 'Pendiente')) {
      return new Response(
        JSON.stringify({ error: 'Estado de pago inválido. Debe ser "Pagado" o "Pendiente".' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener la suscripción actual antes de actualizar asegurando pertenencia al usuario
    const suscripcionActual: any = await db
      .prepare(`
        SELECT s.* 
        FROM suscripciones_pagos s 
        JOIN pasajeros p ON s.pasajero_id = p.id 
        WHERE s.id = ? AND p.usuario_id = ?
      `)
      .bind(id, sessionUser.id)
      .first();

    if (!suscripcionActual) {
      return new Response(
        JSON.stringify({ error: 'Suscripción no encontrada o no autorizada.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let nuevaFechaInicio = suscripcionActual.fecha_inicio;
    let nuevaFechaCorte = suscripcionActual.fecha_corte;
    let cicloRenovado = false;

    // 2. Si se marca como 'Pagado'
    if (estado_pago === 'Pagado') {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Parsear fecha de corte sin desfase de zona horaria
      let fechaCorteActual: Date;
      if (suscripcionActual.fecha_corte) {
        const [y, m, d] = suscripcionActual.fecha_corte.split('-').map(Number);
        fechaCorteActual = new Date(y, m - 1, d);
      } else {
        fechaCorteActual = new Date(hoy);
      }

      // Si la fecha de corte ya venció, es hoy, o el cliente solicita renovar ciclo:
      if (fechaCorteActual <= hoy || body.renovar_ciclo) {
        cicloRenovado = true;
        // Nueva fecha de inicio
        nuevaFechaInicio = suscripcionActual.fecha_corte;

        // Calcular siguiente fecha de corte según modalidad
        const sigCorte = new Date(fechaCorteActual);
        // Si estaba muy en el pasado (más de 45 días), partir desde hoy
        const diffTiempo = hoy.getTime() - fechaCorteActual.getTime();
        const diasAtras = Math.round(diffTiempo / (1000 * 60 * 60 * 24));
        if (diasAtras > 45) {
          sigCorte.setTime(hoy.getTime());
          nuevaFechaInicio = hoy.toISOString().split('T')[0];
        }

        const modalidad = suscripcionActual.modalidad || 'mensual';
        if (modalidad === 'semanal') {
          sigCorte.setDate(sigCorte.getDate() + 7);
        } else if (modalidad === 'quincenal') {
          sigCorte.setDate(sigCorte.getDate() + 15);
        } else {
          // Mensual (1 mes calendario)
          sigCorte.setMonth(sigCorte.getMonth() + 1);
        }

        const anio = sigCorte.getFullYear();
        const mes = String(sigCorte.getMonth() + 1).padStart(2, '0');
        const dia = String(sigCorte.getDate()).padStart(2, '0');
        nuevaFechaCorte = `${anio}-${mes}-${dia}`;
      }

      // Registrar transacción en historial_pagos
      const montoPagado = monto ?? suscripcionActual.monto ?? 0;
      await db
        .prepare(`
          INSERT INTO historial_pagos (suscripcion_id, monto_pagado, metodo_pago, referencia)
          VALUES (?, ?, ?, ?)
        `)
        .bind(id, montoPagado, metodo_pago || 'Efectivo / Pago Móvil', `REG-${Date.now().toString().slice(-6)}`)
        .run();
    }

    // 3. Actualizar registro en suscripciones_pagos
    await db
      .prepare(`
        UPDATE suscripciones_pagos 
        SET estado_pago = ?, fecha_inicio = ?, fecha_corte = ?, actualizado_en = CURRENT_TIMESTAMP 
        WHERE id = ?
      `)
      .bind(estado_pago, nuevaFechaInicio, nuevaFechaCorte, id)
      .run();

    // 4. Consultar suscripción actualizada para retornarla
    const updated = await db
      .prepare('SELECT * FROM suscripciones_pagos WHERE id = ?')
      .bind(id)
      .first();

    return new Response(
      JSON.stringify({
        success: true,
        suscripcion: updated,
        cicloRenovado,
        message: cicloRenovado 
          ? `Pago registrado y ciclo renovado hasta el ${nuevaFechaCorte}` 
          : `Estado actualizado a ${estado_pago}`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`Error en PATCH /api/pagos/${params.id}:`, error);
    return new Response(
      JSON.stringify({ error: 'Error al actualizar estado de pago', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
