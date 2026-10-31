package expo.modules.appupdate

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private class InstallException(message: String) : CodedException("E_INSTALL", message, null)

// Updates from inside the app, for copies installed from GitHub Releases. The TypeScript side
// (src/update/) finds, downloads and checks the APK; this only reports the installed version and
// hands the file to Android's installer, which asks the user before installing anything.
class AppUpdateModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AppUpdate")

    // The installed build's versionCode, to compare with the one in the release's version.json.
    Function("installedVersionCode") {
      val info = context.packageManager.getPackageInfo(context.packageName, 0)
      PackageInfoCompat.getLongVersionCode(info).toDouble()
    }

    // Whether the user has let Doc Keeper open the installer ("Install unknown apps").
    Function("canInstall") {
      context.packageManager.canRequestPackageInstalls()
    }

    // The system page where the user can allow that, for this app only.
    Function("openInstallPermission") {
      val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // `fileUri` is a file:// URI inside the app's cache, where expo-file-system's FileProvider can
    // share it with the installer.
    Function("install") { fileUri: String ->
      val path = Uri.parse(fileUri).path ?: throw InstallException("Not a file: $fileUri")
      val file = File(path)
      if (!file.exists()) throw InstallException("The update file is missing")
      val uri = FileProvider.getUriForFile(context, "${context.packageName}.FileSystemFileProvider", file)
      val intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(uri, "application/vnd.android.package-archive")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }
}
