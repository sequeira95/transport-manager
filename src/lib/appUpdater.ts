import { ref } from 'vue';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  publishedAt: string;
}

const CURRENT_VERSION = 'v1.0.0';
const REPO_RELEASES_URL = 'https://api.github.com/repos/sequeira95/transport-manager/releases/latest';
export const DIRECT_APK_DOWNLOAD_URL = 'https://github.com/sequeira95/transport-manager/releases/latest/download/Passengo.apk';

export const updateInfo = ref<AppUpdateInfo | null>(null);
export const isCheckingUpdate = ref(false);

/**
 * Consulta a GitHub Releases para verificar si existe un nuevo APK
 */
export async function checkForAppUpdates(): Promise<AppUpdateInfo | null> {
  if (typeof window === 'undefined') return null;

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

    const data = await res.json();
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

    // Comprobar si la versión remota difiere de la actual
    const isNewer = tagName && tagName !== CURRENT_VERSION && tagName !== 'latest';

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
