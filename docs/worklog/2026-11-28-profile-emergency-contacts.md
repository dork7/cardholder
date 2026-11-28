# Profile emergency contacts (#81)

- Added a system contact picker on iOS and Android. It returns only the selected name and phone number; the app requests no contacts permission.
- Added emergency contacts to the sealed profile details, drawn card, search text and encrypted backup parser. Limited each profile to three ordered contacts with name, optional legacy relationship, and phone; each value is limited to 200 characters.
- The form supports picking or hand entry, editing all copied fields, removing, and moving contacts up or down. The card preview and captured front show their priority order. Incomplete entries block save with a clear message.
- iOS uses the selected phone property and Android picks from phone-number rows, so the user selects the intended number when a contact has several. The native boundary is mocked in tests; no contacts permission was added.
- Added screen, native-boundary, sealed store and encrypted backup round-trip tests.
- Native module requires a fresh iOS/Android development build before the picker works on device.
- Round 2 verification: `npm run typecheck` passed; `npx jest --runInBand` passed (100 suites, 934 tests). Native picker was not device-tested here.
