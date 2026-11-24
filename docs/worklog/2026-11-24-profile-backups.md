# Work log: profile backups (#78)

- The existing encrypted backup already carries each document's sealed profile payload and drawn front image. The restore parser now validates profile details separately, dropping malformed or unknown profile data while keeping the document and its image.
- Replace restores the profile and its card image. Merge maps incoming People to existing People by ID or name and skips an incoming profile when that Person already has one. Duplicate profiles within a backup are reduced to one profile per Person. Older backups without profiles continue to restore.
- Added encrypted export/replace, merge, and malformed profile regression tests in the backup service and parser suites.
- `npm run typecheck` passed. Full `npx jest --runInBand` passed: 98 suites, 895 tests. Native capture and device restore were not exercised by Jest.
