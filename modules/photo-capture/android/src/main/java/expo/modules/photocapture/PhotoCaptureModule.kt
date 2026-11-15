package expo.modules.photocapture

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID

private const val REQUEST_CODE = 0x0D0C

private class CaptureException(message: String, cause: Throwable? = null) : CodedException("E_CAPTURE", message, cause)

// Take photo: the phone's camera app through the system image-capture intent, writing to a file in
// the app's cache shared through expo-file-system's FileProvider. Resolves with the file:// path, or
// null when cancelled. The photo is plaintext: the caller deletes it once cropped.
class PhotoCaptureModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var pending: Promise? = null
  private var output: File? = null

  override fun definition() = ModuleDefinition {
    Name("PhotoCapture")

    // Whether a camera app can take the photo.
    Function("isAvailable") {
      Intent(MediaStore.ACTION_IMAGE_CAPTURE).resolveActivity(context.packageManager) != null
    }

    AsyncFunction("takePhoto") { promise: Promise ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      // A second call while the camera is open: the first one ends as cancelled.
      cancelPending()
      val file = File(context.cacheDir, "capture-${UUID.randomUUID()}.jpg")
      val uri = FileProvider.getUriForFile(context, "${context.packageName}.FileSystemFileProvider", file)
      val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
        putExtra(MediaStore.EXTRA_OUTPUT, uri)
        // ClipData carries the write grant to the camera app on every Android version.
        clipData = ClipData.newRawUri("output", uri)
        addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      if (intent.resolveActivity(context.packageManager) == null) throw CaptureException("No camera app")
      pending = promise
      output = file
      try {
        activity.startActivityForResult(intent, REQUEST_CODE)
      } catch (e: Exception) {
        pending = null
        output = null
        file.delete()
        throw CaptureException("Could not open the camera", e)
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val file = output
      val promise = pending
      if (payload.resultCode == Activity.RESULT_OK && file != null && promise != null && file.length() > 0) {
        pending = null
        output = null
        promise.resolve(Uri.fromFile(file).toString())
      } else {
        cancelPending()
      }
    }
  }

  // Ends a pending call as cancelled, deleting any partial photo.
  private fun cancelPending() {
    output?.delete()
    output = null
    pending?.resolve(null)
    pending = null
  }
}
