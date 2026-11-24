# Work log: profiles as documents (#83)

- Removing a Person now asks with a profile-specific explanation. The store moves a current profile to Recently deleted, unassigns that Person's ordinary documents, and removes the Person in one transaction. Restoring the profile recreates its Person when necessary and keeps its sealed details, tags, pin and picture.
- Profiles have no expiry in the store, Expiring soon, or reminder planning, including when an older payload happens to contain an expiry date.
- The profile details screen warns before image or PDF sharing. Batch sharing warns when a selection contains a profile; batch pin, tag and delete use the existing document actions. Delete has extra space below Edit on a profile's action sheet.
- Added store and screen tests for deletion and restoration, expiry, share confirmation, batch actions, and action separation.
- `npm run typecheck` passed. The first full `npx jest --runInBand` found one wording guard failure because the new share message said "card"; after that was changed, the full suite passed: 98 suites, 901 tests. `git diff --check` passed.
