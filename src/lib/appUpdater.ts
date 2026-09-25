import { ref } from 'vue';
import { registerPlugin } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { isNativePlatform } from './platform';
import { APP_VERSION } from './version';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  otaDownloadUrl?: string;
  isOtaAvailable: boolean;
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

// Notificar a Capgo al iniciar la app para confirmar que el bundle actual funciona correctamente
if (typeof window !== 'undefined' && isNativePlatform()) {
  try {
    CapacitorUpdater.notifyAppReady().catch(() => {});
  } catch (_) {}
}

export function openUpdateModal() {
  isUpdateModalOpen.value = true;
}

export function closeUpdateModal() {
  if (downloadStatus.value === 'downloading' || downloadStatus.value === 'installing') {
    // Evitar cerrar accidentalmente mientras se procesa la actualización
    return;
  }
  isUpdateModalOpen.value = false;
}

/**
 * Consulta a GitHub Releases para verificar si existe una nueva versión
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

    // Buscar tanto el paquete OTA (dist.zip) como el APK tradicional
    let apkDownloadUrl = DIRECT_APK_DOWNLOAD_URL;
    let otaDownloadUrl = '';

    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: any) => a.name?.endsWith('.apk'));
      if (apkAsset && apkAsset.browser_download_url) {
        apkDownloadUrl = apkAsset.browser_download_url;
      }
      const otaAsset = data.assets.find((a: any) => a.name === 'dist.zip' || a.name?.endsWith('.zip'));
      if (otaAsset && otaAsset.browser_download_url) {
        otaDownloadUrl = otaAsset.browser_download_url;
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
      otaDownloadUrl: otaDownloadUrl || undefined,
      isOtaAvailable: Boolean(otaDownloadUrl),
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
 * Descarga y prepara una actualización OTA de forma 100% silenciosa en segundo plano.
 * El nuevo bundle se activará automáticamente la próxima vez que se abra la app,
 * sin interrumpir al usuario ni mostrar ningún cartel.
 */
export async function performSilentOtaUpdate(otaUrl: string, latestVersion: string) {
  if (!isNativePlatform() || !otaUrl) return;
  try {
    const targetVersion = latestVersion.replace(/^v/, '');
    const versionBundle = await CapacitorUpdater.download({
      url: otaUrl,
      version: targetVersion
    });
    // Deja el paquete activado para el próximo arranque/cold start
    await CapacitorUpdater.set(versionBundle);
    console.log(`[OTA Silencioso] Versión ${latestVersion} descargada y lista para el próximo inicio.`);
  } catch (err) {
    console.warn('[OTA Silencioso] No se pudo descargar en segundo plano:', err);
  }
}

/**
 * Inicia el proceso de actualización In-App:
 * 1. Prioridad: Actualización Instantánea OTA (Capgo) si dist.zip está disponible.
 * 2. Fallback: Descarga e instalación de APK nativo de Android.
 */
export async function startInAppUpdate() {
  const otaUrl = updateInfo.value?.otaDownloadUrl;
  const apkUrl = updateInfo.value?.downloadUrl || DIRECT_APK_DOWNLOAD_URL;

  if (!isNativePlatform()) {
    if (typeof window !== 'undefined') {
      window.open(apkUrl, '_blank');
    }
    return;
  }

  downloadStatus.value = 'downloading';
  downloadProgress.value = 0;
  downloadedBytes.value = 0;
  totalBytes.value = 0;
  downloadErrorMsg.value = '';

  // 1. PRIORIDAD: ACTUALIZACIÓN INSTANTÁNEA OTA (dist.zip)
  if (otaUrl && updateInfo.value?.isOtaAvailable) {
    let removeListener: (() => void) | null = null;
    try {
      const handle = await CapacitorUpdater.addListener('download', (info: any) => {
        if (typeof info?.percent === 'number') {
          downloadProgress.value = Math.min(100, Math.round(info.percent));
        }
      });
      removeListener = () => { handle.remove(); };
    } catch (_) {}

    try {
      const targetVersion = (updateInfo.value?.latestVersion || CURRENT_VERSION).replace(/^v/, '');
      const versionBundle = await CapacitorUpdater.download({
        url: otaUrl,
        version: targetVersion
      });

      downloadProgress.value = 100;
      downloadStatus.value = 'installing';

      await CapacitorUpdater.set(versionBundle);
      downloadStatus.value = 'success';

      // Recargar la aplicación para aplicar inmediatamente los cambios sin salir
      setTimeout(async () => {
        try {
          await CapacitorUpdater.reload();
        } catch (_) {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
      }, 1000);
      return;
    } catch (otaErr: any) {
      console.warn('Actualización OTA falló, recurriendo al instalador APK:', otaErr);
      // Fallback automático al instalador de APK si OTA falla
    } finally {
      if (removeListener) removeListener();
    }
  }

  // 2. FALLBACK: ACTUALIZACIÓN NATIVA MEDIANTE INSTALACIÓN DE APK
  try {
    const check = await NativeAppUpdater.canRequestPackageInstalls();
    if (!check.canInstall) {
      downloadStatus.value = 'permission_denied';
      return;
    }

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

    downloadStatus.value = 'downloading';
    const res = await NativeAppUpdater.downloadAndInstall({ url: apkUrl });
    if (res.success) {
      downloadStatus.value = 'installing';
    }
  } catch (err: any) {
    console.error('Error durante actualización in-app de APK:', err);
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
