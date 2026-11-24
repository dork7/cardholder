# Work log: profile medical and contact details (#79)

- Added optional Conditions, Allergies and Medications lists to the profile editor. Each entry can be added, edited and removed. Added Medical notes, mobile number, email and address fields.
- The Medical card renders these values; saving captures the updated card picture. Profile details remain in the encrypted document payload, and the existing document search finds every new field.
- Added accessible labels to each field, list entry and add/remove action. Added store and screen tests for round trips, search and list editing.
- Verified with TypeScript typecheck and the full Jest suite.
