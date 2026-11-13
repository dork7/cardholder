package expo.modules.crashlog

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

// What the phone keeps when Doc Keeper's native side crashes, for the report the user can send from
// Settings → Problems (src/diagnostics/). Nothing here goes anywhere: an uncaught exception is written
// to files/diagnostics/native-crash.txt (time, error, stack) and then handed on to the handler that
// was there before, which closes the app as usual. On Android 11 and later the system's own record
// of why the app last stopped (crash, native crash, not responding) is read as well.
class CrashLogModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CrashLog")

    OnCreate {
      appContext.reactContext?.let { installHandler(File(it.filesDir, "diagnostics")) }
    }

    Function("exitReasonsAvailable") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
    }

    // Exits after `sinceMs`, newest first; at most the last ten the system kept.
    Function("lastExits") { sinceMs: Double ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return@Function emptyList<Map<String, Any>>()
      val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      manager.getHistoricalProcessExitReasons(context.packageName, 0, 10)
        .filter { it.timestamp > sinceMs.toLong() }
        .map { exit ->
          mapOf(
            "at" to exit.timestamp.toDouble(),
            "reason" to when (exit.reason) {
              ApplicationExitInfo.REASON_CRASH -> "crash"
              ApplicationExitInfo.REASON_CRASH_NATIVE -> "native-crash"
              ApplicationExitInfo.REASON_ANR -> "anr"
              else -> "other"
            },
            "description" to (exit.description ?: ""),
            "trace" to traceOf(exit),
          )
        }
    }
  }

  // The system keeps the stack of a "not responding" exit as text; a native crash's tombstone is
  // binary, so only the description is kept for those.
  private fun traceOf(exit: ApplicationExitInfo): String {
    if (exit.reason != ApplicationExitInfo.REASON_ANR) return ""
    return try {
      exit.traceInputStream?.use { it.bufferedReader().readText().take(8000) } ?: ""
    } catch (_: Throwable) {
      ""
    }
  }

  companion object {
    @Volatile
    private var installed = false

    private fun installHandler(dir: File) {
      if (installed) return
      installed = true
      val previous = Thread.getDefaultUncaughtExceptionHandler()
      Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
        try {
          dir.mkdirs()
          val stack = StringWriter().also { throwable.printStackTrace(PrintWriter(it)) }.toString()
          File(dir, "native-crash.txt").writeText(
            "${System.currentTimeMillis()}\n${throwable.javaClass.name}: ${throwable.message ?: ""} (thread ${thread.name})\n$stack",
          )
        } catch (_: Throwable) {
          // The crash itself matters more than the note about it.
        }
        previous?.uncaughtException(thread, throwable)
      }
    }
  }
}
