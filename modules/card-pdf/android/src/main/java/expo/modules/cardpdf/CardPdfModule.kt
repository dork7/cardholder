package expo.modules.cardpdf

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID
import kotlin.math.max
import kotlin.math.roundToInt

private class PdfException(message: String, cause: Throwable? = null) : CodedException("E_PDF", message, cause)
private class PdfLockedException(cause: Throwable) : CodedException("E_PDF_LOCKED", "The PDF is password protected", cause)

// Renders one page of a PDF to a JPEG in the cache folder, so a card that arrives as a PDF (a digital
// insurance card, an e-ID) goes through the same crop as a photo. The caller deletes the JPEG.
class CardPdfModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CardPdf")

    // `page` is zero-based and clamped to the last page.
    AsyncFunction("renderPage") { uri: String, page: Int, maxEdge: Double ->
      val descriptor = context.contentResolver.openFileDescriptor(Uri.parse(uri), "r")
        ?: throw PdfException("Could not open the PDF")
      val renderer = try {
        PdfRenderer(descriptor)
      } catch (e: SecurityException) {
        descriptor.close()
        throw PdfLockedException(e)
      } catch (e: Exception) {
        descriptor.close()
        throw PdfException("Could not open the PDF", e)
      }
      renderer.use {
        if (it.pageCount == 0) throw PdfException("The PDF has no pages")
        val bitmap = it.openPage(page.coerceIn(0, it.pageCount - 1)).use { pdfPage ->
          val scale = maxEdge / max(pdfPage.width, pdfPage.height)
          val bitmap = Bitmap.createBitmap(
            (pdfPage.width * scale).roundToInt(),
            (pdfPage.height * scale).roundToInt(),
            Bitmap.Config.ARGB_8888
          )
          // PDF pages are often transparent; JPEG would turn that black, so paint paper white first.
          bitmap.eraseColor(Color.WHITE)
          pdfPage.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
          bitmap
        }
        val out = File(context.cacheDir, "pdf-${UUID.randomUUID()}.jpg")
        try {
          out.outputStream().use { stream -> bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream) }
        } finally {
          bitmap.recycle()
        }
        mapOf("uri" to Uri.fromFile(out).toString(), "pageCount" to it.pageCount)
      }
    }
  }
}
