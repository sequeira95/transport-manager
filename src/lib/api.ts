import { isNativePlatform } from './platform';

/**
 * URL base oficial de producción en Cloudflare Pages
 */
export const PRODUCTION_API_URL = 'https://passengo.pages.dev';

/**
 * Retorna la URL completa o relativa correspondiente según el entorno de ejecución.
 * En la app móvil nativa (Capacitor Android) redirige hacia Cloudflare Pages.
 * En el navegador web usa la ruta relativa del mismo host.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window !== 'undefined') {
    const isCapacitor = isNativePlatform() || 
                        window.location.protocol === 'capacitor:' || 
                        window.location.protocol === 'file:' ||
                        (window.location.hostname === 'localhost' && !window.location.port);

    if (isCapacitor) {
      return `${PRODUCTION_API_URL}${cleanPath}`;
    }
  }

  return cleanPath;
}

/**
 * Envoltorio inteligente de fetch que:
 * 1. Resuelve la URL adecuada (remota en móvil, relativa en web).
 * 2. Inyecta el token Bearer desde localStorage en entornos móviles.
 * 3. Habilita el intercambio de credenciales/cookies.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const targetUrl = getApiUrl(path);
  const headers = new Headers(options.headers || {});

  // En Capacitor/móvil, inyectar el token de autorización JWT si existe
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('tm_auth_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(targetUrl, {
    ...options,
    headers,
    credentials: 'include'
  });
}
