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
    const { email, tipo } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Correo electrónico válido requerido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (tipo !== 'registro' && tipo !== 'recuperacion') {
      return new Response(
        JSON.stringify({ error: 'Tipo de verificación inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailNormalizado = email.trim().toLowerCase();

    // 1. Rate-limiting: verificar que no haya pedido un código en los últimos 60 segundos
    const ultimoCodigo: any = await db
      .prepare(`
        SELECT id, creado_en FROM codigos_verificacion
        WHERE email = ? AND tipo = ?
        ORDER BY id DESC
        LIMIT 1
      `)
      .bind(emailNormalizado, tipo)
      .first();

    if (ultimoCodigo && ultimoCodigo.creado_en) {
      const tiempoUltimo = new Date(ultimoCodigo.creado_en + (ultimoCodigo.creado_en.endsWith('Z') ? '' : 'Z')).getTime();
      const ahora = Date.now();
      const segundosDiferencia = Math.floor((ahora - tiempoUltimo) / 1000);

      if (segundosDiferencia < 60) {
        const segundosEspera = 60 - segundosDiferencia;
        return new Response(
          JSON.stringify({
            error: `Por favor espera ${segundosEspera} segundos antes de solicitar otro código.`,
            retryAfter: segundosEspera
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Obtener nombre si el usuario existe
    const usuario: any = await db
      .prepare('SELECT nombre FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

    const nombre = usuario?.nombre || 'Usuario';

    // 3. Generar nuevo código de 6 dígitos
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const codigo = (100000 + (randomArray[0] % 900000)).toString();

    // 4. Invalidar códigos previos del mismo tipo
    await db
      .prepare(`UPDATE codigos_verificacion SET usado = 1 WHERE email = ? AND tipo = ?`)
      .bind(emailNormalizado, tipo)
      .run();

    // 5. Guardar nuevo código
    await db
      .prepare(`
        INSERT INTO codigos_verificacion (email, codigo, tipo, expira_en)
        VALUES (?, ?, ?, datetime('now', '+15 minutes'))
      `)
      .bind(emailNormalizado, codigo, tipo)
      .run();

    // 6. Enviar email (Gmail Webhook, Resend o mock)
    await enviarCodigoEmail({
      email: emailNormalizado,
      nombre,
      codigo,
      tipo,
      gmailWebhookUrl: env?.GMAIL_WEBHOOK_URL,
      resendApiKey: env?.RESEND_API_KEY,
      emailFrom: env?.EMAIL_FROM
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Código reenviado correctamente. Revisa tu correo.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en POST /api/auth/resend-code:', error);
    return new Response(
      JSON.stringify({ error: 'Error al reenviar el código.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
