# Work log: profile photo (#80)

- The profile form can choose a library photo or take one with the existing pickers. Both routes use the fixed square crop. The form and drawn Medical card show the photo as a circle; it can be removed or replaced.
- The photo is a separate AES-GCM sealed blob beside the document's front, so edits to the drawn card do not discard the original photo. The blob is erased with the document and never enters profile details or QR data.
- Encrypted backup export, validation, replace, and merge carry the photo blob. Older backups without a photo still parse. A malformed optional photo leaves the drawn front as an ordinary document.
- Added behavior tests at the profile screen, image picker, document store, and encrypted backup seams. `npm run typecheck` passed and `npx jest --runInBand` passed: 98 suites, 902 tests. Native camera and crop presentation still need a device check.
