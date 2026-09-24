package com.transportmanager.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdaterPlugin")
public class AppUpdaterPlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final String APK_FILE_NAME = "update_passengo.apk";

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        Context context = getContext();
        boolean canInstall = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canInstall = context.getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("canInstall", canInstall);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
        JSObject ret = new JSObject();
        ret.put("opened", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void cleanCache(PluginCall call) {
        try {
            File apkFile = new File(getContext().getCacheDir(), APK_FILE_NAME);
            if (apkFile.exists()) {
                apkFile.delete();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error al limpiar caché: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.trim().isEmpty()) {
            call.reject("URL de descarga no proporcionada.");
            return;
        }

        executor.execute(() -> {
            InputStream input = null;
            OutputStream output = null;
            HttpURLConnection connection = null;

            try {
                Context context = getContext();
                File cacheDir = context.getCacheDir();
                File apkFile = new File(cacheDir, APK_FILE_NAME);

                if (apkFile.exists()) {
                    apkFile.delete();
                }

                // Seguir redirecciones HTTP (ej. releases de GitHub redirigen a CDN / S3)
                String currentUrl = downloadUrl;
                int redirects = 0;
                while (redirects < 7) {
                    URL u = new URL(currentUrl);
                    connection = (HttpURLConnection) u.openConnection();
                    connection.setInstanceFollowRedirects(true);
                    connection.setRequestProperty("User-Agent", "Passengo-App-Updater");
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.connect();

                    int responseCode = connection.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == 307 || responseCode == 308) {
                        String newUrl = connection.getHeaderField("Location");
                        if (newUrl != null && !newUrl.isEmpty()) {
                            currentUrl = newUrl;
                            redirects++;
                            connection.disconnect();
                            continue;
                        }
                    }
                    break;
                }

                if (connection == null || connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    int code = connection != null ? connection.getResponseCode() : -1;
                    call.reject("Error del servidor al descargar actualización (HTTP " + code + ")");
                    return;
                }

                long fileLength = connection.getContentLengthLong();
                input = new BufferedInputStream(connection.getInputStream(), 8192);
                output = new FileOutputStream(apkFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastProgressTime = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastProgressTime > 150) {
                        lastProgressTime = now;
                        int percent = fileLength > 0 ? (int) ((total * 100) / fileLength) : 0;
                        JSObject progress = new JSObject();
                        progress.put("percent", percent);
                        progress.put("bytes", total);
                        progress.put("total", fileLength);
                        progress.put("status", "downloading");
                        notifyListeners("downloadProgress", progress);
                    }
                }

                output.flush();
                output.close();
                output = null;

                input.close();
                input = null;

                // Notificar 100% completado
                JSObject completed = new JSObject();
                completed.put("percent", 100);
                completed.put("bytes", total);
                completed.put("total", total);
                completed.put("status", "completed");
                notifyListeners("downloadProgress", completed);

                // Iniciar instalación nativa mediante FileProvider
                Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                List<ResolveInfo> resInfoList = context.getPackageManager().queryIntentActivities(installIntent, PackageManager.MATCH_DEFAULT_ONLY);
                for (ResolveInfo resolveInfo : resInfoList) {
                    context.grantUriPermission(resolveInfo.activityInfo.packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }

                context.startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Instalador iniciado");
                call.resolve(ret);

            } catch (Exception e) {
                if (apkFileExists()) {
                    try {
                        new File(getContext().getCacheDir(), APK_FILE_NAME).delete();
                    } catch (Exception ignored) {}
                }
                call.reject("Error durante la descarga o instalación: " + e.getMessage());
            } finally {
                try {
                    if (output != null) output.close();
                } catch (Exception ignored) {}
                try {
                    if (input != null) input.close();
                } catch (Exception ignored) {}
                try {
                    if (connection != null) connection.disconnect();
                } catch (Exception ignored) {}
            }
        });
    }

    private boolean apkFileExists() {
        try {
            File f = new File(getContext().getCacheDir(), APK_FILE_NAME);
            return f.exists();
        } catch (Exception e) {
            return false;
        }
    }
}
