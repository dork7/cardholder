package expo.modules.builtinmodel

import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import com.google.mlkit.genai.prompt.TextPart
import com.google.mlkit.genai.prompt.generateContentRequest
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

// Gemini Nano on the phones that ship it (through AICore), for asking questions about documents.
// Same interface as the iOS version: availability, prepare (download), generate, cancel.
class BuiltInModelModule : Module() {
  private val model: GenerativeModel by lazy { Generation.getClient() }

  // The answer being written, so cancel() can stop it.
  @Volatile private var running: Job? = null

  override fun definition() = ModuleDefinition {
    Name("BuiltInModel")

    OnDestroy {
      running?.cancel()
      runCatching { model.close() }
    }

    AsyncFunction("availability") Coroutine { ->
      try {
        when (model.checkStatus()) {
          FeatureStatus.AVAILABLE -> "available"
          FeatureStatus.DOWNLOADABLE -> "downloadable"
          FeatureStatus.DOWNLOADING -> "downloading"
          else -> "unsupported"
        }
      } catch (e: Exception) {
        // Phones without AICore throw rather than answer UNAVAILABLE.
        "unsupported"
      }
    }

    // Asks AICore to fetch Gemini Nano, and waits until it has.
    AsyncFunction("prepare") Coroutine { ->
      var done = false
      model.download().collect { status ->
        when (status) {
          is DownloadStatus.DownloadCompleted -> done = true
          is DownloadStatus.DownloadFailed -> throw status.e
          else -> Unit
        }
      }
      done
    }

    AsyncFunction("generate") Coroutine { prompt: String, maxTokens: Int ->
      coroutineScope {
        val job = async {
          model.generateContent(
            generateContentRequest(TextPart(prompt)) {
              temperature = 0f // facts from the document, not writing: the most likely answer
              maxOutputTokens = maxTokens
            },
          )
        }
        running = job
        try {
          job.await().candidates.firstOrNull()?.text ?: ""
        } finally {
          if (running === job) running = null
        }
      }
    }

    Function("cancel") {
      running?.cancel()
    }
  }
}
