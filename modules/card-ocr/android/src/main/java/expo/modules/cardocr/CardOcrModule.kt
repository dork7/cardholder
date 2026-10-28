package expo.modules.cardocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.FileInputStream
import java.io.InputStream
import kotlin.math.max

private class DetectException(message: String) : CodedException("E_IMAGE", message, null)

// Finds the card's edges for the crop to start from. Text reading (`recognize`) is iOS only for now,
// so this module has just the edge finding; the TypeScript side checks for each function.
class CardOcrModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CardOcr")

    // Like the iOS version: the bounding box of the most likely card-shaped rectangle, upright and
    // normalised with the origin top left, or null.
    AsyncFunction("detectCard") { uri: String ->
      val bitmap = loadUpright(uri) ?: throw DetectException("Could not read the image")
      try {
        val w = bitmap.width
        val h = bitmap.height
        val pixels = IntArray(w * h)
        bitmap.getPixels(pixels, 0, w, 0, 0, w, h)
        val channels = listOf(
          IntArray(pixels.size) { Color.red(pixels[it]) },
          IntArray(pixels.size) { Color.green(pixels[it]) },
          IntArray(pixels.size) { Color.blue(pixels[it]) },
        )
        CardEdgeDetector.detect(channels, w, h)?.let {
          mapOf("x" to it.x, "y" to it.y, "width" to it.width, "height" to it.height)
        }
      } finally {
        bitmap.recycle()
      }
    }
  }

  private fun open(uri: String): InputStream {
    val parsed = Uri.parse(uri)
    if (parsed.scheme == null || parsed.scheme == "file") return FileInputStream(parsed.path ?: uri)
    return context.contentResolver.openInputStream(parsed) ?: throw DetectException("Could not open the image")
  }

  // A small copy, turned upright by the photo's EXIF orientation as the image manipulator (Glide) does,
  // so the box lines up with the photo the crop is cut from.
  private fun loadUpright(uri: String): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    open(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= CardEdgeDetector.WORK_EDGE) sample *= 2
    val decoded = open(uri).use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: return null

    val orientation = try {
      open(uri).use { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) }
    } catch (e: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }
    val matrix = orientationMatrix(orientation)
    val scale = CardEdgeDetector.WORK_EDGE.toFloat() / max(decoded.width, decoded.height)
    if (scale < 1f) matrix.postScale(scale, scale)
    if (matrix.isIdentity) return decoded
    val upright = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    if (upright !== decoded) decoded.recycle()
    return upright
  }

  private fun orientationMatrix(orientation: Int) = Matrix().apply {
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> postScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> postRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> { postRotate(90f); postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_90 -> postRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> { postRotate(-90f); postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_270 -> postRotate(-90f)
    }
  }
}
