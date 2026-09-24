export const prerender = false;
import type { APIRoute } from 'astro';
import { hashPassword } from '../../../lib/auth';
import { enviarCodigoEmail } from '../../../lib/email';

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
    const { nombre, email, password } = body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'El nombre debe tener al menos 2 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Por favor ingresa un correo electrónico válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailNormalizado = email.trim().toLowerCase();

    // 1. Verificar si el usuario ya existe
    const usuarioExistente: any = await db
      .prepare('SELECT id, email_verificado FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

    const { hash, salt } = await hashPassword(password);

    if (usuarioExistente) {
      // Si la cuenta ya está verificada, no se puede duplicar
      if (usuarioExistente.email_verificado === 1) {
        return new Response(
          JSON.stringify({ error: 'Ya existe una cuenta verificada con este correo electrónico.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Si existía pero no estaba verificada, actualizamos datos y contraseña
        await db
          .prepare(`
            UPDATE usuarios
            SET nombre = ?, password_hash = ?, salt = ?
            WHERE id = ?
          `)
          .bind(nombre.trim(), hash, salt, usuarioExistente.id)
          .run();
      }
    } else {
      // 2. Crear nuevo usuario en D1 con email_verificado = 0
      await db
        .prepare(`
          INSERT INTO usuarios (nombre, email, password_hash, salt, email_verificado)
          VALUES (?, ?, ?, ?, 0)
        `)
        .bind(nombre.trim(), emailNormalizado, hash, salt)
        .run();
    }

    // 3. Generar código OTP criptográficamente seguro de 6 dígitos
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const codigo = (100000 + (randomArray[0] % 900000)).toString();

    // 4. Invalidar códigos previos de registro para este email
    await db
      .prepare(`UPDATE codigos_verificacion SET usado = 1 WHERE email = ? AND tipo = 'registro'`)
      .bind(emailNormalizado)
      .run();

    // 5. Guardar nuevo código con expiración de 15 minutos
    await db
      .prepare(`
        INSERT INTO codigos_verificacion (email, codigo, tipo, expira_en)
        VALUES (?, ?, 'registro', datetime('now', '+15 minutes'))
      `)
      .bind(emailNormalizado, codigo)
      .run();

    // 6. Enviar correo (Gmail Webhook, Resend o mock dev)
    await enviarCodigoEmail({
      email: emailNormalizado,
      nombre: nombre.trim(),
      codigo,
      tipo: 'registro',
      gmailWebhookUrl: env?.GMAIL_WEBHOOK_URL,
      resendApiKey: env?.RESEND_API_KEY,
      emailFrom: env?.EMAIL_FROM
    });

    return new Response(
      JSON.stringify({
        success: true,
        requiresVerification: true,
        email: emailNormalizado,
        message: 'Código de verificación enviado a tu correo.'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error en POST /api/auth/register:', error);
    return new Response(
      JSON.stringify({ error: 'Error al registrar la cuenta.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
