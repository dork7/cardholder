package expo.modules.cardocr

import android.graphics.Bitmap
import android.graphics.Color
import kotlin.math.abs
import kotlin.math.sqrt

internal data class PhotoQualityMetrics(
  val sharpness: Double,
  val contrast: Double,
  val whiteRatio: Double,
)

// Small, in-memory image statistics. A sampled bitmap bounds CPU and memory on large camera photos.
internal object PhotoQualityMeasurer {
  fun measure(bitmap: Bitmap): PhotoQualityMetrics {
    val width = bitmap.width
    val height = bitmap.height
    if (width < 3 || height < 3) return PhotoQualityMetrics(0.0, 0.0, 0.0)
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
    val gray = IntArray(pixels.size)
    var sum = 0.0
    var sumSquares = 0.0
    var white = 0
    for (i in pixels.indices) {
      val p = pixels[i]
      val r = Color.red(p)
      val g = Color.green(p)
      val b = Color.blue(p)
      val value = (299 * r + 587 * g + 114 * b) / 1000
      gray[i] = value
      sum += value
      sumSquares += value.toDouble() * value
      if (r >= 250 && g >= 250 && b >= 250) white++
    }
    var laplacian = 0.0
    var samples = 0
    for (y in 1 until height - 1) {
      for (x in 1 until width - 1) {
        val i = y * width + x
        laplacian += abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width])
        samples++
      }
    }
    val mean = sum / pixels.size
    return PhotoQualityMetrics(
      sharpness = laplacian / samples,
      contrast = sqrt((sumSquares / pixels.size - mean * mean).coerceAtLeast(0.0)),
      whiteRatio = white.toDouble() / pixels.size,
    )
  }
}
