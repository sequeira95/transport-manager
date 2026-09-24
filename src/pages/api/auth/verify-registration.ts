export const prerender = false;
import type { APIRoute } from 'astro';
import { createSessionToken, createCookieHeader } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any)?.runtime?.env;
    const db = env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { email, codigo } = body;

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Correo electrónico requerido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!codigo || typeof codigo !== 'string' || codigo.trim().length !== 6) {
      return new Response(
        JSON.stringify({ error: 'Por favor ingresa un código de 6 dígitos válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailNormalizado = email.trim().toLowerCase();
    const codigoLimpio = codigo.trim();

    // 1. Validar el código en la tabla codigos_verificacion
    const registroCodigo: any = await db
      .prepare(`
        SELECT id FROM codigos_verificacion
        WHERE email = ? 
          AND codigo = ? 
          AND tipo = 'registro' 
          AND usado = 0 
          AND expira_en > CURRENT_TIMESTAMP
        ORDER BY id DESC
        LIMIT 1
      `)
      .bind(emailNormalizado, codigoLimpio)
      .first();

    if (!registroCodigo) {
      return new Response(
        JSON.stringify({ error: 'El código es inválido o ha expirado. Solicita uno nuevo.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Marcar código como usado
    await db
      .prepare('UPDATE codigos_verificacion SET usado = 1 WHERE id = ?')
      .bind(registroCodigo.id)
      .run();

    // 3. Activar usuario como verificado
    await db
      .prepare('UPDATE usuarios SET email_verificado = 1 WHERE email = ?')
      .bind(emailNormalizado)
      .run();

    // 4. Obtener usuario
    const usuario: any = await db
      .prepare('SELECT id, nombre, email, creado_en FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

    if (!usuario) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Iniciar sesión automáticamente
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
        token,
        message: '¡Cuenta verificada con éxito! Bienvenido a Passengo.'
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
    console.error('Error en POST /api/auth/verify-registration:', error);
    return new Response(
      JSON.stringify({ error: 'Error al verificar la cuenta.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
