import ExpoModulesCore
import PDFKit
import UIKit

// Renders one page of a PDF to a JPEG in the caches folder, so a card that arrives as a PDF (a digital
// insurance card, an e-ID) goes through the same crop as a photo. The caller deletes the JPEG.
public class CardPdfModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CardPdf")

    // `page` is zero-based and clamped to the last page.
    AsyncFunction("renderPage") { (uri: String, page: Int, maxEdge: Double, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let url = URL(string: uri), let document = PDFDocument(url: url) else {
          promise.reject("E_PDF", "Could not open the PDF")
          return
        }
        if document.isLocked {
          promise.reject("E_PDF_LOCKED", "The PDF is password protected")
          return
        }
        guard document.pageCount > 0, let pdfPage = document.page(at: max(0, min(page, document.pageCount - 1))) else {
          promise.reject("E_PDF", "The PDF has no pages")
          return
        }

        // thumbnail(of:for:) applies the page's rotation; the box size here is before rotation.
        let box = pdfPage.bounds(for: .mediaBox).size
        let turned = pdfPage.rotation % 180 != 0
        let width = turned ? box.height : box.width
        let height = turned ? box.width : box.height
        let scale = maxEdge / max(width, height)
        let size = CGSize(width: (width * scale).rounded(), height: (height * scale).rounded())

        let thumbnail = pdfPage.thumbnail(of: size, for: .mediaBox)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        // PDF pages are often transparent; JPEG would turn that black, so paint paper white first.
        let image = UIGraphicsImageRenderer(size: size, format: format).image { context in
          UIColor.white.setFill()
          context.fill(CGRect(origin: .zero, size: size))
          thumbnail.draw(in: CGRect(origin: .zero, size: size))
        }

        guard let data = image.jpegData(compressionQuality: 0.9) else {
          promise.reject("E_PDF", "Could not encode the page")
          return
        }
        let out = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
          .appendingPathComponent("pdf-\(UUID().uuidString).jpg")
        do {
          try data.write(to: out)
        } catch {
          promise.reject("E_PDF", error.localizedDescription)
          return
        }
        promise.resolve(["uri": out.absoluteString, "pageCount": document.pageCount])
      }
    }
  }
}
