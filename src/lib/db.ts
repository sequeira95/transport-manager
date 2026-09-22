import type { APIContext } from 'astro';

/**
 * Obtiene el binding D1 `DB` desde el contexto de Astro en Cloudflare Pages / Workers
 */
export function getDB(context: APIContext | { locals?: any }) {
  const env = (context as any).locals?.runtime?.env || (context as any).env;
  if (!env || !env.DB) {
    // Si estamos en entorno de preview o dev sin proxy configurado adecuadamente
    console.warn('[DB] No se encontró el binding "DB" en locals.runtime.env.');
    throw new Error('D1 Database binding "DB" not found in Cloudflare runtime.');
  }
  return env.DB as import('@cloudflare/workers-types').D1Database;
}
