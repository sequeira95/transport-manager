import { defineMiddleware } from 'astro:middleware';

/**
 * Middleware para soporte integral de CORS en Cloudflare Pages.
 * Permite que la App Móvil (Capacitor Android) realice peticiones cross-origin
 * y responde exitosamente a las solicitudes preflight (OPTIONS).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  if (url.pathname.startsWith('/api/')) {
    const origin = request.headers.get('Origin') || '*';
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': origin === 'null' ? '*' : origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };

    // Responder 204 OK a todas las verificaciones preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const response = await next();
    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v);
    }
    return response;
  }

  return next();
});
