package dev.airbuild.reactnative

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * AirBuild native module for Android.
 *
 * Handles APK download and install via the system package installer.
 * The JS layer calls downloadAndInstallApk(downloadUrl) which:
 *   1. Downloads the APK to the app's cache directory
 *   2. Creates an Intent with ACTION_VIEW and the package-archive MIME type
 *   3. Launches the system installer activity
 *
 * For Android 7+ (API 24+), a FileProvider URI is used instead of a file:// URI
 * to comply with the strict file URI exposure restrictions.
 */
@ReactModule(name = AirBuildModule.NAME)
class AirBuildModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "AirBuild"
        private const val APK_FILENAME = "airbuild_update.apk"
    }

    override fun getName(): String {
        return NAME
    }

    /**
     * Downloads an APK from the given URL and triggers the system installer.
     *
     * @param downloadUrl The URL of the APK file to download.
     * @param promise Resolves when the install Intent is launched,
     *                rejects on download or install failure.
     */
    @ReactMethod
    fun downloadAndInstallApk(downloadUrl: String, promise: Promise) {
        Thread {
            try {
                val apkFile = downloadApk(downloadUrl)
                triggerInstall(apkFile)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("AIRBUILD_INSTALL_ERROR", e.message, e)
            }
        }.start()
    }

    /**
     * Opens a URL in the system browser.
     * Provided for interface parity with iOS; the JS layer typically uses
     * Linking.openURL directly, but this is available as a fallback.
     *
     * @param url The URL to open.
     * @param promise Resolves when the URL is opened, rejects on failure.
     */
    @ReactMethod
    fun openUrl(url: String, promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("AIRBUILD_OPEN_URL_ERROR", e.message, e)
        }
    }

    /**
     * Downloads the APK from the given URL to the app's cache directory.
     *
     * @param downloadUrl The URL of the APK file.
     * @return The downloaded File pointing to the cached APK.
     * @throws Exception if the download fails.
     */
    private fun downloadApk(downloadUrl: String): File {
        val context: Context = reactContext
        val cacheDir = context.cacheDir
        val apkFile = File(cacheDir, APK_FILENAME)

        // Delete any previously downloaded APK
        if (apkFile.exists()) {
            apkFile.delete()
        }

        val connection = URL(downloadUrl).openConnection() as HttpURLConnection
        connection.connectTimeout = 30000
        connection.readTimeout = 60000
        connection.instanceFollowRedirects = true

        try {
            val responseCode = connection.responseCode
            if (responseCode < 200 || responseCode >= 300) {
                throw Exception("Download failed with HTTP $responseCode")
            }

            val inputStream = connection.inputStream
            val outputStream = FileOutputStream(apkFile)

            try {
                val buffer = ByteArray(8192)
                var bytesRead: Int
                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                }
                outputStream.flush()
            } finally {
                inputStream.close()
                outputStream.close()
            }
        } finally {
            connection.disconnect()
        }

        return apkFile
    }

    /**
     * Triggers the system package installer for the downloaded APK.
     *
     * For Android 7+ (API 24+), uses FileProvider to obtain a content:// URI
     * since file:// URIs are no longer allowed for cross-app sharing.
     * For older versions, uses Uri.fromFile() directly.
     *
     * @param apkFile The downloaded APK file to install.
     */
    private fun triggerInstall(apkFile: File) {
        val context: Context = reactContext

        val uri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            // Use FileProvider for Android 7+ (API 24+)
            val authority = context.packageName + ".airbuild.fileprovider"
            FileProvider.getUriForFile(context, authority, apkFile)
        } else {
            // Use file:// URI for older Android versions
            Uri.fromFile(apkFile)
        }

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        context.startActivity(intent)
    }
}
