import type { Usuario } from '../types';

const SECRET_FALLBACK = 'transport-manager-secure-jwt-key-2026-d1';

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Genera un hash seguro con PBKDF2 + SHA-256 usando Web Crypto API nativa
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: bufferToHex(saltBytes)
  };
}

/**
 * Verifica una contraseña contra el hash y sal almacenados
 */
export async function verifyPassword(password: string, expectedHash: string, saltHex: string): Promise<boolean> {
  const saltBytes = hexToBuffer(saltHex);
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );

  const calculatedHash = bufferToHex(derivedBits);
  return calculatedHash === expectedHash;
}

async function getHmacKey(secret: string = SECRET_FALLBACK): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Crea un token de sesión firmado (JWT HMAC-SHA256) con validez de 30 días
 */
export async function createSessionToken(payload: { userId: number; email: string; nombre: string }): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 días
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${message}.${encodedSignature}`;
}

/**
 * Valida un token de sesión firmado y retorna el usuario si es válido
 */
export async function verifySessionToken(token: string): Promise<{ userId: number; email: string; nombre: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;

    const key = await getHmacKey();
    const encoder = new TextEncoder();
    const signatureBytes = Uint8Array.from(base64UrlDecode(encodedSignature), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(message));
    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expirado
    }

    return {
      userId: payload.userId,
      email: payload.email,
      nombre: payload.nombre
    };
  } catch {
    return null;
  }
}

/**
 * Extrae y valida el usuario actual desde cookies o encabezado Authorization: Bearer
 */
export async function getSessionUser(request: Request): Promise<{ id: number; email: string; nombre: string } | null> {
  // 1. Verificar encabezado Authorization: Bearer (móvil / Capacitor)
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const verified = await verifySessionToken(token);
    if (verified) return { id: verified.userId, email: verified.email, nombre: verified.nombre };
  }

  // 2. Verificar Cookie tm_session (Web)
  const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/tm_session=([^;]+)/);
    if (match && match[1]) {
      const verified = await verifySessionToken(match[1]);
      if (verified) return { id: verified.userId, email: verified.email, nombre: verified.nombre };
    }
  }

  return null;
}

/**
 * Encabezado Set-Cookie para establecer sesión (30 días)
 */
export function createCookieHeader(token: string): string {
  const maxAge = 30 * 24 * 60 * 60; // 30 días
  return `tm_session=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`;
}

/**
 * Encabezado Set-Cookie para borrar sesión
 */
export function createClearCookieHeader(): string {
  return `tm_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}
