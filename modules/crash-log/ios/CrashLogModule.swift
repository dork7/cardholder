import ExpoModulesCore

// What the phone keeps when Doc Keeper's native side throws, for the report the user can send from
// Settings → Problems (src/diagnostics/). Nothing here goes anywhere: an uncaught Objective-C
// exception is written to Documents/diagnostics/native-crash.txt (time, error, stack) and then
// handed on to the handler that was there before. iOS has no equivalent of Android's exit reasons;
// a crash that isn't an exception (a signal) shows up through the running marker instead.
private var previousHandler: (@convention(c) (NSException) -> Void)?

private func writeCrash(_ exception: NSException) {
  guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
  let dir = documents.appendingPathComponent("diagnostics", isDirectory: true)
  try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  let at = Int64(Date().timeIntervalSince1970 * 1000)
  let text = "\(at)\n\(exception.name.rawValue): \(exception.reason ?? "")\n\(exception.callStackSymbols.joined(separator: "\n"))\n"
  try? text.write(to: dir.appendingPathComponent("native-crash.txt"), atomically: true, encoding: .utf8)
}

private var installed = false

public class CrashLogModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CrashLog")

    OnCreate {
      if installed { return }
      installed = true
      previousHandler = NSGetUncaughtExceptionHandler()
      NSSetUncaughtExceptionHandler { exception in
        writeCrash(exception)
        previousHandler?(exception)
      }
    }

    Function("exitReasonsAvailable") { () -> Bool in
      return false
    }

    Function("lastExits") { (_: Double) -> [[String: Any]] in
      return []
    }
  }
}
