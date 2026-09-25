import { ref } from 'vue';
import { registerPlugin } from '@capacitor/core';
import { isNativePlatform } from './platform';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  publishedAt: string;
}

export interface AppUpdaterPluginInterface {
  canRequestPackageInstalls(): Promise<{ canInstall: boolean }>;
  openInstallPermissionSettings(): Promise<{ opened: boolean }>;
  downloadAndInstall(options: { url: string }): Promise<{ success: boolean; message?: string }>;
  cleanCache(): Promise<{ success: boolean }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (progress: { percent: number; bytes: number; total: number; status: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

import { APP_VERSION } from './version';

export const NativeAppUpdater = registerPlugin<AppUpdaterPluginInterface>('AppUpdaterPlugin');

export const CURRENT_VERSION = APP_VERSION;
const REPO_RELEASES_URL = 'https://api.github.com/repos/sequeira95/transport-manager/releases/latest';
export const DIRECT_APK_DOWNLOAD_URL = 'https://github.com/sequeira95/transport-manager/releases/latest/download/Passengo.apk';

export const updateInfo = ref<AppUpdateInfo | null>(null);
export const isCheckingUpdate = ref(false);

// Estado de la descarga in-app
export const isUpdateModalOpen = ref(false);
export const downloadProgress = ref(0);
export const downloadStatus = ref<'idle' | 'checking_permission' | 'permission_denied' | 'downloading' | 'installing' | 'error' | 'success'>('idle');
export const downloadErrorMsg = ref('');
export const downloadedBytes = ref(0);
export const totalBytes = ref(0);

let progressListenerHandle: { remove: () => Promise<void> } | null = null;

export function openUpdateModal() {
  isUpdateModalOpen.value = true;
}

export function closeUpdateModal() {
  if (downloadStatus.value === 'downloading') {
    // Evitar cerrar accidentalmente mientras se descarga el binario
    return;
  }
  isUpdateModalOpen.value = false;
}

/**
 * Consulta a GitHub Releases para verificar si existe un nuevo APK
 */
export async function checkForAppUpdates(): Promise<AppUpdateInfo | null> {
  if (typeof window === 'undefined') return null;

  // En la versión web (navegadores de PC o móviles) la web siempre está al día; no se actualiza APK
  if (!isNativePlatform()) {
    updateInfo.value = null;
    return null;
  }

  isCheckingUpdate.value = true;
  try {
    const res = await fetch(REPO_RELEASES_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      isCheckingUpdate.value = false;
      return null;
    }

    const data = (await res.json()) as any;
    const tagName = data.tag_name || '';
    const releaseBody = data.body || '';
    const publishedAt = data.published_at || '';

    // Buscar el activo .apk en los assets
    let apkDownloadUrl = DIRECT_APK_DOWNLOAD_URL;
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: any) => a.name?.endsWith('.apk'));
      if (apkAsset && apkAsset.browser_download_url) {
        apkDownloadUrl = apkAsset.browser_download_url;
      }
    }

    // Comprobar si la versión remota difiere de la actual (ignorando prefijo 'v')
    const norm = (v: string) => v.trim().replace(/^v/, '');
    const isNewer = Boolean(
      tagName &&
      norm(tagName) !== norm(CURRENT_VERSION) &&
      tagName.toLowerCase() !== 'latest'
    );

    updateInfo.value = {
      hasUpdate: Boolean(isNewer),
      currentVersion: CURRENT_VERSION,
      latestVersion: tagName || CURRENT_VERSION,
      downloadUrl: apkDownloadUrl,
      releaseNotes: releaseBody,
      publishedAt
    };

    return updateInfo.value;
  } catch (err) {
    console.warn('No se pudo verificar actualización en GitHub Releases:', err);
    return null;
  } finally {
    isCheckingUpdate.value = false;
  }
}

/**
 * Inicia el proceso de actualización In-App:
 * En Android nativo: descarga directamente a caché privada y abre el instalador del sistema.
 * En Web / PC: abre el enlace directo de descarga.
 */
export async function startInAppUpdate() {
  const url = updateInfo.value?.downloadUrl || DIRECT_APK_DOWNLOAD_URL;

  if (!isNativePlatform()) {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
    return;
  }

  downloadStatus.value = 'checking_permission';
  downloadProgress.value = 0;
  downloadedBytes.value = 0;
  totalBytes.value = 0;
  downloadErrorMsg.value = '';

  try {
    // 1. Verificar permisos de instalación de paquetes desconocidos
    const check = await NativeAppUpdater.canRequestPackageInstalls();
    if (!check.canInstall) {
      downloadStatus.value = 'permission_denied';
      return;
    }

    // 2. Suscribirse al evento de progreso
    if (progressListenerHandle) {
      try {
        await progressListenerHandle.remove();
      } catch (_) {}
    }

    progressListenerHandle = await NativeAppUpdater.addListener('downloadProgress', (data) => {
      downloadProgress.value = data.percent || 0;
      downloadedBytes.value = data.bytes || 0;
      totalBytes.value = data.total || 0;
      if (data.percent >= 100) {
        downloadStatus.value = 'installing';
      }
    });

    // 3. Ejecutar descarga e instalación nativa
    downloadStatus.value = 'downloading';
    const res = await NativeAppUpdater.downloadAndInstall({ url });
    if (res.success) {
      downloadStatus.value = 'installing';
    }
  } catch (err: any) {
    console.error('Error durante actualización in-app:', err);
    downloadStatus.value = 'error';
    downloadErrorMsg.value = err?.message || 'Error desconocido al actualizar';
  }
}

/**
 * Abre los ajustes de Android para permitir instalar aplicaciones desconocidas
 */
export async function openPermissionSettings() {
  try {
    await NativeAppUpdater.openInstallPermissionSettings();
  } catch (err) {
    console.error('No se pudo abrir ajustes:', err);
  }
}

/**
 * Limpia el APK temporal en la caché de la app
 */
export async function cleanUpdateCache() {
  if (isNativePlatform()) {
    try {
      await NativeAppUpdater.cleanCache();
    } catch (_) {}
  }
}
