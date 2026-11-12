# The app never goes online on its own

There is no analytics, crash reporting, ads, accounts or sync. The only network traffic happens when
the user starts it: the store's purchase flow (Buy / Restore), and on Android the update check
and APK download. This is what lets the store privacy labels say "No data collected". It also means
the app works the same on a plane.

## Consequences

- Crashes and usage are invisible to us. Bugs come from user reports and real-device testing.
- A refunded unlock isn't revoked, because the app only talks to the store when the user taps Buy
  or Restore. We accept this for a one-time utility unlock.
- Any new feature that wants the network has to be started by the user, and has to be listed in
  `docs/design.md` next to the others.
- On Android, card reading uses ML Kit through Google Play services to keep the APK small. Play
  services (not the app) downloads the text model once, at install. Until it has, or on phones
  without Play services, cards get no suggestions. Reading itself stays on the phone.
