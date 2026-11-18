# Work log: family profiles (#37)

- People are separate from folders and tags, per ADR 0009. Names are sealed in a new `people` table; document ownership is a random person ID.
- Settings → People can add, rename and remove profiles. The document editor assigns a person and Home filters by person.
- Document details, Show mode and expiry reminders name the owner. Encrypted backups preserve profiles and assignments; older backups restore without them.
- Verified with card-store, backup and reminder tests; full suite: 893 tests passing.
