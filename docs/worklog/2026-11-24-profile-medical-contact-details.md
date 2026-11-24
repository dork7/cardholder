# Work log: profile medical and contact details (#79)

- Extended the existing `src/profiles` payload with optional Conditions, Allergies and Medications lists, medical Notes, mobile number, email and address. Existing profiles with none of these fields reopen unchanged.
- The profile form supports adding, editing and removing list entries and editing each text field, with labels for fields, entries and actions. The preview and captured front show the new details; the accessible card summary and document Details include them for reading and search.
- Added store/search and screen tests for sealed round trips, list editing, contact fields, card content and labels.
- `npm run typecheck` passed. Full `npx jest --runInBand` passed: 98 suites, 895 tests. Native view capture needs a development build and device check.
