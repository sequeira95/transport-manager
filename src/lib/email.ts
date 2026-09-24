export interface SendEmailOptions {
  email: string;
  nombre?: string;
  codigo: string;
  tipo: 'registro' | 'recuperacion';
  gmailWebhookUrl?: string;
  resendApiKey?: string;
  emailFrom?: string;
}

export interface SendEmailResult {
  success: boolean;
  mocked?: boolean;
  provider?: 'gmail' | 'resend' | 'mock';
  messageId?: string;
  error?: string;
}

/**
 * Envía un correo con código OTP de 6 dígitos.
 * Prioridad 1: Webhook de Gmail (Google Apps Script) -> 100% gratis, sin dominio, directo a Inbox.
 * Prioridad 2: API de Resend.
 * Fallback: Simulación en consola para desarrollo.
 */
export async function enviarCodigoEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { email, nombre = 'Usuario', codigo, tipo, gmailWebhookUrl, resendApiKey, emailFrom } = options;

  const esRegistro = tipo === 'registro';
  const asunto = esRegistro
    ? `Passengo: Código de activación (${codigo})`
    : `Passengo: Código para restablecer contraseña (${codigo})`;

  const accionTexto = esRegistro
    ? 'completar tu registro y activar tu cuenta'
    : 'restablecer la contraseña de tu cuenta';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${asunto}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="520" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Barra superior de acento con el degradado de Passengo -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #059669 0%, #0d9488 50%, #2563eb 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Encabezado de Marca idéntico a la app -->
          <tr>
            <td style="background-color: #ffffff; padding: 34px 30px 22px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <!-- Logo oficial de Passengo de alta resolución -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center">
                    <img 
                      src="https://raw.githubusercontent.com/sequeira95/transport-manager/main/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png" 
                      alt="Passengo Logo" 
                      width="62" 
                      height="62" 
                      style="display: block; width: 62px; height: 62px; border-radius: 16px; border: 0; outline: none; text-decoration: none; box-shadow: 0 8px 18px rgba(13, 148, 136, 0.25);"
                    />
                  </td>
                </tr>
              </table>

              <!-- Título con ambos colores exactos de la app -->
              <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a;">
                Passen<span style="color: #059669;">go</span>
              </h1>
              <p style="margin: 5px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #64748b; font-size: 13px; font-weight: 500;">
                Gestión Inteligente de Pasajeros y Rutas
              </p>
            </td>
          </tr>

          <!-- Contenido del Mensaje -->
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #0f172a;">
                Hola, ${nombre}
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Has solicitado un código de verificación para <strong>${accionTexto}</strong>.
              </p>

              <!-- Tarjeta de Código OTP -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 22px;">
                    <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">Tu código de verificación</span>
                    <span style="display: inline-block; font-family: 'SF Mono', Consolas, 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #059669; padding-left: 8px;">
                      ${codigo}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Caja de validez / tiempo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #166534; line-height: 1.5;">
                    <strong>Tiempo límite:</strong> Este código es válido durante los próximos <strong>15 minutos</strong>.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                Si tú no realizaste esta solicitud, puedes ignorar este correo con total tranquilidad. Tu cuenta permanece protegida.
              </p>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © 2026 Passengo Transport Manager. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // 1. Envío a través de Webhook de Gmail (Google Apps Script)
  if (gmailWebhookUrl && gmailWebhookUrl.trim().startsWith('http')) {
    try {
      console.log(`[Email] Enviando mediante Gmail Webhook a: ${email}`);
      const res = await fetch(gmailWebhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          to: email,
          subject: asunto,
          html,
          fromName: 'Passengo'
        })
      });

      console.log(`[Email] Respuesta recibida de Gmail Webhook (status ${res.status})`);
      return {
        success: true,
        provider: 'gmail'
      };
    } catch (err: any) {
      console.error('Error al enviar correo por Gmail Webhook:', err);
      // Si falla Gmail, intentamos seguir al siguiente proveedor si existe
    }
  }

  // 2. Envío a través de Resend API
  if (resendApiKey && resendApiKey.trim() !== '') {
    console.log(`[Email] Enviando mediante Resend API a: ${email}`);
    try {
      const remitente = emailFrom || 'Passengo <onboarding@resend.dev>';

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: remitente,
          to: [email],
          subject: asunto,
          html
        })
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        console.error('Error al enviar correo con Resend:', data);
        return {
          success: false,
          provider: 'resend',
          error: data?.message || `Error del proveedor de correo (HTTP ${res.status})`
        };
      }

      return {
        success: true,
        provider: 'resend',
        messageId: data?.id
      };
    } catch (err: any) {
      console.error('Error de red al conectar con Resend:', err);
      return {
        success: false,
        provider: 'resend',
        error: err?.message || 'Error de conexión con el servicio de correo'
      };
    }
  }

  // 3. Modo Desarrollo / Simulación cuando no hay ningún servicio configurado
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║ [PASSENGO EMAIL - MODO PRUEBA LOCAL / DEV]                        ║
║ Tipo:   ${tipo.toUpperCase()}                                    
║ Para:   ${email} (${nombre})                                     
║ CÓDIGO: >>> ${codigo} <<<                                        
║ Válido: Durante 15 minutos                                        
╚═══════════════════════════════════════════════════════════════════╝
  `);
  return { success: true, mocked: true, provider: 'mock' };
}
