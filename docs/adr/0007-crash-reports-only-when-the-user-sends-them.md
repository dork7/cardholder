# Crash reports exist, but only the user sends them

ADR 0005 keeps the app off the network, and its consequence was that crashes were invisible: bugs
came only from what users described. That stays true for anything automatic. What changes is that
the app now keeps a record of its own crashes **on the phone**, and asks the user whether to send it.

`src/diagnostics/` keeps a log of what the app was doing (every `console.warn` and `console.error`,
never a document's text or name) and a record of the last unexpected close: a fatal JavaScript error
(written before React Native closes the app), a native exception (`modules/crash-log`, Kotlin and
Swift uncaught-exception handlers), on Android 11 and later the system's own exit reasons (which also
cover native crashes and "not responding"), and on iOS a marker that says the app was in front and
never went to the background before the next launch. A render error is caught by a boundary at the
root, which shows a screen instead of a blank crash.

On the next launch, once the app is open and unlocked, one prompt asks whether to send a report.
**Not now** leaves it in **Settings → Problems**, where the user can read what would be sent, email
it to the developer (`CRASH_REPORT_EMAIL` in `src/config.ts`; the button is hidden while that is
empty), share the report file through the share sheet, or dismiss it. Nothing is sent, and nothing
goes online, without one of those taps. The report carries the error, the phone model and OS, the
app version and the recent log lines.

## Consequences

- The store privacy labels can stay "No data collected": a report is user-initiated mail or sharing,
  the same as exporting a backup, and the app has no crash-reporting SDK or endpoint.
- The log must never hold what a document says. Callers log what the app was doing, not the data.
- A crash the app can't see (iOS signal crashes, a kill in the background) is reported as "closed
  while open" or not at all; the stores' own opt-in crash reports still cover those.
- Development builds don't use the running marker: reloads would make every launch look like a crash.
- The email address is part of the build. Changing it is a release.
