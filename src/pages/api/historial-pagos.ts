export const prerender = false;
import type { APIRoute } from 'astro';
import { getSessionUser } from '../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response(
        JSON.stringify({ error: 'No autenticado. Inicia sesión para ver tu historial en la nube.' }),
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

    const url = new URL(request.url);
    const pasajeroIdParam = url.searchParams.get('pasajero_id');
    const suscripcionIdParam = url.searchParams.get('suscripcion_id');

    let query = `
      SELECT 
        h.id,
        h.suscripcion_id,
        h.fecha_pago,
        h.monto_pagado,
        h.metodo_pago,
        h.referencia,
        p.id as pasajero_id,
        p.nombre as pasajero_nombre,
        p.telefono as pasajero_telefono,
        s.modalidad
      FROM historial_pagos h
      JOIN suscripciones_pagos s ON h.suscripcion_id = s.id
      JOIN pasajeros p ON s.pasajero_id = p.id
      WHERE p.usuario_id = ?
    `;

    const params: any[] = [sessionUser.id];

    if (pasajeroIdParam) {
      query += ` AND p.id = ?`;
      params.push(parseInt(pasajeroIdParam, 10));
    } else if (suscripcionIdParam) {
      query += ` AND h.suscripcion_id = ?`;
      params.push(parseInt(suscripcionIdParam, 10));
    }

    query += ` ORDER BY h.fecha_pago DESC, h.id DESC`;

    const stmt = db.prepare(query).bind(...params);
    const result = await stmt.all();

    return new Response(JSON.stringify(result.results || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error en GET /api/historial-pagos:', error);
    return new Response(
      JSON.stringify({ error: 'Error al consultar historial de pagos', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
