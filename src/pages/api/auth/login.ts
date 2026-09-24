export const prerender = false;
import type { APIRoute } from 'astro';
import { verifyPassword, createSessionToken, createCookieHeader } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = (locals as any)?.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Debes ingresar correo y contraseña.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailNormalizado = email.trim().toLowerCase();

    // 1. Buscar usuario
    const usuario: any = await db
      .prepare('SELECT id, nombre, email, password_hash, salt, email_verificado FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

    if (!usuario) {
      return new Response(
        JSON.stringify({ error: 'Correo o contraseña incorrectos.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar contraseña
    const esValida = await verifyPassword(password, usuario.password_hash, usuario.salt);
    if (!esValida) {
      return new Response(
        JSON.stringify({ error: 'Correo o contraseña incorrectos.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2.1 Verificar si la cuenta requiere verificación por correo
    if (usuario.email_verificado === 0) {
      return new Response(
        JSON.stringify({
          error: 'Por favor confirma tu cuenta con el código de 6 dígitos enviado a tu correo.',
          requiresVerification: true,
          email: usuario.email
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Crear sesión
    const token = await createSessionToken({
      userId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre
    });

    const cookieHeader = createCookieHeader(token);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email
        },
        token
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader
        }
      }
    );
  } catch (error: any) {
    console.error('Error en POST /api/auth/login:', error);
    return new Response(
      JSON.stringify({ error: 'Error al iniciar sesión.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
