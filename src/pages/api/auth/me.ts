export const prerender = false;
import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return new Response(
        JSON.stringify({ authenticated: false, user: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = (locals as any)?.runtime?.env?.DB;
    if (db) {
      const usuario: any = await db
        .prepare('SELECT id, nombre, email, creado_en FROM usuarios WHERE id = ?')
        .bind(sessionUser.id)
        .first();

      if (usuario) {
        return new Response(
          JSON.stringify({ authenticated: true, user: usuario }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ authenticated: true, user: sessionUser }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en GET /api/auth/me:', error);
    return new Response(
      JSON.stringify({ authenticated: false, user: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
