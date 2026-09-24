export const prerender = false;
import type { APIRoute } from 'astro';
import { hashPassword, createSessionToken, createCookieHeader } from '../../../lib/auth';

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
    const { email, codigo, newPassword } = body;

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Correo electrónico requerido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!codigo || typeof codigo !== 'string' || codigo.trim().length !== 6) {
      return new Response(
        JSON.stringify({ error: 'Por favor ingresa el código de 6 dígitos que recibiste.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailNormalizado = email.trim().toLowerCase();
    const codigoLimpio = codigo.trim();

    // 1. Validar el código de recuperación
    const registroCodigo: any = await db
      .prepare(`
        SELECT id FROM codigos_verificacion
        WHERE email = ? 
          AND codigo = ? 
          AND tipo = 'recuperacion' 
          AND usado = 0 
          AND expira_en > CURRENT_TIMESTAMP
        ORDER BY id DESC
        LIMIT 1
      `)
      .bind(emailNormalizado, codigoLimpio)
      .first();

    if (!registroCodigo) {
      return new Response(
        JSON.stringify({ error: 'El código de recuperación es inválido o ha expirado. Solicita uno nuevo.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Hashear la nueva contraseña
    const { hash, salt } = await hashPassword(newPassword);

    // 3. Actualizar la contraseña del usuario y marcarlo como verificado
    await db
      .prepare(`
        UPDATE usuarios
        SET password_hash = ?, salt = ?, email_verificado = 1
        WHERE email = ?
      `)
      .bind(hash, salt, emailNormalizado)
      .run();

    // 4. Marcar código como usado
    await db
      .prepare('UPDATE codigos_verificacion SET usado = 1 WHERE id = ?')
      .bind(registroCodigo.id)
      .run();

    // 5. Obtener datos del usuario para inicio de sesión inmediato
    const usuario: any = await db
      .prepare('SELECT id, nombre, email FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

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
        message: '¡Contraseña restablecida correctamente! Has iniciado sesión.'
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
    console.error('Error en POST /api/auth/reset-password:', error);
    return new Response(
      JSON.stringify({ error: 'Error al restablecer la contraseña.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
