import ExpoModulesCore
#if canImport(FoundationModels)
import FoundationModels
#endif

// Apple Foundation Models (iOS 26 and later, with Apple Intelligence on), for asking questions about
// documents. Same interface as the Android version: availability, prepare, generate, cancel.
public class BuiltInModelModule: Module {
  // The answer being written, so cancel() can stop it.
  private var running: Task<String, Error>?

  public func definition() -> ModuleDefinition {
    Name("BuiltInModel")

    AsyncFunction("availability") { () -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        switch SystemLanguageModel.default.availability {
        case .available:
          return "available"
        case .unavailable(.appleIntelligenceNotEnabled):
          return "off"
        case .unavailable(.modelNotReady):
          return "downloading"
        default:
          return "unsupported"
        }
      }
      #endif
      return "unsupported"
    }

    // Apple downloads its model itself once Apple Intelligence is on; there's nothing to start here.
    AsyncFunction("prepare") { () -> Bool in
      return false
    }

    AsyncFunction("generate") { (prompt: String, maxTokens: Int) async throws -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        let task = Task { () throws -> String in
          // A fresh session per question, so one answer never depends on another.
          let session = LanguageModelSession()
          let response = try await session.respond(
            to: prompt,
            options: GenerationOptions(temperature: 0, maximumResponseTokens: maxTokens)
          )
          return response.content
        }
        self.running = task
        defer { self.running = nil }
        return try await task.value
      }
      #endif
      throw NoBuiltInModelException()
    }

    Function("cancel") {
      self.running?.cancel()
    }
  }
}

internal class NoBuiltInModelException: Exception {
  override var reason: String {
    "This phone has no built-in language model"
  }
}
