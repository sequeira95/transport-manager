export const prerender = false;
import type { APIRoute } from 'astro';
import { createClearCookieHeader } from '../../../lib/auth';

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({ success: true, message: 'Sesión cerrada correctamente.' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createClearCookieHeader()
      }
    }
  );
};
