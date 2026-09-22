export const prerender = false;
import type { APIRoute } from 'astro';
import { getSessionUser } from '../../lib/auth';

export const GET: APIRoute = async ({ request, url, locals }) => {
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

    const pasajeroId = url.searchParams.get('pasajero_id');
    const diaSemana = url.searchParams.get('dia_semana');

    let query = `
      SELECT r.* 
      FROM rutas_horarios r
      JOIN pasajeros p ON r.pasajero_id = p.id
      WHERE p.usuario_id = ?
    `;
    const params: any[] = [sessionUser.id];

    if (pasajeroId) {
      query += ' AND r.pasajero_id = ?';
      params.push(pasajeroId);
    }
    if (diaSemana) {
      query += ' AND r.dia_semana = ?';
      params.push(diaSemana);
    }

    query += ' ORDER BY r.hora_recogida ASC';

    const result = await db.prepare(query).bind(...params).all();

    return new Response(JSON.stringify(result.results || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Error al consultar rutas', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
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
      pasajero_id,
      dia_semana,
      hora_recogida,
      punto_inicio,
      punto_destino,
      lat_inicio,
      lng_inicio,
      lat_destino,
      lng_destino
    } = body;

    // Verificar que el pasajero pertenezca al usuario
    const pasajero = await db
      .prepare('SELECT id FROM pasajeros WHERE id = ? AND usuario_id = ?')
      .bind(pasajero_id, sessionUser.id)
      .first();

    if (!pasajero) {
      return new Response(
        JSON.stringify({ error: 'Pasajero no encontrado o no autorizado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const query = `
      INSERT INTO rutas_horarios (
        pasajero_id, dia_semana, hora_recogida, punto_inicio, punto_destino,
        lat_inicio, lng_inicio, lat_destino, lng_destino
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `;

    const result = await db
      .prepare(query)
      .bind(
        pasajero_id,
        dia_semana,
        hora_recogida,
        punto_inicio,
        punto_destino,
        lat_inicio ?? null,
        lng_inicio ?? null,
        lat_destino ?? null,
        lng_destino ?? null
      )
      .first();

    return new Response(JSON.stringify({ success: true, ruta: result }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Error al crear ruta', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
