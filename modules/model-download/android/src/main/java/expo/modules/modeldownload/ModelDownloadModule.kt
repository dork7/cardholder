package expo.modules.modeldownload

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private class DownloadException(message: String) : CodedException("E_MODEL_DOWNLOAD", message, null)

// AI model downloads (hundreds of MB), handed to Android's own download manager: it carries on with
// the app closed or the phone locked, waits out a dropped connection and resumes, and shows its
// progress as a notification. The TypeScript side (src/analysis/backgroundDownload.ts) starts one only
// when the user asks, follows it, and checks the file before using it.
//
// The download manager can only write to shared or app-external storage, so the file lands in the
// app's external files folder and is moved into the app's private storage once it is whole.
class ModelDownloadModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val manager
    get() = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

  // File name -> the download manager's id, so a download is found again after the app restarts.
  private val ids
    get() = context.getSharedPreferences("model-downloads", Context.MODE_PRIVATE)

  private val folder = "model-downloads"

  private fun checked(fileName: String): String {
    if (fileName.isEmpty() || fileName.contains('/') || fileName.contains("..")) throw DownloadException("Not a file name: $fileName")
    return fileName
  }

  private fun idOf(fileName: String): Long? = ids.getLong(fileName, -1L).takeIf { it >= 0 }

  private class Row(val status: Int, val bytes: Long, val total: Long, val reason: Int, val localUri: String?)

  private fun row(id: Long): Row? =
    manager.query(DownloadManager.Query().setFilterById(id))?.use { c ->
      if (!c.moveToFirst()) return null
      Row(
        c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)),
        c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)),
        c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)),
        c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)),
        c.getString(c.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI)),
      )
    }

  // Removing a download also deletes what it had written.
  private fun forget(fileName: String) {
    idOf(fileName)?.let { manager.remove(it) }
    ids.edit().remove(fileName).apply()
  }

  override fun definition() = ModuleDefinition {
    Name("ModelDownload")

    // Starts the download, unless one for this file is already under way or finished.
    Function("start") { url: String, fileName: String, title: String ->
      val name = checked(fileName)
      val existing = idOf(name)?.let { row(it) }
      if (existing != null && existing.status != DownloadManager.STATUS_FAILED) return@Function
      forget(name)
      val dir = context.getExternalFilesDir(null) ?: throw DownloadException("This phone's storage is not available")
      // A leftover from an earlier try would make the download manager pick another name.
      File(File(dir, folder), name).delete()
      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle(title)
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
        .setDestinationInExternalFilesDir(context, null, "$folder/$name")
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)
      ids.edit().putLong(name, manager.enqueue(request)).apply()
    }

    // state: "none" (never started, or removed), "running" (also while waiting for a connection),
    // "done" or "failed" (reason is the download manager's error code; 1006 is no space).
    Function("status") { fileName: String ->
      val r = idOf(checked(fileName))?.let { row(it) }
      val state = when (r?.status) {
        null -> "none"
        DownloadManager.STATUS_SUCCESSFUL -> "done"
        DownloadManager.STATUS_FAILED -> "failed"
        else -> "running"
      }
      mapOf(
        "state" to state,
        "bytes" to (r?.bytes ?: 0L).toDouble(),
        "total" to (r?.total ?: -1L).toDouble(),
        "reason" to (r?.reason ?: 0),
      )
    }

    Function("cancel") { fileName: String ->
      forget(checked(fileName))
    }

    // Moves a finished download to `destUri` (a file:// URI in the app's private storage), then
    // forgets it. The two are on different volumes, so it is a copy.
    AsyncFunction("moveTo") { fileName: String, destUri: String ->
      val name = checked(fileName)
      val r = idOf(name)?.let { row(it) }
      if (r == null || r.status != DownloadManager.STATUS_SUCCESSFUL) throw DownloadException("The download is not finished")
      val from = r.localUri?.let { Uri.parse(it).path }?.let { File(it) } ?: throw DownloadException("The downloaded file is missing")
      val to = File(Uri.parse(destUri).path ?: throw DownloadException("Not a file: $destUri"))
      to.parentFile?.mkdirs()
      try {
        from.inputStream().use { input -> to.outputStream().use { output -> input.copyTo(output, 1 shl 20) } }
      } catch (e: Exception) {
        to.delete()
        throw DownloadException("Moving the download failed: ${e.message}")
      }
      forget(name)
    }
  }
}
