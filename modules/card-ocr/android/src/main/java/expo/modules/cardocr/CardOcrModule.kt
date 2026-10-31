package expo.modules.cardocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Base64
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayInputStream
import java.io.FileInputStream
import java.io.InputStream
import kotlin.math.max

private class DetectException(message: String) : CodedException("E_IMAGE", message, null)

// Turns a card photo into lines of text with positions, and finds the card's edges for the crop, like
// the iOS version. Nothing here decides what the text means; that is TypeScript (src/analysis/).
class CardOcrModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  // ML Kit's Latin model, bundled in the app, so reading works offline from the first launch. It has
  // no Arabic model: on UAE cards only the English side is read.
  private val textReader by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun definition() = ModuleDefinition {
    Name("CardOcr")

    OnDestroy { textReader.close() }

    // The image arrives as the base64 JPEG the app already holds in memory, so no plaintext copy of
    // the card is written to disk for OCR.
    AsyncFunction("recognize") { jpegBase64: String, promise: Promise ->
      val bytes = try {
        Base64.decode(jpegBase64, Base64.DEFAULT)
      } catch (e: IllegalArgumentException) {
        promise.reject("E_IMAGE", "Could not decode the image", e)
        return@AsyncFunction
      }
      val bitmap = decodeUpright(bytes)
      if (bitmap == null) {
        promise.reject("E_IMAGE", "Could not decode the image", null)
        return@AsyncFunction
      }
      val w = bitmap.width.toFloat()
      val h = bitmap.height.toFloat()
      textReader.process(InputImage.fromBitmap(bitmap, 0))
        .addOnSuccessListener { text ->
          // Lines in reading order, boxes normalised with the origin top left, as on iOS.
          val lines = text.textBlocks.flatMap { it.lines }.mapNotNull { line ->
            val box = line.boundingBox ?: return@mapNotNull null
            mapOf(
              "text" to line.text,
              "confidence" to line.confidence.toDouble(),
              "box" to mapOf(
                "x" to box.left / w,
                "y" to box.top / h,
                "width" to box.width() / w,
                "height" to box.height() / h,
              ),
            )
          }
          promise.resolve(mapOf("lines" to lines))
        }
        .addOnFailureListener { e -> promise.reject("E_OCR", e.message ?: "Text recognition failed", e) }
        .addOnCompleteListener { bitmap.recycle() }
    }

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

  // The whole image, turned upright by its EXIF orientation if it has one (as iOS does with the
  // image's orientation), so the text is read the right way up.
  private fun decodeUpright(bytes: ByteArray): Bitmap? {
    val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
    val orientation = try {
      ExifInterface(ByteArrayInputStream(bytes)).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (e: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }
    val matrix = orientationMatrix(orientation)
    if (matrix.isIdentity) return decoded
    val upright = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    if (upright !== decoded) decoded.recycle()
    return upright
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
