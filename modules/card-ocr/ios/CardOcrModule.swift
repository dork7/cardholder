import ExpoModulesCore
import UIKit
import Vision

// Turns a card photo into lines of text with positions. Nothing here decides what the text means;
// that is TypeScript (src/analysis/), so it can be tested without a device.
//
// The image arrives as the base64 JPEG the app already holds in memory, so no plaintext copy of the
// card is written to disk for OCR.
public class CardOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CardOcr")

    AsyncFunction("recognize") { (jpegBase64: String, promise: Promise) in
      guard let data = Data(base64Encoded: jpegBase64), let image = UIImage(data: data), let cgImage = image.cgImage else {
        promise.reject("E_IMAGE", "Could not decode the image")
        return
      }

      // Vision can report a failure both by throwing from perform() and through the completion
      // handler; the promise must settle exactly once.
      let once = Once()
      let request = VNRecognizeTextRequest { request, error in
        guard once.claim() else { return }
        if let error = error {
          promise.reject("E_OCR", error.localizedDescription)
          return
        }
        let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
        let lines: [[String: Any]] = observations.compactMap { observation in
          guard let best = observation.topCandidates(1).first else { return nil }
          // Vision's boxes are normalised with the origin at the bottom left; flip to top left.
          let box = observation.boundingBox
          return [
            "text": best.string,
            "confidence": best.confidence,
            "box": ["x": box.minX, "y": 1 - box.maxY, "width": box.width, "height": box.height],
          ]
        }
        promise.resolve(["lines": lines])
      }
      request.recognitionLevel = .accurate
      // UAE cards print Arabic beside English. Vision reads with the first language's script model,
      // and its Arabic model also reads Latin text; English first turns the Arabic into junk.
      request.recognitionLanguages = ["ar-SA", "en-US"]
      // Card numbers, dates and codes aren't dictionary words; correction would "fix" them.
      request.usesLanguageCorrection = false

      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: CGImagePropertyOrientation(image.imageOrientation))
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          if once.claim() { promise.reject("E_OCR", error.localizedDescription) }
        }
      }
    }
  }
}

private final class Once {
  private let lock = NSLock()
  private var done = false

  func claim() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    if done { return false }
    done = true
    return true
  }
}

private extension CGImagePropertyOrientation {
  init(_ orientation: UIImage.Orientation) {
    switch orientation {
    case .up: self = .up
    case .upMirrored: self = .upMirrored
    case .down: self = .down
    case .downMirrored: self = .downMirrored
    case .left: self = .left
    case .leftMirrored: self = .leftMirrored
    case .right: self = .right
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}
