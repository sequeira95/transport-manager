export const prerender = false;
import type { APIRoute } from 'astro';
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
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Por favor ingresa un correo electrónico válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailNormalizado = email.trim().toLowerCase();

    // 1. Verificar si el usuario existe
    const usuario: any = await db
      .prepare('SELECT id, nombre, email FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

    // Por seguridad (anti-enumeración de usuarios), siempre retornamos éxito aunque no exista
    if (!usuario) {
      return new Response(
        JSON.stringify({
          success: true,
          email: emailNormalizado,
          message: 'Si el correo está registrado, recibirás un código de 6 dígitos para restablecer tu contraseña.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Generar código OTP criptográficamente seguro de 6 dígitos
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const codigo = (100000 + (randomArray[0] % 900000)).toString();

    // 3. Invalidar códigos previos de recuperación para este email
    await db
      .prepare(`UPDATE codigos_verificacion SET usado = 1 WHERE email = ? AND tipo = 'recuperacion'`)
      .bind(emailNormalizado)
      .run();

    // 4. Guardar código con expiración de 15 minutos
    await db
      .prepare(`
        INSERT INTO codigos_verificacion (email, codigo, tipo, expira_en)
        VALUES (?, ?, 'recuperacion', datetime('now', '+15 minutes'))
      `)
      .bind(emailNormalizado, codigo)
      .run();

    // 5. Enviar correo (Gmail Webhook, Resend o mock)
    await enviarCodigoEmail({
      email: emailNormalizado,
      nombre: usuario.nombre,
      codigo,
      tipo: 'recuperacion',
      gmailWebhookUrl: env?.GMAIL_WEBHOOK_URL,
      resendApiKey: env?.RESEND_API_KEY,
      emailFrom: env?.EMAIL_FROM
    });

    return new Response(
      JSON.stringify({
        success: true,
        email: emailNormalizado,
        message: 'Código de recuperación enviado. Revisa tu correo electrónico.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en POST /api/auth/forgot-password:', error);
    return new Response(
      JSON.stringify({ error: 'Error al solicitar recuperación de contraseña.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
