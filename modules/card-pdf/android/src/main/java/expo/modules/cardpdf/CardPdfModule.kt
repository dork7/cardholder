package expo.modules.cardpdf

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.pdf.PdfDocument
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

// Renders one page of a PDF to a JPEG in the cache folder: the page a PDF card shows as its picture,
// and the pages of the card view and the page picker. The caller deletes the JPEG.
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
        val width = bitmap.width
        val height = bitmap.height
        try {
          out.outputStream().use { stream -> bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream) }
        } finally {
          bitmap.recycle()
        }
        mapOf(
          "uri" to Uri.fromFile(out).toString(),
          "pageCount" to it.pageCount,
          "width" to width,
          "height" to height
        )
      }
    }

    // JPEGs → one PDF, a page per image, in the cache folder: a card's front and back shared as a
    // single file. The caller deletes it.
    AsyncFunction("imagesToPdf") { uris: List<String> ->
      val document = PdfDocument()
      try {
        uris.forEachIndexed { index, uri ->
          val bitmap = BitmapFactory.decodeFile(Uri.parse(uri).path) ?: throw PdfException("Could not read an image")
          try {
            val page = document.startPage(PdfDocument.PageInfo.Builder(bitmap.width, bitmap.height, index + 1).create())
            page.canvas.drawBitmap(bitmap, 0f, 0f, null)
            document.finishPage(page)
          } finally {
            bitmap.recycle()
          }
        }
        val out = File(context.cacheDir, "pdf-${UUID.randomUUID()}.pdf")
        out.outputStream().use { document.writeTo(it) }
        Uri.fromFile(out).toString()
      } finally {
        document.close()
      }
    }
  }
}
