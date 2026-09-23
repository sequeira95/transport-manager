import { Capacitor } from '@capacitor/core';

/**
 * Detecta si la aplicación se está ejecutando dentro del contenedor nativo de Capacitor (APK Android / iOS).
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Detecta si el usuario está accediendo a la web desde el navegador de un teléfono móvil.
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNativePlatform()) return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  return /android|iphone|ipad|ipod|mobile|phone|silk|blackberry/i.test(ua);
}

/**
 * Detecta si el usuario está accediendo desde un navegador de computadora de escritorio / laptop.
 */
export function isDesktopBrowser(): boolean {
  if (typeof window === 'undefined') return true;
  return !isNativePlatform() && !isMobileBrowser();
}
